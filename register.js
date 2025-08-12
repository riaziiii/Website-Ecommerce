import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const $ = id => document.getElementById(id);

$("reg-show-password").addEventListener("change", e => {
  $("reg-password").type = e.target.checked ? "text" : "password";
});

$("registerBtn").addEventListener("click", async () => {
  const username = $("reg-username").value.trim();
  const email = $("reg-email").value.trim();
  const password = $("reg-password").value;

  if (!username) return alert("Enter username.");
  if (!email) return alert("Enter email.");
  if (!password) return alert("Enter password.");

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await set(ref(db, "users/" + uid), { username, email });
    localStorage.setItem("username", username);

    window.location.href = "dashboard.html";
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      alert("This email is already registered.");
    } else if (err.code === "auth/invalid-email") {
      alert("Enter a valid email address.");
    } else if (err.code === "auth/weak-password") {
      alert("Password should be at least 6 characters.");
    } else {
      alert("An unexpected error occurred. Please try again.");
    }
    console.error("Register Error:", err.code);
  }
});
