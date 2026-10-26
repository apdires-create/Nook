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

    // 2.5: Tema Marketi'ni başlat
    if (typeof ThemeMarket !== 'undefined') {
        ThemeMarket.init();
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
    const onbellekVar = typeof yerelOnbellekVarMi === 'function' && yerelOnbellekVarMi();
    const MIN_BEKLEME_MS = onbellekVar ? 0 : 150;
    const baslangic = Date.now();

    const basarili = await tumVerileriCek();

    // 3.1: Kullanıcı Temasını Enjekte Et ve Yükle
    if (basarili && typeof ThemeManager !== 'undefined') {
        const themeConfig = (typeof kartVerisi !== 'undefined' && kartVerisi?.theme_config) || {};
        const userThemeId = themeConfig.theme_id || themeConfig.theme || null;
        if (userThemeId && userThemeId !== 'default') {
            await ThemeManager.applyTheme(userThemeId, {
                primaryColor: themeConfig.primary_color
            });
        } else {
            ThemeManager.clearTheme({ primaryColor: themeConfig.primary_color });
        }
    }

    // 3.2: Sayfa Sahibi İse Düzenleme Modunu Perde Arkasındayken Yükle (Flash / FOUC Önleyici)
    if (basarili && typeof isOwner !== 'undefined' && isOwner) {
        if (typeof ThemeMarket !== 'undefined' && typeof ThemeMarket.kullaniciEnvanteriniYukle === 'function') {
            ThemeMarket.kullaniciEnvanteriniYukle().catch(() => {});
        }
        await editModunuYukle();
        if (typeof EditManager !== 'undefined') {
            EditManager.init();
        }
    }

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
            appLoadingEl.classList.add('is-revealed');
            setTimeout(() => {
                appLoadingEl.style.display = 'none';
                appLoadingEl.classList.remove('is-revealed');
            }, 450);
        }

        // 4. Ribbon Taşma İzleyicisi (Madde 1)
        checkRibbonOverflow();
        window.addEventListener('resize', checkRibbonOverflow, { passive: true });
    }
});

/**
 * Ribbon Butonları Taşma Kontrolü (PLAN.md Madde 1)
 * Ekran daraldığında veya kart kenarı pencere sınırına yaklaştığında butonları kartın içine katlar.
 */
function checkRibbonOverflow() {
    const cardContainer = document.getElementById('cardContainer');
    if (!cardContainer) return;
    const rect = cardContainer.getBoundingClientRect();
    const needsInward = (rect.left - 46 < 0) || (window.innerWidth <= 899);
    cardContainer.classList.toggle('flags-inward', needsInward);
}
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

