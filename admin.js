
// ==========================================
// CHARMINGHUB - ADMIN DASHBOARD LOGIC
// ==========================================

// Global state cache
let currentProducts = [];
let currentOrders = [];
let currentUsers = [];

// ===============================
// AUTH HEADER & ERROR HELPERS
// ===============================

function getAdminHeaders() {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        window.location.href = "admin-login.html";
        return { "Content-Type": "application/json" };
    }
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
    };
}

function handleAuthError(response) {
    if (response.status === 401 || response.status === 403) {
        showToast("Session expired or unauthorized. Please log in as admin.", "error");
        setTimeout(() => {
            adminLogout();
        }, 1500);
        return true;
    }
    return false;
}

function adminLogout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminUser");
    window.location.href = "admin-login.html";
}

// Toast notification helper
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) {
        alert(message);
        return;
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type === "error" ? "toast-error" : "toast-success"}`;
    toast.innerHTML = `${type === "error" ? "⚠️" : "✅"} <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// HTML escape helper for XSS safety
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Format date helper
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// Display logged-in admin identity
function renderAdminInfo() {
    const displayEl = document.getElementById("admin-user-display");
    if (!displayEl) return;
    try {
        const storedUser = localStorage.getItem("adminUser");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            displayEl.innerHTML = `Logged in as: <strong>${escapeHtml(user.name || user.email || "Admin")}</strong>`;
        }
    } catch (e) {
        console.error("Error reading admin user data:", e);
    }
}

// ===============================
// 1. DASHBOARD STATS
// ===============================

async function loadAdminStats() {
    try {
        const response = await fetch("http://localhost:3000/api/admin/stats", {
            headers: getAdminHeaders()
        });

        if (handleAuthError(response)) return;

        const stats = await response.json();

        if (!response.ok) {
            console.error("Could not load stats:", stats.message);
            return;
        }

        const totalUsersEl = document.getElementById("total-users");
        const totalProductsEl = document.getElementById("total-products");
        const totalOrdersEl = document.getElementById("total-orders");
        const totalRevenueEl = document.getElementById("total-revenue");

        if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers ?? 0;
        if (totalProductsEl) totalProductsEl.textContent = stats.totalProducts ?? 0;
        if (totalOrdersEl) totalOrdersEl.textContent = stats.totalOrders ?? 0;
        if (totalRevenueEl) totalRevenueEl.textContent = "₹" + Number(stats.totalRevenue || 0).toLocaleString("en-IN");

    } catch (error) {
        console.error("Stats fetch error:", error);
    }
}

// ===============================
// 2. PRODUCT MANAGEMENT
// ===============================

async function loadAdminProducts() {
    const container = document.getElementById("admin-products");
    const countBadge = document.getElementById("quick-count-products");
    if (!container) return;

    try {
        container.innerHTML = "<p>Loading products...</p>";

        const response = await fetch("http://localhost:3000/api/products");
        const products = await response.json();

        if (!response.ok) {
            container.innerHTML = "<p>❌ Could not load products.</p>";
            return;
        }

        currentProducts = products;
        if (countBadge) countBadge.textContent = products.length;

        if (products.length === 0) {
            container.innerHTML = "<p style='color: #888; grid-column: 1 / -1; text-align: center; padding: 30px;'>No products found in the catalog. Use the form above to add your first product!</p>";
            return;
        }

        container.innerHTML = "";

        products.forEach(product => {
            const card = document.createElement("div");
            card.className = "product-card";

            const safeImage = escapeHtml(product.image || "images/placeholder.jpg");
            const safeName = escapeHtml(product.name || "Untitled Product");
            const safePrice = Number(product.price || 0).toLocaleString("en-IN");
            const safeCategory = escapeHtml(product.category || "General");
            const safeDesc = escapeHtml(product.description || "No description provided.");

            card.innerHTML = `
                <img
                    src="${safeImage}"
                    alt="${safeName}"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='https://placehold.co/300x200?text=No+Image';"
                >
                <div class="product-body">
                    <span class="product-category-tag">${safeCategory}</span>
                    <h4>${safeName}</h4>
                    <div class="product-price">₹${safePrice}</div>
                    <p class="product-desc">${safeDesc}</p>
                    <div class="product-actions">
                        <button type="button" class="btn btn-warning btn-sm" onclick="openEditModal('${product._id}')">
                            ✏️ Edit
                        </button>
                        <button type="button" class="btn btn-danger btn-sm" onclick="deleteProduct('${product._id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });

    } catch (error) {
        console.error("Products error:", error);
        container.innerHTML = "<p>❌ Server connection failed.</p>";
    }
}

// Add New Product Form Handler
function setupProductForm() {
    const form = document.getElementById("product-form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const submitBtn = document.getElementById("add-product-btn");
        const name = document.getElementById("product-name").value.trim();
        const price = Number(document.getElementById("product-price").value);
        const image = document.getElementById("product-image").value.trim();
        const category = document.getElementById("product-category").value;
        const description = document.getElementById("product-description").value.trim();

        if (!name || isNaN(price) || !image) {
            showToast("Please fill in all required fields (Name, Price, Image).", "error");
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Saving Product...";
        }

        try {
            const response = await fetch("http://localhost:3000/api/products", {
                method: "POST",
                headers: getAdminHeaders(),
                body: JSON.stringify({
                    name,
                    price,
                    image,
                    category,
                    description
                })
            });

            if (handleAuthError(response)) return;

            const result = await response.json();

            if (!response.ok) {
                showToast("❌ " + (result.message || "Failed to add product"), "error");
                return;
            }

            showToast("🎉 Product added successfully!");
            form.reset();
            loadAdminProducts();
            loadAdminStats();

        } catch (error) {
            console.error("Add product error:", error);
            showToast("❌ Could not connect to the server.", "error");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "➕ Save & Add Product";
            }
        }
    });
}

// Open Edit Product Modal
function openEditModal(productId) {
    const product = currentProducts.find(p => p._id === productId);
    if (!product) {
        showToast("Product data not found in cache", "error");
        return;
    }

    document.getElementById("edit-id").value = product._id;
    document.getElementById("edit-name").value = product.name || "";
    document.getElementById("edit-price").value = product.price || 0;
    document.getElementById("edit-image").value = product.image || "";
    document.getElementById("edit-category").value = product.category || "Jewellery";
    document.getElementById("edit-description").value = product.description || "";

    const modal = document.getElementById("edit-modal");
    if (modal) modal.classList.add("active");
}

// Close Edit Product Modal
function closeEditModal() {
    const modal = document.getElementById("edit-modal");
    if (modal) modal.classList.remove("active");
}

// Setup Edit Product Form Handler
function setupEditProductForm() {
    const form = document.getElementById("edit-product-form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const id = document.getElementById("edit-id").value;
        const name = document.getElementById("edit-name").value.trim();
        const price = Number(document.getElementById("edit-price").value);
        const image = document.getElementById("edit-image").value.trim();
        const category = document.getElementById("edit-category").value;
        const description = document.getElementById("edit-description").value.trim();
        const saveBtn = document.getElementById("edit-save-btn");

        if (!id || !name || isNaN(price) || !image) {
            showToast("Please provide valid product details.", "error");
            return;
        }

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerText = "Updating...";
        }

        try {
            const response = await fetch(`http://localhost:3000/api/products/${id}`, {
                method: "PUT",
                headers: getAdminHeaders(),
                body: JSON.stringify({
                    name,
                    price,
                    image,
                    category,
                    description
                })
            });

            if (handleAuthError(response)) return;

            const result = await response.json();

            if (!response.ok) {
                showToast("❌ " + (result.message || "Could not update product"), "error");
                return;
            }

            showToast("✅ Product updated successfully!");
            closeEditModal();
            loadAdminProducts();

        } catch (error) {
            console.error("Edit product error:", error);
            showToast("❌ Server connection failed.", "error");
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerText = "💾 Save Changes";
            }
        }
    });

    // Close modal on click outside modal box
    const modal = document.getElementById("edit-modal");
    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === modal) {
                closeEditModal();
            }
        });
    }

    // Close modal on ESC key
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeEditModal();
        }
    });
}

// Delete Product
async function deleteProduct(id) {
    const product = currentProducts.find(p => p._id === id);
    const prodName = product ? `"${product.name}"` : "this product";

    const confirmDelete = confirm(`Are you sure you want to delete ${prodName}?\nThis action cannot be undone.`);
    if (!confirmDelete) return;

    try {
        const response = await fetch(`http://localhost:3000/api/products/${id}`, {
            method: "DELETE",
            headers: getAdminHeaders()
        });

        if (handleAuthError(response)) return;

        const result = await response.json();

        if (!response.ok) {
            showToast("❌ " + (result.message || "Could not delete product"), "error");
            return;
        }

        showToast("✅ Product deleted successfully!");
        loadAdminProducts();
        loadAdminStats();

    } catch (error) {
        console.error("Delete product error:", error);
        showToast("❌ Server connection failed.", "error");
    }
}

// ===============================
// 3. ORDER MANAGEMENT
// ===============================

async function loadAdminOrders() {
    const container = document.getElementById("admin-orders");
    const countBadge = document.getElementById("quick-count-orders");
    if (!container) return;

    try {
        container.innerHTML = "<p>Loading orders...</p>";

        const response = await fetch("http://localhost:3000/api/admin/orders", {
            headers: getAdminHeaders()
        });

        if (handleAuthError(response)) return;

        const orders = await response.json();

        if (!response.ok) {
            container.innerHTML = "<p>❌ Could not load orders.</p>";
            return;
        }

        currentOrders = orders;
        if (countBadge) countBadge.textContent = orders.length;

        if (orders.length === 0) {
            container.innerHTML = "<p style='color: #888; text-align: center; padding: 30px;'>No customer orders found yet.</p>";
            return;
        }

        container.innerHTML = "";

        orders.forEach(order => {
            const card = document.createElement("div");
            card.className = "order-card";

            const orderId = order._id;
            const orderDateStr = formatDate(order.orderDate);
            const customer = order.customer || {};
            const custName = escapeHtml(customer.name || "Anonymous Customer");
            const custEmail = escapeHtml(customer.email || "No email");
            const custPhone = escapeHtml(customer.phone || "No phone");
            const custAddress = escapeHtml(customer.address || "No address");
            const custCity = escapeHtml(customer.city || "N/A");
            const custPincode = escapeHtml(customer.pincode || "N/A");

            const paymentMethod = order.paymentMethod || "COD";
            const paymentStatus = order.paymentStatus || "PENDING";
            const orderStatus = order.orderStatus || "PENDING";
            const totalAmount = Number(order.totalAmount || 0).toLocaleString("en-IN");
            const razorpayPaymentId = order.razorpayPaymentId ? escapeHtml(order.razorpayPaymentId) : null;

            // Status badges
            const orderStatusBadgeClass = `badge badge-${orderStatus.toLowerCase()}`;
            const paymentStatusBadgeClass = `badge badge-${paymentStatus.toLowerCase()}`;

            // Items breakdown
            let itemsHtml = "";
            if (Array.isArray(order.products) && order.products.length > 0) {
                const itemRows = order.products.map((item, idx) => {
                    const itemName = escapeHtml(item.name || "Item");
                    const itemQty = Number(item.quantity || 1);
                    const itemPrice = Number(item.price || 0);
                    const lineTotal = (itemQty * itemPrice).toLocaleString("en-IN");
                    return `
                        <tr>
                            <td>${idx + 1}. ${itemName}</td>
                            <td>${itemQty}</td>
                            <td>₹${itemPrice.toLocaleString("en-IN")}</td>
                            <td style="font-weight: 600; text-align: right;">₹${lineTotal}</td>
                        </tr>
                    `;
                }).join("");

                itemsHtml = `
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Ordered Item</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th style="text-align: right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>${itemRows}</tbody>
                    </table>
                `;
            } else {
                itemsHtml = `<p style="font-size: 13px; color: #888; margin: 10px 0;">(Legacy order - individual item breakdown unavailable)</p>`;
            }

            card.innerHTML = `
                <div class="order-card-header">
                    <div>
                        <span class="order-id">Order #${orderId}</span>
                        <div class="order-date">📅 ${orderDateStr}</div>
                    </div>
                    <div>
                        <span class="${orderStatusBadgeClass}">${orderStatus}</span>
                        <span class="${paymentStatusBadgeClass}" style="margin-left: 6px;">${paymentStatus}</span>
                    </div>
                </div>

                <div class="order-grid">
                    <div class="order-info-block">
                        <h5>👤 Customer Details</h5>
                        <p><strong>Name:</strong> ${custName}</p>
                        <p><strong>Email:</strong> ${custEmail}</p>
                        <p><strong>Phone:</strong> ${custPhone}</p>
                    </div>

                    <div class="order-info-block">
                        <h5>📍 Delivery Address</h5>
                        <p>${custAddress}</p>
                        <p><strong>City & Pincode:</strong> ${custCity} - ${custPincode}</p>
                        <p><strong>Payment Method:</strong> ${paymentMethod} ${razorpayPaymentId ? `<small style="color: #666;">(ID: ${razorpayPaymentId})</small>` : ""}</p>
                    </div>
                </div>

                ${itemsHtml}

                <div class="order-card-footer">
                    <div class="order-total-badge">
                        Grand Total: <span>₹${totalAmount}</span>
                    </div>

                    <div class="status-controls">
                        <label for="order-status-${orderId}">Order:</label>
                        <select
                            id="order-status-${orderId}"
                            class="status-select"
                            onchange="handleOrderUpdate('${orderId}')"
                        >
                            <option value="PENDING" ${orderStatus === "PENDING" ? "selected" : ""}>Pending</option>
                            <option value="CONFIRMED" ${orderStatus === "CONFIRMED" ? "selected" : ""}>Confirmed</option>
                            <option value="SHIPPED" ${orderStatus === "SHIPPED" ? "selected" : ""}>Shipped</option>
                            <option value="DELIVERED" ${orderStatus === "DELIVERED" ? "selected" : ""}>Delivered</option>
                            <option value="CANCELLED" ${orderStatus === "CANCELLED" ? "selected" : ""}>Cancelled</option>
                        </select>

                        <label for="payment-status-${orderId}" style="margin-left: 8px;">Payment:</label>
                        <select
                            id="payment-status-${orderId}"
                            class="status-select"
                            onchange="handleOrderUpdate('${orderId}')"
                        >
                            <option value="PENDING" ${paymentStatus === "PENDING" ? "selected" : ""}>Pending</option>
                            <option value="PAID" ${paymentStatus === "PAID" ? "selected" : ""}>Paid</option>
                            <option value="FAILED" ${paymentStatus === "FAILED" ? "selected" : ""}>Failed</option>
                            <option value="REFUNDED" ${paymentStatus === "REFUNDED" ? "selected" : ""}>Refunded</option>
                        </select>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });

    } catch (error) {
        console.error("Admin orders error:", error);
        container.innerHTML = "<p>❌ Server connection failed.</p>";
    }
}

// Single handler for status change
async function handleOrderUpdate(orderId) {
    const orderSelect = document.getElementById(`order-status-${orderId}`);
    const paymentSelect = document.getElementById(`payment-status-${orderId}`);

    if (!orderSelect || !paymentSelect) return;

    const newOrderStatus = orderSelect.value;
    const newPaymentStatus = paymentSelect.value;

    await updateOrderStatus(orderId, newOrderStatus, newPaymentStatus);
}

// Update Order Status API Call
async function updateOrderStatus(orderId, newOrderStatus, newPaymentStatus) {
    try {
        const payload = {};
        if (newOrderStatus) payload.orderStatus = newOrderStatus;
        if (newPaymentStatus) payload.paymentStatus = newPaymentStatus;

        const response = await fetch(
            `http://localhost:3000/api/admin/orders/${orderId}/status`,
            {
                method: "PUT",
                headers: getAdminHeaders(),
                body: JSON.stringify(payload)
            }
        );

        if (handleAuthError(response)) return;

        const result = await response.json();

        if (!response.ok) {
            showToast("❌ " + (result.message || "Could not update status"), "error");
            loadAdminOrders(); // reset view
            return;
        }

        showToast("✅ Order updated successfully!");
        loadAdminOrders();
        loadAdminStats();

    } catch (error) {
        console.error("Order status error:", error);
        showToast("❌ Server connection failed.", "error");
    }
}

// ===============================
// 4. REGISTERED USERS MANAGEMENT
// ===============================

async function loadAdminUsers() {
    const tbody = document.getElementById("admin-users");
    const countBadge = document.getElementById("quick-count-users");
    if (!tbody) return;

    try {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">Loading users...</td></tr>`;

        const response = await fetch("http://localhost:3000/api/admin/users", {
            headers: getAdminHeaders()
        });

        if (handleAuthError(response)) return;

        const users = await response.json();

        if (!response.ok) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">❌ Could not load registered users.</td></tr>`;
            return;
        }

        currentUsers = users;
        if (countBadge) countBadge.textContent = users.length;

        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">No users registered yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";

        users.forEach((user, index) => {
            const row = document.createElement("tr");

            const safeName = escapeHtml(user.name || "N/A");
            const safeEmail = escapeHtml(user.email || "N/A");
            const role = (user.role || "USER").toUpperCase();
            const roleBadgeClass = role === "ADMIN" ? "badge badge-role-admin" : "badge badge-role-user";
            const userId = escapeHtml(user._id || "N/A");

            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${safeName}</strong></td>
                <td>${safeEmail}</td>
                <td><span class="${roleBadgeClass}">${role}</span></td>
                <td><small style="color: #888; font-family: monospace;">${userId}</small></td>
            `;

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Admin users fetch error:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">❌ Server connection failed.</td></tr>`;
    }
}

// ===============================
// INITIALIZATION
// ===============================

document.addEventListener("DOMContentLoaded", function () {
    renderAdminInfo();
    setupProductForm();
    setupEditProductForm();

    loadAdminStats();
    loadAdminProducts();
    loadAdminOrders();
    loadAdminUsers();
});

// Also trigger immediately in case script loads after DOM is ready
renderAdminInfo();
setupProductForm();
setupEditProductForm();
loadAdminStats();
loadAdminProducts();
loadAdminOrders();
loadAdminUsers();