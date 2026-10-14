# Devam kaydı — 14 Ekim 2026

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
