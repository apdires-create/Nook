// #region 1: SUPABASE KONFİGÜRASYONU VE GLOBAL DURUM
const SUPABASE_URL = 'https://acvpjytvkfxbsuiivqir.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_t5LYrH03nWrL1-tzhhXV4g_UF77mEAy';
const supabaseClient = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const urlParams = new URLSearchParams(window.location.search);
const KULLANICI_ADI = urlParams.get('user')?.trim() || null;

let aktifKullaniciOturumu = null;
let aktifKullaniciAdi = null;
let isOwner = false;
// #endregion

// #region 2: SABİT NAVİGASYON MENÜLERİ VE TAG HAVUZU
const SABIT_MENULER = [
    { id: "links", baslik: "Links" },
    { id: "trophies", baslik: "Trophies" },
    { id: "widgets", baslik: "Widgets" },
    { id: "working-on", baslik: "Working on" }
];

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
    kullanici_adi: "Evangeline Cassandra",
    front_data: {
        tags: ["Gamer", "Coder", "Stylist", "Music", "Sci-Fi", "Anime"],
        unvan: "Senior Software Engineer",
        aciklama: "Building expressive web systems, collecting minimalist digital artifacts, and wandering through neon rainy nights.",
        pfp_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop",
        banner_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop"
    },
    links: [
        {
            baslik: "YouTube",
            url: "https://youtube.com/@evangeline",
            renk: "#e50914",
            ikon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>`
        },
        {
            baslik: "GitHub",
            url: "https://github.com/evangeline",
            renk: "#24292e",
            ikon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`
        },
        {
            baslik: "X / Twitter",
            url: "https://x.com/evangeline",
            renk: "#1da1f2",
            ikon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`
        }
    ],
    tops: {
        aktifListeId: null,
        listeler: [
            {
                id: "list_default_1",
                kategori: "Favorite Movies",
                tur: "film",
                harici_link: { baslik: "Letterboxd Account →", url: "https://letterboxd.com" },
                ogeler: [
                    {
                        id: "top_default_1",
                        baslik: "Blade Runner 2049",
                        aciklama: "A visually mesmerizing cyberpunk masterpiece exploring humanity and memory.",
                        afis_url: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=300&auto=format&fit=crop"
                    },
                    {
                        id: "top_default_2",
                        baslik: "Interstellar",
                        aciklama: "Humanity's journey through love, spacetime, and gravity across distant stars.",
                        afis_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop"
                    },
                    {
                        id: "top_default_3",
                        baslik: "Her",
                        aciklama: "A poignant exploration of emotional connection in an increasingly digital world.",
                        afis_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300&auto=format&fit=crop"
                    }
                ]
            }
        ]
    },
    trophies: [],
    widgets: [],
    working_on: {
        metin: "Architecting Nook v2 with fixed 5:7 aspect ratio and drill-down navigation."
    },
    theme_config: {
        font: "inter",
        preset: "default",
        primary_color: "#3b5bdb"
    }
};
// #endregion
