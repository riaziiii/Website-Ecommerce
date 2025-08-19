import { auth, db} from './firebase.js';
import { ref, push, set } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js'; 

// Checkout Application
class CheckoutApp {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 3;
        this.cart = [];
        this.shippingInfo = {};
        this.paymentInfo = {};
        this.orderData = {};
        this.promoCodes = {
            'WELCOME10': { discount: 0.10, description: '10% off your order' },
            'BEAUTY20': { discount: 0.20, description: '20% off beauty items' },
            'FREESHIP': { shipping: 0, description: 'Free shipping' }
        };
        this.appliedPromo = null;
        
        this.init();
    }

    init() {
        this.loadCart();
        this.loadUserInfo();
        this.updateOrderSummary();
        this.setupEventListeners();
        this.updateStepDisplay();
    }

    // Load cart from localStorage
    loadCart() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        if (this.cart.length === 0) {
            alert('Your cart is empty. Returning to cart...');
            window.location.href = 'cart.html';
            return;
        }
    }

    // Load user info if logged in
    loadUserInfo() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            document.getElementById('email').value = currentUser.email || '';
            document.getElementById('firstName').value = currentUser.firstName || '';
            document.getElementById('lastName').value = currentUser.lastName || '';
        }
    }

    // Setup all event listeners
    setupEventListeners() {
        // Navigation buttons
        document.getElementById('nextBtn').addEventListener('click', () => this.nextStep());
        document.getElementById('prevBtn').addEventListener('click', () => this.prevStep());
        document.getElementById('placeOrderBtn').addEventListener('click', () => this.placeOrder());

        // Payment method toggle
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.togglePaymentMethod(e.target.value));
        });

        // Shipping method change
        document.querySelectorAll('input[name="shipping"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateOrderSummary());
        });

        // Card number formatting
        document.getElementById('cardNumber').addEventListener('input', this.formatCardNumber);
        document.getElementById('expiryDate').addEventListener('input', this.formatExpiryDate);
        document.getElementById('cvv').addEventListener('input', this.formatCVV);

        // Promo code
        document.getElementById('applyPromo').addEventListener('click', () => this.applyPromoCode());
        document.getElementById('promoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyPromoCode();
        });

        // Form validation on input
        document.querySelectorAll('input[required]').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearError(input));
        });

        // Logout functionality
        document.getElementById('logoutBtn')?.addEventListener('click', this.logout);
    }

    // Step navigation
    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < this.maxSteps) {
                this.currentStep++;
                this.updateStepDisplay();
                
                if (this.currentStep === 3) {
                    this.populateOrderReview();
                }
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    // Update step display
    updateStepDisplay() {
        // Update progress indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            } else if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            }
        });

        // Show/hide step content
        document.querySelectorAll('.checkout-step').forEach((step, index) => {
            step.classList.remove('active');
            if (index + 1 === this.currentStep) {
                step.classList.add('active');
            }
        });

        // Update navigation buttons
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const placeOrderBtn = document.getElementById('placeOrderBtn');

        prevBtn.style.display = this.currentStep === 1 ? 'none' : 'inline-block';
        nextBtn.style.display = this.currentStep === this.maxSteps ? 'none' : 'inline-block';
        placeOrderBtn.style.display = this.currentStep === this.maxSteps ? 'inline-block' : 'none';

        // Scroll to top of form
        document.querySelector('.checkout-content').scrollIntoView({ behavior: 'smooth' });
    }

    // Validate current step
    validateCurrentStep() {
        let isValid = true;
        
        if (this.currentStep === 1) {
            // Validate shipping form
            const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'country'];
            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (!this.validateField(field)) {
                    isValid = false;
                }
            });
            
            if (isValid) {
                this.saveShippingInfo();
            }
        } else if (this.currentStep === 2) {
            // Validate payment form
            const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
            
            if (paymentMethod === 'card') {
                const cardFields = ['cardNumber', 'cardName', 'expiryDate', 'cvv'];
                cardFields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (!this.validateField(field)) {
                        isValid = false;
                    }
                });
            }
            
            if (isValid) {
                this.savePaymentInfo();
            }
        }
        
        return isValid;
    }

    // Validate individual field
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Remove existing error
        this.clearError(field);

        // Required field check
        if (field.hasAttribute('required') && !value) {
            errorMessage = 'This field is required';
            isValid = false;
        } else if (value) {
            // Specific validation based on field type/id
            switch (field.id) {
                case 'email':
                    if (!this.isValidEmail(value)) {
                        errorMessage = 'Please enter a valid email address';
                        isValid = false;
                    }
                    break;
                case 'phone':
                    if (!this.isValidPhone(value)) {
                        errorMessage = 'Please enter a valid phone number';
                        isValid = false;
                    }
                    break;
                case 'cardNumber':
                    if (!this.isValidCardNumber(value)) {
                        errorMessage = 'Please enter a valid card number';
                        isValid = false;
                    }
                    break;
                case 'expiryDate':
                    if (!this.isValidExpiryDate(value)) {
                        errorMessage = 'Please enter a valid expiry date (MM/YY)';
                        isValid = false;
                    }
                    break;
                case 'cvv':
                    if (!this.isValidCVV(value)) {
                        errorMessage = 'Please enter a valid CVV';
                        isValid = false;
                    }
                    break;
                case 'zipCode':
                    {
                        const country = document.getElementById('country')?.value || '';
                        let zipValid = false;
                        switch (country) {
                            case 'PH':
                                // Philippines: 4 digits (e.g., 2010)
                                zipValid = /^\d{4}$/.test(value);
                                break;
                            case 'US':
                                // United States: 5 digits, optional ZIP+4
                                zipValid = /^\d{5}(-\d{4})?$/.test(value);
                                break;
                            case 'CA':
                                // Canada: A1A 1A1 (space or hyphen optional)
                                zipValid = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(value);
                                break;
                            case 'UK':
                                // United Kingdom: common postcode formats (broad)
                                zipValid = /^([A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2})$/.test(value);
                                break;
                            case 'AU':
                                // Australia: 4 digits
                                zipValid = /^\d{4}$/.test(value);
                                break;
                            default:
                                // Generic fallback: at least 4 characters
                                zipValid = value.length >= 4;
                        }
                        if (!zipValid) {
                            errorMessage = 'Please enter a valid ZIP/postal code';
                            isValid = false;
                        }
                    }
                    break;
            }
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    // Show field error
    showFieldError(field, message) {
        field.classList.add('error');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        errorElement.style.color = 'var(--error)';
        errorElement.style.fontSize = '0.8rem';
        errorElement.style.marginTop = '0.25rem';
        
        field.parentNode.appendChild(errorElement);
    }

    // Clear field error
    clearError(field) {
        field.classList.remove('error');
        const errorMessage = field.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    // Validation helper functions
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const digitsOnly = phone.replace(/\D/g, '');
        // Allow PH local format starting with 0 and totaling 11 digits (e.g., 09XXXXXXXXX)
        if (/^0\d{10}$/.test(digitsOnly)) {
            return true;
        }
        // Allow international formats without leading 0: 10 to 15 digits
        return /^[1-9]\d{9,14}$/.test(digitsOnly);
    }

    isValidCardNumber(cardNumber) {
        const cleanNumber = cardNumber.replace(/\s/g, '');
        return cleanNumber.length >= 13 && cleanNumber.length <= 19 && /^\d+$/.test(cleanNumber);
    }

    isValidExpiryDate(expiry) {
        const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
        if (!expiryRegex.test(expiry)) return false;
        
        const [month, year] = expiry.split('/');
        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;
        
        const expYear = parseInt(year);
        const expMonth = parseInt(month);
        
        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
            return false;
        }
        
        return true;
    }

    isValidCVV(cvv) {
        return /^\d{3,4}$/.test(cvv);
    }

    // Format card inputs
    formatCardNumber(e) {
        let value = e.target.value.replace(/\s/g, '');
        let formattedValue = value.replace(/(.{4})/g, '$1 ').trim();
        
        if (formattedValue.length > 19) {
            formattedValue = formattedValue.substring(0, 19);
        }
        
        e.target.value = formattedValue;
    }

    formatExpiryDate(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        
        e.target.value = value;
    }

    formatCVV(e) {
        let value = e.target.value.replace(/\D/g, '');
        e.target.value = value.substring(0, 4);
    }

    // Save form data
    saveShippingInfo() {
        this.shippingInfo = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            zipCode: document.getElementById('zipCode').value,
            country: document.getElementById('country').value,
            shippingMethod: document.querySelector('input[name="shipping"]:checked').value
        };
    }

    savePaymentInfo() {
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        
        this.paymentInfo = {
            method: paymentMethod
        };
        
        if (paymentMethod === 'card') {
            this.paymentInfo.cardNumber = document.getElementById('cardNumber').value;
            this.paymentInfo.cardName = document.getElementById('cardName').value;
            this.paymentInfo.expiryDate = document.getElementById('expiryDate').value;
            this.paymentInfo.cvv = document.getElementById('cvv').value;
        }
    }

    // Toggle payment method display
    togglePaymentMethod(method) {
        const cardDetails = document.getElementById('cardDetails');
        const paypalDetails = document.getElementById('paypalDetails');
        
        if (method === 'card') {
            cardDetails.style.display = 'block';
            paypalDetails.style.display = 'none';
        } else {
            cardDetails.style.display = 'none';
            paypalDetails.style.display = 'block';
        }
    }

    // Update order summary
    updateOrderSummary() {
        const summaryItems = document.getElementById('summaryItems');
        const subtotalElement = document.getElementById('subtotalAmount');
        const shippingElement = document.getElementById('shippingAmount');
        const taxElement = document.getElementById('taxAmount');
        const totalElement = document.getElementById('totalAmount');

        // Ensure cart is loaded; fallback to localStorage if needed
        if (!Array.isArray(this.cart) || this.cart.length === 0) {
            this.cart = JSON.parse(localStorage.getItem('cart') || '[]');
        }

        // If still empty, prevent checkout and return to cart
        if (!Array.isArray(this.cart) || this.cart.length === 0) {
            subtotalElement.textContent = '0.00';
            shippingElement.textContent = '0.00';
            taxElement.textContent = '0.00';
            totalElement.textContent = '0.00';
            alert('Your cart is empty. Returning to cart...');
            window.location.href = 'cart.html';
            return;
        }

        // Calculate subtotal with numeric coercion
        let subtotal = 0;
        summaryItems.innerHTML = '';

        this.cart.forEach(rawItem => {
            const price = Number(rawItem.price) || 0;
            const quantity = Number(rawItem.quantity) || 1;
            subtotal += price * quantity;

            const itemElement = document.createElement('div');
            itemElement.className = 'summary-item';
            itemElement.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${rawItem.name || 'Item'}</div>
                    <div class="item-details">Qty: ${quantity}</div>
                </div>
                <div class="item-price">${(price * quantity).toFixed(2)}</div>
            `;
            summaryItems.appendChild(itemElement);
        });

        // Get shipping cost
        const shippingInput = document.querySelector('input[name="shipping"]:checked');
        let shippingCost = shippingInput ? parseFloat(shippingInput.dataset.price) : 5.99;
        
        // Apply promo code discounts
        if (this.appliedPromo) {
            if (this.appliedPromo.shipping !== undefined) {
                shippingCost = this.appliedPromo.shipping;
            }
            if (this.appliedPromo.discount) {
                subtotal *= (1 - this.appliedPromo.discount);
            }
        }

        // Calculate tax (8% for demo)
        const tax = subtotal * 0.08;
        const total = subtotal + shippingCost + tax;

        // Update display
        subtotalElement.textContent = `${subtotal.toFixed(2)}`;
        shippingElement.textContent = `${shippingCost.toFixed(2)}`;
        taxElement.textContent = `${tax.toFixed(2)}`;
        totalElement.textContent = `${total.toFixed(2)}`;
    }

    // Apply promo code
    applyPromoCode() {
        const promoInput = document.getElementById('promoInput');
        const promoCode = promoInput.value.toUpperCase().trim();
        
        if (!promoCode) {
            this.showNotification('Please enter a promo code', 'error');
            return;
        }
        
        if (this.promoCodes[promoCode]) {
            this.appliedPromo = this.promoCodes[promoCode];
            this.updateOrderSummary();
            this.showNotification(`Promo code applied: ${this.appliedPromo.description}`, 'success');
            promoInput.value = '';
            promoInput.placeholder = `Applied: ${promoCode}`;
            document.getElementById('applyPromo').textContent = 'Remove';
            document.getElementById('applyPromo').onclick = () => this.removePromoCode();
        } else {
            this.showNotification('Invalid promo code', 'error');
        }
    }

    // Remove promo code
    removePromoCode() {
        this.appliedPromo = null;
        this.updateOrderSummary();
        this.showNotification('Promo code removed', 'success');
        
        const promoInput = document.getElementById('promoInput');
        promoInput.placeholder = 'Enter promo code';
        document.getElementById('applyPromo').textContent = 'Apply';
        document.getElementById('applyPromo').onclick = () => this.applyPromoCode();
    }

    // Populate order review
    populateOrderReview() {
        // Shipping address
        const shippingReview = document.getElementById('reviewShipping');
        const shippingMethod = document.querySelector('input[name="shipping"]:checked');
        
        shippingReview.innerHTML = `
            <p><strong>${this.shippingInfo.firstName} ${this.shippingInfo.lastName}</strong></p>
            <p>${this.shippingInfo.address}</p>
            <p>${this.shippingInfo.city}, ${this.shippingInfo.state} ${this.shippingInfo.zipCode}</p>
            <p>${this.shippingInfo.country}</p>
            <p><strong>Email:</strong> ${this.shippingInfo.email}</p>
            <p><strong>Phone:</strong> ${this.shippingInfo.phone}</p>
            <p><strong>Shipping:</strong> ${shippingMethod.parentNode.querySelector('.shipping-name').textContent}</p>
        `;

        // Payment method
        const paymentReview = document.getElementById('reviewPayment');
        if (this.paymentInfo.method === 'card') {
            const maskedCard = this.paymentInfo.cardNumber.replace(/\d(?=\d{4})/g, '*');
            paymentReview.innerHTML = `
                <p><strong>Credit/Debit Card</strong></p>
                <p>${maskedCard}</p>
                <p>${this.paymentInfo.cardName}</p>
            `;
        } else {
            paymentReview.innerHTML = `<p><strong>PayPal</strong></p>`;
        }

        // Order items
        const itemsReview = document.getElementById('reviewItems');
        itemsReview.innerHTML = '';
        
        this.cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'review-item';
            itemElement.innerHTML = `
                <span>${item.name} × ${item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
            `;
            itemsReview.appendChild(itemElement);
        });
    }

    // Place order
    async placeOrder() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.add('active');

        try {
            // Simulate API call
            await this.simulateOrderProcessing();
            const orderNumber = 'BG' + Date.now();
            const estimatedDelivery = this.calculateDeliveryDate();
            
             await this.saveOrder(orderNumber);
             
          
            localStorage.removeItem('cart');
            this.showOrderSuccess(orderNumber, estimatedDelivery);
            
        } catch (error) {
            console.error('Order processing failed:', error);
            this.showNotification('Order processing failed. Please try again.', 'error');
        } finally {
            loadingOverlay.classList.remove('active');
        }
    }
       
    async saveOrder(orderNumber) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
     
        const order = {
            orderNumber,
            date: new Date().toISOString(),
            items: this.cart,
            shipping: this.shippingInfo,
            payment:this.paymentInfo,
            total: document.getElementById('totalAmount').textContent,
            status: 'confirmed',
            user: currentUser ? {uid: currentUser.uid, email: currentUser.email, username: currentUser.username } : null 
        };

        const orderRef = push(ref(db, 'orders'));
        await set(orderRef, { ...order, id: orderRef.key });
    }
      
    // Simulate order processing
    simulateOrderProcessing() {
        return new Promise((resolve) => {
            setTimeout(resolve, 3000); // 3 second delay to simulate processing
        });
    }

    // Calculate delivery date
    calculateDeliveryDate() {
        const shippingMethod = document.querySelector('input[name="shipping"]:checked').value;
        const today = new Date();
        let deliveryDays = 7; // default
        
        switch (shippingMethod) {
            case 'standard':
                deliveryDays = 7;
                break;
            case 'express':
                deliveryDays = 3;
                break;
            case 'overnight':
                deliveryDays = 1;
                break;
        }
        
        const deliveryDate = new Date(today.getTime() + (deliveryDays * 24 * 60 * 60 * 1000));
        return deliveryDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // (removed legacy localStorage saveOrder)

    // Show order success
    showOrderSuccess(orderNumber, estimatedDelivery) {
        document.getElementById('orderNumber').textContent = orderNumber;
        document.getElementById('estimatedDelivery').textContent = estimatedDelivery;
        document.getElementById('successModal').classList.add('active');
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        
        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = 'var(--success)';
                break;
            case 'error':
                notification.style.backgroundColor = 'var(--error)';
                break;
            default:
                notification.style.backgroundColor = 'var(--primary)';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Hide and remove notification
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Logout functionality
    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

// Initialize checkout when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CheckoutApp();
});