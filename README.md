# LagerApp

**Live:** https://silver-octo-succotash.frisemo.dev

En webbaserad lagerhanteringsapp för att scanna streckkoder/QR-koder och hålla koll på lagersaldo i realtid. Byggd med React + Supabase och deployad via GitHub Pages.

## Funktioner

- **Inloggning** — e-post/lösenord med rollbaserad åtkomstkontroll (admin / lagerarbetare)
- **Lagerlista** — sökbar och filterbar produktöversikt med saldostatus (OK / Lågt / Tomt)
- **Scanning** — scanna streckkoder via kameran (BarcodeDetector API med ZXing-fallback för iOS/Chrome)
- **Inleverans & utleverans** — registrera lagerhändelser i ett stegvis flöde med bekräftelse
- **Produkthantering** — skapa och redigera produkter (namn, SKU, streckkod, enhet, minimilager)
- **Transaktionshistorik** — kronologisk logg över alla in- och utleveranser
- **Export** — ladda ner lagerdata som CSV eller JSON
- **Skyddade sidor** — obehöriga omdirigeras automatiskt till inloggning

## Teknikstack

| Område | Val |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 (HashRouter) |
| Auth & databas | Supabase (PostgreSQL + Row Level Security) |
| Kamerascanning | BarcodeDetector API / ZXing Browser |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |
| E2E-tester | Playwright + Chromium |

## Kom igång

### Krav

- Node.js 22+
- Ett [Supabase](https://supabase.com)-projekt med schemat från `supabase/migrations/001_initial_schema.sql`

### Miljövariabler

Kopiera `web/.env.example` till `web/.env.local` och fyll i dina Supabase-värden:

```bash
VITE_SUPABASE_URL=https://<projekt-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-nyckel>
```

### Kör lokalt

```bash
cd web
npm install
npm run dev
```

Öppna `http://localhost:5173` i webbläsaren.

### Bygg

```bash
cd web
npm run build
```

## Projektstruktur

```
web/                        # React-applikationen
├── src/
│   ├── App.tsx             # Routing (HashRouter)
│   ├── components/         # Layout, NavBar
│   ├── context/            # AuthContext (Supabase-session)
│   ├── lib/                # supabase.ts (klient)
│   ├── pages/              # Login, StockList, Scan, Products, History, Export
│   ├── services/           # products.ts, transactions.ts, exportService.ts
│   └── types.ts            # Delade TypeScript-typer
├── package.json
└── vite.config.ts

tests/e2e/                  # Playwright E2E-tester
├── app.spec.ts             # Testsviter för alla sidor
└── helpers.ts              # loginAsAdmin, seedProducts m.m.

supabase/migrations/        # SQL-migrationer
└── 001_initial_schema.sql  # Tabeller, RLS-policys, triggers

.github/workflows/
├── deploy.yml              # Deploy till GitHub Pages (vid push till main)
├── pr-preview.yml          # Preview-deploy per PR
├── e2e.yml                 # E2E-tester mot produktion (efter deploy)
└── e2e-pr.yml              # E2E-tester mot PR-preview (utan e-postnotiser)
```

## Databas

Schemat definieras i `supabase/migrations/001_initial_schema.sql` och innehåller:

- **`profiles`** — användarroller kopplade till Supabase Auth
- **`products`** — produkter med saldo och minimilager
- **`stock_transactions`** — alla lagerhändelser
- **RLS-policys** — läsrättigheter för alla inloggade; skrivning till produkter kräver admin-roll
- **Trigger** — uppdaterar `current_stock` automatiskt vid varje transaktion

### Skapa admin-användare

1. Gå till Supabase Dashboard → Authentication → Users → Add user
   - E-post: `admin@lager.se`, lösenord: `admin123` (byt i produktion)
2. Kör i SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'admin@lager.se';
   ```

## CI/CD

Alla ändringar görs via Pull Request — direkt push till `main` är förbjudet.

| Workflow | Trigger | Syfte |
|---|---|---|
| `PR Preview` | PR öppnad/uppdaterad | Deployer appen till `/pr-preview/pr-{N}/` |
| `E2E Tests (PR Preview)` | Efter PR Preview | Kör E2E mot preview, postar ✅/❌ som kommentar |
| `Deploy to GitHub Pages` | Push till `main` | Bygger och deployer till produktion |
| `E2E Tests` | Efter produktions-deploy | Verifierar att produktionen fungerar |

### E2E-tester

Testerna finns i `tests/e2e/app.spec.ts` och täcker:
inloggning, lagerlista, navigation, produkthantering, scanning, historik, export och sessionshantering.

Tester körs i CI mot den deployade siten (inte localhost) eftersom appen kräver Supabase.
Se `CLAUDE.md` för fullständiga instruktioner kring utvecklingsflödet.
