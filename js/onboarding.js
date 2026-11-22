// #region 1: ONBOARDING & ZİYARETÇİ İPUCU MOTORU
const Onboarding = {
    isMobile: false,
    _initialized: false,
    _mobileTapped: false,
    _peekTimer: null,
    _returnTimer: null,
    _stageObserver: null,
    _flipObserver: null,

    init() {
        if (this._initialized) return;
        this._initialized = true;

        // Cihaz modelini sayfa yüklenişinde tek seferlik sabitle
        this.isMobile = window.innerWidth < 900;

        // Masaüstünde hover tilt CSS tarafından yönetilir; JS akışı yalnızca mobilde ziyaretçi için çalışır
        const owner = (typeof isOwner !== 'undefined' && isOwner);
        if (!owner && this.isMobile) {
            this.runMobileVisitorPeek();
        }
    },

    _canMobilePeek() {
        if (this._mobileTapped) return false;
        const stage = document.getElementById('profileStage');
        const cardContainer = document.getElementById('cardContainer');
        if (!cardContainer || cardContainer.classList.contains('is-flipped')) return false;
        if (stage && stage.classList.contains('has-companion-open')) return false;
        return true;
    },

    _clearPeek(smooth = false) {
        clearTimeout(this._peekTimer);
        this._peekTimer = null;

        const cardContainer = document.getElementById('cardContainer');
        if (!cardContainer) return;

        if (smooth && cardContainer.classList.contains('is-mobile-peeking')) {
            clearTimeout(this._returnTimer);
            cardContainer.classList.add('is-mobile-peek-returning');
            this._returnTimer = setTimeout(() => {
                cardContainer.classList.remove('is-mobile-peek-returning');
            }, 420);
        } else {
            cardContainer.classList.remove('is-mobile-peek-returning');
        }

        cardContainer.classList.remove('is-mobile-peeking');
    },

    _scheduleMobilePeek(delayMs = 900) {
        clearTimeout(this._peekTimer);
        if (this._mobileTapped) return;

        this._peekTimer = setTimeout(() => {
            if (!this._canMobilePeek()) return;
            const cardContainer = document.getElementById('cardContainer');
            if (cardContainer) {
                cardContainer.classList.remove('is-mobile-peek-returning');
                cardContainer.classList.add('is-mobile-peeking');
            }
        }, delayMs);
    },

    runMobileVisitorPeek() {
        const cardContainer = document.getElementById('cardContainer');
        const stage = document.getElementById('profileStage');
        if (!cardContainer) return;

        // 1. Açılıştan kısa süre sonra hafif eğik duruma geç
        this._scheduleMobilePeek(900);

        // 2. Karta bir kere bile tıklanması peek'i kalıcı olarak sonlandırır
        cardContainer.addEventListener('click', () => {
            if (this._mobileTapped) return;
            this._mobileTapped = true;
            this._clearPeek(true);
        }, { capture: true });

        // 3. Sağa/sola kaydırma başladığında sürükleme ile çakışmaması için anında sıfırla
        let touchStartX = 0;
        let touchStartY = 0;
        window.addEventListener('touchstart', (e) => {
            if (this._mobileTapped || !e.touches || e.touches.length !== 1) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (this._mobileTapped || !e.touches || e.touches.length !== 1) return;
            const dx = Math.abs(e.touches[0].clientX - touchStartX);
            const dy = Math.abs(e.touches[0].clientY - touchStartY);
            if (dx > 6 && dx >= dy) {
                this._clearPeek(false);
            }
        }, { passive: true });

        // Kaydırma bittiğinde ana kart hâlâ ön yüzde ve düz ise yeniden tetikle
        const onTouchFinish = () => {
            if (!this._mobileTapped) {
                this._scheduleMobilePeek(650);
            }
        };
        window.addEventListener('touchend', onTouchFinish, { passive: true });
        window.addEventListener('touchcancel', onTouchFinish, { passive: true });

        // 4. Yan karttan ana karta dönüldüğünde (has-companion-open kalkınca) tekrar tetikle
        if (stage) {
            if (this._stageObserver) this._stageObserver.disconnect();
            this._stageObserver = new MutationObserver(() => {
                if (this._mobileTapped) {
                    this._stageObserver.disconnect();
                    this._stageObserver = null;
                    return;
                }
                if (stage.classList.contains('has-companion-open')) {
                    this._clearPeek(false);
                } else {
                    this._scheduleMobilePeek(650);
                }
            });
            this._stageObserver.observe(stage, { attributes: true, attributeFilter: ['class'] });
        }

        // 5. Kart çevrilirse (is-flipped) peek'i durdur
        if (this._flipObserver) this._flipObserver.disconnect();
        this._flipObserver = new MutationObserver(() => {
            if (cardContainer.classList.contains('is-flipped')) {
                this._mobileTapped = true;
                this._clearPeek(false);
                this._flipObserver.disconnect();
                this._flipObserver = null;
            }
        });
        this._flipObserver.observe(cardContainer, { attributes: true, attributeFilter: ['class'] });
    }
};
// #endregion
