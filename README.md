# QR Nonsense

A browser playground for generating, damaging, and scanning unusual QR codes — QArt, halftone, ambiguous dual-payloads, and more.

**Live site:** [dontscanqrs.lol](https://dontscanqrs.lol)

Everything runs locally in your browser. Camera frames from the scanner never leave the device.

## Develop

Requires [Node.js](https://nodejs.org/) 22+ and [pnpm](https://pnpm.io/) 10.

```bash
pnpm install
pnpm start
```

The app is served at [http://localhost:3000](http://localhost:3000).

| Script | Purpose |
| --- | --- |
| `pnpm start` | Vite dev server |
| `pnpm build` | Type-check and production build to `dist/` |
| `pnpm serve` | Preview the production build |
| `pnpm test` / `pnpm test:run` | Vitest (watch / once) |
| `pnpm lint` | ESLint |
| `pnpm type-check` | `tsc --noEmit` |

Docker / ProxMox hosting is documented in [README-DEPLOY.md](README-DEPLOY.md).

## GitHub Pages

The site deploys from `main` via [`.github/workflows/pages.yml`](.github/workflows/pages.yml). Publishing source must be **GitHub Actions**, and the custom domain is set in the repo’s Pages settings (a `CNAME` file is ignored for Actions deploys).

Point the apex domain at GitHub Pages:

| Type | Host | Value |
| --- | --- | --- |
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |
| `AAAA` | `@` | `2606:50c0:8000::153` |
| `AAAA` | `@` | `2606:50c0:8001::153` |
| `AAAA` | `@` | `2606:50c0:8002::153` |
| `AAAA` | `@` | `2606:50c0:8003::153` |
| `CNAME` | `www` | `ace42588.github.io` |

After DNS verifies, enable HTTPS in Pages settings.

## License

Apache License 2.0. See [LICENSE](LICENSE).
