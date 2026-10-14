# Kaynak eşitleme ve yayın

Denetim tarihi: **14 Ekim 2026**, Türkiye saati (Europe/Istanbul). Bu dosya kaynak ve yayın sürecini açıklar; son eşitlemenin sonucu ayrıca Git geçmişi ve eşitleme raporundan doğrulanır.

## Doğrulanan hedef

| Alan | Değer |
|---|---|
| Yerel kaynak dizini | `C:\Users\Dell\Desktop\Gerz Oğlu\gerzoglu-varyant-3` |
| GitHub | `https://github.com/blaixs-max/gerzoglu-insaat` |
| Canlı alan adı | `https://gerzoglu.com` |
| Vercel proje adı | `gerzoglu-varyant-3` |
| Vercel proje kimliği | `prj_TJQvQ9L6NvWFMuJA1psxeEn0W8Jj` |
| Vercel takım kimliği | `team_CaYrjZEduUIYQniCVwvSijFp` |
| Denetimdeki production dağıtımı | `dpl_5hyXm3Vf3DAKVP56fiL49NTocpZC` |
| Dağıtım kaynağı / durumu | `cli` / `READY` |
| Dağıtım oluşturulma zamanı | 12 Ekim 2026, 21:07 Türkiye saati |

Bu kimlikler erişim parolası değildir; yanlış projeye yayın yapılmasını önlemek için hedef kontrolünde kullanılır. Orijinal/V2 Vercel projeleri farklıdır. CLI bağlantısını başka bir projeye çevirmeyin.

## Kaynakların eşit tutulması

Canlı Varyant 3 yerelden CLI ile yayımlanmıştır. 14 Ekim denetimi başında GitHub `main`, 4 Ekim tarihli eski sürümdeydi. `codex/gerzoglu-version-2` dalı daha yeni bir kaynak değildir; `main` üzerindeki son commit'in geri aldığı tasarım commit'ine işaret eder.

Eşitlemede güncel yerel site dosyaları esas alınır, iki deponun önceki geçmişleri korunur. Üzerine zorla yazma (`push --force`), kaynak dosyaları silerek eski GitHub kopyasına dönme veya yalnız canlı HTML'yi indirip tam kaynak sayma yöntemleri kullanılmaz. Canlı çıktı; sunucu kaynakları, testler, ortam değişkenleri ve dokümanların tamamını içermez.

Günlük çalışma akışı:

1. Yerel değişiklikleri ve uzak dalı kontrol edin; daha yeni değişiklikleri kaybetmeden birleştirin.
2. Kaynak dosyaları, gerekli görseller ve ilgili dokümanları birlikte güncelleyin.
3. `npm test` ve `npm run build` çalıştırın; değişen ekranları tarayıcıda kontrol edin.
4. Yalnız incelenen dosyaları commit edin ve GitHub'a gönderin. Yerel `HEAD` ile uzak dalın aynı commit'e ulaştığını doğrulayın.
5. Production değişikliği isteniyorsa aşağıdaki yayın sürecini ayrıca uygulayın.

Vercel API denetiminde güncel `gerzoglu-varyant-3` projesinin Git bağlantısı olmadığı, eski `gerzoglu-insaat` projesinin ise bu GitHub deposunun `main` dalına bağlı olduğu görüldü. Eski projenin kimliği `prj_GhyDBKAYEXQzyVuuQwgpOscOKctv`'dir ve ana alan adının yayın hedefi değildir. Kaynak senkronunun bu eski projede otomatik yayın başlatmaması için `vercel.json` içinde `git.deploymentEnabled: false` tanımlandı. Mevcut production dağıtımı ve alan adı atamaları değiştirilmedi.

GitHub'a push yapılması production yayını değildir. Gelecekte otomatik yayın istenirse önce eski ve güncel Vercel proje bağlantıları doğru hedefe göre düzenlenmeli, sonra Git dağıtımı etkinleştirilmeli ve bu doküman güncellenmelidir. Git kaynak eşitlemesi için mevcut CLI yayınını yeniden oluşturmak gerekmez.

## Kurulum ve çıktı

`package.json`, Node.js 24.x, npm, Nodemailer ve şu komutları tanımlar:

```sh
npm ci
npm test
npm run build
```

Derlemeden sonra `npm run preview` yerel `dist/` önizlemesini başlatır. `npm run verify:live` tüm oluşturulan herkese açık dosyaları `https://gerzoglu.com` ile karşılaştırır; yalnız GET istekleri kullanır. `/index.html` için `/` kontrol edilir; gerçek 404 durumu ve tanımlı yönlendirmeler dikkate alınır. Bu kontrol API'nin e-posta teslimatını test etmez.

Vercel ayarları `vercel.json` içindedir: `buildCommand: npm run build`, `outputDirectory: dist`, `framework: null`. Build, sabitlenmiş Supabase tarayıcı istemcisini esbuild ile yerel `assets/vendor/supabase.mjs` dosyasına paketler. Kök HTML, `proje/*.html`, `assets/`, `robots.txt`, `sitemap.xml` ve `llms.txt` statik çıktıya alınır; API, `lib/`, `data/` ve ortam dosyaları burada sunulmaz. Vercel CMS işlevlerine gereken kodu ve JSON şablonlarını ayrıca paketler. İletişim işlevinin azami süresi 45 saniyedir.

`dist/` yeniden oluşturulabilir çıktıdır. Kaynakta yapılmayan bir değişikliği yalnız `dist/` içinde düzeltmek sonraki build'de kaybolur. `.vercel/`, gerçek `.env*`, `node_modules/`, `.cache/` ve yerel çıktılar Git'e eklenmez; yalnız değersiz `.env.example` belgelenen istisnadır. HTML şablonu değiştiğinde `node scripts/import-projects.cjs` ile sunucunun kullandığı `data/site-templates.json` yenilenir ve farkı incelenir. Bu işlem cloud içeriklerini değiştirmez. Yedekleri ve ham kullanıcı belgelerini yayın paketinden ayrı tutun.

## Production yayını

Yeni production yayını yalnız bu işlem istendiğinde yapılır. Önce doğru yerel dizini, takım/proje kimliğini, yayımlanacak commit'i ve production ortamını doğrulayın. Kimlik bilgileri/tokens CLI argümanlarına, dokümanlara veya sohbet çıktısına yazılmaz.

Vercel CLI ile gözden geçirilmiş sürüm önce production ayarlarıyla, alan adları taşınmadan hazırlanabilir:

```sh
vercel deploy --prod --skip-domain
```

Oluşan production dağıtımında gerekli kontroller tamamlanınca aynı dağıtım, `vercel promote <doğrulanmış-dağıtım-adresi-veya-kimliği>` ile canlı alan adına alınır. `<...>` gerçek doğrulanmış sonuçla değiştirilir. GitHub'a kaynak eşitlemesi yapıldığı için production'ı yeniden dağıtmak zorunlu değildir.

Yayın doğrulamasında ana sayfa, projeler ve değişen proje sayfaları; logo, mobil menü, görseller, eski URL yönlendirmeleri, 404, çerez tercihleri ve iletişim hizmeti kontrol edilir. Ana hostta SEO başlıkları, preview hostta `noindex` ve dosya yolları ayrıca incelenir. Yayın kimliği, test sonucu ve yayının bağlı olduğu commit kaydedilir. İletişim testi gerekiyorsa gerçek gönderim ile alıcı kutusu kontrolü ayrı ve açıkça belirtilir.

## E-posta ve form davranışı

`api/contact.js`, Nodemailer ile `lib/contact.cjs` içindeki doğrulama/gönderim işlevini kullanır. Alıcı kodda sabit **`info@gerzoglu.com`** adresidir; ziyaretçi alıcıyı değiştiremez. JSON boyut sınırı 16 KiB'dir. İzinli kaynak kontrolü, alan doğrulaması, KVKK onayı, honeypot, TLS ve işlev örneği başına 15 dakikada 5 gönderim sınırı uygulanır. Bu örnek başına sınır, merkezi dağıtık bir hız sınırı değildir. Form içeriği veya SMTP kimlik bilgileri günlüklenmez.

| Sunucu değişkeni | Anlamı |
|---|---|
| `SMTP_HOST` | Aktif sağlayıcının verdiği SMTP sunucusu |
| `SMTP_PORT` | 465 (TLS) veya 587 (STARTTLS); varsayılan 587 |
| `SMTP_USER` | Yetkili gönderici hesabı |
| `SMTP_PASS` | Sağlayıcının izin verdiği gönderim/uygulama parolası |
| `SMTP_FROM` | Onaylı gönderici; varsayılan `info@gerzoglu.com` |

Değerler güvenli sağlayıcı/Vercel panelinden yönetilir, Git'e eklenmez. GoDaddy ürününün Microsoft 365, Professional Email veya eski Workspace olması ayarları değiştirir; sağlayıcıya göre doğrulayın. OAuth gerekiyorsa uyumlu bağlantı ayrıca kurulmalıdır; mevcut kod parolalı SMTP yapılandırması kullanır. MX/SPF/DKIM ve gönderici doğrulaması sağlayıcıda kontrol edilir. Vercel ortam değişkeni değişiklikleri yeni bir dağıtımda etkinleşir.

**14 Ekim 2026'da yapılan canlı, salt okunur kontrol:** `GET https://gerzoglu.com/api/contact` → HTTP 200, `{"available":true}`, `Cache-Control: no-store`. `available` yalnız kodun beklediği SMTP değişkenlerinin mevcut ve biçimsel olarak uygun olduğunu bildirir; SMTP sunucusuna bağlanmaz ve gerçek teslimatı kanıtlamaz. Bu denetimde mesaj gönderilmedi ve gelen kutusu doğrulanmadı.

Yapılandırma eksikse GET `available:false`, geçerli POST ise 503 döndürür; form gönderilmediğini söyler ve telefon/WhatsApp seçenekleri sunar. Başarılı API yanıtı yalnız sabit alıcı SMTP sunucusunca kabul edildiğinde oluşur. SMTP kabulü, gelen kutusuna teslim garantisi değildir. Testler gerçek e-posta göndermeden doğrulama, sabit alıcı, TLS, hız sınırı ve başarısızlık durumlarını denetler.

## Alan adı, SEO ve izinler

`/index.html` kalıcı olarak `/` yoluna yönlenir. Projelerin eski üç bağlantısı için kalıcı yönlendirmeler `vercel.json` içinde korunur. Canonical ve paylaşım adresleri ana `https://gerzoglu.com` hostunu kullanır. Ana host dışındaki adresler ile API/404 yolları `noindex, nofollow` alır. `robots.txt` API'yi dışlar, diğer sayfalara izin verir ve site haritasını belirtir.

www/HTTP yönlendirmeleri Vercel alan adı ayarlarıyla birlikte kontrol edilmelidir. Search Console mülkiyeti ve site haritası gönderimi doğrulanmadıkça tamamlanmış sayılmaz. Ölçüm sağlayıcısı eklenmesi, mevcut `window.GerzogluMeasurement` izin arayüzü ve gizlilik metniyle birlikte ele alınır.

## Admin/CMS kaynak ve cloud kurulumu

14 Ekim 2026 itibarıyla proje yönetimi kaynakta uygulanmıştır. Ayrı `gerzoglu-cms` Supabase projesi **`ibbyoetzgeqbrxyvzidb`**, Frankfurt bölgesinde Free planla kurulmuştur. Başka uygulamanın veritabanına bağlanılmaz. İlk 27 projenin özgün adresleri, görselleri, ek bilgileri ve başlangıç yayın geçmişleri aktarılmıştır. İlk yönetici `info@gerzoglu.com` hesabı oluşturulmuş ve Auth parola girişi doğrulanmıştır; parola depoda veya bu belgede bulunmaz.

Bu kayıt yeni CMS özelliğinin production yayını tamamlandı anlamına gelmez. Son uçtan uca sonuçlar ve yeni dağıtım kimliği ayrıca doğrulanıp kaydedilir. Üstteki 12 Ekim dağıtım kaydı önceki production sürümünü tanımlar.

Yayın sonrasındaki `/admin` → `/admin.html` paneli, `/api/admin/*` yollarından yetkili CMS işlevini kullanır. Proje durumları tek seçimdir; taslak ve yayın belgeleri ayrıdır. `api/site.js` yayın kataloğundan tam HTML, ortak sayaçlar ve keşif belgelerini üretir. Yeni proje veya bilgi değişikliği için Vercel dağıtımı gerekmez. Kod, şablon veya sunucu ortamı değişiklikleri için gerekir. Cloud bağlantı hatası eski statik içerikle gizlenmez; 503 döner.

`project-media-originals` ve `project-media-variants` bucket'ları özeldir. JPEG/PNG/WebP yüklemeleri 20 MB sınırında doğrulanır; kaynak genişliğini aşmadan WebP türevleri üretilir. Orijinaller halka açılmaz. RLS, yönetici üyeliği, sürüm çatışması ve atomik yayın sözleşmesi [ADMIN_DATABASE.md](ADMIN_DATABASE.md) içindedir. SQL testleri PGlite kullanır, Docker gerekmez.

### CMS ortamı

| Değişken | Hedef ve sınır |
| --- | --- |
| `SUPABASE_URL` | Yalnız doğrulanmış Gerzoğlu proje ref'inin public API adresi |
| `SUPABASE_PUBLISHABLE_KEY` | Public publishable anahtar; `SUPABASE_ANON_KEY` alternatifi desteklenir |
| `SUPABASE_SECRET_KEY` | Yalnız sunucu; `SUPABASE_SERVICE_ROLE_KEY` uyumluluk alternatifi |
| `CRON_SECRET` | Korumalı `/api/health` için rastgele, en az 16 karakterlik sunucu sırrı |
| `CMS_LOCAL_PREVIEW` | Vercel'de tanımlanmaz; yalnız localhost/soket korumalı bağımsız geliştirme modu |

Marketplace'in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` adları desteklenir. Secret/service-role anahtarına hiçbir zaman `NEXT_PUBLIC_` öneki verilmez. `CMS_HEALTH_SECRET` uyumluluk ayarı `CRON_SECRET` üzerine önceliklidir; Vercel Cron kullanılırken boş bırakılır ya da aynı değere ayarlanır. Hiçbir sır GitHub public variables alanına konmaz. Ortam değişiklikleri yeni Vercel dağıtımında etkinleşir.

### İlk CMS yayınının kabul adımları

1. Yerel `HEAD`, GitHub sürümü ve `.vercel/project.json` proje/takımını doğrulayın. İki Vercel projesini karıştırmayın; mevcut `git.deploymentEnabled: false` korunur.
2. `npm ci`, `npm test`, `npm run build` tamamlanmalı. Yerel panelde masaüstü/mobil görünüm, giriş ve form akışı kontrol edilmeli. Yerel mod cloud testinin yerine geçmez.
3. Önce doğru Vercel projesinde önizleme dağıtımı hazırlayın; yetkili giriş, anonim erişim reddi, 27 aktarılan sayfa, taslağın yayını değiştirmemesi, fotoğraf işleme ve açık yayın/geri alma/arşiv akışlarını cloud servislerle doğrulayın. Geçici test projesini yayından kaldırıp katalog tutarlılığını kontrol edin.
4. Production ortamındaki Supabase ref/anahtarları ve `CRON_SECRET` varlığını değerleri çıktılamadan doğrulayın. Kayıt/signup kapalı ve iki bucket özel kalmalı. Güvenlik danışmanı ve kritik testler geçmeli.
5. Gözden geçirilen commit için doğru production dağıtımını alan adlarını taşımadan hazırlayın. Kontroller bitince doğrulanmış dağıtımı canonical `gerzoglu.com` alanına alın; dağıtım kimliği, commit ve test sonucu kaydedilsin.
6. Normal ana hostta `/admin`, proje sayfaları, görseller, filtreler, sayaçlar, eski yönlendirmeler, gerçek 404 ve SEO kontrol edilsin. `/api/health` sırsız isteği reddetmeli, doğru sunucu sırrıyla gerçek cloud kontrolü başarılı olmalı. Sır URL'ye veya komut argümanına yazılmaz.
7. Vercel Cron ve GitHub yedek kontrolünün etkinliği ayrı doğrulansın; yalnız dosya eklemek başarılı çalışma kanıtı değildir. Son kaynak/dokümanlar GitHub ile eşitlensin.

`npm run verify:live` tarihsel statik dosya karşılaştırmasıdır. CMS HTML'si yeniden üretildiği için byte farkları tek başına gerileme veya yayın başarısı sayılmaz; işlevsel ve içerik karşılaştırması esastır.

### Erişilebilirlik ve yedek

Mevcut Vercel takımının Pro planı üzerinde `/api/health` için **UTC `37 */6 * * *`** korumalı cron kullanılır. Supabase Free planı yükseltilmez. GitHub Actions **UTC `17 */6 * * *`** ile ayrı public REST okuması yapan yedek kontroldür. GitHub varsayılan dal, zamanlama gecikmesi ve herkese açık depolardaki 60 gün etkinlik sınırına tabidir. İki kontrol de duraklamama veya kesintisiz erişim garantisi vermez. Kurulum, bildirim ve kota adımları [ADMIN_AVAILABILITY.md](ADMIN_AVAILABILITY.md) içindedir.

Kod Git'te tutulur; cloud proje verisi ve iki Storage bucket'ı ayrıca yedeklenir. Yayın geçmişi bağımsız yedek değildir. Free planın otomatik veritabanı yedeği varmış gibi işlem yapılmaz.

## 14 Ekim 2026 tamamlanan CMS yayını

Uygulama commit'i 038c941, production dpl_9Gb4KpMkXRYM1YwwRWhXqy5RgULu doğru gerzoglu-varyant-3 projesinde gerzoglu.com alan adına promote edildi. Fiziksel HTML dosyalarının CMS rewrite'larını gölgelemesi build'de giderildi. Canlı 27/27 proje ve ana sayfa/liste/sitemap HTML'leri renderPage çıktısıyla birebir karşılaştırıldı; no-store ve doğru SEO başlıkları doğrulandı. 40/40 test geçti. Cron metadata'sı son dağıtıma bağlı ve disabledAt null; korumalı cloud kontrolü 200. GitHub kontrolü: https://github.com/blaixs-max/gerzoglu-insaat/actions/runs/38587790863 (başarılı). SMTP doğrulaması EAUTH döndü; gönderim yapılmadı ve e-posta kurtarma henüz etkinleştirilmedi. Güncel devam notu WORK_STATUS.md içindedir.

