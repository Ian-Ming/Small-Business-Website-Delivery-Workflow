class ProductBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        // Default to attribute or fallback
        this.clientId = this.getAttribute('client-id') || "BarberShop01"; 
        this.apiUrl = "https://engine01-hub.azurewebsites.net/api/products";
    }

    async connectedCallback() {
        this.style.display = 'block'; 
        this.renderLoading();
        await this.loadProducts();
    }

    async loadProducts() {
        try {
            // CRITICAL: We pass the client-id so the Hub only returns THAT client's products
            const res = await fetch(this.apiUrl, {
                headers: {
                    'x-engine01-client-id': this.clientId,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            
            const data = await res.json();
            const productList = Array.isArray(data) ? data : [];
            
            // Filter locally just in case the Hub is wide open
            const filtered = productList.filter(p => 
                (p.PartitionKey === this.clientId) || (p.pk === this.clientId)
            );

            this.render(filtered);
        } catch (err) {
            console.error("Infrastructure Sync Error:", err);
            this.shadowRoot.innerHTML = `
                <div style="padding:20px; text-align:center; color:#666; border:1px dashed #ccc; border-radius:12px;">
                    <p>Unable to load products right now.</p>
                    <button onclick="this.getRootNode().host.loadProducts()" style="cursor:pointer; background:none; border:1px solid #ccc; padding:5px 10px; border-radius:4px;">Try Again</button>
                </div>`;
        }
    }

    async logDraftOrder(product) {
        const LEADS_API = "https://engine01-hub.azurewebsites.net/api/intake"; 
        try {
            await fetch(LEADS_API, {
                method: 'POST',
                mode: 'cors', // Ensure CORS is handled
                headers: { 
                    'Content-Type': 'application/json',
                    'x-engine01-client-id': this.clientId 
                },
                body: JSON.stringify({
                    PartitionKey: this.clientId, 
                    RowKey: `LEAD-${Date.now()}`,
                    Name: "Website Visitor", 
                    Email: "anonymous@guest.com",
                    Message: `Intent: Purchase ${product.name} ($${product.price})`
                })
            });
        } catch (err) {
            console.warn("Lead tracking silent failure");
        }
    }

    renderLoading() {
        this.shadowRoot.innerHTML = `
            <style>
                .loader { padding: 40px; text-align: center; color: #888; font-style: italic; }
                .shimmer { height: 200px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shim 1.5s infinite; border-radius: 8px; }
                @keyframes shim { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
            </style>
            <div class="loader">
                <div class="shimmer"></div>
                <p>Syncing with Inventory Hub...</p>
            </div>
        `;
    }

    _normalize(p) {
        return {
            name: p.Name || p.name || 'Service',
            price: p.Price || p.price || '0.00',
            img: p.ImageURL || p.image || 'https://via.placeholder.com/150',
            id: p.RowKey || p.rk || Math.random().toString(36).substr(2, 9)
        };
    }

    render(products) {
        if (products.length === 0) {
            this.shadowRoot.innerHTML = `<p style="text-align:center; padding:40px; color:#999;">No products available at this time.</p>`;
            return;
        }

        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; padding: 10px; }
            .card { border: 1px solid #efefef; border-radius: 12px; padding: 16px; background: #fff; display: flex; flex-direction: column; transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            .card:hover { box-shadow: 0 12px 24px rgba(0,0,0,0.1); transform: translateY(-5px); }
            img { width: 100%; height: 180px; object-fit: cover; border-radius: 6px; margin-bottom: 12px; }
            .info { flex-grow: 1; }
            h3 { margin: 0; font-size: 1rem; color: #1a1a1a; }
            .price { font-size: 1.2rem; font-weight: 800; color: #1a1a1a; margin: 10px 0; }
            .add-btn { width: 100%; background: #000; color: #fff; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem; }
            .add-btn:active { transform: scale(0.95); }
            .added { background: #22c55e !important; }
        </style>
        <div class="grid">
            ${products.map(raw => {
                const p = this._normalize(raw);
                return `
                    <div class="card">
                        <img src="${p.img}" loading="lazy">
                        <div class="info">
                            <h3>${p.name}</h3>
                            <div class="price">$${p.price}</div>
                        </div>
                        <button class="add-btn" data-product='${JSON.stringify(p).replace(/'/g, "&apos;")}'>
                            Add to Bag
                        </button>
                    </div>
                `;
            }).join('')}
        </div>`;

        this.shadowRoot.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const product = JSON.parse(btn.dataset.product);
                
                // Track in Cloud
                this.logDraftOrder(product);

                // Local State
                btn.classList.add('added');
                btn.innerText = '✓ Added';
                
                this.dispatchEvent(new CustomEvent('engine01_add_to_cart', {
                    bubbles: true, composed: true, detail: product
                }));

                setTimeout(() => {
                    btn.classList.remove('added');
                    btn.innerText = 'Add to Bag';
                }, 2000);
            });
        });
    }
}

if (!customElements.get('product-block')) {
    customElements.define('product-block', ProductBlock);
}