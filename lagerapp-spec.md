# LagerApp — Spec v3

> Uppdaterad: 2026-03-30
> Status: MVP implementerat och i produktion

---

## Koncept

En mobil- och webbapp där ett litet team skannar streckkoder/QR-koder för att registrera och hantera fysiska produkter i ett lager. Deployad som React-app via GitHub Pages med Supabase som backend.

---

## Användare och roller

- **Primära användare:** litet team, 2–10 personer
- **Admin** — hanterar produkter, ser historik, exporterar data
- **Lagerarbetare** — registrerar in- och utleveranser via scanning

Roller styrs via `profiles`-tabellen i Supabase. Navigationen filtreras per roll (Produkter och Historik visas bara för admin).

---

## Mål och framgångskriterier

- En användare ska kunna scanna en produkt och registrera en leverans på under 5 sekunder
- Lagersaldot reflekterar alltid senast registrerade händelse (uppdateras via DB-trigger)
- Admin kan se fullständig transaktionshistorik
- Appen är deployad som statisk app på GitHub Pages (ingen egen serverinfrastruktur)

---

## Implementerade funktioner (MVP)

### Auth
- Inloggning via e-post/lösenord (Supabase Auth)
- Sessionshantering med automatisk redirect till `/login` vid ogiltig session
- Rollbaserad åtkomstkontroll: admin / lagerarbetare

### Scanning & registrering
- Kamerascanning via BarcodeDetector API (desktop/Android Chrome)
- ZXing-fallback för iOS Safari och Chrome utan native BarcodeDetector
- Manuell inmatning som fallback (alltid synligt)
- Stegvis flöde: Skanna → Bekräfta (välj typ + antal) → Klar
- Varning vid okänd streckkod

### Lagerlista
- Sökbar och filterbar produktöversikt
- Saldostatus-indikator: OK / Lågt / Tomt
- Statistikkort: totalt, OK, lågt, tomt

### Produkthantering (admin)
- Skapa, redigera och ta bort produkter
- Fält: namn, SKU, streckkod, enhet, minimilager, startsaldo
- Validering med felmeddelanden

### Transaktionshistorik (admin)
- Kronologisk logg med tidpunkt, produkt, typ och antal
- Visar "Ingen historik ännu" om inga transaktioner finns

### Dataexport
- CSV-nedladdning: alla produkter med aktuellt saldo
- JSON-nedladdning: produkter + transaktioner (full backup)
- Bekräftelsetoast efter nedladdning

---

## Teknikbeslut

| Område | Val | Motivering |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Ekosystem, prestanda, Vite-byggtid |
| Styling | Tailwind CSS | Utility-first, inga extra beroenden |
| Routing | React Router v6 (HashRouter) | HashRouter krävs för GitHub Pages (inga serverside-routes) |
| Auth & databas | Supabase | Managed Postgres + auth + RLS utan egen server |
| Scanning | BarcodeDetector API + ZXing Browser | Native API där tillgängligt, ZXing som fallback |
| Hosting | GitHub Pages | Statisk deploy, gratis, CNAME-stöd |
| E2E-testning | Playwright + Chromium | Kör mot live-URL, täcker hela användarflödet |

---

## Datamodell

```sql
-- Supabase Auth hanterar auth.users (e-post, lösenord, session)

profiles (
  id          uuid  PK → auth.users
  email       text
  role        text  CHECK ('admin' | 'worker')  DEFAULT 'worker'
)

products (
  id            uuid        PK  DEFAULT gen_random_uuid()
  name          text        NOT NULL
  sku           text        DEFAULT ''
  barcode       text        DEFAULT ''
  unit          text        DEFAULT 'st'
  min_stock     integer     DEFAULT 0
  current_stock integer     DEFAULT 0
  created_at    timestamptz DEFAULT now()
)

stock_transactions (
  id          uuid        PK  DEFAULT gen_random_uuid()
  product_id  uuid        FK → products
  type        text        CHECK ('in' | 'out')
  quantity    integer     > 0
  timestamp   timestamptz DEFAULT now()
  user_id     uuid        FK → auth.users
)
```

**Trigger:** `after_transaction_insert` uppdaterar `products.current_stock` automatiskt vid varje ny transaktion.

**RLS-policys:**
- Alla inloggade: läsa produkter, transaktioner och profiler
- Bara admin: skriva/uppdatera/ta bort produkter
- Inloggad user: insertar bara transaktioner med eget `user_id`

---

## Arkitektur

```
Browser (HashRouter)
└── React App
    ├── AuthContext          ← Supabase-session, profil, roll
    ├── Layout + NavBar      ← Skyddad route, rollfiltrerad nav
    └── Pages
        ├── Login            ← Supabase signInWithPassword
        ├── StockList        ← products.getAll()
        ├── Scan             ← BarcodeDetector / ZXing → transactions.register()
        ├── Products         ← products CRUD (admin only)
        ├── History          ← transactions.getAll() (admin only)
        └── Export           ← CSV/JSON via Blob + anchor-click

Supabase
├── Auth           ← Session, JWT
├── PostgreSQL     ← products, stock_transactions, profiles
└── RLS            ← Policys per tabell och roll
```

---

## CI/CD-flöde

```
feature-branch
    │
    ├─► PR öppnad
    │       └─► PR Preview → deploys till /pr-preview/pr-{N}/
    │       └─► E2E Tests (PR Preview) → kör tester, postar ✅/❌ på PR
    │
    ├─► Merge till main (efter ✅ preview + ✅ E2E-kommentar)
    │       └─► Deploy to GitHub Pages → production
    │       └─► E2E Tests → verifierar produktion
    │
    └─► Klar
```

Direkt push till `main` är förbjudet. Se `CLAUDE.md` för fullständiga instruktioner.

---

## Begränsningar

- BarcodeDetector API saknas i Firefox och äldre Safari — ZXing-fallback täcker dessa
- HashRouter gör att URL:er inte är direktlänkbara som vanliga paths (men 404.html-trick löser SPA-routing på GitHub Pages)
- Supabase free tier har pausregler vid inaktivitet — inte lämpligt för produktion utan uppgradering

---

## Post-MVP (möjliga nästa steg)

- PWA / installationsbar app med offlinestöd
- Push-notiser vid lågt lager
- Flera lagerplatser/lokationer
- Inventering (fysisk räkning mot systemsaldo)
- Integration mot affärssystem (Fortnox, Visma)
- Etikettgenerering (QR/streckkod)
- Mobilapp (React Native eller PWA)
