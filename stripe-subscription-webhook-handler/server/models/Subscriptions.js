const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  StripeEventID: {
    type: String,
    required: true,
    unique: true,
  },  
  customerId: {
    type: String,
    required: true,
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["active", "canceled", "ended"],
    default: "none",
    required: true,
  },
  startDate: {
    type: Date,
  },
  currentPeriodStart: {
    type: Date,
  },
  currentPeriodEnd: {
    type: Date,
  },
  cancelAtPeriodEnd: {
    type: Boolean,
  },
  canceledAt: {
    type: Date,
  },
  endedAt: {
    type: Date,
  },
}, { timestamps: true });

const SubscriptionModel = mongoose.model("subscriptions", SubscriptionSchema);

module.exports = SubscriptionModel;