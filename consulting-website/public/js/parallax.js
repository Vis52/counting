class ParallaxEffect {
    constructor() {
        this.layers = document.querySelectorAll('.parallax-layer');
        this.floatElements = document.querySelectorAll('.float-element');
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => this.handleScroll());
        window.addEventListener('resize', () => this.handleResize());
        this.initializeFloatingElements();
    }

    handleScroll() {
        const scrolled = window.pageYOffset;
        
        requestAnimationFrame(() => {
            this.layers.forEach(layer => {
                const speed = layer.getAttribute('data-speed') || 0.5;
                const yPos = -(scrolled * speed);
                layer.style.transform = `translate3d(0, ${yPos}px, 0)`;
            });
        });
    }

    handleResize() {
        // Update parallax calculations on resize
        this.handleScroll();
    }

    initializeFloatingElements() {
        this.floatElements.forEach((el, index) => {
            el.style.animationDelay = `${index * 0.5}s`;
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ParallaxEffect();
});
