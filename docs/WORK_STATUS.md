# Devam kaydı — 26 Ekim 2026

## Güncel durum ve eşitleme

26 Ekim 2026: Küçüktur Yolu / Gerzoğlu 2 Apartmanı'nın dış cephe görselleri kullanıcının üç referansından yeniden üretildi ve CMS üzerinden yayımlandı. Gündüz kapak, gündüz/yağmur/kar galerisi; proje `d9433db1-c1bc-4bf9-805b-da3a81246d07`, slug `idealtepe-gerzoglu-2`, yayın sürümü 3. Diğer proje alanları ve üç iç mekân görseli korundu; yalnız standart kayıt normalizasyonu mevcut örtük `legacy.placeholder=false` değerini açık hale getirdi. Ana sayfa slaytı/kartı, Projeler listesi, detay ve OG kapağı yeni gündüz görseline bağlı. Dokuz WebP varyantı HTTP 200 ve gerçek 640/1280/1536 px ölçüleriyle doğrulandı; büyütme yapılmadı. 74/74 test ve build başarılı. Kanıt `.cache/gerz2-20261026/live-verification.json` ve `canli-proje.png`. Kaynaklar ve medya kimlikleri [ASSETS.md](ASSETS.md) içindedir. Bu yalnız CMS içerik yayınıdır; uygulama dağıtımı aşağıdaki 21 Ekim sürümünde kalır.

21 Ekim 2026: Başkan portresi kullanıcının sağladığı yeni fotoğrafla güncellendi. Uygulama commit’i `1dc6c56`, production dağıtımı `dpl_5CDYaQsBjbXDYk9ZtYbdNGSD6U6Y` (`gerzoglu-varyant-3-kjput1027-blaixs-4009s-projects.vercel.app`), durum `READY`; `gerzoglu.com` alanına atandı. 74/74 test ve build başarılı. Canlı HTML ve üç WebP dosyasının SHA-256 değerleri kaynakla eşleşti; yeni fotoğraf tarayıcıda görüldü. Mesaj ve yerleşim korundu. Kanıt: `.cache/portrait-20261021/live-verification.json` ve `canli-portre.png`.


- **Yerel kaynak:** `C:\Users\Dell\Desktop\Gerz Oğlu\gerzoglu-varyant-3`. GitHub: [blaixs-max/gerzoglu-insaat](https://github.com/blaixs-max/gerzoglu-insaat), dal `main`. Eski kardeş klasörler kaynak olarak kullanılmaz.
- **Canlı sürüm:** `dpl_5CDYaQsBjbXDYk9ZtYbdNGSD6U6Y`, uygulama commit'i `1dc6c56`; `gerzoglu-varyant-3-kjput1027-blaixs-4009s-projects.vercel.app`. 21 Ekim 2026, production / READY; `gerzoglu.com` alanına atandı.
- **Son içerikler:** Hakkımızda sayfasında Savaş Gerz'in portresi ve yedi paragraflık başkan mesajı; Kentsel Dönüşüm sayfasında 22 soruluk malik rehberi yayında. Aynı salt okunur kontrolde kaynakla içerik, portre/CSS dosyaları ve mevcut 27 proje bağlantısı doğrulandı.
- **Güncel kontrol:** 26 Ekim 2026: 74/74 test ve build geçti. Gerzoğlu 2'nin yeni kapağı ve üç görsellik galerisi canlı tarayıcıda görüldü; dokuz medya varyantı, ana sayfa/proje listesi/paylaşım kapağı doğrulandı. Yalnız hedef projenin kapak ve dış cephe galerisi CMS'de güncellendi. Başkan portresinin son kaynak/karma doğrulaması 21 Ekim kaydındadır.
- **Yönetim:** [gerzoglu.com/admin](https://gerzoglu.com/admin) adresinde yayında. Üç adımlı düzenleyici, otomatik ve değişmez proje adresleri, tek seçimli dört durum, taslak/yayın ayrımı ve onaylı arşivden silme etkin. Ana sayfa seçimleri ve hazır örnek iç mekân kartları panelden gizlenir. Ayrıntılar [ADMIN_GUIDE.md](ADMIN_GUIDE.md).
- **Veri:** Ayrı `gerzoglu-cms` / `ibbyoetzgeqbrxyvzidb` projesi kullanılır. Dört migration uygulanmıştır; sonuncusu arşivden silmedir. Son uygulama kaydındaki cloud sürümü `20261015072308`, yerel dosyası `20261014200125_cms_archived_project_deletion.sql`. Bu eşitleme cloud verisini yeniden aktarmadı veya değiştirmedi.
- **Bilinen eksik:** Son gerçek SMTP doğrulaması `EAUTH` verdi. E-posta teslimatı ve parola yenileme tamamlanmış sayılmaz; doğrulanmış SMTP ve `CMS_RECOVERY_ENABLED=1` hazır olana kadar kurtarma kapalı tutulur. `GET /api/contact` yanıtındaki `available:true` yalnız yapılandırma varlığını gösterir.
- **İşletim:** Altı saatlik Vercel ve GitHub kontrolleri yapılandırılmıştır; Free plan için kesintisizlik veya bağımsız yedek garantisi değildir. Güncel işletim adımları [ADMIN_AVAILABILITY.md](ADMIN_AVAILABILITY.md). GitHub push'u dağıtım başlatmaz; yayın doğru Vercel projesine CLI üzerinden yapılır.
- **Yerel kılavuzlar:** `output/pdf/Gerzoglu_Admin_Paneli_Kullanim_Kilavuzu.pdf` ve düzenlenebilir `output/powerpoint/Gerzoglu_Admin_Paneli_Kullanim_Kilavuzu.pptx` korunur. Bu çıktılar, ham kullanıcı belgeleri ve özel ortam dosyaları Git/deploy dışında tutulur.

Eşitleme kanıtı ve ilk kaynak birleştirmesinin geçmişi [SOURCE_SYNC.md](SOURCE_SYNC.md), yayın yöntemi [DEPLOYMENT.md](DEPLOYMENT.md) içindedir. Aşağıdaki bölümler **özelliklerin yayımlandığı andaki tarihsel sonuçlardır**; her bölümdeki dağıtım kimliği ve test sayısı o sürüme aittir.

## Yayın geçmişi: Yönetim Kurulu Başkanından — 15 Ekim 2026

Kullanıcının sağladığı fotoğraf ve `YÖNETİM KURULU BAŞKANINDAN.docx` içeriği **`kurumsal.html#baskanin-mesaji`** bölümüne eklendi. Hakkımızda tanıtımından sonra, Vizyon/Misyon'dan önce yer alır; Hakkımızda alanından doğrudan bağlantı bulunur. Yedi paragrafın anlamı ve sayısal bilgileri korundu, küçük yazım/noktalama düzeltmeleri yapıldı. İmza **Savaş Gerz — Yönetim Kurulu Başkanı**. Fotoğraf değiştirilmeden ve kırpılmadan 360/640/896 px WebP olarak hazırlandı; orijinal 896 × 1120 PNG de kaynakta korunur. Ham Word belgesi yayımlanmadı. Ayrıntılar `ASSETS.md` içindedir.

Kod commit'i **8723a83**. **74/74 test ve build geçti**. Masaüstünde yan yana, 390 px telefonda alt alta görünüm, fotoğrafın tam oranı/yüklenmesi, yedi paragraf, imza ve yatay taşma kontrol edildi. Yalnız Kurumsal HTML şablonu değişti; cloud verisine ve proje ilk aktarım verisine yazılmadı.

Canlı dağıtım **dpl_GHPG6pHrJooEAm9ZyVTNxNuk13Q8** (`gerzoglu-varyant-3-ekui35f27-blaixs-4009s-projects.vercel.app`), doğru `gerzoglu-varyant-3` projesinde production ayarlarıyla hazırlanıp doğrulandıktan sonra `gerzoglu.com` alanına promote edildi. Korumalı önizlemede mesaj HTML'si/CSS ve üç görselin dosya karmaları kaynakla aynı. Canlıda aynı kontroller geçti; önceki Hakkımızda/Vizyon/Çözüm Ortakları içeriği, 27 proje bağlantısı ve 22 soruluk kentsel dönüşüm rehberi korundu. Yanlış `noindex` yok; gerçek canlı tarayıcıda fotoğraf ve mesaj görüldü. Ekran görüntüsü `.cache/chairman-message/canli-baskan-mesaji.jpg`; doğrulama `.cache/chairman-message/live-verification.json`. GitHub main ve yerel kaynak eşitlendi; yerel önizleme kapatıldı.

## Yayın geçmişi: Kentsel dönüşüm malik rehberi — 15 Ekim 2026

Kullanıcının Word belgesindeki 22 konu, yazım/anlatım ve maddi hukuk hataları düzeltilerek **`kentsel-donusum.html#malik-rehberi`** bölümüne eklendi. Bölüm başvuru formundan önce yer alır; üst alanda doğrudan bağlantı ve üç konu başlığı vardır. Sorular yerel `details/summary` ile açılır, JavaScript gerektirmez. Cevaplarda resmî dayanaklar ve 15 Ekim 2026 kontrol tarihi bulunur. 4 Şubat ve 22 Mayıs 2026 düzenlemeleri de kontrol edildi. Hukuki düzeltmeler ve bakım kaynakları `KENTSEL_DONUSUM_REHBERI.md` içindedir.

Kod commit'i **b82223f**. **74/74 test ve build geçti**. Masaüstü ve 390 px telefon görünümü, soru açma/kapama, Enter ile kullanım ve konu bağlantıları gerçek tarayıcıda doğrulandı; yatay taşma yok. HTML şablon paketi yeniden üretildi; yalnız Kentsel Dönüşüm şablonu değişti, `data/projects.json` ve cloud kayıtlarına yazılmadı. Başvuru formu ile eski sekiz genel soru korundu. Kullanıcıya ait özel çıktıların yayımlanmaması için `output/` Git ve Vercel yüklemesinden dışlandı.

Canlı dağıtım **dpl_5ALNyp9hJfk28SwviHj5PNRdn6H3** (`gerzoglu-varyant-3-h84pglaxc-blaixs-4009s-projects.vercel.app`), doğru `gerzoglu-varyant-3` projesinde production ortamında hazırlanıp `gerzoglu.com` alan adına promote edildi. Korumalı önizleme mevcut Vercel CLI yetkisiyle okundu; koruma ayarı değiştirilmedi. Önizlemede ve canlıda 22 soru ve CSS kaynakla eşleşti, başvuru formu önceki canlı sürümle aynı kaldı, 27 proje bağlantısı ve sırası değişmedi. Ana sayfa, Projeler, Kentsel Dönüşüm ve admin HTTP 200; ana alanda yanlış `noindex` yok. Canlı tarayıcıda soru açılması doğrulandı, ekran görüntüsü `.cache/urban-guide/canli-rehber.jpg` olarak kaydedildi. E-posta gönderilmedi. GitHub main ile yerel kaynak eşitlendi.

## Yayın geçmişi: Arşivden kalıcı silme — 15 Ekim 2026

Arşiv listesindeki **Sil** ve arşivlenmiş proje düzenleyicisindeki **Kalıcı olarak sil** düğmeleri eklendi. Yönetici proje adını aynen yazarak onaylar. Boş/yanlış adla silme açılmaz; Vazgeç ve Escape yazma isteği göndermez. Sunucu ve SQL etkin yönetici, arşiv durumu, güncel sürüm ve ad onayını birlikte denetler. Sürüm çakışmasında otomatik silme tekrarı yapılmaz. Başarılı işlem hedef projeyi ve ilişkili katalog/geçmiş/audit/medya kayıtlarını kaldırır. Diğer projeler korunur; eski adres ayrı rezervasyonda kalır. Storage dosyalarının fiziksel temizliği bu özelliğin kapsamında değildir.

Kod commit'i **390dd8d**. **74/74 test ve build geçti**: SQL/HTTP yetki ve ad/sürüm kontrolleri, ilişkili kayıtların silinmesi, komşu projelerin korunması, adresin yeniden kullanılamaması, iptal/çift tıklama ve silme sonrası arşiv düğmelerinin çalışması doğrulandı. Yerel migration `20261014200125_cms_archived_project_deletion.sql`, yalnız `ibbyoetzgeqbrxyvzidb` projesine `cms_archived_project_deletion` adıyla uygulandı; cloud sürümü **20261015072308**. Eski migrationlar yeniden uygulanmadı. RLS ve rol izinleri kontrol edildi; güvenlik danışmanında yeni bulgu yok. Önceden bulunan [Auth parola sızıntısı koruması uyarısı](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) aynı kaldı.

Canlı dağıtım **dpl_2ASSy2NBpA9dLjm4XDtwbwroy615** (`gerzoglu-varyant-3-9ykcnpoaz-blaixs-4009s-projects.vercel.app`), doğru Vercel projesinde production ortamında hazırlanıp `gerzoglu.com` alan adına promote edildi. Hazırlanan admin JS/HTML ve canlı JS/HTML/CSS kaynakla eşleşti. Cloud yapılandırması hazır, localPreview kapalı, Projeler sayfası 200.

Gerçek canlı oturumda Arşiv → Sil penceresi açıldı; yanlış adla düğmenin kapalı, doğru adla açık olduğu görüldü ve **Vazgeç** ile kapatıldı. Kullanıcının **İşmen Apt** kaydı silinmedi: arşivde, sürüm 4, iki medya kaydı ve bir yayın geçmişi korunuyor. 27 yayındaki proje, 1 arşiv projesi, 28 adres rezervasyonu ve sıfır silinmiş adres doğrulandı. Gerçek kullanıcı kaydıyla başarılı silme denenmedi; bu yol izole SQL/HTTP/UI testlerinde doğrulandı. GitHub main, yerel kaynak ve belgeler eşitlendi.

## Yayın geçmişi: Üç adımlı proje düzenleme

Proje düzenleyicisi **Proje Bilgileri → Görseller → Ek Bilgiler → Taslağı kaydet** olarak sıralandı. İlk iki adımda kayıt düğmesi yok. Zorunlu bilgiler, tarihler/sayısal sınırlar, kapak ve tamamlanan görsel yüklemeleri kontrol edilir. Kısmi ek bilgi satırı son kaydı engeller. Sekme tıklaması, Enter ve Ctrl+S aynı kurallara uyar. Önceki adım değişirse o adım ve sonrakiler yeniden doğrulanır. Önizleme/yayın yalnız son adımdaki başarılı açık kayıttan sonra açılır; otomatik kaydetme yoluyla adım atlanmaz. Arşivde tüm bölümler salt okunur incelenebilir.

Yeni projede ilk geçiş, imzalı fotoğraf yüklemelerinin bağlanması için yalnız özel bir çalışma kaydı oluşturur. Kullanıcının formu ve kaydedilmemiş işareti korunur; son kayıt yine gerekir. Sürüm çakışmaları veri ezmez. Veritabanı şeması, mevcut cloud içerikler, görseller ve ana sayfa ayarları değiştirilmedi.

Kod commit'i **4de3171**. **61/61 test ve build geçti**; bunların 14'ü yeni adım doğrulama ve gerçek kontrol kodu akış testidir. Yerel gerçek tarayıcıda boş alan/kapaksız ilerleme, üç adım geçişi, yarım ek bilgi engeli ve son kayıt sonrası yayın düğmelerinin açılması doğrulandı. Test değişiklikleri yalnız loopback önizlemesinde yapıldı.

Canlı dağıtım **dpl_A6e45eG3Ke8tjYSKyFDHNtnQZDgp** (`gerzoglu-varyant-3-d0qn1w1y3-blaixs-4009s-projects.vercel.app`), doğru `gerzoglu-varyant-3` projesinde production ortamında hazırlanıp `gerzoglu.com` alan adına promote edildi. Hazırlanan ve canlı admin JS, doğrulama modülü ve CSS test edilen kaynakla karşılaştırıldı; birebir eşleşti. `.mjs` JavaScript MIME türünde, cloud admin yapılandırması sağlıklı, yerel istisna kapalı, Projeler sayfası 200. GitHub main eşitlendi. Geçici tarayıcı sekmesi ve 4181 yerel önizleme sunucusu kapatıldı.

## Yayın geçmişi: Örnek iç mekân kartları

Kullanıcı, örnek iç mekân fotoğraflarını içeren kartların tamamını panelden kaldırmayı seçti. Hazır yatak odası, mutfak ve banyo fotoğrafları, değişmez kaynak kimliklerinden tanınarak yönetim galerisinde gizlenir. Projeye özel yüklenen iç mekân görselleri ve diğer kartların açıklama/başlık/tür alanları düzenlenebilir. Görsel sayacı, sıralama okları ve kapak silme sonrası seçim yalnız görünür görselleri kullanır. Ham dizi indeksleri korunur; gizli örnekler kayıt/yayın belgesinden çıkarılmaz. Sitedeki örnek fotoğraflar ve cloud kayıtları değiştirilmedi.

Kod `b22a1e4`, canlı dağıtım `dpl_C2eMErCCtLtjd3FZ1JMMRAdHm7BJ` (`gerzoglu-varyant-3-bhar3qvwi-blaixs-4009s-projects.vercel.app`). 47/47 test ve build geçti. Gerçek kart oluşturucusunda özel iç mekân/görünür komşu/kayıt koruması doğrulandı; staged ve canlı JS kaynakla birebir karşılaştırıldı. Başlangıçtaki 27 belgedeki 78 örnek kartın görünmediği ve belgelerin değişmediği doğrulandı.

## Yayın geçmişi: Otomatik proje adresleri

Proje adresi alanı kullanıcı isteğiyle kaldırıldı. Yeni adresi sunucu bina adından üretir; istemcinin gönderdiği adresi veya detay yolunu kullanmaz. Aynı isimde kayıt varsa `-2`, `-3` gibi ayrı adresler ayrılır. Taslak/arşivli adresler ve eski yönlendirmeler de rezerve kalır. Veritabanının benzersizlik kuralı eşzamanlı istekleri korur; oluşturma işlemi hiçbir kaydı güncellemez veya upsert yapmaz. Bina adı sonradan değiştirilse de eski proje adresi korunur. Şema veya cloud verisine bu değişiklik için yazılmadı.

Uygulama commit'i `c5fd689`; canlı dağıtım `dpl_2GaSgEsp64z4fa3QU9nMrCe4AppH` (`gerzoglu-varyant-3-mslwasxii-blaixs-4009s-projects.vercel.app`). **47/47 test ve build geçti**, sekiz eşzamanlı aynı isimli proje, eski adres koruması, boş/uzun/Türkçe adlar ve istemci adresini yok sayma doğrulandı. Canlı admin JS kaynağı ile aynı; manuel adres alanı yok ve API cloud yapılandırması sağlıklı.

## Yayın geçmişi: Ana sayfa görünümünün sadeleştirilmesi

Kullanıcının isteğiyle **Ana sayfada görünüm** bölümü proje düzenleyicisinden şimdilik kaldırıldı. Mevcut belgelerin `home` değerleri kaydetme/yayın sırasında korunur; yeni projeler kart/slayt seçimi kapalı başlar. Ana sayfa seçimi ve sırası için panelde kontrol yoktur; Projeler listesinin sırası düzenlenebilir. Veritabanı kayıtlarına bu değişiklik için yazılmadı. Kod `4366110`, canlı dağıtım `dpl_7YPCswkDR3QEfKo7hhABe5zupbFk` (`gerzoglu-varyant-3-nsqseld4t-blaixs-4009s-projects.vercel.app`). 40/40 test ve build geçti; canlı admin JavaScript'i kaynakla aynı ve kaldırılan alanları içermiyor.

## İlk CMS yayını ve kapanış kaydı — 14 Ekim 2026 (tarihsel)

Bu bölüm bilgisayar kapatılmadan önce kaydedilen ilk CMS durumudur. Aşağıdaki üç migration, 40 test ve dağıtım kimliği bu tarihe aittir; güncel devam noktası dosyanın başındadır. Parola veya anahtar içermez.

- Asıl kaynak: `C:\Users\Dell\Desktop\Gerz Oğlu\gerzoglu-varyant-3`; GitHub `blaixs-max/gerzoglu-insaat`, dal `main`.
- CMS kodu GitHub'a gönderildi. İlk özellik commit'i `056ad62`, arayüz sonlandırması `bc14252`, fiziksel dosyaların CMS yönlendirmelerini gölgelemesini düzelten commit `038c941`.
- Doğru Vercel projesi `gerzoglu-varyant-3` / `prj_TJQvQ9L6NvWFMuJA1psxeEn0W8Jj`, takım `team_CaYrjZEduUIYQniCVwvSijFp`. Tarihsel `gerzoglu-insaat` projesini kullanmayın. Git deployment kapalıdır.
- Ayrı Supabase Free projesi `gerzoglu-cms`, ref `ibbyoetzgeqbrxyvzidb`, Frankfurt. Ücretli plana geçilmedi. Üç migration uygulandı; 27 yayın projesi, 1 etkin yönetici var. Geçici cloud test projesi ve görselleri temizlendi.
- Yönetici adresi `https://gerzoglu.com/admin`, hesap `info@gerzoglu.com`. Kullanıcının belirlediği parola belgelerde tutulmaz. Parola girişi gerçek Auth servisiyle doğrulandı.
- Son test paketi **40/40 geçti**; yerel telefon/masaüstü arayüz akışları ve gerçek cloud yükleme/yayın/taslak/çakışma/arşiv işlemleri doğrulandı.
- GitHub dış veritabanı kontrolü etkin: `17 */6 * * *`. İlk elle çalışma başarılı: https://github.com/blaixs-max/gerzoglu-insaat/actions/runs/38587790863 . Yalnız public anahtar kullanır.
- Vercel birincil kontrolü: `/api/health`, `37 */6 * * *`, sunucuda özel `CRON_SECRET`. Proje metadata'sında `disabledAt:null` ve son production dağıtımına bağlı doğru görev tanımı doğrulandı. Gerçek cloud sorgusu yapan korumalı kontrol 200 döndü. GitHub 60 günlük hareketsizlik sınırına karşı Vercel bağımsız çalışır. Free planda duraklamama garantisi yoktur.
- Mevcut SMTP bağlantısı EAUTH verdi; e-posta gönderilmedi. Şifre yenileme seçeneği, doğrulanmış özel SMTP ve `CMS_RECOVERY_ENABLED=1` hazır olana kadar kapalıdır. Parola girişi çalışır.

### İlk CMS yayınının kontrolü

İlk yayındaki statik dosya önceliği sorunu `038c941` ile düzeltildi; kaynak HTML ve `data/site-templates.json` korundu. **14 Ekim'deki production:** `dpl_9Gb4KpMkXRYM1YwwRWhXqy5RgULu`, `https://gerzoglu-varyant-3-fsvp2kmet-blaixs-4009s-projects.vercel.app`. Doğru projede hazırlanıp `gerzoglu.com` alan adına promote edildi. Canlı ana sayfa, liste, site haritası ve **27/27 proje HTML'si**, `renderPage` çıktısıyla birebir eşleşti; hepsinde `private, no-store, max-age=0` doğrulandı. Ana hostta yanlış noindex yok. Korumalı gerçek cloud sağlık kontrolü yeni yayında 200 döndü. Yalnız HTTP 200/baseline içerik bu yönlendirmeyi doğrulamaz; `tests/cms-build.test.cjs` artık fiziksel dosya gölgelenmesine karşı kalıcı regresyon kontrolüdür.

Bilgisayarın kapanması cloud yayını, veritabanı veya dış kontrolleri durdurmaz. Yerel test portları 4173/4174 kontrol edildi; dinleyen süreç kalmadı. Sonraki oturumda bu dosyayı ve `ADMIN_GUIDE.md` dosyasını okuyarak devam edin. Kalan bilinen kurulum: geçerli SMTP bilgileri ve şifre yenileme e-posta teslimatı. Kullanıcının istediği yeni özellik veya içerik değişiklikleri ayrıca ele alınır.

Kullanım `ADMIN_GUIDE.md`, erişilebilirlik `ADMIN_AVAILABILITY.md`, SQL `ADMIN_DATABASE.md`, yayın `DEPLOYMENT.md` içindedir. Yerel `.env*`, `.vercel`, `.cache` dosyaları özeldir ve Git dışında kalır. Docker kullanmayın; veritabanı testleri PGlite ile çalışır.
