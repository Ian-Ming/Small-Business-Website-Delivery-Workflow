class InquiryBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.style.display = 'block'; // Your signature
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: sans-serif; }
            .inquiry-card { 
                background: #fff; 
                padding: 24px; 
                border-radius: 8px; 
                border: 1px solid #ddd;
            }
            form { display: flex; flex-direction: column; gap: 15px; }
            input, textarea { 
                padding: 12px; 
                border: 1px solid #ccc; 
                border-radius: 4px; 
                font-size: 1rem;
            }
            button { 
                background: var(--primary-color, #1a1a1a); 
                color: white; 
                padding: 14px; 
                border: none; 
                border-radius: 4px; 
                cursor: pointer; 
                font-weight: bold; 
            }
            button:hover { opacity: 0.9; }
        </style>
        <div class="inquiry-card">
            <form id="client-inquiry-form">
                <input type="text" name="customerName" placeholder="Name" required>
                <input type="email" name="customerEmail" placeholder="Email Address" required>
                <textarea name="details" rows="4" placeholder="How can we help you today?"></textarea>
                <button type="submit">Submit Message</button>
            </form>
        </div>
        `;

        this.shadowRoot.querySelector('form').addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();
        const btn = this.shadowRoot.querySelector('button');
        btn.innerText = "Sending...";
        btn.disabled = true;

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            // We will create this 'customer-inquiry' route in Azure next
            const res = await fetch('https://engine01-hub.azurewebsites.net/api/customer-inquiry', {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                this.shadowRoot.innerHTML = `<h3>Message Sent!</h3><p>The shop will get back to you soon.</p>`;
            } else {
                throw new Error("Failed to send");
            }
        } catch (err) {
            alert("Error sending message. Please try again.");
            btn.innerText = "Submit Message";
            btn.disabled = false;
        }
    }
}
customElements.define('inquiry-block', InquiryBlock);