class CartIconBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        const cart = JSON.parse(localStorage.getItem('engine01_cart')) || [];
        this.count = cart.length;
    }

    connectedCallback() {
        this.render();

        window.addEventListener('add-to-bag', () => {
            const cart = JSON.parse(localStorage.getItem('engine01_cart')) || [];
            this.count = cart.length;
            this.render();
            this.animateBadge();
        });
    }

    animateBadge() {
        const badge = this.shadowRoot.querySelector('.badge');
        if (badge) {
            badge.style.transition = 'transform 0.2s ease';
            badge.style.transform = 'scale(1.4)';
            setTimeout(() => badge.style.transform = 'scale(1)', 200);
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { 
                display: inline-block !important; 
                vertical-align: middle !important;
                width: auto !important;
                margin-left: 12px; /* Professional spacing from the logo */
            }
            .cart-link { 
                position: relative; 
                display: inline-flex; 
                align-items: center;
                text-decoration: none;
                color: inherit;
                font-size: 1.5rem;
                line-height: 1; /* Prevents the icon from pushing the header height */
            }
            .badge { 
                position: absolute; 
                top: -8px; 
                right: -10px; 
                background: #ff3e3e; 
                color: white; 
                font-size: 0.7rem; 
                font-family: sans-serif;
                min-width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                padding: 2px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
        </style>
        <a href="checkout.html" class="cart-link" title="View Bag">
            🛒
            ${this.count > 0 ? `<span class="badge">${this.count}</span>` : ''}
        </a>
        `;
    }
}

// THE INFRASTRUCTURE GUARD: 
// Prevents the "Already Declared" error if the script loads twice.
if (!customElements.get('cart-icon-block')) {
    customElements.define('cart-icon-block', CartIconBlock);
}