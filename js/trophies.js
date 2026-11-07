/**
 * 🏆 NOOK ALFA — TROPHIES & BAŞARIMLAR EVRENSEL VERİ MOTORU (TrophiesManager)
 * 
 * Prensipler:
 * 1. Sıfır DB Şişmesi: Supabase yalnızca `{ tur, kullanici }` çiftini tutar.
 * 2. Evrensel Adapter Mimarisi: Her oyun yalnızca URL/Fetch ve 5 satırlık `map()` haritası tanımlar.
 * 3. Ortak Root Layout Şeması: Tüm oyunlar aynı normalize veri objesini üretir (Taşma %0).
 * 4. İstemci Önbelleği (sessionStorage): Tekrarlayan sekme/detay geçişlerinde sıfır ağ yükü.
 */

const TrophiesManager = {
    CACHE_PREFIX: 'nook_trophy_v2_',
    CACHE_TTL_MS: 15 * 60 * 1000, // 15 dakika

    // #region 1: DİNAMİK FAVICON & YARDIMCI SERVİSLER
    getFaviconUrl(domain, size = 128) {
        if (!domain) return '';
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
    },

    /**
     * Riot ID ("Oyuncu#TR1") metnini { name, tag, region, platform } olarak ayrıştırır.
     */
    parseRiotId(rawInput) {
        const clean = String(rawInput || '').trim();
        const parts = clean.split('#');
        const name = (parts[0] || '').trim();
        const tag = (parts[1] || 'TR1').trim().toUpperCase();

        const tagUpper = tag.toUpperCase();
        let valRegion = 'eu';
        let lolPlatform = 'tr1';
        let displayRegion = 'TR';

        if (tagUpper === 'NA1' || tagUpper === 'NA') {
            valRegion = 'na'; lolPlatform = 'na1'; displayRegion = 'NA';
        } else if (tagUpper === 'EUW' || tagUpper === 'EUW1') {
            valRegion = 'eu'; lolPlatform = 'euw1'; displayRegion = 'EUW';
        } else if (tagUpper === 'EUNE' || tagUpper === 'EUN1') {
            valRegion = 'eu'; lolPlatform = 'eun1'; displayRegion = 'EUNE';
        } else if (tagUpper === 'KR' || tagUpper === 'KR1') {
            valRegion = 'kr'; lolPlatform = 'kr'; displayRegion = 'KR';
        } else if (tagUpper === 'BR' || tagUpper === 'BR1') {
            valRegion = 'latam'; lolPlatform = 'br1'; displayRegion = 'BR';
        } else if (tagUpper === 'TR' || tagUpper === 'TR1') {
            valRegion = 'eu'; lolPlatform = 'tr1'; displayRegion = 'TR';
        }

        return {
            full: `${name}#${tag}`,
            name,
            tag,
            valRegion,
            lolPlatform,
            displayRegion
        };
    },

    /**
     * CORS kısıtlı açık web uçları için güvenli JSON çekici (Doğrudan -> AllOrigins -> CodeTabs yedekli)
     */
    async fetchJsonWithCorsFallback(targetUrl, timeoutMs = 7000) {
        const tryFetch = async (url) => {
            const res = await fetch(url, {
                signal: AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        };

        try {
            return await tryFetch(targetUrl);
        } catch {
            try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
                return await tryFetch(proxyUrl);
            } catch {
                return null;
            }
        }
    },
    // #endregion

    // #region 2: GAMING (REKABETÇİ OYUNLAR) & WIDGET KATALOĞU
    catalog: [
        {
            id: 'valorant',
            tur: 'valorant',
            baslik: 'Valorant',
            alt: 'Güncel rekabetçi kademe, RR puanı ve kariyer zirvesi (Peak)',
            domain: 'playvalorant.com',
            accent: '#ff4655',
            kategori: 'fps',
            kategoriBaslik: 'FPS & Taktik',
            girdiTipi: 'riot_id',
            girdiEtiket: 'Riot ID (Oyuncu#Tag)',
            placeholder: 'Oyuncu#TR1',
            ornek: 'TenZ#0505',
            comingSoon: false,
            tiers: [
                'Radiant', 'Immortal 3', 'Immortal 2', 'Immortal 1',
                'Ascendant 3', 'Ascendant 2', 'Ascendant 1',
                'Diamond 3', 'Diamond 2', 'Diamond 1',
                'Platinum 3', 'Platinum 2', 'Platinum 1',
                'Gold 3', 'Gold 2', 'Gold 1',
                'Silver', 'Bronze', 'Iron', 'Unranked'
            ]
        },
        {
            id: 'lol',
            tur: 'lol',
            baslik: 'League of Legends',
            alt: 'Tek/Çift dereceli lig kademesi, LP ve galibiyet oranı',
            domain: 'leagueoflegends.com',
            accent: '#c89b3c',
            kategori: 'moba',
            kategoriBaslik: 'MOBA',
            girdiTipi: 'riot_id',
            girdiEtiket: 'Riot ID (Sihirdar#Tag)',
            placeholder: 'Sihirdar#TR1',
            ornek: 'Faker#KR1',
            comingSoon: false,
            tiers: [
                'Challenger', 'Grandmaster', 'Master',
                'Diamond I', 'Diamond II', 'Diamond III', 'Diamond IV',
                'Emerald I', 'Emerald II', 'Emerald III', 'Emerald IV',
                'Platinum', 'Gold', 'Silver', 'Bronze', 'Iron', 'Unranked'
            ]
        },
        {
            id: 'cs2',
            tur: 'cs2',
            baslik: 'Counter-Strike 2',
            alt: 'CS2 Premier / FACEIT Elo ve rekabetçi profil vitrini',
            domain: 'counter-strike.net',
            accent: '#de9b35',
            kategori: 'fps',
            kategoriBaslik: 'FPS & Taktik',
            girdiTipi: 'nickname',
            girdiEtiket: 'FACEIT Nick veya Steam Künyesi',
            placeholder: 'oyuncu_nicki (Örn: s1mple)',
            ornek: 's1mple',
            comingSoon: false,
            tiers: [
                '30.000+ CS Rating', '25.000+ CS Rating', '20.000+ CS Rating',
                '15.000+ CS Rating', '10.000+ CS Rating', '5.000+ CS Rating',
                'Global Elite', 'Supreme (SMFC)', 'Legendary Eagle Master (LEM)',
                'Legendary Eagle (LE)', 'Distinguished Master Guardian (DMG)',
                'Master Guardian', 'Gold Nova', 'Silver', 'FACEIT Level 10'
            ]
        },
        {
            id: 'faceit',
            tur: 'faceit',
            baslik: 'FACEIT',
            alt: 'FACEIT rekabetçi lig seviyesi (1-10), güncel Elo ve maç istatistikleri',
            domain: 'faceit.com',
            accent: '#ff5500',
            kategori: 'fps',
            kategoriBaslik: 'FPS & Taktik',
            girdiTipi: 'nickname',
            girdiEtiket: 'FACEIT Oyuncu Nicki',
            placeholder: 'faceit_nicki (Örn: m0NESY)',
            ornek: 'm0NESY',
            comingSoon: false,
            tiers: [
                'Level 10 (2000+ Elo)', 'Level 9 (1751-2000)', 'Level 8 (1531-1750)',
                'Level 7 (1351-1530)', 'Level 6 (1201-1350)', 'Level 5 (1051-1200)',
                'Level 4 (901-1050)', 'Level 3 (751-900)', 'Level 2 (501-750)', 'Level 1 (100-500)'
            ]
        },
        {
            id: 'tft',
            tur: 'tft',
            baslik: 'Teamfight Tactics',
            alt: 'TFT dereceli lig kademesi, LP ve ilk 4 istatistikleri',
            domain: 'teamfighttactics.leagueoflegends.com',
            accent: '#f59f00',
            kategori: 'strateji',
            kategoriBaslik: 'Strateji & Taktik',
            girdiTipi: 'riot_id',
            girdiEtiket: 'Riot ID (Oyuncu#Tag)',
            placeholder: 'Oyuncu#TR1',
            ornek: 'Dishsoap#NA1',
            comingSoon: false,
            tiers: [
                'Challenger', 'Grandmaster', 'Master',
                'Diamond', 'Emerald', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Iron',
                'Hyper Tier (Hiper)'
            ]
        },
        {
            id: 'brawlhalla',
            tur: 'brawlhalla',
            baslik: 'Brawlhalla',
            alt: '1v1 Bireysel Elo, kariyer zirvesi (Peak) ve galibiyet istatistikleri',
            domain: 'brawlhalla.com',
            accent: '#3bc9db',
            kategori: 'dovus',
            kategoriBaslik: 'Dövüş & Platform',
            girdiTipi: 'brawlhalla_id',
            girdiEtiket: 'Brawlhalla ID veya Oyuncu Adı',
            placeholder: 'Brawlhalla ID veya Nick',
            ornek: 'Sandstorm',
            comingSoon: false,
            tiers: [
                'Valhallan', 'Diamond (2000+ Elo)', 'Platinum (1680-1999)',
                'Gold (1390-1679)', 'Silver (1100-1389)', 'Bronze', 'Tin'
            ]
        }
    ],

    // 3. Adımda kurulan Widgets kanadı kataloğu (Monkeytype, Chess.com, Duolingo, osu!)
    widgetCatalog: [
        {
            id: 'monkeytype',
            tur: 'monkeytype',
            baslik: 'Monkeytype',
            alt: 'Canlı klavye yazma hızı (WPM), doğruluk ve seri rekoru',
            domain: 'monkeytype.com',
            accent: '#e2b714',
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
            baslik: 'Chess.com',
            alt: 'Rapid, Blitz ve Bullet canlı & kariyer zirvesi (Peak) elo puanları',
            domain: 'chess.com',
            accent: '#81b64c',
            kategori: 'strateji',
            kategoriBaslik: 'Strateji & Zeka',
            girdiTipi: 'username',
            girdiEtiket: 'Chess.com Kullanıcı Adı',
            placeholder: 'kullanıcı_adı',
            ornek: 'hikaru',
            comingSoon: false
        },
        {
            id: 'lichess',
            tur: 'lichess',
            baslik: 'Lichess',
            alt: 'Açık kaynak satranç: Rapid, Blitz, Bullet ve Puzzle canlı eloları',
            domain: 'lichess.org',
            accent: '#ffffff',
            kategori: 'strateji',
            kategoriBaslik: 'Strateji & Zeka',
            girdiTipi: 'username',
            girdiEtiket: 'Lichess Kullanıcı Adı',
            placeholder: 'kullanıcı_adı',
            ornek: 'magnuscarlsen',
            comingSoon: false
        },
        {
            id: 'duolingo',
            tur: 'duolingo',
            baslik: 'Duolingo',
            alt: 'Günlük dil öğrenme serisi (streak 🔥), toplam XP ve aktif dil kursu',
            domain: 'duolingo.com',
            accent: '#58cc02',
            kategori: 'dil',
            kategoriBaslik: 'Alışkanlık & Dil',
            girdiTipi: 'username',
            girdiEtiket: 'Duolingo Kullanıcı Adı',
            placeholder: 'kullanıcı_adı',
            ornek: 'duofan',
            comingSoon: false,
            tiers: [
                '1000+ Gün Seri 🔥', '730+ Gün Seri (2 Yıl)', '365+ Gün Seri (1 Yıl)',
                '200+ Gün Seri', '100+ Gün Seri', '50+ Gün Seri', '30+ Gün Seri',
                'Elmas Lig (Diamond)', 'Obsidyen Lig', 'İnci Lig'
            ]
        },
        {
            id: 'osu',
            tur: 'osu',
            baslik: 'osu!',
            alt: 'Global sıralama, Performans Puanı (PP) ve doğruluk oranı',
            domain: 'osu.ppy.sh',
            accent: '#ff66aa',
            kategori: 'ritim',
            kategoriBaslik: 'Ritim & Yetenek',
            girdiTipi: 'username',
            girdiEtiket: 'osu! Kullanıcı Adı veya ID',
            placeholder: 'oyuncu_adi',
            ornek: 'mrekk',
            comingSoon: false,
            tiers: [
                'Top 100 Global', '3 Digit (#100 - #999)', '4 Digit (#1K - #9.9K)',
                '5 Digit (#10K - #99K)', '6 Digit', '15.000+ PP', '10.000+ PP',
                '7.500+ PP', '5.000+ PP', '3.000+ PP'
            ]
        }
    ],

    katalogFiltrele(arama = '', mode = 'gaming') {
        const kaynak = (mode === 'widgets') ? this.widgetCatalog : this.catalog;
        const q = (arama || '').toLowerCase().trim();
        if (!q) return kaynak;
        return kaynak.filter(item => {
            return item.baslik.toLowerCase().includes(q)
                || item.alt.toLowerCase().includes(q)
                || item.id.toLowerCase().includes(q)
                || item.domain.toLowerCase().includes(q)
                || (item.kategoriBaslik && item.kategoriBaslik.toLowerCase().includes(q));
        });
    },

    katalogOgesiBul(idVeyaTur) {
        if (!idVeyaTur) return null;
        return this.catalog.find(c => c.id === idVeyaTur || c.tur === idVeyaTur)
            || (this.widgetCatalog ? this.widgetCatalog.find(c => c.id === idVeyaTur || c.tur === idVeyaTur) : null)
            || null;
    },

    gamingKatalogOgesiBul(idVeyaTur) {
        if (!idVeyaTur) return null;
        return this.catalog.find(c => c.id === idVeyaTur || c.tur === idVeyaTur) || null;
    },

    widgetKatalogOgesiBul(idVeyaTur) {
        if (!idVeyaTur || !this.widgetCatalog) return null;
        return this.widgetCatalog.find(c => c.id === idVeyaTur || c.tur === idVeyaTur) || null;
    },

    /**
     * Kullanıcı girdisini oyun türüne göre doğrular ve temizler.
     */
    validateInput(tur, rawValue) {
        const item = this.katalogOgesiBul(tur);
        const val = String(rawValue || '').trim().replace(/^@/, '');
        if (!val) {
            return { ok: false, error: `Lütfen ${item?.girdiEtiket || 'oyuncu kimliği'} girin.` };
        }
        if (val.length > 42) {
            return { ok: false, error: 'Girdi çok uzun (en fazla 42 karakter).' };
        }

        if (item?.girdiTipi === 'riot_id') {
            if (!val.includes('#')) {
                return { ok: false, error: 'Lütfen Riot ID formatında girin (Örn: Oyuncu#TR1).' };
            }
            const [name, tag] = val.split('#');
            if (!name || !name.trim() || !tag || !tag.trim()) {
                return { ok: false, error: 'Geçerli bir Ad#Tag girin (Örn: Oyuncu#TR1).' };
            }
            return { ok: true, clean: `${name.trim()}#${tag.trim().toUpperCase()}` };
        }

        if (!/^[a-zA-Z0-9_.\-\s]{1,36}$/.test(val)) {
            return { ok: false, error: 'Geçersiz karakterler içeriyor.' };
        }
        return { ok: true, clean: val };
    },

    /**
     * Kart verisindeki aktif Gaming (rekabetçi oyun) öğelerini düz dizi olarak döndürür.
     * @returns {Array<{tur: string, kullanici: string, snap?: object}>}
     */
    aktifTrophyleriAl(kart) {
        if (!kart) return [];
        const sonuc = [];
        const gorulen = new Set();

        const ekle = (tur, kullanici, snap = null) => {
            if (!tur || !kullanici) return;
            const normTur = String(tur).trim().toLowerCase();
            const normUser = String(kullanici).trim();
            if (!normUser || gorulen.has(normTur)) return;
            // Yalnızca Gaming kataloğundaki rekabetçi oyunları kabul et
            if (!this.gamingKatalogOgesiBul(normTur)) return;
            gorulen.add(normTur);
            const kayit = { tur: normTur, kullanici: normUser };
            if (snap && typeof snap === 'object') kayit.snap = snap;
            sonuc.push(kayit);
        };

        // 1. Birincil kaynak: kart.gaming sütunu
        if (Array.isArray(kart.gaming)) {
            kart.gaming.flat(Infinity).forEach(g => {
                if (g && typeof g === 'object') {
                    ekle(g.tur || g.id, g.kullanici || g.username || g.ayarlar?.kullanici, g.snap);
                }
            });
        }

        // 2. Geriye dönük uyumluluk: kart.trophies içinde kalmış rekabetçi oyunlar varsa
        if (Array.isArray(kart.trophies)) {
            kart.trophies.flat(Infinity).forEach(t => {
                if (t && typeof t === 'object') {
                    ekle(t.tur || t.id, t.kullanici || t.username || t.ayarlar?.kullanici, t.snap);
                }
            });
        } else if (kart.trophies && typeof kart.trophies === 'object') {
            Object.entries(kart.trophies).forEach(([k, v]) => {
                if (v && typeof v === 'object') {
                    ekle(v.tur || k, v.kullanici || v.username || v.ayarlar?.kullanici, v.snap);
                }
            });
        }

        return sonuc;
    },

    aktifOyunlariAl(kart) {
        return this.aktifTrophyleriAl(kart);
    },

    /**
     * Kart verisindeki aktif Widgets (Monkeytype, Chess.com, Duolingo, osu!) öğelerini döndürür.
     * @returns {Array<{tur: string, kullanici: string, snap?: object}>}
     */
    aktifWidgetlariAl(kart) {
        if (!kart) return [];
        const sonuc = [];
        const gorulen = new Set();

        const ekle = (tur, kullanici, snap = null) => {
            if (!tur || !kullanici) return;
            const normTur = String(tur).trim().toLowerCase();
            const normUser = String(kullanici).trim();
            if (!normUser || gorulen.has(normTur)) return;
            if (!this.widgetKatalogOgesiBul(normTur)) return;
            gorulen.add(normTur);
            const kayit = { tur: normTur, kullanici: normUser };
            if (snap && typeof snap === 'object') kayit.snap = snap;
            sonuc.push(kayit);
        };

        if (Array.isArray(kart.widgets)) {
            kart.widgets.flat(Infinity).forEach(w => {
                if (w && typeof w === 'object') {
                    ekle(w.tur || w.id, w.kullanici || w.username || w.ayarlar?.kullanici, w.snap);
                }
            });
        }

        // Geriye dönük trophies içinde kalmış widget kayıtları
        if (Array.isArray(kart.trophies)) {
            kart.trophies.flat(Infinity).forEach(t => {
                if (t && typeof t === 'object') {
                    ekle(t.tur || t.id, t.kullanici || t.username || t.ayarlar?.kullanici, t.snap);
                }
            });
        }

        return sonuc;
    },
    // #endregion

    // #region 3: EVRENSEL VERİ MOTORU & ADAPTER HARİTALARI (MICRO-FOOTPRINT ADAPTERS)
    _cacheKey(tur, kullanici) {
        return `${this.CACHE_PREFIX}${tur}_${String(kullanici || '').toLowerCase().trim()}`;
    },

    _getCache(tur, kullanici) {
        try {
            const raw = sessionStorage.getItem(this._cacheKey(tur, kullanici));
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && parsed.ts && (Date.now() - parsed.ts < this.CACHE_TTL_MS)) {
                return parsed.data;
            }
        } catch {}
        return null;
    },

    _setCache(tur, kullanici, data) {
        if (!data) return;
        try {
            sessionStorage.setItem(this._cacheKey(tur, kullanici), JSON.stringify({
                ts: Date.now(),
                data
            }));
        } catch {}
    },

    ADAPTERS: {
        // 1. MONKEYTYPE (Doğrudan Açık API)
        monkeytype: {
            async fetch(kullanici) {
                const res = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(kullanici)}/profile`, {
                    signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
                });
                if (!res.ok) return null;
                const json = await res.json();
                if (!json?.data) return null;
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
            },
            map(d, kullanici) {
                const getBest = (mode, amount) => {
                    const pBests = d?.personalBests || d || {};
                    const arr = pBests?.[mode]?.[amount];
                    const item = Array.isArray(arr) ? arr[0] : null;
                    if (!item || !item.wpm) return { wpm: null, acc: null };
                    return { wpm: Math.round(item.wpm), acc: Math.round(item.acc || 0) };
                };

                const t15 = getBest('time', '15');
                const t30 = getBest('time', '30');
                const t60 = getBest('time', '60');
                const w25 = getBest('words', '25');

                const allWpms = [t15.wpm, t30.wpm, t60.wpm, w25.wpm].filter(Boolean);
                const peakWpm = allWpms.length > 0 ? Math.max(...allWpms) : null;
                const heroWpm = t15.wpm || t30.wpm || t60.wpm || peakWpm;

                const tests = d?.typingStats?.completedTests;
                const maxStreak = d?.maxStreak || d?.streak || 0;

                return {
                    handle: `@${kullanici}`,
                    badge: d?.streak ? `🔥 ${d.streak} Gün` : 'KLAVYE',
                    heroLabel: '15S HIZ SKORU',
                    heroValue: heroWpm ? `${heroWpm} WPM` : '—',
                    peakLabel: 'ZİRVE (PEAK)',
                    peakValue: peakWpm ? `${peakWpm} WPM` : '—',
                    summaryText: heroWpm ? `${heroWpm} WPM` : `@${kullanici}`,
                    stats: [
                        { label: '15 SANİYE', value: t15.wpm ? `${t15.wpm} WPM` : '—', sub: t15.acc ? `%${t15.acc} doğruluk` : 'Süre modu' },
                        { label: '60 SANİYE', value: t60.wpm ? `${t60.wpm} WPM` : '—', sub: t60.acc ? `%${t60.acc} doğruluk` : 'Dayanıklılık' },
                        { label: '25 KELİME', value: w25.wpm ? `${w25.wpm} WPM` : '—', sub: w25.acc ? `%${w25.acc} doğruluk` : 'Kelime modu' },
                        { label: 'BİTEN TEST', value: tests !== undefined ? Number(tests).toLocaleString('tr-TR') : '—', sub: maxStreak ? `Rekor seri: ${maxStreak} gün` : 'Toplam test' }
                    ],
                    profileUrl: `https://monkeytype.com/profile/${encodeURIComponent(kullanici)}`
                };
            }
        },

        // 2. CHESS.COM (Doğrudan Açık Pub API)
        chess: {
            async fetch(kullanici) {
                const clean = String(kullanici).trim().toLowerCase();
                const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(clean)}/stats`, {
                    signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
                });
                if (!res.ok) return null;
                return await res.json();
            },
            map(d, kullanici) {
                const rapid = d?.chess_rapid?.last?.rating || null;
                const rapidPeak = d?.chess_rapid?.best?.rating || rapid || null;
                const blitz = d?.chess_blitz?.last?.rating || null;
                const blitzPeak = d?.chess_blitz?.best?.rating || blitz || null;
                const bullet = d?.chess_bullet?.last?.rating || null;
                const bulletPeak = d?.chess_bullet?.best?.rating || bullet || null;
                const puzzlePeak = d?.tactics?.highest?.rating || null;

                // Aktif ana elo: Rapid -> Blitz -> Bullet sırasıyla mevcut olan
                let heroMode = 'RAPID ELO';
                let heroRating = rapid;
                if (!heroRating && blitz) { heroMode = 'BLITZ ELO'; heroRating = blitz; }
                else if (!heroRating && bullet) { heroMode = 'BULLET ELO'; heroRating = bullet; }

                // Kariyer zirvesi: Tüm modlar içindeki en yüksek best rating
                const peaks = [rapidPeak, blitzPeak, bulletPeak].filter(Boolean);
                const maxPeak = peaks.length > 0 ? Math.max(...peaks) : null;

                // Toplam galibiyet ve kazanma oranı
                const w = (d?.chess_rapid?.record?.win || 0) + (d?.chess_blitz?.record?.win || 0) + (d?.chess_bullet?.record?.win || 0);
                const l = (d?.chess_rapid?.record?.loss || 0) + (d?.chess_blitz?.record?.loss || 0) + (d?.chess_bullet?.record?.loss || 0);
                const dr = (d?.chess_rapid?.record?.draw || 0) + (d?.chess_blitz?.record?.draw || 0) + (d?.chess_bullet?.record?.draw || 0);
                const totalGames = w + l + dr;
                const winRate = totalGames > 0 ? Math.round((w / totalGames) * 100) : null;

                return {
                    handle: `@${kullanici}`,
                    badge: d?.fide ? `FIDE ${d.fide}` : 'SATRANÇ',
                    heroLabel: heroMode,
                    heroValue: heroRating ? `${heroRating}` : '—',
                    peakLabel: 'ZİRVE (PEAK)',
                    peakValue: maxPeak ? `${maxPeak} ELO` : '—',
                    summaryText: heroRating ? `${heroRating} ELO` : `@${kullanici}`,
                    stats: [
                        { label: 'RAPID ELO', value: rapid ? `${rapid}` : '—', sub: rapidPeak ? `Zirve: ${rapidPeak}` : 'Derecesiz' },
                        { label: 'BLITZ ELO', value: blitz ? `${blitz}` : '—', sub: blitzPeak ? `Zirve: ${blitzPeak}` : 'Derecesiz' },
                        { label: 'BULLET ELO', value: bullet ? `${bullet}` : '—', sub: bulletPeak ? `Zirve: ${bulletPeak}` : 'Derecesiz' },
                        { label: 'GALİBİYET', value: totalGames > 0 ? `${w.toLocaleString('tr-TR')}` : (puzzlePeak ? `${puzzlePeak}` : '—'), sub: winRate !== null ? `%${winRate} kazanma (${totalGames} maç)` : 'Bulmaca Zirvesi' }
                    ],
                    profileUrl: `https://www.chess.com/member/${encodeURIComponent(kullanici)}`
                };
            }
        },

        // 2.1 LICHESS (Doğrudan Açık REST API - Sıfır Auth)
        lichess: {
            async fetch(kullanici) {
                const clean = String(kullanici).trim().toLowerCase().replace(/^@/, '');
                try {
                    const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(clean)}`, {
                        signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
                    });
                    if (!res.ok) return null;
                    return await res.json();
                } catch {
                    return null;
                }
            },
            map(d, kullanici) {
                const clean = String(kullanici).trim().replace(/^@/, '');
                const perfs = d?.perfs || {};
                const rapid = perfs.rapid?.rating || null;
                const blitz = perfs.blitz?.rating || null;
                const bullet = perfs.bullet?.rating || null;
                const puzzle = perfs.puzzle?.rating || null;

                let heroMode = 'RAPID ELO';
                let heroRating = rapid;
                if (!heroRating && blitz) { heroMode = 'BLITZ ELO'; heroRating = blitz; }
                else if (!heroRating && bullet) { heroMode = 'BULLET ELO'; heroRating = bullet; }

                const ratings = [rapid, blitz, bullet].filter(Boolean);
                const maxRating = ratings.length > 0 ? Math.max(...ratings) : null;
                const totalGames = d?.count?.all || 0;

                return {
                    handle: `@${d?.username || clean}`,
                    badge: d?.title ? `${d.title} • LICHESS` : 'LICHESS',
                    heroLabel: heroMode,
                    heroValue: heroRating ? `${heroRating}` : '—',
                    peakLabel: 'EN YÜKSEK',
                    peakValue: maxRating ? `${maxRating} ELO` : '—',
                    summaryText: heroRating ? `${heroRating} ELO` : `@${clean}`,
                    stats: [
                        { label: 'RAPID ELO', value: rapid ? `${rapid}` : '—', sub: perfs.rapid?.games ? `${perfs.rapid.games} maç` : 'Dereceli' },
                        { label: 'BLITZ ELO', value: blitz ? `${blitz}` : '—', sub: perfs.blitz?.games ? `${perfs.blitz.games} maç` : 'Dereceli' },
                        { label: 'BULLET ELO', value: bullet ? `${bullet}` : '—', sub: perfs.bullet?.games ? `${perfs.bullet.games} maç` : 'Dereceli' },
                        { label: 'BULMACA (PUZZLE)', value: puzzle ? `${puzzle}` : '—', sub: totalGames > 0 ? `${totalGames} maç oynandı` : 'Taktik' }
                    ],
                    profileUrl: `https://lichess.org/@/${encodeURIComponent(d?.username || clean)}`
                };
            }
        },

        // 3. FACEIT / CS2 (Açık Web API + CORS Yedekli)
        faceit: {
            async fetch(kullanici) {
                const nick = String(kullanici).trim();
                const url = `https://www.faceit.com/api/users/v1/nicknames/${encodeURIComponent(nick)}`;
                const json = await TrophiesManager.fetchJsonWithCorsFallback(url);
                return json?.payload || null;
            },
            map(d, kullanici) {
                // Hem Edge Function çıktısını ({ level, elo, region, nickname })
                // hem de doğrudan FACEIT API payload çıktısını ({ games: { cs2: ... } }) destekler
                const cs2 = d?.games?.cs2 || d?.games?.csgo || null;
                const elo = d?.elo ?? cs2?.faceit_elo ?? null;
                const lvl = d?.level ?? cs2?.skill_level ?? null;
                const region = d?.region || cs2?.region || d?.country?.toUpperCase() || 'EU';
                const nick = d?.nickname || d?.name || kullanici;

                return {
                    handle: nick,
                    badge: `BÖLGE: ${region}`,
                    heroLabel: 'GÜNCEL FACEIT ELO',
                    heroValue: elo ? `${elo} ELO` : (lvl ? `SEVİYE ${lvl}` : 'Profilli Oyuncu'),
                    peakLabel: 'SEVİYE (LEVEL)',
                    peakValue: lvl ? `SEVİYE ${lvl}` : (elo ? `${elo} ELO` : 'CS2'),
                    summaryText: elo ? `Lvl ${lvl || '?'} • ${elo} ELO` : nick,
                    stats: [
                        { label: 'FACEIT SEVİYESİ', value: lvl ? `Level ${lvl} / 10` : '—', sub: 'Rekabetçi Kademe' },
                        { label: 'AKTİF ELO', value: elo ? `${elo} ELO` : '—', sub: 'CS2 Eşleştirme' },
                        { label: 'BÖLGE / ÜLKE', value: region, sub: d?.country ? d.country.toUpperCase() : 'Uluslararası' },
                        { label: 'PLATFORM DURUMU', value: d?.verified ? 'Doğrulanmış' : 'Aktif', sub: 'FACEIT Rekabetçi' }
                    ],
                    profileUrl: `https://www.faceit.com/en/players/${encodeURIComponent(nick)}`
                };
            }
        },

        // 4. CS2 (FACEIT motorunu paylaşır)
        cs2: {
            async fetch(kullanici) {
                return await TrophiesManager.ADAPTERS.faceit.fetch(kullanici);
            },
            map(d, kullanici) {
                const mapped = TrophiesManager.ADAPTERS.faceit.map(d, kullanici);
                mapped.heroLabel = 'CS2 REKABETÇİ ELO';
                return mapped;
            }
        },

        // 5. VALORANT (Edge Function veya HenrikDev v2 API)
        valorant: {
            async fetch(kullanici) {
                const parsed = TrophiesManager.parseRiotId(kullanici);
                if (!parsed.name || !parsed.tag) return null;
                const url = `https://api.henrikdev.xyz/valorant/v2/mmr/${parsed.valRegion}/${encodeURIComponent(parsed.name)}/${encodeURIComponent(parsed.tag)}`;
                const json = await TrophiesManager.fetchJsonWithCorsFallback(url);
                return json?.data || null;
            },
            map(d, kullanici) {
                const parsed = TrophiesManager.parseRiotId(kullanici);
                // Hem Edge Function formatı ({ currentRank, currentRR, peakRank, elo })
                // hem de doğrudan HenrikDev API formatı ({ current_data, highest_rank })
                const curTier = d?.currentRank || d?.current_data?.currenttierpatched || null;
                const rr = d?.currentRR !== undefined ? d.currentRR : d?.current_data?.ranking_in_tier;
                const mmr = d?.elo !== undefined ? d.elo : (d?.current_data?.elo || null);
                const lastChange = d?.current_data?.mmr_change_to_last_game;
                const peakTier = d?.peakRank || d?.highest_rank?.patched_tier || curTier || null;
                const peakSeason = d?.peakSeason || (d?.highest_rank?.season ? d.highest_rank.season.toUpperCase() : null);

                const tierWithRr = curTier ? (rr !== undefined && rr !== null ? `${curTier} (${rr} RR)` : curTier) : 'Riot ID Bağlı';

                return {
                    handle: parsed.full,
                    badge: `${(d?.region || parsed.valRegion).toUpperCase()} • RIOT`,
                    heroLabel: 'GÜNCEL KADEME (RANK)',
                    heroValue: curTier || 'Riot ID Bağlı',
                    heroSub: rr !== undefined && rr !== null ? `${rr} RR` : 'Valorant Rekabetçi',
                    peakLabel: 'KARİYER ZİRVESİ',
                    peakValue: peakTier || `#${parsed.tag}`,
                    summaryText: curTier ? `${curTier}${rr !== undefined ? ` (${rr} RR)` : ''}` : parsed.full,
                    stats: [
                        { label: 'KADEME PUANI', value: rr !== undefined && rr !== null ? `${rr} RR` : '—', sub: curTier || 'Rekabetçi Mod' },
                        { label: 'KARİYER ZİRVESİ', value: peakTier || '—', sub: peakSeason ? `Sezon: ${peakSeason}` : 'Tüm Zamanlar' },
                        { label: 'TOPLAM MMR / ELO', value: mmr ? `${mmr}` : '—', sub: 'Eşleştirme Puanı' },
                        { label: 'SON MAÇ DEĞİŞİMİ', value: lastChange !== undefined && lastChange !== null ? `${lastChange > 0 ? '+' : ''}${lastChange} RR` : (d?.region || parsed.displayRegion), sub: 'Rekabetçi Güncelleme' }
                    ],
                    profileUrl: `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(parsed.full)}/overview`
                };
            }
        },

        // 6. LEAGUE OF LEGENDS (Riot ID -> Tek/Çift & Esnek Ayrımı)
        lol: {
            async fetch(kullanici) {
                const parsed = TrophiesManager.parseRiotId(kullanici);
                return { parsed };
            },
            map(d, kullanici) {
                const parsed = d?.parsed || TrophiesManager.parseRiotId(kullanici);
                const region = d?.region || parsed.displayRegion || 'TR';

                // Solo ve Flex verileri
                const solo = d?.solo || (d?.activeQueue === 'solo' ? d : null);
                const flex = d?.flex || (d?.activeQueue === 'flex' ? d : null);

                // Kullanıcının tercihi (snap.secilenKuyruk) veya otomatik öncelik
                const secilen = d?.secilenKuyruk || d?.kuyruk || (solo?.tier ? 'solo' : (flex?.tier ? 'flex' : 'solo'));
                const activeQueue = (secilen === 'flex' && flex) ? flex : (solo || flex || d);
                const isFlex = secilen === 'flex' && Boolean(flex);

                const displayRank = activeQueue?.tier || d?.tier || 'Derecesiz (Unranked)';
                const lp = activeQueue?.lp || d?.lp || null;
                const wr = activeQueue?.winrate || d?.winrate || null;
                const peak = d?.peak || (displayRank !== 'Derecesiz (Unranked)' ? displayRank : `#${parsed.tag}`);

                // Stat kutucuklarında hem Solo hem Flex aynı anda sergilenir!
                const soloText = solo?.tier ? `${solo.tier}${solo.lp ? ` (${solo.lp})` : ''}` : 'Derecesiz';
                const flexText = flex?.tier ? `${flex.tier}${flex.lp ? ` (${flex.lp})` : ''}` : 'Derecesiz';

                return {
                    handle: parsed.full,
                    badge: `${region} • RIOT`,
                    heroLabel: isFlex ? 'ESNEK (FLEX) DERECELİ' : 'TEK / ÇİFT DERECELİ',
                    heroValue: displayRank,
                    heroSub: lp ? `${lp}${wr && wr !== '—' ? ` • %${wr} WR` : ''}` : 'League of Legends',
                    peakLabel: 'ZİRVE (PEAK)',
                    peakValue: peak,
                    summaryText: displayRank !== 'Derecesiz (Unranked)' ? `${displayRank}${lp ? ` (${lp})` : ''}` : parsed.full,
                    stats: [
                        { label: 'TEK / ÇİFT (SOLO)', value: soloText, sub: solo?.winrate && solo.winrate !== '—' ? `%${solo.winrate} galibiyet` : 'Solo/Duo Kuyruğu' },
                        { label: 'ESNEK (FLEX)', value: flexText, sub: flex?.winrate && flex.winrate !== '—' ? `%${flex.winrate} galibiyet` : 'Flex 5v5 Kuyruğu' },
                        { label: 'SUNUCU BÖLGESİ', value: region, sub: 'Resmi Riot Sunucusu' },
                        { label: 'SİHİRDAR KİMLİĞİ', value: parsed.name, sub: `Etiket: #${parsed.tag}` }
                    ],
                    profileUrl: `https://www.op.gg/summoners/${region.toLowerCase().replace(/[0-9]/g, '') || 'tr'}/${encodeURIComponent(parsed.name)}-${encodeURIComponent(parsed.tag)}`
                };
            }
        },

        // 7. TEAMFIGHT TACTICS (TFT - Standart & Muhteşem İkili)
        tft: {
            async fetch(kullanici) {
                const parsed = TrophiesManager.parseRiotId(kullanici);
                return { parsed };
            },
            map(d, kullanici) {
                const parsed = d?.parsed || TrophiesManager.parseRiotId(kullanici);
                const region = d?.region || parsed.displayRegion || 'TR';

                const standard = d?.standard || (d?.activeQueue === 'standard' ? d : null);
                const doubleUp = d?.doubleUp || (d?.activeQueue === 'double' ? d : null);

                const secilen = d?.secilenKuyruk || d?.kuyruk || (standard?.tier ? 'standard' : (doubleUp?.tier ? 'double' : 'standard'));
                const activeQueue = (secilen === 'double' && doubleUp) ? doubleUp : (standard || doubleUp || d);
                const isDouble = secilen === 'double' && Boolean(doubleUp);

                const displayRank = activeQueue?.tier || d?.tier || 'Derecesiz (Unranked)';
                const lp = activeQueue?.lp || d?.lp || null;
                const wr = activeQueue?.winrate || d?.winrate || null;
                const peak = d?.peak || (displayRank !== 'Derecesiz (Unranked)' ? displayRank : `#${parsed.tag}`);

                const standardText = standard?.tier ? `${standard.tier}${standard.lp ? ` (${standard.lp})` : ''}` : 'Derecesiz';
                const doubleText = doubleUp?.tier ? `${doubleUp.tier}${doubleUp.lp ? ` (${doubleUp.lp})` : ''}` : 'Derecesiz';

                return {
                    handle: parsed.full,
                    badge: `TFT • ${region}`,
                    heroLabel: isDouble ? 'MUHTEŞEM İKİLİ (DOUBLE UP)' : 'TFT DERECELİ KADEME',
                    heroValue: displayRank,
                    heroSub: lp ? `${lp}${wr && wr !== '—' ? ` • %${wr} WR` : ''}` : 'Strateji Modu',
                    peakLabel: 'ZİRVE (PEAK)',
                    peakValue: peak,
                    summaryText: displayRank !== 'Derecesiz (Unranked)' ? `${displayRank}${lp ? ` (${lp})` : ''}` : parsed.full,
                    stats: [
                        { label: 'STANDART DERECELİ', value: standardText, sub: standard?.winrate && standard.winrate !== '—' ? `%${standard.winrate} galibiyet` : 'TFT Ranked Solo' },
                        { label: 'İKİLİ (DOUBLE UP)', value: doubleText, sub: doubleUp?.winrate && doubleUp.winrate !== '—' ? `%${doubleUp.winrate} galibiyet` : 'TFT 2v2 Modu' },
                        { label: 'SUNUCU BÖLGESİ', value: region, sub: 'Riot Resmi' },
                        { label: 'STRATEJİST', value: parsed.name, sub: `Etiket: #${parsed.tag}` }
                    ],
                    profileUrl: `https://lolchess.gg/profile/${region.toLowerCase().replace(/[0-9]/g, '') || 'tr'}/${encodeURIComponent(parsed.name)}-${encodeURIComponent(parsed.tag)}`
                };
            }
        },

        // 8. BRAWLHALLA
        brawlhalla: {
            async fetch(kullanici) {
                return { id: String(kullanici).trim() };
            },
            map(d, kullanici) {
                const clean = String(kullanici).trim();
                const isNumericId = /^\d+$/.test(clean);
                const ratingVal = d?.rating ? `${d.rating} ELO` : (d?.tier || clean);
                const peakVal = d?.peakRating ? `${d.peakRating} ELO` : (d?.peak ? `${d.peak} ELO` : 'Ranked');
                return {
                    handle: isNumericId ? `ID #${clean}` : clean,
                    badge: '1v1 RANKED',
                    heroLabel: 'BRAWLHALLA 1V1',
                    heroValue: ratingVal,
                    peakLabel: 'ZİRVE (PEAK)',
                    peakValue: peakVal,
                    summaryText: ratingVal,
                    stats: [
                        { label: 'AKTİF KADEME', value: d?.tier || ratingVal, sub: '1v1 Solo Dereceli' },
                        { label: 'ZİRVE ELO', value: peakVal, sub: 'Kariyer Rekoru' },
                        { label: 'OYUNCU KİMLİĞİ', value: clean, sub: isNumericId ? 'Brawlhalla ID' : 'Oyuncu Adı' },
                        { label: 'SIRALAMA', value: 'Corehalla', sub: 'Detaylı Efsane İstatistiği' }
                    ],
                    profileUrl: isNumericId
                        ? `https://corehalla.com/stats/player/${encodeURIComponent(clean)}`
                        : `https://www.brawlhalla.com/rankings/game/all/1v1/`
                };
            }
        },

        // 9. DUOLINGO
        duolingo: {
            async fetch(kullanici) {
                const clean = String(kullanici || '').trim().replace(/^@/, '');
                try {
                    const url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(clean)}`;
                    const json = await TrophiesManager.fetchJsonWithCorsFallback(url);
                    const u = Array.isArray(json?.users) ? json.users[0] : null;
                    if (u) {
                        const courses = Array.isArray(u.courses) ? u.courses : [];
                        const topCourse = courses.sort((a, b) => (b.xp || 0) - (a.xp || 0))[0];
                        return {
                            username: u.username || clean,
                            streak: u.streak ?? 0,
                            totalXp: u.totalXp ?? 0,
                            topLang: topCourse?.title || u.learningLanguage || 'Dil',
                            topLangXp: topCourse?.xp ?? 0,
                            coursesCount: courses.length
                        };
                    }
                } catch {}
                return null;
            },
            map(d, kullanici) {
                const clean = String(kullanici || '').trim().replace(/^@/, '');
                const streakStr = (d && d.streak != null) ? `${d.streak} Gün 🔥` : '—';
                const xpStr = (d && d.totalXp != null) ? `${Number(d.totalXp).toLocaleString('tr-TR')} XP` : '—';
                return {
                    handle: `@${clean}`,
                    badge: 'STREAK',
                    heroLabel: 'GÜNLÜK SERİ',
                    heroValue: streakStr,
                    heroSub: d?.topLang ? `Aktif: ${d.topLang}` : 'Dil Pratiği',
                    peakLabel: 'TOPLAM XP',
                    peakValue: xpStr,
                    peakSub: d?.coursesCount ? `${d.coursesCount} Dil Kursu` : 'Kariyer XP',
                    summaryText: streakStr !== '—' ? streakStr : `@${clean}`,
                    stats: [
                        { label: 'AKTİF SERİ', value: streakStr, sub: 'Kesintisiz Gün' },
                        { label: 'TOPLAM XP', value: xpStr, sub: 'Tüm Zamanlar' },
                        { label: 'ANA DİL KURSU', value: d?.topLang || '—', sub: d?.topLangXp ? `${Number(d.topLangXp).toLocaleString('tr-TR')} XP` : 'Öğreniliyor' },
                        { label: 'KURS SAYISI', value: d?.coursesCount ? `${d.coursesCount} Dil` : '—', sub: 'Duolingo Profili' }
                    ],
                    profileUrl: `https://www.duolingo.com/profile/${encodeURIComponent(clean)}`
                };
            }
        },

        // 10. OSU!
        osu: {
            async fetch(kullanici) {
                return null;
            },
            map(d, kullanici) {
                const clean = String(kullanici || '').trim().replace(/^@/, '');
                const ppStr = d?.pp ? `${Number(d.pp).toLocaleString('tr-TR')} PP` : '—';
                const rankStr = d?.globalRank ? `#${Number(d.globalRank).toLocaleString('tr-TR')}` : ppStr;
                const peakStr = d?.peakRank ? `#${Number(d.peakRank).toLocaleString('tr-TR')}` : rankStr;
                return {
                    handle: `@${d?.username || clean}`,
                    badge: 'OSU! STD',
                    heroLabel: 'PERFORMANS / RANK',
                    heroValue: ppStr !== '—' ? ppStr : rankStr,
                    heroSub: d?.globalRank ? `Global ${rankStr}` : 'Ritim & Aim',
                    peakLabel: 'ZİRVE SIRALAMA',
                    peakValue: peakStr,
                    peakSub: d?.countryRank ? `${d.country || 'Ülke'} #${Number(d.countryRank).toLocaleString('tr-TR')}` : 'Kariyer Zirvesi',
                    summaryText: ppStr !== '—' ? ppStr : `@${clean}`,
                    stats: [
                        { label: 'PERFORMANS (PP)', value: ppStr, sub: 'Toplam PP' },
                        { label: 'GLOBAL RANK', value: rankStr, sub: peakStr !== '—' ? `Peak: ${peakStr}` : 'Dünya Sıralaması' },
                        { label: 'DOĞRULUK (ACC)', value: d?.accuracy || '—', sub: 'Hit Accuracy' },
                        { label: 'OYUN SAYISI', value: d?.playCount ? Number(d.playCount).toLocaleString('tr-TR') : '—', sub: 'Play Count' }
                    ],
                    profileUrl: `https://osu.ppy.sh/users/${encodeURIComponent(clean)}`
                };
            }
        }
    },

    /**
     * Herhangi bir oyun için ham veriyi ve kaydedilmiş mikro-snapshot'ı (snap)
     * Evrensel Root Layout şemasına dönüştürür.
     */
    getNormalizedTrophyData(tur, kullanici, rawData = null, snap = null) {
        const meta = this.katalogOgesiBul(tur) || {
            id: tur,
            tur: tur,
            baslik: tur.toUpperCase(),
            domain: `${tur}.com`,
            accent: '#3b5bdb'
        };
        const adapter = this.ADAPTERS[tur];
        let mergedRaw = rawData;
        if (snap && snap.kuyruk) {
            mergedRaw = { ...(rawData || {}), secilenKuyruk: snap.kuyruk };
        }
        const mapped = adapter && typeof adapter.map === 'function'
            ? adapter.map(mergedRaw, kullanici)
            : {
                handle: `@${kullanici}`,
                badge: 'AKTİF',
                heroLabel: 'DERECE',
                heroValue: '—',
                peakLabel: 'ZİRVE',
                peakValue: '—',
                summaryText: `@${kullanici}`,
                stats: [],
                profileUrl: `https://${meta.domain}`
            };

        const isPlaceholderVal = (v) => !v || v === '—' || v === 'Profil Bağlı' || v === 'FACEIT' || v === 'CS2' || v === 'Ranked 1v1' || v === 'Belirtilmedi' || String(v).includes('Derecesiz') || String(v).startsWith('#');

        // Snapshot (veya kullanıcı tarafından onaylanmış Aktif/Peak kademesi) birleştirmesi
        if (snap && typeof snap === 'object') {
            if (snap.aktif && (snap.manualAktif || isPlaceholderVal(mapped.heroValue))) {
                mapped.heroValue = snap.aktif;
            }
            if (snap.aktifAlt && isPlaceholderVal(mapped.heroSub)) {
                mapped.heroSub = snap.aktifAlt;
            }
            if (snap.peak && (snap.manualPeak || isPlaceholderVal(mapped.peakValue) || mapped.peakValue === mapped.heroValue)) {
                mapped.peakValue = snap.peak;
            }
            // Stat grid içindeki eksik ilk kademe ve zirve kutularını da doldur
            if (Array.isArray(mapped.stats)) {
                if (mapped.stats[0] && isPlaceholderVal(mapped.stats[0].value) && mapped.heroValue && !isPlaceholderVal(mapped.heroValue)) {
                    mapped.stats[0] = { ...mapped.stats[0], value: mapped.heroValue };
                }
                if (mapped.stats[1] && isPlaceholderVal(mapped.stats[1].value) && mapped.peakValue && !isPlaceholderVal(mapped.peakValue)) {
                    mapped.stats[1] = { ...mapped.stats[1], value: mapped.peakValue };
                }
            }
        }

        // Eğer Peak hâlâ boşsa ama Aktif derece biliniyorsa Peak olarak en azından Aktif dereceyi göster
        if (isPlaceholderVal(mapped.peakValue) && !isPlaceholderVal(mapped.heroValue)) {
            mapped.peakValue = mapped.heroValue;
        }

        return {
            tur: meta.tur,
            baslik: meta.baslik,
            alt: meta.alt,
            domain: meta.domain,
            accent: meta.accent || '#3b5bdb',
            faviconUrl: this.getFaviconUrl(meta.domain, 128),
            kullanici,
            ...mapped
        };
    },

    /**
     * Canlı veriden ve opsiyonel manuel kademe seçimlerinden hafif (60 byte) bir snapshot üretir.
     */
    buildSnapshot(tur, kullanici, rawData = null, manualAktif = '', manualPeak = '', kuyruk = '') {
        const norm = this.getNormalizedTrophyData(tur, kullanici, rawData, null);
        const isPlaceholderVal = (v) => !v || v === '—' || v === 'Profil Bağlı' || v === 'FACEIT' || v === 'CS2' || v === 'Ranked 1v1' || v === 'Belirtilmedi' || String(v).includes('Derecesiz') || String(v).startsWith('#');

        const cleanManualAktif = String(manualAktif || '').trim();
        const cleanManualPeak = String(manualPeak || '').trim();

        const aktif = cleanManualAktif || (!isPlaceholderVal(norm.heroValue) ? norm.heroValue : '');
        const peak = cleanManualPeak || (!isPlaceholderVal(norm.peakValue) ? norm.peakValue : aktif);

        const snap = { ts: Date.now() };
        if (aktif) snap.aktif = aktif;
        if (norm.heroSub) snap.aktifAlt = norm.heroSub;
        if (peak) snap.peak = peak;
        if (cleanManualAktif) snap.manualAktif = true;
        if (cleanManualPeak) snap.manualPeak = true;
        if (kuyruk) snap.kuyruk = kuyruk;
        return snap;
    },

    /**
     * Türüne göre canlı veriyi önce sessionStorage önbelleğinden,
     * oturum açıksa 'bright-task' Edge Function köprüsünden, yoksa istemci adaptöründen çeker.
     */
    async canliVeriCek(tur, kullanici, forceRefresh = false) {
        if (!tur || !kullanici) return null;
        const normTur = String(tur).toLowerCase().trim();

        if (!forceRefresh) {
            const cached = this._getCache(normTur, kullanici);
            if (cached) return cached;
        }

        console.log(`[TrophiesManager.canliVeriCek] Başlatılıyor -> Tür: ${normTur}, Kullanıcı: ${kullanici}, Oturum:`, typeof aktifKullaniciOturumu !== 'undefined' && Boolean(aktifKullaniciOturumu));

        // 1. Öncelik: Supabase Edge Function ('bright-task' -> gaming_lookup)
        // Giriş yapılmış oturum varsa token ile gider, ziyaretçiyse anon key ile çağrılır
        if (typeof supabaseClient !== 'undefined' && supabaseClient?.functions) {
            try {
                console.log(`[TrophiesManager.canliVeriCek] Edge Function ('bright-task') çağrılıyor... (${normTur})`);
                const { data, error } = await supabaseClient.functions.invoke('bright-task', {
                    body: {
                        action: 'gaming_lookup',
                        tur: normTur,
                        kullanici: String(kullanici).trim()
                    }
                });
                console.log(`[TrophiesManager.canliVeriCek] Edge Function Yanıtı:`, { data, error });
                if (!error && data?.sonuc) {
                    this._setCache(normTur, kullanici, data.sonuc);
                    return data.sonuc;
                }
            } catch (e) {
                console.warn(`[GamingManager] Edge lookup yedek akışa geçiyor (${normTur}):`, e);
            }
        }

        // 2. Yedek: İstemci taraflı adaptör
        const adapter = this.ADAPTERS[normTur];
        if (!adapter || typeof adapter.fetch !== 'function') return null;

        try {
            const data = await adapter.fetch(kullanici);
            if (data) {
                this._setCache(normTur, kullanici, data);
            }
            return data;
        } catch (err) {
            console.warn(`[TrophiesManager] ${normTur} verisi çekilemedi:`, err);
            return null;
        }
    },

    // Geriye dönük uyumluluk metodları
    async canliMonkeytypeVerisiCek(kullanici) {
        return await this.canliVeriCek('monkeytype', kullanici);
    },

    async canliChessVerisiCek(kullanici) {
        return await this.canliVeriCek('chess', kullanici);
    },

    /**
     * Sayfa yüklendiğinde kartVerisi içindeki tüm başarımların canlı verilerini
     * paralel olarak sorgular ve arayüzü günceller.
     */
    async tumCanliVerileriYukle(kart) {
        if (!kart) return;
        if (!kart._canli_trophies) kart._canli_trophies = {};

        const aktifOyunlar = this.aktifOyunlariAl(kart);
        const aktifWidgetlar = this.aktifWidgetlariAl(kart);
        const tumAktifler = [...aktifOyunlar, ...aktifWidgetlar];
        if (tumAktifler.length === 0) return;

        const sorgular = tumAktifler.map(async (item) => {
            const raw = await this.canliVeriCek(item.tur, item.kullanici);
            if (raw) {
                kart._canli_trophies[item.tur] = raw;
                if (item.tur === 'monkeytype') {
                    kart.canli_monkeytype = raw;
                }
            }
        });

        await Promise.allSettled(sorgular);

        if (typeof RenderEngine !== 'undefined' && typeof RenderEngine.trophiesCiz === 'function') {
            RenderEngine.trophiesCiz(kart);
        }
    }
    // #endregion
};

if (typeof window !== 'undefined') {
    window.TrophiesManager = TrophiesManager;
    window.GamingManager = TrophiesManager;
    window.canliMonkeytypeVerisiCek = (u) => TrophiesManager.canliMonkeytypeVerisiCek(u);
}
