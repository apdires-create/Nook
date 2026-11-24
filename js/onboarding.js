// #region 1: ONBOARDING & İPUCU MOTORU (TOKEN TABANLI)
const Onboarding = {
    isMobile: false,
    _initialized: false,
    _sessionTokens: new Set(),
    _activeFlow: null,
    _activeStepIndex: 0,
    _resizeHandler: null,
    _stepObserver: null,

    TOKENS: {
        OWNER_CORE: 'owner_core',
        TAG_PICKER_ONCE: 'tag_picker_once',
        WING_SHOWCASE_ONCE: 'wing_showcase_once'
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
                const step = this._currentStep();
                if (step && typeof step.onNextClick === 'function') {
                    step.onNextClick();
                } else {
                    this._advanceStep();
                }
            });

            document.getElementById('nookOnboardingBackdrop').addEventListener('click', (e) => {
                e.stopPropagation();
                const step = this._currentStep();
                if (!step || step.allowClickThrough) return;
                this._advanceStep();
            });
        }
    },

    // #region 2: ANA TUR (HESAP SAHİBİ)
    startOwnerTour() {
        if (!this.hasToken(this.TOKENS.OWNER_CORE)) return;
        if (this._activeFlow) return;

        const steps = [];

        // 1. İsim & Ünvan düzenleme (tıklanmış halini canlı göster)
        steps.push({
            id: 'front-name-title',
            target: () => document.getElementById('profileName'),
            spotlightTargets: () => [
                document.getElementById('profileName'),
                document.getElementById('profileTitle')
            ],
            title: 'İsim & Ünvanını Düzenle',
            desc: 'İsim, ünvan ve bio alanlarına tıklayarak metinleri doğrudan düzenleyebilirsin.',
            nextLabel: 'İleri',
            padding: 8,
            onEnter: () => {
                const nameEl = document.getElementById('profileName');
                if (nameEl && !nameEl.isContentEditable) {
                    nameEl.click();
                }
            },
            onExit: () => {
                const nameEl = document.getElementById('profileName');
                if (nameEl && nameEl.isContentEditable) {
                    nameEl.blur();
                }
                window._frontEditingActive = false;
            }
        });

        // 2. Arka yüzü açmak için karta tıkla
        steps.push({
            id: 'flip-to-back',
            target: () => document.getElementById('cardContainer'),
            title: 'Kartın Arka Yüzünü Aç',
            desc: 'Bağlantılarını görmek ve düzenlemek için kartın boş bir alanına tıkla.',
            nextLabel: 'Çevir',
            allowClickThrough: true,
            padding: 6,
            onEnter: () => {
                const card = document.getElementById('cardContainer');
                this._watchCondition(() => card && card.classList.contains('is-flipped'), card, 640);
            },
            onNextClick: () => {
                if (typeof Router !== 'undefined' && typeof Router.setFlipped === 'function') {
                    Router.setFlipped(true);
                } else {
                    this._advanceStep();
                }
            }
        });

        // 4. Arka yüz: link ekleme ve sıralama
        steps.push({
            id: 'back-links',
            target: () => document.getElementById('cardBack'),
            title: 'Bağlantı Ekle & Sırala',
            desc: 'Buradan sosyal medya ve web bağlantılarını ekleyebilir, eklediğin bağlantıları sürükleyip bırakarak sıralayabilirsin.',
            nextLabel: 'İleri',
            padding: 6
        });

        // 5. Ön yüze dönüş
        steps.push({
            id: 'flip-to-front',
            target: () => document.getElementById('cardContainer'),
            title: 'Ön Yüze Dön',
            desc: 'Tekrar kartın boş bir alanına (veya sol üst geri okuna) tıklayarak ön yüze dönebilirsin.',
            nextLabel: 'Öne Dön',
            allowClickThrough: true,
            padding: 6,
            onEnter: () => {
                const card = document.getElementById('cardContainer');
                this._watchCondition(() => card && !card.classList.contains('is-flipped'), card, 640);
            },
            onNextClick: () => {
                if (typeof Router !== 'undefined' && typeof Router.setFlipped === 'function') {
                    Router.setFlipped(false);
                } else {
                    this._advanceStep();
                }
            }
        });

        // 6. PC: Sağ butonlar / Mobil: Yatay kaydırma
        if (this.isMobile) {
            steps.push({
                id: 'mobile-deck',
                target: () => document.getElementById('cardContainer'),
                spotlightTargets: () => [
                    document.getElementById('cardContainer'),
                    document.getElementById('mobileDeckDots')
                ],
                title: 'Kartlar Arası Kaydırma',
                desc: 'Ekranı sağa veya sola kaydırarak eklediğin kartlara (ve ilk kart ekleme ekranına) geçebilirsin.',
                nextLabel: 'İleri',
                padding: 8
            });
        } else {
            const addBtn = document.getElementById('triggerAddSectionBtn');
            const hasAddBtn = addBtn && !addBtn.hidden && addBtn.offsetParent !== null;
            steps.push({
                id: 'desktop-flags',
                target: () => hasAddBtn ? document.getElementById('triggerAddSectionBtn') : document.getElementById('cardFlagsWrapper'),
                title: hasAddBtn ? 'Bölüm Kartları Ekle' : 'Bölüm Kartların',
                desc: hasAddBtn
                    ? 'Sağdaki bu butonlardan Gaming, Showcase, Widgets ve Trophies kartlarını ekleyip açabilirsin.'
                    : 'Sağdaki bu sekmelerden ekli bölüm kartlarını açıp düzenleyebilirsin.',
                nextLabel: 'İleri',
                padding: 8
            });
        }

        // 7. Menü & Market (otomatik açık gösterim)
        steps.push({
            id: 'menu-open',
            target: () => document.getElementById('profile-user-dropdown'),
            spotlightTargets: () => [
                document.getElementById('nav-market-trigger'),
                document.getElementById('profile-user-dropdown')
            ],
            title: 'Menü & Tema Marketi',
            desc: 'Sayfa linkini kopyalama, alan yönetimi, tema özelleştirme ve Tema Marketi araçlarına buradan ulaşabilirsin.',
            nextLabel: 'Anladım',
            padding: 8,
            onEnter: () => {
                const dropdown = document.getElementById('profile-user-dropdown');
                if (dropdown) dropdown.classList.add('is-open');
                setTimeout(() => this._positionCurrentStep(), 40);
            },
            onExit: () => {
                const dropdown = document.getElementById('profile-user-dropdown');
                if (dropdown) dropdown.classList.remove('is-open');
            }
        });

        this._startFlow(this.TOKENS.OWNER_CORE, steps);
    },

    _watchCondition(predicate, observeTarget, delayMs = 240) {
        this._stopStepObserver();
        if (!observeTarget) return;

        this._stepObserver = new MutationObserver(() => {
            if (predicate()) {
                this._stopStepObserver();
                setTimeout(() => this._advanceStep(), delayMs);
            }
        });
        this._stepObserver.observe(observeTarget, { attributes: true, attributeFilter: ['class'] });
    },

    _stopStepObserver() {
        if (this._stepObserver) {
            this._stepObserver.disconnect();
            this._stepObserver = null;
        }
    },
    // #endregion

    // #region 3: ALAN İÇİ BAĞLAMSAL BOARDINGLER (TEK SEFERLİK)
    onTagPickerOpened() {
        if (typeof isOwner === 'undefined' || !isOwner) return;
        if (this._activeFlow) return;
        if (!this.hasToken(this.TOKENS.TAG_PICKER_ONCE)) return;

        setTimeout(() => {
            const panel = document.querySelector('#tag-picker-modal .tag-picker-panel');
            if (!panel || panel.offsetParent === null) return;

            this._startFlow(this.TOKENS.TAG_PICKER_ONCE, [{
                id: 'tag-picker-once-hint',
                target: () => document.querySelector('#tag-picker-modal .tag-picker-panel'),
                title: 'Etiket Oluştur & Sırala',
                desc: 'Listede olmayan bir etiketi yukarıdaki kutuya yazarak oluşturabilir, seçili etiketleri ise tutup sürükleyerek sırasını değiştirebilirsin.',
                nextLabel: 'Anladım',
                padding: 8
            }]);
        }, 230);
    },

    onWingOpened(wingType) {
        if (typeof isOwner === 'undefined' || !isOwner) return;
        if (this._activeFlow) return;
        if (wingType !== 'showcase') return;

        this._tryShowcaseItemHint(60);
    },

    onShowcaseItemAdded() {
        if (typeof isOwner === 'undefined' || !isOwner) return;
        if (this._activeFlow) return;

        this._tryShowcaseItemHint(180);
    },

    _tryShowcaseItemHint(delayMs = 120) {
        if (!this.hasToken(this.TOKENS.WING_SHOWCASE_ONCE)) return;

        setTimeout(() => {
            if (this._activeFlow || !this.hasToken(this.TOKENS.WING_SHOWCASE_ONCE)) return;
            const firstItem = document.querySelector('#topsCompanionCard .top-item-card');
            if (!firstItem || firstItem.offsetParent === null) return;

            this._startFlow(this.TOKENS.WING_SHOWCASE_ONCE, [{
                id: 'showcase-once-hint',
                target: () => document.querySelector('#topsCompanionCard .top-item-card'),
                title: 'Vitrin İçeriği',
                desc: 'Eklediğin içeriğin üzerine tıklayarak kişisel yorum veya not ekleyebilir, tutup sürükleyerek sırasını değiştirebilirsin.',
                nextLabel: 'Anladım',
                padding: 8
            }]);
        }, delayMs);
    },
    // #endregion

    // #region 4: SPOTLIGHT & TOOLTIP YERLEŞİM MOTORU
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

    _runCurrentExit() {
        this._stopStepObserver();
        const step = this._currentStep();
        if (step && typeof step.onExit === 'function') {
            step.onExit();
        }
    },

    _advanceStep() {
        if (!this._activeFlow) return;
        this._runCurrentExit();

        if (this._activeStepIndex + 1 < this._activeFlow.steps.length) {
            this._activeStepIndex += 1;
            this._renderStep();
        } else {
            this.closeOverlay(true);
        }
    },

    closeOverlay(consume = true) {
        this._runCurrentExit();
        if (this._activeFlow && consume) {
            this.consumeToken(this._activeFlow.tokenKey);
        }
        this._activeFlow = null;
        this._activeStepIndex = 0;

        const overlay = document.getElementById('nookOnboardingOverlay');
        if (overlay) {
            overlay.classList.remove('is-active', 'is-action-step');
            overlay.setAttribute('aria-hidden', 'true');
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
        const skipBtn = document.getElementById('nookOnboardingSkipBtn');

        const total = this._activeFlow.steps.length;
        badgeEl.textContent = total > 1 ? `${this._activeStepIndex + 1} / ${total}` : 'İpucu';
        titleEl.textContent = step.title || '';
        descEl.textContent = step.desc || '';
        descEl.style.display = step.desc ? '' : 'none';
        nextBtn.textContent = step.nextLabel || 'İleri';
        if (skipBtn) {
            skipBtn.style.display = (this._activeStepIndex + 1 >= total) ? 'none' : '';
        }

        overlay.classList.toggle('is-action-step', !!step.allowClickThrough);

        if (typeof step.onEnter === 'function') {
            step.onEnter();
        }

        this._positionCurrentStep();
        setTimeout(() => {
            if (this._currentStep() === step) {
                this._positionCurrentStep();
            }
        }, 180);
    },

    _positionCurrentStep() {
        const step = this._currentStep();
        if (!step) return;

        const spotlight = document.getElementById('nookOnboardingSpotlight');
        const tooltip = document.getElementById('nookOnboardingTooltip');
        const targetEl = typeof step.target === 'function' ? step.target() : null;

        if (!targetEl) {
            this.closeOverlay(true);
            return;
        }

        let rect = targetEl.getBoundingClientRect();
        if (typeof step.spotlightTargets === 'function') {
            const extraRects = step.spotlightTargets()
                .filter(el => el && el.offsetParent !== null)
                .map(el => el.getBoundingClientRect());
            if (extraRects.length > 0) {
                const left = Math.min(...extraRects.map(r => r.left));
                const top = Math.min(...extraRects.map(r => r.top));
                const right = Math.max(...extraRects.map(r => r.right));
                const bottom = Math.max(...extraRects.map(r => r.bottom));
                rect = { left, top, right, bottom, width: right - left, height: bottom - top };
            }
        }

        const pad = step.padding ?? 8;
        const sLeft = Math.max(4, rect.left - pad);
        const sTop = Math.max(4, rect.top - pad);
        const sWidth = Math.min(window.innerWidth - sLeft - 4, rect.width + pad * 2);
        const sHeight = Math.min(window.innerHeight - sTop - 4, rect.height + pad * 2);

        spotlight.style.left = `${sLeft}px`;
        spotlight.style.top = `${sTop}px`;
        spotlight.style.width = `${sWidth}px`;
        spotlight.style.height = `${sHeight}px`;

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
    }
    // #endregion
};
// #endregion
