function updateSpeedLabel() {
  document.getElementById("tts-speed-label").textContent =
    document.getElementById("tts-speed").value + "x";
}

function clearAllHighlights() {
  allWordSpans.forEach((s) => s.classList.remove("tts-active"));
  const speakBtn = document.getElementById("popup-speak-btn");
  if (speakBtn) speakBtn.classList.remove("speaking");
  if (currentSpeakingToken) {
    currentSpeakingToken.classList.remove("speaking");
    currentSpeakingToken.classList.remove("tts-active");
    currentSpeakingToken = null;
  }
  isSpeakingManually = false;
  if (manualTimer) clearInterval(manualTimer);
}

function startManualHighlighting() {
  if (allWordSpans.length === 0) return;
  currentManualIndex = 0;
  isSpeakingManually = true;
  const speed = parseFloat(document.getElementById("tts-speed").value);
  const getDuration = (text) => (text.length * 90) / speed;
  const highlightNext = () => {
    if (!isSpeakingManually || currentManualIndex >= allWordSpans.length) {
      clearAllHighlights();
      return;
    }
    allWordSpans.forEach((s) => s.classList.remove("tts-active"));
    const currentSpan = allWordSpans[currentManualIndex];
    currentSpan.classList.add("tts-active");
    currentSpan.scrollIntoView({ behavior: "smooth", block: "center" });
    manualTimer = setTimeout(
      highlightNext,
      getDuration(currentSpan.textContent),
    );
    currentManualIndex++;
  };
  highlightNext();
}

function speakCurrentWord() {
  if (activeWordString) speakGreek(activeWordString);
}

/* ==========================================
 * 🔊 GOOGLE CLOUD NEURAL TEXT-TO-SPEECH MOTORU
 * ========================================== */

// Kopyaladığın API Anahtarını buraya yapıştır
const GOOGLE_TTS_API_KEY = "AIzaSyBOzmlPWjpHOm61cb00_kL5NrDL3FFFN94";

let currentAudioObj = null;
let audioQueue = [];
let isAudioPlaying = false;
let isAudioPaused = false;

// Başlangıç Ayarları
function initTTS() {
    const statusText = document.getElementById('tts-status-text');
    if(statusText) statusText.textContent = "Hazır (Neural TTS)";
    console.log("Google Cloud Neural TTS Başlatıldı.");
}

// Hız ayarını arayüzden (slider) al
function getTTSPlaybackRate() {
    const speedInput = document.getElementById('tts-speed');
    return speedInput ? parseFloat(speedInput.value) : 1.0;
}

// Google Cloud API'sine istek atan ana fonksiyon
async function fetchGoogleTTSAudio(text) {
    if (!text || text.trim() === "") return null;
    
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`;
    
    const requestBody = {
        input: { text: text },
        voice: { 
            languageCode: "el-GR", 
            name: "el-GR-Wavenet-A" // Bunu Wavenet olarak değiştiriyoruz
        },
        audioConfig: { 
            audioEncoding: "MP3"
        }
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            console.error("Google TTS API Hatası:", response.statusText);
            return null;
        }

        const data = await response.json();
        // Gelen şifrelenmiş (Base64) sesi oynatılabilir formata çevir
        const audioSrc = "data:audio/mp3;base64," + data.audioContent;
        return new Audio(audioSrc);
        
    } catch (error) {
        console.error("Google TTS Fetch Hatası:", error);
        return null;
    }
}

// 1. Tıklanan Tek Kelimeyi veya Cümleyi Okuma (Sözlük & Öğretici Test)
async function speakGreek(text, btnElement = null) {
    if (!text) return;
    
    stopSpeech(); // Varsa önce çalan sesi durdur

    const statusText = document.getElementById('tts-status-text');
    if(statusText) statusText.textContent = "Ses alınıyor...";

    const audioObj = await fetchGoogleTTSAudio(text);
    
    if (audioObj) {
        currentAudioObj = audioObj;
        currentAudioObj.playbackRate = getTTSPlaybackRate();
        
        if (statusText) statusText.textContent = "Okunuyor...";
        document.querySelector('.tts-pulse')?.style.setProperty('display', 'block');

        // Butona tıklandıysa efekt ver
        if(btnElement) btnElement.style.opacity = "0.5";

        currentAudioObj.onended = () => {
            if (statusText) statusText.textContent = "Hazır";
            document.querySelector('.tts-pulse')?.style.setProperty('display', 'none');
            if(btnElement) btnElement.style.opacity = "1";
            currentAudioObj = null;
        };

        currentAudioObj.play();
    } else {
        showToastMessage("Seslendirilemedi (API Hatası)");
        if (statusText) statusText.textContent = "Hata";
    }
}

// 2. Okuma Panelindeki Tüm Metni Oku (Cümle Cümle)
async function speakAllText() {
    if (!globalTextForTTS || globalTextForTTS.trim() === "") {
        showToastMessage("Okunacak metin yok.");
        return;
    }

    stopSpeech();
    
    // Metni noktalama işaretlerinden bölerek sıraya al (Google tek seferde aşırı uzun metni reddedebilir)
    const sentences = globalTextForTTS.match(/[^.!?;\n]+[.!?;\n]+/g) || [globalTextForTTS];
    
    audioQueue = sentences.filter(s => s.trim().length > 0);
    if(audioQueue.length === 0) return;

    isAudioPlaying = true;
    isAudioPaused = false;
    playNextInQueue();
}

// Sıradaki cümleyi çal
async function playNextInQueue() {
    if (!isAudioPlaying || audioQueue.length === 0) {
        stopSpeech();
        return;
    }

    const currentSentence = audioQueue.shift(); 
    const statusText = document.getElementById('tts-status-text');
    if(statusText) statusText.textContent = "Yükleniyor...";

    currentAudioObj = await fetchGoogleTTSAudio(currentSentence);

    if (currentAudioObj) {
        currentAudioObj.playbackRate = getTTSPlaybackRate();
        
        if(statusText) statusText.textContent = "Okunuyor...";
        document.querySelector('.tts-pulse')?.style.setProperty('display', 'block');

        currentAudioObj.onended = () => {
            playNextInQueue(); // Cümle bitince döngüye devam et
        };

        currentAudioObj.play();
    } else {
        playNextInQueue(); // Hata olursa atla ve sonrakine geç
    }
}

// 3. Duraklat / Devam Et Butonu
function togglePauseSpeech() {
    if (currentAudioObj) {
        const statusText = document.getElementById('tts-status-text');
        if (!isAudioPaused) {
            currentAudioObj.pause();
            isAudioPaused = true;
            if(statusText) statusText.textContent = "Duraklatıldı";
            document.querySelector('.tts-pulse')?.style.setProperty('display', 'none');
        } else {
            currentAudioObj.play();
            isAudioPaused = false;
            if(statusText) statusText.textContent = "Okunuyor...";
            document.querySelector('.tts-pulse')?.style.setProperty('display', 'block');
        }
    }
}

// 4. Tamamen Durdur Butonu
function stopSpeech() {
    if (currentAudioObj) {
        currentAudioObj.pause();
        currentAudioObj.currentTime = 0;
        currentAudioObj = null;
    }
    audioQueue = [];
    isAudioPlaying = false;
    isAudioPaused = false;
    
    const statusText = document.getElementById('tts-status-text');
    if(statusText) statusText.textContent = "Hazır";
    document.querySelector('.tts-pulse')?.style.setProperty('display', 'none');
    
    // Varsa vurgulanan (sarı olan) kelimeleri temizle
    document.querySelectorAll('.tok.speaking').forEach(el => el.classList.remove('speaking'));
}

// 5. Arayüzdeki Hız Çubuğu (Slider) Güncellemesi
function updateSpeedLabel() {
    const val = document.getElementById('tts-speed').value;
    const label = document.getElementById('tts-speed-label');
    if(label) label.textContent = val + "x";
    
    // O an çalan bir ses varsa hızını anında değiştir
    if (currentAudioObj) {
        currentAudioObj.playbackRate = parseFloat(val);
    }
}

// Kelimenin üstüne tıklayınca da popup ile birlikte sesi çaldıran tetikleyici
function speakCurrentWord() {
    const grWord = document.getElementById('wp-gr').textContent;
    const speakBtn = document.getElementById('popup-speak-btn');
    if(grWord) speakGreek(grWord, speakBtn);
}