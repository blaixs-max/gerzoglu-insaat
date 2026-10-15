# Kaynak eşitleme kaydı

## Güncel eşitleme — 15 Ekim 2026

Asıl yerel kaynak `C:\Users\Dell\Desktop\Gerz Oğlu\gerzoglu-varyant-3`, uzak depo [blaixs-max/gerzoglu-insaat](https://github.com/blaixs-max/gerzoglu-insaat), dal `main` olarak korundu. Uzak dal yeniden alındı; bu denetimin başlangıcında yerel `HEAD` ve `origin/main`, **ce2c9ddc8d10ecc1ef84854d06db146a8dc128a2** commit'inde eşitti ve çalışma ağacı temizdi.

`gerzoglu.com` için Vercel CLI sorgusu, doğru `gerzoglu-varyant-3` projesinde **dpl_GHPG6pHrJooEAm9ZyVTNxNuk13Q8**, production / Ready sonucunu verdi. Bu dağıtımın uygulama kaynağı **8723a83**; sonraki `ce2c9dd` yalnız yayın kaydını güncellemiştir. Bu nedenle GitHub'ın doküman commit'i ile dağıtımın uygulama commit'inin farklı olması, canlı kodun geride kaldığı anlamına gelmez. Bu eşitlemede de uygulama kodu değiştirilmedi ve yeni dağıtım yapılmadı.

15 Ekim 2026 saat **21:44 Türkiye saati** salt okunur canlı kontrolünde başkan mesajının yedi paragrafı, üç portre boyutu ve CSS kaynakla eşleşti; Hakkımızda/Vizyon/Çözüm Ortakları bölümleri, 27 proje bağlantısı ve 22 soruluk malik rehberi korundu. Kanıtın yerel ayrıntıları `.cache/chairman-message/live-verification.json` içindedir. Güncel yayın ve işletim kaydı [WORK_STATUS.md](WORK_STATUS.md) dosyasının başındadır.

Bu bakımda README, yayın rehberi ve devam kaydındaki eski “admin henüz yayımlanmadı” / “son yayın” ifadeleri güncellendi; geçmiş dağıtımlar ve test sayıları tarihsel kayıt olarak ayrıldı. Kaynak ve doküman değişiklikleri aynı Git geçmişinde tutulur. GitHub'a gönderimden sonra yerel `HEAD`, `origin/main` ve uzak `main` yeniden karşılaştırılır.

Güncel doğrulamada **74/74 test geçti**, build başarılı oldu ve üretilen tarayıcı paketi takip edilen kaynakta fark oluşturmadı. GitHub sağlık kontrolünün [15 Ekim 19:57 Türkiye saatli çalışması](https://github.com/blaixs-max/gerzoglu-insaat/actions/runs/38773307564) başarılı; `database` işi ve gerçek public katalog okuma adımı çalışmış, atlanmamıştır. Bu eşitlemede gerçek e-posta gönderilmedi.

### Eşitlemenin kapsamı

- Uygulama kaynakları, site görselleri, testler, migration dosyaları ve bakım dokümanları Git ile eşit tutulur.
- Canlı proje içerikleri ayrı CMS veritabanındadır. `data/projects.json` ilk aktarım kaydıdır; canlı düzenlemelerin üstüne yazmak için kullanılmaz. Bu işlemde veritabanına veya Storage'a yazılmadı.
- PDF ve düzenlenebilir PowerPoint kılavuzları yerel `output/pdf/` ve `output/powerpoint/` dizinlerinde korunur; Git ve site yayınına dahil değildir.
- Gerçek ortam dosyaları, kimlik bilgileri, `.vercel/`, `.cache/`, özel raporlar ve kullanıcıların ham belgeleri GitHub'a yüklenmez. `dist/` kaynaktan yeniden üretilir.

## İlk kaynak birleştirmesi — 14 Ekim 2026 (tarihsel kayıt)

Aşağıdaki dağıtım, dosya sayıları ve test sonuçları ilk eşitlemenin yapıldığı tarihe aittir; güncel sürüm bilgisi değildir.

### Doğrulanan kaynak

- Yerel klasör: `C:\Users\Dell\Desktop\Gerz Oğlu\gerzoglu-varyant-3`.
- Canlı alan adı: `https://gerzoglu.com`.
- Vercel projesi: `gerzoglu-varyant-3` / `prj_TJQvQ9L6NvWFMuJA1psxeEn0W8Jj`.
- Production dağıtımı: `dpl_5hyXm3Vf3DAKVP56fiL49NTocpZC`, `READY`, kaynak `cli`, 12 Ekim 2026 21:07 Türkiye saati.
- Dağıtımı oluşturan yerel kaynak commit'i: `e22be147c33a77b4846526906e928207f218a8b9`.

Vercel kaynak ağacındaki 340 kaynak dosyası, eşitleme öncesindeki yerel sürümle SHA-1 içerik özeti üzerinden eşleştirildi. Vercel'in ayrıca ürettiği `out/api/contact` işlev paketi kaynak dosyası sayılmadı. Tam ağaç CLI API'den okundu; bağlayıcının uzun dizin listeleri kısaltılabildiği için yalnız kısmi listeye dayanılmadı. Referans [production-source-20261012.json](production-source-20261012.json) dosyasında tutulur. Bu manifest tarihsel production kaydıdır; yeni doküman ve geliştirme aracı commit'leriyle yeniden yazılmaz.

### Git geçmişleri ve bağlantı

GitHub `blaixs-max/gerzoglu-insaat` deposunun `main` dalı `6375f2bcc7d6de5eb121a2646e5f81e53f66fbf4` commit'inde, 4 Ekim sürümünde kalmıştı. Güncel yerel sürümün Git geçmişi `116a445` kökünden bağımsız başlıyordu; `origin` bağlantısı yoktu.

GitHub `origin` olarak eklendi ve uzak dallar alındı. `9c3ffb4` birleştirme commit'i, iki geçmişi de koruyarak doğrulanmış yerel kaynak ağacını esas aldı. Zorla push veya geçmiş silme yapılmadı. GitHub'ın eski sürümüne ve yerelin önceki commit'lerine geçmişten erişilebilir.

Yerelin 38 commit'i ve 878 benzersiz dosya nesnesi yayından önce kimlik bilgisi sızıntısı açısından kontrol edildi. Gerçek anahtar, özel anahtar veya erişim token'ı bulunmadı. SMTP testindeki örnek parola sentetik test verisidir. `.env*` ve `.vercel/` hiçbir zaman kaynak geçmişine eklenmemişti ve eşitlemede de eklenmedi.

Yerel güvenlik yedeği: `C:\Users\Dell\Desktop\Gerz Oğlu\sync-backups\2026-10-14\gerzoglu-before-sync.bundle`. Yerel `.git` içindeki tarihsel tek seferlik yardımcılar korunur; güncel bakım komutları olarak GitHub'a taşınmaz.

### Eşitlemeye eklenen bakım dosyaları

- README, yayın ve görsel dokümanları güncellendi; canlı `GET /api/contact` artık `available:true` bildiriyor. E-posta gönderilmedi ve gelen kutusuna teslimat iddia edilmedi.
- Kullanılmayan fakat yerel/canlı pakette zaten bulunan altı logo görseli ve dört tarihsel üretim notu Git takibine alındı. Notlar üretildikleri dönemi anlatır; etkin logo için `ASSETS.md` esas alınır.
- Gizli yerel dışlama yüzünden izlenmeyen `scripts/preview.mjs` takibe alındı. Önizleme yalnız üretilmiş `dist/` statik içeriğini sunacak şekilde düzeltildi; sunucu kaynakları ve paket dosyaları HTTP üzerinden sunulmaz.
- `npm run preview` ve salt okunur `npm run verify:live` bakım komutları eklendi. Canlı kontrol, ana sayfayı `/` üzerinden ve 404 şablonunu gerçekten olmayan bir URL üzerinden doğrular.
- `AGENTS.md`, asıl dizini ve Vercel kimliğini kaydeder.
- `vercel.json` içindeki `git.deploymentEnabled: false`, eski Vercel projesine bağlı Git otomasyonunun kaynak push'u üzerinden yayın yapmasını engeller. Doğru production projesinin CLI yayın yöntemi korunur; mevcut alan adı ataması değiştirilmez.

### Kontroller

- `npm test`: 7/7 geçti; gerçek e-posta kullanılmadı.
- `npm run build`: başarılı.
- Yeni önizleme/doğrulama betiklerinin JavaScript sözdizimi kontrolü başarılı.
- Yerel önizleme: ana sayfa, projeler, Karabaş detay sayfası, CSS ve GET iletişim durumu başarılı. `/lib/contact.cjs` ve `/package.json` 404; `/.env.local` 403.
- `npm run verify:live`: 332/332 herkese açık dosya ve 404 şablonu içerik karşılaştırması geçti; başarısız kontrol yok. Form POST isteği veya e-posta gönderimi yapılmadı.

### İlk eşitlemenin kapsamı

14 Ekim'deki ilk işlem yalnız kaynak ve doküman eşitlemesiydi. Ardından admin/CMS geliştirildi ve canlıya alındı; proje ekleme/düzenleme, görsel yükleme, açık yayınlama ve arşivden silme artık yayındadır. Bu sonraki çalışmaların sürüm kayıtları [WORK_STATUS.md](WORK_STATUS.md), güncel kullanım adımları [ADMIN_GUIDE.md](ADMIN_GUIDE.md) içindedir.
