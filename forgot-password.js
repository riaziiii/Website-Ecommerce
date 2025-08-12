import { auth } from "./firebase-config.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const $ = id => document.getElementById(id);

$("resetBtn").addEventListener("click", async () => {
  const email = $("reset-email").value.trim();
  if (!email) return alert("Enter your email address.");

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent! Please check your inbox.");
    window.location.href = "login.html";
  } catch (err) {
    alert(getFriendlyError(err.code));
  }
});

function getFriendlyError(code) {
  const map = {
    "auth/invalid-email": "Enter a valid email address.",
    "auth/user-not-found": "No account found with this email."
  };
  return map[code] || "An unexpected error occurred. Please try again.";
}
