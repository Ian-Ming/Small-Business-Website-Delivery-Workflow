class AuthControlBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.user = null;
    }

    async connectedCallback() {
        const res = await fetch("/.auth/me");
        const data = await res.json();
        this.user = data.clientPrincipal;
        this.render();
    }

    render() {
        if (!this.user) {
            this.shadowRoot.innerHTML = `
                <a href="/.auth/login/google" style="color:white; text-decoration:none; font-weight:600;">Client Login</a>
            `;
        } else {
            this.shadowRoot.innerHTML = `
                <div style="color:white; font-size: 0.9rem;">
                    Welcome, <strong>${this.user.userDetails}</strong> | 
                    <a href="/.auth/logout" style="color:#ff4d4d; margin-left:10px;">Logout</a>
                </div>
            `;
        }
    }
}
customElements.define('auth-control-block', AuthControlBlock);