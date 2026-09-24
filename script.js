// ==========================================
// CHARMINGHUB - STOREFRONT JAVASCRIPT
// Handcrafted Jewellery & Customized Gifts
// ==========================================

// Global Store State
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let allProducts = [];
let activeCategory = "ALL";
let searchQuery = "";

// ===============================
// 1. TOAST & NOTIFICATION HELPERS
// ===============================

function showStoreToast(message, isError = false) {
    const toast = document.getElementById("store-toast");
    if (!toast) return;

    toast.textContent = message;
    toast.style.background = isError ? "#e53e3e" : "#2d3748";
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: "smooth" });
    }
}

function scrollToCart() {
    scrollToSection("cart-section");
}

// ===============================
// 2. PRODUCT CATALOG & SEARCH/FILTER
// ===============================

async function loadProducts() {
    const container = document.getElementById("product-container");
    if (!container) return;

    try {
        const response = await fetch("http://localhost:3000/api/products");
        const products = await response.json();

        if (!response.ok) {
            container.innerHTML = "<p style='grid-column: 1 / -1; text-align: center; color: red;'>❌ Could not load products.</p>";
            return;
        }

        allProducts = products;
        renderProducts();

    } catch (error) {
        console.error("Error loading products:", error);
        if (container) {
            container.innerHTML = "<p style='grid-column: 1 / -1; text-align: center; color: #888;'>Unable to connect to the store catalog.</p>";
        }
    }
}

function renderProducts() {
    const container = document.getElementById("product-container");
    const countBadge = document.getElementById("product-count-badge");
    if (!container) return;

    // Filter by category and search query
    let filtered = allProducts.filter(product => {
        // Category check
        let matchesCategory = true;
        if (activeCategory !== "ALL") {
            const prodCat = (product.category || "").toLowerCase();
            const targetCat = activeCategory.toLowerCase();
            matchesCategory = prodCat.includes(targetCat) || targetCat.includes(prodCat);
        }

        // Search query check
        let matchesSearch = true;
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase().trim();
            const nameMatch = (product.name || "").toLowerCase().includes(query);
            const descMatch = (product.description || "").toLowerCase().includes(query);
            const catMatch = (product.category || "").toLowerCase().includes(query);
            matchesSearch = nameMatch || descMatch || catMatch;
        }

        return matchesCategory && matchesSearch;
    });

    // Update count indicator
    if (countBadge) {
        const categoryLabel = activeCategory === "ALL" ? "All" : activeCategory;
        const searchNotice = searchQuery ? ` for "${escapeHtml(searchQuery)}"` : "";
        countBadge.textContent = `Showing ${filtered.length} product${filtered.length === 1 ? "" : "s"} (${categoryLabel}${searchNotice})`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: #718096;">
                <div style="font-size: 40px; margin-bottom: 10px;">🔍</div>
                <h3>No products found</h3>
                <p style="margin-top: 6px;">Try adjusting your search or select a different category.</p>
                <button type="button" class="btn-primary" style="margin-top: 15px;" onclick="resetFilters()">
                    View All Products
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    filtered.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";

        const safeImage = escapeHtml(product.image || "images/product image1.png");
        const safeName = escapeHtml(product.name || "Handcrafted Item");
        const safeCategory = escapeHtml(product.category || "Handmade");
        const safeDesc = escapeHtml(product.description || "Handcrafted with premium materials.");
        const price = Number(product.price || 0).toLocaleString("en-IN");

        card.innerHTML = `
            <div class="product-image">
                <img
                    src="${safeImage}"
                    alt="${safeName}"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='images/product image1.png';"
                >
            </div>
            <div class="product-card-body">
                <span class="product-cat-tag">${safeCategory}</span>
                <h3>${safeName}</h3>
                <p class="product-card-desc">${safeDesc}</p>
                <div class="product-card-footer">
                    <span class="price">₹${price}</span>
                    <button type="button" class="add-cart-btn">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;

        const addBtn = card.querySelector(".add-cart-btn");
        addBtn.addEventListener("click", function () {
            addToCart(product);
            addBtn.classList.add("added");
            addBtn.textContent = "Added ✓";
            setTimeout(() => {
                addBtn.classList.remove("added");
                addBtn.textContent = "Add to Cart";
            }, 1200);
        });

        container.appendChild(card);
    });
}

function setupSearchAndFilters() {
    const searchInput = document.getElementById("product-search");
    const clearBtn = document.getElementById("clear-search-btn");

    if (searchInput) {
        searchInput.addEventListener("input", function (e) {
            searchQuery = e.target.value;
            if (clearBtn) {
                clearBtn.style.display = searchQuery ? "flex" : "none";
            }
            renderProducts();
        });
    }
}

function clearProductSearch() {
    const searchInput = document.getElementById("product-search");
    const clearBtn = document.getElementById("clear-search-btn");
    if (searchInput) searchInput.value = "";
    if (clearBtn) clearBtn.style.display = "none";
    searchQuery = "";
    renderProducts();
}

function filterByCategory(category, btnElement) {
    activeCategory = category;

    // Update active button state
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    if (btnElement) {
        btnElement.classList.add("active");
    }

    renderProducts();
}

function selectCategoryCard(category) {
    activeCategory = category;

    // Highlight button in filters
    document.querySelectorAll(".filter-btn").forEach(btn => {
        if (btn.getAttribute("data-category") === category) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    renderProducts();
    scrollToSection("products");
}

function resetFilters() {
    activeCategory = "ALL";
    searchQuery = "";
    const searchInput = document.getElementById("product-search");
    if (searchInput) searchInput.value = "";
    const clearBtn = document.getElementById("clear-search-btn");
    if (clearBtn) clearBtn.style.display = "none";

    document.querySelectorAll(".filter-btn").forEach(btn => {
        if (btn.getAttribute("data-category") === "ALL") {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    renderProducts();
}

// ===============================
// 3. INTERACTIVE CUSTOM GIFT FORM
// ===============================

function setupCustomGiftForm() {
    const form = document.getElementById("custom-gift-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const name = document.getElementById("custom-name").value.trim();
        const type = document.getElementById("custom-type").value;
        const note = document.getElementById("custom-note").value.trim();

        if (!name) {
            showStoreToast("Please provide the recipient's name or inscription.", true);
            return;
        }

        // Map price based on item style
        let price = 599;
        let image = "images/Gift Hamper.png.jpeg";

        if (type.includes("Hamper")) {
            price = 699;
            image = "images/Gift Hamper.png.jpeg";
        } else if (type.includes("Tote")) {
            price = 499;
            image = "images/mithila Painting Tote bag.png.jpeg";
        } else if (type.includes("Earrings")) {
            price = 399;
            image = "images/floral earings.png.jpeg";
        } else if (type.includes("Pendant")) {
            price = 599;
            image = "images/product image1.png";
        }

        const customProduct = {
            _id: "custom-" + Date.now(),
            name: `${type} for "${name}"`,
            price: price,
            image: image,
            category: "Customized Gifts",
            customNote: note
        };

        addToCart(customProduct);
        showStoreToast(`✨ Added ${customProduct.name} to your cart!`);

        form.reset();
        scrollToSection("cart-section");
    });
}

// ===============================
// 4. CART LOGIC
// ===============================

function addToCart(product) {
    const existingIndex = cart.findIndex(item => item._id === product._id);

    if (existingIndex !== -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            _id: product._id,
            name: product.name,
            price: Number(product.price),
            image: product.image,
            quantity: 1
        });
    }

    saveCart();
    updateCart();
    showStoreToast(`Added "${product.name}" to cart! 🛍️`);
}

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCart() {
    const cartCountEl = document.getElementById("cart-count");
    const cartItemsEl = document.getElementById("cart-items");
    const cartTotalEl = document.getElementById("cart-total");

    // Total quantity
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountEl) cartCountEl.textContent = totalQty;

    // Total amount
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotalEl) cartTotalEl.textContent = totalAmount.toLocaleString("en-IN");

    if (!cartItemsEl) return;

    if (cart.length === 0) {
        cartItemsEl.innerHTML = `
            <div style="padding: 30px; text-align: center; color: #888;">
                <p style="font-size: 16px;">Your cart is currently empty. 🛍️</p>
                <a href="#products" class="shop-btn" style="display: inline-block; margin-top: 15px; padding: 10px 20px; font-size: 13px;">Browse Products</a>
            </div>
        `;
        return;
    }

    cartItemsEl.innerHTML = "";

    cart.forEach((item, index) => {
        const itemRow = document.createElement("div");
        itemRow.className = "cart-item";

        const itemTotal = (item.price * item.quantity).toLocaleString("en-IN");

        itemRow.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-title">${escapeHtml(item.name)}</span>
                <span class="cart-item-price">₹${item.price.toLocaleString("en-IN")} each</span>
            </div>

            <div class="quantity-controls">
                <button type="button" onclick="decreaseQuantity(${index})">−</button>
                <span>${item.quantity}</span>
                <button type="button" onclick="increaseQuantity(${index})">+</button>
            </div>

            <div style="display: flex; align-items: center; gap: 15px;">
                <strong style="color: var(--dark); font-size: 15px;">₹${itemTotal}</strong>
                <button type="button" class="cart-item-remove" onclick="removeFromCart(${index})" title="Remove item">🗑️</button>
            </div>
        `;

        cartItemsEl.appendChild(itemRow);
    });
}

function increaseQuantity(index) {
    if (cart[index]) {
        cart[index].quantity += 1;
        saveCart();
        updateCart();
    }
}

function decreaseQuantity(index) {
    if (cart[index]) {
        if (cart[index].quantity > 1) {
            cart[index].quantity -= 1;
        } else {
            cart.splice(index, 1);
        }
        saveCart();
        updateCart();
    }
}

function removeFromCart(index) {
    if (cart[index]) {
        const removed = cart.splice(index, 1);
        saveCart();
        updateCart();
        if (removed[0]) {
            showStoreToast(`Removed "${removed[0].name}"`);
        }
    }
}

// ===============================
// 5. CHECKOUT & REAL RAZORPAY INTEGRATION
// ===============================

function openCheckoutSection() {
    if (cart.length === 0) {
        showStoreToast("Your cart is empty! Please add some items first.", true);
        scrollToSection("products");
        return;
    }

    const checkoutSec = document.getElementById("checkout-section");
    if (checkoutSec) {
        checkoutSec.style.display = "block";
        scrollToSection("checkout-section");

        // Pre-fill user data if logged in
        const userEmail = localStorage.getItem("userEmail");
        const userName = localStorage.getItem("userName");
        if (userEmail && document.getElementById("customer-email")) {
            if (!document.getElementById("customer-email").value) {
                document.getElementById("customer-email").value = userEmail;
            }
        }
        if (userName && document.getElementById("customer-name")) {
            if (!document.getElementById("customer-name").value) {
                document.getElementById("customer-name").value = userName;
            }
        }
    }
}

function setupCheckout() {
    const paymentSelect = document.getElementById("payment-method");
    const onlineInfo = document.getElementById("online-payment-info");
    const checkoutForm = document.getElementById("checkout-form");

    if (paymentSelect && onlineInfo) {
        paymentSelect.addEventListener("change", function () {
            onlineInfo.style.display = this.value === "ONLINE" ? "block" : "none";
        });
    }

    if (!checkoutForm) return;

    checkoutForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (cart.length === 0) {
            showStoreToast("Your cart is empty!", true);
            return;
        }

        const name = document.getElementById("customer-name").value.trim();
        const email = document.getElementById("customer-email").value.trim();
        const phone = document.getElementById("customer-phone").value.trim();
        const address = document.getElementById("customer-address").value.trim();
        const city = document.getElementById("customer-city").value.trim();
        const pincode = document.getElementById("customer-pincode").value.trim();
        const paymentMethod = document.getElementById("payment-method").value;

        if (!name || !email || !phone || !address || !city || !pincode || !paymentMethod) {
            showStoreToast("Please fill in all delivery details and select a payment method.", true);
            return;
        }

        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const orderData = {
            customer: {
                name,
                email,
                phone,
                address,
                city,
                pincode
            },
            products: cart.map(product => ({
                name: product.name,
                price: Number(product.price),
                quantity: product.quantity
            })),
            totalAmount,
            paymentMethod,
            paymentStatus: "PENDING",
            orderStatus: "PENDING"
        };

        const authHeaders = { "Content-Type": "application/json" };
        const userToken = localStorage.getItem("userToken");
        if (userToken) {
            authHeaders["Authorization"] = "Bearer " + userToken;
        }

        const submitBtn = document.getElementById("place-order-btn");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing Order...";
        }

        // --- CASE 1: CASH ON DELIVERY ---
        if (paymentMethod === "COD") {
            try {
                const response = await fetch("http://localhost:3000/api/orders", {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify(orderData)
                });

                const result = await response.json();

                if (response.ok) {
                    cart = [];
                    saveCart();
                    updateCart();
                    showOrderSuccess(result.order);
                    loadMyOrders(); // refresh order history
                } else {
                    showStoreToast("❌ " + (result.message || "Error placing order"), true);
                }
            } catch (error) {
                console.error("COD order error:", error);
                showStoreToast("❌ Could not connect to the server.", true);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Place Order 🛍️";
                }
            }
            return;
        }

        // --- CASE 2: ONLINE PAYMENT VIA RAZORPAY ---
        if (paymentMethod === "ONLINE") {
            try {
                // Step 1: Create Razorpay Order on Backend
                const createRes = await fetch("http://localhost:3000/api/payment/create-order", {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify({
                        items: cart.map(item => ({
                            id: item._id,
                            price: item.price,
                            quantity: item.quantity
                        }))
                    })
                });

                const orderPayload = await createRes.json();

                if (!createRes.ok || !orderPayload.keyId || !orderPayload.order) {
                    showStoreToast("❌ " + (orderPayload.message || "Payment gateway unavailable"), true);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerText = "Place Order 🛍️";
                    }
                    return;
                }

                // Step 2: Open Official Razorpay Checkout Modal
                const options = {
                    key: orderPayload.keyId,
                    amount: orderPayload.order.amount,
                    currency: orderPayload.order.currency,
                    name: "CharmingHub",
                    description: "Handmade Jewellery & Gifts Order",
                    image: "images/logo.png.jpeg",
                    order_id: orderPayload.order.id,
                    prefill: {
                        name: name,
                        email: email,
                        contact: phone
                    },
                    theme: {
                        color: "#e91e63"
                    },
                    handler: async function (razorpayResponse) {
                        try {
                            if (submitBtn) submitBtn.innerText = "Verifying Payment...";

                            const verifyRes = await fetch("http://localhost:3000/api/payment/verify-payment", {
                                method: "POST",
                                headers: authHeaders,
                                body: JSON.stringify({
                                    razorpayOrderId: razorpayResponse.razorpay_order_id,
                                    razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                                    razorpaySignature: razorpayResponse.razorpay_signature,
                                    orderData: {
                                        customer: orderData.customer,
                                        products: orderData.products,
                                        totalAmount: totalAmount,
                                        paymentMethod: "ONLINE"
                                    }
                                })
                            });

                            const verifyResult = await verifyRes.json();

                            if (verifyRes.ok && verifyResult.order) {
                                cart = [];
                                saveCart();
                                updateCart();
                                showOrderSuccess(verifyResult.order);
                                loadMyOrders();
                            } else {
                                alert("⚠️ Payment verification pending: " + (verifyResult.message || "Please check orders."));
                            }
                        } catch (verifyErr) {
                            console.error("Payment verification call failed:", verifyErr);
                            alert("⚠️ Payment was received but network dropped during confirmation. Please check My Orders.");
                        } finally {
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerText = "Place Order 🛍️";
                            }
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            showStoreToast("Payment cancelled. You can retry anytime.");
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerText = "Place Order 🛍️";
                            }
                        }
                    }
                };

                const rzp = new Razorpay(options);
                rzp.on("payment.failed", function (failResponse) {
                    console.error("Payment failed:", failResponse.error);
                    alert("❌ Payment Failed: " + (failResponse.error.description || "Transaction declined"));
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerText = "Place Order 🛍️";
                    }
                });
                rzp.open();

            } catch (error) {
                console.error("Online payment error:", error);
                showStoreToast("❌ Could not connect to payment gateway.", true);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Place Order 🛍️";
                }
            }
        }
    });
}

// ===============================
// 6. VISUAL ORDER TRACKER
// ===============================

function renderOrderTrackerHtml(status) {
    const orderStatus = (status || "PENDING").toUpperCase();

    if (orderStatus === "CANCELLED") {
        return `
            <div style="background: #fff5f5; color: #e53e3e; padding: 12px 20px; border-radius: 12px; border: 1px solid #fed7d7; text-align: center; font-weight: 700;">
                🚫 This order was cancelled.
            </div>
        `;
    }

    const steps = [
        { key: "PENDING", label: "Order Placed", stepNum: 1 },
        { key: "CONFIRMED", label: "Confirmed", stepNum: 2 },
        { key: "SHIPPED", label: "Out for Delivery", stepNum: 3 },
        { key: "DELIVERED", label: "Delivered", stepNum: 4 }
    ];

    const statusWeights = {
        "PENDING": 1,
        "CONFIRMED": 2,
        "SHIPPED": 3,
        "DELIVERED": 4
    };

    const currentWeight = statusWeights[orderStatus] || 1;

    let stepperHtml = '<div class="tracker-stepper">';

    steps.forEach((step, idx) => {
        const isCompleted = step.stepNum < currentWeight || (step.stepNum === currentWeight && currentWeight === 4);
        const isActive = step.stepNum === currentWeight && currentWeight < 4;

        const circleContent = isCompleted ? "✓" : step.stepNum;
        const stepClass = isCompleted ? "tracker-step completed" : isActive ? "tracker-step active" : "tracker-step";

        stepperHtml += `
            <div class="${stepClass}">
                <div class="step-circle">${circleContent}</div>
                <span class="step-label">${step.label}</span>
            </div>
        `;

        if (idx < steps.length - 1) {
            const lineCompleted = step.stepNum < currentWeight;
            stepperHtml += `<div class="tracker-line ${lineCompleted ? 'completed' : ''}"></div>`;
        }
    });

    stepperHtml += '</div>';
    return stepperHtml;
}

function showOrderSuccess(order) {
    const successSec = document.getElementById("order-success");
    const checkoutSec = document.getElementById("checkout-section");

    if (checkoutSec) checkoutSec.style.display = "none";
    if (!successSec) return;

    document.getElementById("success-order-id").textContent = order._id;
    document.getElementById("success-order-total").textContent = Number(order.totalAmount).toLocaleString("en-IN");
    document.getElementById("success-payment-method").textContent = order.paymentMethod;

    const statusBadge = document.getElementById("success-payment-status");
    if (statusBadge) {
        statusBadge.textContent = order.paymentStatus || "PENDING";
        statusBadge.className = `badge ${order.paymentStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}`;
    }

    const trackerContainer = document.getElementById("success-order-tracker");
    if (trackerContainer) {
        trackerContainer.innerHTML = renderOrderTrackerHtml(order.orderStatus);
    }

    successSec.style.display = "block";
    scrollToSection("order-success");
}

function continueShopping() {
    const successSec = document.getElementById("order-success");
    if (successSec) successSec.style.display = "none";
    scrollToSection("products");
}

function viewMyOrders() {
    const successSec = document.getElementById("order-success");
    if (successSec) successSec.style.display = "none";
    scrollToSection("track-section");
    loadMyOrders();
}

// ===============================
// 7. ORDER TRACKING & LOOKUP (GUEST & LOGGED IN)
// ===============================

async function lookupOrder() {
    const input = document.getElementById("track-input");
    const resultsContainer = document.getElementById("track-lookup-results");
    if (!input || !resultsContainer) return;

    const query = input.value.trim();
    if (!query) {
        resultsContainer.innerHTML = `<p style="color: #e53e3e; margin-top: 10px;">Please enter an Order ID or Email address to search.</p>`;
        return;
    }

    resultsContainer.innerHTML = `<p style="color: #666; margin-top: 10px;">Searching for your order...</p>`;

    try {
        const response = await fetch(`http://localhost:3000/api/orders/${encodeURIComponent(query)}`);
        const data = await response.json();

        if (!response.ok || !data) {
            resultsContainer.innerHTML = `
                <div style="background: #fff5f5; padding: 15px; border-radius: 10px; margin-top: 15px; border: 1px solid #fed7d7;">
                    <p style="color: #e53e3e; font-weight: 600;">❌ No order found matching "${escapeHtml(query)}"</p>
                    <p style="font-size: 13px; color: #718096; margin-top: 4px;">Please double-check the Order ID or the email address used during checkout.</p>
                </div>
            `;
            return;
        }

        // Support both single order (by ID) or array of orders (by email)
        const orders = Array.isArray(data) ? data : [data];

        if (orders.length === 0) {
            resultsContainer.innerHTML = `<p style="color: #e53e3e; margin-top: 10px;">No orders found for this email address.</p>`;
            return;
        }

        resultsContainer.innerHTML = `<h4 style="margin: 20px 0 10px; color: var(--dark);">Found ${orders.length} order${orders.length > 1 ? 's' : ''}:</h4>`;

        orders.forEach(order => {
            const card = createStoreOrderCard(order);
            resultsContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Order lookup error:", error);
        resultsContainer.innerHTML = `<p style="color: #e53e3e; margin-top: 10px;">❌ Server connection failed. Please try again.</p>`;
    }
}

async function loadMyOrders() {
    const token = localStorage.getItem("userToken");
    const email = localStorage.getItem("userEmail");
    const container = document.getElementById("orders-container");

    if (!container) return;

    if (!email && !token) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #888;">
                <p>Log in or use the search box above to track your order.</p>
                <button type="button" class="btn-primary" style="margin-top: 10px;" onclick="openAuthModal()">
                    👤 Login to View Order History
                </button>
            </div>
        `;
        return;
    }

    try {
        const headers = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = "Bearer " + token;
        }

        const url = token
            ? "http://localhost:3000/api/my-orders"
            : "http://localhost:3000/api/orders/" + encodeURIComponent(email);

        const response = await fetch(url, { headers });
        const orders = await response.json();

        if (!response.ok) {
            container.innerHTML = "<p style='color: red;'>❌ Could not load your orders.</p>";
            return;
        }

        if (!Array.isArray(orders) || orders.length === 0) {
            container.innerHTML = `
                <div style="padding: 30px; text-align: center; color: #888;">
                    <p>You haven't placed any orders yet. 🛍️</p>
                    <a href="#products" class="shop-btn" style="display: inline-block; margin-top: 15px; padding: 10px 20px; font-size: 13px;">Start Shopping</a>
                </div>
            `;
            return;
        }

        container.innerHTML = "";

        orders.forEach(order => {
            const card = createStoreOrderCard(order);
            container.appendChild(card);
        });

    } catch (error) {
        console.error("My Orders error:", error);
        container.innerHTML = "<p style='color: red;'>❌ Could not connect to the server.</p>";
    }
}

function createStoreOrderCard(order) {
    const card = document.createElement("div");
    card.className = "order-card";

    const orderId = order._id;
    const dateStr = order.orderDate ? new Date(order.orderDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }) : "Recent";

    const paymentMethod = order.paymentMethod || "COD";
    const paymentStatus = order.paymentStatus || "PENDING";
    const orderStatus = order.orderStatus || "PENDING";
    const total = Number(order.totalAmount || 0).toLocaleString("en-IN");

    // Ordered items
    let itemsHtml = "";
    if (Array.isArray(order.products) && order.products.length > 0) {
        itemsHtml = order.products.map(p => `
            <div class="order-product">
                <span><strong>${escapeHtml(p.name)}</strong> × ${p.quantity}</span>
                <span style="font-weight: 600;">₹${Number(p.price * p.quantity).toLocaleString("en-IN")}</span>
            </div>
        `).join("");
    } else {
        itemsHtml = `<p style="font-size: 13px; color: #888;">(Handcrafted jewellery & gifts)</p>`;
    }

    card.innerHTML = `
        <div class="order-card-header">
            <div>
                <strong style="font-size: 15px; color: var(--dark);">Order #${orderId}</strong>
                <div style="font-size: 12px; color: #888;">📅 ${dateStr}</div>
            </div>
            <div>
                <span class="badge badge-${orderStatus.toLowerCase()}">${orderStatus}</span>
                <span class="badge ${paymentStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}" style="margin-left: 6px;">${paymentStatus}</span>
            </div>
        </div>

        <!-- 4-Step Tracker Stepper -->
        <div style="margin: 15px 0;">
            ${renderOrderTrackerHtml(orderStatus)}
        </div>

        <div style="background: #fafafa; padding: 12px 15px; border-radius: 8px; margin: 15px 0;">
            ${itemsHtml}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 14px;">
            <div>
                <span>Payment: <strong>${paymentMethod}</strong></span>
                ${order.customer && order.customer.city ? `<span style="color: #666; margin-left: 10px;">📍 ${escapeHtml(order.customer.city)}</span>` : ""}
            </div>
            <div style="font-size: 16px; font-weight: 800; color: var(--primary);">
                Total: ₹${total}
            </div>
        </div>
    `;

    return card;
}

// ===============================
// 8. CUSTOMER AUTH MODAL & LOGIC
// ===============================

function openAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;

    const userToken = localStorage.getItem("userToken");
    const userName = localStorage.getItem("userName");
    const userEmail = localStorage.getItem("userEmail");

    const formsView = document.getElementById("auth-forms-view");
    const accountView = document.getElementById("account-section");

    if (userToken && userEmail) {
        // User is logged in: show account summary
        if (formsView) formsView.style.display = "none";
        if (accountView) {
            accountView.style.display = "block";
            document.getElementById("account-name").textContent = userName || "CharmingHub Customer";
            document.getElementById("account-email").textContent = userEmail;
        }
    } else {
        // Not logged in: show login form
        if (formsView) formsView.style.display = "block";
        if (accountView) accountView.style.display = "none";
        switchAuthTab("login");
    }

    modal.classList.add("active");
}

function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.classList.remove("active");
}

function switchAuthTab(tab) {
    const tabLogin = document.getElementById("tab-login");
    const tabSignup = document.getElementById("tab-signup");
    const formLogin = document.getElementById("login-form");
    const formSignup = document.getElementById("signup-form");

    if (tab === "login") {
        if (tabLogin) tabLogin.classList.add("active");
        if (tabSignup) tabSignup.classList.remove("active");
        if (formLogin) formLogin.style.display = "flex";
        if (formSignup) formSignup.style.display = "none";
    } else {
        if (tabSignup) tabSignup.classList.add("active");
        if (tabLogin) tabLogin.classList.remove("active");
        if (formSignup) formSignup.style.display = "flex";
        if (formLogin) formLogin.style.display = "none";
    }
}

function viewMyOrdersFromAccount() {
    closeAuthModal();
    scrollToSection("track-section");
    loadMyOrders();
}

function setupAuthForms() {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const logoutBtn = document.getElementById("logout-btn");
    const modal = document.getElementById("auth-modal");

    // Close on click outside
    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === modal) closeAuthModal();
        });
    }

    // Close on Escape
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeAuthModal();
    });

    // Login Form Submit
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;
            const message = document.getElementById("login-message");

            if (message) {
                message.style.color = "#666";
                message.textContent = "Logging in...";
            }

            try {
                const response = await fetch("http://localhost:3000/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();

                if (!response.ok) {
                    if (message) {
                        message.style.color = "#e53e3e";
                        message.textContent = "❌ " + (result.message || "Invalid email or password");
                    }
                    return;
                }

                localStorage.setItem("userToken", result.token);
                localStorage.setItem("userEmail", result.user.email);
                localStorage.setItem("userName", result.user.name);

                updateNavAuth();
                closeAuthModal();
                showStoreToast(`Welcome back, ${result.user.name}! 👋`);
                loadMyOrders();

            } catch (error) {
                console.error("Login error:", error);
                if (message) {
                    message.style.color = "#e53e3e";
                    message.textContent = "❌ Could not connect to the server.";
                }
            }
        });
    }

    // Signup Form Submit
    if (signupForm) {
        signupForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const name = document.getElementById("signup-name").value.trim();
            const email = document.getElementById("signup-email").value.trim();
            const password = document.getElementById("signup-password").value;
            const message = document.getElementById("signup-message");

            if (message) {
                message.style.color = "#666";
                message.textContent = "Creating account...";
            }

            try {
                const response = await fetch("http://localhost:3000/api/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password })
                });

                const result = await response.json();

                if (!response.ok) {
                    if (message) {
                        message.style.color = "#e53e3e";
                        message.textContent = "❌ " + (result.message || "Signup failed");
                    }
                    return;
                }

                // Auto login user
                localStorage.setItem("userToken", result.token);
                localStorage.setItem("userEmail", result.user.email);
                localStorage.setItem("userName", result.user.name);

                updateNavAuth();
                closeAuthModal();
                showStoreToast(`Welcome to CharmingHub, ${result.user.name}! 🌸`);
                loadMyOrders();

            } catch (error) {
                console.error("Signup error:", error);
                if (message) {
                    message.style.color = "#e53e3e";
                    message.textContent = "❌ Could not connect to the server.";
                }
            }
        });
    }

    // Logout Button
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.removeItem("userToken");
            localStorage.removeItem("userEmail");
            localStorage.removeItem("userName");

            updateNavAuth();
            closeAuthModal();
            showStoreToast("Logged out successfully.");
            loadMyOrders();
        });
    }
}

function updateNavAuth() {
    const userText = document.getElementById("nav-user-text");
    const userName = localStorage.getItem("userName");
    const userEmail = localStorage.getItem("userEmail");

    if (userText) {
        if (userName) {
            const firstName = userName.split(" ")[0];
            userText.textContent = `Hi, ${firstName}`;
        } else if (userEmail) {
            userText.textContent = "My Account";
        } else {
            userText.textContent = "Login / Signup";
        }
    }
}

// ===============================
// INITIALIZATION
// ===============================

document.addEventListener("DOMContentLoaded", function () {
    updateNavAuth();
    updateCart();
    loadProducts();
    setupSearchAndFilters();
    setupCustomGiftForm();
    setupCheckout();
    setupAuthForms();
    loadMyOrders();
});

// Trigger immediate fallback in case DOM is already ready
updateNavAuth();
updateCart();
loadProducts();
setupSearchAndFilters();
setupCustomGiftForm();
setupCheckout();
setupAuthForms();
loadMyOrders();
