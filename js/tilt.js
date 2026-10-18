// #region 1: 3D TILT VE LERP MOTORU
const TiltEngine = {
    cardContainer: null,
    mouseX: 0,
    mouseY: 0,
    currentTiltX: 0,
    currentTiltY: 0,
    maxTilt: 2.2,
    lerpSpeed: 0.08,
    isRunning: false,
    rafId: null,

    init() {
        this.cardContainer = document.getElementById('cardContainer');
        if (!this.cardContainer) return;

        window.addEventListener('mousemove', (e) => {
            if (window.innerWidth < 900) return;
            const { innerWidth, innerHeight } = window;
            this.mouseX = (e.clientX / innerWidth) * 2 - 1;
            this.mouseY = (e.clientY / innerHeight) * 2 - 1;
            this.wake();
        }, { passive: true });

        // Kart üzerinde fare koordinatlarını CSS değişkeni olarak takip et (Spotlight border)
        const stage = document.getElementById('profileStage');
        if (stage) {
            stage.addEventListener('mousemove', (e) => {
                if (window.innerWidth < 900) return;
                const targetCard = e.target.closest('#cardContainer, .companion-card');
                if (targetCard) {
                    const rect = targetCard.getBoundingClientRect();
                    targetCard.style.setProperty('--card-mouse-x', `${(e.clientX - rect.left).toFixed(1)}px`);
                    targetCard.style.setProperty('--card-mouse-y', `${(e.clientY - rect.top).toFixed(1)}px`);
                }
            }, { passive: true });
        }

        window.addEventListener('mouseleave', () => {
            this.mouseX = 0;
            this.mouseY = 0;
            this.wake();
        });

        window.addEventListener('blur', () => {
            this.mouseX = 0;
            this.mouseY = 0;
            this.wake();
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth < 900) {
                if (this.cardContainer && this.cardContainer.style.transform) {
                    this.cardContainer.style.transform = '';
                }
                this.isRunning = false;
                if (this.rafId) {
                    cancelAnimationFrame(this.rafId);
                    this.rafId = null;
                }
            } else {
                this.wake();
            }
        }, { passive: true });

        if (window.innerWidth >= 900) {
            this.wake();
        }
    },

    wake() {
        if (this.isRunning || window.innerWidth < 900 || !this.cardContainer) return;
        this.isRunning = true;
        this.rafId = requestAnimationFrame(() => this.loop());
    },

    loop() {
        this.rafId = null;
        if (window.innerWidth < 900 || !this.cardContainer) {
            if (this.cardContainer && this.cardContainer.style.transform) {
                this.cardContainer.style.transform = '';
            }
            this.isRunning = false;
            return;
        }

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

        const diffX = Math.abs(targetTiltX - this.currentTiltX);
        const diffY = Math.abs(targetTiltY - this.currentTiltY);
        const isConverged = diffX < 0.005 && diffY < 0.005 && !isTransitioning;

        if (isConverged) {
            this.currentTiltX = targetTiltX;
            this.currentTiltY = targetTiltY;
        }

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

        if (isConverged) {
            this.isRunning = false;
            return;
        }

        this.rafId = requestAnimationFrame(() => this.loop());
    }
};
// #endregion
