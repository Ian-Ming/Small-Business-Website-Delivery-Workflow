class ReviewBlock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.style.display = 'block'; // Your signature
        this.render();
    }

    render() {
        // This will eventually fetch from /api/reviews
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; }
            .review-grid { display: flex; overflow-x: auto; gap: 15px; padding: 10px 0; }
            .review-card { min-width: 250px; background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid var(--primary-color, #0078d4); }
            .stars { color: #f39c12; margin-bottom: 5px; }
        </style>
        <div class="review-grid">
            <div class="review-card">
                <div class="stars">★★★★★</div>
                <p>"Best haircut I've ever had. Engine01 made booking so easy!"</p>
                <strong>- Alex R.</strong>
            </div>
            <div class="review-card">
                <div class="stars">★★★★★</div>
                <p>"The landing page they built for my shop is incredible."</p>
                <strong>- Sarah J.</strong>
            </div>
        </div>
        `;
    }
}
customElements.define('review-block', ReviewBlock);