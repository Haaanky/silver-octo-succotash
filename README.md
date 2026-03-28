# LagerApp

**Live:** https://silver-octo-succotash.frisemo.dev

En webb-baserad lagerhanteringsapp för att scanna streckkoder/QR-koder och hålla koll på lagersaldo. Byggd med Blazor WebAssembly och deployad som statisk app via GitHub Pages.

## Funktioner (MVP)

- **Scanning** — scanna streckkoder och QR-koder via kameran i webbläsaren
- **Lagersaldo** — registrera inleverans och utleverans per produkt
- **Produkthantering** — skapa och redigera produkter med namn, SKU, enhet och miniminivå
- **Larmgräns** — varning visas när lagersaldo sjunker under miniminivå
- **Transaktionshistorik** — se alla registrerade rörelser
- **Roller** — admin och lagerarbetare med olika behörigheter
- **Export** — exportera lagerdata till CSV eller JSON via filnedladdning
- **Mailto** — skicka data via e-postklient med CSV i meddelandekroppen

## Teknik

| Område | Val |
|---|---|
| Frontend | Blazor WebAssembly (.NET) |
| Lagring | `localStorage` (ingen backend i v0) |
| Scanning | JS interop mot `BarcodeDetector` API / ZXing.JS |
| Export | JS interop (filnedladdning) |
| Hosting | GitHub Pages |

## Kom igång

### Krav

- [.NET SDK](https://dotnet.microsoft.com/download) 8.0 eller senare

### Kör lokalt

```bash
git clone https://github.com/haaanky/silver-octo-succotash.git
cd silver-octo-succotash/LagerApp
dotnet run
```

Öppna `https://localhost:5001` i webbläsaren.

### Bygg och publicera

```bash
dotnet publish -c Release
```

## Projektstruktur

```
LagerApp/
├── Pages/          # Sidor: Index, Scan, Products, History, Export, Login
├── Shared/         # Layout och komponenter (t.ex. BarcodeScanner)
├── Services/       # Affärslogik: auth, produkter, transaktioner, export
├── Models/         # Datamodeller: Product, StockTransaction, User
└── wwwroot/
    ├── js/         # scanner.js, export.js (JS interop)
    └── css/        # app.css
```

## Datalagring

All data lagras i webbläsarens `localStorage`. Data delas inte mellan användare eller enheter i v0.

## Begränsningar (v0)

- Single-device — ingen synkronisering mellan användare
- Lokal autentisering — ersätts av riktig auth i v1
- Mailto-export har en URL-längdgräns (~2000 tecken) — filnedladdning rekommenderas för stora datamängder

## Roadmap (Post-MVP)

- Nativ mobilapp (MAUI eller PWA)
- Backend med riktig databas (ASP.NET Core + PostgreSQL)
- Riktig autentisering (ASP.NET Core Identity + JWT)
- Flera lagerplatser
- Integration mot affärssystem (Fortnox, Visma)
- Etikettgenerering
