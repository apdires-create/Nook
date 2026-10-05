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

        const flipToBackBtn = document.getElementById('flipToBackBtn');
        const flipToFrontBtn = document.getElementById('flipToFrontBtn');
        const topsTriggerBtn = document.getElementById('topsTriggerBtn');
        const companionCloseBtn = document.getElementById('companionCloseBtn');

        // Flip butonları
        if (flipToBackBtn) {
            flipToBackBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setFlipped(true);
            });
        }

        if (flipToFrontBtn) {
            flipToFrontBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setFlipped(false);
            });
        }

        // Tops Companion Card (Showcase Wing) Tetikleyicileri
        if (topsTriggerBtn) {
            topsTriggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion();
            });
        }

        if (companionCloseBtn) {
            companionCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCompanion(false);
            });
        }

        // Tıklama Olay Delegasyonu (Menü butonları ve Geri butonları için)
        if (this.viewsWrapper) {
            this.viewsWrapper.addEventListener('click', (e) => {
                // Menü butonuna tıklandıysa
                const navBtn = e.target.closest('.nav-item-btn');
                if (navBtn) {
                    e.stopPropagation();
                    if (window._suruklemeBitti && Date.now() - window._suruklemeBitti < 250) return;
                    const target = navBtn.getAttribute('data-target');
                    if (target) this.openDetailView(target);
                    return;
                }

                // Geri butonuna tıklandıysa
                const backBtn = e.target.closest('.back-btn[data-action="back"]');
                if (backBtn) {
                    e.stopPropagation();
                    this.resetToMainMenu();
                    return;
                }

                // Ön yüze dön butonuna tıklandıysa (Kök menü geri butonu)
                const flipBtn = e.target.closest('[data-action="flip-to-front"]');
                if (flipBtn) {
                    e.stopPropagation();
                    this.setFlipped(false);
                    return;
                }
            });
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

                // 6. Animasyon yokken hiyerarşik gezinme:
                // A. ÖN YÜZ: Ön yüzdeyken boş alana tıklandığında arka yüze git
                if (!this.isFlipped) {
                    this.setFlipped(true);
                    return;
                }

                // B. ARKA YÜZ:
                // B.1. Eğer bir alt detay ekranındaysak (örn. linkler, profil vb.):
                // Boş alana tıklamak bizi hep bir adım geriye (arka yüz ana menüsüne) atsın
                if (this.activeDetailView) {
                    this.resetToMainMenu();
                    return;
                }

                // B.2. Eğer arka yüzün ana menüsündeysek:
                // Boş alana tıklamak bizi bir adım daha geriye (kartın ön yüzüne) atsın
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
                    // En son / en üstte açılan modalı bul ve kapat
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
                const companionCard = document.getElementById('topsCompanionCard');
                if (stage && stage.classList.contains('has-companion-open') && companionCard && !companionCard.classList.contains('is-closing')) {
                    this.toggleCompanion(false);
                } else if (this.activeDetailView) {
                    this.resetToMainMenu();
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
        const targetView = document.getElementById(`view-${targetId}`);
        if (!targetView || !this.viewMenu) return;

        this.viewMenu.classList.add('slide-left');
        this.viewMenu.classList.remove('active');

        targetView.classList.add('active');
        this.activeDetailView = targetView;
    },

    resetToMainMenu() {
        if (this.activeDetailView) {
            this.activeDetailView.classList.remove('active');
            this.activeDetailView = null;
        }
        if (this.viewMenu) {
            this.viewMenu.classList.remove('slide-left');
            this.viewMenu.classList.add('active');
        }
        if (typeof EditManager !== 'undefined' && typeof EditManager.temizleBosKategorileri === 'function') {
            EditManager.temizleBosKategorileri();
        }
    },

    toggleCompanion(forceState) {
        const stage = document.getElementById('profileStage');
        const companionCard = document.getElementById('topsCompanionCard');
        const cardContainer = this.cardContainer || document.getElementById('cardContainer');
        if (!stage || !companionCard) return;

        // Devam eden bir kapanış veya açılış geçişi varsa bekle
        if (this._companionTransitioning) return;

        const isCurrentlyOpen = stage.classList.contains('has-companion-open') && !companionCard.classList.contains('is-closing');
        const nextState = (typeof forceState === 'boolean') ? forceState : !isCurrentlyOpen;
        const isDesktop = window.innerWidth >= 900;

        if (nextState) {
            // ==========================================
            // AÇILIŞ SEKANSI (FLIP - First, Last, Invert, Play)
            // ==========================================
            this._companionTransitioning = true;

            let deltaX = 0;
            let deltaY = 0;

            if (isDesktop && cardContainer) {
                // FLIP 1: İlk pozisyonu ölç (kart tek başınayken ekranın merkezinde)
                const firstRect = cardContainer.getBoundingClientRect();

                // DOM durumunu güncelle (flex-row çift kart düzenine geç)
                companionCard.classList.remove('is-closing');
                companionCard.style.display = 'flex';
                stage.classList.add('has-companion-open');

                // FLIP 2: Yeni layout pozisyonunu ölç (kart sola kaymış konumda)
                const lastRect = cardContainer.getBoundingClientRect();

                // FLIP 3: İki konum arasındaki net koordinat farkını hesapla
                deltaX = (firstRect.left + firstRect.width / 2) - (lastRect.left + lastRect.width / 2);
                deltaY = (firstRect.top + firstRect.height / 2) - (lastRect.top + lastRect.height / 2);

                // FLIP 4: Kartı ilk konumundan yeni konumuna pürüzsüzce süzdür
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
                companionCard.classList.remove('is-closing');
                companionCard.style.display = 'flex';
                stage.classList.add('has-companion-open');
            }

            if (typeof RenderEngine !== 'undefined') {
                RenderEngine.companionCiz(kartVerisi.tops);
            }
            if (typeof EditManager !== 'undefined' && isOwner) {
                EditManager.CompanionViews?.init();
            }

            // Mobilde dikey akışta companion card'a tekte yağ gibi süzül
            if (!isDesktop) {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        companionCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 40);
                });
            }

            setTimeout(() => {
                this._companionTransitioning = false;
            }, 500);
        } else {
            // ==========================================
            // KAPANIŞ SEKANSI (Ters FLIP - Merkeze Süzülüş)
            // ==========================================
            this._companionTransitioning = true;
            companionCard.classList.add('is-closing');
            stage.classList.add('is-companion-closing');

            let closeAnim = null;

            if (isDesktop && cardContainer) {
                // Sahnenin merkezi ile kartın mevcut merkezi arasındaki tam mesafeyi hesapla
                const stageRect = stage.getBoundingClientRect();
                const cardRect = cardContainer.getBoundingClientRect();
                const returnDeltaX = (stageRect.left + stageRect.width / 2) - (cardRect.left + cardRect.width / 2);
                const returnDeltaY = (stageRect.top + stageRect.height / 2) - (cardRect.top + cardRect.height / 2);

                // Ana kartı bulunduğu yerden ekranın tam merkezine yumuşakça kaydır
                closeAnim = cardContainer.animate([
                    { transform: 'translate3d(0, 0, 0)' },
                    { transform: `translate3d(${returnDeltaX}px, ${returnDeltaY}px, 0)` }
                ], {
                    duration: 500,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    fill: 'forwards'
                });
            } else {
                // Mobilde kapatırken sayfa başına pürüzsüzce geri dön
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            // Animasyon ve scroll tamamlandıktan sonra DOM durumunu temizle
            setTimeout(() => {
                stage.classList.remove('has-companion-open');
                stage.classList.remove('is-companion-closing');
                companionCard.classList.remove('is-closing');
                companionCard.style.display = 'none';
                if (closeAnim) {
                    closeAnim.cancel();
                }
                if (cardContainer) {
                    cardContainer.style.transform = '';
                }
                this._companionTransitioning = false;
            }, 450);
        }
    }
};
// #endregion
