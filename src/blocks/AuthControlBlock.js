class AuthControlBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.user = null;
    }

    async connectedCallback() {
        try {
            const res = await fetch("/.auth/me");
            const data = await res.json();
            // Azure returns an array of client principals
            if (data.clientPrincipal) {
                this.user = data.clientPrincipal;
            }
            this.render();
        } catch (err) {
            console.log("Auth: No active session found.");
            this.render();
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: inline-block; font-family: system-ui, sans-serif; }
            .auth-wrapper { display: flex; align-items: center; gap: 12px; font-size: 0.85rem; }
            .user-info { color: #555; font-weight: 500; }
            .auth-link { 
                text-decoration: none; 
                padding: 6px 12px; 
                border-radius: 6px; 
                font-weight: 600; 
                transition: 0.2s;
            }
            .login { color: #0078d4; border: 1px solid #0078d4; }
            .login:hover { background: #0078d4; color: white; }
            .logout { color: #dc2626; }
            .logout:hover { text-decoration: underline; }
        </style>
        <div class="auth-wrapper">
            ${this.user ? `
                <span class="user-info">Logged in as: <strong>${this.user.userDetails}</strong></span>
                <a href="/.auth/logout" class="auth-link logout">Sign Out</a>
            ` : `
                <a href="/.auth/login/google?post_login_redirect_uri=/dashboard.html" class="auth-link login">Client Login</a>
            `}
        </div>
        `;
    }
}

if (!customElements.get('auth-control-block')) {
    customElements.define('auth-control-block', AuthControlBlock);
}