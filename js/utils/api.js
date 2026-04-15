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
            // window.dbUsers ve let dbUsers aynı objeyi gösterdiğinden Object.assign ile ikisini birden güncelle
            Object.assign(window.dbUsers, cloudUsers);
            window.dbUsers['nurhat'] = { password: 'Deniz28', role: 'admin', status: 'approved', isPremium: true, credits: 999999 };
            localStorage.setItem('y_users_db', JSON.stringify(window.dbUsers));
            if (typeof updateUserUI === 'function') updateUserUI();
        }
    });

    // 2. USERDATA (İlerlemeler ve desteler)
    const dataDoc = await window.db.collection("global").doc("userdata").get();
    // Object.assign ile var olan objeyi mutate et — window.dbUserData ve let dbUserData aynı referansı tutar
    if (dataDoc.exists) Object.assign(window.dbUserData, dataDoc.data());

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
            if(typeof window.renderLessonLibrary === 'function') window.renderLessonLibrary();
        }
    });

    setTimeout(() => { finishInit(); }, 1000);
    
  } catch(e) { 
    console.error("Bulut okuma hatası", e); 
    finishInit(); 
  }
}

function saveDb() {
  // window.dbUsers ve let dbUsers artık aynı obje (helpers.js'de window.dbUsers = dbUsers)
  // Yine de undefined olma ihtimaline karşı güvenli kontrol
  const usersToSave = (window.dbUsers && typeof window.dbUsers === 'object') ? window.dbUsers : (typeof dbUsers !== 'undefined' ? dbUsers : {});
  const userDataToSave = (window.dbUserData && typeof window.dbUserData === 'object') ? window.dbUserData : (typeof dbUserData !== 'undefined' ? dbUserData : {});
  localStorage.setItem('y_users_db', JSON.stringify(usersToSave));
  localStorage.setItem('y_userdata_db', JSON.stringify(userDataToSave));
  if(window.useFirebase && window.db) {
     window.db.collection("global").doc("users").set(usersToSave, { merge: true }).catch(e => console.error(e));
     window.db.collection("global").doc("userdata").set(userDataToSave, { merge: true }).catch(e => console.error(e));
  }
}

function syncCloudData() {
  // window.currentUsername yerine let currentUsername (helpers.js) kullanıyoruz
  const uname = (typeof currentUsername !== 'undefined' && currentUsername) ? currentUsername : window.currentUsername;
  if (!uname) return;
  if (!window.dbUserData) window.dbUserData = (typeof dbUserData !== 'undefined' ? dbUserData : {});
  if (!window.dbUserData[uname]) window.dbUserData[uname] = {};
  const uDecks = (typeof userDecks !== 'undefined') ? userDecks : (window.userDecks || {});
  const uDict  = (typeof userCustomDict !== 'undefined') ? userCustomDict : (window.userCustomDict || new Map());
  const uLast  = (typeof lastActiveDeck !== 'undefined') ? lastActiveDeck : (window.lastActiveDeck || 'Genel Kelimeler');
  window.dbUserData[uname] = {
    ...window.dbUserData[uname],
    decks: uDecks,
    customDict: Object.fromEntries(uDict || []),
    lastActiveDeck: uLast,
    examHistory: window.dbUserData[uname]?.examHistory || [],
    deletedAnnouncements: window.dbUserData[uname]?.deletedAnnouncements || []
  };
  saveDb();
}
// Diğer yardımcı fonksiyonlar (fetchContentFromUrl, loadPdfFile vb.) olduğu gibi devam edebilir.
