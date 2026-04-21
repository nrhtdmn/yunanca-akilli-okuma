function showAuthModal(login = true) {
  isLoginMode = login;
  document.getElementById('auth-title').textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
  document.getElementById('auth-submit-btn').textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
  document.getElementById('auth-switch-text').innerHTML = isLoginMode ? 'Hesabın yok mu? <b>Kayıt Ol</b>' : 'Zaten hesabın var mı? <b>Giriş Yap</b>';
  const extra = document.getElementById('auth-register-extra');
  if (extra) extra.style.display = login ? 'none' : 'block';
  document.getElementById('auth-modal').style.display = 'flex';
}

function closeAuthModal() { document.getElementById('auth-modal').style.display = 'none'; }
function toggleAuthMode() { showAuthModal(!isLoginMode); }

// Kullanıcı listesini ekrana çizen ana fonksiyon
window.renderAdminUsersList = function() {
  const tbody = document.getElementById('admin-user-list');
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const usersObj = window.dbUsers || {};
  let html = "";
  
  // Nesne içindeki her kullanıcıyı dön
  for(let username in usersObj) {
    // Yanlışlıkla belgeye karışmış teknik alan adları (Firestore/merge artığı)
    if(username === 'list' || username === 'lastReadAnnouncementsTime') continue;

    let user = usersObj[username];
    // Eğer veri bir nesne değilse (hatalı veri) atla
    if(!user || typeof user !== 'object') continue;

    const isMainAdmin = username === 'nurhat';
    
    let statusOpt = `<select class="action-select" onchange="updateUserAdmin('${username}', 'status', this.value)">
                        <option value="pending" ${user.status==='pending'?'selected':''}>Beklemede</option>
                        <option value="approved" ${user.status==='approved'?'selected':''}>Onaylı</option>
                     </select>`;
    
    let premiumOpt = `<select class="action-select" onchange="updateUserAdmin('${username}', 'isPremium', this.value)">
                        <option value="false" ${!user.isPremium?'selected':''}>Normal</option>
                        <option value="true" ${user.isPremium?'selected':''}>Premium</option>
                      </select>`;

    let roleOpt = `<select class="action-select" onchange="updateUserAdmin('${username}', 'role', this.value)" title="Rol">
                     <option value="user"    ${(!user.role || user.role==='user')   ?'selected':''}>👤 Üye (genel)</option>
                     <option value="student" ${user.role==='student'               ?'selected':''}>🎒 Öğrenci</option>
                     <option value="teacher" ${user.role==='teacher'               ?'selected':''}>🎓 Öğretmen</option>
                     <option value="admin"   ${user.role==='admin'                 ?'selected':''}>⚙️ Admin</option>
                   </select>`;
    
    let deleteBtn = isMainAdmin
      ? `<span style="color:var(--text-dim); font-size:0.85rem;" title="Ana yönetici hesabı silinemez">—</span>`
      : `<button class="secondary-btn" onclick="deleteUserAdmin('${username}')" 
                        style="padding:5px 10px; font-size:0.8rem; border-color:var(--error); color:var(--error); background:transparent;">
                        🗑️ Sil
                     </button>`;
    
    const disp = user.displayName || user.fullName || '';
    html += `<tr>
        <td><b>${username}</b>${disp ? `<br><small style="color:var(--text-dim);">${String(disp).replace(/</g,'&lt;')}</small>` : ''}${isMainAdmin ? ' <small style="color:var(--text-dim);">(ana yönetici)</small>' : ''}</td>
        <td>${statusOpt}</td>
        <td>${user.isPremium ? 'Sınırsız' : (user.credits || 0)}</td>
        <td style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">${roleOpt} ${premiumOpt} ${deleteBtn}</td>
    </tr>`;
  }
  
  if(html === "") {
      html = `<tr><td colspan="4" style="text-align:center; color:var(--text-dim); padding:20px;">
                Kayıtlı kullanıcı verisi bulunamadı. Firestore’da <code>global/users</code> belgesi dolu mu ve kurallar yayında mı kontrol edin.<br>
                <small>Bu liste, uygulama içi kayıtlı üyeleri gösterir (Firebase Authentication sekmesindeki hesaplar burada listelenmez).</small>
              </td></tr>`;
  }
  
  tbody.innerHTML = html;
};

window.renderAdminTrafficStats = function () {
  const summaryEl = document.getElementById("admin-traffic-summary");
  const last7El = document.getElementById("admin-traffic-last7");
  if (!summaryEl || !last7El) return;

  const stats = window.dbTrafficStats || {};
  const dailyVisits = (stats && stats.dailyVisits) || {};
  const dailyUniqueVisitors = (stats && stats.dailyUniqueVisitors) || {};
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  const totalVisits = Number(stats.totalVisits || 0);
  const totalUniqueVisitors = Number(stats.totalUniqueVisitors || 0);
  const todayVisits = Number(dailyVisits[todayKey] || 0);
  const todayUnique = Number(dailyUniqueVisitors[todayKey] || 0);

  const cards = [
    { label: "Toplam Ziyaret", value: totalVisits, color: "var(--accent)" },
    { label: "Toplam Tekil Cihaz", value: totalUniqueVisitors, color: "var(--success)" },
    { label: "Bugünkü Ziyaret", value: todayVisits, color: "var(--accent2)" },
    { label: "Bugünkü Tekil", value: todayUnique, color: "var(--tts-color)" },
  ];

  summaryEl.innerHTML = cards
    .map(
      (card) => `
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <div style="font-size:1.55rem; color:${card.color}; font-weight:bold;">${card.value}</div>
        <div style="font-size:0.84rem; color:var(--text-dim);">${card.label}</div>
      </div>`,
    )
    .join("");

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last7.push({
      key,
      label: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }),
      visits: Number(dailyVisits[key] || 0),
      unique: Number(dailyUniqueVisitors[key] || 0),
    });
  }

  last7El.innerHTML = last7
    .map(
      (row) => `
      <div style="display:grid; grid-template-columns:90px 1fr auto auto; gap:10px; align-items:center; padding:8px 10px; border:1px solid var(--border); border-radius:8px; background:var(--surface);">
        <strong style="color:var(--text);">${row.label}</strong>
        <div style="height:8px; border-radius:999px; background:rgba(79,142,247,0.15); overflow:hidden;">
          <div style="width:${Math.min(100, row.visits * 8)}%; height:100%; background:linear-gradient(90deg, var(--accent), var(--accent2));"></div>
        </div>
        <span style="color:var(--text-dim); font-size:0.84rem;">👁 ${row.visits}</span>
        <span style="color:var(--text-dim); font-size:0.84rem;">👤 ${row.unique}</span>
      </div>`,
    )
    .join("");
};

function openAdminPanel() {
  const modal = document.getElementById('admin-modal');
  const titleEl = modal && modal.querySelector('h2.modal-title');
  if (titleEl) titleEl.textContent = '⚙️ Yönetici Paneli';
  const visRow = document.getElementById('teacher-practice-visibility-row');
  if (visRow) visRow.style.display = 'none';
  modal.querySelectorAll('.admin-only-tab').forEach(function (btn) {
    btn.style.display = '';
  });
  window.renderAdminUsersList(); // Önce listeyi tazele
  if (typeof window.renderAdminTrafficStats === "function") window.renderAdminTrafficStats();
  if(typeof renderAdminPracticeList === 'function') renderAdminPracticeList();
  modal.style.display = 'flex';
}

/** Kurs → Özel içeriklerim: öğretmen = özel/genel stüdyo; admin = tam yönetici paneli (Alıştırmalar sekmesi) */
window.openTeacherKursStudio = function () {
  if (!currentUser || currentUser.role !== 'teacher') {
    if (typeof showToastMessage === 'function') showToastMessage('Bu stüdyo yalnızca öğretmen hesapları içindir.');
    return;
  }
  const modal = document.getElementById('admin-modal');
  if (!modal) return;
  const titleEl = modal.querySelector('h2.modal-title');
  if (titleEl) titleEl.textContent = '📁 Öğretmen içerik stüdyosu';
  const visRow = document.getElementById('teacher-practice-visibility-row');
  if (visRow) {
    visRow.style.display = 'block';
    visRow.style.visibility = 'visible';
  }
  modal.querySelectorAll('.admin-only-tab').forEach(function (btn) {
    btn.style.display = 'none';
  });
  if (typeof window.renderAdminUsersList === 'function') window.renderAdminUsersList();
  if (typeof renderAdminPracticeList === 'function') renderAdminPracticeList();
  if (typeof populateAdminYdsExams === 'function') populateAdminYdsExams();
  if (typeof populateAdminLessons === 'function') populateAdminLessons();
  modal.style.display = 'flex';
  const pracBtn = Array.from(modal.querySelectorAll('.sub-tab-btn')).find((b) => /Alıştırma/i.test(b.textContent || ''));
  if (pracBtn && typeof switchAdminTab === 'function') switchAdminTab('practices', pracBtn);
};

window.openKursContentStudio = function () {
  if (!currentUser) return;
  if (currentUser.role === 'admin') {
    openAdminPanel();
    const modal = document.getElementById('admin-modal');
    const pracBtn = modal && Array.from(modal.querySelectorAll('.sub-tab-btn')).find((b) => /Alıştırma/i.test(b.textContent || ''));
    if (pracBtn && typeof switchAdminTab === 'function') switchAdminTab('practices', pracBtn);
    return;
  }
  if (currentUser.role === 'teacher' && typeof window.openTeacherKursStudio === 'function') {
    window.openTeacherKursStudio();
  }
};

function closeAdminModal() { document.getElementById('admin-modal').style.display = 'none'; }

// Diğer modal fonksiyonları (triggerWordPopup, openAnnouncementsModal vb.) aynı kalabilir...
function openAnnouncementsModal() {
  const listContainer = document.getElementById('announcement-list');
  if (dbAnnouncements.length === 0) {
      listContainer.innerHTML = '<p style="text-align:center; color:var(--text-dim); margin-top:30px;">Henüz bir duyuru bulunmuyor.</p>';
  } else {
      listContainer.innerHTML = dbAnnouncements.map(a => `
          <div class="announcement-item">
              <div class="announcement-date">${a.date}</div>
              <div style="color:var(--text); line-height:1.5;">${a.text}</div>
          </div>
      `).join('');
  }
  document.getElementById('announcement-modal').style.display = 'flex';
  if (dbAnnouncements.length > 0 && currentUsername) {
      if (!dbUserData[currentUsername]) dbUserData[currentUsername] = {};
      dbUserData[currentUsername].lastReadAnnouncementsTime = dbAnnouncements[0].id;
      syncCloudData(); updateBellIcon();
  }
}

if (!window.__popupPointerBindDone) {
  window.__popupPointerBindDone = true;
  window.__popupPointerDown = false;
  document.addEventListener("mousedown", function () { window.__popupPointerDown = true; });
  document.addEventListener("mouseup", function () { window.__popupPointerDown = false; });
  document.addEventListener("touchstart", function () { window.__popupPointerDown = true; }, { passive: true });
  document.addEventListener("touchend", function () { window.__popupPointerDown = false; }, { passive: true });
}

function triggerWordPopup(event, word, contextSentence) {
  if (window.__popupPointerDown) return;
  const selectedTextNow = String((window.getSelection && window.getSelection().toString()) || "").trim();
  // Kullanıcı metin seçerken tek kelime popup'ı açılmasın; seçim popup'ı ayrıca tetiklenir.
  if (event && selectedTextNow.length >= 2) return;

  // Tıklama bırakıldıktan kısa süre sonra aç (özellikle mobil/drag seçimde daha doğal his verir).
  if (event) {
    const isTouchLikeDevice =
      ("ontouchstart" in window) ||
      (typeof navigator !== "undefined" && (navigator.maxTouchPoints || 0) > 0);
    const openDelayMs = isTouchLikeDevice ? 420 : 260;
    if (window.__popupOpenDelayTimer) clearTimeout(window.__popupOpenDelayTimer);
    window.__popupOpenDelayTimer = setTimeout(function () {
      if (window.__popupPointerDown) return;
      const selectedLate = String((window.getSelection && window.getSelection().toString()) || "").trim();
      if (selectedLate.length >= 2) return;
      triggerWordPopup(null, word, contextSentence);
    }, openDelayMs);
    return;
  }

  const isLoggedIn = !!currentUser && currentUser.status === 'approved';
  activeTokenElement = (event && event.target && event.target.classList && event.target.classList.contains("tok")) ? event.target : null;
  if (activeTokenElement) window.activeSelectionTokenElements = [activeTokenElement];
  activeWordString = word; activeContextSentence = contextSentence;

  try { if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo(); } catch(e) {}

  const popup = document.getElementById('wpop'), titleGr = document.getElementById('wp-gr'), meanInput = document.getElementById('wp-mean-input'), contextBox = document.getElementById('wp-context-box');
  const phoneticBox= document.getElementById('wp-phonetic'), speakBtn = document.getElementById('popup-speak-btn'), deckTools = popup.querySelector('.deck-tools'), actionBtns = popup.querySelector('.action-buttons'), guestMsg = document.getElementById('popup-guest-msg');

  titleGr.textContent = word;
  titleGr.classList.add('wpop-word-highlight');
  const stBox = document.getElementById('wp-sentence-translate');
  if (stBox) { stBox.hidden = true; stBox.innerHTML = ''; }
  const cleanWord = String(word || "").replace(/[.,!?;():"""«»]/g, '').trim();
  if (cleanWord.length > 0) { phoneticBox.innerHTML = '<strong>Okunuşu:</strong> ' + getGreekPhonetics(cleanWord); phoneticBox.style.display = 'block'; } 
  else { phoneticBox.style.display = 'none'; }

  let ctx = String(contextSentence || '').trim();
  if (ctx.length > 80) {
    const idx = ctx.indexOf(word);
    if (idx > -1) { let s = Math.max(0, idx - 35); let e = Math.min(ctx.length, idx + word.length + 40); ctx = (s > 0 ? '... ' : '') + ctx.substring(s, e).trim() + (e < ctx.length ? ' ...' : ''); } 
    else { ctx = ctx.substring(0, 80) + '...'; }
  }
  contextBox.textContent = ctx ? '"' + ctx + '"' : ''; meanInput.value = 'Çeviri aranıyor...';
  if (speakBtn) speakBtn.classList.remove('speaking');

  if (isLoggedIn) {
    try { populateDeckSelects(); } catch(e) {}
    if (deckTools) deckTools.style.display = 'flex'; if (actionBtns) actionBtns.style.display = 'flex'; if (guestMsg) guestMsg.style.display = 'none';
  } else {
    if (deckTools) deckTools.style.display = 'none'; if (actionBtns) actionBtns.style.display = 'none'; if (guestMsg) guestMsg.style.display = 'block';
  }
  popup.style.display = 'block';
  getSmartTranslation(word, contextSentence).then(function(trans) { meanInput.value = trans || '—'; }).catch(function() { meanInput.value = 'Çeviri alınamadı'; });
}

function closePopup() { document.getElementById('wpop').style.display = "none"; stopSpeech(); }

window.bindGlobalTokenSelectionTranslation = function () {
  if (window.__globalTokenSelectionBindingDone) return;
  window.__globalTokenSelectionBindingDone = true;

  let selectionDebounceTimer = null;
  let lastPopupSelection = "";
  const isTouchLikeDevice =
    ("ontouchstart" in window) ||
    (typeof navigator !== "undefined" && (navigator.maxTouchPoints || 0) > 0);

  const inIgnoredContainer = function (node) {
    if (!node) return false;
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return false;
    return !!el.closest('input, textarea, [contenteditable="true"], #admin-modal, #wpop');
  };

  const collectTokenSelection = function () {
    const sel = window.getSelection && window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    if (inIgnoredContainer(sel.anchorNode) || inIgnoredContainer(sel.focusNode)) return null;
    const text = String(sel.toString() || "").trim();
    if (!text || text.length < 2 || text.length > 260) return null;
    if (!/[\u0370-\u03FF\u1F00-\u1FFF]/.test(text)) return null;

    const range = sel.getRangeAt(0);
    const selectedTokens = Array.from(document.querySelectorAll(".tok")).filter((span) => {
      try {
        return range.intersectsNode(span);
      } catch (e) {
        return false;
      }
    });
    if (selectedTokens.length < 2) return null;

    return {
      text: text.replace(/\s+/g, " "),
      tokens: selectedTokens,
    };
  };

  const applySelection = function (openPopup) {
    if (window.__popupPointerDown) return;
    const data = collectTokenSelection();
    if (!data) return;
    window.activeSelectionTokenElements = data.tokens;
    window.lastReaderSelectionMeta = {
      text: data.text,
      tokenCount: data.tokens.length,
      createdAt: Date.now(),
    };
    if (!openPopup) return;
    const sig = `${data.text}|${data.tokens.length}`;
    if (sig === lastPopupSelection) return;
    lastPopupSelection = sig;
    triggerWordPopup(null, data.text, data.text);
  };

  document.addEventListener("selectionchange", function () {
    if (selectionDebounceTimer) clearTimeout(selectionDebounceTimer);
    // Mobilde native seçim menüsünden sonra popup erken açılmasın diye gecikme artırıldı.
    selectionDebounceTimer = setTimeout(function () {
      applySelection(true);
    }, isTouchLikeDevice ? 320 : 190);
  });

  document.addEventListener("mouseup", function () {
    setTimeout(function () {
      applySelection(true);
    }, 20);
  });

  document.addEventListener("touchend", function () {
    setTimeout(function () {
      applySelection(true);
    }, 360);
  }, { passive: true });
};

function toggleHighlightWord() {
  const selectedTokens = Array.isArray(window.activeSelectionTokenElements)
    ? window.activeSelectionTokenElements.filter((el) => el && el.classList && el.classList.contains("tok"))
    : [];
  if (selectedTokens.length > 1) {
    const willHighlight = !selectedTokens.every((el) => el.classList.contains("highlighted"));
    selectedTokens.forEach((el) => {
      if (willHighlight) el.classList.add("highlighted");
      else el.classList.remove("highlighted");
      if (typeof window.syncReadingHighlightToStorageForElement === "function") {
        window.syncReadingHighlightToStorageForElement(el, willHighlight);
      }
    });
    showToastMessage("Seçilen ifade vurgulandı.");
    return;
  }

  const lastSel = window.lastReaderSelectionMeta || {};
  const text = String(activeWordString || lastSel.text || "").trim();
  const isPhrase = /\s+/.test(text);
  if (isPhrase && typeof allWordSpans !== "undefined" && Array.isArray(allWordSpans)) {
    const normalizeWord = (s) => String(s || "").replace(/[.,!?;():"""«»]/g, "").trim();
    const phraseWords = text.split(/\s+/).map(normalizeWord).filter(Boolean);
    if (!phraseWords.length) return;
    const spans = allWordSpans;
    let startIdx = -1;
    let endIdx = -1;
    for (let i = 0; i < spans.length; i++) {
      const part = normalizeWord(spans[i].textContent || "");
      if (!part) continue;
      if (part === phraseWords[0]) {
        let ok = true;
        for (let j = 0; j < phraseWords.length; j++) {
          const s = spans[i + j];
          const t = s ? normalizeWord(s.textContent || "") : "";
          if (!s || t !== phraseWords[j]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          startIdx = i;
          endIdx = i + phraseWords.length - 1;
          break;
        }
      }
    }
    if (startIdx === -1 || endIdx === -1) {
      showToastMessage("Seçilen ifade metinde bulunamadı.");
      return;
    }
    const chunk = spans.slice(startIdx, endIdx + 1);
    const willHighlight = !chunk.every((el) => el.classList.contains("highlighted"));
    chunk.forEach((el) => {
      if (willHighlight) el.classList.add("highlighted");
      else el.classList.remove("highlighted");
      if (typeof window.syncReadingHighlightToStorageForElement === "function") {
        window.syncReadingHighlightToStorageForElement(el, willHighlight);
      }
    });
    showToastMessage("İfade vurgusu güncellendi.");
    return;
  }

  if (!activeTokenElement) return;
  activeTokenElement.classList.toggle('highlighted');
  const on = activeTokenElement.classList.contains('highlighted');
  if (typeof window.syncReadingHighlightToStorage === 'function') {
    window.syncReadingHighlightToStorage(on);
  }
  showToastMessage("Kelime vurgusu değiştirildi.");
}

function closeOsymModal(id) { document.getElementById(id).style.display = 'none'; }
function openStatusModal() {
  const totalQ = examSession.length; const answeredQ = examSession.filter(q => examState[q.id].selected !== null).length; const remainingQ = totalQ - answeredQ;
  const now = new Date(); const elapsedSec = Math.floor((now - examStartTime) / 1000);
  
  document.getElementById('st-total-q').textContent = totalQ; document.getElementById('st-ans-q').textContent = answeredQ; document.getElementById('st-rem-q').textContent = remainingQ; document.getElementById('st-start-time').textContent = examStartTime.toLocaleTimeString('tr-TR');
  const mins = Math.floor(elapsedSec / 60); const secs = elapsedSec % 60;
  document.getElementById('st-elapsed').textContent = `${mins} dk ${secs} sn`;
  document.getElementById('osym-status-modal').style.display = 'flex';
}

function openReviewModal(filter = 'all') {
  document.querySelectorAll('.osym-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + filter).classList.add('active'); let gridHtml = '';
  examSession.forEach((q, i) => {
      let state = examState[q.id]; let isAns = state.selected !== null; let isMarked = state.marked === true; let show = false;
      if(filter === 'all') show = true; if(filter === 'answered' && isAns) show = true; if(filter === 'marked' && isMarked) show = true; if(filter === 'empty' && !isAns) show = true;
      if(show) { let classes = "osym-q-btn"; if(isAns) classes += " answered"; if(isMarked) classes += " marked"; gridHtml += `<button class="${classes}" onclick="jumpToExamQ(${i})">${i+1}</button>`; }
  });
  document.getElementById('osym-review-grid').innerHTML = gridHtml;
  document.getElementById('osym-review-modal').style.display = 'flex';
}

function jumpToExamQ(index) {
  if (!Array.isArray(examSession) || examSession.length === 0) return;
  if (typeof index !== "number" || index < 0 || index >= examSession.length) return;
  if (typeof saveCurrentQuestionState === "function") saveCurrentQuestionState();
  currentQIndex = index;
  if (typeof loadExamQuestion === "function") loadExamQuestion();
  closeOsymModal("osym-review-modal");
  closeOsymModal("osym-status-modal");
  closeOsymModal("osym-settings-modal");
}

function openOsymSettingsModal() {
  if (!Array.isArray(examSession) || examSession.length === 0) return;
  const jumpInput = document.getElementById("osym-jump-input");
  const jumpMax = document.getElementById("osym-jump-max");
  if (jumpInput) {
    jumpInput.min = "1";
    jumpInput.max = String(examSession.length);
    jumpInput.value = String((currentQIndex || 0) + 1);
  }
  if (jumpMax) jumpMax.textContent = String(examSession.length);
  syncOsymSettingsButtons();
  document.getElementById("osym-settings-modal").style.display = "flex";
}

function jumpToExamQFromInput() {
  const jumpInput = document.getElementById("osym-jump-input");
  if (!jumpInput) return;
  const requested = Number(jumpInput.value);
  if (!requested || requested < 1 || requested > examSession.length) return;
  jumpToExamQ(requested - 1);
}

function setOsymFontSize(size) {
  const workspace = document.getElementById("exam-workspace");
  if (!workspace) return;
  workspace.classList.remove("osym-font-small", "osym-font-normal", "osym-font-large");
  workspace.classList.add(`osym-font-${size}`);
  localStorage.setItem("osym_font_size", size);
  syncOsymSettingsButtons();
}

function syncOsymSettingsButtons() {
  const selected = localStorage.getItem("osym_font_size") || "normal";
  document.querySelectorAll(".osym-setting-btn").forEach((btn) => {
    btn.classList.remove("active");
    const isMatch = btn.getAttribute("onclick") === `setOsymFontSize('${selected}')`;
    if (isMatch) btn.classList.add("active");
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const savedSize = localStorage.getItem("osym_font_size") || "normal";
  setOsymFontSize(savedSize);
});

function openExamHistoryModal() {
  if (!currentUser) { showToastMessage("⚠️ Sınav geçmişinizi görmek için giriş yapmalısınız."); return; }
  const history = dbUserData[currentUsername]?.examHistory || []; const listEl = document.getElementById('exam-history-list'); listEl.innerHTML = "";
  if (history.length === 0) {
      listEl.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:30px; color:var(--text-dim);'>Henüz çözülmüş bir sınavınız bulunmuyor.</td></tr>";
      document.getElementById('hist-total-exams').textContent = "0"; document.getElementById('hist-avg-score').textContent = "%0"; document.getElementById('hist-total-q').textContent = "0";
  } else {
      let totalScore = 0; let totalQuestions = 0;
      history.forEach(item => {
          totalScore += item.score; totalQuestions += item.total;
          let scoreColor = item.score >= 70 ? 'var(--success)' : (item.score >= 50 ? 'var(--accent2)' : 'var(--error)');
          listEl.innerHTML += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:15px 12px; font-size:0.9rem; color:var(--text-dim);">${item.date}</td><td style="padding:15px 12px; color:var(--text); font-weight:bold;">${item.examName}</td><td style="padding:15px 12px;"><span style="color:var(--success); font-weight:bold;" title="Doğru">${item.correct}</span> / <span style="color:var(--error); font-weight:bold;" title="Yanlış">${item.wrong}</span> / <span style="color:var(--text-dim);" title="Boş">${item.empty}</span></td><td style="padding:15px 12px; color:var(--accent2);">${item.timeSpent}</td><td style="padding:15px 12px; font-weight:bold; font-size: 1.1rem; color:${scoreColor};">%${item.score}</td></tr>`;
      });
      let avgScore = Math.round(totalScore / history.length);
      document.getElementById('hist-total-exams').textContent = history.length; document.getElementById('hist-avg-score').textContent = "%" + avgScore; document.getElementById('hist-total-q').textContent = totalQuestions;
  }
  document.getElementById('exam-history-modal').style.display = 'flex';
}

function closeExamResult() { document.getElementById('exam-result-view').style.display = 'none'; document.getElementById('exam-library-view').style.display = 'block'; }