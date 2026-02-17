class MasterAdminBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        // STOPS HARDCODING: If no ID is provided, it stays null
        this.clientId = this.getAttribute('client-id');
        // RENAMED: 'admin' represents the primary cockpit view
        this.currentTab = 'admin'; 
    }

    connectedCallback() {
        if (!this.clientId) {
            this.renderError("Missing Configuration: No Client ID detected.");
            return;
        }
        this.render();
    }

    renderError(msg) {
        this.shadowRoot.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: sans-serif; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 12px;">
                <strong>Infrastructure Error:</strong> ${msg}
            </div>`;
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: 'Inter', -apple-system, sans-serif; background: #fff; border-radius: 12px; border: 1px solid #eaecf0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); overflow: hidden; }
            .sidebar-layout { display: flex; min-height: 600px; }
            
            /* Admin Sidebar Navigation */
            .sidebar { width: 240px; background: #101828; color: #fff; padding: 20px 0; display: flex; flex-direction: column; }
            .brand { padding: 0 20px 20px; font-weight: 800; font-size: 1.2rem; border-bottom: 1px solid #1f2937; margin-bottom: 20px; }
            .nav-item { padding: 12px 20px; cursor: pointer; font-size: 0.9rem; transition: 0.2s; color: #9ca3af; display: flex; align-items: center; gap: 10px; }
            .nav-item:hover { background: #1f2937; color: #fff; }
            .nav-item.active { background: #344054; color: #fff; border-left: 4px solid #7f56d9; }
            
            .main-content { flex-grow: 1; background: #f9fafb; padding: 32px; }
            .header { margin-bottom: 24px; }
            h1 { margin: 0; font-size: 1.5rem; color: #101828; }
            .client-badge { font-size: 0.7rem; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; }
        </style>
        
        <div class="sidebar-layout">
            <div class="sidebar">
                <div class="brand">Engine01 <span style="font-size:0.6rem; color:#666;">v3.0</span></div>
                <div class="nav-item ${this.currentTab === 'admin' ? 'active' : ''}" data-tab="admin">📊 Dashboard</div>
                <div class="nav-item ${this.currentTab === 'inventory' ? 'active' : ''}" data-tab="inventory">📦 Inventory</div>
                <div class="nav-item ${this.currentTab === 'settings' ? 'active' : ''}" data-tab="settings">⚙️ Settings</div>
            </div>

            <div class="main-content">
                <div class="header">
                    <span class="client-badge">${this.clientId}</span>
                    <h1>${this.currentTab.charAt(0).toUpperCase() + this.currentTab.slice(1)} Center</h1>
                </div>

                <div id="view-container">
                    ${this.renderView()}
                </div>
            </div>
        </div>
        `;

        this.shadowRoot.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = () => {
                this.currentTab = item.dataset.tab;
                this.render();
            };
        });
    }

    renderView() {
    switch(this.currentTab) {
        case 'admin':
            return `<h1>Lead Center</h1><dashboard-block client-id="${this.clientId}"></dashboard-block>`;
        case 'inventory':
            return `<h1>Inventory</h1><product-manager-block client-id="${this.clientId}"></product-manager-block>`;
        case 'settings':
            // JUST CALL THE MODULAR BLOCK HERE
            return `<h1>Site Settings</h1><settings-block client-id="${this.clientId}"></settings-block>`;
        default:
            return `<h1>Select a view</h1>`;
        }
    }
}
customElements.define('master-admin-block', MasterAdminBlock);