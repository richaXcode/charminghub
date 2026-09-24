require("dotenv").config({ path: __dirname + "/.env" });

const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const path = require("path");

const Product = require("./models/Product");
const Order = require("./models/order");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "..")));

const JWT_SECRET = process.env.JWT_SECRET || "charminghub_jwt_super_secret_key_2026_secured";

// Razorpay Client Helper
function getRazorpayInstance() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId === "rzp_test_YourKeyIdHere") {
        return null;
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret
    });
}

// ===============================
// JWT HELPER FUNCTIONS & MIDDLEWARE
// ===============================

function generateToken(user) {
    return jwt.sign(
        {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role || "USER"
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Authentication required. Please login."
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        if (err) {
            return res.status(403).json({
                message: "Session expired or invalid token. Please login again."
            });
        }
        req.user = decodedUser;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({
            message: "Access denied. Admin privileges required."
        });
    }
    next();
}

function optionalAuth(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
            if (!err) {
                req.user = decodedUser;
            }
            next();
        });
    } else {
        next();
    }
}

// ===============================
// USER SIGNUP API
// ===============================

app.post("/api/signup", async (req, res) => {

    try {

        const { name, email, password } = req.body;

        // Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Please fill all fields"
            });
        }

        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({
                message: "Please enter a valid email address"
            });
        }

        // Password length validation
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: trimmedEmail });

        if (existingUser) {
            return res.status(400).json({
                message: "An account with this email already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            name: trimmedName,
            email: trimmedEmail,
            password: hashedPassword,
            role: "USER"
        });

        const savedUser = await user.save();
        const token = generateToken(savedUser);

        res.status(201).json({
            message: "Signup successful! 🎉",
            token,
            user: {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
                role: savedUser.role
            }
        });

    } catch (error) {

        console.log("Signup error:", error);

        res.status(500).json({
            message: "Error during signup",
            error: error.message
        });

    }

});

// ===============================
// ADMIN DASHBOARD STATS
// ===============================

app.get("/api/admin/stats", authenticateToken, requireAdmin, async (req, res) => {

    try {

        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();

        // Calculate verified revenue (only PAID orders or delivered/confirmed COD)
        const revenueResult = await Order.aggregate([
            {
                $match: {
                    $or: [
                        { paymentStatus: "PAID" },
                        { paymentMethod: "COD", orderStatus: { $in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: "$totalAmount"
                    }
                }
            }
        ]);

        const totalRevenue =
            revenueResult.length > 0
                ? revenueResult[0].totalRevenue
                : 0;

        res.status(200).json({
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue
        });

    } catch (error) {

        console.log("Admin stats error:", error);

        res.status(500).json({
            message: "Could not load dashboard stats",
            error: error.message
        });

    }

});

// ===============================
// ADMIN LOGIN API
// ===============================

app.post("/api/admin/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter email and password"
            });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: trimmedEmail });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // ADMIN CHECK
        const role = user.role || user["role "];
        if (role !== "ADMIN") {
            return res.status(403).json({
                message: "Access denied. Admin privileges required."
            });
        }

        const token = generateToken(user);

        res.status(200).json({
            message: "Admin login successful! 🎉",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: "ADMIN"
            }
        });

    } catch (error) {

        console.log("Admin login error:", error);

        res.status(500).json({
            message: "Error during admin login",
            error: error.message
        });

    }
});

// ===============================
// USER LOGIN API
// ===============================

app.post("/api/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        // Check fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter email and password"
            });
        }

        const trimmedEmail = email.trim().toLowerCase();

        // Find user
        const user = await User.findOne({ email: trimmedEmail });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Check password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = generateToken(user);

        // Login successful
        res.status(200).json({
            message: "Login successful! 🎉",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role || "USER"
            }
        });

    } catch (error) {

        console.log("Login error:", error);

        res.status(500).json({
            message: "Error during login",
            error: error.message
        });

    }

});

// Website files and images
app.use(express.static(path.join(__dirname, "..")));

const PORT = process.env.PORT || 3000;

// ===============================
// MONGODB CONNECTION
// ===============================

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully! ✅");
    })
    .catch((error) => {
        console.log("MongoDB connection failed ❌");
        console.log(error);
    });

// ===============================
// PRODUCTS API
// ===============================

app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find();

        res.json(products);

    } catch (error) {

        res.status(500).json({
            message: "Error fetching products",
            error: error.message
        });

    }
});
// ===============================
// ADD PRODUCT
// ===============================

// ===============================
// ADD PRODUCT (ADMIN ONLY)
// ===============================

app.post("/api/products", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, price, image, description, category } = req.body;

        if (!name || price === undefined || !image) {
            return res.status(400).json({
                message: "Product name, price, and image are required"
            });
        }

        const product = new Product({
            name: name.trim(),
            price: Number(price),
            image: image.trim(),
            description: description ? description.trim() : "",
            category: category ? category.trim() : "Handmade"
        });

        const savedProduct = await product.save();

        res.status(201).json({
            message: "Product added successfully! 🎉",
            product: savedProduct
        });

    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({
            message: "Error adding product",
            error: error.message
        });
    }
});

// ===============================
// UPDATE PRODUCT (ADMIN ONLY)
// ===============================

app.put("/api/products/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {

        const updateData = { ...req.body };
        if (updateData.price !== undefined) {
            updateData.price = Number(updateData.price);
        }

        const updatedProduct =
            await Product.findByIdAndUpdate(
                req.params.id,
                updateData,
                {
                    new: true,
                    runValidators: true
                }
            );

        if (!updatedProduct) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.status(200).json({
            message: "Product updated successfully! ✅",
            product: updatedProduct
        });

    } catch (error) {

        console.log("Update product error:", error);

        res.status(500).json({
            message: "Error updating product",
            error: error.message
        });

    }
});


// ===============================
// DELETE PRODUCT (ADMIN ONLY)
// ===============================

app.delete("/api/products/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {

        const deletedProduct =
            await Product.findByIdAndDelete(
                req.params.id
            );

        if (!deletedProduct) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.status(200).json({
            message: "Product deleted successfully",
            product: deletedProduct
        });

    } catch (error) {

        console.log("Delete product error:", error);

        res.status(500).json({
            message: "Error deleting product",
            error: error.message
        });

    }
});

// ===============================
// ORDERS API
// ===============================

app.post("/api/orders", optionalAuth, async (req, res) => {

    try {

        const orderData = { ...req.body };

        // Attach authenticated user id and email if logged in
        if (req.user) {
            orderData.userId = req.user.id;
            if (!orderData.customer) {
                orderData.customer = {};
            }
            if (!orderData.customer.email) {
                orderData.customer.email = req.user.email;
            }
        }

        // Validate customer fields
        if (!orderData.customer || !orderData.customer.name || !orderData.customer.phone || !orderData.customer.address || !orderData.customer.city || !orderData.customer.pincode) {
            return res.status(400).json({
                message: "Please complete all required customer checkout fields"
            });
        }

        // Validate products
        if (!orderData.products || !Array.isArray(orderData.products) || orderData.products.length === 0) {
            return res.status(400).json({
                message: "Your cart is empty. Please add products before placing an order."
            });
        }

        const order = new Order(orderData);

        const savedOrder = await order.save();

        res.status(201).json({
            message: "Order placed successfully! 🎉",
            order: savedOrder
        });

    } catch (error) {

        console.error("Order placement error:", error);

        res.status(500).json({
            message: "Error placing order",
            error: error.message
        });

    }

});

// ===============================
// RAZORPAY PAYMENT CONFIG
// ===============================

app.get("/api/payment/config", (req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const isConfigured = Boolean(
        keyId &&
        process.env.RAZORPAY_KEY_SECRET &&
        keyId !== "rzp_test_YourKeyIdHere"
    );

    res.status(200).json({
        keyId: isConfigured ? keyId : "",
        isConfigured
    });
});

// ===============================
// CREATE RAZORPAY ORDER
// ===============================

app.post("/api/payment/create-order", optionalAuth, async (req, res) => {
    try {
        const { products, customer } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: "Your cart is empty" });
        }

        const razorpay = getRazorpayInstance();
        if (!razorpay) {
            return res.status(503).json({
                message: "Razorpay payment gateway is not yet activated or credentials are not configured in backend/.env. Please use Cash on Delivery (COD) or add your Razorpay keys."
            });
        }

        // Calculate total amount securely server-side
        let totalAmount = 0;
        for (const item of products) {
            const price = Number(item.price) || 0;
            const quantity = Number(item.quantity) || 1;
            totalAmount += price * quantity;
        }

        if (totalAmount <= 0) {
            return res.status(400).json({ message: "Invalid order amount" });
        }

        const options = {
            amount: Math.round(totalAmount * 100), // amount in paise
            currency: "INR",
            receipt: "order_rcpt_" + Date.now().toString().slice(-8),
            notes: {
                customerName: customer ? customer.name : "Customer",
                customerPhone: customer ? customer.phone : ""
            }
        };

        const razorpayOrder = await razorpay.orders.create(options);

        res.status(200).json({
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error("Razorpay order creation error:", error);
        res.status(500).json({
            message: "Could not create Razorpay order",
            error: error.message
        });
    }
});

// ===============================
// VERIFY RAZORPAY PAYMENT & SAVE ORDER
// ===============================

app.post("/api/payment/verify-payment", optionalAuth, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderData
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Incomplete payment verification payload"
            });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            return res.status(500).json({
                success: false,
                message: "Server is missing payment secret"
            });
        }

        // Cryptographic HMAC SHA256 Signature Verification
        const generatedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            console.warn("Invalid payment signature received:", {
                generatedSignature,
                receivedSignature: razorpay_signature
            });
            return res.status(400).json({
                success: false,
                message: "Payment verification failed: Invalid cryptographic signature"
            });
        }

        // Prevent duplicate order creation for the same payment
        const existingOrder = await Order.findOne({
            $or: [
                { razorpayPaymentId: razorpay_payment_id },
                { razorpayOrderId: razorpay_order_id }
            ]
        });

        if (existingOrder) {
            existingOrder.paymentStatus = "PAID";
            await existingOrder.save();
            return res.status(200).json({
                success: true,
                message: "Payment already recorded",
                order: existingOrder
            });
        }

        // Prepare new order with verified payment
        const newOrderData = {
            ...orderData,
            paymentMethod: "ONLINE",
            paymentStatus: "PAID",
            orderStatus: "PENDING",
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature
        };

        if (req.user) {
            newOrderData.userId = req.user.id;
            if (!newOrderData.customer) newOrderData.customer = {};
            if (!newOrderData.customer.email) {
                newOrderData.customer.email = req.user.email;
            }
        }

        const order = new Order(newOrderData);
        const savedOrder = await order.save();

        res.status(201).json({
            success: true,
            message: "Payment verified and order placed successfully! 🎉",
            order: savedOrder
        });

    } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).json({
            success: false,
            message: "Error verifying payment",
            error: error.message
        });
    }
});

// ===============================
// RAZORPAY WEBHOOK HANDLER
// ===============================

app.post("/api/payment/webhook", async (req, res) => {
    try {
        const webhookSignature = req.headers["x-razorpay-signature"];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

        if (!webhookSignature || !webhookSecret) {
            return res.status(400).json({ message: "Signature or secret missing" });
        }

        const bodyToVerify = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(bodyToVerify)
            .digest("hex");

        if (expectedSignature !== webhookSignature) {
            console.warn("Invalid Razorpay webhook signature");
            return res.status(400).json({ message: "Invalid webhook signature" });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        if (event === "payment.captured" || event === "order.paid") {
            const paymentEntity = payload && payload.payment ? payload.payment.entity : null;
            const orderId = paymentEntity ? paymentEntity.order_id : null;
            const paymentId = paymentEntity ? paymentEntity.id : null;

            if (orderId || paymentId) {
                await Order.updateOne(
                    {
                        $or: [
                            { razorpayOrderId: orderId },
                            { razorpayPaymentId: paymentId }
                        ]
                    },
                    {
                        $set: {
                            paymentStatus: "PAID"
                        }
                    }
                );
            }
        } else if (event === "payment.failed") {
            const paymentEntity = payload && payload.payment ? payload.payment.entity : null;
            const orderId = paymentEntity ? paymentEntity.order_id : null;

            if (orderId) {
                await Order.updateOne(
                    { razorpayOrderId: orderId },
                    {
                        $set: {
                            paymentStatus: "FAILED"
                        }
                    }
                );
            }
        }

        res.status(200).json({ status: "ok" });

    } catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).json({ message: "Webhook error", error: error.message });
    }
});

// ===============================
// ADMIN - GET ALL ORDERS
// ===============================

app.get("/api/admin/orders", authenticateToken, requireAdmin, async (req, res) => {

    try {

        const orders =
            await Order.find()
                .sort({
                    orderDate: -1
                });

        res.status(200).json(orders);

    } catch (error) {

        console.error(
            "Admin orders error:",
            error
        );

        res.status(500).json({
            message: "Could not load orders",
            error: error.message
        });

    }

});

// ===============================
// ADMIN - UPDATE ORDER STATUS
// ===============================

app.put("/api/admin/orders/:id/status", authenticateToken, requireAdmin, async (req, res) => {

    try {
        const { orderStatus, paymentStatus } = req.body;

        const updateFields = {};

        // Allowed order statuses
        const allowedOrderStatuses = [
            "PENDING",
            "CONFIRMED",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED"
        ];

        if (orderStatus !== undefined) {
            if (!allowedOrderStatuses.includes(orderStatus)) {
                return res.status(400).json({
                    message: "Invalid order status"
                });
            }
            updateFields.orderStatus = orderStatus;
        }

        // Allowed payment statuses
        const allowedPaymentStatuses = [
            "PENDING",
            "PAID",
            "FAILED",
            "REFUNDED"
        ];

        if (paymentStatus !== undefined) {
            if (!allowedPaymentStatuses.includes(paymentStatus)) {
                return res.status(400).json({
                    message: "Invalid payment status"
                });
            }
            updateFields.paymentStatus = paymentStatus;
        }

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({
                message: "No valid status fields provided to update"
            });
        }

        const updatedOrder =
            await Order.findByIdAndUpdate(
                req.params.id,
                { $set: updateFields },
                {
                    new: true,
                    runValidators: false
                }
            );

        if (!updatedOrder) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        res.status(200).json({
            message: "Order status updated successfully",
            order: updatedOrder
        });

    } catch (error) {

        console.error(
            "Update order status error:",
            error
        );

        res.status(500).json({
            message: "Could not update order status",
            error: error.message
        });

    }

});

// ===============================
// ADMIN - GET ALL USERS
// ===============================

app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({}, "-password").sort({ _id: -1 });
        res.status(200).json(users);
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({
            message: "Could not load users",
            error: error.message
        });
    }
});

// ===============================
// CUSTOMER - GET OWN ORDERS (SECURE)
// ===============================

app.get("/api/my-orders", authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const userId = req.user.id;

        const query = {
            $or: [
                { "customer.email": userEmail }
            ]
        };

        if (userId) {
            query.$or.push({ userId: userId });
        }

        const orders = await Order.find(query).sort({
            orderDate: -1
        });

        res.status(200).json(orders);
    } catch (error) {
        console.error("Error fetching customer orders:", error);
        res.status(500).json({
            message: "Error fetching orders",
            error: error.message
        });
    }
});

// ===============================
// GET USER ORDERS BY EMAIL (LEGACY / FALLBACK)
// ===============================

app.get("/api/orders/:identifier", optionalAuth, async (req, res) => {

    try {

        const identifier = req.params.identifier.trim();

        // 1. If identifier is a valid MongoDB ObjectId, check lookup by Order ID
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            const singleOrder = await Order.findById(identifier);
            if (singleOrder) {
                // If authenticated as regular user, verify ownership
                if (req.user && req.user.role !== "ADMIN") {
                    if (singleOrder.customer.email && singleOrder.customer.email.toLowerCase() !== req.user.email.toLowerCase()) {
                        return res.status(403).json({
                            message: "Access denied. You can only view your own orders."
                        });
                    }
                }
                return res.status(200).json(singleOrder);
            }
        }

        // 2. Otherwise treat identifier as customer email
        const email = identifier.toLowerCase();

        // If authenticated as regular user, verify email matches token
        if (req.user && req.user.role !== "ADMIN" && req.user.email !== email) {
            return res.status(403).json({
                message: "Access denied. You can only view your own orders."
            });
        }

        const orders = await Order.find({
            "customer.email": email
        }).sort({
            orderDate: -1
        });

        res.status(200).json(orders);

    } catch (error) {

        console.log("Error fetching orders:", error);

        res.status(500).json({
            message: "Error fetching orders",
            error: error.message
        });

    }

});


// ===============================
// START SERVER
// ===============================

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend running at http://localhost:${PORT}`);
    });
}

module.exports = app;