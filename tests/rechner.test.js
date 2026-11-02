const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const R = require(path.join(__dirname, '..', 'rechner.js'));

// Beispiele aus dem Auftrag (Notion «Komplette neue Website», Buchungsseite 29.10.2026)
test('Starter mit 1 Plattform = CHF 1190 pro Monat', () => {
  assert.equal(R.berechne('Starter', ['Instagram'], false).monat, 1190);
});
test('Starter mit 2 Plattformen = CHF 1330 pro Monat', () => {
  assert.equal(R.berechne('Starter', ['Instagram', 'LinkedIn'], false).monat, 1330);
});
test('Starter mit 3 Plattformen = CHF 1470 pro Monat', () => {
  assert.equal(R.berechne('Starter', ['Instagram', 'LinkedIn', 'TikTok'], false).monat, 1470);
});
test('Starter mit 3 Plattformen, 2 Monate inkl. Onboarding = CHF 3430', () => {
  const r = R.berechne('Starter', ['Instagram', 'LinkedIn', 'TikTok'], false);
  assert.equal(r.zuschlag, 280);
  assert.equal(r.onboarding, 490);
  assert.equal(r.zweiMonate, 3430);
});
test('ohne Plattformwahl gilt der Paketpreis', () => {
  assert.equal(R.berechne('Support', [], false).monat, 1890);
});
test('doppelte Plattformen zaehlen einmal', () => {
  assert.equal(R.berechne('Premium', ['YouTube', 'YouTube'], false).monat, 2990);
});
test('bereits Kunde: kein Onboarding', () => {
  assert.equal(R.berechne('Starter', ['Instagram'], true).zweiMonate, 2380);
});
test('alle 7 Plattformen: 6 x 140 Zuschlag', () => {
  assert.equal(R.berechne('Premium', R.PREISE.plattformen, false).monat, 2990 + 840);
});
test('Anzeigeformat mit Schweizer Apostroph', () => {
  assert.equal(R.chf(3430), 'CHF 3\u2019430');
});
test('Preise auf pakete.html stimmen mit dem Rechner ueberein', () => {
  const html = require('node:fs').readFileSync(path.join(__dirname, '..', 'pakete.html'), 'utf8');
  for (const [name, p] of Object.entries(R.PREISE.pakete)) {
    assert.match(html, new RegExp(name + '[\\s\\S]{0,400}CHF ' + R.chf(p.preis).slice(4)));
  }
  assert.match(html, /Eine Plattform inklusive\. Jede weitere Plattform \+140 CHF pro Monat\./);
  assert.match(html, /maddy-support-buchen\.rvvgc6nrsv\.chatgpt\.site/);
});
