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

async function fetchCartFromSource() {
  const uid = getCurrentUserId();
  if (uid) {
    try {
      const snap = await get(ref(db, `carts/${uid}`));
      if (snap.exists()) {
        return Array.isArray(snap.val()) ? snap.val() : [];
      }
    } catch (e) {
      console.error('Failed to fetch cart from Firebase:', e);
    }
  }
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

async function persistCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  const uid = getCurrentUserId();
  if (uid) {
    try {
      await set(ref(db, `carts/${uid}`), cart);
    } catch (e) {
      console.error('Failed to save cart to Firebase:', e);
    }
  }
}

async function loadCart() {
  const cartContainer = document.getElementById("cart-items");
  const totalElement = document.getElementById("total");
  const checkoutBtn = document.getElementById("checkoutBtn");

  let cart = await fetchCartFromSource();
  cartContainer.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="empty-cart-message">
        <div class="empty-cart-icon">
          <i class="fas fa-shopping-cart"></i>
        </div>
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added any items to your cart yet.</p>
        <a href="index.html" class="continue-shopping-btn">Continue Shopping</a>
      </div>
    `;
    totalElement.textContent = "";
    checkoutBtn.style.display = "none";
    return;
  }

  cart.forEach((item, index) => {
    total += item.price * item.quantity;

    const cartItem = document.createElement("div");
    cartItem.classList.add("cart-item");

    cartItem.innerHTML = `
      <img src="${item.image}" alt="${item.name}" width="80" height="80">
      <div class="item-details">
        <h4 class="item-name">${item.name}</h4>
        <p class="item-price">$${item.price.toFixed(2)}</p>
        <div class="qty-controls">
          <button class="qty-btn decrease" data-index="${index}" data-action="decrease" aria-label="Decrease quantity">
            <i class="fas fa-minus"></i>
          </button>
          <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="99" data-index="${index}" readonly>
          <button class="qty-btn increase" data-index="${index}" data-action="increase" aria-label="Increase quantity">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
      <div class="item-actions">
        <span class="subtotal">$${(item.price * item.quantity).toFixed(2)}</span>
        <button class="remove-btn" data-index="${index}" title="Remove item">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    cartContainer.appendChild(cartItem);
  });

  totalElement.innerHTML = `
    <div class="total-breakdown">
      <div class="subtotal-row">
        <span>Subtotal (${cart.reduce((sum, item) => sum + item.quantity, 0)} items):</span>
        <span class="subtotal-amount">$${total.toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span>Total:</span>
        <span class="total-amount">$${total.toFixed(2)}</span>
      </div>
      <p class="shipping-note">Shipping and taxes calculated at checkout</p>
    </div>
  `;
  
  checkoutBtn.style.display = "block";
  
  // Update cart count in header if it exists
  updateCartCount();
}

// Handle quantity changes & remove
document.addEventListener("click", (e) => {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let cartUpdated = false;

  if (e.target.closest(".remove-btn")) {
    const index = e.target.closest(".remove-btn").dataset.index;
    const removedItem = cart[index];
    
    // Show confirmation for expensive items
    if (removedItem.price > 20) {
      if (!confirm(`Remove ${removedItem.name} from cart?`)) {
        return;
      }
    }
    
    cart.splice(index, 1);
    cartUpdated = true;
    showNotification(`${removedItem.name} removed from cart`, 'info');
  }

  if (e.target.closest(".qty-btn")) {
    const btn = e.target.closest(".qty-btn");
    const index = parseInt(btn.dataset.index);
    const action = btn.dataset.action;
    const item = cart[index];

    if (action === "increase") {
      if (item.quantity < 99) {
        cart[index].quantity += 1;
        cartUpdated = true;
      } else {
        showNotification('Maximum quantity reached', 'warning');
      }
    } else if (action === "decrease") {
      if (item.quantity > 1) {
        cart[index].quantity -= 1;
        cartUpdated = true;
      } else {
        // If quantity is 1 and user clicks decrease, ask to remove
        if (confirm(`Remove ${item.name} from cart?`)) {
          cart.splice(index, 1);
          cartUpdated = true;
          showNotification(`${item.name} removed from cart`, 'info');
        }
      }
    }
  }

  if (cartUpdated) {
    persistCart(cart);
    loadCart();
  }
});

// Handle direct quantity input changes
document.addEventListener("change", (e) => {
  if (e.target.classList.contains("quantity-input")) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const index = parseInt(e.target.dataset.index);
    const newQuantity = parseInt(e.target.value);
    
    if (newQuantity >= 1 && newQuantity <= 99) {
      cart[index].quantity = newQuantity;
      persistCart(cart);
      loadCart();
    } else {
      e.target.value = cart[index].quantity; // Reset to original value
      showNotification('Please enter a valid quantity (1-99)', 'warning');
    }
  }
});

// Enhanced checkout functionality
document.getElementById("checkoutBtn").addEventListener("click", () => {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  
  if (cart.length === 0) {
    showNotification("Your cart is empty!", 'warning');
    return;
  }

  // Check if user is logged in
  const currentUser = localStorage.getItem("currentUser");
  
  if (!currentUser) {
    // Show login prompt
    const loginPrompt = confirm("You need to be logged in to checkout. Would you like to login now?");
    if (loginPrompt) {
      // Save current page for redirect after login (return to dashboard)
      localStorage.setItem("redirectAfterLogin", "index.html");
      window.location.href = "login.html";
    }
    return;
  }

  // Show loading state
  const checkoutBtn = document.getElementById("checkoutBtn");
  const originalText = checkoutBtn.innerHTML;
  checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
  checkoutBtn.disabled = true;

  // Simulate validation delay
  setTimeout(() => {
    // Redirect to checkout page
    window.location.href = "checkout.html";
  }, 1000);
});

// Update cart count badge
function updateCartCount() {
  const cartCountElement = document.getElementById("cart-count");
  if (cartCountElement) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElement.textContent = totalItems;
    
    // Add animation when count updates
    cartCountElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
      cartCountElement.style.transform = 'scale(1)';
    }, 200);
  }
}

// Clear entire cart
function clearCart() {
  if (confirm("Are you sure you want to clear your entire cart?")) {
    localStorage.removeItem("cart");
    loadCart();
    showNotification("Cart cleared successfully", 'info');
  }
}

// Add clear cart button functionality
document.addEventListener("DOMContentLoaded", () => {
  // Add clear cart button if it doesn't exist
  const cartHeader = document.querySelector("h2");
  if (cartHeader && !document.getElementById("clearCartBtn")) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearCartBtn";
    clearBtn.className = "clear-cart-btn";
    clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear Cart';
    clearBtn.onclick = clearCart;
    
    const headerContainer = document.createElement("div");
    headerContainer.className = "cart-header-container";
    headerContainer.appendChild(cartHeader.cloneNode(true));
    headerContainer.appendChild(clearBtn);
    
    cartHeader.parentNode.replaceChild(headerContainer, cartHeader);
  }
});

// Show notification function
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.cart-notification');
  existingNotifications.forEach(notification => notification.remove());

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `cart-notification ${type}`;
  
  // Set notification styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    min-width: 250px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `;
  
  // Set background color and icon based on type
  let icon = '';
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#10b981';
      icon = '<i class="fas fa-check-circle"></i>';
      break;
    case 'error':
      notification.style.backgroundColor = '#ef4444';
      icon = '<i class="fas fa-exclamation-circle"></i>';
      break;
    case 'warning':
      notification.style.backgroundColor = '#f59e0b';
      icon = '<i class="fas fa-exclamation-triangle"></i>';
      break;
    default:
      notification.style.backgroundColor = '#3b82f6';
      icon = '<i class="fas fa-info-circle"></i>';
  }
  
  notification.innerHTML = `${icon}<span>${message}</span>`;
  document.body.appendChild(notification);
  
  // Show notification with animation
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Hide notification after 3 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Save for later functionality
function saveForLater(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let savedItems = JSON.parse(localStorage.getItem("savedItems")) || [];
  
  const item = cart[index];
  savedItems.push(item);
  cart.splice(index, 1);
  
  localStorage.setItem("cart", JSON.stringify(cart));
  localStorage.setItem("savedItems", JSON.stringify(savedItems));
  
  loadCart();
  showNotification(`${item.name} saved for later`, 'success');
}

// Move to cart from saved items
function moveToCart(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let savedItems = JSON.parse(localStorage.getItem("savedItems")) || [];
  
  const item = savedItems[index];
  
  // Check if item already exists in cart
  const existingIndex = cart.findIndex(cartItem => cartItem.id === item.id);
  
  if (existingIndex > -1) {
    cart[existingIndex].quantity += item.quantity;
  } else {
    cart.push(item);
  }
  
  savedItems.splice(index, 1);
  
  localStorage.setItem("cart", JSON.stringify(cart));
  localStorage.setItem("savedItems", JSON.stringify(savedItems));
  
  loadCart();
  showNotification(`${item.name} moved to cart`, 'success');
}

// Quick add functionality (for product pages)
function quickAddToCart(productId, quantity = 1) {
  // This would typically get product data from your products array or API
  const products = JSON.parse(localStorage.getItem('products')) || [];
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    showNotification('Product not found', 'error');
    return;
  }
  
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existingIndex = cart.findIndex(item => item.id === productId);
  
  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      ...product,
      quantity: quantity
    });
  }
  
  persistCart(cart);
  updateCartCount();
  showNotification(`${product.name} added to cart`, 'success');
}

// Initialize cart functionality
function initCart() {
  loadCart();
  
  // No auto-redirect to checkout after login; user should choose checkout from cart
}

// Handle logout
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  if (confirm("Are you sure you want to logout? Your cart will be saved.")) {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("username");
    window.location.href = "login.html";
  }
});

// Keyboard navigation support
document.addEventListener("keydown", (e) => {
  // Allow Enter key to trigger button clicks
  if (e.key === "Enter" && e.target.classList.contains("qty-btn")) {
    e.target.click();
  }
  
  // Allow Escape key to close any open modals
  if (e.key === "Escape") {
    // Close any open confirmation dialogs or modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (modal.style.display === 'block') {
        modal.style.display = 'none';
      }
    });
  }
});

// Auto-save cart changes (debounced)
let cartSaveTimeout;
function autoSaveCart(cart) {
  clearTimeout(cartSaveTimeout);
  cartSaveTimeout = setTimeout(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, 500);
}

// Estimate shipping (basic implementation)
function estimateShipping(zipCode) {
  // This is a simplified shipping calculator
  // In a real application, this would integrate with a shipping API
  
  if (!zipCode || zipCode.length < 5) {
    showNotification('Please enter a valid ZIP code', 'warning');
    return;
  }
  
  let shippingCost = 5.99; // Default shipping
  let deliveryDays = '5-7';
  
  // Simple logic based on ZIP code patterns
  const firstDigit = zipCode.charAt(0);
  
  switch (firstDigit) {
    case '0':
    case '1':
    case '2':
      // East Coast
      shippingCost = 4.99;
      deliveryDays = '3-5';
      break;
    case '9':
      // West Coast
      shippingCost = 7.99;
      deliveryDays = '5-7';
      break;
    default:
      // Midwest/Central
      shippingCost = 5.99;
      deliveryDays = '4-6';
  }
  
  showNotification(`Estimated shipping: ${shippingCost.toFixed(2)} (${deliveryDays} business days)`, 'info');
}

// Load cart when page loads
window.addEventListener("DOMContentLoaded", initCart);