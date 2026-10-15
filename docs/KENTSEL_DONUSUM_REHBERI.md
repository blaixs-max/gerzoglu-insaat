# Kentsel dönüşüm malik rehberi

İlk inceleme ve içerik düzenleme: **15 Ekim 2026**.

Kullanıcının `KENTSEL DÖNÜŞÜMDE MALİKLERİN MERAK ETTİKLERİ SORULAR.docx` belgesindeki 22 konu, yazım/anlatım ve maddi hukuk hataları düzeltilerek `kentsel-donusum.html#malik-rehberi` bölümüne aktarıldı. Ham kullanıcı belgesi depoya veya yayın paketine eklenmedi. Sayfa, başvuru formundan önce üç konu grubu ve yerel `details/summary` kontrolleri kullanır. Yeni JavaScript, izleyici veya bağımlılık eklenmedi.

## Başlıca düzeltmeler

- Riskli yapı tespitine malik/kanuni temsilci başvurusu ile kiracının konumu ayrıldı.
- Tespit ve tahliye bildirimi, toplantı çağrısı ve çoğunluk kararının tebliği tek yöntemmiş gibi anlatılmadı.
- Otomatik 60+30 gün yerine idarenin 90 günü aşmayan tahliye/yıkım süresi esas alındı.
- Çoğunluk hesabı kişi sayısı veya yüzde 51 değil, arsa paylarının yüzde 50'sinden fazlası olarak açıklandı.
- Karara katılmayan malik için 30 gün yerine 15 günlük kabul süresi belirtildi.
- Her ön teklif/sözleşmenin kendiliğinden geçersiz olduğu ve imza atmayanın otomatik sözleşme tarafı olduğu iddiaları kaldırıldı.
- Mahkemeden yürütmenin durdurulması alınamayacağı iddiası düzeltildi; dava açılmasının tek başına işlemi durdurmadığı belirtildi.
- Kiracıya yardım ve yeni malik için destek, güncel şartlarla koşullu anlatıldı. Tutar vaat edilmedi.
- 1–10 günlük yıkım ve teslim sonrası 3–8 aylık iskân gibi genel dayanağı olmayan takvimler kaldırıldı.
- Yeni dairenin alanı, tapu/iskân ve sözleşmesel haklar koşullu açıklandı.
- Beş yıl genel garanti değil, TBK 478 kapsamındaki ayıp davası zamanaşımı olarak anlatıldı; ağır kusurda yirmi yıl ve gizli ayıp bildirimi eklendi.
- Yönetim planında ilk kuruluş ile değişiklik ayrıldı. Tek apartmanda KMK 28 genel 4/5, toplu yapılarda 22 Mayıs 2026 değişikliği sonrası KMK 70 2/3 hükmü belirtildi.
- Yinelenen tahliye sorusu, başvuru/itiraz hakkına odaklanacak biçimde düzenlendi.

## Resmî dayanaklar

1. [6306 sayılı Kanun — KDB PDF](https://www.kdb.gov.tr/files/mevzuatdosya/2025581301335809.pdf), maddeler 1–6.
2. [Uygulama Yönetmeliği — KDB PDF](https://www.kdb.gov.tr/files/mevzuatdosya/2025592344518263.pdf), özellikle madde 16. **Bu PDF tek başına güncel konsolide 2026 metni değildir.**
3. [4 Şubat 2026 Resmî Gazete değişikliği](https://www.resmigazete.gov.tr/eskiler/2026/02/20260204-5.htm), madde 8/9, 15 ve 15/A değişiklikleri. Resmî Gazete erişimi zaman aşımına uğradığında [Eskişehir Ticaret Odası'nın aynı nüsha PDF kopyası](https://www.etonet.org.tr/uploads/cf/640e62b744.pdf) ve güncellenmiş KDB rehberi ile çapraz kontrol edildi.
4. [KDB riskli yapı soru-cevap rehberi](https://www.kdb.gov.tr/files/riskliyapi-sss.pdf).
5. [KDB kira yardımı kılavuzu](https://www.kdb.gov.tr/files/kira.pdf), özellikle yeni malik için madde 11/6. Eski kılavuzdaki başvuru süresi yerine güncel Yönetmelik 16/4 esas alındı.
6. [2577 sayılı Kanun — Adalet Bakanlığı](https://mevzuat.adalet.gov.tr/mevzuat/103161?query=2577), madde 27.
7. [6098 sayılı Türk Borçlar Kanunu — TBMM](https://cdn.tbmm.gov.tr/KKBSPublicFile/D23/Y2/T1/KanunMetni/a657b33d-109c-473d-9266-5aa48d603ab2.html), maddeler 474–478; [Yargıtay 6. HD 2025/2802](https://mevzuat.adalet.gov.tr/ictihat/1178830900).
8. [634 sayılı Kanun — Adalet Bakanlığı](https://mevzuat.adalet.gov.tr/mevzuat/103807), maddeler 1–3, 10, 12, 28 ve 70.
9. [3194 sayılı İmar Kanunu — Bakanlık PDF](https://webdosya.csb.gov.tr/db/meslekihizmetler/karnekararlari/3194-sayili-imar-kanunu-20231103080331.pdf), maddeler 30–31.
10. [22 Mayıs 2026 Resmî Gazete, 7579 sayılı Kanun](https://resmigazete.gov.tr/eskiler/2026/05/20260522-1.htm), madde 5; [Bakanlık açıklaması](https://meslekihizmetler.csb.gov.tr/haberler/site-aidatlarina-yonelik-duzenleme-resmi-gazete-de-yayimlandi-305297).

## Güncelleme ve kontrol

Metin genel bilgilendirme niteliğindedir; riskli alan, rezerv yapı alanı ve özel uygulamalarda farklı hükümler olabileceği sayfada belirtilir. Mevzuat değiştiğinde ilgili cevap, bağlantı, kontrol tarihi ve bu belge birlikte güncellenir. Rakamlar ve mutlak hak vaatleri kaynaksız eklenmemelidir.

HTML düzenlendikten sonra `node scripts/import-projects.cjs` ile `data/site-templates.json` yenilenir. `data/projects.json` fark vermemeli; mevcut cloud proje kayıtlarına seed uygulanmamalıdır. `npm test`, `npm run build`, masaüstü/mobil görünüm, kategori bağlantıları, klavye ile soru açma ve başvuru formunun korunması kontrol edilir. Yayın kimliği ve canlı doğrulama kaydı `WORK_STATUS.md` içindedir.

Özel üretilen PDF/PPTX gibi dosyalar `output/` altında kalır; bu klasör Git ve Vercel yüklemelerinden dışlanmıştır.
