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

    // 3. Adımda kurulacak Widgets kanadı için hazır tutulan katalog
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
            id: 'osu',
            tur: 'osu',
            baslik: 'osu!',
            alt: 'Global sıralama, Performans Puanı (PP) ve doğruluk oranı',
            domain: 'osu.ppy.sh',
            accent: '#ff66aa',
            kategori: 'ritim',
            kategoriBaslik: 'Ritim & Yetenek',
            girdiTipi: 'username',
            girdiEtiket: 'osu! Kullanıcı Adı',
            placeholder: 'oyuncu_adi',
            ornek: 'mrekk',
            comingSoon: true
        },
        {
            id: 'duolingo',
            tur: 'duolingo',
            baslik: 'Duolingo',
            alt: 'Günlük dil öğrenme serisi (streak) ve toplam XP',
            domain: 'duolingo.com',
            accent: '#58cc02',
            kategori: 'dil',
            kategoriBaslik: 'Alışkanlık & Dil',
            girdiTipi: 'username',
            girdiEtiket: 'Duolingo Kullanıcı Adı',
            placeholder: 'kullanıcı_adı',
            ornek: 'duofan',
            comingSoon: true
        }
    ],

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

        // 3. FACEIT / CS2 (Açık Web API + CORS Yedekli)
        faceit: {
            async fetch(kullanici) {
                const nick = String(kullanici).trim();
                const url = `https://www.faceit.com/api/users/v1/nicknames/${encodeURIComponent(nick)}`;
                const json = await TrophiesManager.fetchJsonWithCorsFallback(url);
                return json?.payload || null;
            },
            map(d, kullanici) {
                const cs2 = d?.games?.cs2 || d?.games?.csgo || null;
                const elo = cs2?.faceit_elo || null;
                const lvl = cs2?.skill_level || null;
                const region = cs2?.region || d?.country?.toUpperCase() || 'EU';

                return {
                    handle: d?.nickname || kullanici,
                    badge: `BÖLGE: ${region}`,
                    heroLabel: 'GÜNCEL FACEIT ELO',
                    heroValue: elo ? `${elo} ELO` : 'Profilli Oyuncu',
                    peakLabel: 'SEVİYE (LEVEL)',
                    peakValue: lvl ? `SEVİYE ${lvl}` : 'CS2',
                    summaryText: elo ? `Lvl ${lvl || '?'} • ${elo} ELO` : kullanici,
                    stats: [
                        { label: 'FACEIT SEVİYESİ', value: lvl ? `Level ${lvl} / 10` : '—', sub: 'Rekabetçi Kademe' },
                        { label: 'AKTİF ELO', value: elo ? `${elo}` : '—', sub: 'CS2 Eşleştirme' },
                        { label: 'BÖLGE / ÜLKE', value: region, sub: d?.country ? d.country.toUpperCase() : 'Uluslararası' },
                        { label: 'PLATFORM DURUMU', value: d?.verified ? 'Doğrulanmış' : 'Aktif', sub: 'FACEIT Rekabetçi' }
                    ],
                    profileUrl: `https://www.faceit.com/en/players/${encodeURIComponent(d?.nickname || kullanici)}`
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

        // 5. VALORANT (Riot ID -> HenrikDev MMR v2 API)
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
                const curTier = d?.current_data?.currenttierpatched || null;
                const rr = d?.current_data?.ranking_in_tier;
                const mmr = d?.current_data?.elo || null;
                const lastChange = d?.current_data?.mmr_change_to_last_game;
                const peakTier = d?.highest_rank?.patched_tier || curTier || null;
                const peakSeason = d?.highest_rank?.season ? d.highest_rank.season.toUpperCase() : null;

                return {
                    handle: parsed.full,
                    badge: `${parsed.valRegion.toUpperCase()} • RIOT`,
                    heroLabel: 'GÜNCEL KADEME (RANK)',
                    heroValue: curTier || 'Riot ID Bağlı',
                    peakLabel: 'KARİYER ZİRVESİ',
                    peakValue: peakTier || `#${parsed.tag}`,
                    summaryText: curTier ? `${curTier}${rr !== undefined ? ` (${rr} RR)` : ''}` : parsed.full,
                    stats: [
                        { label: 'KADEME PUANI', value: rr !== undefined && rr !== null ? `${rr} RR` : '—', sub: curTier || 'Rekabetçi Mod' },
                        { label: 'KARİYER ZİRVESİ', value: peakTier || '—', sub: peakSeason ? `Sezon: ${peakSeason}` : 'Tüm Zamanlar' },
                        { label: 'TOPLAM MMR', value: mmr ? `${mmr}` : '—', sub: 'Gizli Eşleştirme Puanı' },
                        { label: 'SON MAÇ DEĞİŞİMİ', value: lastChange !== undefined && lastChange !== null ? `${lastChange > 0 ? '+' : ''}${lastChange} RR` : parsed.displayRegion, sub: 'Rekabetçi Güncelleme' }
                    ],
                    profileUrl: `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(parsed.full)}/overview`
                };
            }
        },

        // 6. LEAGUE OF LEGENDS (Riot ID -> Bölge & Dereceli Özet)
        lol: {
            async fetch(kullanici) {
                const parsed = TrophiesManager.parseRiotId(kullanici);
                return { parsed };
            },
            map(d, kullanici) {
                const parsed = d?.parsed || TrophiesManager.parseRiotId(kullanici);
                const tier = d?.tier || null;
                const lp = d?.lp ?? null;
                const peak = d?.peak || tier || null;
                const wr = d?.winrate || null;

                return {
                    handle: parsed.full,
                    badge: `${parsed.displayRegion} SUNUCUSU`,
                    heroLabel: 'TEK / ÇİFT DERECELİ',
                    heroValue: tier || parsed.name,
                    peakLabel: 'ZİRVE / ETİKET',
                    peakValue: peak || `#${parsed.tag}`,
                    summaryText: tier ? `${tier} ${lp !== null ? `${lp} LP` : ''}` : parsed.full,
                    stats: [
                        { label: 'SİHİRDAR ADI', value: parsed.name, sub: `Etiket: #${parsed.tag}` },
                        { label: 'SUNUCU / BÖLGE', value: parsed.displayRegion, sub: parsed.lolPlatform.toUpperCase() },
                        { label: 'LİG PUANI (LP)', value: lp !== null ? `${lp} LP` : 'Aktif Sezon', sub: 'Tek/Çift Kuyruğu' },
                        { label: 'KAZANMA ORANI', value: wr ? `%${wr}` : 'OP.GG Canlı', sub: 'Resmi Maç Geçmişi' }
                    ],
                    profileUrl: `https://www.op.gg/summoners/${parsed.displayRegion.toLowerCase()}/${encodeURIComponent(parsed.name)}-${encodeURIComponent(parsed.tag)}`
                };
            }
        },

        // 7. TEAMFIGHT TACTICS (TFT)
        tft: {
            async fetch(kullanici) {
                const parsed = TrophiesManager.parseRiotId(kullanici);
                return { parsed };
            },
            map(d, kullanici) {
                const parsed = d?.parsed || TrophiesManager.parseRiotId(kullanici);
                return {
                    handle: parsed.full,
                    badge: `TFT • ${parsed.displayRegion}`,
                    heroLabel: 'TFT DERECELİ KADEME',
                    heroValue: d?.tier || parsed.name,
                    peakLabel: 'ZİRVE / ETİKET',
                    peakValue: d?.peak || `#${parsed.tag}`,
                    summaryText: d?.tier || parsed.full,
                    stats: [
                        { label: 'STRATEJİST', value: parsed.name, sub: `Etiket: #${parsed.tag}` },
                        { label: 'BÖLGE', value: parsed.displayRegion, sub: parsed.lolPlatform.toUpperCase() },
                        { label: 'MOD', value: 'TFT Ranked', sub: 'Aktif Set' },
                        { label: 'DETAYLI ANALİZ', value: 'LoLCHESS', sub: 'Kompozisyon & İlk 4' }
                    ],
                    profileUrl: `https://lolchess.gg/profile/${parsed.displayRegion.toLowerCase()}/${encodeURIComponent(parsed.name)}-${encodeURIComponent(parsed.tag)}`
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
                return {
                    handle: isNumericId ? `ID #${clean}` : clean,
                    badge: '1v1 RANKED',
                    heroLabel: 'BRAWLHALLA 1V1',
                    heroValue: d?.rating ? `${d.rating} ELO` : clean,
                    peakLabel: 'ZİRVE (PEAK)',
                    peakValue: d?.peak ? `${d.peak} ELO` : 'Ranked',
                    summaryText: d?.rating ? `${d.rating} ELO` : clean,
                    stats: [
                        { label: 'OYUNCU KİMLİĞİ', value: clean, sub: isNumericId ? 'Brawlhalla ID' : 'Oyuncu Adı' },
                        { label: 'REKABETÇİ MOD', value: '1v1 Solo', sub: 'Dereceli Arena' },
                        { label: 'SEZON DURUMU', value: 'Aktif', sub: 'Brawlhalla Ranked' },
                        { label: 'SIRALAMA', value: 'Corehalla', sub: 'Detaylı Efsane İstatistiği' }
                    ],
                    profileUrl: isNumericId
                        ? `https://corehalla.com/stats/player/${encodeURIComponent(clean)}`
                        : `https://www.brawlhalla.com/rankings/game/all/1v1/`
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
        const mapped = adapter && typeof adapter.map === 'function'
            ? adapter.map(rawData, kullanici)
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

        const isPlaceholderVal = (v) => !v || v === '—' || v === 'Profil Bağlı' || v === 'FACEIT' || v === 'CS2' || v === 'Ranked 1v1' || v === 'Belirtilmedi';

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
    buildSnapshot(tur, kullanici, rawData = null, manualAktif = '', manualPeak = '') {
        const norm = this.getNormalizedTrophyData(tur, kullanici, rawData, null);
        const isPlaceholderVal = (v) => !v || v === '—' || v === 'Profil Bağlı' || v === 'FACEIT' || v === 'CS2' || v === 'Ranked 1v1' || v === 'Belirtilmedi';

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

        // 1. Öncelik: Supabase Edge Function ('bright-task' -> gaming_lookup)
        if (typeof supabaseClient !== 'undefined' && supabaseClient?.functions && typeof aktifKullaniciOturumu !== 'undefined' && aktifKullaniciOturumu) {
            try {
                const { data, error } = await supabaseClient.functions.invoke('bright-task', {
                    body: {
                        action: 'gaming_lookup',
                        tur: normTur,
                        kullanici: String(kullanici).trim()
                    }
                });
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

        const aktifler = this.aktifTrophyleriAl(kart);
        if (aktifler.length === 0) return;

        const sorgular = aktifler.map(async (item) => {
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
