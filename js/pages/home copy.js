/* ==========================================
 * DESTE VE SÖZLÜK KAYIT İŞLEMLERİ
 * ========================================== */

function populateDeckSelects() {
  // Desteleri al ve HTML seçeneklerine çevir
  const optionsHtml = Object.keys(userDecks)
    .map(
      (deckName) =>
        `<option value="${deckName}">${deckName} (${userDecks[deckName].length} kelime)</option>`,
    )
    .join("");

  // 1. Sözlük Popup içindeki menü
  const popSelect = document.getElementById("wp-deck-select");
  if (popSelect) {
    popSelect.innerHTML = optionsHtml;
    popSelect.value = lastActiveDeck || "Genel Kelimeler";
  }

  // 2. Quiz sekmesindeki menü
  const quizSelect = document.getElementById("quiz-deck-select");
  if (quizSelect) quizSelect.innerHTML = optionsHtml;

  // 3. Okuma Panelindeki Deste Görünümü Menüsü (Sorun yaşadığınız yer)
  const viewSelect = document.getElementById("deck-view-select");
  if (viewSelect) {
    // Mevcut seçili değeri hafızada tut
    let currentVal = viewSelect.value || lastActiveDeck || "Genel Kelimeler";

    // Seçenekleri içine bas
    viewSelect.innerHTML =
      `<option value="all">Tüm Desteler</option>` + optionsHtml;

    // Seçili olanı tekrar ayarla (Eğer silinmişse Genel Kelimeler'e dön)
    if (currentVal === "all" || userDecks[currentVal]) {
      viewSelect.value = currentVal;
    } else {
      viewSelect.value = "Genel Kelimeler";
    }
  }
}

function deleteDeckEntirely(event, deckName) {
  if (event) event.stopPropagation();
  if (
    confirm(`"${deckName}" destesini tamamen silmek istediğinize emin misiniz?`)
  ) {
    delete userDecks[deckName];
    if (lastActiveDeck === deckName) lastActiveDeck = "Genel Kelimeler";

    const viewSelect = document.getElementById("deck-view-select");
    if (viewSelect && viewSelect.value === deckName) viewSelect.value = "all";

    syncCloudData();
    populateDeckSelects();
    renderDecksAccordion();
    showToastMessage(`🗑️ Deste başarıyla silindi.`);
  }
}

function loadUserData() {
  if (!currentUsername) return;
  if (!dbUserData[currentUsername]) {
    dbUserData[currentUsername] = {
      decks: { "Genel Kelimeler": [] },
      customDict: {},
      lastActiveDeck: "Genel Kelimeler",
    };
    saveDb();
  }
  const data = dbUserData[currentUsername];
  userDecks = data.decks || { "Genel Kelimeler": [] };
  userCustomDict = new Map(Object.entries(data.customDict || {}));
  lastActiveDeck = data.lastActiveDeck || "Genel Kelimeler";

  renderDecksAccordion();
  populateDeckSelects();
}

function updateUserUI() {
  const headerArea = document.getElementById("user-header-area");
  if (!currentUser) {
    headerArea.innerHTML = `<button class="auth-action-btn" onclick="showAuthModal(true)">Giriş Yap / Kayıt Ol</button>`;
    document.getElementById("main-sync-panel").style.display = "none";
    return;
  }

  let badges = `<button class="bell-btn" onclick="openAnnouncementsModal()" title="Duyurular">🔔<span class="bell-badge" id="bell-badge">0</span></button>`;

  // YENİ: Kullanıcı rozeti artık tıklanabilir ve Profili açıyor
  badges += `<div class="user-badge" onclick="openProfileModal()" title="Profil ve İstatistikleri Gör">👤 ${currentUsername}`;

  if (currentUser.role === "admin")
    badges += `<span class="premium-badge" style="background:#f87171; color:#fff;">ADMİN</span>`;
  else if (currentUser.isPremium)
    badges += `<span class="premium-badge">PREMIUM</span>`;
  else
    badges += `<span class="credit-badge">${currentUser.credits} Kredi</span>`;

  badges += `</div>`; // user-badge div'i kapandı

  if (currentUser.role === "admin")
    badges += `<button class="admin-btn" onclick="openAdminPanel()">⚙️ Yönetim Paneli</button>`;

  headerArea.innerHTML = badges;
  document.getElementById("main-sync-panel").style.display = "flex";
  updateBellIcon();
}

// YENİ FONKSİYON: Gelişmiş Profili Açma ve İstatistik Hesaplama
function openProfileModal() {
  if (!currentUser) return;

  // İsim ve Rozet
  document.getElementById("profile-username").textContent =
    currentUsername.toUpperCase();
  const roleBadge = document.getElementById("profile-role-badge");

  if (currentUser.role === "admin") {
    roleBadge.innerHTML = `<span class="premium-badge" style="background:#f87171; color:#fff; padding: 6px 12px; font-size:0.85rem;">SİSTEM YÖNETİCİSİ</span>`;
  } else if (currentUser.isPremium) {
    roleBadge.innerHTML = `<span class="premium-badge" style="padding: 6px 12px; font-size:0.85rem;">👑 PREMIUM ÜYE</span>`;
  } else {
    roleBadge.innerHTML = `<span style="background: rgba(255,255,255,0.1); color: var(--text-dim); padding: 5px 12px; border-radius: 12px; font-size:0.8rem; font-weight:bold;">STANDART ÜYE</span>`;
  }

  // İSTATİSTİK 1: Toplam Öğrenilen/Kaydedilen Kelime Sayısı
  let totalWords = 0;
  for (let deck in userDecks) {
    totalWords += userDecks[deck].length;
  }
  document.getElementById("profile-total-words").textContent = totalWords;

  // İSTATİSTİK 2 & 3: Toplam Sınav ve Ortalama Başarı
  const history = dbUserData[currentUsername]?.examHistory || [];
  document.getElementById("profile-total-exams").textContent = history.length;

  let avgScore = 0;
  if (history.length > 0) {
    let totalScore = 0;
    history.forEach((h) => (totalScore += h.score));
    avgScore = Math.round(totalScore / history.length);
  }
  document.getElementById("profile-avg-score").textContent = "%" + avgScore;

  // Üyelik Durumu Metni
  const statusText = document.getElementById("profile-status-text");
  if (currentUser.role === "admin") {
    statusText.innerHTML =
      "<b>Yönetici Yetkisi:</b> Tüm sistem ayarlarını ve üyeleri kontrol edebilirsiniz.";
  } else if (currentUser.isPremium) {
    statusText.innerHTML =
      "<b>Durum:</b> <span style='color:var(--success)'>Aktif</span><br><small style='color:var(--text-dim)'>Tüm araçlara, çevirilere ve testlere sınırsız erişim hakkınız var.</small>";
  } else {
    statusText.innerHTML = `<b>Kalan Kredi:</b> <span style='color:var(--error); font-size:1.2rem; font-weight:bold;'>${currentUser.credits}</span><br><small style='color:var(--text-dim)'>Metin okuma, çeviri ve test işlemleri kredi harcar. Krediniz bittiğinde yöneticiye başvurun.</small>`;
  }

  document.getElementById("profile-modal").style.display = "flex";
}

function finishInit() {
  initTTS();
  if (currentUsername && dbUsers[currentUsername]) {
    currentUser = dbUsers[currentUsername];
    loadUserData();
  }
updateUserUI();
  renderTextLibrary();
  renderVideoLibrary();
  renderTVLibrary();
  renderRadioLibrary();
  renderNewspaperLibrary();
  renderLessonLibrary(); // YENİ EKLEDİĞİMİZ KONU ANLATIMI
  fetchExamData();
  
}

function updateBellIcon() {
  if (!currentUser) return;
  const lastRead = dbUserData[currentUsername]?.lastReadAnnouncementsTime || 0;
  const unreadCount = dbAnnouncements.filter((a) => a.id > lastRead).length;
  const badge = document.getElementById("bell-badge");
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = "flex";
      badge.style.animation = "pulse 1.5s infinite";
    } else {
      badge.style.display = "none";
    }
  }
}

function sendAnnouncement() {
  const text = document.getElementById("admin-ann-text").value.trim();
  const link = document.getElementById("admin-ann-link").value.trim(); // YENİ: Linki al
  if (!text) return;

  const newAnn = {
    id: Date.now(),
    text: text,
    link: link, // YENİ: Linki objeye ekle
    date:
      new Date().toLocaleDateString("tr-TR") +
      " - " +
      new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
  };

  dbAnnouncements.unshift(newAnn);
  if (useFirebase && db) {
    db.collection("global").doc("announcements").set({ list: dbAnnouncements });
  }
  localStorage.setItem("y_announcements_db", JSON.stringify(dbAnnouncements));

  document.getElementById("admin-ann-text").value = "";
  document.getElementById("admin-ann-link").value = ""; // Kutuyu temizle
  showToastMessage("✅ Duyuru başarıyla tüm üyelere gönderildi!");
}

function openAnnouncementsModal() {
  const listContainer = document.getElementById("announcement-list");

  // Kullanıcının sildiği duyuruları al
  const deletedIds =
    currentUser && dbUserData[currentUsername]?.deletedAnnouncements
      ? dbUserData[currentUsername].deletedAnnouncements
      : [];

  // Silinmemiş duyuruları filtrele
  const visibleAnnouncements = dbAnnouncements.filter(
    (a) => !deletedIds.includes(a.id),
  );

  if (visibleAnnouncements.length === 0) {
    listContainer.innerHTML =
      '<p style="text-align:center; color:var(--text-dim); margin-top:30px;">Henüz bir duyuru bulunmuyor.</p>';
  } else {
    listContainer.innerHTML = visibleAnnouncements
      .map((a) => {
        let linkHtml = "";
        if (a.link) {
          // Link http ile başlıyorsa yeni sekmede aç, yoksa uygulama içi sekme değiştir
          if (a.link.startsWith("http")) {
            linkHtml = `<a href="${a.link}" target="_blank" style="color:var(--accent); text-decoration:underline; font-size:0.95rem; display:inline-block; margin-top:8px; font-weight:bold;">🔗 Bağlantıya Git</a>`;
          } else {
            linkHtml = `<button onclick="document.getElementById('announcement-modal').style.display='none'; switchMainTab('${a.link.replace("mtab-", "")}');" style="background:rgba(79, 142, 247, 0.15); border:1px solid var(--accent); color:var(--accent); border-radius:6px; padding:6px 12px; font-size:0.9rem; cursor:pointer; margin-top:8px; font-weight:bold;">👉 Oraya Git</button>`;
          }
        }

        return `
          <div class="announcement-item" id="ann-item-${a.id}">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 5px;">
                  <div class="announcement-date">${a.date}</div>
                  <button onclick="deleteUserAnnouncement(${a.id})" style="background:none; border:none; color:var(--error); cursor:pointer; font-size:1.1rem; line-height:1;" title="Bu duyuruyu sil">🗑️</button>
              </div>
              <div style="color:var(--text); line-height:1.5;">${a.text}</div>
              ${linkHtml}
          </div>`;
      })
      .join("");
  }

  document.getElementById("announcement-modal").style.display = "flex";

  if (dbAnnouncements.length > 0 && currentUsername) {
    if (!dbUserData[currentUsername]) dbUserData[currentUsername] = {};
    dbUserData[currentUsername].lastReadAnnouncementsTime =
      dbAnnouncements[0].id;
    syncCloudData();
    updateBellIcon();
  }
}

// YENİ: Kullanıcının kendi listesinden duyuruyu silmesi
function deleteUserAnnouncement(annId) {
  if (!currentUser) {
    showToastMessage("Silmek için giriş yapmalısınız.");
    return;
  }

  if (!dbUserData[currentUsername].deletedAnnouncements) {
    dbUserData[currentUsername].deletedAnnouncements = [];
  }

  // ID'yi silinenler listesine ekle ve buluta kaydet
  dbUserData[currentUsername].deletedAnnouncements.push(annId);
  syncCloudData();

  // Ekranda anında gizle
  const item = document.getElementById(`ann-item-${annId}`);
  if (item) {
    item.style.display = "none";
  }

  showToastMessage("Duyuru silindi.");
}

// Seviye kutucuklarına tıklandığında altındaki içerikleri açıp kapatacak yardımcı fonksiyon
window.toggleLevelFolder = function (safeLevel) {
  const targetFolder = document.getElementById("folder-" + safeLevel);

  // Eğer tıklanan kutucuğun içeriği zaten açıksa, sadece onu kapat
  if (targetFolder.style.display === "block") {
    targetFolder.style.display = "none";
    return;
  }

  // Önce ekrandaki açık olan tüm klasörleri gizle
  document.querySelectorAll(".level-folder-content").forEach((folder) => {
    folder.style.display = "none";
  });

  // Sadece tıklanan seviyenin klasörünü aç
  targetFolder.style.display = "block";
};

/* === READ KATALOĞU === */
function renderTextLibrary() {
  const container = document.getElementById("panel-library");
  let html = `<div style="text-align:center; margin-bottom:25px;">
                <h3 style="color:var(--accent); font-size: 1.6rem; margin-bottom:5px;">📚 Okuma Kütüphanesi</h3>
                <p style="color:var(--text-dim); font-size:0.95rem;">Önce seviye kutucuğuna tıklayın, ardından açılan menüden metninizi seçin.</p>
              </div>`;

  // ANA GRID BAŞLIYOR (Seviyeler ve alt menüler aynı döşemenin içinde olacak)
  html += `<div class="text-grid" style="margin-bottom: 20px; align-items: start;">`;

  LEVELS.forEach((level) => {
    const textsInLevel = METIN_KATALOGU.filter((t) => t.level === level);
    if (textsInLevel.length > 0) {
      const safeLevel = level.replace(/[^a-zA-Z0-9]/g, "_");

      // 1. KISIM: Seviye Kutucuğu
      html += `
        <div class="text-card" onclick="toggleLevelFolder('${safeLevel}')" style="text-align: center; border: 2px solid var(--accent); background: rgba(79, 142, 247, 0.05); padding: 20px; cursor: pointer;">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">🎓</div>
          <div class="text-card-title" style="font-size: 1.3rem; margin-bottom: 5px;">${level} Seviyesi</div>
          <div style="color: var(--text-dim); font-size: 0.9rem;">${textsInLevel.length} Okuma Parçası ➔</div>
        </div>`;

      // 2. KISIM: Alt Menü İçeriği (grid-column: 1 / -1 sayesinde bulunduğu satırda tam genişlik kaplar)
      html += `
      <div id="folder-${safeLevel}" class="level-folder-content" style="display: none; grid-column: 1 / -1; background: var(--surface-alt); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; animation: fadeIn 0.3s ease; box-shadow: var(--shadow);">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
            <h4 style="color:var(--accent); font-size: 1.2rem; margin:0;">📂 ${level} Metinleri</h4>
            <button class="secondary-btn" onclick="toggleLevelFolder('${safeLevel}')" style="padding: 5px 10px; font-size: 0.85rem; border-color: var(--error); color: var(--error);">✕ Kapat</button>
        </div>`;

      const categories = [...new Set(textsInLevel.map((t) => t.category))];
      categories.forEach((cat) => {
        const textsInCat = textsInLevel.filter((t) => t.category === cat);

        // Varsa kategori başlığı (Örn: Günlük Yaşam)
        if (cat) {
          html += `<div style="color:var(--text-dim); margin: 0 0 10px 5px; font-weight: bold; font-size: 0.95rem;">🏷️ ${cat}</div>`;
        }

        // O seviyedeki metinleri kendi içindeki KUTUCUKLAR (grid) olarak listeliyoruz
        html += `<div class="text-grid" style="margin-bottom: 25px;">`;
        textsInCat.forEach((item) => {
          html += `
            <div class="text-card" onclick="openSampleText('${item.id}')">
              <div class="text-card-title">${item.title}</div>
              <div class="text-card-play">📖 Oku ➔</div>
            </div>`;
        });
        html += `</div>`;
      });

      html += `</div>`; // Alt menü klasörünü kapatıyoruz
    }
  });

  html += `</div>`; // Ana grid'i kapatıyoruz
  container.innerHTML = html;
}
async function openSampleText(id) {
  if (!requireAuth(1)) return;
  showToastMessage("⏳ Metin yükleniyor...");
  try {
    const res = await fetch(`ornek-metinler/${id}.txt`);
    if (!res.ok)
      throw new Error(`'ornek-metinler/${id}.txt' dosyası bulunamadı.`);
    const text = await res.text();
    document.getElementById("input-text").value = text;
    processAndRenderText();
    showToastMessage("✅ Metin başarıyla yüklendi!");
  } catch (e) {
    showToastMessage("❌ Hata: " + e.message);
  }
}

function processAndRenderText() {
  const rawText = document.getElementById("input-text").value;
  if (!rawText.trim()) {
    showToastMessage("Lütfen işlenecek bir metin girin.");
    return;
  }
  const readerDiv = document.getElementById("reader");
  readerDiv.innerHTML = "";
  readerDiv.style.display = "block";

  const toolbar = document.createElement("div");
  toolbar.className = "reader-toolbar";
  toolbar.innerHTML = `
    <div class="reader-toolbar-left">📖 Kelimeye tıkla → çeviri + telaffuz</div>
    <div class="reader-toolbar-right">
      <button class="toolbar-btn tts-toolbar-btn" onclick="speakAllText()" title="Tüm metni sesli oku">🔊 Oku</button>
      <button class="toolbar-btn tts-toolbar-btn" onclick="togglePauseSpeech()" title="Duraklat/Devam Et">⏸ Duraklat</button>
      <button class="toolbar-btn" onclick="stopSpeech()" title="Seslendirmeyi durdur">⏹ Durdur</button>
    <button class="secondary-btn" onclick="clearReader()" style="border-color:var(--error); color:var(--error); padding: 5px 10px; font-size: 0.85rem; margin-left: 5px;" title="Okuma alanını temizle">🗑️ Temizle</button>

      </div>`;
  readerDiv.appendChild(toolbar);

  globalTextForTTS = "";
  allWordSpans = [];
  rawText.split("\n").forEach((line) => {
    if (!line.trim()) {
      readerDiv.appendChild(document.createElement("br"));
      globalTextForTTS += "\n";
      return;
    }
    const pContainer = document.createElement("div");
    pContainer.style.marginBottom = "15px";
    line.split(/(\s+)/).forEach((token) => {
      if (/[\u0370-\u03FF]/.test(token)) {
        const span = document.createElement("span");
        span.className = "tok";
        span.textContent = token;
        span.setAttribute("data-start", globalTextForTTS.length);
        globalTextForTTS += token;
        span.setAttribute("data-end", globalTextForTTS.length);
        span.onclick = (e) => triggerWordPopup(e, token, line);
        pContainer.appendChild(span);
        allWordSpans.push(span);
      } else {
        pContainer.appendChild(document.createTextNode(token));
        globalTextForTTS += token;
      }
    });
    readerDiv.appendChild(pContainer);
    globalTextForTTS += "\n";
  });
  renderDecksAccordion();
  window.scrollTo({ top: readerDiv.offsetTop - 30, behavior: "smooth" });
}

function clearTextInputs() {
  document.getElementById("input-text").value = "";
  document.getElementById("reader").innerHTML = "";
  document.getElementById("reader").style.display = "none";
  stopSpeech();
}

/* === SÖZLÜK && DESTE İŞLEMLERİ === */

function createNewDeck() {
  const newName = prompt("Yeni deste adı girin:");
  if (newName && newName.trim()) {
    const cleanName = newName.trim();
    if (!userDecks[cleanName]) {
      userDecks[cleanName] = [];
      lastActiveDeck = cleanName;
      syncCloudData();
      populateDeckSelects();
      renderDecksAccordion();
      showToastMessage(`"${cleanName}" destesi oluşturuldu.`);
    } else {
      showToastMessage("Bu isimde bir deste zaten var!");
    }
  }
}

function saveWordToDeck() {
  const grWord = document.getElementById("wp-gr").textContent.trim();
  const trMean = document.getElementById("wp-mean-input").value.trim();
  const targetDeck = document.getElementById("wp-deck-select").value;
  if (!trMean || trMean === "Çeviri aranıyor...") {
    showToastMessage("Lütfen geçerli bir anlam girin.");
    return;
  }
  if (!userDecks[targetDeck]) userDecks[targetDeck] = [];
  if (userDecks[targetDeck].some((item) => item.gr === grWord)) {
    showToastMessage("Bu kelime destede zaten mevcut!");
  } else {
    userDecks[targetDeck].push({ gr: grWord, tr: trMean });
    lastActiveDeck = targetDeck;
    syncCloudData();
    renderDecksAccordion();
    populateDeckSelects();
    showToastMessage("📚 Kelime desteye eklendi.");
  }
  closePopup();
}

function saveWordToCustomDict() {
  const cleanWord = document
    .getElementById("wp-gr")
    .textContent.toLowerCase()
    .replace(/[.,!?;():]/g, "")
    .trim();
  const newMean = document.getElementById("wp-mean-input").value.trim();
  if (newMean) {
    userCustomDict.set(cleanWord, newMean);
    syncCloudData();
    showToastMessage("💾 Sözlüğe geçici olarak işlendi.");
  }
}

// 1. Desteyi Tamamen Silme (Event ve Hata Korumalı)
function deleteDeckEntirely(event, deckName) {
  if (event) event.stopPropagation(); // Tıklamanın klasörü açıp kapatmasını engeller

  if (
    confirm(`"${deckName}" destesini tamamen silmek istediğinize emin misiniz?`)
  ) {
    delete userDecks[deckName];
    if (lastActiveDeck === deckName) lastActiveDeck = "Genel Kelimeler";
    syncCloudData();
    renderDecksAccordion();
    populateDeckSelects();
    showToastMessage(`🗑️ Deste başarıyla silindi.`);
  }
}

// 2. Desteden Tek Kelime Silme
function deleteWordFromDeck(deckName, wordIndex) {
  if (confirm("Bu kelimeyi silmek istediğinize emin misiniz?")) {
    userDecks[deckName].splice(wordIndex, 1);
    syncCloudData();
    renderDecksAccordion();
    populateDeckSelects();
  }
}

// 3. Kelime Destelerini Ekrana Çizdirme (Akordiyon)
/* ==========================================
 * DESTE VE SÖZLÜK KAYIT İŞLEMLERİ (GÜNCELLENMİŞ)
 * ========================================== */

// Deste menülerini dolduran ana fonksiyon
function populateDeckSelects() {
  // Veriler henüz gelmediyse işlemi durdur
  if (typeof userDecks === "undefined" || !userDecks) return;

  // Desteleri al ve HTML seçeneklerine çevir
  const optionsHtml = Object.keys(userDecks)
    .map(
      (deckName) =>
        `<option value="${deckName}">${deckName} (${userDecks[deckName].length} kelime)</option>`,
    )
    .join("");

  // 1. Sözlük Popup içindeki menü
  const popSelect = document.getElementById("wp-deck-select");
  if (popSelect) {
    popSelect.innerHTML = optionsHtml;
    popSelect.value = lastActiveDeck || "Genel Kelimeler";
  }

  // 2. Quiz sekmesindeki menü
  const quizSelect = document.getElementById("quiz-deck-select");
  if (quizSelect) quizSelect.innerHTML = optionsHtml;

  // 3. Dışa Aktarma Menüsü
  const exportSelect = document.getElementById("export-deck-select");
  if (exportSelect)
    exportSelect.innerHTML =
      `<option value="all">Tüm Desteler</option>` + optionsHtml;

  // 4. Okuma Panelindeki Ana Deste Görünümü Menüsü
  const viewSelect = document.getElementById("deck-view-select");
  if (viewSelect) {
    let currentVal = viewSelect.value || lastActiveDeck || "all";

    // Seçenekleri içine bas
    viewSelect.innerHTML =
      `<option value="all">Tüm Desteler</option>` + optionsHtml;

    // Seçili olanı tekrar ayarla
    if (currentVal === "all" || userDecks[currentVal]) {
      viewSelect.value = currentVal;
    } else {
      viewSelect.value = "all"; // Hata önleyici: Deste yoksa tümünü seç
    }
  }
}

// Desteleri Ekrana Çizen Fonksiyon
function renderDecksAccordion() {
  const displayContainer = document.getElementById("deck-display");
  if (!displayContainer || typeof userDecks === "undefined") return;
  displayContainer.innerHTML = "";

  const viewSelect = document.getElementById("deck-view-select");
  if (!viewSelect) return;

  const selectedDeckName = viewSelect.value;

  for (let deckName in userDecks) {
    if (selectedDeckName !== "all" && deckName !== selectedDeckName) continue;

    const wordList = userDecks[deckName];
    const safeId = deckName.replace(/[^a-zA-Z0-9]/g, "_");
    let wordsHtml = "";

    if (wordList.length === 0) {
      wordsHtml = `<p style="color:var(--text-dim); text-align:center;">Bu destede henüz kelime yok.</p>`;
    } else {
      wordsHtml = wordList
        .map(
          (item, index) => `
            <div class="word-item">
                <span><b>${item.gr}</b> ${item.tr}</span>
                <div style="display:flex; gap:6px; align-items:center;">
                    <button class="word-item-tts" onclick="speakGreek('${item.gr.replace(/'/g, "\\'")}');" title="Dinle">🔊</button>
                    <button class="del-btn" onclick="deleteWordFromDeck('${deckName.replace(/'/g, "\\'")}', ${index})" title="Sil">🗑️</button>
                </div>
            </div>`,
        )
        .join("");
    }

    const safeDeckName = deckName.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const deleteDeckBtn =
      deckName !== "Genel Kelimeler"
        ? `<button class="del-btn" onclick="deleteDeckEntirely(event, '${safeDeckName}')" style="margin-right:15px;" title="Desteyi Sil">Desteyi Sil</button>`
        : ``;

    displayContainer.innerHTML += `
        <div class="deck-section" ${selectedDeckName !== "all" ? 'style="border-color: var(--accent);"' : ""}>
            <div class="deck-header" onclick="toggleAccordion('deck-${safeId}')" ${selectedDeckName !== "all" ? 'style="background: #1c212d;"' : ""}>
                <strong>📂 ${deckName} (${wordList.length} kelime)</strong>
                <div style="display:flex; align-items:center;">
                    ${deleteDeckBtn}
                    <span class="deck-arrow ${selectedDeckName !== "all" ? "open" : ""}" id="arrow-deck-${safeId}">▼</span>
                </div>
            </div>
            <div class="deck-content ${selectedDeckName !== "all" ? "open" : ""}" id="content-deck-${safeId}">${wordsHtml}</div>
        </div>`;
  }
}

function deleteDeckEntirely(event, deckName) {
  if (event) event.stopPropagation();
  if (
    confirm(`"${deckName}" destesini tamamen silmek istediğinize emin misiniz?`)
  ) {
    delete userDecks[deckName];
    if (lastActiveDeck === deckName) lastActiveDeck = "Genel Kelimeler";

    const viewSelect = document.getElementById("deck-view-select");
    if (viewSelect && viewSelect.value === deckName) viewSelect.value = "all";

    syncCloudData();
    populateDeckSelects();
    renderDecksAccordion();
    showToastMessage(`🗑️ Deste başarıyla silindi.`);
  }
}

/* ==========================================
 * 🔥 AKILLI TETİKLEYİCİ (VERİ GELDİĞİNDE LİSTEYİ DOLDURUR)
 * ========================================== */
let deckCheckInterval = setInterval(() => {
  // userDecks buluttan indiyse ve içi doluysa menüleri hemen güncelle
  if (typeof userDecks !== "undefined" && Object.keys(userDecks).length > 0) {
    populateDeckSelects();
    renderDecksAccordion();
    clearInterval(deckCheckInterval); // Görev tamamlandı, tetikleyiciyi durdur
  }
}, 300); // Saniyede 3 kez verilerin inip inmediğini kontrol eder
/* ==========================================
 * CSV İÇE VE DIŞA AKTARMA MOTORU
 * ========================================== */

// Desteleri CSV Olarak İndirme (Dışa Aktar)
// Desteleri Ekrana Çizen Fonksiyon
function renderDecksAccordion() {
  const displayContainer = document.getElementById("deck-display");
  if (!displayContainer || typeof userDecks === "undefined") return;
  displayContainer.innerHTML = "";

  const viewSelect = document.getElementById("deck-view-select");
  if (!viewSelect) return;

  const selectedDeckName = viewSelect.value;

  for (let deckName in userDecks) {
    if (selectedDeckName !== "all" && deckName !== selectedDeckName) continue;

    const wordList = userDecks[deckName];
    const safeId = deckName.replace(/[^a-zA-Z0-9]/g, "_");
    let wordsHtml = "";

    if (wordList.length === 0) {
      wordsHtml = `<p style="color:var(--text-dim); text-align:center;">Bu destede henüz kelime yok.</p>`;
    } else {
      wordsHtml = wordList
        .map(
          (item, index) => `
            <div class="word-item">
                <span><b>${item.gr}</b> ${item.tr}</span>
                <div style="display:flex; gap:6px; align-items:center;">
                    <button class="word-item-tts" onclick="speakGreek('${item.gr.replace(/'/g, "\\'")}');" title="Dinle">🔊</button>
                    <button class="del-btn" onclick="deleteWordFromDeck('${deckName.replace(/'/g, "\\'")}', ${index})" title="Sil">🗑️</button>
                </div>
            </div>`,
        )
        .join("");
    }

    const safeDeckName = deckName.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const deleteDeckBtn =
      deckName !== "Genel Kelimeler"
        ? `<button class="del-btn" onclick="deleteDeckEntirely(event, '${safeDeckName}')" style="margin-right:15px;" title="Desteyi Sil">Desteyi Sil</button>`
        : ``;

    // YENİ: ${selectedDeckName !== 'all' ? 'open' : ''} kısımları tamamen silindi.
    // Artık klasörler her durumda kapalı (katlanmış) olarak gelir.
    displayContainer.innerHTML += `
        <div class="deck-section" ${selectedDeckName !== "all" ? 'style="border-color: var(--accent);"' : ""}>
            <div class="deck-header" onclick="toggleAccordion('deck-${safeId}')" ${selectedDeckName !== "all" ? 'style="background: #1c212d;"' : ""}>
                <strong>📂 ${deckName} (${wordList.length} kelime)</strong>
                <div style="display:flex; align-items:center;">
                    ${deleteDeckBtn}
                    <span class="deck-arrow" id="arrow-deck-${safeId}">▼</span>
                </div>
            </div>
            <div class="deck-content" id="content-deck-${safeId}">${wordsHtml}</div>
        </div>`;
  }
}

// Desteleri CSV Olarak İndirme (Dışa Aktar)
function exportDecksToCSV() {
  if (!currentUser) {
    showToastMessage("⚠️ CSV indirmek için giriş yapmalısınız.");
    return;
  }

  // YENİ: Artık doğrudan yeni eklediğimiz deck-view-select menüsüne bakıyor.
  const viewSelect = document.getElementById("deck-view-select");
  if (!viewSelect) return;

  const selectedDeck = viewSelect.value;

  let csvContent = "Yunanca,Turkce,Deste Adi\n";
  let exportCount = 0;

  for (let deckName in userDecks) {
    if (selectedDeck !== "all" && deckName !== selectedDeck) continue;

    userDecks[deckName].forEach((word) => {
      let safeGr = `"${word.gr.replace(/"/g, '""')}"`;
      let safeTr = `"${word.tr.replace(/"/g, '""')}"`;
      let safeDeck = `"${deckName.replace(/"/g, '""')}"`;

      csvContent += `${safeGr},${safeTr},${safeDeck}\n`;
      exportCount++;
    });
  }

  if (exportCount === 0) {
    showToastMessage("⚠️ İndirilecek kelime bulunamadı (Deste boş olabilir).");
    return;
  }

  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);

  let fileName =
    selectedDeck === "all"
      ? `Tum_Desteler_${currentUsername}.csv`
      : `${selectedDeck.replace(/[^a-zA-Z0-9]/g, "_")}_${currentUsername}.csv`;

  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToastMessage(`✅ ${exportCount} kelime başarıyla indirildi.`);
}

// CSV Dosyasından Destelere Veri Yükleme (İçe Aktar)
function importDecksFromCSV(event) {
  if (!currentUser) {
    showToastMessage("⚠️ Veri yüklemek için giriş yapmalısınız.");
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const lines = text.split(/\r?\n/); // Satırları ayır
    let importCount = 0;

    // Satır satır okuma işlemi (İlk satır başlık olduğu için i=1'den başlıyoruz)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // CSV Satırını güvenli bir şekilde sütunlara bölme (Tırnak içindeki virgülleri korur)
      const pattern = /(?:^|,)("(?:[^"]|"")*"|[^,]*)/g;
      let columns = [];
      let match;
      while ((match = pattern.exec(line))) {
        let value = match[1];
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1).replace(/""/g, '"');
        }
        columns.push(value);
      }

      // Sütunların doğruluğunu kontrol et
      if (columns.length >= 3) {
        // YENİ: Okuma sırası Yunanca(0), Türkçe(1), Deste Adı(2) olarak güncellendi
        let grWord = columns[0].trim();
        let trMean = columns[1].trim();
        let deckName = columns[2].trim();

        if (deckName && grWord && trMean) {
          if (!userDecks[deckName]) {
            userDecks[deckName] = []; // Yeni deste oluştur
          }

          // Kelime o destede zaten yoksa ekle (Kopya kelimeleri engeller)
          if (!userDecks[deckName].some((w) => w.gr === grWord)) {
            userDecks[deckName].push({ gr: grWord, tr: trMean });
            importCount++;
          }
        }
      }
    }

    if (importCount > 0) {
      syncCloudData(); // Buluta kaydet
      renderDecksAccordion(); // Ekranda göster
      populateDeckSelects(); // Açılır menüleri güncelle
      showToastMessage(
        `🎉 Tebrikler! ${importCount} yeni kelime destelerinize eklendi.`,
      );
    } else {
      showToastMessage(
        "⚠️ Eklenecek yeni kelime bulunamadı veya dosya formatı hatalı.",
      );
    }

    event.target.value = ""; // Inputu sıfırla ki aynı dosya tekrar seçilebilsin
  };

  reader.readAsText(file, "UTF-8");
}
/* === QUIZ & E-YDS SİSTEMİ === */
function startAdvancedQuiz(isRetry = false) {
  const mode = document.getElementById("quiz-mode-select").value;
  if (!isRetry) {
    const deckName = document.getElementById("quiz-deck-select").value;
    const deck = userDecks[deckName];
    if (!deck || deck.length === 0) {
      showToastMessage("Seçilen destede kelime yok!");
      return;
    }
    let shuffledDeck = [...deck].sort(() => Math.random() - 0.5);
    const limit = document.getElementById("quiz-limit-select").value;
    if (limit !== "all") {
      shuffledDeck = shuffledDeck.slice(0, parseInt(limit));
    }
    currentQuizPool = shuffledDeck;
    quizMistakes = [];
    correctCount = 0;
  } else {
    currentQuizPool = [...quizMistakes]
      .map((m) => ({ gr: m.gr, tr: m.tr }))
      .sort(() => Math.random() - 0.5);
    quizMistakes = [];
    correctCount = 0;
  }
  totalInitialWords = currentQuizPool.length;
  currentQuizIndex = 0;
  document.body.classList.add("focus-mode");
  document.getElementById("quiz-setup-view").style.display = "none";
  document.getElementById("quiz-result-view").style.display = "none";
  document.getElementById("quiz-active-view").style.display = "block";
  loadNextQuizQuestion();
}
function retryMistakes() {
  startAdvancedQuiz(true);
}

function updateQuizUI() {
  let progressRatio = (correctCount / totalInitialWords) * 100;
  if (progressRatio > 100) progressRatio = 100;
  document.getElementById("quiz-progress-text").textContent =
    `ÖĞRENİLEN: ${correctCount} / ${totalInitialWords}`;
  document.getElementById("quiz-mistake-counter").textContent =
    `HATA: ${quizMistakes.length}`;
  document.getElementById("quiz-progress-bar").style.width =
    `${progressRatio}%`;
}

function recordMistake(wordObj, modeName) {
  if (!quizMistakes.some((w) => w.gr === wordObj.gr)) {
    quizMistakes.push({ gr: wordObj.gr, tr: wordObj.tr, type: modeName });
  }
}
function pushToPoolIfWrong(wordObj) {
  currentQuizPool.push(wordObj);
}

function finishQuiz() {
  document.body.classList.remove("focus-mode");
  document.getElementById("quiz-active-view").style.display = "none";
  document.getElementById("quiz-result-view").style.display = "block";
  document.getElementById("res-total").textContent = totalInitialWords;
  let finalCorrect = totalInitialWords - quizMistakes.length;
  if (finalCorrect < 0) finalCorrect = 0;
  document.getElementById("res-correct").textContent = finalCorrect;
  document.getElementById("res-wrong").textContent = quizMistakes.length;
  let score = Math.round((finalCorrect / totalInitialWords) * 100) || 0;
  if (score > 100) score = 100;
  document.getElementById("res-score").textContent = `%${score}`;
  const table = document.getElementById("mistakes-table");
  table.innerHTML = "";
  if (quizMistakes.length > 0) {
    document.getElementById("mistakes-container").style.display = "block";
    document.getElementById("retry-mistakes-btn").style.display = "inline-flex";
    let th = `<tr><th>Yunanca</th><th>Türkçe</th></tr>`;
    table.innerHTML =
      th +
      quizMistakes
        .map((m) => `<tr><td><b>${m.gr}</b></td><td>${m.tr}</td></tr>`)
        .join("");
  } else {
    document.getElementById("mistakes-container").style.display = "none";
    document.getElementById("retry-mistakes-btn").style.display = "none";
  }
}

/* === OTOMATİK DİNLEME (AUTOPLAY) DEĞİŞKENLERİ === */
let autoplayTimeout = null;
let isAutoplayPaused = false;

function toggleAutoplay() {
    const btn = document.getElementById('autoplay-btn');
    if (isAutoplayPaused) {
        isAutoplayPaused = false;
        btn.innerHTML = "⏸ Duraklat";
        loadNextQuizQuestion(); // Kaldığı yerden oku ve devam et
    } else {
        isAutoplayPaused = true;
        btn.innerHTML = "▶️ Devam Et";
        clearTimeout(autoplayTimeout);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (typeof stopSpeech === 'function') stopSpeech(); 
    }
}

function loadNextQuizQuestion() {
  if (correctCount >= totalInitialWords || currentQuizIndex >= currentQuizPool.length) { finishQuiz(); return; }
  updateQuizUI(); isQuestionActive = true; currentQuizQuestion = currentQuizPool[currentQuizIndex];
  const mode = document.getElementById('quiz-mode-select').value; 
  const area = document.getElementById('quiz-work-area'); 
  const feedback = document.getElementById('quiz-feedback'); 
  feedback.innerHTML = ""; feedback.className = "";
  const speakBtn = `<button class="quiz-speak-btn" onclick="speakGreek('${currentQuizQuestion.gr.replace(/'/g,"\\'")}', this)">🔊</button>`;

  if (mode === 'multi') {
    let allTr = Object.values(userDecks).flat().map(i => i.tr).filter(t => t !== currentQuizQuestion.tr); let opts = [currentQuizQuestion.tr, ...[...new Set(allTr)].sort(()=>Math.random()-0.5).slice(0,3)].sort(()=>Math.random()-0.5);
    area.innerHTML = `<div class="quiz-word-row"><div class="quiz-big-word">${currentQuizQuestion.gr}</div>${speakBtn}</div><div class="quiz-options-grid">${opts.map(opt => `<button class="quiz-opt-btn" onclick="evalMulti('${opt.replace(/'/g, "\\'")}')">${opt}</button>`).join('')}</div>`;
  } else if (mode === 'listen') {
    let allTr = Object.values(userDecks).flat().map(i => i.tr).filter(t => t !== currentQuizQuestion.tr); let opts = [currentQuizQuestion.tr, ...[...new Set(allTr)].sort(()=>Math.random()-0.5).slice(0,3)].sort(()=>Math.random()-0.5);
    area.innerHTML = `<div style="color:var(--text-dim); margin-bottom:15px; font-size:1.1rem;">Duyduğunuz kelimenin anlamını seçin:</div><div class="quiz-word-row"><div class="quiz-big-word" style="filter: blur(12px); user-select:none;" id="hidden-gr-word">??????</div><button class="quiz-speak-btn" style="width:75px; height:75px; background:var(--accent); color:#fff;" onclick="speakGreek('${currentQuizQuestion.gr.replace(/'/g,"\\'")}', this)">▶️</button></div><div class="quiz-options-grid">${opts.map(opt => `<button class="quiz-opt-btn" onclick="evalListen('${opt.replace(/'/g, "\\'")}')">${opt}</button>`).join('')}</div>`;
    setTimeout(()=>speakGreek(currentQuizQuestion.gr), 500); 
  } else if (mode === 'write') {
    area.innerHTML = `<div class="quiz-word-row"><div class="quiz-big-word">${currentQuizQuestion.gr}</div>${speakBtn}</div><input type="text" id="quiz-write-input" placeholder="Türkçe karşılığı nedir?" autocomplete="off" onkeydown="if(event.key==='Enter') evalWrite()"><div style="display:flex; gap:10px; width:100%; max-width:450px;"><button class="main-btn" style="flex:2; padding:18px;" onclick="evalWrite()">Cevapla</button><button class="secondary-btn" style="flex:1;" onclick="giveWriteHint()">İpucu</button></div>`; setTimeout(() => document.getElementById('quiz-write-input').focus(), 100);
  } else if (mode === 'flash') {
    area.innerHTML = `<div class="quiz-word-row"><div class="quiz-big-word">${currentQuizQuestion.gr}</div>${speakBtn}</div><div id="flash-answer" style="display:none; font-size:2.2rem; color:var(--success); font-weight:bold; margin-bottom:30px; animation:fadeIn 0.3s;">${currentQuizQuestion.tr}</div><button class="main-btn" id="flash-show-btn" style="padding:20px 50px; font-size:1.2rem;" onclick="document.getElementById('flash-answer').style.display='block'; this.style.display='none'; document.getElementById('flash-controls').style.display='flex';">Anlamını Göster</button><div id="flash-controls" style="display:none; gap:15px; width:100%; max-width:450px; margin-top:10px;"><button class="main-btn" style="flex:1; background:var(--error); padding:18px;" onclick="evalFlash(false)">❌ Bilemedim</button><button class="main-btn" style="flex:1; background:var(--success); padding:18px;" onclick="evalFlash(true)">✅ Biliyordum</button></div>`;
  } else if (mode === 'autoplay') {
    // --- YENİ EKLENEN OTOMATİK DİNLEME MODU ---
    if (isAutoplayPaused) return; 
    
    area.innerHTML = `
        <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; min-height: 220px; width: 100%;">
            <div style="font-size: 3.5rem; font-weight: bold; color: var(--accent); margin-bottom: 25px; text-shadow: 0 4px 15px rgba(0,0,0,0.3);">${currentQuizQuestion.gr}</div>
            <div style="font-size: 2rem; color: var(--success); font-weight: bold; background: rgba(74, 222, 128, 0.1); padding: 15px 40px; border-radius: 12px; border: 1px solid var(--success);">${currentQuizQuestion.tr}</div>
        </div>
        <div style="margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 15px;">
            <div class="tts-pulse" style="display: block; width: 30px; height: 30px; background: var(--tts-color); border-radius: 50%; animation: pulse 1.5s infinite;"></div>
            <span style="color: var(--text-dim); font-weight:bold; letter-spacing: 1px;">OTOMATİK DİNLEME MODU 🎧</span>
            <button class="secondary-btn" id="autoplay-btn" onclick="toggleAutoplay()" style="margin-top: 10px; border-color:var(--accent2); color:var(--accent2);">⏸ Duraklat</button>
        </div>
    `;

    // 1. Önce Yunanca Oku
    setTimeout(() => {
        if (!isAutoplayPaused) speakGreek(currentQuizQuestion.gr);
    }, 500);

    // 2. Bekle ve Türkçe Oku
    autoplayTimeout = setTimeout(() => {
        if ('speechSynthesis' in window && !isAutoplayPaused) {
            const utterance = new SpeechSynthesisUtterance(currentQuizQuestion.tr);
            utterance.lang = 'tr-TR'; // Türkçe telaffuz
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }

        // 3. Türkçe okunduktan sonra diğer karta geç
        autoplayTimeout = setTimeout(() => {
            if(!isAutoplayPaused) {
                correctCount++; // Kartı 'görüldü' sayıp barı ilerletir
                updateQuizUI();
                currentQuizIndex++;
                loadNextQuizQuestion();
            }
        }, 2500); // Türkçe okuma süresi payı

    }, 3000); // Yunanca okuma süresi payı
  }
}

function exitQuiz() { 
  // Dinleme modundan çıkılırsa zamanlayıcıları ve konuşmayı iptal et
  clearTimeout(autoplayTimeout);
  isAutoplayPaused = false;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  
  document.body.classList.remove('focus-mode'); 
  document.getElementById('quiz-active-view').style.display = 'none'; 
  document.getElementById('quiz-result-view').style.display = 'none'; 
  document.getElementById('quiz-setup-view').style.display = 'block'; 
  if (typeof stopSpeech === 'function') stopSpeech(); 
}
function showFeedback(isSuccess, msg) {
  const fb = document.getElementById("quiz-feedback");
  fb.className = "pop-anim";
  if (isSuccess) {
    fb.innerHTML = `<span style="color:var(--success); background:rgba(74,222,128,0.1); padding:8px 20px; border-radius:20px;">✅ ${msg}</span>`;
  } else {
    fb.innerHTML = `<span style="color:var(--error); background:rgba(248,113,113,0.1); padding:8px 20px; border-radius:20px;">❌ ${msg}</span>`;
  }
}

function evalMulti(selected) {
  if (!isQuestionActive) return;
  isQuestionActive = false;
  const btns = document.querySelectorAll(".quiz-opt-btn");
  let isCorrect = selected === currentQuizQuestion.tr;
  btns.forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === currentQuizQuestion.tr)
      btn.classList.add("correct");
    else if (btn.textContent === selected && !isCorrect)
      btn.classList.add("wrong");
  });
  if (isCorrect) {
    if (!quizMistakes.some((w) => w.gr === currentQuizQuestion.gr))
      correctCount++;
    showFeedback(true, "Harika!");
    updateQuizUI();
    currentQuizIndex++;
    setTimeout(loadNextQuizQuestion, 1000);
  } else {
    recordMistake(currentQuizQuestion, "multi");
    pushToPoolIfWrong(currentQuizQuestion);
    showFeedback(false, "Doğrusunu yeşil ile işaretledik.");
    currentQuizIndex++;
    setTimeout(loadNextQuizQuestion, 2000);
  }
}
function evalListen(selected) {
  document.getElementById("hidden-gr-word").style.filter = "none";
  document.getElementById("hidden-gr-word").textContent =
    currentQuizQuestion.gr;
  evalMulti(selected);
}
function evalWrite() {
  if (!isQuestionActive) return;
  const input = document.getElementById("quiz-write-input");
  const userText = input.value.trim().toLowerCase();
  const correctText = currentQuizQuestion.tr.trim().toLowerCase();
  if (userText === correctText) {
    isQuestionActive = false;
    input.style.borderColor = "var(--success)";
    input.style.color = "var(--success)";
    if (!quizMistakes.some((w) => w.gr === currentQuizQuestion.gr))
      correctCount++;
    showFeedback(true, "Mükemmel!");
    updateQuizUI();
    currentQuizIndex++;
    setTimeout(loadNextQuizQuestion, 1000);
  } else {
    recordMistake(currentQuizQuestion, "write");
    input.classList.remove("shake");
    void input.offsetWidth;
    input.classList.add("shake");
    showFeedback(false, "Hatalı. Tekrar dene veya ipucu al.");
  }
}
function giveWriteHint() {
  if (!isQuestionActive) return;
  recordMistake(currentQuizQuestion, "write");
  pushToPoolIfWrong(currentQuizQuestion);
  const input = document.getElementById("quiz-write-input");
  input.value = currentQuizQuestion.tr;
  input.style.borderColor = "var(--accent2)";
  const fb = document.getElementById("quiz-feedback");
  fb.className = "pop-anim";
  fb.innerHTML = `<span style="color:var(--accent2); background:rgba(232,201,109,0.1); padding:8px 20px; border-radius:20px;">💡 İpucu kullanıldı. Kelime daha sonra tekrar sorulacak.</span>`;
  isQuestionActive = false;
  currentQuizIndex++;
  setTimeout(loadNextQuizQuestion, 2500);
}
function evalFlash(knewIt) {
  if (!isQuestionActive) return;
  isQuestionActive = false;
  if (knewIt) {
    if (!quizMistakes.some((w) => w.gr === currentQuizQuestion.gr))
      correctCount++;
    updateQuizUI();
    currentQuizIndex++;
    loadNextQuizQuestion();
  } else {
    recordMistake(currentQuizQuestion, "flash");
    pushToPoolIfWrong(currentQuizQuestion);
    const fb = document.getElementById("quiz-feedback");
    fb.className = "pop-anim";
    fb.innerHTML = `<span style="color:var(--accent2); background:rgba(232,201,109,0.1); padding:8px 20px; border-radius:20px;">Daha sonra tekrar sorulacak.</span>`;
    currentQuizIndex++;
    setTimeout(loadNextQuizQuestion, 1200);
  }
}

/* === EXAM LİBRARY VE MANTIĞI === */
function renderExamLibrary() {
  const container = document.getElementById("exam-grid-container");
  if (GLOBAL_SORU_BANKASI.length === 0) return;
  const exams = [...new Set(GLOBAL_SORU_BANKASI.map((q) => q.exam))];
  let html = "";
  exams.forEach((examName, index) => {
    const safeExamId = "exam_lvl_" + index;
    const examQuestions = GLOBAL_SORU_BANKASI.filter(
      (q) => q.exam === examName,
    );
    const categories = [...new Set(examQuestions.map((q) => q.category))];
    let catHtml = "";
    categories.forEach((cat) => {
      const qCount = examQuestions.filter((q) => q.category === cat).length;
      catHtml += `<div style="display:flex; justify-content:space-between; align-items:center; padding: 15px; background:#090b10; border:1px solid var(--border); border-radius:8px; margin-bottom:10px;"><div><div style="color:var(--text); font-weight:bold; font-size:1.1rem;">${cat}</div><div style="color:var(--text-dim); font-size:0.9rem;">Toplam ${qCount} Soru</div></div><button class="main-btn" style="padding: 10px 20px;" onclick="startExamSession('${examName}', '${cat}')">Sınava Başla ➔</button></div>`;
    });
    html += `<div class="deck-section" style="margin-bottom:15px; border: 1px solid var(--border);"><div class="deck-header" onclick="toggleAccordion('${safeExamId}')" style="font-size: 1.15rem; padding: 18px 20px;"><strong>📂 ${examName}</strong><span class="deck-arrow" id="arrow-${safeExamId}">▼</span></div><div class="deck-content" id="content-${safeExamId}" style="padding: 15px;">${catHtml}</div></div>`;
  });
  container.innerHTML = html;
}

function startExamSession(examName, category) {
  if (!requireAuth(1)) return;
  examSession = GLOBAL_SORU_BANKASI.filter(
    (q) => q.exam === examName && q.category === category,
  );
  currentQIndex = 0;
  examState = {};
  examSession.forEach((q) => {
    examState[q.id] = {
      selected: null,
      eliminated: [],
      marked: false,
      qHtml: null,
      timeSpent: 0,
    };
  });
  document.body.classList.add("focus-mode");
  document.getElementById("exam-library-view").style.display = "none";
  document.getElementById("exam-result-view").style.display = "none";
  document.getElementById("exam-workspace").style.display = "block";
  examStartTime = new Date();
  if (currentUser) {
    const namePlaceholder = document.getElementById("osym-name-placeholder");
    if (namePlaceholder)
      namePlaceholder.textContent = currentUsername.toUpperCase();
  }
  startRealClock();
  startGlobalExamTimer();
  loadExamQuestion();
}

function startGlobalExamTimer() {
  clearInterval(examTimerInterval);
  document.getElementById("e-time").textContent = "00:00";
  examTimerInterval = setInterval(() => {
    const now = new Date();
    const totalElapsedSec = Math.floor((now - examStartTime) / 1000);
    document.getElementById("e-time").textContent =
      formatExamTime(totalElapsedSec);
    if (examSession.length > 0 && examSession[currentQIndex]) {
      const qId = examSession[currentQIndex].id;
      examState[qId].timeSpent++;
    }
  }, 1000);
}

function saveCurrentQuestionState() {
  const qId = examSession[currentQIndex].id;
  examState[qId].qHtml = document.getElementById("exam-q-text").innerHTML;
}

function loadExamQuestion() {
  const q = examSession[currentQIndex];
  const state = examState[q.id];
  document.getElementById("e-current-q").textContent = currentQIndex + 1;
  document.getElementById("e-total-q").textContent = examSession.length;
  const descEl = document.getElementById("osym-timer-desc");
  if (descEl) {
    descEl.textContent =
      q.description ||
      "1-80 sorularda, cümlede boş bırakılan yerlere uygun düşen sözcük ή ifadeyi bulunuz.";
  }
  const markCb = document.getElementById("osym-mark-cb");
  if (markCb) markCb.checked = state.marked === true;
  if (state.qHtml) {
    document.getElementById("exam-q-text").innerHTML = state.qHtml;
  } else {
    document.getElementById("exam-q-text").innerHTML =
      `<strong>${currentQIndex + 1}.</strong> ` +
      tokenizeForExamInteractive(q.question);
  }

  let optsHtml = "";
  for (const [key, text] of Object.entries(q.options)) {
    const isSelected = state.selected === key ? "selected" : "";
    const isEliminated = state.eliminated.includes(key) ? "eliminated" : "";
    const tokenizedOptionText = tokenizeForExamInteractive(text);
    optsHtml += `<div class="osym-option-row ${isSelected} ${isEliminated}" id="opt-row-${key}"><div class="osym-circle" onclick="selectExamOption('${key}')">${key}</div><div class="osym-option-text" style="padding: 10px; cursor: pointer; flex-grow: 1;" onclick="toggleEliminateOption('${key}')">${tokenizedOptionText}</div></div>`;
  }
  document.getElementById("exam-options-container").innerHTML = optsHtml;
}

function selectExamOption(key) {
  const qId = examSession[currentQIndex].id;
  if (examState[qId].eliminated.includes(key)) return;
  if (examState[qId].selected === key) {
    examState[qId].selected = null;
  } else {
    examState[qId].selected = key;
  }
  document
    .querySelectorAll(".osym-option-row")
    .forEach((row) => row.classList.remove("selected"));
  if (examState[qId].selected) {
    document.getElementById(`opt-row-${key}`).classList.add("selected");
  }
}

function toggleEliminateOption(key) {
  const qId = examSession[currentQIndex].id;
  const row = document.getElementById(`opt-row-${key}`);
  if (examState[qId].eliminated.includes(key)) {
    examState[qId].eliminated = examState[qId].eliminated.filter(
      (k) => k !== key,
    );
    row.classList.remove("eliminated");
  } else {
    examState[qId].eliminated.push(key);
    row.classList.add("eliminated");
    if (examState[qId].selected === key) {
      examState[qId].selected = null;
      row.classList.remove("selected");
    }
  }
}

function toggleMarkCurrentQ() {
  const qId = examSession[currentQIndex].id;
  const markCb = document.getElementById("osym-mark-cb");
  if (markCb) examState[qId].marked = markCb.checked;
}
function prevExamQ() {
  if (currentQIndex > 0) {
    saveCurrentQuestionState();
    currentQIndex--;
    loadExamQuestion();
  }
}
function nextExamQ() {
  if (currentQIndex < examSession.length - 1) {
    saveCurrentQuestionState();
    currentQIndex++;
    loadExamQuestion();
  }
}
function exitExam() {
  if (
    confirm(
      "Sınavdan çıkmak istediğinize emin misiniz? İlerlemeniz kaybolacaktır.",
    )
  ) {
    clearInterval(examTimerInterval);
    clearInterval(clockInterval);
    document.body.classList.remove("focus-mode");
    document.getElementById("exam-workspace").style.display = "none";
    document.getElementById("exam-library-view").style.display = "block";
  }
}
function setExamTool(mode) {
  examToolMode = mode;
  document
    .querySelectorAll(".exam-tool-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("etool-" + mode).classList.add("active");
}

function examTokenClicked(event, word, sentence) {
  event.stopPropagation();
  if (examToolMode === "dict") {
    triggerWordPopup(event, word, sentence);
  } else if (examToolMode === "highlight") {
    event.target.classList.toggle("exam-hl");
    event.target.classList.remove("exam-strike");
  } else if (examToolMode === "strike") {
    event.target.classList.toggle("exam-strike");
    event.target.classList.remove("exam-hl");
  }
}

function tokenizeForExamInteractive(text) {
  let html = "";
  let safeSentence = text.replace(/'/g, "\\'").replace(/"/g, '\\"');
  text.split(/(\s+)/).forEach((token) => {
    if (/[\u0370-\u03FF]/.test(token)) {
      let safeWord = token.replace(/'/g, "\\'").replace(/"/g, '\\"');
      html += `<span class="tok" onclick="examTokenClicked(event, '${safeWord}', '${safeSentence}')">${token}</span>`;
    } else {
      html += token;
    }
  });
  return html;
}

function finishExam() {
  if (
    !confirm(
      "Sınavı bitirmek istediğinize emin misiniz? Sınav sonucunuz hesaplanacak.",
    )
  )
    return;
  saveCurrentQuestionState();
  clearInterval(examTimerInterval);
  clearInterval(clockInterval);
  document.body.classList.remove("focus-mode");
  let correct = 0;
  let wrong = 0;
  let empty = 0;
  let analysisHtml =
    "<tr><th>Soru</th><th>Durum</th><th>Süre</th><th>Cevabınız</th><th>Doğru Cevap</th></tr>";
  examSession.forEach((q, index) => {
    const state = examState[q.id];
    let statusHtml = "";
    if (!state.selected) {
      empty++;
      statusHtml = "<span style='color:var(--text-dim)'>Boş Bırakıldı</span>";
    } else if (state.selected === q.answer) {
      correct++;
      statusHtml = "<span style='color:var(--success)'>✅ Doğru</span>";
    } else {
      wrong++;
      statusHtml = "<span style='color:var(--error)'>❌ Yanlış</span>";
    }
    analysisHtml += `<tr><td>Soru ${index + 1}</td><td>${statusHtml}</td><td style="color:var(--accent2);">${formatExamTime(state.timeSpent)}</td><td>${state.selected || "-"}</td><td><b>${q.answer}</b></td></tr>`;
  });
  if (currentUser) {
    let score = Math.round((correct / examSession.length) * 100) || 0;
    const now = new Date();
    const totalElapsedSec = Math.floor((now - examStartTime) / 1000);
    const historyItem = {
      id: Date.now(),
      date:
        now.toLocaleDateString("tr-TR") +
        " - " +
        now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
      examName: examSession[0].exam + " (" + examSession[0].category + ")",
      total: examSession.length,
      correct: correct,
      wrong: wrong,
      empty: empty,
      score: score,
      timeSpent: formatExamTime(totalElapsedSec),
    };
    if (!dbUserData[currentUsername].examHistory) {
      dbUserData[currentUsername].examHistory = [];
    }
    dbUserData[currentUsername].examHistory.unshift(historyItem);
    syncCloudData();
  }
  document.getElementById("exam-res-total").textContent = examSession.length;
  document.getElementById("exam-res-correct").textContent = correct;
  document.getElementById("exam-res-wrong").textContent = wrong;
  document.getElementById("exam-res-empty").textContent = empty;
  document.getElementById("exam-analysis-table").innerHTML = analysisHtml;
  document.getElementById("exam-workspace").style.display = "none";
  document.getElementById("exam-result-view").style.display = "block";
}

/* === VİDEO VE CANLI MEDYA LİBRARY === */
function renderVideoLibrary() {
  const grid = document.getElementById("video-grid-container");
  const filterContainer = document.getElementById("video-category-filters");
  const uniqueCategories = [...new Set(VIDEO_KATALOGU.map((v) => v.category))];
  const allCategories = ["Tümü", ...uniqueCategories];
  filterContainer.innerHTML = allCategories
    .map(
      (cat) =>
        `<button class="cat-btn ${cat === currentVideoCategory ? "active" : ""}" onclick="filterVideoCategory('${cat}')">${cat}</button>`,
    )
    .join("");
  const filteredVideos =
    currentVideoCategory === "Tümü"
      ? VIDEO_KATALOGU
      : VIDEO_KATALOGU.filter((v) => v.category === currentVideoCategory);
  grid.innerHTML = "";
  if (filteredVideos.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-dim); text-align:center; grid-column: 1 / -1; padding: 30px;">Bu kategoride henüz video bulunmuyor.</p>`;
    return;
  }
  filteredVideos.forEach((video) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.onclick = () => openVideo(video.id, video.title);
    card.innerHTML = `<div class="video-card-thumb"><span class="video-card-level">${video.level}</span><span class="video-card-category-badge">${video.category}</span><img src="https://img.youtube.com/vi/${video.id}/hqdefault.jpg" alt="${video.title}"></div><div class="video-card-content"><div class="video-card-title">${video.title}</div><div class="video-card-play">▶ Çalışmaya Başla</div></div>`;
    grid.appendChild(card);
  });
}
function filterVideoCategory(catName) {
  currentVideoCategory = catName;
  renderVideoLibrary();
}

async function openVideo(videoId, title) {
  if (!requireAuth(1)) return;
  showToastMessage("⏳ Video ve altyazılar yükleniyor...");
  try {
    const res = await fetch(`altyazilar/${videoId}.json`);
    if (!res.ok)
      throw new Error(
        `Altyazı dosyası bulunamadı ('altyazilar/${videoId}.json').`,
      );
    ytSubtitles = await res.json();
    if (!Array.isArray(ytSubtitles) || ytSubtitles.length === 0)
      throw new Error("JSON formatı hatalı veya boş.");
    document.getElementById("video-library-view").style.display = "none";
    document.getElementById("video-workspace").style.display = "block";
    document.getElementById("active-video-title").textContent = title;
    document.getElementById("hls-player").style.display = "none";
    if (hlsInstance) hlsInstance.destroy();
    document.getElementById("hls-player").pause();
    document.getElementById("youtube-player").style.display = "block";
    document.getElementById("active-subtitle-container").style.display = "flex";

    if (ytPlayer && typeof ytPlayer.loadVideoById === "function") {
      ytPlayer.loadVideoById(videoId);
    } else {
      ytPlayer = new YT.Player("youtube-player", {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          playsinline: 1,
          rel: 0,
          origin:
            window.location.origin === "null" ? "*" : window.location.origin,
        },
        events: { onStateChange: onPlayerStateChange },
      });
    }
    if (videoSyncInterval) clearInterval(videoSyncInterval);
    videoSyncInterval = setInterval(syncSubtitles, 200);
  } catch (err) {
    showToastMessage("❌ Hata: " + err.message);
  }
}

function closeVideoPlayer() {
  if (ytPlayer && typeof ytPlayer.pauseVideo === "function")
    ytPlayer.pauseVideo();
  if (videoSyncInterval) clearInterval(videoSyncInterval);
  document.getElementById("video-workspace").style.display = "none";
  document.getElementById("video-library-view").style.display = "block";
  document.getElementById("sub-gr").innerHTML = "...";
  document.getElementById("sub-tr").textContent =
    "Videonun başlaması bekleniyor...";
  document
    .getElementById("active-subtitle-container")
    .classList.remove("active");
  currentActiveSubIndex = -1;
}

function syncSubtitles() {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== "function") return;
  const currentTime = ytPlayer.getCurrentTime();
  let foundIndex = -1;
  for (let i = 0; i < ytSubtitles.length; i++) {
    if (
      currentTime >= ytSubtitles[i].start &&
      currentTime <= ytSubtitles[i].end
    ) {
      foundIndex = i;
      break;
    }
  }
  if (foundIndex !== currentActiveSubIndex) {
    currentActiveSubIndex = foundIndex;
    const subGrContainer = document.getElementById("sub-gr");
    const subTrContainer = document.getElementById("sub-tr");
    const mainBox = document.getElementById("active-subtitle-container");
    if (foundIndex > -1) {
      const currentSub = ytSubtitles[foundIndex];
      subTrContainer.textContent = currentSub.tr;
      mainBox.classList.add("active");
      subGrContainer.innerHTML = "";
      currentSub.gr.split(/(\s+)/).forEach((token) => {
        if (/[\u0370-\u03FF]/.test(token)) {
          const span = document.createElement("span");
          span.className = "tok";
          span.textContent = token;
          span.onclick = (e) => triggerWordPopup(e, token, currentSub.gr);
          subGrContainer.appendChild(span);
        } else subGrContainer.appendChild(document.createTextNode(token));
      });
    } else {
      subGrContainer.innerHTML = "...";
      subTrContainer.textContent = "";
      mainBox.classList.remove("active");
    }
  }
}
function onPlayerStateChange(event) {}

function renderTVLibrary() {
  const grid = document.getElementById("tv-grid-container");
  let html = "";
  GREEK_TV_CHANNELS.forEach((tv) => {
    html += `<div class="text-card" onclick="openTVChannel('${tv.url}', '${tv.name}')" style="min-height:auto; display:flex; align-items:center; flex-direction:row; gap:15px; padding: 15px;"><span style="font-size:2rem;">🔴</span><div class="text-card-title" style="margin-bottom:0; font-size:1.15rem;">${tv.name}</div></div>`;
  });
  grid.innerHTML = html;
}
function openTVChannel(url, title) {
  if (!requireAuth(1)) return;
  document.getElementById("media-library-view").style.display = "none";
  document.getElementById("media-workspace").style.display = "block";
  document.getElementById("active-media-title").textContent =
    "CANLI YAYIN: " + title;
  const videoElem = document.getElementById("hls-player");
  try {
    if (ytPlayer && typeof ytPlayer.pauseVideo === "function")
      ytPlayer.pauseVideo();
  } catch (e) {}
  if (Hls.isSupported()) {
    if (hlsInstance) hlsInstance.destroy();
    hlsInstance = new Hls();
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(videoElem);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, function () {
      videoElem.play();
    });
  } else if (videoElem.canPlayType("application/vnd.apple.mpegurl")) {
    videoElem.src = url;
    videoElem.addEventListener("loadedmetadata", function () {
      videoElem.play();
    });
  }
}
function closeMediaWorkspace() {
  if (hlsInstance) hlsInstance.destroy();
  document.getElementById("hls-player").pause();
  document.getElementById("media-workspace").style.display = "none";
  document.getElementById("media-library-view").style.display = "block";
}

function renderRadioLibrary() {
  const grid = document.getElementById("radio-grid-container");
  let html = "";
  GREEK_RADIO_CHANNELS.forEach((radio) => {
    html += `<div class="text-card" onclick="openRadioChannel('${radio.url}', '${radio.name}')" style="min-height:auto; display:flex; align-items:center; flex-direction:row; gap:15px; padding: 15px; border-color: rgba(232, 201, 109, 0.3);"><span style="font-size:2rem;">🎵</span><div class="text-card-title" style="margin-bottom:0; font-size:1.15rem; color:var(--accent2);">${radio.name}</div></div>`;
  });
  grid.innerHTML = html;
}
function openRadioChannel(url, title) {
  if (!requireAuth(1)) return;
  if (hlsInstance) hlsInstance.destroy();
  document.getElementById("hls-player").pause();
  const radioBox = document.getElementById("radio-player-box");
  const audioElem = document.getElementById("html-audio-player");
  const titleElem = document.getElementById("active-radio-name");
  titleElem.textContent = title;
  audioElem.src = url;
  radioBox.style.display = "block";
  audioElem
    .play()
    .catch((e) =>
      showToastMessage("Radyo başlatılamadı, bağlantı sorunu olabilir."),
    );
}
function closeRadioPlayer() {
  const audioElem = document.getElementById("html-audio-player");
  audioElem.pause();
  audioElem.src = "";
  document.getElementById("radio-player-box").style.display = "none";
}

function renderNewspaperLibrary() {
  const grid = document.getElementById("news-grid-container");
  let html = "";
  GREEK_NEWSPAPERS.forEach((news) => {
    html += `<div class="text-card" onclick="openNewspaper('${news.url}')" style="min-height:auto; display:flex; align-items:center; flex-direction:row; gap:15px; padding: 15px; border-color: rgba(79, 142, 247, 0.3);"><span style="font-size:2.2rem;">📰</span><div style="flex: 1;"><div class="text-card-title" style="margin-bottom:2px; font-size:1.1rem; color:var(--text);">${news.name}</div><div style="font-size:0.85rem; color:var(--text-dim);">${news.desc}</div></div><div style="color:var(--accent); font-size:1.5rem; font-weight:bold;">➔</div></div>`;
  });
  grid.innerHTML = html;
}
function openNewspaper(url) {
  if (!requireAuth(1)) return;
  showToastMessage(
    "Haber sitesi yeni sekmede açılıyor. Okumak istediğiniz haberin linkini kopyalamayı unutmayın!",
  );
  setTimeout(() => {
    window.open(url, "_blank");
  }, 1500);
}

async function searchDictionary() {
  const word = document.getElementById("dict-search-input").value.trim();
  if (!word) {
    showToastMessage("Lütfen aranacak bir kelime yazın.");
    return;
  }

  // gr-gr sözlüğü farklı bir sayfaya attığı için
  if (currentDictMode === "gr-gr") {
    showToastMessage("Sözlük güvenli sekmede açılıyor...");
    window.open(
      "https://www.greek-language.gr/greekLang/modern_greek/tools/lexica/search.html?lq=" +
        encodeURIComponent(word),
      "_blank",
    );
    return;
  }

  const resultsContainer = document.getElementById("dict-results");
  resultsContainer.classList.add("active");
  resultsContainer.innerHTML = `<div style="text-align:center; color:var(--accent); padding:20px;">⏳ Çevriliyor...</div>`;

  const sl = currentDictMode === "gr-tr" ? "el" : "tr";
  const tl = currentDictMode === "gr-tr" ? "tr" : "el";

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&dt=bd&q=${encodeURIComponent(word)}`;
    const res = await fetch(url);
    const data = await res.json();
    const mainTrans =
      data[0] && data[0][0] ? data[0][0][0] : "Çeviri bulunamadı.";
    let dictHtml = "";
    const safeWord = word.replace(/'/g, "\\'");
    const safeTrans = mainTrans.replace(/'/g, "\\'");

    if (currentDictMode === "gr-tr") {
      dictHtml = `<div class="dict-main-word tok" onclick="triggerWordPopup(event, '${safeWord}', 'Sözlük: ${safeWord}')" style="cursor:pointer; display:inline-block;">${word}</div><div class="dict-phonetic">/${getGreekPhonetics(word)}/</div><div class="dict-main-translation">${mainTrans}</div>`;
    } else if (currentDictMode === "tr-gr") {
      dictHtml = `<div class="dict-main-word">${word}</div><div class="dict-main-translation tok" onclick="triggerWordPopup(event, '${safeTrans}', 'Sözlük: ${safeTrans}')" style="cursor:pointer; display:inline-block; color:var(--accent2); margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border);">${mainTrans}</div>`;
    }

    if (data[1] && data[1].length > 0) {
      data[1].forEach((posGroup) => {
        let synHtml = `<div class="dict-pos-group"><div class="dict-pos-title">${posGroup[0]}</div><div class="dict-synonyms">`;
        posGroup[1].forEach((tr) => {
          const safeTr = tr.replace(/'/g, "\\'");
          if (currentDictMode === "tr-gr") {
            synHtml += `<span class="dict-syn-item tok" onclick="triggerWordPopup(event, '${safeTr}', 'Sözlük: ${safeTr}')" style="cursor:pointer;">${tr}</span>`;
          } else {
            synHtml += `<span class="dict-syn-item">${tr}</span>`;
          }
        });
        synHtml += `</div></div>`;
        dictHtml += synHtml;
      });
    }
    resultsContainer.innerHTML = dictHtml;
  } catch (e) {
    resultsContainer.innerHTML = `<div style="text-align:center; color:var(--error); padding:20px;">❌ Çeviri sırasında bir hata oluştu.</div>`;
  }
}

/* ==========================================
 * ALIŞTIRMALAR (PRACTICE) MOTORU
 * ========================================== */

/* ==========================================
 * ALIŞTIRMALAR (PRACTICE) MOTORU
 * ========================================== */

function renderPracticeLibrary() {
  const container = document.getElementById("practice-grid-container");
  let html = "";

  // 1. Mevcut Alıştırmaları Çiz (Veritabanındaki tüm Seviyeleri otomatik bul)
  const levels = [...new Set(PRACTICE_CATALOG.map((p) => p.level))].sort();

  levels.forEach((level) => {
    const practicesInLevel = PRACTICE_CATALOG.filter((p) => p.level === level);
    const safeLevel = level.replace(/[^a-zA-Z0-9]/g, "_");
    let levelContent = "";

    const categories = [
      ...new Set(practicesInLevel.map((p) => p.category)),
    ].sort();

    categories.forEach((cat) => {
      const safeCat = safeLevel + "_" + cat.replace(/[^a-zA-Z0-9]/g, "_");
      const practicesInCat = practicesInLevel.filter((p) => p.category === cat);

      let cardsHtml = `<div class="text-grid">`;
      practicesInCat.forEach((prac) => {
        cardsHtml += `
          <div class="text-card" onclick="openPractice('${prac.id}')" style="border-color: rgba(74, 222, 128, 0.4);">
            <div class="text-card-title">${prac.title}</div>
            <div class="text-card-play" style="color:var(--success);">✏️ Alıştırmaya Başla ➔</div>
          </div>`;
      });
      cardsHtml += `</div>`;

      levelContent += `
        <div class="deck-section" style="margin: 10px 15px; border-left: 3px solid var(--success); border-radius: 0 8px 8px 0; background: rgba(0,0,0,0.2);">
          <div class="deck-header" onclick="toggleAccordion('prac-cat-${safeCat}')" style="background:transparent; padding: 12px 15px;">
            <strong style="color: var(--text); font-size: 1rem;">${cat} <span style="color:var(--text-dim); font-size:0.8rem; font-weight:normal;">(${practicesInCat.length} Alıştırma)</span></strong><span class="deck-arrow" id="arrow-prac-cat-${safeCat}">▼</span>
          </div>
          <div class="deck-content" id="content-prac-cat-${safeCat}" style="background:transparent; padding-top:5px; border-top: 1px solid rgba(255,255,255,0.05);">
            ${cardsHtml}
          </div>
        </div>`;
    });

    html += `
      <div class="deck-section" style="margin-bottom:15px; border: 1px solid var(--border);">
        <div class="deck-header" onclick="toggleAccordion('prac-lvl-${safeLevel}')" style="font-size: 1.15rem; padding: 18px 20px; background: linear-gradient(90deg, #1c212d 0%, #13161e 100%);">
          <strong>🎓 ${level} Seviyesi</strong><span class="deck-arrow" id="arrow-prac-lvl-${safeLevel}">▼</span>
        </div>
        <div class="deck-content" id="content-prac-lvl-${safeLevel}" style="padding: 5px 0 15px 0;">
          ${levelContent}
        </div>
      </div>`;
  });

  // 2. YDS Soru Bankasını Buraya "Çözüm Modu" Olarak Ekle
  if (
    typeof GLOBAL_SORU_BANKASI !== "undefined" &&
    GLOBAL_SORU_BANKASI.length > 0
  ) {
    const exams = [...new Set(GLOBAL_SORU_BANKASI.map((q) => q.exam))].sort();
    let ydsContent = `<div class="text-grid" style="padding: 10px 15px;">`;

    exams.forEach((examName) => {
      ydsContent += `
        <div class="text-card" onclick="openYdsPractice('${examName}')" style="border-color: rgba(232, 201, 109, 0.4);">
          <div class="text-card-title">${examName}</div>
          <div class="text-card-play" style="color:var(--accent2);">💡 Çözümleri Gör ➔</div>
        </div>`;
    });
    ydsContent += `</div>`;

    html += `
      <div class="deck-section" style="margin-top:25px; margin-bottom:15px; border: 1px solid var(--border);">
        <div class="deck-header" onclick="toggleAccordion('prac-lvl-yds')" style="font-size: 1.15rem; padding: 18px 20px; background: linear-gradient(90deg, #2a2015 0%, #13161e 100%);">
          <strong style="color:var(--accent2);">📝 YDS / YÖKDİL Soru Çözümleri</strong><span class="deck-arrow" id="arrow-prac-lvl-yds">▼</span>
        </div>
        <div class="deck-content" id="content-prac-lvl-yds" style="padding: 5px 0 15px 0;">
          <div style="padding: 10px 20px; color:var(--text-dim); font-size:0.95rem;">Soru bankasındaki testleri süre stresi olmadan, okuyarak ve cevapları inceleyerek çözün.</div>
          ${ydsContent}
        </div>
      </div>`;
  }

  if (html === "") {
    html = `<p style="color:var(--text-dim); text-align:center; padding: 20px;">Henüz alıştırma eklenmemiş.</p>`;
  }

  container.innerHTML = html;
}

// YDS Soru Çözüm Ekranını Açan Özel Fonksiyon
// YDS Soru Çözüm Ekranını Açan Özel Fonksiyon
window.openYdsPractice = function (examName) {
  if (!requireAuth(1)) return;

  const questions = GLOBAL_SORU_BANKASI.filter((q) => q.exam === examName);
  if (!questions || questions.length === 0) return;

  document.getElementById("practice-library-view").style.display = "none";
  document.getElementById("practice-workspace").style.display = "block";
  document.getElementById("active-practice-title").textContent =
    "Soru Çözümü: " + examName;

  // Sol Metin Panelini Gizle
  const textPanel = document.querySelector(".practice-text-panel");
  if (textPanel) textPanel.style.display = "none";

  const checkBtn = document.querySelector(
    'button[onclick="checkPracticeAnswers()"]',
  );
  if (checkBtn && checkBtn.parentElement)
    checkBtn.parentElement.style.display = "none";

  const qContainer = document.getElementById("practice-questions-content");
  let qHtml = "";

  questions.forEach((q, index) => {
    let optsHtml = "";
    for (const [key, text] of Object.entries(q.options)) {
      optsHtml += `<div style="margin-bottom: 8px; padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-alt);">
                        <strong style="color:var(--accent); margin-right: 8px;">${key})</strong> ${tokenizePracHTML(text)}
                     </div>`;
    }

    const safeAnsKey = q.answer;
    const safeAnsText = q.options[safeAnsKey];

    // Εδώ ελέγχουμε αν υπάρχει εξήγηση (q.explanation)
    let buttonText = "👁️ Cevabı Gör / Gizle";
    let detailedExplanation = `<div style="margin-top: 8px; font-size: 1.05rem;">${tokenizePracHTML(safeAnsText)}</div>`;

    if (q.explanation && q.explanation.trim() !== "") {
      buttonText = "👁️ Cevabı ve Detaylı Çözümü Gör";
      detailedExplanation = `<div style="margin-top: 15px; border-top: 1px dashed var(--border); padding-top: 15px; font-size: 1.05rem; line-height: 1.7; color: var(--text);">${q.explanation}</div>`;
    }

    qHtml += `
      <div class="prac-q-box" style="margin-bottom: 30px; border-left: 4px solid var(--accent2); background: var(--surface); padding: 20px; box-shadow: var(--shadow);">
        <div class="prac-q-title" style="font-size: 1.15rem; line-height: 1.6; margin-bottom: 20px;">
            <strong style="color:var(--text-dim);">Soru ${index + 1}:</strong><br><br>
            ${tokenizePracHTML(q.question)}
        </div>
        <div style="margin-bottom: 20px;">
            ${optsHtml}
        </div>
        <div>
            <button class="secondary-btn" style="padding:10px 20px; font-size:0.95rem; border:1px solid var(--success); color:var(--success); background:transparent; border-radius:6px; cursor:pointer;"
                    onclick="const ansDiv = document.getElementById('yds-ans-${q.id}'); ansDiv.style.display = ansDiv.style.display === 'none' ? 'block' : 'none';">
                ${buttonText}
            </button>
        </div>
        <div id="yds-ans-${q.id}" style="display: none; margin-top: 15px; padding: 20px; background: var(--surface-alt); border: 2px solid var(--success); border-radius: 8px; color: var(--text); animation: fadeIn 0.3s ease;">
            <strong style="color:var(--success); font-size: 1.2rem; display:block; margin-bottom: 10px;">Doğru Cevap: ${safeAnsKey}</strong>
            ${detailedExplanation}
        </div>
      </div>
    `;
  });

  qContainer.innerHTML = qHtml;
};

// Alıştırma Ekranını Kapatma Fonksiyonu
function closePracticeWorkspace() {
  document.getElementById("practice-workspace").style.display = "none";
  document.getElementById("practice-library-view").style.display = "block";
  activePracticeSession = null;

  // Çıkış yaparken sol paneli ve "Cevapları Kontrol Et" butonunu eski haline getir (Normal alıştırmalar bozulmasın diye)
  const textPanel = document.querySelector(".practice-text-panel");
  if (textPanel) textPanel.style.display = "block";

  const checkBtn = document.querySelector(
    'button[onclick="checkPracticeAnswers()"]',
  );
  if (checkBtn && checkBtn.parentElement)
    checkBtn.parentElement.style.display = "block";
}

// Seçim Fonksiyonları (Butonların rengini ayarlamak için)
function selectPracOpt(qId, val) {
  document.getElementById(`btn-${qId}-true`).classList.remove("selected");
  document.getElementById(`btn-${qId}-false`).classList.remove("selected");
  document.getElementById(`btn-${qId}-${val}`).classList.add("selected");
  document.getElementById(`ans-${qId}`).value = val;
}

function selectPracMCOpt(qId, optIdx) {
  document
    .querySelectorAll(`.prac-mc-grp-${qId}`)
    .forEach((b) => b.classList.remove("selected"));
  document.getElementById(`btn-${qId}-${optIdx}`).classList.add("selected");
  document.getElementById(`ans-${qId}`).value = optIdx;
}

// Kontrol Fonksiyonu
function checkPracticeAnswers() {
  if (!activePracticeSession) return;

  let correctCount = 0;
  let totalCount = activePracticeSession.questions.length;

  activePracticeSession.questions.forEach((q) => {
    let userAns = document
      .getElementById(`ans-${q.id}`)
      .value.trim()
      .toLowerCase();
    let isCorrect = false;
    let inputElem = document.getElementById(`ans-${q.id}`); // Gizli input veya gerçek input/select

    // Temizleme (Önceki renkleri kaldır)
    if (q.type === "fill-write" || q.type === "fill-select") {
      inputElem.classList.remove("prac-correct", "prac-wrong");
    }
    if (q.type === "tf") {
      document
        .getElementById(`btn-${q.id}-true`)
        .classList.remove("prac-correct", "prac-wrong");
      document
        .getElementById(`btn-${q.id}-false`)
        .classList.remove("prac-correct", "prac-wrong");
    }
    if (q.type === "mc") {
      document
        .querySelectorAll(`.prac-mc-grp-${q.id}`)
        .forEach((b) => b.classList.remove("prac-correct", "prac-wrong"));
    }

    // Değerlendirme
    if (q.type === "tf") {
      isCorrect = userAns === String(q.answer);
      if (userAns) {
        if (isCorrect)
          document
            .getElementById(`btn-${q.id}-${userAns}`)
            .classList.add("prac-correct");
        else
          document
            .getElementById(`btn-${q.id}-${userAns}`)
            .classList.add("prac-wrong");
      }
    } else if (q.type === "mc") {
      isCorrect = userAns === String(q.answer);
      if (userAns !== "") {
        if (isCorrect)
          document
            .getElementById(`btn-${q.id}-${userAns}`)
            .classList.add("prac-correct");
        else {
          document
            .getElementById(`btn-${q.id}-${userAns}`)
            .classList.add("prac-wrong");
          document
            .getElementById(`btn-${q.id}-${q.answer}`)
            .classList.add("prac-correct"); // Doğruyu göster
        }
      }
    } else if (q.type === "fill-write" || q.type === "fill-select") {
      isCorrect = userAns === q.answer.toLowerCase();
      if (userAns !== "") {
        if (isCorrect) inputElem.classList.add("prac-correct");
        else inputElem.classList.add("prac-wrong");
      }
    }

    if (isCorrect) correctCount++;
  });

  // Sonuç Gösterimi
  const fb = document.getElementById("practice-result-feedback");
  fb.style.display = "block";

  if (correctCount === totalCount) {
    fb.innerHTML = `🎉 Muazzam! Tüm soruları doğru cevapladınız (${correctCount}/${totalCount}).`;
    fb.style.color = "var(--success)";
  } else {
    fb.innerHTML = `Gelişim var! ${totalCount} sorudan ${correctCount} tanesini doğru yaptınız. Kırmızı olanları tekrar inceleyin.`;
    fb.style.color = "var(--accent2)";
  }
}

/* ==========================================
 * YÖNETİCİ ALIŞTIRMA (PRACTICE) EKLEME MOTORU
 * ========================================== */
/* ==========================================
 * YÖNETİCİ ALIŞTIRMA FORMU (FORM TO JSON MOTORU)
 * ========================================== */
let adminQCount = 0;

// YENİ: Soru ekle butonuna basınca ekrana soru kutucuğu çizen fonksiyon
function addAdminQuestionField() {
  adminQCount++;
  const qId = adminQCount;
  const container = document.getElementById("admin-prac-questions");

  const div = document.createElement("div");
  div.className = "admin-q-block";
  div.style.cssText =
    "background: #151923; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #252a38; position: relative;";

  div.innerHTML = `
        <button type="button" onclick="this.parentElement.remove()" style="position:absolute; top:10px; right:15px; background:none; border:none; color:var(--error); cursor:pointer; font-weight:bold;">✕ Sil</button>
        <label style="color:var(--accent); font-size:0.9rem; font-weight:bold;">Soru ${qId} Tipi:</label>
        <select class="prac-q-type auth-input" style="padding:8px; margin-bottom:15px; margin-top:5px;" onchange="changeAdminQType(this, ${qId})">
            <option value="mc">Çoktan Seçmeli (Görseldeki gibi)</option>
            <option value="tf">Doğru / Yanlış</option>
            <option value="fill-write">Yazmalı Boşluk</option>
            <option value="fill-select">Seçmeli Boşluk (Açılır Menü)</option>
        </select>
        <div id="q-fields-${qId}" class="q-dynamic-fields">
            <input type="text" class="auth-input q-text" style="padding:10px; margin-bottom:10px;" placeholder="Soru başlığı (Opsiyonel)...">
            <input type="text" class="auth-input q-opts" style="padding:10px; margin-bottom:10px;" placeholder="Şıklar (A, B, C, D için virgülle ayırın)">
            <input type="number" class="auth-input q-ans-mc" style="padding:10px; margin-bottom:0;" placeholder="Doğru şık sırası (0=A, 1=B...)">
        </div>
    `;
  container.appendChild(div);
}

// YENİ: Soru tipi seçildiğinde altındaki kutucukları ona göre değiştiren fonksiyon
/* ==========================================
 * YÖNETİCİ ALIŞTIRMA FORMU VE ÖĞRENCİ EKRANI GÜNCELLEMESİ
 * ========================================== */

// Soru Tiplerine Göre Formu Değiştirme

// Buluta Kaydetme Fonksiyonu (Hata Çözüldü)

// Öğrenci Ekranı (Boşluk Doldurmaların Yeni Görünümü)
// Öğrenci Ekranı (Okuma ve Çözme Arayüzü)
function openPractice(id) {
  if (!requireAuth(1)) return;

  const prac = PRACTICE_CATALOG.find((p) => p.id === id);
  if (!prac) return;
  activePracticeSession = prac;

  document.getElementById("practice-library-view").style.display = "none";
  document.getElementById("practice-workspace").style.display = "block";
  document.getElementById("active-practice-title").textContent = prac.title;

  // Metni Çiz
  document.getElementById("practice-text-content").innerHTML = tokenizePracHTML(
    prac.text,
  );

  const qContainer = document.getElementById("practice-questions-content");
  let qHtml = "";

  prac.questions.forEach((q, index) => {
    qHtml += `<div class="prac-q-box" id="prac-box-${q.id}">`;

    // --- 1. SORU VE ŞIKLAR BÖLÜMÜ ---
    if (q.type === "tf") {
      qHtml += `<div class="prac-q-title">${index + 1}. ${tokenizePracHTML(q.question)}</div>`;
      qHtml += `<button class="prac-tf-btn" id="btn-${q.id}-true" onclick="selectPracOpt('${q.id}', 'true')">🟢 Σωστό (Doğru)</button>`;
      qHtml += `<button class="prac-tf-btn" id="btn-${q.id}-false" onclick="selectPracOpt('${q.id}', 'false')">🔴 Λάθος (Yanlış)</button>`;
      qHtml += `<input type="hidden" id="ans-${q.id}" value="">`;
    } else if (q.type === "mc") {
      qHtml += `<div class="prac-q-title">${index + 1}. ${tokenizePracHTML(q.question)}</div>`;
      if (q.options) {
        q.options.forEach((opt, optIdx) => {
          qHtml += `<button class="prac-mc-btn prac-mc-grp-${q.id}" id="btn-${q.id}-${optIdx}" onclick="selectPracMCOpt('${q.id}', '${optIdx}')">${tokenizePracHTML(opt)}</button>`;
        });
      }
      qHtml += `<input type="hidden" id="ans-${q.id}" value="">`;
    } else if (q.type === "fill-write") {
      qHtml += `<div class="prac-q-title">${index + 1}. ${tokenizePracHTML(q.question)}</div>`;

      qHtml += `<div style="font-size:1.15rem; margin-top:10px; display:flex; align-items:center; flex-wrap:wrap; gap:10px;">`;
      if (q.before) qHtml += `<span>${tokenizePracHTML(q.before)}</span>`;
      qHtml += `<input type="text" class="prac-input" id="ans-${q.id}" autocomplete="off" placeholder="Cevabı yazın...">`;
      if (q.after) qHtml += `<span>${tokenizePracHTML(q.after)}</span>`;

      const safeAns = q.answer ? q.answer.replace(/'/g, "\\'") : "";
      qHtml += `<button class="secondary-btn" style="padding:6px 12px; font-size:0.85rem; border:1px solid var(--accent); color:var(--accent); background:transparent; border-radius:6px; cursor:pointer;" onclick="document.getElementById('ans-${q.id}').value = '${safeAns}'; this.style.opacity='0.5';">Cevabı Doldur</button>`;

      qHtml += `</div>`;
    } else if (q.type === "fill-select") {
      qHtml += `<div class="prac-q-title">${index + 1}. ${tokenizePracHTML(q.question)}</div>`;
      let opts = `<option value="" disabled selected>Seçiniz...</option>`;
      if (q.options)
        q.options.forEach((opt) => {
          opts += `<option value="${opt}">${opt}</option>`;
        });

      qHtml += `<div style="font-size:1.15rem; margin-top:10px; display:flex; align-items:center; flex-wrap:wrap; gap:10px;">`;
      if (q.before) qHtml += `<span>${tokenizePracHTML(q.before)}</span>`;
      qHtml += `<select class="prac-select" id="ans-${q.id}">${opts}</select>`;
      if (q.after) qHtml += `<span>${tokenizePracHTML(q.after)}</span>`;
      qHtml += `</div>`;
    }

    // --- 2. DETAYLI AÇIKLAMA / KONU ANLATIMI BÖLÜMÜ ---
    // Eğer admin panelinden zengin metin (tablo vs.) kopyalanmışsa butonu göster
    if (q.explanation) {
      qHtml += `
            <div style="margin-top: 20px; border-top: 1px dashed var(--border); padding-top: 15px;">
                <button class="secondary-btn" style="padding:8px 15px; font-size:0.9rem; border:1px solid var(--accent2); color:var(--accent2); background:transparent; border-radius:6px; cursor:pointer;"
                        onclick="const expDiv = document.getElementById('prac-exp-${q.id}'); expDiv.style.display = expDiv.style.display === 'none' ? 'block' : 'none';">
                    👁️ Detaylı Çözümü / Konu Anlatımını Gör
                </button>
            </div>
            <div id="prac-exp-${q.id}" style="display: none; margin-top: 15px; padding: 20px; background: var(--surface-alt); border: 2px solid var(--accent2); border-radius: 8px; color: var(--text); animation: fadeIn 0.3s ease; font-size: 1.05rem; line-height: 1.7; overflow-x: auto;">
                ${q.explanation}
            </div>
        `;
    }

    qHtml += `</div>`;
  });

  qContainer.innerHTML = qHtml;
  document.getElementById("practice-result-feedback").style.display = "none";
}

// YENİ: Tüm kutucukları okuyup, tek bir JSON haline getirip buluta kaydeden fonksiyon
/* ==========================================
 * YÖNETİCİ ALIŞTIRMA LİSTELEME, DÜZENLEME VE SİLME
 * ========================================== */

// 1. Yönetici Paneline Alıştırmaları Çizdirme
function renderAdminPracticeList() {
  const container = document.getElementById("admin-prac-list-container");
  if (!container) return;

  if (PRACTICE_CATALOG.length === 0) {
    container.innerHTML =
      '<p style="color:var(--text-dim); font-size:0.85rem;">Sistemde henüz alıştırma bulunmuyor.</p>';
    return;
  }

  let html =
    '<table class="admin-table"><thead><tr><th>ID</th><th>Başlık</th><th>İşlem</th></tr></thead><tbody>';
  PRACTICE_CATALOG.forEach((p) => {
    html += `<tr>
            <td style="font-size:0.85rem; color:var(--text-dim);">${p.id}</td>
            <td style="font-size:0.85rem; font-weight:bold;">${p.title}</td>
            <td style="display:flex; gap:5px;">
                <button class="secondary-btn" style="padding:4px 8px; font-size:0.8rem; border-color:var(--accent); color:var(--accent); background:transparent;" onclick="loadPracticeToAdminForm('${p.id}')">✏️</button>
                <button class="secondary-btn" style="padding:4px 8px; font-size:0.8rem; border-color:var(--error); color:var(--error); background:transparent;" onclick="deletePracticeFromAdmin('${p.id}')">🗑️</button>
            </td>
        </tr>`;
  });
  html += "</tbody></table>";
  container.innerHTML = html;
}

// 2. Alıştırmayı Kalıcı Olarak Silme
function deletePracticeFromAdmin(id) {
  if (
    confirm(
      `"${id}" ID'li alıştırmayı KALICI OLARAK silmek istediğinize emin misiniz?`,
    )
  ) {
    // Alıştırmayı listeden filtrele (çıkar)
    PRACTICE_CATALOG = PRACTICE_CATALOG.filter((p) => p.id !== id);

    // Buluta ve yerel hafızaya kaydet
    localStorage.setItem("y_practices_db", JSON.stringify(PRACTICE_CATALOG));
    if (useFirebase && db) {
      db.collection("global").doc("practices").set({ list: PRACTICE_CATALOG });
    }

    // Arayüzleri yenile
    renderPracticeLibrary();
    renderAdminPracticeList();
    showToastMessage("🗑️ Alıştırma başarıyla silindi.");
  }
}

// 3. Düzenlemek İçin Alıştırmayı Forma Doldurma

/* ==========================================
 * ALIŞTIRMA (PRACTICE) METİN İÇİ MOTORU (CLOZE TEST)
 * ========================================== */

// 1. Metin ve boşluk motoru

/* ==========================================
 * ALIŞTIRMA (PRACTICE) METİN İÇİ MOTORU (CLOZE TEST)
 * ========================================== */

// Düz metinleri ve şıkları tokenize etmek için
function tokenizePracHTML(text) {
  if (!text) return "";
  let html = "";
  let safeSentence = text.replace(/'/g, "\\'").replace(/"/g, '\\"');
  const parts = text.split(/(<[^>]*>|\s+)/);
  parts.forEach((token) => {
    if (!token) return;
    if (token.startsWith("<")) {
      html += token;
    } else if (/[\u0370-\u03FF]/.test(token)) {
      let safeWord = token.replace(/'/g, "\\'").replace(/"/g, '\\"');
      html += `<span class="tok" onclick="event.stopPropagation(); triggerWordPopup(event, '${safeWord}', '${safeSentence}')">${token}</span>`;
    } else {
      html += token;
    }
  });
  return html;
}

// 1. Metin ve boşluk motoru (Inputlar Metin İçinde)
function tokenizePracText(text, questionsArray = null) {
  if (!text) return "";
  let html = "";
  let safeSentence = text.replace(/'/g, "\\'").replace(/"/g, '\\"');

  // Metni etiketlere, boşluklara ([1], [2] vb.) göre ayır
  const parts = text.split(/(<[^>]*>|\s+|\[\d+\])/);

  parts.forEach((token) => {
    if (!token) return;

    let clozeMatch = token.match(/^\[(\d+)\]$/);

    if (clozeMatch) {
      let num = parseInt(clozeMatch[1]);
      let qIdx = num - 1;
      let q =
        questionsArray && questionsArray.length > qIdx
          ? questionsArray[qIdx]
          : null;

      // Boşluk Doldurma - YAZMALI ise Metnin içine INPUT ve GÖZ İKONU göm
      if (q && q.type === "fill-write") {
        q.isRenderedInline = true;
        const safeAns = q.answer ? q.answer.replace(/'/g, "\\'") : "";

        html += `<span style="white-space: nowrap; display:inline-flex; align-items:center;">
                        <input type="text" class="prac-input cloze-inline-input" id="ans-${q.id}" autocomplete="off" placeholder="..." onclick="event.stopPropagation()">
                        <button class="secondary-btn" style="padding:2px 6px; font-size:0.9rem; border:1px solid var(--accent2); color:var(--accent2); background:transparent; border-radius:4px; cursor:pointer; margin-left:4px;" onclick="event.stopPropagation(); document.getElementById('ans-${q.id}').value = '${safeAns}'; this.style.opacity='0.5';" title="Cevabı Gör">👁️</button>
                     </span>`;
      }
      // Boşluk Doldurma - SEÇMELİ ise Metnin içine SELECT göm
      else if (q && q.type === "fill-select") {
        q.isRenderedInline = true;
        let opts = `<option value="" disabled selected>Seç...</option>`;
        if (q.options)
          q.options.forEach((opt) => {
            opts += `<option value="${opt}">${opt}</option>`;
          });
        html += `<select class="prac-select cloze-inline-select" id="ans-${q.id}" onclick="event.stopPropagation()">${opts}</select>`;
      }
      // Soru Çoktan seçmeli veya Doğru/Yanlış ise sadece Numara dairesini göster
      else {
        html += `<span class="cloze-number">${num}</span>`;
      }
    } else if (token.startsWith("<")) {
      html += token;
    } else if (/[\u0370-\u03FF]/.test(token)) {
      let safeWord = token.replace(/'/g, "\\'").replace(/"/g, '\\"');
      html += `<span class="tok" onclick="event.stopPropagation(); triggerWordPopup(event, '${safeWord}', '${safeSentence}')">${token}</span>`;
    } else {
      html += token;
    }
  });

  return html;
}

// 2. Öğrenci Ekranı (Okuma ve Çözme Arayüzü)
function openPractice(id) {
  if (!requireAuth(1)) return;

  const prac = PRACTICE_CATALOG.find((p) => p.id === id);
  if (!prac) return;
  activePracticeSession = prac;

  // İnline bayraklarını sıfırla
  if (prac.questions)
    prac.questions.forEach((q) => (q.isRenderedInline = false));

  document.getElementById("practice-library-view").style.display = "none";
  document.getElementById("practice-workspace").style.display = "block";
  document.getElementById("active-practice-title").textContent = prac.title;

  // METNİ VE İÇİNDEKİ BOŞLUKLARI ÇİZ
  document.getElementById("practice-text-content").innerHTML = tokenizePracText(
    prac.text,
    prac.questions,
  );

  const qContainer = document.getElementById("practice-questions-content");
  let qHtml = "";
  let hasBottomQuestions = false;

  prac.questions.forEach((q, index) => {
    // Eğer soru metnin içine gömüldüyse (Yazmalı/Seçmeli boşluk), aşağıdaki soru paneline tekrar çizme!
    if (q.isRenderedInline) return;

    hasBottomQuestions = true;
    qHtml += `<div class="prac-q-box" id="prac-box-${q.id}">`;

    if (q.type === "tf") {
      qHtml += `<div class="prac-q-title">${index + 1}. ${tokenizePracHTML(q.question)}</div>`;
      qHtml += `<button class="prac-tf-btn" id="btn-${q.id}-true" onclick="selectPracOpt('${q.id}', 'true')">🟢 Σωστό (Doğru)</button>`;
      qHtml += `<button class="prac-tf-btn" id="btn-${q.id}-false" onclick="selectPracOpt('${q.id}', 'false')">🔴 Λάθος (Yanlış)</button>`;
      qHtml += `<input type="hidden" id="ans-${q.id}" value="">`;
    } else if (q.type === "mc") {
      qHtml += `<div class="prac-q-title">${index + 1}. ${tokenizePracHTML(q.question)}</div>`;
      if (q.options) {
        q.options.forEach((opt, optIdx) => {
          qHtml += `<button class="prac-mc-btn prac-mc-grp-${q.id}" id="btn-${q.id}-${optIdx}" onclick="selectPracMCOpt('${q.id}', '${optIdx}')">${tokenizePracHTML(opt)}</button>`;
        });
      }
      qHtml += `<input type="hidden" id="ans-${q.id}" value="">`;
    }
    qHtml += `</div>`;
  });

  // Eğer tüm sorular metnin içindeyse, Sorular panelinde bilgilendirme göster
  if (!hasBottomQuestions) {
    qContainer.innerHTML = `<div style="text-align:center; color:var(--text-dim); font-style:italic; padding:20px;">Tüm sorular metnin içine yerleştirilmiştir. Lütfen boşlukları yukarıdaki metin üzerinden doldurun.</div>`;
  } else {
    qContainer.innerHTML = qHtml;
  }

  document.getElementById("practice-result-feedback").style.display = "none";
}

/* ==========================================
 * YÖNETİCİ PANELİ KONTROLLERİ (FORM VE KAYIT)
 * ========================================== */

function changeAdminQType(selectElem, qId) {
  const type = selectElem.value;
  const container = document.getElementById(`q-fields-${qId}`);

  let fieldsHtml = "";

  if (type === "tf") {
    fieldsHtml = `
            <input type="text" class="auth-input q-text" style="padding:10px; margin-bottom:10px;" placeholder="Soru cümlesi...">
            <select class="auth-input q-ans-tf" style="padding:10px; margin-bottom:0;"><option value="true">Doğru (Σωστό)</option><option value="false">Yanlış (Λάθος)</option></select>
        `;
  } else if (type === "mc") {
    fieldsHtml = `
            <input type="text" class="auth-input q-text" style="padding:10px; margin-bottom:10px;" placeholder="Soru cümlesi...">
            <input type="text" class="auth-input q-opts" style="padding:10px; margin-bottom:10px;" placeholder="Şıklar (Virgülle ayırın: Elma,Armut,Muz)">
            <input type="number" class="auth-input q-ans-mc" style="padding:10px; margin-bottom:0;" placeholder="Doğru şıkkın sırası (0'dan başlar: 0, 1, 2...)">
        `;
  } else if (type === "fill-write") {
    fieldsHtml = `
            <div style="color:var(--text-dim); font-size:0.85rem; margin-bottom:10px;">💡 Bu soru doğrudan metin içindeki boşlukta gösterilecektir.</div>
            <input type="text" class="auth-input q-ans-fw" style="padding:10px; margin-bottom:0;" placeholder="Doğru Cevap (Yazılacak kelime)">
        `;
  } else if (type === "fill-select") {
    fieldsHtml = `
            <div style="color:var(--text-dim); font-size:0.85rem; margin-bottom:10px;">💡 Bu soru doğrudan metin içindeki boşlukta açılır menü olarak gösterilecektir.</div>
            <input type="text" class="auth-input q-opts" style="padding:10px; margin-bottom:10px;" placeholder="Şıklar (Virgülle ayırın: είναι, έχει, κάνει)">
            <input type="text" class="auth-input q-ans-fs" style="padding:10px; margin-bottom:0;" placeholder="Doğru Cevap (Kelimenin aynısı)">
        `;
  }

  // TIKLANABİLİR, KOPYALA-YAPIŞTIR DESTEKLİ ZENGİN METİN KUTUSU
  fieldsHtml += `
        <div style="margin-top: 15px; border-top: 1px dashed var(--border); padding-top: 15px;">
            <label style="color:var(--accent2); font-size:0.95rem; font-weight:bold; display:block; margin-bottom:5px;">📖 Detaylı Çözüm / Konu Anlatımı (İsteğe Bağlı):</label>
            <div style="font-size:0.8rem; color:var(--text-dim); margin-bottom:10px;">
                💡 Word'den veya internetten kopyaladığınız tablolu, renkli, kalın yazıları buraya <b>doğrudan yapıştırabilirsiniz</b>. Biçimlendirmeler korunur.
            </div>
            <div class="q-explanation" contenteditable="true" style="min-height: 80px; max-height: 400px; overflow-y: auto; background: var(--surface-alt); color: var(--text); border: 2px dashed var(--accent2); padding: 15px; border-radius: 8px; outline: none; cursor: text;"></div>
        </div>
    `;

  container.innerHTML = fieldsHtml;
}

function savePracticeFromForm() {
  const id = document.getElementById("admin-prac-id").value.trim();
  const title = document.getElementById("admin-prac-title").value.trim();
  const level = document.getElementById("admin-prac-level").value;
  const category = document.getElementById("admin-prac-cat").value.trim();
  const text = document.getElementById("admin-prac-text").value.trim();

  if (!id || !title || !category || !text) {
    showToastMessage(
      "❌ Lütfen temel alanları (ID, Başlık, Kategori, Metin) doldurun.",
    );
    return;
  }

  const questions = [];
  const qBlocks = document.querySelectorAll(".admin-q-block");
  let hasError = false;

  qBlocks.forEach((block, idx) => {
    const type = block.querySelector(".prac-q-type").value;
    let qObj = { id: "q" + (idx + 1), type: type };

    if (type === "tf") {
      qObj.question = block.querySelector(".q-text").value.trim();
      qObj.answer = block.querySelector(".q-ans-tf").value;
      if (!qObj.question) hasError = true;
    } else if (type === "mc") {
      qObj.question = block.querySelector(".q-text").value.trim();
      const optsStr = block.querySelector(".q-opts").value.trim();
      qObj.options = optsStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
      qObj.answer = block.querySelector(".q-ans-mc").value.trim();
      if (!qObj.question || qObj.options.length < 2 || qObj.answer === "")
        hasError = true;
    } else if (type === "fill-write") {
      qObj.question = "";
      qObj.answer = block.querySelector(".q-ans-fw").value.trim();
      if (!qObj.answer) hasError = true;
    } else if (type === "fill-select") {
      qObj.question = "";
      const optsStr = block.querySelector(".q-opts").value.trim();
      qObj.options = optsStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
      qObj.answer = block.querySelector(".q-ans-fs").value.trim();
      if (qObj.options.length < 2 || !qObj.answer) hasError = true;
    }

    // YENİ EKLENEN KISIM: Zengin Metni Oku ve Kaydet
    const explanationBox = block.querySelector(".q-explanation");
    if (explanationBox) {
      let expText = explanationBox.innerHTML.trim();
      if (expText === "<br>" || expText === "<div><br></div>") expText = ""; // Boşsa temizle
      qObj.explanation = expText;
    }

    questions.push(qObj);
  });

  if (hasError) {
    showToastMessage("❌ Soru alanlarında eksiklik var. Lütfen kontrol edin.");
    return;
  }

  const newPrac = { id, title, level, category, text, questions };
  const existsIndex = PRACTICE_CATALOG.findIndex((p) => p.id === newPrac.id);

  if (existsIndex > -1) {
    PRACTICE_CATALOG[existsIndex] = newPrac;
    showToastMessage("✅ Mevcut alıştırma güncellendi!");
  } else {
    PRACTICE_CATALOG.unshift(newPrac);
    showToastMessage("✅ Yeni alıştırma sisteme eklendi!");
  }

  localStorage.setItem("y_practices_db", JSON.stringify(PRACTICE_CATALOG));
  if (typeof useFirebase !== "undefined" && useFirebase && db) {
    db.collection("global").doc("practices").set({ list: PRACTICE_CATALOG });
  }

  document.getElementById("admin-prac-id").value = "";
  document.getElementById("admin-prac-title").value = "";
  document.getElementById("admin-prac-text").value = "";
  document.getElementById("admin-prac-questions").innerHTML = "";
  if (typeof adminQCount !== "undefined") adminQCount = 0;

  if (typeof renderPracticeLibrary === "function") renderPracticeLibrary();
  if (typeof renderAdminPracticeList === "function") renderAdminPracticeList();
}

function loadPracticeToAdminForm(id) {
  const p = PRACTICE_CATALOG.find((x) => x.id === id);
  if (!p) return;

  document.getElementById("admin-prac-id").value = p.id;
  document.getElementById("admin-prac-title").value = p.title;
  document.getElementById("admin-prac-level").value = p.level;
  document.getElementById("admin-prac-cat").value = p.category;
  document.getElementById("admin-prac-text").value = p.text;
  document.getElementById("admin-prac-questions").innerHTML = "";
  adminQCount = 0;

  if (p.questions) {
    p.questions.forEach((q) => {
      addAdminQuestionField();
      const blocks = document.querySelectorAll(".admin-q-block");
      const currentBlock = blocks[blocks.length - 1];

      const typeSelect = currentBlock.querySelector(".prac-q-type");
      typeSelect.value = q.type;
      changeAdminQType(typeSelect, adminQCount);

      if (q.type === "tf") {
        currentBlock.querySelector(".q-text").value = q.question || "";
        currentBlock.querySelector(".q-ans-tf").value = q.answer || "true";
      } else if (q.type === "mc") {
        currentBlock.querySelector(".q-text").value = q.question || "";
        currentBlock.querySelector(".q-opts").value = (q.options || []).join(
          ", ",
        );
        currentBlock.querySelector(".q-ans-mc").value = q.answer || "0";
      } else if (q.type === "fill-write") {
        currentBlock.querySelector(".q-ans-fw").value = q.answer || "";
      } else if (q.type === "fill-select") {
        currentBlock.querySelector(".q-opts").value = (q.options || []).join(
          ", ",
        );
        currentBlock.querySelector(".q-ans-fs").value = q.answer || "";
      }

      // YENİ EKLENEN KISIM: Düzenleme modunda açıklamayı geri getir
      const explanationBox = currentBlock.querySelector(".q-explanation");
      if (explanationBox && q.explanation) {
        explanationBox.innerHTML = q.explanation;
      }
    });
  }

  showToastMessage(
    "✏️ Alıştırma düzenleme moduna alındı. Değişiklikleri yapıp Kaydet'e basın.",
  );
  document
    .getElementById("admin-modal")
    .querySelector(".modal-box")
    .scrollTo({ top: 0, behavior: "smooth" });
}

/* ==========================================
 * OKUMA PANELİ TEMİZLEME MOTORU
 * ========================================== */
function clearReader() {
  const readerDiv = document.getElementById("reader");
  if (readerDiv) {
    // Eğer o an okunan bir ses varsa anında sustur
    if (typeof stopTTS === "function") {
      stopTTS();
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // Ekrana basılan metni tamamen sil
    readerDiv.innerHTML = "";

    // (İsteğe bağlı) Eğer "Kendi Metnimi Gir" kutusunu da silsin isterseniz:
    // const inputText = document.getElementById('input-text');
    // if(inputText) inputText.value = '';

    showToastMessage("🧹 Okuma alanı temizlendi.");
  }
}

/* ==========================================
 * ☀️/🌙 TEMA (DARK/LIGHT MODE) MOTORU
 * ========================================== */

// Sayfa yüklendiğinde kullanıcının tercihini hafızadan çek ve uygula
function initTheme() {
  const savedTheme = localStorage.getItem("y_theme") || "dark"; // Varsayılan: Karanlık
  const themeBtn = document.getElementById("theme-toggle-btn");

  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
    if (themeBtn) themeBtn.textContent = "🌙"; // Açık temadaysa Ay ikonu göster
  } else {
    document.body.classList.remove("light-theme");
    if (themeBtn) themeBtn.textContent = "☀️"; // Karanlık temadaysa Güneş ikonu göster
  }
}

// Butona tıklandığında temayı değiştir
function toggleTheme() {
  const isLight = document.body.classList.toggle("light-theme");
  const themeBtn = document.getElementById("theme-toggle-btn");

  if (isLight) {
    localStorage.setItem("y_theme", "light");
    if (themeBtn) themeBtn.textContent = "🌙";
    showToastMessage("☀️ Açık temaya geçildi.");
  } else {
    localStorage.setItem("y_theme", "dark");
    if (themeBtn) themeBtn.textContent = "☀️";
    showToastMessage("🌙 Karanlık temaya geçildi.");
  }
}

// Sistemi başlattığımızda temayı kontrol etmesini sağla
document.addEventListener("DOMContentLoaded", initTheme);
// Eğer script defer/async yükleniyorsa doğrudan da çağırabiliriz:
initTheme();
/* ==========================================
 * YDS SORU ÇÖZÜMÜ / KONU ANLATIMI YÖNETİMİ
 * ========================================== */

// 1. Soru Bankasındaki Sınavları Bulup Dropdown'a Doldurur
function populateAdminYdsExams() {
  const examSelect = document.getElementById("admin-yds-exam-select");
  if (!examSelect || typeof GLOBAL_SORU_BANKASI === "undefined") return;

  const exams = [...new Set(GLOBAL_SORU_BANKASI.map((q) => q.exam))].sort();

  examSelect.innerHTML =
    '<option value="">-- Önce Sınav Seçin --</option>' +
    exams.map((exam) => `<option value="${exam}">${exam}</option>`).join("");

  document.getElementById("admin-yds-q-select").innerHTML =
    '<option value="">-- Sonra Soru Seçin --</option>';
  document.getElementById("admin-yds-q-preview").innerHTML =
    "Soru önizlemesi burada görünecek...";
  document.getElementById("admin-yds-explanation").innerHTML = "";
}

// 2. Seçilen Sınava Ait Soruları Dropdown'a Doldurur
function loadAdminYdsQuestions() {
  const examName = document.getElementById("admin-yds-exam-select").value;
  const qSelect = document.getElementById("admin-yds-q-select");

  if (!examName) {
    qSelect.innerHTML = '<option value="">-- Sonra Soru Seçin --</option>';
    return;
  }

  const questions = GLOBAL_SORU_BANKASI.filter((q) => q.exam === examName);
  qSelect.innerHTML =
    '<option value="">-- Sonra Soru Seçin --</option>' +
    questions.map((q, index) => `<option value="${q.id}">Soru ${index + 1} - (${q.category})</option>`).join("");

  document.getElementById("admin-yds-q-preview").innerHTML =
    "Soru önizlemesi burada görünecek...";
  document.getElementById("admin-yds-explanation").innerHTML = "";
}

// 3. Soru Seçildiğinde Soruyu Önizletir ve Varsa Eski Çözümü Getirir
function loadAdminYdsExplanation() {
  const qId = document.getElementById("admin-yds-q-select").value;
  const preview = document.getElementById("admin-yds-q-preview");
  const expBox = document.getElementById("admin-yds-explanation");

  if (!qId) {
    preview.innerHTML = "Soru önizlemesi burada görünecek...";
    expBox.innerHTML = "";
    return;
  }

  const q = GLOBAL_SORU_BANKASI.find((x) => String(x.id) === String(qId));

  if (q) {
    preview.innerHTML = `<strong style="color:var(--accent);">Soru:</strong> ${q.question}<br><br><strong style="color:var(--success);">Doğru Cevap:</strong> ${q.answer} - ${q.options[q.answer]}`;
    expBox.innerHTML = q.explanation || ""; 
  } else {
    preview.innerHTML =
      '<span style="color:var(--error);">Soru veritabanında bulunamadı. ID hatası olabilir.</span>';
  }
}

// 4. Yazılan Açıklamayı Soru Bankasına Kaydeder (Zorunlu Bulut Senkronizasyonu)
function saveYdsExplanation() {
    const qId = document.getElementById('admin-yds-q-select').value;
    if (!qId) {
        showToastMessage("❌ Lütfen önce bir soru seçin!");
        return;
    }

    const expBox = document.getElementById('admin-yds-explanation');
    let expText = expBox.innerHTML.trim();
    if(expText === '<br>' || expText === '<div><br></div>') expText = '';

    const qIndex = GLOBAL_SORU_BANKASI.findIndex(x => String(x.id) === String(qId));
    
    if (qIndex > -1) {
        GLOBAL_SORU_BANKASI[qIndex].explanation = expText;
        
        let savedExplanations = JSON.parse(localStorage.getItem('y_yds_explanations')) || {};
        savedExplanations[qId] = expText;
        localStorage.setItem('y_yds_explanations', JSON.stringify(savedExplanations));
        
        if (typeof db !== 'undefined' && db !== null) {
            db.collection("global").doc("yds_explanations").set(savedExplanations, { merge: true })
              .then(() => console.log("☁️ Çözüm Firebase bulutuna başarıyla kaydedildi!"))
              .catch(err => console.error("Firebase kayıt hatası:", err));
        }
        
        showToastMessage("✅ Soru çözümü buluta ve cihaza kaydedildi!");
        
        if(typeof openYdsPractice === 'function') {
            const examName = document.getElementById('admin-yds-exam-select').value;
            if(document.getElementById('practice-workspace').style.display === 'block') {
                openYdsPractice(examName); 
            }
        }
    } else {
        showToastMessage("❌ Kayıt başarısız! Soru listede bulunamadı.");
    }
}

// 5. Başka Cihazdan (Örn: Telefondan) Girildiğinde Çözümleri ANINDA Çeken (Canlı) Fonksiyon
function listenForYdsExplanations() {
    if (typeof db !== 'undefined' && db !== null) {
        db.collection("global").doc("yds_explanations").onSnapshot((doc) => {
            if (doc.exists) {
                const cloudExplanations = doc.data();
                
                localStorage.setItem('y_yds_explanations', JSON.stringify(cloudExplanations));
                
                if (typeof GLOBAL_SORU_BANKASI !== 'undefined' && GLOBAL_SORU_BANKASI.length > 0) {
                    for (let qId in cloudExplanations) {
                        const realQ = GLOBAL_SORU_BANKASI.find(q => String(q.id) === String(qId));
                        if (realQ) {
                            realQ.explanation = cloudExplanations[qId];
                        }
                    }
                }
                console.log("☁️ 🔄 YDS Çözümleri Firebase'den CANLI olarak çekildi!");
            }
        }, (error) => {
            console.log("Firebase YDS canlı dinleme hatası:", error);
        });
    }
}

// Telefonun internet hızına bağlı kalmamak için 2 saniye sonra canlı dinlemeyi başlat
setTimeout(listenForYdsExplanations, 2000);

// 6. Sisteme "Yazılan Açıklamaları Hatırla" Mantığını Aşılayan Güçlü Tetikleyici
setInterval(() => {
    if (typeof GLOBAL_SORU_BANKASI === 'undefined' || GLOBAL_SORU_BANKASI.length === 0) return;
    
    const savedExplanations = JSON.parse(localStorage.getItem('y_yds_explanations'));
    if (savedExplanations) {
        for (let qId in savedExplanations) {
            const realQ = GLOBAL_SORU_BANKASI.find(q => String(q.id) === String(qId));
            if (realQ && realQ.explanation !== savedExplanations[qId]) {
                realQ.explanation = savedExplanations[qId];
            }
        }
    }
}, 2000);


window.GLOBAL_LESSONS = JSON.parse(localStorage.getItem('y_lessons_db')) || [];

/* ==========================================
 * YDS / SINAV SİSTEMİ VERİ ÇEKME VE ÇİZDİRME MOTORU
 * ========================================== */

window.GLOBAL_SORU_BANKASI = [];

// 1. SORULARI EKRANA KARTLAR HALİNDE ÇİZEN FONKSİYON
window.renderExamLibrary = function() {
  const container = document.getElementById("exam-grid-container");
  if (!container) return;

  // Soru yoksa ekrana uyarı bas
  if (!window.GLOBAL_SORU_BANKASI || window.GLOBAL_SORU_BANKASI.length === 0) {
      container.innerHTML = `
        <div style='text-align:center; padding:30px; background:var(--surface-alt); border-radius:12px; border:1px solid var(--border);'>
          <h3 style='color:var(--error); margin-bottom:10px;'>⚠️ Sınav Verileri Bulunamadı</h3>
          <p style='color:var(--text-dim);'>Sistem <b>sinavlar</b> klasöründeki JSON dosyalarını okuyamadı.<br><br>
          💡 <b>Not:</b> Projeyi doğrudan çift tıklayarak (file://) açtıysanız çalışmaz. VS Code üzerinden <b>Live Server</b> ile açmayı deneyin.</p>
        </div>`;
      return;
  }

  // Soruları sınav adına göre grupla ve ekrana çiz
  const exams = [...new Set(window.GLOBAL_SORU_BANKASI.map((q) => q.exam))];
  let html = "";
  
  exams.forEach((examName, index) => {
    const safeExamId = "exam_lvl_" + index;
    const examQuestions = window.GLOBAL_SORU_BANKASI.filter((q) => q.exam === examName);
    const categories = [...new Set(examQuestions.map((q) => q.category))];
    let catHtml = "";
    
    categories.forEach((cat) => {
      const qCount = examQuestions.filter((q) => q.category === cat).length;
      catHtml += `<div style="display:flex; justify-content:space-between; align-items:center; padding: 15px; background:var(--surface); border:1px solid var(--border); border-radius:8px; margin-bottom:10px;">
                    <div>
                      <div style="color:var(--text); font-weight:bold; font-size:1.1rem;">${cat}</div>
                      <div style="color:var(--text-dim); font-size:0.9rem;">Toplam ${qCount} Soru</div>
                    </div>
                    <button class="main-btn" style="padding: 10px 20px; background:var(--accent);" onclick="startExamSession('${examName}', '${cat}')">Sınava Başla ➔</button>
                  </div>`;
    });
    
    html += `<div class="deck-section" style="margin-bottom:15px; border: 1px solid var(--border);">
               <div class="deck-header" onclick="toggleAccordion('${safeExamId}')" style="font-size: 1.15rem; padding: 18px 20px; background:var(--surface-alt);">
                 <strong>📂 ${examName}</strong><span class="deck-arrow" id="arrow-${safeExamId}">▼</span>
               </div>
               <div class="deck-content" id="content-${safeExamId}" style="padding: 15px;">${catHtml}</div>
             </div>`;
  });
  
  container.innerHTML = html;
};

// 2. KLASÖRDEN JSON DOSYALARINI ÇEKEN FONKSİYON
window.fetchExamData = async function() {
  try {
    const EXAM_FILES = [
      'sinavlar/yds_2007_kasım.json',
      'sinavlar/yds_2008_mayis.json',
      'sinavlar/yds_2010_mayis.json',
      'sinavlar/yds_sinavlari.json'
    ];

    window.GLOBAL_SORU_BANKASI = []; 
    
    const fetchPromises = EXAM_FILES.map(file => 
      fetch(file)
        .then(res => {
            if (!res.ok) return []; 
            return res.json();
        })
        .catch(err => {
            console.error(`Hata: ${file} dosyası okunamadı (CORS / Live Server hatası olabilir)`);
            return [];
        })
    );

    const results = await Promise.all(fetchPromises);
    
    results.forEach(examData => {
        if(Array.isArray(examData)) {
            window.GLOBAL_SORU_BANKASI = window.GLOBAL_SORU_BANKASI.concat(examData);
        }
    });

    // Veriler çekildikten sonra ekrana çiz
    window.renderExamLibrary();
    if (typeof window.renderPracticeLibrary === 'function') window.renderPracticeLibrary();

  } catch (error) {
    console.error("Sınav sistemi çöktü:", error);
  }
};

// 3. SİSTEMİ GARANTİYE ALMAK İÇİN OTOMATİK TETİKLEYİCİ (Dosyanın en altı)
setTimeout(() => {
    window.fetchExamData();
}, 1500);

/* ==========================================
 * KONU ANLATIMI - YOUTUBE DESTEKLİ MOTOR
 * ========================================== */

window.GLOBAL_LESSONS = JSON.parse(localStorage.getItem('y_lessons_db')) || [];

// 1. KAYDETME FONKSİYONU
window.saveLesson = async function() {
    const idInput = document.getElementById('admin-lesson-id');
    const titleInput = document.getElementById('admin-lesson-title');
    const bodyInput = document.getElementById('admin-lesson-body');
    const catInput = document.getElementById('admin-lesson-cat');
    const linkInput = document.getElementById('admin-lesson-link');

    if (!idInput || !idInput.value || !titleInput.value) {
        showToastMessage("❌ ID ve Başlık zorunludur!");
        return;
    }

    const lessonData = {
        id: idInput.value.trim(),
        title: titleInput.value.trim(),
        category: catInput.value.trim() || "Genel Gramer",
        content: bodyInput.innerHTML,
        link: linkInput ? linkInput.value.trim() : "", 
        date: new Date().toLocaleDateString('tr-TR')
    };

    const idx = window.GLOBAL_LESSONS.findIndex(l => l.id === lessonData.id);
    if (idx > -1) window.GLOBAL_LESSONS[idx] = lessonData;
    else window.GLOBAL_LESSONS.unshift(lessonData);

    localStorage.setItem('y_lessons_db', JSON.stringify(window.GLOBAL_LESSONS));
    
    if (typeof useFirebase !== 'undefined' && useFirebase && typeof db !== 'undefined') {
        await db.collection("global").doc("lessons_db").set({ list: window.GLOBAL_LESSONS });
    }

    showToastMessage("✅ Kaydedildi!");
    idInput.value = ""; titleInput.value = ""; bodyInput.innerHTML = ""; catInput.value = ""; 
    if(linkInput) linkInput.value = "";
    
    if(typeof window.renderLessonLibrary === 'function') window.renderLessonLibrary();
    if(typeof window.populateAdminLessons === 'function') window.populateAdminLessons();
};

// 2. LİSTEYİ ÇİZDİRME (YouTube Kontrolü Eklenmiş)
window.renderLessonLibrary = function() {
    const container = document.getElementById('lessons-grid-container');
    if(!container) return;
    
    if(window.GLOBAL_LESSONS.length === 0) {
         container.innerHTML = '<p style="color:var(--text-dim); text-align:center; grid-column: 1 / -1; padding: 20px;">Henüz konu eklenmemiş.</p>';
         return;
    }

    container.innerHTML = window.GLOBAL_LESSONS.map(l => {
        // YouTube linki mi kontrol et
        const isYouTube = l.link && (l.link.includes('youtube.com') || l.link.includes('youtu.be'));
        
        // YouTube ise içeriği aç, değilse ve link varsa dışarı aç
        const clickAction = (isYouTube || !l.link) ? `openLesson('${l.id}')` : `window.open('${l.link}', '_blank')`;
        const actionText = isYouTube ? "📺 Videoyu İzle ➔" : (l.link ? "🔗 Kaynağa Git ➔" : "📖 Dersi Oku ➔");

        return `
        <div class="text-card" onclick="${clickAction}">
            <div style="font-size:0.85rem; color:var(--accent2); margin-bottom:5px; font-weight:bold;">${l.category}</div>
            <div class="text-card-title">${l.title}</div>
            <div class="text-card-play" style="color:var(--accent);">${actionText}</div>
        </div>
        `;
    }).join('');
};

// 3. DERSİ AÇMA VE VİDEO GÖMME (EKSİKTİ!)
// DERSİ GÖRÜNTÜLEME (Metin İçinde Video Desteği)
  // DERSİ GÖRÜNTÜLEME (Çoklu Video Desteği Eklendi)
window.openLesson = function(id) {
    const lesson = window.GLOBAL_LESSONS.find(l => l.id === id);
    if(!lesson) return;
    
    document.getElementById('lessons-grid-container').style.display = 'none';
    const viewArea = document.getElementById('lesson-view-area');
    viewArea.style.display = 'block';
    document.getElementById('lesson-active-title').textContent = lesson.title;
    
    let finalContent = lesson.content || "";

    // --- 1. ANA VİDEO MOTORU (Üstteki Link Kutusuna Yazılan Video) ---
    if (lesson.link && (lesson.link.includes('youtube.com') || lesson.link.includes('youtu.be'))) {
        const mainVideoId = extractYouTubeId(lesson.link);
        if (mainVideoId) {
            const mainVideoHtml = `
                <div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; margin:25px 0; border-radius:12px; border:1px solid var(--border); box-shadow: var(--shadow);">
                    <iframe style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" src="https://www.youtube.com/embed/${mainVideoId}" allowfullscreen></iframe>
                </div>`;
            
            if (finalContent.includes('[video]')) {
                finalContent = finalContent.replace('[video]', mainVideoHtml);
            } else {
                finalContent = mainVideoHtml + finalContent; // Etiket yoksa en başa ekle
            }
        }
    } else {
        // Link kutusunda YouTube linki yoksa ama [video] yazılmışsa, bozuk durmaması için o yazıyı sil
        finalContent = finalContent.replace('[video]', '');
    }

    // --- 2. ÇOKLU VİDEO MOTORU (Metin İçine Yazılan Ekstra Videolar) ---
    // Metin içindeki [video:https://...] etiketlerini bulur ve videoya çevirir
    finalContent = finalContent.replace(/\[video:(.+?)\]/g, function(match, url) {
        const vidId = extractYouTubeId(url.trim());
        if (vidId) {
            return `
                <div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; margin:25px 0; border-radius:12px; border:1px solid var(--border); box-shadow: var(--shadow);">
                    <iframe style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" src="https://www.youtube.com/embed/${vidId}" allowfullscreen></iframe>
                </div>`;
        }
        return match; // Eğer geçersiz bir linkse yazıyı bozmadan bırakır
    });
    
    document.getElementById('lesson-active-body').innerHTML = finalContent;
    window.scrollTo({top:0, behavior:'smooth'});
};

// 4. EKRANI KAPATMA VE VİDEOYU DURDURMA (EKSİKTİ!)
window.closeLessonView = function() {
    const bodyEl = document.getElementById('lesson-active-body');
    if (bodyEl) bodyEl.innerHTML = ""; // Arkada video çalmaya devam etmesin diye içi temizlenir
    const viewArea = document.getElementById('lesson-view-area');
    const gridContainer = document.getElementById('lessons-grid-container');
    
    if (viewArea) viewArea.style.display = 'none';
    if (gridContainer) gridContainer.style.display = 'grid';
};

// YARDIMCI FONKSİYON: YouTube Linkinden ID Çıkarma
window.extractYouTubeId = function(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// 5. YÖNETİCİ PANELİ İŞLEMLERİ (EKSİKTİ!)
window.populateAdminLessons = function() {
    const list = document.getElementById('admin-lesson-list');
    if(!list) return;
    
    if (window.GLOBAL_LESSONS.length === 0) {
        list.innerHTML = '<p style="color:var(--text-dim); font-size:0.9rem;">Henüz kayıtlı konu yok.</p>';
        return;
    }

    list.innerHTML = window.GLOBAL_LESSONS.map(l => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border); background:var(--surface); margin-bottom:5px; border-radius:6px;">
            <div>
                <strong style="color:var(--text);">${l.title}</strong><br>
                <small style="color:var(--accent2);">${l.category}</small>
            </div>
            <div>
                <button onclick="editLesson('${l.id}')" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:1.2rem; margin-right:10px;" title="Düzenle">✏️</button>
                <button onclick="deleteLesson('${l.id}')" style="background:none; border:none; color:var(--error); cursor:pointer; font-size:1.2rem;" title="Sil">🗑️</button>
            </div>
        </div>
    `).join('');
};

window.editLesson = function(id) {
    const lesson = window.GLOBAL_LESSONS.find(l => l.id === id);
    if (!lesson) return;
    document.getElementById('admin-lesson-id').value = lesson.id;
    document.getElementById('admin-lesson-title').value = lesson.title;
    document.getElementById('admin-lesson-cat').value = lesson.category;
    document.getElementById('admin-lesson-body').innerHTML = lesson.content;
    
    const linkInput = document.getElementById('admin-lesson-link');
    if(linkInput) linkInput.value = lesson.link || "";

    if (typeof showToastMessage === 'function') {
        showToastMessage("✏️ Düzenleme modu aktif. İşiniz bitince Kaydet'e basın.");
    }
    
    const modalBox = document.getElementById('admin-modal').querySelector('.modal-box');
    if (modalBox) modalBox.scrollTo({top: 0, behavior: 'smooth'});
};

window.deleteLesson = function(id) {
    if(!confirm("Bu konuyu silmek istediğinize emin misiniz?")) return;
    window.GLOBAL_LESSONS = window.GLOBAL_LESSONS.filter(l => l.id !== id);
    localStorage.setItem('y_lessons_db', JSON.stringify(window.GLOBAL_LESSONS));
    
    if (typeof useFirebase !== 'undefined' && useFirebase && typeof db !== 'undefined') {
        db.collection("global").doc("lessons_db").set({ list: window.GLOBAL_LESSONS });
    }
    
    window.renderLessonLibrary(); 
    window.populateAdminLessons();
    if (typeof showToastMessage === 'function') showToastMessage("🗑️ Ders silindi.");
};

/* ==========================================
 * SEKMELERİ GİZLE/GÖSTER MOTORU
 * ========================================== */
window.switchMainTab = function(tabName) {
    document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('mtab-' + tabName);
    if (activeBtn) activeBtn.classList.add('active');

    const allSections = ['read', 'video', 'media', 'dict', 'exam', 'practice', 'quiz', 'chat', 'lessons'];
    allSections.forEach(sec => {
        const el = document.getElementById('section-' + sec);
        if (el) el.style.display = 'none';
    });

    const activeSection = document.getElementById('section-' + tabName);
    if (activeSection) {
        activeSection.style.display = 'block';
        if (tabName === 'lessons') {
            const gridContainer = document.getElementById('lessons-grid-container');
            const viewArea = document.getElementById('lesson-view-area');
            if (gridContainer) gridContainer.style.display = 'grid';
            if (viewArea) viewArea.style.display = 'none';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.addLinkToEditor = function() {
    const url = prompt("Bağlantı adresini (URL) girin:", "https://");
    if (url) {
        // Seçili metin varsa link yapar, yoksa URL'yi link olarak ekler
        document.execCommand("createLink", false, url);
        
        // Linklerin her zaman yeni sekmede açılmasını sağla
        const links = document.getElementById('admin-lesson-body').getElementsByTagName('a');
        for (let link of links) {
            link.setAttribute('target', '_blank');
        }
    }
};