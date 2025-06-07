const mongoose = require("mongoose");
const CustomerSchema=new mongoose.Schema ({
name:{
type:String,
required:true,
},
surname:{
type:String,
required:true,
},
email:{
type:String,
required:true,
},
subscription: {
type: mongoose.Schema.Types.ObjectId,
ref: "Subscription",
default: null
},
}, { timestamps: true });

const CustomerModel = mongoose.model("customers", CustomerSchema);
module.exports=CustomerModel;