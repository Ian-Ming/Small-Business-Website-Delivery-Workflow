class SchedulingBlock extends HTMLElement {
    static get observedAttributes() { return ['client-id']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.selectedTime = null;
        this.apiUrl = "https://engine01-hub.azurewebsites.net/api/appointments";
        this.settingsUrl = "https://engine01-hub.azurewebsites.net/api/settings";
    }

    get clientId() { return this.getAttribute('client-id'); }

    static get observedAttributes() { return ['client-id']; }

attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'client-id' && newVal) {
        this.clientId = newVal;
        // This is the trigger that actually starts the data fetch
        if(this.loadProducts) this.loadProducts(); 
        if(this.loadCurrentSettings) this.loadCurrentSettings();
    }
}

    connectedCallback() {
        this.render();
    }

    // Refresh if the ID is changed dynamically
    attributeChangedCallback() { this.render(); }

    async fetchDayLogic(dateString) {
        try {
            // 1. Determine the Day of the Week from the selected date
            // We use 'UTC' to ensure the date doesn't flip if the user is in a different timezone
            const dateObj = new Date(dateString + 'T00:00:00');
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

            // 2. Fetch both Recurring Schedule and existing Bookings in parallel (Faster)
            const [settingsRes, occupiedRes] = await Promise.all([
                fetch(`${this.settingsUrl}`, { headers: { 'x-engine01-client-id': this.clientId } }),
                fetch(`${this.apiUrl}?date=${dateString}`, { headers: { 'x-engine01-client-id': this.clientId } })
            ]);

            const settings = settingsRes.ok ? await settingsRes.json() : {};
            const occupied = occupiedRes.ok ? await occupiedRes.json() : [];

            // 3. Extract the recurring times for THIS specific day (e.g., "mondayTimes")
            const rawTimes = settings[`${dayName}Times`] || "";
            const recurringSlots = rawTimes ? rawTimes.split(',').map(t => t.trim()) : [];

            return { recurringSlots, occupied };
        } catch (err) {
            console.error("Infrastructure Sync Error:", err);
            return { recurringSlots: [], occupied: [] };
        }
    }

    async handleBooking() {
        const name = this.shadowRoot.getElementById('cust-name').value;
        const date = this.shadowRoot.getElementById('book-date').value;
        const service = this.shadowRoot.getElementById('cust-service').value;
        const btn = this.shadowRoot.getElementById('submit-booking');

        if (!name || !date || !this.selectedTime) {
            alert("Please complete all fields and select a time slot.");
            return;
        }

        btn.disabled = true;
        btn.innerText = "Securing Slot...";

        try {
            const res = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-engine01-client-id': this.clientId 
                },
                body: JSON.stringify({ name, date, time: this.selectedTime, service })
            });

            if (res.ok) {
                // LOG TO INTAKE: So it shows up in their Admin Dashboard Lead Center
                await fetch("https://engine01-hub.azurewebsites.net/api/intake", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-engine01-client-id': this.clientId },
                    body: JSON.stringify({ 
                        name: name, 
                        message: `BOOKING: ${service} at ${this.selectedTime} on ${date}` 
                    })
                });

                this.renderSuccess(name, date);
            } else {
                throw new Error("Conflict");
            }
        } catch (err) {
            alert("This slot was just taken. Please pick another time.");
            const { recurringSlots, occupied } = await this.fetchDayLogic(date);
            this.updateGrid(recurringSlots, occupied);
            btn.disabled = false;
            btn.innerText = "Confirm Appointment";
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: 'Inter', system-ui, sans-serif; }
            .card { background: #fff; padding: 24px; border: 1px solid #eee; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; }
            .slot { padding: 12px; border: 1px solid #ddd; text-align: center; cursor: pointer; border-radius: 8px; font-size: 0.8rem; transition: 0.2s; font-weight: 500; }
            .slot:hover:not(.occupied) { border-color: #000; background: #fafafa; }
            .slot.selected { background: #000; color: #fff; border-color: #000; }
            .slot.occupied { background: #f5f5f5; color: #ccc; cursor: not-allowed; border: none; text-decoration: line-through; }
            label { display: block; font-size: 0.75rem; color: #888; text-transform: uppercase; margin-top: 15px; font-weight: bold; }
            input, select { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 1rem; }
            button { width: 100%; padding: 16px; background: #000; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 20px; }
            .status-msg { grid-column: span 3; text-align:center; color:#999; font-size:0.8rem; padding: 20px 0; }
        </style>
        <div class="card">
            <h3 style="margin:0 0 10px 0;">Schedule Service</h3>
            <label>Full Name</label>
            <input type="text" id="cust-name" placeholder="John Doe">
            <label>Service</label>
            <select id="cust-service">
                <option>Standard Haircut</option>
                <option>Luxury Shave</option>
                <option>Full Styling</option>
            </select>
            <label>Date</label>
            <input type="date" id="book-date" min="${new Date().toISOString().split('T')[0]}">
            <label>Available Times</label>
            <div class="grid" id="time-grid">
                <p class="status-msg">Select a date to see availability...</p>
            </div>
            <button id="submit-booking">Confirm Appointment</button>
        </div>`;
        this.setupListeners();
    }

    setupListeners() {
        const dateInput = this.shadowRoot.getElementById('book-date');
        dateInput.addEventListener('change', async (e) => {
            const grid = this.shadowRoot.getElementById('time-grid');
            grid.innerHTML = '<p class="status-msg">Checking calendar...</p>';
            
            const { recurringSlots, occupied } = await this.fetchDayLogic(e.target.value);
            this.updateGrid(recurringSlots, occupied);
        });
        this.shadowRoot.getElementById('submit-booking').onclick = () => this.handleBooking();
    }

    updateGrid(recurringSlots, occupied) {
        const grid = this.shadowRoot.getElementById('time-grid');
        grid.innerHTML = '';

        if (recurringSlots.length === 0) {
            grid.innerHTML = '<p class="status-msg">No available times for this day.</p>';
            return;
        }

        recurringSlots.forEach(time => {
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
                <h2 style="margin:0;">Booking Confirmed!</h2>
                <p style="color:#666;">See you on ${date}.</p>
                <button onclick="location.reload()" style="background:#f4f4f4; color:#000; border:1px solid #ddd;">Done</button>
            </div>`;
    }
}
customElements.define('scheduling-block', SchedulingBlock);