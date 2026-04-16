// Bu dosya en son çalışacak ve uygulamayı init (boot) edecektir.
// kurs.js vb. yüklendikten sonra sekme (URL / localStorage) — Kurs’ta F5 ile aynı yerde kalmak için
if (typeof window.initMainTabFromUrlOrStorage === "function") {
  try {
    window.initMainTabFromUrlOrStorage();
  } catch (e) {
    console.error("initMainTabFromUrlOrStorage", e);
  }
}
fetchFromFirebase();
if (typeof initFirebaseAuth === "function") initFirebaseAuth();

/* ==================================================
   PWA (UYGULAMA YÜKLEME) BUTONU MANTIĞI
================================================== */
let deferredPrompt;
const installBtn = document.getElementById('pwa-install-btn');

// Tarayıcı "Bu site yüklenebilir bir PWA'dır" sinyalini verdiğinde çalışır
window.addEventListener('beforeinstallprompt', (e) => {
    // preventDefault: tarayıcının mini kurulum afişini kapatır; kurulum penceresi
    // "Uygulamayı Yükle" ile prompt() açılır. Chrome bazen "Banner not shown... must call prompt()"
    // yazar — beklenen bilgi; hata değil (prompt() buton tıklanınca çağrılır).
    e.preventDefault();

    // Olayı (sinyali) daha sonra butonla tetiklemek üzere değişkene kaydet
    deferredPrompt = e;
    
    // Uygulama yüklenebilir durumda, kendi şık butonumuzu görünür yap!
    if (installBtn) {
        installBtn.style.display = 'flex'; 
    }
});

// Kullanıcı bizim butonumuza tıkladığında
if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Kaydettiğimiz yükleme penceresini (sistemin orijinal ekranını) çağır
            deferredPrompt.prompt();
            
            // Kullanıcının cevabını bekle (Yükle dedi mi, İptal mi etti?)
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Kullanıcı PWA yükleme istemine şu yanıtı verdi: ${outcome}`);
            
            // İstem bir kez kullanıldıktan sonra güvenlik gereği sıfırlanmalıdır
            deferredPrompt = null;
            
            // Butonu tekrar gizle
            installBtn.style.display = 'none';
        }
    });
}

// Uygulama zaten yüklendiyse (başarıyla kurulduktan sonra) çalışır
window.addEventListener('appinstalled', () => {
    console.log('PWA başarıyla cihaza yüklendi!');
    // İşlem bittiği için butonu sonsuza dek gizle
    if (installBtn) {
        installBtn.style.display = 'none';
    }
    deferredPrompt = null;
});

