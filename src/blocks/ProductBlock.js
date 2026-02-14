class ProductBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.clientId = "guest"; 
    }

    async connectedCallback() {
        await this.identifyClient();
        this.style.display = 'block'; 
        this.renderLoading();
        await this.loadProducts();
    }

    async identifyClient() {
        try {
            const res = await fetch("/.auth/me");
            const data = await res.json();
            if (data.clientPrincipal) {
                this.clientId = data.clientPrincipal.userDetails; 
            }
        } catch (err) {
            console.warn("Infrastructure: Running in Guest Mode");
        }
    }

    async loadProducts() {
        const API_URL = "https://engine01-hub.azurewebsites.net/api/products";
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            
            // Ensure data is an array before rendering
            if (Array.isArray(data)) {
                this.render(data);
            } else {
                throw new Error("Invalid data format from Hub");
            }
        } catch (err) {
            this.shadowRoot.innerHTML = `<p style="color:red; padding: 20px;">Inventory Sync Failed: ${err.message}</p>`;
        }
    }

    async logDraftOrder(product) {
        // Pointing to your intake route since it handles Lead/Order logging
        const LEADS_API = "https://engine01-hub.azurewebsites.net/api/intake"; 
        try {
            await fetch(LEADS_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    PartitionKey: this.clientId, 
                    RowKey: Date.now().toString(),
                    name: "Guest Lead", // Default name for lead tracking
                    email: this.clientId,
                    message: `Product Added to Bag: ${product.name} ($${product.price})`
                })
            });
            console.log("Infrastructure: Event Logged for", this.clientId);
        } catch (err) {
            console.error("Lead Sync Failed");
        }
    }

    renderLoading() {
        this.shadowRoot.innerHTML = `
            <style>:host { display: block; padding: 20px; color: #666; }</style>
            <p>Scanning Engine01 Inventory...</p>
        `;
    }

    // Normalization helper to prevent "undefined"
    _normalize(p) {
        return {
            name: p.Name || p.name || 'Unknown Product',
            price: p.Price || p.price || '0.00',
            img: p.ImageURL || p.image || 'https://via.placeholder.com/150',
            id: p.RowKey || p.id || Math.random().toString(36).substr(2, 9)
        };
    }

    render(products) {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 20px 0; }
            .card { border: 1px solid #eee; border-radius: 12px; padding: 16px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; transition: transform 0.2s; }
            .card:hover { transform: translateY(-4px); }
            img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; background: #f9f9f9; }
            h3 { margin: 0; font-size: 1.1rem; color: #111; }
            .price { font-size: 1.25rem; font-weight: 700; color: #0078d4; margin: 8px 0; }
            .add-to-bag-btn { background: #28a745; color: white; border: none; padding: 14px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: auto; transition: 0.2s; }
            .add-to-bag-btn:hover { background: #218838; }
            .add-to-bag-btn:active { transform: scale(0.98); }
        </style>

        <div class="grid">
            ${products.map(rawProduct => {
                const p = this._normalize(rawProduct);
                return `
                    <div class="card">
                        <img src="${p.img}" alt="${p.name}">
                        <h3>${p.name}</h3>
                        <div class="price">$${p.price}</div>
                        <button class="add-to-bag-btn" 
                            data-id="${p.id}" 
                            data-name="${p.name}" 
                            data-price="${p.price}">
                            Add to Bag
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
        `;

        // Attach Listeners
        this.shadowRoot.querySelectorAll('.add-to-bag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const { id, name, price } = btn.dataset;
                const product = { id, name, price, timestamp: new Date().toISOString() };
                
                // Local Storage for the user's session
                let cart = JSON.parse(localStorage.getItem('engine01_cart')) || [];
                cart.push(product);
                localStorage.setItem('engine01_cart', JSON.stringify(cart));

                // Cloud Storage for your Lead Management
                this.logDraftOrder(product);

                // Global Event for other blocks (like a Cart Counter)
                this.dispatchEvent(new CustomEvent('add-to-bag', { 
                    bubbles: true, composed: true, detail: product 
                }));

                const originalText = btn.innerText;
                btn.innerText = 'Added!';
                setTimeout(() => btn.innerText = originalText, 1500);
            });
        });
    }
}

if (!customElements.get('product-block')) {
    customElements.define('product-block', ProductBlock);
}