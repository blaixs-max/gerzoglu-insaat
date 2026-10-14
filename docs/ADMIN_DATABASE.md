# Proje yönetimi veritabanı

Bu belge `docs/ADMIN_CONTRACT.md` ile birlikte okunur. Veritabanı başka bir uygulamanın verilerine bağlanmaz; Gerzoğlu için ayrılmış Supabase projesine kurulur. Depoya parola, hizmet anahtarı veya yönetici oturumu eklenmez.

## Kurulum ve sürümleme

İlk migration: `supabase/migrations/20261014133155_admin_cms.sql`. Dosya adı Supabase CLI `migration new admin_cms` komutuyla oluşturuldu. Proje **imperative migrations** kullanır; `supabase/schemas/` veya ikinci bir şema kaynağı yoktur.

İkinci migration `20261014141742_cms_preserve_imported_placeholder.sql`, eski siteden aktarılan ve yayımlanmış kaydında kapak görseli bulunmayan projenin metin düzenlemelerine izin verir. İstisna yalnız aynı projenin veritabanındaki önceki yayımlanmış belgesinden hesaplanır; taslağa eklenen bir `legacy.placeholder` alanı yetki sağlamaz. Yeni projeler ve daha önce kapakla yayımlanmış projeler için kapak zorunluluğu sürer.

Üçüncü migration `20261014143738_cms_non_retryable_version_conflicts.sql`, uygulama düzeyindeki eski sürüm hatasını `P0001` + `CMS_STALE_VERSION` olarak bildirir. İş kuralı için `40001` kullanılmaz: PostgREST 14 bu kodu gerçek serileştirme hatası sanıp sonsuz transaction tekrarına girebilir. Mevcut bir test isteğinde bu sorun bulut testiyle doğrulandı; migration sonrasında ilgili RPC bağlantılarının kalmadığı kontrol edildi ve oturum sonlandırmaya gerek kalmadı. [Supabase'in resmi açıklaması](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).

- `supabase/config.toml` yerel ayarları taşır; herkese açık kayıt ve anonim giriş kapalıdır. Cloud projesinde de Auth kayıt ayarı ayrıca kapatılmalıdır. `cms_private` API şemalarına ve API arama yoluna **eklenmez**.
- Migration güvenilir bir sunucu/CLI bağlantısından, yalnız doğru Gerzoğlu proje kimliği doğrulandıktan sonra uygulanır. Mevcut veriler üzerinde sıfırlama yapılmaz.
- Yeni şema değişiklikleri yerelde sorguyla denenir; ardından Supabase advisors çalıştırılır ve migration oluşturulur. Daha önce uygulanan migration değiştirilmez.
- `supabase/seed.sql` bilerek boştur. Yönetici, Auth yönetim API'si ile sunucuda oluşturulur; kimliği `cms_admins` tablosuna açıkça eklenir. Ziyaretçi kaydı veya tarayıcı üzerinden yönetici oluşturma yoktur.

İlk kurulum testleri gerçek Postgres motorunu çalıştıran PGlite ile `node --test tests/cms-database.test.cjs` komutunda yapılır. Docker tabanlı Supabase servisleri kullanılmadan SQL migration, roller, RLS, fonksiyon yetkileri ve işlemler çalıştırılır. Bu testler, Supabase Auth/Storage HTTP servislerinin uçtan uca testi yerine geçmez. Cloud kurulumundan sonra Supabase security/performance advisors ve HTTP entegrasyon testleri ayrıca çalıştırılmalıdır.

## Tablolar ve okuma yetkileri

| Tablo | İçerik | Tarayıcı/ziyaretçi erişimi |
| --- | --- | --- |
| `cms_admins` | `user_id`, `active`, `created_at` | Giriş yapan kişi yalnız kendi üyeliğini okuyabilir. Değiştiremez. |
| `cms_projects` | Özel taslak, son yayımlanmış belge, sürüm ve işlem bilgisi | Yalnız etkin yönetici okuyabilir; doğrudan yazamaz. |
| `cms_public_projects` | `id`, `slug`, `document`, `published_at`, `updated_at` | Ziyaretçi yalnız bu kataloğu okuyabilir. |
| `cms_revisions` | `id`, `project_id`, `project_version`, `document`, `created_at`, `created_by` | Yalnız etkin yönetici okuyabilir. Yayımlanmış sürümler saklanır. |
| `cms_media` | Yükleme kaydı, özel yol, doğrulama durumu, görsel/variant bilgisi | Yalnız etkin yönetici okuyabilir; yazma sunucuda yapılır. |
| `cms_audit_log` | Proje, işlem, önceki/sonraki sürüm, kullanıcı ve zaman | Yalnız etkin yönetici okuyabilir. |

Bütün tabloların RLS koruması açıktır. `anon` özel tablolara tablo yetkisi dahi almaz. `authenticated` rolünde doğrudan INSERT/UPDATE/DELETE yetkisi bulunmaz; yönetici üyeliği güncel tablodan denetlenir, kullanıcı tarafından değiştirilebilen JWT profil alanlarından alınmaz. Yetkili sunucunun `service_role` rolü import, görsel işleme ve hesap hazırlama içindir; tarayıcıya gönderilmez.

## İşlem API'si

Public fonksiyonların tamamı **SECURITY INVOKER** çalışır. Yükseltilmiş yetki gereken uygulamalar, API'ye açılmayan `cms_private` şemasındadır, boş `search_path` kullanır ve her giriş noktasında `auth.uid()` için etkin yönetici kontrolü yapar. Yardımcı fonksiyonların doğrudan çağrı yetkisi tarayıcı rollerine verilmez.

| Public RPC | Parametreler | Sonuç / davranış |
| --- | --- | --- |
| `cms_create_project` | `p_document jsonb` | Özel taslak oluşturur; JSON proje döndürür. |
| `cms_save_project` | `p_id uuid`, `p_expected_version integer`, `p_document jsonb` | Yalnız taslağı kaydeder; yayındaki belge değişmez. |
| `cms_publish_project` | `p_id uuid`, `p_expected_version integer` | Doğrulama, görsellerin yayın izni, yeni sürüm ve public katalog tek işlemde tamamlanır. |
| `cms_archive_project` | `p_id uuid`, `p_expected_version integer` | Public katalog kaydını kaldırır; taslak ve yayın geçmişi korunur. |
| `cms_restore_project` | `p_id uuid`, `p_expected_version integer` | Arşivlenmiş projeyi özel taslağa çevirir. Tekrar yayın için açıkça publish gerekir. |
| `cms_discard_draft` | `p_id uuid`, `p_expected_version integer` | Taslağı son yayımlanmış belgeye döndürür. Yayın geçmişi olmayan taslakta reddedilir. |
| `cms_restore_revision` | `p_id uuid`, `p_expected_version integer`, `p_revision_id uuid` | Yalnız aynı projenin geçmiş sürümünü taslağa alır; otomatik yayımlamaz. |
| `cms_reorder_projects` | `p_ids uuid[]`, `p_expected_versions jsonb` | Her UUID için `{ "uuid": version }` haritası zorunludur. Verilen kayıtların sırasını 1'den başlatır; JSON proje dizisi döndürür. |

JSON proje sonucu snake_case alanlarla gelir: `id`, `slug`, `version`, `publication_state`, `draft`, `published`, `has_unpublished_changes`, `updated_at`, `updated_by`, `published_at`, `archived_at`, `current_revision_id`, `previous_published_revision_id`, `created_at`, `created_by`. Sunucu bunları HTTP sözleşmesindeki camelCase adlarına dönüştürür. Doğrudan SELECT sonucunda `has_unpublished_changes` bulunmaz; sunucu `draft !== published` yapısal karşılaştırmasıyla hesaplar.

Her düzenleme proje satırını kilitler ve `expected_version` kontrolü yapar. Başarılı her işlem sürümü artırır. Sıralama, bütün kilitleri UUID sırasıyla alır; bir kayıt bile eskiyse hiçbir kayıt değişmez. Sıralama yayındaki projelerin yalnız `listOrder` alanını günceller; diğer kaydedilmemiş değişiklikleri yanlışlıkla yayımlamaz. Sıralama ve normal yayın, geçmiş sürüm kaydı üretir; bütün değişiklikler audit kaydı üretir.

Proje adresi ilk oluşturmadan sonra sabittir (`CMS_SLUG_IMMUTABLE`). Yeni ad vermek eski proje bağlantısını bozmaz.

### Hatalar

- SQLSTATE `P0001`, `CMS_STALE_VERSION`: HTTP 409; güncel kayıt yeniden yüklenir. Gerçek PostgreSQL `40001` serileştirme hatası uygulama sürüm hatası olarak üretilmez.
- SQLSTATE `42501`, `CMS_ADMIN_REQUIRED`: HTTP 403; giriş yapmamış istemci HTTP katmanında 401 alır.
- SQLSTATE `P0002`, `CMS_PROJECT_NOT_FOUND` / `CMS_REVISION_NOT_FOUND`: HTTP 404.
- SQLSTATE `22023`, `CMS_*` doğrulama mesajları: HTTP 422. Örnek: `CMS_INVALID_STATUS`, `CMS_REQUIRED_FIELDS`, `CMS_MEDIA_NOT_READY`, `CMS_MEDIA_NOT_OWNED`, `CMS_MEDIA_METADATA_MISMATCH`, `CMS_PRIVATE_PREVIEW_NOT_STORABLE`.
- SQLSTATE `23505`: benzersiz proje adresi çakışması; kullanıcıya uygun çakışma mesajı gösterilir.

SQL doğrulaması dört durum kodunu (`teslim`, `devam`, `planlanan`, `satista`), gerekli yayın alanlarını, tarih biçimini, pozitif alan/daire sayılarını, dizi boyutlarını ve görsel sahipliğini denetler. `previewSrc` içeren bir belge veritabanına kaydedilemez; özel önizleme adresleri okuma yanıtında sunucuda eklenir.

## Görseller

`project-media-originals` ve `project-media-variants` bucket'ları özeldir. Bu migration Storage üzerinde anonim okuma veya doğrudan tarayıcı yazma politikası oluşturmaz. Etkin yönetici kontrolünden sonra sunucu tek ve değişmez yola imzalı yükleme izni verir; orijinali doğrular, türevleri üretir ve kaydı `ready` yapar.

`cms_media` alanları: `id`, `project_id`, `bucket` (daima `project-media-originals`), `path`, `file_name`, `mime_type`, `size_bytes`, `status` (`pending` / `processing` / `ready` / `failed`), `width`, `height`, `variants`, `image`, `created_at`, `created_by`, `updated_at`, `published_at`.

`variants` örneği: `[{"width":1600,"height":1200,"path":"project-id/media-id/1600.webp","mime":"image/webp"}]`. Türevler `project-media-variants` bucket'ındadır. `image`, HTTP sözleşmesindeki tam görsel nesnesidir; `src` ve `srcset` değişmez `/media/<id>/<width>.webp` yollarını kullanır.

Yayınlama, her yüklenmiş görselin aynı projeye ait ve hazır olmasını ister; `src`, `srcset`, `width`, `height` alanları sunucunun ürettiği `image` ile eşleşir. Sonra yalnız belgede kullanılan görsellerin `published_at` alanını aynı işlemde işaretler. Hata halinde katalog, sürüm, geçmiş ve görsel izinleri birlikte geri alınır. Halka açık medya sunucusu yalnız `published_at` verilmiş türevleri servis eder. İlk yayından sonra bu izin kalıcıdır; yayınlanmış ve önbelleğe alınmış dosyaların sonradan gizlendiği vaat edilmez. Orijinaller halka açılmaz.

Mevcut siteden içe alınan, `id:null` görseller yalnız `/assets/`, `/images/` veya `/img/` altındaki yerel yolları kullanır. Uzak kaynak kullanılacaksa önce doğrulanıp içe alınmalıdır; signed URL yayın belgesine yazılmaz.

## Yedek ve geri dönüş

Kod Git'te; proje verileri ve orijinal görseller ayrı kalıcı depolamadadır. Yayın geçmişi sürüm geri alma içindir, tek başına bağımsız yedek değildir. Veritabanı ve iki Storage bucket'ı ayrı yedeklenmelidir. Yedeğe erişim yalnız yetkili operasyon hesabındadır. Yayın geçmişini geri alma taslağı değiştirir; son kontrolün ardından açık publish gerekir.
