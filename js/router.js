// #region 1: NAVİGASYON VE DRILL-DOWN ROUTER
const Router = {
    cardContainer: null,
    cardElement: null,
    viewMenu: null,
    viewsWrapper: null,
    isFlipped: false,
    isFlipping: false,
    _flipTimeout: null,
    _cancelPending: null,
    activeDetailView: null,

    init() {
        this.cardContainer = document.getElementById('cardContainer');
        this.cardElement = document.getElementById('nookCard') || this.cardContainer?.querySelector('.nook-card');
        this.viewMenu = document.getElementById('viewMenu');
        this.viewsWrapper = document.getElementById('viewsWrapper');

        // Başlangıçta arka yüzü inert yap (klavye ve ekran okuyucu erişimini kapat)
        const back = this.cardElement?.querySelector('.card-back');
        if (back) back.inert = true;

        const flipToFrontBtn = document.getElementById('flipToFrontBtn');
        const triggerShowcaseBtn = document.getElementById('triggerShowcaseBtn') || document.getElementById('topsTriggerBtn');
        const triggerTrophiesBtn = document.getElementById('triggerTrophiesBtn');
        const companionCloseBtn = document.getElementById('companionCloseBtn');
        const trophiesCloseBtn = document.getElementById('trophiesCloseBtn');
        const tagEditTriggerBtn = document.getElementById('tagEditTriggerBtn');

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

        if (trophiesCloseBtn) {
            trophiesCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(false);
            });
        }

        // Tag Düzenleme Tetikleyicisi
        if (tagEditTriggerBtn) {
            tagEditTriggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.EditManager?.TagPicker) {
                    window.EditManager.TagPicker.ac();
                }
            });
        }

        // Dokunmatik yatay swipe (kaydırma) motorunu başlat
        if (typeof TouchGestureManager !== 'undefined') {
            TouchGestureManager.init();
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
                    '.cropper-modal',
                    '.image-cropper-modal',
                    '.tag-picker-modal',
                    '.add-section-modal',
                    '.nook-toast',
                    '.inline-form-card',
                    '.inline-form-input',
                    '.form-btn-sm',
                    '.item-delete-btn',
                    '.nav-item-btn',
                    '.add-section-nav-btn',
                    '.add-section-big-btn',
                    '.view-add-btn',
                    '.nook-link-row',
                    '.top-item-card',
                    '.status-card',
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
                    '.image-cropper-modal.is-open, .block-delete-modal.is-open, .tops-search-modal.is-open, .tops-setup-modal.is-open, .tag-picker-modal.is-open, .add-section-modal.is-open, .auth-modal.is-open'
                ));
                if (activeModals.length > 0) {
                    const topModal = activeModals[activeModals.length - 1];
                    if (topModal.id === 'cropper-modal') {
                        const cancelBtn = document.getElementById('cropper-cancel-btn');
                        if (cancelBtn) cancelBtn.click();
                        else topModal.classList.remove('is-open');
                    } else if (topModal.id === 'block-delete-modal') {
                        const cancelBtn = document.getElementById('block-delete-cancel');
                        if (cancelBtn) cancelBtn.click();
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
                    } else if (topModal.id === 'add-section-modal') {
                        if (window.EditManager?.SectionPicker) window.EditManager.SectionPicker.kapat();
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

            if (!flipped) this.resetToMainMenu();
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

    openDetailView(targetId) {
        // Geriye dönük uyumluluk: Arka yüz artık saf linklerdir
    },

    resetToMainMenu() {
        // Geriye dönük uyumluluk: Arka yüz artık saf linklerdir
    },

    toggleCompanion(forceState, type = 'showcase') {
        const stage = document.getElementById('profileStage');
        const topsCard = document.getElementById('topsCompanionCard');
        const trophiesCard = document.getElementById('trophiesCompanionCard');
        const cardContainer = this.cardContainer || document.getElementById('cardContainer');
        if (!stage) return;

        // Devam eden bir kapanış veya açılış geçişi varsa bekle
        if (this._companionTransitioning) return;

        const isShowcaseOpen = stage.classList.contains('is-showcase-active');
        const isTrophiesOpen = stage.classList.contains('is-trophies-active');
        const isCurrentlyOpen = stage.classList.contains('has-companion-open') && !stage.classList.contains('is-companion-closing');

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

        const isDesktop = window.innerWidth >= 900;
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

            if (type === 'showcase') {
                stage.classList.remove('is-trophies-active');
                stage.classList.add('is-showcase-active');
                if (typeof RenderEngine !== 'undefined') {
                    RenderEngine.companionCiz(kartVerisi.tops);
                }
                if (typeof EditManager !== 'undefined' && isOwner) {
                    EditManager.CompanionViews?.init();
                }
            } else {
                stage.classList.remove('is-showcase-active');
                stage.classList.add('is-trophies-active');
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
                const firstRect = cardContainer.getBoundingClientRect();
                stage.classList.add('has-companion-open');
                const lastRect = cardContainer.getBoundingClientRect();
                const deltaX = (firstRect.left + firstRect.width / 2) - (lastRect.left + lastRect.width / 2);
                const deltaY = (firstRect.top + firstRect.height / 2) - (lastRect.top + lastRect.height / 2);

                if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                    cardContainer.animate([
                        { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
                        { transform: 'translate3d(0, 0, 0)' }
                    ], {
                        duration: 550,
                        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
                    });
                }
            } else {
                stage.classList.remove('is-companion-closing');
                if (activeCompanion) void activeCompanion.offsetWidth;
                requestAnimationFrame(() => {
                    stage.classList.add('has-companion-open');
                });
            }

            setTimeout(() => {
                this._companionTransitioning = false;
            }, isDesktop ? 550 : 420);

        } else {
            // ==========================================
            // KAPANIŞ SEKANSI
            // ==========================================
            this._companionTransitioning = true;
            let closeAnim = null;

            const currentCard = isShowcaseOpen ? topsCard : trophiesCard;
            if (currentCard) currentCard.classList.add('is-closing');
            stage.classList.add('is-companion-closing');

            if (isDesktop && cardContainer) {
                const stageRect = stage.getBoundingClientRect();
                const cardRect = cardContainer.getBoundingClientRect();
                const returnDeltaX = (stageRect.left + stageRect.width / 2) - (cardRect.left + cardRect.width / 2);
                const returnDeltaY = (stageRect.top + stageRect.height / 2) - (cardRect.top + cardRect.height / 2);

                closeAnim = cardContainer.animate([
                    { transform: 'translate3d(0, 0, 0)' },
                    { transform: `translate3d(${returnDeltaX}px, ${returnDeltaY}px, 0)` }
                ], {
                    duration: 500,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    fill: 'forwards'
                });
            } else {
                stage.classList.remove('has-companion-open');
            }

            setTimeout(() => {
                stage.classList.remove('has-companion-open', 'is-companion-closing', 'is-showcase-active', 'is-trophies-active');
                if (topsCard) {
                    topsCard.classList.remove('is-closing');
                    topsCard.style.display = 'none';
                }
                if (trophiesCard) {
                    trophiesCard.classList.remove('is-closing');
                    trophiesCard.style.display = 'none';
                }
                if (closeAnim) closeAnim.cancel();
                if (cardContainer && isDesktop) cardContainer.style.transform = '';
                this._companionTransitioning = false;
            }, isDesktop ? 500 : 420);
        }
    }
};
// #endregion

// #region 2: DOKUNMATİK 3'LÜ DESTE KAYDIRMA MOTORU (TOUCH GESTURE ENGINE)
const TouchGestureManager = {
    startX: 0,
    startY: 0,
    startTime: 0,
    isTracking: false,
    threshold: 35, // Hızlı ve duyarlı yatay kaydırma eşiği (px)
    maxVerticalTolerance: 90, // Doğal başparmak kaydırması için esnek dikey tolerans (px)

    init() {
        const stage = document.getElementById('profileStage');
        if (!stage) return;

        // Dokunma başlangıcı
        stage.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        
        // Tarayıcının ekran kenarından geri/ileri gitme (edge swipe history) hareketini engellemek için touchmove
        stage.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });

        // Dokunma sonu (karar anı)
        stage.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        // Dokunma iptali (örn. sistem jesti)
        stage.addEventListener('touchcancel', () => { this.isTracking = false; }, { passive: true });
    },

    handleTouchStart(e) {
        // Masaüstü veya geçiş esnasında devre dışı
        if (window.innerWidth >= 900) return;
        if (Router._companionTransitioning) return;
        if (document.body.classList.contains('is-pointer-dragging')) return;

        // Modal açıkken swipe çalışmasın
        const activeModal = document.querySelector('.nook-modal.is-active, .auth-modal.is-active, .modal.is-open');
        if (activeModal) return;

        if (e.touches.length !== 1) {
            this.isTracking = false;
            return;
        }

        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.startTime = Date.now();
        this.isTracking = true;
    },

    handleTouchMove(e) {
        if (!this.isTracking || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - this.startX;
        const deltaY = touch.clientY - this.startY;

        // Eğer kullanıcı belirgin bir yatay kaydırma yapıyorsa, tarayıcının yerel 'Geri Git' geçmiş navigasyonunu engelle
        if (Math.abs(deltaX) > Math.abs(deltaY) * 0.8 && Math.abs(deltaX) > 8) {
            if (e.cancelable) {
                e.preventDefault();
            }
        }
    },

    handleTouchEnd(e) {
        if (!this.isTracking) return;
        this.isTracking = false;

        if (e.changedTouches.length !== 1) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.startX;
        const deltaY = touch.clientY - this.startY;
        const elapsed = Date.now() - this.startTime;

        // Çok uzun süren (örn. 850ms+) basılı tutmalar swipe sayılmaz
        if (elapsed > 850) return;

        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Yatay hareket eşiği ve doğal başparmak açısı kontrolü
        if (absX < this.threshold) return;
        if (absY > this.maxVerticalTolerance || absY > absX * 1.1) return;

        const stage = document.getElementById('profileStage');
        const isShowcaseOpen = stage && stage.classList.contains('is-showcase-active');
        const isTrophiesOpen = stage && stage.classList.contains('is-trophies-active');
        const isAnyOpen = stage && stage.classList.contains('has-companion-open');

        if (!isAnyOpen) {
            // [Profil Kartı Merkezde]:
            // Sola kaydırma (Swipe Left) -> Showcase'e (Sağ kanat) geç
            if (deltaX < -this.threshold) {
                Router.toggleCompanion(true, 'showcase');
            }
            // Sağa kaydırma (Swipe Right) -> Trophies'e (Sol kanat) geç
            else if (deltaX > this.threshold) {
                Router.toggleCompanion(true, 'trophies');
            }
        } else if (isShowcaseOpen) {
            // [Showcase Açık]:
            // Sağa kaydırma (Swipe Right) -> Profil Kartına geri dön
            if (deltaX > this.threshold) {
                Router.toggleCompanion(false);
            }
        } else if (isTrophiesOpen) {
            // [Trophies Açık]:
            // Sola kaydırma (Swipe Left) -> Profil Kartına geri dön
            if (deltaX < -this.threshold) {
                Router.toggleCompanion(false);
            }
        }
    }
};
// #endregion
