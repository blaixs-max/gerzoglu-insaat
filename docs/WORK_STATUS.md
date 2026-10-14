# Devam kaydı — 14 Ekim 2026

## Örnek iç mekân kartları — güncel yayın

Kullanıcı, örnek iç mekân fotoğraflarını içeren kartların tamamını panelden kaldırmayı seçti. Hazır yatak odası, mutfak ve banyo fotoğrafları, değişmez kaynak kimliklerinden tanınarak yönetim galerisinde gizlenir. Projeye özel yüklenen iç mekân görselleri ve diğer kartların açıklama/başlık/tür alanları düzenlenebilir. Görsel sayacı, sıralama okları ve kapak silme sonrası seçim yalnız görünür görselleri kullanır. Ham dizi indeksleri korunur; gizli örnekler kayıt/yayın belgesinden çıkarılmaz. Sitedeki örnek fotoğraflar ve cloud kayıtları değiştirilmedi.

Kod `b22a1e4`, canlı dağıtım `dpl_C2eMErCCtLtjd3FZ1JMMRAdHm7BJ` (`gerzoglu-varyant-3-bhar3qvwi-blaixs-4009s-projects.vercel.app`). 47/47 test ve build geçti. Gerçek kart oluşturucusunda özel iç mekân/görünür komşu/kayıt koruması doğrulandı; staged ve canlı JS kaynakla birebir karşılaştırıldı. Başlangıçtaki 27 belgedeki 78 örnek kartın görünmediği ve belgelerin değişmediği doğrulandı.

## Otomatik proje adresleri — güncel yayın

Proje adresi alanı kullanıcı isteğiyle kaldırıldı. Yeni adresi sunucu bina adından üretir; istemcinin gönderdiği adresi veya detay yolunu kullanmaz. Aynı isimde kayıt varsa `-2`, `-3` gibi ayrı adresler ayrılır. Taslak/arşivli adresler ve eski yönlendirmeler de rezerve kalır. Veritabanının benzersizlik kuralı eşzamanlı istekleri korur; oluşturma işlemi hiçbir kaydı güncellemez veya upsert yapmaz. Bina adı sonradan değiştirilse de eski proje adresi korunur. Şema veya cloud verisine bu değişiklik için yazılmadı.

Uygulama commit'i `c5fd689`; canlı dağıtım `dpl_2GaSgEsp64z4fa3QU9nMrCe4AppH` (`gerzoglu-varyant-3-mslwasxii-blaixs-4009s-projects.vercel.app`). **47/47 test ve build geçti**, sekiz eşzamanlı aynı isimli proje, eski adres koruması, boş/uzun/Türkçe adlar ve istemci adresini yok sayma doğrulandı. Canlı admin JS kaynağı ile aynı; manuel adres alanı yok ve API cloud yapılandırması sağlıklı.

## Son sadeleştirme

Kullanıcının isteğiyle **Ana sayfada görünüm** bölümü proje düzenleyicisinden şimdilik kaldırıldı. Mevcut belgelerin `home` değerleri kaydetme/yayın sırasında korunur; yeni projeler kart/slayt seçimi kapalı başlar. Ana sayfa seçimi ve sırası için panelde kontrol yoktur; Projeler listesinin sırası düzenlenebilir. Veritabanı kayıtlarına bu değişiklik için yazılmadı. Kod `4366110`, canlı dağıtım `dpl_7YPCswkDR3QEfKo7hhABe5zupbFk` (`gerzoglu-varyant-3-nsqseld4t-blaixs-4009s-projects.vercel.app`). 40/40 test ve build geçti; canlı admin JavaScript'i kaynakla aynı ve kaldırılan alanları içermiyor.

Bu dosya bilgisayar kapatılmadan önce kalıcı devam noktasıdır. Parola veya anahtar içermez.

- Asıl kaynak: `C:\Users\Dell\Desktop\Gerz Oğlu\gerzoglu-varyant-3`; GitHub `blaixs-max/gerzoglu-insaat`, dal `main`.
- CMS kodu GitHub'a gönderildi. İlk özellik commit'i `056ad62`, arayüz sonlandırması `bc14252`, fiziksel dosyaların CMS yönlendirmelerini gölgelemesini düzelten commit `038c941`.
- Doğru Vercel projesi `gerzoglu-varyant-3` / `prj_TJQvQ9L6NvWFMuJA1psxeEn0W8Jj`, takım `team_CaYrjZEduUIYQniCVwvSijFp`. Tarihsel `gerzoglu-insaat` projesini kullanmayın. Git deployment kapalıdır.
- Ayrı Supabase Free projesi `gerzoglu-cms`, ref `ibbyoetzgeqbrxyvzidb`, Frankfurt. Ücretli plana geçilmedi. Üç migration uygulandı; 27 yayın projesi, 1 etkin yönetici var. Geçici cloud test projesi ve görselleri temizlendi.
- Yönetici adresi `https://gerzoglu.com/admin`, hesap `info@gerzoglu.com`. Kullanıcının belirlediği parola belgelerde tutulmaz. Parola girişi gerçek Auth servisiyle doğrulandı.
- Son test paketi **40/40 geçti**; yerel telefon/masaüstü arayüz akışları ve gerçek cloud yükleme/yayın/taslak/çakışma/arşiv işlemleri doğrulandı.
- GitHub dış veritabanı kontrolü etkin: `17 */6 * * *`. İlk elle çalışma başarılı: https://github.com/blaixs-max/gerzoglu-insaat/actions/runs/38587790863 . Yalnız public anahtar kullanır.
- Vercel birincil kontrolü: `/api/health`, `37 */6 * * *`, sunucuda özel `CRON_SECRET`. Proje metadata'sında `disabledAt:null` ve son production dağıtımına bağlı doğru görev tanımı doğrulandı. Gerçek cloud sorgusu yapan korumalı kontrol 200 döndü. GitHub 60 günlük hareketsizlik sınırına karşı Vercel bağımsız çalışır. Free planda duraklamama garantisi yoktur.
- Mevcut SMTP bağlantısı EAUTH verdi; e-posta gönderilmedi. Şifre yenileme seçeneği, doğrulanmış özel SMTP ve `CMS_RECOVERY_ENABLED=1` hazır olana kadar kapalıdır. Parola girişi çalışır.

## Son yayın kontrolü

İlk yayındaki statik dosya önceliği sorunu `038c941` ile düzeltildi; kaynak HTML ve `data/site-templates.json` korundu. **Son production:** `dpl_9Gb4KpMkXRYM1YwwRWhXqy5RgULu`, `https://gerzoglu-varyant-3-fsvp2kmet-blaixs-4009s-projects.vercel.app`. Doğru projede hazırlanıp `gerzoglu.com` alan adına promote edildi. Canlı ana sayfa, liste, site haritası ve **27/27 proje HTML'si**, `renderPage` çıktısıyla birebir eşleşti; hepsinde `private, no-store, max-age=0` doğrulandı. Ana hostta yanlış noindex yok. Korumalı gerçek cloud sağlık kontrolü yeni yayında 200 döndü. Yalnız HTTP 200/baseline içerik bu yönlendirmeyi doğrulamaz; `tests/cms-build.test.cjs` artık fiziksel dosya gölgelenmesine karşı kalıcı regresyon kontrolüdür.

Bilgisayarın kapanması cloud yayını, veritabanı veya dış kontrolleri durdurmaz. Yerel test portları 4173/4174 kontrol edildi; dinleyen süreç kalmadı. Sonraki oturumda bu dosyayı ve `ADMIN_GUIDE.md` dosyasını okuyarak devam edin. Kalan bilinen kurulum: geçerli SMTP bilgileri ve şifre yenileme e-posta teslimatı. Kullanıcının istediği yeni özellik veya içerik değişiklikleri ayrıca ele alınır.

Kullanım `ADMIN_GUIDE.md`, erişilebilirlik `ADMIN_AVAILABILITY.md`, SQL `ADMIN_DATABASE.md`, yayın `DEPLOYMENT.md` içindedir. Yerel `.env*`, `.vercel`, `.cache` dosyaları özeldir ve Git dışında kalır. Docker kullanmayın; veritabanı testleri PGlite ile çalışır.
