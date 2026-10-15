# Proje yönetim paneli kullanım rehberi

14 Ekim 2026'da panel canlıya alınmış; 27 mevcut projenin sunucudan güncel içerikle sunulduğu doğrulanmıştır. Güncel devam ve yayın kaydı [WORK_STATUS.md](WORK_STATUS.md) içindedir.

## Giriş ve proje durumları

İlk hesabın parola ile girişi doğrulanmıştır. E-posta ile şifre yenileme, `CMS_RECOVERY_ENABLED=1` açıkça etkinleştirilene kadar gösterilmez. 14 Ekim 2026 bağlantı doğrulamasında mevcut sitenin SMTP sunucusu `EAUTH` döndürmüştür; e-posta gönderilmemiştir. Geçerli SMTP bilgileriyle Supabase Auth özel SMTP yapılandırması ve gerçek kurtarma teslimatı doğrulanmadan bu seçenek açılmamalıdır.

[gerzoglu.com/admin](https://gerzoglu.com/admin) adresini açın. Panel canlıda kullanıma açıktır. İlk yönetici hesabı **info@gerzoglu.com** adresidir. Parola belgelerde tutulmaz; herkese açık kullanıcı kaydı yoktur. İşiniz bitince **Güvenli çıkış** kullanın. **YEREL ÖNİZLEME** rozeti görüyorsanız bilgisayardaki deneme ortamındasınız; buradaki işlemler canlı siteyi değiştirmez.

Her proje için dört durumdan yalnızca biri seçilir: **Teslim Edildi / Devam Eden Proje / Planlanan Proje / Satıştaki Proje**. Bundan ayrı **Taslak / Yayında / Arşivde** bilgisi bulunur. Örneğin “Planlanan Proje” ziyaretçilere açık olabilir; “Teslim Edildi” seçmek kaydı kendiliğinden yayımlamaz.

## Yeni proje ekleme

1. **Yeni proje ekle** düğmesine basın. Bina/proje adı, ilçe, gerekiyorsa mahalle, tek bir proje durumu ve yapı türünü doldurun.
2. Sayfa adresini sistem bina adından otomatik oluşturur; adres girmeniz gerekmez. Aynı isimde başka proje varsa sistem farklı bir adres ayırır ve mevcut projeye yazmaz. Adres ilk kayıttan sonra korunur; bina adı sonradan değiştirilebilir.
3. İnşaat alanı, sayı bilgisi, başlangıç/bitiş tarihi ve listede gösterim sırasını girin. Bilinmeyen isteğe bağlı bilgileri boş bırakın.
4. Kısa özet ve proje açıklamasını yazın. Yeni paragraf için boş satır bırakabilirsiniz.
5. **Devam et: Görseller** düğmesine basın. Zorunlu alanlar, sayılar ve tarihler hatasızsa ikinci adıma geçilir.
6. Fotoğrafları yükleyin, kapağı seçin ve sıralayın. Yüklemeler tamamlanınca **Devam et: Ek Bilgiler** seçin. Yeni projede kapak seçmeden ilerlenmez.
7. İsteğe bağlı ek bilgileri kontrol edin. Bir bilgi satırı eklediyseniz başlık ve değerini birlikte doldurun veya satırı kaldırın. **Taslağı kaydet** yalnız bu son adımda bulunur.
8. Kayıttan sonra **Önizle** ve **Projeyi yayımla** açılır. Hazır olunca yayını ayrıca onaylayın. Sonradan değişiklik yaparsanız önce yeniden kaydedin.

Başarı mesajından sonra **Canlı sayfayı aç** bağlantısını kullanın. Proje yayınında yeni Vercel dağıtımı veya GitHub işlemi gerekmez; yenilenen sayfa güncel yayın belgesini okur. Hata görülürse yayın tamamlandı varsaymayın, panelde yayın durumunu kontrol edin.

| Alan | Nasıl doldurulur? |
| --- | --- |
| Bina / proje adı | Ziyaretçinin göreceği isim |
| İlçe / Mahalle | İlçe zorunlu, mahalle isteğe bağlı |
| İnşaat alanı | Yalnız sayı girin; sitede m² eklenir |
| Bağımsız bölüm / daire sayısı | Bilinen sayı; villa veya ticari projeye uydurma daire sayısı yazmayın |
| Sayı bilgisinin başlığı | Daire sayısı, Ofis sayısı, Villa sayısı veya uygun başlık |
| Başlangıç / bitiş tarihi | **Yalnızca yıl** veya **Tam tarih**; gerekiyorsa **Tahmini tarih** işaretleyin |
| Listede gösterim sırası | Küçük numara önce gösterilir |
| Ek bilgiler | Dükkân, showroom, ofis veya özel not için başlık/değer satırı |
| Özel konum yazısı | Aktarılan projedeki sokak bilgisi; boşsa mahalle ve ilçe kullanılır |

Mevcut projelerden aktarılan ofis, dükkân, showroom, villa ve not bilgilerini koruyun. Aynı isimde iki proje olabilir; farklı konumları ve adresleri ayrı kayıt olduklarını gösterir.

## Fotoğraflar

**JPEG/JPG, PNG veya WebP**, dosya başına en fazla **20 MB** yükleyebilirsiniz. Hareketli veya gerçek biçimi uzantısıyla uyuşmayan dosyalar kabul edilmez. Çok büyük piksel boyutlu fotoğraflarda daha küçük bir kopya gerekebilir.

Fotoğrafları yükleme alanına bırakın veya **Dosya seç** kullanın. İşlenme bitmeden yayımlamayın. Hatalı yüklemeyi yeniden deneyin. **Görsel açıklaması**, **Fotoğraf alt yazısı**, **Görsel başlığı** ve dış cephe/iç mekân/kat planı türünü düzenleyebilirsiniz.

Hazır örnek yatak odası, mutfak ve banyo fotoğraflarının kartları panelde gösterilmez. Mevcut içerikteki bu görseller korunur. Projeye özel yüklediğiniz iç mekân fotoğrafları galeride düzenlenebilir; örnek fotoğraflar görsel sayısına veya kapak seçimine dahil edilmez.

**Kapak olarak seç**, proje listesi, detay başlığı ve seçilmiş ana sayfa kartlarının ana fotoğrafını belirler. Yatay/dikey odak ayarları, dar ekranda fotoğrafın görünen bölümünü seçer; orijinali kesmez. Galeriyi sürükleyerek veya oklarla sıralayın. **×** fotoğrafı taslaktan çıkarır; orijinali depoda korunur. Bu işlem daha önce yayımlanmış bir görsel bağlantısını bütün önbelleklerden geri çekmez.

Kaynak genişliğini aşmadan uygun ekran boyutları üretilir; küçük fotoğraf yapay olarak büyütülmez. Ana görsel için yüksek çözünürlüklü kaynak kullanın. Orijinaller özel depoda kalır; yalnız başarılı yayınla izin verilen WebP türevleri ziyaretçilere sunulur. Yeni projede kapak gerekir; ilk aktarımdaki Yılmaz Apartmanı'nın mevcut “görseller hazırlanıyor” durumu korunabilir.

## Yayındaki projeyi düzenleme

**Düzenle** ile açın. **Proje Bilgileri → Görseller → Ek Bilgiler** adımlarını sırayla kontrol edip son adımda **Taslağı kaydet** deyin. Önceki adımlara dönebilirsiniz; değiştirilen adım ve sonrasının yeniden kontrol edilmesi gerekir. Ziyaretçi son yayımlanmış sürümü görmeye devam eder; panelde **Yayınlanmamış düzenleme** işareti görünür. **Önizle** ile taslağı kontrol edip **Değişiklikleri yayımla** seçin. Önizleme arama motorlarına kapalıdır ve normal proje sayfasını yayımlamaz.

Aynı kayıt başka sekmede veya başka yönetici tarafından değiştirilmişse eski sürüm üzerine yazılmaz. Güncel kaydı yeniden yükleyip düzenlemelerinizi kontrol edin. Kaydetmeden ayrılmak son düzenlemelerin kaybolmasına neden olabilir.

## Ana sayfa ve sıra

Paneli sade tutmak için **Ana sayfada görünüm** ayarları şimdilik kaldırılmıştır. Mevcut ana sayfa kartları, açılış slaytları ve bunların sıraları korunur. Yeni projeler yayımlandığında Projeler sayfasına eklenir; ana sayfaya kendiliğinden eklenmez. **Listede gösterim sırası**, Projeler sayfasındaki sıralamayı belirlemeye devam eder.

Liste ekranındaki yukarı/aşağı oklar genel sırayı doğrudan günceller. Yayındaki projelerde yalnız sıra değişir; bekleyen metin/fotoğraf taslakları yayımlanmaz. Formdaki sıra numarasını değiştirirseniz normal taslak/yayın akışı uygulanır.

## Arşiv ve önceki sürüm

**Arşive taşı**, projeyi ziyaretçilerden kaldırır; liste, ana sayfa, sayaç ve site haritası güncellenir. Detay adresi 404 döner. Bilgiler ve geçmiş saklanır. **Arşiv** menüsünden **Arşivden geri yükle** seçildiğinde kayıt önce özel taslak olur; ayrıca yayımlamadan ziyaretçilere açılmaz.

**Yayın geçmişi → Taslağa geri yükle** önceki sürümü taslağa alır. Canlı sayfayı geri almak için ayrıca **Değişiklikleri yayımla** gerekir. **Taslak düzenlemelerini geri al** ise bekleyen düzenlemeleri mevcut yayındaki sürümle değiştirir.

**Arşiv** listesindeki veya arşivlenmiş proje ekranındaki **Sil** düğmesi, projeyi ve yayın geçmişini kalıcı olarak kaldırır. Açılan pencerede ekrandaki proje adını aynen yazıp onaylayın. **Vazgeç** veya Escape işlemi iptal eder. Yayındaki ve taslak projeler doğrudan silinemez; önce arşivlenmelidir. Silinen proje panelden geri yüklenemez ve eski sayfa adresi başka bir projeye verilmez.

## Erişim, kota ve yedek

Bağlantı hatasında tekrar tekrar yayımlamaya basmak yerine yayın durumunu kontrol edin. Sağlayıcı bağlantısı, kota veya Free proje duraklaması için teknik sorumlu [erişilebilirlik rehberini](ADMIN_AVAILABILITY.md) izler.

Altı saatte bir korumalı Vercel kontrolü ve altı saatte bir GitHub yedek kontrolü yapılandırılmıştır. Güncel doğrulama kaydı [WORK_STATUS.md](WORK_STATUS.md) içindedir. Bunlar kesintisiz erişim veya hiç duraklamama garantisi değildir; GitHub hata bildirimleri hesap ayarlarına bağlıdır.

Orijinaller ve türevleri dosya kotasını birlikte kullanır. Güncel kullanım sağlayıcı panelinden izlenir. Yayın geçmişi bağımsız yedek değildir; veritabanı ve özel fotoğraf depoları ayrıca yedeklenmelidir.
