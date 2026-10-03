// #region 1: 3D TILT VE LERP MOTORU
const TiltEngine = {
    cardContainer: null,
    mouseX: 0,
    mouseY: 0,
    currentTiltX: 0,
    currentTiltY: 0,
    maxTilt: 1,
    lerpSpeed: 0.08,

    init() {
        this.cardContainer = document.getElementById('cardContainer');
        if (!this.cardContainer) return;

        window.addEventListener('mousemove', (e) => {
            const { innerWidth, innerHeight } = window;
            this.mouseX = (e.clientX / innerWidth) * 2 - 1;
            this.mouseY = (e.clientY / innerHeight) * 2 - 1;
        });

        window.addEventListener('mouseleave', () => {
            this.mouseX = 0;
            this.mouseY = 0;
        });

        this.loop();
    },

    loop() {
        const targetTiltX = -this.mouseY * this.maxTilt;
        const targetTiltY = this.mouseX * this.maxTilt;

        this.currentTiltX += (targetTiltX - this.currentTiltX) * this.lerpSpeed;
        this.currentTiltY += (targetTiltY - this.currentTiltY) * this.lerpSpeed;

        if (this.cardContainer) {
            if (typeof Router !== 'undefined' && (Router._companionTransitioning || Router.isFlipping)) {
                requestAnimationFrame(() => this.loop());
                return;
            }
            const multiplier = (typeof Router !== 'undefined' && Router.isFlipped) ? 0.35 : 1;
            this.cardContainer.style.transform = `rotateX(${this.currentTiltX * multiplier}deg) rotateY(${this.currentTiltY * multiplier}deg)`;
        }

        requestAnimationFrame(() => this.loop());
    }
};
// #endregion
