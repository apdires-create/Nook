// #region 1: EDITMANAGER DEVLETİ VE BAŞLATICI (STATE & INIT)
const EditManager = {
    state: {
        hasUnsavedChanges: false,
        orijinalVeri: null,
        cropperInstance: null,
        guncelHedefTur: null
    },

    init() {
        if (typeof isOwner === 'undefined' || !isOwner) return;

        // Kart verisindeki boş kategorileri sessizce temizle ki orijinalVeri ile birebir aynı tabandan başlansın
        this.temizleBosKategorileri(true);

        // Orijinal verinin yedeğini al (İptal edilebilmesi için)
        this.state.orijinalVeri = JSON.parse(JSON.stringify(kartVerisi));

        this.domElemanlariniOlustur();
        this.Global.init();
        this.Media.init();
        this.Vitrin.init();
        this.BackViews.init();
        this.SectionPicker.init();
        this.TagPicker.init();
        this.TopsModal.init();
        this.MediaSearchModal.init();
        this.CompanionViews.init();

        document.body.classList.add('global-edit-mode');
    },

    temizleBosKategorileri(sessiz = false) {
        if (!kartVerisi) return;
        let degisiklik = false;

        // 1. Links
        if (kartVerisi.links && (!Array.isArray(kartVerisi.links) || kartVerisi.links.length === 0)) {
            delete kartVerisi.links;
            degisiklik = true;
        }

        // 2. Widgets
        if (kartVerisi.widgets && (!Array.isArray(kartVerisi.widgets) || kartVerisi.widgets.length === 0)) {
            delete kartVerisi.widgets;
            degisiklik = true;
        }

        // 3. Working on
        if (kartVerisi.working_on && (!kartVerisi.working_on.metin || kartVerisi.working_on.metin.trim() === '')) {
            kartVerisi.working_on = {};
            degisiklik = true;
        }

        if (degisiklik) {
            if (typeof RenderEngine !== 'undefined') {
                RenderEngine.menuCiz(kartVerisi);
                RenderEngine.altEkranlariCiz(kartVerisi);
            }
            if (this.BackViews) this.BackViews.init();
            if (this.SectionPicker) this.SectionPicker.bagla();
            if (!sessiz && this.Global) this.Global.degisiklikYapildi();
        }
    },

    // #region EVRENSEL POINTER REORDER MOTORU (SORTABLE)
    initPointerSortable(container, options) {
        if (!container) return;
        if (container._pointerSortableCleanup) {
            container._pointerSortableCleanup();
        }

        const {
            itemSelector,
            axis = 'y',
            canDrag = null,
            onMove = null,
            onDrop = null,
            excludedDragSelectors = 'input, textarea, select, button, a, .item-delete-btn, .tag-remove-btn, .nook-action-btn, .nook-link-toggle, .nook-link-test-btn, .tops-add-btn, .top-add-form, .category-icon-badge, .add-section-nav-btn, .add-section-big-btn'
        } = options;

        let startX = 0;
        let startY = 0;
        let isDragging = false;
        let draggedItem = null;
        let dragClone = null;
        let dragPortal = null;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let portalLeft = 0;
        let portalTop = 0;
        let hasMoved = false;

        const onPointerDown = (e) => {
            if (e.button !== 0) return;
            if (e.target.closest(excludedDragSelectors)) return;

            const item = e.target.closest(itemSelector);
            if (!item || !container.contains(item)) return;

            if (typeof canDrag === 'function' && !canDrag(item, e.target)) return;

            startX = e.clientX;
            startY = e.clientY;
            isDragging = false;
            hasMoved = false;
            draggedItem = item;

            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
        };

        const onPointerMove = (e) => {
            if (!draggedItem) return;

            if (!isDragging) {
                const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
                if (dist > 4) {
                    isDragging = true;

                    // Container Query uyumluluğu için kart veya eşlikçi kart konteynerini baz alan portal oluştur
                    const scopeContainer = draggedItem.closest('.tops-companion-card') || draggedItem.closest('.card-container');
                    const cRect = scopeContainer ? scopeContainer.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
                    portalLeft = cRect.left;
                    portalTop = cRect.top;

                    dragPortal = document.createElement('div');
                    dragPortal.className = 'drag-clone-portal';
                    dragPortal.style.cssText = `
                        position: fixed;
                        left: ${cRect.left}px;
                        top: ${cRect.top}px;
                        width: ${cRect.width}px;
                        height: ${cRect.height}px;
                        container-type: size;
                        pointer-events: none;
                        z-index: 100000;
                        overflow: visible;
                    `;

                    const itemRect = draggedItem.getBoundingClientRect();
                    dragOffsetX = startX - itemRect.left;
                    dragOffsetY = startY - itemRect.top;

                    // Havada süzülen görsel klon oluştur
                    dragClone = draggedItem.cloneNode(true);
                    dragClone.classList.add('is-drag-clone');
                    dragClone.classList.remove('is-dragging', 'is-drag-placeholder');
                    dragClone.style.cssText = `
                        position: absolute;
                        left: ${e.clientX - dragOffsetX - portalLeft}px;
                        top: ${e.clientY - dragOffsetY - portalTop}px;
                        width: ${itemRect.width}px;
                        height: ${itemRect.height}px;
                        margin: 0;
                        box-sizing: border-box;
                    `;

                    dragPortal.appendChild(dragClone);
                    document.body.appendChild(dragPortal);

                    // Listedeki asıl öğeyi yer tutucu (placeholder) yap
                    draggedItem.classList.add('is-dragging', 'is-drag-placeholder');
                    draggedItem.style.pointerEvents = 'none';
                    document.body.classList.add('is-pointer-dragging');
                } else {
                    return;
                }
            }

            if (e.cancelable) e.preventDefault();

            // Havada süzülen klonun konumunu güncelle
            if (dragClone) {
                dragClone.style.left = (e.clientX - dragOffsetX - portalLeft) + 'px';
                dragClone.style.top = (e.clientY - dragOffsetY - portalTop) + 'px';
            }

            const hit = document.elementFromPoint(e.clientX, e.clientY);
            if (!hit) return;

            const targetItem = hit.closest(itemSelector);
            if (targetItem && targetItem !== draggedItem && container.contains(targetItem)) {
                if (targetItem.closest('.tag-add-pill, .tops-add-btn, .top-add-form, .add-section-nav-btn, .add-section-big-btn')) return;

                const box = targetItem.getBoundingClientRect();
                if (axis === 'x') {
                    const offset = e.clientX - box.left;
                    if (offset > box.width / 2) {
                        targetItem.after(draggedItem);
                    } else {
                        targetItem.before(draggedItem);
                    }
                } else if (axis === 'y') {
                    const offset = e.clientY - box.top;
                    if (offset > box.height / 2) {
                        targetItem.after(draggedItem);
                    } else {
                        targetItem.before(draggedItem);
                    }
                } else {
                    const midX = box.left + box.width / 2;
                    const midY = box.top + box.height / 2;
                    if (e.clientY > midY || (Math.abs(e.clientY - midY) < box.height / 3 && e.clientX > midX)) {
                        targetItem.after(draggedItem);
                    } else {
                        targetItem.before(draggedItem);
                    }
                }
                hasMoved = true;
                if (typeof onMove === 'function') onMove(draggedItem, targetItem);
            }
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);

            if (dragPortal) {
                dragPortal.remove();
                dragPortal = null;
                dragClone = null;
            }

            if (draggedItem) {
                draggedItem.style.pointerEvents = '';
                draggedItem.classList.remove('is-dragging', 'is-drag-placeholder');
            }
            document.body.classList.remove('is-pointer-dragging');

            if (isDragging) {
                window._suruklemeBitti = Date.now();
                if (hasMoved && typeof onDrop === 'function') {
                    onDrop();
                }
            }

            draggedItem = null;
            isDragging = false;
        };

        container.addEventListener('pointerdown', onPointerDown);

        container._pointerSortableCleanup = () => {
            container.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            if (dragPortal) {
                dragPortal.remove();
                dragPortal = null;
                dragClone = null;
            }
        };
    },
    // #endregion

    domElemanlariniOlustur() {
        // 1. Action Bar Enjeksiyonu
        if (!document.getElementById('edit-action-bar')) {
            const bar = document.createElement('div');
            bar.id = 'edit-action-bar';
            bar.className = 'edit-action-bar';
            bar.innerHTML = `
                <div class="edit-action-btns">
                    <button type="button" id="edit-cancel-btn" class="edit-bar-btn cancel-btn">Sıfırla</button>
                    <button type="button" id="edit-save-btn" class="edit-bar-btn save-btn">Kaydet</button>
                </div>
            `;
            document.body.appendChild(bar);
        }

        // 2. Cropper Modal Enjeksiyonu
        if (!document.getElementById('cropper-modal')) {
            const modal = document.createElement('div');
            modal.id = 'cropper-modal';
            modal.className = 'cropper-modal';
            modal.innerHTML = `
                <div class="cropper-backdrop" id="cropper-modal-backdrop"></div>
                <div class="cropper-box">
                    <div class="cropper-header">
                        <h3 class="cropper-title" id="cropper-title">Görseli Kırp</h3>
                        <button type="button" class="cropper-close-btn" id="cropper-modal-close">&times;</button>
                    </div>
                    <div class="cropper-image-wrapper">
                        <img id="cropper-image" src="" alt="Kırpılacak Görsel">
                    </div>
                    <div class="cropper-footer">
                        <button type="button" class="form-btn-sm form-btn-cancel" id="cropper-cancel-btn">Vazgeç</button>
                        <button type="button" class="form-btn-sm form-btn-submit" id="cropper-save-btn">Kırp ve Yükle</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // 3. Gizli Dosya Girişleri
        if (!document.getElementById('banner-file-input')) {
            const bannerInput = document.createElement('input');
            bannerInput.type = 'file';
            bannerInput.id = 'banner-file-input';
            bannerInput.accept = 'image/*';
            bannerInput.style.display = 'none';
            document.body.appendChild(bannerInput);
        }

        if (!document.getElementById('pfp-file-input')) {
            const pfpInput = document.createElement('input');
            pfpInput.type = 'file';
            pfpInput.id = 'pfp-file-input';
            pfpInput.accept = 'image/*';
            pfpInput.style.display = 'none';
            document.body.appendChild(pfpInput);
        }

        // 4. Toast Bildirim Kutusu
        if (!document.getElementById('nook-toast')) {
            const toast = document.createElement('div');
            toast.id = 'nook-toast';
            toast.className = 'nook-toast';
            document.body.appendChild(toast);
        }

        // 5. İçerik Ekleme Pop-up Modalı (Section Picker Modal)
        if (!document.getElementById('add-section-modal')) {
            const modal = document.createElement('div');
            modal.id = 'add-section-modal';
            modal.className = 'add-section-modal';
            modal.innerHTML = `
                <div class="add-section-backdrop" id="add-section-backdrop"></div>
                <div class="section-picker-panel">
                    <div class="section-picker-header">
                        <div>
                            <h3 class="section-picker-title">İçerik Ekle</h3>
                            <p class="section-picker-desc">Kartının arka yüzünde sergilemek istediğin bir içeriği seç.</p>
                        </div>
                        <button type="button" class="section-picker-close" id="add-section-close">&times;</button>
                    </div>
                    <div class="section-picker-list" id="sectionPickerList"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // 6. Etiket Seçici Modalı (Tag Picker Modal)
        if (!document.getElementById('tag-picker-modal')) {
            const tagModal = document.createElement('div');
            tagModal.id = 'tag-picker-modal';
            tagModal.className = 'tag-picker-modal';
            tagModal.innerHTML = `
                <div class="tag-picker-backdrop" id="tag-picker-backdrop"></div>
                <div class="tag-picker-panel">
                    <div class="tag-picker-header">
                        <div>
                            <h3 class="tag-picker-title">Etiket Seç</h3>
                            <p class="tag-picker-desc">Profiline eklemek istediğin etiketi havuzdan seç veya yenisini yaz.</p>
                        </div>
                        <button type="button" class="tag-picker-close" id="tag-picker-close">&times;</button>
                    </div>
                    <div class="tag-search-box">
                        <span class="tag-search-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </span>
                        <input type="text" id="tag-search-input" class="tag-search-input" placeholder="Etiket ara veya yeni etiket yaz..." maxlength="20" autocomplete="off">
                    </div>
                    <div class="tag-pool-wrap" id="tagPoolWrap"></div>
                </div>
            `;
            document.body.appendChild(tagModal);
        }

        // 7. Blok Silme Onay Modalı (Delete Block Modal)
        if (!document.getElementById('block-delete-modal')) {
            const blockModal = document.createElement('div');
            blockModal.id = 'block-delete-modal';
            blockModal.className = 'block-delete-modal';
            blockModal.innerHTML = `
                <div class="block-delete-backdrop" id="block-delete-backdrop"></div>
                <div class="block-delete-panel">
                    <div class="block-delete-icon-box">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </div>
                    <div class="block-delete-content">
                        <h3 class="block-delete-title" id="block-delete-title">Bloğu Sil</h3>
                        <p class="block-delete-desc" id="block-delete-desc">Bu bloğu ve içindeki tüm içerikleri kaldırmak istediğinizden emin misiniz?</p>
                    </div>
                    <div class="block-delete-actions">
                        <button type="button" class="block-delete-btn cancel" id="block-delete-cancel">İptal</button>
                        <button type="button" class="block-delete-btn confirm" id="block-delete-confirm">Bloğu Sil</button>
                    </div>
                </div>
            `;
            document.body.appendChild(blockModal);
        }

        // 8. Tops Kategori Ayarları Modalı (Tops Setup Modal)
        if (!document.getElementById('tops-setup-modal')) {
            const topsModal = document.createElement('div');
            topsModal.id = 'tops-setup-modal';
            topsModal.className = 'tops-setup-modal';
            topsModal.innerHTML = `
                <div class="tops-modal-backdrop" id="tops-setup-backdrop"></div>
                <div class="tops-modal-panel">
                    <div class="tops-modal-header">
                        <h3 class="tops-modal-title" id="tops-setup-title">Listeyi Düzenle</h3>
                        <button type="button" class="tops-modal-close" id="tops-setup-close">&times;</button>
                    </div>

                    <div class="tops-form-group">
                        <label class="tops-form-label" for="tops-name-input">Liste İsmi</label>
                        <input type="text" id="tops-name-input" class="tops-form-input" placeholder="Örn: Favori Filmlerim, En İyiler" maxlength="32">
                    </div>

                    <div class="tops-form-group">
                        <label class="tops-form-label" for="tops-link-url-input">Harici Bağlantı (URL)</label>
                        <input type="url" id="tops-link-url-input" class="tops-form-input" placeholder="https://letterboxd.com/kullanici, steam vb.">
                    </div>

                    <div class="tops-form-footer">
                        <button type="button" class="tops-modal-delete-btn" id="tops-delete-btn" title="Bu listeyi kaldır">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Listeyi Sil</span>
                        </button>
                        <div class="tops-form-footer-right">
                            <button type="button" class="form-btn-sm form-btn-cancel" id="tops-setup-cancel">İptal</button>
                            <button type="button" class="form-btn-sm form-btn-submit" id="tops-setup-save">Kaydet</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(topsModal);
        }

        // 9. İçerik Arama Modalı (Media Search Modal)
        if (!document.getElementById('tops-search-modal')) {
            const searchModal = document.createElement('div');
            searchModal.id = 'tops-search-modal';
            searchModal.className = 'tops-search-modal';
            searchModal.innerHTML = `
                <div class="tops-modal-backdrop" id="tops-search-backdrop"></div>
                <div class="tops-modal-panel">
                    <div class="tops-modal-header">
                        <div>
                            <h3 class="tops-modal-title" id="tops-search-title">İçerik Ara</h3>
                            <p class="tops-modal-desc" id="tops-search-desc">Eklemek istediğiniz yapımı aratın ve listeden seçin.</p>
                        </div>
                        <button type="button" class="tops-modal-close" id="tops-search-close">&times;</button>
                    </div>

                    <div class="tag-search-box">
                        <span class="tag-search-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </span>
                        <input type="text" id="tops-search-input" class="tag-search-input" placeholder="Film adı yazın..." autocomplete="off">
                    </div>

                    <div class="tops-search-results" id="tops-search-results">
                        <div class="tops-search-empty">Aramak için bir isim yazın...</div>
                    </div>
                </div>
            `;
            document.body.appendChild(searchModal);
        }
    }
};
// #endregion

// #region 2: KÜRESEL İŞLEM ÇUBUĞU VE VERİ KAYIT (GLOBAL ACTIONS & SUPABASE SAVE)
EditManager.Global = {
    init() {
        const cancelBtn = document.getElementById('edit-cancel-btn');
        const saveBtn = document.getElementById('edit-save-btn');

        if (cancelBtn) cancelBtn.addEventListener('click', () => this.sifirla());
        if (saveBtn) saveBtn.addEventListener('click', () => this.kaydet());

        window.addEventListener('beforeunload', (e) => {
            if (EditManager.state.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    },

    getTemizVeri(veri) {
        if (!veri) return null;
        const front = veri.front_data || {};
        const links = (Array.isArray(veri.links) && veri.links.length > 0) ? veri.links : null;
        let tops = null;
        if (veri.tops && Array.isArray(veri.tops.listeler) && veri.tops.listeler.length > 0) {
            const temizListeler = veri.tops.listeler.map((l, lIdx) => {
                const ogeler = Array.isArray(l.ogeler) ? l.ogeler : [];
                return {
                    id: l.id || ('list_' + (lIdx + 1)),
                    kategori: l.kategori || 'Favorilerim',
                    tur: l.tur || 'film',
                    harici_link: (l.harici_link && l.harici_link.url) ? {
                        baslik: l.harici_link.baslik || 'Harici Profil →',
                        url: l.harici_link.url
                    } : null,
                    ogeler: ogeler.slice(0, 3).map((item, idx) => ({
                        id: item.id || item.kimlik || ('top_' + (idx + 1)),
                        baslik: item.baslik || '',
                        aciklama: item.aciklama || '',
                        afis_url: item.afis_url || item.gorsel_url || null,
                        yil: item.yil || null,
                        skor: item.skor || null,
                        yonetmen: item.yonetmen || null,
                        yayinci: item.yayinci || null,
                        studyo: item.studyo || null,
                        seri: item.seri || null,
                        yazar: item.yazar || null
                    }))
                };
            });

            tops = {
                aktifListeId: veri.tops.aktifListeId || temizListeler[0]?.id || null,
                listeler: temizListeler
            };
        }
        const trophies = (Array.isArray(veri.trophies) && veri.trophies.length > 0) ? veri.trophies : null;
        const widgets = (Array.isArray(veri.widgets) && veri.widgets.length > 0) ? veri.widgets : null;
        let working_on = null;
        if (veri.working_on && veri.working_on.metin && veri.working_on.metin.trim() !== '') {
            working_on = { metin: veri.working_on.metin.trim() };
        }
        const theme_config = veri.theme_config || {};
        return {
            front_data: front,
            links,
            tops,
            trophies,
            widgets,
            working_on,
            theme_config
        };
    },

    degisiklikYapildi() {
        if (EditManager.state.orijinalVeri) {
            const guncelStr = JSON.stringify(this.getTemizVeri(kartVerisi));
            const orijStr = JSON.stringify(this.getTemizVeri(EditManager.state.orijinalVeri));
            EditManager.state.hasUnsavedChanges = (guncelStr !== orijStr);
        } else {
            EditManager.state.hasUnsavedChanges = false;
        }

        document.body.classList.toggle('has-unsaved-changes', EditManager.state.hasUnsavedChanges);
    },

    sifirla() {
        if (!EditManager.state.orijinalVeri) return;

        kartVerisi = JSON.parse(JSON.stringify(EditManager.state.orijinalVeri));
        EditManager.state.hasUnsavedChanges = false;
        document.body.classList.remove('has-unsaved-changes');

        if (typeof RenderEngine !== 'undefined') {
            RenderEngine.vitrinCiz(kartVerisi);
            RenderEngine.menuCiz(kartVerisi);
            RenderEngine.altEkranlariCiz(kartVerisi);
            RenderEngine.companionCiz(kartVerisi.tops);
        }

        EditManager.Vitrin.init();
        EditManager.BackViews.init();
        EditManager.CompanionViews?.init();
    },

    async kaydet() {
        if (!EditManager.state.hasUnsavedChanges || !supabaseClient) return;

        // Açık olan tüm link akordeonlarını kaydet ve kapat (küçült)
        if (typeof EditManager.BackViews?.kapatTumLinkAkordeonlari === 'function') {
            EditManager.BackViews.kapatTumLinkAkordeonlari();
        }

        const saveBtn = document.getElementById('edit-save-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Kaydediliyor...';
        }

        try {
            const guvenliObje = (v) => {
                if (!v) return {};
                if (typeof v === 'string') {
                    try {
                        const parsed = JSON.parse(v);
                        return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
                    } catch {
                        return {};
                    }
                }
                return (typeof v === 'object' && !Array.isArray(v)) ? v : {};
            };

            let workingOnPayload = {};
            if (kartVerisi.working_on && typeof kartVerisi.working_on === 'object' && !Array.isArray(kartVerisi.working_on)) {
                if (kartVerisi.working_on.metin && kartVerisi.working_on.metin.trim() !== '') {
                    workingOnPayload = { metin: kartVerisi.working_on.metin.trim() };
                }
            }

            const { data: guncellenen, error } = await supabaseClient
                .from('profiles')
                .update({
                    front_data: guvenliObje(kartVerisi.front_data),
                    links: Array.isArray(kartVerisi.links) ? kartVerisi.links : [],
                    tops: guvenliObje(kartVerisi.tops),
                    trophies: Array.isArray(kartVerisi.trophies) ? kartVerisi.trophies : [],
                    widgets: Array.isArray(kartVerisi.widgets) ? kartVerisi.widgets : [],
                    working_on: workingOnPayload,
                    theme_config: guvenliObje(kartVerisi.theme_config)
                })
                .eq('auth_id', kartVerisi.auth_id)
                .select('id');

            if (error) {
                throw error;
            }

            if (!guncellenen || guncellenen.length === 0) {
                throw new Error('Profil güncellenmedi: eşleşen kayıt bulunamadı.');
            }

            EditManager.state.orijinalVeri = JSON.parse(JSON.stringify(kartVerisi));
            EditManager.state.hasUnsavedChanges = false;
            document.body.classList.remove('has-unsaved-changes');

            if (typeof yerelOnbellekKaydet === 'function') {
                yerelOnbellekKaydet(kartVerisi);
            }
            if (typeof tumGorselleriPreloadEt === 'function') {
                tumGorselleriPreloadEt(kartVerisi);
            }

            this.toastGoster("Değişiklikler başarıyla kaydedildi!");
        } catch (err) {
            console.error("Kaydetme hatası:", err);
            const errStr = (err.message || '').toLowerCase();
            if (errStr.includes('jwt') || errStr.includes('expired') || errStr.includes('unauthorized') || err.status === 401 || err.statusCode === 401) {
                if (typeof oturumSuresiDolduUyarisi === 'function') {
                    oturumSuresiDolduUyarisi("Oturum süreniz dolduğu için değişiklikler kaydedilemedi. Lütfen tekrar giriş yapın; formdaki değişiklikleriniz korunuyor.");
                } else {
                    alert("Oturum süreniz doldu. Lütfen sayfayı yenilemeden tekrar giriş yapın.");
                }
            } else {
                alert("Kaydedilirken bir hata oluştu: " + err.message);
            }
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Kaydet';
            }
        }
    },

    toastGoster(mesaj) {
        const toast = document.getElementById('nook-toast');
        if (!toast) return;

        toast.textContent = mesaj;
        toast.classList.add('is-visible');
        setTimeout(() => toast.classList.remove('is-visible'), 3000);
    }
};
// #endregion

// #region 3: MEDYA YÖNETİMİ VE GÖRSEL KIRPMA (AVATAR & BANNER CROPPER)
EditManager.Media = {
    init() {
        this.overlayleriYerlestir();

        const bannerInput = document.getElementById('banner-file-input');
        const pfpInput = document.getElementById('pfp-file-input');
        const modalCloseBtn = document.getElementById('cropper-modal-close');
        const modalCancelBtn = document.getElementById('cropper-cancel-btn');
        const modalSaveBtn = document.getElementById('cropper-save-btn');
        const backdrop = document.getElementById('cropper-modal-backdrop');

        const modaliKapat = () => {
            const modal = document.getElementById('cropper-modal');
            if (modal) modal.classList.remove('is-open');
            if (EditManager.state.cropperInstance) {
                EditManager.state.cropperInstance.destroy();
                EditManager.state.cropperInstance = null;
            }
            if (bannerInput) bannerInput.value = '';
            if (pfpInput) pfpInput.value = '';
        };

        if (modalCloseBtn) modalCloseBtn.addEventListener('click', modaliKapat);
        if (modalCancelBtn) modalCancelBtn.addEventListener('click', modaliKapat);
        if (backdrop) backdrop.addEventListener('click', modaliKapat);

        if (bannerInput) {
            bannerInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.cropModaliniAc(file, 'banner');
            });
        }

        if (pfpInput) {
            pfpInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.cropModaliniAc(file, 'pfp');
            });
        }

        if (modalSaveBtn) {
            modalSaveBtn.addEventListener('click', () => {
                if (!EditManager.state.cropperInstance) return;

                modalSaveBtn.disabled = true;
                modalSaveBtn.textContent = 'Yükleniyor...';

                const isPfp = (EditManager.state.guncelHedefTur === 'pfp');
                const canvas = EditManager.state.cropperInstance.getCroppedCanvas({
                    width: isPfp ? 400 : 1200,
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high'
                });

                canvas.toBlob(async (blob) => {
                    await this.yukleVeGuncelle(blob, EditManager.state.guncelHedefTur);
                    modaliKapat();
                    modalSaveBtn.disabled = false;
                    modalSaveBtn.textContent = 'Kırp ve Yükle';
                }, 'image/webp', 0.85);
            });
        }
    },

    overlayleriYerlestir() {
        const bannerBox = document.querySelector('.banner-box');
        const avatarBox = document.querySelector('.avatar-box');

        const cameraIconSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
            </svg>
        `;

        if (bannerBox && !bannerBox.querySelector('.image-edit-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'image-edit-overlay';
            overlay.innerHTML = `${cameraIconSvg}<span>Bannerı Değiştir</span>`;
            overlay.addEventListener('click', () => {
                const input = document.getElementById('banner-file-input');
                if (input) input.click();
            });
            bannerBox.appendChild(overlay);
        }

        if (avatarBox && !avatarBox.querySelector('.image-edit-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'image-edit-overlay';
            overlay.innerHTML = `${cameraIconSvg}`;
            overlay.addEventListener('click', () => {
                const input = document.getElementById('pfp-file-input');
                if (input) input.click();
            });
            avatarBox.appendChild(overlay);
        }
    },

    cropModaliniAc(file, tur) {
        if (file.size > 3 * 1024 * 1024) {
            alert("Görsel çok büyük! Lütfen 3 MB'tan küçük bir görsel seçin.");
            return;
        }

        EditManager.state.guncelHedefTur = tur;
        const reader = new FileReader();

        reader.onload = (e) => {
            const modal = document.getElementById('cropper-modal');
            const image = document.getElementById('cropper-image');
            const title = document.getElementById('cropper-title');

            if (!modal || !image) return;

            image.src = e.target.result;
            if (title) title.textContent = (tur === 'pfp' ? 'Profil Fotoğrafını Kırp' : 'Bannerı Kırp');

            modal.classList.add('is-open');

            if (EditManager.state.cropperInstance) {
                EditManager.state.cropperInstance.destroy();
            }

            const oran = (tur === 'pfp' ? 1 : 2.5);

            if (typeof Cropper !== 'undefined') {
                EditManager.state.cropperInstance = new Cropper(image, {
                    aspectRatio: oran,
                    viewMode: 2,
                    background: false,
                    autoCropArea: 1
                });
            }
        };

        reader.readAsDataURL(file);
    },

    async yukleVeGuncelle(blob, tur) {
        if (!supabaseClient || !kartVerisi.auth_id) return;

        const dosyaYolu = `${kartVerisi.auth_id}/${tur}.webp`;

        try {
            const { error: uploadErr } = await supabaseClient.storage
                .from('avatars-and-banners')
                .upload(dosyaYolu, blob, { contentType: 'image/webp', upsert: true });

            if (uploadErr) {
                alert("Görsel yüklenemedi, lütfen tekrar deneyin.");
                return;
            }

            const { data: publicUrlData } = supabaseClient.storage
                .from('avatars-and-banners')
                .getPublicUrl(dosyaYolu);

            const publicUrl = publicUrlData.publicUrl;
            const yeniUrl = `${publicUrl}?v=${Date.now()}`;

            if (!kartVerisi.front_data) kartVerisi.front_data = {};

            if (tur === 'pfp') {
                kartVerisi.front_data.pfp_url = yeniUrl;
                const avatarImg = document.getElementById('avatarImg');
                if (avatarImg) avatarImg.src = yeniUrl;
            } else {
                kartVerisi.front_data.banner_url = yeniUrl;
                const bannerImg = document.getElementById('bannerImg');
                if (bannerImg) bannerImg.src = yeniUrl;
            }

            EditManager.state.hasUnsavedChanges = true;
            document.body.classList.add('has-unsaved-changes');
            EditManager.Global.toastGoster("Görsel hazırlandı. Kaydetmek için 'Kaydet' butonuna basın.");
        } catch (err) {
            console.error("Görsel yükleme hatası:", err);
            const errStr = (err.message || '').toLowerCase();
            if (errStr.includes('jwt') || errStr.includes('expired') || errStr.includes('unauthorized') || err.status === 401 || err.statusCode === 401) {
                if (typeof oturumSuresiDolduUyarisi === 'function') {
                    oturumSuresiDolduUyarisi("Oturum süreniz dolduğu için görsel yüklenemedi. Lütfen tekrar giriş yapın.");
                } else {
                    alert("Oturum süreniz doldu. Lütfen tekrar giriş yapın.");
                }
            } else {
                alert("Görsel yüklenemedi: " + err.message);
            }
        }
    }
};
// #endregion

// #region 4: ÖN YÜZ İNLINE METİN VE TAG DÜZENLEME (VITRIN EDIT)
EditManager.Vitrin = {
    init() {
        this.metinDuzenlemeKur('profileName', 'gorunen_isim', 30, false);
        this.metinDuzenlemeKur('profileTitle', 'unvan', 50, false);
        this.metinDuzenlemeKur('profileBio', 'aciklama', 160, true);
        this.tagYonetimiKur();
    },

    metinDuzenlemeKur(elementId, fieldName, maxLen, isTextarea = false) {
        const el = document.getElementById(elementId);
        if (!el) return;

        el.classList.add('editable-hover');
        el.title = "Düzenlemek için tıkla";

        if (el._duzenlemeBagli) return;
        el._duzenlemeBagli = true;

        el.addEventListener('click', (e) => {
            if (el.querySelector('input, textarea') || e.target.closest('a') || e.target.closest('button')) return;
            e.stopPropagation();

            const front = kartVerisi.front_data || {};
            const guncelDeger = (fieldName === 'gorunen_isim')
                ? (front.gorunen_isim || kartVerisi.kullanici_adi || '')
                : (front[fieldName] || '');

            const mevcutYukseklik = el.offsetHeight;
            el.classList.add('is-input-active');
            window._frontEditingActive = true;

            let inputHtml = '';
            if (isTextarea) {
                inputHtml = `
                    <div class="edit-inline-textarea-wrap">
                        <textarea class="edit-input-rect auto-expand-textarea" maxlength="${maxLen}" placeholder="Kendinden bahset...">${EditManager.escapeHtml(guncelDeger)}</textarea>
                        <span class="bio-counter">${guncelDeger.length}/${maxLen}</span>
                    </div>
                `;
            } else {
                const placeholder = (fieldName === 'gorunen_isim') ? 'İsim gir...' : 'Ünvan ekle...';
                const charWidth = guncelDeger.length === 0 
                    ? Math.max(placeholder.length, 4) 
                    : Math.max(guncelDeger.length + 1, 2);
                inputHtml = `<input type="text" class="edit-input-rect edit-name-input" maxlength="${maxLen}" value="${EditManager.escapeHtml(guncelDeger)}" placeholder="${placeholder}" style="width: ${charWidth}ch;">`;
            }

            el.innerHTML = inputHtml;
            const inputEl = el.querySelector('input, textarea');
            if (!inputEl) return;

            if (isTextarea) {
                if (mevcutYukseklik > 0) {
                    inputEl.style.height = `${mevcutYukseklik}px`;
                }
                inputEl.addEventListener('input', function() {
                    const counter = el.querySelector('.bio-counter');
                    if (counter) counter.textContent = `${this.value.length}/${maxLen}`;
                });
            } else {
                const placeholder = (fieldName === 'gorunen_isim') ? 'İsim gir...' : 'Ünvan ekle...';
                inputEl.addEventListener('input', function() {
                    const len = this.value.length;
                    const w = len === 0 ? Math.max(placeholder.length, 4) : Math.max(len + 1, 2);
                    this.style.width = `${w}ch`;
                });
            }

            inputEl.focus();
            if (inputEl.setSelectionRange) {
                inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
            }

            const kaydetVeKapat = () => {
                const yeniDeger = inputEl.value.trim();
                const eskiDeger = guncelDeger.trim();

                window._frontEditingActive = false;
                window._frontEditJustClosed = Date.now();

                if (!kartVerisi.front_data) kartVerisi.front_data = {};

                if (fieldName === 'gorunen_isim') {
                    kartVerisi.front_data.gorunen_isim = yeniDeger;
                } else {
                    kartVerisi.front_data[fieldName] = yeniDeger;
                }

                el.classList.remove('is-input-active');

                if (typeof RenderEngine !== 'undefined') {
                    RenderEngine.vitrinCiz(kartVerisi);
                }

                if (yeniDeger !== eskiDeger) {
                    EditManager.Global.degisiklikYapildi();
                }
            };

            inputEl.addEventListener('blur', kaydetVeKapat);
            inputEl.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter' && !isTextarea) {
                    evt.preventDefault();
                    kaydetVeKapat();
                } else if (evt.key === 'Escape') {
                    evt.preventDefault();
                    window._frontEditingActive = false;
                    window._frontEditJustClosed = Date.now();
                    el.classList.remove('is-input-active');
                    if (typeof RenderEngine !== 'undefined') {
                        RenderEngine.vitrinCiz(kartVerisi);
                    }
                }
            });
        });
    },

    tagYonetimiKur() {
        const tagsGrid = document.getElementById('tagsGrid');
        if (!tagsGrid) return;

        // Tag silme butonlarını bağla
        tagsGrid.querySelectorAll('.tag-pill:not(.tag-add-pill)').forEach((pill, idx) => {
            if (!pill.querySelector('.tag-remove-btn')) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'tag-remove-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Etiketi Sil';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tags = Array.isArray(kartVerisi.front_data?.tags) ? kartVerisi.front_data.tags : [];
                    tags.splice(idx, 1);
                    kartVerisi.front_data.tags = tags;
                    RenderEngine.vitrinCiz(kartVerisi);
                    EditManager.Vitrin.init();
                    EditManager.Global.degisiklikYapildi();
                });
                pill.appendChild(removeBtn);
            }
        });

        // 6'dan az tag varsa "+ Tag Ekle" hapı ekle
        const tags = Array.isArray(kartVerisi.front_data?.tags) ? kartVerisi.front_data.tags : [];
        if (tags.length < 6 && !tagsGrid.querySelector('.tag-add-pill')) {
            const addPill = document.createElement('button');
            addPill.className = 'tag-add-pill';
            addPill.textContent = '+ Tag Ekle';
            addPill.addEventListener('click', () => {
                if (EditManager.TagPicker) {
                    EditManager.TagPicker.ac();
                }
            });
            tagsGrid.appendChild(addPill);
        }

        // Sürükle-Bırak Sistemi (Pointer Reorder: Hover, Grab, Drop)
        EditManager.initPointerSortable(tagsGrid, {
            itemSelector: '.tag-pill:not(.tag-add-pill)',
            axis: 'x',
            excludedDragSelectors: '.tag-remove-btn, .tag-add-pill, input, button',
            onDrop: () => {
                const yeniTagler = [...tagsGrid.querySelectorAll('.tag-pill:not(.tag-add-pill)')]
                    .map(p => {
                        const clone = p.cloneNode(true);
                        const rm = clone.querySelector('.tag-remove-btn');
                        if (rm) rm.remove();
                        return clone.textContent.trim();
                    })
                    .filter(Boolean);

                const eskiTagler = Array.isArray(kartVerisi.front_data?.tags) ? kartVerisi.front_data.tags : [];
                if (JSON.stringify(yeniTagler) !== JSON.stringify(eskiTagler)) {
                    if (!kartVerisi.front_data) kartVerisi.front_data = {};
                    kartVerisi.front_data.tags = yeniTagler;
                    EditManager.Global.degisiklikYapildi();
                    RenderEngine.vitrinCiz(kartVerisi);
                    EditManager.Vitrin.init();
                }
            }
        });
    }
};
// #endregion

// #region 5: ARKA YÜZ PANEL DÜZENLEMELERİ (BACK VIEWS EDIT)
EditManager.BackViews = {
    init() {
        this.menuSurukleBirakKur();
        this.blokSilmeDinleyicileriniBagla();
        this.linksDuzenlemeKur();
        this.workingOnDuzenlemeKur();
        this.widgetsDuzenlemeKur();
    },

    menuSurukleBirakKur() {
        const menuNav = document.getElementById('menuNav');
        if (!menuNav) return;

        EditManager.initPointerSortable(menuNav, {
            itemSelector: '.nav-item-btn',
            axis: 'y',
            onMove: () => {
                const addSectionBtn = menuNav.querySelector('.add-section-nav-btn');
                if (addSectionBtn) menuNav.appendChild(addSectionBtn);
            },
            onDrop: () => {
                const addSectionBtn = menuNav.querySelector('.add-section-nav-btn');
                if (addSectionBtn) menuNav.appendChild(addSectionBtn);

                const yeniSira = [...menuNav.querySelectorAll('.nav-item-btn')].map(b => b.dataset.target).filter(Boolean);
                if (!kartVerisi.theme_config) kartVerisi.theme_config = {};
                const eskiSira = kartVerisi.theme_config.menu_order || [];

                if (JSON.stringify(yeniSira) !== JSON.stringify(eskiSira)) {
                    kartVerisi.theme_config.menu_order = yeniSira;
                    EditManager.Global.degisiklikYapildi();
                    RenderEngine.menuCiz(kartVerisi);
                    EditManager.BackViews.init();
                }
            }
        });
    },

    blokSilmeModaliniKur() {
        const modal = document.getElementById('block-delete-modal');
        if (!modal || modal._bound) return;
        modal._bound = true;

        const backdrop = document.getElementById('block-delete-backdrop');
        const cancelBtn = document.getElementById('block-delete-cancel');
        const confirmBtn = document.getElementById('block-delete-confirm');

        const kapat = () => {
            modal.classList.remove('is-open');
            modal._targetCat = null;
        };

        if (backdrop) backdrop.onclick = kapat;
        if (cancelBtn) cancelBtn.onclick = kapat;

        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const catId = modal._targetCat;
                kapat();
                if (!catId) return;

                if (catId === 'links') {
                    delete kartVerisi.links;
                } else if (catId === 'widgets') {
                    delete kartVerisi.widgets;
                } else if (catId === 'working-on') {
                    kartVerisi.working_on = {};
                    delete kartVerisi.working_on;
                } else if (catId === 'trophies') {
                    delete kartVerisi.trophies;
                }

                if (kartVerisi.theme_config && Array.isArray(kartVerisi.theme_config.menu_order)) {
                    kartVerisi.theme_config.menu_order = kartVerisi.theme_config.menu_order.filter(id => id !== catId);
                }

                EditManager.Global.degisiklikYapildi();

                if (typeof Router !== 'undefined' && Router.activeDetailView) {
                    Router.resetToMainMenu();
                }

                RenderEngine.menuCiz(kartVerisi);
                RenderEngine.altEkranlariCiz(kartVerisi);
                EditManager.BackViews.init();
                if (EditManager.SectionPicker) EditManager.SectionPicker.bagla();
            };
        }
    },

    blokSilmeDinleyicileriniBagla() {
        this.blokSilmeModaliniKur();

        const modal = document.getElementById('block-delete-modal');
        const titleEl = document.getElementById('block-delete-title');
        const descEl = document.getElementById('block-delete-desc');

        document.querySelectorAll('.delete-section-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();

                const catId = btn.dataset.sectionId;
                const catTitle = btn.dataset.sectionTitle || catId;
                if (!catId || !modal) return;

                modal._targetCat = catId;
                if (titleEl) titleEl.textContent = `${catTitle} Bloğunu Sil`;
                if (descEl) descEl.textContent = `"${catTitle}" bloğunu ve içindeki tüm içerikleri kalıcı olarak silmek istediğinizden emin misiniz?`;
                modal.classList.add('is-open');
            };
        });
    },

    // --- Links ---
    urlGecerliMi(string) {
        if (!string) return false;
        const res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
        return (res !== null);
    },

    kapatTumLinkAkordeonlari() {
        const wrapper = document.getElementById('links-wrapper');
        if (!wrapper) return;

        const KALEM_IKONU = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;

        wrapper.querySelectorAll('.nook-link-row.is-expanded').forEach(openRow => {
            const idx = parseInt(openRow.dataset.index, 10);
            const linkData = (typeof kartVerisi !== 'undefined' && Array.isArray(kartVerisi.links)) ? kartVerisi.links[idx] : null;
            const urlInput = openRow.querySelector('.edit-url-input');

            // Eğer geçersiz URL varsa açık bırak
            if (urlInput && urlInput.value.trim() && !this.urlGecerliMi(urlInput.value.trim())) {
                urlInput.style.borderColor = "#ef4444";
                const errorEl = openRow.querySelector('.inline-url-error');
                if (errorEl) errorEl.style.display = "block";
                return;
            }

            // Eğer hem isim hem url boş ise sessizce temizle
            if (linkData && !(linkData.baslik || linkData.isim || '').trim() && !(linkData.url || '').trim()) {
                openRow.classList.add('is-deleting');
                setTimeout(() => {
                    if (Array.isArray(kartVerisi.links)) {
                        kartVerisi.links.splice(idx, 1);
                        EditManager.Global.degisiklikYapildi();
                        EditManager.BackViews.linksDuzenlemeKur();
                    }
                }, 200);
                return;
            }

            const collapseEl = openRow.querySelector('.nook-link-collapse');
            if (collapseEl) {
                collapseEl.style.height = collapseEl.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => { collapseEl.style.height = '0px'; });
                });
            }
            openRow.classList.remove('is-expanded');
            const toggleBtn = openRow.querySelector('.nook-link-toggle') || openRow.querySelector('.nook-edit-btn');
            if (toggleBtn) {
                toggleBtn.innerHTML = KALEM_IKONU;
                toggleBtn.title = 'Düzenle';
                toggleBtn.classList.remove('is-delete-mode', 'is-active');
            }

            const nameInput = openRow.querySelector('.edit-isim-input');
            const nameDisplay = openRow.querySelector('.nook-link-name');
            if (nameDisplay && nameInput) {
                nameDisplay.textContent = nameInput.value.trim() || 'Yeni bağlantı';
            }
            const domainDisplay = openRow.querySelector('.nook-link-domain');
            const testBtn = openRow.querySelector('.nook-link-test-btn');
            if (urlInput) {
                let d = 'Bağlantı';
                let p = urlInput.value.trim();
                try {
                    if (p && !p.startsWith('http')) p = 'https://' + p;
                    if (p) d = new URL(p).hostname.replace(/^www\./, '');
                } catch(err) {}
                if (domainDisplay) domainDisplay.textContent = d;
                if (testBtn && p) testBtn.href = RenderEngine.safeUrl(p);
            }
        });
    },

    linksDuzenlemeKur() {
        const panel = document.getElementById('view-links');
        if (!panel) return;

        const scrollWrap = panel.querySelector('.scrollable-fade');
        if (!scrollWrap) return;

        // Sahip modunda boş bildirim metnini kaldır
        const placeholder = scrollWrap.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();

        let wrapper = scrollWrap.querySelector('#links-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'links-wrapper';
            wrapper.className = 'links-wrapper';
            scrollWrap.prepend(wrapper);
        }

        const KALEM_IKONU = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
        const COP_IKONU = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

        const renderLinks = () => {
            wrapper.innerHTML = '';
            if (!Array.isArray(kartVerisi.links)) kartVerisi.links = [];

            const closeAccordion = (rowEl, collapseEl, urlInput) => {
                const currentUrl = urlInput.value.trim();
                const errorEl = rowEl.querySelector('.inline-url-error');

                if (currentUrl && !this.urlGecerliMi(currentUrl)) {
                    urlInput.style.borderColor = "#ef4444";
                    if (errorEl) errorEl.style.display = "block";
                    return false;
                }

                if (!rowEl.classList.contains('is-expanded')) return true;

                collapseEl.style.height = collapseEl.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => { collapseEl.style.height = '0px'; });
                });

                rowEl.classList.remove('is-expanded');

                const toggleBtn = rowEl.querySelector('.nook-link-toggle');
                if (toggleBtn) {
                    toggleBtn.innerHTML = KALEM_IKONU;
                    toggleBtn.title = 'Düzenle';
                    toggleBtn.classList.remove('is-delete-mode');
                }

                const nameInput = rowEl.querySelector('.edit-isim-input');
                const nameDisplay = rowEl.querySelector('.nook-link-name');
                if (nameDisplay && nameInput) {
                    nameDisplay.textContent = nameInput.value.trim() || 'Yeni bağlantı';
                }

                const domainDisplay = rowEl.querySelector('.nook-link-domain');
                const testBtn = rowEl.querySelector('.nook-link-test-btn');
                if (currentUrl) {
                    let d = 'Bağlantı';
                    let p = currentUrl;
                    try {
                        if (p && !p.startsWith('http')) p = 'https://' + p;
                        if (p) d = new URL(p).hostname.replace(/^www\./, '');
                    } catch(e) {}
                    if (domainDisplay) domainDisplay.textContent = d;
                    if (testBtn && p) testBtn.href = RenderEngine.safeUrl(p);
                    const anchor = rowEl.querySelector('.nook-link-anchor');
                    if (anchor && p) anchor.href = RenderEngine.safeUrl(p);
                }

                return true;
            };

            const openAccordion = (rowEl, collapseEl) => {
                if (rowEl.classList.contains('is-expanded')) return;

                let canOpen = true;
                wrapper.querySelectorAll('.nook-link-row.is-expanded').forEach(openRow => {
                    const otherUrlInput = openRow.querySelector('.edit-url-input');
                    const isClosed = closeAccordion(openRow, openRow.querySelector('.nook-link-collapse'), otherUrlInput);
                    if (!isClosed) canOpen = false;
                });

                if (!canOpen) return;

                rowEl.classList.add('is-expanded');

                const toggleBtn = rowEl.querySelector('.nook-link-toggle');
                if (toggleBtn) {
                    toggleBtn.innerHTML = COP_IKONU;
                    toggleBtn.title = 'Sil';
                    toggleBtn.classList.add('is-delete-mode');
                }

                collapseEl.style.height = collapseEl.scrollHeight + 'px';
                setTimeout(() => {
                    if (rowEl.classList.contains('is-expanded')) collapseEl.style.height = 'auto';
                }, 220);
            };

            const deleteRowWithAnim = (rowEl, index) => {
                rowEl.classList.add('is-deleting');
                const saveBtn = document.getElementById('edit-save-btn');
                if (saveBtn) saveBtn.classList.remove('is-locked');

                setTimeout(() => {
                    kartVerisi.links.splice(index, 1);
                    EditManager.Global.degisiklikYapildi();
                    renderLinks();
                }, 250);
            };

            kartVerisi.links.forEach((link, index) => {
                let domain = 'Bağlantı';
                try {
                    let pUrl = link.url;
                    if (pUrl && !pUrl.startsWith('http')) pUrl = 'https://' + pUrl;
                    if (pUrl) domain = new URL(pUrl).hostname.replace(/^www\./, '');
                } catch(e) {}

                const row = document.createElement('div');
                row.className = 'nook-link-row';
                row.dataset.index = index;

                const baslik = link.baslik || link.isim || '';

                row.innerHTML = `
                    <div class="nook-link-actions" draggable="false">
                        <button type="button" class="nook-action-btn nook-link-toggle" title="Düzenle" draggable="false">
                            ${KALEM_IKONU}
                        </button>
                    </div>
                    <div class="nook-link-main">
                        <a href="${RenderEngine.safeUrl(link.url)}" target="_blank" rel="noopener noreferrer" class="nook-link-anchor" draggable="false">
                            <div class="nook-link-icon">${RenderEngine.getLinkIcon(link.url)}</div>
                            <div class="nook-link-texts">
                                <span class="nook-link-name">${RenderEngine.escapeHtml(baslik) || 'Yeni bağlantı'}</span>
                                <span class="nook-link-domain">${RenderEngine.escapeHtml(domain)}</span>
                            </div>
                        </a>
                        <div class="nook-link-edit-fields">
                            <div class="nook-link-icon">${RenderEngine.getLinkIcon(link.url)}</div>
                            <input type="text" class="nook-link-input edit-isim-input" placeholder="Görünen İsim (Örn: GitHub)" value="${RenderEngine.escapeHtml(baslik)}" autocomplete="off" spellcheck="false" draggable="false">
                        </div>
                    </div>
                    <div class="nook-link-collapse" style="height: 0px;">
                        <div class="nook-link-form">
                            <div class="nook-url-input-wrap">
                                <input type="url" class="nook-link-input edit-url-input" placeholder="https://..." value="${RenderEngine.escapeHtml(link.url || '')}" autocomplete="off" spellcheck="false" draggable="false">
                                <a href="${RenderEngine.safeUrl(link.url)}" target="_blank" rel="noopener noreferrer" class="nook-action-btn nook-link-test-btn" title="Bağlantıyı Aç" draggable="false">
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </a>
                            </div>
                            <span class="inline-url-error" style="display: none; color: #ef4444; font-size: var(--cq-fs-mono); margin-top: 0.5cqw;">Lütfen geçerli bir internet adresi girin.</span>
                        </div>
                    </div>
                `;

                const toggleBtn = row.querySelector('.nook-link-toggle');
                const collapseEl = row.querySelector('.nook-link-collapse');
                const nameInput = row.querySelector('.edit-isim-input');
                const urlInput = row.querySelector('.edit-url-input');
                const testBtn = row.querySelector('.nook-link-test-btn');
                const errorEl = row.querySelector('.inline-url-error');
                const anchor = row.querySelector('.nook-link-anchor');

                // Tıklanabilir iç kontrollerin mousedown ve dragstart olayını durdur ki kart sürüklenmeye başlamasın
                [toggleBtn, testBtn, nameInput, urlInput, anchor].forEach(el => {
                    if (!el) return;
                    el.addEventListener('mousedown', (e) => e.stopPropagation());
                    el.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
                });

                const autoSave = () => {
                    let val = urlInput.value.trim();
                    const saveBtn = document.getElementById('edit-save-btn');

                    if (val && !this.urlGecerliMi(val)) {
                        urlInput.style.borderColor = "#ef4444";
                        if (errorEl) errorEl.style.display = "block";
                        if (saveBtn) saveBtn.classList.add('is-locked');
                        return;
                    }

                    urlInput.style.borderColor = "";
                    if (errorEl) errorEl.style.display = "none";
                    if (saveBtn) {
                        const anyError = wrapper.querySelector('.inline-url-error[style*="display: block"]');
                        if (!anyError) saveBtn.classList.remove('is-locked');
                    }

                    if (val && !val.startsWith('http://') && !val.startsWith('https://')) val = 'https://' + val;

                    kartVerisi.links[index] = {
                        baslik: nameInput.value.trim(),
                        isim: nameInput.value.trim(),
                        url: val
                    };
                    const anchorEl = row.querySelector('.nook-link-anchor');
                    if (anchorEl && val) anchorEl.href = RenderEngine.safeUrl(val);
                    const nameDisplay = row.querySelector('.nook-link-name');
                    if (nameDisplay) nameDisplay.textContent = nameInput.value.trim() || 'Yeni bağlantı';
                    EditManager.Global.degisiklikYapildi();
                };

                let iconDebounceTimer = null;
                const updateLinkIconAndDomain = (forceImmediate = false) => {
                    let val = urlInput.value.trim();
                    if (!val) return;
                    if (!val.startsWith('http://') && !val.startsWith('https://')) val = 'https://' + val;

                    const doUpdate = () => {
                        const iconEls = row.querySelectorAll('.nook-link-icon');
                        const domainEl = row.querySelector('.nook-link-domain');
                        const testBtn = row.querySelector('.nook-link-test-btn');
                        const anchorEl = row.querySelector('.nook-link-anchor');

                        if (this.urlGecerliMi(val)) {
                            let d = 'Bağlantı';
                            try {
                                d = new URL(val).hostname.replace(/^www\./, '');
                            } catch(e) {}

                            if (domainEl) domainEl.textContent = d;
                            const newIconSvg = RenderEngine.getLinkIcon(val);
                            iconEls.forEach(iconEl => iconEl.innerHTML = newIconSvg);
                            if (testBtn) testBtn.href = RenderEngine.safeUrl(val);
                            if (anchorEl) anchorEl.href = RenderEngine.safeUrl(val);
                        }
                    };

                    clearTimeout(iconDebounceTimer);
                    if (forceImmediate) {
                        doUpdate();
                    } else {
                        iconDebounceTimer = setTimeout(doUpdate, 300);
                    }
                };

                nameInput.addEventListener('input', autoSave);
                urlInput.addEventListener('input', () => {
                    autoSave();
                    updateLinkIconAndDomain(false);
                });
                urlInput.addEventListener('blur', () => {
                    updateLinkIconAndDomain(true);
                });

                // Enter tuşuna basıldığında akordeonu kapat (küçült)
                const handleEnter = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        autoSave();
                        closeAccordion(row, collapseEl, urlInput);
                    }
                };
                nameInput.addEventListener('keydown', handleEnter);
                urlInput.addEventListener('keydown', handleEnter);

                // Düzenle / Sil butonu (Açıkken tıklandığında siler, kapalıyken akordeonu açar)
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (window._suruklemeBitti && Date.now() - window._suruklemeBitti < 250) return;

                        if (row.classList.contains('is-expanded')) {
                            deleteRowWithAnim(row, index);
                        } else {
                            openAccordion(row, collapseEl);
                            setTimeout(() => nameInput.focus(), 60);
                        }
                    });
                }

                wrapper.appendChild(row);
            });
        };

        // Mevcut linkleri çiz
        renderLinks();

        // En alta "+ Yeni Bağlantı Ekle" butonu koy
        let addBtn = scrollWrap.querySelector('.links-add-btn');
        if (!addBtn) {
            addBtn = document.createElement('button');
            addBtn.className = 'view-add-btn links-add-btn';
            addBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Yeni Bağlantı Ekle</span>
            `;
            scrollWrap.appendChild(addBtn);
        } else {
            scrollWrap.appendChild(addBtn);
        }

        addBtn.onclick = (e) => {
            e.stopPropagation();
            if (!Array.isArray(kartVerisi.links)) kartVerisi.links = [];
            if (kartVerisi.links.length >= 15) {
                alert("Maksimum bağlantı sayısına ulaşıldı.");
                return;
            }

            const hasEmpty = kartVerisi.links.some(l => !(l.baslik || l.isim || '').trim() && !(l.url || '').trim());
            if (hasEmpty) {
                const expandedInput = wrapper.querySelector('.nook-link-row.is-expanded .edit-isim-input');
                if (expandedInput) expandedInput.focus();
                return;
            }

            kartVerisi.links.push({ baslik: '', isim: '', url: '' });
            EditManager.Global.degisiklikYapildi();
            renderLinks();

            const lastItem = wrapper.lastElementChild;
            if (lastItem) {
                const toggleBtn = lastItem.querySelector('.nook-link-toggle');
                if (toggleBtn) toggleBtn.click();
            }
        };

        // Tıklama dışı akordeon kapatma (Click outside)
        if (!window._linksClickOutsideBound) {
            window._linksClickOutsideBound = true;
            document.addEventListener('mousedown', (e) => {
                if (!e.target.closest('.nook-link-row.is-expanded') && !e.target.closest('.links-add-btn') && !e.target.closest('#edit-action-bar')) {
                    const expanded = wrapper.querySelectorAll('.nook-link-row.is-expanded');
                    if (expanded.length > 0) {
                        window._linkAccordionJustClosed = Date.now();
                    }
                    EditManager.BackViews.kapatTumLinkAkordeonlari();
                }
            });
        }

        // Link Satırları Sürükle-Bırak Sistemi (Pointer Reorder)
        EditManager.initPointerSortable(wrapper, {
            itemSelector: '.nook-link-row',
            axis: 'y',
            canDrag: (row) => !row.classList.contains('is-expanded'),
            excludedDragSelectors: '.nook-link-anchor, .nook-link-actions, .nook-action-btn, input, button, a',
            onDrop: () => {
                if (Array.isArray(kartVerisi.links)) {
                    const yeniSiraIndices = [...wrapper.querySelectorAll('.nook-link-row')].map(r => parseInt(r.dataset.index, 10));
                    const yeniLinks = yeniSiraIndices.map(i => kartVerisi.links[i]).filter(Boolean);

                    if (JSON.stringify(yeniLinks) !== JSON.stringify(kartVerisi.links)) {
                        kartVerisi.links = yeniLinks;
                        EditManager.Global.degisiklikYapildi();
                        renderLinks();
                    }
                }
            }
        });
    },

    // --- Working On ---
    acWorkingFormu() {
        const panel = document.getElementById('view-working-on');
        if (!panel) return;
        const scrollWrap = panel.querySelector('.scrollable-fade');
        if (!scrollWrap) return;

        let form = scrollWrap.querySelector('.working-edit-form');
        if (form) {
            form.querySelector('.working-text-input')?.focus();
            return;
        }

        const statusCard = scrollWrap.querySelector('.status-card');
        if (statusCard) statusCard.style.display = 'none';

        const placeholder = scrollWrap.querySelector('.placeholder-text');
        if (placeholder) placeholder.style.display = 'none';

        const addBtn = scrollWrap.querySelector('.working-add-btn');
        if (addBtn) addBtn.style.display = 'none';

        const mevcutMetin = kartVerisi.working_on?.metin || '';

        form = document.createElement('div');
        form.className = 'inline-form-card working-edit-form';
        form.innerHTML = `
            <h4 class="inline-form-title">Şu Anda Ne Yapıyorum?</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 8px 0;">
                Üzerinde çalıştığın proje veya anlık durumunu güncelle.
            </p>
            <textarea class="inline-form-input working-text-input" rows="3" placeholder="Örn: Building next-gen UI components on Nook...">${EditManager.escapeHtml(mevcutMetin)}</textarea>
            <div class="inline-form-actions">
                <button type="button" class="form-btn-sm form-btn-cancel working-cancel-btn">İptal</button>
                <button type="button" class="form-btn-sm form-btn-submit working-save-btn">Kaydet</button>
            </div>
        `;

        if (addBtn) {
            scrollWrap.insertBefore(form, addBtn);
        } else {
            scrollWrap.appendChild(form);
        }

        const textarea = form.querySelector('.working-text-input');
        if (textarea) {
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }, 50);
        }

        form.querySelector('.working-cancel-btn').onclick = () => {
            form.remove();
            if (!kartVerisi.working_on || !kartVerisi.working_on.metin || kartVerisi.working_on.metin.trim() === '') {
                if (typeof Router !== 'undefined') Router.resetToMainMenu();
            } else {
                if (statusCard) statusCard.style.display = '';
                if (placeholder) placeholder.style.display = '';
                if (addBtn) addBtn.style.display = '';
            }
        };

        form.querySelector('.working-save-btn').onclick = () => {
            const metin = form.querySelector('.working-text-input').value.trim();
            if (!metin) {
                alert("Lütfen durum metni girin!");
                return;
            }

            if (!kartVerisi.working_on) kartVerisi.working_on = {};
            kartVerisi.working_on.metin = metin;

            RenderEngine.menuCiz(kartVerisi);
            RenderEngine.altEkranlariCiz(kartVerisi);
            EditManager.BackViews.init();
            EditManager.Global.degisiklikYapildi();
        };
    },

    workingOnDuzenlemeKur() {
        const panel = document.getElementById('view-working-on');
        if (!panel) return;
        const scrollWrap = panel.querySelector('.scrollable-fade');
        if (!scrollWrap) return;

        const card = scrollWrap.querySelector('.status-card');
        if (card && !card.querySelector('.working-owner-actions')) {
            card.classList.add('editable-hover');
            card.title = "Durumunuzu güncellemek için tıklayın";
            card.onclick = (e) => {
                if (e.target.closest('button')) return;
                this.acWorkingFormu();
            };

            const actionsWrap = document.createElement('div');
            actionsWrap.className = 'working-owner-actions';
            actionsWrap.style.display = 'flex';
            actionsWrap.style.justifyContent = 'flex-end';
            actionsWrap.style.gap = '8px';
            actionsWrap.style.marginTop = '8px';

            actionsWrap.innerHTML = `
                <button type="button" class="form-btn-sm form-btn-cancel working-edit-btn" style="font-size: 0.75rem;">Düzenle</button>
                <button type="button" class="form-btn-sm form-btn-cancel working-remove-btn" style="color: #ef4444; font-size: 0.75rem;">Kaldır</button>
            `;

            actionsWrap.querySelector('.working-edit-btn').onclick = (e) => {
                e.stopPropagation();
                this.acWorkingFormu();
            };

            actionsWrap.querySelector('.working-remove-btn').onclick = (e) => {
                e.stopPropagation();
                kartVerisi.working_on = {};
                RenderEngine.menuCiz(kartVerisi);
                RenderEngine.altEkranlariCiz(kartVerisi);
                EditManager.BackViews.init();
                EditManager.Global.degisiklikYapildi();
                if (typeof Router !== 'undefined') Router.resetToMainMenu();
            };

            card.appendChild(actionsWrap);
        } else if (!card && !panel.querySelector('.working-add-btn') && !scrollWrap.querySelector('.working-edit-form')) {
            const placeholder = scrollWrap.querySelector('.placeholder-text');
            if (placeholder) placeholder.remove();

            const addBtn = document.createElement('button');
            addBtn.className = 'view-add-btn working-add-btn';
            addBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Durum Bildirimi Ekle</span>
            `;
            addBtn.onclick = () => {
                this.acWorkingFormu();
            };
            scrollWrap.appendChild(addBtn);
        }
    },

    // --- Widgets ---
    acWidgetFormu(mevcutUser = '') {
        const panel = document.getElementById('view-widgets');
        if (!panel) return;
        const scrollWrap = panel.querySelector('.scrollable-fade');
        if (!scrollWrap) return;

        let form = scrollWrap.querySelector('.widget-add-form');
        if (form) {
            form.querySelector('.widget-user-input')?.focus();
            return;
        }

        form = document.createElement('div');
        form.className = 'inline-form-card widget-add-form';
        form.innerHTML = `
            <h4 class="inline-form-title">${mevcutUser ? 'Monkeytype Kullanıcısını Değiştir' : 'Monkeytype Widget\'ı Ekle'}</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 8px 0;">
                ${mevcutUser ? 'Yeni Monkeytype kullanıcı adını gir:' : 'Monkeytype kullanıcı adını girerek canlı klavye yazma skorlarını kartına ekle:'}
            </p>
            <input type="text" class="inline-form-input widget-user-input" placeholder="Kullanıcı Adı (Örn: miodec)" value="${EditManager.escapeHtml(mevcutUser)}">
            <div class="inline-form-actions">
                <button type="button" class="form-btn-sm form-btn-cancel widget-cancel-btn">İptal</button>
                <button type="button" class="form-btn-sm form-btn-submit widget-save-btn">${mevcutUser ? 'Güncelle' : 'Ekle'}</button>
            </div>
        `;

        const addBtn = scrollWrap.querySelector('.widget-add-btn');
        if (addBtn) {
            scrollWrap.insertBefore(form, addBtn);
        } else {
            scrollWrap.appendChild(form);
        }

        const userInput = form.querySelector('.widget-user-input');
        if (userInput) setTimeout(() => userInput.focus(), 50);

        form.querySelector('.widget-cancel-btn').onclick = () => {
            form.remove();
            if (!kartVerisi.widgets || kartVerisi.widgets.length === 0) {
                if (typeof Router !== 'undefined') Router.resetToMainMenu();
            }
        };

        form.querySelector('.widget-save-btn').onclick = () => {
            const yeniUser = form.querySelector('.widget-user-input').value.trim();
            if (!yeniUser) {
                alert("Lütfen Monkeytype kullanıcı adınızı girin!");
                return;
            }

            if (!Array.isArray(kartVerisi.widgets)) kartVerisi.widgets = [];
            let w = kartVerisi.widgets.find(item => item.tur === 'monkeytype');
            if (w) {
                if (!w.ayarlar) w.ayarlar = {};
                w.ayarlar.kullanici = yeniUser;
            } else {
                kartVerisi.widgets.push({
                    tur: 'monkeytype',
                    ayarlar: { kullanici: yeniUser }
                });
            }

            RenderEngine.menuCiz(kartVerisi);
            RenderEngine.altEkranlariCiz(kartVerisi);
            EditManager.BackViews.init();

            if (typeof canliMonkeytypeVerisiCek === 'function') {
                canliMonkeytypeVerisiCek(yeniUser).then(skorlar => {
                    if (skorlar) {
                        kartVerisi.canli_monkeytype = skorlar;
                        RenderEngine.monkeytypeGuncelle(skorlar);
                    }
                });
            }
            EditManager.Global.degisiklikYapildi();
        };
    },

    widgetsDuzenlemeKur() {
        const panel = document.getElementById('view-widgets');
        if (!panel) return;
        const scrollWrap = panel.querySelector('.scrollable-fade');
        if (!scrollWrap) return;

        // Sahip modunda boş bildirim metnini kaldır
        const placeholder = scrollWrap.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();

        // Monkeytype kartı varsa kullanıcı adını güncelleme ve widget'ı kaldırma butonu koy
        const mtCard = panel.querySelector('.monkeytype-card');
        if (mtCard && !mtCard.querySelector('.mt-owner-actions')) {
            const actionsWrap = document.createElement('div');
            actionsWrap.className = 'mt-owner-actions';
            actionsWrap.style.display = 'flex';
            actionsWrap.style.justifyContent = 'flex-end';
            actionsWrap.style.gap = '8px';
            actionsWrap.style.marginTop = '8px';

            actionsWrap.innerHTML = `
                <button type="button" class="form-btn-sm form-btn-cancel mt-edit-user-btn" style="font-size: 0.75rem;">Kullanıcıyı Değiştir</button>
                <button type="button" class="form-btn-sm form-btn-cancel mt-remove-btn" style="color: #ef4444; font-size: 0.75rem;">Widget'ı Kaldır</button>
            `;

            actionsWrap.querySelector('.mt-edit-user-btn').onclick = () => {
                const mevcutUser = mtCard.dataset.username || '';
                this.acWidgetFormu(mevcutUser);
            };

            actionsWrap.querySelector('.mt-remove-btn').onclick = () => {
                kartVerisi.widgets = (kartVerisi.widgets || []).filter(item => item.tur !== 'monkeytype');
                if (kartVerisi.widgets.length === 0) {
                    delete kartVerisi.widgets;
                    RenderEngine.menuCiz(kartVerisi);
                    RenderEngine.altEkranlariCiz(kartVerisi);
                    EditManager.BackViews.init();
                    EditManager.Global.degisiklikYapildi();
                    if (typeof Router !== 'undefined') Router.resetToMainMenu();
                } else {
                    RenderEngine.menuCiz(kartVerisi);
                    RenderEngine.altEkranlariCiz(kartVerisi);
                    EditManager.BackViews.init();
                    EditManager.Global.degisiklikYapildi();
                }
            };

            mtCard.appendChild(actionsWrap);
        } else if (!mtCard && !panel.querySelector('.widget-add-btn') && !scrollWrap.querySelector('.widget-add-form')) {
            // Widget yoksa "+ Monkeytype Widget'ı Ekle" butonu koy
            const addBtn = document.createElement('button');
            addBtn.className = 'view-add-btn widget-add-btn';
            addBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Monkeytype Widget'ı Ekle</span>
            `;
            addBtn.onclick = () => {
                this.acWidgetFormu();
            };
            scrollWrap.appendChild(addBtn);
        }
    }
};
// #endregion

// #region 6: BÖLÜM SEÇİCİ VE YENİ KATEGORİ OLUŞTURMA (SECTION PICKER)
EditManager.SectionPicker = {
    init() {
        const closeBtn = document.getElementById('add-section-close');
        const backdrop = document.getElementById('add-section-backdrop');
        if (closeBtn) closeBtn.onclick = () => this.kapat();
        if (backdrop) backdrop.onclick = () => this.kapat();

        this.bagla();
    },

    bagla() {
        document.querySelectorAll('#open-add-section-modal').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                this.ac();
            };
        });
    },

    ac() {
        const modal = document.getElementById('add-section-modal');
        const list = document.getElementById('sectionPickerList');
        if (!modal || !list) return;

        const hasLinks = Array.isArray(kartVerisi.links) && kartVerisi.links.length > 0;
        const hasWidgets = Array.isArray(kartVerisi.widgets) && kartVerisi.widgets.length > 0;
        const hasWorking = !!(kartVerisi.working_on && (kartVerisi.working_on.metin || kartVerisi.working_on.status));

        const kategoriler = [
            {
                id: 'links',
                baslik: 'Bağlantılar (Links)',
                alt: 'Sosyal medya, GitHub ve web bağlantılarını listele',
                ikon: RenderEngine.getCategoryIcon('links', 20),
                varMi: hasLinks,
                comingSoon: false
            },
            {
                id: 'widgets',
                baslik: 'Monkeytype Skoru (Widgets)',
                alt: 'Canlı klavye yazma hızı ve doğruluk widgetı',
                ikon: RenderEngine.getCategoryIcon('widgets', 20),
                varMi: hasWidgets,
                comingSoon: false
            },
            {
                id: 'working-on',
                baslik: 'Şu Anda Ne Yapıyorum (Working on)',
                alt: 'Üzerinde çalıştığın proje veya anlık durum bildirimi',
                ikon: RenderEngine.getCategoryIcon('working-on', 20),
                varMi: hasWorking,
                comingSoon: false
            },
            {
                id: 'trophies',
                baslik: 'Trophies (Kupalar & Koleksiyon)',
                alt: 'Karakterler, kitaplar ve dijital başarımlar',
                ikon: RenderEngine.getCategoryIcon('trophies', 20),
                varMi: false,
                comingSoon: true
            }
        ];

        list.innerHTML = kategoriler.map(k => {
            const itemClasses = ['section-picker-item'];
            if (k.varMi) itemClasses.push('is-already-added');
            if (k.comingSoon) itemClasses.push('is-coming-soon');

            let badgeHtml = '';
            if (k.varMi) {
                badgeHtml = '<span class="picker-added-badge">Mevcut</span>';
            } else if (k.comingSoon) {
                badgeHtml = '<span class="picker-soon-badge">Yakında</span>';
            }

            return `
                <div class="${itemClasses.join(' ')}" data-cat="${k.id}" ${k.comingSoon ? 'data-coming-soon="true"' : ''}>
                    <div class="picker-item-icon">${k.ikon}</div>
                    <div class="picker-item-info">
                        <div class="picker-item-title-row">
                            <span class="picker-item-title">${k.baslik}</span>
                            ${badgeHtml}
                        </div>
                        <span class="picker-item-desc">${k.alt}</span>
                    </div>
                    <div class="picker-item-action">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.section-picker-item').forEach(item => {
            item.onclick = () => {
                const isSoon = item.dataset.comingSoon === 'true';
                if (isSoon) {
                    if (typeof toastBildirimiGoster === 'function') {
                        toastBildirimiGoster("Trophies & Koleksiyon bölümü çok yakında geliyor!", 3000, 'warning');
                    } else if (typeof EditManager.Global?.toastGoster === 'function') {
                        EditManager.Global.toastGoster("Trophies bölümü yakında kullanıma açılacak!");
                    }
                    this.kapat();
                    return;
                }
                const catId = item.dataset.cat;
                this.kategoriSecildi(catId);
            };
        });

        modal.classList.add('is-open');
    },

    kapat() {
        const modal = document.getElementById('add-section-modal');
        if (modal) modal.classList.remove('is-open');
    },

    kategoriSecildi(catId) {
        this.kapat();

        if (catId === 'links') {
            if (!Array.isArray(kartVerisi.links)) kartVerisi.links = [];
        } else if (catId === 'widgets') {
            if (!Array.isArray(kartVerisi.widgets)) kartVerisi.widgets = [];
        } else if (catId === 'working-on') {
            if (!kartVerisi.working_on) kartVerisi.working_on = { metin: '' };
        }

        // Arayüzü yeniden çiz
        RenderEngine.menuCiz(kartVerisi);
        RenderEngine.altEkranlariCiz(kartVerisi);
        EditManager.BackViews.init();
        this.bagla();

        // Doğrudan oluşturulan kategorinin detay ekranına git
        if (typeof Router !== 'undefined') {
            Router.openDetailView(catId);
        }
    }
};
// #endregion

// #region 7: ETİKET SEÇİCİ VE HAVUZ YÖNETİMİ (TAG PICKER)
EditManager.TagPicker = {
    init() {
        const closeBtn = document.getElementById('tag-picker-close');
        const backdrop = document.getElementById('tag-picker-backdrop');
        const searchInput = document.getElementById('tag-search-input');

        if (closeBtn) closeBtn.onclick = () => this.kapat();
        if (backdrop) backdrop.onclick = () => this.kapat();

        if (searchInput) {
            searchInput.oninput = (e) => {
                this.filtrele(e.target.value);
            };
            searchInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const temiz = searchInput.value.replace(/\s+/g, ' ').trim();
                    if (temiz) {
                        this.etiketSec(temiz);
                    }
                }
            };
        }
    },

    ac() {
        const modal = document.getElementById('tag-picker-modal');
        const searchInput = document.getElementById('tag-search-input');
        if (!modal) return;

        if (searchInput) {
            searchInput.value = '';
        }

        this.havuzuCiz('');
        modal.classList.add('is-open');

        if (searchInput) {
            setTimeout(() => searchInput.focus(), 50);
        }
    },

    kapat() {
        const modal = document.getElementById('tag-picker-modal');
        if (modal) modal.classList.remove('is-open');
    },

    filtrele(arama) {
        this.havuzuCiz(arama);
    },

    havuzuCiz(arama = '') {
        const wrap = document.getElementById('tagPoolWrap');
        if (!wrap) return;

        const mevcutTags = Array.isArray(kartVerisi.front_data?.tags) ? kartVerisi.front_data.tags : [];
        const havuz = (typeof TAG_HAVUZU !== 'undefined' && Array.isArray(TAG_HAVUZU)) ? TAG_HAVUZU : [
            "Coder", "Developer", "Designer", "Gamer", "Music", "Stylist", "Sci-Fi", "Anime",
            "Minimalist", "Writer", "Artist", "Cyberpunk", "Photographer", "Reader", "Coffee", "Tech"
        ];

        const temizArama = arama.replace(/\s+/g, ' ').trim();
        const filtreMetni = temizArama.toLowerCase();
        const filtrelenmis = havuz.filter(tag => tag.toLowerCase().includes(filtreMetni));

        const tamHavuzEslesmesi = havuz.some(tag => tag.toLowerCase() === filtreMetni);
        const zatenSeciliMi = mevcutTags.some(tag => tag.toLowerCase() === filtreMetni);

        let createItemHtml = '';
        if (temizArama && !tamHavuzEslesmesi && !zatenSeciliMi && temizArama.length <= 20) {
            createItemHtml = `
                <div class="tag-pool-item tag-pool-create" data-tag="${EditManager.escapeHtml(temizArama)}">
                    <span>+</span>
                    <span>"${EditManager.escapeHtml(temizArama)}" etiketini oluştur ve ekle</span>
                </div>
            `;
        }

        let havuzItemsHtml = filtrelenmis.map(tag => {
            const secili = mevcutTags.some(t => t.toLowerCase() === tag.toLowerCase());
            return `
                <div class="tag-pool-item ${secili ? 'is-already-selected' : ''}" data-tag="${EditManager.escapeHtml(tag)}">
                    <span>${secili ? '✓' : '+'}</span>
                    <span>${EditManager.escapeHtml(tag)}</span>
                </div>
            `;
        }).join('');

        if (!createItemHtml && filtrelenmis.length === 0) {
            wrap.innerHTML = `<div class="tag-pool-empty">Eşleşen etiket bulunamadı.</div>`;
            return;
        }

        wrap.innerHTML = createItemHtml + havuzItemsHtml;

        wrap.querySelectorAll('.tag-pool-item').forEach(item => {
            if (item.classList.contains('is-already-selected')) return;
            item.onclick = () => {
                const tag = item.dataset.tag;
                this.etiketSec(tag);
            };
        });
    },

    etiketSec(tag) {
        if (!tag) return;
        const temizTag = tag.replace(/\s+/g, ' ').trim();
        if (!temizTag) return;

        if (temizTag.length > 20) {
            alert("Etiket en fazla 20 karakter olabilir!");
            return;
        }

        if (!kartVerisi.front_data) kartVerisi.front_data = {};
        if (!Array.isArray(kartVerisi.front_data.tags)) kartVerisi.front_data.tags = [];

        if (kartVerisi.front_data.tags.length >= 6) {
            alert("En fazla 6 etiket seçebilirsiniz!");
            this.kapat();
            return;
        }

        if (kartVerisi.front_data.tags.some(t => t.toLowerCase() === temizTag.toLowerCase())) {
            this.kapat();
            return;
        }

        kartVerisi.front_data.tags.push(temizTag);
        this.kapat();

        RenderEngine.vitrinCiz(kartVerisi);
        EditManager.Vitrin.init();
        EditManager.Global.degisiklikYapildi();
    }
};

EditManager.escapeHtml = function(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};
// #endregion

// #region 8: TOPS KATEGORİ AYARLARI MODALI (TOPS MODAL)
EditManager.TopsModal = {
    seciliTur: 'film',
    targetListId: null,

    init() {
        const modal = document.getElementById('tops-setup-modal');
        const closeBtn = document.getElementById('tops-setup-close');
        const backdrop = document.getElementById('tops-setup-backdrop');
        const cancelBtn = document.getElementById('tops-setup-cancel');
        const saveBtn = document.getElementById('tops-setup-save');
        const deleteBtn = document.getElementById('tops-delete-btn');

        if (closeBtn) closeBtn.onclick = () => this.kapat();
        if (backdrop) backdrop.onclick = () => this.kapat();
        if (cancelBtn) cancelBtn.onclick = () => this.kapat();

        if (deleteBtn) {
            deleteBtn.onclick = () => {
                const targetId = this.targetListId;
                if (!targetId || !kartVerisi.tops?.listeler) return;
                const targetList = kartVerisi.tops.listeler.find(l => l.id === targetId);
                const listName = targetList?.kategori || 'Liste';

                this.kapat();

                // Özel Onay Modalı (block-delete-modal) ile sor
                const blockModal = document.getElementById('block-delete-modal');
                const blockTitle = document.getElementById('block-delete-title');
                const blockDesc = document.getElementById('block-delete-desc');
                const confirmBtn = document.getElementById('block-delete-confirm');

                if (blockModal && blockTitle && blockDesc && confirmBtn) {
                    blockTitle.textContent = `"${listName}" Listesini Sil`;
                    blockDesc.textContent = "Bu kürasyon listesini ve içindeki tüm afişleri kaldırmak istediğinizden emin misiniz?";
                    blockModal.classList.add('is-open');

                    confirmBtn.onclick = () => {
                        blockModal.classList.remove('is-open');
                        const idx = kartVerisi.tops.listeler.findIndex(l => l.id === targetId);
                        if (idx > -1) {
                            kartVerisi.tops.listeler.splice(idx, 1);
                            kartVerisi.tops.aktifListeId = kartVerisi.tops.listeler[0]?.id || null;
                            RenderEngine.companionCiz(kartVerisi.tops);
                            EditManager.CompanionViews?.init();
                            EditManager.Global.degisiklikYapildi();
                        }
                    };
                }
            };
        }

        if (saveBtn) {
            saveBtn.onclick = () => this.kaydet();
        }
    },

    ac(targetListId = null) {
        const modal = document.getElementById('tops-setup-modal');
        const titleEl = document.getElementById('tops-setup-title');
        const nameInput = document.getElementById('tops-name-input');
        const linkUrlInput = document.getElementById('tops-link-url-input');
        const deleteBtn = document.getElementById('tops-delete-btn');
        if (!modal) return;

        if (!kartVerisi.tops || !Array.isArray(kartVerisi.tops.listeler)) {
            kartVerisi.tops = { aktifListeId: null, listeler: [] };
        }

        this.targetListId = targetListId;

        if (targetListId) {
            // DÜZENLEME MODU: Liste İsmi Değiştirme, Link Ekleme/Düzenleme ve Liste Silme
            const targetList = kartVerisi.tops.listeler.find(l => l.id === targetListId);
            if (!targetList) return;

            if (titleEl) titleEl.textContent = 'Listeyi Düzenle';
            if (deleteBtn) deleteBtn.style.display = 'inline-flex';

            if (nameInput) {
                nameInput.value = targetList.kategori || 'Favorilerim';
            }
            if (linkUrlInput) {
                linkUrlInput.value = targetList.harici_link?.url || '';
            }
        } else {
            // YENİ LİSTE OLUŞTURMA MODU
            if (kartVerisi.tops.listeler.length >= 6) {
                alert("En fazla 6 adet kürasyon listesi oluşturabilirsiniz!");
                return;
            }

            if (titleEl) titleEl.textContent = 'Yeni Liste Oluştur';
            if (deleteBtn) deleteBtn.style.display = 'none';

            if (nameInput) {
                nameInput.value = 'Favorilerim';
            }
            if (linkUrlInput) {
                linkUrlInput.value = '';
            }
        }

        modal.classList.add('is-open');
        if (nameInput) setTimeout(() => nameInput.focus(), 60);
    },

    kapat() {
        const modal = document.getElementById('tops-setup-modal');
        if (modal) modal.classList.remove('is-open');
        this.targetListId = null;
    },

    kaydet() {
        const nameInput = document.getElementById('tops-name-input');
        const linkUrlInput = document.getElementById('tops-link-url-input');

        const yeniBaslik = nameInput ? nameInput.value.trim() : '';
        if (!yeniBaslik) {
            alert("Lütfen bir liste ismi girin!");
            return;
        }

        const linkUrl = linkUrlInput ? linkUrlInput.value.trim() : '';
        let harici_link = null;
        if (linkUrl) {
            let domain = '';
            try {
                const u = new URL(linkUrl.startsWith('http') ? linkUrl : 'https://' + linkUrl);
                domain = u.hostname.replace(/^www\./i, '');
            } catch {
                domain = 'Bağlantı';
            }
            harici_link = {
                baslik: domain || 'Harici Profil',
                url: linkUrl
            };
        }

        if (!kartVerisi.tops || !Array.isArray(kartVerisi.tops.listeler)) {
            kartVerisi.tops = { aktifListeId: null, listeler: [] };
        }

        if (this.targetListId) {
            const targetList = kartVerisi.tops.listeler.find(l => l.id === this.targetListId);
            if (targetList) {
                targetList.kategori = yeniBaslik;
                targetList.harici_link = harici_link;
            }
        } else {
            if (kartVerisi.tops.listeler.length >= 6) {
                alert("En fazla 6 adet kürasyon listesi oluşturabilirsiniz!");
                return;
            }
            const yeniId = 'list_' + Date.now();
            kartVerisi.tops.listeler.push({
                id: yeniId,
                kategori: yeniBaslik,
                tur: 'film',
                harici_link: harici_link,
                ogeler: []
            });
            kartVerisi.tops.aktifListeId = yeniId;
        }

        this.kapat();

        RenderEngine.companionCiz(kartVerisi.tops);
        EditManager.CompanionViews?.init();
        EditManager.Global.degisiklikYapildi();
    }
};
// #endregion

// #region 9: İÇERİK ARAMA VE AFİŞ SEÇME MODALI (MEDIA SEARCH MODAL)
EditManager.MediaSearchModal = {
    aramaTuru: 'film',
    debounceTimer: null,

    init() {
        const modal = document.getElementById('tops-search-modal');
        const closeBtn = document.getElementById('tops-search-close');
        const backdrop = document.getElementById('tops-search-backdrop');
        const searchInput = document.getElementById('tops-search-input');

        if (closeBtn) closeBtn.onclick = () => this.kapat();
        if (backdrop) backdrop.onclick = () => this.kapat();

        if (searchInput) {
            searchInput.oninput = (e) => {
                clearTimeout(this.debounceTimer);
                const query = e.target.value.trim();
                if (!query) {
                    this.sonuclariCiz([], 'Aramak için bir isim yazın...');
                    return;
                }
                this.debounceTimer = setTimeout(() => {
                    this.ara(query);
                }, 350);
            };
        }
    },

    ac(tur = 'film') {
        const modal = document.getElementById('tops-search-modal');
        const titleEl = document.getElementById('tops-search-title');
        const descEl = document.getElementById('tops-search-desc');
        const searchInput = document.getElementById('tops-search-input');
        if (!modal) return;

        this.aramaTuru = tur || 'film';

        const turBasliklari = {
            film: { baslik: 'Film Ara', placeholder: 'Film adı yazın (Örn: Inception, Interstellar)...' },
            dizi: { baslik: 'Dizi Ara', placeholder: 'Dizi adı yazın (Örn: Breaking Bad, Dark)...' },
            oyun: { baslik: 'Oyun Ara', placeholder: 'Oyun adı yazın (Örn: Cyberpunk 2077, Elden Ring)...' },
            anime: { baslik: 'Anime Ara', placeholder: 'Anime adı yazın (Örn: Death Note, Attack on Titan)...' },
            karakter: { baslik: 'Karakter Ara', placeholder: 'Karakter adı yazın (Örn: Tyler Durden, Levi, Walter White)...' },
            kitap: { baslik: 'Kitap Ara', placeholder: 'Kitap adı yazın (Örn: Dune, 1984, Yüzüklerin Efendisi)...' }
        };

        const config = turBasliklari[this.aramaTuru] || turBasliklari.film;

        if (titleEl) titleEl.textContent = config.baslik;
        if (descEl) descEl.textContent = `Seçili kategori türü: ${this.aramaTuru.toUpperCase()} — Listedeki yapımlardan birini seçin.`;
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = config.placeholder;
        }

        this.sonuclariCiz([], 'Aramak için bir isim yazın...');
        modal.classList.add('is-open');
        if (searchInput) setTimeout(() => searchInput.focus(), 60);
    },

    kapat() {
        const modal = document.getElementById('tops-search-modal');
        if (modal) modal.classList.remove('is-open');
    },

    async ara(query) {
        const resultsWrap = document.getElementById('tops-search-results');
        if (resultsWrap) {
            resultsWrap.innerHTML = `
                <div class="tops-search-loading">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
                    </svg>
                    <span>Aranıyor...</span>
                </div>
            `;
        }

        try {
            const sonuclar = await icerikAra(query, this.aramaTuru);
            if (!sonuclar || sonuclar.length === 0) {
                this.sonuclariCiz([], `"${query}" ile ilgili sonuç bulunamadı.`);
            } else {
                this.sonuclariCiz(sonuclar);
            }
        } catch (err) {
            console.error("Arama hatası:", err);
            this.sonuclariCiz([], 'Arama sırasında bir sorun oluştu.');
        }
    },

    sonuclariCiz(sonuclar, mesaj = '') {
        const resultsWrap = document.getElementById('tops-search-results');
        if (!resultsWrap) return;

        if (!sonuclar || sonuclar.length === 0) {
            resultsWrap.innerHTML = `<div class="tops-search-empty">${EditManager.escapeHtml(mesaj)}</div>`;
            return;
        }

        resultsWrap.innerHTML = sonuclar.map((item, idx) => {
            const rawAfis = item.afis_url || item.gorsel_url;
            const posterHtml = rawAfis
                ? `<img class="tops-search-poster" src="${EditManager.escapeHtml(rawAfis)}" alt="${EditManager.escapeHtml(item.baslik)}" onerror="this.style.display='none'">`
                : `<div class="tops-search-poster"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"></rect></svg></div>`;

            const skorHtml = item.skor ? `<span class="tops-search-score">★ ${EditManager.escapeHtml(item.skor)}</span>` : '';
            const yilHtml = item.yil ? `<span class="tops-search-year">(${EditManager.escapeHtml(item.yil)})</span>` : '';
            const altBilgi = item.seri || item.yazar || item.yonetmen || item.yayinci || item.studyo || (item.aciklama ? item.aciklama.slice(0, 60) : '');
            const altBilgiHtml = altBilgi ? `<span class="tops-search-sub" style="font-size: 0.75rem; color: rgba(255,255,255,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${EditManager.escapeHtml(altBilgi)}</span>` : '';

            return `
                <div class="tops-search-item" data-index="${idx}">
                    ${posterHtml}
                    <div class="tops-search-info">
                        <div class="tops-search-title">${EditManager.escapeHtml(item.baslik)} ${yilHtml}</div>
                        ${altBilgiHtml}
                        <div class="tops-search-meta">
                            ${skorHtml}
                            <span class="tops-search-type">${this.aramaTuru.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        resultsWrap.querySelectorAll('.tops-search-item').forEach(el => {
            el.onclick = () => {
                const idx = parseInt(el.dataset.index, 10);
                const secilen = sonuclar[idx];
                if (secilen) {
                    this.icerikEkle(secilen);
                }
            };
        });
    },

    icerikEkle(secilen) {
        if (!kartVerisi.tops || !Array.isArray(kartVerisi.tops.listeler)) {
            kartVerisi.tops = { aktifListeId: null, listeler: [] };
        }

        let aktifListe = kartVerisi.tops.listeler.find(l => l.id === kartVerisi.tops.aktifListeId);
        if (!aktifListe) {
            if (kartVerisi.tops.listeler.length > 0) {
                aktifListe = kartVerisi.tops.listeler[0];
                kartVerisi.tops.aktifListeId = aktifListe.id;
            } else {
                const yeniId = 'list_' + Date.now();
                aktifListe = {
                    id: yeniId,
                    kategori: 'Favorilerim',
                    tur: this.aramaTuru,
                    harici_link: null,
                    ogeler: []
                };
                kartVerisi.tops.listeler.push(aktifListe);
                kartVerisi.tops.aktifListeId = yeniId;
            }
        }

        if (!Array.isArray(aktifListe.ogeler)) {
            aktifListe.ogeler = [];
        }

        if (aktifListe.ogeler.length >= 3) {
            alert("Bu listeye en fazla 3 adet vitrin afişi ekleyebilirsiniz!");
            this.kapat();
            return;
        }

        const oge = {
            id: secilen.id || secilen.kimlik || ('top_' + Date.now()),
            baslik: secilen.baslik || 'Bilinmeyen Yapım',
            aciklama: secilen.aciklama || '',
            afis_url: secilen.afis_url || secilen.gorsel_url || null,
            yil: secilen.yil || null,
            skor: secilen.skor || null
        };
        if (secilen.yonetmen) oge.yonetmen = secilen.yonetmen;
        if (secilen.yayinci) oge.yayinci = secilen.yayinci;
        if (secilen.studyo) oge.studyo = secilen.studyo;
        if (secilen.seri) oge.seri = secilen.seri;
        if (secilen.yazar) oge.yazar = secilen.yazar;

        aktifListe.ogeler.push(oge);

        this.kapat();

        RenderEngine.companionCiz(kartVerisi.tops);
        EditManager.CompanionViews?.init();
        EditManager.Global.degisiklikYapildi();

        if (typeof tumGorselleriPreloadEt === 'function') {
            tumGorselleriPreloadEt(kartVerisi);
        }
    }
};
// #endregion

// #region 10: TOPS EŞLİKÇİ KART (SHOWCASE WING) DÜZENLEME MOTORU
EditManager.CompanionViews = {
    init() {
        const companionBody = document.getElementById('companionBody');
        if (!companionBody) return;

        const tops = kartVerisi.tops || { listeler: [] };
        const listeler = Array.isArray(tops.listeler) ? tops.listeler : [];
        let aktifListe = listeler.find(l => l.id === tops.aktifListeId);
        if (!aktifListe && listeler.length > 0) {
            aktifListe = listeler[0];
            tops.aktifListeId = aktifListe.id;
        }
        if (!aktifListe) return;

        // 1. Afiş Ekle Butonuna Tıklanması
        const addPosterCard = companionBody.querySelector('#top-add-poster-btn');
        if (addPosterCard) {
            addPosterCard.onclick = () => {
                const tur = aktifListe.tur || 'film';
                EditManager.MediaSearchModal.ac(tur);
            };
        }

        // 2. Afiş Kartlarına Silme Butonu Eklenmesi
        const container = companionBody.querySelector('#tops-container-wrap');
        if (!container) return;

        container.querySelectorAll('.top-item-card').forEach((card, idx) => {
            const cardId = card.dataset.id;
            card.dataset.index = idx;

            if (!card.querySelector('.item-delete-btn')) {
                const delBtn = document.createElement('button');
                delBtn.className = 'item-delete-btn';
                delBtn.style.position = 'absolute';
                delBtn.style.top = '8px';
                delBtn.style.right = '8px';
                delBtn.title = "Afişi Kaldır";
                delBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                `;
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (aktifListe && Array.isArray(aktifListe.ogeler)) {
                        if (cardId) {
                            aktifListe.ogeler = aktifListe.ogeler.filter(x => (x.id || x.kimlik) !== cardId);
                        } else {
                            aktifListe.ogeler.splice(idx, 1);
                        }
                        RenderEngine.companionCiz(kartVerisi.tops);
                        EditManager.CompanionViews.init();
                        EditManager.Global.degisiklikYapildi();
                    }
                });
                card.appendChild(delBtn);
            }
        });

        // 3. Afiş Kartları Sürükle-Bırak Sistemi (Pointer Sortable)
        EditManager.initPointerSortable(container, {
            itemSelector: '.top-item-card',
            axis: 'y',
            excludedDragSelectors: '.item-delete-btn, .top-poster-add-card, input, button, a',
            onMove: () => {
                const currentAddCard = container.querySelector('#top-add-poster-btn');
                if (currentAddCard) container.appendChild(currentAddCard);
            },
            onDrop: () => {
                const currentAddCard = container.querySelector('#top-add-poster-btn');
                if (currentAddCard) container.appendChild(currentAddCard);

                if (aktifListe && Array.isArray(aktifListe.ogeler)) {
                    const cards = [...container.querySelectorAll('.top-item-card')];
                    const yeniOgeler = cards.map(c => {
                        const cid = c.dataset.id;
                        if (cid) {
                            return aktifListe.ogeler.find(x => (x.id || x.kimlik) === cid);
                        }
                        const i = parseInt(c.dataset.index, 10);
                        return aktifListe.ogeler[i];
                    }).filter(Boolean);

                    if (JSON.stringify(yeniOgeler) !== JSON.stringify(aktifListe.ogeler)) {
                        aktifListe.ogeler = yeniOgeler;
                        EditManager.Global.degisiklikYapildi();

                        const compCard = document.querySelector('.tops-companion-card');
                        if (compCard) compCard.classList.add('is-reordered');

                        RenderEngine.companionCiz(kartVerisi.tops);
                        EditManager.CompanionViews.init();

                        const newCompCard = document.querySelector('.tops-companion-card');
                        if (newCompCard) newCompCard.classList.add('is-reordered');
                    }
                }
            }
        });
    }
};
// #endregion
