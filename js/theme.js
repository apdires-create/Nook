/**
 * Nook - ThemeManager (Runtime CSS & Font Injection Motoru)
 * THEME_SPEC.md 2. Adım Mimarisi & Sıfır İsraf Font Yükleme
 */

const ThemeManager = {
    currentThemeId: null,
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

    /**
     * Tema stil ve fontlarını dinamik olarak sayfaya enjekte eder
     * @param {string} themeId - Tema kimliği (örn: 'obsidian-minimal', '_template', 'default')
     * @param {Object} options - Ek tema yapılandırması (fontUrl, primaryColor vb.)
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
                this._injectFont(fontUrl);
            }

            // 2. Tema CSS URL'ini her zaman yerel güvenli dizinden oluştur (Harici cssUrl enjeksiyonuna kapalı)
            const cssUrl = `${this.basePath}${safeThemeId}/theme.css`;

            // 3. CSS dosyasını yükle ve bekle
            await this._injectStylesheet(cssUrl, safeThemeId);

            // 4. HTML üzerine data-theme ataması yap
            document.documentElement.setAttribute('data-theme', safeThemeId);
            this.currentThemeId = safeThemeId;

            // 5. Vurgu rengini koru / uygula (Kullanıcının tercihi temaya hükmeder)
            const primaryColor = options.primaryColor || (typeof kartVerisi !== 'undefined' && kartVerisi?.theme_config?.primary_color);
            if (this.isValidHexColor(primaryColor)) {
                document.documentElement.style.setProperty('--accent-color', primaryColor.trim());
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
        this.currentThemeId = null;

        // Vurgu rengini koru / sıfırla
        const primaryColor = options.primaryColor || (typeof kartVerisi !== 'undefined' && kartVerisi?.theme_config?.primary_color);
        if (this.isValidHexColor(primaryColor)) {
            document.documentElement.style.setProperty('--accent-color', primaryColor.trim());
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
    _injectFont(fontUrl) {
        this._ensurePreconnect();

        let fontLink = document.getElementById(this.fontLinkElementId);
        if (!fontLink) {
            fontLink = document.createElement('link');
            fontLink.id = this.fontLinkElementId;
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
        }
        if (fontLink.href !== fontUrl) {
            fontLink.href = fontUrl;
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
