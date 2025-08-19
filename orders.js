import { auth, db } from './firebase.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function fmtMoney(n) {
  const num = parseFloat(n || 0);
  return `$${num.toFixed(2)}`;
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; }
}

function updateCartCount() {
  const el = document.getElementById("cart-count");
  if (!el) return;
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  el.textContent = cart.reduce((s, i) => s + i.quantity, 0);
}

async function fetchOrdersForUser() {
  const user = getCurrentUser();
  if (!user?.uid) {
    // Require login to view orders
    window.location.href = 'login.html';
    return [];
  }

  // Read all orders and filter on client by uid
  // Alternatively, mirror to users/{uid}/orders for direct fetch
  const snap = await get(ref(db, 'orders'));
  if (!snap.exists()) return [];
  const all = Object.values(snap.val());
  return all.filter(o => o?.user?.uid === user.uid);
}

function renderOrders(orders) {
  const container = document.getElementById('ordersList');
  container.innerHTML = '';

  if (!orders.length) {
    container.innerHTML = '<div class="empty">No orders found.</div>';
    return;
  }

  orders
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((o, idx) => {
      const card = document.createElement('div');
      card.className = 'order-card';

      const itemsCount = Array.isArray(o.items)
        ? o.items.reduce((s, it) => s + (it.quantity || 1), 0)
        : 0;

      card.innerHTML = `
        <div class="order-head">
          <div>
            <div><strong>Order #${o.orderNumber}</strong></div>
            <div class="order-meta">${fmtDate(o.date)}</div>
          </div>
          <div style="text-align:right">
            <div class="badge">${o.status || 'confirmed'}</div>
            <div class="total">${fmtMoney(o.total)}</div>
          </div>
        </div>
        <div class="order-meta" style="margin-top:8px">
          ${(o.shipping?.firstName || '') + ' ' + (o.shipping?.lastName || '')}
          ${o.shipping ? `— ${o.shipping.address || ''}, ${o.shipping.city || ''}` : ''}
        </div>
        <div class="order-items" id="items-${idx}" style="display:none"></div>
        <div class="actions">
          <button class="btn toggle" data-target="items-${idx}">View details (${itemsCount} item${itemsCount!==1?'s':''})</button>
        </div>
      `;

      const itemsEl = card.querySelector(`#items-${idx}`);
      (Array.isArray(o.items) ? o.items : []).forEach(it => {
        const row = document.createElement('div');
        row.className = 'order-item';
        const qty = it.quantity || 1;
        row.innerHTML = `<span>${it.name || 'Item'} × ${qty}</span><span>${fmtMoney((it.price || 0) * qty)}</span>`;
        itemsEl.appendChild(row);
      });

      card.querySelector('.toggle').addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-target');
        const el = card.querySelector(`#${id}`);
        const open = el.style.display !== 'none';
        el.style.display = open ? 'none' : 'block';
        e.currentTarget.textContent = (open ? 'View details' : 'Hide details') + ` (${itemsCount} item${itemsCount!==1?'s':''})`;
      });

      container.appendChild(card);
    });
}

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'logoutBtn') {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('username');
      window.location.href = 'login.html';
    }
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  updateCartCount();
  const container = document.getElementById('ordersList');
  if (container) container.innerHTML = '<div class="empty">Loading...</div>';
  const orders = await fetchOrdersForUser();
  renderOrders(orders);
});
