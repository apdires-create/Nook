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

        // Showcase & Trophies Bayrakları
        if (triggerShowcaseBtn) {
            triggerShowcaseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(null, 'showcase');
            });
        }

        if (triggerTrophiesBtn) {
            triggerTrophiesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(null, 'trophies');
            });
        }

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
                const interactive = e.target.closest('.nook-link-row, .top-item-card, .trophy-card-unit, .flip-trigger-btn, .companion-back-btn, .companion-close-btn, .nook-icon-btn');
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
                    const topModal = activeModals[activeModals.length - 1];
                    if (topModal.id === 'cropper-modal') {
                        const cancelBtn = document.getElementById('cropper-cancel-btn');
                        if (cancelBtn) cancelBtn.click();
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

    toggleCompanion(forceState, type = 'showcase') {
        const stage = document.getElementById('profileStage');
        const topsCard = document.getElementById('topsCompanionCard');
        const trophiesCard = document.getElementById('trophiesCompanionCard');
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
        if (this._activeCompanionAnim) {
            try {
                this._activeCompanionAnim.cancel();
            } catch (err) {}
            this._activeCompanionAnim = null;
        }

        const isShowcaseOpen = stage.classList.contains('is-showcase-active');
        const isTrophiesOpen = stage.classList.contains('is-trophies-active');

        let nextState;
        if (typeof forceState === 'boolean') {
            nextState = forceState;
        } else {
            if (type === 'showcase' && isShowcaseOpen) {
                nextState = false;
            } else if (type === 'trophies' && isTrophiesOpen) {
                nextState = false;
            } else {
                nextState = true;
            }
        }

        const activeCompanion = (type === 'showcase') ? topsCard : trophiesCard;
        const otherCompanion = (type === 'showcase') ? trophiesCard : topsCard;

        if (nextState) {
            // ==========================================
            // AÇILIŞ VE KANAT GEÇİŞ SEKANSI
            // ==========================================
            this._companionTransitioning = true;

            if (otherCompanion) {
                otherCompanion.style.display = 'none';
                otherCompanion.classList.remove('is-closing');
            }

            const wasAnyOpen = stage.classList.contains('has-companion-open');

            // Kullanıcı profilin arka yüzündeyken Showcase veya Trophies'e geçerse profil kartını otomatik ön yüzüne çevir
            if (this.isFlipped) {
                this.setFlipped(false);
            }

            if (type === 'showcase') {
                stage.classList.remove('is-trophies-active');
                stage.classList.add('is-showcase-active');
                if (kartVerisi?.tops) {
                    kartVerisi.tops.aktifListeId = null;
                }
                const topsCompanion = document.getElementById('topsCompanionCard');
                if (topsCompanion) topsCompanion.classList.remove('is-detail-editing');
                if (typeof RenderEngine !== 'undefined') {
                    RenderEngine.companionCiz(kartVerisi.tops);
                }
                if (typeof EditManager !== 'undefined' && isOwner) {
                    EditManager.CompanionViews?.init();
                }
            } else {
                stage.classList.remove('is-showcase-active');
                stage.classList.add('is-trophies-active');
                window._activeTrophyDetail = null;
                if (typeof RenderEngine !== 'undefined') {
                    RenderEngine.trophiesCiz(kartVerisi);
                }
                if (typeof EditManager !== 'undefined' && isOwner) {
                    EditManager.TrophiesView?.init();
                }
            }

            if (activeCompanion) {
                activeCompanion.classList.remove('is-closing');
                activeCompanion.style.display = 'flex';
            }

            if (isDesktop && cardContainer) {
                // Eğer zaten bir kanat açıksa (Showcase <-> Trophies arası direkt geçiş), profil kartını gereksiz zıplatma
                if (!wasAnyOpen) {
                    const firstRect = cardContainer.getBoundingClientRect();
                    stage.classList.add('has-companion-open');
                    const lastRect = cardContainer.getBoundingClientRect();
                    const deltaX = (firstRect.left + firstRect.width / 2) - (lastRect.left + lastRect.width / 2);
                    const deltaY = (firstRect.top + firstRect.height / 2) - (lastRect.top + lastRect.height / 2);

                    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                        this._activeCompanionAnim = cardContainer.animate([
                            { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
                            { transform: 'translate3d(0, 0, 0)' }
                        ], {
                            duration: 400,
                            easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
                        });
                    }
                } else {
                    stage.classList.add('has-companion-open');
                }
            } else {
                stage.classList.remove('is-companion-closing');
                stage.classList.add('has-companion-open');
            }

            this._companionTimer = setTimeout(() => {
                this._companionTransitioning = false;
                this._companionTimer = null;
                this._activeCompanionAnim = null;
                if (typeof TiltEngine !== 'undefined' && typeof TiltEngine.wake === 'function') {
                    TiltEngine.wake();
                }
            }, isDesktop ? 400 : 200);

        } else {
            // ==========================================
            // KAPANIŞ SEKANSI
            // ==========================================
            this._companionTransitioning = true;

            const currentCard = isShowcaseOpen ? topsCard : trophiesCard;
            if (currentCard && isDesktop) currentCard.classList.add('is-closing');
            stage.classList.add('is-companion-closing');

            if (isDesktop && cardContainer) {
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
                stage.classList.remove('has-companion-open');
            }

            this._companionTimer = setTimeout(() => {
                stage.classList.remove('has-companion-open', 'is-companion-closing', 'is-showcase-active', 'is-trophies-active');
                if (topsCard) {
                    topsCard.classList.remove('is-closing');
                    if (isDesktop) topsCard.style.display = 'none';
                }
                if (trophiesCard) {
                    trophiesCard.classList.remove('is-closing');
                    if (isDesktop) trophiesCard.style.display = 'none';
                }
                // Bir sonraki açılış için her iki kartın da durumunu master listeye sıfırla
                if (kartVerisi?.tops) {
                    kartVerisi.tops.aktifListeId = null;
                }
                window._activeTrophyDetail = null;
                const topsComp = document.getElementById('topsCompanionCard');
                if (topsComp) topsComp.classList.remove('is-detail-editing');

                if (this._activeCompanionAnim) {
                    try { this._activeCompanionAnim.cancel(); } catch (err) {}
                    this._activeCompanionAnim = null;
                }
                if (cardContainer && isDesktop) cardContainer.style.transform = '';
                this._companionTransitioning = false;
                this._companionTimer = null;
                if (typeof TiltEngine !== 'undefined' && typeof TiltEngine.wake === 'function') {
                    TiltEngine.wake();
                }
            }, isDesktop ? 380 : 200);
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
    startedInScroller: false,
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

        // 1. Dokunuş kaydırılabilir bir iç scroll alanı içinde ve aşağı kaymış durumda mı başladı?
        const scroller = touchTarget.closest('.scrollable-fade, .companion-body');
        this.startedInScroller = !!scroller && scroller.scrollHeight > scroller.clientHeight && scroller.scrollTop > 8;

        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.lastX = touch.clientX;
        this.lastY = touch.clientY;
        this.startTime = Date.now();
        this.isTracking = true;
        this.hasSwiped = false;
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

        // Yalnızca X ekseni kilitlendiyse ve belirgin yatay hareket varsa tarayıcı yerel geçmişini engelle
        if (this.lockedAxis === 'x' && absX > 12) {
            if (e.cancelable) {
                e.preventDefault();
            }
        }

        // Dikey eksen kilitlendiyse ve liste detayı içinden yukarı kaydırma (geri dönüş) jesti yapılıyorsa
        // yerel kaydırma momentumunu engelle (böylece liste döndüğünde tarayıcı ilk dokunuşu momentum durdurma sanıp yutmaz)
        const stage = document.getElementById('profileStage');
        const isShowcaseOpen = stage && stage.classList.contains('is-showcase-active');
        const isTrophiesOpen = stage && stage.classList.contains('is-trophies-active');
        const isDetailActive = (isShowcaseOpen && typeof kartVerisi !== 'undefined' && kartVerisi?.tops?.aktifListeId) ||
                               (isTrophiesOpen && typeof window !== 'undefined' && window._activeTrophyDetail);

        if (this.lockedAxis === 'y' && !this.startedInScroller && deltaY < -10 && absY > absX * 1.2) {
            if (isDetailActive || (!stage?.classList.contains('has-companion-open') && !Router.isFlipped)) {
                if (e.cancelable) {
                    e.preventDefault();
                }
            }
        }
    },

    handleTouchCancel(e) {
        if (!this.isTracking) return;
        this.evaluateSwipe(this.lastX - this.startX, this.lastY - this.startY);
        this.isTracking = false;
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
        if (isAnyOpen && !this.startedInScroller && absY >= 50 && absY > absX * 1.3 && deltaY < 0) {
            if (isShowcaseOpen && typeof kartVerisi !== 'undefined' && kartVerisi.tops && kartVerisi.tops.aktifListeId) {
                this.hasSwiped = true;
                kartVerisi.tops.aktifListeId = null;
                if (typeof RenderEngine !== 'undefined') RenderEngine.companionCiz(kartVerisi.tops);
                return;
            } else if (isTrophiesOpen && window._activeTrophyDetail) {
                this.hasSwiped = true;
                window._activeTrophyDetail = null;
                if (typeof RenderEngine !== 'undefined') RenderEngine.trophiesCiz(kartVerisi);
                return;
            }
        }

        // [1. Profil Bloğunun Üstündeyken Dikey Kaydırma (Yukarı -> Arkaya / Aşağı -> Ön Yüze)]
        if (!isAnyOpen) {
            if (!Router.isFlipped) {
                // Ön yüzdeyken Yukarı Kaydırma (Swipe-Up, deltaY < -50) -> Kartı arkaya çevir
                if (!this.startedInScroller && absY > 50 && absY > absX * 1.5 && deltaY < 0) {
                    this.hasSwiped = true;
                    Router.setFlipped(true);
                    return;
                }
            } else {
                // Arka yüzdeyken Dikey Kaydırma -> Ön yüze dön
                if (!this.startedInScroller && absY > 50 && absY > absX * 1.5) {
                    this.hasSwiped = true;
                    Router.setFlipped(false);
                    return;
                }
            }
        }

        // Eğer eksen Y olarak kilitlendiyse veya yatay eşik aşılmadıysa yatay swipe çalıştırma
        if (this.lockedAxis === 'y') return;

        // 2. Yatay swipe eşiği: threshold (50px) ve absX > absY * 1.5 sıkı oran kontrolü
        if (absX < this.threshold) return;
        if (absY > this.maxVerticalTolerance || absX < absY * 1.5) return;

        this.hasSwiped = true;

        if (!isAnyOpen) {
            // [1. Profil Kartı Merkezde]:
            // Sola kaydırma (Swipe Left) -> Showcase'e (Sağ kanat) geç
            if (deltaX < -this.threshold) {
                Router.toggleCompanion(true, 'showcase');
            }
            // Sağa kaydırma (Swipe Right) -> Trophies'e (Sol kanat) geç
            else if (deltaX > this.threshold) {
                Router.toggleCompanion(true, 'trophies');
            }
        } else if (isShowcaseOpen) {
            // [2. Showcase Açık]:
            // Sağa kaydırma (Swipe Right) -> Profil Kartına dön
            if (deltaX > this.threshold) {
                Router.toggleCompanion(false);
            }
            // Sola kaydırma (Swipe Left) -> Profil Kartına dön
            else if (deltaX < -this.threshold) {
                Router.toggleCompanion(false);
            }
        } else if (isTrophiesOpen) {
            // [3. Trophies Açık]:
            // Sola kaydırma (Swipe Left) -> Profil Kartına dön
            if (deltaX < -this.threshold) {
                Router.toggleCompanion(false);
            }
            // Sağa kaydırma (Swipe Right) -> Profil Kartına dön
            else if (deltaX > this.threshold) {
                Router.toggleCompanion(false);
            }
        }
    }
};
// #endregion
