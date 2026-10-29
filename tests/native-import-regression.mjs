import assert from 'node:assert/strict';

export async function runNativeImportRegressions({ page, state, log }) {
    const run = page.evaluate;
    const savedSettings = structuredClone(state.settings);
    state.secrets = Object.fromEntries(['api_key_custom', 'api_key_claude', 'api_key_makersuite', 'api_key_opencode']
        .map(key => [key, [{ id: 'test-secret', active: true }]]));
    await run(`
        settings().profiles = [normalizeProfile({id:'existing',name:'已有配置',format:'openai',endpoint:'https://shared.invalid/v1',model:'other',secretId:'test-secret'})];
        oai_settings.custom_url='https://shared.invalid/v1'; oai_settings.custom_model='current-model';
        extension_settings.connectionManager = {profiles: [
            ...['福利站-deepseek','自搭api站','自用-deepseek','自用-gemini','wl-gemini','wl-gemini-4-argon'].map((name,i) => ({
                id:'native-'+i,name,api:'custom','api-url':'https://shared.invalid/v1',model:'model-'+i,'secret-id':'test-secret',proxy:'None'
            })),
            {id:'unsupported',name:'其他类型',api:'unsupported',model:'other-model'},
            {id:'missing-url',name:'缺少地址',api:'custom',model:'missing-model'},
        ]};
        window.nativeBefore = JSON.stringify(extension_settings.connectionManager);
    `);
    const candidates = await run(`(async()=>collectNativeImportCandidates(await readAuthoritativeSecretState()))()`);
    const expected = [
        ['福利站-deepseek', 'model-0'], ['自搭api站', 'model-1'], ['自用-deepseek', 'model-2'],
        ['自用-gemini', 'model-3'], ['wl-gemini', 'model-4'], ['wl-gemini-4-argon', 'model-5'],
    ];
    assert.deepEqual(candidates.filter(c => /^connection-manager:native-/.test(c.sourceRef)).map(c => [c.name, c.model]).sort(), expected.sort());
    assert.ok(candidates.find(c => c.sourceRef === 'connection-manager:unsupported').unavailableReason);
    assert.ok(candidates.find(c => c.sourceRef === 'connection-manager:missing-url').unavailableReason);
    const preview = await run(`(async()=>{const c=await collectNativeImportCandidates(await readAuthoritativeSecretState());
        const p=buildNativeImportPreview(c); return {text:p.text(),disabled:p.find('input:disabled').length};})()`);
    assert.ok(preview.text.includes('原生连接配置') && preview.text.includes('model-5') && preview.text.includes('不迁移预设'));
    assert.equal(preview.disabled, 2);
    log('native import keeps each named profile even when URL and credential match a snapshot or existing profile, and explains unsupported entries');

    await run(`window.importTask=importNativeProfile(); new Promise(r=>setTimeout(r,100))`);
    await run(`$('dialog[open] input:not(:disabled)').prop('checked',true); Array.from(ownedPopups).at(-1).completeAffirmative(); importTask`);
    const imported = await run('profiles().filter(p=>p.nativeImportFingerprint)');
    assert.deepEqual(imported.map(p => [p.name, p.model, p.secretId]).sort(), [
        ['福利站-deepseek', 'model-0', 'test-secret'], ['自搭api站', 'model-1', 'test-secret'],
        ['自用-deepseek', 'model-2', 'test-secret'], ['自用-gemini', 'model-3', 'test-secret'],
        ['wl-gemini', 'model-4', 'test-secret'], ['wl-gemini-4-argon', 'model-5', 'test-secret'],
    ].sort());
    assert.equal(await run('JSON.stringify(extension_settings.connectionManager)===nativeBefore'), true);
    assert.equal(state.secrets.api_key_custom.find(entry => entry.active).id, 'test-secret');
    const repeated = await run(`(async()=>collectNativeImportCandidates(await readAuthoritativeSecretState()))()`);
    assert.equal(repeated.filter(c => c.sourceRef.startsWith('connection-manager:') && c.alreadyImported).length, 6);
    assert.equal(await run(`(async()=>buildNativeImportPreview(await collectNativeImportCandidates(await readAuthoritativeSecretState())).find('input:disabled').length)()`), 8);
    log('import retains all six models and secret references, leaves native settings and active credential intact, and marks reimports');
    await run('teardownTavernApiDesk()');
    state.settings = savedSettings;
    delete state.secrets;
}
