# Lagerapp — Spec v2

> Genererad: 2026-03-28  
> Status: MVP-spec, redo för implementation

---

## Koncept

En mobil- och webbapp där ett litet team skannar streckkoder/QR-koder för att registrera och hantera fysiska produkter i ett lager. Webbversionen (v0) deployas som statisk Blazor WebAssembly-app via GitHub Pages. Mobilstrategi avgörs efter MVP.

---

## Användare och problem

- **[Bekräftat]** Primära användare: litet team, 2–10 personer
- **[Bekräftat]** Roller behövs — admin och lagerarbetare
- **[Bekräftat]** Problemet: manuell eller obefintlig spårning av lagerartiklar är ineffektiv och felprone

---

## Mål och framgångskriterier

- **[Bekräftat]** En användare ska kunna scanna en produkt och se/uppdatera dess lagerstatus på under 5 sekunder
- **[Rekommenderat]** Lagersaldot ska alltid reflektera senast registrerade in/ut-händelse
- **[Rekommenderat]** Admins ska kunna se transaktionshistorik
- **[Bekräftat]** Webb-v0 ska kunna deployas direkt till GitHub Pages utan extern serverinfrastruktur

---

## Funktioner — MVP

### Scanning & registrering
- **[Bekräftat]** Scanna streckkod/QR-kod via kameran i webbläsaren
- **[Rekommenderat]** Registrera inleverans (öka saldo) och utleverans (minska saldo)
- **[Rekommenderat]** Manuell sökning/inmatning som fallback om scan misslyckas

### Produkthantering
- **[Rekommenderat]** Skapa/redigera produkt med namn, SKU/streckkod, enhet, miniminivå
- **[Rekommenderat]** Visa aktuellt saldo per produkt med varning vid lågt saldo

### Användare & roller
- **[Bekräftat]** Inloggning med roller: admin och lagerarbetare
- **[Rekommenderat]** Admin hanterar produkter och användare; lagerarbetare registrerar rörelser

### Översikt
- **[Rekommenderat]** Lagerlista med saldo, sökbar och filterbar

### Dataexport
- **[Bekräftat]** Export till CSV-fil — filnedladdning via JS interop i Blazor WASM
- **[Bekräftat]** Export till JSON-fil — filnedladdning via JS interop i Blazor WASM
- **[Bekräftat]** Mailto-funktion — öppnar mejlklient med CSV-data i kroppen via `mailto:?body=...`
- **[Rekommenderat]** Visa varning om data överstiger mailto URL-gränsen (~2000 tecken) och hänvisa till filexport

---

## Funktioner — Post-MVP

- Nativ mobilapp (MAUI eller PWA)
- Flera lagerplatser/lokationer
- Backend + riktig databas (ASP.NET Core + PostgreSQL/SQL Server)
- Riktig auth (ASP.NET Core Identity + JWT)
- Integration mot affärssystem (Fortnox, Visma)
- Etikettgenerering (QR/streckkod)
- Inventering (räkna om hela lagret)

---

## Beslutsyta: teknik och arkitektur

| Område | Status | Val | Motivering |
|---|---|---|---|
| Webb-frontend | bekräftat | Blazor WebAssembly | Enda C#-lösningen som kan deployas statiskt till GitHub Pages |
| Mobilapp | öppet | MAUI eller PWA (Blazor) | Avgörs efter MVP — PWA snabbast, MAUI ger mer native-känsla |
| Backend/API | öppet | Ingen i v0 — lokal state; därefter ASP.NET Core Web API | GitHub Pages har ingen server |
| Databas | öppet | PostgreSQL eller SQL Server | Avgörs när backend tillkommer |
| Auth | öppet | Enkel lokal auth i v0; ASP.NET Core Identity + JWT i v1 | GitHub Pages stödjer ingen serverside-auth |
| Scanning (webb) | rekommenderat | JS interop mot `BarcodeDetector` API eller `ZXing.JS` | Kameraaccess i Blazor WASM kräver JS interop |
| Hosting v0 | bekräftat | GitHub Pages | Statisk deploy av Blazor WASM |
| Hosting v1+ | öppet | Azure Static Web Apps, Fly.io eller annat | Behövs när backend tillkommer |
| Export | bekräftat | CSV + JSON via JS interop (filnedladdning) | Fungerar i statisk WASM utan backend |
| Mailto | bekräftat | `mailto:?body=` med CSV i kroppen | Bifogade filer via data URI stöds inte av webbläsare |

---

## Datamodell

> I v0 lagras all data i `localStorage`. Ingen synk mellan användare eller enheter.

```jsonc
{
  "Product": {
    "id": "uuid",
    "name": "Skruv M6",
    "sku": "SKU-001",        // används som sök-nyckel
    "barcode": "7312345...", // skannat värde
    "unit": "st",
    "minStock": 50,          // larmgräns
    "currentStock": 142
  },
  "StockTransaction": {
    "id": "uuid",
    "productId": "uuid",
    "type": "in" | "out",
    "quantity": 10,
    "timestamp": "ISO8601",
    "userId": "uuid"
  },
  "User": {
    "id": "uuid",
    "email": "...",
    "role": "admin" | "worker",
    "passwordHash": "..."    // enkel lokal hash i v0, ersätts av riktig auth i v1
  }
}
```

---

## Risker och öppna frågor

- **[Öppet]** v0 är single-device — localStorage delas inte mellan användare eller enheter
- **[Öppet]** Blazor WASM + kameraaccess kräver JS interop för scanning — välj bibliotek tidigt
- **[Öppet]** Auth i v0 är lokal/falsk — migreringsväg till riktig auth i v1 måste planeras
- **[Öppet]** Mobilstrategi olöst — PWA från Blazor-appen är snabbaste vägen
- **[Bekräftat]** Mailto + bifogad fil via data URI stöds inte av webbläsare — filnedladdning är primär exportväg

---

## Nästa rekommenderade iteration

Sätt upp Blazor WASM-projektet med GitHub Pages-deploy och en fungerande scan-komponent. Kameraaccess via JS interop är den högsta tekniska risken och bör valideras innan övrig MVP byggs.
