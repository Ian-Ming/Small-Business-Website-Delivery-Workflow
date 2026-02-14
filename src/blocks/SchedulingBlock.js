class SchedulingBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.selectedTime = null;
    }

    connectedCallback() {
        this.style.display = 'block'; 
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; }
            .booking-container { background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; font-family: sans-serif; }
            .time-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; min-height: 50px; }
            .time-slot { padding: 10px; border: 1px solid #ccc; text-align: center; cursor: pointer; border-radius: 4px; transition: 0.2s; }
            .time-slot:hover { border-color: #0078d4; background: #f0f7ff; }
            .time-slot.selected { background: #0078d4; color: white; border-color: #0078d4; }
            select, input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #0078d4; color: white; border: none; cursor: pointer; font-weight: bold; border-radius: 4px; }
            .instruction { font-size: 0.9rem; color: #666; margin-bottom: 5px; }
        </style>
        <div class="booking-container">
            <h3>Book an Appointment</h3>
            <input type="text" id="cust-name" placeholder="Your Name">
            
            <label class="instruction">Select Service:</label>
            <select id="cust-service">
                <option value="Standard Haircut">Standard Haircut - $30</option>
                <option value="Beard Trim">Beard Trim - $20</option>
                <option value="The Works">The Works (Hair + Beard) - $45</option>
            </select>

            <label class="instruction">Choose Date:</label>
            <input type="date" id="book-date">
            
            <div class="time-grid" id="time-grid">
                <p style="grid-column: span 3; color: #999; font-size: 0.8rem;">Select a date to see available times...</p>
            </div>
            <button id="submit-booking">Confirm Booking</button>
        </div>
        `;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const datainput = this.shadowRoot.getElementById('book-date');

        datainput.addEventListener('change', async (e) => {
            const selectedDate = e.target.value;
            try {
                const response = await fetch(`https://engine01-hub.azurewebsites.net/api/bookings?date=${selectedDate}`);
                const occupiedSlots = await response.json(); 
                
                // FIXED NAME: Matches the function below
                this.renderAvailableSlots(occupiedSlots);
            } catch (err) {
                console.error("Fetch error:", err);
            }
        });

        this.shadowRoot.getElementById('submit-booking').addEventListener('click', () => this.handleBooking());
    }

    // THIS IS NOW INSIDE THE CLASS
    renderAvailableSlots(occupied) {
        const allPossibleTimes = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"];
        const grid = this.shadowRoot.getElementById('time-grid');
        
        grid.innerHTML = ''; // Clear the "Select a date" message

        allPossibleTimes.forEach(time => {
            if (!occupied.includes(time)) {
                const slot = document.createElement('div');
                slot.className = 'time-slot';
                slot.innerText = time;
                
                slot.addEventListener('click', () => {
                    this.shadowRoot.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                    slot.classList.add('selected');
                    this.selectedTime = time;
                });
                
                grid.appendChild(slot);
            }
        });

        if (grid.innerHTML === '') {
            grid.innerHTML = '<p style="grid-column: span 3; color: red;">Fully Booked!</p>';
        }
    }

    async handleBooking() {
        const name = this.shadowRoot.getElementById('cust-name').value;
        const date = this.shadowRoot.getElementById('book-date').value;
        const service = this.shadowRoot.getElementById('cust-service').value;

        if (!name || !date || !this.selectedTime) {
            alert("Please complete all fields and select a time.");
            return;
        }

        const bookingData = { name, date, time: this.selectedTime, service };

        try {
            const res = await fetch('https://engine01-hub.azurewebsites.net/api/bookings', {
                method: 'POST',
                body: JSON.stringify(bookingData),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                this.shadowRoot.innerHTML = `
                    <div style="text-align:center; padding: 20px;">
                        <h3 style="color: green;">✓ Booking Confirmed!</h3>
                        <p>See you on <strong>${date}</strong> at <strong>${this.selectedTime}</strong>.</p>
                        <button onclick="location.reload()">Book Another</button>
                    </div>`;
            } else if (res.status === 409) {
                alert("That slot was just taken! Please pick another.");
            }
        } catch (err) {
            console.error(err);
        }
    }
} // <--- THE CLASS ENDS HERE NOW

customElements.define('scheduling-block', SchedulingBlock);