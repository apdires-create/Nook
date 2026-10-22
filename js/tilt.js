// #region 1: 3D TILT VE YAŞAYAN SPOTLIGHT ORBİT MOTORU (LIVING SPOTLIGHT & TILT ENGINE)
const TiltEngine = {
    cardContainer: null,
    mouseX: 0,
    mouseY: 0,
    clientMouseX: -9999,
    clientMouseY: -9999,
    mouseInWindow: false,
    currentTiltX: 0,
    currentTiltY: 0,
    
    // Tilt Konfigürasyonu (Dinamik Mesafe Duyarlı)
    minTilt: 3.2,           // Kartın üzerindeyken veya tıklama alanındayken stabil tilt (derece)
    maxTilt: 8.5,           // Karttan uzaklaşıldığında sahne derinliğini hissettiren belirgin tilt (derece)
    lerpSpeed: 0.09,        // Yaylanma hızı

    isRunning: false,
    rafId: null,
    lastFrameTime: 0,

    // Orbit & Aydınlatma Konfigürasyonu
    ORBIT_SPEED: 380,       // px / saniye (yaklaşık 4.7 saniyede tam tur; net ve akıcı hareket)
    PROXIMITY_PX: 200,      // Fare takip ve yakınlık menzili
    AMBIENT_OPACITY: 0.82,  // Pasif orbit esnasında canlı, net ve fark edilir ışıltı opasitesi
    ACTIVE_OPACITY: 0.98,   // Kartın üzerinde veya odaklıyken tepe ışıma opasitesi

    // Her kart için bağımsız orbit, pozisyon ve lerp durumu
    cardStates: new WeakMap(),

    init() {
        this.cardContainer = document.getElementById('cardContainer');
        if (!this.cardContainer) return;

        // 1. Fare hareketini ve küresel koordinatları dinle
        window.addEventListener('mousemove', (e) => {
            if (window.innerWidth < 900) return;
            this.mouseInWindow = true;
            this.clientMouseX = e.clientX;
            this.clientMouseY = e.clientY;
            const { innerWidth, innerHeight } = window;
            this.mouseX = (e.clientX / innerWidth) * 2 - 1;
            this.mouseY = (e.clientY / innerHeight) * 2 - 1;
            this.wake();
        }, { passive: true });

        // 2. Fare pencereden ayrıldığında veya sekme odağını kaybettiğinde
        window.addEventListener('mouseleave', () => {
            this.mouseInWindow = false;
            this.clientMouseX = -9999;
            this.clientMouseY = -9999;
            this.mouseX = 0;
            this.mouseY = 0;
            this.wake();
        });

        window.addEventListener('blur', () => {
            this.mouseInWindow = false;
            this.clientMouseX = -9999;
            this.clientMouseY = -9999;
            this.mouseX = 0;
            this.mouseY = 0;
            this.wake();
        });

        // 3. Sekme gizlendiğinde CPU/Pil tasarrufu için döngüyü uyut
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.rafId) {
                    cancelAnimationFrame(this.rafId);
                    this.rafId = null;
                }
                this.isRunning = false;
            } else {
                this.lastFrameTime = performance.now();
                this.wake();
            }
        });

        // 4. Ekran boyutu değişimi
        window.addEventListener('resize', () => {
            if (window.innerWidth < 900) {
                if (this.cardContainer && this.cardContainer.style.transform) {
                    this.cardContainer.style.transform = '';
                }
                this.isRunning = false;
                if (this.rafId) {
                    cancelAnimationFrame(this.rafId);
                    this.rafId = null;
                }
                document.querySelectorAll('#cardContainer, .companion-card').forEach(card => {
                    card.style.setProperty('--card-border-proximity', '0');
                });
            } else {
                this.lastFrameTime = performance.now();
                this.wake();
            }
        }, { passive: true });

        // 5. Başlangıçta döngüyü uyandır
        if (window.innerWidth >= 900) {
            this.wake();
        }
    },

    wake() {
        if (this.isRunning || window.innerWidth < 900 || !this.cardContainer) return;
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.rafId = requestAnimationFrame((ts) => this.loop(ts));
    },

    // Geometrik Yardımcı: Yuvarlatılmış dikdörtgen çevresinde belirli mesafedeki (s) (x, y) noktasını hesaplar
    getPerimeterPoint(s, W, H, R) {
        const ws = Math.max(0, W - 2 * R);
        const hs = Math.max(0, H - 2 * R);
        const rArc = 0.5 * Math.PI * R;
        const totalP = 2 * (ws + hs) + 4 * rArc;

        if (totalP <= 0) return { x: W * 0.5, y: 0 };

        let dist = ((s % totalP) + totalP) % totalP;

        // 1. Üst düz kenar: (R, 0) -> (W - R, 0)
        if (dist < ws) {
            return { x: R + dist, y: 0 };
        }
        dist -= ws;

        // 2. Sağ üst köşe yayı: merkez (W - R, R), açı -pi/2 -> 0
        if (dist < rArc) {
            const phi = -Math.PI / 2 + (dist / rArc) * (Math.PI / 2);
            return { x: (W - R) + R * Math.cos(phi), y: R + R * Math.sin(phi) };
        }
        dist -= rArc;

        // 3. Sağ düz kenar: (W, R) -> (W, H - R)
        if (dist < hs) {
            return { x: W, y: R + dist };
        }
        dist -= hs;

        // 4. Sağ alt köşe yayı: merkez (W - R, H - R), açı 0 -> pi/2
        if (dist < rArc) {
            const phi = (dist / rArc) * (Math.PI / 2);
            return { x: (W - R) + R * Math.cos(phi), y: (H - R) + R * Math.sin(phi) };
        }
        dist -= rArc;

        // 5. Alt düz kenar: (W - R, H) -> (R, H)
        if (dist < ws) {
            return { x: (W - R) - dist, y: H };
        }
        dist -= ws;

        // 6. Sol alt köşe yayı: merkez (R, H - R), açı pi/2 -> pi
        if (dist < rArc) {
            const phi = Math.PI / 2 + (dist / rArc) * (Math.PI / 2);
            return { x: R + R * Math.cos(phi), y: (H - R) + R * Math.sin(phi) };
        }
        dist -= rArc;

        // 7. Sol düz kenar: (0, H - R) -> (0, R)
        if (dist < hs) {
            return { x: 0, y: (H - R) - dist };
        }
        dist -= hs;

        // 8. Sol üst köşe yayı: merkez (R, R), açı pi -> 3pi/2 (-pi/2)
        const phi = Math.PI + (Math.min(dist, rArc) / rArc) * (Math.PI / 2);
        return { x: R + R * Math.cos(phi), y: R + R * Math.sin(phi) };
    },

    // Geometrik Yardımcı: (x, y) noktasının yuvarlatılmış dikdörtgen çevresindeki en yakın s mesafesini hesaplar
    getClosestPerimeterDistance(x, y, W, H, R) {
        const ws = Math.max(0, W - 2 * R);
        const hs = Math.max(0, H - 2 * R);
        const rArc = 0.5 * Math.PI * R;
        const totalP = 2 * (ws + hs) + 4 * rArc;

        if (totalP <= 0) return 0;

        // 1. Köşe bölgeleri kontrolü
        // Sağ üst köşe
        if (x > W - R && y < R) {
            const phi = Math.atan2(y - R, x - (W - R));
            const norm = Math.max(0, Math.min(1, (phi + Math.PI / 2) / (Math.PI / 2)));
            return ws + norm * rArc;
        }
        // Sağ alt köşe
        if (x > W - R && y > H - R) {
            const phi = Math.atan2(y - (H - R), x - (W - R));
            const norm = Math.max(0, Math.min(1, phi / (Math.PI / 2)));
            return ws + rArc + hs + norm * rArc;
        }
        // Sol alt köşe
        if (x < R && y > H - R) {
            const phi = Math.atan2(y - (H - R), x - R);
            const norm = Math.max(0, Math.min(1, (phi - Math.PI / 2) / (Math.PI / 2)));
            return 2 * ws + 2 * rArc + hs + norm * rArc;
        }
        // Sol üst köşe
        if (x < R && y < R) {
            const phi = Math.atan2(y - R, x - R);
            const norm = Math.max(0, Math.min(1, (phi + Math.PI) / (Math.PI / 2)));
            return 2 * ws + 3 * rArc + 2 * hs + norm * rArc;
        }

        // 2. Düz kenarlar kontrolü (en yakın kenarı bul)
        const dTop = Math.abs(y);
        const dBottom = Math.abs(y - H);
        const dLeft = Math.abs(x);
        const dRight = Math.abs(x - W);
        const minD = Math.min(dTop, dBottom, dLeft, dRight);

        if (minD === dTop) {
            const clampedX = Math.max(R, Math.min(W - R, x));
            return clampedX - R;
        }
        if (minD === dRight) {
            const clampedY = Math.max(R, Math.min(H - R, y));
            return ws + rArc + (clampedY - R);
        }
        if (minD === dBottom) {
            const clampedX = Math.max(R, Math.min(W - R, x));
            return ws + 2 * rArc + hs + ((W - R) - clampedX);
        }
        // dLeft
        const clampedY = Math.max(R, Math.min(H - R, y));
        return 2 * ws + 3 * rArc + hs + ((H - R) - clampedY);
    },

    // Kart durumu yardımcısı
    getCardState(card, rect, radius, isCompanion = false) {
        let state = this.cardStates.get(card);
        if (!state) {
            const W = rect.width;
            const ws = Math.max(0, W - 2 * radius);
            const hs = Math.max(0, rect.height - 2 * radius);
            const rArc = 0.5 * Math.PI * radius;
            const totalP = 2 * (ws + hs) + 4 * rArc;

            // Başlangıç noktası: Ana kart üst-ortadan (ws * 0.5), eşlikçi kart hafif faz farkıyla başlar
            const initialS = isCompanion ? (ws * 0.5 + totalP * 0.35) % totalP : (ws * 0.5);
            const initialPt = this.getPerimeterPoint(initialS, rect.width, rect.height, radius);

            state = {
                s: initialS,
                currentX: initialPt.x,
                currentY: initialPt.y,
                currentOpacity: this.AMBIENT_OPACITY,
                targetOpacity: this.AMBIENT_OPACITY,
                isTracking: false
            };
            this.cardStates.set(card, state);
        }
        return state;
    },

    loop(timestamp) {
        this.rafId = null;

        // Masaüstü ekran ve profil sahnesi aktifliği kontrolü
        const stage = document.getElementById('profileStage');
        if (window.innerWidth < 900 || !this.cardContainer || !stage || stage.style.display === 'none') {
            if (this.cardContainer && this.cardContainer.style.transform) {
                this.cardContainer.style.transform = '';
            }
            this.isRunning = false;
            return;
        }

        const dt = this.lastFrameTime ? Math.min((timestamp - this.lastFrameTime) / 1000, 0.1) : 0.016;
        this.lastFrameTime = timestamp;

        const isCompanionOpen = stage.classList.contains('has-companion-open');
        const isTransitioning = typeof Router !== 'undefined' && Router._companionTransitioning;
        const isFlipped = (typeof Router !== 'undefined' && Router.isFlipped);

        // ========================================================
        // 1. 3D TILT MOTORU GÜNCELLEMESİ (DİNAMİK MESAFE DUYARLI)
        // Kart üzerindeyken tıklama stabilitesi (minTilt: 3.2°),
        // karttan uzaklaştıkça artan derinlikli sahne perspektifi (maxTilt: 8.5°)
        // ========================================================
        const canTilt = !isCompanionOpen && !isTransitioning && !isFlipped;
        let targetTiltX = 0;
        let targetTiltY = 0;

        if (canTilt) {
            const mainRect = this.cardContainer.getBoundingClientRect();
            const mainDx = Math.max(mainRect.left - this.clientMouseX, 0, this.clientMouseX - mainRect.right);
            const mainDy = Math.max(mainRect.top - this.clientMouseY, 0, this.clientMouseY - mainRect.bottom);
            const mainDist = this.mouseInWindow ? Math.hypot(mainDx, mainDy) : Infinity;

            // Mesafe eğrisi: 0px (kart üstünde) -> 350px (uzakta)
            const distFactor = Math.min(mainDist / 350, 1);
            const effectiveMaxTilt = this.minTilt + distFactor * (this.maxTilt - this.minTilt);

            targetTiltX = -this.mouseY * effectiveMaxTilt;
            targetTiltY = this.mouseX * effectiveMaxTilt;
        }

        this.currentTiltX += (targetTiltX - this.currentTiltX) * this.lerpSpeed;
        this.currentTiltY += (targetTiltY - this.currentTiltY) * this.lerpSpeed;

        const diffTiltX = Math.abs(targetTiltX - this.currentTiltX);
        const diffTiltY = Math.abs(targetTiltY - this.currentTiltY);
        const isTiltConverged = diffTiltX < 0.005 && diffTiltY < 0.005;

        if (isTiltConverged) {
            this.currentTiltX = targetTiltX;
            this.currentTiltY = targetTiltY;
        }

        if (isCompanionOpen && !isTransitioning && isTiltConverged) {
            this.cardContainer.style.transform = 'translateZ(0px) rotateX(0deg) rotateY(0deg)';
        } else {
            this.cardContainer.style.transform = `rotateX(${this.currentTiltX.toFixed(2)}deg) rotateY(${this.currentTiltY.toFixed(2)}deg)`;
        }

        // ========================================================
        // 2. SPOTLIGHT (MOUSE TAKİP / OTONOM ORBİT) MOTORU
        // ========================================================
        const cards = document.querySelectorAll('#cardContainer, .companion-card');

        cards.forEach(card => {
            if (card.offsetParent === null) return;
            const rect = card.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;

            const isMainCard = (card === this.cardContainer || card.id === 'cardContainer');
            const radius = parseFloat(getComputedStyle(card).borderRadius) || 24;
            const W = rect.width;
            const H = rect.height;
            const ws = Math.max(0, W - 2 * radius);
            const hs = Math.max(0, H - 2 * radius);
            const rArc = 0.5 * Math.PI * radius;
            const totalPerimeter = 2 * (ws + hs) + 4 * rArc;

            const state = this.getCardState(card, rect, radius, !isMainCard);

            // Fare ile bu kart arasındaki mesafe
            const dx = Math.max(rect.left - this.clientMouseX, 0, this.clientMouseX - rect.right);
            const dy = Math.max(rect.top - this.clientMouseY, 0, this.clientMouseY - rect.bottom);
            const dist = this.mouseInWindow ? Math.hypot(dx, dy) : Infinity;

            // Kural: Mouse takibi SADECE kartın tilt mekanizmasının çalıştığı ortamda (ön yüz, eşlikçi yok)
            // ve fare kartın menzilindeyken geçerlidir
            const shouldTrackMouse = canTilt && isMainCard && (dist < this.PROXIMITY_PX);

            if (shouldTrackMouse) {
                // ----------------------------------------------------
                // MOD A: FARE TAKİBİ (INTERACTIVE MOUSE TRACKING)
                // ----------------------------------------------------
                const targetX = this.clientMouseX - rect.left;
                const targetY = this.clientMouseY - rect.top;

                // Işık pürüzsüzce fare koordinatına akar (lerp)
                state.currentX += (targetX - state.currentX) * 0.22;
                state.currentY += (targetY - state.currentY) * 0.22;

                // Işığın kart çevresindeki en yakın s konumunu an be an güncelle (ayrılma durumunda kesintisiz devam için)
                state.s = this.getClosestPerimeterDistance(state.currentX, state.currentY, W, H, radius);

                const proximity = Math.pow(1 - (dist / this.PROXIMITY_PX), 1.2);
                state.targetOpacity = Math.max(proximity, 0.0);
                state.isTracking = true;
            } else {
                // ----------------------------------------------------
                // MOD B: OTONOM ÇEVRE DÖNÜŞÜ (BORDER ORBITING)
                // (Kart arkası çevrildiğinde, eşlikçi kart açıldığında veya fare uzaklaştığında)
                // ----------------------------------------------------
                state.isTracking = false;

                // Farenin bıraktığı veya en son kalınan s noktasından saat yönünde ilerle
                state.s = (state.s + this.ORBIT_SPEED * dt) % totalPerimeter;
                const orbitPt = this.getPerimeterPoint(state.s, W, H, radius);

                // Işık yumuşakça orbit yoluna bağlanır ve kenar boyunca süzülür
                state.currentX += (orbitPt.x - state.currentX) * 0.18;
                state.currentY += (orbitPt.y - state.currentY) * 0.18;

                // Opasite kuralı:
                // Kart üzerindeyken (hover) tepe parlaklık (0.98), uzaktayken canlı ambient parlaklık (0.82)
                if (dist === 0) {
                    state.targetOpacity = this.ACTIVE_OPACITY;
                } else if (dist < this.PROXIMITY_PX) {
                    const proxFactor = 1 - (dist / this.PROXIMITY_PX);
                    state.targetOpacity = this.AMBIENT_OPACITY + proxFactor * (this.ACTIVE_OPACITY - this.AMBIENT_OPACITY);
                } else {
                    state.targetOpacity = this.AMBIENT_OPACITY;
                }
            }

            // Opasite geçişi pürüzsüzleştirilir
            state.currentOpacity += (state.targetOpacity - state.currentOpacity) * 0.12;

            // CSS Değişkenlerini Karta Uygula
            card.style.setProperty('--card-mouse-x', `${state.currentX.toFixed(1)}px`);
            card.style.setProperty('--card-mouse-y', `${state.currentY.toFixed(1)}px`);
            card.style.setProperty('--card-border-proximity', state.currentOpacity.toFixed(3));
        });

        // Yaşayan animasyon döngüsü kesintisiz devam eder
        this.rafId = requestAnimationFrame((ts) => this.loop(ts));
    }
};
// #endregion
