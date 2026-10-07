// #region 1: NOOK PROFIL KARTI DEMO MOTORU (RANDOM PROFILES)
(function () {
    const NOOK_PROFILES = [
        { name: "Luna", role: "Professional Backlog Ignorer", bio: "Currently pretending I'll finish Hollow Knight before buying another indie game. My Steam wishlist has become its own ecosystem.", links: ["Steam", "Backloggd", "GitHub"], avatar: "linear-gradient(160deg,#7fdcff,#5b6bff)", banner: "linear-gradient(135deg, #1e2640, #0d1124)", accent: "#7fdcff" },
        { name: "Kite", role: "Chronic Tab Hoarder", bio: "137 browser tabs open, 4 of them are things I actually need. The rest are just... company, I guess.", links: ["GitHub", "Letterboxd"], avatar: "linear-gradient(160deg,#ffb26b,#f2795c)", banner: "linear-gradient(135deg, #38241b, #15111b)", accent: "#ffb26b" },
        { name: "Mira", role: "Part-Time Main Character", bio: "Ranks anime openings more seriously than actual life decisions. Currently three rewatches deep into Frieren.", links: ["AniList", "Spotify", "Twitch"], avatar: "linear-gradient(160deg,#c98bff,#7a5cff)", banner: "linear-gradient(135deg, #2a1a38, #100f22)", accent: "#c98bff" },
        { name: "Dex", role: "Undefeated at Losing Save Files", bio: "Lost 40 hours of a Stardew Valley save to a coffee spill. Rebuilt the farm out of spite. It's better now.", links: ["Steam", "itch.io", "GitHub"], avatar: "linear-gradient(160deg,#8fe38f,#3fae6a)", banner: "linear-gradient(135deg, #1a2f20, #0c1811)", accent: "#8fe38f" },
        { name: "Sable", role: "Freelance Vibes Consultant", bio: "Designs interfaces, then spends four hours picking the border-radius. It's a whole personality now.", links: ["Dribbble", "Behance", "GitHub"], avatar: "linear-gradient(160deg,#ff9ecf,#c15cff)", banner: "linear-gradient(135deg, #351c2e, #160c1d)", accent: "#ff9ecf" },
        { name: "Rook", role: "Amateur Speedrunner, Professional Rage Quitter", bio: "PB is 12:04. Personal worst is throwing the controller across the room at 11:58. Working on both.", links: ["Twitch", "YouTube"], avatar: "linear-gradient(160deg,#ffd166,#f2a93b)", banner: "linear-gradient(135deg, #362916, #15110c)", accent: "#ffd166" },
        { name: "Wren", role: "Self-Appointed Playlist Curator", bio: "Makes a new playlist for every mood, every season, and one specifically for 'walking home in the rain thinking about anime.'", links: ["Spotify", "Letterboxd"], avatar: "linear-gradient(160deg,#6be7d4,#3f9ea8)", banner: "linear-gradient(135deg, #162f2d, #0b1718)", accent: "#6be7d4" },
        { name: "Nyx", role: "Full-Time Manga Chapter Refresher", bio: "Checks for new chapters every day at 9am like it's a job. Technically it kind of is now.", links: ["AniList", "GitHub", "Bionluk"], avatar: "linear-gradient(160deg,#a29bfe,#6c5ce7)", banner: "linear-gradient(135deg, #23203c, #0e0d1d)", accent: "#a29bfe" },
        { name: "Ash", role: "Certified Overthinker of Character Builds", bio: "Spent longer theorycrafting a Baldur's Gate 3 party comp than actually playing the game. No regrets.", links: ["Steam", "GitHub"], avatar: "linear-gradient(160deg,#ff8a65,#d84315)", banner: "linear-gradient(135deg, #361f18, #160f0c)", accent: "#ff8a65" },
        { name: "Yuki", role: "Backyard Astronomer, Indoor Cat", bio: "Owns a telescope. Has used it twice. Mostly just likes knowing it's there, like a very expensive houseplant.", links: ["GitHub", "Letterboxd", "Spotify"], avatar: "linear-gradient(160deg,#89c4f4,#3468c0)", banner: "linear-gradient(135deg, #18283a, #0b121c)", accent: "#89c4f4" }
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
            <div class="user-card-preview-inner">
                <div class="user-card-preview-banner" style="background:${profile.banner};">
                    <span class="user-card-badge">NOOK</span>
                </div>
                <div class="user-card-preview-avatar" style="background:${profile.avatar}">
                    ${initials(profile.name)}
                </div>
                <div class="user-card-preview-body">
                    <div class="user-card-preview-name">${profile.name}</div>
                    <div class="user-card-preview-role" style="color: var(--nook-accent-live);">${profile.role}</div>
                    <div class="user-card-preview-bio">${profile.bio}</div>
                    <div class="user-card-preview-tags">
                        ${profile.links.map(l => `<span class="user-card-preview-pill">${l}</span>`).join("")}
                    </div>
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

// #region 2: DEMO LİSTE VERİLERİ (ANIME, SHOWS, GAMES)
const SHOWS_DATA = {
    anime: [
        { t: 'Solo Leveling', e: '⚔️', c: 'linear-gradient(160deg,#241633,#0e0b1a)' },
        { t: 'Konosuba', e: '✨', c: 'linear-gradient(160deg,#3a2a12,#1a1206)' },
        { t: 'Kaguya-sama', e: '💮', c: 'linear-gradient(160deg,#3a1230,#160816)' },
        { t: 'Call of the Night', e: '🌙', c: 'linear-gradient(160deg,#12203a,#060a16)' },
        { t: 'Frieren', e: '❄️', c: 'linear-gradient(160deg,#123a34,#061613)' },
        { t: 'Chainsaw Man', e: '🪚', c: 'linear-gradient(160deg,#3a1414,#160606)' },
        { t: 'Jujutsu Kaisen', e: '👁️', c: 'linear-gradient(160deg,#141c3a,#060916)' },
        { t: 'Darling in the Franxx', e: '🤖', c: 'linear-gradient(160deg,#3a1424,#16060e)' },
        { t: 'Kakegurui', e: '🃏', c: 'linear-gradient(160deg,#3a0e0e,#160404)' },
        { t: 'Naruto', e: '🍥', c: 'linear-gradient(160deg,#3a2a0e,#160f04)' },
        { t: 'One Piece', e: '🏴‍☠️', c: 'linear-gradient(160deg,#123a2a,#061610)' },
        { t: 'Oshi no Ko', e: '⭐', c: 'linear-gradient(160deg,#2a1438,#0f0616)' }
    ],
    shows: [
        { t: 'Severance', e: '🗂️', c: 'linear-gradient(160deg,#20242e,#0c0e12)' },
        { t: 'The Bear', e: '🔪', c: 'linear-gradient(160deg,#3a2412,#160e06)' },
        { t: 'Arcane', e: '🔧', c: 'linear-gradient(160deg,#122a3a,#061016)' },
        { t: 'Slow Horses', e: '🐎', c: 'linear-gradient(160deg,#2a2a2a,#101010)' },
        { t: 'Dark', e: '🕳️', c: 'linear-gradient(160deg,#141414,#040404)' },
        { t: 'Fleabag', e: '🍷', c: 'linear-gradient(160deg,#3a1224,#16060e)' },
        { t: 'Succession', e: '💼', c: 'linear-gradient(160deg,#242630,#0d0e14)' },
        { t: 'Better Call Saul', e: '⚖️', c: 'linear-gradient(160deg,#362818,#140e06)' },
        { t: 'Mr. Robot', e: '💻', c: 'linear-gradient(160deg,#122226,#050d0f)' },
        { t: 'Chernobyl', e: '☢️', c: 'linear-gradient(160deg,#262a1b,#0e1008)' },
        { t: 'Stranger Things', e: '🚲', c: 'linear-gradient(160deg,#33151b,#140508)' },
        { t: 'Shogun', e: '⛩️', c: 'linear-gradient(160deg,#2b1d16,#100a06)' }
    ],
    games: [
        { t: 'Elden Ring', e: '🗡️', c: 'linear-gradient(160deg,#2a2412,#100e04)' },
        { t: 'Hades', e: '🔥', c: 'linear-gradient(160deg,#3a1010,#160404)' },
        { t: 'Stardew Valley', e: '🌾', c: 'linear-gradient(160deg,#1c3a12,#0a1606)' },
        { t: "Baldur's Gate 3", e: '🎲', c: 'linear-gradient(160deg,#241c3a,#0c0a16)' },
        { t: 'Celeste', e: '🏔️', c: 'linear-gradient(160deg,#12243a,#040c16)' },
        { t: 'Hollow Knight', e: '🦋', c: 'linear-gradient(160deg,#1a1a2a,#060610)' },
        { t: 'Cyberpunk 2077', e: '🦾', c: 'linear-gradient(160deg,#383214,#141204)' },
        { t: 'Outer Wilds', e: '🪐', c: 'linear-gradient(160deg,#162b33,#061014)' },
        { t: 'Disco Elysium', e: '🪩', c: 'linear-gradient(160deg,#2e1e2d,#120912)' },
        { t: 'Portal 2', e: '🌀', c: 'linear-gradient(160deg,#142c38,#051016)' },
        { t: 'Sekiro', e: '🎋', c: 'linear-gradient(160deg,#2a1815,#100605)' },
        { t: 'Zelda: TotK', e: '🏹', c: 'linear-gradient(160deg,#162e24,#05140e)' }
    ]
};

function renderPreviewGrid(container, list, limit) {
    if (!container || !list) return;
    container.innerHTML = '';
    const items = limit ? list.slice(0, limit) : list;
    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'landing-preview-card';
        card.innerHTML = `
            <div class="landing-cover-box" style="background: ${item.c};">
                <span class="landing-cover-emoji">${item.e}</span>
                <span class="landing-cover-rank">#${index + 1}</span>
            </div>
            <div class="landing-cover-title" title="${item.t}">${item.t}</div>
        `;
        container.appendChild(card);
    });
}
// #endregion

// #region 3: LANDING SAYFA VE FORM YÖNETİCİSİ
function landingEkraniniBaslat() {
    // 1. Profil kartlarını mount et
    if (window.NookProfileCard) window.NookProfileCard.mountAll();

    // 2. DOM Elemanları
    const landingScreen = document.getElementById('landing-screen') || document.querySelector('.landing-screen');
    const landingBox = document.getElementById('main-landing-box');
    const mainTitle = document.getElementById('landing-main-title');
    const usernameInput = document.getElementById('landing-username');
    const emailInput = document.getElementById('landing-email');
    const passwordInput = document.getElementById('landing-password');
    const submitBtn = document.getElementById('landing-submit-btn');
    const switchText = document.getElementById('landing-switch-text');
    const switchBtn = document.getElementById('landing-switch-action');

    const mainForm = document.getElementById('landing-main-form');
    const forgotForm = document.getElementById('landing-forgot-form');
    const forgotTrigger = document.getElementById('landing-forgot-trigger');
    const forgotEmail = document.getElementById('landing-forgot-email');
    const forgotSubmitBtn = document.getElementById('landing-forgot-submit-btn');
    const forgotBackBtn = document.getElementById('landing-forgot-back-btn');
    const auxLinks = document.getElementById('landing-aux-links');

    const navUserMenu = document.getElementById('landing-user-menu');
    const navUserTrigger = document.getElementById('landing-user-trigger');
    const navDropdown = document.getElementById('landing-nav-dropdown');
    const navUserName = document.getElementById('landing-user-name');
    const navGoProfile = document.getElementById('landing-go-profile');
    const navLogoutBtn = document.getElementById('landing-logout-btn');

    const flipCardInner = document.getElementById('hero-flip-card');
    const visualWrapper = document.querySelector('.tilted-visual-wrapper');
    const heroLoginBtn = document.getElementById('hero-login-btn');
    const heroStartBtn = document.getElementById('hero-start-btn');
    const flipFrontTrigger = document.getElementById('flip-front-trigger');
    const flipBackBtn = document.getElementById('flip-back-btn');
    const finalStartBtn = document.getElementById('final-start-btn');

    let isLandingLoginMode = true;

    // 3. Yumuşak Kaydırma Yardımcısı
    function landingKaydir(hedefSecici) {
        const target = document.querySelector(hedefSecici);
        if (!target) return;
        if (landingScreen) {
            const targetRect = target.getBoundingClientRect();
            const screenRect = landingScreen.getBoundingClientRect();
            const topPos = targetRect.top - screenRect.top + landingScreen.scrollTop - 70;
            landingScreen.scrollTo({ top: Math.max(0, topPos), behavior: 'smooth' });
        } else {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // 4. Form Modu ve Kart Dönüş Yönetimi
    function flipToBack(targetMode) {
        if (flipCardInner && !flipCardInner.classList.contains('is-flipped')) {
            flipCardInner.classList.add('is-flipped');
            if (visualWrapper) visualWrapper.classList.add('is-flat');
            if (typeof turnstileWidgetiHazirla === 'function') {
                requestAnimationFrame(() => turnstileWidgetiHazirla('landing-turnstile'));
            }
        }
        if (targetMode === 'register' && isLandingLoginMode) {
            if (switchBtn) switchBtn.click();
        } else if (targetMode === 'login' && !isLandingLoginMode) {
            if (switchBtn) switchBtn.click();
        }
    }

    function flipToFront() {
        if (flipCardInner && flipCardInner.classList.contains('is-flipped')) {
            flipCardInner.classList.remove('is-flipped');
            if (visualWrapper) visualWrapper.classList.remove('is-flat');
        }
    }

    if (heroLoginBtn) {
        heroLoginBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            landingKaydir('#about');
            flipToBack('login');
        });
    }

    if (heroStartBtn) {
        heroStartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            flipToBack('register');
        });
    }

    if (flipFrontTrigger) {
        flipFrontTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            flipToBack(isLandingLoginMode ? 'login' : 'register');
        });
    }

    if (flipBackBtn) {
        flipBackBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            flipToFront();
        });
    }

    if (finalStartBtn) {
        finalStartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            landingKaydir('#about');
            setTimeout(() => {
                flipToBack('register');
            }, 300);
        });
    }

    // 5. Oturum Açıksa Navbar Kullanıcı Menüsü
    if (typeof aktifKullaniciOturumu !== 'undefined' && aktifKullaniciOturumu && typeof aktifKullaniciAdi !== 'undefined' && aktifKullaniciAdi) {
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

    // 6. Başlık Havuzları & Mod Değişimi
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
                if (submitBtn) submitBtn.textContent = 'Giriş Yap';
                if (switchText) switchText.textContent = 'Hesabın yok mu?';
                switchBtn.textContent = 'Kayıt Ol';
                if (usernameInput) usernameInput.value = '';
                if (auxLinks) auxLinks.style.display = 'flex';
            } else {
                if (landingBox) landingBox.classList.add('register-mode');
                if (mainTitle) mainTitle.textContent = rastgeleBaslikSec(registerBasliklari);
                if (submitBtn) submitBtn.textContent = 'Kayıt Ol';
                if (switchText) switchText.textContent = 'Zaten hesabın var mı?';
                switchBtn.textContent = 'Giriş Yap';
                if (auxLinks) auxLinks.style.display = 'none';
            }
        });
    }

    // 7. Şifremi Unuttum Formu
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

    // 8. Giriş / Kayıt Form Gönderimi
    if (submitBtn) {
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
    }

    if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (submitBtn) submitBtn.click();
            }
        });
    }

    // 9. Önizleme Sıralı Listeleri & Sekme Değişimi
    const previewTabs = document.getElementById('landingPreviewTabs');
    const previewGrid = document.getElementById('landingPreviewGrid');
    const miniTabs = document.getElementById('landingMiniTabs');
    const miniGrid = document.getElementById('landingMiniGrid');

    if (previewGrid) renderPreviewGrid(previewGrid, SHOWS_DATA.anime, 12);
    if (miniGrid) renderPreviewGrid(miniGrid, SHOWS_DATA.anime, 6);

    if (previewTabs && previewGrid) {
        previewTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.landing-tab-btn');
            if (!btn) return;
            previewTabs.querySelectorAll('.landing-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabKey = btn.dataset.tab;
            if (SHOWS_DATA[tabKey]) {
                renderPreviewGrid(previewGrid, SHOWS_DATA[tabKey], 12);
            }
        });
    }

    if (miniTabs && miniGrid) {
        miniTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.landing-tab-btn');
            if (!btn) return;
            miniTabs.querySelectorAll('.landing-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabKey = btn.dataset.tab;
            if (SHOWS_DATA[tabKey]) {
                renderPreviewGrid(miniGrid, SHOWS_DATA[tabKey], 6);
            }
        });
    }

    // 10. Navigasyon ve Footer Sayfa İçi Kaydırma
    document.querySelectorAll('.landing-nav-link, .landing-footer-col a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                landingKaydir(href);
            }
        });
    });

    const brandLink = document.querySelector('.landing-nav-brand');
    if (brandLink) {
        brandLink.addEventListener('click', (e) => {
            e.preventDefault();
            landingKaydir('#about');
        });
    }
}
// #endregion
