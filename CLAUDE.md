# LagerApp – instruktioner för Claude Code

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

3. **Vänta på att preview-deployen är klar** – kontrollera att `PR Preview`-workflowen är grön i GitHub Actions.

4. **Verifiera att preview-siten faktiskt fungerar** – hämta preview-URL:en med WebFetch:
   ```
   WebFetch: https://silver-octo-succotash.frisemo.dev/pr-preview/pr-{nummer}/
   Prompt: Does the page load with a title and script tags? Are there asset URLs present?
   ```
   Sidan ska ha rätt asset-URLs (med `/pr-preview/pr-{nummer}/` som bas). Om HTML:en är tom eller saknar script-taggar är något fel med bygget.

5. **Mergea PR:en till `main`** – först när preview-siten ser korrekt ut.

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
