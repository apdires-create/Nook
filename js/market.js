/**
 * Nook - ThemeMarket (Tema Marketi & Satın Alım Akışı)
 * THEME_SPEC.md 4. Adım
 */

const ThemeMarket = {
    modalEl: null,
    gridEl: null,
    catalogViewEl: null,
    detailViewEl: null,
    detailBodyEl: null,
    selectedTheme: null,
    userInventory: new Set(['default']), // Varsayılan temaya herkes sahiptir

    // Varsayılan / Fallback Katalog Verileri
    themesCatalog: [
        {
            id: 'obsidian-minimal',
            name: 'Obsidian Minimal',
            description: 'Mat siyah zemin, monokrom tipografi, keskin hatlar ve lüks editoryal kart estetiği.',
            price_cents: 500,
            is_active: true,
            checkout_url: 'https://nook.lemonsqueezy.com/buy/obsidian-minimal', // Lemon Squeezy linki
            banner_icon: '🖤',
            font: 'Inter, sans-serif'
        },
        {
            id: 'terminal',
            name: 'Terminal Matrix',
            description: 'CRT scanline kaplaması, yeşil fosfor monospaced karakterler ve hacker konsolu kimliği.',
            price_cents: 500,
            is_active: true,
            checkout_url: 'https://nook.lemonsqueezy.com/buy/terminal',
            banner_icon: '📟',
            font: 'Courier New, monospace'
        },
        {
            id: 'default',
            name: 'Nook Orijinal',
            description: 'Klasik, zarif ve dengeli varsayılan Nook kart deneyimi.',
            price_cents: 0,
            is_active: true,
            banner_icon: '✨',
            font: 'Montserrat, sans-serif'
        }
    ],

    init() {
        this.modalEl = document.getElementById('theme-market-modal');
        this.gridEl = document.getElementById('theme-market-grid');
        this.catalogViewEl = document.getElementById('theme-market-catalog-view');
        this.detailViewEl = document.getElementById('theme-market-detail-view');
        this.detailBodyEl = document.getElementById('theme-detail-body');

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

        // ESC tuşu ile kapatma
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalEl.classList.contains('is-open')) {
                this.kapat();
            }
        });
    },

    async ac() {
        if (!this.modalEl) return;
        this.katalogGoster();
        this.katalogCiz();
        this.modalEl.classList.add('is-open');

        // Kullanıcının envanterini yükle ve tekrar güncelle
        try {
            await this.kullaniciEnvanteriniYukle();
            this.katalogCiz();
        } catch (e) {
            console.warn('[ThemeMarket] Envanter yükleme hatası:', e);
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

        this.gridEl.innerHTML = this.themesCatalog.map(theme => {
            const isOwned = this.userInventory.has(theme.id);
            const isFree = theme.price_cents === 0;
            const priceLabel = isOwned ? 'Sahipsin' : (isFree ? 'Ücretsiz' : `$${(theme.price_cents / 100).toFixed(2)}`);
            const priceClass = (isOwned || isFree) ? 'is-free' : '';

            return `
                <div class="theme-market-card" data-theme-id="${theme.id}" role="button" tabindex="0">
                    <div class="theme-card-banner">
                        <span class="theme-card-banner-placeholder">${theme.banner_icon || '🎨'}</span>
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

        // Tıklayınca detay aç
        this.gridEl.querySelectorAll('.theme-market-card').forEach(card => {
            card.onclick = () => {
                const themeId = card.dataset.themeId;
                const theme = this.themesCatalog.find(t => t.id === themeId);
                if (theme) this.detayGoster(theme);
            };
        });
    },

    detayGoster(theme) {
        if (!this.catalogViewEl || !this.detailViewEl || !this.detailBodyEl) return;

        this.selectedTheme = theme;
        this.catalogViewEl.style.display = 'none';
        this.detailViewEl.style.display = 'flex';

        const isOwned = this.userInventory.has(theme.id);
        const isFree = theme.price_cents === 0;
        const currentActiveTheme = kartVerisi?.theme_config?.theme_id || 'default';
        const isCurrentActive = currentActiveTheme === theme.id;

        let actionBtnHtml = '';
        if (isCurrentActive) {
            actionBtnHtml = `<button type="button" class="theme-detail-btn" style="background: rgba(255,255,255,0.08); color: var(--text-tertiary); cursor: default;" disabled>Kullanımda</button>`;
        } else if (isOwned || isFree) {
            actionBtnHtml = `<button type="button" class="theme-detail-btn is-apply" id="theme-btn-apply">Temayı Uygula</button>`;
        } else {
            actionBtnHtml = `<button type="button" class="theme-detail-btn is-buy" id="theme-btn-buy">Satın Al — $${(theme.price_cents / 100).toFixed(2)}</button>`;
        }

        this.detailBodyEl.innerHTML = `
            <div class="theme-detail-hero">
                <span style="font-size: 3.5rem;">${theme.banner_icon || '🎨'}</span>
            </div>
            <div class="theme-detail-meta">
                <h3 class="theme-detail-title">${theme.name}</h3>
                <span class="theme-card-price ${isOwned || isFree ? 'is-free' : ''}">
                    ${isOwned ? 'Sahipsin' : (isFree ? 'Ücretsiz' : `$${(theme.price_cents / 100).toFixed(2)}`)}
                </span>
            </div>
            <p class="theme-detail-desc">${theme.description}</p>
            <div class="theme-detail-actions">
                <button type="button" class="theme-detail-btn is-preview" id="theme-btn-preview">Canlı Önizle</button>
                ${actionBtnHtml}
            </div>
        `;

        // Aksiyon Butonları Bağlantıları
        const previewBtn = document.getElementById('theme-btn-preview');
        const buyBtn = document.getElementById('theme-btn-buy');
        const applyBtn = document.getElementById('theme-btn-apply');

        if (previewBtn) {
            previewBtn.onclick = () => {
                if (typeof ThemeManager !== 'undefined') {
                    ThemeManager.applyTheme(theme.id);
                    if (typeof window.toastBildirimiGoster === 'function') {
                        window.toastBildirimiGoster(`"${theme.name}" teması önizleniyor.`, 2500, 'success');
                    }
                }
            };
        }

        if (buyBtn) {
            buyBtn.onclick = () => this.satinAl(theme);
        }

        if (applyBtn) {
            applyBtn.onclick = () => this.temayiUygula(theme);
        }
    },

    /**
     * Lemon Squeezy yönlendirmesi
     * Referans: yönlendirme fonksiyonu.txt
     */
    satinAl(theme) {
        const checkoutUrl = this.satinAlmaLinkiniUret(theme.checkout_url || 'https://nook.lemonsqueezy.com/buy/demo', theme.id);
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
        
        // Lemon Squeezy'nin webhook'a geri ileteceği özel veriler
        url.searchParams.set('checkout[custom][user_id]', userId);
        url.searchParams.set('checkout[custom][theme_id]', themeId);
        
        return url.toString();
    },

    async temayiUygula(theme) {
        if (!aktifKullaniciOturumu?.user?.id) return;

        try {
            // Profil tablosuna kaydet
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
            }

            // Temayı uygula
            if (typeof ThemeManager !== 'undefined') {
                await ThemeManager.applyTheme(theme.id);
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
