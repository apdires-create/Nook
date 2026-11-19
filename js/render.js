// #region 1: RENDER MOTORU (DATA-DRIVEN RENDER ENGINE)
const RenderEngine = {
    
    // 1.1: Ön Yüz (Vitrin) Render Fonksiyonu
    vitrinCiz(data) {
        if (!data) return;
        const front = data.front_data || {};
        const isim = front.gorunen_isim || data.kullanici_adi || '-';

        const bannerImg = document.getElementById('bannerImg');
        const avatarImg = document.getElementById('avatarImg');
        const profileName = document.getElementById('profileName');
        const profileTitle = document.getElementById('profileTitle');
        const profileBio = document.getElementById('profileBio');
        const tagsGrid = document.getElementById('tagsGrid');

        const defaultBanner = "https://i.ibb.co/RTNFJZXT/banner-placeholder.png";
        const defaultAvatar = "https://i.ibb.co/8gvf4SNF/pfp-placeholder.png";
        const defaultUnvan = "Nook Üyesi";
        const defaultBio = "Kendi dijital köşesini inşa ediyor.";

        if (bannerImg) {
            const safeBanner = this.getGorselUrl(front.banner_url);
            bannerImg.src = (safeBanner && safeBanner !== '#') ? safeBanner : defaultBanner;
            bannerImg.onerror = () => { bannerImg.src = defaultBanner; };
        }
        if (avatarImg) {
            const safeAvatar = this.getGorselUrl(front.pfp_url || front.avatar_url);
            avatarImg.src = (safeAvatar && safeAvatar !== '#') ? safeAvatar : defaultAvatar;
            avatarImg.onerror = () => { avatarImg.src = defaultAvatar; };
        }
        if (profileName) profileName.textContent = isim;
        if (profileTitle) profileTitle.textContent = front.unvan || defaultUnvan;
        if (profileBio) profileBio.textContent = front.aciklama || defaultBio;

        const sekmeNick = data.kullanici_adi || (typeof KULLANICI_ADI !== 'undefined' ? KULLANICI_ADI : null);
        if (sekmeNick) {
            document.title = `Nook - @${sekmeNick}`;
        }

        if (tagsGrid) {
            const tags = Array.isArray(front.tags) ? front.tags.filter(t => t && String(t).trim() !== '') : [];
            tagsGrid.innerHTML = tags
                .slice(0, 6)
                .map(tag => `<span class="tag-pill" title="${this.escapeHtml(tag)}"><span class="tag-text">${this.escapeHtml(tag)}</span></span>`)
                .join('');
        }

        // Eğer sahip modundaysak ve EditManager yüklüyse düzenleme kontrollerini bağla
        if (typeof isOwner !== 'undefined' && isOwner && typeof EditManager !== 'undefined') {
            EditManager.Vitrin?.init();
            EditManager.Media?.overlayleriYerlestir();
        }
    },

    // 1.2: Arka Yüz (Saf Linkler) Render Fonksiyonu
    linklerCiz(data) {
        const wrapper = document.getElementById('links-wrapper');
        if (!wrapper) return;

        const isUserOwner = (typeof isOwner !== 'undefined' && isOwner);
        const isPreview = typeof EditManager !== 'undefined' && EditManager.Appearance?.isPreviewActive;

        // Sahip modunda (önizleme kapalıysa) doğrudan düzenlenebilir akordeon görünümünü çiz
        if (isUserOwner && !isPreview && typeof EditManager !== 'undefined' && EditManager.BackViews) {
            EditManager.BackViews.init();
            return;
        }

        const kart = (data && data.kullanici_adi) ? data : (typeof kartVerisi !== 'undefined' ? kartVerisi : {});
        const links = Array.isArray(kart.links) ? kart.links : (Array.isArray(data) ? data : []);

        if (links.length === 0) {
            wrapper.innerHTML = `<p class="placeholder-text" style="text-align: center; color: var(--text-tertiary); padding: 4cqh 0; font-size: var(--cq-fs-body);">Henüz bağlantı eklenmemiş.</p>`;
        } else {
            wrapper.innerHTML = links.map(link => {
                const baslik = link.baslik || link.isim || 'Bağlantı';
                let domain = 'Bağlantı';
                try {
                    let parsedUrl = link.url;
                    if (parsedUrl && !parsedUrl.startsWith('http://') && !parsedUrl.startsWith('https://')) {
                        parsedUrl = 'https://' + parsedUrl;
                    }
                    if (parsedUrl) domain = new URL(parsedUrl).hostname.replace(/^www\./, '');
                } catch(e) {}

                return `
                    <a href="${this.safeUrl(link.url)}" target="_blank" rel="noopener noreferrer" class="nook-link-row">
                        <div class="nook-link-main">
                            <div class="nook-link-icon">${this.getLinkIcon(link.url)}</div>
                            <div class="nook-link-info">
                                <span class="nook-link-name">${this.escapeHtml(baslik)}</span>
                                <span class="nook-link-domain">${this.escapeHtml(domain)}</span>
                            </div>
                        </div>
                    </a>
                `;
            }).join('');
        }
    },

    // 1.3: Sol Eşlikçi Kart Render Motoru (Gaming / Widgets / Trophies — Master & Universal Root Layout Detail)
    trophiesCiz(data) {
        const masterView = document.getElementById('trophiesMasterView');
        const detailView = document.getElementById('trophiesDetailView');
        const masterList = document.getElementById('trophiesMasterList');
        const masterTitle = document.getElementById('trophiesMasterTitle');
        const brandIcon = document.getElementById('trophiesBrandIcon');
        const detailTitle = document.getElementById('trophiesDetailTitle');
        const detailBody = document.getElementById('trophiesDetailBody');
        const detailFooter = document.getElementById('trophiesDetailFooter');
        const deleteActiveBtn = document.getElementById('trophiesDeleteActiveBtn');
        const backBtn = document.getElementById('trophiesBackBtn');

        if (!masterView || !masterList) return;

        const mode = window._activeLeftWingMode || 'gaming';
        const isWidgetsMode = (mode === 'widgets');
        const isAchievementsMode = (mode === 'achievements');

        // Sayfa açılışında Valorant vitrin görsellerini arka planda önceden yükle
        if (typeof TrophiesManager !== 'undefined' && Array.isArray(data?.gaming)) {
            TrophiesManager.preloadValorantAssets(data.gaming);
        }

        // Dinamik Üst Başlık ve İkon Güncellemesi (Gaming / Widgets / Trophies)
        if (masterTitle) {
            if (isAchievementsMode) {
                masterTitle.innerHTML = `Trophies <span class="picker-soon-badge" style="margin-left: 6px; font-size: 0.62rem; vertical-align: middle;">BETA</span>`;
            } else {
                masterTitle.textContent = isWidgetsMode ? 'Widgets' : 'Gaming';
            }
        }
        if (brandIcon) {
            if (isAchievementsMode) {
                brandIcon.style.color = '#fcc419';
                brandIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>`;
            } else if (isWidgetsMode) {
                brandIcon.style.color = '#20c997';
                brandIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>`;
            } else {
                brandIcon.style.color = '#5c7cfa';
                brandIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="4"></rect></svg>`;
            }
        }

        const kart = (data && data.kullanici_adi) ? data : (typeof kartVerisi !== 'undefined' ? kartVerisi : {});
        const isUserOwner = (typeof isOwner !== 'undefined' && isOwner);
        if (!kart._canli_trophies) kart._canli_trophies = {};
        if (kart.canli_monkeytype && !kart._canli_trophies.monkeytype) {
            kart._canli_trophies.monkeytype = kart.canli_monkeytype;
        }

        // Eğer Trophies (Başarılar) modundaysak (Beta Ekranı)
        if (isAchievementsMode) {
            masterView.style.display = 'flex';
            if (detailView) detailView.style.display = 'none';
            if (detailFooter) { detailFooter.innerHTML = ''; detailFooter.style.display = 'none'; }
            masterList.innerHTML = `
                <div class="companion-empty-state" style="padding: 4cqh 2cqw; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1cqh;">
                    <span class="picker-soon-badge" style="font-size: 0.72rem; padding: 4px 10px;">BETA SÜRECİNDE</span>
                    <div class="companion-empty-title" style="margin-top: 0.4cqh; color: #fcc419;">Kişisel Başarılar & Kupalar</div>
                    <p class="companion-empty-desc" style="color: var(--text-tertiary); max-width: 240px;">Ödüller, sertifikalar ve kişisel dönüm noktaları vitrini şu an geliştirme aşamasında.</p>
                </div>
            `;
            return;
        }

        const aktifTrophyler = (typeof TrophiesManager !== 'undefined')
            ? (isWidgetsMode ? TrophiesManager.aktifWidgetlariAl(kart) : TrophiesManager.aktifOyunlariAl(kart))
            : [];

        const tekilIsim = isWidgetsMode ? 'Widget' : 'Oyun';
        const ekleButonMetni = isWidgetsMode ? 'Widget Ekle' : 'Oyun Ekle';
        const bosAciklamaSahip = isWidgetsMode
            ? 'Monkeytype, Chess.com, Duolingo ve osu! istatistiklerini ve serilerini profilinde sergile.'
            : 'Rekabetçi oyun derecelerini, aktif ve zirve (peak) elolarını profilinde sergile.';
        const bosBaslikZiyaretci = isWidgetsMode ? 'Henüz Widget Eklenmemiş' : 'Henüz Oyun Eklenmemiş';
        const bosAciklamaZiyaretci = isWidgetsMode
            ? 'Kullanıcı bu vitrinde henüz bir yetenek veya alışkanlık widget\'ı paylaşmamış.'
            : 'Kullanıcı bu vitrinde henüz bir rekabetçi oyun profili paylaşmamış.';

        // Sadece 1 öğe varsa ve kullanıcı manuel olarak ana listeye dönmediyse doğrudan detayı aç
        if (aktifTrophyler.length === 1 && !window._manualTrophyMaster && !window._activeTrophyDetail) {
            window._activeTrophyDetail = aktifTrophyler[0].tur;
        }

        const activeTur = window._activeTrophyDetail || null;

        if (!activeTur) {
            // ==========================================
            // MASTER GÖRÜNÜMÜ: Kompakt Liste (Lazy Detail)
            // ==========================================
            masterView.style.display = 'flex';
            if (detailView) detailView.style.display = 'none';
            if (detailFooter) { detailFooter.innerHTML = ''; detailFooter.style.display = 'none'; }

            const trophiesCompanion = document.getElementById('trophiesCompanionCard');
            if (trophiesCompanion) trophiesCompanion.classList.remove('is-detail-editing');

            let itemsHtml = '';

            if (aktifTrophyler.length > 0) {
                itemsHtml += aktifTrophyler.map(item => {
                    const rawLive = kart._canli_trophies?.[item.tur] || TrophiesManager._getCache(item.tur, item.kullanici, item.snap?.region || '') || null;
                    const norm = TrophiesManager.getNormalizedTrophyData(item.tur, item.kullanici, rawLive, item.snap);
                    const fallbackHarf = (norm.baslik || 'NK').substring(0, 2).toUpperCase();
                    const isPlaceholderHero = !norm.heroValue || norm.heroValue === '—' || norm.heroValue === 'Profil Bağlı' || norm.heroValue === 'FACEIT' || norm.heroValue === 'CS2';
                    const summaryPill = (!isPlaceholderHero && (rawLive || item.snap?.aktif))
                        ? `<span class="companion-row-live-pill">${this.escapeHtml(norm.heroValue)}</span>`
                        : '';

                    return `
                        <div class="companion-row-item" data-trophy-id="${this.escapeHtml(item.tur)}" role="button" tabindex="0">
                            <div class="companion-row-icon-wrap" style="background: rgba(255, 255, 255, 0.06); border: 1px solid ${this.escapeHtml(norm.accent)}44;">
                                <img src="${this.escapeHtml(norm.faviconUrl)}" class="companion-row-favicon" loading="lazy" alt="${this.escapeHtml(norm.baslik)}"
                                     onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';">
                                <span style="display:none; font-weight: 800; font-size: 0.75rem; color: var(--text-primary);">${this.escapeHtml(fallbackHarf)}</span>
                            </div>
                            <div class="companion-row-info">
                                <span class="companion-row-title">${this.escapeHtml(norm.baslik)}</span>
                                <span class="companion-row-meta">${this.escapeHtml(norm.handle)}</span>
                            </div>
                            ${summaryPill}
                            ${isUserOwner ? `
                                <button type="button" class="companion-row-del-btn" data-del-trophy="${this.escapeHtml(item.tur)}" data-trophy-title="${this.escapeHtml(norm.baslik)}" title="${this.escapeHtml(norm.baslik)} ${tekilIsim} Kaldır">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('');

                if (isUserOwner) {
                    itemsHtml += `
                        <button type="button" class="companion-add-row-btn" id="trophiesMasterAddBtn" style="margin-top: 4px;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <span>${ekleButonMetni}</span>
                        </button>
                    `;
                }
            } else {
                if (isUserOwner) {
                    itemsHtml = `
                        <div class="companion-empty-state" style="padding: 4cqh 2cqw; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <div class="companion-empty-title" style="margin-bottom: 0.8cqh;">${ekleButonMetni}</div>
                            <p class="companion-empty-desc" style="margin-bottom: 2.2cqh; color: var(--text-tertiary);">${bosAciklamaSahip}</p>
                            <button type="button" class="companion-add-row-btn" id="trophiesMasterAddBtn" style="width: auto; padding: 1.2cqh 5cqw;">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>${ekleButonMetni}</span>
                            </button>
                        </div>
                    `;
                } else {
                    itemsHtml = `
                        <div class="companion-empty-state" style="padding: 4cqh 2cqw; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <div class="companion-empty-title">${bosBaslikZiyaretci}</div>
                            <p class="companion-empty-desc" style="color: var(--text-tertiary);">${bosAciklamaZiyaretci}</p>
                        </div>
                    `;
                }
            }

            masterList.innerHTML = itemsHtml;

            // Master satır tıklamaları (Lazy Detail Render)
            masterList.querySelectorAll('.companion-row-item').forEach(item => {
                item.onclick = (e) => {
                    if (e.target.closest('.companion-row-del-btn')) return;
                    const trophyId = item.dataset.trophyId;
                    if (trophyId) {
                        window._activeTrophyDetail = trophyId;
                        this.trophiesCiz(kart);
                    }
                };
            });

            // Master satır silme tıklamaları
            masterList.querySelectorAll('.companion-row-del-btn').forEach(delBtn => {
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const trophyId = delBtn.dataset.delTrophy;
                    const trophyTitle = delBtn.dataset.trophyTitle || tekilIsim;
                    if (trophyId && typeof EditManager !== 'undefined' && EditManager.TrophiesView) {
                        await EditManager.TrophiesView.trophySil(trophyId, trophyTitle);
                    }
                };
            });

            // Master Add Buton
            const masterAddBtn = masterList.querySelector('#trophiesMasterAddBtn');
            if (masterAddBtn) {
                masterAddBtn.onclick = () => {
                    if (typeof EditManager !== 'undefined' && EditManager.TrophyPicker) {
                        EditManager.TrophyPicker.ac();
                    }
                };
            }

        } else {
            // ==========================================
            // DETAY GÖRÜNÜMÜ: Evrensel 4 Katmanlı Root Layout
            // ==========================================
            masterView.style.display = 'none';
            if (detailView) detailView.style.display = 'flex';

            const meta = (typeof TrophiesManager !== 'undefined' && TrophiesManager.katalogOgesiBul(activeTur)) || {
                id: activeTur,
                tur: activeTur,
                baslik: activeTur.toUpperCase(),
                domain: `${activeTur}.com`,
                accent: '#3b5bdb',
                girdiEtiket: 'Kullanıcı Adı'
            };

            if (detailTitle) detailTitle.textContent = meta.baslik;

            const trophiesCompanion = document.getElementById('trophiesCompanionCard');
            const isDetailEditing = trophiesCompanion && trophiesCompanion.classList.contains('is-detail-editing');

            // LoL, Valorant ve CS2 kartları açıkken özel banner temasını üst karta bağla
            if (trophiesCompanion) {
                trophiesCompanion.classList.toggle('is-lol-view', activeTur === 'lol');
                trophiesCompanion.classList.toggle('is-valorant-view', activeTur === 'valorant');
                trophiesCompanion.classList.toggle('is-cs2-view', activeTur === 'cs2' || activeTur === 'faceit');
            }

            const seciliOge = aktifTrophyler.find(t => t.tur === activeTur) || null;
            const kullanici = seciliOge ? seciliOge.kullanici : '';

            const editToggleBtn = document.getElementById('trophiesEditToggleBtn');
            if (editToggleBtn) {
                editToggleBtn.style.display = (isUserOwner && kullanici) ? 'inline-flex' : 'none';
                editToggleBtn.classList.toggle('is-active', isDetailEditing);
                editToggleBtn.title = isDetailEditing ? "Düzenlemeyi Bitir" : `${tekilIsim} Düzenle`;
            }

            if (deleteActiveBtn) {
                deleteActiveBtn.style.display = (isUserOwner && isDetailEditing && kullanici) ? 'inline-flex' : 'none';
            }

            // Geri butonu
            if (backBtn) {
                backBtn.title = isWidgetsMode ? "Widget'lara Geri Dön" : "Oyunlara Geri Dön";
                backBtn.onclick = () => {
                    window._activeTrophyDetail = null;
                    window._manualTrophyMaster = true;
                    if (trophiesCompanion) trophiesCompanion.classList.remove('is-detail-editing');
                    this.trophiesCiz(kart);
                };
            }

            if (kullanici && typeof TrophiesManager !== 'undefined') {
                let rawLive = kart._canli_trophies?.[activeTur] || TrophiesManager._getCache(activeTur, kullanici, seciliOge?.snap?.region || '') || null;
                const norm = TrophiesManager.getNormalizedTrophyData(activeTur, kullanici, rawLive, seciliOge?.snap);

                if (detailBody) {
                    detailBody.innerHTML = this.renderTrophyRootLayout(norm);

                    // Mod Switcher Buton Dinleyicileri (Faceit, Premier vb.)
                    detailBody.querySelectorAll('.trophy-mode-pill').forEach(pill => {
                        pill.onclick = (e) => {
                            e.stopPropagation();
                            const targetMode = pill.dataset.modeId;
                            if (!targetMode) return;
                            if (!seciliOge.snap) seciliOge.snap = {};
                            seciliOge.snap.kuyruk = targetMode;
                            // Aktif mod derecesini de snapshot ile senkronize et
                            const updatedNorm = TrophiesManager.getNormalizedTrophyData(activeTur, kullanici, rawLive, seciliOge.snap);
                            if (updatedNorm && updatedNorm.heroValue && !updatedNorm.heroValue.includes('Derecesiz') && updatedNorm.heroValue !== '—') {
                                seciliOge.snap.aktif = updatedNorm.heroValue;
                                if (updatedNorm.heroSub) seciliOge.snap.aktifAlt = updatedNorm.heroSub;
                            }
                            // Kullanıcı profil sahibiyse otomatik kayda işaretle ve arka planda profiles tablosuna yaz
                            if (isUserOwner && typeof EditManager !== 'undefined') {
                                EditManager.Global.degisiklikYapildi();
                                if (typeof supabaseClient !== 'undefined' && supabaseClient && kart?.auth_id) {
                                    const isWidget = activeTur === 'monkeytype' || activeTur === 'chess';
                                    const updatePayload = isWidget ? { widgets: kart.widgets } : { gaming: kart.gaming };
                                    supabaseClient.from('profiles').update(updatePayload).eq('auth_id', kart.auth_id).then(() => {}).catch(() => {});
                                }
                            }
                            this.trophiesCiz(kart);
                        };
                    });

                    // CS2 Peak Kutusu (FACEIT Peak <-> Premier Peak) Switch Dinleyicisi
                    const peakSwitchBtn = detailBody.querySelector('.trophy-cs2-peak-switch');
                    if (peakSwitchBtn) {
                        peakSwitchBtn.onclick = (e) => {
                            e.stopPropagation();
                            const peakCard = peakSwitchBtn.closest('.trophy-cs2-elo-card.is-peak');
                            if (!peakCard) return;
                            const nextMode = peakCard.dataset.peakMode === 'premier' ? 'faceit' : 'premier';
                            peakCard.dataset.peakMode = nextMode;
                            const faceitView = peakCard.querySelector('.trophy-cs2-peak-view[data-mode="faceit"]');
                            const premierView = peakCard.querySelector('.trophy-cs2-peak-view[data-mode="premier"]');
                            if (faceitView) faceitView.style.display = nextMode === 'faceit' ? 'flex' : 'none';
                            if (premierView) premierView.style.display = nextMode === 'premier' ? 'flex' : 'none';
                            peakSwitchBtn.textContent = nextMode === 'premier' ? 'PREMIER ⇄' : 'FACEIT ⇄';
                            peakSwitchBtn.classList.toggle('is-premier-active', nextMode === 'premier');
                        };
                    }
                }

                // Eğer canlı veri henüz bellekte yoksa arka planda lazy olarak çek ve görünümü tazele
                if (!rawLive && !window[`_fetchingTrophy_${activeTur}_${kullanici}`]) {
                    window[`_fetchingTrophy_${activeTur}_${kullanici}`] = true;
                    const savedRegion = seciliOge?.snap?.region || '';
                    TrophiesManager.canliVeriCek(activeTur, kullanici, false, savedRegion).then(fetched => {
                        delete window[`_fetchingTrophy_${activeTur}_${kullanici}`];
                        if (fetched) {
                            kart._canli_trophies[activeTur] = fetched;
                            if (activeTur === 'monkeytype') kart.canli_monkeytype = fetched;
                            if (window._activeTrophyDetail === activeTur) {
                                this.trophiesCiz(kart);
                            }
                        }
                    }).catch(() => {
                        delete window[`_fetchingTrophy_${activeTur}_${kullanici}`];
                    });
                }

                if (detailFooter) {
                    const fallbackHarf = (norm.baslik || 'NK').substring(0, 2).toUpperCase();
                    const isLol = activeTur === 'lol';
                    const isVal = activeTur === 'valorant';
                    const footerLabel = isLol ? 'OP.GG' : (isVal ? 'TRACKER.GG' : norm.handle);
                    detailFooter.innerHTML = `
                        <a href="${this.safeUrl(norm.profileUrl)}" target="_blank" rel="noopener noreferrer" class="companion-footer-link" title="${this.escapeHtml(norm.baslik)} Profilini Gör">
                            <span class="companion-link-favicon-wrap">
                                <img src="${this.escapeHtml(norm.faviconUrl)}" class="companion-row-favicon" loading="lazy" alt="${this.escapeHtml(norm.baslik)}"
                                     onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';">
                                <span class="mt-brand-icon" style="display:none;">${this.escapeHtml(fallbackHarf)}</span>
                            </span>
                            <span class="companion-link-domain">${this.escapeHtml(footerLabel)}</span>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" class="mt-link-icon">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    `;
                    detailFooter.style.display = 'flex';
                }
            } else {
                if (detailBody) {
                    detailBody.innerHTML = `<p class="placeholder-text" style="text-align: center; color: var(--text-tertiary); padding: 3cqh 0;">Henüz ${this.escapeHtml(meta.baslik)} hesabı bağlanmamış.</p>`;
                }
                if (detailFooter) {
                    detailFooter.innerHTML = '';
                    detailFooter.style.display = 'none';
                }
            }
        }

        if (isUserOwner && typeof EditManager !== 'undefined' && EditManager.TrophiesView) {
            EditManager.TrophiesView.init();
        }
    },

    /**
     * Tüm oyunları taşma yapmadan sergileyen 4 katmanlı Evrensel Root Layout şablonu.
     */
    renderTrophyRootLayout(norm) {
        if (!norm) return '';
        if (norm.tur === 'lol') {
            return this.renderLoLRootLayout(norm);
        }
        if (norm.tur === 'valorant') {
            return this.renderValorantRootLayout(norm);
        }
        if (norm.tur === 'cs2' || norm.tur === 'faceit') {
            return this.renderCS2RootLayout(norm);
        }
        const fallbackHarf = (norm.baslik || 'NK').substring(0, 2).toUpperCase();
        const stats = Array.isArray(norm.stats) ? norm.stats.slice(0, 4) : [];

        const statsHtml = stats.map(s => `
            <div class="trophy-stat-box">
                <span class="trophy-stat-label">${this.escapeHtml(s.label || '')}</span>
                <span class="trophy-stat-val">${this.escapeHtml(s.value ?? '—')}</span>
                <span class="trophy-stat-sub">${this.escapeHtml(s.sub || '')}</span>
            </div>
        `).join('');

        return `
            <div class="trophy-root-card" style="--trophy-accent: ${this.escapeHtml(norm.accent || '#3b5bdb')};" data-trophy-tur="${this.escapeHtml(norm.tur)}" data-username="${this.escapeHtml(norm.kullanici)}">
                <!-- 1. KATMAN: Kimlik Başlığı -->
                <div class="trophy-identity-bar">
                    <div class="trophy-id-left">
                        <div class="trophy-id-favicon-box">
                            <img src="${this.escapeHtml(norm.faviconUrl)}" alt="${this.escapeHtml(norm.baslik)}" class="trophy-id-favicon-img" loading="lazy"
                                 onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';">
                            <span class="trophy-id-fallback" style="display: none;">${this.escapeHtml(fallbackHarf)}</span>
                        </div>
                        <div class="trophy-id-texts">
                            <div class="trophy-id-handle" title="${this.escapeHtml(norm.handle)}">${this.escapeHtml(norm.handle)}</div>
                            <div class="trophy-id-platform">${this.escapeHtml(norm.baslik)} • ${this.escapeHtml(norm.domain)}</div>
                        </div>
                    </div>
                    ${Array.isArray(norm.modes) && norm.modes.length > 1 ? `
                        <div class="trophy-mode-switcher" data-trophy-tur="${this.escapeHtml(norm.tur)}">
                            ${norm.modes.map(m => `
                                <button type="button" class="trophy-mode-pill ${norm.activeMode === m.id ? 'is-active' : ''}" data-mode-id="${this.escapeHtml(m.id)}" title="${this.escapeHtml(m.label)} Modu">
                                    ${this.escapeHtml(m.label)}
                                </button>
                            `).join('')}
                        </div>
                    ` : `
                        <span class="trophy-id-badge">${this.escapeHtml(norm.badge || 'AKTİF')}</span>
                    `}
                </div>

                <!-- 2. KATMAN: Hero Derece & Altın Zirve (Peak) Rozeti -->
                <div class="trophy-hero-banner">
                    <div class="trophy-hero-main">
                        <span class="trophy-hero-label">${this.escapeHtml(norm.heroLabel || 'GÜNCEL DERECE')}</span>
                        <span class="trophy-hero-value" title="${this.escapeHtml(norm.heroValue || '—')}">${this.escapeHtml(norm.heroValue || '—')}</span>
                    </div>
                    <div class="trophy-peak-box" title="${this.escapeHtml(norm.peakLabel || 'ZİRVE')}: ${this.escapeHtml(norm.peakValue || '—')}">
                        <span class="trophy-peak-label">★ ${this.escapeHtml(norm.peakLabel || 'ZİRVE')}</span>
                        <span class="trophy-peak-value">${this.escapeHtml(norm.peakValue || '—')}</span>
                    </div>
                </div>

                <!-- 3. KATMAN: 2x2 Sabit İstatistik Izgarası -->
                <div class="trophy-stats-grid">
                    ${statsHtml}
                </div>
            </div>
        `;
    },

    /**
     * League of Legends Özel Tasarım Şablonu:
     * - Full-bleed atmosferik Targon/Runeterra Banner (üst butonların altına zemin)
     * - Şeffaf LoL vektörel logosu ve font kimlik çubuğu (LoL | @kullanici_adi)
     * - Sol Bilgi Paneli: Solo/Duo, Flex 5v5 ve Peak (3 Elo) + Win rate (Gereksiz Bölge ve Rol kaldırıldı)
     * - Kırık resimleri önleyen dinamik SVG kalkan fallback'i
     * - Sağ Panel: Dikey Loading Art + Görsel içinde altta şampiyon ismi ve gradyan
     */
    renderLoLRootLayout(norm) {
        if (!norm) return '';
        const soloTier = norm.soloTier || norm.heroValue || 'Silver I';
        const flexTier = norm.flexTier || 'Silver II';
        const winrate = norm.winrate || '56';
        const region = (norm.region || 'TR').toUpperCase();
        const peak = norm.peakValue || soloTier;
        const sampiyon = norm.sampiyon || 'Morgana';
        const loadingUrl = norm.champLoadingUrl || `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/Morgana_0.jpg`;
        const soloEmblem = TrophiesManager.getRankEmblemUrl('lol', soloTier);
        const flexEmblem = TrophiesManager.getRankEmblemUrl('lol', flexTier);
        const peakEmblem = TrophiesManager.getRankEmblemUrl('lol', peak);
        const fallbackShield = TrophiesManager.getDefaultEloShieldSvg();

        const handleParts = String(norm.handle || '').split('#');
        const summonerName = handleParts[0] || norm.handle || 'Sihirdar';
        const summonerTag = handleParts[1] ? `#${handleParts[1]}` : '';

        return `
            <div class="trophy-root-card trophy-lol-card" data-trophy-tur="lol" data-username="${this.escapeHtml(norm.kullanici)}">
                <!-- ANA İKİ SÜTUNLU GRİD -->
                <div class="trophy-lol-main-grid">
                    <!-- SOL KOLON: OYUNCU KİMLİĞİ + 3 ELO DÖRTGENİ + KAZANMA ORANI -->
                    <div class="trophy-lol-left-col">
                        <!-- 1. Oyuncu Kapsülü (Sol Panel Üzeri, Bağımsız Cam Kart) -->
                        <div class="trophy-lol-user-capsule">
                            <span class="trophy-lol-player-name">${this.escapeHtml(summonerName)}</span>
                            ${summonerTag ? `<span class="trophy-lol-player-tag">${this.escapeHtml(summonerTag)}</span>` : ''}
                            <span class="trophy-lol-server-badge">${this.escapeHtml(region)}</span>
                        </div>

                        <!-- 2. Info Paneli (3 Büyük Dörtgen + Kazanma Oranı) -->
                        <div class="trophy-lol-info-panel">
                            <!-- 1. Dörtgen: Peak Lider Kartı -->
                            <div class="trophy-lol-elo-card is-peak">
                                <div class="trophy-lol-elo-badge">PEAK</div>
                                <div class="trophy-lol-elo-center">
                                    ${peakEmblem ? `
                                        <img src="${this.escapeHtml(peakEmblem)}" alt="${this.escapeHtml(peak)}" class="trophy-lol-rank-emblem" loading="lazy"
                                             onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';">
                                        <span class="trophy-fallback-box" style="display:none;">${fallbackShield}</span>
                                    ` : fallbackShield}
                                </div>
                                <span class="trophy-lol-elo-tier-text">${this.escapeHtml(peak)}</span>
                            </div>

                            <!-- 2. Dörtgen: Solo/Duo Kartı -->
                            <div class="trophy-lol-elo-card">
                                <div class="trophy-lol-elo-badge">SOLO / DUO</div>
                                <div class="trophy-lol-elo-center">
                                    ${soloEmblem ? `
                                        <img src="${this.escapeHtml(soloEmblem)}" alt="${this.escapeHtml(soloTier)}" class="trophy-lol-rank-emblem" loading="lazy"
                                             onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';">
                                        <span class="trophy-fallback-box" style="display:none;">${fallbackShield}</span>
                                    ` : fallbackShield}
                                </div>
                                <span class="trophy-lol-elo-tier-text">${this.escapeHtml(soloTier)}</span>
                            </div>

                            <!-- 3. Dörtgen: Flex 5v5 Kartı -->
                            <div class="trophy-lol-elo-card">
                                <div class="trophy-lol-elo-badge">FLEX 5V5</div>
                                <div class="trophy-lol-elo-center">
                                    ${flexEmblem ? `
                                        <img src="${this.escapeHtml(flexEmblem)}" alt="${this.escapeHtml(flexTier)}" class="trophy-lol-rank-emblem" loading="lazy"
                                             onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';">
                                        <span class="trophy-fallback-box" style="display:none;">${fallbackShield}</span>
                                    ` : fallbackShield}
                                </div>
                                <span class="trophy-lol-elo-tier-text">${this.escapeHtml(flexTier)}</span>
                            </div>

                            <!-- 4. Alt Taban: Ferah Kazanma Oranı Kartı -->
                            <div class="trophy-lol-wr-card">
                                <div class="trophy-lol-wr-left">
                                    <span class="trophy-lol-wr-icon">
                                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#38d9a9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="18" y1="20" x2="18" y2="10"></line>
                                            <line x1="12" y1="20" x2="12" y2="4"></line>
                                            <line x1="6" y1="20" x2="6" y2="14"></line>
                                        </svg>
                                    </span>
                                    <span class="trophy-lol-wr-label">Kazanma Oranı</span>
                                </div>
                                <span class="trophy-lol-wr-val val-wr">%${this.escapeHtml(winrate)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- SAĞ PANEL: DİKEY ŞAMPİYON KARTI (İÇİNDE ALTTAN İSİM + ROL + GRADYAN) -->
                    <div class="trophy-lol-art-box" title="${this.escapeHtml(sampiyon)}">
                        <img src="${this.escapeHtml(loadingUrl)}" alt="${this.escapeHtml(sampiyon)}" class="trophy-lol-art-img" loading="lazy"
                             onerror="this.src='https://ddragon.leagueoflegends.com/cdn/img/champion/loading/Morgana_0.jpg';">
                        <div class="trophy-lol-art-bottom-fade"></div>
                        <div class="trophy-lol-champ-caption">
                            <span class="trophy-lol-champ-name">${this.escapeHtml(sampiyon)}</span>
                            <span class="trophy-lol-champ-role">${this.escapeHtml(norm.rolEtiket || 'Vitrin')}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Valorant Özel Kart Tasarımı:
     * - Üstte eğik Riot ID kapsülü (İsim #TAG + Bölge)
     * - Ortada 3 adet istiflenmiş yatay eğik Ajan kartı (Kompozit arka plan + portre + sol altta Ajan Adı)
     * - Altta 2 adet eğik istatistik kutusu (Elo - ... ve Win rate / RR)
     */
    renderValorantRootLayout(norm) {
        if (!norm) return '';
        const region = (norm.region || 'EU').toUpperCase();
        const eloText = norm.heroValue || 'Unranked';
        const rankEmblem = TrophiesManager.getRankEmblemUrl('valorant', eloText);
        const rr = norm.rr;
        const curStatText = (rr !== undefined && rr !== null) ? `${eloText} · ${rr} RR` : eloText;
        const peakText = (norm.peakValue && !String(norm.peakValue).startsWith('#')) ? norm.peakValue : eloText;
        const peakEmblem = TrophiesManager.getRankEmblemUrl('valorant', peakText);
        const agents = Array.isArray(norm.agents) && norm.agents.length === 3
            ? norm.agents
            : ['', '', ''];

        const handleParts = String(norm.handle || '').split('#');
        const playerName = handleParts[0] || norm.handle || 'Ajan';
        const playerTag = handleParts[1] ? `#${handleParts[1]}` : '';

        // Ajan listesi henüz API'den çekilmediyse arka planda yükle ve görünümü tazele
        if (!TrophiesManager._valorantAgentsCache && !window._fetchingValAgents) {
            window._fetchingValAgents = true;
            TrophiesManager.getValorantAgents().then(() => {
                delete window._fetchingValAgents;
                if (window._activeTrophyDetail === 'valorant' && typeof kartVerisi !== 'undefined' && kartVerisi) {
                    this.trophiesCiz(kartVerisi);
                }
            }).catch(() => {
                delete window._fetchingValAgents;
            });
        }

        const emptySlotSvg = `<svg viewBox="0 0 120 80" class="trophy-val-empty-svg" fill="none" aria-hidden="true">
            <circle cx="60" cy="40" r="24" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4"/>
            <path d="M60 10V24M60 56V70M30 40H44M76 40H90" stroke="#ff4655" stroke-width="1.8"/>
            <polygon points="60,29 71,40 60,51 49,40" stroke="currentColor" stroke-width="1.5"/>
        </svg>`;

        const agentCardsHtml = agents.map((agentName) => {
            if (!agentName || !String(agentName).trim()) {
                return `
                    <div class="trophy-val-agent-card is-empty" title="Ajan Seçilmedi">
                        <div class="trophy-val-agent-inner">
                            ${emptySlotSvg}
                            <span class="trophy-val-agent-name is-empty-label">Ajan Seçilmedi</span>
                        </div>
                    </div>
                `;
            }
            const art = TrophiesManager.getValorantAgentData(agentName);
            const c1 = art.colors?.[0] || '#ff4655';
            const c2 = art.colors?.[2] || '#1f2937';
            const c3 = art.colors?.[3] || '#090c14';
            return `
                <div class="trophy-val-agent-card" style="--val-c1: ${this.escapeHtml(c1)}; --val-c2: ${this.escapeHtml(c2)}; --val-c3: ${this.escapeHtml(c3)};" title="${this.escapeHtml(art.name)}">
                    <div class="trophy-val-agent-inner">
                        ${art.background ? `<img src="${this.escapeHtml(art.background)}" alt="" class="trophy-val-agent-bg" loading="eager" decoding="async" onerror="this.style.display='none';">` : ''}
                        ${art.bustPortrait ? `<img src="${this.escapeHtml(art.bustPortrait)}" alt="${this.escapeHtml(art.name)}" class="trophy-val-agent-portrait" loading="eager" decoding="async" onerror="this.style.display='none';">` : ''}
                        <div class="trophy-val-agent-fade"></div>
                        <span class="trophy-val-agent-name">${this.escapeHtml(art.name)}</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="trophy-root-card trophy-valorant-card" data-trophy-tur="valorant" data-username="${this.escapeHtml(norm.kullanici)}">
                <div class="trophy-val-user-capsule">
                    <div class="trophy-val-user-inner">
                        <span class="trophy-val-player-name">${this.escapeHtml(playerName)}</span>
                        ${playerTag ? `<span class="trophy-val-player-tag">${this.escapeHtml(playerTag)}</span>` : ''}
                        <span class="trophy-val-server-badge">${this.escapeHtml(region)}</span>
                    </div>
                </div>

                <div class="trophy-val-agents-stack">
                    ${agentCardsHtml}
                </div>

                <div class="trophy-val-stats-row">
                    <div class="trophy-val-stat-pill is-elo">
                        <div class="trophy-val-stat-inner">
                            ${rankEmblem ? `<img src="${this.escapeHtml(rankEmblem)}" alt="${this.escapeHtml(eloText)}" class="trophy-val-rank-emblem" loading="eager" decoding="async" onerror="this.style.display='none';">` : ''}
                            <span class="trophy-val-stat-text">${this.escapeHtml(curStatText)}</span>
                        </div>
                    </div>
                    <div class="trophy-val-stat-pill is-peak">
                        <div class="trophy-val-stat-inner">
                            <span class="trophy-val-peak-tag">PEAK</span>
                            ${peakEmblem ? `<img src="${this.escapeHtml(peakEmblem)}" alt="${this.escapeHtml(peakText)}" class="trophy-val-rank-emblem" loading="eager" decoding="async" onerror="this.style.display='none';">` : ''}
                            <span class="trophy-val-stat-text">${this.escapeHtml(peakText)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Counter-Strike 2 Özel Kart Tasarımı (LoL Mimarisi + CS2 Kimliği):
     * - Üstte cs-banner.jpg arka planı
     * - Sol Kolon: Oyuncu Kapsülü + Info Paneli (FACEIT/Premier Switch'li Peak + Aktif FACEIT + K/D & HS% + Kazanma Oranı)
     * - Sağ Kolon: Statik cs-render.jpg + Karartma Fade + Favori Silah Görseli + Oyun Tarzı Tag'i
     */
    renderCS2RootLayout(norm) {
        if (!norm) return '';
        const nick = norm.handle || norm.kullanici || 'Oyuncu';
        const region = (norm.region || 'EU').toUpperCase();

        const lvl = norm.level ? Number(norm.level) : null;
        const elo = norm.elo ? Number(norm.elo) : null;
        const lvlColor = TrophiesManager.getFaceitLevelColor(lvl || 1);

        const faceitPeak = norm.faceitPeak ? Number(norm.faceitPeak) : elo;
        const faceitPeakLvl = norm.faceitPeakLevel || lvl;
        const faceitPeakColor = TrophiesManager.getFaceitLevelColor(faceitPeakLvl || 1);

        const premierPeak = norm.premierPeak || norm.premierRating || null;
        const premierColor = premierPeak ? TrophiesManager.getPremierColor(premierPeak) : '#de9b35';

        const kdText = norm.kd ? String(norm.kd) : '—';
        const hsText = norm.hs ? `%${norm.hs}` : '—';
        const wrText = norm.winrate ? `%${norm.winrate}` : '—';

        const playstyle = norm.playstyle || norm.rol || 'Agresif';
        const silah = norm.silah || 'AK-47';
        const silahGorsel = norm.silahGorsel || TrophiesManager.getCS2WeaponImage(silah);

        const makeLevelRing = (levelNum, color) => {
            const pct = levelNum ? Math.max(10, Math.min(100, levelNum * 10)) : 0;
            return `
                <div class="trophy-cs2-lvl-badge">
                    <svg viewBox="0 0 36 36" class="trophy-cs2-lvl-ring" aria-hidden="true">
                        <circle cx="18" cy="18" r="15" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.12)" stroke-width="3"></circle>
                        ${levelNum ? `<circle cx="18" cy="18" r="15" fill="none" stroke="${this.escapeHtml(color)}" stroke-width="3" stroke-dasharray="${(pct * 0.942).toFixed(1)} 100" stroke-linecap="round" transform="rotate(-90 18 18)"></circle>` : ''}
                    </svg>
                    <span class="trophy-cs2-lvl-num">${levelNum ?? '—'}</span>
                </div>
            `;
        };

        return `
            <div class="trophy-root-card trophy-cs2-card" data-trophy-tur="cs2" data-username="${this.escapeHtml(norm.kullanici)}">
                <div class="trophy-cs2-main-grid">
                    <!-- SOL KOLON: OYUNCU KAPSÜLÜ + INFO PANELİ -->
                    <div class="trophy-cs2-left-col">
                        <div class="trophy-cs2-user-capsule">
                            <span class="trophy-cs2-player-name">${this.escapeHtml(nick)}</span>
                            <span class="trophy-cs2-server-badge">${this.escapeHtml(region)}</span>
                        </div>

                        <div class="trophy-cs2-info-panel">
                            <!-- 1. PEAK KUTUSU (Sağ üstte FACEIT <-> Premier Switch) -->
                            <div class="trophy-cs2-elo-card is-peak" data-peak-mode="faceit">
                                <div class="trophy-cs2-elo-top-row">
                                    <span class="trophy-cs2-elo-badge">PEAK</span>
                                    ${premierPeak ? `
                                        <button type="button" class="trophy-cs2-peak-switch" title="FACEIT Peak / Premier Peak Geçişi">FACEIT ⇄</button>
                                    ` : ''}
                                </div>

                                <div class="trophy-cs2-peak-view" data-mode="faceit" style="display: flex;">
                                    <div class="trophy-cs2-elo-center">
                                        ${makeLevelRing(faceitPeakLvl, faceitPeakColor)}
                                    </div>
                                    <span class="trophy-cs2-elo-tier-text">${faceitPeak ? `${faceitPeak.toLocaleString('en-US')} ELO` : (faceitPeakLvl ? `Level ${faceitPeakLvl}` : '—')}</span>
                                </div>

                                ${premierPeak ? `
                                    <div class="trophy-cs2-peak-view" data-mode="premier" style="display: none; --cs2-premier-color: ${this.escapeHtml(premierColor)};">
                                        <div class="trophy-cs2-elo-center">
                                            <div class="trophy-cs2-premier-bars" aria-hidden="true">
                                                <span></span><span></span>
                                            </div>
                                        </div>
                                        <span class="trophy-cs2-elo-tier-text is-premier-val">${this.escapeHtml(premierPeak)}</span>
                                    </div>
                                ` : ''}
                            </div>

                            <!-- 2. AKTİF FACEIT KUTUSU -->
                            <div class="trophy-cs2-elo-card">
                                <div class="trophy-cs2-elo-top-row">
                                    <span class="trophy-cs2-elo-badge">FACEIT</span>
                                </div>
                                <div class="trophy-cs2-elo-center">
                                    ${makeLevelRing(lvl, lvlColor)}
                                </div>
                                <span class="trophy-cs2-elo-tier-text">${elo ? `${elo.toLocaleString('en-US')} ELO` : (lvl ? `Level ${lvl}` : 'Bağlı')}</span>
                            </div>

                            <!-- 3. KOMPAKT PERFORMANS KAPSÜLLERİ (K/D & HS%) -->
                            <div class="trophy-cs2-metrics-row">
                                <div class="trophy-cs2-metric-pill">
                                    <span class="trophy-cs2-metric-label">K/D</span>
                                    <span class="trophy-cs2-metric-val">${this.escapeHtml(kdText)}</span>
                                </div>
                                <div class="trophy-cs2-metric-pill">
                                    <span class="trophy-cs2-metric-label">HS %</span>
                                    <span class="trophy-cs2-metric-val">${this.escapeHtml(hsText)}</span>
                                </div>
                            </div>

                            <!-- 4. ALT TABAN: KAZANMA ORANI KARTI -->
                            <div class="trophy-cs2-wr-card">
                                <div class="trophy-cs2-wr-left">
                                    <span class="trophy-cs2-wr-icon">
                                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#38d9a9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="18" y1="20" x2="18" y2="10"></line>
                                            <line x1="12" y1="20" x2="12" y2="4"></line>
                                            <line x1="6" y1="20" x2="6" y2="14"></line>
                                        </svg>
                                    </span>
                                    <span class="trophy-cs2-wr-label">Kazanma Oranı</span>
                                </div>
                                <span class="trophy-cs2-wr-val">${this.escapeHtml(wrText)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- SAĞ KOLON: STATİK CS-RENDER + KARARTMA FADE + SİLAH GÖRSELİ + OYUN TARZI TAG -->
                    <div class="trophy-cs2-art-box">
                        <img src="assets/images/cs-render.jpg" alt="Counter-Strike 2" class="trophy-cs2-art-img" loading="lazy">
                        <div class="trophy-cs2-art-bottom-fade"></div>
                        <div class="trophy-cs2-art-caption">
                            ${silahGorsel ? `<img src="${this.escapeHtml(silahGorsel)}" alt="${this.escapeHtml(silah)}" class="trophy-cs2-weapon-img" loading="lazy" onerror="this.style.display='none';">` : ''}
                            <span class="trophy-cs2-playstyle-tag">${this.escapeHtml(playstyle)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // 1.4: TOPS EŞLİKÇİ KART (SHOWCASE WING) RENDER MOTORU (MASTER & DETAIL)
    companionCiz(topsData) {
        const masterView = document.getElementById('showcaseMasterView');
        const detailView = document.getElementById('showcaseDetailView');
        const masterList = document.getElementById('showcaseMasterList');
        const detailTitle = document.getElementById('companionMetaTitle');
        const companionBody = document.getElementById('companionBody');
        const footerEl = document.getElementById('companionFooter');
        const editToggleBtn = document.getElementById('showcaseEditToggleBtn');
        const deleteListBtn = document.getElementById('showcaseDeleteListBtn');
        const backBtn = document.getElementById('showcaseBackBtn');

        if (!masterView || !masterList || !companionBody) return;

        const tops = topsData || kartVerisi.tops || { listeler: [] };
        const listeler = Array.isArray(tops.listeler) ? tops.listeler : [];
        const isUserOwner = (typeof isOwner !== 'undefined' && isOwner);

        // Eğer sadece tek bir kürasyon listesi varsa ve manuel olarak ana listeye çıkılmadıysa doğrudan o listeyi aç
        if (listeler.length === 1 && !tops._manualMaster) {
            tops.aktifListeId = listeler[0].id;
        }

        const aktifListeId = tops.aktifListeId;
        const aktifListe = listeler.find(l => l.id === aktifListeId);

        // Kategori türü için ikon belirle
        const getTurIcon = (tur) => {
            switch(tur) {
                case 'dizi': return '📺';
                case 'oyun': return '🎮';
                case 'anime': return '⛩️';
                case 'karakter': return '🎭';
                case 'kitap': return '📚';
                default: return '🎬';
            }
        };

        if (!aktifListeId || !aktifListe) {
            // ==========================================
            // MASTER GÖRÜNÜMÜ: Kürasyon Listeleri
            // ==========================================
            masterView.style.display = 'flex';
            detailView.style.display = 'none';

            // Kartın detay düzenleme durumunu temizle
            const topsCompanion = document.getElementById('topsCompanionCard');
            if (topsCompanion) topsCompanion.classList.remove('is-detail-editing');

            let masterHtml = '';
            if (listeler.length === 0) {
                if (isUserOwner) {
                    masterHtml = `
                        <div class="companion-empty-state">
                            <div class="companion-empty-title">Henüz kürasyon listesi oluşturulmamış</div>
                            <div class="companion-empty-desc">Favori film, dizi, oyun, anime, karakter veya kitaplarınızı sergilemek için hemen ilk listenizi oluşturun.</div>
                            <button type="button" class="companion-add-row-btn" id="showcaseMasterAddFirstBtn">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                <span>İlk Listeyi Oluştur</span>
                            </button>
                        </div>
                    `;
                } else {
                    masterHtml = `
                        <div class="companion-empty-state">
                            <div class="companion-empty-title">Burası Şimdilik Sessiz</div>
                            <div class="companion-empty-desc">Kullanıcı bu vitrinde henüz bir kürasyon listesi paylaşmamış.</div>
                        </div>
                    `;
                }
            } else {
                masterHtml += listeler.map(l => {
                    const count = Array.isArray(l.ogeler) ? l.ogeler.length : 0;
                    const icon = getTurIcon(l.tur);
                    return `
                        <div class="companion-row-item" data-list-id="${this.escapeHtml(l.id)}" role="button" tabindex="0">
                            <div class="companion-row-icon-wrap">
                                <span style="font-size: 1.15rem;">${icon}</span>
                            </div>
                            <div class="companion-row-info">
                                <span class="companion-row-title">${this.escapeHtml(l.kategori || 'Liste')}</span>
                                <span class="companion-row-meta">${count}/3 içerik ekli</span>
                            </div>
                            ${isUserOwner ? `
                                <button type="button" class="companion-row-del-btn" data-del-list="${this.escapeHtml(l.id)}" data-list-title="${this.escapeHtml(l.kategori || 'Liste')}" title="Listeyi Sil">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('');

                if (isUserOwner && listeler.length < 6) {
                    masterHtml += `
                        <button type="button" class="companion-add-row-btn" id="showcaseMasterAddBtn" style="margin-top: 4px;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            <span>Yeni Liste Ekle (${listeler.length}/6)</span>
                        </button>
                    `;
                }
            }

            masterList.innerHTML = masterHtml;

            // Master satır tıklamaları (Detaya git)
            masterList.querySelectorAll('.companion-row-item').forEach(item => {
                item.onclick = (e) => {
                    if (e.target.closest('.companion-row-del-btn')) return;
                    const listId = item.dataset.listId;
                    if (listId) {
                        tops.aktifListeId = listId;
                        this.companionCiz(tops);
                    }
                };
            });

            // Master satır silme tıklamaları
            masterList.querySelectorAll('.companion-row-del-btn').forEach(delBtn => {
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const listId = delBtn.dataset.delList;
                    const listTitle = delBtn.dataset.listTitle || 'Liste';

                    let onay = false;
                    if (typeof window.onayPopupiGoster === 'function') {
                        onay = await window.onayPopupiGoster({
                            baslik: `"${listTitle}" Listesini Sil`,
                            aciklama: `"${listTitle}" listesini ve içindeki tüm afişleri silmek istediğinize emin misiniz?`,
                            onayMetni: "Listeyi Sil",
                            tehlikeliMi: true
                        });
                    } else {
                        onay = confirm(`"${listTitle}" listesini ve içindeki tüm afişleri silmek istediğinize emin misiniz?`);
                    }

                    if (onay) {
                        const idx = tops.listeler.findIndex(l => l.id === listId);
                        if (idx > -1) {
                            tops.listeler.splice(idx, 1);
                            if (tops.aktifListeId === listId) tops.aktifListeId = null;
                            this.companionCiz(tops);
                            if (typeof EditManager !== 'undefined') {
                                EditManager.Global.degisiklikYapildi();
                            }
                            if (typeof window.toastBildirimiGoster === 'function') {
                                window.toastBildirimiGoster(`"${listTitle}" listesi silindi.`, 3000, 'success');
                            }
                        }
                    }
                };
            });

            // Master Add Butonları
            const addFirstBtn = masterList.querySelector('#showcaseMasterAddFirstBtn');
            const addBtn = masterList.querySelector('#showcaseMasterAddBtn');
            const triggerAdd = () => {
                if (typeof EditManager !== 'undefined' && EditManager.TopsModal) {
                    EditManager.TopsModal.ac(null);
                }
            };
            if (addFirstBtn) addFirstBtn.onclick = triggerAdd;
            if (addBtn) addBtn.onclick = triggerAdd;

        } else {
            // ==========================================
            // DETAY GÖRÜNÜMÜ: Seçili Liste Vitrini
            // ==========================================
            masterView.style.display = 'none';
            detailView.style.display = 'flex';

            if (detailTitle) {
                detailTitle.textContent = aktifListe.kategori || 'Liste';
                detailTitle.title = isUserOwner ? 'İsmi değiştirmek için tıklayın' : '';
            }

            if (editToggleBtn) {
                editToggleBtn.style.display = isUserOwner ? 'inline-flex' : 'none';
            }

            if (backBtn) {
                backBtn.title = "Listelere Geri Dön";
                backBtn.onclick = () => {
                    tops.aktifListeId = null;
                    tops._manualMaster = true;
                    const compCard = document.getElementById('topsCompanionCard');
                    if (compCard) compCard.classList.remove('is-detail-editing');
                    this.companionCiz(tops);
                };
            }

            const ogeler = Array.isArray(aktifListe.ogeler) ? aktifListe.ogeler : [];

            // Afiş Kartları (Maksimum 3 adet — Madde 2 ve Madde 6)
            const kartlarHtml = ogeler.slice(0, 3).map((item, idx) => {
                const rawAfis = item.afis_url || item.gorsel_url;
                const safeAfis = this.getGorselUrl(rawAfis);
                const itemId = item.id || item.kimlik || ('top_' + (idx + 1));
                const tierName = idx === 0 ? 'gold' : (idx === 1 ? 'silver' : 'bronze');
                const isHero = idx === 0;

                const crownHtml = isHero ? `
                    <span class="top-hero-crown" title="1. Sıra - Vitrin Tacı">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                        </svg>
                    </span>
                ` : '';

                const thumbHtml = (safeAfis && safeAfis !== '#')
                    ? `<div class="top-item-thumb skeleton-shimmer"><img class="lazy-img" src="${safeAfis}" alt="${this.escapeHtml(item.baslik || '')}" loading="lazy" decoding="async" draggable="false" referrerpolicy="no-referrer" onload="this.classList.add('is-loaded'); if(this.parentElement) this.parentElement.classList.remove('skeleton-shimmer');" onerror="this.style.display='none'; if(this.parentElement) this.parentElement.classList.remove('skeleton-shimmer');"></div>`
                    : `<div class="top-item-thumb"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg></div>`;

                const scoreBadge = item.skor
                    ? `<span class="top-meta-badge is-score">★ ${this.escapeHtml(item.skor)}</span>`
                    : '';

                const bottomMetaBadges = [];
                if (item.yil) {
                    bottomMetaBadges.push(`<span class="top-meta-badge is-year">${this.escapeHtml(item.yil)}</span>`);
                }
                if (item.yonetmen) {
                    bottomMetaBadges.push(`<span class="top-meta-badge is-extra" title="Yönetmen">Yön: ${this.escapeHtml(item.yonetmen)}</span>`);
                }
                if (item.yayinci) {
                    bottomMetaBadges.push(`<span class="top-meta-badge is-extra" title="Yayıncı Firma">${this.escapeHtml(item.yayinci)}</span>`);
                }
                if (item.studyo) {
                    bottomMetaBadges.push(`<span class="top-meta-badge is-extra" title="Stüdyo">${this.escapeHtml(item.studyo)}</span>`);
                }
                if (item.yazar) {
                    bottomMetaBadges.push(`<span class="top-meta-badge is-extra" title="Yazar">${this.escapeHtml(item.yazar)}</span>`);
                }
                if (item.seri) {
                    bottomMetaBadges.push(`<span class="top-meta-badge is-series" title="Seri / Evren">${this.escapeHtml(item.seri)}</span>`);
                }

                const headerMetaHtml = scoreBadge ? `<div class="top-item-meta-header">${scoreBadge}</div>` : '';
                const footerMetaHtml = bottomMetaBadges.length > 0
                    ? `<div class="top-item-meta-footer">${bottomMetaBadges.join('')}</div>`
                    : '';

                const savedNote = (kartVerisi?.kullanici_notlari && kartVerisi.kullanici_notlari[itemId]) || item.yorum || item.kullanici_notu || item.not || '';
                const hasNote = Boolean(savedNote.trim());
                const commentBadgeHtml = hasNote
                    ? `<span class="has-comment-badge" title="Kullanıcı yorumu mevcut">💬</span>`
                    : '';

                const userReviewHtml = `
                    <div class="top-item-user-review">
                        <div class="user-review-header">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            <span>Kullanıcı Yorumu</span>
                        </div>
                        <p class="user-review-text" id="user-review-text-${this.escapeHtml(itemId)}">${this.escapeHtml(savedNote || 'Bu içerik için henüz bir kullanıcı yorumu girilmedi.')}</p>
                        ${isUserOwner ? `
                            <div class="user-review-edit-wrap">
                                <textarea class="user-review-textarea" data-item-id="${this.escapeHtml(itemId)}" maxlength="150" placeholder="Bu yapım için kısa bir kullanıcı yorumu ekle (maks. 150 karakter)...">${this.escapeHtml(savedNote)}</textarea>
                                <div class="user-review-char-count">${savedNote.length} / 150</div>
                            </div>
                        ` : ''}
                    </div>
                `;

                const reviewDrawerHtml = (isUserOwner || hasNote)
                    ? `<div class="top-item-review-drawer" data-for-id="${this.escapeHtml(itemId)}">${userReviewHtml}</div>`
                    : '';

                return `
                    <div class="top-item-unit tier-${tierName} ${isHero ? 'is-hero' : ''}" data-index="${idx}" data-original-index="${idx}" data-id="${this.escapeHtml(itemId)}">
                        <div class="top-item-card tier-${tierName} ${isHero ? 'is-hero' : ''}" role="button" tabindex="0">
                            ${thumbHtml}
                            <div class="top-item-content">
                                <div class="top-item-header-row">
                                    ${crownHtml}
                                    <span class="top-item-rank tier-${tierName}">#${idx + 1}</span>
                                    <h4 class="top-item-title">${this.escapeHtml(item.baslik)}</h4>
                                    ${commentBadgeHtml}
                                    ${headerMetaHtml}
                                </div>
                                <p class="top-item-desc">${this.escapeHtml(item.aciklama || '')}</p>
                                ${footerMetaHtml}
                            </div>
                        </div>
                        ${reviewDrawerHtml}
                    </div>
                `;
            }).join('');

            // Kart Sahibi İçin Afiş Buton Slotu (Slot < 3 ise)
            let addPosterSlotHtml = '';
            if (isUserOwner && ogeler.length < 3) {
                const kalan = 3 - ogeler.length;
                addPosterSlotHtml = `
                    <div class="top-poster-add-card" id="top-add-poster-btn" role="button" tabindex="0" title="İçerik Ara ve Ekle">
                        <div class="top-poster-add-thumb">
                            <div class="top-poster-add-icon-wrap">
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </div>
                            <span class="top-poster-badge">2:3 Afiş</span>
                        </div>
                        <div class="top-poster-add-info">
                            <div class="top-poster-add-title">İçerik Ekle (${ogeler.length}/3)</div>
                            <div class="top-poster-add-sub">Afiş aramak için tıkla &bull; ${kalan} slot kaldı</div>
                        </div>
                    </div>
                `;
            }

            companionBody.innerHTML = `
                <div class="tops-container-wrap" id="tops-container-wrap">
                    ${kartlarHtml}
                    ${addPosterSlotHtml}
                </div>
            `;

            // Afiş Genişleme (Expand & Focus) — Sadece düzenleme modu KAPALIYKEN çalışır!
            const topsContainer = companionBody.querySelector('#tops-container-wrap');
            if (topsContainer) {
                topsContainer.querySelectorAll('.top-item-unit').forEach(unit => {
                    const card = unit.querySelector('.top-item-card');
                    if (!card) return;

                    card.addEventListener('click', (e) => {
                        const compCard = document.getElementById('topsCompanionCard');
                        if (compCard && compCard.classList.contains('is-detail-editing')) {
                            return; // Düzenleme modu açıkken afiş genişlemesi devre dışı
                        }
                        if (window._suruklemeBitti && Date.now() - window._suruklemeBitti < 250) {
                            return;
                        }
                        if (e.target.closest('.item-delete-btn')) {
                            return;
                        }

                        const isAlreadyExpanded = unit.classList.contains('is-expanded');
                        topsContainer.querySelectorAll('.top-item-unit').forEach(u => {
                            u.classList.remove('is-expanded');
                            const c = u.querySelector('.top-item-card');
                            if (c) c.classList.remove('is-expanded');
                        });

                        if (isAlreadyExpanded) {
                            topsContainer.classList.remove('has-expanded-item');
                        } else {
                            topsContainer.classList.add('has-expanded-item');
                            unit.classList.add('is-expanded');
                            card.classList.add('is-expanded');
                        }
                    });
                });

            }

            // Harici Link Çizimi
            if (footerEl) {
                const compCard = document.getElementById('topsCompanionCard');
                const isEditing = compCard && compCard.classList.contains('is-detail-editing');

                if (isEditing) {
                    // Düzenleme modunda şık inline link input alanı
                    const currentUrl = aktifListe.harici_link?.url || '';
                    footerEl.innerHTML = `
                        <div class="companion-footer-edit-wrap">
                            <input type="url" class="companion-footer-link-input" id="companionFooterLinkInput" placeholder="Harici profil / liste bağlantısı ekle (https://...)" value="${this.escapeHtml(currentUrl)}">
                        </div>
                    `;
                    footerEl.style.display = 'flex';
                } else if (aktifListe.harici_link && aktifListe.harici_link.url) {
                    const linkUrl = aktifListe.harici_link.url;
                    const linkDomain = this.getCleanDomain(linkUrl);
                    const faviconHtml = this.getLinkIcon(linkUrl);
                    footerEl.innerHTML = `
                        <a href="${this.safeUrl(linkUrl)}" target="_blank" rel="noopener noreferrer" class="companion-footer-link" title="${this.escapeHtml(linkDomain)}">
                            <span class="companion-link-favicon-wrap">${faviconHtml}</span>
                            <span class="companion-link-domain">${this.escapeHtml(linkDomain)}</span>
                        </a>
                    `;
                    footerEl.style.display = 'flex';
                } else {
                    footerEl.innerHTML = '';
                    footerEl.style.display = 'none';
                }
            }
        }

        if (isUserOwner && typeof EditManager !== 'undefined' && EditManager.CompanionViews) {
            EditManager.CompanionViews.init();
        }
    },

    monkeytypeGuncelle(data) {
        if (!data) return;
        if (typeof kartVerisi !== 'undefined') {
            if (!kartVerisi._canli_trophies) kartVerisi._canli_trophies = {};
            kartVerisi._canli_trophies.monkeytype = data;
            kartVerisi.canli_monkeytype = data;
            this.trophiesCiz(kartVerisi);
        }
    },

    safeUrl(url) {
        if (!url) return '#';
        let temiz = String(url).trim();
        if (!temiz.startsWith('http://') && !temiz.startsWith('https://')) {
            temiz = 'https://' + temiz;
        }
        return /^https?:\/\/[^"'\s<>]+$/i.test(temiz) ? this.escapeHtml(temiz) : '#';
    },

    getCleanDomain(url) {
        if (!url) return '';
        try {
            let parsed = String(url).trim();
            if (!parsed.startsWith('http://') && !parsed.startsWith('https://')) {
                parsed = 'https://' + parsed;
            }
            return new URL(parsed).hostname.replace(/^www\./i, '');
        } catch {
            return 'Harici Bağlantı';
        }
    },

    getGorselUrl(url) {
        if (!url || typeof url !== 'string') return null;
        const temiz = url.trim();
        if (temiz.startsWith('data:image/') || temiz.startsWith('blob:')) {
            return temiz;
        }
        return this.safeUrl(temiz);
    },

    getLinkIcon(url) {
        const fallbackSvg = '<svg class="link-fallback-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
        if (!url) return fallbackSvg;
        try {
            let parsed = String(url).trim();
            if (!parsed.startsWith('http://') && !parsed.startsWith('https://')) {
                parsed = 'https://' + parsed;
            }
            const domain = new URL(parsed).hostname.replace(/^www\./, '');
            if (!domain) return fallbackSvg;
            return `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64" alt="Site İkonu" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';"><svg class="link-fallback-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
        } catch (e) {
            return fallbackSvg;
        }
    },

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};
// #endregion
