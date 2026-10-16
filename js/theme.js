/**
 * Nook - ThemeManager (Runtime CSS & Font Injection Motoru)
 * THEME_SPEC.md 2. Adım Mimarisi & Sıfır İsraf Font Yükleme
 */

const ThemeManager = {
    currentThemeId: null,
    basePath: 'themes/',
    linkElementId: 'nook-theme-stylesheet',
    fontLinkElementId: 'nook-theme-fonts',
    dragEngineScriptId: 'nook-theme-drag-engine',

    // Bilinen temalar için font fallback haritası (DB'den fontUrl gelmese dahi sıçramayı önler)
    knownThemeFonts: {
        'default': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Roboto+Mono:wght@500;700&display=swap',
        'obsidian-minimal': 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
    },

    /**
     * Tema stil ve fontlarını dinamik olarak sayfaya enjekte eder
     * @param {string} themeId - Tema kimliği (örn: 'obsidian-minimal', '_template', 'default')
     * @param {Object} options - Ek tema yapılandırması (fontUrl, primaryColor, cdnPrefix vb.)
     * @returns {Promise<boolean>} Yükleme durumu
     */
    async applyTheme(themeId, options = {}) {
        // Eğer tema belirtilmemişse veya 'default' ise temizle ve varsayılana dön
        if (!themeId || themeId === 'default') {
            this.clearTheme(options);
            return true;
        }

        try {
            // 1. Font gereksinimi: options'ta yoksa bilinenler tablosundan al
            const fontUrl = options.fontUrl || options.font_url || this.knownThemeFonts[themeId] || null;
            if (fontUrl) {
                this._injectFont(fontUrl);
            }

            // 2. Tema CSS URL'ini belirle (CDN prefix varsa oradan, yoksa yerel themes/{id}/)
            const cssUrl = options.cssUrl || `${this.basePath}${themeId}/theme.css`;

            // 3. CSS dosyasını yükle ve bekle
            await this._injectStylesheet(cssUrl, themeId);

            // 4. HTML üzerine data-theme ataması yap
            document.documentElement.setAttribute('data-theme', themeId);
            this.currentThemeId = themeId;

            // 5. Vurgu rengini koru / uygula (Kullanıcının tercihi temaya hükmeder)
            const primaryColor = options.primaryColor || (typeof kartVerisi !== 'undefined' && kartVerisi?.theme_config?.primary_color);
            if (primaryColor) {
                document.documentElement.style.setProperty('--accent-color', primaryColor);
            }

            // 5.5. Düzenleme modunda (isOwner) temanın özel drag motoru varsa yükle
            if (typeof isOwner !== 'undefined' && isOwner) {
                this._loadThemeDragEngine(themeId);
            }

            // 6. Konsol veya event bildirimi
            window.dispatchEvent(new CustomEvent('nook:theme-applied', {
                detail: { themeId, options }
            }));

            return true;
        } catch (error) {
            console.warn(`[ThemeManager] "${themeId}" teması yüklenemedi, varsayılan stile dönülüyor:`, error);
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

        // Temanın özel drag motoru yüklüyse kaldır
        const existingEngine = document.getElementById(this.dragEngineScriptId);
        if (existingEngine) {
            existingEngine.remove();
        }
        if (typeof EditManager !== 'undefined' && EditManager.refreshAllSortables) {
            EditManager.refreshAllSortables();
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
        if (primaryColor) {
            document.documentElement.style.setProperty('--accent-color', primaryColor);
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
    },

    /**
     * Temaya özel sürükleme motorunu dinamik olarak yükler
     * @private
     */
    _loadThemeDragEngine(themeId) {
        const existingScript = document.getElementById(this.dragEngineScriptId);
        if (existingScript) existingScript.remove();

        const scriptUrl = `${this.basePath}${themeId}/drag-engine.js`;
        const script = document.createElement('script');
        script.id = this.dragEngineScriptId;
        script.src = scriptUrl;
        script.onload = () => {
            if (typeof EditManager !== 'undefined' && EditManager.refreshAllSortables) {
                EditManager.refreshAllSortables();
            }
        };
        script.onerror = () => {
            script.remove();
            if (typeof EditManager !== 'undefined' && EditManager.refreshAllSortables) {
                EditManager.refreshAllSortables();
            }
        };
        document.head.appendChild(script);
    }
};

window.ThemeManager = ThemeManager;
