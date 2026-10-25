// #region 1: SUPABASE KONFİGÜRASYONU VE GLOBAL DURUM
const SUPABASE_URL = 'https://acvpjytvkfxbsuiivqir.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_t5LYrH03nWrL1-tzhhXV4g_UF77mEAy';
const supabaseClient = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const urlParams = new URLSearchParams(window.location.search);

// Kullanıcı adını çözümler: Önce /@kullanici (Cloudflare/Clean Path), sonra ?user= (Geriye dönük / Yerel test)
function getKullaniciAdiFromUrl() {
    try {
        const path = window.location.pathname;
        const cleanPath = path.replace(/^\/Nook\/?/i, '/');
        const match = cleanPath.match(/^\/@([a-zA-Z0-9_]{3,20})(?:\/.*)?$/);
        if (match) {
            return match[1];
        }
    } catch (e) {}
    return urlParams.get('user')?.trim() || null;
}

const KULLANICI_ADI = getKullaniciAdiFromUrl();

function buildProfileUrl(username) {
    if (!username) return window.location.origin;
    const isSubfolder = window.location.pathname.startsWith('/Nook');
    const basePath = isSubfolder ? '/Nook/' : '/';
    return `${window.location.origin}${basePath}@${encodeURIComponent(username)}`;
}

let aktifKullaniciOturumu = null;
let aktifKullaniciAdi = null;
let isOwner = false;
// #endregion

// #region 2: TAG HAVUZU
const TAG_HAVUZU = [
    "Coder",
    "Developer",
    "Designer",
    "Gamer",
    "Music",
    "Stylist",
    "Sci-Fi",
    "Anime",
    "Minimalist",
    "Writer",
    "Artist",
    "Cyberpunk",
    "Photographer",
    "Reader",
    "Coffee",
    "Tech",
    "Open Source",
    "Student",
    "Indie",
    "Creator"
];
// #endregion

// #region 3: KART VERİSİ ŞABLONU (POSTGRESQL PROFILES TABLO ŞEMASIYLA BİREBİR UYUMLU)
let kartVerisi = {
    auth_id: null,
    kullanici_adi: "",
    front_data: {
        tags: [],
        unvan: "",
        aciklama: "",
        pfp_url: null,
        banner_url: null
    },
    links: [],
    tops: {
        aktifListeId: null,
        listeler: []
    },
    trophies: [],
    widgets: [],
    working_on: {
        metin: ""
    },
    theme_config: {
        font: "inter",
        preset: "default",
        primary_color: "#3b5bdb"
    },
    kullanici_notlari: {}
};
// #endregion
