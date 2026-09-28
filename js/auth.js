// #region 1: DURUM DEĞİŞKENLERİ VE HATA YÖNETİMİ
let isLoginMode = true;
let hataliGirisDenemesi = 0;
let girisKilitliMi = false;
let turnstileToken = null;

function turnstileTokenAlindi(token) {
    turnstileToken = token;
}

function turnstileHata() {
    turnstileToken = null;
}

function turnstileSuresiDoldu() {
    turnstileToken = null;
}

const turnstileWidgetIds = {};

function turnstileSifirla(hedefId = null) {
    turnstileToken = null;
    if (!window.turnstile) return;
    try {
        if (hedefId && turnstileWidgetIds[hedefId] !== undefined) {
            window.turnstile.reset(turnstileWidgetIds[hedefId]);
        } else {
            window.turnstile.reset();
        }
    } catch (err) {
        console.warn('Turnstile reset sırasında hata:', err);
    }
}

function turnstileWidgetiHazirla(hedefId = 'auth-turnstile') {
    const widget = document.getElementById(hedefId);
    if (!widget) return;

    const renderEt = () => {
        if (!window.turnstile) return;
        try {
            if (turnstileWidgetIds[hedefId] !== undefined) {
                window.turnstile.reset(turnstileWidgetIds[hedefId]);
                turnstileToken = null;
                return;
            }

            const widgetId = window.turnstile.render('#' + hedefId, {
                sitekey: '0x4AAAAAAFGojYtbrPQuD8-O',
                callback: turnstileTokenAlindi,
                'error-callback': turnstileHata,
                'expired-callback': turnstileSuresiDoldu,
                theme: 'dark'
            });

            turnstileWidgetIds[hedefId] = widgetId;
        } catch (err) {
            console.warn('Turnstile render hatası:', err);
        }
    };

    if (window.turnstile) {
        renderEt();
    } else {
        const timer = setInterval(() => {
            if (window.turnstile) {
                clearInterval(timer);
                renderEt();
            }
        }, 100);
        setTimeout(() => clearInterval(timer), 4000);
    }
}

function authMesajGoster(mesaj, tur = 'error') {
    document.querySelectorAll('.auth-error-box').forEach(box => {
        box.textContent = mesaj;
        box.style.display = 'block';
        box.classList.toggle('auth-success-box', tur === 'success');
        box.classList.toggle('is-visible', true);

        if (tur === 'success') {
            box.classList.remove('shake-box-animation');
            box.classList.add('success-box-animation');
            setTimeout(() => box.classList.remove('success-box-animation'), 400);
        } else {
            box.classList.remove('success-box-animation');
            box.classList.add('shake-box-animation');
            setTimeout(() => box.classList.remove('shake-box-animation'), 400);
        }
    });
}

function authHataGoster(mesaj) {
    authMesajGoster(mesaj, 'error');
}

function authBasariGoster(mesaj) {
    authMesajGoster(mesaj, 'success');
}

function authHataTemizle() {
    document.querySelectorAll('.auth-error-box').forEach(box => {
        box.textContent = '';
        box.style.display = 'none';
        box.classList.remove('is-visible', 'auth-success-box', 'shake-box-animation', 'success-box-animation');
    });
}
// #endregion

// #region 2: OTURUM KONTROLÜ (SESSION CHECK)
async function oturumuKontrolEt() {
    if (!supabaseClient) return;
    try {
        let user = null;
        let session = null;

        // 1. URL'de onay bağlantısı hatası var mı kontrol et (#error=access_denied&error_description=...)
        if (window.location.hash && window.location.hash.includes('error=')) {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const errorDesc = hashParams.get('error_description') || "Doğrulama bağlantısı geçersiz veya süresi dolmuş.";
            const temizMesaj = decodeURIComponent(errorDesc.replace(/\+/g, ' '));
            console.warn("Auth URL hatası:", temizMesaj);
            authHataGoster(temizMesaj);
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        // Sayfa açılışında veya F5 ile yenilendiğinde oturumu doğrudan sunucuya doğrulat (zombi oturumları temizler)
        const { data: userData, error: userError } = await supabaseClient.auth.getUser();

        if (!userError && userData?.user) {
            user = userData.user;
            const { data: sessionData } = await supabaseClient.auth.getSession();
            session = sessionData?.session || null;
        } else if (userError && userError.name !== 'AuthSessionMissingError') {
            // Sunucu oturumu geçersiz kıldıysa (401, kullanıcı silinmiş, token süresi dolmuş vb.)
            // LocalStorage'daki geçersiz oturum verilerini temizle
            console.warn("Geçersiz oturum tespit edildi, oturum temizleniyor:", userError.message);
            await supabaseClient.auth.signOut().catch(() => {});
        }

        aktifKullaniciOturumu = session;

        if (user) {
            const { data } = await supabaseClient
                .from('profiles')
                .select('kullanici_adi, auth_id')
                .eq('auth_id', user.id)
                .single();

            if (data) {
                aktifKullaniciAdi = data.kullanici_adi;

                if (KULLANICI_ADI && KULLANICI_ADI.toLowerCase() === aktifKullaniciAdi.toLowerCase()) {
                    isOwner = true;
                    document.body.classList.add('is-owner');
                }
            }
        } else {
            aktifKullaniciAdi = null;
            isOwner = false;
            document.body.classList.remove('is-owner');
        }

        authButonMetniniGuncelle();

        // 2. URL'de Supabase onay/oturum hash'i varsa adresi temizle (#access_token=... vb.)
        if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type='))) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        if (!window._authStateListenerRegistered) {
            window._authStateListenerRegistered = true;
            supabaseClient.auth.onAuthStateChange((event, newSession) => {
                aktifKullaniciOturumu = newSession;
                if (event === 'SIGNED_OUT') {
                    aktifKullaniciAdi = null;
                    isOwner = false;
                    document.body.classList.remove('is-owner');
                    authButonMetniniGuncelle();
                }
            });
        }
    } catch (err) {
        console.error("Oturum denetlenirken hata:", err);
    }
}

function authButonMetniniGuncelle() {
    const triggerText = document.getElementById('auth-trigger-text');
    if (!triggerText) return;

    if (aktifKullaniciOturumu) {
        triggerText.textContent = isOwner ? "Çıkış Yap" : "Sayfama Dön";
    } else {
        triggerText.textContent = "Giriş Yap";
    }
}
// #endregion

// #region 3: GİRİŞ VE KAYIT İŞLEMLERİ (SUPABASE AUTH)
async function sistemeGirisYap(email, password) {
    authHataTemizle();
    if (girisKilitliMi) {
        authHataGoster("Çok fazla hatalı deneme yaptın. Lütfen daha sonra tekrar dene.");
        return false;
    }
    if (!email || !password) {
        authHataGoster("Lütfen e-posta ve şifrenizi girin.");
        return false;
    }
    if (password.length < 8) {
        authHataGoster("Şifre en az 8 karakter olmalıdır.");
        return false;
    }
    if (!turnstileToken) {
        authHataGoster("Lütfen doğrulamayı tamamlayın.");
        return false;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken: turnstileToken }
    });
    turnstileSifirla();
    if (error) {
        hataliGirisDenemesi++;
        if (hataliGirisDenemesi >= 5) {
            girisKilitliMi = true;
            authHataGoster("Hatalı deneme limiti aşıldı. Giriş 30 saniye kilitlendi.");
            setTimeout(() => { girisKilitliMi = false; hataliGirisDenemesi = 0; authHataTemizle(); }, 30000);
        } else {
            let hataMesaji = "Giriş Hatası: E-posta veya şifre hatalı.";
            if (error.message.includes("Email not confirmed")) hataMesaji = "Lütfen e-posta adresinizi doğrulayın.";
            authHataGoster(hataMesaji);
        }
        return false;
    }

    const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('kullanici_adi')
        .eq('auth_id', data.user.id)
        .single();

    if (profileData && profileData.kullanici_adi) {
        window.location.href = `?user=${encodeURIComponent(profileData.kullanici_adi)}`;
    } else {
        await supabaseClient.auth.signOut();
        authHataGoster("Bu hesaba ait bir arşiv bulunamadı veya silinmiş. Lütfen yeniden kayıt olun.");
        return false;
    }
    return true;
}

async function sistemeKayitOl(email, password, username) {
    authHataTemizle();
    const temizKullaniciAdi = (username || '').trim();

    if (!temizKullaniciAdi || !email || !password) {
        authHataGoster("Lütfen tüm alanları doldurun.");
        return false;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(temizKullaniciAdi)) {
        authHataGoster("Kullanıcı adı 3-20 karakter olmalı, harf, rakam veya alt çizgi (_) içermelidir.");
        return false;
    }
    if (password.length < 8) {
        authHataGoster("Şifreniz en az 8 karakter olmalıdır.");
        return false;
    }
    if (!turnstileToken) {
        authHataGoster("Lütfen doğrulamayı tamamlayın.");
        return false;
    }

    const { data: existingUser } = await supabaseClient
        .from('profiles')
        .select('kullanici_adi')
        .eq('kullanici_adi', temizKullaniciAdi)
        .maybeSingle();

    if (existingUser) {
        authHataGoster("Bu kullanıcı adı zaten alınmış! Lütfen başka bir isim dene.");
        return false;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: { kullanici_adi: temizKullaniciAdi },
            emailRedirectTo: `${window.location.origin}${window.location.pathname}?user=${encodeURIComponent(temizKullaniciAdi)}`,
            captchaToken: turnstileToken
        }
    });
    turnstileSifirla();

    if (error) {
        let hataMesaji = "Kayıt Hatası: " + error.message;
        if (error.message.includes("rate limit")) hataMesaji = "Çok fazla istek yapıldı. Lütfen biraz bekleyin.";
        authHataGoster(hataMesaji);
        return false;
    }

    if (data?.user) {
        if (data.user.identities && data.user.identities.length === 0) {
            authHataGoster("Bu e-posta adresi zaten kayıtlı! Lütfen giriş yapın.");
            return false;
        }

        const regPass = document.getElementById('auth-password');
        const landPass = document.getElementById('landing-password');
        if (regPass) regPass.value = '';
        if (landPass) landPass.value = '';

        authBasariGoster("Kayıt başarılı! Lütfen gelen kutunu kontrol edip e-posta adresini onayla.");
        return true;
    }

    authHataGoster("Kayıt işlemi tamamlanamadı. Lütfen tekrar deneyin.");
    return false;
}


async function sistemdenCikisYap() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    window.location.href = window.location.pathname;
}
// #endregion

// #region 4: AUTH MODALI BAŞLATMA VE ETKİLEŞİMLER
function authModaliniBaslat() {
    const triggerBtn = document.getElementById('auth-trigger-btn');
    const modal = document.getElementById('auth-modal');
    const backdrop = document.getElementById('auth-modal-backdrop');
    const closeBtn = document.getElementById('auth-modal-close');
    const formContainer = document.getElementById('auth-form-container');
    const loggedInView = document.getElementById('auth-logged-in-view');
    const currentUserText = document.getElementById('auth-current-user');
    const logoutBtn = document.getElementById('auth-logout-btn');
    const title = document.getElementById('auth-title');
    const usernameGroup = document.getElementById('auth-username-group');
    const usernameInput = document.getElementById('auth-username');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const submitBtn = document.getElementById('auth-submit-btn');
    const switchText = document.getElementById('auth-switch-text');
    const switchBtn = document.getElementById('auth-switch-action');

    if (!triggerBtn || !modal) return;

    const modaliAc = () => {
        modal.classList.add('is-open');

        requestAnimationFrame(() => {
            if (!window.turnstile) return;
            const widget = document.getElementById('auth-turnstile');
            if (!widget) return;

            if (widget.dataset.turnstileRendered !== 'true') {
                turnstileWidgetiHazirla();
            } else {
                turnstileSifirla();
            }
        });

        if (aktifKullaniciOturumu) {
            if (formContainer) formContainer.style.display = 'none';
            if (loggedInView) loggedInView.style.display = 'flex';
            if (currentUserText) currentUserText.textContent = aktifKullaniciOturumu.user.email;
        } else {
            if (formContainer) formContainer.style.display = 'flex';
            if (loggedInView) loggedInView.style.display = 'none';
            if (emailInput) setTimeout(() => emailInput.focus(), 50);
        }
    };

    const modaliKapat = () => {
        modal.classList.remove('is-open');
        authHataTemizle();
    };

    triggerBtn.addEventListener('click', () => {
        // Giriş yapmışız ama başkasının profilindeysek, modalı açmak yerine kendi profilimize yönlendir
        if (aktifKullaniciOturumu && !isOwner && aktifKullaniciAdi) {
            window.location.href = `?user=${encodeURIComponent(aktifKullaniciAdi)}`;
            return;
        }

        modaliAc();
    });

    if (closeBtn) closeBtn.addEventListener('click', modaliKapat);
    if (backdrop) backdrop.addEventListener('click', modaliKapat);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) modaliKapat();
    });

    if (switchBtn) {
        switchBtn.addEventListener('click', () => {
            isLoginMode = !isLoginMode;
            authHataTemizle();
            turnstileSifirla('auth-turnstile');
            if (isLoginMode) {
                if (title) title.textContent = 'Giriş Yap';
                if (usernameGroup) usernameGroup.style.display = 'none';
                if (submitBtn) submitBtn.textContent = 'Giriş Yap';
                if (switchText) switchText.textContent = 'Hesabın yok mu?';
                if (switchBtn) switchBtn.textContent = 'Kayıt Ol';
                if (usernameInput) usernameInput.value = '';
            } else {
                if (title) title.textContent = 'Kayıt Ol';
                if (usernameGroup) usernameGroup.style.display = 'flex';
                if (submitBtn) submitBtn.textContent = 'Kayıt Ol';
                if (switchText) switchText.textContent = 'Zaten hesabın var mı?';
                if (switchBtn) switchBtn.textContent = 'Giriş Yap';
            }
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailInput?.value.trim();
            const password = passwordInput?.value.trim();
            if (!email || !password) {
                authHataGoster("E-posta ve şifre zorunludur!");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'İşleniyor...';

            if (isLoginMode) {
                await sistemeGirisYap(email, password);
            } else {
                const username = usernameInput?.value.trim();
                if (!username || username.length < 3) {
                    authHataGoster("Kayıt olmak için en az 3 karakterli bir kullanıcı adı gereklidir!");
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Kayıt Ol';
                    return;
                }
                await sistemeKayitOl(email, password, username);
            }

            submitBtn.disabled = false;
            submitBtn.textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            logoutBtn.disabled = true;
            logoutBtn.textContent = 'Çıkış yapılıyor...';
            await sistemdenCikisYap();
        });
    }

    const deleteAccountBtn = document.getElementById('auth-delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const onay = window.confirm("Tüm arşivini ve hesabını kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.");
            if (!onay) return;

            deleteAccountBtn.disabled = true;
            deleteAccountBtn.textContent = 'Siliniyor...';

            try {
                const authId = aktifKullaniciOturumu.user.id;
                const { data: dosyalar, error: listError } = await supabaseClient.storage
                    .from('avatars-and-banners')
                    .list(authId);

                if (!listError && dosyalar && dosyalar.length > 0) {
                    const silinecekYollar = dosyalar.map(d => `${authId}/${d.name}`);
                    await supabaseClient.storage.from('avatars-and-banners').remove(silinecekYollar);
                }
            } catch (storageErr) {
                console.error('Storage temizliği sırasında hata:', storageErr);
            }

            const { error } = await supabaseClient.rpc('delete_user_account');

            if (error) {
                authHataGoster("Hesap silinirken bir hata oluştu: " + error.message);
                deleteAccountBtn.disabled = false;
                deleteAccountBtn.textContent = 'Hesabımı Kalıcı Olarak Sil';
            } else {
                await sistemdenCikisYap();
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitBtn?.click();
            }
        });
    }
}
// #endregion
