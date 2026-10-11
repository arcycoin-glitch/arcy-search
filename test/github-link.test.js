'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('GitHub link opens the official public source safely', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /href="https:\/\/github\.com\/arcycoin-glitch\/arcy-search"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /aria-label="View ARCY SEARCH source code on GitHub"/);
});
