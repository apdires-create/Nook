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
        const stage = document.getElementById('profileStage');
        const isCompanionOpen = stage && stage.classList.contains('has-companion-open');
        const isTransitioning = typeof Router !== 'undefined' && Router._companionTransitioning;

        // Showcase açılırken, kapanırken veya açıkken tilt hedefi 0'dır (olduğu yerden yumuşakça sıfıra süzülür)
        let targetTiltX = 0;
        let targetTiltY = 0;

        if (!isCompanionOpen && !isTransitioning) {
            targetTiltX = -this.mouseY * this.maxTilt;
            targetTiltY = this.mouseX * this.maxTilt;
        }

        this.currentTiltX += (targetTiltX - this.currentTiltX) * this.lerpSpeed;
        this.currentTiltY += (targetTiltY - this.currentTiltY) * this.lerpSpeed;

        if (this.cardContainer) {
            // Eğer showcase açık ve tilt neredeyse 0 ise CPU'yu yormadan transform'u temiz tut
            const absTilt = Math.abs(this.currentTiltX) + Math.abs(this.currentTiltY);
            if (isCompanionOpen && !isTransitioning && absTilt < 0.005) {
                this.currentTiltX = 0;
                this.currentTiltY = 0;
                this.cardContainer.style.transform = 'rotateX(0deg) rotateY(0deg)';
            } else {
                const multiplier = (typeof Router !== 'undefined' && Router.isFlipped) ? 0.35 : 1;
                this.cardContainer.style.transform = `rotateX(${this.currentTiltX * multiplier}deg) rotateY(${this.currentTiltY * multiplier}deg)`;
            }
        }

        requestAnimationFrame(() => this.loop());
    }
};
// #endregion
