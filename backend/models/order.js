const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

    customer: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            default: ""
        },

        phone: {
            type: String,
            required: true
        },

        address: {
            type: String,
            required: true
        },

        city: {
            type: String,
            required: true
        },

        pincode: {
            type: String,
            required: true
        }
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    products: [
        {
            name: String,
            price: Number,
            quantity: Number
        }
    ],

    totalAmount: {
        type: Number,
        required: true
    },

    paymentMethod: {
        type: String,
        enum: ["COD", "ONLINE"],
        default: "COD"
    },

    paymentStatus: {
        type: String,
        enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
        default: "PENDING"
    },

    orderStatus: {
        type: String,
        enum: [
            "PENDING",
            "CONFIRMED",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED"
        ],
        default: "PENDING"
    },

    razorpayOrderId: {
        type: String,
        default: ""
    },

    razorpayPaymentId: {
        type: String,
        default: ""
    },

    razorpaySignature: {
        type: String,
        default: ""
    },

    orderDate: {
        type: Date,
        default: Date.now
    }
});

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

module.exports = Order;