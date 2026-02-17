class SettingsBlock extends HTMLElement {
    static get observedAttributes() { return ['client-id']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.apiUrl = "https://engine01-hub.azurewebsites.net/api/settings";
        this.days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    }

    get clientId() { return this.getAttribute('client-id'); }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'client-id' && newVal) this.loadCurrentSettings();
    }

    async loadCurrentSettings() {
        if (!this.clientId) return;
        try {
            const res = await fetch(this.apiUrl, {
                headers: { 'x-engine01-client-id': this.clientId }
            });
            if (res.ok) {
                const data = await res.json();
                this.shadowRoot.getElementById('biz-name').value = data.businessName || '';
                this.days.forEach(day => {
                    // Pulling the recurring weekly slots
                    this.shadowRoot.getElementById(`${day}-times`).value = data[`${day}Times`] || '';
                });
            }
        } catch (err) { console.error("Load Error:", err); }
    }

    async handleSave(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.innerText = "Propagating to Live Site...";
        btn.disabled = true;

        const payload = {
            businessName: this.shadowRoot.getElementById('biz-name').value,
            // Flagging this as recurring logic
            scheduleType: 'recurring_weekly' 
        };
        
        this.days.forEach(day => {
            payload[`${day}Times`] = this.shadowRoot.getElementById(`${day}-times`).value;
        });

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
                btn.innerText = "✓ Weekly Schedule Synced";
                btn.style.background = "#059669";
                setTimeout(() => {
                    btn.innerText = "Save Site Settings";
                    btn.style.background = "#000";
                    btn.disabled = false;
                }, 2000);
            }
        } catch (err) {
            btn.innerText = "Sync Failed";
            btn.disabled = false;
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            .container { background: #fff; padding: 20px; border-radius: 12px; }
            .grid { display: grid; grid-template-columns: 120px 1fr; gap: 10px; align-items: center; margin-bottom: 20px; }
            label { font-weight: bold; font-size: 0.8rem; text-transform: capitalize; color: #444; }
            input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; }
            .header { font-size: 1.1rem; font-weight: bold; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
            button { width: 100%; padding: 15px; background: #000; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
            .info { font-size: 0.75rem; color: #666; margin-bottom: 20px; padding: 10px; background: #f9f9f9; border-radius: 6px; }
        </style>
        <div class="container">
            <div class="header">⚙️ Recurring Weekly Availability</div>
            <div class="info">Define your standard hours here. These will repeat every week.</div>
            
            <form id="settings-form">
                <div class="grid" style="grid-template-columns: 1fr;">
                    <label>Business Name</label>
                    <input type="text" id="biz-name" placeholder="Business Name">
                </div>
                
                <div class="grid">
                    ${this.days.map(day => `
                        <label>${day}</label>
                        <input type="text" id="${day}-times" placeholder="9am, 10am, 11am">
                    `).join('')}
                </div>
                <button type="submit">Save Site Settings</button>
            </form>
        </div>`;
        this.shadowRoot.getElementById('settings-form').onsubmit = (e) => this.handleSave(e);
    }
}
customElements.define('settings-block', SettingsBlock);