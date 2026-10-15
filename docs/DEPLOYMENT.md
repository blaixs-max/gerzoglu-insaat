# Kaynak eşitleme ve yayın

Güncelleme tarihi: **15 Ekim 2026**, Türkiye saati (Europe/Istanbul). Bu dosya kaynak ve yayın sürecini açıklar. Güncel durum ve tarihli yayın kanıtlarının ana kaydı [WORK_STATUS.md](WORK_STATUS.md), kaynak eşitleme kaydı [SOURCE_SYNC.md](SOURCE_SYNC.md) dosyasıdır.

## Doğrulanan hedef

| Alan | Değer |
|---|---|
| Yerel kaynak dizini | `C:\Users\Dell\Desktop\Gerz Oğlu\gerzoglu-varyant-3` |
| GitHub | `https://github.com/blaixs-max/gerzoglu-insaat` |
| Canlı alan adı | `https://gerzoglu.com` |
| Vercel proje adı | `gerzoglu-varyant-3` |
| Vercel proje kimliği | `prj_TJQvQ9L6NvWFMuJA1psxeEn0W8Jj` |
| Vercel takım kimliği | `team_CaYrjZEduUIYQniCVwvSijFp` |
| Güncel production dağıtımı | `dpl_GHPG6pHrJooEAm9ZyVTNxNuk13Q8` |
| Dağıtım adresi | `gerzoglu-varyant-3-ekui35f27-blaixs-4009s-projects.vercel.app` |
| Yayımlanan uygulama commit'i | `8723a83` |
| Dağıtım kaynağı / durumu | `cli` / `READY` |
| Yayın tarihi | 15 Ekim 2026 |

15 Ekim akşam eşitlemesinde canlı alan adının bu `READY` production dağıtımına bağlı olduğu yeniden doğrulandı. Canlı mesaj/metin ve görsel karşılaştırmaları, 27 proje bağlantısı ve 22 soruluk rehber kontrolü başarılı; **74/74 test ve build yeniden geçti**. Ayrıntılı denetim kaydı [WORK_STATUS.md](WORK_STATUS.md) içindedir.

Bu kimlikler erişim parolası değildir; yanlış projeye yayın yapılmasını önlemek için hedef kontrolünde kullanılır. Orijinal/V2 Vercel projeleri farklıdır. CLI bağlantısını başka bir projeye çevirmeyin.

## Kaynakların eşit tutulması

Canlı Varyant 3 yerelden CLI ile yayımlanır. 14 Ekim'deki ilk denetimin başında GitHub `main`, 4 Ekim tarihli eski sürümdeydi; eşitlemeyle bu fark giderildi ve geçmişler korundu. Tarihsel `codex/gerzoglu-version-2` dalı güncel yayın kaynağı değildir. Sonraki kaynak ve belge çalışmaları asıl yerel dizin ile GitHub `main` üzerinden sürdürülür.

Eşitlemede güncel yerel site dosyaları esas alınır, iki deponun önceki geçmişleri korunur. Üzerine zorla yazma (`push --force`), kaynak dosyaları silerek eski GitHub kopyasına dönme veya yalnız canlı HTML'yi indirip tam kaynak sayma yöntemleri kullanılmaz. Canlı çıktı; sunucu kaynakları, testler, ortam değişkenleri ve dokümanların tamamını içermez.

Günlük çalışma akışı:

1. Yerel değişiklikleri ve uzak dalı kontrol edin; daha yeni değişiklikleri kaybetmeden birleştirin.
2. Kaynak dosyaları, gerekli görseller ve ilgili dokümanları birlikte güncelleyin.
3. `npm test` ve `npm run build` çalıştırın; değişen ekranları tarayıcıda kontrol edin.
4. Yalnız incelenen dosyaları commit edin ve GitHub'a gönderin. Yerel `HEAD` ile uzak dalın aynı commit'e ulaştığını doğrulayın.
5. Production değişikliği isteniyorsa aşağıdaki yayın sürecini ayrıca uygulayın.

14 Ekim Vercel API denetiminde güncel `gerzoglu-varyant-3` projesinin Git bağlantısı olmadığı, eski `gerzoglu-insaat` projesinin ise bu GitHub deposunun `main` dalına bağlı olduğu görüldü. Eski projenin kimliği `prj_GhyDBKAYEXQzyVuuQwgpOscOKctv`'dir ve ana alan adının yayın hedefi değildir. Kaynak senkronunun bu eski projede otomatik yayın başlatmaması için `vercel.json` içinde `git.deploymentEnabled: false` tanımlandı. Bu ilk eşitlemede production dağıtımı ve alan adı atamaları değiştirilmedi; sonraki onaylı yayınlar aşağıdaki süreçle yapıldı.

GitHub'a push yapılması production yayını değildir. Gelecekte otomatik yayın istenirse önce eski ve güncel Vercel proje bağlantıları doğru hedefe göre düzenlenmeli, sonra Git dağıtımı etkinleştirilmeli ve bu doküman güncellenmelidir. Git kaynak eşitlemesi için mevcut CLI yayınını yeniden oluşturmak gerekmez.

## Kurulum ve çıktı

`package.json`, Node.js 24.x, npm, Nodemailer ve şu komutları tanımlar:

```sh
npm ci
npm test
npm run build
```

Derlemeden sonra `npm run preview` yerel statik çıktıyı ve CMS/iletişim işlevlerini loopback üzerinde sunar. `npm run verify:live` tarihsel statik dosya karşılaştırma aracıdır; yalnız GET istekleri kullanır. CMS HTML'si sunucuda üretilir; statik byte eşitliği bu yayının doğruluğu için tek başına yeterli değildir. İçerik, yönlendirmeler, gerçek 404 ve panel akışları ayrıca denetlenir. Bu kontroller API'nin e-posta teslimatını test etmez.

Vercel ayarları `vercel.json` içindedir: `buildCommand: npm run build`, `outputDirectory: dist`, `framework: null`. Build, sabitlenmiş Supabase tarayıcı istemcisini esbuild ile yerel `assets/vendor/supabase.mjs` dosyasına paketler. Yalnız `admin.html`, `404.html`, `robots.txt` ve `assets/` statik çıktıya alınır. Yönetilen site/proje HTML'si, `sitemap.xml` ve `llms.txt` CMS işlevinden sunulur; bunları fiziksel çıktıya kopyalamak Vercel yönlendirmelerini gölgeleyebilir. API, `lib/`, `data/` ve ortam dosyaları statik olarak sunulmaz. Vercel CMS işlevlerine gereken kodu ve JSON şablonlarını ayrıca paketler. İletişim işlevinin azami süresi 45 saniyedir.

`dist/` yeniden oluşturulabilir çıktıdır. Kaynakta yapılmayan bir değişikliği yalnız `dist/` içinde düzeltmek sonraki build'de kaybolur. `.vercel/`, gerçek `.env*`, `node_modules/`, `.cache/` ve yerel çıktılar Git'e eklenmez; yalnız değersiz `.env.example` belgelenen istisnadır. `output/` altındaki PDF/PowerPoint teslimleri Git ve Vercel yüklemesinden dışlanır. HTML şablonu değiştiğinde `node scripts/import-projects.cjs` ile sunucunun kullandığı `data/site-templates.json` yenilenir ve farkı incelenir. Bu işlem cloud içeriklerini değiştirmez. Yedekleri ve ham kullanıcı belgelerini yayın paketinden ayrı tutun.

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

**Bilinen eksik:** Aynı gün ayrı SMTP bağlantı doğrulaması `EAUTH` döndürdü. Geçerli özel SMTP ve gerçek teslimat doğrulanana kadar yönetici parola kurtarma seçeneği kapalı kalır; yalnız ayarların mevcut olması çalıştığını kanıtlamaz. Kurtarmanın açılması ayrıca `CMS_RECOVERY_ENABLED=1` gerektirir. Parola ile yönetici girişi bu e-posta eksikliğinden ayrı çalışır.

Yapılandırma eksikse GET `available:false`, geçerli POST ise 503 döndürür; form gönderilmediğini söyler ve telefon/WhatsApp seçenekleri sunar. Başarılı API yanıtı yalnız sabit alıcı SMTP sunucusunca kabul edildiğinde oluşur. SMTP kabulü, gelen kutusuna teslim garantisi değildir. Testler gerçek e-posta göndermeden doğrulama, sabit alıcı, TLS, hız sınırı ve başarısızlık durumlarını denetler.

## Alan adı, SEO ve izinler

`/index.html` kalıcı olarak `/` yoluna yönlenir. Projelerin eski üç bağlantısı için kalıcı yönlendirmeler `vercel.json` içinde korunur. Canonical ve paylaşım adresleri ana `https://gerzoglu.com` hostunu kullanır. Ana host dışındaki adresler ile API/404 yolları `noindex, nofollow` alır. `robots.txt` API'yi dışlar, diğer sayfalara izin verir ve site haritasını belirtir.

www/HTTP yönlendirmeleri Vercel alan adı ayarlarıyla birlikte kontrol edilmelidir. Search Console mülkiyeti ve site haritası gönderimi doğrulanmadıkça tamamlanmış sayılmaz. Ölçüm sağlayıcısı eklenmesi, mevcut `window.GerzogluMeasurement` izin arayüzü ve gizlilik metniyle birlikte ele alınır.

## Canlı Admin/CMS ve cloud kurulumu

Proje yönetimi 14 Ekim 2026'da canlıya alınmıştır; sonraki panel iyileştirmeleri ve arşivden kalıcı silme de yayındadır. Ayrı `gerzoglu-cms` Supabase projesi **`ibbyoetzgeqbrxyvzidb`**, Frankfurt bölgesinde Free planla kurulmuştur. Başka uygulamanın veritabanına bağlanılmaz. İlk 27 projenin özgün adresleri, görselleri, ek bilgileri ve başlangıç yayın geçmişleri aktarılmıştır. İlk yönetici `info@gerzoglu.com` hesabı oluşturulmuş ve Auth parola girişi doğrulanmıştır; parola depoda veya bu belgede bulunmaz.

Uygulanmış dört migration'ın kaynakları `supabase/migrations/` altındadır: `20261014133155_admin_cms.sql`, `20261014141742_cms_preserve_imported_placeholder.sql`, `20261014143738_cms_non_retryable_version_conflicts.sql` ve `20261014200125_cms_archived_project_deletion.sql`. Sonuncusu cloud'da `20261015072308` sürümüyle uygulanmıştır. İsim/sürüm eşlemesi [ADMIN_DATABASE.md](ADMIN_DATABASE.md) ve tarihli [WORK_STATUS.md](WORK_STATUS.md) kaydından kontrol edilir. Mevcut veritabanına ilk aktarımı yeniden uygulamayın; `data/projects.json` canlı katalog değildir.

Canlı [yönetim paneli](https://gerzoglu.com/admin), `/admin` → `/admin.html` yönlendirmesiyle açılır ve `/api/admin/*` yollarından yetkili CMS işlevini kullanır. Proje durumları tek seçimdir; taslak ve yayın belgeleri ayrıdır. `api/site.js` yayın kataloğundan tam HTML, ortak sayaçlar ve keşif belgelerini üretir. Yeni proje veya bilgi değişikliği açık yayın sonrasında görünür; Vercel dağıtımı gerekmez. Kod, şablon veya sunucu ortamı değişiklikleri için gerekir. Cloud bağlantı hatası eski statik içerikle gizlenmez; 503 döner.

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

### CMS değişikliklerinde yayın doğrulaması

İlk cloud aktarımı tamamlanmıştır. Aşağıdaki akış sonraki kod yayınlarında değişen özelliğe göre uygulanır; gerçek kullanıcı projeleri test amacıyla değiştirilmez veya silinmez. Kullanıcı yalnız kaynak/doküman eşitlemesi istediğinde yeni production dağıtımı gerekmez.

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

Kod Git'te tutulur; cloud proje verisi ve iki Storage bucket'ı ayrıca yedeklenmelidir. Yayın geçmişi bağımsız yedek değildir. Free planın otomatik veritabanı yedeği varmış gibi işlem yapılmaz.

## Güncel yayın ve tarihsel ilk CMS yayını

15 Ekim 2026 tarihli güncel uygulama commit'i **`8723a83`**, production **`dpl_GHPG6pHrJooEAm9ZyVTNxNuk13Q8`**. Yönetim Kurulu Başkanından bölümü bu sürümle yayımlandı; 22 soruluk malik rehberi ve mevcut CMS özellikleri korundu. **74/74 test ve build geçti**; değişen bölümün masaüstü/mobil görünümü, canlı metni, CSS ve görsel karmaları doğrulandı. 27 proje bağlantısı korundu. Ayrıntılı sonuçlar ve önceki sürümler [WORK_STATUS.md](WORK_STATUS.md) içindedir. Daha yeni yalnız doküman commit'leri production uygulama kodunun farklı olduğu anlamına gelmez.

Aşağıdaki **14 Ekim ilk CMS yayını** kaydı tarihsel kanıttır; buradaki dağıtım ve test sayısı güncel sürüm olarak kullanılmaz.

Uygulama commit'i `038c941`, production `dpl_9Gb4KpMkXRYM1YwwRWhXqy5RgULu` doğru `gerzoglu-varyant-3` projesinde `gerzoglu.com` alan adına promote edildi. Fiziksel HTML dosyalarının CMS rewrite'larını gölgelemesi build'de giderildi. Canlı 27/27 proje ve ana sayfa/liste/sitemap HTML'leri `renderPage` çıktısıyla birebir karşılaştırıldı; `no-store` ve doğru SEO başlıkları doğrulandı. O sürümde 40/40 test geçti. Cron metadata'sının o dağıtıma bağlı olduğu ve `disabledAt:null` doğrulandı; korumalı cloud kontrolü 200 döndü. [İlk GitHub kontrolü](https://github.com/blaixs-max/gerzoglu-insaat/actions/runs/38587790863) başarılıydı. SMTP doğrulaması `EAUTH` döndü; gönderim yapılmadı ve e-posta kurtarma etkinleştirilmedi.

