class ProductManagerBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.products = [];
        // THE MASTER KEY: Change this one line when deploying for a new client
        this.clientId = "BarberShop01"; 
        this.apiUrl = "https://engine01-hub.azurewebsites.net/api/products";
    }

    // Helper to keep fetch calls clean and standardized
    getHeaders(extraHeaders = {}) {
        return {
            'Content-Type': 'application/json',
            'x-engine01-client-id': this.clientId,
            ...extraHeaders
        };
    }

    async connectedCallback() {
        this.render();
        await this.loadProducts();
    }

    async loadProducts() {
        try {
            const res = await fetch(this.apiUrl, {
                headers: this.getHeaders()
            });
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

        try {
            await fetch(this.apiUrl, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(product)
            });
            e.target.reset();
            await this.loadProducts();
        } catch (err) {
            console.error("Save Failed:", err);
        }
    }

    async updatePrice(pk, rk, newPrice) {
        try {
            await fetch(this.apiUrl, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({ pk, rk, price: newPrice })
            });
            console.log(`Infrastructure: Price Updated for ${rk} under ${this.clientId}`);
        } catch (err) {
            console.error("Update Failed:", err);
        }
    }

    async deleteProduct(pk, rk) {
        if (!confirm("Permanently delete this product from inventory?")) return;
        
        try {
            await fetch(this.apiUrl, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: JSON.stringify({ pk, rk })
            });
            await this.loadProducts();
        } catch (err) {
            console.error("Delete Failed:", err);
        }
    }

    render() {
        // ... (Styles stay exactly the same as your previous version) ...
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; color: #333; }
            .manager-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #eee; }
            h3 { margin-top: 0; color: #111; font-weight: 600; }
            .add-form { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 12px; }
            input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; outline: none; font-size: 14px; }
            button { background: #0078d4; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s; }
            .product-row { display: flex; align-items: center; gap: 15px; padding: 12px; border-bottom: 1px solid #eee; }
            .product-row img { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; }
            .name-tag { flex: 1; font-weight: 500; }
            .btn-delete { background: #fee2e2; color: #dc2626; padding: 8px 12px; border-radius: 8px; border:none; cursor:pointer; }
        </style>

        <div class="manager-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Inventory Manager</h3>
                <span style="font-size:10px; color:#aaa;">ID: ${this.clientId}</span>
            </div>
            
            <form class="add-form" id="productForm">
                <input name="name" placeholder="Name" required>
                <input name="price" type="number" step="0.01" placeholder="Price" required>
                <input name="img" placeholder="Image URL">
                <button type="submit">Add Product</button>
            </form>

            <div class="product-list">
                ${this.products.map(p => `
                    <div class="product-row">
                        <img src="${p.ImageURL || p.image || 'https://via.placeholder.com/50'}">
                        <div class="name-tag">${p.Name || p.name}</div>
                        <div>
                            $ <input type="number" step="0.01" value="${p.Price || p.price}" 
                                onchange="this.getRootNode().host.updatePrice('${p.PartitionKey}', '${p.RowKey}', this.value)" 
                                style="width: 70px; padding: 5px; border-radius: 4px; border: 1px solid #ddd;">
                        </div>
                        <button class="btn-delete" onclick="this.getRootNode().host.deleteProduct('${p.PartitionKey}', '${p.RowKey}')">🗑</button>
                    </div>
                `).join('')}
            </div>
        </div>
        `;

        this.shadowRoot.getElementById('productForm')?.addEventListener('submit', (e) => this.saveNewProduct(e));
    }
}
customElements.define('product-manager', ProductManagerBlock);