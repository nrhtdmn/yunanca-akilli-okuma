// --- GLOBAL DEĞİŞKENLER VE KURULUM ---
// Canlı site: https://www.yunancaokulu.com
window.useFirebase = false;
window.db = null;
window.TEACHER_PUBLIC_PRACTICES_LIST = [];
window.dbTrafficStats = {};
window.USE_STATIC_LESSONS_DB = true;

/** Eski tek belge (varsa okuma ile birleştirilir) */
var READING_COMPLETED_V1_LEGACY = "reading_completed_v1";

var _readingDoneUnsub = null;
var _readingDoneAttachedFor = null;
var _readingStateUnsub = null;
var _readingStateAttachedFor = null;
var _deckStateUnsub = null;
var _deckStateAttachedFor = null;
var _userStateUnsub = null;
var _userStateAttachedFor = null;

/** Kullanıcı adı/e-postayı Firestore belge kimliğine çevirir (nokta/@ güvenli) */
function readingCompletedFirestoreDocId(uname) {
  if (!uname || typeof uname !== "string") return null;
  try {
    const b = btoa(encodeURIComponent(uname))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const id = "rd_" + b.slice(0, 700);
    return id.length > 1 ? id : null;
  } catch (e) {
    return null;
  }
}

function readingStateFirestoreDocId(uname) {
  if (!uname || typeof uname !== "string") return null;
  try {
    const b = btoa(encodeURIComponent(uname))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const id = "rs_" + b.slice(0, 700);
    return id.length > 1 ? id : null;
  } catch (e) {
    return null;
  }
}

function deckStateFirestoreDocId(uname) {
  if (!uname || typeof uname !== "string") return null;
  try {
    const b = btoa(encodeURIComponent(uname))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const id = "ds_" + b.slice(0, 700);
    return id.length > 1 ? id : null;
  } catch (e) {
    return null;
  }
}

function userStateFirestoreDocId(uname) {
  if (!uname || typeof uname !== "string") return null;
  try {
    const b = btoa(encodeURIComponent(uname))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const id = "us_" + b.slice(0, 700);
    return id.length > 1 ? id : null;
  } catch (e) {
    return null;
  }
}

function normalizeReadingHighlightsForCloud(rawRh) {
  const src = rawRh && typeof rawRh === "object" ? rawRh : {};
  const rhOut = {};
  Object.keys(src).forEach((k) => {
    const arr = Array.isArray(src[k]) ? src[k] : [];
    rhOut[k] = arr
      .map((entry) => {
        if (Array.isArray(entry) && entry.length >= 2) {
          const s = Number(entry[0]);
          const e = Number(entry[1]);
          if (!Number.isNaN(s) && !Number.isNaN(e)) return { s: s, e: e };
          return null;
        }
        if (entry && typeof entry === "object") {
          const s = Number(entry.s);
          const e = Number(entry.e);
          if (!Number.isNaN(s) && !Number.isNaN(e)) return { s: s, e: e };
        }
        return null;
      })
      .filter(Boolean);
  });
  return rhOut;
}

function sanitizeReadingCompletedMap(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  Object.keys(src).forEach((k) => {
    const n = Number(src[k]);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  });
  return out;
}

function buildUserStatePayload(uname) {
  const row = window.dbUserData && window.dbUserData[uname] ? window.dbUserData[uname] : {};
  const uDict = row.customDict && typeof row.customDict === "object" ? row.customDict : {};
  return {
    decks: row.decks && typeof row.decks === "object" ? row.decks : { "Genel Kelimeler": [] },
    customDict: uDict,
    lastActiveDeck: typeof row.lastActiveDeck === "string" ? row.lastActiveDeck : "Genel Kelimeler",
    readingWorks: Array.isArray(row.readingWorks) ? row.readingWorks : [],
    readingProgress: row.readingProgress && typeof row.readingProgress === "object" ? row.readingProgress : {},
    readingHighlights: normalizeReadingHighlightsForCloud(row.readingHighlights),
    readingCompletedIds: sanitizeReadingCompletedMap(row.readingCompletedIds),
    teacherPrivatePractices: Array.isArray(row.teacherPrivatePractices) ? row.teacherPrivatePractices : [],
    examHistory: Array.isArray(row.examHistory) ? row.examHistory : [],
    deletedAnnouncements: Array.isArray(row.deletedAnnouncements) ? row.deletedAnnouncements : [],
    lastReadAnnouncementsTime: Number(row.lastReadAnnouncementsTime || 0) || 0,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
}

function applyUserStatePatchToUser(uname, data) {
  if (!uname || !window.dbUserData) return;
  if (!window.dbUserData[uname]) window.dbUserData[uname] = {};
  const row = window.dbUserData[uname];
  const src = data && typeof data === "object" ? data : {};
  if (src.decks && typeof src.decks === "object") row.decks = src.decks;
  if (src.customDict && typeof src.customDict === "object") row.customDict = src.customDict;
  if (typeof src.lastActiveDeck === "string") row.lastActiveDeck = src.lastActiveDeck;
  if (Array.isArray(src.readingWorks)) row.readingWorks = src.readingWorks;
  if (src.readingProgress && typeof src.readingProgress === "object") row.readingProgress = src.readingProgress;
  if (src.readingHighlights && typeof src.readingHighlights === "object") row.readingHighlights = normalizeReadingHighlightsForCloud(src.readingHighlights);
  if (src.readingCompletedIds && typeof src.readingCompletedIds === "object") row.readingCompletedIds = sanitizeReadingCompletedMap(src.readingCompletedIds);
  if (Array.isArray(src.teacherPrivatePractices)) row.teacherPrivatePractices = src.teacherPrivatePractices;
  if (Array.isArray(src.examHistory)) row.examHistory = src.examHistory;
  if (Array.isArray(src.deletedAnnouncements)) row.deletedAnnouncements = src.deletedAnnouncements;
  if (Number.isFinite(Number(src.lastReadAnnouncementsTime))) row.lastReadAnnouncementsTime = Number(src.lastReadAnnouncementsTime || 0);
}

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
  if (typeof window.refreshCurrentReadingHighlightsUI === "function") {
    try {
      window.refreshCurrentReadingHighlightsUI();
    } catch (e) {
      console.error("refreshCurrentReadingHighlightsUI", e);
    }
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
  if (typeof ensureUnlimitedMembership === 'function' && window.dbUsers) {
    let anyChanged = false;
    Object.keys(window.dbUsers).forEach(function (key) {
      if (ensureUnlimitedMembership(window.dbUsers[key])) anyChanged = true;
    });
    if (anyChanged && typeof saveDb === 'function') saveDb();
  }
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
      // readingCompletedIds artık global/rd_* belgesinden yönetiliyor.
      // userdata içindeki eski alanı sadece yerel fallback olarak koru; buluttan geri yazıp toggle'ı bozmasın.
      readingCompletedIds:
        (localUserData.readingCompletedIds && typeof localUserData.readingCompletedIds === "object")
          ? localUserData.readingCompletedIds
          : {},
    };
  });
  applyCloudUserData();
}

function mergeReadingCompletedPatchIntoUser(uname, patch) {
  if (!uname || !window.dbUserData || !window.dbUserData[uname]) return;
  if (!patch || typeof patch !== "object") return;
  const cur =
    window.dbUserData[uname].readingCompletedIds && typeof window.dbUserData[uname].readingCompletedIds === "object"
      ? window.dbUserData[uname].readingCompletedIds
      : {};
  const out = { ...cur };
  Object.keys(patch).forEach((k) => {
    const m = Math.max(Number(out[k] || 0), Number(patch[k] || 0));
    if (m > 0) out[k] = m;
    else delete out[k];
  });
  window.dbUserData[uname].readingCompletedIds = out;
}

function replaceReadingCompletedForUser(uname, patch) {
  if (!uname || !window.dbUserData || !window.dbUserData[uname]) return;
  const src = patch && typeof patch === "object" ? patch : {};
  const out = {};
  Object.keys(src).forEach((k) => {
    const n = Number(src[k]);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  });
  window.dbUserData[uname].readingCompletedIds = out;
}

function mergeReadingCompletedLegacyV1Doc(uname) {
  return window.db
    .collection("global")
    .doc(READING_COMPLETED_V1_LEGACY)
    .get()
    .then(function (v1) {
      if (!v1.exists) return;
      const d = v1.data() || {};
      const slice = d[uname];
      if (slice && typeof slice === "object") mergeReadingCompletedPatchIntoUser(uname, slice);
    })
    .catch(function () {});
}

/**
 * Oturum / sayfa yükünde: eski v1 + kullanıcıya özel belgeyi oku, birleştir, canlı dinle.
 * (Giriş öncesi snapshot kaçmasın diye giriş sonrası da çağrılmalı.)
 * @returns {Promise<void>}
 */
window.fetchAndAttachReadingCompletedSync = function (uname) {
  if (!window.useFirebase || !window.db || !uname) return Promise.resolve();
  const docId = readingCompletedFirestoreDocId(uname);
  if (!docId) return Promise.resolve();
  const ref = window.db.collection("global").doc(docId);

  return ref
    .get()
    .then(function (snap) {
      if (snap.exists) {
        const patch = snap.data().readingCompletedIds;
        replaceReadingCompletedForUser(uname, patch);
        return;
      }
      // Sadece yeni kullanıcı-belgesi yoksa eski v1 belgesinden bir kez taşı.
      return mergeReadingCompletedLegacyV1Doc(uname).then(function () {
        const migrated =
          window.dbUserData &&
          window.dbUserData[uname] &&
          window.dbUserData[uname].readingCompletedIds &&
          typeof window.dbUserData[uname].readingCompletedIds === "object"
            ? window.dbUserData[uname].readingCompletedIds
            : {};
        if (Object.keys(migrated).length && typeof window.pushReadingCompletedToFirestore === "function") {
          return window.pushReadingCompletedToFirestore(uname).catch(function (e) {
            console.error("reading_completed_v1 migration push", e);
          });
        }
        return undefined;
      });
    })
    .then(function () {
      if (typeof dbUserData !== "undefined") dbUserData = window.dbUserData;
      applyCloudUserData();
      if (typeof window.refreshReadingCompletionUI === "function") window.refreshReadingCompletionUI();
    })
    .then(function () {
      if (typeof window.detachReadingCompletedSync === "function") window.detachReadingCompletedSync();
      _readingDoneAttachedFor = uname;
      _readingDoneUnsub = ref.onSnapshot(
        function (snap) {
          if (!snap.exists) {
            replaceReadingCompletedForUser(uname, {});
          } else {
            const patch = snap.data().readingCompletedIds;
            replaceReadingCompletedForUser(uname, patch);
          }
          if (typeof dbUserData !== "undefined") dbUserData = window.dbUserData;
          applyCloudUserData();
        },
        function (err) {
          console.error("Firestore okuma tamamlama (kullanıcı belgesi):", err);
        },
      );
    });
};

window.detachReadingCompletedSync = function () {
  if (typeof _readingDoneUnsub === "function") {
    try {
      _readingDoneUnsub();
    } catch (e) {}
  }
  _readingDoneUnsub = null;
  _readingDoneAttachedFor = null;
};

function applyReadingStatePatchToUser(uname, data) {
  if (!uname || !window.dbUserData) return;
  if (!window.dbUserData[uname]) window.dbUserData[uname] = {};
  const row = window.dbUserData[uname];
  const works = Array.isArray(data && data.readingWorks) ? data.readingWorks : [];
  const prog = data && data.readingProgress && typeof data.readingProgress === "object" ? data.readingProgress : {};
  const rawRh = data && data.readingHighlights && typeof data.readingHighlights === "object" ? data.readingHighlights : {};
  const rhOut = {};
  Object.keys(rawRh).forEach((k) => {
    const arr = Array.isArray(rawRh[k]) ? rawRh[k] : [];
    rhOut[k] = arr
      .map((entry) => {
        if (Array.isArray(entry) && entry.length >= 2) {
          const s = Number(entry[0]);
          const e = Number(entry[1]);
          if (!Number.isNaN(s) && !Number.isNaN(e)) return { s: s, e: e };
          return null;
        }
        if (entry && typeof entry === "object") {
          const s = Number(entry.s);
          const e = Number(entry.e);
          if (!Number.isNaN(s) && !Number.isNaN(e)) return { s: s, e: e };
        }
        return null;
      })
      .filter(Boolean);
  });
  row.readingWorks = works;
  row.readingProgress = prog;
  row.readingHighlights = rhOut;
}

window.fetchAndAttachReadingStateSync = function (uname) {
  if (!window.useFirebase || !window.db || !uname) return Promise.resolve();
  const docId = readingStateFirestoreDocId(uname);
  if (!docId) return Promise.resolve();
  const ref = window.db.collection("global").doc(docId);
  return ref.get().then(function (snap) {
    if (snap.exists) {
      applyReadingStatePatchToUser(uname, snap.data() || {});
      if (typeof dbUserData !== "undefined") dbUserData = window.dbUserData;
      applyCloudUserData();
    }
  }).then(function () {
    if (typeof window.detachReadingStateSync === "function") window.detachReadingStateSync();
    _readingStateAttachedFor = uname;
    _readingStateUnsub = ref.onSnapshot(function (snap) {
      if (!snap.exists) return;
      applyReadingStatePatchToUser(uname, snap.data() || {});
      if (typeof dbUserData !== "undefined") dbUserData = window.dbUserData;
      applyCloudUserData();
    }, function (err) {
      console.error("Firestore okuma state (kullanıcı belgesi):", err);
    });
  });
};

window.detachReadingStateSync = function () {
  if (typeof _readingStateUnsub === "function") {
    try { _readingStateUnsub(); } catch (e) {}
  }
  _readingStateUnsub = null;
  _readingStateAttachedFor = null;
};

function applyDeckStatePatchToUser(uname, data) {
  if (!uname || !window.dbUserData) return;
  if (!window.dbUserData[uname]) window.dbUserData[uname] = {};
  const row = window.dbUserData[uname];
  const decks = data && data.decks && typeof data.decks === "object" ? data.decks : { "Genel Kelimeler": [] };
  const customDict = data && data.customDict && typeof data.customDict === "object" ? data.customDict : {};
  const lastActiveDeck = data && typeof data.lastActiveDeck === "string" ? data.lastActiveDeck : "Genel Kelimeler";
  row.decks = decks;
  row.customDict = customDict;
  row.lastActiveDeck = lastActiveDeck;
}

window.fetchAndAttachDeckStateSync = function (uname) {
  if (!window.useFirebase || !window.db || !uname) return Promise.resolve();
  const docId = deckStateFirestoreDocId(uname);
  if (!docId) return Promise.resolve();
  const ref = window.db.collection("global").doc(docId);
  return ref.get().then(function (snap) {
    if (snap.exists) {
      applyDeckStatePatchToUser(uname, snap.data() || {});
      if (typeof dbUserData !== "undefined") dbUserData = window.dbUserData;
      applyCloudUserData();
    }
  }).then(function () {
    if (typeof window.detachDeckStateSync === "function") window.detachDeckStateSync();
    _deckStateAttachedFor = uname;
    _deckStateUnsub = ref.onSnapshot(function (snap) {
      if (!snap.exists) return;
      applyDeckStatePatchToUser(uname, snap.data() || {});
      if (typeof dbUserData !== "undefined") dbUserData = window.dbUserData;
      applyCloudUserData();
    }, function (err) {
      console.error("Firestore deste state (kullanıcı belgesi):", err);
    });
  });
};

window.detachDeckStateSync = function () {
  if (typeof _deckStateUnsub === "function") {
    try { _deckStateUnsub(); } catch (e) {}
  }
  _deckStateUnsub = null;
  _deckStateAttachedFor = null;
};

window.fetchAndAttachUserStateSync = function (uname) {
  if (!window.useFirebase || !window.db || !uname) return Promise.resolve();
  const docId = userStateFirestoreDocId(uname);
  if (!docId) return Promise.resolve();
  const ref = window.db.collection("global").doc(docId);
  return ref.get().then(function (snap) {
    if (snap.exists) {
      applyUserStatePatchToUser(uname, snap.data() || {});
      if (typeof dbUserData !== "undefined") dbUserData = window.dbUserData;
      applyCloudUserData();
    }
  }).then(function () {
    if (typeof window.detachUserStateSync === "function") window.detachUserStateSync();
    _userStateAttachedFor = uname;
    _userStateUnsub = ref.onSnapshot(function (snap) {
      if (!snap.exists) return;
      applyUserStatePatchToUser(uname, snap.data() || {});
      if (typeof dbUserData !== "undefined") dbUserData = window.dbUserData;
      applyCloudUserData();
    }, function (err) {
      console.error("Firestore birleşik kullanıcı state (kullanıcı belgesi):", err);
    });
  });
};

window.detachUserStateSync = function () {
  if (typeof _userStateUnsub === "function") {
    try { _userStateUnsub(); } catch (e) {}
  }
  _userStateUnsub = null;
  _userStateAttachedFor = null;
};

window.pushUserStateToFirestore = function (uname) {
  if (!window.useFirebase || !window.db || !uname) return Promise.resolve();
  const docId = userStateFirestoreDocId(uname);
  if (!docId) return Promise.resolve();
  const payload = buildUserStatePayload(uname);
  return window.db.collection("global").doc(docId).set(payload).then(function () { return undefined; });
};

/**
 * Okuma tamamlama haritasını buluta yazar (kullanıcıya özel global/rd_… belgesi).
 * @returns {Promise<void>}
 */
window.pushReadingCompletedToFirestore = function (uname) {
  if (!window.useFirebase || !window.db || !uname) return Promise.resolve();
  const docId = readingCompletedFirestoreDocId(uname);
  if (!docId) return Promise.resolve();
  const row = window.dbUserData && window.dbUserData[uname];
  const ids =
    row && row.readingCompletedIds && typeof row.readingCompletedIds === "object" ? row.readingCompletedIds : {};
  const sanitized = {};
  Object.keys(ids).forEach((k) => {
    const n = Number(ids[k]);
    if (Number.isFinite(n) && n > 0) sanitized[k] = n;
  });
  const payload = {
    readingCompletedIds: sanitized,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  return window.db
    .collection("global")
    .doc(docId)
    // merge:true map alanlarında silinen anahtarları bırakabildiği için
    // tamamını overwrite ederek "İptal" sonrası geri gelmeyi engelliyoruz.
    .set(payload)
    .then(() => undefined)
    .catch(function (err) {
      console.error("pushReadingCompletedToFirestore", err);
      throw err;
    });
};

window.pushReadingStateToFirestore = function (uname) {
  if (!window.useFirebase || !window.db || !uname) return Promise.resolve();
  const docId = readingStateFirestoreDocId(uname);
  if (!docId) return Promise.resolve();
  const row = window.dbUserData && window.dbUserData[uname] ? window.dbUserData[uname] : {};
  const works = Array.isArray(row.readingWorks) ? row.readingWorks : [];
  const prog = row.readingProgress && typeof row.readingProgress === "object" ? row.readingProgress : {};
  const rawRh = row.readingHighlights && typeof row.readingHighlights === "object" ? row.readingHighlights : {};
  const rhOut = {};
  Object.keys(rawRh).forEach((k) => {
    const arr = Array.isArray(rawRh[k]) ? rawRh[k] : [];
    rhOut[k] = arr
      .map((entry) => {
        if (Array.isArray(entry) && entry.length >= 2) {
          const s = Number(entry[0]);
          const e = Number(entry[1]);
          if (!Number.isNaN(s) && !Number.isNaN(e)) return { s: s, e: e };
          return null;
        }
        if (entry && typeof entry === "object") {
          const s = Number(entry.s);
          const e = Number(entry.e);
          if (!Number.isNaN(s) && !Number.isNaN(e)) return { s: s, e: e };
        }
        return null;
      })
      .filter(Boolean);
  });
  const payload = {
    readingWorks: works,
    readingProgress: prog,
    readingHighlights: rhOut,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  return window.db.collection("global").doc(docId).set(payload).then(function () { return undefined; });
};

window.pushDeckStateToFirestore = function (uname) {
  if (!window.useFirebase || !window.db || !uname) return Promise.resolve();
  const docId = deckStateFirestoreDocId(uname);
  if (!docId) return Promise.resolve();
  const row = window.dbUserData && window.dbUserData[uname] ? window.dbUserData[uname] : {};
  const payload = {
    decks: row.decks && typeof row.decks === "object" ? row.decks : { "Genel Kelimeler": [] },
    customDict: row.customDict && typeof row.customDict === "object" ? row.customDict : {},
    lastActiveDeck: typeof row.lastActiveDeck === "string" ? row.lastActiveDeck : "Genel Kelimeler",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  return window.db.collection("global").doc(docId).set(payload).then(function () { return undefined; });
};

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

function normalizeLessonsListForUi(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const { __order, ...rest } = item;
      return rest;
    })
    .filter(Boolean);
}

function mergeLessonsPreferLatest(cloudList) {
  let localList = [];
  try {
    localList = JSON.parse(localStorage.getItem("y_lessons_db") || "[]");
  } catch (e) {
    localList = [];
  }
  const existingMem = Array.isArray(window.GLOBAL_LESSONS) ? window.GLOBAL_LESSONS : [];
  const merged = new Map();

  function upsert(list, sourceOrderOffset) {
    (Array.isArray(list) ? list : []).forEach((lesson, idx) => {
      if (!lesson || typeof lesson !== "object") return;
      const id = String(lesson.id || "").trim();
      if (!id) return;
      const incomingTs = Number(lesson.updatedAt || 0) || 0;
      const prev = merged.get(id);
      if (!prev) {
        merged.set(id, { ...lesson, __mergeOrder: sourceOrderOffset + idx });
        return;
      }
      const prevTs = Number(prev.updatedAt || 0) || 0;
      if (incomingTs >= prevTs) {
        merged.set(id, { ...prev, ...lesson, __mergeOrder: Math.min(prev.__mergeOrder, sourceOrderOffset + idx) });
      }
    });
  }

  // Bulut oncelikli, yerel tamamlayici.
  upsert(cloudList, 0);
  upsert(localList, 100000);
  upsert(existingMem, 200000);

  return Array.from(merged.values())
    .sort((a, b) => {
      const ao = Number(a.__order);
      const bo = Number(b.__order);
      if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) return ao - bo;
      return Number(a.__mergeOrder || 0) - Number(b.__mergeOrder || 0);
    })
    .map((lesson) => {
      const { __mergeOrder, ...rest } = lesson;
      return rest;
    });
}

function ingestLessonsStaticList(list) {
  if (!Array.isArray(list)) return;
  const normalized = normalizeLessonsListForUi(
    list
      .slice()
      .sort((a, b) => Number(a?.__order || 0) - Number(b?.__order || 0)),
  );
  const byId = new Map();
  normalized.forEach((lesson, idx) => {
    const id = String(lesson && lesson.id || "").trim();
    if (!id) return;
    if (!byId.has(id)) {
      byId.set(id, { ...lesson, __idx: idx });
      return;
    }
    const prev = byId.get(id);
    const prevTs = Number(prev.updatedAt || 0) || 0;
    const curTs = Number(lesson.updatedAt || 0) || 0;
    if (curTs >= prevTs) byId.set(id, { ...prev, ...lesson, __idx: prev.__idx });
  });
  const deduped = Array.from(byId.values())
    .sort((a, b) => Number(a.__idx || 0) - Number(b.__idx || 0))
    .map((x) => {
      const { __idx, ...rest } = x;
      return rest;
    });
  // Static modda tek kaynak lessons.json olmalı.
  // Local/bulut merge duplicate üretebildiği için doğrudan bunu kullan.
  window.GLOBAL_LESSONS = deduped;
  try {
    localStorage.setItem("y_lessons_db", JSON.stringify(window.GLOBAL_LESSONS));
  } catch (e) {}
  if (typeof window.renderLessonLibrary === "function") window.renderLessonLibrary();
  if (typeof window.populateAdminLessons === "function") window.populateAdminLessons();
}

async function fetchLessonsFromStaticDb() {
  try {
    const url = "assets/lessons/lessons.json?v=20260423a";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    if (!Array.isArray(data)) return false;
    ingestLessonsStaticList(data);
    return true;
  } catch (e) {
    console.error("Static lessons load failed:", e);
    return false;
  }
}

function ingestLessonsDoc(doc) {
  if (!doc.exists) return;
  const list = doc.data().list;
  if (!Array.isArray(list)) return;
  const normalizedCloud = normalizeLessonsListForUi(
    list.slice().sort((a, b) => Number(a?.__order || 0) - Number(b?.__order || 0)),
  );
  window.GLOBAL_LESSONS = mergeLessonsPreferLatest(normalizedCloud);
  try {
    localStorage.setItem("y_lessons_db", JSON.stringify(window.GLOBAL_LESSONS));
  } catch (e) {}
  if (typeof window.renderLessonLibrary === "function") window.renderLessonLibrary();
  if (typeof window.populateAdminLessons === "function") window.populateAdminLessons();
}

function ingestLessonsCollection(snapshot) {
  if (!snapshot || snapshot.empty) return;
  const normalizedCloud = normalizeLessonsListForUi(
    snapshot.docs
    .map((d) => d.data() || {})
    .sort((a, b) => Number(a?.__order || 0) - Number(b?.__order || 0))
  );
  window.GLOBAL_LESSONS = mergeLessonsPreferLatest(normalizedCloud);
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
    const safeGet = function (ref, label) {
      return ref.get().catch(function (err) {
        console.error("Firestore okuma hatası (" + label + "):", err);
        return null;
      });
    };
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
    const [usersSnap, userdataSnap, annSnap, teacherPubSnap, trafficSnap, lessonsColSnap, lessonsLegacySnap] =
      await Promise.all([
        safeGet(usersRef, "global/users"),
        safeGet(userdataRef, "global/userdata"),
        safeGet(annRef, "global/announcements"),
        safeGet(teacherPubRef, "global/teacher_public_practices"),
        safeGet(trafficRef, "global/traffic_stats"),
        window.USE_STATIC_LESSONS_DB ? Promise.resolve(null) : safeGet(lessonsColRef, "global_lessons"),
        window.USE_STATIC_LESSONS_DB ? Promise.resolve(null) : safeGet(lessonsLegacyRef, "global/lessons_db"),
      ]);

    if (usersSnap) ingestUsersDoc(usersSnap);
    if (userdataSnap) ingestUserdataDoc(userdataSnap);
    const unBoot = typeof currentUsername !== "undefined" && currentUsername ? currentUsername : null;
    if (unBoot && typeof window.fetchAndAttachUserStateSync === "function") {
      try {
        await window.fetchAndAttachUserStateSync(unBoot);
      } catch (e) {
        console.error("fetchAndAttachUserStateSync (boot)", e);
      }
    }
    if (annSnap) ingestAnnouncementsDoc(annSnap);
    if (teacherPubSnap) ingestTeacherPublicPracticesDoc(teacherPubSnap);
    if (trafficSnap) ingestTrafficDoc(trafficSnap);
    if (window.USE_STATIC_LESSONS_DB) {
      await fetchLessonsFromStaticDb();
    } else if (lessonsColSnap && !lessonsColSnap.empty) ingestLessonsCollection(lessonsColSnap);
    else if (lessonsLegacySnap) ingestLessonsDoc(lessonsLegacySnap);

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
    if (!window.USE_STATIC_LESSONS_DB) {
      lessonsColRef.onSnapshot(ingestLessonsCollection, (err) =>
        console.error("Firestore global_lessons dinleyicisi:", err),
      );
    }

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
    if (window.USE_STATIC_LESSONS_DB) {
      try { await fetchLessonsFromStaticDb(); } catch (e2) {}
    }
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
  return saveDb().then(function () {
    if (typeof window.pushUserStateToFirestore === "function") {
      return window.pushUserStateToFirestore(uname);
    }
    return undefined;
  });
}
// Diğer yardımcı fonksiyonlar (fetchContentFromUrl, loadPdfFile vb.) olduğu gibi devam edebilir.
