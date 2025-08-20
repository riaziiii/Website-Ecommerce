import { db } from './firebase.js';
import { ref, get, set } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

function getCurrentUserId() {
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    return currentUser?.uid || null;
  } catch {
    return null;
  }
}

async function fetchCart() {
  const uid = getCurrentUserId();
  if (uid) {
    try {
      const snap = await get(ref(db, `carts/${uid}`));
      if (snap.exists()) return Array.isArray(snap.val()) ? snap.val() : [];
    } catch (e) { console.error('cart fetch failed', e); }
  }
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

async function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  const uid = getCurrentUserId();
  if (uid) {
    try { await set(ref(db, `carts/${uid}`), cart); } catch (e) { console.error('cart save failed', e); }
  }
}
// Product List
const products = [
  { id: 1, name: "Velvet Matte Lipstick", price: 14.99, image: "img/matte_lipstick.jpg" },
  { id: 2, name: "Glow Highlighter Palette", price: 22.50, image: "img/Highlighter_palette.jpg" },
  { id: 3, name: "Silky Foundation", price: 18.99, image: "img/foundation.jpg" },
  { id: 4, name: "Blush On", price: 35.00, image: "img/Blush_on_dior.jpg" },
  { id: 5, name: "Moisturizing Face Cream", price: 16.75, image: "img/facecream.jpg" },
  { id: 6, name: "Contour Palette", price: 12.50, image: "img/Contour_dior.jpg" },
  { id: 5, name: "Moisturizing Face Cream", price: 16.75, image: "img/facecream.jpg" },
  { id: 6, name: "Contour Palette", price: 12.50, image: "img/Contour_dior.jpg" }
];

// Load Products
function loadProducts() {
  const grid = document.querySelector(".product-grid");
  grid.innerHTML = "";

  products.forEach(product => {
    const card = document.createElement("div");
    card.classList.add("product-card");

    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p class="price">$${product.price.toFixed(2)}</p>
      <button data-id="${product.id}">Add to Cart</button>
    `;

    grid.appendChild(card);
  });
}

// Add to cart (with quantity)
document.addEventListener("click", async e => {
  if (e.target.tagName === "BUTTON" && e.target.dataset.id) {
    const productId = parseInt(e.target.dataset.id);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let cart = await fetchCart();
    const existing = cart.find(item => item.id === productId);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    await saveCart(cart);
    updateCartCount(); // ✅ refresh badge
    alert(`${product.name} added to cart!`);
  }
});

// Update cart count badge
async function updateCartCount() {
  let cart = await fetchCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById("cart-count").textContent = count;
}

// Show user controls (login/register OR username/logout)
function renderUserControls() {
  const userControls = document.getElementById("user-controls");
  const username = localStorage.getItem("username");

  if (username) {
    // Logged in
    userControls.innerHTML = `
      <span>Hi, ${username}</span>
      <button id="logoutBtn">Logout</button>
    `;

    // Add logout event listener
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "login.html"; // ✅ go back to login page
    });
  } else {
    // Guest
    userControls.innerHTML = `
      <a href="login.html">Login</a>
      <a href="register.html">Register</a>
    `;
  }
}


window.addEventListener("DOMContentLoaded", async () => {
  renderUserControls();
  loadProducts();
  await updateCartCount(); // ✅ load badge on page load
});

