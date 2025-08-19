// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";




const response = await fetch("/api/firebase-config");
const firebaseConfig = await response.json();


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

