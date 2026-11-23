// #region 1: ONBOARDING & ZİYARETÇİ İPUCU MOTORU
const Onboarding = {
    isMobile: false,
    _initialized: false,

    init() {
        if (this._initialized) return;
        this._initialized = true;

        // Cihaz modelini sayfa yüklenişinde tek seferlik sabitle
        this.isMobile = window.innerWidth < 900;
    }
};
// #endregion
