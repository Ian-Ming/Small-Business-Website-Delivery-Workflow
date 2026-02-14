class CartIconBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.count = JSON.parse(localStorage.getItem('engine01_cart'))?.length || 0;
    }

    connectedCallback() {
        this.render();
        // Listen for the signal to update the number immediately
        window.addEventListener('add-to-bag', () => {
            this.count = JSON.parse(localStorage.getItem('engine01_cart'))?.length || 0;
            this.render();
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            .cart-link { 
                position: relative; cursor: pointer; text-decoration: none; 
                font-size: 1.5rem; display: flex; align-items: center;
            }
            .badge { 
                position: absolute; top: -5px; right: -10px; 
                background: red; color: white; font-size: 0.7rem; 
                padding: 2px 6px; border-radius: 50%; font-weight: bold;
            }
        </style>
        <a href="checkout.html" class="cart-link">
            🛒 ${this.count > 0 ? `<span class="badge">${this.count}</span>` : ''}
        </a>
        `;
    }
}
customElements.define('cart-icon-block', CartIconBlock);