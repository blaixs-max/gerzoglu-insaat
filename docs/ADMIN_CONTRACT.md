# Admin CMS implementation contract

The site keeps its current visual design and `/proje/<slug>.html` addresses.
Project status is exactly one of `teslim`, `devam`, `planlanan`, `satista`.

## Project document

```js
{
  schemaVersion: 1, slug, name, district, neighborhood: '', status,
  structureType: 'Konut', description: '', summary: '',
  constructionArea: null, unitCount: null, unitLabel: 'Daire sayısı',
  start: { value: '', estimated: false }, end: { value: '', estimated: false },
  facts: [{ label: 'Dükkân', value: '1' }],
  cover: null, gallery: [], interiors: [],
  home: { card: false, hero: false, cardOrder: 999, heroOrder: 999 },
  listOrder: 999,
  legacy: { detailPath: '/proje/example.html', locationLabel: '' }
}
```

An image is `{ id: null|string, src, srcset: '', width, height, alt: '', caption: '', label: '', kind: 'exterior'|'interior'|'plan'|'other', focalX: 50, focalY: 50 }`.
Imported public assets have `id: null`. Uploaded media has a UUID id and immutable public `/media/<id>/<width>.webp` URLs. A read response may additionally contain `previewSrc` for private drafts; this is not stored in published documents.
Dates accept `YYYY` or `YYYY-MM-DD`. Unknown values remain empty/null. Existing textual facts remain in `facts` rather than being fabricated.

An admin project is `{ id, slug, version, publicationState, draft, published, hasUnpublishedChanges, updatedAt, publishedAt }` where publicationState is draft/published/archived. Live edits only change draft. Published revisions are retained for restore. All mutations use expectedVersion and reject stale editors with HTTP409.

## Admin HTTP API

`GET /api/admin/config` returns `{configured,url,publishableKey,localPreview}`.
Supabase browser auth uses an installed, bundled `/assets/vendor/supabase.mjs`; no public signup. API calls send `Authorization: Bearer <access_token>`.

- `GET /api/admin/session` → `{user:{id,email},isAdmin:true}`.
- `GET /api/admin/projects` → `{projects:[AdminProject]}`.
- `POST /api/admin/projects` body `{draft:Document}` → `{project}`.
- `GET /api/admin/projects/:id` → `{project,history:[{id,createdAt,createdBy,document}]}`.
- `PUT /api/admin/projects/:id` body `{draft,expectedVersion}` → `{project}`.
- `POST /api/admin/projects/:id/publish`, `/archive`, `/restore`, `/discard` body `{expectedVersion}` → `{project}`.
- `POST /api/admin/projects/:id/restore-revision` body `{revisionId,expectedVersion}` restores a prior revision into draft → `{project}`; explicit publish follows.
- `POST /api/admin/projects/order` body `{ids:[uuid...]}` → `{projects}`. Apply ordering transactionally.
- `POST /api/admin/media/sign` body `{projectId,fileName,type,size}` → `{mediaId,bucket,path,token,signedUrl}`. Upload with browser SDK `storage.from(bucket).uploadToSignedUrl(path,token,file)`.
- `POST /api/admin/media/:id/finalize` → `{media:Image}`. Validate/decode original and create private responsive derivatives before ready. Public media is accessible only after a successful publication.

Errors are `{error:{code,message,fields?}}`. Status401 unauthenticated,403 not administrator,409 stale version,422 validation,503 missing configuration.

## Public rendering

Server functions produce full HTML for homepage, project listing and details, preserving existing classes/animations and metadata. All project counts/location directory/previous-next links/sitemap/llms use one published catalogue. Company historical statistics remain editorial.

Importer: `scripts/import-projects.cjs` exports importSite(root) → `{projects:[Document],templates:{[sourcePath]:html}}`. CLI writes `data/projects.json` and generated `data/site-templates.json`.
Renderer: `lib/cms-render.cjs` exports `renderPage(pathname, documents, options={})` → `{status,contentType,body}` or null for unrelated routes. Its templates are loaded from `data/site-templates.json`. It handles `/`, `/index.html`, `/projeler.html`, `/proje/<slug>.html`, `/sitemap.xml`, `/llms.txt`, and shared header counts on other HTML pages. Optional admin preview has `options.previewDocument` and noindex.

## Ownership

UI agent: `admin.html`, `assets/admin/admin.css`, `assets/admin/admin.js` only.
Import/render agent: `scripts/import-projects.cjs`, `lib/cms-render.cjs`, importer/render tests, generated data only.
Database agent: `supabase/**` and DB installation docs only.
Root: backend APIs/models/store/media/build/preview/config/dependencies/integration tests.
