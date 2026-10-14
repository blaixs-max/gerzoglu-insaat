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

Vercel ayarları `vercel.json` içindedir: `buildCommand: npm run build`, `outputDirectory: dist`, `framework: null`. `build-site.cjs` yalnız kök HTML dosyaları, `proje/*.html`, `assets/`, `robots.txt`, `sitemap.xml` ve `llms.txt` dosyalarını statik çıktıya alır. Sunucu işlevi `api/contact.js` ve bağımlılığı `lib/contact.cjs`, `dist/` dışında tutulur; Vercel işlev olarak paketler. İletişim işlevinin azami süresi 45 saniyedir.

`dist/` yeniden oluşturulabilir çıktıdır. Kaynakta yapılmayan bir değişikliği yalnız `dist/` içinde düzeltmek sonraki build'de kaybolur. `.vercel/`, `.env*`, `node_modules/` ve yerel çıktılar Git'e eklenmemelidir. Yedekleri ve kullanıcıya ait ham belgeleri yayın paketinden ayrı tutun.

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

## Henüz uygulanmayan admin paneli

İstenen proje ekleme, düzenleme, görsel yükleme, liste sırası ve anında yayınlama özellikleri planlama aşamasındadır. Mevcut kaynakta admin hesabı, proje veritabanı veya CMS yoktur. Bu kaynak eşitlemesi, admin panelinin geliştirildiği ya da production'a çıkarıldığı anlamına gelmez.
