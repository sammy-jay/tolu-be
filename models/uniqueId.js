import mongoose from "mongoose";


// Id schema
const uniqueIDSchema = new mongoose.Schema({
    id: Number
})
export const UniqueID = mongoose.model("uniqueID", uniqueIDSchema);

// Transaction schema
const transactSchema = new mongoose.Schema({
    seller: String,
    customer: String,
    products: String,
    amountTotal: String,
    discount: Boolean,
    dateIssued: String,
     paidStatus: String,
     duePayDate: String,
     invoiceId: String
})
export const Transact = mongoose.model("transact", transactSchema )

// user schema 
const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true},
    lastName: { type: String, required: true},
    email: { type: String, required: true, unique: false},
    phone: { type: String, required: true},
    businessName: { type: String, required: true},
    password: { type: String, required: true}
})
export const Users = mongoose.model("Users", userSchema)