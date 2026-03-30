// --- KÜRESEL (GLOBAL) DEĞİŞKENLER ---
let dbUsers = JSON.parse(localStorage.getItem('y_users_db')) || {};
dbUsers['nurhat'] = { password: 'Deniz28', role: 'admin', status: 'approved', isPremium: true, credits: 999999 };

let dbUserData = JSON.parse(localStorage.getItem('y_userdata_db')) || {};
let dbAnnouncements = JSON.parse(localStorage.getItem('y_announcements_db')) || [];

let useFirebase = false;
let db = null;
let currentUser = null;
let currentUsername = localStorage.getItem('y_currentUser') || null;

let userDecks = { "Genel Kelimeler": [] };
let userCustomDict = new Map();
let lastActiveDeck = "Genel Kelimeler";
let isLoginMode = true;

// TTS / Medya Oynatıcı Değişkenleri
let ttsSupported = false, ttsVoice = null, isPaused = false, globalTextForTTS = "", allWordSpans = []; 
let currentSpeakingToken = null, isSpeakingManually = false, currentManualIndex = 0, manualTimer = null;
let ytPlayer = null, ytSubtitles = [], videoSyncInterval = null, currentActiveSubIndex = -1, hlsInstance = null;

// Sözlük ve Test Değişkenleri
let activeWordString = "", activeContextSentence = "", activeTokenElement = null;
let currentQuizPool = [], currentQuizIndex = 0, currentQuizQuestion = null, quizMistakes = [], correctCount = 0, totalInitialWords = 0, isQuestionActive = false;
let currentDictMode = 'gr-tr';

// Sınav (e-YDS) Değişkenleri
let GLOBAL_SORU_BANKASI = [], examSession = [], currentQIndex = 0, examState = {}, examTimerInterval = null, examToolMode = 'dict', clockInterval = null, examStartTime = null;

// --- KATALOGLAR VE VERİLER ---
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2","YDS"];
let currentTextCategory = "Tümü";
let currentVideoCategory = "Tümü";

const METIN_KATALOGU = [
  { id: "hikaye-1", title: "n", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-2", title: "Ένα Απρόσμενο Ταξίδι στη Στάση Του Λεωφορείου", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-3", title: "Η Άσκηση στη Βροχή", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-4", title: "Η Δύσκολη Μέρα της Εύας", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-5", title: "Η Έκπληξη για τα Γενέθλια του Νίκου", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-6", title: "Η έκπληξη για τη μαμά", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-7", title: "Η Μέρα με τα Παπούτσια", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-8", title: "Η Μέρα με το Απίθανο Ρομπότ", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-9", title: "Η Μέρα που Ο Πέτρος Έμαθε για το Καλοκαίρι και την Υγεία", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-10", title: "Η Μέρα στο Δάσος με τη Λίνα", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-11", title: "Η μέρα στο ποτάμι", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-12", title: "Η μέρα της άσκησης", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-13", title: "Η Μέρα της Σιωπής στο Λιβάδι", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-14", title: "Η Μικρή Αποτυχία στην Τάξη", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-15", title: "Η μικρή λίμνη και τα χρώματα", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-16", title: "Η Μικρή Περιπέτεια της Μαρίας στο Δάσος", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-17", title: "Η Μικρή Περιπέτεια του Θανάση με τον Πυρετό", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-18", title: "Η Νέα Τάξη του Θανάση", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-19", title: "Η Σιωπή στο Σπίτι", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-20", title: "Η Ώρα της Σιωπής Στο Σπίτι", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-21", title: "Μια Ησυχη Αγορά", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-22", title: "Μια Παράξενη Μέρα στο Νοσοκομείο", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-23", title: "Το Αστείο Ρομπότ του Νίκου", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-24", title: "Το Καλάθι της Λίας στο Σούπερ Μάρκετ", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-25", title: "Το Κινητό και το Μεγάλο Μήνυμα", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-26", title: "Το Λάθος Μήνυμα", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-27", title: "Το Μικρό Φεστιβάλ στην Πόλη", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-28", title: "Το Μυστήριο στο Λιμάνι", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-29", title: "Το Παράξενο Καλάθι της Ελένης", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-30", title: "Το Παράξενο Πρωινό", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-31", title: "Το Περίεργο Ποδόσφαιρο του Νίκου", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-32", title: "Το πρώτο μου ρομπότ", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-33", title: "Το Πρώτο Ταξίδι της Έλενας", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-34", title: "Το Σφάλμα στο Τρένο", level: "A1", category: "📖 Hikaye" }
];

const VIDEO_KATALOGU = [
  { id: "42X-sVfNclI", title: "Easy Greek - Yunanistan'da Günlük Hayat", level: "A2 - B1", category: "🎬 Sokak Röportajı" },
  { id: "M7lc1UVf-VE", title: "Örnek Eğitim Videosu", level: "A1", category: "📚 Temel Eğitim" }
];

const HUGE_RAW_DICTIONARY = [
  ["ανθρώπων", "insanların"], ["αβαείο", "manastır"], ["αβαείου", "manastırın"], ["αβαία", "manastırlar"],
  ["αβαίων", "manastırların"], ["άβαχας", "abaküs"], ["άβαχα", "abaküsü"], ["άβαχες", "abaküsler"],
  ["άβαχών", "abaküslerin"], ['φιλος', 'arkadaş'], ['φιλο', 'arkadaşı'], ['φιλου', 'arkadaşın'],
  ['φιλε', 'arkadaş!'], ['φιλοι', 'arkadaşlar'], ['φιλους', 'arkadaşları'], ['φιλων', 'arkadaşların']
];
const MASTER_DICT_MAP = new Map(HUGE_RAW_DICTIONARY);

const GREEK_TV_CHANNELS = [
  { name: "Alpha TV", url: "https://alphatvlive2.siliconweb.com/alphatvlive/live_abr/playlist.m3u8" },
  { name: "SKAİ TV", url: "https://skai-live.siliconweb.com/media/cambria4/index.m3u8" },
  { name: "Action24", url: "https://actionlive.siliconweb.com/actionabr/actiontv/actionlive/actiontv_720p/chunks.m3u8" },
  { name: "BOYAH TV", url: "https://diavlos-cache.cnt.grnet.gr/parltv/webtv-1b.sdp/chunklist.m3u8" },
  { name: "Blue Sky TV", url: "https://cdn5.smart-tv-data.com/bluesky/bluesky-live/playlist.m3u8" },
  { name: "Star Int TV", url: "https://livestar.siliconweb.com/starvod/star_int/star_int.m3u8" },
  { name: "TV 100", url: "https://gwebstream.net/hls/stream_0.m3u8" },
  { name: "KRHTH TV", url: "https://cretetvlive.siliconweb.com/cretetv/liveabr/cretetv/live_source/chunks.m3u8" },
  { name: "One TV", url: "https://onechannel.siliconweb.com/one/live_abr/one/stream_720p/chunks_dvr.m3u8" },
  { name: "Epirus 1 TV", url: "https://rtmp.win:3929/live/epiruslive.m3u8" },
  { name: "Creta TV", url: "https://live.streams.ovh/tvcreta/tvcreta/chunklist_w894751242.m3u8" },
  { name: "TRT TV", url: "https://av.hellasnet.tv/rst/trt/index.m3u8" }
];

const GREEK_NEWSPAPERS = [
  { name: "Kathimerini (Καθημερινή)", desc: "Saygın günlük gazete", url: "https://www.kathimerini.gr/" },
  { name: "To Vima (Το Βήμα)", desc: "Köklü haber ve analiz", url: "https://www.tovima.gr/" },
  { name: "Ta Nea (Τα Νέα)", desc: "Popüler günlük gazete", url: "https://www.tanea.gr/" },
  { name: "Proto Thema (Πρώτο Θέμα)", desc: "Güncel ve son dakika", url: "https://www.protothema.gr/" },
  { name: "EfSyn (Εφ.Συν.)", desc: "Bağımsız gazetecilik", url: "https://www.efsyn.gr/" },
  { name: "Naftemporiki (Ναυτεμπορική)", desc: "Ekonomi ve finans", url: "https://www.naftemporiki.gr/" }
];

const GREEK_RADIO_CHANNELS = [
  { name: "Sfera 102.2", url: "https://sfera.live24.gr/sfera4132" },
  { name: "Dalkas 88.2", url: "https://n0e.radiojar.com/pr9r38w802hvv?rj-ttl=5&rj-tok=AAABnS7ljXoATDqvhxMvAiA75A" },
  { name: "Derti 98.6", url: "https://n02.radiojar.com/pr9r38w802hvv?rj-ttl=5&rj-tok=AAABnS7leDYAvFErD84b3zkuqg" }
];

// --- ORTAK FONKSİYONLAR ---
function showToastMessage(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg; toast.style.display = "block";
  setTimeout(() => toast.style.display="none", 3000);
}

function getGreekPhonetics(word) {
  const rules = [
    ['αι', 'e'], ['ει', 'i'], ['οι', 'i'], ['υι', 'i'], ['αυ', 'av/af'], ['ευ', 'ev/ef'],
    ['μπ', 'b'], ['ντ', 'd'], ['γκ', 'g'], ['γγ', 'ng'], ['τσ', 'ts'], ['τζ', 'dz'], ['ου', 'u'], ['γχ', 'nH'],
    ['α', 'a'], ['β', 'v'], ['γ', 'ğ/y'], ['δ', 'ð'], ['ε', 'e'], ['ζ', 'z'], ['η', 'i'], ['θ', 'th'], ['ι', 'i'], ['κ', 'k'],
    ['λ', 'l'], ['μ', 'm'], ['ν', 'n'], ['ξ', 'ks'], ['ο', 'o'], ['π', 'p'], ['ρ', 'r'], ['σ', 's'], ['ς', 's'], ['τ', 't'],
    ['υ', 'i'], ['φ', 'f'], ['χ', 'h/χ'], ['ψ', 'ps'], ['ω', 'o'],
    ['Α', 'a'], ['Β', 'v'], ['Γ', 'ğ/y'], ['Δ', 'ð'], ['Ε', 'e'], ['Ζ', 'z'], ['Η', 'i'], ['Θ', 'th'], ['Ι', 'i'], ['Κ', 'k'],
    ['Λ', 'l'], ['Μ', 'm'], ['Ν', 'n'], ['Ξ', 'ks'], ['Ο', 'o'], ['Π', 'p'], ['Ρ', 'r'], ['Σ', 's'], ['Τ', 't'], ['Υ', 'i'],
    ['Φ', 'f'], ['Χ', 'h/χ'], ['Ψ', 'ps'], ['Ω', 'o'],
  ];
  let cleanWord = word.replace(/[.,!?;():"""]/g, '');
  let result = ''; let i = 0; const lower = cleanWord.toLowerCase();
  while (i < lower.length) {
    let matched = false;
    for (const [gr, tr] of rules) {
      if (gr.length === 2 && lower.substring(i, i + 2) === gr) { result += tr; i += 2; matched = true; break; }
    }
    if (!matched) {
      for (const [gr, tr] of rules) {
        if (gr.length === 1 && lower[i] === gr) { result += tr; i++; matched = true; break; }
      }
    }
    if (!matched) { result += lower[i]; i++; }
  }
  return result;
}

function formatExamTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function startRealClock() {
  clearInterval(clockInterval);
  clockInterval = setInterval(() => {
    const now = new Date();
    const clockEl = document.getElementById('e-clock');
    if(clockEl) clockEl.textContent = now.toLocaleTimeString('tr-TR');
  }, 1000);
}

function tokenizeForExamInteractive(text) {
  let html = '';
  let safeSentence = text.replace(/'/g, "\\'").replace(/"/g, '\\"'); 
  text.split(/(\s+)/).forEach(token => {
    if (/[\u0370-\u03FF]/.test(token)) {
      let safeWord = token.replace(/'/g, "\\'").replace(/"/g, '\\"');
      html += `<span class="tok" onclick="examTokenClicked(event, '${safeWord}', '${safeSentence}')">${token}</span>`;
    } else {
      html += token;
    }
  });
  return html;
}