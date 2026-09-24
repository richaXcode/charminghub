// ===============================
// ADMIN LOGIN
// ===============================

document
    .getElementById("admin-login-form")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("admin-email").value;

        const password =
            document.getElementById("admin-password").value;

        const message =
            document.getElementById("message");

        try {

            const response = await fetch(
            "http://localhost:3000/api/admin/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

            const result =
                await response.json();

            if (!response.ok) {

                message.textContent =
                    "❌ " + (result.message || "Login failed");

                return;
            }

            // Save admin token and user details
            localStorage.setItem(
                "adminToken",
                result.token
            );

            localStorage.setItem(
                "adminLoggedIn",
                "true"
            );

            localStorage.setItem(
                "adminUser",
                JSON.stringify(result.user)
            );

            // Open admin dashboard
            window.location.href = "admin.html";

        } catch (error) {

            console.error(
                "Admin login error:",
                error
            );

            message.textContent =
                "❌ Server connection failed.";
        }

    });