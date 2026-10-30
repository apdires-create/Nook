/**
 * 🏆 NOOK ALFA — TROPHIES & BAŞARIMLAR YÖNETİM MOTORU (TrophiesManager)
 * 
 * Bu modül; oyun ve platform başarımlarının kataloğunu, dinamik favicon URL
 * çözücüsünü ve istemci tarafında (client-side) çalışan canlı API sorgulayıcılarını barındırır.
 * Sıfır backend bağımlılığı: Kullanıcı yalnızca nick/id bağlar; ziyaretçiler
 * canlı skorları (Aktif Elo, Peak Elo, WPM vb.) kendi tarayıcılarında çeker.
 */

const TrophiesManager = {
    // #region 1: DİNAMİK FAVICON SERVİSİ
    /**
     * Verilen resmi web sitesi domaini için yüksek çözünürlüklü favicon URL'i döndürür.
     * @param {string} domain Örn: "chess.com", "playvalorant.com"
     * @param {number} size İkon boyutu (varsayılan: 128)
     */
    getFaviconUrl(domain, size = 128) {
        if (!domain) return '';
        // Google S2 Favicon CDN (CORS serbest, ultra hızlı ve hafif)
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
    },
    // #endregion

    // #region 2: OYUN & BAŞARIM KATALOĞU (CATALOG)
    catalog: [
        {
            id: 'monkeytype',
            tur: 'monkeytype',
            baslik: 'Monkeytype Rekoru',
            alt: 'Canlı klavye yazma hızı (WPM) ve doğruluk skoru',
            domain: 'monkeytype.com',
            kategori: 'yazma',
            kategoriBaslik: 'Hız & Klavye',
            girdiTipi: 'username',
            girdiEtiket: 'Monkeytype Kullanıcı Adı',
            placeholder: 'kullanıcı_adı',
            ornek: 'miodec',
            comingSoon: false
        },
        {
            id: 'chess',
            tur: 'chess',
            baslik: 'Chess.com Satranç',
            alt: 'Rapid, Blitz ve Bullet canlı & peak (zirve) elo puanları',
            domain: 'chess.com',
            kategori: 'strateji',
            kategoriBaslik: 'Strateji & Zeka',
            girdiTipi: 'username',
            girdiEtiket: 'Chess.com Kullanıcı Adı',
            placeholder: 'kullanıcı_adı',
            ornek: 'hikaru',
            comingSoon: false
        },
        {
            id: 'valorant',
            tur: 'valorant',
            baslik: 'Valorant Rank & Peak',
            alt: 'Mevcut rekabetçi kademe, RR ve kariyer zirvesi',
            domain: 'playvalorant.com',
            kategori: 'fps',
            kategoriBaslik: 'FPS & Taktik',
            girdiTipi: 'riot_id',
            girdiEtiket: 'Riot ID (Ad#Tag)',
            placeholder: 'Oyuncu#TR1',
            ornek: 'TenZ#0505',
            comingSoon: true
        },
        {
            id: 'cs2',
            tur: 'cs2',
            baslik: 'Counter-Strike 2',
            alt: 'Premier puanı, Faceit Elo ve seviye vitrini',
            domain: 'counter-strike.net',
            kategori: 'fps',
            kategoriBaslik: 'FPS & Taktik',
            girdiTipi: 'steam_or_faceit',
            girdiEtiket: 'Faceit Nick veya SteamID',
            placeholder: 'oyuncu_nicki',
            ornek: 's1mple',
            comingSoon: true
        },
        {
            id: 'faceit',
            tur: 'faceit',
            baslik: 'FACEIT Espor',
            alt: 'CS2 rekabetçi lig seviyesi (1-10) ve güncel Elo puanı',
            domain: 'faceit.com',
            kategori: 'fps',
            kategoriBaslik: 'FPS & Taktik',
            girdiTipi: 'nickname',
            girdiEtiket: 'FACEIT Oyuncu Adı',
            placeholder: 'faceit_nicki',
            ornek: 'm0NESY',
            comingSoon: true
        },
        {
            id: 'lol',
            tur: 'lol',
            baslik: 'League of Legends',
            alt: 'Dereceli lig, LP ve en çok oynanan şampiyon verileri',
            domain: 'leagueoflegends.com',
            kategori: 'moba',
            kategoriBaslik: 'MOBA',
            girdiTipi: 'riot_id',
            girdiEtiket: 'Riot ID (Ad#Tag)',
            placeholder: 'Sihirdar#TR1',
            ornek: 'Faker#KR1',
            comingSoon: true
        },
        {
            id: 'tft',
            tur: 'tft',
            baslik: 'Teamfight Tactics (TFT)',
            alt: 'Mevcut kademe, LP ve ilk 4 bitirme oranı',
            domain: 'teamfighttactics.leagueoflegends.com',
            kategori: 'strateji',
            kategoriBaslik: 'Strateji & Zeka',
            girdiTipi: 'riot_id',
            girdiEtiket: 'Riot ID (Ad#Tag)',
            placeholder: 'Oyuncu#TR1',
            ornek: 'Dishsoap#NA1',
            comingSoon: true
        },
        {
            id: 'brawlhalla',
            tur: 'brawlhalla',
            baslik: 'Brawlhalla Elo',
            alt: 'Kişisel 1v1 elo puanı, sezon zirvesi ve ana efsane',
            domain: 'brawlhalla.com',
            kategori: 'dovus',
            kategoriBaslik: 'Dövüş & Platform',
            girdiTipi: 'brawlhalla_id',
            girdiEtiket: 'Brawlhalla ID veya Steam ID',
            placeholder: '12345678',
            ornek: 'Sandstorm',
            comingSoon: true
        },
        {
            id: 'osu',
            tur: 'osu',
            baslik: 'Osu! Ritim',
            alt: 'Global sıralama, Performans Puanı (PP) ve doğruluk oranı',
            domain: 'osu.ppy.sh',
            kategori: 'diger',
            kategoriBaslik: 'Diğer Platformlar',
            girdiTipi: 'username',
            girdiEtiket: 'Osu! Kullanıcı Adı',
            placeholder: 'oyuncu_adi',
            ornek: 'mrekk',
            comingSoon: true
        },
        {
            id: 'steam',
            tur: 'steam',
            baslik: 'Steam Koleksiyonu',
            alt: 'Steam rozetleri, seviye ve oyun koleksiyonu vitrini',
            domain: 'store.steampowered.com',
            kategori: 'diger',
            kategoriBaslik: 'Diğer Platformlar',
            girdiTipi: 'steam_id',
            girdiEtiket: 'Steam Profil Linki veya ID',
            placeholder: 'customURL veya 76561198...',
            ornek: 'gaben',
            comingSoon: true
        },
        {
            id: 'duolingo',
            tur: 'duolingo',
            baslik: 'Duolingo Streak',
            alt: 'Günlük dil öğrenme serisi (streak) ve toplam XP',
            domain: 'duolingo.com',
            kategori: 'diger',
            kategoriBaslik: 'Diğer Platformlar',
            girdiTipi: 'username',
            girdiEtiket: 'Duolingo Kullanıcı Adı',
            placeholder: 'kullanıcı_adı',
            ornek: 'duofan',
            comingSoon: true
        },
        {
            id: 'github',
            tur: 'github',
            baslik: 'GitHub Katkıları',
            alt: 'Açık kaynak commit serisi ve katkı istatistikleri',
            domain: 'github.com',
            kategori: 'diger',
            kategoriBaslik: 'Diğer Platformlar',
            girdiTipi: 'username',
            girdiEtiket: 'GitHub Kullanıcı Adı',
            placeholder: 'kullanıcı_adı',
            ornek: 'torvalds',
            comingSoon: true
        }
    ],

    /**
     * Kataloğu arama metnine göre anlık olarak filtreler.
     * @param {string} arama Arama metni
     */
    katalogFiltrele(arama = '') {
        const q = (arama || '').toLowerCase().trim();
        if (!q) return this.catalog;
        return this.catalog.filter(item => {
            return item.baslik.toLowerCase().includes(q)
                || item.alt.toLowerCase().includes(q)
                || item.id.toLowerCase().includes(q)
                || item.domain.toLowerCase().includes(q)
                || (item.kategoriBaslik && item.kategoriBaslik.toLowerCase().includes(q));
        });
    },

    /**
     * ID veya türüne göre katalogdaki öğeyi bulur.
     */
    katalogOgesiBul(idVeyaTur) {
        if (!idVeyaTur) return null;
        return this.catalog.find(c => c.id === idVeyaTur || c.tur === idVeyaTur) || null;
    },
    // #endregion

    // #region 3: CANLI İSTEMCİ API ÇEKİCİLERİ (CLIENT-SIDE AUTO-FETCH)
    /**
     * Canlı Monkeytype verilerini doğrudan kullanıcı tarayıcısından çeker.
     * @param {string} kullanici Monkeytype kullanıcı adı
     */
    async canliMonkeytypeVerisiCek(kullanici) {
        if (!kullanici) return null;
        try {
            const res = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(kullanici)}/profile`, {
                signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
            });
            if (res.ok) {
                const json = await res.json();
                if (json && json.data) {
                    return {
                        personalBests: json.data.personalBests || {},
                        typingStats: json.data.typingStats || null,
                        streak: json.data.streak || 0,
                        maxStreak: json.data.maxStreak || 0,
                        xp: json.data.xp || 0,
                        name: json.data.name || kullanici,
                        addedAt: json.data.addedAt || null,
                        ...(json.data.personalBests || {})
                    };
                }
            }
        } catch (err) {
            console.warn("Monkeytype profili API'den çekilemedi:", err);
        }
        return null;
    },

    /**
     * Canlı Chess.com verilerini (Rapid, Blitz, Bullet - Aktif & Peak Elo) doğrudan çeker.
     * @param {string} kullanici Chess.com kullanıcı adı
     */
    async canliChessVerisiCek(kullanici) {
        if (!kullanici) return null;
        try {
            const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(kullanici)}/stats`, {
                signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
            });
            if (res.ok) {
                const json = await res.json();
                if (json) {
                    return {
                        kullanici,
                        rapid: {
                            rating: json.chess_rapid?.last?.rating || null,
                            peak: json.chess_rapid?.best?.rating || null,
                            win: json.chess_rapid?.record?.win || 0,
                            loss: json.chess_rapid?.record?.loss || 0,
                            draw: json.chess_rapid?.record?.draw || 0
                        },
                        blitz: {
                            rating: json.chess_blitz?.last?.rating || null,
                            peak: json.chess_blitz?.best?.rating || null
                        },
                        bullet: {
                            rating: json.chess_bullet?.last?.rating || null,
                            peak: json.chess_bullet?.best?.rating || null
                        },
                        fide: json.fide || null
                    };
                }
            }
        } catch (err) {
            console.warn("Chess.com profili API'den çekilemedi:", err);
        }
        return null;
    },

    /**
     * Türüne göre uygun canlı veri çekiciyi çalıştırır.
     */
    async canliVeriCek(tur, kullanici) {
        if (!tur || !kullanici) return null;
        if (tur === 'monkeytype') {
            return await this.canliMonkeytypeVerisiCek(kullanici);
        } else if (tur === 'chess') {
            return await this.canliChessVerisiCek(kullanici);
        }
        return null;
    },

    /**
     * Sayfa yüklendiğinde kartVerisi.trophies içindeki tüm öğelerin canlı verilerini
     * asenkron ve paralel olarak sorgular.
     */
    async tumCanliVerileriYukle(kart) {
        if (!kart) return;
        if (!kart._canli_trophies) kart._canli_trophies = {};

        const trophies = Array.isArray(kart.trophies) ? kart.trophies : (kart.trophies?.monkeytype ? [kart.trophies.monkeytype] : []);
        if (trophies.length === 0) return;

        const sorgular = trophies.map(async (t) => {
            if (!t || !t.tur) return;
            const user = t.kullanici || t.username || t.ayarlar?.kullanici;
            if (!user) return;

            if (t.tur === 'monkeytype') {
                const skor = await this.canliMonkeytypeVerisiCek(user);
                if (skor) {
                    kart.canli_monkeytype = skor;
                    kart._canli_trophies.monkeytype = skor;
                }
            } else if (t.tur === 'chess') {
                const skor = await this.canliChessVerisiCek(user);
                if (skor) {
                    kart._canli_trophies.chess = skor;
                }
            }
        });

        await Promise.allSettled(sorgular);

        // Arayüzü güncelle
        if (typeof RenderEngine !== 'undefined' && typeof RenderEngine.trophiesCiz === 'function') {
            RenderEngine.trophiesCiz(kart);
        }
    }
    // #endregion
};

// Geriye dönük uyumluluk köprüsü
if (typeof window !== 'undefined') {
    window.TrophiesManager = TrophiesManager;
    window.canliMonkeytypeVerisiCek = (u) => TrophiesManager.canliMonkeytypeVerisiCek(u);
}
