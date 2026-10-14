# CMS erişilebilirliği ve ücretsiz proje aktivitesi

14 Ekim 2026 tarihinde resmi belgeler doğrulanarak hazırlandı. Bu kontrol yalnız düşük aktivite nedeniyle duraklama riskini azaltmaya ve bağlantı arızasını fark etmeye yardımcı olur; Free plan için kesintisiz erişim veya duraklamama garantisi vermez.

## Doğrulanan sınırlar

Supabase, Free projeleri son yedi gündeki düşük kullanıcı veritabanı aktivitesi nedeniyle duraklatabilir. Resmi belgeye göre her gün birkaç gerçek veritabanı isteği genellikle yeterlidir; kesin bir sorgu sayısı taahhüt edilmez. Önbellekten dönen site sayfası veritabanına gitmeyebilir. Bu nedenle kontrol doğrudan yayımlanmış proje tablosunu okur. İçeride çalışan `pg_cron` yerine dışarıdan GitHub Actions kullanılır; veritabanının içindeki işin duraklamış veritabanını uyandırabileceği varsayılmaz. [Supabase Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

GitHub zamanlanmış işleri yoğunlukta gecikebilir veya atlayabilir. İş akışı varsayılan dalda bulunmalıdır. Herkese açık depolarda 60 gün depo etkinliği olmazsa zamanlanmış işler otomatik kapatılabilir. Kontrol bu sınırları ortadan kaldırmaz ve depo etkinliği oluşturmak için yapay commit atmaz. [GitHub schedule belgeleri](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Birincil kontrol: Vercel Cron

Mevcut Vercel takımının Pro planı kullanılır; Supabase Free planı bu kontrol için yükseltilmez. `vercel.json` içindeki cron, `GET /api/health` yolunu UTC **00:37, 06:37, 12:37, 18:37** saatlerinde çağıracak şekilde yapılandırılır (`37 */6 * * *`). İstanbul saatiyle **03:37, 09:37, 15:37, 21:37**. Vercel cron yalnız production dağıtımında etkinleşir; önizleme/local çalışması zamanlayıcının çalıştığını kanıtlamaz. [Vercel Cron belgeleri](https://vercel.com/docs/cron-jobs).

Production ortamında rastgele en az 16 karakterlik **`CRON_SECRET`** bulunmalıdır. Vercel bu değeri `Authorization: Bearer ...` başlığıyla gönderir; URL sorgusuna veya public yapılandırmaya yazılmaz. Endpoint gerçek Supabase kataloğunu okur, statik/yerel sonucu sağlıklı kabul etmez. Bu dış sorgu GitHub zamanlayıcısının 60 gün kısıtına bağlı değildir. Vercel Cron kaydı ve son işlev çalışmaları panelden izlenir; yayın sonrasında doğru sırla elle ve ilk zamanlanmış çalışmayla doğrulanır. Endpoint'e ulaşmak veritabanı sonucunu kontrol etmeden başarı sayılmaz.

`CMS_HEALTH_SECRET` uyumluluk ayarı varsa kodda `CRON_SECRET` üzerine önceliklidir. Vercel Cron kullanılırken **unset** bırakılır veya aynı değerde tutulur; iki farklı sır tanımlanmaz. Gizli değeri değiştirmek yeni dağıtım gerektirir. Başarısız endpoint 503 döndürür; otomatik proje restore veya ücretli plana geçiş yapmaz.

## Yedek dış kontrol: GitHub Actions

`.github/workflows/cms-health.yml`, birincil Vercel kontrolünden ayrı altı saatte bir 17. dakikada çalışır: UTC 00:17, 06:17, 12:17, 18:17; İstanbul saatiyle 03:17, 09:17, 15:17, 21:17. Aynı kontrol Actions ekranından elle de başlatılabilir. Varsayılan dalda birleştirme, variables etkinleştirme ve başarılı manuel çalışma ayrıca doğrulanmalıdır.

İş `scripts/check-cms-health.cjs` ile doğrudan Supabase REST API'sindeki `cms_public_projects?select=id&limit=1` sorgusunu çalıştırır. Boş ama sağlıklı bir katalog da başarılı sayılır. Uygulamanın statik çıktısı veya yerel veri dosyası başarılı kontrol yerine geçmez. İstek önbellek kullanımını kapatır, yönlendirmeyi reddeder, 15 saniyede zaman aşımına uğrar. Geçici bağlantı/sunucu hataları en fazla üç kez denenir; yetki, yapılandırma ve bozuk yanıt hataları anında başarısız olur.

Gerekli **GitHub repository variables**:

| Değişken | İçerik |
| --- | --- |
| `SUPABASE_URL` | Yalnız Gerzoğlu'na ayrılmış Supabase projesinin HTTPS kök adresi |
| `SUPABASE_PUBLISHABLE_KEY` | Public publishable veya eski `anon` API anahtarı |
| `CMS_HEALTH_ENABLED` | Kurulum doğrulandıktan sonra tam olarak `true` |

Bu değerler yönetici oturumu veya service-role anahtarı değildir. RLS yalnız yayındaki proje kataloğunun okunmasına izin verir. Script yanlışlıkla `sb_secret_` veya `service_role` JWT verilmesini reddeder. İş akışı depo yazma yetkisi almaz; kurulum, paket yükleme, veritabanı yazma ve otomatik restore yapmaz. Harici Actions sürümleri doğrulanmış commit kimliklerine sabitlenmiştir; çalışma Node.js 24 kullanır.

`CMS_HEALTH_ENABLED` yoksa iş atlanır. Migration, anonim RLS ve doğru proje doğrulanmadan bu değişken etkinleştirilmez. Kaynak dosyayı hazırlamak dış otomasyonu etkinleştirmek anlamına gelmez. Etkinleştirme sonrasında elle bir çalışma başlatılıp yeşil sonuç doğrulanmalıdır. Başarısız işin bildirimi GitHub hesabının Actions bildirim ayarlarına bağlıdır; repository için Actions bildirimleri açık olmalıdır. Bu kurulum başka kişilere e-posta veya mesaj göndermez.

## Korumalı site kontrolü

`GET /api/health`, site fonksiyonu → Supabase bağlantısını ayrıca denetler. `CMS_HEALTH_SECRET` veya bunun yokluğunda `CRON_SECRET` ortam değişkeninde en az 16 karakterlik rastgele bir değer gerekir. İstek `Authorization: Bearer <değer>` başlığını kullanır. Karşılaştırma sabit uzunlukta SHA-256 özetleri üzerinden zamanlama güvenli yapılır; eksik yapılandırma 503, yanlış başlık 401 alır. [Vercel cron güvenlik düzeni](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).

Endpoint `getStore(req).publicCatalog()` üzerinden gerçek cloud sorgusu yapar. Yerel önizleme veya dosya verisiyle 200 dönmez. Veritabanı sorgusu başarılıysa yalnız durum, proje sayısı ve kontrol zamanı döner; hata halinde 503 döner. Yanıt önbelleğe alınmaz; özel proje belgesi, anahtar veya altyapı hata ayrıntısı paylaşılmaz. Endpoint veritabanı sorgusuna on saniye sınır koyar. Hem birincil cron hem gerektiğinde yetkili elle test aynı endpoint'i kullanır.

İstenirse script `CMS_HEALTH_URL=https://gerzoglu.com/api/health` ve aynı `CMS_HEALTH_SECRET` veya `CRON_SECRET` ile endpoint'i denetleyebilir. Bu durumda sır GitHub'da repository **secret** olarak tutulur; public variable'a yazılmaz. Mevcut GitHub yedek akışı doğrudan halka açık Supabase okuması kullandığından bu sırra ihtiyaç duymaz. Vercel cron ayarı `vercel.json` ile, GitHub yedek işi ise workflow/variables ile ayrı etkinleşir.

## Free kota ve yedekleme

14 Ekim 2026'da resmi Free plan **500 MB veritabanı**, **1 GB dosya depolama**, **5 GB çıkış trafiği** ve **5 GB önbellekli çıkış trafiği** içerir. Yeni fotoğrafların orijinalleri ve üretilen WebP boyutları dosya kotasını birlikte tüketir; daha önce kaynak depoda bulunan statik site görselleri, kopyalanmadıkça Supabase Storage yüklemesi sayılmaz. Gerçek kullanım ve güncel marketplace/sağlayıcı sözleşmesi panelden kontrol edilmelidir. [Supabase fiyatlandırması](https://supabase.com/pricing).

Sağlık sorguları kota artırmaz, arızalı Storage'ı düzeltmez veya Free planın sınırlarını kaldırmaz. Free plan otomatik veritabanı yedeği içermez. Veritabanı ve `project-media-originals` / `project-media-variants` bucket'ları ayrı yedeklenmelidir; Git kod kopyası ve uygulama yayın geçmişi bağımsız veri yedeğinin yerine geçmez.

## Arıza durumunda

Önce başarısız Actions kaydı ve Supabase proje durumu incelenir. Ağ, yanlış anahtar, eksik migration, kota veya sağlayıcı arızası duraklamadan ayrı nedenlerdir. Script bunları düzelmiş gibi göstermez. Proje gerçekten duraklamışsa proje sahibi Supabase Dashboard'da `Resume project` ile açar; kontrol yönetim yetkisi alıp kendiliğinden proje başlatmaz. Ücretsiz plan, kota ve sağlayıcı politikaları değişirse ayarlar resmi belgelere göre yeniden değerlendirilir.
