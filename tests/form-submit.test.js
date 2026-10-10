const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const inquiryPages = [
  {
    page: 'business.html',
    linkId: 'businessMailLink',
    subject: 'Anfrage Maddy.support – BUSINESS – Support',
  },
  {
    page: 'community.html',
    linkId: 'communityMailLink',
    subject: 'Anfrage Maddy.support – COMMUNITY – Support',
  },
  {
    page: 'en/business.html',
    linkId: 'businessMailLink',
    subject: 'Enquire Maddy.support – BUSINESS – Support',
  },
  {
    page: 'en/community.html',
    linkId: 'communityMailLink',
    subject: 'Enquire Maddy.support – COMMUNITY – Support',
  },
];

const clashPages = [
  {
    page: 'clash-akte.html',
    subject: 'Anfrage Maddy.support – CLASH-AKTE – Target Company',
  },
  {
    page: 'en/clash-akte.html',
    subject: 'Enquiry Maddy.support – CLASH-AKTE – Target Company',
  },
];

const helionPages = [
  {
    page: 'helion.html',
    subject: 'Unverbindliche Helion-Anfrage',
  },
  {
    page: 'en/helion.html',
    subject: 'Non-binding Helion enquiry',
  },
];

function loadInquiryMailLink(page, linkId) {
  const html = fs.readFileSync(page, 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((source) => source.includes("getElementById('paket-form')"));
  const formHandlers = {};
  const linkHandlers = {};
  const form = {
    addEventListener(type, handler) {
      formHandlers[type] = handler;
    },
  };
  const values = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    package: 'Support',
    bedarf: 'Please help with this enquiry',
    website: '',
  };
  const elements = Object.fromEntries(
    Object.entries(values).map(([id, value]) => [id, { value }]),
  );
  elements.privacy = { checked: true };
  elements['paket-form'] = form;
  elements[linkId] = {
    href: '',
    addEventListener(type, handler) { linkHandlers[type] = handler; },
  };
  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelectorAll() { return []; },
  };

  vm.runInNewContext(script, {
    document,
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    encodeURIComponent,
  });
  let prevented = false;
  linkHandlers.click({ preventDefault() { prevented = true; } });

  return { html, href: elements[linkId].href, prevented };
}

function submitClash(page) {
  const html = fs.readFileSync(page, 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((source) => source.includes("getElementById('clash-form')"));

  const formHandlers = {};
  const linkHandlers = {};
  const form = {
    addEventListener(type, handler) {
      formHandlers[type] = handler;
    },
  };
  const values = {
    name: 'Ada Lovelace',
    firma: 'Analytical Engines',
    email: 'ada@example.com',
    'ziel-name': 'Target Company',
    'ziel-website': 'https://example.com',
    'ziel-land': 'CH',
    'gespraech-datum': '2026-10-10',
    frage: 'Please verify this statement',
    website: '',
  };
  const elements = Object.fromEntries(
    Object.entries(values).map(([id, value]) => [id, { value }]),
  );
  elements.quellen = { checked: true };
  elements.privacy = { checked: true };
  elements['clash-form'] = form;
  elements.clashMailLink = {
    href: '',
    addEventListener(type, handler) { linkHandlers[type] = handler; },
  };
  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelectorAll() { return []; },
  };

  vm.runInNewContext(script, {
    document,
    window: { matchMedia: () => ({ matches: true }) },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    encodeURIComponent,
  });
  let prevented = false;
  linkHandlers.click({ preventDefault() { prevented = true; } });

  return { html, href: elements.clashMailLink.href, prevented };
}

function loadHelionMailLink(page) {
  const html = fs.readFileSync(page, 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((source) => source.includes("getElementById('intakeForm')"));
  const formHandlers = {};
  const linkHandlers = {};
  const fields = [
    { id: 'firma', name: 'firma', value: 'Analytical Engines', type: 'text' },
    { id: 'leistung_text', name: 'leistung', value: 'A clear offer', type: 'textarea' },
    { id: 'festpreis', name: 'festpreis', value: 'yes', type: 'select-one' },
    { id: 'entscheider', name: 'entscheider', value: 'Ada Lovelace', type: 'text' },
    { id: 'zeitdruck', name: 'zeitdruck', value: 'No time pressure', type: 'textarea' },
    { id: 'bedingungen', name: 'bedingungen', value: 'yes', type: 'checkbox', checked: true },
  ];
  const form = {
    elements: fields,
    addEventListener(type, handler) { formHandlers[type] = handler; },
    querySelectorAll() { return []; },
    querySelector(selector) {
      const id = selector.match(/label\[for="([^"]+)"\]/)?.[1];
      return id ? { textContent: id } : null;
    },
    checkValidity() { return true; },
    reportValidity() {},
  };
  const mailLink = {
    href: '',
    addEventListener(type, handler) { linkHandlers[type] = handler; },
  };
  const document = {
    getElementById(id) {
      if (id === 'intakeForm') return form;
      if (id === 'helionMailLink') return mailLink;
      return null;
    },
    querySelectorAll() { return []; },
  };

  vm.runInNewContext(script, {
    document,
    window: { matchMedia: () => ({ matches: true }) },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    encodeURIComponent,
  });
  let prevented = false;
  linkHandlers.click({ preventDefault() { prevented = true; } });

  return { html, href: mailLink.href, prevented };
}

for (const { page, linkId, subject } of inquiryPages) {
  test(`${page} opens a populated email without FormSubmit`, () => {
    const result = loadInquiryMailLink(page, linkId);
    const mailto = new URL(result.href);
    const body = mailto.searchParams.get('body');

    assert.doesNotMatch(result.html, /formsubmit\.co/);
    assert.equal(mailto.protocol, 'mailto:');
    assert.equal(mailto.pathname, 'kontakt@maddy.support');
    assert.equal(mailto.searchParams.get('subject'), subject);
    assert.match(body, /Ada Lovelace/);
    assert.match(body, /ada@example\.com/);
    assert.match(body, /Support/);
    assert.match(body, /Please help with this enquiry/);
    assert.equal(result.prevented, false);
    assert.match(result.html, new RegExp(`<a id="${linkId}"[^>]+href="mailto:`));
    assert.match(result.html, /data-copy-email="kontakt@maddy\.support"/);
    assert.doesNotMatch(result.html, /window\.location\.href\s*=/);
  });
}

for (const { page, subject } of clashPages) {
  test(`${page} opens a populated email without FormSubmit`, () => {
    const result = submitClash(page);
    const mailto = new URL(result.href);

    assert.doesNotMatch(result.html, /formsubmit\.co/);
    assert.equal(mailto.protocol, 'mailto:');
    assert.equal(mailto.pathname, 'kontakt@maddy.support');
    assert.equal(mailto.searchParams.get('subject'), subject);
    assert.match(mailto.searchParams.get('body'), /Target Company/);
    assert.match(mailto.searchParams.get('body'), /ada@example\.com/);
    assert.equal(result.prevented, false);
    assert.match(result.html, /<a id="clashMailLink"[^>]+href="mailto:/);
    assert.match(result.html, /data-copy-email="kontakt@maddy\.support"/);
    assert.doesNotMatch(result.html, /window\.location\.href\s*=/);
  });
}

for (const { page, subject } of helionPages) {
  test(`${page} uses a populated mailto link and visible copy fallback`, () => {
    const result = loadHelionMailLink(page);
    const mailto = new URL(result.href);

    assert.equal(mailto.protocol, 'mailto:');
    assert.equal(mailto.pathname, 'kontakt@maddy.support');
    assert.equal(mailto.searchParams.get('subject'), subject);
    assert.match(mailto.searchParams.get('body'), /Analytical Engines/);
    assert.equal(result.prevented, false);
    assert.match(result.html, /<a id="helionMailLink"[^>]+href="mailto:/);
    assert.match(result.html, /data-copy-email="kontakt@maddy\.support"/);
    assert.doesNotMatch(result.html, /window\.location\.href\s*=/);
    assert.doesNotMatch(result.html, /formsubmit\.co/);
  });
}

test('privacy notices describe mailto enquiries and limit FormSubmit to Topic Dossier', () => {
  const notices = [
    fs.readFileSync('datenschutz.html', 'utf8'),
    fs.readFileSync('en/privacy.html', 'utf8'),
  ];

  for (const notice of notices) {
    assert.match(notice, /Community/);
    assert.match(notice, /Business/);
    assert.match(notice, /Clash(?:-Akte| File)/);
    assert.match(notice, /Helion/);
    assert.match(notice, /mailto:/);
    assert.match(notice, /FormSubmit/);
    assert.match(notice, /(?:Themen-Dossier|Topic Dossier)/);
    assert.doesNotMatch(notice, /Community, Business (?:und|and) Clash[^<]*FormSubmit/);
  }
});

test('Clash payment copy consistently offers confirmed Stripe methods after signed confirmation', () => {
  const german = fs.readFileSync('clash-akte.html', 'utf8');
  const english = fs.readFileSync('en/clash-akte.html', 'utf8');
  const confirmation = fs.readFileSync('clash-auftragsbestaetigung.html', 'utf8');

  for (const copy of [german, english, confirmation]) {
    assert.doesNotMatch(copy, /Banküberweisung|bank transfer|Apple Pay|Google Pay/i);
    assert.match(copy, /Stripe-Zahlungslink|Stripe payment link/);
    assert.match(copy, /TWINT/);
    assert.match(copy, /Kartenzahlung|card/i);
    assert.match(copy, /Klarna/);
    assert.match(copy, /Amazon Pay/);
  }
  assert.match(german, /Nach Rücksendung der unterzeichneten Auftragsbestätigung erhalten Sie den Stripe-Zahlungslink\. Dort stehen TWINT, Kartenzahlung, Klarna und Amazon Pay\./);
  assert.match(english, /after you return the signed order confirmation, you receive the Stripe payment link\. TWINT, card, Klarna, and Amazon Pay are available there\./);
  assert.match(confirmation, /Unterschrift und Rücksendung durch den Kunden → kostenpflichtiger Auftrag → Stripe-Zahlungslink → TWINT, Kartenzahlung, Klarna oder Amazon Pay/);
  assert.doesNotMatch(german, /buy\.stripe\.com/);
  assert.doesNotMatch(english, /buy\.stripe\.com/);
});

test('Helion payment copy names only confirmed methods after signed confirmation', () => {
  const german = fs.readFileSync('helion.html', 'utf8');
  const english = fs.readFileSync('en/helion.html', 'utf8');
  const confirmation = fs.readFileSync('helion-auftragsbestaetigung.html', 'utf8');

  for (const copy of [german, english, confirmation]) {
    assert.doesNotMatch(copy, /Banküberweisung|bank transfer|Apple Pay|Google Pay/i);
    assert.match(copy, /TWINT/);
    assert.match(copy, /Kartenzahlung|card/);
    assert.match(copy, /Klarna/);
    assert.match(copy, /Amazon Pay/);
  }
  assert.match(german, /Erst mit Ihrer unterschriebenen Rücksendung entsteht der kostenpflichtige Auftrag\./);
  assert.match(english, /The paid order is formed only when you return it signed\./);
  assert.match(confirmation, /Nach Rücksendung der unterzeichneten Auftragsbestätigung erhält der Kunde den bestehenden Stripe-Link\./);
  assert.doesNotMatch(german, /buy\.stripe\.com/);
  assert.doesNotMatch(english, /buy\.stripe\.com/);
});
