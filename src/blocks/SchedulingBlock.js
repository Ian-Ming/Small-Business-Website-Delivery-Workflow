class SchedulingBlock extends HTMLElement {
    static get observedAttributes() { return ['client-id', 'available-times']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.selectedTime = null;
        // The URL matches your Azure Table name for zero-confusion routing
        this.apiUrl = "https://engine01-hub.azurewebsites.net/api/appointments";
    }

    // Direct access to attributes so the block stays synced with the HTML
    get clientId() { return this.getAttribute('client-id') || "BarberShop01"; }
    get timeSlots() {
        const defaultTimes = "09:00 AM,10:00 AM,11:00 AM,01:00 PM,02:00 PM,03:00 PM";
        return (this.getAttribute('available-times') || defaultTimes).split(',').map(t => t.trim());
    }

    connectedCallback() {
        this.render();
    }

    // If the client updates their hours in the admin, the block can re-render
    attributeChangedCallback() { this.render(); }

    async fetchOccupiedSlots(date) {
        try {
            const res = await fetch(`${this.apiUrl}?date=${date}`, {
                headers: { 'x-engine01-client-id': this.clientId }
            });
            // If 404, the day is wide open. If 200, we get the list.
            if (!res.ok) return [];
            return await res.json();
        } catch (err) {
            console.error("Infrastructure Error: Calendar sync failed.", err);
            return [];
        }
    }

    async handleBooking() {
        const name = this.shadowRoot.getElementById('cust-name').value;
        const date = this.shadowRoot.getElementById('book-date').value;
        const service = this.shadowRoot.getElementById('cust-service').value;
        const btn = this.shadowRoot.getElementById('submit-booking');

        if (!name || !date || !this.selectedTime) {
            alert("Please fill out all fields and select a time.");
            return;
        }

        btn.disabled = true;
        btn.innerText = "Saving to Hub...";

        try {
            // 1. Save to the Appointments Table
            const res = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-engine01-client-id': this.clientId 
                },
                body: JSON.stringify({ name, date, time: this.selectedTime, service })
            });

            if (res.ok) {
                // 2. SELF-REPORTING: Automatically push a notification to the Client's Dashboard
                await fetch("https://engine01-hub.azurewebsites.net/api/intake", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-engine01-client-id': this.clientId },
                    body: JSON.stringify({ 
                        name: name, 
                        message: `NEW APPOINTMENT: ${service} at ${this.selectedTime} on ${date}` 
                    })
                });

                this.renderSuccess(name, date);
            } else {
                throw new Error("Conflict");
            }
        } catch (err) {
            alert("This slot was just taken! Refreshing available times...");
            this.render(); // Reset the UI
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; }
            .card { background: #fff; padding: 24px; border: 1px solid #eee; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; }
            .slot { padding: 12px; border: 1px solid #ddd; text-align: center; cursor: pointer; border-radius: 8px; font-size: 0.8rem; transition: 0.2s; font-weight: 500; }
            .slot:hover { border-color: #000; background: #fafafa; }
            .slot.selected { background: #000; color: #fff; border-color: #000; }
            .slot.occupied { background: #f5f5f5; color: #ccc; cursor: not-allowed; border: none; text-decoration: line-through; }
            label { display: block; font-size: 0.75rem; color: #888; text-transform: uppercase; margin-top: 15px; font-weight: bold; }
            input, select { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 1rem; }
            button { width: 100%; padding: 16px; background: #000; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 20px; transition: 0.2s; }
            button:active { transform: scale(0.98); }
        </style>
        <div class="card">
            <h3 style="margin:0 0 10px 0;">Schedule Service</h3>
            <label>Your Name</label>
            <input type="text" id="cust-name" placeholder="Full Name">
            
            <label>Service</label>
            <select id="cust-service">
                <option>Standard Haircut - $30</option>
                <option>Beard Trim - $20</option>
                <option>Full Service - $45</option>
            </select>
            
            <label>Select Date</label>
            <input type="date" id="book-date" min="${new Date().toISOString().split('T')[0]}">
            
            <label>Available Times</label>
            <div class="grid" id="time-grid">
                <p style="grid-column: span 3; text-align:center; color:#999; font-size:0.8rem; padding: 20px 0;">Pick a date to see times...</p>
            </div>
            
            <button id="submit-booking">Confirm Appointment</button>
        </div>`;

        this.setupListeners();
    }

    setupListeners() {
        const dateInput = this.shadowRoot.getElementById('book-date');
        dateInput.addEventListener('change', async (e) => {
            const occupied = await this.fetchOccupiedSlots(e.target.value);
            this.updateGrid(occupied);
        });
        this.shadowRoot.getElementById('submit-booking').onclick = () => this.handleBooking();
    }

    updateGrid(occupied) {
        const grid = this.shadowRoot.getElementById('time-grid');
        grid.innerHTML = '';
        this.timeSlots.forEach(time => {
            const div = document.createElement('div');
            const isTaken = occupied.includes(time);
            div.className = isTaken ? 'slot occupied' : 'slot';
            div.innerText = time;
            if (!isTaken) {
                div.onclick = () => {
                    this.shadowRoot.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
                    div.classList.add('selected');
                    this.selectedTime = time;
                };
            }
            grid.appendChild(div);
        });
    }

    renderSuccess(name, date) {
        this.shadowRoot.innerHTML = `
            <div style="text-align:center; padding: 40px; font-family: sans-serif;">
                <div style="font-size: 3rem; margin-bottom: 10px;">📅</div>
                <h2 style="margin:0;">Confirmed!</h2>
                <p style="color:#666;">Thanks ${name}, you are all set for ${date}.</p>
                <button onclick="location.reload()" style="background:#f4f4f4; color:#000; border:1px solid #ddd;">Book Another</button>
            </div>`;
    }
}
customElements.define('scheduling-block', SchedulingBlock);