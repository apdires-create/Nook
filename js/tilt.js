// #region 1: 3D TILT VE LERP MOTORU
const TiltEngine = {
    cardContainer: null,
    mouseX: 0,
    mouseY: 0,
    currentTiltX: 0,
    currentTiltY: 0,
    maxTilt: 2.2,
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
        const stage = document.getElementById('profileStage');
        const isCompanionOpen = stage && stage.classList.contains('has-companion-open');
        const isTransitioning = typeof Router !== 'undefined' && Router._companionTransitioning;

        // Showcase / Trophies açıkken veya geçiş esnasında tilt hedefi 0'dır
        let targetTiltX = 0;
        let targetTiltY = 0;

        if (!isCompanionOpen && !isTransitioning) {
            targetTiltX = -this.mouseY * this.maxTilt;
            targetTiltY = this.mouseX * this.maxTilt;
        }

        this.currentTiltX += (targetTiltX - this.currentTiltX) * this.lerpSpeed;
        this.currentTiltY += (targetTiltY - this.currentTiltY) * this.lerpSpeed;

        if (this.cardContainer) {
            const absTilt = Math.abs(this.currentTiltX) + Math.abs(this.currentTiltY);
            if (isCompanionOpen && !isTransitioning && absTilt < 0.005) {
                this.currentTiltX = 0;
                this.currentTiltY = 0;
                this.cardContainer.style.transform = 'translateZ(0px) rotateX(0deg) rotateY(0deg)';
            } else {
                const isFlipped = (typeof Router !== 'undefined' && Router.isFlipped);
                const multiplier = isFlipped ? 0.35 : 1;
                const finalTiltX = this.currentTiltX * multiplier;
                const finalTiltY = this.currentTiltY * multiplier;

                this.cardContainer.style.transform = `rotateX(${finalTiltX.toFixed(2)}deg) rotateY(${finalTiltY.toFixed(2)}deg)`;
            }
        }

        requestAnimationFrame(() => this.loop());
    }
};
// #endregion
