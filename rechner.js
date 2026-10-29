/* Maddy.support Paket- und Plattformrechner (statisch, keine Datenuebertragung).
   Werte aus der Buchungsseite (catalogue, Stand 29.10.2026) und Notion-Auftrag:
   Paketpreis + max(0, Anzahl unterschiedlicher Plattformen - 1) x CHF 140 pro Monat.
   Onboarding CHF 490 einmalig fuer neue Monatspakete. Rechenbeispiel 2 Monate = 2 x Monatsbetrag + Onboarding. */
(function (root) {
  var PREISE = {
    plattformZuschlag: 140,
    onboarding: 490,
    zusatzStunde: 220,
    plattformen: ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'X (Twitter)', 'YouTube', 'Pinterest'],
    pakete: {
      Starter: { preis: 1190, stunden: 6 },
      Support: { preis: 1890, stunden: 10 },
      Premium: { preis: 2990, stunden: 16 }
    }
  };

  function berechne(paket, plattformen, bereitsKunde) {
    var p = PREISE.pakete[paket];
    if (!p) throw new Error('Unbekanntes Paket: ' + paket);
    var eindeutig = [];
    (plattformen || []).forEach(function (x) { if (eindeutig.indexOf(x) === -1) eindeutig.push(x); });
    var weitere = Math.max(0, eindeutig.length - 1);
    var zuschlag = weitere * PREISE.plattformZuschlag;
    var monat = p.preis + zuschlag;
    var onboarding = bereitsKunde ? 0 : PREISE.onboarding;
    return { paket: paket, stunden: p.stunden, grundpreis: p.preis, plattformen: eindeutig.length, weitere: weitere,
      zuschlag: zuschlag, monat: monat, onboarding: onboarding, zweiMonate: monat * 2 + onboarding };
  }

  function chf(n) {
    var s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2019');
    return 'CHF ' + s;
  }

  var api = { PREISE: PREISE, berechne: berechne, chf: chf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MaddyRechner = api;

  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('rechner');
    if (!form) return;
    var linie = 'Business';
    function setze(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
    function update() {
      var paketEl = form.querySelector('input[name="paket"]:checked');
      var paket = paketEl ? paketEl.value : 'Support';
      var plattformen = Array.prototype.map.call(form.querySelectorAll('input[name="plattform"]:checked'), function (i) { return i.value; });
      var kunde = document.getElementById('bereits-kunde').checked;
      var r = berechne(paket, plattformen, kunde);
      setze('sum-paket', linie + ' ' + r.paket + ' · ' + r.stunden + ' Std.');
      setze('sum-grund', chf(r.grundpreis));
      setze('sum-plattformen', r.plattformen === 0 ? 'keine gewählt (1 inklusive)' : r.plattformen + ' gewählt, davon 1 inklusive');
      setze('sum-zuschlag', r.weitere + ' × CHF 140 = ' + chf(r.zuschlag));
      setze('sum-monat', chf(r.monat) + ' / Monat');
      setze('sum-onboarding', r.onboarding ? chf(r.onboarding) + ' einmalig' : 'entfällt');
      setze('sum-zwei', chf(r.zweiMonate));
      var mind = document.getElementById('sum-mindest');
      if (mind) mind.hidden = linie !== 'Business';
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-linie]'), function (b) {
      b.addEventListener('click', function () {
        linie = b.getAttribute('data-linie');
        Array.prototype.forEach.call(document.querySelectorAll('[data-linie]'), function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        Array.prototype.forEach.call(document.querySelectorAll('[data-nur]'), function (el) { el.hidden = el.getAttribute('data-nur') !== linie; });
        update();
      });
    });
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    update();
  });
})(typeof window !== 'undefined' ? window : globalThis);
