# Gerzoğlu İnşaat source

- This repository is the source for `https://gerzoglu.com`.
- Authoritative local checkout: `C:\Users\Dell\Desktop\Gerz Oğlu\gerzoglu-varyant-3`.
- GitHub: `blaixs-max/gerzoglu-insaat`, production source branch `main`.
- Canonical Vercel project: `gerzoglu-varyant-3`, ID `prj_TJQvQ9L6NvWFMuJA1psxeEn0W8Jj`, team `team_CaYrjZEduUIYQniCVwvSijFp`.
- The sibling `gerzoglu-redesign` and Vercel project `gerzoglu-insaat` are historical. They are not the current production source.
- Git deployments are explicitly disabled in `vercel.json` because the legacy Vercel project is connected to this repository. Publishing uses the verified current project and is separate from source synchronization.
- Follow the user's requested scope for release actions. Before any release, confirm the project, team, commit and environment; inspect `.vercel/project.json` without publishing it.
- Run `npm test` and `npm run build` for source changes. `npm run preview` serves `dist/` on loopback. `npm run verify:live` compares public output against the live domain using GET only.
- Edit source, never just `dist/`. Preserve existing project URLs, redirects and image quality.
- Keep `.env*`, `.vercel/`, `node_modules/`, generated outputs and private reports out of Git. Never print credentials.
- Update README and relevant `docs/` files when workflow, content handling or deployment changes.
- The requested project admin/CMS feature is planned, not implemented by the source synchronization.
