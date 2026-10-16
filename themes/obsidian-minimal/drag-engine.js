/**
 * NOOK — OBSIDIAN MINIMAL SÜRÜKLEME MOTORU (DISCRETE-GLIDE SORTABLE ENGINE)
 * Karakter: Gölgesiz minimalist havaya kalkma, yaylanma/direnç, dinamik mesafe eşiği
 * ve katmanlı (üstten/alttan) süzülerek yuva değiştirme fiziği.
 */

(function () {
    if (typeof EditManager === 'undefined') return;

    EditManager.registerDragEngine('obsidian-minimal', function (container, options, editManagerInstance) {
        if (!container) return null;

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
        let isTransitioning = false;
        let draggedItem = null;
        let hasMoved = false;
        let longPressTimer = null;
        let pointerType = 'mouse';
        let settleTimeout = null;

        const startDragging = (clientX, clientY) => {
            if (!draggedItem || isDragging) return;
            isDragging = true;
            isTransitioning = false;

            // 1. Elemanı gölgesiz, temiz bir şekilde havaya kaldır
            draggedItem.classList.add('is-obsidian-elevated');
            draggedItem.style.position = 'relative';
            draggedItem.style.zIndex = '20';
            draggedItem.style.willChange = 'transform';
            draggedItem.style.transition = 'none';
            draggedItem.style.transform = 'scale(1.02)';

            document.body.classList.add('is-pointer-dragging');
        };

        const onPointerDown = (e) => {
            if (typeof isOwner === 'undefined' || !isOwner || (typeof EditManager !== 'undefined' && EditManager.Appearance?.isPreviewActive)) return;
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            if (e.target.closest(excludedDragSelectors)) return;

            const item = e.target.closest(itemSelector);
            if (!item || !container.contains(item)) return;

            if (typeof canDrag === 'function' && !canDrag(item, e.target)) return;

            startX = e.clientX;
            startY = e.clientY;
            isDragging = false;
            isTransitioning = false;
            hasMoved = false;
            draggedItem = item;
            pointerType = e.pointerType || 'mouse';

            if (pointerType === 'touch') {
                if (e.pointerId && item.setPointerCapture) {
                    try { item.setPointerCapture(e.pointerId); } catch (err) { }
                }
                longPressTimer = setTimeout(() => {
                    longPressTimer = null;
                    if (!draggedItem) return;
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                        try { navigator.vibrate(40); } catch (err) { }
                    }
                    startDragging(startX, startY);
                }, 320);
            }

            const onPointerCancel = (ev) => {
                if (isDragging) return;
                onPointerUp(ev);
            };

            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerCancel);
        };

        const onPointerMove = (e) => {
            if (!draggedItem) return;

            if (!isDragging) {
                const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
                if (pointerType === 'touch') {
                    if (dist > 10 && longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                    return;
                }
                if (dist > 4) {
                    startDragging(e.clientX, e.clientY);
                } else {
                    return;
                }
            }

            if (e.cancelable) e.preventDefault();

            // Geçiş animasyonu devam ederken yeni yer değiştirme tetikleme
            if (isTransitioning) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            const isXAxis = axis === 'x';
            const primaryDelta = isXAxis ? deltaX : deltaY;

            const itemRect = draggedItem.getBoundingClientRect();
            // Dinamik mesafe eşiği: Elemanın ilgili eksendeki boyutunun %100'ü
            const threshold = Math.max((isXAxis ? itemRect.width : itemRect.height) * 1.0, 22);

            // 1. EŞİK ÖNCESİ: HAFİF YAYLANMA / DİRENÇ (RUBBER-BAND RESISTANCE)
            if (Math.abs(primaryDelta) < threshold) {
                const resistance = Math.sign(primaryDelta) * Math.min(Math.abs(primaryDelta) * 0.22, 9);
                draggedItem.style.transition = 'none';
                if (isXAxis) {
                    draggedItem.style.transform = `translate3d(${resistance}px, 0, 0) scale(1.02)`;
                } else {
                    draggedItem.style.transform = `translate3d(0, ${resistance}px, 0) scale(1.02)`;
                }
                return;
            }

            // 2. EŞİK AŞILDI: KATMANLI GEÇİŞ (DISCRETE-GLIDE)
            let target = null;
            if (primaryDelta > 0) {
                target = draggedItem.nextElementSibling;
            } else {
                target = draggedItem.previousElementSibling;
            }

            // Hedefin geçerli ve sıralanabilir bir öğe olup olmadığını doğrula
            if (!target || !container.contains(target) || !target.matches(itemSelector) ||
                target.closest('.tag-add-pill, .tops-add-btn, .top-add-form, .add-section-nav-btn, .add-section-big-btn')) {
                // Sınırda hafif dirençle dur
                const clampMax = Math.sign(primaryDelta) * 10;
                draggedItem.style.transition = 'none';
                if (isXAxis) {
                    draggedItem.style.transform = `translate3d(${clampMax}px, 0, 0) scale(1.02)`;
                } else {
                    draggedItem.style.transform = `translate3d(0, ${clampMax}px, 0) scale(1.02)`;
                }
                return;
            }

            isTransitioning = true;
            const targetRect = target.getBoundingClientRect();
            const slotDistanceX = targetRect.left - itemRect.left;
            const slotDistanceY = targetRect.top - itemRect.top;

            // Taşınan eleman: ÜSTTEN yeni yuvaya süzülür
            draggedItem.style.transition = 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)';
            draggedItem.style.transform = `translate3d(${slotDistanceX}px, ${slotDistanceY}px, 0) scale(1.02)`;

            // Yerinden edilen eleman: ALTINDAN (z-index: 1) eski yuvaya kayar
            target.classList.add('is-obsidian-displaced');
            target.style.position = 'relative';
            target.style.zIndex = '1';
            target.style.transition = 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)';
            target.style.transform = `translate3d(${-slotDistanceX}px, ${-slotDistanceY}px, 0)`;

            // 220ms geçiş bittiğinde DOM'u güncelle ve transformları sıfırla
            setTimeout(() => {
                if (!draggedItem || !target) {
                    isTransitioning = false;
                    return;
                }

                if (primaryDelta > 0) {
                    target.after(draggedItem);
                } else {
                    target.before(draggedItem);
                }

                // Transformları sıfırla
                draggedItem.style.transition = 'none';
                draggedItem.style.transform = 'scale(1.02)';

                target.style.transition = '';
                target.style.transform = '';
                target.style.position = '';
                target.style.zIndex = '';
                target.classList.remove('is-obsidian-displaced');

                hasMoved = true;
                if (typeof onMove === 'function') onMove(draggedItem, target);

                // Yeni yuva merkezini referans al (akıcı zincirleme sürükleme için)
                startX = e.clientX;
                startY = e.clientY;
                isTransitioning = false;
            }, 220);
        };

        const onPointerUp = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }

            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);

            if (draggedItem) {
                const currentDragged = draggedItem;
                // Akıcı bir şekilde yerine in
                currentDragged.style.transition = 'transform 0.18s cubic-bezier(0.25, 1, 0.5, 1)';
                currentDragged.style.transform = 'translate3d(0, 0, 0) scale(1)';

                settleTimeout = setTimeout(() => {
                    currentDragged.classList.remove('is-obsidian-elevated');
                    currentDragged.style.position = '';
                    currentDragged.style.zIndex = '';
                    currentDragged.style.transition = '';
                    currentDragged.style.transform = '';
                    currentDragged.style.willChange = '';
                }, 180);
            }

            // Temizleme
            container.querySelectorAll('.is-obsidian-displaced').forEach(el => {
                el.classList.remove('is-obsidian-displaced');
                el.style.transition = '';
                el.style.transform = '';
                el.style.position = '';
                el.style.zIndex = '';
            });

            document.body.classList.remove('is-pointer-dragging');

            if (isDragging) {
                window._suruklemeBitti = Date.now();
                if (hasMoved && typeof onDrop === 'function') {
                    onDrop();
                }
            }

            draggedItem = null;
            isDragging = false;
            isTransitioning = false;
        };

        container.addEventListener('pointerdown', onPointerDown);

        return function cleanup() {
            container.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            if (longPressTimer) clearTimeout(longPressTimer);
            if (settleTimeout) clearTimeout(settleTimeout);
            document.body.classList.remove('is-pointer-dragging');
        };
    });
})();
