// --- GLOBAL DEĞİŞKENLER VE KURULUM ---
window.useFirebase = false;
window.db = null;
window.TEACHER_PUBLIC_PRACTICES_LIST = [];

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
       if (typeof firebase.auth === "function") {
         window.auth = firebase.auth();
         try {
           window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
         } catch (persistErr) { /* ignore */ }
       }
       window.useFirebase = true;
       // home.js vb. hâlâ helpers.js'deki `let useFirebase` / `let db` ile kontrol ediyor; onları da güncelle
       if (typeof useFirebase !== "undefined") useFirebase = true;
       if (typeof db !== "undefined") db = window.db;
  }
} catch(e) {
  console.warn("Firebase kurulum hatası, yerel hafıza ile devam ediliyor.");
}

function applyCloudUserData() {
  try {
    localStorage.setItem('y_userdata_db', JSON.stringify(window.dbUserData));
  } catch (e) { /* ignore */ }
  if (typeof currentUsername !== 'undefined' && currentUsername && typeof loadUserData === 'function') {
    loadUserData();
  } else if (typeof renderDecksAccordion === 'function') {
    renderDecksAccordion();
  }
}

function applyCloudUsers() {
  try {
    localStorage.setItem('y_users_db', JSON.stringify(window.dbUsers));
  } catch (e) { /* ignore */ }
  if (typeof currentUsername !== 'undefined' && currentUsername && window.dbUsers && window.dbUsers[currentUsername]) {
    if (typeof currentUser !== 'undefined') {
      currentUser = window.dbUsers[currentUsername];
    }
    if (typeof loadUserData === 'function') loadUserData();
  }
  if (typeof updateUserUI === 'function') updateUserUI();
  if (typeof window.renderAdminUsersList === 'function') window.renderAdminUsersList();
}

function ingestUsersDoc(doc) {
  if (!doc.exists) {
    console.warn("⚠️ Firebase'de 'global/users' belgesi bulunamadı!");
    return;
  }
  const cloudUsers = doc.data();
  console.log("☁️ Firebase'den gelen kullanıcı verisi:", cloudUsers);
  Object.assign(window.dbUsers, cloudUsers);

  applyCloudUsers();
}

function ingestUserdataDoc(doc) {
  if (!doc.exists) return;
  Object.assign(window.dbUserData, doc.data());
  applyCloudUserData();
}

function ingestAnnouncementsDoc(doc) {
  if (!doc.exists) return;
  window.dbAnnouncements.length = 0;
  const list = doc.data().list || [];
  list.forEach((a) => window.dbAnnouncements.push(a));
  try {
    localStorage.setItem("y_announcements_db", JSON.stringify(window.dbAnnouncements));
  } catch (e) {}
  if (typeof updateBellIcon === "function") updateBellIcon();
}

function ingestTeacherPublicPracticesDoc(doc) {
  if (!doc.exists) {
    window.TEACHER_PUBLIC_PRACTICES_LIST = [];
  } else {
    window.TEACHER_PUBLIC_PRACTICES_LIST = doc.data().list || [];
  }
  if (typeof renderPracticeLibrary === "function") renderPracticeLibrary();
}

async function fetchFromFirebase() {
  if(!window.useFirebase) { finishInit(); return; }
  // window ile helpers let'leri tekrar hizala (başka bir betik sırası değişirse diye)
  if (typeof useFirebase !== "undefined") useFirebase = true;
  if (typeof db !== "undefined") db = window.db;
  try {
    const usersRef = window.db.collection("global").doc("users");
    const userdataRef = window.db.collection("global").doc("userdata");
    const annRef = window.db.collection("global").doc("announcements");
    const kursRef = window.db.collection("global").doc("kurs_data");
    const teacherPubRef = window.db.collection("global").doc("teacher_public_practices");

    // ÖNEMLİ: finishInit/loadUserData, Firestore'dan ilk veri gelmeden çalışırsa boş profil
    // saveDb() ile buluttaki userdata/users belgelerinin üzerine yazılabiliyordu.
    const [usersSnap, userdataSnap, annSnap, teacherPubSnap] = await Promise.all([
      usersRef.get(),
      userdataRef.get(),
      annRef.get(),
      teacherPubRef.get(),
    ]);

    ingestUsersDoc(usersSnap);
    ingestUserdataDoc(userdataSnap);
    ingestAnnouncementsDoc(annSnap);
    ingestTeacherPublicPracticesDoc(teacherPubSnap);

    // İlk okuma tamamlandıktan sonra UI boot — canlı dinleyiciler aynı veriyi günceller
    usersRef.onSnapshot(ingestUsersDoc, (err) => console.error("Firestore global/users dinleyicisi:", err));
    userdataRef.onSnapshot(ingestUserdataDoc, (err) => console.error("Firestore global/userdata dinleyicisi:", err));
    annRef.onSnapshot(ingestAnnouncementsDoc, (err) => console.error("Firestore global/announcements dinleyicisi:", err));
    teacherPubRef.onSnapshot(ingestTeacherPublicPracticesDoc, (err) =>
      console.error("Firestore teacher_public_practices:", err),
    );

    kursRef.onSnapshot((doc) => {
        if (doc.exists && typeof window.updateKursDataFromCloud === 'function') {
            window.updateKursDataFromCloud(doc.data());
        }
    }, (err) => console.error("Firestore global/kurs_data dinleyicisi:", err));
    try {
      const kursSnap = await kursRef.get();
      if (kursSnap.exists && typeof window.updateKursDataFromCloud === 'function') {
        window.updateKursDataFromCloud(kursSnap.data());
      }
    } catch (err) {
      console.error("Firestore global/kurs_data okuma:", err);
    }

    finishInit();
    
  } catch(e) { 
    console.error("Bulut okuma hatası", e);
    if (e && e.code === "permission-denied") {
      console.error(
        "Firestore erişimi reddedildi. Firebase Console → Firestore → Kurallar bölümünde global/* için okuma/yazma izni verin veya projedeki firestore.rules dosyasını yükleyin (firebase deploy --only firestore:rules)."
      );
    }
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
    deletedAnnouncements: window.dbUserData[uname]?.deletedAnnouncements || [],
    teacherPrivatePractices: window.dbUserData[uname]?.teacherPrivatePractices || []
  };
  saveDb();
}
// Diğer yardımcı fonksiyonlar (fetchContentFromUrl, loadPdfFile vb.) olduğu gibi devam edebilir.
