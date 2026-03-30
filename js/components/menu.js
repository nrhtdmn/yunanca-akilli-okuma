function switchMainTab(tabName) {
  document.getElementById('section-read').style.display = tabName === 'read' ? 'block' : 'none';
  document.getElementById('section-quiz').style.display = tabName === 'quiz' ? 'block' : 'none';
  document.getElementById('section-video').style.display = tabName === 'video' ? 'block' : 'none';
  document.getElementById('section-media').style.display = tabName === 'media' ? 'block' : 'none';
  document.getElementById('section-dict').style.display = tabName === 'dict' ? 'block' : 'none';
  document.getElementById('section-exam').style.display = tabName === 'exam' ? 'block' : 'none';
  
  document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('mtab-'+tabName).classList.add('active');
  
  if(tabName === 'quiz') populateDeckSelects();
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