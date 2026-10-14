# Gerzoğlu İnşaat — web sitesi ve proje yönetimi

`https://gerzoglu.com` sitesinin HTML/CSS/JS arayüzü, korumalı proje yönetim paneli ve Vercel Node.js işlevleri. Güncel kaynak, **Gerzoğlu Varyant 3** projesidir.

## Kaynak ve yayın

- Asıl yerel çalışma dizini: `C:\Users\Dell\Desktop\Gerz Oğlu\gerzoglu-varyant-3`
- GitHub deposu: [blaixs-max/gerzoglu-insaat](https://github.com/blaixs-max/gerzoglu-insaat)
- Canlı site: [gerzoglu.com](https://gerzoglu.com/)
- Vercel projesi: `gerzoglu-varyant-3`

14 Ekim 2026 denetiminde canlı dağıtımın Vercel CLI ile yerelden yayımlandığı doğrulandı. Eski GitHub kopyası 4 Ekim'de kalmıştı; eşitlemede güncel yerel kaynak esas alınır ve önceki Git geçmişleri korunur. GitHub'a commit/push yapmak ile yeni production yayını ayrı işlemlerdir. Eski Vercel projesine bağlı Git entegrasyonunun yanlış hedefte yayın yapmaması için `git.deploymentEnabled: false` açıkça tanımlıdır. Dağıtım kimliği, proje doğrulaması ve yayın adımları için [DEPLOYMENT.md](docs/DEPLOYMENT.md), eşitleme kanıtı için [SOURCE_SYNC.md](docs/SOURCE_SYNC.md) dosyasına bakın.

## Dizinler

| Yol | İçerik |
|---|---|
| Kök `*.html` dosyaları | Ana sayfa, kurumsal, projeler, kentsel dönüşüm, iletişim, yasal sayfalar ve 404 |
| `proje/` | Mevcut tasarımın proje detay şablonları; canlı CMS içeriğinin kalıcı deposu değildir |
| `assets/css/`, `assets/js/` | Ortak görünüm, gümüş tema, etkileşimler ve formlar |
| `assets/logo/` | Gümüş Logo 29, diğer logo seçenekleri ve favicon dosyaları |
| `assets/proje/`, `assets/responsive/` | Yerel proje kaynakları ve farklı boyutlardaki WebP görseller |
| `assets/fonts/`, `assets/css/fonts.css` | Yerel fontlar, Türkçe karakter desteği, kaynak ve OFL lisansları |
| `api/contact.js`, `lib/contact.cjs` | Sunucudan sabit `info@gerzoglu.com` alıcısına e-posta gönderimi |
| `tests/contact.test.cjs` | Gerçek e-posta göndermeyen iletişim işlevi testleri |
| `scripts/preview.mjs`, `scripts/verify-live.mjs` | Yerel önizleme ve salt okunur canlı dosya doğrulaması |
| `build-site.cjs`, `vercel.json` | Statik çıktı üretimi, görsel yönlendirmeleri ve yayın yapılandırması |
| `sitemap.xml`, `robots.txt`, `llms.txt` | Site haritası ve okuyucu/arama motoru metaverileri |
| `admin.html`, `assets/admin/` | Yönetici giriş ve proje düzenleme arayüzü |
| `assets/vendor/supabase.mjs` | Build sırasında sabitlenmiş SDK'dan üretilen yerel tarayıcı paketi |
| `api/cms.js`, `lib/cms-model.cjs`, `lib/cms-store.cjs` | Yetki denetimli proje işlemleri, doğrulama ve veri erişimi |
| `api/site.js`, `lib/cms-render.cjs` | Yayın kataloğundan tam HTML, SEO, sayaçlar, konum listesi ve site haritası |
| `api/media.js`, `lib/cms-media.cjs` | Özel orijinaller, doğrulanan görsel türevleri ve yayımlanmış medya erişimi |
| `data/projects.json`, `data/site-templates.json` | İlk aktarım verisi ve sunucuya paketlenen kaynak şablonlar |
| `scripts/import-projects.cjs`, `scripts/seed-cms.cjs` | Deterministik ilk aktarım ve yalnız boş CMS için seed SQL üretimi |
| `supabase/`, `tests/cms-*.test.cjs` | Migration, RLS ve gerçek Postgres motorlu PGlite kontrolleri |
| `api/health.js`, `.github/workflows/cms-health.yml` | Gerçek dış veritabanı bağlantısı kontrolü |

## Yerel kurulum ve kontrol

Node.js **24.x** ve npm kullanılır. Depo kökünde:

```sh
npm ci
npm test
npm run build
```

`npm run build`, tarayıcı Auth/Storage istemcisini `esbuild` ile `assets/vendor/supabase.mjs` dosyasına paketler; harici script CDN kullanılmaz. Ziyaretçiye açık sayfaları ve `assets/` içeriğini üretilmiş `dist/` dizinine kopyalar. API, `lib/`, `data/`, testler, dokümanlar ve ortam dosyaları statik çıktıya kopyalanmaz. Gerekli şablonlar Vercel işlevlerine ayrıca paketlenir. `dist/` ve vendor paketini elle düzenlemeyin. Docker gerekmez; SQL testleri PGlite kullanır.

Derlemeden sonra `npm run preview`, yalnız `http://127.0.0.1:4173` üzerinde statik çıktıyı ve CMS/iletişim işlevlerini sunar. Sunucu kaynaklarını statik dosya olarak sunmaz; `.env.local` veya `.env.cms.local` dosyasını kendiliğinden yüklemez. Gerçek cloud ortamıyla başlatılırsa panel işlemleri gerçek veritabanını etkiler; SMTP tanımlanmışsa form gerçek e-posta gönderebilir. Tam Vercel uyumu için doğru projeye bağlı dizinde `vercel dev` kullanılabilir.

Bağımsız yerel panel denemesi için yeni bir PowerShell oturumunda:

```powershell
$env:CMS_LOCAL_PREVIEW = '1'
npm run preview
```

`http://127.0.0.1:4173/admin` açıldığında **YEREL ÖNİZLEME** rozeti görülmelidir. Veriler ve görseller Git dışındaki `.cache/` içinde tutulur, canlıyı değiştirmez. İşiniz bitince sunucuyu durdurup `Remove-Item Env:CMS_LOCAL_PREVIEW` çalıştırın. İstisna; açık değişken, localhost hostu, gerçek loopback soketi ve `VERCEL` ortamının bulunmaması birlikte sağlanırsa işler. Bu değişken Vercel'e eklenmez. Yerel mod cloud Auth/Storage testinin yerine geçmez.

HTML şablonları değiştiğinde `node scripts/import-projects.cjs` çalıştırıp `data/site-templates.json` farkını inceleyin. Komut ilk aktarım `data/projects.json` dosyasını da yeniden üretir; cloud içeriklerini değiştirmez. Canlı proje bilgileri için CMS kataloğu esas alınır. `seed-cms.cjs --sql` yalnız ilk kurulum içindir; mevcut veriyi yenileme/ezme yöntemi değildir.

`npm run verify:live`, eski statik kaynak eşitlemesinin GET karşılaştırma aracıdır. CMS HTML'si sunucuda yeniden üretildiğinden byte eşitliği, CMS yayınının doğruluğunu tek başına kanıtlamaz. Proje yayını/taslağı/geri alma/görseller ayrıca normal HTTP ve tarayıcı akışında doğrulanır.

## Mevcut görünüm ve içerik

Güncel logo, şeffaf gümüş **Logo 29**'dur. İlk oturum açılışındaki logo yavaşça büyür: yaklaşık 3 saniye görünme ve 1 saniye çıkış. Görselin çözülme süresi başlangıcı etkileyebilir; tıklama animasyonu atlar ve azaltılmış hareket tercihi açılışı devre dışı bırakır.

Görseller `srcset` ve `sizes` ile sunulur. Çoğu görselde 640/1280/1920 piksel; Karabaş Apartmanı'nın düzeltilmiş mevcut bina görselinde kaynak genişliği kadar, 640/1280/1536 piksel seçenek vardır. Kaynak çözünürlüğünü aşan büyütme yapılmamalıdır. Logo, görsel seçimi, oran ve kalite kuralları [ASSETS.md](docs/ASSETS.md) dosyasındadır.

## İletişim ve ölçüm durumu

**14 Ekim 2026 kontrolünde** canlı `GET /api/contact`, HTTP 200 ve `{"available":true}` döndürdü. Bu, gerekli SMTP yapılandırmasının mevcut olduğunu gösterir; sağlayıcı bağlantısının veya gelen kutusuna teslimatın testi değildir. Bu denetimde e-posta gönderilmedi. Önceki dokümandaki “hesap aktif değil / SMTP bilgileri yok” bilgisi artık güncel kabul edilmemelidir.

Formlar gönderim hizmetini kontrol eder; yapılandırma yoksa telefon/WhatsApp seçeneklerini gösterir. Başarı yalnız sabit alıcı SMTP sunucusu tarafından kabul edildiğinde döner. SMTP kabulü, gelen kutusuna teslim garantisi değildir. Ortam değişkenleri ve gerçek teslimat doğrulaması [DEPLOYMENT.md](docs/DEPLOYMENT.md) içinde açıklanır.

Çerez denetleyicisi `window.GerzogluMeasurement` arayüzünü destekler; kaynak kodda etkin bir analiz sağlayıcısı tanımlı değildir. Sağlayıcı etkinleştirildiğinde izin arayüzü ve gizlilik metni gerçek veri kullanımıyla birlikte güncellenmelidir.

Yönetim panelinde proje düzenleme üç adımlıdır: **Proje Bilgileri → Görseller → Ek Bilgiler**. Her adım hatasızsa ilerlenir; **Taslağı kaydet** yalnız son adımdadır. Önizleme ve yayın, tamamlanan son kayıt sonrasında açılır. İlk geçiş, görsel yüklemelerinin bağlanacağı özel bir çalışma kaydı oluşturur; bu kayıt ziyaretçilere açılmaz ve son kaydın yerine geçmez.

## SEO ve proje yönetimi

Canonical, paylaşım ve yapılandırılmış veri adresleri `https://gerzoglu.com` alan adını kullanır. `vercel.json`, ana alan adı dışındaki hostlara `noindex, nofollow` uygular; API ve 404 her hostta kapalıdır. `robots.txt` ana sayfaların taranmasına izin verir. Search Console doğrulaması ve site haritasının gönderilmiş olduğu ayrıca doğrulanmalıdır; indekslenebilir olmak arama sonuçlarında görünme garantisi değildir.

**14 Ekim 2026 itibarıyla admin/CMS kaynak kodu uygulanmış; ayrı `gerzoglu-cms` Supabase projesine (`ibbyoetzgeqbrxyvzidb`, Frankfurt) 27 mevcut proje aktarılmıştır.** İlk yönetici `info@gerzoglu.com` hesabı oluşturulmuş ve parola ile Auth girişi doğrulanmıştır. Bu durum, bütün tarayıcı testleri veya yeni production yayını tamamlandı anlamına gelmez; önizleme ve doğru Vercel hedefine yayın ayrıca doğrulanır. Yönetim adresi yayın sonrasında `https://gerzoglu.com/admin` olacaktır.

Durum yalnızca **Teslim Edildi / Devam Eden Proje / Planlanan Proje / Satıştaki Proje** seçeneklerinden biridir. Taslak/yayında/arşivde bilgisi ayrıdır. Kaydetmek yalnız taslağı değiştirir; açık yayın sonrasında ziyaretçiye yeni belge sunulur. Proje değişikliklerinde yeni dağıtım gerekmez. Sıra okları yayındaki kayıtların yalnız sırasını günceller. İlk kayıttan sonra URL sabittir; arşivlenen proje listelerden çıkar ve 404 döner. Eski 27 URL, aynı adlı farklı projeler, 4 açılış görseli, 8 öne çıkan kart ve ofis/dükkân/showroom/villa bilgileri korunur.

Ana sayfa, liste, ayrıntı, ortak sayaçlar, önceki-sonraki bağlantıları, site haritası ve `llms.txt` tek yayın kataloğundan üretilir. Tarihsel şirket istatistikleri editoryaldir. Cloud yapılandırılmışken bağlantı hatasında eski içeriği güncelmiş gibi göstermek yerine 503 döner. Yetki güncel yönetici tablosundan denetlenir; secret/service-role anahtarı tarayıcıya verilmez. İki görsel bucket'ı özeldir. Kullanım: [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md), sözleşme: [ADMIN_CONTRACT.md](docs/ADMIN_CONTRACT.md), SQL/RLS: [ADMIN_DATABASE.md](docs/ADMIN_DATABASE.md).

## CMS ortamı, fotoğraflar ve işletim

Değersiz örnek [`.env.example`](.env.example) içindedir. Gerçek değerleri Git'e veya komut argümanlarına koymayın.

| Değişken | Kullanım |
| --- | --- |
| `SUPABASE_URL` | Gerzoğlu projesinin public API adresi |
| `SUPABASE_PUBLISHABLE_KEY` | Tarayıcıya verilebilen publishable anahtar; eski `SUPABASE_ANON_KEY` de desteklenir |
| `SUPABASE_SECRET_KEY` | Yalnız sunucu; `SUPABASE_SERVICE_ROLE_KEY` uyumluluk seçeneğidir |
| `CRON_SECRET` | Birincil Vercel Cron `/api/health` kontrolü için en az 16 karakterlik sunucu sırrı; `CMS_HEALTH_SECRET` uyumluluk override'ı varsa unset veya aynı değerde tutulur |
| `CMS_LOCAL_PREVIEW` | Yalnız loopback geliştirme oturumunda `1`; Vercel'e eklenmez |
| `PREVIEW_PORT` | İsteğe bağlı yerel port; varsayılan 4173 |

Marketplace uyumluluğu için `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` okunabilir. Hiçbir secret/service-role anahtarı `NEXT_PUBLIC_` adıyla tanımlanmaz. Ortam ayarı değişikliği yeni dağıtım gerektirir; paneldeki proje değişikliği gerektirmez.

Yeni fotoğraf **JPEG/JPG, PNG veya WebP**, dosya başına en fazla **20 MB** olmalıdır. Gerçek biçim ve piksel sınırı kontrol edilir; hareketli görsel kabul edilmez. Kaynak korunur, EXIF yönü düzeltilir; 640/1280/1920 piksele kadar WebP türevleri kaynak genişliğini aşmadan üretilir. Düşük çözünürlüklü fotoğraf büyütülmez; türevlerde EXIF/konum bilgisi tutulmaz.

14 Ekim 2026'da resmi Free plan: **500 MB veritabanı, 1 GB dosya depolama, 5 GB çıkış trafiği ve 5 GB önbellekli çıkış trafiği**. Yeni yüklemelerin orijinalleri ve türevleri dosya kotasını birlikte tüketir. Kullanımı sağlayıcı panelinden izleyin; güncel plan/marketplace sözleşmesi esas alınır. Free plan otomatik veritabanı yedeği sağlamaz. Kod Git'te, veritabanı ve iki özel bucket ayrıca yedeklenir; yayın geçmişi bağımsız yedek değildir. [Supabase fiyatlandırması](https://supabase.com/pricing).

Birincil dış kontrol, mevcut Vercel takımının Pro planında `/api/health` için altı saatte bir **UTC `37 */6 * * *`** korumalı crondur. Supabase Free planı yükseltilmez. GitHub Actions, altı saatte bir **UTC `17 */6 * * *`** bağımsız public REST okuması yapan yedek kontroldür. Vercel production yayını, GitHub doğru ref/variables/varsayılan dal ve başarılı gerçek çalışmalar ayrıca doğrulanmalıdır. GitHub hata bildirimleri açılmalıdır; zamanlama gecikebilir ve herkese açık depoda 60 gün etkinlik olmazsa kapanabilir. Vercel kontrolü bu GitHub kısıtına bağlı değildir. İki kontrol de Free duraklamama veya kesintisiz erişim garantisi vermez. [İşletim adımları](docs/ADMIN_AVAILABILITY.md).

## Son canlı CMS doğrulaması — 14 Ekim 2026

Panel canlıda: https://gerzoglu.com/admin . Son production dpl_9Gb4KpMkXRYM1YwwRWhXqy5RgULu; uygulama kaynağı 038c941. Canlı 27/27 proje, ana sayfa, liste ve site haritası CMS HTML çıktısıyla birebir eşleşti ve no-store doğrulandı. Son test paketi 40/40 geçti. Vercel 6 saatlik görev etkin, GitHub yedek kontrolünün ilk çalışması başarılıdır. SMTP EAUTH nedeniyle e-posta kurtarma kapalıdır. Ayrıntılı güncel devam noktası docs/WORK_STATUS.md dosyasındadır.

