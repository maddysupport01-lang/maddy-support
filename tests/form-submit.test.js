const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const pages = [
  'business.html',
  'community.html',
  'clash-akte.html',
  'en/business.html',
  'en/community.html',
  'en/clash-akte.html',
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
  const fetch = response instanceof Error
    ? () => Promise.reject(response)
    : () => Promise.resolve({ json: () => Promise.resolve(response) });

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

  return { button, error, fieldValues, elements, form, mailLink, success };
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
      for (const [id, value] of Object.entries(result.fieldValues)) {
        assert.equal(result.elements[id].value, value);
      }
    }
  });
}
