/**
 * Nook - ThemeManager (Runtime CSS & Font Injection Motoru)
 * THEME_SPEC.md 2. Adım Mimarisi
 */

const ThemeManager = {
    currentThemeId: null,
    basePath: 'themes/',
    linkElementId: 'nook-theme-stylesheet',
    fontLinkElementId: 'nook-theme-fonts',

    /**
     * Tema stil ve fontlarını dinamik olarak sayfaya enjekte eder
     * @param {string} themeId - Tema kimliği (örn: 'obsidian-minimal', '_template')
     * @param {Object} options - Ek tema yapılandırması (fontUrl, cdnPrefix vb.)
     * @returns {Promise<boolean>} Yükleme durumu
     */
    async applyTheme(themeId, options = {}) {
        // Eğer tema belirtilmemişse veya 'default' ise temizle ve varsayılana dön
        if (!themeId || themeId === 'default') {
            this.clearTheme();
            return true;
        }

        try {
            // 1. Font gereksinimi varsa önce fontları yükle
            if (options.fontUrl) {
                this._injectFont(options.fontUrl);
            }

            // 2. Tema CSS URL'ini belirle (CDN prefix varsa oradan, yoksa yerel themes/{id}/)
            const cssUrl = options.cssUrl || `${this.basePath}${themeId}/theme.css`;

            // 3. CSS dosyasını yükle ve bekle
            await this._injectStylesheet(cssUrl, themeId);

            // 4. HTML ve Body üzerine data-theme ataması yap
            document.documentElement.setAttribute('data-theme', themeId);
            this.currentThemeId = themeId;

            // 5. Konsol veya event bildirimi
            window.dispatchEvent(new CustomEvent('nook:theme-applied', {
                detail: { themeId, options }
            }));

            return true;
        } catch (error) {
            console.warn(`[ThemeManager] "${themeId}" teması yüklenemedi, varsayılan stile dönülüyor:`, error);
            this.clearTheme();
            return false;
        }
    },

    /**
     * Özel temayı kaldırır, varsayılan Nook görünümüne döner
     */
    clearTheme() {
        const existingLink = document.getElementById(this.linkElementId);
        if (existingLink) {
            existingLink.remove();
        }

        const existingFontLink = document.getElementById(this.fontLinkElementId);
        if (existingFontLink) {
            existingFontLink.remove();
        }

        document.documentElement.removeAttribute('data-theme');
        this.currentThemeId = null;

        window.dispatchEvent(new CustomEvent('nook:theme-cleared'));
    },

    /**
     * Canlı önizleme için temayı geçici uygular (5. Adım için hazır)
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

            // Cache bust veya doğrudan URL
            link.href = url;
        });
    },

    /**
     * Font <link> etiketlerini optimize şekilde ekler
     * @private
     */
    _injectFont(fontUrl) {
        let fontLink = document.getElementById(this.fontLinkElementId);
        if (!fontLink) {
            fontLink = document.createElement('link');
            fontLink.id = this.fontLinkElementId;
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
        }
        fontLink.href = fontUrl;
    }
};

window.ThemeManager = ThemeManager;
