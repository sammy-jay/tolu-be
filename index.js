import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose, { set } from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import got from "got";
import nodemailer from 'nodemailer';
import {Server} from 'socket.io'
import http from 'http'
import { UniqueID, Transact, iTrackUsers, iTrackCustomers } from "./models/uniqueId.js";

const PORT = 3000

const app = express();
dotenv.config();
set("strictQuery", false);

app.use(cors()); // Add cors middleware
app.use(express.json());

let env = process.env.NODE_ENV
let baseUrl, feURL;
if (env === "development") {
    baseUrl = "http://localhost:3000"
    feURL = "http://localhost:5173"
} else {
    baseUrl = "https://itrack-server.vercel.app"
    feURL = "https://itrack-client.vercel.app"
}


async function connectMongoDB() {
    try {
        let res = await mongoose.connect(process.env.MONGODB_URL);
        console.log(`MongoDB Success: Database connected successfully`);
    } catch (error) {
        console.log(`MongoDB Initial Connection Error: ${error}`)
    }
 
}
connectMongoDB();


app.get("/", (req, res)=> {
    console.log(req.body)
    res.status(200).send("Hello,iTrack: Enyo, Dorcas, Ola")
})

app.post("/itrack/dashboard", async (req,res)=> {
    console.log(req.body)
    try {
        let customers = await iTrackCustomers.find({sellerEmail: req.body.sellerEmail})
        let totalCustomers = customers.length >= 1 ? customers.length : 0
        let totalPaid = 0
        let totalDebt = 0
        let totalInvoice = 0
        let totalDebtCount = 0
        let totalPaidCount = 0
        let transact = await Transact.find({})
        transact = transact.filter(items=> JSON.parse(items.seller).email === req.body.sellerEmail)
        console.log(transact)
        if (transact.length >= 1 ) {
            totalInvoice = transact.length
            for (let items of transact){
                if (items.paidStatus === "paid") {
                    totalPaid += parseFloat(items.amountTotal)
                    totalPaidCount += 1
                } else {
                    totalDebt += parseFloat(items.debt)
                    totalDebtCount += 1
                }
            }
        }
        let dashboardObj = {
            totalCustomers: totalCustomers,
            totalPaid : totalPaid,
            totalInvoice : totalInvoice,
            totalDebt : totalDebt,
            totalDebtCount: totalDebtCount,
            totalPaidCount: totalPaidCount
        }
        res.status(200).send({ message: dashboardObj})
    } catch(error) {
        res.status(500).send({message: "Error"})
        console.log(error)
    }
})

app.get("/itrack/emit", async (req, res)=> {
    // console.log("emit")
    try {
        let dueArr = []
        let currentDate = new Date().toLocaleDateString('en-GB')
        let trans = await Transact.find()
        for (let items of trans) {
            let dueDate = items.duePayDate.split("-").reverse().join("/")
            if (dueDate === currentDate) {
                dueArr.push(items)
            }
        }
        res.status(200).send({message: dueArr})
    } catch(error) {
        res.status(500).send({message: "Error"})
        console.log(error)
    }
})

app.post("/itrack/sign-in", async (req, res) => {
    console.log(req.body)
    // console.log(await iTrackUsers.find())
    try{
        
       let user = await iTrackUsers.find({email: req.body.email })
       console.log(user)
       let encryptPassword = await bcrypt.compare(req.body.password,user[0].password)
       if ((user.length >= 1) && (encryptPassword) ) {
        res.status(200).send({message: user[0]})
       } else {
        res.status(201).send({message: "No Such User"})
       }
    } catch(error) {
        res.status(500).send({message: "Error Logging In"})
    }
   
})


// customers endpoints
app.post("/itrack/customers", async (req,res) => {
    console.log(req.body)
    try {
        let customers = await iTrackCustomers.find({sellerEmail: req.body.sellerEmail})
        console.log(customers)
        if (!customers || customers.length < 1) {
            res.status(201).send({message: "No Customers Created"})
        } else {
            res.status(200).send({
                count: customers.length,
                message: customers
            })
        }
    } catch(error) {
        console.log(error)
    }
})


app.post("/itrack/create-customer", async (req,res) => {
    console.log(req.body)
    // await iTrackCustomers.deleteMany()
    
    try {
        
        let newCustomer = await iTrackCustomers.create(req.body)
        console.log("NN")
        console.log(newCustomer)
        res.status(200).send({ message: newCustomer } )
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: "Error Creating New Customer" } )
    }
})

// app.get("/delete")

app.post("/itrack/create-user", async (req, res)=>{
    try{
        console.log(req.body)
        let user = await iTrackUsers.find({email: req.body.email})
        if(user.length >= 1) {
            res.status(203).send({message: "User Already Exists"})
        } else {
            let encrpytPassword = await bcrypt.hash(req.body.password, 10)
            let newUser = await iTrackUsers.create({...req.body, password: encrpytPassword })
            if (newUser._id) {
                res.status(200).send({message: newUser})
            } else{
                res.status(201).send({message: "Unsuccessful"})
            }
        }
       
    } catch(error) {
        console.log(error)
        res.status(500).send({message: "oops"})
    } 
})

// app.pos
app.post("/itrack/transactions", async (req,res) => {
    console.log(req.body)
    try {
        let transaction = await Transact.find()
        // transaction = transaction.filter(ite)
        // console.log(transaction)
        let newTransaction = transaction.filter(items=> JSON.parse(items.seller).email === req.body.sellerEmail )
        console.log(newTransaction)
        if (!newTransaction || newTransaction.length < 1) {
            res.status(201).send({message: "No Transaction Recorded"})
        } else {
            res.status(200).send({message: newTransaction})
        }
    } catch(error) {
        console.log(error)
    }
})

app.post("/itrack/portal-payment", async (req, res) => {
    console.log(req.body)
    try {
        let transact = await Transact.find({invoiceId: req.body.invoiceNo})
        if (transact.length < 1) {
            res.status(201).send({message: "No transaction relates to this invoice number"})
        }
        if (transact[0] && !(transact[0].paidStatus === "paid")) {
            console.log(transact[0])
            let customer = transact[0].customer
            
            try {
                const tx_ref = req.body.businessEmail + "-" + req.body.email + "-" + req.body.invoiceNo
                let url = baseUrl + "/itrack/redirect-url"
                const response = await got.post("https://api.flutterwave.com/v3/payments", {
                    headers: {
                        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`
                    },
                    json: {
                        tx_ref: tx_ref,
                        amount: req.body.amount,
                        currency: "NGN",
                        redirect_url: url,
                        meta: {
                            consumer_id: 23,
                            consumer_mac: "92a3-912ba-1192a"
                        },
                        customer: {
                            email: customer,
                        },
                        customizations: {
                            title: "Pied Piper Payments",
                            logo: "https://www.piedpiper.com/app/themes/joystick-v27/images/logo.png"
                        }
                    }
                }).json();
                res.status(200).send( {message: response.data.link} )
            } catch (err) {
                console.log(err.code);
                // console.log(err.response.body);
                res.status(500).send({ message: "Hello, iTrack"})
            }
        } else if (transact[0].paidStatus === "paid") {
            res.status(201).send({message: "No existing debt(s) is/are attached to this invoice number"})
        }
    } catch(error) {
        console.log(error)
    }
})

app.post("/itrack/invoice-payment-link", async (req,res) => {
    console.log(req.body)
   
    const seller = req.body.seller
    const customer = req.body.customer
    const products = req.body.products

    const { amountTotal, dateIssued, paidStatus, duePayDate , debt } = req.body
    
    let oldID = await UniqueID.find({})
    oldID[0].id =   oldID[0].id + 1
    oldID[0].save()
    let user_id = (oldID[0].id).toString().padStart(10, "0")

    let userTransact = {
        "seller": seller,
        "customer": customer,
        "products": products,
        "amountTotal": amountTotal,
        "discount": "0",
        "dateIssued": dateIssued,
        "paidStatus": paidStatus,
        "duePayDate": duePayDate,
        "debt": debt,
        "invoiceId": user_id
    } 

    let user = await Transact.create(userTransact)
    let findCustomer = await iTrackCustomers.find({email: req.body.customer, sellerEmail: JSON.parse(req.body.seller).email })
    if (findCustomer.length === 1 ) {
        findCustomer[0].debt =  (parseFloat(findCustomer[0].debt) + parseFloat(debt)).toString()
        findCustomer[0].save()
    }

    // console.log(user)

    const tx_ref = JSON.parse(req.body.seller).email  + "-" + req.body.customer + "-" + user_id

    if (paidStatus !== "paid") {

        try {

            let detailsCustomer = await iTrackCustomers.find({sellerEmail:JSON.parse(req.body.seller).email, email:req.body.customer})
            console.log(detailsCustomer)
            let redirect_url = baseUrl + "/itrack/redirect-url"
            const response = await got.post("https://api.flutterwave.com/v3/payments", {
                headers: {
                    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`
                },
                json: {
                    tx_ref: tx_ref,
                    amount: amountTotal - debt,
                    currency: "NGN",
                    redirect_url: redirect_url,
                    meta: {
                        consumer_id: 23,
                        consumer_mac: "92a3-912ba-1192a"
                    },
                    customer: {
                        email: detailsCustomer[0].email,
                        phonenumber: detailsCustomer[0].phone,
                        name: detailsCustomer[0].firstName + detailsCustomer[0].lastName
                    },
                    customizations: {
                        title: "Pied Piper Payments",
                        logo: "https://www.piedpiper.com/app/themes/joystick-v27/images/logo.png"
                    }
                }
            }).json();
            user.paymentLink = response.data.link
            user.save()

            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: "elijahdimeji549@gmail.com",
                    pass: "bkcd hmcn giph zkxk"
                }
            });

            var mailOptions = {
                from: "elijahdimeji549@gmail.com",
                to: user.customer,
                subject: "An Invoice Receipt from {{businessName}}",
                html: `<h3>Click <a href=${response.data.link}>here</a> to make payment</h3>`
            }

            transporter.sendMail(mailOptions, (error, info)=> {
                if (error) {
                    console.log(error)
                } else {
                    console.log(`Email sent: ${info.response}`)
                }
            })

            res.status(200).send( {message: user} )
        } catch (err) {
            console.log(err.code);
            console.log("ll")
            // console.log(err.response.body);
            res.status(500).send({ message: "Hello, iTrack"})
        }
    } else {
        res.status(201).send({message: user})
    }
})

app.get("/itrack/check-transactions", async (req, res) => {
    try{
        let transactions = await Transact.find()
    let count = transactions.length
    console.log(transactions)
    res.status(200).send({
        count: count,
        transactions: transactions
    })
    } catch(error) {
        res.status(500).send("Oopsie! Error Connecting/check-transactions")
    }
    
})
app.get("/itrack/find-user/:id", async(req, res)=> {
    try {
        const {id} = req.params
        let user = await Transact.find({invoiceId: id})
        res.status(200).send(user)
    } catch(error) {
        res.status(500).send("Oopsie! Error Connecting/find-user")
    }
   
})

app.get("/itrack/redirect-url", async (req, res)=> {
    try {
        console.log(req.query)
    
    let response = await got.get(`https://api.flutterwave.com/v3/transactions/${req.query.transaction_id}/verify`, {
        // let response = await got.get(`https://api.flutterwave.com/v3/transactions/4737790/verify`, {
        headers: {
            Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`
        }
    }).json()
    // console.log(response)
    let invoiceId = response.data.tx_ref.split("-")[2]
    let retTxRef = response.data.narration + "-" + response.data.customer.email + "-"+  invoiceId
    // console.log(retTxRef === response.data.tx_ref)
    let trans = await Transact.find({invoiceId: invoiceId})
    console.log(trans)
    res.status(200).send("Redirected")
    if ((invoiceId === trans[0].invoiceId) && (retTxRef === response.data.tx_ref) && (response.status === "success") && (response.data.currency === 'NGN') && (parseFloat(response.data.amount) >= parseFloat(trans[0].amountTotal) )) {
        trans[0].paidStatus = "paid";
        trans[0].debt = "0"
        trans[0].save()
    } else if ((parseFloat(response.data.amount) < parseFloat(trans[0].amountTotal) )) {
        let debt = parseFloat(trans[0].amountTotal) - parseFloat(response.data.amount)
        trans[0].debt = debt.toString()
        
    }
    } catch(error) {
        res.status(500).send("Oopsie! Error Connecting/redirect-url")
    }
   
})


app.listen(PORT, (req, res)=> {
    console.log(`iTrack server listening on port ${PORT}`)
})
// server.listen(PORT, ()=> "SERVING ")
