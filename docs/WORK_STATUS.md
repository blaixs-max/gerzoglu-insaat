# Devam kaydı — 14 Ekim 2026

Bu dosya bilgisayar kapatılmadan önce kalıcı devam noktasıdır. Parola veya anahtar içermez.

- Asıl kaynak: `C:\Users\Dell\Desktop\Gerz Oğlu\gerzoglu-varyant-3`; GitHub `blaixs-max/gerzoglu-insaat`, dal `main`.
- CMS kodu GitHub'a gönderildi. İlk özellik commit'i `056ad62`, arayüz sonlandırması `bc14252`, fiziksel dosyaların CMS yönlendirmelerini gölgelemesini düzelten commit `038c941`.
- Doğru Vercel projesi `gerzoglu-varyant-3` / `prj_TJQvQ9L6NvWFMuJA1psxeEn0W8Jj`, takım `team_CaYrjZEduUIYQniCVwvSijFp`. Tarihsel `gerzoglu-insaat` projesini kullanmayın. Git deployment kapalıdır.
- Ayrı Supabase Free projesi `gerzoglu-cms`, ref `ibbyoetzgeqbrxyvzidb`, Frankfurt. Ücretli plana geçilmedi. Üç migration uygulandı; 27 yayın projesi, 1 etkin yönetici var. Geçici cloud test projesi ve görselleri temizlendi.
- Yönetici adresi `https://gerzoglu.com/admin`, hesap `info@gerzoglu.com`. Kullanıcının belirlediği parola belgelerde tutulmaz. Parola girişi gerçek Auth servisiyle doğrulandı.
- 39 test geçti; yerel telefon/masaüstü arayüz akışları ve gerçek cloud yükleme/yayın/taslak/çakışma/arşiv işlemleri doğrulandı.
- GitHub dış veritabanı kontrolü etkin: `17 */6 * * *`. İlk elle çalışma başarılı: https://github.com/blaixs-max/gerzoglu-insaat/actions/runs/38587790863 . Yalnız public anahtar kullanır.
- Vercel birincil kontrolü: `/api/health`, `37 */6 * * *`, sunucuda özel `CRON_SECRET`. Gerçek cloud sorgusu yapan korumalı kontrol 200 döndü. GitHub 60 günlük hareketsizlik sınırına karşı Vercel bağımsız çalışır. Free planda duraklamama garantisi yoktur.
- Mevcut SMTP bağlantısı EAUTH verdi; e-posta gönderilmedi. Şifre yenileme seçeneği, doğrulanmış özel SMTP ve `CMS_RECOVERY_ENABLED=1` hazır olana kadar kapalıdır. Parola girişi çalışır.

## Son yayın kontrolü

İlk yayın `dpl_GKkMNQ6N4HgkdbPFpX4TJ1CjFGAV` canlıya alınmıştı. Son kontrolde Vercel'in mevcut statik HTML dosyalarını CMS rewrite'larından önce sunduğu görüldü. `038c941` düzeltmesi bu dosyaları public build'den çıkarır; kaynak HTML ve `data/site-templates.json` korunur. Yeni production dağıtımı hazırlanıyor. **Sonraki adım:** yeni dağıtımı doğrula/promote et; canlı ana sayfa/liste/27 proje HTML'sinin `renderPage` çıktısıyla aynı olduğunu ve `no-store` aldığını kontrol et. Yalnız HTTP 200/baseline içerik bu yönlendirmeyi doğrulamaz.

Kullanım `ADMIN_GUIDE.md`, erişilebilirlik `ADMIN_AVAILABILITY.md`, SQL `ADMIN_DATABASE.md`, yayın `DEPLOYMENT.md` içindedir. Yerel `.env*`, `.vercel`, `.cache` dosyaları özeldir ve Git dışında kalır. Docker kullanmayın; veritabanı testleri PGlite ile çalışır.
