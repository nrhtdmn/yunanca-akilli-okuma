import os
import re
import unicodedata

# Dosyaların bulunduğu klasör
klasor = r"D:\yazılım projeleri\yunanca-akilli-okuma\ornek-metinler"   # klasör yolunu buraya yaz

def turkce_karakter_sil(metin):
    return unicodedata.normalize('NFKD', metin).encode('ascii', 'ignore').decode('ascii')

for dosya in os.listdir(klasor):

    if dosya.endswith(".txt"):

        # Örnek: C2_Okuma Parçası (15).txt
        eslesme = re.search(r"\((\d+)\)", dosya)

        if eslesme:
            sayi = eslesme.group(1)

            # Yeni isim oluştur
            yeni_isim = f"B1-okuma-parcasi-{sayi}.txt"

            # Küçük harfe çevir
            yeni_isim = yeni_isim.lower()

            # Eski ve yeni tam yol
            eski_yol = os.path.join(klasor, dosya)
            yeni_yol = os.path.join(klasor, yeni_isim)

            # Yeniden adlandır
            os.rename(eski_yol, yeni_yol)

            print(f"{dosya}  →  {yeni_isim}")

print("\nTüm dosyalar başarıyla değiştirildi.")