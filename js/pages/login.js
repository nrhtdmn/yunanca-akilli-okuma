function sendTelegramRegistrationNotice(label) {
  const botToken = "8741748332:AAEZI5xsFw6gLW5MnvsRGYKn91KrkieppaQ";
  const chatId = "5546102141";
  const mesaj = `🚨 Yeni Kayıt Geldi!\n\n👤 ${label}\n\nLütfen Yunanca Akıllı Okuyucu paneline girip onaylayın.`;
  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(mesaj)}`;
  fetch(telegramUrl).then(() => console.log("Telegram bildirimi gönderildi.")).catch((e) => console.error("Telegram bildirimi başarısız:", e));
}

function submitAuth() {
  const u = document.getElementById("auth-username").value.trim();
  const p = document.getElementById("auth-password").value.trim();
  if (!u || !p) {
    showToastMessage("Kullanıcı adı ve şifre boş olamaz.");
    return;
  }

  if (isLoginMode) {
    const row = dbUsers[u];
    if (row && row.authProvider === "google") {
      showToastMessage("Bu hesap Google ile açılmış. Lütfen «Google ile devam et» kullanın.");
      return;
    }
    if (row && row.password === p) {
      currentUser = row;
      currentUsername = u;
      localStorage.setItem("y_currentUser", u);
      loadUserData();
      closeAuthModal();
      updateUserUI();
      showToastMessage(`Hoş geldin, ${u}!`);
    } else {
      showToastMessage("❌ Hatalı kullanıcı adı veya şifre.");
    }
  } else {
    if (dbUsers[u]) {
      showToastMessage("❌ Bu kullanıcı adı zaten alınmış.");
      return;
    }
    const fnEl = document.getElementById("auth-fullname");
    const emEl = document.getElementById("auth-email");
    const fullName = fnEl && fnEl.value.trim();
    const regEmail = emEl && emEl.value.trim().toLowerCase();
    if (regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      showToastMessage("Geçerli bir e-posta girin veya e-posta alanını boş bırakın.");
      return;
    }
    dbUsers[u] = {
      password: p,
      role: "user",
      status: "pending",
      isPremium: false,
      credits: 50,
      authProvider: "password",
    };
    if (fullName) dbUsers[u].displayName = fullName;
    if (fullName) dbUsers[u].fullName = fullName;
    if (regEmail) {
      dbUsers[u].contactEmail = regEmail;
      dbUsers[u].email = regEmail;
    }
    saveDb();
    currentUser = dbUsers[u];
    currentUsername = u;
    localStorage.setItem("y_currentUser", u);
    loadUserData();
    closeAuthModal();
    updateUserUI();
    showToastMessage("✅ Kayıt başarılı! Yönetici onaylayana kadar kısıtlı erişimdesiniz.");
    sendTelegramRegistrationNotice(`Kullanıcı: ${u}${fullName ? " — " + fullName : ""}${regEmail ? " — " + regEmail : ""}`);
  }
}

async function signInWithGoogle() {
  if (typeof firebase === "undefined" || typeof firebase.auth !== "function") {
    showToastMessage("Firebase Auth yüklenemedi.");
    return;
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  provider.addScope("email");
  provider.addScope("profile");
  try {
    await firebase.auth().signInWithPopup(provider);
  } catch (e) {
    if (e.code === "auth/popup-closed-by-user") return;
    if (e.code === "auth/account-exists-with-different-credential") {
      showToastMessage("Bu e-posta farklı bir yöntemle kayıtlı. Önce kullanıcı adı/şifre ile deneyin.");
      return;
    }
    console.error(e);
    showToastMessage("Google ile giriş başarısız: " + (e.message || e.code));
  }
}

/** Firestore yüklendikten veya oturum değişince çağrılır */
window.syncAuthUserWithApp = function syncAuthUserWithApp() {
  if (typeof firebase === "undefined" || typeof firebase.auth !== "function") return;
  const user = firebase.auth().currentUser;
  if (!user || !user.email) return;
  if (typeof dbUsers === "undefined" || !window.dbUsers) return;

  const email = user.email.toLowerCase();
  const dbu = window.dbUsers;
  const isNew = !dbu[email];

  if (isNew) {
    dbu[email] = {
      email: email,
      uid: user.uid,
      authProvider: "google",
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      role: "user",
      status: "pending",
      isPremium: false,
      credits: 50,
      emailNotify: true,
    };
    saveDb();
    sendTelegramRegistrationNotice(`Google: ${email}`);
    if (typeof showToastMessage === "function") {
      showToastMessage("✅ Google hesabı kaydedildi. Yönetici onayından sonra tam erişim.");
    }
  } else {
    dbu[email].uid = user.uid;
    dbu[email].email = email;
    if (user.displayName) dbu[email].displayName = user.displayName;
    if (user.photoURL) dbu[email].photoURL = user.photoURL;
    if (!dbu[email].authProvider) dbu[email].authProvider = "google";
    if (dbu[email].emailNotify === undefined) dbu[email].emailNotify = true;
    saveDb();
  }

  currentUser = dbu[email];
  currentUsername = email;
  localStorage.setItem("y_currentUser", email);
  if (typeof loadUserData === "function") loadUserData();
  if (typeof updateUserUI === "function") updateUserUI();
  if (typeof closeAuthModal === "function") closeAuthModal();
};

function initFirebaseAuth() {
  if (typeof firebase === "undefined" || typeof firebase.auth !== "function") return;
  firebase.auth().onAuthStateChanged(function (user) {
    if (!user) {
      if (
        typeof currentUser !== "undefined" &&
        currentUser &&
        currentUser.authProvider === "google"
      ) {
        currentUser = null;
        currentUsername = null;
        localStorage.removeItem("y_currentUser");
        userDecks = { "Genel Kelimeler": [] };
        userCustomDict = new Map();
        if (typeof renderDecksAccordion === "function") renderDecksAccordion();
        if (typeof updateUserUI === "function") updateUserUI();
      }
      return;
    }
    if (typeof window.syncAuthUserWithApp === "function") {
      window.syncAuthUserWithApp();
    }
  });
}

function logout() {
  if (typeof firebase !== "undefined" && typeof firebase.auth === "function") {
    firebase.auth().signOut().catch(function () {});
  }
  currentUser = null;
  currentUsername = null;
  localStorage.removeItem("y_currentUser");
  userDecks = { "Genel Kelimeler": [] };
  userCustomDict = new Map();
  renderDecksAccordion();
  updateUserUI();
  showToastMessage("Çıkış yapıldı.");
}

function requireAuth(actionCost = 1) {
  if (!currentUser) {
    showAuthModal();
    return false;
  }
  if (currentUser.status === "pending") {
    showToastMessage("⚠️ Hesabınız henüz onaylanmadı. Yöneticinin onayını bekleyin.");
    return false;
  }

  if (currentUser.role !== "admin" && !currentUser.isPremium) {
    if (currentUser.credits < actionCost) {
      document.getElementById("premium-modal").style.display = "flex";
      return false;
    }
    currentUser.credits -= actionCost;
    saveDb();
    updateUserUI();
  }
  return true;
}

function updateUserAdmin(uname, key, val) {
  if (!currentUser || currentUser.role !== "admin") {
    showToastMessage("Bu işlem yalnız yöneticiler içindir.");
    return;
  }
  if (key === "isPremium") window.dbUsers[uname][key] = val === "true";
  else window.dbUsers[uname][key] = val;

  saveDb();
  showToastMessage("Kullanıcı yetkisi güncellendi.");
}

function deleteUserAdmin(uname) {
  if (!currentUser || currentUser.role !== "admin") {
    showToastMessage("Bu işlem yalnız yöneticiler içindir.");
    return;
  }
  if (
    confirm(
      `"${uname}" kullanıcısını ve tüm verilerini KALICI OLARAK silmek istediğinize emin misiniz?`,
    )
  ) {
    if (typeof window.db !== "undefined" && window.db !== null) {
      let userDelete = {};
      userDelete[uname] = firebase.firestore.FieldValue.delete();
      window.db.collection("global").doc("users").update(userDelete);

      let dataDelete = {};
      dataDelete[uname] = firebase.firestore.FieldValue.delete();
      window.db.collection("global").doc("userdata").update(dataDelete);
    }

    delete window.dbUsers[uname];
    if (window.dbUserData[uname]) delete window.dbUserData[uname];

    saveDb();

    if (typeof window.renderAdminUsersList === "function")
      window.renderAdminUsersList();

    showToastMessage(`🗑️ ${uname} başarıyla silindi.`);
  }
}
