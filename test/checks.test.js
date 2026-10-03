// checks that only need Apex source, no org
// npm run build && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTestClass, isGeneratedClass, stripComments } from '../lib/apex.js';
import { apiVersionCheck } from '../lib/checks/apiVersions.js';
import { hardcodedCheck } from '../lib/checks/hardcoded.js';
import { triggerCheck } from '../lib/checks/triggers.js';
import { scoreOf } from '../lib/scanner.js';

const apex = (Name, Body, ApiVersion = 66) => ({ Id: Name, Name, Body, ApiVersion });
const trigger = (Name, TableEnumOrId, Body, Status = 'Active') => ({ ...apex(Name, Body), TableEnumOrId, Status });
const context = (classes = [], triggers = []) => ({ conn: null, latestApiVersion: 67, classes, triggers });

test('recognises test classes and ignores comments', () => {
  assert.equal(isTestClass('@IsTest\nprivate class FooTest {}'), true);
  assert.equal(isTestClass('// @IsTest\npublic class Foo {}'), false);
  assert.equal(stripComments('a /* b */ c // d'), 'a ' + ' '.repeat(7) + ' c ' + ' '.repeat(4));
  assert.equal(stripComments("x = 'https://a.b'; // note"), "x = 'https://a.b'; " + ' '.repeat(7), 'URLs in strings survive');
  assert.equal(stripComments('a /* 1\n2 */ b').split('\n').length, 2, 'Line breaks are kept');
  assert.equal(isGeneratedClass('SiteLoginControllerTest'), true);
});

test('flags classes about three years behind the latest API', async () => {
  const result = await apiVersionCheck.run(context([apex('Old', 'class Old {}', 45), apex('New', 'class New {}', 66)]));
  assert.deepEqual(result.findings.map((f) => f.item), ['Class Old']);
  assert.equal(result.findings[0].severity, 'medium', 'More than six years old');
});

test('finds hardcoded IDs and org URLs outside tests and comments', async () => {
  const body = [
    'public class Svc {',
    "  Id owner = '0055i000009LskqAAC';",
    "  // Id old = '0055i000009LskqAAD';",
    "  String url = 'https://acme.my.salesforce.com/services';",
    "  Id fake = '001x000xxx35tPN';",
    '}',
  ].join('\n');
  const result = await hardcodedCheck.run(context([apex('Svc', body), apex('SvcTest', `@IsTest class SvcTest { Id u = '0055i000009LskqAAC'; }`)]));
  assert.deepEqual(
    result.findings.map((f) => f.detail),
    ["Line 2: record ID '0055i000009LskqAAC'", "Line 4: org URL 'https://acme.my.salesforce.com/services'"]
  );
});

test('reports several triggers per object and logic inside triggers', async () => {
  const result = await triggerCheck.run(
    context([], [
      trigger('AccountTrigger', 'Account', 'trigger AccountTrigger on Account (before insert) { AccountHandler.run(); }'),
      trigger('AccountLegacy', 'Account', 'trigger AccountLegacy on Account (after update) { for (Account a : Trigger.new) {} }'),
      trigger('OffTrigger', 'Contact', 'trigger OffTrigger on Contact (before insert) { if (true) {} }', 'Inactive'),
    ])
  );
  assert.equal(result.findings.length, 2);
  assert.match(result.findings[0].detail, /2 active triggers/);
  assert.equal(result.findings[1].item, 'AccountLegacy');
});

test('scores 100 for a clean org and caps each check', () => {
  assert.equal(scoreOf([{ findings: [] }]), 100);
  const noisy = { findings: Array.from({ length: 20 }, () => ({ severity: 'high' })) };
  assert.equal(scoreOf([noisy]), 75, 'One check costs at most 25 points');
});
