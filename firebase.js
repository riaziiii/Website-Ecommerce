// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// <-- Use your existing Firebase config here -->
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAYLQqfR2nIGmGRjbMaDFR4ZldHMBx_pq4", 
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "website-ecommerce-4d60f.firebaseapp.com",
  projectId: process.env.PROJECT_ID || "website-ecommerce-4d60f",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "website-ecommerce-4d60f.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "595639631144",
  appId:process.env.FIREBASE_APP_ID ||"1:595639631144:web:9c338c631666320c26a41d",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://website-ecommerce-4d60f-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
