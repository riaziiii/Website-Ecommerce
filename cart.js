function loadCart() {
  const cartContainer = document.getElementById("cart-items");
  const totalElement = document.getElementById("total");

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cartContainer.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    cartContainer.innerHTML = "<p>Your cart is empty.</p>";
    totalElement.textContent = "";
    return;
  }

  cart.forEach((item, index) => {
    total += item.price * item.quantity;

    const cartItem = document.createElement("div");
    cartItem.classList.add("cart-item");

    cartItem.innerHTML = `
      <img src="${item.image}" alt="${item.name}" width="80">
      <span>${item.name}</span>
      <span>$${item.price.toFixed(2)}</span>
      <div class="qty-controls">
        <button class="qty-btn" data-index="${index}" data-action="decrease">-</button>
        <span>${item.quantity}</span>
        <button class="qty-btn" data-index="${index}" data-action="increase">+</button>
      </div>
      <span class="subtotal">$${(item.price * item.quantity).toFixed(2)}</span>
      <button class="remove-btn" data-index="${index}">Remove</button>
    `;

    cartContainer.appendChild(cartItem);
  });

  totalElement.textContent = `Total: $${total.toFixed(2)}`;
}

// Handle quantity changes & remove
document.addEventListener("click", (e) => {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (e.target.classList.contains("remove-btn")) {
    const index = e.target.dataset.index;
    cart.splice(index, 1);
  }

  if (e.target.classList.contains("qty-btn")) {
    const index = e.target.dataset.index;
    const action = e.target.dataset.action;

    if (action === "increase") {
      cart[index].quantity += 1;
    } else if (action === "decrease" && cart[index].quantity > 1) {
      cart[index].quantity -= 1;
    }
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
});

// Checkout
document.getElementById("checkoutBtn").addEventListener("click", () => {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }
  alert("Proceeding to checkout...");
});

window.addEventListener("DOMContentLoaded", loadCart);
