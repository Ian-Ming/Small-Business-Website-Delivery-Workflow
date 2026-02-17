class ProductManagerBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.products = [];
        this.clientId = "BarberShop01"; 
        this.apiUrl = "https://engine01-hub.azurewebsites.net/api/products";
    }

    getHeaders(extraHeaders = {}) {
        return {
            'Content-Type': 'application/json',
            'x-engine01-client-id': this.clientId,
            ...extraHeaders
        };
    }
    // Add this to the TOP of your ProductManagerBlock class
static get observedAttributes() { return ['client-id']; }

attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'client-id' && newVal) {
        this.clientId = newVal;
        this.loadProducts(); // Refresh data as soon as ID arrives
    }
}

    async connectedCallback() {
        this.render();
        await this.loadProducts();
    }

    async loadProducts() {
        try {
            const res = await fetch(this.apiUrl, { headers: this.getHeaders() });
            const data = await res.json();
            // Ensure data is an array before setting
            this.products = Array.isArray(data) ? data : [];
            this.render();
        } catch (err) {
            console.error("Hub Sync Error:", err);
        }
    }

    async saveNewProduct(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    
    const product = {
        // THIS IS THE FIX: Tell Azure exactly which "drawer" to put this in
        PartitionKey: this.clientId, 
        RowKey: Date.now().toString(), // Unique ID for the product
        name: fd.get('name'),
        price: fd.get('price'),
        image: fd.get('img') || "https://picsum.photos/300/200"
    };

    try {
        const res = await fetch(this.apiUrl, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(product) // Send the PartitionKey to the Hub
        });
        
        if (res.ok) {
            form.reset();
            await this.loadProducts();
        }
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
            console.log(`Infrastructure: Price Updated for ${rk}`);
        } catch (err) {
            console.error("Update Failed:", err);
        }
    }

    async deleteProduct(rk) { // We only need the RowKey (rk) now
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
        const res = await fetch(this.apiUrl, {
            method: 'DELETE',
            headers: this.getHeaders(),
            // We only send the RowKey. The Hub uses the Header to find the Partition.
            body: JSON.stringify({ rk: rk }) 
        });

        if (res.ok) {
            console.log("Infrastructure: Item removed from registry.");
            await this.loadProducts(); // Auto-refresh the list
        } else {
            console.error("Delete failed on Hub");
        }
    } catch (err) {
        console.error("Network Error during delete:", err);
    }
}

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; width: 100%; box-sizing: border-box; font-family: 'Segoe UI', system-ui, sans-serif; }
            .manager-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #eee; max-width: 100%; overflow: hidden; }
            .add-form { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 12px; }
            .add-form input { flex: 1; min-width: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
            .product-list { display: flex; flex-direction: column; gap: 10px; }
            .product-row { display: grid; grid-template-columns: 50px 1fr 100px 40px; align-items: center; gap: 15px; padding: 12px; background: #fff; border: 1px solid #f0f0f0; border-radius: 10px; }
            .product-row img { width: 50px; height: 50px; border-radius: 6px; object-fit: cover; }
            button[type="submit"] { background: #0078d4; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }
            .btn-delete { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #ffbcbc; transition: 0.2s; }
            .btn-delete:hover { color: #dc2626; }
        </style>

        <div class="manager-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <button onclick="this.getRootNode().host.loadProducts()" 
                            style="background:#f0f0f0; color:#444; padding:5px 10px; border-radius:6px; border:1px solid #ddd; cursor:pointer; font-size:12px;">
                        🔄 Refresh
                    </button>
                    <span style="font-size:10px; color:#aaa;">ID: ${this.clientId}</span>
                </div>
            </div>
            
            <form class="add-form" id="productForm">
                <input name="name" placeholder="Name" required>
                <input name="price" type="number" step="0.01" placeholder="Price" required>
                <input name="img" placeholder="Image URL">
                <button type="submit">Add Product</button>
            </form>

            <div class="product-list">
                ${this.products.length === 0 ? '<p style="text-align:center; color:#999;">No products found.</p>' : ''}
                ${this.products.map(p => {
                    const name = p.Name || p.name || "Unnamed Product";
                    const price = p.Price || p.price || 0;
                    const img = p.ImageURL || p.image || 'https://picsum.photos/50';
                    const pk = p.PartitionKey || p.pk;
                    const rk = p.RowKey || p.rk;
                    return `
                        <div class="product-row">
                            <img src="${img}">
                            <div class="name-tag">${name}</div>
                            <div>
                                $ <input type="number" step="0.01" value="${price}" 
                                    onchange="this.getRootNode().host.updatePrice('${pk}', '${rk}', this.value)" 
                                    style="width: 70px; padding: 5px; border-radius: 4px; border: 1px solid #ddd;">
                            </div>
                            <button class="btn-delete" onclick="this.getRootNode().host.deleteProduct('${pk}', '${rk}')">🗑</button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        `;

        this.shadowRoot.getElementById('productForm')?.addEventListener('submit', (e) => this.saveNewProduct(e));
    }
}
customElements.define('product-manager', ProductManagerBlock);