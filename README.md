# Gerzoğlu İnşaat — web sitesi

HTML/CSS/JS sitesi ve Vercel Node.js iletişim işlevi. Tasarım Gerzoğlu Varyant 3 projesine aittir.

- `index.html`, `kurumsal.html`, `projeler.html`, `kentsel-donusum.html`, `iletisim.html`, `kvkk.html`, `gizlilik.html`, `kullanim-sartlari.html`, `404.html`
- `proje/` — proje detay sayfaları
- `assets/` — stil, betik, favicon
- `assets/responsive/` — mevcut görsellerin içerik ve oranları korunmuş 640/1280/1920 piksel WebP kopyaları
- `assets/css/fonts.css`, `assets/fonts/` — aynı fontların yerel, Türkçe karakter destekli dosyaları ve OFL lisansları
- `api/contact.js`, `lib/contact.cjs` — yalnız `info@gerzoglu.com` alıcısına sunucudan e-posta gönderimi
- `build-site.cjs` — yalnız ziyaretçiye açık sayfa ve varlıkları `dist/` içine kopyalar; sunucu kaynakları ve proje yapılandırması bu dizinin dışında kalır
- `sitemap.xml`, `robots.txt`, `llms.txt` — arama motoru/okuyucu metaverileri
- `vercel.json` — görsel yolları, güvenlik/önbellek başlıkları, 45 saniyelik iletişim işlevi ve geliştirme sürümü için `noindex`

## Mevcut yayın durumu

Ana yayın adresi `https://gerzoglu.com` olarak bağlanmış ve HTTPS doğrulanmıştır. Gerçek içerik sayfaları indekslemeye açıktır; canonical, sosyal paylaşım ve yapılandırılmış veri adresleri ana alan adını gösterir. Varyant 3 ve diğer geliştirme adresleri, ana alan adı dışındaki hostlara uygulanan `X-Robots-Tag: noindex, nofollow` başlığıyla kapalı kalır. robots.txt taramaya izin verir; böylece Google bu noindex başlığını okuyabilir. 404 ve API yolları her alan adında indekslemeye kapalıdır. Orijinal/V2 projelerine dokunmayın.

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

Ana alan adı SEO adresleri güncellenmiştir. `/index.html` kalıcı olarak `/` yoluna yönlendirilir; www ve HTTP adresleri HTTPS ana adrese yönlenir. Search Console mülkiyeti kullanıcı hesabıyla doğrulandıktan sonra `https://gerzoglu.com/sitemap.xml` gönderilmeli ve ana sayfa için URL Denetimi yapılmalıdır. Site haritası göndermek veya indekslemeye izin vermek, Google sonuçlarında görünme garantisi değildir.

Vercel Web Analytics bu geliştirme sürümünde etkinleştirilmez; gerçek trafik ölçümü ana alan adı yayınına aittir. Çerez denetleyicisi `window.GerzogluMeasurement` sağlayıcı arayüzünü destekler; sağlayıcı etkinleştirildiğinde gizlilik metni ve izin arayüzü gerçek veri kullanımıyla eşitlenmelidir. Reklam/analitik izleme şu anda çalışmaz.

## Kontroller

`npm test` iletişim işlevinin doğrulama, sabit alıcı, TLS, hız sınırı ve başarısızlık durumlarını gerçek e-posta göndermeden kontrol eder. Tarayıcıda menü/klavye, hareketleri durdurma, çerez ret/izin geri alma, harita, form hataları, mobil görünüm ve 404 ayrıca kontrol edilir.
