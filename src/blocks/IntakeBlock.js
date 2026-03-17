class IntakeBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        // Point to your centralized Hub
        this.apiUrl = "https://engine01-hub.azurewebsites.net/api/intake";
    }

    connectedCallback() {
        this.style.display = 'block'; 
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: 'Inter', system-ui, sans-serif; max-width: 100%; }
            .intake-container { background: #fff; padding: 20px; border-radius: 12px; }
            label { display:block; margin: 16px 0 6px; font-weight: 600; font-size: 0.9rem; color: #344054; }
            input, textarea, select { 
                width: 100%; padding: 12px; font-size: 1rem; border: 1px solid #d0d5dd; 
                border-radius: 8px; box-sizing: border-box; transition: 0.2s;
            }
            input:focus, textarea:focus { border-color: #000; outline: none; box-shadow: 0 0 0 4px rgba(0,0,0,0.05); }
            button { 
                margin-top: 24px; width: 100%; padding: 14px; font-size: 1rem; font-weight: bold;
                cursor: pointer; background: #000; color: white; border: none; border-radius: 8px; transition: 0.3s;
            }
            button:disabled { background: #98a2b3; cursor: not-allowed; }
            .card { border: 1px solid #eaecf0; border-radius: 10px; padding: 16px; margin-top: 20px; font-size: 0.9rem; line-height: 1.5; }
            .ok { border-left: 4px solid #059669; background: #ecfdf5; color: #065f46; }
            .err { border-left: 4px solid #d1fadf; background: #fef3f2; color: #b42318; }
            .muted { color: #667085; font-size: 0.9rem; margin-bottom: 20px; }
        </style>

        <div class="intake-container">
            <h2 style="margin:0 0 8px 0;">Project Intake</h2>
            <p class="muted">Submit your project details. The Hub will process your request and sync with the command center.</p>

            <form id="intakeForm">
                <label>Full Name</label>
                <input id="name" name="name" placeholder="John Doe" required />

                <label>Email Address</label>
                <input id="email" name="email" type="email" placeholder="john@example.com" required />

                <label>Business Name</label>
                <input id="businessName" name="businessName" placeholder="Acme Corp" required />

                <label>Project Category</label>
                <select id="projectType" name="projectType" required>
                    <option value="">Select one…</option>
                    <option>Landing Page</option>
                    <option>Custom Web App</option>
                    <option>E-commerce / Store</option>
                    <option>Infrastructure Setup</option>
                </select>

                <label>Project Goals & Details</label>
                <textarea id="goals" name="goals" rows="4" placeholder="What are we building?" required></textarea>

                <button type="submit" id="submitBtn">Submit to Engine01</button>
            </form>
            <div id="result" class="card" style="display:none;"></div>
        </div>
        `;
    }

    setupEventListeners() {
        const form = this.shadowRoot.getElementById("intakeForm");
        const result = this.shadowRoot.getElementById("result");
        const submitBtn = this.shadowRoot.getElementById("submitBtn");

        const showStatus = (kind, message) => {
            result.className = "card " + (kind === "ok" ? "ok" : "err");
            result.style.display = "block";
            result.innerHTML = message;
        };

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = "Syncing with Hub...";

            // Constructing the message to fit your Python Hub's expected 'Message' field
            const payload = {
                name: form.name.value.trim(),
                email: form.email.value.trim(),
                message: `[BUSINESS]: ${form.businessName.value.trim()} | [TYPE]: ${form.projectType.value} | [GOALS]: ${form.goals.value.trim()}`
            };

            try {
                const res = await fetch(this.apiUrl, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        // CRITICAL: This bypasses the 401 error
                        "x-engine01-client-id": "personal-site" 
                    },
                    body: JSON.stringify(payload),
                });

                // Get response, but don't crash if it's not JSON
                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    showStatus("err", `<strong>Submission Failed</strong><br>The Hub rejected the request (Error ${res.status}). Please try again later.`);
                    return;
                }

                // Generate a Reference ID since we aren't sending one from Python yet
                const refId = "LEAD-" + Math.random().toString(36).substr(2, 6).toUpperCase();
                
                showStatus("ok", `<strong>Success! ✅</strong><br>Your request was received. Reference ID: ${refId}. I'll be in touch shortly.`);
                form.reset();
                
            } catch (err) {
                showStatus("err", `<strong>Connection Error</strong><br>Unable to reach the Engine01 Hub. Check your internet or CORS settings.`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit to Engine01";
            }
        });
    }
}

customElements.define('intake-block', IntakeBlock);