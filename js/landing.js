// #region 1: NOOK PROFIL KARTI DEMO MOTORU (RANDOM PROFILES)
(function () {
    const NOOK_PROFILES = [
        { name: "Luna", role: "Professional Backlog Ignorer", bio: "Currently pretending I'll finish Hollow Knight before buying another indie game. My Steam wishlist has become its own ecosystem.", links: ["Steam", "Backloggd", "GitHub"], avatar: "linear-gradient(160deg,#7fdcff,#5b6bff)", accent: "#7fdcff" },
        { name: "Kite", role: "Chronic Tab Hoarder", bio: "137 browser tabs open, 4 of them are things I actually need. The rest are just... company, I guess.", links: ["GitHub", "Letterboxd"], avatar: "linear-gradient(160deg,#ffb26b,#f2795c)", accent: "#ffb26b" },
        { name: "Mira", role: "Part-Time Main Character", bio: "Ranks anime openings more seriously than actual life decisions. Currently three rewatches deep into Frieren.", links: ["AniList", "Spotify", "Twitch"], avatar: "linear-gradient(160deg,#c98bff,#7a5cff)", accent: "#c98bff" },
        { name: "Dex", role: "Undefeated at Losing Save Files", bio: "Lost 40 hours of a Stardew Valley save to a coffee spill. Rebuilt the farm out of spite. It's better now.", links: ["Steam", "itch.io", "GitHub"], avatar: "linear-gradient(160deg,#8fe38f,#3fae6a)", accent: "#8fe38f" },
        { name: "Sable", role: "Freelance Vibes Consultant", bio: "Designs interfaces, then spends four hours picking the border-radius. It's a whole personality now.", links: ["Dribbble", "Behance", "GitHub"], avatar: "linear-gradient(160deg,#ff9ecf,#c15cff)", accent: "#ff9ecf" },
        { name: "Rook", role: "Amateur Speedrunner, Professional Rage Quitter", bio: "PB is 12:04. Personal worst is throwing the controller across the room at 11:58. Working on both.", links: ["Twitch", "YouTube"], avatar: "linear-gradient(160deg,#ffd166,#f2a93b)", accent: "#ffd166" },
        { name: "Wren", role: "Self-Appointed Playlist Curator", bio: "Makes a new playlist for every mood, every season, and one specifically for 'walking home in the rain thinking about anime.'", links: ["Spotify", "Letterboxd"], avatar: "linear-gradient(160deg,#6be7d4,#3f9ea8)", accent: "#6be7d4" },
        { name: "Nyx", role: "Full-Time Manga Chapter Refresher", bio: "Checks for new chapters every day at 9am like it's a job. Technically it kind of is now.", links: ["AniList", "GitHub", "Bionluk"], avatar: "linear-gradient(160deg,#a29bfe,#6c5ce7)", accent: "#a29bfe" },
        { name: "Ash", role: "Certified Overthinker of Character Builds", bio: "Spent longer theorycrafting a Baldur's Gate 3 party comp than actually playing the game. No regrets.", links: ["Steam", "GitHub"], avatar: "linear-gradient(160deg,#ff8a65,#d84315)", accent: "#ff8a65" },
        { name: "Yuki", role: "Backyard Astronomer, Indoor Cat", bio: "Owns a telescope. Has used it twice. Mostly just likes knowing it's there, like a very expensive houseplant.", links: ["GitHub", "Letterboxd", "Spotify"], avatar: "linear-gradient(160deg,#89c4f4,#3468c0)", accent: "#89c4f4" }
    ];

    const STORAGE_PREFIX = "nook_last_profile__";

    function pickRandomIndex(poolLength, excludeIndex) {
        if (poolLength <= 1) return 0;
        let index;
        do { index = Math.floor(Math.random() * poolLength); } while (index === excludeIndex);
        return index;
    }

    function getLastIndex(key) {
        try {
            const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
            return raw === null ? -1 : parseInt(raw, 10);
        } catch (e) { return -1; }
    }

    function setLastIndex(key, index) {
        try { window.localStorage.setItem(STORAGE_PREFIX + key, String(index)); } catch (e) {}
    }

    function initials(name) { return name.trim().charAt(0).toUpperCase(); }

    function render(container, profile) {
        const liveAccent = profile.accent || "var(--landing-amber)";
        container.style.setProperty('--nook-accent-live', liveAccent);

        container.innerHTML = `
            <div class="nook-card__body">
                <div class="nook-card__avatar" style="background:${profile.avatar}">
                    ${initials(profile.name)}
                </div>
                <div class="nook-card__name">${profile.name}</div>
                <div class="nook-card__role" style="color: var(--nook-accent-live);">
                    <span style="opacity: 0.5; margin-right: 4px;">•</span>${profile.role}
                </div>
                <div class="nook-card__bio">${profile.bio}</div>
                <div class="nook-card__links">
                    ${profile.links.map(l => `<span class="nook-card__chip">${l}</span>`).join("")}
                </div>
            </div>
        `;
    }

    function mount(container) {
        const key = container.dataset.nookKey || "global";
        const lastIndex = getLastIndex(key);
        const nextIndex = pickRandomIndex(NOOK_PROFILES.length, lastIndex);
        setLastIndex(key, nextIndex);
        render(container, NOOK_PROFILES[nextIndex]);
    }

    function mountAll() {
        document.querySelectorAll("[data-nook-card]").forEach(mount);
    }

    window.NookProfileCard = { mountAll, mount, profiles: NOOK_PROFILES };
})();
// #endregion

// #region 2: 3D HERO FLIP ETKİLEŞİMİ
function landingFlipEtkilesiminiBaslat() {
    const flipCardInner = document.getElementById('hero-flip-card');
    const visualWrapper = document.querySelector('.tilted-visual-wrapper');
    
    const btnLogin = document.getElementById('hero-login-btn'); 
    const btnStart = document.getElementById('hero-start-btn'); 
    const btnFrontCard = document.getElementById('flip-front-trigger'); 
    const btnCloseBack = document.getElementById('flip-back-btn'); 

    const toggleFlip = (e) => {
        if (e) e.stopPropagation();
        if (flipCardInner) {
            flipCardInner.classList.toggle('is-flipped');
            if (flipCardInner.classList.contains('is-flipped')) {
                if (typeof turnstileWidgetiHazirla === 'function') {
                    requestAnimationFrame(() => turnstileWidgetiHazirla('landing-turnstile'));
                }
            }
        }
        if (visualWrapper) visualWrapper.classList.toggle('is-flat');
    };

    if (btnLogin) btnLogin.addEventListener('click', toggleFlip);
    if (btnStart) btnStart.addEventListener('click', toggleFlip);
    if (btnFrontCard) btnFrontCard.addEventListener('click', toggleFlip);
    if (btnCloseBack) btnCloseBack.addEventListener('click', toggleFlip);
}
// #endregion

// #region 3: LANDING GİRİŞ VE KAYIT FORMU YÖNETİCİSİ
function landingEkraniniBaslat() {
    landingFlipEtkilesiminiBaslat();
    if (window.NookProfileCard) window.NookProfileCard.mountAll();

    const landingBox = document.getElementById('main-landing-box');
    const mainTitle = document.getElementById('landing-main-title');
    const usernameInput = document.getElementById('landing-username');
    const emailInput = document.getElementById('landing-email');
    const passwordInput = document.getElementById('landing-password');
    const submitBtn = document.getElementById('landing-submit-btn');
    const switchText = document.getElementById('landing-switch-text');
    const switchBtn = document.getElementById('landing-switch-action');

    const navUserMenu = document.getElementById('landing-user-menu');
    const navUserTrigger = document.getElementById('landing-user-trigger');
    const navDropdown = document.getElementById('landing-nav-dropdown');
    const navUserName = document.getElementById('landing-user-name');
    const navGoProfile = document.getElementById('landing-go-profile');
    const navLogoutBtn = document.getElementById('landing-logout-btn');
    const heroLoginBtn = document.getElementById('hero-login-btn');

    // Oturum açıksa Landing navbar'da kullanıcı dropdown'unu göster
    if (aktifKullaniciOturumu && aktifKullaniciAdi) {
        if (heroLoginBtn) heroLoginBtn.style.display = 'none';
        if (navUserMenu) navUserMenu.style.display = 'block';
        if (navUserName) navUserName.textContent = `@${aktifKullaniciAdi}`;
        if (navGoProfile) navGoProfile.href = `?user=${encodeURIComponent(aktifKullaniciAdi)}`;
        
        if (navUserTrigger && navDropdown) {
            navUserTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                navDropdown.classList.toggle('is-open');
            });
            document.addEventListener('click', () => {
                navDropdown.classList.remove('is-open');
            });
        }

        if (navLogoutBtn) {
            navLogoutBtn.addEventListener('click', async () => {
                if (typeof sistemdenCikisYap === 'function') {
                    await sistemdenCikisYap();
                }
            });
        }
    }

    let isLandingLoginMode = true;
    if (!submitBtn) return;

    const mainForm = document.getElementById('landing-main-form');
    const forgotForm = document.getElementById('landing-forgot-form');
    const forgotTrigger = document.getElementById('landing-forgot-trigger');
    const forgotEmail = document.getElementById('landing-forgot-email');
    const forgotSubmitBtn = document.getElementById('landing-forgot-submit-btn');
    const forgotBackBtn = document.getElementById('landing-forgot-back-btn');
    const auxLinks = document.getElementById('landing-aux-links');

    const loginBasliklari = [
        "Nook'a Dön",
        "Kendi Köşene Geç",
        "Tekrar Hoş Geldin",
        "Kaldığın Yerden"
    ];

    const registerBasliklari = [
        "Kendi Köşeni Yarat",
        "Dijital Denize Açıl",
        "Bir Nook İnşa Et",
        "Kendine Bir Alan Aç"
    ];

    const rastgeleBaslikSec = (dizi) => dizi[Math.floor(Math.random() * dizi.length)];
    if (mainTitle) mainTitle.textContent = rastgeleBaslikSec(loginBasliklari);

    if (switchBtn) {
        switchBtn.addEventListener('click', () => {
            isLandingLoginMode = !isLandingLoginMode;
            if (typeof authHataTemizle === 'function') authHataTemizle();

            if (isLandingLoginMode) {
                if (landingBox) landingBox.classList.remove('register-mode');
                if (mainTitle) mainTitle.textContent = rastgeleBaslikSec(loginBasliklari);
                submitBtn.textContent = 'Giriş Yap';
                if (switchText) switchText.textContent = 'Hesabın yok mu?';
                switchBtn.textContent = 'Kayıt Ol';
                if (usernameInput) usernameInput.value = '';
                if (auxLinks) auxLinks.style.display = 'flex';
            } else {
                if (landingBox) landingBox.classList.add('register-mode');
                if (mainTitle) mainTitle.textContent = rastgeleBaslikSec(registerBasliklari);
                submitBtn.textContent = 'Kayıt Ol';
                if (switchText) switchText.textContent = 'Zaten hesabın var mı?';
                switchBtn.textContent = 'Giriş Yap';
                if (auxLinks) auxLinks.style.display = 'none';
            }
        });
    }

    // Şifremi Unuttum Formu Geçişleri
    if (forgotTrigger && mainForm && forgotForm) {
        forgotTrigger.addEventListener('click', () => {
            if (typeof authHataTemizle === 'function') authHataTemizle();
            mainForm.style.display = 'none';
            forgotForm.style.display = 'flex';
            if (mainTitle) mainTitle.textContent = 'Şifre Sıfırlama';
            if (emailInput?.value && forgotEmail) forgotEmail.value = emailInput.value;
            if (typeof turnstileWidgetiHazirla === 'function') {
                requestAnimationFrame(() => turnstileWidgetiHazirla('landing-forgot-turnstile'));
            }
        });
    }

    if (forgotBackBtn && mainForm && forgotForm) {
        forgotBackBtn.addEventListener('click', () => {
            if (typeof authHataTemizle === 'function') authHataTemizle();
            forgotForm.style.display = 'none';
            mainForm.style.display = 'flex';
            if (mainTitle) mainTitle.textContent = rastgeleBaslikSec(loginBasliklari);
        });
    }

    if (forgotSubmitBtn) {
        forgotSubmitBtn.addEventListener('click', async () => {
            const email = forgotEmail?.value.trim();
            forgotSubmitBtn.disabled = true;
            forgotSubmitBtn.textContent = 'Gönderiliyor...';
            if (typeof sistemeSifreSifirlamaGonder === 'function') {
                await sistemeSifreSifirlamaGonder(email, '#landing-forgot-error-box');
            }
            forgotSubmitBtn.disabled = false;
            forgotSubmitBtn.textContent = 'Sıfırlama Bağlantısı Gönder';
        });
    }

    submitBtn.addEventListener('click', async () => {
        const email = emailInput?.value.trim();
        const password = passwordInput?.value.trim();
        if (!email || !password) {
            if (typeof authHataGoster === 'function') authHataGoster("E-posta ve şifre zorunludur!");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'İşleniyor...';

        if (isLandingLoginMode) {
            if (typeof sistemeGirisYap === 'function') {
                await sistemeGirisYap(email, password);
            }
        } else {
            const username = usernameInput?.value.trim();
            if (!username || username.length < 3) {
                if (typeof authHataGoster === 'function') authHataGoster("En az 3 karakterli bir kullanıcı adı gereklidir!");
                submitBtn.disabled = false;
                submitBtn.textContent = 'Kayıt Ol';
                return;
            }
            if (typeof sistemeKayitOl === 'function') {
                await sistemeKayitOl(email, password, username);
            }
        }

        submitBtn.disabled = false;
        submitBtn.textContent = isLandingLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
    });

    if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitBtn.click();
            }
        });
    }
}
// #endregion
