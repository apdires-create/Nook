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

        // Dinamik Üst Başlık ve İkon Güncellemesi (Gaming / Widgets / Trophies)
        if (masterTitle) {
            masterTitle.textContent = isAchievementsMode ? 'Trophies' : (isWidgetsMode ? 'Widgets' : 'Gaming');
        }
        if (brandIcon) {
            if (isAchievementsMode) {
                brandIcon.style.color = '#fcc419';
                brandIcon.innerHTML = `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>`;
            } else if (isWidgetsMode) {
                brandIcon.style.color = '#20c997';
                brandIcon.innerHTML = `<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect>`;
            } else {
                brandIcon.style.color = '#5c7cfa';
                brandIcon.innerHTML = `<line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect>`;
            }
        }

        const kart = (data && data.kullanici_adi) ? data : (typeof kartVerisi !== 'undefined' ? kartVerisi : {});
        const isUserOwner = (typeof isOwner !== 'undefined' && isOwner);
        if (!kart._canli_trophies) kart._canli_trophies = {};
        if (kart.canli_monkeytype && !kart._canli_trophies.monkeytype) {
            kart._canli_trophies.monkeytype = kart.canli_monkeytype;
        }

        // Eğer Trophies (Başarılar) modundaysak (Adım 3B hazırlık ekranı)
        if (isAchievementsMode) {
            masterView.style.display = 'flex';
            if (detailView) detailView.style.display = 'none';
            if (detailFooter) { detailFooter.innerHTML = ''; detailFooter.style.display = 'none'; }
            masterList.innerHTML = `
                <div class="companion-empty-state" style="padding: 4cqh 2cqw; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div class="companion-empty-title" style="margin-bottom: 0.8cqh; color: #fcc419;">🏆 Trophies & Başarılar</div>
                    <p class="companion-empty-desc" style="color: var(--text-tertiary);">Kişisel başarılar, ödüller ve dönüm noktaları vitrini bir sonraki adımda burada yer alacak.</p>
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
                    const rawLive = kart._canli_trophies?.[item.tur] || TrophiesManager._getCache(item.tur, item.kullanici) || null;
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
                let rawLive = kart._canli_trophies?.[activeTur] || TrophiesManager._getCache(activeTur, kullanici) || null;
                const norm = TrophiesManager.getNormalizedTrophyData(activeTur, kullanici, rawLive, seciliOge?.snap);

                if (detailBody) {
                    detailBody.innerHTML = this.renderTrophyRootLayout(norm);
                }

                // Eğer canlı veri henüz bellekte yoksa arka planda lazy olarak çek ve görünümü tazele
                if (!rawLive && !window[`_fetchingTrophy_${activeTur}_${kullanici}`]) {
                    window[`_fetchingTrophy_${activeTur}_${kullanici}`] = true;
                    TrophiesManager.canliVeriCek(activeTur, kullanici).then(fetched => {
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
                    detailFooter.innerHTML = `
                        <a href="${this.safeUrl(norm.profileUrl)}" target="_blank" rel="noopener noreferrer" class="companion-footer-link" title="${this.escapeHtml(norm.baslik)} Profilini Gör">
                            <span class="companion-link-favicon-wrap">
                                <img src="${this.escapeHtml(norm.faviconUrl)}" class="companion-row-favicon" loading="lazy" alt="${this.escapeHtml(norm.baslik)}"
                                     onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';">
                                <span class="mt-brand-icon" style="display:none;">${this.escapeHtml(fallbackHarf)}</span>
                            </span>
                            <span class="companion-link-domain">${this.escapeHtml(norm.handle)}</span>
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
                    <span class="trophy-id-badge">${this.escapeHtml(norm.badge || 'AKTİF')}</span>
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
                const commentBadgeHtml = savedNote.trim()
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
                        <div class="top-item-review-drawer" data-for-id="${this.escapeHtml(itemId)}">
                            ${userReviewHtml}
                        </div>
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
