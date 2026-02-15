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
    // 1. Point to the NEW unified intake URL
    const INTAKE_API = "https://engine01-hub.azurewebsites.net/api/intake";
    
    const fd = new FormData(e.target);
    const data = {
        name: fd.get('name'),
        email: fd.get('email'),
        message: fd.get('message')
    };

    try {
        const res = await fetch(INTAKE_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 2. Add the mandatory ID badge
                'x-engine01-client-id': this.getAttribute('client-id') || "BarberShop01"
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert("Message Sent!");
            e.target.reset();
        } else {
            console.error("Hub rejected inquiry:", res.status);
        }
    } catch (err) {
        console.error("Submission failed:", err);
    }
}
}
customElements.define('inquiry-block', InquiryBlock);