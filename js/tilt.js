// #region 1: 3D TILT VE LERP MOTORU
const TiltEngine = {
    cardContainer: null,
    mouseX: 0,
    mouseY: 0,
    currentTiltX: 0,
    currentTiltY: 0,
    currentHoverSag: 0,
    currentHoverTiltX: 0,
    isCardHovered: false,
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
            this.isCardHovered = false;
        });

        this.cardContainer.addEventListener('mouseenter', () => {
            this.isCardHovered = true;
        });

        this.cardContainer.addEventListener('mouseleave', () => {
            this.isCardHovered = false;
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
        let targetHoverSag = 0;
        let targetHoverTiltX = 0;

        if (!isCompanionOpen && !isTransitioning) {
            targetTiltX = -this.mouseY * this.maxTilt;
            targetTiltY = this.mouseX * this.maxTilt;

            if (this.isCardHovered) {
                targetHoverSag = -8;
                targetHoverTiltX = 1.6;
            }
        }

        this.currentTiltX += (targetTiltX - this.currentTiltX) * this.lerpSpeed;
        this.currentTiltY += (targetTiltY - this.currentTiltY) * this.lerpSpeed;
        this.currentHoverSag += (targetHoverSag - this.currentHoverSag) * this.lerpSpeed;
        this.currentHoverTiltX += (targetHoverTiltX - this.currentHoverTiltX) * this.lerpSpeed;

        if (this.cardContainer) {
            const absTilt = Math.abs(this.currentTiltX) + Math.abs(this.currentTiltY) + Math.abs(this.currentHoverSag);
            if (isCompanionOpen && !isTransitioning && absTilt < 0.005) {
                this.currentTiltX = 0;
                this.currentTiltY = 0;
                this.currentHoverSag = 0;
                this.currentHoverTiltX = 0;
                this.cardContainer.style.transform = 'translateZ(0px) rotateX(0deg) rotateY(0deg)';
            } else {
                const isFlipped = (typeof Router !== 'undefined' && Router.isFlipped);
                const multiplier = isFlipped ? 0.35 : 1;
                const finalTiltX = (this.currentTiltX + (isFlipped ? -this.currentHoverTiltX : this.currentHoverTiltX)) * multiplier;
                const finalTiltY = this.currentTiltY * multiplier;
                const finalSagZ = this.currentHoverSag;

                this.cardContainer.style.transform = `translateZ(${finalSagZ.toFixed(2)}px) rotateX(${finalTiltX.toFixed(2)}deg) rotateY(${finalTiltY.toFixed(2)}deg)`;
            }
        }

        requestAnimationFrame(() => this.loop());
    }
};
// #endregion
