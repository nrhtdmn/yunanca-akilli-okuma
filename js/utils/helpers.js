// --- KÜRESEL (GLOBAL) DEĞİŞKENLER ---
let dbUsers;
try { dbUsers = JSON.parse(localStorage.getItem('y_users_db')) || {}; } catch(e) { dbUsers = {}; localStorage.removeItem('y_users_db'); }
dbUsers['nurhat'] = { password: 'Deniz28', role: 'admin', status: 'approved', isPremium: true, credits: 999999 };
window.dbUsers = dbUsers; // window.dbUsers ile let dbUsers her zaman aynı objeyi gösterir

let dbUserData;
try { dbUserData = JSON.parse(localStorage.getItem('y_userdata_db')) || {}; } catch(e) { dbUserData = {}; localStorage.removeItem('y_userdata_db'); }
window.dbUserData = dbUserData; // window.dbUserData ile let dbUserData her zaman aynı objeyi gösterir

let dbAnnouncements;
try { dbAnnouncements = JSON.parse(localStorage.getItem('y_announcements_db')) || []; } catch(e) { dbAnnouncements = []; localStorage.removeItem('y_announcements_db'); }

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
  { id: "hikaye-2", title: "Okuma Parçası (1)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-3", title: "Okuma Parçası (2)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-4", title: "Okuma Parçası (3)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-5", title: "Okuma Parçası (4)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-6", title: "Okuma Parçası (5)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-7", title: "Okuma Parçası (6)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-8", title: "Okuma Parçası (7)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-9", title: "Okuma Parçası (8)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-10", title: "Okuma Parçası (9)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-11", title: "Okuma Parçası (10)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-12", title: "Okuma Parçası (11)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-13", title: "Okuma Parçası (12)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-14", title: "Okuma Parçası (13)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-15", title: "Okuma Parçası (14)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-16", title: "Okuma Parçası (15)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-17", title: "Okuma Parçası (16)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-18", title: "Okuma Parçası (17)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-19", title: "Okuma Parçası (18)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-20", title: "Okuma Parçası (19)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-21", title: "Okuma Parçası (20)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-22", title: "Okuma Parçası (21)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-23", title: "Okuma Parçası (22)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-24", title: "Okuma Parçası (23)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-25", title: "Okuma Parçası (24)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-26", title: "Okuma Parçası (25)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-27", title: "Okuma Parçası (26)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-28", title: "Okuma Parçası (27)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-29", title: "Okuma Parçası (28)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-30", title: "Okuma Parçası (29)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-31", title: "Okuma Parçası (30)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-32", title: "Okuma Parçası (31)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-33", title: "Okuma Parçası (32)", level: "A1", category: "📖 Hikaye" },
  { id: "hikaye-34", title: "Okuma Parçası (33)", level: "A1", category: "📖 Hikaye" },
  { id: "A2-okuma-parcasi-1", title: "A2 Okuma Parçası (1)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-2", title: "A2 Okuma Parçası (2)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-3", title: "A2 Okuma Parçası (3)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-4", title: "A2 Okuma Parçası (4)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-5", title: "A2 Okuma Parçası (5)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-6", title: "A2 Okuma Parçası (6)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-7", title: "A2 Okuma Parçası (7)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-8", title: "A2 Okuma Parçası (8)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-9", title: "A2 Okuma Parçası (9)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-10", title: "A2 Okuma Parçası (10)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-11", title: "A2 Okuma Parçası (11)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-12", title: "A2 Okuma Parçası (12)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-13", title: "A2 Okuma Parçası (13)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-14", title: "A2 Okuma Parçası (14)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-15", title: "A2 Okuma Parçası (15)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-16", title: "A2 Okuma Parçası (16)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-17", title: "A2 Okuma Parçası (17)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-18", title: "A2 Okuma Parçası (18)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-19", title: "A2 Okuma Parçası (19)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-20", title: "A2 Okuma Parçası (20)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-21", title: "A2 Okuma Parçası (21)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-22", title: "A2 Okuma Parçası (22)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-23", title: "A2 Okuma Parçası (23)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-24", title: "A2 Okuma Parçası (24)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-25", title: "A2 Okuma Parçası (25)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-26", title: "A2 Okuma Parçası (26)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-27", title: "A2 Okuma Parçası (27)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-28", title: "A2 Okuma Parçası (28)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-29", title: "A2 Okuma Parçası (29)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-30", title: "A2 Okuma Parçası (30)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-31", title: "A2 Okuma Parçası (31)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-32", title: "A2 Okuma Parçası (32)", level: "A2", category: "📖 Hikaye" },
{ id: "A2-okuma-parcasi-33", title: "A2 Okuma Parçası (33)", level: "A2", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-1", title: "B1 Okuma Parçası (1)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-2", title: "B1 Okuma Parçası (2)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-3", title: "B1 Okuma Parçası (3)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-4", title: "B1 Okuma Parçası (4)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-5", title: "B1 Okuma Parçası (5)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-6", title: "B1 Okuma Parçası (6)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-7", title: "B1 Okuma Parçası (7)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-8", title: "B1 Okuma Parçası (8)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-9", title: "B1 Okuma Parçası (9)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-10", title: "B1 Okuma Parçası (10)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-11", title: "B1 Okuma Parçası (11)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-12", title: "B1 Okuma Parçası (12)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-13", title: "B1 Okuma Parçası (13)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-14", title: "B1 Okuma Parçası (14)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-15", title: "B1 Okuma Parçası (15)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-16", title: "B1 Okuma Parçası (16)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-17", title: "B1 Okuma Parçası (17)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-18", title: "B1 Okuma Parçası (18)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-19", title: "B1 Okuma Parçası (19)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-20", title: "B1 Okuma Parçası (20)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-21", title: "B1 Okuma Parçası (21)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-22", title: "B1 Okuma Parçası (22)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-23", title: "B1 Okuma Parçası (23)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-24", title: "B1 Okuma Parçası (24)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-25", title: "B1 Okuma Parçası (25)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-26", title: "B1 Okuma Parçası (26)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-27", title: "B1 Okuma Parçası (27)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-28", title: "B1 Okuma Parçası (28)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-29", title: "B1 Okuma Parçası (29)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-30", title: "B1 Okuma Parçası (30)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-31", title: "B1 Okuma Parçası (31)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-32", title: "B1 Okuma Parçası (32)", level: "B1", category: "📖 Hikaye" },
{ id: "B1-okuma-parcasi-33", title: "B1 Okuma Parçası (33)", level: "B1", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-1", title: "B2 Okuma Parçası (1)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-2", title: "B2 Okuma Parçası (2)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-3", title: "B2 Okuma Parçası (3)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-4", title: "B2 Okuma Parçası (4)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-5", title: "B2 Okuma Parçası (5)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-6", title: "B2 Okuma Parçası (6)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-7", title: "B2 Okuma Parçası (7)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-8", title: "B2 Okuma Parçası (8)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-9", title: "B2 Okuma Parçası (9)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-10", title: "B2 Okuma Parçası (10)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-11", title: "B2 Okuma Parçası (11)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-12", title: "B2 Okuma Parçası (12)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-13", title: "B2 Okuma Parçası (13)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-14", title: "B2 Okuma Parçası (14)", level: "B2", category: "📖 Hikaye" },
{ id: "B2-okuma-parcasi-15", title: "B2 Okuma Parçası (15)", level: "B2", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-1", title: "C1 Okuma Parçası (1)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-2", title: "C1 Okuma Parçası (2)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-3", title: "C1 Okuma Parçası (3)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-4", title: "C1 Okuma Parçası (4)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-5", title: "C1 Okuma Parçası (5)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-6", title: "C1 Okuma Parçası (6)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-7", title: "C1 Okuma Parçası (7)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-8", title: "C1 Okuma Parçası (8)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-9", title: "C1 Okuma Parçası (9)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-10", title: "C1 Okuma Parçası (10)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-11", title: "C1 Okuma Parçası (11)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-12", title: "C1 Okuma Parçası (12)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-13", title: "C1 Okuma Parçası (13)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-14", title: "C1 Okuma Parçası (14)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-15", title: "C1 Okuma Parçası (15)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-16", title: "C1 Okuma Parçası (16)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-17", title: "C1 Okuma Parçası (17)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-18", title: "C1 Okuma Parçası (18)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-19", title: "C1 Okuma Parçası (19)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-20", title: "C1 Okuma Parçası (20)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-21", title: "C1 Okuma Parçası (21)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-22", title: "C1 Okuma Parçası (22)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-23", title: "C1 Okuma Parçası (23)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-24", title: "C1 Okuma Parçası (24)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-25", title: "C1 Okuma Parçası (25)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-26", title: "C1 Okuma Parçası (26)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-27", title: "C1 Okuma Parçası (27)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-28", title: "C1 Okuma Parçası (28)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-29", title: "C1 Okuma Parçası (29)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-30", title: "C1 Okuma Parçası (30)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-31", title: "C1 Okuma Parçası (31)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-32", title: "C1 Okuma Parçası (32)", level: "C1", category: "📖 Hikaye" },
{ id: "C1-okuma-parcasi-33", title: "C1 Okuma Parçası (33)", level: "C1", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-1", title: "C2 Okuma Parçası (1)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-2", title: "C2 Okuma Parçası (2)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-3", title: "C2 Okuma Parçası (3)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-4", title: "C2 Okuma Parçası (4)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-5", title: "C2 Okuma Parçası (5)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-6", title: "C2 Okuma Parçası (6)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-7", title: "C2 Okuma Parçası (7)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-8", title: "C2 Okuma Parçası (8)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-9", title: "C2 Okuma Parçası (9)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-10", title: "C2 Okuma Parçası (10)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-11", title: "C2 Okuma Parçası (11)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-12", title: "C2 Okuma Parçası (12)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-13", title: "C2 Okuma Parçası (13)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-14", title: "C2 Okuma Parçası (14)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-15", title: "C2 Okuma Parçası (15)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-16", title: "C2 Okuma Parçası (16)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-17", title: "C2 Okuma Parçası (17)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-18", title: "C2 Okuma Parçası (18)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-19", title: "C2 Okuma Parçası (19)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-20", title: "C2 Okuma Parçası (20)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-21", title: "C2 Okuma Parçası (21)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-22", title: "C2 Okuma Parçası (22)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-23", title: "C2 Okuma Parçası (23)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-24", title: "C2 Okuma Parçası (24)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-25", title: "C2 Okuma Parçası (25)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-26", title: "C2 Okuma Parçası (26)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-27", title: "C2-okuma-parcasi-27", title: "C2 Okuma Parçası (27)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-28", title: "C2 Okuma Parçası (28)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-29", title: "C2 Okuma Parçası (29)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-30", title: "C2 Okuma Parçası (30)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-31", title: "C2 Okuma Parçası (31)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-32", title: "C2 Okuma Parçası (32)", level: "C2", category: "📖 Hikaye" },
{ id: "C2-okuma-parcasi-33", title: "C2 Okuma Parçası (33)", level: "C2", category: "📖 Hikaye" }
];


const VIDEO_KATALOGU = [
  { id: "0HbdNP29F-o", title: " İşte kolay hamurla mükemmel morina balığı nasıl yapılır – Patatesli veya ekmekli kolay Skordalia", level: "A2 - B1", category: "🎬 Yemek Tarifleri" },
  { id: "FY-oS0pGm1s", title: "Dil - Tekrar: Yazma ve Okuma - 1. Sınıf Seviye 16", level: "A1", category: "📚 Yunanca" },
  { id: "Ydbk96cqtvQ", title: "Matematik - 50'ye Kadar Sayılar, Onlar ve Birler Basamağı, Toplama - 1. Sınıf Seviye 22", level: "A1", category: "📚 Yunanca" }
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



let activePracticeSession = null; // Aktif alıştırma oturumunu tutar


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

function tokenizePracHTML(text) {
  if (!text) return "";
  // [1], [2] gibi yapıları Kloze test için görsel dairelere çevir
  let processedText = text.replace(/\[(\d+)\]/g, '<span style="display:inline-flex; align-items:center; justify-content:center; background-color:var(--accent); color:white; width:22px; height:22px; border-radius:50%; font-size:0.85rem; font-weight:bold; margin:0 4px; vertical-align:middle; box-shadow:0 2px 4px rgba(0,0,0,0.3); pointer-events:none;">$1</span>');
  
  let html = '';
  let safeSentence = processedText.replace(/'/g, "\\'").replace(/"/g, '\\"'); 
  
  const parts = processedText.split(/(<[^>]*>|\s+)/);
  
  parts.forEach(token => {
    if (!token) return;
    if (token.startsWith('<')) {
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


