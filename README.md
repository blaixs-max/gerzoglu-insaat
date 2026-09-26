# Gerzoğlu İnşaat — web sitesi

Statik site (HTML/CSS/JS, derleme adımı yok). Vercel'de doğrudan yayınlanır.

- `index.html`, `kurumsal.html`, `projeler.html`, `kentsel-donusum.html`, `iletisim.html`, `kvkk.html`
- `proje/` — proje detay sayfaları
- `assets/` — stil, betik, favicon
- `vercel.json` — `/img/*.webp` yollarını Higgsfield görsellerine yönlendirir; yayın öncesi `noindex` başlığı ekler

Yayına alırken: `vercel.json` içindeki `X-Robots-Tag: noindex` kuralını kaldırın.
