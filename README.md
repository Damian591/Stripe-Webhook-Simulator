# Stripe-Webhook-Simulator
This project implements a Node.js server with Express that manages customer and subscription data using MongoDB. It simulates Stripe webhook events to mimic real-time subscription updates and processes them to keep internal data models in sync.

## Used Technologies

- **Node.js** – JavaScript runtime environment for building the backend server.
- **Express.js** – Web framework for handling HTTP requests.
- **MongoDB** – NoSQL database used for storing customer and subscription data.
- **Mongoose** – ODM (Object Document Mapper) used for schema-based modeling and interacting with MongoDB.
- **Simulated Stripe Webhooks** – This project does not connect to the real Stripe service. Instead, it simulates webhook events to emulate how subscription lifecycle changes (created, updated, deleted) would be handled in a production environment.
- **Postman** – Used to manually test the backend API endpoints and simulate Stripe webhook events by sending mock JSON payloads.

## Instructions to Run the Project
This guide explains how to download and run the project on your local machine.

### 1. Prerequisites

Before you begin, make sure you have:

1. **Node.js v20.18.0 (LTS)** installed  
2. **MongoDB Atlas account**  
4. **Any code editor** (recommended: Visual Studio Code)

#### 2. Download and open the project in VS Code

1. Click the green **Code** button (usually near the top right).
2. Select **Download ZIP** from the dropdown menu.
3. Save the ZIP file to your computer.
4. Extract the ZIP archive to your desired folder.
5. Open the extracted folder in your code editor (e.g., Visual Studio Code).

From here, you can continue with the usual setup:

- Open terminal/command prompt
- Navigate to the `server` folder
- Run the following command:

```bash
npm install express mongoose cors nodemon .
```
- express  
  > A minimal and flexible Node.js web application framework. Used to handle HTTP requests, create REST APIs, manage routes, and more.

- mongoose  
  > An ODM (Object Data Modeling) library for MongoDB and Node.js. Simplifies interactions with the database using schemas and models.

- cors  
  > Middleware that enables Cross-Origin Resource Sharing. Useful when the frontend and backend are hosted on different domains or ports.

- nodemon  
  > A utility that automatically restarts the Node.js application when file changes are detected. Helps speed up development.
> This command installs all required packages and will create the `node_modules` folder.

---

### 3. Configure MongoDB

1. Go to https://www.mongodb.com/cloud/atlas/register and create an account.
2. Create a free cluster.
3. Add a **database user** and set up your **IP whitelist**.
4. Copy the **connection string** (URI) like this:

```
mongodb+srv://<username>:<password>@cluster0.mongodb.net/<dbname>?retryWrites=true&w=majority
```

5. Open the file `server/index.js`.
6. Locate the line with:

```js
mongoose.connect();
```

7. Replace it with your own MongoDB Atlas connection string:

```js
mongoose.connect("your_connection_string_here");
```
> You can get your connection string from MongoDB Atlas. Make sure to replace `<password>` and other placeholders as needed.

8. In your MongoDB Atlas project, navigate to the **Database** section.

9. Click **"Create Database"** and give it a name (e.g., `stripeDemo`). You can choose any name you prefer.

10. Inside the newly created database, create **two collections**:
    - `customers`
    - `subscriptions`

These collections will be used by the server to store customer and subscription data based on incoming requests and webhook events.

### 4. Start the Server

1. In the same terminal (`server` folder), run:

```bash
npm start
```
> If everything is configured correctly, you will see the messages:  
**The server is working correctly** and **Successfully connected to MongoDB!**  
This means the server has started and is ready to receive requests.

### Project Structure

```
STRIPE-SUBSCRIPTION-WEBHOOK-HANDLER/
└── server/
    ├── mock-payloads/
    │   ├── customer.subscription.created
    │   ├── customer.subscription.deleted
    │   └── customer.subscription.updated
    ├── models/
    │   ├── Customers.js
    │   └── Subscriptions.js
    ├── node_modules/
    ├── index.js
    ├── package.json
    └── package-lock.json
```
---
## Description of Data Structures

### `customers` Collection

Represents a customer who may or may not have an active subscription.

```json
{
  "_id": ObjectId('6842cfb133d3d690b78171ff'),
  "name": "John",
  "surname": "Doe",
  "email": "john.doe@example.com",
  "subscription": "ObjectId"  // Reference to subscriptions collection
  "createdAt": Date,
  "updatedAt": Date
}
```

#### Fields:

| Field         | Type      | Description                                                               |
|---------------|-----------|---------------------------------------------------------------------------|
| `_id`         | ObjectId  | Unique identifier automatically created by MongoDB                        |
| `name`        | String    | First name of the customer                                                |
| `surname`     | String    | Last name of the customer                                                 |
| `email`       | String    | Customer’s email                                                          |
| `subscription`| ObjectId  | Reference to the `subscriptions` document (can be null)                   |
| `timestamps`  | Date      | Automatically includes `createdAt` and `updatedAt`                        |

---

### `subscriptions` Collection

Stores subscription details triggered by Stripe events.

```json
{
  "_id": ObjectId('6842d03a249c5c74bf884844'),
  "StripeEventID": "evt_1Sh0p02eZvKYlo2ChZqv5K1u",
  "customerId": "ObjectId from customers collection",
  "stripeSubscriptionId": "sub_1Sh0oY2eZvKYlo2Cz9Xz5r5a",
  "status": "active",
  "startDate": "Date",
  "currentPeriodStart": "Date",
  "currentPeriodEnd": "Date",
  "cancelAtPeriodEnd": false,
  "canceledAt": null,
  "endedAt": null,
  "createdAt": Date,
  "updatedAt": Date
}
```

#### Fields:

| Field                  | Type     | Description                                    |
|------------------------|----------|------------------------------------------------|
| `_id`         | ObjectId  | Unique identifier automatically created by MongoDB    |
| `StripeEventID`        | String   | Unique Stripe event ID                        |
| `customerId`           | String   | ID from metadata of the Stripe customer       |
| `stripeSubscriptionId` | String   | Stripe subscription ID                        |
| `status`               | String   | Subscription status: `active`, `canceled`, `ended` |
| `startDate`            | Date     | Subscription start date                       |
| `currentPeriodStart`   | Date     | Start of current billing period               |
| `currentPeriodEnd`     | Date     | End of current billing period                 |
| `cancelAtPeriodEnd`    | Boolean  | Will it be canceled at period end?            |
| `canceledAt`           | Date     | Cancellation timestamp, if applicable         |
| `endedAt`              | Date     | Subscription end timestamp, if applicable     |
| `timestamps`           | Date     | Automatically includes `createdAt`, `updatedAt` |

---

## Explanation of Webhook Events

### `customer.subscription.created`

- **Why chosen**: To capture newly created subscriptions on Stripe.
- **How handled**:
  - If subscription does not exist and event ID is new, a new subscription is created in MongoDB.
  - If `metadata.customerId` is present and valid, the customer document is updated to reference this subscription.

---

### `customer.subscription.updated`

- **Why chosen**: Keeps the internal subscription status and billing periods up to date.
- **How handled**:
  - Checks if subscription exists.
  - Updates fields like `status`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, etc.
  - Skips unknown or invalid statuses.

---

### `customer.subscription.deleted`

- **Why chosen**: Tracks canceled/ended subscriptions and unlinks them from customers.
- **How handled**:
  - Marks the subscription as `ended`.
  - Clears `currentPeriodStart` and `currentPeriodEnd`.
  - Searches for the customer referencing this subscription and sets their `subscription` to `null`.

---

## Assumptions, Limitations & Design Considerations

### Assumptions

- Stripe will always send metadata with `customerId` when creating a subscription.
- The `customerId` matches the `_id` of a customer in MongoDB.
- Only relevant Stripe event types (`created`, `updated`, `deleted`) are used.
- Dates from Stripe are in UNIX timestamps (converted properly to JS Date objects).
- Each customer can have only one active subscription at a time.

## Limitations (Code-Level)

### Unique `stripeSubscriptionId` and `StripeEventID` check

A subscription is only created if it doesn't already exist in the database (`stripeSubscriptionId`) and the event hasn't been processed before (`StripeEventID`).

This prevents duplicate records from being created due to repeated webhook deliveries.

---

### Only specific subscription statuses are accepted during updates

When handling `customer.subscription.updated` events, only `active` and `canceled` statuses are allowed.

Any other status (e.g., `past_due`, `incomplete`) is ignored, and a log entry is created indicating the invalid status.

---

### Only 3 event types are supported

The handler explicitly processes only:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

All other event types are ignored and logged with a message.

---

### Missing `stripeSubscriptionId` causes early termination

If the webhook payload does not include a `stripeSubscriptionId`, the request is rejected with `400 Bad Request` and a corresponding warning is logged.

---

### Subscription is not linked to a customer if `metadata.customerId` is missing or invalid

If the `customerId` is not provided in metadata or is not a valid `ObjectId`, the subscription is still saved but remains unlinked from any customer.

This is checked using:
- `mongoose.Types.ObjectId.isValid(...)`
- `CustomerModel.findById(...)`

---

### Deleted subscriptions are not removed from the database

Instead of deleting the document, the subscription is marked as ended and its date fields are updated:

- `status` → `"ended"`
- `endedAt` → either the provided timestamp or the current date
- `currentPeriodStart` and `currentPeriodEnd` → set to `null`
- The reference to the customer in the `customers` collection (`subscription` field) is also removed (set to `null`)

---

### Customer record is only updated if it exists

If no matching customer is found for the given `customerId`, the system logs a warning but proceeds without failing the entire flow.

---

### No transactional consistency

If an error occurs after creating the subscription (e.g., while updating the customer document), there is no rollback mechanism.

This can lead to partial updates being stored in the database.

---

## API Endpoints

### GET `/getCustomers`

- Retrieves all customers.

### POST `/createCustomer`

- Creates a new customer.
- Expects body:
```json
{
  "name":"Alex",
  "surname":"Brown",
  "email":"alex.brown@gmail.com" 
}
```
- The `subscription` field is automatically set to `null` by default and does not need to be provided in the request body.

### DELETE `/deleteCustomer/:id`

- Deletes a customer by ID.

### POST `/webhook`

- Receives Stripe events and updates MongoDB accordingly.
- Expects Stripe to POST subscription events as JSON.
---
- customer.subscription.created
```json
{
  "id": "evt_1Sh0p02eZvKYlo2ChZqv5K1u",
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "sub_id": "sub_1Sh0oY2eZvKYlo2Cz9Xz5r5a",
      "status": "active",
      "start_date": 1717478400,
      "current_period_start": 1717478400,
      "current_period_end": 1720070400,
      "cancel_at_period_end": false,
      "canceled_at": null,
      "ended_at": null,
      "metadata": {
        "customerId": "6842cfb133d3d690b78171ff"
      }
    }
  }
}
```
---
- customer.subscription.updated
```json
{
  "id": "evt_1Sh1a12eZvKYlo2CeE8x9D1x",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "sub_id": "sub_1Sh0oY2eZvKYlo2Cz9Xz5r5a",
      "status": "active",
      "start_date": 1717478400,
      "current_period_start": 1720070400,
      "current_period_end": 1722748800,
      "cancel_at_period_end": true,
      "canceled_at": null,
      "ended_at": null,
      "metadata": {
        "customerId": "6842cfb133d3d690b78171ff"
      }
    }
  }
}
```
---
- customer.subscription.deleted
```json
{
  "id": "evt_1Sh1bR2eZvKYlo2CUb2v0Eqo",
  "type": "customer.subscription.deleted",
  "data": {
    "object": {
      "sub_id": "sub_1Sh0oY2eZvKYlo2Cz9Xz5r5a",
      "status": "canceled",
      "start_date": 1717478400,
      "current_period_start": 1720070400,
      "current_period_end": 1722748800,
      "cancel_at_period_end": true,
      "canceled_at": 1721000000,
      "ended_at": 1722748800,
      "metadata": {
        "customerId": "6842cfb133d3d690b78171ff"
      }
    }
  }
}
```
