class SchedulingBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.selectedTime = null;
        // Logic: Get from attribute or default
        this.clientId = this.getAttribute('client-id') || "BarberShop01"; 
        this.apiUrl = "https://engine01-hub.azurewebsites.net/api/bookings";
    }

    connectedCallback() {
        this.style.display = 'block'; 
        this.render();
    }

    get headers() {
        return {
            'Content-Type': 'application/json',
            'x-engine01-client-id': this.clientId
        };
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; }
            .booking-container { background: #fff; padding: 24px; border: 1px solid #eee; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            h3 { margin-top: 0; color: #111; }
            .time-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; min-height: 50px; }
            .time-slot { padding: 12px; border: 1px solid #e0e0e0; text-align: center; cursor: pointer; border-radius: 8px; transition: 0.2s; font-size: 0.85rem; font-weight: 500; }
            .time-slot:hover { border-color: #0078d4; background: #f0f7ff; }
            .time-slot.selected { background: #0078d4; color: white; border-color: #0078d4; }
            .time-slot.occupied { background: #f5f5f5; color: #ccc; cursor: not-allowed; border: none; }
            label { display: block; font-size: 0.8rem; font-weight: 600; color: #666; margin-bottom: 6px; margin-top: 15px; }
            input, select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 1rem; }
            button#submit-booking { width: 100%; padding: 14px; background: #000; color: white; border: none; cursor: pointer; font-weight: bold; border-radius: 8px; margin-top: 20px; transition: 0.3s; }
            button#submit-booking:hover { background: #333; }
        </style>
        <div class="booking-container">
            <h3>Schedule Visit</h3>
            <label>Name</label>
            <input type="text" id="cust-name" placeholder="Who are we cutting?">
            
            <label>Service</label>
            <select id="cust-service">
                <option value="Standard Haircut">Standard Haircut - $30</option>
                <option value="Beard Trim">Beard Trim - $20</option>
                <option value="The Works">The Works - $45</option>
            </select>

            <label>Date</label>
            <input type="date" id="book-date" min="${new_date_iso()}">
            
            <label>Available Times</label>
            <div class="time-grid" id="time-grid">
                <p style="grid-column: span 3; color: #999; font-size: 0.8rem;">Pick a date first...</p>
            </div>
            <button id="submit-booking">Confirm Appointment</button>
        </div>
        `;
        
        function new_date_iso() { return new Date().toISOString().split('T')[0]; }
        this.setupEventListeners();
    }

    setupEventListeners() {
        const dateInput = this.shadowRoot.getElementById('book-date');
        dateInput.addEventListener('change', async (e) => {
            const selectedDate = e.target.value;
            const grid = this.shadowRoot.getElementById('time-grid');
            grid.innerHTML = '<p style="grid-column: span 3; color: #999;">Checking calendar...</p>';
            
            try {
                const response = await fetch(`${this.apiUrl}?date=${selectedDate}`, {
                    headers: this.headers
                });

                // BULLETPROOF: Handle the 404 or Empty state gracefully
                let occupiedSlots = [];
                if (response.ok) {
                    occupiedSlots = await response.json();
                }
                
                this.renderAvailableSlots(occupiedSlots);
            } catch (err) {
                console.error("Fetch error:", err);
                this.renderAvailableSlots([]); // Fallback to all open
            }
        });

        this.shadowRoot.getElementById('submit-booking').addEventListener('click', () => this.handleBooking());
    }

    renderAvailableSlots(occupied) {
        const allPossibleTimes = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"];
        const grid = this.shadowRoot.getElementById('time-grid');
        grid.innerHTML = ''; 

        allPossibleTimes.forEach(time => {
            const slot = document.createElement('div');
            const isOccupied = occupied.includes(time);
            slot.className = isOccupied ? 'time-slot occupied' : 'time-slot';
            slot.innerText = time;
            
            if (!isOccupied) {
                slot.addEventListener('click', () => {
                    this.shadowRoot.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                    slot.classList.add('selected');
                    this.selectedTime = time;
                });
            } else {
                slot.title = "Already booked";
            }
            grid.appendChild(slot);
        });
    }

    async handleBooking() {
        const btn = this.shadowRoot.getElementById('submit-booking');
        const name = this.shadowRoot.getElementById('cust-name').value;
        const date = this.shadowRoot.getElementById('book-date').value;
        const service = this.shadowRoot.getElementById('cust-service').value;

        if (!name || !date || !this.selectedTime) {
            alert("Please fill in your name, date, and pick a time slot!");
            return;
        }

        btn.disabled = true;
        btn.innerText = "Processing...";

        const bookingData = { name, date, time: this.selectedTime, service };

        try {
            const res = await fetch(this.apiUrl, {
                method: 'POST',
                body: JSON.stringify(bookingData),
                headers: this.headers
            });

            if (res.ok) {
                // SUCCESS: Log it as an Intake lead too so it hits the Dashboard!
                await fetch("https://engine01-hub.azurewebsites.net/api/intake", {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify({
                        name: name,
                        message: `BOOKING: ${service} on ${date} @ ${this.selectedTime}`
                    })
                });

                this.shadowRoot.innerHTML = `
                    <div style="text-align:center; padding: 40px 20px;">
                        <h1 style="font-size: 3rem;">✂️</h1>
                        <h3 style="color: #000;">Confirmed!</h3>
                        <p style="color: #666;">See you ${name} on <strong>${date}</strong> at <strong>${this.selectedTime}</strong>.</p>
                        <button onclick="location.reload()" style="background:#eee; border:none; padding:10px; border-radius:8px; cursor:pointer;">Back</button>
                    </div>`;
            } else if (res.status === 409) {
                alert("Someone just beat you to that slot! Please pick another time.");
                btn.disabled = false;
                btn.innerText = "Confirm Appointment";
            }
        } catch (err) {
            console.error(err);
            alert("Connection error. Please try again.");
            btn.disabled = false;
        }
    }
}

if (!customElements.get('scheduling-block')) {
    customElements.define('scheduling-block', SchedulingBlock);
}