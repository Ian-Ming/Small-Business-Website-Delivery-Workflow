class AuthControlBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.user = null;
        this.loading = true; // Added loading state
    }

    async connectedCallback() {
        try {
            const res = await fetch('/.auth/me');
            if (!res.ok) throw new Error('Auth fetch failed');
            
            const data = await res.json();
            // Azure returns { clientPrincipal: null } if not logged in
            this.user = data.clientPrincipal || null;
            console.log("Infrastructure: Auth Check Complete", this.user);
        } catch (err) {
            console.error("Infrastructure: Auth Service Unavailable", err);
            this.user = null;
        } finally {
            this.loading = false;
            this.render();
        }
    }

    render() {
        if (this.loading) {
            this.shadowRoot.innerHTML = `<style>:host { font-family: system-ui; font-size: 0.85rem; color: #888; }</style><span>Verifying Session...</span>`;
            return;
        }

        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; font-family: system-ui, -apple-system, sans-serif; }
            .auth-wrapper { 
                display: flex; 
                align-items: center; 
                justify-content: space-between;
                gap: 12px; 
                font-size: 0.85rem; 
                background: #f4f4f4;
                padding: 10px 20px;
                border-radius: 8px;
                border: 1px solid #ddd;
            }
            .user-info { color: #333; font-weight: 500; }
            .auth-link { 
                text-decoration: none; 
                padding: 6px 14px; 
                border-radius: 6px; 
                font-weight: 600; 
                transition: all 0.2s ease;
            }
            .view-site { color: #555; border: 1px solid #ccc; background: white; }
            .view-site:hover { background: #eee; }
            .login { background: #0078d4; color: white; border: 1px solid #0078d4; }
            .login:hover { background: #005a9e; }
            .logout { color: #dc2626; border: 1px solid transparent; }
            .logout:hover { border-color: #fecaca; background: #fef2f2; }
            
            @media (max-width: 600px) {
                .auth-wrapper { flex-direction: column; text-align: center; }
            }
        </style>
        <div class="auth-wrapper">
            ${this.user ? `
                <div style="display:flex; gap:15px; align-items:center;">
                    <a href="/" class="auth-link view-site">← View Live Site</a>
                    <span class="user-info">Logged in: <strong>${this.user.userDetails}</strong></span>
                </div>
                <a href="/.auth/logout?post_logout_redirect_uri=/" class="auth-link logout">Sign Out</a>
            ` : `
                <span>Admin Access Required</span>
                <a href="/.auth/login/aad?post_login_redirect_uri=/admin.html" class="auth-link login">Client Login</a>
            `}
        </div>
        `;
    }
}

// Prevents error if the script is loaded multiple times
if (!customElements.get('auth-control-block')) {
    customElements.define('auth-control-block', AuthControlBlock);
}