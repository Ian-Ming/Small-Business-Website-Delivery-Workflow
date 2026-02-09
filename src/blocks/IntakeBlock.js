class IntakeBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.style.display = 'block'; // Your signature
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: system-ui, sans-serif; max-width: 720px; margin: 0 auto; }
            label { display:block; margin: 14px 0 6px; font-weight: 600; }
            input, textarea, select { width: 100%; padding: 10px; font-size: 16px; box-sizing: border-box; }
            button { margin-top: 16px; padding: 12px 16px; font-size: 16px; cursor: pointer; background: #0078d4; color: white; border: none; }
            button:disabled { background: #ccc; }
            .card { border: 1px solid #ddd; border-radius: 10px; padding: 14px; margin-top: 16px; }
            .muted { color: #555; }
            .ok { border-color: #2e7d32; }
            .err { border-color: #c62828; }
        </style>

        <h1>Engine01 | Project Intake</h1>
        <p class="muted">Submit your request. You’ll get a confirmation ID and I’ll be notified by email.</p>

        <form id="intakeForm">
            <label for="name">Your name</label>
            <input id="name" name="name" required />

            <label for="email">Email</label>
            <input id="email" name="email" type="email" required />

            <label for="businessName">Business name</label>
            <input id="businessName" name="businessName" required />

            <label for="projectType">Project type</label>
            <select id="projectType" name="projectType" required>
                <option value="">Select one…</option>
                <option>Landing Page</option>
                <option>Multi-page Website</option>
                <option>E-commerce</option>
                <option>Website Fix / Redesign</option>
                <option>Other</option>
            </select>

            <label for="goals">Goals / details</label>
            <textarea id="goals" name="goals" rows="5" required></textarea>

            <button type="submit" id="submitBtn">Submit request</button>
        </form>
        <div id="result" class="card" style="display:none;"></div>
        `;
    }

    setupEventListeners() {
        const form = this.shadowRoot.getElementById("intakeForm");
        const result = this.shadowRoot.getElementById("result");
        const submitBtn = this.shadowRoot.getElementById("submitBtn");
        const API_URL = "https://thankful-island-05b80d10f.6.azurestaticapps.net/api/intake";

        const showCard = (kind, html) => {
            result.className = "card " + (kind === "ok" ? "ok" : "err");
            result.style.display = "block";
            result.innerHTML = html;
        };

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = "Submitting...";

            const payload = {
                name: form.name.value.trim(),
                email: form.email.value.trim(),
                businessName: form.businessName.value.trim(),
                projectType: form.projectType.value,
                goals: form.goals.value.trim(),
            };

            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    showCard("err", `<h3>Submission failed</h3><p>Request failed.</p>`);
                    return;
                }

                showCard("ok", `<h3>Submitted ✅</h3><p>Request ID: ${data.requestId}</p>`);
                form.reset();
            } catch (err) {
                showCard("err", `<h3>Submission failed</h3><p>${err}</p>`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit request";
            }
        });
    }
}

customElements.define('intake-block', IntakeBlock);