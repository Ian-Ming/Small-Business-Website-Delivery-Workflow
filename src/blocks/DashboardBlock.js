class DashboardBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        // Make sure this matches your other blocks!
        this.clientId = "BarberShop01"; 
        this.apiUrl = "https://engine01-hub.azurewebsites.net/api/intake";
    }

    async connectedCallback() {
        this.renderLoading();
        await this.fetchOrders();
    }

    async fetchOrders() {
        try {
            const res = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'x-engine01-client-id': this.clientId,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) throw new Error(`Status ${res.status}`);
            
            const data = await res.json();
            this.render(data);
        } catch (err) {
            console.error("Dashboard Sync Failed:", err);
            this.renderError(err.message); // Now this function exists!
        }
    }

    renderLoading() {
        this.shadowRoot.innerHTML = `<p style="padding:20px; color:#666;">Loading Leads...</p>`;
    }

    // Missing function fix
    renderError(msg) {
        this.shadowRoot.innerHTML = `
            <div style="padding:20px; color:red; border:1px solid #fecaca; border-radius:8px; background:#fef2f2;">
                <strong>Sync Error:</strong> ${msg} (Check Client ID)
            </div>`;
    }

    render(leads) {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: system-ui, sans-serif; }
            .pill { 
                background: white; 
                border-radius: 16px; 
                padding: 24px; 
                border: 1px solid #eee; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.02);
            }
            h2 { margin-top: 0; font-size: 1.2rem; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { text-align: left; font-size: 0.75rem; color: #888; text-transform: uppercase; padding: 10px; border-bottom: 2px solid #f4f4f4; }
            td { padding: 12px 10px; border-bottom: 1px solid #f9f9f9; font-size: 0.9rem; }
            .status { 
                padding: 4px 8px; 
                border-radius: 4px; 
                font-size: 0.7rem; 
                font-weight: bold; 
                background: #e1f5fe; 
                color: #01579b; 
            }
        </style>
        <div class="pill">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2>Lead Command Center</h2>
                <button onclick="this.getRootNode().host.fetchOrders()" style="cursor:pointer; background:none; border:1px solid #ddd; padding:5px 10px; border-radius:6px; font-size:0.7rem;">Refresh</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Message</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${leads.length === 0 ? '<tr><td colspan="3" style="text-align:center; color:#ccc; padding:40px;">No leads found yet.</td></tr>' : ''}
                    ${leads.map(l => `
                        <tr>
                            <td><strong>${l.Name || 'Guest'}</strong></td>
                            <td>${l.Message || l.message || ''}</td>
                            <td><span class="status">${l.Status || 'NEW'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        `;
    }
}

if (!customElements.get('dashboard-block')) {
    customElements.define('dashboard-block', DashboardBlock);
}