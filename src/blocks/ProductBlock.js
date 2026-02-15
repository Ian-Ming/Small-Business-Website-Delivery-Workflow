class ProductBlock extends HTMLElement {
    static get observedAttributes() { return ['client-id']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.products = [];
        this.apiUrl = "https://engine01-hub.azurewebsites.net/api/products";
    }

    // This ensures if you change the ID in HTML, the products refresh automatically
    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'client-id' && oldVal !== newVal) {
            this.loadProducts();
        }
    }

    get clientId() {
        return this.getAttribute('client-id') || "BarberShop01";
    }

    async connectedCallback() {
        // Ensure we always have a display block so it's not 0px tall
        this.style.display = 'block'; 
        await this.loadProducts();
    }

    async loadProducts() {
        this.renderLoading();
        try {
            const res = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'x-engine01-client-id': this.clientId,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) throw new Error(`Hub Offline (${res.status})`);
            
            const data = await res.json();
            
            // Critical Fix: Filter by the clientId to ensure no data-leakage
            // Handles both 'pk' and 'PartitionKey' formats from your Azure Hub
            this.products = Array.isArray(data) ? data.filter(p => 
                (p.PartitionKey === this.clientId || p.pk === this.clientId)
            ) : [];

            this.render();
        } catch (err) {
            console.error("Infrastructure Sync Error:", err);
            this.renderError(err.message);
        }
    }

    async logDraftOrder(product) {
        const LEADS_API = "https://engine01-hub.azurewebsites.net/api/intake"; 
        try {
            await fetch(LEADS_API, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-engine01-client-id': this.clientId 
                },
                body: JSON.stringify({
                    PartitionKey: this.clientId, 
                    RowKey: `CART-${Date.now()}`,
                    Name: "Website Visitor", 
                    Message: `Product Added: ${product.name} ($${product.price})`
                })
            });
        } catch (err) { console.warn("Silent Lead Failure"); }
    }

    renderLoading() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; font-family: sans-serif; }
                .loading { padding: 50px; text-align: center; color: #aaa; }
                .shimmer { height: 200px; background: #f0f0f0; border-radius: 12px; animation: pulse 1.5s infinite; }
                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
            </style>
            <div class="loading">
                <div class="shimmer"></div>
                <p>Syncing Inventory...</p>
            </div>`;
    }

    renderError(msg) {
        this.shadowRoot.innerHTML = `
            <div style="padding:40px; text-align:center; color:#666; border:1px dashed #ddd; border-radius:12px;">
                <p>Connection issue: ${msg}</p>
                <button onclick="this.getRootNode().host.loadProducts()" style="padding:8px 16px; cursor:pointer;">Retry</button>
            </div>`;
    }

    _normalize(p) {
        return {
            name: p.Name || p.name || 'Service',
            price: p.Price || p.price || '0.00',
            img: p.ImageURL || p.image || 'https://picsum.photos/400/300',
            id: p.RowKey || p.rk || Math.random()
        };
    }

    render() {
        if (this.products.length === 0) {
            this.shadowRoot.innerHTML = `<p style="text-align:center; padding:40px; color:#999;">No products available for ${this.clientId}.</p>`;
            return;
        }

        this.shadowRoot.innerHTML = `
        <style>
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; padding: 20px; }
            .card { border: 1px solid #eee; border-radius: 16px; padding: 16px; background: #fff; display: flex; flex-direction: column; transition: 0.2s; }
            .card:hover { box-shadow: 0 10px 20px rgba(0,0,0,0.05); transform: translateY(-3px); }
            img { width: 100%; height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 15px; }
            h3 { margin: 0; font-size: 1.1rem; }
            .price { font-size: 1.3rem; font-weight: 800; margin: 10px 0; color: #000; }
            .add-btn { width: 100%; background: #000; color: #fff; border: none; padding: 15px; border-radius: 10px; cursor: pointer; font-weight: 600; margin-top: auto; }
            .added { background: #22c55e !important; }
        </style>
        <div class="grid">
            ${this.products.map(raw => {
                const p = this._normalize(raw);
                return `
                    <div class="card">
                        <img src="${p.img}" loading="lazy">
                        <h3>${p.name}</h3>
                        <div class="price">$${p.price}</div>
                        <button class="add-btn" data-p='${JSON.stringify(p).replace(/'/g, "&apos;")}'>Add to Bag</button>
                    </div>`;
            }).join('')}
        </div>`;

        this.shadowRoot.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = JSON.parse(btn.dataset.p);
                this.logDraftOrder(p);
                btn.classList.add('added');
                btn.innerText = '✓ Added';
                this.dispatchEvent(new CustomEvent('engine01_cart_add', { bubbles: true, composed: true, detail: p }));
                setTimeout(() => { btn.classList.remove('added'); btn.innerText = 'Add to Bag'; }, 2000);
            });
        });
    }
}
if (!customElements.get('product-block')) customElements.define('product-block', ProductBlock);