# Gerzoğlu İnşaat — web sitesi

HTML/CSS/JS sitesi ve Vercel Node.js iletişim işlevi. Tasarım Gerzoğlu Varyant 3 projesine aittir.

- `index.html`, `kurumsal.html`, `projeler.html`, `kentsel-donusum.html`, `iletisim.html`, `kvkk.html`, `gizlilik.html`, `kullanim-sartlari.html`, `404.html`
- `proje/` — proje detay sayfaları
- `assets/` — stil, betik, favicon
- `assets/responsive/` — mevcut görsellerin içerik ve oranları korunmuş 640/1280/1920 piksel WebP kopyaları
- `assets/css/fonts.css`, `assets/fonts/` — aynı fontların yerel, Türkçe karakter destekli dosyaları ve OFL lisansları
- `api/contact.js`, `lib/contact.cjs` — yalnız `info@gerzoglu.com` alıcısına sunucudan e-posta gönderimi
- `sitemap.xml`, `robots.txt`, `llms.txt` — arama motoru/okuyucu metaverileri
- `vercel.json` — görsel yolları, güvenlik/önbellek başlıkları, 45 saniyelik iletişim işlevi ve geliştirme sürümü için `noindex`

## Mevcut yayın durumu

Varyant 3 geliştirme sürümüdür: tüm sayfalarda `noindex, nofollow` meta etiketi ve HTTP başlığı bilinçli olarak korunur. Asıl alan adı daha sonra `gerzoglu.com` olacaktır. Alan adını, DNS'i veya orijinal/V2 projelerini değiştirmeyin.

GoDaddy üzerinden alınan `info@gerzoglu.com` hesabı henüz aktif değildir. Mevcut projede SMTP kimlik bilgileri yoktur; bu yüzden gerçek e-posta teslimatı açık değildir. `GET /api/contact` bunu `{ "available": false }` ile bildirir. Formlarda telefon/WhatsApp seçenekleri gösterilir; gönderilmemiş talep için başarı gösterilmez.

## E-posta hizmeti etkinleştirildiğinde

GoDaddy panelindeki ürün türünü ve hesabın gönderim ayarlarını doğrulayın. Microsoft 365, Professional Email ve eski Workspace ürünleri aynı sunucu/kimlik doğrulama ayarlarını kullanmaz. Şifre/token bilgilerini sohbet, Git, kaynak dosyaları veya terminal argümanlarına koymayın. Vercel'in **yalnız bu projesinde**, Production ortamına sunucu değişkenlerini güvenli panelden ekleyin:

| Değişken | Değer |
|---|---|
| `SMTP_HOST` | Aktif hesabın sağlayıcısı tarafından verilen SMTP sunucusu |
| `SMTP_PORT` | `465` (TLS) veya `587` (STARTTLS) |
| `SMTP_USER` | Yetkili gönderici hesabı |
| `SMTP_PASS` | Sağlayıcının izin verdiği gönderim/uygulama parolası |
| `SMTP_FROM` | Onaylı gönderici; varsayılan `info@gerzoglu.com` |

Sağlayıcı OAuth kimlik doğrulaması gerektiriyorsa önce ilgili OAuth bağlantısı kurulmalıdır; parolalı SMTP'yi açmak için hesap güvenliğini düşürmeyin. Gönderici doğrulaması ve MX/SPF/DKIM kayıtları sağlayıcı panelinden kontrol edilmelidir. Değişkenler yeni Vercel yayınına uygulanır. Ardından yetkili bir test gönderiminde hem API yanıtı hem alıcı kutusu kontrol edilmelidir; SMTP kabulü, gelen kutusuna teslim garantisi değildir.

Fonksiyon sunucu doğrulaması, sabit alıcı, JSON boyut sınırı, aynı site kaynağı kontrolü, honeypot, TLS ve işlev örneği başına kısa süreli hız sınırı kullanır. Form içerikleri/kimlik bilgileri günlüğe yazılmaz. Dağıtık kötüye kullanım için sağlayıcının ağ koruması ve gönderim sınırları ayrıca geçerlidir.

## gerzoglu.com'a geçiş

Alan adı bu V3 projesine bağlandıktan ve HTTPS doğrulandıktan sonra canonical, `og:url`, işletme JSON-LD URL/ID, sitemap ve llms içindeki V3 adreslerini yeni ana adresle eşitleyin. 404 sayfasının `noindex` etiketini koruyarak gerçek sayfalardaki geliştirme `noindex` meta/HTTP başlıklarını kaldırın. Sitemap'i Search Console'a gönderin. Orijinal/V2 projelerine ayrıca yayın yapmayın.

Vercel Web Analytics bu geliştirme sürümünde etkinleştirilmez; gerçek trafik ölçümü ana alan adı yayınına aittir. Çerez denetleyicisi `window.GerzogluMeasurement` sağlayıcı arayüzünü destekler; sağlayıcı etkinleştirildiğinde gizlilik metni ve izin arayüzü gerçek veri kullanımıyla eşitlenmelidir. Reklam/analitik izleme şu anda çalışmaz.

## Kontroller

`npm test` iletişim işlevinin doğrulama, sabit alıcı, TLS, hız sınırı ve başarısızlık durumlarını gerçek e-posta göndermeden kontrol eder. Tarayıcıda menü/klavye, hareketleri durdurma, çerez ret/izin geri alma, harita, form hataları, mobil görünüm ve 404 ayrıca kontrol edilir.
