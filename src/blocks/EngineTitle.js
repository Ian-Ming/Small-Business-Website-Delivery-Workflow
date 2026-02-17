class EngineTitle extends HTMLElement {
    async connectedCallback() {
        const id = this.getAttribute('client-id');
        const res = await fetch(`https://engine01-hub.azurewebsites.net/api/settings`, {
            headers: { 'x-engine01-client-id': id }
        });
        const data = await res.json();
        this.innerHTML = `<h1>${data.businessName || 'Welcome'}</h1>`;
    }
}
customElements.define('engine-title', EngineTitle);