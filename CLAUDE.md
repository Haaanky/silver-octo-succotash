# LagerApp – instruktioner för Claude Code

## Testning och verifiering

**Alla ändringar MÅSTE verifieras med Playwright innan de anses klara.**

Kör alltid E2E-testerna efter att du gjort en förändring som påverkar rendering, routing, autentisering eller ny funktionalitet:

```bash
npm test
```

Testerna kontrollerar att:
- Sidan faktiskt laddas (inte blank/vit)
- Inloggningssidan visas korrekt
- Login med standarduppgifter fungerar (`admin@lager.se` / `admin123`)
- Navigering mellan sidor fungerar

Tester körs mot den deployade siten (`https://silver-octo-succotash.frisemo.dev`) eller mot `BASE_URL` om den miljövariabeln är satt.

**Lägg till Playwright-tester för all ny funktionalitet** i `tests/e2e/`.
