function switchMainTab(tabName) {
  document.getElementById('section-read').style.display = tabName === 'read' ? 'block' : 'none';
  document.getElementById('section-quiz').style.display = tabName === 'quiz' ? 'block' : 'none';
  document.getElementById('section-video').style.display = tabName === 'video' ? 'block' : 'none';
  document.getElementById('section-media').style.display = tabName === 'media' ? 'block' : 'none';
  document.getElementById('section-dict').style.display = tabName === 'dict' ? 'block' : 'none';
  document.getElementById('section-exam').style.display = tabName === 'exam' ? 'block' : 'none';
  document.getElementById('section-practice').style.display = tabName === 'practice' ? 'block' : 'none'; // YENİ
  document.getElementById('section-chat').style.display = tabName === 'chat' ? 'block' : 'none'; // YENİ

  
  document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('mtab-'+tabName);
  if(activeBtn) activeBtn.classList.add('active');
  
  if(tabName === 'quiz') populateDeckSelects();
  if(tabName === 'practice') renderPracticeLibrary(); // YENİ
}


function switchInputTab(tabName, btnElement) {
  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
  document.querySelectorAll('.input-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tabName).classList.add('active');
}

function switchDictMode(mode, btnElement) {
  const tabs = document.getElementById('section-dict').querySelectorAll('.sub-tab-btn');
  tabs.forEach(btn => btn.classList.remove('active')); 
  btnElement.classList.add('active'); currentDictMode = mode;
  const searchInput = document.getElementById('dict-search-input').value.trim();
  if(searchInput.length > 0) searchDictionary();
}

function toggleAccordion(safeId) {
  const content = document.getElementById('content-' + safeId); 
  const arrow = document.getElementById('arrow-' + safeId);
  if (content) { content.classList.toggle('open'); arrow.classList.toggle('open'); }
}

/* === YÖNETİCİ PANELİ SEKME GEÇİŞİ === */
function switchAdminTab(tabName, btnElement) {
  // Önce tüm sekme butonlarının 'active' sınıfını kaldır
  const buttons = document.getElementById('admin-modal').querySelectorAll('.sub-tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // Tıklanan butonu 'active' yap (rengini değiştir)
  btnElement.classList.add('active');
  
  // Tüm panelleri gizle
  const panels = document.getElementById('admin-modal').querySelectorAll('.admin-panel');
  panels.forEach(panel => panel.style.display = 'none');
  
  // Sadece seçilen paneli göster
  document.getElementById('admin-panel-' + tabName).style.display = 'block';
}

