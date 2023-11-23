import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose, { set } from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import got from "got";
import { UniqueID, Transact, Users } from "./models/uniqueId.js";

const PORT = 3000

const app = express();
dotenv.config();
set("strictQuery", false);

app.use(cors()); // Add cors middleware
app.use(express.json());

async function connectMongoDB() {
    try {
        let res = await mongoose.connect(process.env.MONGODB_URL);
        console.log(`MongoDB Success: Database connected successfully`);
    } catch (error) {
        console.log(`MongoDB Initial Connection Error: ${error}`)
    }
 
}
connectMongoDB();
// http://localhost:3000/api/itrack/webhook
// itrack-G319
// console.log(process.env.FLW_SECRET_KEY)

app.get("/", (req, res)=> {
    res.status(200).send("Hello,iTrack: Enyo, Dorcas, Ola")
})

app.post("/itrack/sign-up", async (req, res) => {
    console.log(req.body)
    try{
        const newUser = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            phone: req.body.phone,
            businessName: req.body.businessName,
            password: await bcrypt.hash(req.body.password,10)
        }
        const user = await Users.create(newUser)
        res.status(200).send({message: "User Created Successfully", id:user._id})
    } catch(error) {
        res.status(500).send({message: "Error Creating User"})
    }
   
})


app.post("/itrack/pay", async (req,res) => {
    // console.log(req.body)

    function invoiceId() {

    }
    const seller = JSON.stringify(req.body.seller);
    const customer = JSON.stringify(req.body.customer);
    const products = JSON.stringify(req.body.products);

    const { amountTotal, discount, dateIssued, paidStatus, duePayDate } = req.body
    
    let oldID = await UniqueID.find({})
    oldID[0].id =   oldID[0].id + 1
    oldID[0].save()
    let user_id = (oldID[0].id).toString().padStart(10, "0")

    let userTransact = {
        "seller": seller,
        "customer": customer,
        "products": products,
        "amountTotal": amountTotal,
        "discount": discount,
        "dateIssued": dateIssued,
        "paidStatus": paidStatus,
        "duePayDate": duePayDate,
        "invoiceId": user_id
    } 

    let user = await Transact.create(userTransact)
    // console.log(user)

    const tx_ref = req.body.seller.name + "-" + req.body.customer.email + "-" + user_id

    if (paidStatus !== "paid") {

        try {
            const response = await got.post("https://api.flutterwave.com/v3/payments", {
                headers: {
                    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`
                },
                json: {
                    tx_ref: tx_ref,
                    amount: amountTotal,
                    currency: "NGN",
                    redirect_url: "http://localhost:3000/itrack/redirect-url",
                    meta: {
                        consumer_id: 23,
                        consumer_mac: "92a3-912ba-1192a"
                    },
                    customer: {
                        email: req.body.customer.email,
                        phonenumber: req.body.customer.phone,
                        name: req.body.customer.name
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
    } else {
        res.status(201).send({message: user_id})
    }
})

app.get("/itrack/check-transactions", async (req, res) => {
    try{
        let transactions = await Transact.find()
    let count = transactions.length
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
         // console.log(req.query)
    
    // let response = await got.get(`https://api.flutterwave.com/v3/transactions/${req.query.transaction_id}/verify`, {
        let response = await got.get(`https://api.flutterwave.com/v3/transactions/4737790/verify`, {
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
        trans[0].save()
    }
    } catch(error) {
        res.status(500).send("Oopsie! Error Connecting/redirect-url")
    }
   
})


app.listen(PORT, (req, res)=> {
    console.log(`iTrack server listening on port ${PORT}`)
})
