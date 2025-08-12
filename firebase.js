// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAYLQqfR2nIGmGRjbMaDFR4ZldHMBx_pq4",
  authDomain: "website-ecommerce-4d60f.firebaseapp.com",
  projectId: "website-ecommerce-4d60f",
  storageBucket: "website-ecommerce-4d60f.firebasestorage.app",
  messagingSenderId: "595639631144",
  appId: "1:595639631144:web:9c338c631666320c26a41d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
