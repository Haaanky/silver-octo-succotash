# LagerApp – instruktioner för Claude Code

## Testning och verifiering

**Alla ändringar MÅSTE verifieras med Playwright mot den RIKTIGA, deployade siten innan de anses klara.**

### Obligatoriska steg för varje förändring

1. **Pusha till main** – ändringar måste mergas till `main` så att GitHub Actions deployar dem.
2. **Vänta på deployment** – kontrollera att GitHub Actions-körningen (`Deploy to GitHub Pages`) är klar.
3. **Kör E2E-tester mot den live-deployade siten:**

```bash
PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright npm test
```

Testerna körs alltid mot `https://silver-octo-succotash.frisemo.dev` (eller `BASE_URL` om satt).
**Tester mot localhost eller mock-miljö räknas INTE som godkänt.**

4. **Alla tester måste bli gröna** – inga failed, inga skipped som testar riktig funktionalitet.
5. **Vid fel: fixa koden, pusha igen, vänta på ny deployment, kör testerna igen** – iterera tills allt är grönt.

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

### Köra enstaka tester

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
