import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortableBackup, parsePortableBackup, mergePortableBackup, validateEndpoint, filterDeskProfiles } from '../desk-data.js';
const profile = { id: 'one', name: '工作站', format: 'openai', endpoint: 'https://example.invalid/v1', model: 'model-a', availableModels: ['model-a'], secretId: 'private-reference', proxyPreset: 'private-proxy', includeHeaders: 'Authorization: private-header', includeBody: 'token: private-body', excludeBody: '- temperature' };
const source = () => ({ profiles: [profile], quickActions: [{ id: 'quick', profileId: 'one', model: 'model-b' }], presetBindings: { Chat: 'one' }, presetModels: { Chat: { profileId: 'one', format: 'openai', model: 'model-b' } } });
test('portable backups remove credentials, headers and bodies and preserve model bindings', () => {
    const encoded = JSON.stringify(createPortableBackup(source()));
    for (const secret of ['private-reference', 'private-proxy', 'private-header', 'private-body']) assert.ok(!encoded.includes(secret));
    const result = parsePortableBackup(encoded);
    assert.equal(result.profiles[0].needsSecret, true);
    assert.equal(result.profiles[0].excludeBody, '- temperature');
    assert.equal(result.presetModels.Chat.model, 'model-b');
});
test('hostile backup credentials and unknown fields never survive import', () => {
    const backup = createPortableBackup(source());
    Object.assign(backup.profiles[0], { secretId: 'injected', key: 'injected-key', includeHeaders: 'X-Key: injected' });
    const parsed = parsePortableBackup(JSON.stringify(backup));
    assert.equal(parsed.profiles[0].secretId, '');
    assert.equal(parsed.profiles[0].includeHeaders, '');
    assert.ok(!('key' in parsed.profiles[0]));
});
test('merging remaps every profile reference and preserves existing bindings and selection', () => {
    let id = 0;
    const original = { ...source(), selectedProfileId: 'one', activeProfileId: 'one' };
    const backup = createPortableBackup(source());
    backup.presetBindings.Other = 'one'; backup.presetModels.Other = backup.presetModels.Chat;
    const merged = mergePortableBackup(original, backup, prefix => `${prefix}-${++id}`);
    assert.equal(original.profiles.length, 1);
    assert.equal(merged.profiles.length, 2);
    assert.equal(merged.profiles[1].name, '工作站 (2)');
    assert.equal(merged.quickActions[1].profileId, merged.profiles[1].id);
    assert.equal(merged.presetBindings.Chat, 'one');
    assert.equal(merged.presetBindings.Other, merged.profiles[1].id);
    assert.equal(merged.presetModels.Other.profileId, merged.profiles[1].id);
    assert.equal(merged.activeProfileId, 'one');
});
test('reject duplicate IDs, malformed formats, newer backups and non-HTTP endpoints', () => {
    const backup = createPortableBackup(source());
    assert.throws(() => parsePortableBackup('{'), /JSON/);
    assert.throws(() => parsePortableBackup(JSON.stringify({ ...backup, version: 99 })), /版本/);
    assert.throws(() => parsePortableBackup(JSON.stringify({ ...backup, profiles: [profile, profile] })), /重复/);
    assert.throws(() => parsePortableBackup(JSON.stringify({ ...backup, profiles: [{ ...profile, format: 'unknown' }] })), /格式/);
    for (const url of ['javascript:alert(1)', 'file:///secrets', 'https://user:key@host.test/v1', 'https://host.test/v1?api_key=private', 'https://host.test/#token']) assert.throws(() => validateEndpoint(url, 'openai'));
    assert.equal(validateEndpoint('http://localhost:1234/v1', 'openai'), 'http://localhost:1234/v1');
    assert.equal(validateEndpoint('', 'gemini'), '');
});
test('dangerous preset names do not mutate prototypes', () => {
    const backup = createPortableBackup(source());
    backup.presetBindings = JSON.parse('{"__proto__":"one","constructor":"one","Chat":"one"}');
    const parsed = parsePortableBackup(JSON.stringify(backup));
    assert.deepEqual(Object.keys(parsed.presetBindings), ['Chat']);
    assert.equal({}.polluted, undefined);
});
test('filter by name, endpoint, model, format and favorites with stable numeric names', () => {
    const items = [{ ...profile, name: '配置 10' }, { ...profile, id: 'two', name: '配置 2', favorite: true }, { ...profile, id: 'three', name: '配置 1' }];
    assert.equal(filterDeskProfiles(items)[0].id, 'two');
    assert.equal(filterDeskProfiles(items, { favorites: true }).length, 1);
    assert.equal(filterDeskProfiles(items, { query: '工作 model-z' }).length, 0);
    assert.equal(filterDeskProfiles(items, { query: 'example model-a', format: 'openai' }).length, 3);
});
