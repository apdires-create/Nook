/**
 * Nook - ThemeMarket (Tema Marketi & Satın Alım Akışı)
 * THEME_SPEC.md 4. Adım — Güvenlik ve Rol Kısıtlamaları Entegre
 */

const ThemeMarket = {
    modalEl: null,
    gridEl: null,
    catalogViewEl: null,
    detailViewEl: null,
    detailBodyEl: null,
    selectedTheme: null,
    userInventory: new Set(['default']), // Varsayılan temaya herkes sahiptir

    // Varsayılan / Fallback Katalog Verileri (Sadece gerçek tema ürünleri listelenir)
    themesCatalog: [
        {
            id: 'obsidian-minimal',
            name: 'Obsidian Minimal',
            description: 'Mat siyah zemin, monokrom tipografi, keskin hatlar ve lüks editoryal kart estetiği.',
            price_cents: 500,
            is_active: true,
            checkout_url: 'https://apdires.gumroad.com/l/obsidian-minimal',
            banner_icon: '🖤',
            font: 'Cormorant Garamond & Plus Jakarta Sans',
            font_url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
        }
    ],

    previewBarEl: null,
    originalThemeId: null,

    init() {
        this.modalEl = document.getElementById('theme-market-modal');
        this.gridEl = document.getElementById('theme-market-grid');
        this.catalogViewEl = document.getElementById('theme-market-catalog-view');
        this.detailViewEl = document.getElementById('theme-market-detail-view');
        this.detailBodyEl = document.getElementById('theme-detail-body');
        this.previewBarEl = document.getElementById('theme-preview-bar');

        if (!this.modalEl || !this.gridEl) return;

        // Top Nav Market Butonları (Hem Profil hem Landing)
        document.querySelectorAll('.nav-market-trigger-btn, #nav-market-trigger, #landing-market-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.ac();
            };
        });

        // Kapatma butonu & backdrop
        const closeBtn = document.getElementById('theme-market-close-btn');
        const backdrop = document.getElementById('theme-market-backdrop');
        if (closeBtn) closeBtn.onclick = () => this.kapat();
        if (backdrop) backdrop.onclick = () => this.kapat();

        // Geri Butonu
        const backBtn = document.getElementById('theme-detail-back-btn');
        if (backBtn) {
            backBtn.onclick = () => this.katalogGoster();
        }

        // Önizleme Barı İptal Butonu
        const cancelPreviewBtn = document.getElementById('preview-btn-cancel');
        if (cancelPreviewBtn) {
            cancelPreviewBtn.onclick = () => this.onizlemeyiBitir();
        }

        // ESC tuşu ile kapatma
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.modalEl.classList.contains('is-open')) {
                    this.kapat();
                } else if (this.previewBarEl && this.previewBarEl.style.display !== 'none') {
                    this.onizlemeyiBitir();
                }
            }
        });

        // Ödeme sonrası geri dönüş kontrolü (?payment=success&theme=...)
        this.odemeSonrasiKontrol();
    },

    /**
     * Gumroad'dan satın alım tamamlanıp siteye dönüldüğünde envanteri tazele ve bildir
     */
    async odemeSonrasiKontrol() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
            const themeId = params.get('theme');
            
            // URL'deki parametreleri temizle (tarayıcı geçmişini kirletmesin)
            const cleanUrl = window.location.origin + window.location.pathname + (params.get('user') ? `?user=${params.get('user')}` : '');
            window.history.replaceState({}, document.title, cleanUrl);

            // Kısa bir bekleme (Webhook'un veritabanına yazması için ~1.5 sn)
            setTimeout(async () => {
                await this.kullaniciEnvanteriniYukle();
                const theme = this.themesCatalog.find(t => t.id === themeId);
                const themeName = theme ? theme.name : 'Yeni';
                
                if (typeof window.toastBildirimiGoster === 'function') {
                    window.toastBildirimiGoster(`Tebrikler! "${themeName}" teması envanterinize eklendi.`, 5000, 'success');
                }

                // Kullanıcı profil sahibiyse otomatik olarak temayı uygula
                if (theme && typeof isOwner !== 'undefined' && isOwner) {
                    await this.temayiUygula(theme);
                }
            }, 1500);
        }
    },

    async ac() {
        if (!this.modalEl) return;
        this.katalogGoster();
        this.modalEl.classList.add('is-open');

        // Veritabanından güncel temaları ve kullanıcının envanterini yükle
        try {
            await this.temalariVeritabanindanYukle();
            await this.kullaniciEnvanteriniYukle();
            this.katalogCiz();
        } catch (e) {
            console.warn('[ThemeMarket] Katalog/Envanter yükleme hatası:', e);
            this.katalogCiz();
        }
    },

    /**
     * Supabase public.themes tablosundan aktif temaları çeker
     */
    async temalariVeritabanindanYukle() {
        const client = (typeof supabaseClient !== 'undefined' && supabaseClient) 
            || (typeof supabaseIstemcisi !== 'undefined' && supabaseIstemcisi) 
            || null;

        if (!client) return;

        try {
            const { data, error } = await client
                .from('themes')
                .select('*')
                .eq('is_active', true)
                .neq('id', 'default')
                .neq('id', '_template');

            if (!error && Array.isArray(data) && data.length > 0) {
                data.forEach(remoteTheme => {
                    const localIdx = this.themesCatalog.findIndex(t => t.id === remoteTheme.id);
                    if (localIdx >= 0) {
                        this.themesCatalog[localIdx] = {
                            ...this.themesCatalog[localIdx],
                            ...remoteTheme,
                            checkout_url: this.themesCatalog[localIdx].checkout_url || remoteTheme.checkout_url,
                            variant_id: this.themesCatalog[localIdx].variant_id || remoteTheme.variant_id,
                            banner_icon: this.themesCatalog[localIdx].banner_icon || remoteTheme.banner_icon
                        };
                    } else {
                        this.themesCatalog.push({
                            ...remoteTheme,
                            banner_icon: '🎨'
                        });
                    }
                });
            }
        } catch (err) {
            console.warn('[ThemeMarket] Veritabanından tema kataloğu çekilemedi (yerel katalog devrede):', err);
        }
    },

    kapat() {
        if (!this.modalEl) return;
        this.modalEl.classList.remove('is-open');
    },

    katalogGoster() {
        if (this.catalogViewEl) this.catalogViewEl.style.display = 'block';
        if (this.detailViewEl) this.detailViewEl.style.display = 'none';
        this.selectedTheme = null;
    },

    async kullaniciEnvanteriniYukle() {
        this.userInventory = new Set(['default']);

        const client = (typeof supabaseClient !== 'undefined' && supabaseClient) 
            || (typeof supabaseIstemcisi !== 'undefined' && supabaseIstemcisi) 
            || null;

        if (!client || typeof aktifKullaniciOturumu === 'undefined') {
            return;
        }

        const userId = aktifKullaniciOturumu?.user?.id;
        if (!userId) return;

        try {
            const { data, error } = await client
                .from('user_inventory')
                .select('theme_id')
                .eq('user_id', userId);

            if (!error && Array.isArray(data)) {
                data.forEach(item => this.userInventory.add(item.theme_id));
            }
        } catch (e) {
            console.warn('[ThemeMarket] Envanter çekilemedi:', e);
        }
    },

    katalogCiz() {
        if (!this.gridEl) return;

        // Kullanıcının şu anki aktif temasını belirle
        const activeThemeId = (typeof kartVerisi !== 'undefined' && kartVerisi?.theme_config?.theme_id) || 'default';

        // Sıralama: Kullanıcının kullandığı tema varsa EN YUKARI çıkar, yoksa standart sırada kalır
        const listToRender = [...this.themesCatalog].sort((a, b) => {
            if (a.id === activeThemeId) return -1;
            if (b.id === activeThemeId) return 1;
            return 0;
        });

        this.gridEl.innerHTML = listToRender.map(theme => {
            const isCurrentActive = (theme.id === activeThemeId);
            const isOwned = this.userInventory.has(theme.id);
            const isFree = theme.price_cents === 0;

            let priceLabel = `$${(theme.price_cents / 100).toFixed(2)}`;
            let priceClass = '';

            if (isCurrentActive) {
                priceLabel = 'Kullanımda';
                priceClass = 'is-active-theme';
            } else if (isOwned) {
                priceLabel = 'Sahipsin';
                priceClass = 'is-free';
            } else if (isFree) {
                priceLabel = 'Ücretsiz';
                priceClass = 'is-free';
            }

            return `
                <div class="theme-market-card ${isCurrentActive ? 'is-active' : ''}" data-theme-id="${theme.id}" role="button" tabindex="0">
                    <div class="theme-card-banner">
                        <span class="theme-card-banner-placeholder">${theme.banner_icon || '🎨'}</span>
                        ${isCurrentActive ? '<span class="theme-active-badge">Kullanımda</span>' : ''}
                    </div>
                    <div class="theme-card-body">
                        <div class="theme-card-header">
                            <h3 class="theme-card-name">${theme.name}</h3>
                            <span class="theme-card-price ${priceClass}">${priceLabel}</span>
                        </div>
                        <p class="theme-card-desc">${theme.description}</p>
                    </div>
                </div>
            `;
        }).join('');

        // Tıklayınca detay aç veya sahip olunan temada doğrudan Görünüm & Tema modalına yönlendir
        this.gridEl.querySelectorAll('.theme-market-card').forEach(card => {
            card.onclick = () => {
                const themeId = card.dataset.themeId;
                const theme = this.themesCatalog.find(t => t.id === themeId);
                if (!theme) return;

                const isUserOwner = typeof isOwner !== 'undefined' && isOwner;
                const isOwned = this.userInventory.has(theme.id) || theme.price_cents === 0;

                // Kullanıcı sahip olduğu bir temaya tıkladığında market detayını açma, doğrudan Görünüm & Tema pop-up'ına yönlendir
                if (isUserOwner && isOwned) {
                    this.kapat();
                    if (typeof EditManager !== 'undefined' && EditManager.Appearance) {
                        EditManager.Appearance.ac();
                        EditManager.Appearance.temaSec(theme.id);
                    }
                    return;
                }

                this.detayGoster(theme);
            };
        });
    },

    detayGoster(theme) {
        if (!this.catalogViewEl || !this.detailViewEl || !this.detailBodyEl) return;

        const isUserOwner = typeof isOwner !== 'undefined' && isOwner;
        const isLanding = typeof KULLANICI_ADI === 'undefined' || !KULLANICI_ADI;
        const isOwned = this.userInventory.has(theme.id) || theme.price_cents === 0;

        // Kullanıcı sahip olduğu bir temada detay açmak isterse Görünüm modalına yönlendir
        if (isUserOwner && isOwned) {
            this.kapat();
            if (typeof EditManager !== 'undefined' && EditManager.Appearance) {
                EditManager.Appearance.ac();
                EditManager.Appearance.temaSec(theme.id);
            }
            return;
        }

        this.selectedTheme = theme;
        this.catalogViewEl.style.display = 'none';
        this.detailViewEl.style.display = 'flex';

        const currentActiveTheme = (typeof kartVerisi !== 'undefined' && kartVerisi?.theme_config?.theme_id) || 'default';
        const isCurrentActive = currentActiveTheme === theme.id;

        let actionBtnHtml = '';

        if (isCurrentActive) {
            actionBtnHtml = `<button type="button" class="theme-detail-btn" style="background: rgba(255,255,255,0.08); color: var(--text-tertiary); cursor: default;" disabled>Kullanımda</button>`;
        } else if (isOwned) {
            actionBtnHtml = `<button type="button" class="theme-detail-btn" style="background: rgba(255,255,255,0.08); color: var(--text-tertiary); cursor: default;" disabled>Sahipsin</button>`;
        } else {
            actionBtnHtml = `<button type="button" class="theme-detail-btn is-buy" id="theme-btn-buy">Satın Al — $${(theme.price_cents / 100).toFixed(2)}</button>`;
        }

        // Önizleme butonu sadece sayfa sahibi kendi profilindeyken görünür (Landing ve ziyaretçilerde YOKTUR)
        const canPreview = isUserOwner && !isLanding;
        const previewBtnHtml = canPreview ? `<button type="button" class="theme-detail-btn is-preview" id="theme-btn-preview">Canlı Önizle</button>` : '';

        this.detailBodyEl.innerHTML = `
            <div class="theme-detail-hero">
                <span style="font-size: 3.5rem;">${theme.banner_icon || '🎨'}</span>
            </div>
            <div class="theme-detail-meta">
                <h3 class="theme-detail-title">${theme.name}</h3>
                <span class="theme-card-price ${isOwned ? 'is-free' : ''}">
                    ${isCurrentActive ? 'Kullanımda' : (isOwned ? 'Sahipsin' : `$${(theme.price_cents / 100).toFixed(2)}`)}
                </span>
            </div>
            <p class="theme-detail-desc">${theme.description}</p>
            <div class="theme-detail-actions">
                ${previewBtnHtml}
                ${actionBtnHtml}
            </div>
        `;

        // Aksiyon Butonları Bağlantıları
        const previewBtn = document.getElementById('theme-btn-preview');
        const buyBtn = document.getElementById('theme-btn-buy');

        if (previewBtn) {
            previewBtn.onclick = () => this.onizlemeBaslat(theme);
        }

        if (buyBtn) {
            buyBtn.onclick = () => this.satinAl(theme);
        }
    },

    /**
     * Canlı Önizleme Motoru
     * Kartın state'ini geçici olarak ezer ve yüzen önizleme barını açar
     */
    async onizlemeBaslat(theme) {
        if (!this.originalThemeId) {
            this.originalThemeId = kartVerisi?.theme_config?.theme_id || 'default';
        }

        // Modalı kapat ki kullanıcı kartı tam görebilsin
        this.kapat();

        // Kart düzenleme araçlarını dondur (inceleme modu)
        if (typeof EditManager !== 'undefined' && EditManager.Appearance) {
            EditManager.Appearance.freezeEditMode();
        }

        // Temayı geçici uygula
        if (typeof ThemeManager !== 'undefined') {
            await ThemeManager.applyTheme(theme.id, { fontUrl: theme.font_url || theme.fontUrl });
        }

        // Yüzen Önizleme Barını Göster ve Güncelle
        if (this.previewBarEl) {
            const titleEl = document.getElementById('preview-bar-theme-name');
            const actionBtn = document.getElementById('preview-btn-action');
            const cancelBtn = document.getElementById('preview-btn-cancel');

            if (titleEl) {
                titleEl.textContent = `"${theme.name}" Önizleniyor`;
            }

            if (cancelBtn) {
                cancelBtn.onclick = () => this.onizlemeyiBitir(true);
            }

            if (actionBtn) {
                const isOwned = this.userInventory.has(theme.id) || theme.price_cents === 0;
                if (isOwned) {
                    actionBtn.textContent = 'Görünümde Düzenle';
                    actionBtn.className = 'theme-preview-btn is-apply-action';
                    actionBtn.onclick = async () => {
                        await this.onizlemeyiBitir(false);
                        if (typeof EditManager !== 'undefined' && EditManager.Appearance) {
                            EditManager.Appearance.ac();
                            EditManager.Appearance.temaSec(theme.id);
                        }
                    };
                } else {
                    actionBtn.textContent = `Satın Al ($${(theme.price_cents / 100).toFixed(2)})`;
                    actionBtn.className = 'theme-preview-btn is-action';
                    actionBtn.onclick = () => this.satinAl(theme);
                }
            }

            this.previewBarEl.style.display = 'block';
        }

        if (typeof window.toastBildirimiGoster === 'function') {
            window.toastBildirimiGoster(`"${theme.name}" teması önizleniyor.`, 2500, 'info');
        }
    },

    /**
     * Önizleme Modundan Çıkış ve Eski Temaya Geri Dönüş
     */
    async onizlemeyiBitir(revertToOriginal = true) {
        if (this.previewBarEl) {
            this.previewBarEl.style.display = 'none';
        }

        // Kart düzenleme dondurmasını kaldır
        if (typeof EditManager !== 'undefined' && EditManager.Appearance) {
            EditManager.Appearance.unfreezeEditMode();
        }

        if (revertToOriginal && this.originalThemeId) {
            if (typeof ThemeManager !== 'undefined') {
                const origTheme = this.themesCatalog.find(t => t.id === this.originalThemeId);
                await ThemeManager.applyTheme(this.originalThemeId, { 
                    fontUrl: origTheme?.font_url || origTheme?.fontUrl,
                    primaryColor: kartVerisi?.theme_config?.primary_color
                });
            }
            if (typeof window.toastBildirimiGoster === 'function') {
                window.toastBildirimiGoster("Orijinal temaya dönüldü.", 2000, 'info');
            }
        }

        this.originalThemeId = null;
    },

    /**
     * Gumroad Satın Alma Yönlendirmesi
     */
    satinAl(theme) {
        const checkoutUrl = this.satinAlmaLinkiniUret(theme.checkout_url || 'https://apdires.gumroad.com/l/obsidian-minimal', theme.id);
        if (checkoutUrl) {
            window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
        }
    },

    satinAlmaLinkiniUret(checkoutBaseUrl, themeId) {
        if (!aktifKullaniciOturumu?.user?.id) {
            if (typeof window.toastBildirimiGoster === 'function') {
                window.toastBildirimiGoster("Satın alabilmek için lütfen giriş yapın.", 3500, 'warning');
            } else {
                alert("Satın alabilmek için lütfen giriş yapın.");
            }
            return null;
        }

        const userId = aktifKullaniciOturumu.user.id;
        const url = new URL(checkoutBaseUrl);
        url.searchParams.set('user_id', userId);
        url.searchParams.set('theme_id', themeId);
        
        return url.toString();
    },

    async temayiUygula(theme) {
        // Güvenlik: Sadece sayfa sahibi kendi profilindeyken tema uygulayabilir!
        if (typeof isOwner === 'undefined' || !isOwner || !aktifKullaniciOturumu?.user?.id) {
            if (typeof window.toastBildirimiGoster === 'function') {
                window.toastBildirimiGoster("Tema sadece profil sahibi tarafından uygulanabilir.", 3500, 'warning');
            }
            return;
        }

        try {
            const client = (typeof supabaseClient !== 'undefined' && supabaseClient) 
                || (typeof supabaseIstemcisi !== 'undefined' && supabaseIstemcisi) 
                || null;

            if (client) {
                const currentConfig = kartVerisi.theme_config || {};
                const newConfig = { ...currentConfig, theme_id: theme.id };

                const { error } = await client
                    .from('profiles')
                    .update({ theme_config: newConfig })
                    .eq('auth_id', aktifKullaniciOturumu.user.id);

                if (error) {
                    throw error;
                }

                kartVerisi.theme_config = newConfig;

                // EditManager state'ini eşitle
                if (typeof EditManager !== 'undefined' && EditManager.state && EditManager.state.orijinalVeri) {
                    EditManager.state.orijinalVeri.theme_config = JSON.parse(JSON.stringify(newConfig));
                }
            }

            // Temayı uygula
            if (typeof ThemeManager !== 'undefined') {
                await ThemeManager.applyTheme(theme.id, { 
                    fontUrl: theme.font_url || theme.fontUrl,
                    primaryColor: kartVerisi?.theme_config?.primary_color
                });
            }

            if (typeof window.toastBildirimiGoster === 'function') {
                window.toastBildirimiGoster(`"${theme.name}" teması profilinize uygulandı!`, 3000, 'success');
            }

            this.kapat();
        } catch (err) {
            console.error('[ThemeMarket] Tema kaydedilemedi:', err);
            if (typeof window.toastBildirimiGoster === 'function') {
                window.toastBildirimiGoster("Tema uygulanamadı: " + (err.message || "Hata"), 4000, 'error');
            }
        }
    }
};

window.ThemeMarket = ThemeMarket;
