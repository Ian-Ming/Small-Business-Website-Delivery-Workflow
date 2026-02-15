class AuthControlBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.user = null;
        this.loading = true;
    }

    async connectedCallback() {
        try {
            const res = await fetch('/.auth/me');
            const data = await res.json();
            this.user = data.clientPrincipal || null;
        } catch (err) {
            console.error("Auth Error:", err);
        } finally {
            this.loading = false;
            this.render();
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; margin-bottom: 24px; }
            .nav-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #ffffff;
                padding: 12px 20px;
                border-radius: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border: 1px solid #eee;
            }
            .nav-group { display: flex; align-items: center; gap: 15px; }
            
            /* The "Back to Live Site" Button */
            .back-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                text-decoration: none;
                color: #555;
                font-size: 0.85rem;
                font-weight: 600;
                padding: 8px 14px;
                background: #f8f9fa;
                border-radius: 8px;
                transition: 0.2s;
            }
            .back-btn:hover { background: #e9ecef; color: #000; }
            
            .status-tag {
                font-size: 0.7rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 4px 8px;
                background: #e1f5fe;
                color: #01579b;
                border-radius: 4px;
                font-weight: 700;
            }
            
            .user-email { font-size: 0.8rem; color: #888; font-weight: 400; }
            .logout-link {
                text-decoration: none;
                font-size: 0.8rem;
                color: #dc2626;
                font-weight: 600;
            }
            
            @media (max-width: 600px) {
                .user-email { display: none; } /* Hide email on small phones to save space */
            }
        </style>
        <div class="nav-container">
            <div class="nav-group">
                <a href="/" class="back-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Live Site
                </a>
                <span class="status-tag">Admin Console</span>
            </div>

            <div class="nav-group">
                ${this.user ? `
                    <span class="user-email">${this.user.userDetails}</span>
                    <a href="/.auth/logout?post_logout_redirect_uri=/" class="logout-link">Sign Out</a>
                ` : `
                    <a href="/.auth/login/aad?post_login_redirect_uri=/admin.html" style="color:#0078d4; text-decoration:none; font-weight:600;">Sign In</a>
                `}
            </div>
        </div>
        `;
    }
}

if (!customElements.get('auth-control-block')) {
    customElements.define('auth-control-block', AuthControlBlock);
}