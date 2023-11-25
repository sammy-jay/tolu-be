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
     invoiceId: String,
     debt: String,
     description: {type: String, default: ""}
})
export const Transact = mongoose.model("transact", transactSchema )

// user schema 
const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true},
    lastName: { type: String, required: true},
    email: { type: String, required: true},
    password: { type: String, required: true},
    businessName: String,
    country: String,
    state: String,
    address: String,
    currency: String,
    businessPhone: String,
    businessEmail: String
})
export const iTrackUsers = mongoose.model("Users", userSchema)

const customerSchema = new mongoose.Schema({
    firstName: { type: String, required: true},
    lastName: { type: String, required: true},
    email: { type: String, required: true},
    sellerEmail: { type: String, required: true},
    phone: { type: String, required: true},
    country: {type: String, default: "Nigeria"},
    state: {type: String, default: ""},
    address: {type: String, default: ""},
    zipCode: {type: String, default: ""},
    description: {type: String, default: "No Comments"},
    imageUrl: {type: String, default: "https://www.google.com/imgres?imgurl=https%3A%2F%2Fcdn.iconscout.com%2Ficon%2Ffree%2Fpng-256%2Ffree-avatar-370-456322.png%3Ff%3Dwebp&tbnid=1rGRKqJOEIn0XM&vet=12ahUKEwiW_sajxt6CAxXMT6QEHazrC-AQMygAegQIARB0..i&imgrefurl=https%3A%2F%2Ficonscout.com%2Ffree-icon%2Favatar-370&docid=7dU_SDvjQWqpFM&w=256&h=256&q=avatar%20icon&ved=2ahUKEwiW_sajxt6CAxXMT6QEHazrC-AQMygAegQIARB0"}
})
export const iTrackCustomers = mongoose.model("Customers", customerSchema)