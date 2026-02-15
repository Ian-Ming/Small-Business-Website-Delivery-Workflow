class AuthControlBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.user = null;
    }

    async connectedCallback() {
    const res = await fetch('/.auth/me');
    const data = await res.json();
    console.log("Auth Data:", data); // Check the browser console (F12) for this!
    this.user = data.clientPrincipal;
    this.render();
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
            .admin-btn { background: #111; color: white; margin-right: 10px; }
        </style>
        <div class="auth-wrapper">
            ${this.user ? `
            <a href="/admin.html" class="auth-link admin-btn">Manage Website</a>
            <span class="user-info">Hi, <strong>${this.user.userDetails}</strong></span>
            <a href="/.auth/logout?post_logout_redirect_uri=/" class="auth-link logout">Sign Out</a>
        ` : `
                <a href="/.auth/login/aad?post_login_redirect_uri=/admin.html">Client Login</a>
        `}
        </div>
        `;
    }
}

if (!customElements.get('auth-control-block')) {
    customElements.define('auth-control-block', AuthControlBlock);
}