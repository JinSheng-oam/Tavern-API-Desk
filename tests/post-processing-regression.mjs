import assert from 'node:assert/strict';

export async function runPostProcessingRegressions({ page, state, log }) {
    const run = page.evaluate;
    const savedSettings = structuredClone(state.settings);
    const savedPresets = structuredClone(state.presets);
    assert.deepEqual(await run(`(() => { const select=document.getElementById('tavern_api_post_processing'); return [select.value,
        [...select.querySelectorAll('optgroup')].map(group=>group.label), [...select.options].map(option=>option.value)]; })()`),
    ['', ['With Tools', 'No Tools'], ['', 'merge_tools', 'semi_tools', 'strict_tools', 'merge', 'semi', 'strict', 'single']]);
    await run(`$('#tavern_api_show_native').prop('checked',false).trigger('change');
        $('#tavern_api_post_processing').val('merge_tools').trigger('change'); new Promise(r=>setTimeout(r,200))`);
    assert.deepEqual(await run(`(async()=>[oai_settings.custom_prompt_post_processing, $('#custom_prompt_post_processing').val(),
        $('#tavern_api_post_processing').val(), window.fixturePostProcessingUpdates, (await fixtureGenerationData()).custom_prompt_post_processing])()`),
    ['merge_tools', 'merge_tools', 'merge_tools', 1, 'merge_tools']);
    assert.equal(state.settings.oai_settings.custom_prompt_post_processing, 'merge_tools');
    assert.equal(await run(`getComputedStyle(document.getElementById('custom_prompt_post_processing')).display`), 'none');
    log('post-processing options mirror the native groups; changes reach the host handler, saved settings and generation even when native UI is hidden');

    await run(`$('#custom_prompt_post_processing').val('semi_tools').trigger('change')`);
    assert.equal(await run(`$('#tavern_api_post_processing').val()`), 'semi_tools');
    await run(`openai_settings[openai_setting_names.B].custom_prompt_post_processing='strict';
        oai_settings.bind_preset_to_connection=true; switchTestPreset('B')`);
    assert.deepEqual(await run(`[$('#tavern_api_post_processing').val(), oai_settings.custom_prompt_post_processing]`), ['strict', 'strict']);
    await run(`$('#custom_prompt_post_processing optgroup').first().append($('<option>').val('host-new').text('宿主新选项')); new Promise(r=>setTimeout(r,30))`);
    assert.equal(await run(`$('#tavern_api_post_processing option[value="host-new"]').text()`), '宿主新选项');
    await run(`$('#tavern_api_post_processing').val('host-new').trigger('change'); new Promise(r=>setTimeout(r,150))`);
    assert.equal(await run('oai_settings.custom_prompt_post_processing'), 'host-new');
    await run(`document.getElementById('custom_prompt_post_processing').selectedIndex=-1;
        oai_settings.custom_prompt_post_processing='unknown-host-value'; syncNativePostProcessing(); $('#tavern_api_post_processing').trigger('change')`);
    assert.deepEqual(await run(`[oai_settings.custom_prompt_post_processing, document.getElementById('tavern_api_post_processing').selectedOptions[0].disabled]`), ['unknown-host-value', true]);
    log('native edits, preset changes and host-provided new options stay synchronized without a second profile copy');

    await run(`$('#custom_prompt_post_processing').remove(); syncNativePostProcessing(); enqueueOperation(async()=>true)`);
    assert.equal(await run(`$('#tavern_api_post_processing').prop('disabled')`), true);
    await run('teardownTavernApiDesk()');
    state.settings = savedSettings;
    state.presets = savedPresets;
}
