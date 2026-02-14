class ProductManagerBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.products = [];
    }

    async connectedCallback() {
        this.render();
        await this.loadProducts();
    }

    async loadProducts() {
        try {
            const res = await fetch("https://engine01-hub.azurewebsites.net/api/products");
            this.products = await res.json();
            this.render();
        } catch (err) {
            console.error("Hub Sync Error:", err);
        }
    }

    async saveNewProduct(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const product = {
            name: fd.get('name'),
            price: fd.get('price'),
            description: fd.get('desc') || "",
            image: fd.get('img') || "https://via.placeholder.com/150"
        };

        await fetch("https://engine01-hub.azurewebsites.net/api/products", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        
        e.target.reset();
        await this.loadProducts();
    }

    async updatePrice(pk, rk, newPrice) {
        await fetch("https://engine01-hub.azurewebsites.net/api/products", {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pk, rk, price: newPrice })
        });
        console.log("Infrastructure: Price Updated for", rk);
    }

    async deleteProduct(pk, rk) {
        if (!confirm("Permanently delete this product from inventory?")) return;
        
        await fetch("https://engine01-hub.azurewebsites.net/api/products", {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pk, rk })
        });
        await this.loadProducts();
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; color: #333; }
            .manager-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #eee; }
            h3 { margin-top: 0; color: #111; font-weight: 600; }
            
            .add-form { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 12px; }
            input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; outline: none; font-size: 14px; }
            input:focus { border-color: #0078d4; box-shadow: 0 0 0 2px rgba(0,120,212,0.1); }
            
            button { background: #0078d4; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s; }
            button:hover { background: #005a9e; }
            
            .product-list { display: flex; flex-direction: column; gap: 10px; }
            .product-row { display: flex; align-items: center; gap: 15px; padding: 12px; background: #fff; border: 1px solid #eee; border-radius: 12px; }
            .product-row img { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; background: #eee; }
            .name-tag { flex: 1; font-weight: 500; }
            .price-input { width: 80px; text-align: right; font-weight: 600; color: #0078d4; }
            
            .btn-delete { background: #fee2e2; color: #dc2626; padding: 8px 12px; font-size: 1.2rem; }
            .btn-delete:hover { background: #fecaca; }
        </style>

        <div class="manager-card">
            <h3>Add New Product</h3>
            <form class="add-form" id="productForm">
                <input name="name" placeholder="Name (e.g. Fade Cut)" required>
                <input name="price" type="number" step="0.01" placeholder="Price" required>
                <input name="img" placeholder="Image URL (optional)">
                <button type="submit">Add to Shop</button>
            </form>

            <h3>Inventory Management</h3>
            <div class="product-list">
                ${this.products.map(p => `
                    <div class="product-row">
                        <img src="${p.ImageURL || p.image || 'https://via.placeholder.com/50'}" alt="">
                        <div class="name-tag">${p.Name || p.name}</div>
                        <div>
                            $ <input class="price-input" type="number" step="0.01" value="${p.Price || p.price}" 
                                onchange="this.getRootNode().host.updatePrice('${p.PartitionKey}', '${p.RowKey}', this.value)">
                        </div>
                        <button class="btn-delete" title="Delete Product"
                            onclick="this.getRootNode().host.deleteProduct('${p.PartitionKey}', '${p.RowKey}')">
                            🗑
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
        `;

        this.shadowRoot.getElementById('productForm')?.addEventListener('submit', (e) => this.saveNewProduct(e));
    }
}

if (!customElements.get('product-manager-block')) {
    customElements.define('product-manager-block', ProductManagerBlock);
}