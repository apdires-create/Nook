// #region 1: UYGULAMA YÖNLENDİRME VE BAŞLATICI (BOOTSTRAP & ROUTER)
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth modalını tüm sayfalarda ve kurtarma akışlarında global olarak hazırla
    if (typeof authModaliniBaslat === 'function') {
        authModaliniBaslat();
    }

    // 2. Oturum ve şifre kurtarma kontrolünü gerçekleştir
    if (typeof oturumuKontrolEt === 'function') {
        await oturumuKontrolEt();
    }

    const landingScreen = document.getElementById('landing-screen');
    const profileStage = document.getElementById('profileStage');
    const profileTopNav = document.getElementById('profileTopNav');
    const ambientBg = document.getElementById('ambientBackground');
    const appLoadingEl = document.getElementById('app-loading-screen');
    const cardContainer = document.getElementById('cardContainer');

    // ========================================================
    // SENARYO A: URL PARAMETRESİ YOKSA -> LANDING PAGE
    // ========================================================
    if (!KULLANICI_ADI) {
        document.title = 'Nook';
        document.documentElement.classList.remove('is-profile-loading');
        if (profileStage) profileStage.style.display = 'none';
        if (profileTopNav) profileTopNav.style.display = 'none';
        if (ambientBg) ambientBg.style.display = 'none';
        if (appLoadingEl) appLoadingEl.style.display = 'none';
        if (landingScreen) landingScreen.style.display = 'block';

        if (typeof landingEkraniniBaslat === 'function') {
            landingEkraniniBaslat();
        }
        return;
    }

    // ========================================================
    // SENARYO B: URL PARAMETRESİ VARSA -> 5:7 PROFİL KARTI
    // ========================================================
    document.title = `Nook - @${KULLANICI_ADI}`;
    if (landingScreen) landingScreen.style.display = 'none';
    if (profileStage) profileStage.style.display = 'none';
    if (profileTopNav) profileTopNav.style.display = 'none';
    if (ambientBg) ambientBg.style.display = 'none';

    if (appLoadingEl) {
        appLoadingEl.style.display = 'flex';
        appLoadingEl.classList.remove('is-hidden');
    }

    // 2. İnteraktif Motorları Başlat
    if (typeof Router !== 'undefined') {
        Router.init();
    }

    if (typeof TiltEngine !== 'undefined') {
        TiltEngine.init();
    }

    // 3. Veri Çekimi ve Akıcı Bekleme Süresi (FOUC Önleyici)
    const MIN_BEKLEME_MS = 600;
    const baslangic = Date.now();

    const basarili = await tumVerileriCek();

    // Bekleme süresini tamamla
    const gecen = Date.now() - baslangic;
    const kalan = Math.max(0, MIN_BEKLEME_MS - gecen);
    if (kalan > 0) {
        await new Promise(resolve => setTimeout(resolve, kalan));
    }

    // FOUC önleyici perde sınıfını kesin olarak kaldır
    document.documentElement.classList.remove('is-profile-loading');

    if (basarili) {
        // Sahneyi ve kontrolleri yumuşakça aç
        if (profileStage) profileStage.style.display = 'flex';
        if (profileTopNav) profileTopNav.style.display = 'flex';
        if (ambientBg) ambientBg.style.display = 'block';
        if (cardContainer) cardContainer.style.display = 'block';

        if (appLoadingEl) {
            appLoadingEl.classList.add('is-hidden');
            setTimeout(() => {
                appLoadingEl.style.display = 'none';
            }, 400);
        }

        // 4. Sayfa Sahibi İse Düzenleme Modunu Lazy-Load Et
        if (typeof isOwner !== 'undefined' && isOwner) {
            await editModunuYukle();
            if (typeof EditManager !== 'undefined') {
                EditManager.init();
            }
        }
    }
});
// #endregion

// #region 2: DÜZENLEME MODU LAZY-LOAD YÖNETİCİSİ (OWNER LAZY LOADER)
async function editModunuYukle() {
    // 1. Cropper.js CSS
    if (!document.querySelector('link[href*="cropper.min.css"]')) {
        const linkCropper = document.createElement('link');
        linkCropper.rel = 'stylesheet';
        linkCropper.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css';
        document.head.appendChild(linkCropper);
    }

    // 2. Owner CSS
    if (!document.querySelector('link[href*="owner.css"]')) {
        const linkOwner = document.createElement('link');
        linkOwner.rel = 'stylesheet';
        linkOwner.href = 'css/owner.css';
        document.head.appendChild(linkOwner);
    }

    // 3. Cropper.js Script
    if (typeof Cropper === 'undefined') {
        await new Promise((resolve) => {
            const scriptCropper = document.createElement('script');
            scriptCropper.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js';
            scriptCropper.onload = resolve;
            scriptCropper.onerror = resolve; // Hata olsa da akış kilitlenmesin
            document.body.appendChild(scriptCropper);
        });
    }

    // 4. EditManager Script
    if (typeof EditManager === 'undefined') {
        await new Promise((resolve) => {
            const scriptEdit = document.createElement('script');
            scriptEdit.src = 'js/edit.js';
            scriptEdit.onload = resolve;
            scriptEdit.onerror = resolve;
            document.body.appendChild(scriptEdit);
        });
    }
}
// #endregion

