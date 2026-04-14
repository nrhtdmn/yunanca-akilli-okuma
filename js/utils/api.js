// --- GLOBAL DEĞİŞKENLER ---
window.dbUsers = JSON.parse(localStorage.getItem('y_users_db')) || {};
window.dbUserData = JSON.parse(localStorage.getItem('y_userdata_db')) || {};
window.dbAnnouncements = JSON.parse(localStorage.getItem('y_announcements_db')) || [];
window.currentUsername = localStorage.getItem('y_username') || null;
window.currentUser = null;
window.useFirebase = false;
window.db = null;

const firebaseConfig = {
    apiKey: "AIzaSyBD0BwWNj1ypc2oMk_ZndkwlqUsimC8Y4E",
    authDomain: "yunancaokuyucu.firebaseapp.com",
    projectId: "yunancaokuyucu",
    storageBucket: "yunancaokuyucu.firebasestorage.app",
    messagingSenderId: "434539375134",
    appId: "1:434539375134:web:2538e78f0d15489c26dc0f"
};

try {
    if (firebaseConfig.apiKey && !firebaseConfig.projectId.includes("YOUR_PROJECT")) {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        window.db = firebase.firestore();
        window.useFirebase = true;
    }
} catch (e) {
    console.warn("Firebase kurulum hatası, yerel hafıza ile devam ediliyor.");
}

async function fetchFromFirebase() {
    if (!window.useFirebase) { if(typeof finishInit === 'function') finishInit(); return; }
    try {
        // Kullanıcıları Canlı Dinle
        window.db.collection("global").doc("users").onSnapshot((doc) => {
            if (doc.exists) {
                window.dbUsers = { ...window.dbUsers, ...doc.data() };
                window.dbUsers['nurhat'] = { password: 'Deniz28', role: 'admin', status: 'approved', isPremium: true, credits: 999999 };
                localStorage.setItem('y_users_db', JSON.stringify(window.dbUsers));
                if (typeof updateUserUI === 'function') updateUserUI();
            }
        });

        // Verileri ve Duyuruları Çek
        const dataDoc = await window.db.collection("global").doc("userdata").get();
        if (dataDoc.exists) window.dbUserData = dataDoc.data();

        window.db.collection("global").doc("announcements").onSnapshot((doc) => {
            if (doc.exists) {
                window.dbAnnouncements = doc.data().list || [];
                localStorage.setItem('y_announcements_db', JSON.stringify(window.dbAnnouncements));
            }
        });

        // Konuları Canlı Dinle
        window.db.collection("global").doc("lessons_db").onSnapshot((doc) => {
            if (doc.exists) {
                window.GLOBAL_LESSONS = doc.data().list || [];
                localStorage.setItem('y_lessons_db', JSON.stringify(window.GLOBAL_LESSONS));
                if (typeof renderLessonLibrary === 'function') renderLessonLibrary();
            }
        });

        setTimeout(() => { if(typeof finishInit === 'function') finishInit(); }, 1000);
    } catch (e) {
        console.error("Bulut okuma hatası:", e);
        if(typeof finishInit === 'function') finishInit();
    }
}

function saveDb() {
    localStorage.setItem('y_users_db', JSON.stringify(window.dbUsers));
    localStorage.setItem('y_userdata_db', JSON.stringify(window.dbUserData));
    if (window.useFirebase && window.db) {
        window.db.collection("global").doc("users").set(window.dbUsers, { merge: true });
        window.db.collection("global").doc("userdata").set(window.dbUserData, { merge: true });
    }
}

function syncCloudData() {
    if (!window.currentUsername) return;
    window.dbUserData[window.currentUsername] = {
        ...window.dbUserData[window.currentUsername],
        decks: window.userDecks || {},
        lastActiveDeck: window.lastActiveDeck || "Genel Kelimeler"
    };
    saveDb();
}
