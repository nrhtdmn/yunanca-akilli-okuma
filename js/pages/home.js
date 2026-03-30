function loadUserData() {
  if (!currentUsername) return;
  if (!dbUserData[currentUsername]) {
    dbUserData[currentUsername] = { decks: { "Genel Kelimeler": [] }, customDict: {}, lastActiveDeck: "Genel Kelimeler" };
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
  const headerArea = document.getElementById('user-header-area');
  if (!currentUser) { 
      headerArea.innerHTML = `<button class="auth-action-btn" onclick="showAuthModal(true)">Giriş Yap / Kayıt Ol</button>`; 
      document.getElementById('main-sync-panel').style.display = 'none'; 
      return; 
  }
  
  let badges = `<button class="bell-btn" onclick="openAnnouncementsModal()" title="Duyurular">🔔<span class="bell-badge" id="bell-badge">0</span></button>`;
  
  // YENİ: Kullanıcı rozeti artık tıklanabilir ve Profili açıyor
  badges += `<div class="user-badge" onclick="openProfileModal()" title="Profil ve İstatistikleri Gör">👤 ${currentUsername}`;
  
  if (currentUser.role === 'admin') badges += `<span class="premium-badge" style="background:#f87171; color:#fff;">ADMİN</span>`;
  else if (currentUser.isPremium) badges += `<span class="premium-badge">PREMIUM</span>`; 
  else badges += `<span class="credit-badge">${currentUser.credits} Kredi</span>`;
  
  badges += `</div>`; // user-badge div'i kapandı
  
  if (currentUser.role === 'admin') badges += `<button class="admin-btn" onclick="openAdminPanel()">⚙️ Yönetim Paneli</button>`;
  
  headerArea.innerHTML = badges; 
  document.getElementById('main-sync-panel').style.display = 'flex'; 
  updateBellIcon(); 
}

// YENİ FONKSİYON: Gelişmiş Profili Açma ve İstatistik Hesaplama
function openProfileModal() {
  if(!currentUser) return;
  
  // İsim ve Rozet
  document.getElementById('profile-username').textContent = currentUsername.toUpperCase();
  const roleBadge = document.getElementById('profile-role-badge');
  
  if (currentUser.role === 'admin') {
      roleBadge.innerHTML = `<span class="premium-badge" style="background:#f87171; color:#fff; padding: 6px 12px; font-size:0.85rem;">SİSTEM YÖNETİCİSİ</span>`;
  } else if (currentUser.isPremium) {
      roleBadge.innerHTML = `<span class="premium-badge" style="padding: 6px 12px; font-size:0.85rem;">👑 PREMIUM ÜYE</span>`;
  } else {
      roleBadge.innerHTML = `<span style="background: rgba(255,255,255,0.1); color: var(--text-dim); padding: 5px 12px; border-radius: 12px; font-size:0.8rem; font-weight:bold;">STANDART ÜYE</span>`;
  }

  // İSTATİSTİK 1: Toplam Öğrenilen/Kaydedilen Kelime Sayısı
  let totalWords = 0;
  for(let deck in userDecks) {
      totalWords += userDecks[deck].length;
  }
  document.getElementById('profile-total-words').textContent = totalWords;

  // İSTATİSTİK 2 & 3: Toplam Sınav ve Ortalama Başarı
  const history = dbUserData[currentUsername]?.examHistory || [];
  document.getElementById('profile-total-exams').textContent = history.length;
  
  let avgScore = 0;
  if(history.length > 0) {
      let totalScore = 0;
      history.forEach(h => totalScore += h.score);
      avgScore = Math.round(totalScore / history.length);
  }
  document.getElementById('profile-avg-score').textContent = "%" + avgScore;

  // Üyelik Durumu Metni
  const statusText = document.getElementById('profile-status-text');
  if(currentUser.role === 'admin') {
      statusText.innerHTML = "<b>Yönetici Yetkisi:</b> Tüm sistem ayarlarını ve üyeleri kontrol edebilirsiniz.";
  } else if(currentUser.isPremium) {
      statusText.innerHTML = "<b>Durum:</b> <span style='color:var(--success)'>Aktif</span><br><small style='color:var(--text-dim)'>Tüm araçlara, çevirilere ve testlere sınırsız erişim hakkınız var.</small>";
  } else {
      statusText.innerHTML = `<b>Kalan Kredi:</b> <span style='color:var(--error); font-size:1.2rem; font-weight:bold;'>${currentUser.credits}</span><br><small style='color:var(--text-dim)'>Metin okuma, çeviri ve test işlemleri kredi harcar. Krediniz bittiğinde yöneticiye başvurun.</small>`;
  }

  document.getElementById('profile-modal').style.display = 'flex';
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
    fetchExamData();
}

function updateBellIcon() {
  if (!currentUser) return;
  const lastRead = dbUserData[currentUsername]?.lastReadAnnouncementsTime || 0;
  const unreadCount = dbAnnouncements.filter(a => a.id > lastRead).length;
  const badge = document.getElementById('bell-badge');
  if (badge) {
      if (unreadCount > 0) {
          badge.textContent = unreadCount; badge.style.display = 'flex'; badge.style.animation = 'pulse 1.5s infinite';
      } else { badge.style.display = 'none'; }
  }
}

function sendAnnouncement() {
  const text = document.getElementById('admin-ann-text').value.trim(); 
  const link = document.getElementById('admin-ann-link').value.trim(); // YENİ: Linki al
  if (!text) return;

  const newAnn = { 
    id: Date.now(), 
    text: text, 
    link: link, // YENİ: Linki objeye ekle
    date: new Date().toLocaleDateString('tr-TR') + ' - ' + new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}) 
  };
  
  dbAnnouncements.unshift(newAnn); 
  if (useFirebase && db) { db.collection("global").doc("announcements").set({list: dbAnnouncements}); }
  localStorage.setItem('y_announcements_db', JSON.stringify(dbAnnouncements)); 
  
  document.getElementById('admin-ann-text').value = ''; 
  document.getElementById('admin-ann-link').value = ''; // Kutuyu temizle
  showToastMessage("✅ Duyuru başarıyla tüm üyelere gönderildi!");
}

function openAnnouncementsModal() {
  const listContainer = document.getElementById('announcement-list');
  
  // Kullanıcının sildiği duyuruları al
  const deletedIds = (currentUser && dbUserData[currentUsername]?.deletedAnnouncements) ? dbUserData[currentUsername].deletedAnnouncements : [];
  
  // Silinmemiş duyuruları filtrele
  const visibleAnnouncements = dbAnnouncements.filter(a => !deletedIds.includes(a.id));

  if (visibleAnnouncements.length === 0) {
      listContainer.innerHTML = '<p style="text-align:center; color:var(--text-dim); margin-top:30px;">Henüz bir duyuru bulunmuyor.</p>';
  } else {
      listContainer.innerHTML = visibleAnnouncements.map(a => {
          let linkHtml = '';
          if (a.link) {
              // Link http ile başlıyorsa yeni sekmede aç, yoksa uygulama içi sekme değiştir
              if(a.link.startsWith('http')) {
                   linkHtml = `<a href="${a.link}" target="_blank" style="color:var(--accent); text-decoration:underline; font-size:0.95rem; display:inline-block; margin-top:8px; font-weight:bold;">🔗 Bağlantıya Git</a>`;
              } else {
                   linkHtml = `<button onclick="document.getElementById('announcement-modal').style.display='none'; switchMainTab('${a.link.replace('mtab-','')}');" style="background:rgba(79, 142, 247, 0.15); border:1px solid var(--accent); color:var(--accent); border-radius:6px; padding:6px 12px; font-size:0.9rem; cursor:pointer; margin-top:8px; font-weight:bold;">👉 Oraya Git</button>`;
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
      }).join('');
  }
  
  document.getElementById('announcement-modal').style.display = 'flex';
  
  if (dbAnnouncements.length > 0 && currentUsername) {
      if (!dbUserData[currentUsername]) dbUserData[currentUsername] = {};
      dbUserData[currentUsername].lastReadAnnouncementsTime = dbAnnouncements[0].id;
      syncCloudData(); updateBellIcon();
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
      item.style.display = 'none';
  }
  
  showToastMessage("Duyuru silindi.");
}

/* === READ KATALOĞU === */
function renderTextLibrary() {
  const container = document.getElementById('panel-library');
  let html = `<div style="text-align:center; margin-bottom:25px;"><h3 style="color:var(--accent); font-size: 1.6rem; margin-bottom:5px;">📚 Okuma Kütüphanesi</h3><p style="color:var(--text-dim); font-size:0.95rem;">Seviyenize uygun klasörü açın ve çalışmak istediğiniz metni seçin.</p></div>`;
  LEVELS.forEach(level => {
    const textsInLevel = METIN_KATALOGU.filter(t => t.level === level); const safeLevel = level; let levelContent = '';
    if (textsInLevel.length === 0) { levelContent = `<div style="padding: 15px 20px; color:var(--text-dim); text-align:center; font-style:italic;">Bu seviyede henüz metin bulunmuyor.</div>`; } 
    else {
      const categories = [...new Set(textsInLevel.map(t => t.category))];
      categories.forEach(cat => {
        const safeCat = safeLevel + "_" + cat.replace(/[^a-zA-Z0-9]/g, '_'); const textsInCat = textsInLevel.filter(t => t.category === cat);
        let cardsHtml = `<div class="text-grid">`;
        textsInCat.forEach(item => { cardsHtml += `<div class="text-card" onclick="openSampleText('${item.id}')"><div class="text-card-title">${item.title}</div><div class="text-card-play">📖 Oku ➔</div></div>`; });
        cardsHtml += `</div>`;
        levelContent += `
          <div class="deck-section" style="margin: 10px 15px; border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; background: rgba(0,0,0,0.2);">
            <div class="deck-header" onclick="toggleAccordion('cat-${safeCat}')" style="background:transparent; padding: 12px 15px;">
              <strong style="color: var(--text); font-size: 1rem;">${cat} <span style="color:var(--text-dim); font-size:0.8rem; font-weight:normal;">(${textsInCat.length} Metin)</span></strong><span class="deck-arrow" id="arrow-cat-${safeCat}">▼</span>
            </div>
            <div class="deck-content" id="content-cat-${safeCat}" style="background:transparent; padding-top:5px; border-top: 1px solid rgba(255,255,255,0.05);">${cardsHtml}</div>
          </div>`;
      });
    }
    html += `
      <div class="deck-section" style="margin-bottom:15px; border: 1px solid var(--border);">
        <div class="deck-header" onclick="toggleAccordion('lvl-${safeLevel}')" style="font-size: 1.15rem; padding: 18px 20px; background: linear-gradient(90deg, #1c212d 0%, #13161e 100%);">
          <strong>🎓 ${level} Seviyesi</strong><span class="deck-arrow" id="arrow-lvl-${safeLevel}">▼</span>
        </div>
        <div class="deck-content" id="content-lvl-${safeLevel}" style="padding: 5px 0 15px 0;">${levelContent}</div>
      </div>`;
  });
  container.innerHTML = html;
}

async function openSampleText(id) {
  if(!requireAuth(1)) return; 
  showToastMessage("⏳ Metin yükleniyor...");
  try {
    const res = await fetch(`ornek-metinler/${id}.txt`);
    if (!res.ok) throw new Error(`'ornek-metinler/${id}.txt' dosyası bulunamadı.`);
    const text = await res.text();
    document.getElementById('input-text').value = text;
    processAndRenderText();
    showToastMessage("✅ Metin başarıyla yüklendi!");
  } catch(e) { showToastMessage("❌ Hata: " + e.message); }
}

function processAndRenderText() {
  const rawText = document.getElementById('input-text').value;
  if(!rawText.trim()) { showToastMessage("Lütfen işlenecek bir metin girin."); return; }
  const readerDiv = document.getElementById('reader'); readerDiv.innerHTML = ""; readerDiv.style.display = "block";

  const toolbar = document.createElement('div'); toolbar.className = 'reader-toolbar';
  toolbar.innerHTML = `
    <div class="reader-toolbar-left">📖 Kelimeye tıkla → çeviri + telaffuz</div>
    <div class="reader-toolbar-right">
      <button class="toolbar-btn tts-toolbar-btn" onclick="speakAllText()" title="Tüm metni sesli oku">🔊 Oku</button>
      <button class="toolbar-btn tts-toolbar-btn" onclick="togglePauseSpeech()" title="Duraklat/Devam Et">⏸ Duraklat</button>
      <button class="toolbar-btn" onclick="stopSpeech()" title="Seslendirmeyi durdur">⏹ Durdur</button>
    </div>`;
  readerDiv.appendChild(toolbar);

  globalTextForTTS = ""; allWordSpans = [];
  rawText.split('\n').forEach(line => {
    if (!line.trim()) { readerDiv.appendChild(document.createElement('br')); globalTextForTTS += "\n"; return; }
    const pContainer = document.createElement('div'); pContainer.style.marginBottom = "15px";
    line.split(/(\s+)/).forEach(token => {
      if (/[\u0370-\u03FF]/.test(token)) {
        const span = document.createElement('span'); span.className = 'tok'; span.textContent = token;
        span.setAttribute('data-start', globalTextForTTS.length); globalTextForTTS += token; span.setAttribute('data-end', globalTextForTTS.length);
        span.onclick = (e) => triggerWordPopup(e, token, line); pContainer.appendChild(span); allWordSpans.push(span);
      } else { pContainer.appendChild(document.createTextNode(token)); globalTextForTTS += token; }
    });
    readerDiv.appendChild(pContainer); globalTextForTTS += "\n"; 
  });
  renderDecksAccordion(); window.scrollTo({ top: readerDiv.offsetTop - 30, behavior: 'smooth' });
}

function clearTextInputs() { document.getElementById('input-text').value = ""; document.getElementById('reader').innerHTML = ""; document.getElementById('reader').style.display = "none"; stopSpeech(); }

/* === SÖZLÜK && DESTE İŞLEMLERİ === */
function populateDeckSelects() {
  const optionsHtml = Object.keys(userDecks).map(deckName => `<option value="${deckName}" ${deckName === lastActiveDeck ? 'selected' : ''}>${deckName} (${userDecks[deckName].length} kelime)</option>`).join('');
  const popSelect = document.getElementById('wp-deck-select'); if(popSelect) popSelect.innerHTML = optionsHtml;
  const quizSelect = document.getElementById('quiz-deck-select'); if(quizSelect) quizSelect.innerHTML = optionsHtml;
}

function createNewDeck() {
  const newName = prompt("Yeni deste adı girin:");
  if (newName && newName.trim()) {
    const cleanName = newName.trim();
    if (!userDecks[cleanName]) { userDecks[cleanName] = []; lastActiveDeck = cleanName; syncCloudData(); populateDeckSelects(); renderDecksAccordion(); showToastMessage(`"${cleanName}" destesi oluşturuldu.`); } 
    else { showToastMessage("Bu isimde bir deste zaten var!"); }
  }
}

function saveWordToDeck() {
  const grWord = document.getElementById('wp-gr').textContent.trim(); const trMean = document.getElementById('wp-mean-input').value.trim(); const targetDeck = document.getElementById('wp-deck-select').value;
  if (!trMean || trMean === "Çeviri aranıyor...") { showToastMessage("Lütfen geçerli bir anlam girin."); return; }
  if(!userDecks[targetDeck]) userDecks[targetDeck] = [];
  if (userDecks[targetDeck].some(item => item.gr === grWord)) { showToastMessage("Bu kelime destede zaten mevcut!"); } 
  else { userDecks[targetDeck].push({ gr: grWord, tr: trMean }); lastActiveDeck = targetDeck; syncCloudData(); renderDecksAccordion(); populateDeckSelects(); showToastMessage("📚 Kelime desteye eklendi."); }
  closePopup();
}

function saveWordToCustomDict() {
  const cleanWord = document.getElementById('wp-gr').textContent.toLowerCase().replace(/[.,!?;():]/g, "").trim(); const newMean = document.getElementById('wp-mean-input').value.trim();
  if(newMean) { userCustomDict.set(cleanWord, newMean); syncCloudData(); showToastMessage("💾 Sözlüğe geçici olarak işlendi."); }
}

function renderDecksAccordion() {
  const displayContainer = document.getElementById('deck-display'); displayContainer.innerHTML = "";
  for (let deckName in userDecks) {
    const wordList = userDecks[deckName]; const safeId = deckName.replace(/[^a-zA-Z0-9]/g, '_'); let wordsHtml = "";
    if (wordList.length === 0) { wordsHtml = `<p style="color:var(--text-dim); text-align:center;">Bu destede henüz kelime yok.</p>`; } 
    else {
      wordsHtml = wordList.map((item, index) => `
        <div class="word-item"><span><b>${item.gr}</b> ${item.tr}</span>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="word-item-tts" onclick="speakGreek('${item.gr.replace(/'/g, "\\'")}'); event.stopPropagation();" title="Dinle">🔊</button>
            <button class="del-btn" onclick="deleteWordFromDeck('${deckName}', ${index})" title="Sil">🗑️</button>
          </div>
        </div>`).join('');
    }
    const deleteDeckBtn = deckName !== "Genel Kelimeler" ? `<button class="del-btn" onclick="event.stopPropagation(); deleteDeckEntirely('${deckName}')" style="margin-right:15px;" title="Desteyi Sil">Desteyi Sil</button>` : ``;
    displayContainer.innerHTML += `
      <div class="deck-section">
        <div class="deck-header" onclick="toggleAccordion('deck-${safeId}')"><strong>📂 ${deckName} (${wordList.length} kelime)</strong>
          <div style="display:flex; align-items:center;">${deleteDeckBtn}<span class="deck-arrow" id="arrow-deck-${safeId}">▼</span></div>
        </div>
        <div class="deck-content" id="content-deck-${safeId}">${wordsHtml}</div>
      </div>`;
  }
}
function deleteWordFromDeck(deckName, wordIndex) { if (confirm("Bu kelimeyi silmek istediğinize emin misiniz?")) { userDecks[deckName].splice(wordIndex, 1); syncCloudData(); renderDecksAccordion(); populateDeckSelects(); } }
function deleteDeckEntirely(deckName) { if (confirm(`"${deckName}" destesini silmek istediğinize emin misiniz?`)) { delete userDecks[deckName]; if (lastActiveDeck === deckName) lastActiveDeck = "Genel Kelimeler"; syncCloudData(); renderDecksAccordion(); populateDeckSelects(); } }

/* === QUIZ & E-YDS SİSTEMİ === */
function startAdvancedQuiz(isRetry = false) {
  const mode = document.getElementById('quiz-mode-select').value;
  if (!isRetry) {
    const deckName = document.getElementById('quiz-deck-select').value; const deck = userDecks[deckName];
    if (!deck || deck.length === 0) { showToastMessage("Seçilen destede kelime yok!"); return; }
    let shuffledDeck = [...deck].sort(() => Math.random() - 0.5); const limit = document.getElementById('quiz-limit-select').value;
    if (limit !== 'all') { shuffledDeck = shuffledDeck.slice(0, parseInt(limit)); }
    currentQuizPool = shuffledDeck; quizMistakes = []; correctCount = 0;
  } else {
    currentQuizPool = [...quizMistakes].map(m => ({gr: m.gr, tr: m.tr})).sort(() => Math.random() - 0.5); quizMistakes = []; correctCount = 0;
  }
  totalInitialWords = currentQuizPool.length; currentQuizIndex = 0;
  document.body.classList.add('focus-mode'); document.getElementById('quiz-setup-view').style.display = 'none'; document.getElementById('quiz-result-view').style.display = 'none'; document.getElementById('quiz-active-view').style.display = 'block';
  loadNextQuizQuestion();
}
function retryMistakes() { startAdvancedQuiz(true); }

function updateQuizUI() {
  let progressRatio = (correctCount / totalInitialWords) * 100; if (progressRatio > 100) progressRatio = 100;
  document.getElementById('quiz-progress-text').textContent = `ÖĞRENİLEN: ${correctCount} / ${totalInitialWords}`; document.getElementById('quiz-mistake-counter').textContent = `HATA: ${quizMistakes.length}`; document.getElementById('quiz-progress-bar').style.width = `${progressRatio}%`;
}

function recordMistake(wordObj, modeName) { if (!quizMistakes.some(w => w.gr === wordObj.gr)) { quizMistakes.push({ gr: wordObj.gr, tr: wordObj.tr, type: modeName }); } }
function pushToPoolIfWrong(wordObj) { currentQuizPool.push(wordObj); }

function finishQuiz() {
  document.body.classList.remove('focus-mode'); document.getElementById('quiz-active-view').style.display = 'none'; document.getElementById('quiz-result-view').style.display = 'block';
  document.getElementById('res-total').textContent = totalInitialWords;
  let finalCorrect = totalInitialWords - quizMistakes.length; if(finalCorrect < 0) finalCorrect = 0;
  document.getElementById('res-correct').textContent = finalCorrect; document.getElementById('res-wrong').textContent = quizMistakes.length;
  let score = Math.round((finalCorrect / totalInitialWords) * 100) || 0; if (score > 100) score = 100; document.getElementById('res-score').textContent = `%${score}`;
  const table = document.getElementById('mistakes-table'); table.innerHTML = "";
  if (quizMistakes.length > 0) { document.getElementById('mistakes-container').style.display = 'block'; document.getElementById('retry-mistakes-btn').style.display = 'inline-flex'; let th = `<tr><th>Yunanca</th><th>Türkçe</th></tr>`; table.innerHTML = th + quizMistakes.map(m => `<tr><td><b>${m.gr}</b></td><td>${m.tr}</td></tr>`).join(''); } 
  else { document.getElementById('mistakes-container').style.display = 'none'; document.getElementById('retry-mistakes-btn').style.display = 'none'; }
}

function loadNextQuizQuestion() {
  if (correctCount >= totalInitialWords || currentQuizIndex >= currentQuizPool.length) { finishQuiz(); return; }
  updateQuizUI(); isQuestionActive = true; currentQuizQuestion = currentQuizPool[currentQuizIndex];
  const mode = document.getElementById('quiz-mode-select').value; const area = document.getElementById('quiz-work-area'); const feedback = document.getElementById('quiz-feedback'); feedback.innerHTML = ""; feedback.className = "";
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
  }
}
function exitQuiz() { document.body.classList.remove('focus-mode'); document.getElementById('quiz-active-view').style.display = 'none'; document.getElementById('quiz-result-view').style.display = 'none'; document.getElementById('quiz-setup-view').style.display = 'block'; stopSpeech(); }
function showFeedback(isSuccess, msg) { const fb = document.getElementById('quiz-feedback'); fb.className = 'pop-anim'; if (isSuccess) { fb.innerHTML = `<span style="color:var(--success); background:rgba(74,222,128,0.1); padding:8px 20px; border-radius:20px;">✅ ${msg}</span>`; } else { fb.innerHTML = `<span style="color:var(--error); background:rgba(248,113,113,0.1); padding:8px 20px; border-radius:20px;">❌ ${msg}</span>`; } }

function evalMulti(selected) {
  if (!isQuestionActive) return; isQuestionActive = false; const btns = document.querySelectorAll('.quiz-opt-btn'); let isCorrect = (selected === currentQuizQuestion.tr);
  btns.forEach(btn => { btn.disabled = true; if (btn.textContent === currentQuizQuestion.tr) btn.classList.add('correct'); else if (btn.textContent === selected && !isCorrect) btn.classList.add('wrong'); });
  if (isCorrect) { if(!quizMistakes.some(w=>w.gr===currentQuizQuestion.gr)) correctCount++; showFeedback(true, "Harika!"); updateQuizUI(); currentQuizIndex++; setTimeout(loadNextQuizQuestion, 1000); } 
  else { recordMistake(currentQuizQuestion, 'multi'); pushToPoolIfWrong(currentQuizQuestion); showFeedback(false, "Doğrusunu yeşil ile işaretledik."); currentQuizIndex++; setTimeout(loadNextQuizQuestion, 2000); }
}
function evalListen(selected) { document.getElementById('hidden-gr-word').style.filter = 'none'; document.getElementById('hidden-gr-word').textContent = currentQuizQuestion.gr; evalMulti(selected); }
function evalWrite() {
  if (!isQuestionActive) return; const input = document.getElementById('quiz-write-input'); const userText = input.value.trim().toLowerCase(); const correctText = currentQuizQuestion.tr.trim().toLowerCase();
  if (userText === correctText) { isQuestionActive = false; input.style.borderColor = "var(--success)"; input.style.color = "var(--success)"; if(!quizMistakes.some(w=>w.gr===currentQuizQuestion.gr)) correctCount++; showFeedback(true, "Mükemmel!"); updateQuizUI(); currentQuizIndex++; setTimeout(loadNextQuizQuestion, 1000); } 
  else { recordMistake(currentQuizQuestion, 'write'); input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); showFeedback(false, "Hatalı. Tekrar dene veya ipucu al."); }
}
function giveWriteHint() { if (!isQuestionActive) return; recordMistake(currentQuizQuestion, 'write'); pushToPoolIfWrong(currentQuizQuestion); const input = document.getElementById('quiz-write-input'); input.value = currentQuizQuestion.tr; input.style.borderColor = "var(--accent2)"; const fb = document.getElementById('quiz-feedback'); fb.className = 'pop-anim'; fb.innerHTML = `<span style="color:var(--accent2); background:rgba(232,201,109,0.1); padding:8px 20px; border-radius:20px;">💡 İpucu kullanıldı. Kelime daha sonra tekrar sorulacak.</span>`; isQuestionActive = false; currentQuizIndex++; setTimeout(loadNextQuizQuestion, 2500); }
function evalFlash(knewIt) {
  if (!isQuestionActive) return; isQuestionActive = false;
  if (knewIt) { if(!quizMistakes.some(w=>w.gr===currentQuizQuestion.gr)) correctCount++; updateQuizUI(); currentQuizIndex++; loadNextQuizQuestion(); } 
  else { recordMistake(currentQuizQuestion, 'flash'); pushToPoolIfWrong(currentQuizQuestion); const fb = document.getElementById('quiz-feedback'); fb.className = 'pop-anim'; fb.innerHTML = `<span style="color:var(--accent2); background:rgba(232,201,109,0.1); padding:8px 20px; border-radius:20px;">Daha sonra tekrar sorulacak.</span>`; currentQuizIndex++; setTimeout(loadNextQuizQuestion, 1200); }
}

/* === EXAM LİBRARY VE MANTIĞI === */
function renderExamLibrary() {
  const container = document.getElementById('exam-grid-container'); if (GLOBAL_SORU_BANKASI.length === 0) return;
  const exams = [...new Set(GLOBAL_SORU_BANKASI.map(q => q.exam))]; let html = "";
  exams.forEach((examName, index) => {
    const safeExamId = "exam_lvl_" + index; const examQuestions = GLOBAL_SORU_BANKASI.filter(q => q.exam === examName); const categories = [...new Set(examQuestions.map(q => q.category))]; let catHtml = "";
    categories.forEach(cat => {
        const qCount = examQuestions.filter(q => q.category === cat).length;
        catHtml += `<div style="display:flex; justify-content:space-between; align-items:center; padding: 15px; background:#090b10; border:1px solid var(--border); border-radius:8px; margin-bottom:10px;"><div><div style="color:var(--text); font-weight:bold; font-size:1.1rem;">${cat}</div><div style="color:var(--text-dim); font-size:0.9rem;">Toplam ${qCount} Soru</div></div><button class="main-btn" style="padding: 10px 20px;" onclick="startExamSession('${examName}', '${cat}')">Sınava Başla ➔</button></div>`;
    });
    html += `<div class="deck-section" style="margin-bottom:15px; border: 1px solid var(--border);"><div class="deck-header" onclick="toggleAccordion('${safeExamId}')" style="font-size: 1.15rem; padding: 18px 20px;"><strong>📂 ${examName}</strong><span class="deck-arrow" id="arrow-${safeExamId}">▼</span></div><div class="deck-content" id="content-${safeExamId}" style="padding: 15px;">${catHtml}</div></div>`;
  });
  container.innerHTML = html;
}

function startExamSession(examName, category) {
  if(!requireAuth(1)) return;
  examSession = GLOBAL_SORU_BANKASI.filter(q => q.exam === examName && q.category === category);
  currentQIndex = 0; examState = {};
  examSession.forEach(q => { examState[q.id] = { selected: null, eliminated: [], marked: false, qHtml: null, timeSpent: 0 }; });
  document.body.classList.add('focus-mode'); document.getElementById('exam-library-view').style.display = 'none'; document.getElementById('exam-result-view').style.display = 'none'; document.getElementById('exam-workspace').style.display = 'block';
  examStartTime = new Date(); if(currentUser) { const namePlaceholder = document.getElementById('osym-name-placeholder'); if(namePlaceholder) namePlaceholder.textContent = currentUsername.toUpperCase(); }
  startRealClock(); startGlobalExamTimer(); loadExamQuestion();
}

function startGlobalExamTimer() {
  clearInterval(examTimerInterval); document.getElementById('e-time').textContent = "00:00"; 
  examTimerInterval = setInterval(() => {
    const now = new Date(); const totalElapsedSec = Math.floor((now - examStartTime) / 1000); document.getElementById('e-time').textContent = formatExamTime(totalElapsedSec);
    if(examSession.length > 0 && examSession[currentQIndex]) { const qId = examSession[currentQIndex].id; examState[qId].timeSpent++; }
  }, 1000);
}

function saveCurrentQuestionState() { const qId = examSession[currentQIndex].id; examState[qId].qHtml = document.getElementById('exam-q-text').innerHTML; }

function loadExamQuestion() {
  const q = examSession[currentQIndex]; const state = examState[q.id];
  document.getElementById('e-current-q').textContent = currentQIndex + 1; document.getElementById('e-total-q').textContent = examSession.length;
  const descEl = document.getElementById('osym-timer-desc'); if(descEl) { descEl.textContent = q.description || "1-80 sorularda, cümlede boş bırakılan yerlere uygun düşen sözcük ή ifadeyi bulunuz."; }
  const markCb = document.getElementById('osym-mark-cb'); if(markCb) markCb.checked = state.marked === true;
  if (state.qHtml) { document.getElementById('exam-q-text').innerHTML = state.qHtml; } 
  else { document.getElementById('exam-q-text').innerHTML = `<strong>${currentQIndex + 1}.</strong> ` + tokenizeForExamInteractive(q.question); }
  
  let optsHtml = '';
  for (const [key, text] of Object.entries(q.options)) {
    const isSelected = state.selected === key ? 'selected' : ''; const isEliminated = state.eliminated.includes(key) ? 'eliminated' : ''; const tokenizedOptionText = tokenizeForExamInteractive(text);
    optsHtml += `<div class="osym-option-row ${isSelected} ${isEliminated}" id="opt-row-${key}"><div class="osym-circle" onclick="selectExamOption('${key}')">${key}</div><div class="osym-option-text" style="padding: 10px; cursor: pointer; flex-grow: 1;" onclick="toggleEliminateOption('${key}')">${tokenizedOptionText}</div></div>`;
  }
  document.getElementById('exam-options-container').innerHTML = optsHtml;
}

function selectExamOption(key) {
  const qId = examSession[currentQIndex].id; if(examState[qId].eliminated.includes(key)) return;
  if(examState[qId].selected === key) { examState[qId].selected = null; } else { examState[qId].selected = key; }
  document.querySelectorAll('.osym-option-row').forEach(row => row.classList.remove('selected')); if(examState[qId].selected) { document.getElementById(`opt-row-${key}`).classList.add('selected'); }
}

function toggleEliminateOption(key) {
  const qId = examSession[currentQIndex].id; const row = document.getElementById(`opt-row-${key}`);
  if (examState[qId].eliminated.includes(key)) { examState[qId].eliminated = examState[qId].eliminated.filter(k => k !== key); row.classList.remove('eliminated'); } 
  else { examState[qId].eliminated.push(key); row.classList.add('eliminated'); if(examState[qId].selected === key) { examState[qId].selected = null; row.classList.remove('selected'); } }
}

function toggleMarkCurrentQ() { const qId = examSession[currentQIndex].id; const markCb = document.getElementById('osym-mark-cb'); if(markCb) examState[qId].marked = markCb.checked; }
function prevExamQ() { if (currentQIndex > 0) { saveCurrentQuestionState(); currentQIndex--; loadExamQuestion(); } }
function nextExamQ() { if (currentQIndex < examSession.length - 1) { saveCurrentQuestionState(); currentQIndex++; loadExamQuestion(); } }
function exitExam() { if(confirm("Sınavdan çıkmak istediğinize emin misiniz? İlerlemeniz kaybolacaktır.")) { clearInterval(examTimerInterval); clearInterval(clockInterval); document.body.classList.remove('focus-mode'); document.getElementById('exam-workspace').style.display = 'none'; document.getElementById('exam-library-view').style.display = 'block'; } }
function setExamTool(mode) { examToolMode = mode; document.querySelectorAll('.exam-tool-btn').forEach(b => b.classList.remove('active')); document.getElementById('etool-' + mode).classList.add('active'); }

function examTokenClicked(event, word, sentence) {
  event.stopPropagation(); 
  if (examToolMode === 'dict') { triggerWordPopup(event, word, sentence); } 
  else if (examToolMode === 'highlight') { event.target.classList.toggle('exam-hl'); event.target.classList.remove('exam-strike'); } 
  else if (examToolMode === 'strike') { event.target.classList.toggle('exam-strike'); event.target.classList.remove('exam-hl'); }
}

function tokenizeForExamInteractive(text) {
  let html = ''; let safeSentence = text.replace(/'/g, "\\'").replace(/"/g, '\\"'); 
  text.split(/(\s+)/).forEach(token => {
    if (/[\u0370-\u03FF]/.test(token)) { let safeWord = token.replace(/'/g, "\\'").replace(/"/g, '\\"'); html += `<span class="tok" onclick="examTokenClicked(event, '${safeWord}', '${safeSentence}')">${token}</span>`; } 
    else { html += token; }
  });
  return html;
}

function finishExam() {
  if(!confirm("Sınavı bitirmek istediğinize emin misiniz? Sınav sonucunuz hesaplanacak.")) return;
  saveCurrentQuestionState(); clearInterval(examTimerInterval); clearInterval(clockInterval); document.body.classList.remove('focus-mode');
  let correct = 0; let wrong = 0; let empty = 0; let analysisHtml = "<tr><th>Soru</th><th>Durum</th><th>Süre</th><th>Cevabınız</th><th>Doğru Cevap</th></tr>";
  examSession.forEach((q, index) => {
      const state = examState[q.id]; let statusHtml = "";
      if (!state.selected) { empty++; statusHtml = "<span style='color:var(--text-dim)'>Boş Bırakıldı</span>"; } 
      else if (state.selected === q.answer) { correct++; statusHtml = "<span style='color:var(--success)'>✅ Doğru</span>"; } 
      else { wrong++; statusHtml = "<span style='color:var(--error)'>❌ Yanlış</span>"; }
      analysisHtml += `<tr><td>Soru ${index + 1}</td><td>${statusHtml}</td><td style="color:var(--accent2);">${formatExamTime(state.timeSpent)}</td><td>${state.selected || '-'}</td><td><b>${q.answer}</b></td></tr>`;
  });
  if (currentUser) {
      let score = Math.round((correct / examSession.length) * 100) || 0; const now = new Date(); const totalElapsedSec = Math.floor((now - examStartTime) / 1000);
      const historyItem = { id: Date.now(), date: now.toLocaleDateString('tr-TR') + ' - ' + now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}), examName: examSession[0].exam + " (" + examSession[0].category + ")", total: examSession.length, correct: correct, wrong: wrong, empty: empty, score: score, timeSpent: formatExamTime(totalElapsedSec) };
      if (!dbUserData[currentUsername].examHistory) { dbUserData[currentUsername].examHistory = []; }
      dbUserData[currentUsername].examHistory.unshift(historyItem); syncCloudData(); 
  }
  document.getElementById('exam-res-total').textContent = examSession.length; document.getElementById('exam-res-correct').textContent = correct; document.getElementById('exam-res-wrong').textContent = wrong; document.getElementById('exam-res-empty').textContent = empty;
  document.getElementById('exam-analysis-table').innerHTML = analysisHtml;
  document.getElementById('exam-workspace').style.display = 'none'; document.getElementById('exam-result-view').style.display = 'block';
}

/* === VİDEO VE CANLI MEDYA LİBRARY === */
function renderVideoLibrary() {
  const grid = document.getElementById('video-grid-container'); const filterContainer = document.getElementById('video-category-filters');
  const uniqueCategories = [...new Set(VIDEO_KATALOGU.map(v => v.category))]; const allCategories = ["Tümü", ...uniqueCategories];
  filterContainer.innerHTML = allCategories.map(cat => `<button class="cat-btn ${cat === currentVideoCategory ? 'active' : ''}" onclick="filterVideoCategory('${cat}')">${cat}</button>`).join('');
  const filteredVideos = currentVideoCategory === "Tümü" ? VIDEO_KATALOGU : VIDEO_KATALOGU.filter(v => v.category === currentVideoCategory);
  grid.innerHTML = "";
  if (filteredVideos.length === 0) { grid.innerHTML = `<p style="color:var(--text-dim); text-align:center; grid-column: 1 / -1; padding: 30px;">Bu kategoride henüz video bulunmuyor.</p>`; return; }
  filteredVideos.forEach(video => {
    const card = document.createElement('div'); card.className = 'video-card'; card.onclick = () => openVideo(video.id, video.title);
    card.innerHTML = `<div class="video-card-thumb"><span class="video-card-level">${video.level}</span><span class="video-card-category-badge">${video.category}</span><img src="https://img.youtube.com/vi/${video.id}/hqdefault.jpg" alt="${video.title}"></div><div class="video-card-content"><div class="video-card-title">${video.title}</div><div class="video-card-play">▶ Çalışmaya Başla</div></div>`;
    grid.appendChild(card);
  });
}
function filterVideoCategory(catName) { currentVideoCategory = catName; renderVideoLibrary(); }

async function openVideo(videoId, title) {
  if(!requireAuth(1)) return; 
  showToastMessage("⏳ Video ve altyazılar yükleniyor...");
  try {
    const res = await fetch(`altyazilar/${videoId}.json`); if (!res.ok) throw new Error(`Altyazı dosyası bulunamadı ('altyazilar/${videoId}.json').`);
    ytSubtitles = await res.json(); if (!Array.isArray(ytSubtitles) || ytSubtitles.length === 0) throw new Error("JSON formatı hatalı veya boş.");
    document.getElementById('video-library-view').style.display = 'none'; document.getElementById('video-workspace').style.display = 'block'; document.getElementById('active-video-title').textContent = title;
    document.getElementById('hls-player').style.display = 'none'; if(hlsInstance) hlsInstance.destroy(); document.getElementById('hls-player').pause();
    document.getElementById('youtube-player').style.display = 'block'; document.getElementById('active-subtitle-container').style.display = 'flex';
    
    if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') { ytPlayer.loadVideoById(videoId); } 
    else { ytPlayer = new YT.Player('youtube-player', { height: '100%', width: '100%', videoId: videoId, playerVars: { 'playsinline': 1, 'rel': 0, 'origin': window.location.origin === "null" ? "*" : window.location.origin }, events: { 'onStateChange': onPlayerStateChange }}); }
    if(videoSyncInterval) clearInterval(videoSyncInterval); videoSyncInterval = setInterval(syncSubtitles, 200);
  } catch (err) { showToastMessage("❌ Hata: " + err.message); }
}

function closeVideoPlayer() {
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo(); 
  if(videoSyncInterval) clearInterval(videoSyncInterval);
  document.getElementById('video-workspace').style.display = 'none'; document.getElementById('video-library-view').style.display = 'block';
  document.getElementById('sub-gr').innerHTML = "..."; document.getElementById('sub-tr').textContent = "Videonun başlaması bekleniyor..."; document.getElementById('active-subtitle-container').classList.remove('active'); currentActiveSubIndex = -1;
}

function syncSubtitles() {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return; 
  const currentTime = ytPlayer.getCurrentTime(); let foundIndex = -1;
  for (let i = 0; i < ytSubtitles.length; i++) { if (currentTime >= ytSubtitles[i].start && currentTime <= ytSubtitles[i].end) { foundIndex = i; break; } }
  if (foundIndex !== currentActiveSubIndex) {
    currentActiveSubIndex = foundIndex; const subGrContainer = document.getElementById('sub-gr'); const subTrContainer = document.getElementById('sub-tr'); const mainBox = document.getElementById('active-subtitle-container');
    if (foundIndex > -1) {
      const currentSub = ytSubtitles[foundIndex]; subTrContainer.textContent = currentSub.tr; mainBox.classList.add('active'); subGrContainer.innerHTML = "";
      currentSub.gr.split(/(\s+)/).forEach(token => { if (/[\u0370-\u03FF]/.test(token)) { const span = document.createElement('span'); span.className = 'tok'; span.textContent = token; span.onclick = (e) => triggerWordPopup(e, token, currentSub.gr); subGrContainer.appendChild(span); } else subGrContainer.appendChild(document.createTextNode(token)); });
    } else { subGrContainer.innerHTML = "..."; subTrContainer.textContent = ""; mainBox.classList.remove('active'); }
  }
}
function onPlayerStateChange(event) { }

function renderTVLibrary() {
  const grid = document.getElementById('tv-grid-container'); let html = "";
  GREEK_TV_CHANNELS.forEach(tv => { html += `<div class="text-card" onclick="openTVChannel('${tv.url}', '${tv.name}')" style="min-height:auto; display:flex; align-items:center; flex-direction:row; gap:15px; padding: 15px;"><span style="font-size:2rem;">🔴</span><div class="text-card-title" style="margin-bottom:0; font-size:1.15rem;">${tv.name}</div></div>`; });
  grid.innerHTML = html;
}
function openTVChannel(url, title) {
  if(!requireAuth(1)) return; 
  document.getElementById('media-library-view').style.display = 'none'; document.getElementById('media-workspace').style.display = 'block'; document.getElementById('active-media-title').textContent = "CANLI YAYIN: " + title;
  const videoElem = document.getElementById('hls-player');
  try { if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo(); } catch(e) {}
  if (Hls.isSupported()) { if(hlsInstance) hlsInstance.destroy(); hlsInstance = new Hls(); hlsInstance.loadSource(url); hlsInstance.attachMedia(videoElem); hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() { videoElem.play(); }); }
  else if (videoElem.canPlayType('application/vnd.apple.mpegurl')) { videoElem.src = url; videoElem.addEventListener('loadedmetadata', function() { videoElem.play(); }); }
}
function closeMediaWorkspace() {
  if(hlsInstance) hlsInstance.destroy(); document.getElementById('hls-player').pause();
  document.getElementById('media-workspace').style.display = 'none'; document.getElementById('media-library-view').style.display = 'block';
}

function renderRadioLibrary() {
  const grid = document.getElementById('radio-grid-container'); let html = "";
  GREEK_RADIO_CHANNELS.forEach(radio => { html += `<div class="text-card" onclick="openRadioChannel('${radio.url}', '${radio.name}')" style="min-height:auto; display:flex; align-items:center; flex-direction:row; gap:15px; padding: 15px; border-color: rgba(232, 201, 109, 0.3);"><span style="font-size:2rem;">🎵</span><div class="text-card-title" style="margin-bottom:0; font-size:1.15rem; color:var(--accent2);">${radio.name}</div></div>`; });
  grid.innerHTML = html;
}
function openRadioChannel(url, title) {
  if(!requireAuth(1)) return; 
  if(hlsInstance) hlsInstance.destroy(); document.getElementById('hls-player').pause();
  const radioBox = document.getElementById('radio-player-box'); const audioElem = document.getElementById('html-audio-player'); const titleElem = document.getElementById('active-radio-name');
  titleElem.textContent = title; audioElem.src = url; radioBox.style.display = 'block'; audioElem.play().catch(e => showToastMessage("Radyo başlatılamadı, bağlantı sorunu olabilir."));
}
function closeRadioPlayer() { const audioElem = document.getElementById('html-audio-player'); audioElem.pause(); audioElem.src = ""; document.getElementById('radio-player-box').style.display = 'none'; }

function renderNewspaperLibrary() {
  const grid = document.getElementById('news-grid-container'); let html = "";
  GREEK_NEWSPAPERS.forEach(news => { html += `<div class="text-card" onclick="openNewspaper('${news.url}')" style="min-height:auto; display:flex; align-items:center; flex-direction:row; gap:15px; padding: 15px; border-color: rgba(79, 142, 247, 0.3);"><span style="font-size:2.2rem;">📰</span><div style="flex: 1;"><div class="text-card-title" style="margin-bottom:2px; font-size:1.1rem; color:var(--text);">${news.name}</div><div style="font-size:0.85rem; color:var(--text-dim);">${news.desc}</div></div><div style="color:var(--accent); font-size:1.5rem; font-weight:bold;">➔</div></div>`; });
  grid.innerHTML = html;
}
function openNewspaper(url) {
    if(!requireAuth(1)) return; 
    showToastMessage("Haber sitesi yeni sekmede açılıyor. Okumak istediğiniz haberin linkini kopyalamayı unutmayın!");
    setTimeout(() => { window.open(url, '_blank'); }, 1500);
}

async function searchDictionary() {
  const word = document.getElementById('dict-search-input').value.trim(); 
  if(!word) { showToastMessage("Lütfen aranacak bir kelime yazın."); return; }

  // gr-gr sözlüğü farklı bir sayfaya attığı için
  if(currentDictMode === 'gr-gr') { 
    showToastMessage("Sözlük güvenli sekmede açılıyor..."); 
    window.open("https://www.greek-language.gr/greekLang/modern_greek/tools/lexica/search.html?lq=" + encodeURIComponent(word), "_blank"); 
    return; 
  }

  const resultsContainer = document.getElementById('dict-results'); 
  resultsContainer.classList.add('active'); 
  resultsContainer.innerHTML = `<div style="text-align:center; color:var(--accent); padding:20px;">⏳ Çevriliyor...</div>`;

  const sl = currentDictMode === 'gr-tr' ? 'el' : 'tr'; 
  const tl = currentDictMode === 'gr-tr' ? 'tr' : 'el';

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&dt=bd&q=${encodeURIComponent(word)}`;
    const res = await fetch(url); const data = await res.json(); const mainTrans = data[0] && data[0][0] ? data[0][0][0] : "Çeviri bulunamadı.";
    let dictHtml = ""; const safeWord = word.replace(/'/g, "\\'"); const safeTrans = mainTrans.replace(/'/g, "\\'");
    
    if(currentDictMode === 'gr-tr') { 
        dictHtml = `<div class="dict-main-word tok" onclick="triggerWordPopup(event, '${safeWord}', 'Sözlük: ${safeWord}')" style="cursor:pointer; display:inline-block;">${word}</div><div class="dict-phonetic">/${getGreekPhonetics(word)}/</div><div class="dict-main-translation">${mainTrans}</div>`;
    } else if(currentDictMode === 'tr-gr') {
        dictHtml = `<div class="dict-main-word">${word}</div><div class="dict-main-translation tok" onclick="triggerWordPopup(event, '${safeTrans}', 'Sözlük: ${safeTrans}')" style="cursor:pointer; display:inline-block; color:var(--accent2); margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border);">${mainTrans}</div>`;
    }

    if(data[1] && data[1].length > 0) {
      data[1].forEach(posGroup => {
        let synHtml = `<div class="dict-pos-group"><div class="dict-pos-title">${posGroup[0]}</div><div class="dict-synonyms">`;
        posGroup[1].forEach(tr => { 
            const safeTr = tr.replace(/'/g, "\\'");
            if(currentDictMode === 'tr-gr') { synHtml += `<span class="dict-syn-item tok" onclick="triggerWordPopup(event, '${safeTr}', 'Sözlük: ${safeTr}')" style="cursor:pointer;">${tr}</span>`; } else { synHtml += `<span class="dict-syn-item">${tr}</span>`; }
        });
        synHtml += `</div></div>`; dictHtml += synHtml;
      });
    }
    resultsContainer.innerHTML = dictHtml;
  } catch(e) { resultsContainer.innerHTML = `<div style="text-align:center; color:var(--error); padding:20px;">❌ Çeviri sırasında bir hata oluştu.</div>`; }
}

