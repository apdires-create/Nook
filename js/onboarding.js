// #region 1: ONBOARDING & ZİYARETÇİ İPUCU MOTORU (SAF GÖRSEL UX)
const Onboarding = {
    isMobile: false,
    _initialized: false,
    _hasFlipped: false,
    _hasSwiped: false,
    _peekTimer: null,
    _peekInterval: null,
    _swipeTimer: null,
    _swipeInterval: null,
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

    _triggerCardAnimation(className, durationMs) {
        const cardContainer = document.getElementById('cardContainer');
        if (!cardContainer || cardContainer.classList.contains('is-flipped')) return;

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

    _stopPeekLoop() {
        clearTimeout(this._peekTimer);
        clearInterval(this._peekInterval);
        this._peekTimer = null;
        this._peekInterval = null;
        const cardContainer = document.getElementById('cardContainer');
        if (cardContainer) cardContainer.classList.remove('is-peeking');
    },

    _stopSwipeLoop() {
        clearTimeout(this._swipeTimer);
        clearInterval(this._swipeInterval);
        this._swipeTimer = null;
        this._swipeInterval = null;
        const cardContainer = document.getElementById('cardContainer');
        if (cardContainer) cardContainer.classList.remove('is-swipe-nudging');
    },

    runVisitorFlow() {
        const cardContainer = document.getElementById('cardContainer');
        if (!cardContainer) return;

        this._stopPeekLoop();
        this._stopSwipeLoop();

        const playPeek = () => {
            if (this._hasFlipped || cardContainer.classList.contains('is-flipped')) return;
            this._triggerCardAnimation('is-peeking', 1700);
        };

        // İlk peek: 800ms sonra; kullanıcı kartı çevirene kadar her 4.5 saniyede bir tekrarla
        this._peekTimer = setTimeout(() => {
            playPeek();
            this._peekInterval = setInterval(playPeek, 4500);
        }, 800);

        // Kullanıcı kartı çevirdiğinde peek döngüsünü kalıcı olarak durdur
        if (this._flipObserver) this._flipObserver.disconnect();
        this._flipObserver = new MutationObserver(() => {
            const flippedNow = cardContainer.classList.contains('is-flipped');

            if (flippedNow && !this._hasFlipped) {
                this._hasFlipped = true;
                this._stopPeekLoop();
            }

            // Mobilde: kart arkasına bakıp ön yüze döndüğünde (ek kart varsa) kaydırma imasını başlat
            if (this.isMobile && this._hasFlipped && !flippedNow && !this._hasSwiped && this._hasMobileSwipeCards()) {
                this._flipObserver.disconnect();
                this._flipObserver = null;
                this._startMobileSwipeLoop();
            } else if (!this.isMobile && this._hasFlipped) {
                this._flipObserver.disconnect();
                this._flipObserver = null;
            }
        });
        this._flipObserver.observe(cardContainer, { attributes: true, attributeFilter: ['class'] });
    },

    _startMobileSwipeLoop() {
        if (this._hasSwiped || this._swipeInterval) return;

        const playNudge = () => {
            const cardContainer = document.getElementById('cardContainer');
            if (this._hasSwiped || !cardContainer || cardContainer.classList.contains('is-flipped')) return;
            this._triggerCardAnimation('is-swipe-nudging', 1400);
        };

        this._swipeTimer = setTimeout(() => {
            playNudge();
            this._swipeInterval = setInterval(playNudge, 4500);
        }, 700);

        const onSwipe = () => {
            this._hasSwiped = true;
            this._stopSwipeLoop();
            window.removeEventListener('touchmove', onSwipe);
        };
        window.addEventListener('touchmove', onSwipe, { passive: true, once: true });
    }
};
// #endregion
