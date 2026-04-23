// --- GLOBAL DEĞİŞKENLER VE KURULUM ---
// Canlı site: https://www.yunancaokulu.com
window.useFirebase = false;
window.db = null;
window.TEACHER_PUBLIC_PRACTICES_LIST = [];
window.dbTrafficStats = {};

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
  if (typeof window.refreshReadingCompletionUI === "function") {
    try {
      window.refreshReadingCompletionUI();
    } catch (e) {
      console.error("refreshReadingCompletionUI", e);
    }
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
  window.__usersDocSyncedFromFirestore = true;

  applyCloudUsers();
}

function ingestUserdataDoc(doc) {
  if (!doc.exists) return;
  const cloudData = doc.data() || {};
  const getReadingTs = function (u) {
    if (!u || typeof u !== "object") return 0;
    let ts = 0;
    const works = Array.isArray(u.readingWorks) ? u.readingWorks : [];
    works.forEach((w) => {
      const t = Number(w && (w.updatedAt || w.createdAt) || 0);
      if (t > ts) ts = t;
    });
    const prog = (u.readingProgress && typeof u.readingProgress === "object") ? u.readingProgress : {};
    Object.keys(prog).forEach((k) => {
      const t = Number(prog[k] && prog[k].updatedAt || 0);
      if (t > ts) ts = t;
    });
    const comp = (u.readingCompletedIds && typeof u.readingCompletedIds === "object") ? u.readingCompletedIds : {};
    Object.keys(comp).forEach((k) => {
      const t = Number(comp[k] || 0);
      if (t > ts) ts = t;
    });
    return ts;
  };

  Object.keys(cloudData).forEach((uname) => {
    const cloudUserData = cloudData[uname] || {};
    const localUserData = window.dbUserData[uname] || {};
    const localTs = getReadingTs(localUserData);
    const cloudTs = getReadingTs(cloudUserData);
    window.dbUserData[uname] = {
      ...localUserData,
      ...cloudUserData,
      readingHighlights:
        (localTs >= cloudTs && localUserData.readingHighlights)
          ? localUserData.readingHighlights
          : (cloudUserData.readingHighlights || localUserData.readingHighlights || {}),
      readingWorks:
        (localTs >= cloudTs && Array.isArray(localUserData.readingWorks))
          ? localUserData.readingWorks
          : (Array.isArray(cloudUserData.readingWorks) ? cloudUserData.readingWorks : (localUserData.readingWorks || [])),
      readingProgress:
        (localTs >= cloudTs && localUserData.readingProgress)
          ? localUserData.readingProgress
          : (cloudUserData.readingProgress || localUserData.readingProgress || {}),
      readingCompletedIds: (() => {
        const a = (localUserData.readingCompletedIds && typeof localUserData.readingCompletedIds === "object")
          ? localUserData.readingCompletedIds
          : {};
        const b = (cloudUserData.readingCompletedIds && typeof cloudUserData.readingCompletedIds === "object")
          ? cloudUserData.readingCompletedIds
          : {};
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        const out = {};
        keys.forEach((k) => {
          const m = Math.max(Number(a[k] || 0), Number(b[k] || 0));
          if (m > 0) out[k] = m;
        });
        return out;
      })(),
    };
  });
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

function ingestTrafficDoc(doc) {
  if (!doc.exists) {
    window.dbTrafficStats = {};
  } else {
    window.dbTrafficStats = doc.data() || {};
  }
  if (typeof window.renderAdminTrafficStats === "function") {
    window.renderAdminTrafficStats();
  }
}

function ingestLessonsDoc(doc) {
  if (!doc.exists) return;
  const list = doc.data().list;
  if (!Array.isArray(list)) return;
  window.GLOBAL_LESSONS = list;
  window.GLOBAL_LESSONS.sort((a, b) => Number(a?.__order || 0) - Number(b?.__order || 0));
  window.GLOBAL_LESSONS = window.GLOBAL_LESSONS.map((item) => {
    if (!item || typeof item !== "object") return item;
    const { __order, ...rest } = item;
    return rest;
  });
  try {
    localStorage.setItem("y_lessons_db", JSON.stringify(window.GLOBAL_LESSONS));
  } catch (e) {}
  if (typeof window.renderLessonLibrary === "function") window.renderLessonLibrary();
  if (typeof window.populateAdminLessons === "function") window.populateAdminLessons();
}

function ingestLessonsCollection(snapshot) {
  if (!snapshot || snapshot.empty) return;
  const list = snapshot.docs
    .map((d) => d.data() || {})
    .sort((a, b) => Number(a?.__order || 0) - Number(b?.__order || 0))
    .map((item) => {
      const { __order, ...rest } = item;
      return rest;
    });
  window.GLOBAL_LESSONS = list;
  try {
    localStorage.setItem("y_lessons_db", JSON.stringify(window.GLOBAL_LESSONS));
  } catch (e) {}
  if (typeof window.renderLessonLibrary === "function") window.renderLessonLibrary();
  if (typeof window.populateAdminLessons === "function") window.populateAdminLessons();
}

async function trackSiteTraffic() {
  if (!window.useFirebase || !window.db || typeof firebase === "undefined") return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    let visitorId = localStorage.getItem("y_visitor_id");
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("y_visitor_id", visitorId);
    }

    const lastUniqueTrackedDay = localStorage.getItem("y_traffic_unique_day");
    const isFirstVisitToday = lastUniqueTrackedDay !== today;
    const updates = {
      lastVisitAt: Date.now(),
      lastVisitorId: visitorId,
      totalVisits: firebase.firestore.FieldValue.increment(1),
      [`dailyVisits.${today}`]: firebase.firestore.FieldValue.increment(1),
    };

    if (isFirstVisitToday) {
      updates.totalUniqueVisitors = firebase.firestore.FieldValue.increment(1);
      updates[`dailyUniqueVisitors.${today}`] = firebase.firestore.FieldValue.increment(1);
      localStorage.setItem("y_traffic_unique_day", today);
    }

    await window.db.collection("global").doc("traffic_stats").set(updates, { merge: true });
  } catch (e) {
    console.error("Trafik takibi başarısız:", e);
  }
}

async function fetchFromFirebase() {
  if (!window.useFirebase) {
    if (typeof window.initFirebaseAuth === "function") window.initFirebaseAuth();
    finishInit();
    return;
  }
  // window ile helpers let'leri tekrar hizala (başka bir betik sırası değişirse diye)
  if (typeof useFirebase !== "undefined") useFirebase = true;
  if (typeof db !== "undefined") db = window.db;
  try {
    const usersRef = window.db.collection("global").doc("users");
    const userdataRef = window.db.collection("global").doc("userdata");
    const annRef = window.db.collection("global").doc("announcements");
    const kursRef = window.db.collection("global").doc("kurs_data");
    const teacherPubRef = window.db.collection("global").doc("teacher_public_practices");
    const trafficRef = window.db.collection("global").doc("traffic_stats");
    const lessonsColRef = window.db.collection("global_lessons");
    const lessonsLegacyRef = window.db.collection("global").doc("lessons_db");

    // ÖNEMLİ: finishInit/loadUserData, Firestore'dan ilk veri gelmeden çalışırsa boş profil
    // saveDb() ile buluttaki userdata/users belgelerinin üzerine yazılabiliyordu.
    const [usersSnap, userdataSnap, annSnap, teacherPubSnap, trafficSnap, lessonsColSnap, lessonsLegacySnap] = await Promise.all([
      usersRef.get(),
      userdataRef.get(),
      annRef.get(),
      teacherPubRef.get(),
      trafficRef.get(),
      lessonsColRef.get(),
      lessonsLegacyRef.get(),
    ]);

    ingestUsersDoc(usersSnap);
    ingestUserdataDoc(userdataSnap);
    ingestAnnouncementsDoc(annSnap);
    ingestTeacherPublicPracticesDoc(teacherPubSnap);
    ingestTrafficDoc(trafficSnap);
    if (lessonsColSnap && !lessonsColSnap.empty) ingestLessonsCollection(lessonsColSnap);
    else ingestLessonsDoc(lessonsLegacySnap);

    /** Google oturumu, global/users gelmeden açılırsa yanlışlıkla "yeni pending" oluşmasın diye Auth dinleyicisi bundan sonra kurulur */
    if (typeof window.initFirebaseAuth === "function") window.initFirebaseAuth();

    // İlk okuma tamamlandıktan sonra UI boot — canlı dinleyiciler aynı veriyi günceller
    usersRef.onSnapshot(ingestUsersDoc, (err) => console.error("Firestore global/users dinleyicisi:", err));
    userdataRef.onSnapshot(ingestUserdataDoc, (err) => console.error("Firestore global/userdata dinleyicisi:", err));
    annRef.onSnapshot(ingestAnnouncementsDoc, (err) => console.error("Firestore global/announcements dinleyicisi:", err));
    teacherPubRef.onSnapshot(ingestTeacherPublicPracticesDoc, (err) =>
      console.error("Firestore teacher_public_practices:", err),
    );
    trafficRef.onSnapshot(ingestTrafficDoc, (err) =>
      console.error("Firestore global/traffic_stats dinleyicisi:", err),
    );
    lessonsColRef.onSnapshot(ingestLessonsCollection, (err) =>
      console.error("Firestore global_lessons dinleyicisi:", err),
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

    await trackSiteTraffic();
    finishInit();
    
  } catch (e) {
    console.error("Bulut okuma hatası", e);
    if (e && e.code === "permission-denied") {
      console.error(
        "Firestore erişimi reddedildi. Firebase Console → Firestore → Kurallar bölümünde global/* için okuma/yazma izni verin veya projedeki firestore.rules dosyasını yükleyin (firebase deploy --only firestore:rules).",
      );
    }
    if (typeof window.initFirebaseAuth === "function") window.initFirebaseAuth();
    finishInit();
  }
}

window.ingestUsersDoc = ingestUsersDoc;

function normalizeReadingHighlightEntryForCloud(entry) {
  if (Array.isArray(entry) && entry.length >= 2) {
    const s = Number(entry[0]);
    const e = Number(entry[1]);
    if (!Number.isNaN(s) && !Number.isNaN(e)) return { s, e };
    return null;
  }
  if (entry && typeof entry === "object") {
    const s = Number(entry.s);
    const e = Number(entry.e);
    if (!Number.isNaN(s) && !Number.isNaN(e)) return { s, e };
  }
  return null;
}

/** Yerel + Firestore (global/userdata) için kullanıcı verisini temizler; readingCompletedIds bulutta da taşınır */
function sanitizeUserDataForCloud(raw) {
  const out = {};
  const src = raw && typeof raw === "object" ? raw : {};
  Object.keys(src).forEach((uname) => {
    const u = src[uname] && typeof src[uname] === "object" ? { ...src[uname] } : {};
    const rh = u.readingHighlights && typeof u.readingHighlights === "object" ? u.readingHighlights : {};
    const normalizedRh = {};
    Object.keys(rh).forEach((k) => {
      const arr = Array.isArray(rh[k]) ? rh[k] : [];
      normalizedRh[k] = arr.map(normalizeReadingHighlightEntryForCloud).filter(Boolean);
    });
    u.readingHighlights = normalizedRh;
    const rc = u.readingCompletedIds && typeof u.readingCompletedIds === "object" ? u.readingCompletedIds : {};
    const rcOut = {};
    Object.keys(rc).forEach((k) => {
      const n = Number(rc[k]);
      if (Number.isFinite(n) && n > 0) rcOut[k] = n;
    });
    u.readingCompletedIds = rcOut;
    out[uname] = u;
  });
  return out;
}

/**
 * Yerel depoya yazar; Firebase açıksa global/userdata ve global/users belgelerine merge yazar.
 * @returns {Promise<void>}
 */
function saveDb() {
  const usersToSave = (window.dbUsers && typeof window.dbUsers === 'object') ? window.dbUsers : (typeof dbUsers !== 'undefined' ? dbUsers : {});
  const userDataToSave = (window.dbUserData && typeof window.dbUserData === 'object') ? window.dbUserData : (typeof dbUserData !== 'undefined' ? dbUserData : {});
  const userDataForCloud = sanitizeUserDataForCloud(userDataToSave);
  localStorage.setItem('y_users_db', JSON.stringify(usersToSave));
  localStorage.setItem('y_userdata_db', JSON.stringify(userDataForCloud));
  window.dbUserData = userDataForCloud;
  if (typeof dbUserData !== "undefined") dbUserData = userDataForCloud;
  if (window.useFirebase && window.db) {
    const pUsers = window.db.collection("global").doc("users").set(usersToSave, { merge: true });
    const pData = window.db.collection("global").doc("userdata").set(userDataForCloud, { merge: true });
    return Promise.all([pUsers, pData]).then(() => undefined);
  }
  return Promise.resolve();
}

function syncCloudData() {
  // window.currentUsername yerine let currentUsername (helpers.js) kullanıyoruz
  const uname = (typeof currentUsername !== 'undefined' && currentUsername) ? currentUsername : window.currentUsername;
  if (!uname) return Promise.resolve();
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
    teacherPrivatePractices: window.dbUserData[uname]?.teacherPrivatePractices || [],
    readingHighlights: window.dbUserData[uname]?.readingHighlights || {},
    readingWorks: Array.isArray(window.dbUserData[uname]?.readingWorks) ? window.dbUserData[uname].readingWorks : [],
    readingProgress: window.dbUserData[uname]?.readingProgress || {},
    readingCompletedIds: (window.dbUserData[uname]?.readingCompletedIds && typeof window.dbUserData[uname].readingCompletedIds === "object")
      ? window.dbUserData[uname].readingCompletedIds
      : {},
  };
  return saveDb();
}
// Diğer yardımcı fonksiyonlar (fetchContentFromUrl, loadPdfFile vb.) olduğu gibi devam edebilir.
