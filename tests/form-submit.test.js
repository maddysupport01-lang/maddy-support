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

  let submitHandler;
  const form = {
    addEventListener(type, handler) {
      if (type === 'submit') submitHandler = handler;
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
  const window = { location: { href: '' } };
  const document = {
    getElementById(id) { return elements[id] || null; },
  };

  vm.runInNewContext(script, { document, window, encodeURIComponent });
  submitHandler({ preventDefault() {} });

  return { html, href: window.location.href };
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
  });
}
