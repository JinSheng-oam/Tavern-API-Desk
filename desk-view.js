// SPDX-License-Identifier: GPL-3.0-only
// Values passed here are trusted, escaped HTML authored by the extension.
export function deskToolbar(formatOptions, keyHelp) {
    return `<section id="tavern_api" class="tavern-api" aria-label="API Desk 管理工作台">
      <header class="tavern-api__title">
        <button id="tavern_api_toggle" class="tavern-api__toggle" type="button" aria-expanded="true" aria-controls="tavern_api_body">
          <span class="tavern-api__brand"><span class="tavern-api__brand-icon"><i class="fa-solid fa-plug" aria-hidden="true"></i></span> API Desk</span>
          <span id="tavern_api_summary" class="tavern-api__summary"></span>
          <i class="fa-solid fa-chevron-up tavern-api__chevron" aria-hidden="true"></i>
        </button>
        <button id="tavern_api_expand" class="menu_button desk-icon" type="button" title="展开工作台" aria-label="展开工作台"><i class="fa-solid fa-expand" aria-hidden="true"></i></button>
      </header>
      <div id="tavern_api_body">
        <div class="desk-current" role="status" aria-live="polite">
          <span class="desk-current__label"><span class="desk-current__dot" aria-hidden="true"></span>当前连接</span>
          <strong id="tavern_api_active">尚未应用配置</strong>
        </div>
        <div class="desk-layout">
          <aside class="desk-sidebar" aria-label="API 配置列表">
            <div class="desk-list-heading">
              <strong>我的配置 <span id="tavern_api_count" class="desk-count">0</span></strong>
              <button id="tavern_api_new" class="menu_button desk-icon" type="button" title="新增配置" aria-label="新增配置"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
            </div>
            <label class="desk-search">
              <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
              <input id="tavern_api_search" type="search" placeholder="搜索名称、地址、模型" aria-label="搜索 API 配置" autocomplete="off">
            </label>
            <div class="desk-filters">
              <select id="tavern_api_filter" class="text_pole" aria-label="筛选 API 格式"><option value="">所有格式</option>${formatOptions}</select>
              <button id="tavern_api_favorites" class="menu_button desk-icon" type="button" aria-pressed="false" title="只看收藏" aria-label="只看收藏"><i class="fa-solid fa-star" aria-hidden="true"></i></button>
            </div>
            <div id="tavern_api_list" class="desk-profile-list" role="group" aria-label="选择并切换 API 配置"></div>
            <label class="desk-mobile-select" for="tavern_api_profile_select">切换配置<select id="tavern_api_profile_select" class="text_pole" aria-label="API 配置"></select></label>
            <div class="desk-imports">
              <button id="tavern_api_import_native" class="menu_button" type="button" title="导入酒馆原生配置"><i class="fa-solid fa-file-import" aria-hidden="true"></i> 导入原生</button>
              <button id="tavern_api_import_quicker" class="menu_button" type="button" title="迁移 Quicker API 数据"><i class="fa-solid fa-arrow-right-arrow-left" aria-hidden="true"></i> 迁移 Quicker</button>
              <div class="desk-backup-buttons">
                <button id="tavern_api_export" class="menu_button" type="button" title="导出 JSON 备份"><i class="fa-solid fa-download" aria-hidden="true"></i> 导出备份</button>
                <button id="tavern_api_import" class="menu_button" type="button" title="导入 JSON 备份"><i class="fa-solid fa-upload" aria-hidden="true"></i> 导入备份</button>
              </div>
              <input id="tavern_api_import_file" type="file" accept=".json,application/json" hidden>
            </div>
          </aside>
          <div class="desk-editor">
            <div class="desk-editor-heading">
              <h3 id="tavern_api_editor_title">新建连接</h3>
              <button id="tavern_api_favorite" class="menu_button desk-icon" type="button" aria-pressed="false" title="收藏此配置" aria-label="收藏此配置"><i class="fa-solid fa-star" aria-hidden="true"></i></button>
            </div>
            <p class="desk-description">选择配置即切换连接；编辑完成后，保存并应用。</p>
            <div class="desk-card desk-card--basic">
              <div class="desk-card-title"><i class="fa-solid fa-sliders" aria-hidden="true"></i> 线路基础</div>
              <div class="desk-fields-pair">
                <div class="tavern-api__field"><label for="tavern_api_name">配置名称</label><input id="tavern_api_name" class="text_pole" maxlength="160" placeholder="例如：日常聊天 / 备用线路" autocomplete="off"></div>
                <div class="tavern-api__field"><label for="tavern_api_format">接口格式</label><select id="tavern_api_format" class="text_pole" aria-label="API 格式">${formatOptions}</select></div>
              </div>
              <div class="tavern-api__field"><label for="tavern_api_url">API 地址</label><div class="tavern-api__row tavern-api__url-row"><input id="tavern_api_url" class="text_pole" type="url" autocomplete="off" placeholder="https://example.com/v1"><button id="tavern_api_quick_url" class="menu_button desk-icon" type="button" title="常用 API 地址" aria-label="常用 API 地址" aria-haspopup="menu" aria-expanded="false"><i class="fa-solid fa-link" aria-hidden="true"></i></button></div></div>
              <div id="tavern_api_opencode_fields" class="tavern-api__field" style="display:none"><label for="tavern_api_opencode_format">OpenCode 协议</label><select id="tavern_api_opencode_format" class="text_pole"><option value="openai_compat">OpenAI Chat Completions</option><option value="openai_responses">OpenAI Responses</option><option value="claude_messages">Anthropic Messages</option><option value="gemini">Gemini（仅 Zen）</option></select></div>
            </div>
            <div class="desk-card desk-card--security">
              <div class="desk-card-title"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> 访问凭据</div>
              <div class="tavern-api__field tavern-api__key-field"><label for="tavern_api_key_input">密钥 / 代理密码</label><div class="tavern-api__row tavern-api__key-row"><input id="tavern_api_key_input" class="text_pole flex1 tavern-api__secret-masked" type="password" autocomplete="new-password" autocapitalize="none" spellcheck="false" placeholder="已保存的密钥不会自动显示"><div class="tavern-api__key-actions"><button id="tavern_api_key_help" class="menu_button desk-icon tavern-api__key-help" type="button" aria-label="密钥权限说明" aria-describedby="tavern_api_key_help_tooltip"><i class="fa-solid fa-circle-question" aria-hidden="true"></i></button><aside id="tavern_api_key_help_tooltip" class="tavern-api__key-help-tooltip" role="tooltip">${keyHelp}</aside><button id="tavern_api_reveal_key" class="menu_button desk-icon" type="button" title="显示或隐藏密钥" aria-label="显示或隐藏密钥"><i class="fa-solid fa-eye-slash" aria-hidden="true"></i></button><button id="tavern_api_copy_key" class="menu_button desk-icon" type="button" title="复制密钥" aria-label="复制密钥"><i class="fa-solid fa-copy" aria-hidden="true"></i></button><button id="tavern_api_native_key_manager" class="menu_button desk-icon manage-api-keys" type="button" title="原生密钥管理" aria-label="原生密钥管理" data-key="api_key_custom"><i class="fa-solid fa-key" aria-hidden="true"></i></button></div></div></div>
              <p class="desk-key-note"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> 密钥保存在酒馆原生存储中。留空保留原绑定；查看与复制需要宿主允许显示密钥。</p>
            </div>
            <div class="desk-card desk-card--model">
              <div class="desk-card-title"><i class="fa-solid fa-microchip" aria-hidden="true"></i> 模型与参数</div>
              <div class="tavern-api__field tavern-api__model-field"><label for="tavern_api_custom_model">模型</label><div id="tavern_api_model_control" class="tavern-api__row"></div></div>
              <div class="tavern-api__field"><label for="tavern_api_post_processing">提示词后处理</label><select id="tavern_api_post_processing" class="text_pole" aria-describedby="tavern_api_post_processing_note"></select><small id="tavern_api_post_processing_note" class="tavern-api__post-processing-note">即时应用于酒馆当前连接，可能随酒馆预设切换；“无工具”选项不支持工具调用。</small></div>
              <div class="tavern-api__field tavern-api__parameters-field"><label>请求参数</label><div class="tavern-api__row"><button id="tavern_api_additional_parameters" class="menu_button" type="button"><i class="fa-solid fa-sliders" aria-hidden="true"></i> 附加参数</button><button class="menu_button tavern-api__manage-actions" type="button"><i class="fa-solid fa-bolt" aria-hidden="true"></i> 快捷方案</button></div></div>
            </div>
            <div class="desk-footer">
              <button id="tavern_api_save" class="menu_button desk-primary" type="button"><i class="fa-solid fa-check" aria-hidden="true"></i> 保存并应用</button>
              <button id="tavern_api_apply" class="menu_button" type="button" title="重新应用已保存配置"><i class="fa-solid fa-rotate" aria-hidden="true"></i> 重新应用</button>
              <button id="tavern_api_copy" class="menu_button desk-icon" type="button" title="复制已保存配置" aria-label="复制已保存配置"><i class="fa-solid fa-clone" aria-hidden="true"></i></button>
              <button id="tavern_api_rename" class="menu_button desk-icon" type="button" title="重命名已保存配置" aria-label="重命名已保存配置"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
              <button id="tavern_api_delete" class="menu_button desk-icon desk-danger" type="button" title="删除配置" aria-label="删除配置"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
            </div>
            <div class="desk-feedback">
              <div id="tavern_api_status" class="tavern-api__status" role="status" aria-live="polite"></div>
              <button id="tavern_api_retry_save" class="menu_button" type="button" hidden>重试保存</button>
              <span id="tavern_api_persistence" role="status" aria-live="polite"></span>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}
