/**
 * Nook - ThemeManager (Runtime CSS & Font Injection Motoru)
 * THEME_SPEC.md 2. Adım Mimarisi & Sıfır İsraf Font Yükleme
 */

const ThemeManager = {
    currentThemeId: null,
    currentMode: 'dark',
    sessionStoragePrefix: 'nook_visitor_mode_',
    basePath: 'themes/',
    linkElementId: 'nook-theme-stylesheet',
    fontLinkElementId: 'nook-theme-fonts',

    // Bilinen temalar için font fallback haritası (DB'den fontUrl gelmese dahi sıçramayı önler)
    knownThemeFonts: {
        'default': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Roboto+Mono:wght@500;700&display=swap',
        'obsidian-minimal': 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
    },

    isValidThemeId(themeId) {
        return typeof themeId === 'string' && /^[a-z0-9_-]{1,50}$/i.test(themeId);
    },

    isValidHexColor(color) {
        return typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color.trim());
    },

    isValidFontUrl(url) {
        return typeof url === 'string' && url.startsWith('https://fonts.googleapis.com/');
    },

    normalizeMode(mode) {
        return mode === 'light' ? 'light' : 'dark';
    },

    _getTargetUsername(explicitUsername = null) {
        const raw = explicitUsername
            || (typeof kartVerisi !== 'undefined' && kartVerisi?.kullanici_adi)
            || (typeof KULLANICI_ADI !== 'undefined' && KULLANICI_ADI)
            || 'default';
        return String(raw).trim().toLowerCase() || 'default';
    },

    getVisitorStorageKey(explicitUsername = null) {
        return `${this.sessionStoragePrefix}${this._getTargetUsername(explicitUsername)}`;
    },

    getVisitorModeOverride(explicitUsername = null) {
        try {
            const val = sessionStorage.getItem(this.getVisitorStorageKey(explicitUsername));
            return (val === 'light' || val === 'dark') ? val : null;
        } catch (e) {
            return null;
        }
    },

    setVisitorModeOverride(mode, explicitUsername = null) {
        try {
            sessionStorage.setItem(this.getVisitorStorageKey(explicitUsername), this.normalizeMode(mode));
        } catch (e) {}
    },

    clearVisitorModeOverride(explicitUsername = null) {
        try {
            sessionStorage.removeItem(this.getVisitorStorageKey(explicitUsername));
        } catch (e) {}
    },

    resolveEffectiveMode(ownerMode, options = {}) {
        if (options.ignoreVisitorOverride) {
            return this.normalizeMode(ownerMode);
        }
        const override = this.getVisitorModeOverride(options.username);
        return override || this.normalizeMode(ownerMode);
    },

    _syncAccentContrast(hexColor) {
        if (!this.isValidHexColor(hexColor)) return;
        let clean = hexColor.trim().slice(1);
        if (clean.length === 3 || clean.length === 4) {
            clean = clean.slice(0, 3).split('').map(c => c + c).join('');
        } else if (clean.length >= 6) {
            clean = clean.slice(0, 6);
        } else {
            return;
        }
        const r = parseInt(clean.slice(0, 2), 16) / 255;
        const g = parseInt(clean.slice(2, 4), 16) / 255;
        const b = parseInt(clean.slice(4, 6), 16) / 255;
        const lin = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
        const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        document.documentElement.style.setProperty('--accent-contrast', luminance > 0.36 ? '#0b0d12' : '#ffffff');
    },

    setMode(mode, options = {}) {
        const safeMode = this.normalizeMode(mode);
        document.documentElement.setAttribute('data-mode', safeMode);
        this.currentMode = safeMode;

        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
            themeMeta.setAttribute('content', safeMode === 'light' ? '#f3f5fa' : '#0b0e14');
        }

        if (options.persistSession) {
            this.setVisitorModeOverride(safeMode, options.username);
        }

        this._updateModeToggleBtn();

        window.dispatchEvent(new CustomEvent('nook:mode-changed', {
            detail: { mode: safeMode, isVisitorOverride: !!options.persistSession }
        }));
        return safeMode;
    },

    toggleVisitorMode() {
        const current = document.documentElement.getAttribute('data-mode') === 'light' ? 'light' : 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        return this.setMode(next, { persistSession: true });
    },

    _updateModeToggleBtn() {
        const btn = document.getElementById('nav-mode-toggle');
        if (!btn) return;
        const isLight = this.currentMode === 'light';
        const label = isLight ? 'Karanlık moda geç' : 'Aydınlık moda geç';
        btn.setAttribute('title', label);
        btn.setAttribute('aria-label', label);
        btn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    },

    initModeToggle() {
        const btn = document.getElementById('nav-mode-toggle');
        if (!btn || btn.dataset.modeBound === '1') return;
        btn.dataset.modeBound = '1';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleVisitorMode();
        });
        const attrMode = document.documentElement.getAttribute('data-mode');
        if (attrMode === 'light' || attrMode === 'dark') {
            this.currentMode = attrMode;
        }
        this._updateModeToggleBtn();
    },

    /**
     * Tema stil ve fontlarını dinamik olarak sayfaya enjekte eder
     * @param {string} themeId - Tema kimliği (örn: 'obsidian-minimal', '_template', 'default')
     * @param {Object} options - Ek tema yapılandırması (fontUrl, primaryColor, colorMode vb.)
     * @returns {Promise<boolean>} Yükleme durumu
     */
    async applyTheme(themeId, options = {}) {
        // Eğer tema belirtilmemişse, 'default' ise veya güvenli formatta değilse temizle ve varsayılana dön
        if (!themeId || themeId === 'default' || !this.isValidThemeId(themeId)) {
            this.clearTheme(options);
            return true;
        }

        const safeThemeId = themeId.trim();

        try {
            // 1. Font gereksinimi: options'ta güvenli Google Fonts URL'i varsa onu, yoksa bilinenler tablosunu kullan
            const candidateFontUrl = options.fontUrl || options.font_url || null;
            const fontUrl = (candidateFontUrl && this.isValidFontUrl(candidateFontUrl))
                ? candidateFontUrl
                : (this.knownThemeFonts[safeThemeId] || null);
            if (fontUrl) {
                await this._injectFont(fontUrl);
            }

            // 2. Tema CSS URL'ini her zaman yerel güvenli dizinden oluştur (Harici cssUrl enjeksiyonuna kapalı)
            const cssUrl = `${this.basePath}${safeThemeId}/theme.css`;

            // 3. CSS dosyasını yükle ve bekle
            await this._injectStylesheet(cssUrl, safeThemeId);

            // 4. HTML üzerine data-theme ve aydınlık/karanlık mod ataması yap
            document.documentElement.setAttribute('data-theme', safeThemeId);
            this.currentThemeId = safeThemeId;

            const ownerMode = options.colorMode
                || (typeof kartVerisi !== 'undefined' && (kartVerisi?.theme_config?.preset === 'light' || kartVerisi?.theme_config?.color_mode === 'light' ? 'light' : 'dark'))
                || 'dark';
            this.setMode(this.resolveEffectiveMode(ownerMode, options));

            // 5. Vurgu rengini uygula (OKLCH formülü kök rengi otomatik türetir)
            const primaryColor = options.primaryColor || (typeof kartVerisi !== 'undefined' && kartVerisi?.theme_config?.primary_color);
            if (this.isValidHexColor(primaryColor)) {
                const trimmed = primaryColor.trim();
                document.documentElement.style.setProperty('--accent-color', trimmed);
                this._syncAccentContrast(trimmed);
            }

            // 6. Konsol veya event bildirimi
            window.dispatchEvent(new CustomEvent('nook:theme-applied', {
                detail: { themeId: safeThemeId, options }
            }));

            return true;
        } catch (error) {
            console.warn(`[ThemeManager] "${safeThemeId}" teması yüklenemedi, varsayılan stile dönülüyor:`, error);
            this.clearTheme(options);
            return false;
        }
    },

    /**
     * Özel temayı kaldırır, varsayılan Nook görünümüne döner
     */
    clearTheme(options = {}) {
        const existingLink = document.getElementById(this.linkElementId);
        if (existingLink) {
            existingLink.remove();
        }

        // Varsayılan Nook fontunu yükle
        const defaultFontUrl = this.knownThemeFonts['default'];
        if (defaultFontUrl) {
            this._injectFont(defaultFontUrl);
        }

        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-palette');
        this.currentThemeId = null;

        // Aydınlık/Karanlık modu uygula
        const ownerMode = options.colorMode
            || (typeof kartVerisi !== 'undefined' && (kartVerisi?.theme_config?.preset === 'light' || kartVerisi?.theme_config?.color_mode === 'light' ? 'light' : 'dark'))
            || 'dark';
        this.setMode(this.resolveEffectiveMode(ownerMode, options));

        // Vurgu rengini koru / sıfırla
        const primaryColor = options.primaryColor || (typeof kartVerisi !== 'undefined' && kartVerisi?.theme_config?.primary_color);
        if (this.isValidHexColor(primaryColor)) {
            const trimmed = primaryColor.trim();
            document.documentElement.style.setProperty('--accent-color', trimmed);
            this._syncAccentContrast(trimmed);
        }

        window.dispatchEvent(new CustomEvent('nook:theme-cleared'));
    },

    /**
     * Canlı önizleme için temayı geçici uygular
     */
    async previewTheme(themeId, options = {}) {
        return await this.applyTheme(themeId, { ...options, isPreview: true });
    },

    /**
     * Yalnızca vurgu rengini ve kontrastını hafifçe günceller (tam tema yeniden yüklemesi yapmaz)
     */
    setAccentColor(color) {
        if (!this.isValidHexColor(color)) return false;
        const trimmed = color.trim();
        document.documentElement.style.setProperty('--accent-color', trimmed);
        this._syncAccentContrast(trimmed);
        return true;
    },

    /**
     * Önizleme veya canlı düzenleme için yalnızca aydınlık/karanlık modu günceller
     */
    setPreviewMode(mode) {
        const safeMode = mode === 'light' ? 'light' : 'dark';
        this.setMode(safeMode);
        return safeMode;
    },

    /**
     * CSS <link> elementini Promise ile güvenli bir şekilde ekler
     * @private
     */
    _injectStylesheet(url, themeId) {
        return new Promise((resolve, reject) => {
            let link = document.getElementById(this.linkElementId);

            // Zaten aynı URL yüklüyse tekrar bekleme
            if (link && link.getAttribute('data-loaded-theme') === themeId) {
                resolve();
                return;
            }

            if (!link) {
                link = document.createElement('link');
                link.id = this.linkElementId;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }

            link.onload = () => {
                link.setAttribute('data-loaded-theme', themeId);
                resolve();
            };

            link.onerror = (err) => {
                reject(new Error(`CSS yüklenemedi: ${url}`));
            };

            link.href = url;
        });
    },

    /**
     * Google Fonts preconnect ve font stylesheet etiketlerini optimize şekilde ekler
     * @private
     */
    async _injectFont(fontUrl) {
        this._ensurePreconnect();

        let fontLink = document.getElementById(this.fontLinkElementId);
        const urlDegisti = !fontLink || fontLink.href !== fontUrl;

        if (!fontLink) {
            fontLink = document.createElement('link');
            fontLink.id = this.fontLinkElementId;
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
        }

        if (urlDegisti) {
            fontLink.href = fontUrl;
        }

        // Font dosyasının inmesini ve render motoruna hazır hale gelmesini bekle (Maksimum 600ms timeout güvencesi)
        try {
            await Promise.race([
                Promise.all([
                    new Promise((resolve) => {
                        if (fontLink.sheet) {
                            resolve();
                        } else {
                            fontLink.onload = () => resolve();
                            fontLink.onerror = () => resolve();
                        }
                    }),
                    (document.fonts && typeof document.fonts.ready !== 'undefined')
                        ? document.fonts.ready
                        : Promise.resolve()
                ]),
                new Promise((resolve) => setTimeout(resolve, 600))
            ]);
        } catch (err) {
            // Font bekleme hatası akışı kilitlemesin
        }
    },

    /**
     * Google Fonts için preconnect etiketlerinin head'de olmasını garanti eder
     * @private
     */
    _ensurePreconnect() {
        if (!document.getElementById('nook-fonts-preconnect-api')) {
            const preconnect1 = document.createElement('link');
            preconnect1.id = 'nook-fonts-preconnect-api';
            preconnect1.rel = 'preconnect';
            preconnect1.href = 'https://fonts.googleapis.com';
            document.head.appendChild(preconnect1);
        }
        if (!document.getElementById('nook-fonts-preconnect-static')) {
            const preconnect2 = document.createElement('link');
            preconnect2.id = 'nook-fonts-preconnect-static';
            preconnect2.rel = 'preconnect';
            preconnect2.href = 'https://fonts.gstatic.com';
            preconnect2.crossOrigin = 'anonymous';
            document.head.appendChild(preconnect2);
        }
    }
};

window.ThemeManager = ThemeManager;
