# Lagerapp -- v1 Utvecklingsplan

> **Skapad:** 2026-04-04
> **Repo:** <https://github.com/Haaanky/silver-octo-succotash>
> **Forutsattning:** v0 (MVP) ar komplett och driftsatt pa GitHub Pages

---

## Innehall

- [Syfte med v1](#syfte-med-v1)
- [Tekniska beslut](#tekniska-beslut-som-maste-fattas-fore-v1-start)
- [Features i v1](#features-i-v1)
  - [F-01 Backend -- ASP.NET Core Web API](#f-01--backend--aspnet-core-web-api-p1)
  - [F-02 Delad databas (PostgreSQL)](#f-02--delad-databas-postgresql-p1)
  - [F-03 Autentisering](#f-03--autentisering--aspnet-core-identity--jwt-p1)
  - [F-04 Blazor WASM kopplas mot API](#f-04--blazor-wasm-kopplas-mot-api-p1)
  - [F-05 Anvandarhantering (admin)](#f-05--anvandarhantering-admin-p1)
  - [F-06 PWA-stod](#f-06--pwa-stod-progressive-web-app-p2)
  - [F-07 CI/CD for API + Frontend](#f-07--cicd-for-api--frontend-p2)
  - [F-08 Inventering](#f-08--inventering-p2)
  - [F-09 Etikettgenerering](#f-09--etikettgenerering-p3)
  - [F-10 Flera lagerplatser/lokationer](#f-10--flera-lagerplatserlokationer-p3)
- [Datamodell -- tillagg i v1](#datamodell--tillagg-i-v1)
- [Migreringsväg fran v0](#migreringsvag-fran-v0)
- [Arkitektur v1 -- oversikt](#arkitektur-v1--oversikt)
- [Definition of Done -- v1 komplett](#definition-of-done--v1-komplett)
- [Oppna fragor att besluta innan sprint 1](#oppna-fragor-att-besluta-innan-sprint-1)

---

## Syfte med v1

v0 ar en single-device, localStorage-baserad proof of concept. v1 introducerar en riktig backend, delad databas och akta autentisering -- vilket gor appen anvandbar for ett faktiskt team pa flera enheter.

**Huvudsakliga mal:**

1. **Delad data** -- alla enheter och anvandare ser samma lagerdata i realtid
2. **Akta autentisering** -- JWT-baserad auth med rollstyrning (admin/worker)
3. **Skalbar arkitektur** -- ASP.NET Core Web API + PostgreSQL som grund for framtida features
4. **Mobilanpassning** -- PWA-stod for installation pa mobila enheter

---

## Tekniska beslut som maste fattas fore v1-start

Dessa ar markerade `[Oppet]` i spec v2 och maste lasas innan implementation paborjas.

| # | Beslut | Alternativ | Rekommendation | Status |
|---|--------|-----------|----------------|--------|
| 1 | **Hosting v1** | Azure Static Web Apps, Fly.io, Railway, Azure App Service | **Azure Static Web Apps** -- inbyggt stod for Blazor WASM + API i samma deploy | `[Oppet]` |
| 2 | **Databas** | PostgreSQL, SQL Server | **PostgreSQL** -- gratis tier pa Fly.io/Railway/Supabase, oppen standard | `[Oppet]` |
| 3 | **Auth-losning** | ASP.NET Core Identity + JWT, Azure AD B2C, Auth0 | **ASP.NET Core Identity + JWT** -- fullt C#, inga externa beroenden | `[Oppet]` |
| 4 | **Mobilstrategi** | PWA (Blazor), .NET MAUI | **PWA** -- Blazor-appen konverteras med minimalt extraarbete | `[Oppet]` |
| 5 | **ORM** | EF Core, Dapper | **EF Core** -- naturligt val i ASP.NET Core-ekosystemet | `[Oppet]` |

> **Instruktion:** Dessa beslut ska dokumenteras med `[Bekraftat]` i `lagerapp-spec.md` innan v1-arbete startas.

---

## Features i v1

Prioritetsordning: **P1** = maste finnas i v1, **P2** = bor finnas, **P3** = kan skjutas till v2.

### Oversikt

| Feature | Namn | Prioritet | Beroenden |
|---------|------|-----------|-----------|
| F-01 | Backend -- ASP.NET Core Web API | P1 | -- |
| F-02 | Delad databas (PostgreSQL) | P1 | F-01 |
| F-03 | Autentisering (Identity + JWT) | P1 | F-01, F-02 |
| F-04 | Blazor WASM kopplas mot API | P1 | F-01, F-03 |
| F-05 | Anvandarhantering (admin) | P1 | F-03 |
| F-06 | PWA-stod | P2 | F-04 |
| F-07 | CI/CD for API + Frontend | P2 | F-01 |
| F-08 | Inventering | P2 | F-01, F-02, F-03 |
| F-09 | Etikettgenerering | P3 | F-04 |
| F-10 | Flera lagerplatser/lokationer | P3 | F-01, F-02 |

### Rekommenderad implementationsordning

```
Sprint 1:  F-01 → F-02 → F-03       (backend-grund)
Sprint 2:  F-04 → F-05              (frontend-integration + admin)
Sprint 3:  F-07 → F-06 → F-08       (CI/CD, PWA, inventering)
Sprint 4:  F-09, F-10               (om tid finns, annars v2)
```

---

### F-01 -- Backend -- ASP.NET Core Web API `[P1]`

**Motivation:** Utan backend kan ingen data delas mellan enheter eller anvandare.

**Omfattning:**

- ASP.NET Core Web API (.NET 9)
- REST-endpoints for Products, StockTransactions, Users
- EF Core mot PostgreSQL (eller SQL Server)
- Kors separat fran Blazor WASM-frontend
- Projektstruktur under `/src/LagerApp.Api`

**API-endpoints (initialt):**

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/products` | Lista alla produkter |
| GET | `/api/products/{id}` | Hamta enskild produkt |
| POST | `/api/products` | Skapa produkt |
| PUT | `/api/products/{id}` | Uppdatera produkt |
| DELETE | `/api/products/{id}` | Ta bort produkt |
| GET | `/api/transactions` | Lista alla transaktioner |
| GET | `/api/transactions?productId={id}` | Lista transaktioner per produkt |
| POST | `/api/transactions` | Skapa transaktion |

**Definition of Done:**

- [ ] API-projekt skapas i samma repo under `/src/LagerApp.Api`
- [ ] EF Core migrations skapar databasschemat utan fel
- [ ] Alla CRUD-endpoints for `Product` fungerar och returnerar korrekt HTTP-statuskod
- [ ] Alla endpoints for `StockTransaction` (skapa, lista per produkt, lista alla) fungerar
- [ ] API kors lokalt med `dotnet run`

---

### F-02 -- Delad databas (PostgreSQL) `[P1]`

**Motivation:** Ersatter localStorage som datakalla. Alla enheter och anvandare ser samma data.

**Omfattning:**

- EF Core DbContext med entiteter: `Product`, `StockTransaction`, `User`
- Migrations-baserat schema
- Connection string via miljovariabel / secrets (aldrig hardkodad)
- Seed-data for initialt admin-konto

**Definition of Done:**

- [ ] `dotnet ef migrations add InitialCreate` kors utan fel
- [ ] `dotnet ef database update` applicerar schema mot lokal PostgreSQL
- [ ] Data skapad via API syns i databasen
- [ ] Connection string lases fran `appsettings.Development.json` lokalt och miljovariabel i produktion

---

### F-03 -- Autentisering -- ASP.NET Core Identity + JWT `[P1]`

**Motivation:** v0 har lokal/falsk auth. v1 behover akta auth for att skydda API-endpoints.

**Omfattning:**

- ASP.NET Core Identity med PostgreSQL-provider
- Login-endpoint returnerar JWT access token
- Blazor WASM skickar JWT i `Authorization: Bearer`-header
- Rollbaserad auktorisering: `admin` och `worker`
- Skyddade endpoints med `[Authorize]` / `[Authorize(Roles = "admin")]`
- Token-fornyelse (refresh token) overvagas for v1 men ar inte ett krav

**API-endpoints:**

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| POST | `/api/auth/login` | Logga in, returnerar JWT |
| POST | `/api/auth/register` | Registrera anvandare (admin-only) |
| GET | `/api/auth/me` | Hamta inloggad anvandares info |

**Definition of Done:**

- [ ] `POST /api/auth/login` returnerar JWT vid korrekt e-post + losenord
- [ ] `POST /api/auth/login` returnerar 401 vid felaktiga uppgifter
- [ ] Alla produkt- och transaktions-endpoints kraver giltig JWT
- [ ] Admin-only endpoints avvisar `worker`-token med 403
- [ ] Blazor WASM lagrar token i `sessionStorage` (inte localStorage) och skickar den i varje API-anrop

---

### F-04 -- Blazor WASM kopplas mot API `[P1]`

**Motivation:** Frontend byter datakalla fran localStorage till API.

**Omfattning:**

- `HttpClient` konfigureras med bas-URL mot API
- `ILocalStorageService` ersatts av HTTP-anrop i alla services
- Laddningsindikatorer visas under API-anrop
- Felhantering: natverksfel och 4xx/5xx visas som anvandarvliga meddelanden
- AuthenticationStateProvider implementeras baserat pa JWT

**Andrade services:**

| Service | Fore (v0) | Efter (v1) |
|---------|-----------|------------|
| `ProductService` | localStorage | `HttpClient` → `/api/products` |
| `StockService` | localStorage | `HttpClient` → `/api/transactions` |
| `AuthService` | Lokal mock | `HttpClient` → `/api/auth` |

**Definition of Done:**

- [ ] Lagerlistan hamtar produkter fran API
- [ ] Scanning registrerar transaktion mot API
- [ ] Produkthantering (CRUD) fungerar mot API
- [ ] Transaktionshistorik hamtas fran API
- [ ] Fel fran API visas i UI utan att appen kraschar

---

### F-05 -- Anvandarhantering (admin) `[P1]`

**Motivation:** Admin ska kunna skapa och hantera anvandare -- en funktion som inte ar mojlig att bygga utan backend.

**Omfattning:**

- Admin-sida `/admin/users`
- Skapa ny anvandare (e-post, losenord, roll)
- Byta roll pa befintlig anvandare
- Avaktivera/ta bort anvandare
- Sidan ar enbart tillganglig for `admin`-rollen

**Definition of Done:**

- [ ] Admin kan skapa en `worker`-anvandare via UI
- [ ] Ny anvandare kan logga in direkt
- [ ] Admin kan andra roll fran `worker` till `admin` och vice versa
- [ ] Borttagen anvandare kan inte logga in

---

### F-06 -- PWA-stod (Progressive Web App) `[P2]`

**Motivation:** Gor webb-appen installerbar pa mobil utan att bygga en separat app. Loser mobilstrategin med minimalt extraarbete.

**Omfattning:**

- `manifest.json` med ikon, namn, `display: standalone`
- Service Worker for offline-cachning av app shell
- HTTPS kravs (uppfylls av vald hosting)
- Offline-indikator i UI

**Definition of Done:**

- [ ] Appen kan installeras fran Chrome/Safari pa Android/iOS
- [ ] App-ikonen och namnet visas korrekt pa hemskaren
- [ ] Appen startar utan natverksanslutning (visar app shell, inte blank sida)
- [ ] Online-funktioner (scan, lista) fungerar nar natverk finns

---

### F-07 -- CI/CD for API + Frontend `[P2]`

**Motivation:** v0 har GitHub Actions for Blazor WASM. v1 behover pipeline som aven bygger och deployer API.

**Omfattning:**

- Bygg och testa API i pipeline (`dotnet build`, `dotnet test`)
- Kor EF Core migrations automatiskt vid deploy
- Deploy API till vald hosting (Azure, Fly.io, etc.)
- Deploy Blazor WASM med uppdaterad API-bas-URL
- Separata steg for staging/preview och produktion

**Definition of Done:**

- [ ] Push till `main` triggar pipeline
- [ ] Pipeline misslyckas om `dotnet build` eller `dotnet test` failar
- [ ] API deployas och ar nabart pa produktions-URL
- [ ] Blazor WASM deployas och pekar mot produktions-API
- [ ] Migrations kors automatiskt utan manuell inblandning

---

### F-08 -- Inventering `[P2]`

**Motivation:** Mojlighet att rakna om hela lagret och ratta saldon mot verkligheten.

**Omfattning:**

- Inventeringssession: skapa, genomfora, avsluta
- Lagerarbetare anger raknat antal per produkt
- Systemet skapar justerings-transaktioner for differenser
- Admin godkanner inventeringsresultatet
- Historik over genomforda inventeringar

**Arbetsflode:**

```
Admin startar inventering
       ↓
Workers registrerar raknat antal per produkt
       ↓
Systemet beraknar differenser (raknat vs systemsaldo)
       ↓
Admin granskar och godkanner
       ↓
Justeringstransaktioner skapas automatiskt
       ↓
Saldon uppdateras, inventering markeras som avslutad
```

**Definition of Done:**

- [ ] Admin kan starta en inventeringssession
- [ ] Worker kan registrera raknat antal per produkt
- [ ] Differens beraknas och visas (raknat vs systemets saldo)
- [ ] Admin godkanner → justeringstransaktioner skapas → saldon uppdateras
- [ ] Avslutad inventering syns i historiken

---

### F-09 -- Etikettgenerering `[P3]`

**Motivation:** Generera QR-kod eller streckkodsetikett per produkt som kan skrivas ut.

**Omfattning:**

- Generera QR-kod baserat pa produktens `barcode`-falt
- Renderas som SVG eller PNG i webblasaren
- Utskrift-vanlig layout
- Mojlighet att skriva ut flera etiketter at gangen

**Definition of Done:**

- [ ] Varje produkt har en "Generera etikett"-knapp
- [ ] QR-kod renderas korrekt och kan skannas av kamera
- [ ] Etiketten kan skrivas ut fran webblasaren

---

### F-10 -- Flera lagerplatser/lokationer `[P3]`

**Motivation:** Stod for att en produkt kan finnas pa flera platser (hylla, rum, byggnad).

**Omfattning:**

- Ny entitet: `Location` (id, name)
- `StockTransaction` kopplas till `Location`
- Lagerlistan kan filtreras per location
- Produktens saldo visas per location
- Admin hanterar locations (CRUD)

**Definition of Done:**

- [ ] Admin kan skapa och namnge locations
- [ ] In/ut-registrering kraver val av location
- [ ] Lagerlistan kan filtreras per location
- [ ] Produktdetaljvy visar saldo uppdelat per location

---

## Datamodell -- tillagg i v1

Foljande andringar gors mot v0-modellen:

```csharp
// Ny entitet (F-10, P3)
public class Location
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

// Andring i StockTransaction
public class StockTransaction
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string Type { get; set; } = string.Empty;   // "in" | "out" | "adjustment"
    public int Quantity { get; set; }
    public DateTime Timestamp { get; set; }
    public Guid UserId { get; set; }                    // ny -- koppling till inloggad anvandare
    public Guid? LocationId { get; set; }               // ny, nullable -- laggs till om F-10 byggs
}

// Ny entitet (F-08, P2)
public class InventorySession
{
    public Guid Id { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public Guid StartedByUserId { get; set; }
    public string Status { get; set; } = string.Empty;  // "open" | "completed"
}

// Ny entitet (F-08, P2) -- rakning per produkt i en inventeringssession
public class InventoryCount
{
    public Guid Id { get; set; }
    public Guid InventorySessionId { get; set; }
    public Guid ProductId { get; set; }
    public int CountedQuantity { get; set; }
    public int SystemQuantity { get; set; }
    public Guid CountedByUserId { get; set; }
    public DateTime CountedAt { get; set; }
}
```

**ER-diagram (forenklat):**

```
┌──────────┐     ┌──────────────────┐     ┌─────────┐
│ Product  │────<│ StockTransaction │>────│  User   │
└──────────┘     └────────┬─────────┘     └─────────┘
                          │                     │
                          │ (nullable)          │
                          ▼                     │
                   ┌──────────┐                 │
                   │ Location │                 │
                   └──────────┘                 │
                                                │
┌──────────────────┐     ┌────────────────┐     │
│ InventorySession │────<│ InventoryCount │>────┘
└──────────────────┘     └────────────────┘
```

---

## Migreringsvag fran v0

v0 lagrar data i `localStorage`. Vid overgang till v1:

1. **Exportera data** -- Exportfunktionen i v0 (JSON-export) anvands for att ta ut befintlig data
2. **Importera via API** -- Ett migrerings-script (eller admin-UI) importerar JSON till PostgreSQL via API
3. **Rensa localStorage** -- localStorage rensas nar anvandaren bekraftar migreringen

> **Obs:** Migreringsscriptet ar inte en del av v1-scopet men migrationsavagen ska vara dokumenterad och mojlig att genomfora manuellt.

**Rekommenderat tillvagagangssatt:**

```bash
# 1. Exportera fran v0 (i webblasaren)
#    Anvand Export-sidan → JSON-nedladdning

# 2. Importera till v1 (via API)
curl -X POST https://api.example.com/api/import \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d @exported-data.json

# 3. Verifiera att data finns i v1
# 4. Rensa localStorage i webblasaren
```

---

## Arkitektur v1 -- oversikt

```
┌─────────────────────────────────────┐
│       GitHub Actions (CI/CD)        │
│       build → test → deploy         │
└──────────┬──────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌───────────┐  ┌──────────────────────┐
│  Blazor   │  │ ASP.NET Core Web API │
│  WASM     │  │ (.NET 9)             │
│ (static)  │  │ + Identity + JWT     │
└─────┬─────┘  └──────────┬───────────┘
      │   HTTP + JWT       │
      └────────────────────┘
                           │ EF Core
                           ▼
                  ┌─────────────────┐
                  │   PostgreSQL    │
                  └─────────────────┘
```

**Kommunikationsflode:**

1. Anvandaren oppnar Blazor WASM i webblasaren
2. Blazor skickar `POST /api/auth/login` med credentials
3. API validerar mot Identity och returnerar JWT
4. Blazor lagrar JWT i `sessionStorage`
5. Alla efterfoljande API-anrop inkluderar `Authorization: Bearer <token>`
6. API validerar token och returnerar data fran PostgreSQL

---

## Definition of Done -- v1 komplett

Alla nedanstaende villkor ska vara uppfyllda for att v1 ar klar:

### P1-krav (maste)

- [ ] **F-01** API byggs och kors utan fel
- [ ] **F-02** Databas skapas via migrations, data persisterar
- [ ] **F-03** Login returnerar JWT, endpoints ar skyddade, roller fungerar
- [ ] **F-04** Blazor WASM kommunicerar uteslutande mot API (ingen localStorage for affarsdata)
- [ ] **F-05** Admin kan skapa och hantera anvandare

### P2-krav (bor)

- [ ] **F-06** Appen ar installerbar som PWA pa mobil *(om P2 godkanns)*
- [ ] **F-07** CI/CD pipeline bygger, testar och deployer vid push till `main`
- [ ] **F-08** Inventering fungerar fran start till godkannande

### Generella krav

- [ ] Inga hardkodade secrets eller connection strings i repo
- [ ] Minst ett integrations- eller end-to-end-test per P1-feature
- [ ] README i repo beskriver hur man satter upp projektet lokalt
- [ ] Alla API-endpoints ar dokumenterade (Swagger/OpenAPI)
- [ ] Felhantering ar konsekvent -- API returnerar strukturerade felmeddelanden

---

## Oppna fragor att besluta innan sprint 1

| # | Fraga | Alternativ | Status |
|---|-------|-----------|--------|
| 1 | Vilken hosting valjs for API? | Azure App Service, Fly.io, Railway | `[Oppet]` |
| 2 | Vilken hosting valjs for databasen? | Supabase, Fly.io Postgres, Azure Database | `[Oppet]` |
| 3 | Ska F-06 (PWA) vara en del av v1 eller skjutas till v2? | v1 / v2 | `[Oppet]` |
| 4 | Ska F-08 (inventering) vara en del av v1 eller skjutas till v2? | v1 / v2 | `[Oppet]` |
| 5 | Hur hanteras lokala dev-miljoer? | `docker-compose` for PostgreSQL rekommenderas | `[Oppet]` |

> **Instruktion:** Besluta dessa punkter och uppdatera detta dokument med `[Bekraftat]` innan implementation startas.

---

## Anvandbara kommandon for lokal utveckling

```bash
# Starta PostgreSQL lokalt (rekommenderat)
docker-compose up -d postgres

# Kora API lokalt
cd src/LagerApp.Api
dotnet run

# Kora migrations
cd src/LagerApp.Api
dotnet ef migrations add <MigrationName>
dotnet ef database update

# Kora Blazor WASM lokalt
cd src/LagerApp.Client
dotnet run

# Kora tester
dotnet test
```

---

*Senast uppdaterad: 2026-04-04*
