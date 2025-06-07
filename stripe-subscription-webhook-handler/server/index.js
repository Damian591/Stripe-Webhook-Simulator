const express = require ("express");
const app = express();
const mongoose=require('mongoose');
const CustomerModel=require("./models/Customers");
const SubscriptionModel=require("./models/Subscriptions");

app.use(express.json());


app.listen(3001, () => {
console.log("The server is working correctly");
});

mongoose.connect ("mongodb+srv://Admin:Admin@cluster0.zfdsc.mongodb.net/Supernaut_Billing?retryWrites=true&w=majority&appName=Cluster0")
.then(() => console.log("Successfully connected to MongoDB!"))
    .catch(err => console.error("Could not connect to MongoDB:", err));

app.get("/getCustomers", (req, res)=>{
    CustomerModel.find().then(function(response){
    res.json(response);
    }).catch(function(err){
    res.json(err);
    })
    });

app.post("/createCustomer", async (req, res)=>{
    const customer = req.body;
    const newCustomer = new CustomerModel (customer);
    await newCustomer.save();
    res.json(customer)
    });

app.delete('/deleteCustomer/:id', async (req, res)=>{
    try {
    await CustomerModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Customer deleted '});
    } catch (err) {
    res.status(500).json({messsage: err.message})
    }
    });


app.post("/webhook", async (req, res) => {
  const event = req.body;

  if (!event || !event.type || !event.data || !event.data.object) {
    console.warn("Invalid event payload received.");
    return res.status(400).send("Invalid payload");
  }

  const { type, data } = event;
  const object = data.object;

  const StripeEventID = event.id;
  const stripeSubscriptionId = object.sub_id;
  const customerId = object.metadata?.customerId || null;
  const now = new Date();

  if (!stripeSubscriptionId) {
    console.warn("No stripeSubscriptionId provided in the webhook payload.");
    return res.status(400).send("Missing subscription ID");
  }

  try {
    let subscription = await SubscriptionModel.findOne({ stripeSubscriptionId });
    let existingEvent = await SubscriptionModel.findOne({ StripeEventID });

    switch (type) {
      case "customer.subscription.created":
        if (subscription || existingEvent) {
          console.log("Skipping subscription creation due to duplication:");
        if (subscription) {
          console.log(`Subscription with stripeSubscriptionId ${stripeSubscriptionId} already exists.`);
        }
        if (existingEvent) {
          console.log(`Subscription with StripeEventID ${StripeEventID} already exists.`);
        }
          break;
        }

        subscription = new SubscriptionModel({
          StripeEventID,
          customerId,
          stripeSubscriptionId,
          status: object.status || "active",
          startDate: object.start_date ? new Date(object.start_date * 1000) : now,
          currentPeriodStart: object.current_period_start ? new Date(object.current_period_start * 1000) : null,
          currentPeriodEnd: object.current_period_end ? new Date(object.current_period_end * 1000) : null,
          cancelAtPeriodEnd: object.cancel_at_period_end ?? false,
          canceledAt: object.canceled_at ? new Date(object.canceled_at * 1000) : null,
        });

        await subscription.save();
        console.log(`Subscription with ID ${stripeSubscriptionId} created.`);

        if (customerId) {
          if (mongoose.Types.ObjectId.isValid(customerId)) {
            try {
              const customer = await CustomerModel.findById(customerId);
              if (customer) {
                customer.subscription = subscription._id;
                await customer.save();
                console.log(`Customer ${customerId} linked to subscription ${subscription._id}`);
              } else {
                console.warn(`Customer with ID ${customerId} not found.`);
              }
            } catch (err) {
              console.error("Error while linking customer to subscription:", err);
            }
          } else {
            console.warn(`Invalid customerId format: ${customerId}`);
          }
        } else {
          console.warn("No customerId in metadata. Cannot link subscription.");
        }
        break;

      case "customer.subscription.updated":
        if (!subscription) {
          console.log(`Subscription with ID ${stripeSubscriptionId} not found for update.`);
          break;
        }

        const allowedStatuses = ["active", "canceled"];
        const newStatus = object.status;

        if (!allowedStatuses.includes(newStatus)) {
          console.log(`Invalid subscription status received: '${newStatus}'. Update skipped.`);
          break;
        }

        await SubscriptionModel.findOneAndUpdate(
          { stripeSubscriptionId },
          {
            status: newStatus,
            currentPeriodStart: object.current_period_start ? new Date(object.current_period_start * 1000) : null,
            currentPeriodEnd: object.current_period_end ? new Date(object.current_period_end * 1000) : null,
            cancelAtPeriodEnd: object.cancel_at_period_end ?? false,
            canceledAt: object.canceled_at ? new Date(object.canceled_at * 1000) : null,
            endedAt: object.ended_at ? new Date(object.ended_at * 1000) : null,
          },
          { new: true }
        );
        console.log(`Subscription with ID ${stripeSubscriptionId} updated.`);
        break;

      case "customer.subscription.deleted":
        if (!subscription) {
          console.log(`Subscription with ID ${stripeSubscriptionId} not found for deletion.`);
          break;
        }

        await SubscriptionModel.findOneAndUpdate(
          { stripeSubscriptionId },
          {
            status: "ended",
            endedAt: object.ended_at ? new Date(object.ended_at * 1000) : now,
            currentPeriodStart: null,
            currentPeriodEnd: null,
          },
          { new: true }
        );

        console.log(`Subscription with ID ${stripeSubscriptionId} marked as ended.`);

        try {
          const updatedSubscription = await SubscriptionModel.findOne({ stripeSubscriptionId });
          if (updatedSubscription) {
            const customer = await CustomerModel.findOne({ subscription: updatedSubscription._id });
            if (customer) {
              customer.subscription = null;
              await customer.save();
              console.log(`Subscription reference removed from customer ${customer._id}`);
            } else {
              console.warn(`No customer found linked to subscription ${updatedSubscription._id}`);
            }
          }
        } catch (err) {
          console.error("Error removing subscription reference from customer:", err);
        }

        break;

      default:
        console.log("Unhandled event type:", type);
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Webhook handling error:", error);
    res.status(500).send("Webhook error");
  }
});