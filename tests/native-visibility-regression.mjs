import assert from 'node:assert/strict';

export async function runNativeVisibilityRegressions({ page, state, log }) {
    const run = page.evaluate;
    const savedSettings = structuredClone(state.settings);
    assert.deepEqual(await run(`[
        document.querySelector('#extensions_settings2 #tavern_api_show_native').checked,
        getComputedStyle(document.getElementById('chat_completion_source')).display !== 'none',
        getComputedStyle(document.getElementById('custom_form')).display !== 'none'
    ]`), [true, true, true]);
    await run(`document.getElementById('fixture-native-input').value='retained';
        $('#tavern_api_show_native').prop('checked',false).trigger('change'); persistSettingsNow()`);
    assert.deepEqual(await run(`[
        getComputedStyle(document.getElementById('chat_completion_source')).display,
        getComputedStyle(document.getElementById('custom_form')).display,
        getComputedStyle(document.getElementById('tavern_api')).display !== 'none',
        document.getElementById('fixture-native-input').value
    ]`), ['none', 'none', true, 'retained']);
    await run(`$('#chat_completion_source').val('claude').trigger('change')`);
    assert.equal(await run(`getComputedStyle(document.getElementById('chat_completion_source')).display`), 'none');
    await run(`toggleDeskWorkspace(); closeDeskWorkspace()`);
    assert.equal(await run(`getComputedStyle(document.getElementById('tavern_api')).display !== 'none'`), true);
    assert.equal(state.settings.extension_settings.tavernApiDesk.showNativeApi, false);
    await page.reload();
    assert.deepEqual(await run(`[$('#tavern_api_show_native').prop('checked'),getComputedStyle(document.getElementById('chat_completion_source')).display]`), [false, 'none']);
    log('extension setting hides native controls while keeping API Desk usable, retains native fields, and survives reload');

    state.failSettings = true;
    await run(`$('#tavern_api_show_native').prop('checked',true).trigger('change'); persistSettingsNow()`);
    assert.deepEqual(await run(`[$('#tavern_api_settings_retry').prop('hidden'), getComputedStyle(document.getElementById('custom_form')).display !== 'none']`), [false, true]);
    state.failSettings = false;
    await run(`$('#tavern_api_settings_retry').trigger('click'); operationQueue`);
    assert.equal(state.settings.extension_settings.tavernApiDesk.showNativeApi, true);
    await page.reload();
    assert.deepEqual(await run(`[$('#tavern_api_show_native').prop('checked'),getComputedStyle(document.getElementById('chat_completion_source')).display !== 'none']`), [true, true]);
    await run(`$('#tavern_api_show_native').prop('checked',false).trigger('change'); persistSettingsNow()`);
    await run(`$('#tavern_api_extension_settings').remove(); updatePanelVisibility()`);
    assert.equal(await run(`getComputedStyle(document.getElementById('chat_completion_source')).display !== 'none'`), true);
    await run(`mountExtensionSettings(); updatePanelVisibility(); teardownTavernApiDesk()`);
    assert.deepEqual(await run(`[Boolean(document.getElementById('tavern_api_extension_settings')),getComputedStyle(document.getElementById('chat_completion_source')).display !== 'none']`), [false, true]);
    log('show restores native controls; save failures can be retried from extension settings; teardown restores the host');
    state.settings = savedSettings;
}
