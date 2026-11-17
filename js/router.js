// #region 1: NAVİGASYON VE DRILL-DOWN ROUTER
const Router = {
    cardContainer: null,
    cardElement: null,
    isFlipped: false,
    isFlipping: false,
    _flipTimeout: null,
    _cancelPending: null,

    init() {
        this.cardContainer = document.getElementById('cardContainer');
        this.cardElement = document.getElementById('nookCard') || this.cardContainer?.querySelector('.nook-card');

        // Başlangıçta arka yüzü inert yap (klavye ve ekran okuyucu erişimini kapat)
        const back = this.cardElement?.querySelector('.card-back');
        if (back) back.inert = true;

        const flipToFrontBtn = document.getElementById('flipToFrontBtn');
        const triggerShowcaseBtn = document.getElementById('triggerShowcaseBtn');
        const triggerTrophiesBtn = document.getElementById('triggerTrophiesBtn');
        const triggerWidgetsBtn = document.getElementById('triggerWidgetsBtn');
        const triggerAchievementsBtn = document.getElementById('triggerAchievementsBtn');
        const companionCloseBtn = document.getElementById('companionCloseBtn');
        const showcaseDetailCloseBtn = document.getElementById('showcaseDetailCloseBtn');
        const trophiesCloseBtn = document.getElementById('trophiesCloseBtn');
        const trophiesDetailCloseBtn = document.getElementById('trophiesDetailCloseBtn');

        // Flip butonu (Arka yüzden ön yüze)
        if (flipToFrontBtn) {
            flipToFrontBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setFlipped(false);
            });
        }

        // 4 Bayrak Dinleyicileri (Gaming, Widgets, Trophies, Showcase)
        if (triggerShowcaseBtn) {
            triggerShowcaseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(null, 'showcase');
            });
        }

        if (triggerTrophiesBtn) {
            triggerTrophiesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(null, 'gaming');
            });
        }

        if (triggerWidgetsBtn) {
            triggerWidgetsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(null, 'widgets');
            });
        }

        if (triggerAchievementsBtn) {
            triggerAchievementsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(null, 'achievements');
            });
        }

        // Alan Ekle (+) Flag'i ve Mobil "Kart Ekle" Kartı Butonu: Sahip için alan yönetimi pop-up'ını açar
        const triggerAddSectionBtn = document.getElementById('triggerAddSectionBtn');
        const mobileAddSectionCardBtn = document.getElementById('mobileAddSectionCardBtn');
        const openSectionManager = async (e) => {
            e.stopPropagation();
            if (typeof editModunuYukle === 'function') {
                await editModunuYukle();
            }
            if (typeof EditManager !== 'undefined' && EditManager.Sections) {
                EditManager.Sections.ac();
            }
        };
        if (triggerAddSectionBtn) triggerAddSectionBtn.addEventListener('click', openSectionManager);
        if (mobileAddSectionCardBtn) mobileAddSectionCardBtn.addEventListener('click', openSectionManager);

        // Eşlikçi Kart Kapat Butonları
        if (companionCloseBtn) {
            companionCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(false);
            });
        }
        if (showcaseDetailCloseBtn) {
            showcaseDetailCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(false);
            });
        }

        if (trophiesCloseBtn) {
            trophiesCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(false);
            });
        }
        if (trophiesDetailCloseBtn) {
            trophiesDetailCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(false);
            });
        }

        // Dokunmatik yatay swipe (kaydırma) motorunu başlat
        if (typeof TouchGestureManager !== 'undefined') {
            TouchGestureManager.init();
        }

        // 140ms Dokunsal Dokunma Geri Bildirimi (Tactile Tap Delay)
        if ('ontouchstart' in window) {
            let touchTarget = null;
            let touchStartTime = 0;

            document.addEventListener('touchstart', (e) => {
                const interactive = e.target.closest('.nook-link-row, .top-item-card, .trophy-card-unit, .flip-trigger-btn, .companion-back-btn, .companion-close-btn, .nook-icon-btn, .companion-row-item');
                if (interactive) {
                    touchTarget = interactive;
                    touchStartTime = Date.now();
                    interactive.classList.add('is-touch-pressed');
                }
            }, { passive: true });

            const clearPressed = () => {
                if (touchTarget) {
                    touchTarget.classList.remove('is-touch-pressed');
                    touchTarget = null;
                }
            };

            document.addEventListener('touchmove', clearPressed, { passive: true });
            document.addEventListener('touchcancel', clearPressed, { passive: true });
            document.addEventListener('touchend', () => {
                if (!touchTarget) return;
                const target = touchTarget;
                const elapsed = Date.now() - touchStartTime;
                const remaining = Math.max(0, 140 - elapsed);
                if (remaining > 0) {
                    setTimeout(() => target.classList.remove('is-touch-pressed'), remaining);
                } else {
                    target.classList.remove('is-touch-pressed');
                }
                touchTarget = null;
            }, { passive: true });

            // Link tıklamalarında 140ms basılma hissi sonrasında sayfayı/sekmeyi aç
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a.nook-link-row');
                if (link && !link.dataset.navigating) {
                    e.preventDefault();
                    link.classList.add('is-touch-pressed');
                    setTimeout(() => {
                        link.classList.remove('is-touch-pressed');
                        link.dataset.navigating = 'true';
                        link.click();
                    }, 140);
                } else if (link && link.dataset.navigating) {
                    delete link.dataset.navigating;
                }
            }, false);
        }

        // Ön yüzde aktif düzenleme açıkken dışarıya tıklandığını en erken fazda (capture) yakala
        document.addEventListener('pointerdown', (e) => {
            const activeEdit = document.querySelector('.editable-hover.is-input-active');
            if (activeEdit && !e.target.closest('.editable-hover.is-input-active')) {
                window._frontEditJustClosed = Date.now();
            }
        }, true);

        // Kartın boş alanlarına tıklandığında çevirme ve hiyerarşik geri dönme sistemi
        if (this.cardContainer) {
            this.cardContainer.addEventListener('click', (e) => {
                const interactiveSelector = [
                    'button',
                    'a',
                    'input',
                    'textarea',
                    'select',
                    '.tag-pill',
                    '.tag-add-pill',
                    '.tag-remove-btn',
                    '.editable-hover',
                    '.image-edit-overlay',
                    '.edit-action-bar',
                    '.image-cropper-modal',
                    '.tag-picker-modal',
                    '.nook-toast',
                    '.inline-form-card',
                    '.inline-form-input',
                    '.form-btn-sm',
                    '.item-delete-btn',
                    '.view-add-btn',
                    '.nook-link-row',
                    '.top-item-card',
                    '.banner-box',
                    '.avatar-box',
                    '.banner-img',
                    '.avatar-img',
                    '.profile-edit-avatar-wrap',
                    '.profile-edit-banner-wrap'
                ].join(', ');

                // 1. Etkileşimli bir elemana tıklandıysa flip mantığına hiç karışma
                if (e.target.closest('button, a, input, textarea, select, label, [data-no-flip]')) return;

                // 2. Özel bileşenlere veya kart satırlarına tıklandıysa işlemi asla kesme ve gasp etme
                if (e.target.closest(interactiveSelector)) return;

                // 3. Ön yüzde düzenleme modu açıkken dışarıdaki boş alana tıklandıysa:
                // İlk vuruşta sadece düzenlemeyi kapat, kartı çevirme
                if (window._frontEditingActive || (window._frontEditJustClosed && Date.now() - window._frontEditJustClosed < 450)) {
                    window._frontEditingActive = false;
                    window._frontEditJustClosed = 0;
                    const activeInput = document.querySelector('.editable-hover.is-input-active input, .editable-hover.is-input-active textarea');
                    if (activeInput) activeInput.blur();
                    return;
                }

                // 4. Arka yüzde akordeon düzenlemesi yeni kapandıysa ilk vuruşta geri dönme
                if (window._linkAccordionJustClosed && Date.now() - window._linkAccordionJustClosed < 400) {
                    window._linkAccordionJustClosed = 0;
                    return;
                }

                const selection = window.getSelection();
                if (selection && selection.toString().trim().length > 0) return;
                if (window._suruklemeBitti && Date.now() - window._suruklemeBitti < 300) return;

                // 5. Dönüş sürerken boş alana tıklandı: flip'i iptal et, kartı geri çevir
                if (this.isFlipping) {
                    this.setFlipped(!this.isFlipped);
                    return;
                }

                // 6. Animasyon yokken doğrudan gezinme:
                // A. ÖN YÜZ: Ön yüzdeyken boş alana tıklandığında arka yüze (linklere) git
                if (!this.isFlipped) {
                    this.setFlipped(true);
                    return;
                }

                // B. ARKA YÜZ: Boş alana tıklandığında ön yüze dön
                this.setFlipped(false);
            });
        }

        // Klavye Kısayolları (ESC)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // 1. En üstteki açık modalı öncelikle kapat (Z-index hiyerarşisine göre)
                const activeModals = Array.from(document.querySelectorAll(
                    '.image-cropper-modal.is-open, .tops-search-modal.is-open, .tops-setup-modal.is-open, .tag-picker-modal.is-open, .trophy-picker-modal.is-open, .block-delete-modal.is-open, .auth-modal.is-open'
                ));
                if (activeModals.length > 0) {
                    // Onay pop-up'ı (z-confirm) her zaman en üstte durur; DOM sırasından bağımsız olarak önce onu kapat
                    const confirmModal = activeModals.find(m => m.id === 'block-delete-modal');
                    const topModal = confirmModal || activeModals[activeModals.length - 1];
                    if (topModal.id === 'cropper-modal') {
                        const cancelBtn = document.getElementById('cropper-cancel-btn');
                        if (cancelBtn) cancelBtn.click();
                        else topModal.classList.remove('is-open');
                    } else if (topModal.id === 'section-manager-modal') {
                        if (window.EditManager?.Sections) window.EditManager.Sections.kapat();
                        else topModal.classList.remove('is-open');
                    } else if (topModal.id === 'trophy-picker-modal') {
                        if (window.EditManager?.TrophyPicker) window.EditManager.TrophyPicker.kapat();
                        else topModal.classList.remove('is-open');
                    } else if (topModal.id === 'tops-search-modal') {
                        if (window.EditManager?.MediaSearchModal) window.EditManager.MediaSearchModal.kapat();
                        else topModal.classList.remove('is-open');
                    } else if (topModal.id === 'tops-setup-modal') {
                        if (window.EditManager?.TopsSetupModal) window.EditManager.TopsSetupModal.kapat();
                        else topModal.classList.remove('is-open');
                    } else if (topModal.id === 'tag-picker-modal') {
                        if (window.EditManager?.TagPicker) window.EditManager.TagPicker.kapat();
                        else topModal.classList.remove('is-open');
                    } else if (topModal.id === 'block-delete-modal') {
                        const cancelBtn = document.getElementById('block-delete-cancel');
                        if (cancelBtn) cancelBtn.click();
                        else topModal.classList.remove('is-open');
                    } else {
                        topModal.classList.remove('is-open');
                    }
                    return;
                }

                // 2. Modal yoksa sahne hiyerarşisindeki adımları kapat
                const stage = document.getElementById('profileStage');
                const topsContainer = document.getElementById('tops-container-wrap');

                if (topsContainer && topsContainer.classList.contains('has-expanded-item')) {
                    topsContainer.classList.remove('has-expanded-item');
                    topsContainer.querySelectorAll('.top-item-card.is-expanded').forEach(c => c.classList.remove('is-expanded'));
                    return;
                }

                if (stage && stage.classList.contains('has-companion-open')) {
                    this.toggleCompanion(false);
                } else if (this.isFlipped) {
                    this.setFlipped(false);
                }
            }
        });
    },

    setFlipped(flipped) {
        if (this.isFlipped === flipped) return;

        this.isFlipped = flipped;
        const container = this.cardContainer;
        const card = this.cardElement;
        if (!container || !card) return;

        if (typeof TiltEngine !== 'undefined' && typeof TiltEngine.wake === 'function') {
            TiltEngine.wake();
        }

        const front = card.querySelector('.card-front');
        const back = card.querySelector('.card-back');

        // Önceki flip'in bekleyen bitiş işlemlerini iptal et
        this._cancelPending?.();

        // Hedef yüzü ANINDA aktif et, terk edilen yüzü ANINDA kapat
        // Böylece kart dönerken arkadaki içerik anında tıklanabilir olur, eski yüz tıklamaları yutmaz!
        if (front) front.inert = flipped;
        if (back) back.inert = !flipped;

        this.isFlipping = true;
        container.classList.add('is-flipping');
        container.classList.toggle('is-flipped', flipped);

        const finish = () => {
            this._cancelPending?.();
            this.isFlipping = false;
            container.classList.remove('is-flipping');
        };

        const onEnd = (e) => {
            if (e.target === card && e.propertyName === 'transform') finish();
        };

        card.addEventListener('transitionend', onEnd);
        const timeoutId = setTimeout(finish, 1000); // Güvenlik ağı fallback

        this._cancelPending = () => {
            card.removeEventListener('transitionend', onEnd);
            clearTimeout(timeoutId);
            this._cancelPending = null;
        };
    },

    getDeckOrder() {
        return (typeof SectionManager !== 'undefined' && typeof SectionManager.desteSirasi === 'function')
            ? SectionManager.desteSirasi()
            : ['achievements', 'widgets', 'gaming', 'main', 'showcase'];
    },

    getCurrentDeckPosition() {
        const stage = document.getElementById('profileStage');
        if (!stage || !stage.classList.contains('has-companion-open')) return 'main';
        if (stage.classList.contains('is-add-card-active')) return 'add-card';
        if (stage.classList.contains('is-showcase-active')) return 'showcase';
        if (stage.classList.contains('is-trophies-active')) {
            return window._activeLeftWingMode || 'gaming';
        }
        return 'main';
    },

    getActiveDeckElement() {
        const pos = this.getCurrentDeckPosition();
        if (pos === 'main') return this.cardContainer || document.getElementById('cardContainer');
        if (pos === 'add-card') return document.getElementById('addSectionCompanionCard');
        if (pos === 'showcase') return document.getElementById('topsCompanionCard');
        return document.getElementById('trophiesCompanionCard');
    },

    _cancelMobileAnimations() {
        const stage = document.getElementById('profileStage');
        const animProps = ['_activeCompanionAnim', '_activeCompanionCardAnim', '_activeGhostAnim', '_activeDragResetAnim'];
        animProps.forEach((prop) => {
            if (this[prop]) {
                try { this[prop].cancel(); } catch (err) {}
                this[prop] = null;
            }
        });
        if (stage) {
            stage.querySelectorAll('.deck-swipe-ghost-card').forEach(el => el.remove());
        }
        ['cardContainer', 'topsCompanionCard', 'trophiesCompanionCard', 'addSectionCompanionCard'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                if (id !== 'cardContainer' || window.innerWidth < 900) {
                    el.style.transform = '';
                }
                el.style.opacity = '';
            }
        });
    },

    _animateMobileDeckTransition(outgoingEl, incomingEl, dir, dragOffsetX = 0) {
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const duration = reducedMotion ? 160 : 380;
        const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';
        const travelPx = window.innerWidth + 40;
        const outEndX = dir < 0 ? -travelPx : travelPx;
        const inStartX = dir < 0 ? travelPx : -travelPx;
        const startX = dragOffsetX || 0;
        const startOpacity = dragOffsetX
            ? Math.max(0.5, 1 - Math.abs(dragOffsetX) / (window.innerWidth * 1.35))
            : 1;

        if (outgoingEl) {
            outgoingEl.style.transform = '';
            outgoingEl.style.opacity = '';
            const outFrames = reducedMotion
                ? [{ opacity: startOpacity }, { opacity: 0 }]
                : [
                    { transform: `translate3d(${startX}px, 0, 0)`, opacity: startOpacity },
                    { transform: `translate3d(${outEndX}px, 0, 0)`, opacity: 0 }
                ];
            const anim = outgoingEl.animate(outFrames, { duration, easing, fill: 'forwards' });
            if (outgoingEl.classList.contains('deck-swipe-ghost-card')) {
                this._activeGhostAnim = anim;
            } else if (outgoingEl.id === 'cardContainer') {
                this._activeCompanionAnim = anim;
            } else {
                this._activeCompanionCardAnim = anim;
            }
        }

        if (incomingEl) {
            incomingEl.style.transform = '';
            incomingEl.style.opacity = '';
            const inFrames = reducedMotion
                ? [{ opacity: 0 }, { opacity: 1 }]
                : [
                    { transform: `translate3d(${inStartX}px, 0, 0)`, opacity: 0 },
                    { transform: 'translate3d(0, 0, 0)', opacity: 1 }
                ];
            const anim = incomingEl.animate(inFrames, { duration, easing, fill: 'forwards' });
            if (incomingEl.id === 'cardContainer') {
                this._activeCompanionAnim = anim;
            } else {
                this._activeCompanionCardAnim = anim;
            }
        }

        return duration;
    },

    toggleCompanion(forceState, type = 'showcase', swipeDir = 0, dragOffsetX = 0) {
        const stage = document.getElementById('profileStage');
        const topsCard = document.getElementById('topsCompanionCard');
        const trophiesCard = document.getElementById('trophiesCompanionCard');
        const addSectionCard = document.getElementById('addSectionCompanionCard');
        const cardContainer = this.cardContainer || document.getElementById('cardContainer');
        if (!stage) return;

        if (typeof TiltEngine !== 'undefined' && typeof TiltEngine.wake === 'function') {
            TiltEngine.wake();
        }

        const isDesktop = window.innerWidth >= 900;

        // Devam eden kapanış/açılış zamanlayıcılarını ve Web Animation nesnelerini anında iptal et
        if (this._companionTimer) {
            clearTimeout(this._companionTimer);
            this._companionTimer = null;
        }
        this._cancelMobileAnimations();

        const isShowcaseOpen = stage.classList.contains('is-showcase-active');
        const isTrophiesOpen = stage.classList.contains('is-trophies-active');
        const isAddCardOpen = stage.classList.contains('is-add-card-active');
        const normalizedType = (type === 'trophies') ? 'gaming' : type;
        const currentLeftMode = window._activeLeftWingMode || 'gaming';

        let nextState;
        if (typeof forceState === 'boolean') {
            nextState = forceState;
        } else {
            if (normalizedType === 'add-card' && isAddCardOpen) {
                nextState = false;
            } else if (normalizedType === 'showcase' && isShowcaseOpen) {
                nextState = false;
            } else if (['gaming', 'widgets', 'achievements'].includes(normalizedType) && isTrophiesOpen && currentLeftMode === normalizedType) {
                nextState = false;
            } else {
                nextState = true;
            }
        }

        // Açık bir eşlikçi kart yoksa kapatma sekansını çalıştırma
        if (!nextState && !stage.classList.contains('has-companion-open')) {
            return;
        }

        // 'add-card' yalnızca mobilde, sahip için ve hiç ek alan yokken açılabilir
        if (nextState && normalizedType === 'add-card') {
            const isUserOwner = (typeof isOwner !== 'undefined' && isOwner);
            const hasNoSections = typeof SectionManager === 'undefined' || SectionManager.aktifAlanlariAl().length === 0;
            if (isDesktop || !isUserOwner || !hasNoSections || !addSectionCard) {
                return;
            }
        } else if (nextState && typeof SectionManager !== 'undefined' && !SectionManager.alanAktifMi(normalizedType)) {
            // Profilde ekli olmayan (pasif) bir alan açılamaz
            return;
        }

        const activeCompanion = (normalizedType === 'add-card')
            ? addSectionCard
            : ((normalizedType === 'showcase') ? topsCard : trophiesCard);
        const otherCompanion = isAddCardOpen
            ? addSectionCard
            : (isShowcaseOpen ? topsCard : (isTrophiesOpen ? trophiesCard : null));

        if (nextState) {
            // ==========================================
            // AÇILIŞ VE KANAT GEÇİŞ SEKANSI
            // ==========================================
            this._companionTransitioning = true;
            stage.classList.remove('is-companion-closing');

            const wasAnyOpen = stage.classList.contains('has-companion-open');
            const isLeftModeSwitch = wasAnyOpen && isTrophiesOpen && ['gaming', 'widgets', 'achievements'].includes(normalizedType) && currentLeftMode !== normalizedType;
            const deckOrder = this.getDeckOrder();
            const fullDeckOrder = ['achievements', 'widgets', 'gaming', 'main', 'showcase', 'add-card'];

            let oldDeckPos = 'main';
            if (wasAnyOpen) {
                oldDeckPos = isAddCardOpen ? 'add-card' : (isShowcaseOpen ? 'showcase' : currentLeftMode);
            }
            const oldIdx = deckOrder.includes(oldDeckPos) ? deckOrder.indexOf(oldDeckPos) : fullDeckOrder.indexOf(oldDeckPos);
            const newIdx = deckOrder.includes(normalizedType) ? deckOrder.indexOf(normalizedType) : fullDeckOrder.indexOf(normalizedType);

            // Mobilde sol kanat içi (Gaming <-> Widgets <-> Trophies) kaydırmalarda, içerik değişmeden önce
            // mevcut kartın görsel kopyasını (ghost) ve scroll konumlarını al
            let mobileOutgoingClone = null;
            let mobileScrollTops = [];
            if (!isDesktop && isLeftModeSwitch && activeCompanion) {
                mobileScrollTops = Array.from(activeCompanion.querySelectorAll('.scrollable-fade, .companion-body')).map(el => el.scrollTop);
                mobileOutgoingClone = activeCompanion.cloneNode(true);
                mobileOutgoingClone.removeAttribute('id');
                mobileOutgoingClone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
                mobileOutgoingClone.classList.add('deck-swipe-ghost-card');
                mobileOutgoingClone.setAttribute('aria-hidden', 'true');
                mobileOutgoingClone.inert = true;
            }

            if (otherCompanion && otherCompanion !== activeCompanion) {
                if (isDesktop) otherCompanion.style.display = 'none';
                otherCompanion.classList.remove('is-closing');
            }

            if (activeCompanion) {
                activeCompanion.classList.remove('is-closing');
            }

            // Kullanıcı profilin arka yüzündeyken kanatlardan birine geçerse profil kartını otomatik ön yüzüne çevir
            if (this.isFlipped) {
                this.setFlipped(false);
            }

            // 1. MASAÜSTÜ İLK AÇILIŞ İSE: İçeriği çizmeden önce FLIP ölçümünü yap ve kartı görünür kıl
            // Böylece cqw/cqh container query birimleri (0x0 yerine gerçek boyutta) tek seferde doğru hesaplanır!
            let firstRect = null;
            if (isDesktop && cardContainer) {
                cardContainer.style.transform = '';
                cardContainer.classList.remove('is-tilting');
                if (!wasAnyOpen) {
                    firstRect = cardContainer.getBoundingClientRect();
                }
                if (activeCompanion) {
                    activeCompanion.style.display = 'flex';
                }
                stage.classList.add('has-companion-open');
            } else {
                if (activeCompanion) {
                    activeCompanion.style.display = 'flex';
                }
                stage.classList.add('has-companion-open');
            }

            // 2. AKTİF KANAT SINIFLARINI VE İÇERİĞİNİ ÇİZ (RenderEngine kendi içinde EditManager.init() çağırır)
            if (normalizedType === 'add-card') {
                stage.classList.remove('is-showcase-active', 'is-trophies-active', 'is-gaming-mode', 'is-widgets-mode', 'is-achievements-mode');
                stage.classList.add('is-add-card-active');
            } else if (normalizedType === 'showcase') {
                stage.classList.remove('is-add-card-active', 'is-trophies-active', 'is-gaming-mode', 'is-widgets-mode', 'is-achievements-mode');
                stage.classList.add('is-showcase-active');
                if (kartVerisi?.tops) {
                    delete kartVerisi.tops._manualMaster;
                    const listeler = Array.isArray(kartVerisi.tops.listeler) ? kartVerisi.tops.listeler : [];
                    kartVerisi.tops.aktifListeId = (listeler.length === 1) ? listeler[0].id : null;
                }
                const topsCompanion = document.getElementById('topsCompanionCard');
                if (topsCompanion) topsCompanion.classList.remove('is-detail-editing');
                if (typeof RenderEngine !== 'undefined') {
                    RenderEngine.companionCiz(kartVerisi.tops);
                }
            } else {
                window._activeLeftWingMode = normalizedType;
                stage.classList.remove('is-add-card-active', 'is-showcase-active', 'is-gaming-mode', 'is-widgets-mode', 'is-achievements-mode');
                stage.classList.add('is-trophies-active', `is-${normalizedType}-mode`);
                delete window._manualTrophyMaster;
                const trophiesCompanion = document.getElementById('trophiesCompanionCard');
                if (trophiesCompanion) trophiesCompanion.classList.remove('is-detail-editing');

                let aktifListe = [];
                if (typeof TrophiesManager !== 'undefined') {
                    if (normalizedType === 'widgets' && typeof TrophiesManager.aktifWidgetlariAl === 'function') {
                        aktifListe = TrophiesManager.aktifWidgetlariAl(kartVerisi);
                    } else if (normalizedType === 'gaming' && typeof TrophiesManager.aktifOyunlariAl === 'function') {
                        aktifListe = TrophiesManager.aktifOyunlariAl(kartVerisi);
                    }
                }
                window._activeTrophyDetail = (aktifListe.length === 1) ? aktifListe[0].tur : null;
                if (typeof RenderEngine !== 'undefined') {
                    RenderEngine.trophiesCiz(kartVerisi);
                }
            }

            // 3. ANİMASYONLARI BAŞLAT (Masaüstü FLIP + WAAPI / Mobil Birleşik Deck Swipe)
            let animDuration = 420;
            if (isDesktop && cardContainer) {
                const lastRect = cardContainer.getBoundingClientRect();
                const slideDist = Math.round(Math.max(48, lastRect.width * 0.14));

                if (!wasAnyOpen && firstRect) {
                    const deltaX = (firstRect.left + firstRect.width / 2) - (lastRect.left + lastRect.width / 2);
                    const deltaY = (firstRect.top + firstRect.height / 2) - (lastRect.top + lastRect.height / 2);

                    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                        this._activeCompanionAnim = cardContainer.animate([
                            { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
                            { transform: 'translate3d(0, 0, 0)' }
                        ], {
                            duration: 420,
                            easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
                        });
                    }
                }

                if (activeCompanion) {
                    activeCompanion.style.setProperty('--companion-enter-x', `-${slideDist}px`);
                    this._activeCompanionCardAnim = activeCompanion.animate([
                        {
                            opacity: 0,
                            transform: `translate3d(-${slideDist}px, 0, -20px) scale(0.96)`
                        },
                        {
                            opacity: 1,
                            offset: 0.35
                        },
                        {
                            opacity: 1,
                            transform: 'translate3d(0, 0, 0) scale(1)'
                        }
                    ], {
                        duration: 420,
                        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
                    });
                }
            } else if (!isDesktop && activeCompanion) {
                const dir = swipeDir !== 0 ? swipeDir : (newIdx > oldIdx ? -1 : 1);
                let outgoingEl = null;

                if (isLeftModeSwitch && mobileOutgoingClone) {
                    stage.appendChild(mobileOutgoingClone);
                    mobileOutgoingClone.querySelectorAll('.scrollable-fade, .companion-body').forEach((el, idx) => {
                        if (mobileScrollTops[idx]) el.scrollTop = mobileScrollTops[idx];
                    });
                    outgoingEl = mobileOutgoingClone;
                } else if (wasAnyOpen && otherCompanion) {
                    outgoingEl = otherCompanion;
                } else if (cardContainer) {
                    outgoingEl = cardContainer;
                }

                animDuration = this._animateMobileDeckTransition(outgoingEl, activeCompanion, dir, dragOffsetX);
            }

            if (typeof checkRibbonOverflow === 'function') {
                checkRibbonOverflow();
            }

            this._companionTimer = setTimeout(() => {
                this._cancelMobileAnimations();
                this._companionTransitioning = false;
                this._companionTimer = null;
                if (typeof checkRibbonOverflow === 'function') {
                    checkRibbonOverflow();
                }
                if (typeof TiltEngine !== 'undefined' && typeof TiltEngine.wake === 'function') {
                    TiltEngine.wake();
                }
            }, isDesktop ? 430 : animDuration + 20);

        } else {
            // ==========================================
            // KAPANIŞ SEKANSI
            // ==========================================
            this._companionTransitioning = true;

            const currentCard = isAddCardOpen ? addSectionCard : (isShowcaseOpen ? topsCard : trophiesCard);
            if (currentCard && isDesktop) {
                if (cardContainer) {
                    const rect = cardContainer.getBoundingClientRect();
                    const slideDist = Math.round(Math.max(42, rect.width * 0.12));
                    currentCard.style.setProperty('--companion-enter-x', `-${slideDist}px`);
                }
                currentCard.classList.add('is-closing');
            }
            stage.classList.add('is-companion-closing');

            let animDuration = 380;
            if (isDesktop && cardContainer) {
                cardContainer.style.transform = '';
                cardContainer.classList.remove('is-tilting');

                const stageRect = stage.getBoundingClientRect();
                const cardRect = cardContainer.getBoundingClientRect();
                const returnDeltaX = (stageRect.left + stageRect.width / 2) - (cardRect.left + cardRect.width / 2);
                const returnDeltaY = (stageRect.top + stageRect.height / 2) - (cardRect.top + cardRect.height / 2);

                this._activeCompanionAnim = cardContainer.animate([
                    { transform: 'translate3d(0, 0, 0)' },
                    { transform: `translate3d(${returnDeltaX}px, ${returnDeltaY}px, 0)` }
                ], {
                    duration: 380,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    fill: 'forwards'
                });
            } else {
                // Mobilde ana profil kartına geri dönüş
                stage.classList.remove('has-companion-open');
                if (cardContainer && currentCard) {
                    const dir = swipeDir !== 0 ? swipeDir : ((isShowcaseOpen || isAddCardOpen) ? 1 : -1);
                    animDuration = this._animateMobileDeckTransition(currentCard, cardContainer, dir, dragOffsetX);
                }
            }

            this._companionTimer = setTimeout(() => {
                stage.classList.remove('has-companion-open', 'is-companion-closing', 'is-add-card-active', 'is-showcase-active', 'is-trophies-active', 'is-gaming-mode', 'is-widgets-mode', 'is-achievements-mode');
                if (topsCard) {
                    topsCard.classList.remove('is-closing');
                    if (isDesktop) topsCard.style.display = 'none';
                }
                if (trophiesCard) {
                    trophiesCard.classList.remove('is-closing');
                    if (isDesktop) trophiesCard.style.display = 'none';
                }
                // Bir sonraki açılış için her iki kartın da durumunu sıfırla
                if (kartVerisi?.tops) {
                    delete kartVerisi.tops._manualMaster;
                    kartVerisi.tops.aktifListeId = null;
                }
                delete window._manualTrophyMaster;
                window._activeTrophyDetail = null;
                const topsComp = document.getElementById('topsCompanionCard');
                if (topsComp) topsComp.classList.remove('is-detail-editing');

                this._cancelMobileAnimations();
                if (cardContainer && isDesktop) cardContainer.style.transform = '';
                this._companionTransitioning = false;
                this._companionTimer = null;
                if (typeof checkRibbonOverflow === 'function') {
                    checkRibbonOverflow();
                }
                if (typeof TiltEngine !== 'undefined' && typeof TiltEngine.wake === 'function') {
                    TiltEngine.wake();
                }
            }, isDesktop ? 380 : animDuration + 20);
        }
    }
};
// #endregion

// #region 2: DOKUNMATİK 3'LÜ DESTE KAYDIRMA MOTORU (TOUCH GESTURE ENGINE)
const TouchGestureManager = {
    startX: 0,
    startY: 0,
    startTime: 0,
    lastX: 0,
    lastY: 0,
    isTracking: false,
    hasSwiped: false,
    dragActive: false,
    dragEl: null,
    scrollerEl: null,
    isScrollableEl: false,
    lockedAxis: null, // 'x' | 'y' | null (İlk ~10px harekette kilitlenir)
    threshold: 50, // Yanlışlıkla tetiklenmeyen sağlam yatay kaydırma eşiği (px)
    maxVerticalTolerance: 90, // Doğal başparmak açısı üst toleransı (px)

    init() {
        const stage = document.getElementById('profileStage');
        if (!stage) return;

        // Dokunma olaylarını doğrudan pencere üzerinden dinle
        window.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        window.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        window.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: true });
    },

    isTouchDevice() {
        // matchMedia pointer: coarse ile yatay telefonlar ve tabletleri de kapsar
        return window.innerWidth < 900 || window.matchMedia('(pointer: coarse)').matches;
    },

    canScrollVertically(deltaY) {
        if (!this.isScrollableEl || !this.scrollerEl) return false;
        const el = this.scrollerEl;
        if (deltaY < 0) {
            // Parmak yukarı gidiyor -> liste aşağı kaydırılmak isteniyor
            return (el.scrollTop + el.clientHeight) < (el.scrollHeight - 2);
        }
        if (deltaY > 0) {
            // Parmak aşağı gidiyor -> liste yukarı kaydırılmak isteniyor
            return el.scrollTop > 2;
        }
        return false;
    },

    _snapBackDrag(el, fromX) {
        if (!el) return;
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) {
            el.style.transform = '';
            el.style.opacity = '';
            return;
        }
        const fromOpacity = Math.max(0.5, 1 - Math.abs(fromX) / (window.innerWidth * 1.35));
        el.style.transform = '';
        el.style.opacity = '';
        if (Router._activeDragResetAnim) {
            try { Router._activeDragResetAnim.cancel(); } catch (err) {}
        }
        const anim = el.animate([
            { transform: `translate3d(${fromX}px, 0, 0)`, opacity: fromOpacity },
            { transform: 'translate3d(0, 0, 0)', opacity: 1 }
        ], {
            duration: 240,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
        });
        Router._activeDragResetAnim = anim;
        anim.onfinish = () => {
            if (Router._activeDragResetAnim === anim) {
                Router._activeDragResetAnim = null;
            }
        };
    },

    handleTouchStart(e) {
        if (!this.isTouchDevice()) return;
        if (document.body.classList.contains('is-pointer-dragging')) return;

        // Yalnızca sahne veya kartlar içerisindeki dokunuşları takip et
        const stage = document.getElementById('profileStage');
        if (!stage) return;
        const touchTarget = e.target;
        if (!stage.contains(touchTarget) && touchTarget !== stage) {
            this.isTracking = false;
            return;
        }

        // Açık aktif modal veya düzenleme modu kontrolü
        // (Sadece açık .is-open / .is-active sınıflarını kontrol et; DOM'da gizli duran panelleri yanlışlıkla yakalama)
        const activeModal = document.querySelector(
            '.nook-modal.is-active, .auth-modal.is-open, .image-cropper-modal.is-open, ' +
            '.tag-picker-modal.is-open, .block-delete-modal.is-open, .tops-setup-modal.is-open, ' +
            '.tops-search-modal.is-open, .trophy-picker-modal.is-open, .modal.is-open'
        );
        const isEditingActive = document.querySelector('.companion-card.is-detail-editing') || document.body.classList.contains('has-unsaved-changes');
        if (activeModal || isEditingActive) {
            this.isTracking = false;
            return;
        }

        if (e.touches.length !== 1) {
            this.isTracking = false;
            return;
        }

        // 1. Dokunuş kaydırılabilir bir iç scroll alanı içinde mi başladı?
        const scroller = touchTarget.closest('.scrollable-fade, .companion-body');
        this.scrollerEl = scroller || null;
        this.isScrollableEl = !!(scroller && scroller.scrollHeight > scroller.clientHeight + 2);

        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.lastX = touch.clientX;
        this.lastY = touch.clientY;
        this.startTime = Date.now();
        this.isTracking = true;
        this.hasSwiped = false;
        this.dragActive = false;
        this.dragEl = null;
        this.lockedAxis = null;
    },

    handleTouchMove(e) {
        if (!this.isTracking || e.touches.length !== 1) return;

        const touch = e.touches[0];
        this.lastX = touch.clientX;
        this.lastY = touch.clientY;
        const deltaX = touch.clientX - this.startX;
        const deltaY = touch.clientY - this.startY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // 3. İlk ~10px harekette ekseni kilitle (axis lock: 'x' | 'y')
        if (!this.lockedAxis && (absX > 10 || absY > 10)) {
            if (absX >= absY) {
                this.lockedAxis = 'x';
            } else {
                this.lockedAxis = 'y';
            }
        }

        // X ekseni kilitlendiyse: deste >= 2 kart içeriyorsa parmağı canlı takip et ve tarayıcı geçmiş kaydırmasını engelle
        if (this.lockedAxis === 'x') {
            const deckOrder = Router.getDeckOrder();
            if (deckOrder.length > 1 && absX > 8) {
                if (e.cancelable) {
                    e.preventDefault();
                }
                const activeEl = Router.getActiveDeckElement();
                if (activeEl) {
                    if (Router._activeDragResetAnim) {
                        try { Router._activeDragResetAnim.cancel(); } catch (err) {}
                        Router._activeDragResetAnim = null;
                    }
                    this.dragActive = true;
                    this.dragEl = activeEl;
                    activeEl.style.transform = `translate3d(${deltaX}px, 0, 0)`;
                    activeEl.style.opacity = String(Math.max(0.5, 1 - absX / (window.innerWidth * 1.35)));
                }
            }
            return;
        }

        // Dikey eksen kilitlendiyse ve iç liste gerçekten kaydırılamıyorsa (veya sınırda ise),
        // geri dönüş / flip jesti için yerel kaydırma momentumunu engelle
        const stage = document.getElementById('profileStage');
        const isShowcaseOpen = stage && stage.classList.contains('is-showcase-active');
        const isTrophiesOpen = stage && stage.classList.contains('is-trophies-active');
        const isDetailActive = (isShowcaseOpen && typeof kartVerisi !== 'undefined' && kartVerisi?.tops?.aktifListeId) ||
                               (isTrophiesOpen && typeof window !== 'undefined' && window._activeTrophyDetail);

        if (this.lockedAxis === 'y' && !this.canScrollVertically(deltaY) && deltaY < -10 && absY > absX * 1.2) {
            if (isDetailActive || (!stage?.classList.contains('has-companion-open') && !Router.isFlipped)) {
                if (e.cancelable) {
                    e.preventDefault();
                }
            }
        }
    },

    handleTouchCancel(e) {
        if (!this.isTracking) return;
        const deltaX = this.lastX - this.startX;
        const deltaY = this.lastY - this.startY;
        this.evaluateSwipe(deltaX, deltaY);
        if (this.dragActive && !this.hasSwiped) {
            this._snapBackDrag(this.dragEl, deltaX);
        }
        this.isTracking = false;
        this.dragActive = false;
        this.dragEl = null;
        this.lockedAxis = null;
    },

    handleTouchEnd(e) {
        if (!this.isTracking) return;
        this.isTracking = false;

        let endX = this.lastX;
        let endY = this.lastY;
        if (e.changedTouches && e.changedTouches.length === 1) {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
        }

        const deltaX = endX - this.startX;
        const deltaY = endY - this.startY;
        this.evaluateSwipe(deltaX, deltaY);
        if (this.dragActive && !this.hasSwiped) {
            this._snapBackDrag(this.dragEl, deltaX);
        }
        this.dragActive = false;
        this.dragEl = null;
        this.lockedAxis = null;
    },

    evaluateSwipe(deltaX, deltaY) {
        if (this.hasSwiped) return;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        const elapsed = Date.now() - this.startTime;

        // 800ms üzeri uzun dokunuşlar swipe sayılmaz
        if (elapsed > 800) return;

        const stage = document.getElementById('profileStage');
        const isShowcaseOpen = stage && stage.classList.contains('is-showcase-active');
        const isTrophiesOpen = stage && stage.classList.contains('is-trophies-active');
        const isAnyOpen = stage && stage.classList.contains('has-companion-open');

        // [0. Liste İçeriğinin / Detayın İçindeyken Yukarı Kaydırma -> Master Listeye Geri Dön]
        if (isAnyOpen && !this.canScrollVertically(deltaY) && absY >= 50 && absY > absX * 1.3 && deltaY < 0) {
            if (isShowcaseOpen && typeof kartVerisi !== 'undefined' && kartVerisi.tops && kartVerisi.tops.aktifListeId) {
                this.hasSwiped = true;
                kartVerisi.tops.aktifListeId = null;
                kartVerisi.tops._manualMaster = true;
                if (typeof RenderEngine !== 'undefined') RenderEngine.companionCiz(kartVerisi.tops);
                return;
            } else if (isTrophiesOpen && window._activeTrophyDetail) {
                this.hasSwiped = true;
                window._activeTrophyDetail = null;
                window._manualTrophyMaster = true;
                if (typeof RenderEngine !== 'undefined') RenderEngine.trophiesCiz(kartVerisi);
                return;
            }
        }

        // [1. Profil Bloğunun Üstündeyken Dikey Kaydırma (Yukarı -> Arkaya / Aşağı -> Ön Yüze)]
        if (!isAnyOpen && this.lockedAxis !== 'x') {
            if (!Router.isFlipped) {
                // Ön yüzdeyken Yukarı Kaydırma (Swipe-Up, deltaY < -50) -> Kartı arkaya çevir
                if (!this.canScrollVertically(deltaY) && absY > 50 && absY > absX * 1.5 && deltaY < 0) {
                    this.hasSwiped = true;
                    Router.setFlipped(true);
                    return;
                }
            } else {
                // Arka yüzdeyken: kaydırılabilir liste varsa sadece en üstteyken aşağı çekince ön yüze dön
                const canFlipBack = this.isScrollableEl
                    ? (deltaY > 50 && absY > absX * 1.5 && !this.canScrollVertically(deltaY))
                    : (absY > 50 && absY > absX * 1.5);
                if (canFlipBack) {
                    this.hasSwiped = true;
                    Router.setFlipped(false);
                    return;
                }
            }
        }

        // Eğer eksen Y olarak kilitlendiyse yatay swipe çalıştırma
        if (this.lockedAxis === 'y') return;

        // 2. Yatay swipe eşiği (mesafe veya hızlı flick ivmesi)
        const vx = deltaX / Math.max(1, elapsed);
        const passedThreshold = absX >= this.threshold || (absX >= 24 && Math.abs(vx) >= 0.35);
        if (!passedThreshold) return;
        if (absY > this.maxVerticalTolerance || absX < absY * 1.35) return;

        const deckOrder = Router.getDeckOrder();
        // Profilde hiç ek alan yoksa yatay kaydırma yapılacak bir deste yok
        if (deckOrder.length <= 1) return;

        this.hasSwiped = true;

        const currentPos = Router.getCurrentDeckPosition();
        const currentIdx = Math.max(0, deckOrder.indexOf(currentPos));
        const dir = deltaX < 0 ? -1 : 1;
        const targetIdx = dir < 0
            ? (currentIdx + 1) % deckOrder.length
            : (currentIdx - 1 + deckOrder.length) % deckOrder.length;
        const target = deckOrder[targetIdx];

        if (target === 'main') {
            Router.toggleCompanion(false, 'showcase', dir, deltaX);
        } else {
            Router.toggleCompanion(true, target, dir, deltaX);
        }
    }
};
// #endregion
