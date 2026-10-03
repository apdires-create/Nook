// #region 1: SUPABASE PROFİL VERİ ÇEKME MOTORU (DATA FETCHING)
async function tumVerileriCek() {
    if (!KULLANICI_ADI || !supabaseClient) {
        yuklemeHataDurumunuGoster("Veritabanı bağlantısı kurulamadı veya kullanıcı adı bulunamadı.");
        return false;
    }

    // 1. Yerel önbellekte veri varsa ekrana anında yansıt (0ms bekleme)
    const onbellektenGeldi = yerelOnbellekYukle();

    try {
        const { data: profil, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .ilike('kullanici_adi', KULLANICI_ADI)
            .single();

        if (error || !profil) {
            if (!onbellektenGeldi) {
                console.warn("Profil bulunamadı:", error?.message);
                yuklemeHataDurumunuGoster("Aradığınız kullanıcı bulunamadı veya profil henüz oluşturulmamış.");
                return false;
            }
            console.warn("Ağdan profil güncellenemedi, mevcut yerel önbellek gösteriliyor:", error?.message);
            return true;
        }

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

        const guvenliDizi = (v) => {
            if (!v) return [];
            if (typeof v === 'string') {
                try {
                    const parsed = JSON.parse(v);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            }
            return Array.isArray(v) ? v : [];
        };

        // Yeni veritabanı şemasına göre kartVerisi'ni doldur
        kartVerisi.auth_id = profil.auth_id;
        kartVerisi.kullanici_adi = profil.kullanici_adi;
        kartVerisi.front_data = guvenliObje(profil.front_data);
        kartVerisi.links = guvenliDizi(profil.links);
        const rawTops = guvenliObje(profil.tops);
        let normalizeTops = { aktifListeId: null, listeler: [] };

        if (rawTops && Array.isArray(rawTops.listeler)) {
            // Zaten yeni formatta
            normalizeTops.listeler = rawTops.listeler.map((l, lIdx) => ({
                id: l.id || ('list_' + (lIdx + 1)),
                kategori: l.kategori || 'Favorilerim',
                tur: l.tur || 'film',
                harici_link: l.harici_link || null,
                ogeler: Array.isArray(l.ogeler) ? l.ogeler.map((item, i) => ({
                    id: item.id || item.kimlik || ('top_' + (i + 1)),
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
                })) : []
            }));
            normalizeTops.aktifListeId = rawTops.aktifListeId || normalizeTops.listeler[0]?.id || null;
        } else if (rawTops && (rawTops.kategori || Array.isArray(rawTops.ogeler))) {
            // Eski tekil tops formatını yeni çoklu listeler formatına göç ettir
            const tekilListe = {
                id: 'list_1',
                kategori: rawTops.kategori || 'Favorilerim',
                tur: rawTops.tur || 'film',
                harici_link: rawTops.harici_link || null,
                ogeler: Array.isArray(rawTops.ogeler) ? rawTops.ogeler.map((item, i) => ({
                    id: item.id || item.kimlik || ('top_' + (i + 1)),
                    baslik: item.baslik || '',
                    aciklama: item.aciklama || '',
                    afis_url: item.afis_url || item.gorsel_url || null,
                    yil: item.yil || null,
                    skor: item.skor || null
                })) : []
            };
            normalizeTops.listeler = [tekilListe];
            normalizeTops.aktifListeId = 'list_1';
        }

        kartVerisi.tops = normalizeTops;
        kartVerisi.trophies = guvenliDizi(profil.trophies);
        kartVerisi.widgets = guvenliDizi(profil.widgets);
        kartVerisi.working_on = guvenliObje(profil.working_on);
        kartVerisi.theme_config = guvenliObje(profil.theme_config);

        // Sahip kontrolü
        if (aktifKullaniciOturumu && profil.auth_id === aktifKullaniciOturumu.user.id) {
            isOwner = true;
            document.body.classList.add('is-owner');
        } else {
            isOwner = false;
            document.body.classList.remove('is-owner');
        }

        // Tema rengini uygula (varsa)
        if (kartVerisi.theme_config?.primary_color) {
            document.documentElement.style.setProperty('--accent-color', kartVerisi.theme_config.primary_color);
        }

        const loadingUserEl = document.getElementById('app-loading-user');
        if (loadingUserEl) {
            loadingUserEl.classList.add('is-loaded');
        }

        // Yerel önbelleği güncelle ve görselleri önceden yükle
        yerelOnbellekKaydet(kartVerisi);
        tumGorselleriPreloadEt(kartVerisi);

        // Arayüzü yeni verilerle çiz
        if (typeof RenderEngine !== 'undefined') {
            RenderEngine.vitrinCiz(kartVerisi);
            RenderEngine.menuCiz(kartVerisi);
            RenderEngine.altEkranlariCiz(kartVerisi);
        }

        // Canlı Widget Skorlarını Asenkron Sorgula (Non-blocking)
        const mtWidget = Array.isArray(kartVerisi.widgets) 
            ? kartVerisi.widgets.find(w => w && w.tur === 'monkeytype')
            : null;

        if (mtWidget) {
            const mtUser = mtWidget.ayarlar?.kullanici || mtWidget.kullanici || mtWidget.username;
            if (mtUser) {
                canliMonkeytypeVerisiCek(mtUser).then(skorlar => {
                    if (skorlar) {
                        kartVerisi.canli_monkeytype = skorlar;
                        if (typeof RenderEngine !== 'undefined') {
                            RenderEngine.monkeytypeGuncelle(skorlar);
                        }
                    }
                });
            }
        }

        return true;
    } catch (err) {
        console.error("Veriler çekilirken beklenmeyen hata:", err);
        yuklemeHataDurumunuGoster("Profil yüklenirken bir sorun meydana geldi.");
        return false;
    }
}
// #endregion

// #region 2: CANLI WIDGET VERİLERİ (MONKEYTYPE API)
async function canliMonkeytypeVerisiCek(kullanici) {
    if (!kullanici) return null;
    try {
        const res = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(kullanici)}/profile`);
        if (res.ok) {
            const json = await res.json();
            if (json.data && json.data.personalBests) {
                return json.data.personalBests;
            }
        }
    } catch (err) {
        console.warn("Monkeytype profili API'den doğrudan çekilemedi:", err);
    }
    return null;
}
// #endregion

// #region 3: HATA VE BULUNAMADI DURUMU
function yuklemeHataDurumunuGoster(mesaj) {
    document.documentElement.classList.remove('is-profile-loading');
    const profileStage = document.getElementById('profileStage');
    const cardContainer = document.getElementById('cardContainer');
    const appLoadingEl = document.getElementById('app-loading-screen');
    const loadingUserEl = document.getElementById('app-loading-user');
    const errorHintEl = document.getElementById('app-loading-error-hint');
    const loadingBrandEl = document.getElementById('app-loading-brand');

    if (profileStage) profileStage.style.display = 'none';
    if (cardContainer) cardContainer.style.display = 'none';
    if (!appLoadingEl) return;

    appLoadingEl.classList.add('is-error');
    appLoadingEl.style.display = 'flex';
    appLoadingEl.classList.remove('is-hidden');

    if (loadingUserEl) {
        loadingUserEl.textContent = mesaj || "Aradığınız kullanıcı bulunamadı.";
        loadingUserEl.classList.remove('is-loaded');
    }

    if (errorHintEl) {
        errorHintEl.textContent = "Ana sayfaya dönmek için Nook logosuna tıklayın";
    }

    if (loadingBrandEl) {
        loadingBrandEl.title = "Ana Sayfaya Dön";
        loadingBrandEl.style.cursor = "pointer";
        loadingBrandEl.onclick = () => {
            window.location.href = window.location.pathname;
        };
    }
}
// #endregion

// #region 4: İÇERİK ARAMA SERVİSİ (SUPABASE EDGE FUNCTION)
async function icerikAra(aramaMetni, aramaTuru) {
    if (!aramaMetni || !aramaMetni.trim()) return [];
    const query = aramaMetni.trim();
    const tur = (aramaTuru || 'film').toLowerCase();

    if (!supabaseClient || typeof supabaseClient.functions === 'undefined') {
        console.warn("Supabase Functions servisi bulunamadı.");
        return [];
    }

    try {
        const { data, error } = await supabaseClient.functions.invoke('bright-task', {
            body: {
                action: 'search',
                arama_metni: query,
                arama_turu: tur
            }
        });

        if (error) {
            console.error("Supabase Functions arama hatası:", error);
            return [];
        }

        if (data && Array.isArray(data.sonuclar)) {
            return data.sonuclar.map(item => ({
                id: item.id || item.kimlik,
                baslik: item.baslik || 'Bilinmeyen Yapım',
                afis_url: item.afis_url || item.gorsel_url || null,
                skor: item.skor || null,
                yil: item.yil || null,
                aciklama: item.aciklama || item.seri || item.yazar || '',
                yonetmen: item.yonetmen || null,
                yayinci: item.yayinci || null,
                studyo: item.studyo || null,
                seri: item.seri || null,
                yazar: item.yazar || null
            }));
        }
    } catch (err) {
        console.error("Supabase Functions arama çağrısı sırasında hata oluştu:", err);
    }

    return [];
}
// #endregion

// #region 5: YEREL ÖNBELLEK VE GÖRSEL PRELOAD MOTORU (LOCALSTORAGE & PRELOAD ENGINE)
window._nookImagePreloadCache = window._nookImagePreloadCache || new Map();

function yerelOnbellekVarMi() {
    if (!KULLANICI_ADI) return false;
    try {
        const raw = localStorage.getItem('nook_profile_' + KULLANICI_ADI);
        return !!raw;
    } catch {
        return false;
    }
}

function yerelOnbellekYukle() {
    if (!KULLANICI_ADI) return false;
    try {
        const raw = localStorage.getItem('nook_profile_' + KULLANICI_ADI);
        if (!raw) return false;
        const profil = JSON.parse(raw);
        if (!profil || typeof profil !== 'object') return false;

        // kartVerisi nesnesini yerel verilerle doldur
        Object.assign(kartVerisi, profil);

        // Sahip kontrolü
        if (typeof aktifKullaniciOturumu !== 'undefined' && aktifKullaniciOturumu && profil.auth_id === aktifKullaniciOturumu.user.id) {
            isOwner = true;
            document.body.classList.add('is-owner');
        } else {
            isOwner = false;
            document.body.classList.remove('is-owner');
        }

        // Tema rengini uygula (varsa)
        if (kartVerisi.theme_config?.primary_color) {
            document.documentElement.style.setProperty('--accent-color', kartVerisi.theme_config.primary_color);
        }

        const loadingUserEl = document.getElementById('app-loading-user');
        if (loadingUserEl) {
            loadingUserEl.classList.add('is-loaded');
        }

        // Arayüzü önbellekten hemen çiz
        if (typeof RenderEngine !== 'undefined') {
            RenderEngine.vitrinCiz(kartVerisi);
            RenderEngine.menuCiz(kartVerisi);
            RenderEngine.altEkranlariCiz(kartVerisi);
            if (kartVerisi.tops) {
                RenderEngine.companionCiz(kartVerisi.tops);
            }
        }

        // Görselleri arka planda yüklemeye başla (non-blocking)
        tumGorselleriPreloadEt(kartVerisi);

        return true;
    } catch (err) {
        console.warn("Yerel önbellek okunurken hata:", err);
        return false;
    }
}

function yerelOnbellekKaydet(veri) {
    if (!KULLANICI_ADI || !veri) return;
    try {
        localStorage.setItem('nook_profile_' + KULLANICI_ADI, JSON.stringify(veri));
    } catch (err) {
        console.warn("Yerel önbelleğe kaydedilemedi:", err);
    }
}

function guvenliGorselOnbellegeKaydet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // LocalStorage kota aşımı durumunda eski görsel kayıtlarını temizle ve tekrar dene
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('nook_img_')) {
                    keysToRemove.push(k);
                }
            }
            keysToRemove.slice(0, Math.ceil(keysToRemove.length / 2)).forEach(k => localStorage.removeItem(k));
            localStorage.setItem(key, value);
        } catch {
            // Depolama tamamen doluysa sessizce devam et
        }
    }
}

function gorseliOnbellegeAl(url) {
    if (!url || typeof url !== 'string') return;
    const temizUrl = url.trim();
    if (!temizUrl.startsWith('http://') && !temizUrl.startsWith('https://')) return;

    // 1. Tarayıcı Bellek Ön Yüklemesi (RAM Texture Cache)
    if (!window._nookImagePreloadCache.has(temizUrl)) {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.decoding = 'async';
        img.src = temizUrl;
        window._nookImagePreloadCache.set(temizUrl, img);
    }

    // 2. LocalStorage Base64 Kalıcı Önbellek (Non-blocking arka plan)
    const storageKey = 'nook_img_' + temizUrl;
    try {
        if (localStorage.getItem(storageKey)) return;
    } catch {}

    fetch(temizUrl, { mode: 'cors' })
        .then(res => {
            if (!res.ok) throw new Error('Ağ yanıtı başarısız');
            return res.blob();
        })
        .then(blob => {
            // 1.5MB'den büyük görselleri localStorage kotasını korumak için atla
            if (blob.size > 1500000) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result && typeof reader.result === 'string') {
                    guvenliGorselOnbellegeKaydet(storageKey, reader.result);
                }
            };
            reader.readAsDataURL(blob);
        })
        .catch(() => {
            // CORS kısıtı olan görseller Image() nesnesiyle tarayıcı HTTP önbelleğinde zaten tutulur
        });
}

function tumGorselleriPreloadEt(veri) {
    if (!veri || typeof veri !== 'object') return;
    const urls = new Set();

    // Vitrin görselleri (Avatar & Banner)
    if (veri.front_data?.banner_url) urls.add(veri.front_data.banner_url);
    if (veri.front_data?.pfp_url) urls.add(veri.front_data.pfp_url);
    if (veri.front_data?.avatar_url) urls.add(veri.front_data.avatar_url);

    // Tops kürasyon afişleri (Tüm listeler)
    if (veri.tops && Array.isArray(veri.tops.listeler)) {
        veri.tops.listeler.forEach(l => {
            if (Array.isArray(l.ogeler)) {
                l.ogeler.forEach(item => {
                    const afis = item.afis_url || item.gorsel_url;
                    if (afis) urls.add(afis);
                });
            }
        });
    }

    // Asenkron ve paralel olarak tüm görselleri önceden yükle
    urls.forEach(url => gorseliOnbellegeAl(url));
}
// #endregion
