import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const $ = id => document.getElementById(id);

// Toggle password visibility
const togglePassword = $("toggle-password");
const passwordInput = $("login-password");

togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  
  togglePassword.classList.toggle("fa-eye");
  togglePassword.classList.toggle("fa-eye-slash");
});

// Login button click
$("loginBtn").addEventListener("click", async () => {
  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  if (!email) return alert("Enter email.");
  if (!password) return alert("Enter password.");

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const snapshot = await get(ref(db, "users/" + uid));
    if (snapshot.exists()) {
      localStorage.setItem("username", snapshot.val().username);
    } else {
      localStorage.setItem("username", email);
    }

    window.location.href = "index.html";
  } catch (err) {
    if (err.code === "auth/invalid-credential") {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length === 0) {
        alert("No account found with this email.");
      } else {
        alert("Incorrect password. Please try again.");
      }
    } else if (err.code === "auth/wrong-password") {
      alert("Incorrect password. Please try again.");
    } else if (err.code === "auth/user-not-found") {
      alert("No account found with this email.");
    } else {
      alert("An unexpected error occurred. Please try again.");
    }
    console.error("Login Error:", err.code);
  }
});
