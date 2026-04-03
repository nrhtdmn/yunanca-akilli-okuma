function submitAuth() {
  const u = document.getElementById('auth-username').value.trim(); const p = document.getElementById('auth-password').value.trim();
  if(!u || !p) { showToastMessage("Kullanıcı adı ve şifre boş olamaz."); return; }

  if (isLoginMode) {
    if (dbUsers[u] && dbUsers[u].password === p) {
      currentUser = dbUsers[u]; currentUsername = u; localStorage.setItem('y_currentUser', u); loadUserData(); closeAuthModal(); updateUserUI(); showToastMessage(`Hoş geldin, ${u}!`);
    } else { showToastMessage("❌ Hatalı kullanıcı adı veya şifre."); }
  } else {
    if (dbUsers[u]) { showToastMessage("❌ Bu kullanıcı adı zaten alınmış."); return; }
    dbUsers[u] = { password: p, role: 'user', status: 'pending', isPremium: false, credits: 50 }; saveDb();
    currentUser = dbUsers[u]; currentUsername = u; localStorage.setItem('y_currentUser', u);
    loadUserData(); closeAuthModal(); updateUserUI();   
    showToastMessage("✅ Kayıt başarılı! Yönetici onaylayana kadar kısıtlı erişimdesiniz.");
    
    const botToken = "8741748332:AAEZI5xsFw6gLW5MnvsRGYKn91KrkieppaQ"; const chatId = "5546102141"; 
    const mesaj = `🚨 Yeni Kayıt Geldi!\n\n👤 Kullanıcı: ${u}\n\nLütfen Yunanca Akıllı Okuyucu paneline girip onaylayın.`;
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(mesaj)}`;
    fetch(telegramUrl).then(response => console.log("Telegram bildirimi gönderildi.")).catch(error => console.error("Telegram bildirimi başarısız:", error));
  }
}
    
function logout() {
  currentUser = null; currentUsername = null; localStorage.removeItem('y_currentUser');
  userDecks = { "Genel Kelimeler": [] }; userCustomDict = new Map(); renderDecksAccordion(); updateUserUI(); showToastMessage("Çıkış yapıldı.");
}

function requireAuth(actionCost = 1) {
  if (!currentUser) { showAuthModal(); return false; }
  if (currentUser.status === 'pending') { showToastMessage("⚠️ Hesabınız henüz onaylanmadı. Yöneticinin onayını bekleyin."); return false; }
  
  if (currentUser.role !== 'admin' && !currentUser.isPremium) {
    if (currentUser.credits < actionCost) { document.getElementById('premium-modal').style.display = 'flex'; return false; }
    currentUser.credits -= actionCost; saveDb(); updateUserUI();
  }
  return true;
}

function updateUserAdmin(uname, key, val) {
  if(key === 'isPremium') dbUsers[uname][key] = (val === 'true'); else dbUsers[uname][key] = val;
  saveDb(); showToastMessage("Kullanıcı yetkisi güncellendi.");
}

function deleteUserAdmin(uname) {
  if (confirm(`"${uname}" kullanıcısını ve tüm verilerini KALICI OLARAK silmek istediğinize emin misiniz?`)) {
    
    // 1. Firebase (Bulut) Veritabanından Sil
    if(typeof db !== 'undefined' && db !== null) {
        // Kullanıcıyı 'users' belgesinden siler
        let userDelete = {};
        userDelete[uname] = firebase.firestore.FieldValue.delete();
        db.collection("global").doc("users").update(userDelete);
        
        // Kullanıcının kelime ve geçmiş verilerini 'userdata' belgesinden siler
        let dataDelete = {};
        dataDelete[uname] = firebase.firestore.FieldValue.delete();
        db.collection("global").doc("userdata").update(dataDelete);
    }
    
    // 2. Yerel Değişkenlerden Sil
    delete dbUsers[uname];
    if(dbUserData[uname]) delete dbUserData[uname];
    
    // 3. Arayüzü Güncelle
    saveDb(); // Diğer cihazlarla senkronizasyon için
    openAdminPanel(); // Listeyi yenile
    showToastMessage(`🗑️ ${uname} başarıyla silindi.`);
  }
}

