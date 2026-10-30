// SPDX-License-Identifier: GPL-3.0-only
// Portable files are an allowlist, never a dump of extension_settings.
export const BACKUP_FORMAT = 'tavern-api-desk';
export const BACKUP_VERSION = 1;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const FORMATS = new Set(['openai', 'anthropic', 'gemini', 'opencode', 'openai_responses', 'claude_messages', 'gemini_generate_content', 'gemini_interactions']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, limit = 500) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const list = value => [...new Set((Array.isArray(value) ? value : []).filter(item => typeof item === 'string').map(item => text(item)).filter(Boolean))].slice(0, 2000);
const safeName = value => !['__proto__', 'prototype', 'constructor'].includes(value);

export function validateEndpoint(value, format) {
    const endpoint = text(value, 2048);
    if (!endpoint && ['anthropic', 'gemini'].includes(format)) return '';
    if (format === 'opencode') {
        if (['zen', 'go'].includes(endpoint)) return endpoint;
        if (['https://opencode.ai/zen/v1', 'https://opencode.ai/zen/v1/'].includes(endpoint)) return 'zen';
        if (['https://opencode.ai/zen/go/v1', 'https://opencode.ai/zen/go/v1/'].includes(endpoint)) return 'go';
        throw new Error('OpenCode 地址必须是 zen / go 或对应的官方地址。');
    }
    let url;
    try { url = new URL(endpoint); } catch { throw new Error('请输入完整的 HTTP 或 HTTPS API 地址。'); }
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('API 地址只支持 HTTP 或 HTTPS。');
    if (url.username || url.password || [...url.searchParams.keys()].some(key => /^(api[-_]?key|key|token|access_token|authorization|password|secret)$/i.test(key))) {
        throw new Error('请将密钥填写在密钥栏中，不要放进 API 地址。');
    }
    if (url.hash) throw new Error('API 地址不能包含 # 片段。');
    return endpoint;
}

function portableProfile(raw) {
    if (!record(raw) || !FORMATS.has(raw.format)) throw new Error('文件包含不支持的 API 格式。');
    const profile = {
        id: text(raw.id), name: text(raw.name, 160), format: raw.format,
        endpoint: validateEndpoint(raw.endpoint || (raw.format === 'opencode' ? 'zen' : ''), raw.format),
        model: text(raw.model), availableModels: list(raw.availableModels),
        favorite: raw.favorite === true, opencodeApiFormat: raw.format === 'opencode' ? text(raw.opencodeApiFormat || 'openai_compat') : '',
        excludeBody: text(raw.excludeBody, 100000), includeBody: '', includeHeaders: '',
        secretId: '', proxyPreset: '', needsSecret: true, customized: true,
    };
    if (!profile.id || !profile.name) throw new Error('配置缺少 ID 或名称。');
    if (profile.model && !profile.availableModels.includes(profile.model)) profile.availableModels.unshift(profile.model);
    if (profile.format === 'opencode' && (!['openai_compat', 'openai_responses', 'claude_messages', 'gemini'].includes(profile.opencodeApiFormat)
        || (profile.endpoint === 'go' && profile.opencodeApiFormat === 'gemini'))) throw new Error('OpenCode 协议组合无效。');
    return profile;
}

export function createPortableBackup(settings, now = new Date()) {
    const profiles = (settings.profiles || []).map(portableProfile);
    const ids = new Set(profiles.map(item => item.id));
    const presetBindings = Object.fromEntries(Object.entries(settings.presetBindings || {}).filter(([name, id]) => safeName(name) && ids.has(id)));
    const presetModels = Object.fromEntries(Object.entries(settings.presetModels || {}).filter(([name, value]) => safeName(name) && value?.profileId === presetBindings[name])
        .map(([name, value]) => [name, { profileId: value.profileId, format: profiles.find(item => item.id === value.profileId).format, model: text(value.model) }]));
    return {
        format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(),
        omitted: ['keys', 'secretReferences', 'proxyPasswords', 'includeBody', 'includeHeaders'],
        profiles, presetBindings, presetModels,
        quickActions: (settings.quickActions || []).filter(item => !item.profileId || ids.has(item.profileId)).slice(0, 500).map((item, index) => ({
            id: text(item.id), name: text(item.name, 160), preset: text(item.preset, 160), profileId: text(item.profileId), model: text(item.model), sequence: index,
        })),
        quickUrls: (settings.quickUrls || []).slice(0, 300).flatMap(item => {
            try { return [{ id: text(item.id), name: text(item.name, 160), url: validateEndpoint(item.url, 'openai') }]; } catch { return []; }
        }),
    };
}

export function parsePortableBackup(input) {
    if (typeof input !== 'string' || new TextEncoder().encode(input).length > MAX_IMPORT_BYTES) throw new Error('请选择小于 5 MB 的 API Desk JSON 备份。');
    let data;
    try { data = JSON.parse(input.replace(/^\uFEFF/, '')); } catch { throw new Error('备份不是有效的 JSON 文件。'); }
    if (!record(data) || data.format !== BACKUP_FORMAT || data.version !== BACKUP_VERSION) throw new Error('备份格式或版本不受支持，请使用 API Desk 导出的备份。');
    if (!Array.isArray(data.profiles) || !data.profiles.length || data.profiles.length > 300) throw new Error('备份必须包含 1 至 300 个配置。');
    const profiles = data.profiles.map(portableProfile);
    if (new Set(profiles.map(item => item.id)).size !== profiles.length) throw new Error('备份含有重复配置 ID，已取消导入。');
    // Rebuild through the allowlist to ignore unknown fields and injected credentials.
    return createPortableBackup({ ...data, profiles });
}

export function mergePortableBackup(current, backup, makeId) {
    const draft = structuredClone(current);
    draft.profiles ||= []; draft.quickActions ||= []; draft.quickUrls ||= [];
    draft.presetBindings = Object.assign(Object.create(null), draft.presetBindings || {});
    draft.presetModels = Object.assign(Object.create(null), draft.presetModels || {});
    const mapping = new Map();
    const usedNames = new Set(draft.profiles.map(item => item.name));
    for (const raw of backup.profiles) {
        const profile = portableProfile(raw);
        mapping.set(profile.id, makeId('profile'));
        const base = profile.name;
        let suffix = 2;
        while (usedNames.has(profile.name)) profile.name = `${base} (${suffix++})`;
        usedNames.add(profile.name);
        draft.profiles.push({ ...profile, id: mapping.get(raw.id), updatedAt: new Date().toISOString() });
    }
    for (const [name, oldId] of Object.entries(backup.presetBindings || {})) {
        // Existing bindings are the user's choices and win merge conflicts.
        if (!safeName(name) || !mapping.has(oldId) || Object.hasOwn(draft.presetBindings, name)) continue;
        draft.presetBindings[name] = mapping.get(oldId);
        const model = backup.presetModels?.[name];
        if (model?.profileId === oldId) draft.presetModels[name] = { ...model, profileId: mapping.get(oldId) };
    }
    for (const action of backup.quickActions || []) {
        if (action.profileId && !mapping.has(action.profileId)) continue;
        draft.quickActions.push({ ...action, id: makeId('quick'), profileId: mapping.get(action.profileId) || '', sequence: draft.quickActions.length });
    }
    for (const url of backup.quickUrls || []) {
        if (!draft.quickUrls.some(item => item.url === url.url)) draft.quickUrls.push({ ...url, id: makeId('url') });
    }
    return draft;
}

export function filterDeskProfiles(profiles, { query = '', format = '', favorites = false } = {}) {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return profiles.filter(profile => (!format || profile.format === format) && (!favorites || profile.favorite)
        && words.every(word => `${profile.name} ${profile.endpoint} ${profile.model} ${profile.format}`.toLocaleLowerCase().includes(word)))
        .sort((a, b) => (Number.isFinite(a.sortOrder) && Number.isFinite(b.sortOrder) ? a.sortOrder - b.sortOrder : 0)
            || Number(Boolean(b.favorite)) - Number(Boolean(a.favorite))
            || a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));
}
