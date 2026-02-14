class InventoryBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.products = [];
    }

    async connectedCallback() {
        this.renderLoading();
        await this.fetchInventory();
    }

    async fetchInventory() {
        // In the Grand Scheme, the API knows who is logged in via EasyAuth
        const API_URL = "https://engine01-hub.azurewebsites.net/api/products";
        try {
            const res = await fetch(API_URL);
            this.products = await res.json();
            this.render();
        } catch (err) {
            this.shadowRoot.innerHTML = `<p>Error loading inventory.</p>`;
        }
    }

    async savePrice(rowKey, newPrice) {
        const btn = this.shadowRoot.querySelector(`#btn-${rowKey}`);
        btn.innerText = "Saving...";

        try {
            await fetch(`https://engine01-hub.azurewebsites.net/api/products/${rowKey}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: newPrice })
            });
            btn.innerText = "Saved!";
            setTimeout(() => btn.innerText = "Update", 2000);
        } catch (err) {
            alert("Failed to update price.");
            btn.innerText = "Update";
        }
    }

    renderLoading() {
        this.shadowRoot.innerHTML = `<p>Loading Inventory Editor...</p>`;
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; padding: 20px; background: white; border-radius: 8px; }
            .product-row { 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                padding: 10px 0; 
                border-bottom: 1px solid #eee; 
            }
            input { width: 80px; padding: 5px; border-radius: 4px; border: 1px solid #ccc; }
            button { background: #0078d4; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
        </style>
        <h2>Inventory Manager</h2>
        <div id="list">
            ${this.products.map(p => `
                <div class="product-row">
                    <span>${p.name}</span>
                    <div>
                        $ <input type="number" id="input-${p.RowKey}" value="${p.price}">
                        <button id="btn-${p.RowKey}" 
                            onclick="this.getRootNode().host.savePrice('${p.RowKey}', this.previousElementSibling.value)">
                            Update
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
        `;
    }
}

if (!customElements.get('inventory-block')) {
    customElements.define('inventory-block', InventoryBlock);
}