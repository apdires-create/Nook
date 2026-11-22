// #region 1: ONBOARDING & ZİYARETÇİ İPUCU MOTORU
const Onboarding = {
    isMobile: false,
    _initialized: false,
    _pillEl: null,
    _hideTimer: null,
    _stepTimer: null,
    _flipObserver: null,

    init() {
        if (this._initialized) return;
        this._initialized = true;

        // Cihaz modelini sayfa yüklenişinde tek seferlik sabitle
        this.isMobile = window.innerWidth < 900;

        // Şimdilik geliştirme/test amacıyla yalnızca ziyaretçi akışını her yenilemede çalıştır
        const owner = (typeof isOwner !== 'undefined' && isOwner);
        if (!owner) {
            this.runVisitorFlow();
        }
    },

    _ensurePill() {
        if (this._pillEl) return this._pillEl;

        const pill = document.createElement('div');
        pill.className = 'nook-hint-pill';
        pill.setAttribute('role', 'status');
        pill.setAttribute('aria-live', 'polite');

        const icon = document.createElement('span');
        icon.className = 'nook-hint-icon';
        icon.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>';

        const text = document.createElement('span');
        text.className = 'nook-hint-text';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'nook-hint-close';
        closeBtn.setAttribute('aria-label', 'İpucunu kapat');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hidePill();
        });

        pill.appendChild(icon);
        pill.appendChild(text);
        pill.appendChild(closeBtn);
        document.body.appendChild(pill);

        this._pillEl = pill;
        return pill;
    },

    showPill(message, durationMs = 5500, onDismiss = null) {
        clearTimeout(this._hideTimer);
        const pill = this._ensurePill();
        const textEl = pill.querySelector('.nook-hint-text');
        if (textEl) textEl.textContent = message;

        this._onDismiss = onDismiss;
        requestAnimationFrame(() => {
            pill.classList.add('is-visible');
        });

        if (durationMs > 0) {
            this._hideTimer = setTimeout(() => {
                this.hidePill();
            }, durationMs);
        }
    },

    hidePill() {
        clearTimeout(this._hideTimer);
        if (this._pillEl) {
            this._pillEl.classList.remove('is-visible');
        }
        const cb = this._onDismiss;
        this._onDismiss = null;
        if (typeof cb === 'function') cb();
    },

    _triggerCardAnimation(className, durationMs) {
        const cardContainer = document.getElementById('cardContainer');
        if (!cardContainer) return;

        cardContainer.classList.remove(className);
        void cardContainer.offsetWidth; // Reflow ile animasyonu sıfırla
        cardContainer.classList.add(className);

        setTimeout(() => {
            cardContainer.classList.remove(className);
        }, durationMs);
    },

    _hasMobileSwipeCards() {
        if (typeof SectionManager !== 'undefined' && typeof SectionManager.desteSirasi === 'function') {
            return SectionManager.desteSirasi().length > 1;
        }
        return false;
    },

    runVisitorFlow() {
        const cardContainer = document.getElementById('cardContainer');
        if (!cardContainer) return;

        clearTimeout(this._stepTimer);

        // Adım 1: Kartın arka yüzü olduğunu hissettir (Peek + İpucu)
        this._stepTimer = setTimeout(() => {
            if (cardContainer.classList.contains('is-flipped')) return;

            this._triggerCardAnimation('is-peeking', 1200);

            const flipMsg = this.isMobile
                ? 'Boş bir alana dokunarak kartın arka yüzünü görebilirsin'
                : 'Boş bir alana tıklayarak kartın arka yüzünü görebilirsin';

            let step1Done = false;
            const finishStep1 = () => {
                if (step1Done) return;
                step1Done = true;
                if (this._flipObserver) {
                    this._flipObserver.disconnect();
                    this._flipObserver = null;
                }

                // Mobilde aktif başka kartlar varsa Adım 2'ye (kaydırma ipucu) geç
                if (this.isMobile && this._hasMobileSwipeCards()) {
                    setTimeout(() => this._runMobileSwipeHint(), 650);
                }
            };

            this.showPill(flipMsg, 5500, finishStep1);

            // Kullanıcı kartı çevirdiğinde Adım 1 ipucunu anında kapat
            this._flipObserver = new MutationObserver(() => {
                if (cardContainer.classList.contains('is-flipped')) {
                    this.hidePill();
                }
            });
            this._flipObserver.observe(cardContainer, { attributes: true, attributeFilter: ['class'] });
        }, 800);
    },

    _runMobileSwipeHint() {
        const cardContainer = document.getElementById('cardContainer');
        if (!cardContainer || cardContainer.classList.contains('is-flipped')) return;

        this._triggerCardAnimation('is-swipe-nudging', 1100);
        this.showPill('Diğer kartlar için sağa veya sola kaydır', 5000);

        const onTouchMove = () => {
            this.hidePill();
            window.removeEventListener('touchmove', onTouchMove);
        };
        window.addEventListener('touchmove', onTouchMove, { passive: true, once: true });
    }
};
// #endregion
