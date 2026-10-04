const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const pages = [
  'business.html',
  'community.html',
  'en/business.html',
  'en/community.html',
];

const clashPages = [
  {
    page: 'clash-akte.html',
    subject: 'Anfrage Maddy.support – CLASH-AKTE – Target Company',
  },
  {
    page: 'en/clash-akte.html',
    subject: 'Enquire Maddy.support – CLASH-AKTE – Target Company',
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

function classList() {
  const classes = new Set();
  return {
    add(name) { classes.add(name); },
    remove(name) { classes.delete(name); },
    contains(name) { return classes.has(name); },
  };
}

async function submit(page, response) {
  const html = fs.readFileSync(page, 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((source) => source.includes('formsubmit.co'));

  let submitHandler;
  const button = { disabled: false, textContent: 'Original submit label' };
  const form = {
    style: {},
    addEventListener(type, handler) {
      if (type === 'submit') submitHandler = handler;
    },
    querySelector() { return button; },
  };
  const fieldValues = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    package: 'Support',
    bedarf: 'Please help with this enquiry',
    website: '',
    firma: 'Analytical Engines',
    'ziel-name': 'Target Company',
    'ziel-website': 'https://example.com',
    'ziel-land': 'CH',
    'gespraech-datum': '2026-10-10',
    frage: 'Please verify this statement',
  };
  const elements = Object.fromEntries(
    Object.entries(fieldValues).map(([id, value]) => [id, { value }]),
  );
  const mailLink = { href: 'mailto:kontakt@maddy.support' };
  const error = {
    classList: classList(),
    querySelector(selector) { return selector === 'a' ? mailLink : null; },
  };
  const success = { classList: classList() };
  elements.privacy = { checked: true };
  elements.quellen = { checked: true };
  elements['paket-form'] = form;
  elements['clash-form'] = form;
  elements.formError = error;
  elements.formOk = success;
  const unsure = { style: {} };
  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelectorAll() { return []; },
    querySelector(selector) { return selector === '.unsure-note' ? unsure : null; },
  };
  let postedPayload;
  const fetch = (_url, options) => {
    postedPayload = JSON.parse(options.body);
    return response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve({ json: () => Promise.resolve(response) });
  };

  vm.runInNewContext(script, {
    document,
    window: { location: { href: '' } },
    fetch,
    encodeURIComponent,
    Error,
    JSON,
  });
  submitHandler({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  return { button, error, fieldValues, elements, form, mailLink, postedPayload, success };
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

for (const page of pages) {
  test(`${page} shows success only for an accepted submission`, async () => {
    for (const accepted of [true, 'true']) {
      const result = await submit(page, { success: accepted });
      assert.equal(result.form.style.display, 'none');
      assert.equal(result.success.classList.contains('is-on'), true);
      assert.equal(result.error.classList.contains('is-on'), false);
    }
  });

  test(`${page} preserves input and offers email after rejection or an error`, async () => {
    for (const response of [{ success: 'false' }, new Error('network failure')]) {
      const result = await submit(page, response);
      assert.notEqual(result.form.style.display, 'none');
      assert.equal(result.success.classList.contains('is-on'), false);
      assert.equal(result.error.classList.contains('is-on'), true);
      assert.equal(result.button.disabled, false);
      assert.equal(result.button.textContent, 'Original submit label');
      assert.match(result.mailLink.href, /^mailto:kontakt@maddy\.support\?/);
      assert.match(result.mailLink.href, /ada%40example\.com/);
      assert.equal(new URL(result.mailLink.href).searchParams.get('subject'), result.postedPayload._subject);
      assert.match(result.postedPayload._subject, / – (Support|Target Company)$/);
      for (const [id, value] of Object.entries(result.fieldValues)) {
        assert.equal(result.elements[id].value, value);
      }
    }
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

test('Clash payment copy consistently offers confirmed Stripe methods after signed confirmation', () => {
  const german = fs.readFileSync('clash-akte.html', 'utf8');
  const english = fs.readFileSync('en/clash-akte.html', 'utf8');
  const confirmation = fs.readFileSync('clash-auftragsbestaetigung.html', 'utf8');

  for (const copy of [german, english, confirmation]) {
    assert.doesNotMatch(copy, /Banküberweisung|TWINT|bank transfer/i);
    assert.match(copy, /Stripe-Zahlungslink|Stripe payment link/);
    assert.match(copy, /Kartenzahlung|Card/);
    assert.match(copy, /Klarna/);
    assert.match(copy, /Amazon Pay/);
  }
  assert.match(german, /Nach Rücksendung der unterzeichneten Auftragsbestätigung erhalten Sie den Stripe-Zahlungslink\. Dort stehen Kartenzahlung, Klarna und Amazon Pay\./);
  assert.match(english, /after you return the signed order confirmation, you receive the Stripe payment link\. Card, Klarna, and Amazon Pay are available there\./);
  assert.match(confirmation, /Unterschrift und Rücksendung durch den Kunden → kostenpflichtiger Auftrag → Stripe-Zahlungslink → Kartenzahlung, Klarna oder Amazon Pay/);
  assert.doesNotMatch(german, /buy\.stripe\.com/);
  assert.doesNotMatch(english, /buy\.stripe\.com/);
});
