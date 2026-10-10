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
        const menuOwnerName = document.getElementById('menuOwnerName');

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
        if (menuOwnerName) menuOwnerName.textContent = isim;

        const sekmeNick = data.kullanici_adi || (typeof KULLANICI_ADI !== 'undefined' ? KULLANICI_ADI : null);
        if (sekmeNick) {
            document.title = `Nook - @${sekmeNick}`;
        }

        if (tagsGrid) {
            const tags = Array.isArray(front.tags) ? front.tags.filter(t => t && String(t).trim() !== '') : [];
            tagsGrid.innerHTML = tags
                .slice(0, 6)
                .map(tag => `<span class="tag-pill">${this.escapeHtml(tag)}</span>`)
                .join('');
        }

        // Eğer sahip modundaysak ve EditManager yüklüyse düzenleme kontrollerini bağla
        if (typeof isOwner !== 'undefined' && isOwner && typeof EditManager !== 'undefined') {
            EditManager.Vitrin?.init();
            EditManager.Media?.overlayleriYerlestir();
        }
    },

    // #region KATEGORİ İKON VE ROZET MERKEZİ (SINGLE SOURCE OF TRUTH)
    getCategoryIcon(catId, size = 18) {
        const icons = {
            'links': `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
            'tops': `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"></path><path d="M7 6H4a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4h1"></path><path d="M17 6h3a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-1"></path></svg>`,
            'widgets': `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="6" y1="8" x2="6" y2="8.01"></line><line x1="10" y1="8" x2="10" y2="8.01"></line><line x1="14" y1="8" x2="14" y2="8.01"></line><line x1="18" y1="8" x2="18" y2="8.01"></line><line x1="6" y1="12" x2="6" y2="12.01"></line><line x1="10" y1="12" x2="10" y2="12.01"></line><line x1="14" y1="12" x2="14" y2="12.01"></line><line x1="18" y1="12" x2="18" y2="12.01"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg>`,
            'working-on': `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
            'trophies': `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>`
        };
        return icons[catId] || icons['links'];
    },

    getCategoryBadge(catId, isHeader = false) {
        const iconHtml = this.getCategoryIcon(catId, isHeader ? 18 : 16);
        const headerClass = isHeader ? 'is-header-badge' : '';
        return `
            <span class="category-icon-badge ${headerClass}" data-cat="${catId}">
                <span class="badge-icon-normal">${iconHtml}</span>
            </span>
        `;
    },
    // #endregion

    // 1.2: Arka Yüz (Saf Linkler) Render Fonksiyonu
    linklerCiz(data) {
        const wrapper = document.getElementById('links-wrapper');
        if (!wrapper) return;

        const kart = (data && data.kullanici_adi) ? data : (typeof kartVerisi !== 'undefined' ? kartVerisi : {});
        const links = Array.isArray(kart.links) ? kart.links : (Array.isArray(data) ? data : []);
        const isUserOwner = (typeof isOwner !== 'undefined' && isOwner);

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

        // Sahip modunda düzenleme kontrollerini bağla
        if (isUserOwner && typeof EditManager !== 'undefined' && EditManager.BackViews) {
            EditManager.BackViews.init();
        }
    },

    menuCiz(data) {
        this.linklerCiz(data);
    },

    altEkranlariCiz(data) {
        this.linklerCiz(data);
    },

    // 1.3: Trophies Eşlikçi Kart Render Motoru (Master & Detail)
    trophiesCiz(data) {
        const masterView = document.getElementById('trophiesMasterView');
        const detailView = document.getElementById('trophiesDetailView');
        const masterList = document.getElementById('trophiesMasterList');
        const detailTitle = document.getElementById('trophiesDetailTitle');
        const detailBody = document.getElementById('trophiesDetailBody');
        const deleteActiveBtn = document.getElementById('trophiesDeleteActiveBtn');
        const backBtn = document.getElementById('trophiesBackBtn');

        if (!masterView || !masterList) return;

        const kart = (data && data.kullanici_adi) ? data : (typeof kartVerisi !== 'undefined' ? kartVerisi : {});
        const isUserOwner = (typeof isOwner !== 'undefined' && isOwner);

        // Monkeytype verisini bul (trophies veya geriye dönük widgets fallback)
        let mtData = null;
        if (kart.trophies) {
            if (kart.trophies.monkeytype) {
                mtData = kart.trophies.monkeytype;
            } else if (Array.isArray(kart.trophies)) {
                mtData = kart.trophies.find(x => x.tur === 'monkeytype');
            }
        }
        if (!mtData && Array.isArray(kart.widgets)) {
            mtData = kart.widgets.find(x => x.tur === 'monkeytype');
        }

        const username = mtData ? (mtData.kullanici || mtData.username || mtData.ayarlar?.kullanici || '') : '';
        const live = (typeof kartVerisi !== 'undefined' && kartVerisi.canli_monkeytype) ? kartVerisi.canli_monkeytype : null;

        // Aktif detay görünümü durumu: window._activeTrophyDetail ('monkeytype' vs null)
        const activeTrophy = window._activeTrophyDetail || null;

        if (!activeTrophy) {
            // ==========================================
            // MASTER GÖRÜNÜMÜ: Başarılar Listesi
            // ==========================================
            masterView.style.display = 'flex';
            if (detailView) detailView.style.display = 'none';

            let itemsHtml = '';

            // Monkeytype Öğesi
            if (username) {
                itemsHtml += `
                    <div class="companion-row-item" data-trophy-id="monkeytype" role="button" tabindex="0">
                        <div class="companion-row-icon-wrap" style="background: rgba(234, 179, 8, 0.12); color: #eab308;">
                            <span style="font-weight: 800; font-size: 0.85rem; letter-spacing: -0.5px;">mt</span>
                        </div>
                        <div class="companion-row-info">
                            <span class="companion-row-title">Monkeytype</span>
                            <span class="companion-row-meta">@${this.escapeHtml(username)}</span>
                        </div>
                        ${isUserOwner ? `
                            <button type="button" class="companion-row-del-btn" data-del-trophy="monkeytype" title="Monkeytype'ı Kaldır">
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                `;
            }

            // Eğer hiç başarı yoksa ve sahipse yönlendirme
            if (!username) {
                if (isUserOwner) {
                    itemsHtml += `
                        <div class="companion-empty-state" style="padding: 4cqh 2cqw; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <div class="companion-empty-title" style="margin-bottom: 0.8cqh;">Başarı Ekle</div>
                            <p class="companion-empty-desc" style="margin-bottom: 2.2cqh; color: var(--text-tertiary);">Klavye hız rekorlarını veya dijital başarımlarını profilinde sergile.</p>
                            <button type="button" class="companion-add-row-btn" id="trophiesMasterAddBtn" style="width: auto; padding: 1.2cqh 5cqw;">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Başarını Sergile</span>
                            </button>
                        </div>
                    `;
                } else {
                    itemsHtml += `
                        <div class="companion-empty-state" style="padding: 4cqh 2cqw; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <div class="companion-empty-title">Henüz Bir Başarı Yok</div>
                            <p class="companion-empty-desc" style="color: var(--text-tertiary);">Kullanıcı bu vitrinde henüz bir başarım paylaşmamış.</p>
                        </div>
                    `;
                }
            } else if (isUserOwner) {
                itemsHtml += `
                    <button type="button" class="companion-add-row-btn" id="trophiesMasterAddBtn" style="margin-top: 4px;">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>Başarını Sergile</span>
                    </button>
                `;
            }

            masterList.innerHTML = itemsHtml;

            // Master satır tıklamaları (Detaya git)
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
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    const trophyId = delBtn.dataset.delTrophy;
                    if (trophyId === 'monkeytype') {
                        if (confirm("Monkeytype rekorunu kaldırmak istediğinize emin misiniz?")) {
                            if (kartVerisi.trophies) delete kartVerisi.trophies.monkeytype;
                            if (Array.isArray(kartVerisi.widgets)) {
                                kartVerisi.widgets = kartVerisi.widgets.filter(x => x.tur !== 'monkeytype');
                            }
                            delete kartVerisi.canli_monkeytype;
                            this.trophiesCiz(kartVerisi);
                            if (typeof EditManager !== 'undefined') {
                                EditManager.Global.degisiklikYapildi();
                            }
                        }
                    }
                };
            });

            // Master Add Buton
            const masterAddBtn = masterList.querySelector('#trophiesMasterAddBtn');
            if (masterAddBtn) {
                masterAddBtn.onclick = () => {
                    if (typeof EditManager !== 'undefined' && EditManager.TrophyPicker) {
                        EditManager.TrophyPicker.ac();
                    } else if (typeof toastBildirimiGoster === 'function') {
                        toastBildirimiGoster("Başarım seçici yükleniyor...", 2000);
                    }
                };
            }

        } else if (activeTrophy === 'monkeytype') {
            // ==========================================
            // DETAY GÖRÜNÜMÜ: Monkeytype Detay Ekranı
            // ==========================================
            masterView.style.display = 'none';
            if (detailView) detailView.style.display = 'flex';

            if (detailTitle) detailTitle.textContent = 'Monkeytype';
            if (deleteActiveBtn) deleteActiveBtn.style.display = isUserOwner ? 'inline-flex' : 'none';

            // Geri butonu
            if (backBtn) {
                backBtn.onclick = () => {
                    window._activeTrophyDetail = null;
                    this.trophiesCiz(kart);
                };
            }

            if (deleteActiveBtn) {
                deleteActiveBtn.onclick = () => {
                    if (confirm("Monkeytype rekorunu kaldırmak istediğinize emin misiniz?")) {
                        if (kartVerisi.trophies) delete kartVerisi.trophies.monkeytype;
                        if (Array.isArray(kartVerisi.widgets)) {
                            kartVerisi.widgets = kartVerisi.widgets.filter(x => x.tur !== 'monkeytype');
                        }
                        delete kartVerisi.canli_monkeytype;
                        window._activeTrophyDetail = null;
                        this.trophiesCiz(kartVerisi);
                        if (typeof EditManager !== 'undefined') {
                            EditManager.Global.degisiklikYapildi();
                        }
                    }
                };
            }

            let mtHtml = '';
            if (username) {
                const getStat = (mode, amount) => {
                    if (!live) return { wpm: '-', acc: '-' };
                    const modeData = live[mode];
                    const stat = (modeData && modeData[amount]) ? modeData[amount][0] : null;
                    if (!stat) return { wpm: '-', acc: '-' };
                    return {
                        wpm: Math.round(stat.wpm || 0),
                        acc: Math.round(stat.acc || 0)
                    };
                };

                const t15 = getStat('time', '15');
                const t60 = getStat('time', '60');
                const w10 = getStat('words', '10');
                const w25 = getStat('words', '25');

                mtHtml = `
                    <div class="monkeytype-card" data-username="${this.escapeHtml(username)}">
                        <div class="mt-card-header">
                            <div class="mt-brand-badge">
                                <span class="mt-brand-icon">mt</span>
                                <span class="mt-brand-name">monkeytype</span>
                            </div>
                            <a href="https://monkeytype.com/profile/${encodeURIComponent(username)}" target="_blank" rel="noopener noreferrer" class="mt-profile-link" title="Monkeytype Profilini Gör">
                                <span>@${this.escapeHtml(username)}</span>
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                            </a>
                        </div>

                        <div class="mt-scores-grid">
                            <div class="mt-score-box" data-mode="time" data-amount="15">
                                <span class="mt-score-title">15s Time</span>
                                <div class="mt-score-main">
                                    <span class="mt-score-wpm">${t15.wpm}</span>
                                    <span class="mt-score-unit">wpm</span>
                                </div>
                                <span class="mt-score-acc">${t15.acc !== '-' ? `${t15.acc}% acc` : '-% acc'}</span>
                            </div>

                            <div class="mt-score-box" data-mode="time" data-amount="60">
                                <span class="mt-score-title">60s Time</span>
                                <div class="mt-score-main">
                                    <span class="mt-score-wpm">${t60.wpm}</span>
                                    <span class="mt-score-unit">wpm</span>
                                </div>
                                <span class="mt-score-acc">${t60.acc !== '-' ? `${t60.acc}% acc` : '-% acc'}</span>
                            </div>

                            <div class="mt-score-box" data-mode="words" data-amount="10">
                                <span class="mt-score-title">10 Words</span>
                                <div class="mt-score-main">
                                    <span class="mt-score-wpm">${w10.wpm}</span>
                                    <span class="mt-score-unit">wpm</span>
                                </div>
                                <span class="mt-score-acc">${w10.acc !== '-' ? `${w10.acc}% acc` : '-% acc'}</span>
                            </div>

                            <div class="mt-score-box" data-mode="words" data-amount="25">
                                <span class="mt-score-title">25 Words</span>
                                <div class="mt-score-main">
                                    <span class="mt-score-wpm">${w25.wpm}</span>
                                    <span class="mt-score-unit">wpm</span>
                                </div>
                                <span class="mt-score-acc">${w25.acc !== '-' ? `${w25.acc}% acc` : '-% acc'}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                mtHtml = `<p class="placeholder-text" style="text-align: center; color: var(--text-tertiary); padding: 3cqh 0;">Henüz Monkeytype hesabı eklenmemiş.</p>`;
            }

            if (detailBody) detailBody.innerHTML = mtHtml;
        }

        if (isUserOwner && typeof EditManager !== 'undefined' && EditManager.TrophiesView) {
            EditManager.TrophiesView.init();
        }
    },

    // 1.4: Tekrarlayan Alt Ekran Şablonu (DRY)
    ekranKabuguOlustur(id, baslik, icerikHtml) {
        const panel = document.createElement('div');
        panel.className = 'view-panel view-detail';
        panel.id = `view-${id}`;

        panel.innerHTML = `
            <div class="view-header">
                <button class="nook-icon-btn back-btn" data-action="back" title="Geri">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <div class="view-header-title-wrap">
                    ${this.getCategoryBadge(id, true)}
                    <h3 class="view-title">${this.escapeHtml(baslik)}</h3>
                </div>
                <button class="nook-icon-btn delete-section-btn" data-section-id="${id}" data-section-title="${this.escapeHtml(baslik)}" title="Bloğu Sil">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
            <div class="scrollable-fade">
                ${icerikHtml}
            </div>
        `;
        return panel;
    },

    // 1.5: Alt İçerik Üreticileri
    linksIcerikHTML(links) {
        if (!Array.isArray(links) || links.length === 0) {
            return `<div class="links-wrapper" id="links-wrapper"><p class="placeholder-text">Henüz bağlantı eklenmemiş.</p></div>`;
        }
        return `
            <div class="links-wrapper" id="links-wrapper">
                ${links.map(link => {
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
                }).join('')}
            </div>
        `;
    },

    // 1.5: TOPS EŞLİKÇİ KART (SHOWCASE WING) RENDER MOTORU (MASTER & DETAIL)
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
                        if (isUserOwner && typeof EditManager !== 'undefined') {
                            EditManager.CompanionViews?.init();
                        }
                    }
                };
            });

            // Master satır silme tıklamaları
            masterList.querySelectorAll('.companion-row-del-btn').forEach(delBtn => {
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    const listId = delBtn.dataset.delList;
                    const listTitle = delBtn.dataset.listTitle || 'Liste';
                    if (confirm(`"${listTitle}" listesini ve içindeki tüm afişleri silmek istediğinize emin misiniz?`)) {
                        const idx = tops.listeler.findIndex(l => l.id === listId);
                        if (idx > -1) {
                            tops.listeler.splice(idx, 1);
                            if (tops.aktifListeId === listId) tops.aktifListeId = null;
                            this.companionCiz(tops);
                            if (typeof EditManager !== 'undefined') {
                                EditManager.Global.degisiklikYapildi();
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
                backBtn.onclick = () => {
                    tops.aktifListeId = null;
                    const compCard = document.getElementById('topsCompanionCard');
                    if (compCard) compCard.classList.remove('is-detail-editing');
                    this.companionCiz(tops);
                };
            }

            const ogeler = Array.isArray(aktifListe.ogeler) ? aktifListe.ogeler : [];

            // Afiş Kartları (Maksimum 3 adet)
            const kartlarHtml = ogeler.slice(0, 3).map((item, idx) => {
                const rawAfis = item.afis_url || item.gorsel_url;
                const safeAfis = this.getGorselUrl(rawAfis);
                const itemId = item.id || item.kimlik || ('top_' + (idx + 1));
                const thumbHtml = (safeAfis && safeAfis !== '#')
                    ? `<img class="top-item-thumb" src="${safeAfis}" alt="${this.escapeHtml(item.baslik || '')}" decoding="async" draggable="false" referrerpolicy="no-referrer" onerror="this.style.display='none'">`
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

                return `
                    <div class="top-item-card" data-index="${idx}" data-original-index="${idx}" data-id="${this.escapeHtml(itemId)}" role="button" tabindex="0">
                        ${thumbHtml}
                        <div class="top-item-content">
                            <div class="top-item-header-row">
                                <span class="top-item-rank">#${idx + 1}</span>
                                <h4 class="top-item-title">${this.escapeHtml(item.baslik)}</h4>
                                ${headerMetaHtml}
                            </div>
                            <p class="top-item-desc">${this.escapeHtml(item.aciklama || '')}</p>
                            ${footerMetaHtml}
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
                topsContainer.querySelectorAll('.top-item-card').forEach(card => {
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

                        const isAlreadyExpanded = card.classList.contains('is-expanded');
                        topsContainer.querySelectorAll('.top-item-card').forEach(c => {
                            c.classList.remove('is-expanded');
                        });

                        if (isAlreadyExpanded) {
                            topsContainer.classList.remove('has-expanded-item');
                        } else {
                            topsContainer.classList.add('has-expanded-item');
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
    },

    trophiesIcerikHTML(trophies) {
        if (!Array.isArray(trophies) || trophies.length === 0) {
            return `<p class="placeholder-text">Trophies & achievements showcase coming soon.</p>`;
        }
        return trophies.map(t => `
            <div class="status-card">
                <span class="status-dot"></span>
                <p class="status-text"><strong>${this.escapeHtml(t.baslik || '')}</strong>: ${this.escapeHtml(t.aciklama || '')}</p>
            </div>
        `).join('');
    },

    widgetsIcerikHTML(widgets) {
        if (!Array.isArray(widgets) || widgets.length === 0) {
            return `<p class="placeholder-text">Henüz bir widget eklenmemiş.</p>`;
        }

        return widgets.map(w => {
            if (w.tur === 'monkeytype') {
                const username = w.ayarlar?.kullanici || w.kullanici || w.username || '';
                const live = (typeof kartVerisi !== 'undefined' && kartVerisi.canli_monkeytype) ? kartVerisi.canli_monkeytype : null;

                const getStat = (mode, amount) => {
                    if (!live) return { wpm: '-', acc: '-' };
                    const modeData = live[mode];
                    const stat = (modeData && modeData[amount]) ? modeData[amount][0] : null;
                    if (!stat) return { wpm: '-', acc: '-' };
                    return {
                        wpm: Math.round(stat.wpm || 0),
                        acc: Math.round(stat.acc || 0)
                    };
                };

                const t15 = getStat('time', '15');
                const t60 = getStat('time', '60');
                const w10 = getStat('words', '10');
                const w25 = getStat('words', '25');

                return `
                    <div class="monkeytype-card" data-username="${this.escapeHtml(username)}">
                        <div class="mt-card-header">
                            <div class="mt-brand-badge">
                                <span class="mt-brand-icon">mt</span>
                                <span class="mt-brand-name">monkeytype</span>
                            </div>
                            ${username ? `
                                <a href="https://monkeytype.com/profile/${encodeURIComponent(username)}" target="_blank" rel="noopener noreferrer" class="mt-profile-link" title="Monkeytype Profilini Gör">
                                    <span>@${this.escapeHtml(username)}</span>
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </a>
                            ` : ''}
                        </div>

                        <div class="mt-scores-grid">
                            <div class="mt-score-box" data-mode="time" data-amount="15">
                                <span class="mt-score-title">15s Time</span>
                                <div class="mt-score-main">
                                    <span class="mt-score-wpm">${t15.wpm}</span>
                                    <span class="mt-score-unit">wpm</span>
                                </div>
                                <span class="mt-score-acc">${t15.acc !== '-' ? `${t15.acc}% acc` : '-% acc'}</span>
                            </div>

                            <div class="mt-score-box" data-mode="time" data-amount="60">
                                <span class="mt-score-title">60s Time</span>
                                <div class="mt-score-main">
                                    <span class="mt-score-wpm">${t60.wpm}</span>
                                    <span class="mt-score-unit">wpm</span>
                                </div>
                                <span class="mt-score-acc">${t60.acc !== '-' ? `${t60.acc}% acc` : '-% acc'}</span>
                            </div>

                            <div class="mt-score-box" data-mode="words" data-amount="10">
                                <span class="mt-score-title">10 Words</span>
                                <div class="mt-score-main">
                                    <span class="mt-score-wpm">${w10.wpm}</span>
                                    <span class="mt-score-unit">wpm</span>
                                </div>
                                <span class="mt-score-acc">${w10.acc !== '-' ? `${w10.acc}% acc` : '-% acc'}</span>
                            </div>

                            <div class="mt-score-box" data-mode="words" data-amount="25">
                                <span class="mt-score-title">25 Words</span>
                                <div class="mt-score-main">
                                    <span class="mt-score-wpm">${w25.wpm}</span>
                                    <span class="mt-score-unit">wpm</span>
                                </div>
                                <span class="mt-score-acc">${w25.acc !== '-' ? `${w25.acc}% acc` : '-% acc'}</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="status-card">
                    <span class="status-dot"></span>
                    <p class="status-text">${this.escapeHtml(w.tur || 'Widget')}</p>
                </div>
            `;
        }).join('');
    },

    monkeytypeGuncelle(data) {
        if (!data) return;
        const veriyiYaz = (mode, amount) => {
            const modeData = data[mode];
            const stat = (modeData && modeData[amount]) ? modeData[amount][0] : null;
            if (stat && stat.wpm) {
                const box = document.querySelector(`.mt-score-box[data-mode="${mode}"][data-amount="${amount}"]`);
                if (box) {
                    const wpmEl = box.querySelector('.mt-score-wpm');
                    const accEl = box.querySelector('.mt-score-acc');
                    if (wpmEl) wpmEl.textContent = Math.round(stat.wpm);
                    if (accEl) accEl.textContent = `${Math.round(stat.acc)}% acc`;
                }
            }
        };

        ['15', '60'].forEach(a => veriyiYaz('time', a));
        ['10', '25'].forEach(a => veriyiYaz('words', a));
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
        try {
            const cached = localStorage.getItem('nook_img_' + temiz);
            if (cached && (cached.startsWith('data:image/') || cached.startsWith('blob:'))) {
                return cached;
            }
        } catch (e) {}
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

    getSafeLinkIcon(ikon) {
        const SAFE_ICONS = {
            youtube: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>',
            github: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
            twitter: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
            x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
        };
        const defaultSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>';

        if (!ikon || typeof ikon !== 'string') return defaultSvg;
        const key = ikon.toLowerCase().trim();
        if (SAFE_ICONS[key]) return SAFE_ICONS[key];

        // config.js içerisindeki SVG kalıbıyla tam eşleşen bilinen SVG'ler
        for (const safeKey in SAFE_ICONS) {
            if (SAFE_ICONS[safeKey].replace(/\s+/g, '') === key.replace(/\s+/g, '')) {
                return SAFE_ICONS[safeKey];
            }
        }
        return defaultSvg;
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
