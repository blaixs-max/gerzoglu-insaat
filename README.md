# Gerzoğlu İnşaat — web sitesi

`https://gerzoglu.com` için statik HTML/CSS/JS sitesi ve Vercel Node.js iletişim işlevi. Güncel kaynak, **Gerzoğlu Varyant 3** projesidir.

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
| `proje/` | Proje detay sayfaları |
| `assets/css/`, `assets/js/` | Ortak görünüm, gümüş tema, etkileşimler ve formlar |
| `assets/logo/` | Gümüş Logo 29, diğer logo seçenekleri ve favicon dosyaları |
| `assets/proje/`, `assets/responsive/` | Yerel proje kaynakları ve farklı boyutlardaki WebP görseller |
| `assets/fonts/`, `assets/css/fonts.css` | Yerel fontlar, Türkçe karakter desteği, kaynak ve OFL lisansları |
| `api/contact.js`, `lib/contact.cjs` | Sunucudan sabit `info@gerzoglu.com` alıcısına e-posta gönderimi |
| `tests/contact.test.cjs` | Gerçek e-posta göndermeyen iletişim işlevi testleri |
| `scripts/preview.mjs`, `scripts/verify-live.mjs` | Yerel önizleme ve salt okunur canlı dosya doğrulaması |
| `build-site.cjs`, `vercel.json` | Statik çıktı üretimi, görsel yönlendirmeleri ve yayın yapılandırması |
| `sitemap.xml`, `robots.txt`, `llms.txt` | Site haritası ve okuyucu/arama motoru metaverileri |

## Yerel kurulum ve kontrol

Node.js **24.x** ve npm kullanılır. Depo kökünde:

```sh
npm ci
npm test
npm run build
```

`npm run build`, ziyaretçiye açık sayfaları ve `assets/` içeriğini üretilmiş `dist/` dizinine kopyalar. API, `lib/`, testler, dokümanlar ve ortam dosyaları statik çıktıya kopyalanmaz. `dist/` dosyalarını elle düzenlemeyin. Bu, kaynak görselleri yeniden oluşturan bir derleme değildir.

Derlemeden sonra `npm run preview`, `http://127.0.0.1:4173` üzerinde `dist/` içeriğini, görsel yönlendirmelerini ve iletişim API'sini sunar. Sunucu kaynaklarını statik dosya olarak sunmaz. SMTP ortam değişkenleri ayrıca tanımlanırsa form gönderimi gerçek iletişim işlevini çalıştırabilir; önizleme kendiliğinden `.env.local` yüklemez. Tam Vercel uyumu için doğru projeye bağlı dizinde `vercel dev` kullanılabilir. `npm run verify:live`, derlenen dosyaları canlı alan adıyla karşılaştırır; mesaj göndermez. İsteğe bağlı farklı hedef: `npm run verify:live -- https://ornek-adres/`.

## Mevcut görünüm ve içerik

Güncel logo, şeffaf gümüş **Logo 29**'dur. İlk oturum açılışındaki logo yavaşça büyür: yaklaşık 3 saniye görünme ve 1 saniye çıkış. Görselin çözülme süresi başlangıcı etkileyebilir; tıklama animasyonu atlar ve azaltılmış hareket tercihi açılışı devre dışı bırakır.

Görseller `srcset` ve `sizes` ile sunulur. Çoğu görselde 640/1280/1920 piksel; Karabaş Apartmanı'nın düzeltilmiş mevcut bina görselinde kaynak genişliği kadar, 640/1280/1536 piksel seçenek vardır. Kaynak çözünürlüğünü aşan büyütme yapılmamalıdır. Logo, görsel seçimi, oran ve kalite kuralları [ASSETS.md](docs/ASSETS.md) dosyasındadır.

## İletişim ve ölçüm durumu

**14 Ekim 2026 kontrolünde** canlı `GET /api/contact`, HTTP 200 ve `{"available":true}` döndürdü. Bu, gerekli SMTP yapılandırmasının mevcut olduğunu gösterir; sağlayıcı bağlantısının veya gelen kutusuna teslimatın testi değildir. Bu denetimde e-posta gönderilmedi. Önceki dokümandaki “hesap aktif değil / SMTP bilgileri yok” bilgisi artık güncel kabul edilmemelidir.

Formlar gönderim hizmetini kontrol eder; yapılandırma yoksa telefon/WhatsApp seçeneklerini gösterir. Başarı yalnız sabit alıcı SMTP sunucusu tarafından kabul edildiğinde döner. SMTP kabulü, gelen kutusuna teslim garantisi değildir. Ortam değişkenleri ve gerçek teslimat doğrulaması [DEPLOYMENT.md](docs/DEPLOYMENT.md) içinde açıklanır.

Çerez denetleyicisi `window.GerzogluMeasurement` arayüzünü destekler; kaynak kodda etkin bir analiz sağlayıcısı tanımlı değildir. Sağlayıcı etkinleştirildiğinde izin arayüzü ve gizlilik metni gerçek veri kullanımıyla birlikte güncellenmelidir.

## SEO ve planlanan geliştirme

Canonical, paylaşım ve yapılandırılmış veri adresleri `https://gerzoglu.com` alan adını kullanır. `vercel.json`, ana alan adı dışındaki hostlara `noindex, nofollow` uygular; API ve 404 her hostta kapalıdır. `robots.txt` ana sayfaların taranmasına izin verir. Search Console doğrulaması ve site haritasının gönderilmiş olduğu ayrıca doğrulanmalıdır; indekslenebilir olmak arama sonuçlarında görünme garantisi değildir.

**Admin paneli henüz uygulanmadı.** Proje ekleme/düzenleme, görsel yükleme, sıralama ve anında yayınlama özellikleri planlama aşamasındadır. Mevcut proje içerikleri HTML dosyalarındadır; kullanıcı yönetimi veya proje veritabanı varmış gibi işlem yapılmamalıdır.
