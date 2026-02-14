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
            console.warn("Unauthenticated: Running in Guest Mode");
        }
    }

    async loadProducts() {
        const API_URL = "https://engine01-hub.azurewebsites.net/api/products";
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            this.render(data);
        } catch (err) {
            this.shadowRoot.innerHTML = `<p style="color:red;">Failed to load: ${err}</p>`;
        }
    }

    async logDraftOrder(product) {
        const LEADS_API = "https://engine01-hub.azurewebsites.net/api/leads"; 
        try {
            await fetch(LEADS_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    PartitionKey: this.clientId, 
                    RowKey: Date.now().toString(),
                    ProductName: product.name,
                    Price: product.price,
                    Status: "In-Cart"
                })
            });
            console.log("Infrastructure: Order logged to Partition:", this.clientId);
        } catch (err) {
            console.error("Sync Failed");
        }
    }

    renderLoading() {
        this.shadowRoot.innerHTML = `<p>Scanning Engine01 Inventory...</p>`;
    }

    render(products) {
        // 1. Build the HTML and CSS
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: system-ui, sans-serif; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 20px 0; }
            .card { border: 1px solid #eee; border-radius: 12px; padding: 16px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
            img { width: 100%; height: 180px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; }
            .price { font-size: 1.2rem; font-weight: 700; color: #0078d4; margin: 8px 0; }
            .add-to-bag-btn { background: #28a745; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-top: auto; }
        </style>

        <div class="grid">
            ${products.map(p => `
                <div class="card">
                    <a href="product-detail.html?id=${p.id || p.RowKey}" style="text-decoration:none; color:inherit;">
                        <img src="${p.image}" alt="${p.name}">
                        <h3>${p.name}</h3>
                    </a>
                    <div class="price">$${p.price}</div>
                    <button class="add-to-bag-btn" data-id="${p.id || p.RowKey}" data-name="${p.name}" data-price="${p.price}">
                        Add to Bag
                    </button>
                </div>
            `).join('')}
        </div>
        `;

        // 2. Attach the listeners (Inside the render room)
        this.shadowRoot.querySelectorAll('.add-to-bag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const { id, name, price } = btn.dataset;
                const product = { id, name, price, timestamp: new Date().toISOString() };
                
                let cart = JSON.parse(localStorage.getItem('engine01_cart')) || [];
                cart.push(product);
                localStorage.setItem('engine01_cart', JSON.stringify(cart));

                this.logDraftOrder(product);

                this.dispatchEvent(new CustomEvent('add-to-bag', { 
                    bubbles: true, composed: true, detail: product 
                }));

                const originalText = btn.innerText;
                btn.innerText = 'Added!';
                setTimeout(() => btn.innerText = originalText, 1500);
            });
        });
    } // End of render
} // End of ProductBlock class

if (!customElements.get('product-block')) {
    customElements.define('product-block', ProductBlock);
}