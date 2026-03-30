function initTTS() {
  if (!('speechSynthesis' in window)) return; ttsSupported = true;
  function loadVoices() { ttsVoice = speechSynthesis.getVoices().find(v => v.lang.startsWith('el')) || null; }
  loadVoices(); if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = loadVoices;
}

function updateSpeedLabel() { document.getElementById('tts-speed-label').textContent = document.getElementById('tts-speed').value + 'x'; }

function clearAllHighlights() {
  allWordSpans.forEach(s => s.classList.remove('tts-active'));
  const speakBtn = document.getElementById('popup-speak-btn'); if (speakBtn) speakBtn.classList.remove('speaking');
  if (currentSpeakingToken) { currentSpeakingToken.classList.remove('speaking'); currentSpeakingToken.classList.remove('tts-active'); currentSpeakingToken = null; }
  isSpeakingManually = false; if(manualTimer) clearInterval(manualTimer);
}

function startManualHighlighting() {
  if(allWordSpans.length === 0) return;
  currentManualIndex = 0; isSpeakingManually = true;
  const speed = parseFloat(document.getElementById('tts-speed').value); const getDuration = (text) => (text.length * 90) / speed; 
  const highlightNext = () => {
    if (!isSpeakingManually || currentManualIndex >= allWordSpans.length) { clearAllHighlights(); return; }
    allWordSpans.forEach(s => s.classList.remove('tts-active'));
    const currentSpan = allWordSpans[currentManualIndex]; currentSpan.classList.add('tts-active'); currentSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    manualTimer = setTimeout(highlightNext, getDuration(currentSpan.textContent)); currentManualIndex++;
  };
  highlightNext();
}

function speakGreek(text, sourceElement = null) {
  if (!ttsSupported) return; speechSynthesis.cancel(); clearAllHighlights();
  const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'el-GR'; utterance.rate = parseFloat(document.getElementById('tts-speed').value);
  if (ttsVoice) utterance.voice = ttsVoice;
  utterance.onstart = () => {
    document.getElementById('tts-status').classList.add('visible');
    const speakBtn = document.getElementById('popup-speak-btn'); if (speakBtn) speakBtn.classList.add('speaking');
    if (sourceElement) {
      if (sourceElement.classList.contains('quiz-speak-btn')) sourceElement.classList.add('speaking');
      else sourceElement.classList.add('tts-active');
      currentSpeakingToken = sourceElement;
    }
  };
  utterance.onend = () => { document.getElementById('tts-status').classList.remove('visible'); clearAllHighlights(); };
  utterance.onerror = () => { document.getElementById('tts-status').classList.remove('visible'); clearAllHighlights(); };
  speechSynthesis.speak(utterance);
}

function speakAllText() {
  if (!ttsSupported) { showToastMessage("⚠️ Tarayıcınız ses okumayı desteklemiyor."); return; }
  if (isPaused) { speechSynthesis.resume(); isPaused = false; document.getElementById('tts-status').classList.add('visible'); document.getElementById('tts-status-text').textContent = "Seslendiriliyor..."; return; }
  speechSynthesis.cancel(); clearAllHighlights(); if (!globalTextForTTS.trim()) return;

  const utterance = new SpeechSynthesisUtterance(globalTextForTTS);
  utterance.lang = 'el-GR'; utterance.rate = parseFloat(document.getElementById('tts-speed').value);
  if (ttsVoice) utterance.voice = ttsVoice;
  utterance.onstart = () => { document.getElementById('tts-status').classList.add('visible'); document.getElementById('tts-status-text').textContent = "Tüm metin okunuyor..."; isPaused = false; startManualHighlighting(); };
  utterance.onboundary = (event) => {
    if (event.name === 'word') {
      if(manualTimer) clearTimeout(manualTimer); clearAllHighlights(); let activeSpan = null;
      for (let i = allWordSpans.length - 1; i >= 0; i--) { if (event.charIndex >= parseInt(allWordSpans[i].getAttribute('data-start'))) { activeSpan = allWordSpans[i]; break; } }
      if (activeSpan) { activeSpan.classList.add('tts-active'); currentSpeakingToken = activeSpan; const rect = activeSpan.getBoundingClientRect(); if (rect.top < 100 || rect.bottom > window.innerHeight - 100) activeSpan.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
  };
  utterance.onend = () => { document.getElementById('tts-status').classList.remove('visible'); clearAllHighlights(); isPaused = false; };
  utterance.onerror = () => { document.getElementById('tts-status').classList.remove('visible'); clearAllHighlights(); isPaused = false; };
  speechSynthesis.speak(utterance);
}

function togglePauseSpeech() {
  if (speechSynthesis.speaking) {
    if (speechSynthesis.paused) { speechSynthesis.resume(); isPaused = false; document.getElementById('tts-status-text').textContent = "Seslendiriliyor..."; } 
    else { speechSynthesis.pause(); isPaused = true; document.getElementById('tts-status-text').textContent = "Duraklatıldı..."; }
  }
}
function stopSpeech() { if (ttsSupported) { speechSynthesis.cancel(); isPaused = false; document.getElementById('tts-status').classList.remove('visible'); clearAllHighlights(); } }
function speakCurrentWord() { if (activeWordString) speakGreek(activeWordString); }