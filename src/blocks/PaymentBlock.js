class PaymentBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.stripeKey = "pk_test_YOUR_STRIPE_KEY"; // Infrastructure: Client's Key
    }

    connectedCallback() {
        this.render();
    }

    async handleCheckout() {
        const cart = JSON.parse(localStorage.getItem('engine01_cart')) || [];
        if (cart.length === 0) return alert("Your bag is empty!");

        const btn = this.shadowRoot.querySelector('#pay-btn');
        btn.innerText = "Connecting to Stripe...";
        btn.disabled = true;

        try {
            // This hits your Azure Hub to create a secure checkout link
            const response = await fetch("https://engine01-hub.azurewebsites.net/api/create-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: cart })
            });

            const session = await response.json();
            
            // Redirect user to the secure Stripe page
            window.location.href = session.url;
        } catch (err) {
            console.error("Payment Error:", err);
            btn.innerText = "Checkout Failed - Try Again";
            btn.disabled = false;
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; margin-top: 20px; }
            #pay-btn {
                width: 100%;
                padding: 18px;
                background: #000;
                color: #fff;
                border: none;
                border-radius: 8px;
                font-size: 1.1rem;
                font-weight: bold;
                cursor: pointer;
                transition: background 0.3s;
            }
            #pay-btn:hover { background: #333; }
            #pay-btn:disabled { background: #888; cursor: not-allowed; }
        </style>
        <button id="pay-btn">Secure Checkout</button>
        `;

        this.shadowRoot.querySelector('#pay-btn').addEventListener('click', () => this.handleCheckout());
    }
}

if (!customElements.get('payment-block')) {
    customElements.define('payment-block', PaymentBlock);
}