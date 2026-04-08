# LagerApp – instruktioner för Claude Code

## Testdriven utveckling (TDD)

**All ny funktionalitet och alla bugfixar MÅSTE utvecklas med TDD-metodik.**

### TDD-arbetssätt

1. **Skriv testet först** – innan du skriver implementationskoden, skriv ett Playwright-test som verifierar den önskade funktionaliteten. Testet ska misslyckas (rött) initialt.

2. **Implementera minimalt** – skriv tillräckligt med kod för att testet ska bli grönt. Inget mer.

3. **Refaktorera vid behov** – städa upp koden medan testerna förblir gröna.

4. **Iterera tills alla tester alltid är gröna** – ingen förändring är klar förrän ALLA tester (både nya och befintliga) konsekvent passerar i CI. Om ett test misslyckas intermittent räknas det inte som godkänt – fixa grundorsaken.

### ⛔ Acceptera aldrig intermittenta testfel

- Tester som "ibland" misslyckas är buggar – åtgärda dem, skippa dem inte
- Öka inte timeout:s som en quick fix utan att förstå grundorsaken
- Ett test som skippas (`test.skip`) räknas som ett misslyckat test
- Iterera: fixa → pusha → vänta på CI → kontrollera → upprepa tills grönt

## Testning och verifiering

**Alla ändringar MÅSTE verifieras i den deployade preview-miljön INNAN de mergas till `main`.**

### ⛔ Pusha ALDRIG direkt till `main`

Ändringar görs alltid via Pull Request. Direkt push till `main` är förbjudet – inte ens för "enkla" fixes eller teständringar. Anledningen är att varje merge till main triggar en deploy till produktion, och det MÅSTE verifieras i preview-miljön först.

### Obligatoriska steg för varje förändring

1. **Utveckla på en feature-branch** och pusha den till origin.

2. **Öppna en Pull Request** mot `main`. GitHub Actions kör då automatiskt `PR Preview`-workflowen och deployar en preview-version av appen till:
   ```
   https://silver-octo-succotash.frisemo.dev/pr-preview/pr-{nummer}/
   ```

3. **Vänta på att preview-deployen är klar** – kontrollera att `PR Preview`-workflowen är grön i GitHub Actions. Kort efter triggas också `E2E Tests (PR Preview)` automatiskt som kör E2E-testerna mot preview-URL:en och postar resultatet som en kommentar på PR:en (workflowen misslyckas aldrig = inga e-postnotiser).

4. **Kontrollera E2E-kommentaren och preview-siten** – hämta preview-URL:en med WebFetch:
   ```
   WebFetch: https://silver-octo-succotash.frisemo.dev/pr-preview/pr-{nummer}/
   Prompt: Does the page load with a title and script tags? Are there asset URLs present?
   ```
   Sidan ska ha rätt asset-URLs (med `/pr-preview/pr-{nummer}/` som bas). Om HTML:en är tom eller saknar script-taggar är något fel med bygget.

5. **Mergea PR:en till `main`** – först när preview-siten ser korrekt ut OCH E2E-kommentaren på PR:en visar ✅.

6. **Vänta på att main-deployen är klar** – `Deploy to GitHub Pages`-workflowen ska bli grön.

7. **Verifiera att E2E-testerna blir gröna i CI** – `E2E Tests`-workflowen körs automatiskt efter deploy. Kontrollera att den passerar i GitHub Actions. Om den misslyckas: läs felloggarna, fixa på feature-branch, öppna ny PR, iterera från steg 2.

### ⚠️ Viktig begränsning i Claude Code-containern

Claude Code körs i en container med en HTTPS-intercepterande proxy (`HTTPS_PROXY` / `HTTP_PROXY` är satta). Chromium kan inte köra mot den live-deployade siten inifrån containern.

**Konsekvens:** `npm test` kan inte köras framgångsrikt direkt i Claude Code-containern.

**Verifiera alltid via GitHub Actions CI** – se steg 6–7 ovan.

### ⚠️ Gröna CI-tester räcker INTE – verifiera att siten faktiskt fungerar

**Gröna tester och lyckad deployment är nödvändigt men inte tillräckligt.** Vanliga orsaker till vit/trasig sida trots gröna tester:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` saknas eller är tomma som GitHub Secrets → `createClient("", "")` kastar fel
- JavaScript-kraschar under boot som inte syns i tester

**Om siten är vit men tester är gröna:** testerna kan ha timeout:at för tidigt. Fixa grundorsaken, öppna ny PR, iterera.

### ⚠️ GitHub Actions – Supabase-credentials i preview vs. deploy

Supabase-credentials hanteras olika beroende på workflow-typ:

**PR Preview (`pr-preview.yml`):**  
Credentials är inbäddade direkt i workflow-filen som publika värden (Supabase anon-nyckeln är avsedd att vara publik och bäddas in i webbläsaren ändå). Workflowen kräver **inte** `environment: Supabase`, vilket innebär att bot-skapade PRs (t.ex. copilot-swe-agent) kan köra preview-deployen utan mänskligt godkännande.

**Deploy och E2E (`deploy.yml`, `e2e.yml`, `e2e-pr.yml`):**  
`VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY` hämtas via `environment: Supabase` (miljöhemligheter). Dessa workflows triggas av push till `main` eller av andra workflows, inte direkt av bot-PR:s.

**Regel:** Jobb som behöver Supabase-service-role-nyckel eller andra känsliga credentials ska använda `environment: Supabase`. Preview-byggen behöver bara den publika anon-nyckeln.

Befintliga jobb med `environment: Supabase`:
- `deploy.yml` → `deploy`-jobbet
- `e2e.yml` → `test`-jobbet
- `e2e-pr.yml` → `test`-jobbet

**Symptom om credentials saknas i pr-preview:** Appen byggs med tomma Supabase-URL → blank sida → ALLA E2E-tester timeout:ar (~30 min körtid). Verifiera felet genom att hämta JS-bundeln och söka efter Supabase-URL:en – om den saknas är det detta problem.

### Vad testerna täcker

Testerna i `tests/e2e/app.spec.ts` verifierar att följande faktiskt fungerar i produktion:

- Sidan laddas och omdirigerar till `/login` (inte blank/vit sida)
- Inloggning med `admin@lager.se` / `admin123` fungerar och visar `Lagerlista`
- Felmeddelande visas vid fel lösenord
- Navbar visas med korrekt användarinfo efter inloggning
- Navigation till alla sidor: Lagerlista, Skanna, Produkter, Historik, Export
- Lagerlistan visar produkttabell och sökfilter fungerar
- Produkthantering: skapa, redigera, avbryt (CRUD)
- Skanna: okänd streckkod visar varning, inleverans registreras
- Historik: tabell eller tomt-meddelande visas
- Export: CSV- och JSON-nedladdning fungerar med bekräftelsemeddelande
- Utloggning omdirigerar till `/login`
- Skyddade sidor utan session omdirigerar till `/login`

### Lägga till tester för ny funktionalitet

**Lägg alltid till Playwright-tester för ny funktionalitet** i `tests/e2e/app.spec.ts` (eller ny fil under `tests/e2e/`).

Varje ny sida eller funktion ska ha minst:
- Ett test som verifierar att sidan laddas och visar rätt innehåll
- Ett test som verifierar den primära funktionaliteten (happy path)
- Ett test för felhantering om relevant

### Köra enstaka tester (om miljön tillåter)

```bash
# Kör bara ett specifikt describe-block
PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright npx playwright test --grep "Produkthantering"

# Visa rapport efter körning
npm run test:report
```

### Infrastruktur

- Tester körs med Playwright + Chromium
- Browser cachas i `~/.cache/ms-playwright/`
- Om `@playwright/test` saknas: `npm ci`
- Om browser saknas: `npx playwright install chromium --with-deps`
- Playwright-version måste matcha cachad browser-version (se `package.json`)
- `playwright.config.ts` läser automatiskt `HTTPS_PROXY`/`HTTP_PROXY` från miljön och konfigurerar Chromium med proxy-credentials
