class SettingsBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.clientId = this.getAttribute('client-id');
        this.apiUrl = "https://engine01-hub.azurewebsites.net/api/settings";
    }

    async connectedCallback() {
        this.render();
        await this.loadCurrentSettings();
    }

    // 1. FETCH existing settings from the Hub
    async loadCurrentSettings() {
        if (!this.clientId) return;
        try {
            const res = await fetch(`${this.apiUrl}`, {
                headers: { 'x-engine01-client-id': this.clientId }
            });
            if (res.ok) {
                const data = await res.json();
                this.shadowRoot.getElementById('biz-name').value = data.businessName || '';
                this.shadowRoot.getElementById('biz-times').value = data.availableTimes || '';
            }
        } catch (err) {
            console.error("Infrastructure Sync Error: Could not load settings.");
        }
    }

    // 2. SAVE updated settings to the Hub
    async handleSave(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const originalText = btn.innerText;
        btn.innerText = "Syncing Infrastructure...";
        btn.disabled = true;

        const payload = {
            businessName: this.shadowRoot.getElementById('biz-name').value,
            availableTimes: this.shadowRoot.getElementById('biz-times').value
        };

        try {
            const res = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-engine01-client-id': this.clientId 
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                btn.innerText = "✓ System Updated";
                btn.style.background = "#059669"; // Success Green
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.background = "#000";
                    btn.disabled = false;
                }, 2000);
            }
        } catch (err) {
            alert("Connection Error: Hub unreachable.");
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; }
            .settings-container { background: white; padding: 24px; border-radius: 12px; border: 1px solid #eee; }
            .form-group { margin-bottom: 20px; }
            label { display: block; font-size: 0.85rem; font-weight: 600; color: #344054; margin-bottom: 8px; }
            input { width: 100%; padding: 12px; border: 1px solid #d0d5dd; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
            .help-text { font-size: 0.75rem; color: #667085; margin-top: 6px; }
            button { 
                background: #000; color: white; border: none; padding: 12px 24px; 
                border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.3s;
            }
            button:disabled { opacity: 0.5; cursor: not-allowed; }
        </style>
        <div class="settings-container">
            <form id="settings-form">
                <div class="form-group">
                    <label>Business Display Name</label>
                    <input type="text" id="biz-name" placeholder="e.g. The Engine Barber Shop">
                    <div class="help-text">This name appears on client emails and the booking page.</div>
                </div>

                <div class="form-group">
                    <label>Daily Availability (comma separated)</label>
                    <input type="text" id="biz-times" placeholder="9:00 AM, 10:00 AM, 11:00 AM, 1:00 PM">
                    <div class="help-text">Updating this refreshes your live scheduling calendar instantly.</div>
                </div>

                <button type="submit">Save Site Settings</button>
            </form>
        </div>
        `;

        this.shadowRoot.getElementById('settings-form').onsubmit = (e) => this.handleSave(e);
    }
}
customElements.define('settings-block', SettingsBlock);