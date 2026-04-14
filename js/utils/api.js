// --- GLOBAL DEĞİŞKENLER VE KURULUM ---
window.useFirebase = false;
window.db = null;

try {
  const firebaseConfig = {
    apiKey: "AIzaSyBD0BwWNj1ypc2oMk_ZndkwlqUsimC8Y4E",
    authDomain: "yunancaokuyucu.firebaseapp.com",
    projectId: "yunancaokuyucu",
    storageBucket: "yunancaokuyucu.firebasestorage.app",
    messagingSenderId: "434539375134",
    appId: "1:434539375134:web:2538e78f0d15489c26dc0f"
  };
  
  if(firebaseConfig.apiKey && firebaseConfig.projectId && !firebaseConfig.projectId.includes("YOUR_PROJECT")) {
       if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
       window.db = firebase.firestore();
       window.useFirebase = true;
  }
} catch(e) {
  console.warn("Firebase kurulum hatası, yerel hafıza ile devam ediliyor.");
}

async function fetchFromFirebase() {
  if(!window.useFirebase) { finishInit(); return; }
  try {
    // 1. KULLANICILAR İÇİN CANLI DİNLEME
    window.db.collection("global").doc("users").onSnapshot((doc) => {
        if (doc.exists) {
            const cloudUsers = doc.data();
            window.dbUsers = { ...window.dbUsers, ...cloudUsers };
            window.dbUsers['nurhat'] = { password: 'Deniz28', role: 'admin', status: 'approved', isPremium: true, credits: 999999 };
            localStorage.setItem('y_users_db', JSON.stringify(window.dbUsers));
            if (typeof updateUserUI === 'function') updateUserUI();
        }
    });

    // 2. USERDATA (İlerlemeler ve desteler)
    const dataDoc = await window.db.collection("global").doc("userdata").get();
    if (dataDoc.exists) window.dbUserData = dataDoc.data();

    // 3. DUYURULAR İÇİN CANLI DİNLEME
    window.db.collection("global").doc("announcements").onSnapshot((doc) => {
        if (doc.exists) {
            window.dbAnnouncements = doc.data().list || [];
            localStorage.setItem('y_announcements_db', JSON.stringify(window.dbAnnouncements));
            if(typeof updateBellIcon === 'function') updateBellIcon();
        }
    });

    // 4. KONU ANLATIMLARI İÇİN CANLI DİNLEME
    window.db.collection("global").doc("lessons_db").onSnapshot((doc) => {
        if (doc.exists) {
            window.GLOBAL_LESSONS = doc.data().list || [];
            localStorage.setItem('y_lessons_db', JSON.stringify(window.GLOBAL_LESSONS));
            if(typeof renderLessonLibrary === 'function') renderLessonLibrary();
        }
    });

    setTimeout(() => { finishInit(); }, 1000);
    
  } catch(e) { 
    console.error("Bulut okuma hatası", e); 
    finishInit(); 
  }
}

function saveDb() {
  localStorage.setItem('y_users_db', JSON.stringify(window.dbUsers)); 
  localStorage.setItem('y_userdata_db', JSON.stringify(window.dbUserData));
  if(window.useFirebase && window.db) {
     window.db.collection("global").doc("users").set(window.dbUsers, { merge: true }).catch(e => console.error(e));
     window.db.collection("global").doc("userdata").set(window.dbUserData, { merge: true }).catch(e => console.error(e));
  }
}

function syncCloudData() {
  if (!window.currentUsername) return;
  window.dbUserData[window.currentUsername] = {
    ...window.dbUserData[window.currentUsername],
    decks: window.userDecks,
    customDict: Object.fromEntries(window.userCustomDict || []),
    lastActiveDeck: window.lastActiveDeck,
    examHistory: window.dbUserData[window.currentUsername]?.examHistory || [],
    deletedAnnouncements: window.dbUserData[window.currentUsername]?.deletedAnnouncements || [] 
  };
  saveDb();
}
// Diğer yardımcı fonksiyonlar (fetchContentFromUrl, loadPdfFile vb.) olduğu gibi devam edebilir.
