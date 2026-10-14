# Görseller, logo ve fontlar

Bu dosya 14 Ekim 2026'da mevcut kaynak üzerinden düzenlenmiştir. Bir dosyanın var olması, ilgili seçeneğin canlı sayfalarda kullanıldığı anlamına gelmez; HTML referansları esas alınır.

## Logo ve açılış

Güncel sayfalarda `assets/logo/gerzoglu-logo-29-silver.webp` ve PNG yedeği kullanılır. PNG kaynak 1536 × 1024 piksel, şeffaf gümüş/grafit Logo 29'dur. `favicon-silver-20261009.ico`, `favicon-silver-20261009.png` ve `apple-touch-icon-silver.png` eşleşen simgelerdir. Matte/gold/03 adlı dosyalar alternatif veya önceki çalışmalardır; güncel ana logo olarak varsayılmamalıdır.

Logo davranışı `assets/js/site.js` ve `assets/css/silver-theme.css` içindedir. İlk ziyaret oturumunda logo yaklaşık 3 saniyede yavaşça büyüyüp görünür ve 1 saniyede çıkar. `sessionStorage` içindeki `gz-intro`, aynı oturumda açılışın tekrarlanmasını önler. Tıklama açılışı atlar; azaltılmış hareket tercihi açılışı devre dışı bırakır. Görsel çözülmesini bekleme ve güvenli açılış zamanlayıcısı nedeniyle toplam duvar saati her cihazda tam 4 saniye olmak zorunda değildir.

Logo kaynak notları `assets/logo/*notes.txt` içinde üretim tarihini ve alternatiflerin geçmişini kaydeder. Bu notlardaki eski “önizleme hâlâ altın” ifadesi tarihsel bilgidir; güncel kullanım HTML'deki silver dosya referanslarıdır. PNG/WebP raster dosyaları, büyük ölçekli tabela için vektör master dosyası sayılmaz.

## Görsel kaynakları

| Konum | Kullanım |
|---|---|
| `assets/proje/` | Yerel yüksek çözünürlüklü proje kaynakları ve bazı önceki alternatifler |
| `assets/responsive/` | Sayfalardaki optimize edilmiş farklı genişlikte WebP kopyaları |
| `assets/cozum/` | Çözüm ortağı marka görselleri |
| `assets/icons/`, `assets/logo/` | Arayüz simgeleri ve kimlik görselleri |
| `vercel.json` içindeki `/img/` yönlendirmeleri | Önceki bağlantılar ve bazı dış Higgsfield CDN varlıklarına erişim |

Ana sayfa, proje listesi ve detay sayfalarındaki `src`, `srcset`, ön yükleme ve paylaşım resimleri birlikte kontrol edilir. Çoğu görselde 640/1280/1920 piksel WebP seçenekleri vardır. Bazı dosyalarda adın sonundaki değer içerik karması, bazılarında tarihtir; aynı adı taşıyan dosyanın önbellekte kalmaması için yeni görüntü sürümü yeni bir ad almalıdır.

`vercel.json` içinde kalan uzak `*_min.webp` yönlendirmeleri tarihsel yollardır. Küçük bir önizleme dosyasını büyük alanlara yeniden bağlamak önceki bulanıklık sorununu geri getirebilir. Yerel büyük `srcset` dosyaları, yalnız kısa ad benzerliğine bakılarak bu uzak küçük kopyalarla değiştirilmemelidir. Kaynak genişliğini aşan büyütme gerçek detay üretmez.

`npm run build` yalnız mevcut dosyaları `dist/` içine kopyalar; responsive görselleri yeniden üretmez. Yeni görsel için gereken boyutlar önceden oluşturulmalı ve kaynakla birlikte izlenmelidir. Geçici üretim araçları veya orijinal fotoğrafların kullanıcının Downloads klasöründe bulunduğu varsayımı, kalıcı yayın bağımlılığı yapılmamalıdır.

## Karabaş Apartmanı

`proje/kartal-karabas-apartmani.html` ve `projeler.html` içinde kullanılan güncel mevcut bina çalışması:

- Kaynak: `assets/proje/karabas-apartmani-mevcut-duz-20261012.png` (1536 × 1024).
- Türevler: `assets/responsive/karabas-apartmani-mevcut-duz-20261012-640.webp`, `-1280.webp`, `-1536.webp`.
- Varsayılan resim 1280 piksel; `srcset` 640/1280/1536, hero alanında `sizes="100vw"`.
- Detay sayfasındaki sosyal paylaşım görseli 1536 piksel türevidir.
- `mevcut-20261012` adlı, `duz` içermeyen dosyalar önceki perspektif çalışmasıdır.

Görsel açıklaması ve başlığı “mevcut bina” olarak kalır. Bu resim, tasarlanan yeni binanın tamamlanmış fotoğrafı olarak sunulmamalıdır. Kaynak 1536 piksel olduğundan 1920 piksel türev oluşturup daha ayrıntılı kaynak varmış gibi kullanılmaz.

## Değiştirme ve kalite kontrolü

1. Kullanılacak bina, açı ve görsel sürümünü mevcut HTML referanslarıyla eşleştirin. Kullanıcının seçmediği alternatifleri otomatik olarak yayına almayın.
2. Orijinal çözünürlüğü, en-boy oranını, yatay/dikey doğruları ve binanın kat/cephe özelliklerini kontrol edin. Çevredeki gerçek yapı ve sokak dokusunu değiştiren bir çalışma yeni bir içerik kararıdır.
3. Kaynak oranını koruyarak gereken boyutları üretin; küçük dosyayı büyütmeyin. Görseldeki içerik/cephe değişikliğini yalnız “optimizasyon” saymayın.
4. `src`, `srcset`, `sizes`, `width`, `height`, `alt`, hero ön yüklemesi, Open Graph/Twitter görseli ve varsa eski yol yönlendirmelerini birlikte güncelleyin.
5. Hero görselinde yüksek yükleme önceliğini, aşağıdaki görsellerde gecikmeli yüklemeyi koruyun. `sizes` değerini gerçek ekran genişliğine uygun seçin.
6. Masaüstü, yüksek piksel yoğunluklu ekran ve mobilde tarayıcının seçtiği dosyayı kontrol edin. Kırpma, bulanıklık, bozuk yol, içerik kayması ve paylaşım önizlemesini denetleyin.

## Fontlar ve lisanslar

Fontlar `assets/css/fonts.css` ve `assets/fonts/` üzerinden yerel sunulur: Archivo, Montserrat, IBM Plex Mono ve IBM Plex Sans. Latin Extended alt kümeleri Türkçe karakterler içindir. Font dosyalarını, `@font-face` tanımlarını ve Türkçe desteğini birlikte koruyun.

Kaynak, boyutlar ve SHA-256 kayıtları `assets/fonts/provenance.json`; aile/lisans açıklaması `assets/fonts/README.md` içindedir. SIL Open Font License metinleri aynı klasörde saklanır ve görsellerle birlikte dağıtımda korunur.
