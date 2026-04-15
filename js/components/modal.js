function showAuthModal(login = true) {
  isLoginMode = login;
  document.getElementById('auth-title').textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
  document.getElementById('auth-submit-btn').textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
  document.getElementById('auth-switch-text').innerHTML = isLoginMode ? 'Hesabın yok mu? <b>Kayıt Ol</b>' : 'Zaten hesabın var mı? <b>Giriş Yap</b>';
  document.getElementById('auth-modal').style.display = 'flex';
}

function closeAuthModal() { document.getElementById('auth-modal').style.display = 'none'; }
function toggleAuthMode() { showAuthModal(!isLoginMode); }

function openAdminPanel() {
  const tbody = document.getElementById('admin-user-list');
  tbody.innerHTML = "";
  for(let username in dbUsers) {
    if(username === 'nurhat') continue; // Ana admin silinemez
    let user = dbUsers[username];
    
    let statusOpt = `<select class="action-select" onchange="updateUserAdmin('${username}', 'status', this.value)">
                        <option value="pending" ${user.status==='pending'?'selected':''}>Beklemede</option>
                        <option value="approved" ${user.status==='approved'?'selected':''}>Onaylı</option>
                     </select>`;
    
    let premiumOpt = `<select class="action-select" onchange="updateUserAdmin('${username}', 'isPremium', this.value)">
                        <option value="false" ${!user.isPremium?'selected':''}>Normal</option>
                        <option value="true" ${user.isPremium?'selected':''}>Premium</option>
                      </select>`;

    let roleOpt = `<select class="action-select" onchange="updateUserAdmin('${username}', 'role', this.value)" title="Rol">
                     <option value="user"    ${(!user.role || user.role==='user')   ?'selected':''}>👤 Üye</option>
                     <option value="teacher" ${user.role==='teacher'               ?'selected':''}>🎓 Öğretmen</option>
                     <option value="admin"   ${user.role==='admin'                 ?'selected':''}>⚙️ Admin</option>
                   </select>`;
    
    // YENİ: Sil butonu tasarımı
    let deleteBtn = `<button class="secondary-btn" onclick="deleteUserAdmin('${username}')" 
                        style="padding:5px 10px; font-size:0.8rem; border-color:var(--error); color:var(--error); background:transparent;">
                        🗑️ Sil
                     </button>`;
    
    tbody.innerHTML += `<tr>
        <td><b>${username}</b></td>
        <td>${statusOpt}</td>
        <td>${user.isPremium ? 'Sınırsız' : user.credits}</td>
        <td style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">${roleOpt} ${premiumOpt} ${deleteBtn}</td>
    </tr>`;
  }
  
  if(typeof renderAdminPracticeList === 'function') renderAdminPracticeList();
  document.getElementById('admin-modal').style.display = 'flex';
}

function closeAdminModal() { document.getElementById('admin-modal').style.display = 'none'; }

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

function triggerWordPopup(event, word, contextSentence) {
  const isLoggedIn = !!currentUser && currentUser.status === 'approved';
  activeTokenElement = event ? event.target : null; activeWordString = word; activeContextSentence = contextSentence;

  try { if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo(); } catch(e) {}

  const popup = document.getElementById('wpop'), titleGr = document.getElementById('wp-gr'), meanInput = document.getElementById('wp-mean-input'), contextBox = document.getElementById('wp-context-box');
  const phoneticBox= document.getElementById('wp-phonetic'), speakBtn = document.getElementById('popup-speak-btn'), deckTools = popup.querySelector('.deck-tools'), actionBtns = popup.querySelector('.action-buttons'), guestMsg = document.getElementById('popup-guest-msg');

  titleGr.textContent = word;
  const cleanWord = word.replace(/[.,!?;():"""«»]/g, '').trim();
  if (cleanWord.length > 0) { phoneticBox.innerHTML = '<strong>Okunuşu:</strong> ' + getGreekPhonetics(cleanWord); phoneticBox.style.display = 'block'; } 
  else { phoneticBox.style.display = 'none'; }

  let ctx = (contextSentence || '').trim();
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
function toggleHighlightWord() { if (activeTokenElement) { activeTokenElement.classList.toggle('highlighted'); showToastMessage("Kelime vurgusu değiştirildi."); } }

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
