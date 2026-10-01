// #region 1: DURUM DEĞİŞKENLERİ VE HATA YÖNETİMİ
let isLoginMode = true;
let hataliGirisDenemesi = 0;
let girisKilitliMi = false;
let turnstileToken = null;

function turnstileTokenAlindi(token) {
    turnstileToken = token;
    // Onay alındığında kutuyu gizle
    document.querySelectorAll('.cf-turnstile').forEach(el => {
        el.classList.remove('is-active');
    });
}

function turnstileHata() {
    turnstileToken = null;
    document.querySelectorAll('.cf-turnstile').forEach(el => el.classList.remove('is-active'));
}

function turnstileSuresiDoldu() {
    turnstileToken = null;
    document.querySelectorAll('.cf-turnstile').forEach(el => el.classList.remove('is-active'));
}

const turnstileWidgetIds = {};

function turnstileSifirla(hedefId = null) {
    turnstileToken = null;
    document.querySelectorAll('.cf-turnstile').forEach(el => el.classList.remove('is-active'));
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
                // Halihazırda geçerli bir token varsa modu değiştirince sıfırlama yapma
                if (!turnstileToken) {
                    window.turnstile.reset(turnstileWidgetIds[hedefId]);
                }
                widget.classList.remove('is-active');
                return;
            }

            const widgetId = window.turnstile.render('#' + hedefId, {
                sitekey: '0x4AAAAAAFGojYtbrPQuD8-O',
                callback: turnstileTokenAlindi,
                'error-callback': turnstileHata,
                'expired-callback': turnstileSuresiDoldu,
                'before-interactive-callback': () => {
                    // Yalnızca kullanıcıdan manuel etkileşim (tıklama/doğrulama) istendiğinde kutuyu görünür yap
                    widget.classList.add('is-active');
                },
                'after-interactive-callback': () => {
                    // Etkileşim biter bitmez kutuyu tekrar zarifçe kapat
                    setTimeout(() => widget.classList.remove('is-active'), 400);
                },
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

function authMesajGoster(mesaj, tur = 'error', hedefBox = null) {
    const boxes = hedefBox 
        ? (typeof hedefBox === 'string' ? document.querySelectorAll(hedefBox) : [hedefBox])
        : document.querySelectorAll('.auth-error-box');

    boxes.forEach(box => {
        if (!box) return;
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

function authHataGoster(mesaj, hedefBox = null) {
    authMesajGoster(mesaj, 'error', hedefBox);
}

function authBasariGoster(mesaj, hedefBox = null) {
    authMesajGoster(mesaj, 'success', hedefBox);
}

function authHataTemizle(hedefBox = null) {
    const boxes = hedefBox 
        ? (typeof hedefBox === 'string' ? document.querySelectorAll(hedefBox) : [hedefBox])
        : document.querySelectorAll('.auth-error-box');

    boxes.forEach(box => {
        if (!box) return;
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

        // 2. Şifre sıfırlama (Recovery) ve Auth bağlantısı parametrelerini incele
        const hashStr = window.location.hash || '';
        const searchStr = window.location.search || '';
        const urlParams = new URLSearchParams(searchStr);
        const hashParams = new URLSearchParams(hashStr.startsWith('#') ? hashStr.substring(1) : hashStr);

        const isRecoveryParam = urlParams.get('recovery') === 'true';
        const isRecoveryHash = hashStr.includes('type=recovery') || hashParams.get('type') === 'recovery';
        const isPasswordRecovery = isRecoveryParam || isRecoveryHash;

        // PKCE Flow: URL query (?code=...) ile gelindiyse oturuma çevir
        const authCode = urlParams.get('code');
        if (authCode && typeof supabaseClient.auth.exchangeCodeForSession === 'function') {
            try {
                const { data: exchanged, error: exchErr } = await supabaseClient.auth.exchangeCodeForSession(authCode);
                if (exchErr) {
                    console.warn("PKCE code exchange hatası:", exchErr.message);
                } else if (exchanged?.session) {
                    session = exchanged.session;
                    user = exchanged.user || exchanged.session.user;
                }
            } catch (pkceErr) {
                console.warn("PKCE işlemi sırasında hata:", pkceErr);
            }
        }

        // Implicit Flow: URL hash (#access_token=...&refresh_token=...) ile gelindiyse oturumu kaydet
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
            try {
                const { data: setSessionData, error: setSessionErr } = await supabaseClient.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });
                if (setSessionErr) {
                    console.warn("Implicit setSession hatası:", setSessionErr.message);
                } else if (setSessionData?.session) {
                    session = setSessionData.session;
                    user = setSessionData.user || setSessionData.session.user;
                }
            } catch (tokenErr) {
                console.warn("setSession işlemi sırasında hata:", tokenErr);
            }
        }

        // Eğer yukarıdaki el sıkışmalardan oturum gelmediyse yerel/sunucu oturumunu kontrol et
        if (!user) {
            const { data: userData, error: userError } = await supabaseClient.auth.getUser();

            if (!userError && userData?.user) {
                user = userData.user;
                const { data: sessionData } = await supabaseClient.auth.getSession();
                session = sessionData?.session || null;
            } else if (userError && userError.name !== 'AuthSessionMissingError') {
                // Sunucu oturumu geçersiz kıldıysa (401, kullanıcı silinmiş, token süresi dolmuş vb.)
                console.warn("Geçersiz oturum tespit edildi, oturum temizleniyor:", userError.message);
                await supabaseClient.auth.signOut().catch(() => {});
            }
        } else if (!session) {
            const { data: sessionData } = await supabaseClient.auth.getSession();
            session = sessionData?.session || null;
        }

        aktifKullaniciOturumu = session;

        if (user) {
            const { data } = await supabaseClient
                .from('profiles')
                .select('kullanici_adi, auth_id')
                .eq('auth_id', user.id)
                .single();

            if (data && data.kullanici_adi) {
                aktifKullaniciAdi = data.kullanici_adi;
            } else {
                // Profil tablosu henüz yüklenmediyse veya metadata'da varsa yedek isim
                aktifKullaniciAdi = user.user_metadata?.kullanici_adi || (user.email ? user.email.split('@')[0] : 'kullanici');
            }

            // Şifre kurtarma (recovery) ile gelindiyse ve henüz kullanıcının profil sayfasında değilsek,
            // kullanıcıyı doğrudan kendi profil sayfasına yönlendir.
            if (isPasswordRecovery && aktifKullaniciAdi) {
                const currentParam = new URLSearchParams(window.location.search).get('user');
                if (!currentParam || currentParam.toLowerCase() !== aktifKullaniciAdi.toLowerCase()) {
                    window.location.replace(`?user=${encodeURIComponent(aktifKullaniciAdi)}&recovery=true`);
                    return;
                }
            }

            if (aktifKullaniciAdi && KULLANICI_ADI && KULLANICI_ADI.toLowerCase() === aktifKullaniciAdi.toLowerCase()) {
                isOwner = true;
                document.body.classList.add('is-owner');
            }
        } else {
            aktifKullaniciAdi = null;
            isOwner = false;
            document.body.classList.remove('is-owner');
        }

        if (isPasswordRecovery) {
            window.isPasswordRecoveryMode = true;
            setTimeout(() => {
                if (typeof window.authModaliniAc === 'function') {
                    window.authModaliniAc('recovery');
                }
            }, 200);
        }

        authButonMetniniGuncelle();

        // 3. Oturum başarıyla kurulduktan veya kurtarma modu kaydedildikten sonra URL'deki hassas parametreleri temizle
        if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type='))) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        if (urlParams.has('code')) {
            urlParams.delete('code');
            const newSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
            window.history.replaceState(null, '', window.location.pathname + newSearch + window.location.hash);
        }

        if (!window._authStateListenerRegistered) {
            window._authStateListenerRegistered = true;
            supabaseClient.auth.onAuthStateChange((event, newSession) => {
                aktifKullaniciOturumu = newSession;
                if (event === 'SIGNED_OUT') {
                    const oncekiSahip = isOwner;
                    aktifKullaniciAdi = null;
                    isOwner = false;
                    document.body.classList.remove('is-owner');
                    authButonMetniniGuncelle();

                    if (oncekiSahip) {
                        oturumSuresiDolduUyarisi("Oturum süreniz doldu veya oturum sonlandırıldı. Lütfen tekrar giriş yapın.");
                    }
                } else if (event === 'PASSWORD_RECOVERY') {
                    window.isPasswordRecoveryMode = true;
                    if (aktifKullaniciAdi) {
                        const curParam = new URLSearchParams(window.location.search).get('user');
                        if (!curParam || curParam.toLowerCase() !== aktifKullaniciAdi.toLowerCase()) {
                            window.location.replace(`?user=${encodeURIComponent(aktifKullaniciAdi)}&recovery=true`);
                            return;
                        }
                    }
                    if (typeof window.authModaliniAc === 'function') {
                        window.authModaliniAc('recovery');
                    }
                } else if (event === 'TOKEN_REFRESHED') {
                    console.log("Supabase oturum token'ı başarıyla yenilendi.");
                }
            });

            // Sekmeye geri dönüldüğünde arka planda sessiz oturum geçerlilik denetimi
            document.addEventListener('visibilitychange', async () => {
                if (document.visibilityState === 'visible' && isOwner && supabaseClient) {
                    try {
                        const { data: vData, error: vErr } = await supabaseClient.auth.getUser();
                        if (vErr || !vData?.user) {
                            console.warn("Sekmeye dönüşte oturumun geçersiz olduğu anlaşıldı:", vErr?.message);
                            await supabaseClient.auth.signOut().catch(() => {});
                            oturumSuresiDolduUyarisi("Oturum süreniz doldu. Değişiklikleri kaydetmek için lütfen tekrar giriş yapın.");
                        }
                    } catch (e) {
                        console.warn("Visibility auth check hatası:", e);
                    }
                }
            });
        }
    } catch (err) {
        console.error("Oturum denetlenirken hata:", err);
    }
}

function toastBildirimiGoster(mesaj, sure = 3000, tur = 'success') {
    let toast = document.getElementById('nook-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'nook-toast';
        toast.className = 'nook-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = mesaj;
    toast.className = `nook-toast nook-toast-${tur}`;
    toast.classList.add('is-visible');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('is-visible');
    }, sure);
}
window.toastBildirimiGoster = toastBildirimiGoster;

function oturumSuresiDolduUyarisi(mesaj = "Oturum süreniz doldu. Lütfen tekrar giriş yapın.") {
    isOwner = false;
    document.body.classList.remove('is-owner');
    authButonMetniniGuncelle();
    toastBildirimiGoster(mesaj, 5000);

    // Auth modalını giriş modunda otomatik aç
    if (typeof window.authModaliniAc === 'function') {
        window.authModaliniAc('login');
    }
}

function authButonMetniniGuncelle() {
    const loginTrigger = document.getElementById('auth-login-trigger');
    const userMenu = document.getElementById('profile-user-menu');
    const profileUserName = document.getElementById('profile-user-name');

    if (aktifKullaniciOturumu && aktifKullaniciAdi) {
        if (loginTrigger) loginTrigger.style.display = 'none';
        if (userMenu) userMenu.style.display = 'inline-block';
        if (profileUserName) profileUserName.textContent = `@${aktifKullaniciAdi}`;
    } else {
        if (loginTrigger) loginTrigger.style.display = 'inline-flex';
        if (userMenu) userMenu.style.display = 'none';
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
        .ilike('kullanici_adi', temizKullaniciAdi)
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


async function sistemeSifreSifirlamaGonder(email, hedefBox = null) {
    authHataTemizle(hedefBox);
    const temizEmail = (email || '').trim();
    if (!temizEmail) {
        authHataGoster("Lütfen e-posta adresinizi girin.", hedefBox);
        return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(temizEmail)) {
        authHataGoster("Lütfen geçerli bir e-posta adresi girin.", hedefBox);
        return false;
    }

    const redirectTo = `${window.location.origin}${window.location.pathname}?recovery=true`;
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(temizEmail, {
        redirectTo: redirectTo,
        captchaToken: turnstileToken || undefined
    });
    turnstileSifirla();

    if (error) {
        let msg = "Şifre sıfırlama hatası: " + error.message;
        if (error.message.includes("rate limit")) msg = "Çok fazla istek yapıldı. Lütfen biraz bekleyin.";
        authHataGoster(msg, hedefBox);
        return false;
    }

    authBasariGoster("Şifre sıfırlama bağlantısı e-posta adresine gönderildi! Lütfen gelen kutunu kontrol et.", hedefBox);
    return true;
}
window.sistemeSifreSifirlamaGonder = sistemeSifreSifirlamaGonder;

async function sistemeYeniSifreKaydet(yeniSifre, tekrarSifre, hedefBox = '#auth-recovery-error-box') {
    authHataTemizle(hedefBox);
    const sifre = (yeniSifre || '').trim();
    const tekrar = (tekrarSifre || '').trim();

    if (!sifre || !tekrar) {
        authHataGoster("Lütfen her iki şifre alanını da doldurun.", hedefBox);
        return false;
    }
    if (sifre.length < 8) {
        authHataGoster("Yeni şifre en az 8 karakter olmalıdır.", hedefBox);
        return false;
    }
    if (sifre !== tekrar) {
        authHataGoster("Girdiğin şifreler eşleşmiyor.", hedefBox);
        return false;
    }

    const { data, error } = await supabaseClient.auth.updateUser({
        password: sifre
    });

    if (error) {
        authHataGoster("Şifre kaydedilemedi: " + error.message, hedefBox);
        return false;
    }

    authBasariGoster("Şifreniz başarıyla kaydedildi! Sayfa yönlendiriliyor...", hedefBox);
    
    // Kullanıcının profiline yönlendir
    let hedefSayfa = '/';
    try {
        const { data: userData } = await supabaseClient.auth.getUser();
        if (userData?.user?.id) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('kullanici_adi')
                .eq('auth_id', userData.user.id)
                .single();
            if (profile?.kullanici_adi) {
                hedefSayfa = `?user=${encodeURIComponent(profile.kullanici_adi)}`;
            }
        }
    } catch (e) {
        console.warn("Profil yönlendirme tespiti hatası:", e);
    }

    setTimeout(() => {
        window.location.href = hedefSayfa;
    }, 1200);
    return true;
}
window.sistemeYeniSifreKaydet = sistemeYeniSifreKaydet;

async function sistemdenCikisYap() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    window.location.href = window.location.pathname;
}
// #endregion

// #region 4: AUTH MODALI BAŞLATMA VE ETKİLEŞİMLER
function authModaliniBaslat() {
    if (window._authModalInitialized) return;
    window._authModalInitialized = true;

    const loginTriggerBtn = document.getElementById('auth-login-trigger');
    const userTriggerBtn = document.getElementById('profile-user-trigger');
    const userDropdown = document.getElementById('profile-user-dropdown');
    const navAccountBtn = document.getElementById('nav-item-account');
    const navCopyLinkBtn = document.getElementById('nav-item-copy-link');
    const navLogoutBtn = document.getElementById('nav-item-logout');

    const modal = document.getElementById('auth-modal');
    const backdrop = document.getElementById('auth-modal-backdrop');
    const closeBtn = document.getElementById('auth-modal-close');

    // Modaldaki bölümler
    const formContainer = document.getElementById('auth-form-container');
    const forgotContainer = document.getElementById('auth-forgot-container');
    const recoveryContainer = document.getElementById('auth-recovery-container');
    const loggedInView = document.getElementById('auth-logged-in-view');

    // Başlık ve form alanları
    const title = document.getElementById('auth-title');
    const usernameGroup = document.getElementById('auth-username-group');
    const usernameInput = document.getElementById('auth-username');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const auxLinks = document.getElementById('auth-aux-links');
    const submitBtn = document.getElementById('auth-submit-btn');
    const switchText = document.getElementById('auth-switch-text');
    const switchBtn = document.getElementById('auth-switch-action');

    // Şifremi Unuttum elemanları
    const forgotTrigger = document.getElementById('auth-forgot-trigger');
    const forgotEmail = document.getElementById('auth-forgot-email');
    const forgotSubmitBtn = document.getElementById('auth-forgot-submit-btn');
    const forgotBackBtn = document.getElementById('auth-forgot-back-btn');

    // Recovery elemanları
    const recoveryPassword = document.getElementById('auth-recovery-password');
    const recoveryPasswordConfirm = document.getElementById('auth-recovery-password-confirm');
    const recoverySubmitBtn = document.getElementById('auth-recovery-submit-btn');

    // Hesabım elemanları
    const accountDisplayUsername = document.getElementById('account-display-username');
    const accountDisplayEmail = document.getElementById('account-display-email');
    const accountAvatarInitial = document.getElementById('account-avatar-initial');
    const accountPageLink = document.getElementById('account-page-link');
    const accountCopyLinkBtn = document.getElementById('account-copy-link-btn');
    const accountCopyBadge = document.getElementById('account-copy-badge');
    const accountTogglePassBtn = document.getElementById('account-toggle-pass-btn');
    const accountPassSection = document.getElementById('account-password-section');
    const accountNewPassword = document.getElementById('account-new-password');
    const accountConfirmPassword = document.getElementById('account-confirm-password');
    const accountChangePassBtn = document.getElementById('account-change-password-btn');
    const deleteAccountBtn = document.getElementById('auth-delete-account-btn');
    const deleteConfirmBox = document.getElementById('account-delete-confirm-box');
    const deletePasswordInput = document.getElementById('account-delete-password');
    const deleteConfirmBtn = document.getElementById('account-delete-confirm-btn');
    const deleteCancelBtn = document.getElementById('account-delete-cancel-btn');

    if (!modal) return;

    const modaliAc = (mode = 'login') => {
        authHataTemizle();
        modal.classList.add('is-open');

        // Form görünürlüklerini ayarla
        if (formContainer) formContainer.style.display = 'none';
        if (forgotContainer) forgotContainer.style.display = 'none';
        if (recoveryContainer) recoveryContainer.style.display = 'none';
        if (loggedInView) loggedInView.style.display = 'none';

        if (mode === 'account') {
            if (loggedInView) loggedInView.style.display = 'flex';
            if (title) title.textContent = 'Hesabım';

            const uName = aktifKullaniciAdi || (aktifKullaniciOturumu?.user?.email?.split('@')[0]) || 'Kullanıcı';
            const uEmail = aktifKullaniciOturumu?.user?.email || '';

            if (accountDisplayUsername) accountDisplayUsername.textContent = `@${uName}`;
            if (accountDisplayEmail) accountDisplayEmail.textContent = uEmail;
            if (accountAvatarInitial) accountAvatarInitial.textContent = uName.charAt(0).toUpperCase();
            if (accountPageLink) {
                accountPageLink.href = `?user=${encodeURIComponent(uName)}`;
                accountPageLink.style.display = (KULLANICI_ADI && KULLANICI_ADI.toLowerCase() === uName.toLowerCase()) ? 'none' : 'inline-flex';
            }
            if (accountPassSection) accountPassSection.style.display = 'none';
            if (accountTogglePassBtn) accountTogglePassBtn.classList.remove('is-active');
            if (accountNewPassword) accountNewPassword.value = '';
            if (accountConfirmPassword) accountConfirmPassword.value = '';

            // Hesap silme panelini sıfırla
            if (deleteConfirmBox) deleteConfirmBox.style.display = 'none';
            if (deleteAccountBtn) deleteAccountBtn.style.display = 'inline-block';
            if (deletePasswordInput) deletePasswordInput.value = '';
        } else if (mode === 'recovery') {
            if (recoveryContainer) recoveryContainer.style.display = 'flex';
            if (title) title.textContent = 'Yeni Şifre Belirle';
            if (recoveryPassword) recoveryPassword.value = '';
            if (recoveryPasswordConfirm) recoveryPasswordConfirm.value = '';
            setTimeout(() => recoveryPassword?.focus(), 50);
        } else if (mode === 'forgot') {
            if (forgotContainer) forgotContainer.style.display = 'flex';
            if (title) title.textContent = 'Şifre Sıfırlama';
            if (forgotEmail) {
                if (emailInput?.value) forgotEmail.value = emailInput.value;
                setTimeout(() => forgotEmail.focus(), 50);
            }
            requestAnimationFrame(() => {
                if (window.turnstile) turnstileWidgetiHazirla('auth-forgot-turnstile');
            });
        } else {
            // 'login' veya 'register'
            if (formContainer) formContainer.style.display = 'flex';
            isLoginMode = (mode !== 'register');

            if (isLoginMode) {
                if (title) title.textContent = 'Giriş Yap';
                if (usernameGroup) usernameGroup.style.display = 'none';
                if (auxLinks) auxLinks.style.display = 'flex';
                if (submitBtn) submitBtn.textContent = 'Giriş Yap';
                if (switchText) switchText.textContent = 'Hesabın yok mu?';
                if (switchBtn) switchBtn.textContent = 'Kayıt Ol';
            } else {
                if (title) title.textContent = 'Kayıt Ol';
                if (usernameGroup) usernameGroup.style.display = 'flex';
                if (auxLinks) auxLinks.style.display = 'none';
                if (submitBtn) submitBtn.textContent = 'Kayıt Ol';
                if (switchText) switchText.textContent = 'Zaten hesabın var mı?';
                if (switchBtn) switchBtn.textContent = 'Giriş Yap';
            }

            if (emailInput) setTimeout(() => emailInput.focus(), 50);

            requestAnimationFrame(() => {
                if (!window.turnstile) return;
                const widget = document.getElementById('auth-turnstile');
                if (!widget) return;

                if (widget.dataset.turnstileRendered !== 'true') {
                    turnstileWidgetiHazirla('auth-turnstile');
                } else {
                    turnstileSifirla('auth-turnstile');
                }
            });
        }
    };
    window.authModaliniAc = modaliAc;
    window.hesapModaliniAc = () => modaliAc('account');
    window.recoveryModaliniAc = () => modaliAc('recovery');

    const modaliKapat = () => {
        modal.classList.remove('is-open');
        authHataTemizle();
    };

    // Giriş yap butonu (logged-out)
    if (loginTriggerBtn) {
        loginTriggerBtn.addEventListener('click', () => modaliAc('login'));
    }

    // Profil kullanıcı dropdown'ı
    if (userTriggerBtn && userDropdown) {
        userTriggerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            userDropdown.classList.toggle('is-open');
        });
        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target) && !userTriggerBtn.contains(e.target)) {
                userDropdown.classList.remove('is-open');
            }
        });
    }

    const profilLinkiniKopyala = async () => {
        const hedefUser = aktifKullaniciAdi || (typeof KULLANICI_ADI !== 'undefined' ? KULLANICI_ADI : null);
        if (!hedefUser) {
            toastBildirimiGoster("Kopyalanacak profil bulunamadı.", 3000, 'warning');
            return;
        }
        const url = `${window.location.origin}${window.location.pathname}?user=${encodeURIComponent(hedefUser)}`;
        try {
            await navigator.clipboard.writeText(url);
            toastBildirimiGoster("Profil bağlantısı panoya kopyalandı!", 3000, 'success');
            if (accountCopyBadge) {
                accountCopyBadge.textContent = "Kopyalandı!";
                accountCopyBadge.classList.add('is-copied');
                setTimeout(() => {
                    accountCopyBadge.textContent = "Kopyala";
                    accountCopyBadge.classList.remove('is-copied');
                }, 2000);
            }
        } catch (e) {
            console.warn("Clipboard kopyalama hatası:", e);
            toastBildirimiGoster("Bağlantı kopyalanamadı, lütfen tarayıcı adres çubuğunu kullanın.", 3000, 'warning');
        }
    };

    if (navCopyLinkBtn) {
        navCopyLinkBtn.addEventListener('click', () => {
            if (userDropdown) userDropdown.classList.remove('is-open');
            profilLinkiniKopyala();
        });
    }

    if (accountCopyLinkBtn) {
        accountCopyLinkBtn.addEventListener('click', profilLinkiniKopyala);
    }

    if (navAccountBtn) {
        navAccountBtn.addEventListener('click', () => {
            if (userDropdown) userDropdown.classList.remove('is-open');
            modaliAc('account');
        });
    }

    if (navLogoutBtn) {
        navLogoutBtn.addEventListener('click', async () => {
            if (userDropdown) userDropdown.classList.remove('is-open');
            await sistemdenCikisYap();
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', modaliKapat);
    if (backdrop) backdrop.addEventListener('click', modaliKapat);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) modaliKapat();
    });

    // Giriş / Kayıt Geçişi
    if (switchBtn) {
        switchBtn.addEventListener('click', () => {
            authHataTemizle();
            modaliAc(isLoginMode ? 'register' : 'login');
        });
    }

    // Giriş & Kayıt Gönder
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

    // Şifremi Unuttum Bağlantısı & Ekranı
    if (forgotTrigger) {
        forgotTrigger.addEventListener('click', () => modaliAc('forgot'));
    }
    if (forgotBackBtn) {
        forgotBackBtn.addEventListener('click', () => modaliAc('login'));
    }
    if (forgotSubmitBtn) {
        forgotSubmitBtn.addEventListener('click', async () => {
            const email = forgotEmail?.value.trim();
            forgotSubmitBtn.disabled = true;
            forgotSubmitBtn.textContent = 'Gönderiliyor...';
            await sistemeSifreSifirlamaGonder(email, '#auth-forgot-error-box');
            forgotSubmitBtn.disabled = false;
            forgotSubmitBtn.textContent = 'Sıfırlama Bağlantısı Gönder';
        });
    }

    // Şifre Kurtarma (Recovery) Yeni Şifre Gönder
    if (recoverySubmitBtn) {
        recoverySubmitBtn.addEventListener('click', async () => {
            const pass = recoveryPassword?.value;
            const confirm = recoveryPasswordConfirm?.value;
            recoverySubmitBtn.disabled = true;
            recoverySubmitBtn.textContent = 'Kaydediliyor...';
            await sistemeYeniSifreKaydet(pass, confirm, '#auth-recovery-error-box');
            recoverySubmitBtn.disabled = false;
            recoverySubmitBtn.textContent = 'Şifreyi Güncelle ve Giriş Yap';
        });
    }

    // Hesabım: Şifre Değiştir Akordiyon Butonu
    if (accountTogglePassBtn && accountPassSection) {
        accountTogglePassBtn.addEventListener('click', () => {
            const isClosed = accountPassSection.style.display === 'none' || !accountPassSection.style.display;
            accountPassSection.style.display = isClosed ? 'flex' : 'none';
            accountTogglePassBtn.classList.toggle('is-active', isClosed);
            if (isClosed) {
                setTimeout(() => accountNewPassword?.focus(), 50);
            }
        });
    }

    // Hesabım: Şifre Değiştir
    if (accountChangePassBtn) {
        accountChangePassBtn.addEventListener('click', async () => {
            const newPass = accountNewPassword?.value;
            const confirmPass = accountConfirmPassword?.value;
            const msgBox = document.getElementById('account-password-msg');

            authHataTemizle(msgBox);

            if (!newPass || !confirmPass) {
                authHataGoster("Lütfen her iki şifre alanını da doldurun.", msgBox);
                return;
            }
            if (newPass.length < 8) {
                authHataGoster("Yeni şifre en az 8 karakter olmalıdır.", msgBox);
                return;
            }
            if (newPass !== confirmPass) {
                authHataGoster("Girdiğin şifreler uyuşmuyor.", msgBox);
                return;
            }

            accountChangePassBtn.disabled = true;
            accountChangePassBtn.textContent = 'Güncelleniyor...';

            const { data, error } = await supabaseClient.auth.updateUser({
                password: newPass
            });

            accountChangePassBtn.disabled = false;
            accountChangePassBtn.textContent = 'Şifreyi Güncelle';

            if (error) {
                authHataGoster("Şifre güncellenemedi: " + error.message, msgBox);
            } else {
                authBasariGoster("Şifreniz başarıyla güncellendi!", msgBox);
                if (accountNewPassword) accountNewPassword.value = '';
                if (accountConfirmPassword) accountConfirmPassword.value = '';
            }
        });
    }

    // Hesabı Silme Akışı: Butona basıldığında onay ve şifre giriş panelini aç
    if (deleteAccountBtn && deleteConfirmBox) {
        deleteAccountBtn.addEventListener('click', () => {
            deleteAccountBtn.style.display = 'none';
            deleteConfirmBox.style.display = 'flex';
            if (deletePasswordInput) {
                deletePasswordInput.value = '';
                setTimeout(() => deletePasswordInput.focus(), 60);
            }
        });
    }

    if (deleteCancelBtn && deleteConfirmBox && deleteAccountBtn) {
        deleteCancelBtn.addEventListener('click', () => {
            deleteConfirmBox.style.display = 'none';
            deleteAccountBtn.style.display = 'inline-block';
            if (deletePasswordInput) deletePasswordInput.value = '';
        });
    }

    // Hesabı Şifre Doğrulamasıyla Kalıcı Olarak Sil
    if (deleteConfirmBtn) {
        deleteConfirmBtn.addEventListener('click', async () => {
            const girilenSifre = (deletePasswordInput?.value || '').trim();

            if (!girilenSifre) {
                toastBildirimiGoster("Hesabınızı silmek için lütfen şifrenizi girin.", 3500, 'warning');
                deletePasswordInput?.focus();
                return;
            }

            const currentUserEmail = aktifKullaniciOturumu?.user?.email;
            if (!currentUserEmail) {
                toastBildirimiGoster("Oturum bilgisine ulaşılamadı. Lütfen tekrar giriş yapın.", 3500, 'error');
                return;
            }

            deleteConfirmBtn.disabled = true;
            if (deleteCancelBtn) deleteCancelBtn.disabled = true;
            deleteConfirmBtn.textContent = 'Doğrulanıyor...';

            try {
                // 1. Şifre Doğrulaması: Kullanıcının girdiği şifreyi signInWithPassword ile doğrula
                const { error: authErr } = await supabaseClient.auth.signInWithPassword({
                    email: currentUserEmail,
                    password: girilenSifre
                });

                if (authErr) {
                    deleteConfirmBtn.disabled = false;
                    if (deleteCancelBtn) deleteCancelBtn.disabled = false;
                    deleteConfirmBtn.textContent = 'Evet, Hesabımı Sil';
                    toastBildirimiGoster("Girdiğiniz şifre hatalı. Hesap silinmedi.", 4000, 'error');
                    deletePasswordInput?.focus();
                    return;
                }

                // 2. Şifre doğru, silme işlemini başlat
                deleteConfirmBtn.textContent = 'Siliniyor...';

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

                const { error: rpcErr } = await supabaseClient.rpc('delete_user_account');

                if (rpcErr) {
                    deleteConfirmBtn.disabled = false;
                    if (deleteCancelBtn) deleteCancelBtn.disabled = false;
                    deleteConfirmBtn.textContent = 'Evet, Hesabımı Sil';
                    toastBildirimiGoster("Hesap silinirken bir hata oluştu: " + rpcErr.message, 4500, 'error');
                } else {
                    toastBildirimiGoster("Hesabınız kalıcı olarak silindi. Hoşça kalın.", 4000, 'success');
                    modaliKapat();
                    setTimeout(async () => {
                        await sistemdenCikisYap();
                    }, 1200);
                }
            } catch (genelErr) {
                console.error("Hesap silme işleminde beklenmedik hata:", genelErr);
                deleteConfirmBtn.disabled = false;
                if (deleteCancelBtn) deleteCancelBtn.disabled = false;
                deleteConfirmBtn.textContent = 'Evet, Hesabımı Sil';
                toastBildirimiGoster("İşlem gerçekleştirilemedi: " + (genelErr.message || genelErr), 4000, 'error');
            }
        });
    }

    if (deletePasswordInput && deleteConfirmBtn) {
        deletePasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                deleteConfirmBtn.click();
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
