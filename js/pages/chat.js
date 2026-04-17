// --- API ANAHTARINI HAFIZADAN YÜKLE ---
document.addEventListener("DOMContentLoaded", () => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) {
        document.getElementById('ai-api-key').value = savedKey;
    }
});

let recognition;
let isRecording = false;
let chatHistory = [];

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// --- 1. SES TANIMA (SPEECH-TO-TEXT) KURULUMU ---
function initSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!window.SpeechRecognition) {
        alert("Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen Chrome kullanın.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'el-GR'; // Yunanca dinle
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
        isRecording = true;
        document.getElementById('mic-btn').style.background = "var(--success)";
        document.getElementById('mic-btn').classList.add('pulse-animation');
        document.getElementById('chat-text-input').placeholder = "Dinliyorum...";
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('chat-text-input').value = transcript;
        sendChatMessage(); 
    };

    recognition.onerror = function(event) {
        console.error("Ses tanıma hatası: ", event.error);
        stopMicrophone();
    };

    recognition.onend = function() {
        stopMicrophone();
    };
}

function toggleMicrophone() {
    if (!recognition) initSpeechRecognition();
    
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function stopMicrophone() {
    isRecording = false;
    document.getElementById('mic-btn').style.background = "var(--error)";
    document.getElementById('mic-btn').classList.remove('pulse-animation');
    document.getElementById('chat-text-input').placeholder = "Veya mesajınızı Yunanca olarak buraya yazın...";
}

// --- 2. SOHBET VE YAPAY ZEKA MANTIĞI ---
function startAIChat() {
    const apiKey = document.getElementById('ai-api-key').value.trim();
    if (!apiKey) {
        alert("Lütfen bir API anahtarı girin!");
        return;
    }
    
    localStorage.setItem("gemini_api_key", apiKey);
    
    const hint = document.getElementById('chat-empty-hint');
    if (hint) hint.remove();
    document.getElementById('chat-messages-container').innerHTML = "";
    chatHistory = [];
    const inp = document.getElementById('chat-text-input');
    if (inp) {
        inp.disabled = false;
        inp.readOnly = false;
        inp.removeAttribute('disabled');
    }
    
    // Açılış mesajı
    appendMessage("AI", `
        <span style="font-size: 1.1rem;">Γεια σου! Είμαι ο φίλος σου για εξάσκηση στα ελληνικά. Τι θέλεις να συζητήσουμε σήμερα;</span>
        <span style="color: var(--text-dim); font-size: 0.9rem; margin-top: 8px; display: block; border-top: 1px solid var(--border); padding-top: 5px;">🇹🇷 Merhaba! Ben senin Yunanca pratik arkadaşınım. Bugün ne konuşmak istersin?</span>
    `);
}

async function sendChatMessage() {
    const inputField = document.getElementById('chat-text-input');
    const apiKey = document.getElementById('ai-api-key').value.trim();
    const userMessage = inputField.value.trim();

    if (!userMessage) return;
    if (!apiKey) {
        alert("Sohbet edebilmek için önce API Key girmelisiniz!");
        return;
    }

    // Kullanıcı mesajını ekle ve ID'sini al (Çeviri gelince altına eklemek için)
    const userMsgId = appendMessage("User", userMessage);
    inputField.value = "";

    const typingId = appendMessage("AI", "...");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // YAPAY ZEKA'NIN BEYNİNE GİZLİ TALİMAT (Kafası asla karışmayacak)
                system_instruction: {
                    parts: [{ 
                        text: `Sen gelişmiş bir Yunanca dil pratik asistanısın. 
Görevlerin:
1. Kullanıcı sana bir rol verirse (örneğin manav, garson, doktor), hemen o role bürün ve sohbete o karakterle devam et. Rol verilmezse normal bir Yunan arkadaş ol.
2. A2-B1 seviyesinde, doğal günlük Yunanca ile cevap ver.
3. Kullanıcının mesajında gramer ή kelime hatası varsa Türkçe olarak "hint" (ipucu) kısmında düzelt.
4. YALNIZCA geçerli bir JSON objesi döndür, markdown veya fazladan metin ASLA ekleme.

Lütfen sadece şu JSON formatında yanıt ver:
{
  "user_turkish": "Kullanıcının mesajının tam Türkçe çevirisi (kullanıcı zaten Türkçe yazdıysa aynen bırak)",
  "hint": "Gramer/kelime hatası varsa Türkçe düzeltme ipucu (Örn: 💡 İpucu: ...), hata yoksa boş bırak",
  "ai_greek": "Kullanıcıya vereceğin Yunanca cevap (Role uygun olarak)",
  "ai_turkish": "Yunanca cevabının Türkçe çevirisi"
}` 
                    }]
                },
                // KULLANICININ MESAJI
                contents: [{
                    role: "user",
                    parts: [{ text: userMessage }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("API Hatası:", data);
            document.getElementById(typingId).remove();
            appendMessage("AI", `❌ API Hatası: ${data.error?.message || 'Bilinmeyen hata'}`);
            return;
        }

        // Gemini'den gelen metni temizle ve JSON'a çevir
        let rawText = data.candidates[0].content.parts[0].text;
        let cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        let parsedData;
        
        try {
            parsedData = JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Hatası:", e, cleanText);
            document.getElementById(typingId).remove();
            appendMessage("AI", "❌ Sistem yanıtı işleyemedi, lütfen tekrar deneyin.");
            return;
        }

        document.getElementById(typingId).remove();

        // 1. Senin mesajının altına Türkçe çevirisini ekle
        if (parsedData.user_turkish) {
            const userMsgDiv = document.getElementById(userMsgId);
            userMsgDiv.innerHTML += `<span style="color: rgba(255,255,255,0.8); font-size: 0.85rem; margin-top: 5px; display: block; border-top: 1px dashed rgba(255,255,255,0.3); padding-top: 5px;">🇹🇷 ${parsedData.user_turkish}</span>`;
        }

        // 2. Yorgo'nun (AI) mesajını ve Türkçesini ekrana bas
        let finalAiMessage = "";
        
        if (parsedData.hint && parsedData.hint.trim() !== "") {
            finalAiMessage += `<span style="color: var(--accent2); font-size: 0.9rem; display: block; margin-bottom: 8px; border-bottom: 1px dashed var(--border); padding-bottom: 5px;">${parsedData.hint}</span>`;
        }
        
        finalAiMessage += `<span style="font-size: 1.1rem;">${parsedData.ai_greek}</span>`;
        
        if (parsedData.ai_turkish) {
            finalAiMessage += `<span style="color: var(--text-dim); font-size: 0.9rem; margin-top: 8px; display: block; border-top: 1px solid var(--border); padding-top: 5px;">🇹🇷 ${parsedData.ai_turkish}</span>`;
        }

        appendMessage("AI", finalAiMessage);
        
        // 3. SADECE YUNANCA KISMI SESLENDİR!
        speakText(parsedData.ai_greek);

    } catch (error) {
        console.error("İnternet/Bağlantı Hatası:", error);
        document.getElementById(typingId).remove();
        appendMessage("AI", "❌ Sistemsel bir bağlantı hatası oluştu.");
    }
}

// --- 3. ARAYÜZ (UI) VE SESLENDİRME ---
function appendMessage(sender, text) {
    const container = document.getElementById('chat-messages-container');
    const msgDiv = document.createElement('div');
    const isAI = sender === "AI";
    const uniqueId = "msg-" + Date.now();
    msgDiv.id = uniqueId;
    
    msgDiv.style.maxWidth = "80%";
    msgDiv.style.padding = "12px 16px";
    msgDiv.style.borderRadius = "12px";
    msgDiv.style.marginBottom = "10px";
    msgDiv.style.lineHeight = "1.5";
    msgDiv.style.fontSize = "1.05rem";
    msgDiv.style.whiteSpace = "normal";
    
    if (isAI) {
        msgDiv.style.alignSelf = "flex-start";
        msgDiv.style.background = "var(--surface)";
        msgDiv.style.border = "1px solid var(--accent2)";
        msgDiv.style.color = "var(--text)";
        msgDiv.innerHTML = `🤖 <b>Yorgo:</b><br> ${text}`;
    } else {
        const safeText = escapeHtml(text).replace(/\r?\n/g, "<br>");
        msgDiv.style.alignSelf = "flex-end";
        msgDiv.style.background = "var(--accent)";
        msgDiv.style.color = "#fff";
        msgDiv.innerHTML = `🧑 <b>Sen:</b><br> ${safeText}`;
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight; 
    return uniqueId;
}

async function speakText(text) {
    if (!text) return;

    try {
        // Senin uygulamanın kurulu olan kaliteli Google Cloud TTS altyapısını çağırıyoruz
        const audioUrl = await generateGoogleTTS(text, "el-GR"); 
        
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play();
        } else {
            fallbackSpeak(text);
        }
    } catch (error) {
        fallbackSpeak(text);
    }
}

function fallbackSpeak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'el-GR'; // Yunanca seslendir
    
    const voices = window.speechSynthesis.getVoices();
    const greekVoice = voices.find(voice => voice.lang.startsWith('el'));
    if (greekVoice) utterance.voice = greekVoice;

    utterance.rate = 0.9; 
    window.speechSynthesis.speak(utterance);
}