// #region 1: İSTEĞE BAĞLI PROFİL ALANLARI (GAMING / WIDGETS / TROPHIES / SHOWCASE)
// Ziyaretçi ve sahip için ortak, salt-okunur alan durumu motoru.
// Sahibe özel ekleme / kaldırma / kaydetme mantığı edit.js içindeki EditManager.Sections modülündedir.
const SectionManager = {
    // Flag'lerin sabit görsel sırası
    TUM_ALANLAR: ['gaming', 'widgets', 'achievements', 'showcase'],

    // Alan ID'si -> flag buton ID'si
    FLAG_IDLERI: {
        gaming: 'triggerTrophiesBtn',
        widgets: 'triggerWidgetsBtn',
        achievements: 'triggerAchievementsBtn',
        showcase: 'triggerShowcaseBtn'
    },

    _kart(kart) {
        return kart || (typeof kartVerisi !== 'undefined' ? kartVerisi : null) || {};
    },

    // Alanın içinde gösterilecek içerik var mı? (aktif_alanlar tanımsız eski profiller için göç kuralı)
    _icerikVarMi(kart, id) {
        const k = this._kart(kart);
        const doluDizi = (v) => Array.isArray(v) && v.some(x => x && typeof x === 'object');
        switch (id) {
            case 'gaming': return doluDizi(k.gaming);
            case 'widgets': return doluDizi(k.widgets);
            case 'achievements': return doluDizi(k.trophies);
            case 'showcase': return Array.isArray(k.tops?.listeler) && k.tops.listeler.length > 0;
            default: return false;
        }
    },

    // Kayıtlı bir alan listesi var mı? (yoksa içerikten çıkarılır)
    kayitliMi(kart) {
        const k = this._kart(kart);
        return Array.isArray(k.front_data?.aktif_alanlar);
    },

    // İçerikten çıkarılmış alan listesi
    icerikten(kart) {
        return this.TUM_ALANLAR.filter(id => this._icerikVarMi(kart, id));
    },

    // Aktif alanları sabit sırada döndürür
    aktifAlanlariAl(kart) {
        const k = this._kart(kart);
        if (this.kayitliMi(k)) {
            const set = new Set(k.front_data.aktif_alanlar);
            return this.TUM_ALANLAR.filter(id => set.has(id));
        }
        return this.icerikten(k);
    },

    alanAktifMi(id, kart) {
        const normal = (id === 'trophies') ? 'gaming' : id;
        return this.aktifAlanlariAl(kart).includes(normal);
    },

    // Mobil swipe destesi: pasif alanlar çıkarılır, 'main' her zaman kalır
    desteSirasi(kart) {
        const aktif = new Set(this.aktifAlanlariAl(kart));
        return ['achievements', 'widgets', 'gaming', 'main', 'showcase'].filter(p => p === 'main' || aktif.has(p));
    },

    // 4 flag'in görünürlüğünü ve sahip için "+" flag'ini günceller
    flaglariGuncelle(kart) {
        const aktif = this.aktifAlanlariAl(kart);
        this.TUM_ALANLAR.forEach(id => {
            const btn = document.getElementById(this.FLAG_IDLERI[id]);
            if (btn) btn.hidden = !aktif.includes(id);
        });

        const isUserOwner = (typeof isOwner !== 'undefined' && isOwner);
        const addBtn = document.getElementById('triggerAddSectionBtn');
        if (addBtn) addBtn.hidden = !isUserOwner || aktif.length >= this.TUM_ALANLAR.length;

        // Açık olan bir kanat artık pasifse kapat
        const stage = document.getElementById('profileStage');
        if (stage && stage.classList.contains('has-companion-open') && typeof Router !== 'undefined') {
            const acikAlan = stage.classList.contains('is-showcase-active')
                ? 'showcase'
                : (window._activeLeftWingMode || 'gaming');
            if (!aktif.includes(acikAlan)) {
                Router.toggleCompanion(false);
            }
        }

        if (typeof checkRibbonOverflow === 'function') checkRibbonOverflow();
    }
};
window.SectionManager = SectionManager;
// #endregion
