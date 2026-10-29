import assert from 'node:assert/strict';

export async function runDeskRegressions({ page, state, log, scopedHost, setViewport, capture }) {
    const run = page.evaluate;
    await run(`settings().profiles = [
        {id:'desk-main',name:'日常聊天',format:'openai',endpoint:'https://primary.example/v1',model:'chat-model',availableModels:['chat-model','fast-model'],favorite:true,secretId:'test-secret'},
        {id:'desk-fallback',name:'备用线路',format:'openai',endpoint:'https://backup.example/v1',model:'fast-model',availableModels:['fast-model'],secretId:'test-secret'},
        {id:'desk-claude',name:'长篇写作',format:'anthropic',endpoint:'',model:'claude-model',availableModels:['claude-model'],secretId:'test-secret'},
        {id:'desk-gemini',name:'轻量问答',format:'gemini',endpoint:'',model:'gemini-model',availableModels:['gemini-model'],secretId:'test-secret'},
    ].map(normalizeProfile); settings().presetBindings={}; settings().presetModels={}; settings().quickActions=[];
    renderProfiles(); applyProfileById('desk-main')`);
    assert.equal(await run('hasDeskDraftChanges()'), false);
    await run(`$('#tavern_api_search').val('backup fast').trigger('input')`);
    assert.equal(await run(`document.querySelectorAll('.desk-profile').length`), 1);
    assert.equal(await run(`document.querySelector('.desk-profile').dataset.profileId`), 'desk-fallback');
    await run(`$('#tavern_api_search').val('').trigger('input'); $('#tavern_api_favorites').trigger('click')`);
    assert.equal(await run(`document.querySelectorAll('.desk-profile').length`), 1);
    await run(`$('#tavern_api_favorites').trigger('click'); $('#tavern_api_filter').val('gemini').trigger('change')`);
    assert.equal(await run(`document.querySelector('.desk-profile').dataset.profileId`), 'desk-gemini');
    await run(`$('#tavern_api_filter').val('').trigger('change')`);
    log('desk search combines endpoint and model terms; favorites and format filtering work without changing the live connection');

    await run(`$('#tavern_api_name').val('尚未保存的名称').trigger('input'); document.querySelector('[data-profile-id="desk-fallback"]').click()`);
    assert.equal(await run(`settings().selectedProfileId`), 'desk-main');
    assert.equal(await run(`deskDiscardPending`), true);
    await run(`Array.from(ownedPopups).at(-1).completeCancelled(); new Promise(r=>setTimeout(r,30))`);
    assert.equal(await run(`$('#tavern_api_name').val()`), '尚未保存的名称');
    assert.equal(await run(`settings().activeProfileId`), 'desk-main');
    await run(`$('#tavern_api_new').trigger('click'); new Promise(r=>setTimeout(r,20))`);
    await run(`Array.from(ownedPopups).at(-1).completeCancelled(); new Promise(r=>setTimeout(r,20))`);
    assert.equal(await run(`$('#tavern_api_name').val()`), '尚未保存的名称');
    await run(`renderProfiles('desk-main')`);
    log('profile switches and new configuration actions prompt for unsaved drafts; cancel preserves name and connection');

    assert.equal(await run(`document.getElementById('tavern_api_key_input').type`), 'password');
    await run(`$('#tavern_api_key_input').val('synthetic-editor-value').trigger('input'); revealBoundSecret()`);
    assert.equal(await run(`document.getElementById('tavern_api_key_input').type`), 'text');
    await run(`revealBoundSecret(); clearKeyEditor()`);
    assert.equal(await run(`document.getElementById('tavern_api_key_input').type`), 'password');
    log('credential masking uses a real password input, with reversible explicit reveal');

    const oldSettings = structuredClone(state.settings);
    const before = await run('profiles().length');
    await run(`window.portableBefore=structuredClone(settings()); window.portableBackup=createPortableBackup(settings());
        window.fileImportTask=importDeskBackup(new File([JSON.stringify(portableBackup)],'test.json',{type:'application/json'})); new Promise(r=>setTimeout(r,40))`);
    await run(`Array.from(ownedPopups).at(-1).completeAffirmative(); fileImportTask`);
    assert.equal(await run('profiles().length'), before * 2);
    assert.equal(await run(`profiles().slice(${before}).every(p=>!p.secretId && !p.proxyPreset && p.needsSecret)`), true);
    assert.equal(await run('settings().activeProfileId'), 'desk-main');
    log('real file import confirms and merges with fresh IDs, strips credentials, and preserves the current connection');

    await run(`extension_settings[MODULE_NAME]=structuredClone(portableBefore); extension_settings.quickerApi={schemaVersion:15,profiles:[{
        id:'quicker-old',name:'旧线路',format:'openai',endpoint:'https://legacy.example/v1',model:'old-model',secretId:'test-secret',includeHeaders:'{"X-Example":"retained"}'
    }],quickActions:[{id:'old-action',name:'旧方案',profileId:'quicker-old',model:'old-model'}]};
    window.legacyBefore=JSON.stringify(extension_settings.quickerApi); renderProfiles('desk-main');
    window.migrationTask=importQuickerSettings(); new Promise(r=>setTimeout(r,40))`);
    await run(`Array.from(ownedPopups).at(-1).completeAffirmative(); migrationTask`);
    const migrated = await run(`profiles().find(p=>p.name==='旧线路')`);
    assert.equal(migrated.secretId, 'test-secret');
    assert.equal(migrated.includeHeaders, '{"X-Example":"retained"}');
    assert.equal(await run('settings().quickActions.at(-1).profileId'), migrated.id);
    assert.equal(await run('JSON.stringify(extension_settings.quickerApi)===legacyBefore'), true);
    log('same-instance Quicker migration remaps quick actions, preserves native secret references and leaves original settings intact');

    await run(`extension_settings[MODULE_NAME]=structuredClone(portableBefore); renderProfiles('desk-main');
        $('#tavern_api_name').val('不能写入'); $('#tavern_api_url').val('javascript:alert(1)'); enqueueOperation(saveSelectedProfile)`);
    assert.equal(await run(`profiles().find(p=>p.id==='desk-main').name`), '日常聊天');
    assert.equal(await run('oai_settings.custom_url'), 'https://primary.example/v1');
    log('invalid endpoint saves cannot mutate a saved profile name or the live destination');

    await run(`createProfile(); $('#tavern_api_format').val('openai'); $('#tavern_api_name').val('无密钥的新线路');
        $('#tavern_api_url').val('https://new.example/v1'); enqueueOperation(saveSelectedProfile)`);
    assert.notEqual(await run('selectedProfile().secretId'), 'test-secret');
    assert.equal(await run('selectedProfile().secretId === settings().emptySecretIds[SECRET_KEYS.CUSTOM]'), true);
    assert.equal(await run(`getActiveSecret(SECRET_KEYS.CUSTOM)?.id`), await run('settings().emptySecretIds[SECRET_KEYS.CUSTOM]'));
    log('a newly created destination without a key gets a verified empty credential instead of another profile key');

    // Visual evidence uses representative synthetic content, with no credentials.
    await run(`extension_settings[MODULE_NAME]=structuredClone(portableBefore); renderProfiles('desk-main'); applyProfileById('desk-main')`);
    if (process.env.API_DESK_CAPTURE_DIR) {
        await setViewport(1440, 1000);
        await run(`$('#openai_api').css('max-width','1300px'); window.layoutCaptureBefore=structuredClone(settings()); settings().profiles=[]; settings().selectedProfileId=null; settings().activeProfileId=null; renderProfiles()`);
        await capture('inline-empty');
        await run(`extension_settings[MODULE_NAME]=structuredClone(layoutCaptureBefore); renderProfiles('desk-main')`);
        await capture('inline-populated');
    }
    await run(`$('#tavern_api_expand').trigger('click'); new Promise(r=>setTimeout(r,30))`);
    assert.equal(await run('deskWorkspace.open'), true);
    assert.equal(await run(`document.activeElement.id`), 'tavern_api_search');
    await run(`openQuickUrlMenu()`);
    assert.equal(await run(`deskWorkspace.contains(quickUrlMenu[0])`), true);
    await run(`closeQuickUrlMenu()`);
    log('workspace URL shortcuts stay inside the modal top layer and remain interactive');
    await setViewport(1280, 1000);
    await run(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    assert.equal(await run(`document.documentElement.scrollWidth<=innerWidth`), true);
    assert.deepEqual(await run(`(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect();
        const buttons = [...document.querySelectorAll('.desk-imports .menu_button')];
        return [Math.abs(rect('#tavern_api_name').top - rect('#tavern_api_format').top) < 2,
            buttons.every(button => button.scrollWidth <= button.clientWidth + 1),
            Math.abs(rect('#tavern_api_import_native').width - rect('#tavern_api_import_quicker').width) < 2,
            Math.abs(rect('#tavern_api_export').width - rect('#tavern_api_import').width) < 2];
    })()`), [true, true, true, true]);
    await capture('desktop');
    await setViewport(390, 844);
    await run(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    assert.equal(await run(`document.documentElement.scrollWidth<=innerWidth && deskWorkspace.scrollWidth<=deskWorkspace.clientWidth+1`), true);
    assert.deepEqual(await run(`(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect();
        return [rect('#tavern_api_format').top > rect('#tavern_api_name').bottom,
            [...document.querySelectorAll('.desk-imports .menu_button')].every(button => button.scrollWidth <= button.clientWidth + 1),
            rect('#tavern_api_save').width <= deskWorkspace.clientWidth];
    })()`), [true, true, true]);
    await capture('mobile');
    await run(`deskWorkspace.dispatchEvent(new Event('cancel',{cancelable:true}));`);
    assert.equal(await run('deskWorkspace===null && document.getElementById("openai_api").contains(document.getElementById("tavern_api"))'), true);
    log('workspace opens with keyboard focus, fits desktop and mobile, and Escape restores the original panel');
    state.settings = oldSettings;
}
