// #region 1: ONBOARDING & İPUCU MOTORU (TOKEN TABANLI)
const Onboarding = {
    isMobile: false,
    _initialized: false,
    _sessionTokens: new Set(),
    _activeFlow: null,
    _activeStepIndex: 0,
    _resizeHandler: null,
    _menuObserver: null,
    _bannerTimer: null,

    TOKENS: {
        OWNER_CORE: 'owner_core',
        WING_EDIT_BTN: 'wing_edit_btn',
        WING_SHOWCASE_COMMENT: 'wing_showcase_comment',
        HINT_TAG_DRAG: 'hint_tag_drag',
        HINT_LINK_DRAG: 'hint_link_drag'
    },

    init() {
        if (this._initialized) return;
        this._initialized = true;

        // Cihaz modelini sayfa yüklenişinde tek seferlik sabitle
        this.isMobile = window.innerWidth < 900;
        this._ensureDom();
    },

    // Geliştirme aşamasında bellek içi Set kullanır; son aşamada Supabase onboarding JSONB alanına bağlanacak
    hasToken(key) {
        if (typeof isOwner === 'undefined' || !isOwner) return false;
        return !this._sessionTokens.has(key);
    },

    consumeToken(key) {
        this._sessionTokens.add(key);
    },

    _ensureDom() {
        if (!document.getElementById('nookOnboardingOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'nookOnboardingOverlay';
            overlay.className = 'nook-onboarding-overlay';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.innerHTML = `
                <div class="nook-onboarding-backdrop" id="nookOnboardingBackdrop"></div>
                <div class="nook-onboarding-spotlight" id="nookOnboardingSpotlight"></div>
                <div class="nook-onboarding-callouts" id="nookOnboardingCallouts"></div>
                <div class="nook-onboarding-tooltip" id="nookOnboardingTooltip" role="dialog" aria-modal="true">
                    <div class="nook-onboarding-tooltip-head">
                        <span class="nook-onboarding-step-badge" id="nookOnboardingStepBadge"></span>
                        <button type="button" class="nook-onboarding-skip-btn" id="nookOnboardingSkipBtn">Atla</button>
                    </div>
                    <h4 class="nook-onboarding-title" id="nookOnboardingTitle"></h4>
                    <p class="nook-onboarding-desc" id="nookOnboardingDesc"></p>
                    <div class="nook-onboarding-actions" id="nookOnboardingActions">
                        <button type="button" class="nook-onboarding-next-btn" id="nookOnboardingNextBtn">İleri</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            document.getElementById('nookOnboardingSkipBtn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeOverlay(true);
            });

            document.getElementById('nookOnboardingNextBtn').addEventListener('click', (e) => {
                e.stopPropagation();
                this._advanceStep();
            });

            document.getElementById('nookOnboardingBackdrop').addEventListener('click', (e) => {
                e.stopPropagation();
                if (this._currentStep()?.mode === 'callout-group') {
                    this.closeOverlay(true);
                }
            });
        }

        if (!document.getElementById('nookOnboardingBanner')) {
            const banner = document.createElement('div');
            banner.id = 'nookOnboardingBanner';
            banner.className = 'nook-onboarding-banner';
            banner.setAttribute('role', 'status');
            banner.innerHTML = `
                <span class="nook-onboarding-banner-dot" aria-hidden="true"></span>
                <span class="nook-onboarding-banner-text" id="nookOnboardingBannerText"></span>
                <button type="button" class="nook-onboarding-banner-close" id="nookOnboardingBannerClose" aria-label="Kapat">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            document.body.appendChild(banner);
            document.getElementById('nookOnboardingBannerClose').addEventListener('click', () => {
                this._hideBanner();
            });
        }
    },

    // #region 2: ANA TUR (HESAP SAHİBİ)
    startOwnerTour() {
        if (!this.hasToken(this.TOKENS.OWNER_CORE)) return;
        if (this._activeFlow) return;

        const steps = [];

        // Adım 1: Ön yüz düzenleme & arka yüz
        steps.push({
            id: 'front-and-back',
            target: () => document.getElementById('cardContainer'),
            title: 'Kartını Düzenle & Çevir',
            desc: 'Ön yüzdeki isim, bio ve görsellere tıklayarak doğrudan düzenleyebilirsin. Boş bir alana tıkladığında kartın arka yüzüne (Bağlantılar) geçersin.',
            mode: 'info',
            nextLabel: 'İleri',
            padding: 6
        });

        // Adım 2: PC vs Mobil bölüm ekleme / kaydırma
        if (this.isMobile) {
            steps.push({
                id: 'mobile-deck',
                target: () => document.getElementById('cardContainer'),
                title: 'Kartlar Arası Geçiş',
                desc: 'Ekranı sağa veya sola kaydırarak eklediğin kartlara (veya ilk kart ekleme alanına) geçebilirsin. Alttaki noktalar konumunu gösterir.',
                mode: 'info',
                nextLabel: 'İleri',
                padding: 6
            });
        } else {
            const addBtn = document.getElementById('triggerAddSectionBtn');
            const hasAddBtn = addBtn && !addBtn.hidden && addBtn.offsetParent !== null;
            steps.push({
                id: 'desktop-flags',
                target: () => hasAddBtn ? document.getElementById('triggerAddSectionBtn') : document.getElementById('cardFlagsWrapper'),
                title: hasAddBtn ? 'Yeni Kartlar Ekle' : 'Bölüm Kartların',
                desc: hasAddBtn
                    ? 'Bu artı butonundan Gaming, Showcase, Widgets ve Trophies kartlarını profiline ekleyebilirsin.'
                    : 'Sağdaki sekmelerden ekli bölüm kartlarını açıp düzenleyebilirsin.',
                mode: 'info',
                nextLabel: 'İleri',
                padding: 8
            });
        }

        // Adım 3: Üst menüye zorunlu tıklama
        steps.push({
            id: 'menu-trigger',
            target: () => document.getElementById('profile-user-trigger'),
            title: 'Kontrol Menüsünü Aç',
            desc: 'Sayfa linkini kopyalamak, alanları yönetmek ve tema ayarlarına ulaşmak için bu menüye tıkla.',
            mode: 'action',
            allowClickThrough: true,
            padding: 6,
            onEnter: () => this._watchMenuOpen()
        });

        // Adım 4: Menü açılınca tüm butonları oklarla açıkla
        steps.push({
            id: 'menu-callouts',
            target: () => document.getElementById('profile-user-dropdown'),
            title: 'Menü & Market',
            mode: 'callout-group',
            nextLabel: 'Anladım',
            padding: 6,
            callouts: [
                { selector: '#nav-market-trigger', text: 'Temaları keşfet ve profiline uygula' },
                { selector: '#nav-item-account', text: 'Hesap ve şifre ayarlarını yönet' },
                { selector: '#nav-item-copy-link', text: 'Sayfa linkini tek tıkla kopyala' },
                { selector: '#nav-item-sections', text: 'Gaming, Vitrin ve diğer kartları yönet' },
                { selector: '#nav-item-appearance', text: 'Tema renklerini ve görünümü özelleştir' },
                { selector: '#nav-item-logout', text: 'Hesabından güvenli çıkış yap' }
            ]
        });

        this._startFlow(this.TOKENS.OWNER_CORE, steps);
    },

    _watchMenuOpen() {
        this._stopMenuObserver();
        const dropdown = document.getElementById('profile-user-dropdown');
        if (!dropdown) return;

        if (dropdown.classList.contains('is-open')) {
            this._advanceStep();
            return;
        }

        this._menuObserver = new MutationObserver(() => {
            if (dropdown.classList.contains('is-open')) {
                this._stopMenuObserver();
                setTimeout(() => {
                    if (this._currentStep()?.id === 'menu-trigger') {
                        this._advanceStep();
                    }
                }, 80);
            }
        });
        this._menuObserver.observe(dropdown, { attributes: true, attributeFilter: ['class'] });
    },

    _stopMenuObserver() {
        if (this._menuObserver) {
            this._menuObserver.disconnect();
            this._menuObserver = null;
        }
    },
    // #endregion

    // #region 3: SAYFA İÇİ BAĞLAMSAL BOARDINGLER
    onWingOpened(wingType) {
        if (typeof isOwner === 'undefined' || !isOwner) return;
        if (this._activeFlow) return;

        // Showcase ilk açılış: en az 2 içerik varsa tıklayıp yorum ekleme + sürükle-bırak sıralama ipucu
        if (wingType === 'showcase' && this.hasToken(this.TOKENS.WING_SHOWCASE_COMMENT)) {
            const items = document.querySelectorAll('#topsCompanionCard .top-item-card');
            if (items.length >= 2 && items[0].offsetParent !== null) {
                this._showShowcaseCommentAndDragHint();
                return;
            }
        }

        // Diğer kanatlarda (veya boş Showcase'de) sağ üst düzenleme butonu
        if (this.hasToken(this.TOKENS.WING_EDIT_BTN)) {
            const editBtnId = wingType === 'showcase' ? 'showcaseEditToggleBtn' : 'trophiesEditToggleBtn';
            const editBtn = document.getElementById(editBtnId);
            if (editBtn && editBtn.style.display !== 'none' && editBtn.offsetParent !== null) {
                this._startFlow(this.TOKENS.WING_EDIT_BTN, [{
                    id: 'wing-edit-btn-hint',
                    target: () => document.getElementById(editBtnId),
                    title: 'Hızlı Düzenleme',
                    desc: 'Sağ üstteki bu düzenleme tuşuyla bölümdeki içerikleri kolayca güncelleyebilirsin.',
                    mode: 'info',
                    nextLabel: 'Anladım',
                    padding: 8
                }]);
            }
        }
    },

    onShowcaseItemsUpdated(itemCount) {
        if (typeof isOwner === 'undefined' || !isOwner) return;
        if (this._activeFlow) return;
        if (itemCount < 2 || !this.hasToken(this.TOKENS.WING_SHOWCASE_COMMENT)) return;

        setTimeout(() => {
            const items = document.querySelectorAll('#topsCompanionCard .top-item-card');
            if (items.length >= 2 && items[0].offsetParent !== null) {
                this._showShowcaseCommentAndDragHint();
            }
        }, 120);
    },

    _showShowcaseCommentAndDragHint() {
        this._startFlow(this.TOKENS.WING_SHOWCASE_COMMENT, [{
            id: 'showcase-comment-hint',
            target: () => document.querySelector('#topsCompanionCard .top-item-card'),
            title: 'Yorum Ekle & Sırala',
            desc: 'İçeriklere tıklayarak altına kişisel yorum/not ekleyebilir, tutup sürükleyerek sırasını değiştirebilirsin.',
            mode: 'info',
            nextLabel: 'Anladım',
            padding: 6
        }]);
    },
    // #endregion

    // #region 4: ÜSTTEN GELEN MİKRO BİLDİRİMLER (TOKEN TABANLI)
    triggerHint(key) {
        if (!this.hasToken(key)) return;
        const messages = {
            [this.TOKENS.HINT_TAG_DRAG]: 'İpucu: Etiketleri tutup sürükleyerek sırasını ayarlayabilirsin.',
            [this.TOKENS.HINT_LINK_DRAG]: 'İpucu: Bağlantıları tutup sürükleyerek sırasını değiştirebilirsin.'
        };
        const text = messages[key];
        if (!text) return;

        this.consumeToken(key);
        this._showBanner(text);
    },

    _showBanner(text) {
        this._ensureDom();
        const banner = document.getElementById('nookOnboardingBanner');
        const textEl = document.getElementById('nookOnboardingBannerText');
        if (!banner || !textEl) return;

        textEl.textContent = text;
        banner.classList.add('is-visible');

        clearTimeout(this._bannerTimer);
        this._bannerTimer = setTimeout(() => this._hideBanner(), 4800);
    },

    _hideBanner() {
        clearTimeout(this._bannerTimer);
        const banner = document.getElementById('nookOnboardingBanner');
        if (banner) banner.classList.remove('is-visible');
    },
    // #endregion

    // #region 5: SPOTLIGHT & CALLOUT YERLEŞİM MOTORU
    _startFlow(tokenKey, steps) {
        if (!steps || steps.length === 0) return;
        this._ensureDom();
        this._activeFlow = { tokenKey, steps };
        this._activeStepIndex = 0;

        const overlay = document.getElementById('nookOnboardingOverlay');
        overlay.classList.add('is-active');
        overlay.setAttribute('aria-hidden', 'false');

        if (!this._resizeHandler) {
            this._resizeHandler = () => this._positionCurrentStep();
            window.addEventListener('resize', this._resizeHandler);
        }

        this._renderStep();
    },

    _currentStep() {
        if (!this._activeFlow) return null;
        return this._activeFlow.steps[this._activeStepIndex] || null;
    },

    _advanceStep() {
        if (!this._activeFlow) return;
        this._stopMenuObserver();

        if (this._activeStepIndex + 1 < this._activeFlow.steps.length) {
            this._activeStepIndex += 1;
            this._renderStep();
        } else {
            this.closeOverlay(true);
        }
    },

    closeOverlay(consume = true) {
        this._stopMenuObserver();
        if (this._activeFlow && consume) {
            this.consumeToken(this._activeFlow.tokenKey);
        }
        const wasCalloutGroup = this._currentStep()?.mode === 'callout-group';
        this._activeFlow = null;
        this._activeStepIndex = 0;

        const overlay = document.getElementById('nookOnboardingOverlay');
        if (overlay) {
            overlay.classList.remove('is-active', 'is-action-step', 'is-callout-mode');
            overlay.setAttribute('aria-hidden', 'true');
        }
        const callouts = document.getElementById('nookOnboardingCallouts');
        if (callouts) callouts.innerHTML = '';

        if (wasCalloutGroup) {
            const dropdown = document.getElementById('profile-user-dropdown');
            if (dropdown) dropdown.classList.remove('is-open');
        }

        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
    },

    _renderStep() {
        const step = this._currentStep();
        if (!step) return;

        const overlay = document.getElementById('nookOnboardingOverlay');
        const badgeEl = document.getElementById('nookOnboardingStepBadge');
        const titleEl = document.getElementById('nookOnboardingTitle');
        const descEl = document.getElementById('nookOnboardingDesc');
        const nextBtn = document.getElementById('nookOnboardingNextBtn');
        const actionsEl = document.getElementById('nookOnboardingActions');
        const calloutsEl = document.getElementById('nookOnboardingCallouts');

        const total = this._activeFlow.steps.length;
        badgeEl.textContent = total > 1 ? `${this._activeStepIndex + 1} / ${total}` : 'İpucu';
        titleEl.textContent = step.title || '';
        descEl.textContent = step.desc || '';
        descEl.style.display = step.desc ? '' : 'none';

        overlay.classList.toggle('is-action-step', !!step.allowClickThrough);
        overlay.classList.toggle('is-callout-mode', step.mode === 'callout-group');

        if (step.mode === 'action') {
            actionsEl.style.display = 'none';
        } else {
            actionsEl.style.display = 'flex';
            nextBtn.textContent = step.nextLabel || 'İleri';
        }

        calloutsEl.innerHTML = '';

        this._positionCurrentStep();

        if (typeof step.onEnter === 'function') {
            step.onEnter();
        }
    },

    _positionCurrentStep() {
        const step = this._currentStep();
        if (!step) return;

        const spotlight = document.getElementById('nookOnboardingSpotlight');
        const tooltip = document.getElementById('nookOnboardingTooltip');
        const calloutsEl = document.getElementById('nookOnboardingCallouts');
        const targetEl = typeof step.target === 'function' ? step.target() : null;

        if (!targetEl) {
            this.closeOverlay(true);
            return;
        }

        const rect = targetEl.getBoundingClientRect();
        const pad = step.padding ?? 8;
        const sLeft = Math.max(4, rect.left - pad);
        const sTop = Math.max(4, rect.top - pad);
        const sWidth = Math.min(window.innerWidth - sLeft - 4, rect.width + pad * 2);
        const sHeight = Math.min(window.innerHeight - sTop - 4, rect.height + pad * 2);

        spotlight.style.left = `${sLeft}px`;
        spotlight.style.top = `${sTop}px`;
        spotlight.style.width = `${sWidth}px`;
        spotlight.style.height = `${sHeight}px`;

        if (step.mode === 'callout-group' && Array.isArray(step.callouts)) {
            this._renderCallouts(step.callouts, calloutsEl);
            tooltip.style.left = `${Math.max(12, Math.min(window.innerWidth - tooltip.offsetWidth - 12, sLeft + sWidth - tooltip.offsetWidth))}px`;
            tooltip.style.top = `${Math.min(window.innerHeight - tooltip.offsetHeight - 16, sTop + sHeight + 14)}px`;
            return;
        }

        // Baloncuk konumlandırma (alt öncelikli, sığmazsa üst, sağ/sol sınır korumalı)
        tooltip.style.left = '0px';
        tooltip.style.top = '0px';
        const tRect = tooltip.getBoundingClientRect();
        const margin = 12;

        let tTop = sTop + sHeight + margin;
        if (tTop + tRect.height > window.innerHeight - margin) {
            const aboveTop = sTop - tRect.height - margin;
            tTop = aboveTop >= margin ? aboveTop : Math.max(margin, window.innerHeight - tRect.height - margin);
        }

        let tLeft = sLeft + (sWidth - tRect.width) / 2;
        tLeft = Math.max(margin, Math.min(window.innerWidth - tRect.width - margin, tLeft));

        tooltip.style.left = `${tLeft}px`;
        tooltip.style.top = `${tTop}px`;
    },

    _renderCallouts(callouts, container) {
        container.innerHTML = '';
        callouts.forEach((item) => {
            const el = document.querySelector(item.selector);
            if (!el || el.offsetParent === null) return;
            const r = el.getBoundingClientRect();

            const tag = document.createElement('div');
            tag.className = 'nook-onboarding-callout';
            tag.innerHTML = `<span class="nook-onboarding-callout-arrow" aria-hidden="true">→</span><span>${item.text}</span>`;
            container.appendChild(tag);

            const tagW = tag.offsetWidth || 210;
            const tagH = tag.offsetHeight || 28;
            const left = Math.max(10, r.left - tagW - 12);
            const top = Math.max(8, Math.min(window.innerHeight - tagH - 8, r.top + (r.height - tagH) / 2));

            tag.style.left = `${left}px`;
            tag.style.top = `${top}px`;
        });
    }
    // #endregion
};
// #endregion
