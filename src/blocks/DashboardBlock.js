class DashboardBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.orders = [];
    }

    async connectedCallback() {
        this.renderLoading();
        await this.fetchOrders();
    }

    async fetchOrders() {
        const API_URL = "https://engine01-hub.azurewebsites.net/api/intake";
        try {
            const res = await fetch(API_URL);
            this.orders = await res.json();
            this.render();
        } catch (err) {
            this.renderError(err);
        }
    }

    async updateStatus(pKey, rKey, newStatus) {
        const API_URL = "https://engine01-hub.azurewebsites.net/api/intake";
        try {
            await fetch(API_URL, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ PartitionKey: pKey, RowKey: rKey, Status: newStatus })
            });
            this.fetchOrders(); // Refresh UI
        } catch (err) { console.error("Update failed", err); }
    }

    renderLoading() {
        this.shadowRoot.innerHTML = `<div style="padding: 20px; color: #666;">Synchronizing Engine01 Hub...</div>`;
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { --primary: #0078d4; --bg: #f8f9fa; display: block; font-family: 'Segoe UI', system-ui, sans-serif; }
            .dashboard-container { background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); padding: 24px; margin: 20px; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
            th { text-align: left; padding: 12px; color: #666; font-weight: 500; border-bottom: 1px solid #eee; }
            tr { transition: transform 0.2s; }
            td { padding: 16px 12px; background: #fff; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; }
            tr td:first-child { border-left: 1px solid #f0f0f0; border-radius: 12px 0 0 12px; }
            tr td:last-child { border-right: 1px solid #f0f0f0; border-radius: 0 12px 12px 0; }
            
            .status-pill { padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .status-new { background: #e1f5fe; color: #01579b; }
            .status-pending { background: #fff3e0; color: #e65100; }
            .status-completed { background: #e8f5e9; color: #1b5e20; }
            
            select { border: 1px solid #ddd; padding: 8px; border-radius: 8px; outline: none; cursor: pointer; }
            .btn-refresh { background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        </style>

        <div class="dashboard-container">
            <div class="header">
                <h2>Command Center</h2>
                <button class="btn-refresh" onclick="this.getRootNode().host.fetchOrders()">Refresh Data</button>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Client/ID</th>
                        <th>Name</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.orders.map(o => {
                        const status = (o.status || 'new').toLowerCase();
                        return `
                        <tr>
                            <td><strong>${o.PartitionKey}</strong></td>
                            <td>${o.name || 'Anonymous'}</td>
                            <td><small>${o.message || '-'}</small></td>
                            <td><span class="status-pill status-${status}">${status}</span></td>
                            <td>
                                <select onchange="this.getRootNode().host.updateStatus('${o.PartitionKey}', '${o.RowKey}', this.value)">
                                    <option value="" disabled selected>Update</option>
                                    <option value="New">New</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
        `;
    }
}

if (!customElements.get('dashboard-block')) {
    customElements.define('dashboard-block', DashboardBlock);
}