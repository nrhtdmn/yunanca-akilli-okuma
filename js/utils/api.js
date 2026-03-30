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
       db = firebase.firestore();
       useFirebase = true;
  }
} catch(e) {
  console.warn("Firebase kurulum hatası, yerel hafıza ile devam ediliyor.");
}

async function fetchFromFirebase() {
  if(!useFirebase) { finishInit(); return; }
  try {
    const usersDoc = await db.collection("global").doc("users").get();
    if (usersDoc.exists) { dbUsers = usersDoc.data(); dbUsers['nurhat'] = { password: 'Deniz28', role: 'admin', status: 'approved', isPremium: true, credits: 999999 }; } 
    else { await db.collection("global").doc("users").set(dbUsers); }

    const dataDoc = await db.collection("global").doc("userdata").get();
    if (dataDoc.exists) dbUserData = dataDoc.data();
    else await db.collection("global").doc("userdata").set(dbUserData);

    db.collection("global").doc("announcements").onSnapshot((doc) => {
        if (doc.exists) {
            dbAnnouncements = doc.data().list || [];
            localStorage.setItem('y_announcements_db', JSON.stringify(dbAnnouncements));
            updateBellIcon();
        } else {
            db.collection("global").doc("announcements").set({list: dbAnnouncements});
        }
    });
    finishInit();
  } catch(e) { console.error("Bulut okuma hatası", e); renderTVLibrary(); finishInit(); }
}

function saveDb() {
  localStorage.setItem('y_users_db', JSON.stringify(dbUsers)); 
  localStorage.setItem('y_userdata_db', JSON.stringify(dbUserData));
  if(useFirebase && db) {
     db.collection("global").doc("users").set(dbUsers).catch(e => console.error(e));
     db.collection("global").doc("userdata").set(dbUserData).catch(e => console.error(e));
  }
}

function syncCloudData() {
  if (!currentUsername) return;
  const currentHistory = dbUserData[currentUsername]?.examHistory || [];
  const deletedAnns = dbUserData[currentUsername]?.deletedAnnouncements || []; // YENİ: Silinen duyurular
  
  dbUserData[currentUsername] = {
    ...dbUserData[currentUsername],
    decks: userDecks,
    customDict: Object.fromEntries(userCustomDict),
    lastActiveDeck: lastActiveDeck,
    examHistory: currentHistory,
    deletedAnnouncements: deletedAnns // YENİ: Veritabanına yaz
  };
  saveDb();
}

async function fetchContentFromUrl() {
  if(!requireAuth(1)) return;
  const url = document.getElementById('url-input').value.trim(); const statusDiv = document.getElementById('url-status');
  if (!url) { showToastMessage("Lütfen geçerli bir URL girin."); return; }
  statusDiv.textContent = "⏳ İnternetten veri çekiliyor, lütfen bekleyin...";
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, { headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' }});
    if (!res.ok) throw new Error("HTTP " + res.status);
    let raw = await res.text();
    raw = raw.replace(/^(Title|URL|Published Time|Description|Source URL):.*$/gm, '').replace(/Proficiency \(C\d\)/gi, '').replace(/\d+\s*min read/gi, '').replace(/You are reading the free text version\.?/gi, '');
    const skipPatterns = [ /\[.*?\]\(.*?\)/, /^[A-Z\s]{2,30}$/, /Σύνταξη|Ακολουθήστε|Δείτε όλες|Tags|Similar|Headlines/i ];
    let lines = raw.split('\n').map(l => l.trim()).filter(line => {
      if (!line) return false;
      for (const p of skipPatterns) if (p.test(line)) return false;
      return true;
    });
    document.getElementById('input-text').value = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    switchInputTab('paste', document.querySelectorAll('.sub-tab-btn')[1]);
    statusDiv.textContent = ""; showToastMessage("✅ Web sayfasından metin başarıyla çekildi!");
  } catch(e) { statusDiv.textContent = "❌ Hata: Sayfa çekilemedi veya site engelliyor."; }
}

async function loadPdfFile(inputElement) {
  if(!requireAuth(1)) { inputElement.value = ''; return; }
  const file = inputElement.files[0]; if (!file) return; 
  const statusDiv = document.getElementById('pdf-status'); statusDiv.textContent = "⏳ PDF analiz ediliyor...";
  try {
    const arrayBuffer = await file.arrayBuffer(); const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise; let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i); const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + "\n\n";
    }
    document.getElementById('input-text').value = fullText.trim(); switchInputTab('paste', document.querySelectorAll('.sub-tab-btn')[1]);
    statusDiv.textContent = ""; showToastMessage(`✅ PDF Başarıyla Okundu (${pdf.numPages} Sayfa)`);
  } catch(e) { statusDiv.textContent = "❌ PDF okunamadı."; }
}

async function getSmartTranslation(word, contextSentence = "") {
  const cleanWord = word.toLowerCase().replace(/[.,!?;():"""]/g, "").trim();
  if (userCustomDict.has(cleanWord)) return userCustomDict.get(cleanWord);
  if (MASTER_DICT_MAP.has(cleanWord)) return MASTER_DICT_MAP.get(cleanWord);
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=el&tl=tr&dt=t&q=${encodeURIComponent(cleanWord)}`);
    const data = await res.json(); return data[0][0][0].toLowerCase().trim();
  } catch (error) { return "Çeviri hatası"; }
}

async function translateFullContext() {
  if (!activeContextSentence) return;
  if(!requireAuth(1)) return;

  const contextBox = document.getElementById('wp-context-box'); 
  const currentMean = document.getElementById('wp-mean-input').value.trim().toLowerCase();
  contextBox.innerHTML = `<em>Çevriliyor...</em>`;
  try {
    const resFull = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=el&tl=tr&dt=t&q=${encodeURIComponent(activeContextSentence)}`);
    const dataFull = await resFull.json(); let fullTranslation = dataFull[0].map(item => item[0]).join('');
    
    const safeGreek = activeWordString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const greekRegex = new RegExp(`(${safeGreek})`, 'gi');
    let highlightedGreek = activeContextSentence.replace(greekRegex, '<span class="translated-word-highlight">$1</span>');

    const resWord = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=el&tl=tr&dt=t&dt=bd&q=${encodeURIComponent(activeWordString)}`);
    const dataWord = await resWord.json(); let possibleMeanings = [];
    if (currentMean && currentMean !== "çeviri aranıyor..." && currentMean !== "çeviri hatası") possibleMeanings.push(currentMean);
    if (dataWord[0] && dataWord[0][0] && dataWord[0][0][0]) possibleMeanings.push(dataWord[0][0][0].toLowerCase());
    if (dataWord[1]) {
        dataWord[1].forEach(pG => {
            if (pG[2]) pG[2].forEach(aG => { if (aG[0]) possibleMeanings.push(aG[0].toLowerCase()); });
            if (pG[1]) pG[1].forEach(alt => possibleMeanings.push(alt.toLowerCase()));
        });
    }
    possibleMeanings = [...new Set(possibleMeanings.filter(m => m.length > 2))].sort((a, b) => b.length - a.length);

    let highlightedTranslation = fullTranslation;
    for (let mean of possibleMeanings) {
        const regex = new RegExp(`([^\\p{L}]|^)(${mean}\\p{L}*)`, 'gui');
        if (regex.test(highlightedTranslation)) { highlightedTranslation = highlightedTranslation.replace(regex, '$1<span class="translated-word-highlight">$2</span>'); break; }
    }
    contextBox.innerHTML = `<strong style="color:var(--accent)">Orijinal:</strong> ${highlightedGreek}<br><br><strong style="color:var(--success)">Çeviri:</strong> <span style="color:#fff; line-height: 1.6;">${highlightedTranslation}</span>`;
  } catch (e) { contextBox.innerHTML = `Çeviri alınamadı.`; }
}

async function fetchExamData() {
  try {
    const response = await fetch('sorular.json');
    if (!response.ok) throw new Error("JSON yüklenemedi");
    GLOBAL_SORU_BANKASI = await response.json();
    renderExamLibrary();
  } catch (error) {
    console.warn("Soru Bankası JSON bulunamadı veya hata oluştu:", error);
    document.getElementById('exam-grid-container').innerHTML = "<p style='text-align:center; color:var(--error);'>Sorular yüklenemedi. Lütfen sorular.json dosyasını kontrol edin.</p>";
  }
}