// Extracted from login.html so the admin panel can be served under a Content
// Security Policy without allowing inline script.
// Redirect if already logged in
if (localStorage.getItem("admin_token")) {
  window.location.href = "index.html";
}

const form = document.getElementById("login-form");
const alertBox = document.getElementById("alert-box");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.style.display = "none";
  submitBtn.disabled = true;
  submitBtn.textContent = "Authenticating...";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    // Verify role before logging in
    if (data.user && data.user.role === "admin") {
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_name", data.user.name);
      localStorage.setItem("admin_email", data.user.email);
      window.location.href = "index.html";
    } else {
      throw new Error("Access Denied: Administrator privileges required.");
    }
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign In";
  }
});
