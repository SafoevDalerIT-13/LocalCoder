document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('docForm');
    const sourceCodeEl = document.getElementById('sourceCode');
    const contextCodeEl = document.getElementById('contextCode');
    const simplePreviewBtn = document.getElementById('simplePreviewBtn');
    const templateSelect = document.getElementById('templateCode');
    const generateBtn = document.getElementById('generateBtn');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');
    const docContent = document.getElementById('docContent');
    const copyBtn = document.getElementById('copyBtn');
    const copyToast = document.getElementById('copyToast');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadMenu = document.getElementById('downloadMenu');
    const themeToggle = document.getElementById('theme-toggle');
    const darkIcon = document.querySelector('.dark-icon');
    const lightIcon = document.querySelector('.light-icon');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileBtn = document.getElementById('fileBtn');
    const fileName = document.getElementById('fileName');
    const correctionDiv = document.getElementById('correction');
    const correctionInput = document.getElementById('correctionInput');
    const correctBtn = document.getElementById('correctBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarReveal = document.getElementById('sidebarReveal');
    const chatList = document.getElementById('chatList');
    const newChatBtn = document.getElementById('newChatBtn');
    const startBtn = document.getElementById('startBtn');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const mainWorkspace = document.getElementById('mainWorkspace');
    const versionBar = document.getElementById('versionBar');
    const versionList = document.getElementById('versionList');
    const previewFrame = document.getElementById('previewFrame');
    const viewToggle = document.getElementById('viewToggle');
    let previewMode = false;

    const projectPath = document.getElementById('projectPath');
    const projectIdInput = document.getElementById('projectId');
    const fileTree = document.getElementById('fileTree');
    const projectActions = document.getElementById('projectActions');
    const previewPromptBtn = document.getElementById('previewPromptBtn');
    const selectionPreview = document.getElementById('selectionPreview');
    const selPreviewLines = document.getElementById('selPreviewLines');
    const selPreviewFileName = document.getElementById('selPreviewFileName');
    const selPreviewClose = document.getElementById('selPreviewClose');
    const selPreviewBar = document.getElementById('selPreviewBar');
    const selRangeText = document.getElementById('selRangeText');
    const selClearBtn = document.getElementById('selClearBtn');
    const mainToggle = document.getElementById('mainToggle');
    const selectionsSummary = document.getElementById('selectionsSummary');
    const selectionsList = document.getElementById('selectionsList');
    const uploadFolderBtn = document.getElementById('uploadFolderBtn');
    const folderInput = document.getElementById('folderInput');
    const stopBtn = document.getElementById('stopBtn');
    const modeModal = document.getElementById('modeModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const templateParams = document.getElementById('templateParams');
    const algorithmCodeInput = document.getElementById('algorithmCode');
    const algorithmDescriptionInput = document.getElementById('algorithmDescription');
    const algorithmLinkInput = document.getElementById('algorithmLink');
    const authoritiesInput = document.getElementById('authorities');
    const slaP95Input = document.getElementById('slaP95');
    const slaP99Input = document.getElementById('slaP99');
    const promptModal = document.getElementById('promptModal');
    const promptPreviewContent = document.getElementById('promptPreviewContent');
    const promptModalClose = document.getElementById('promptModalClose');
    const promptModalGenerateBtn = document.getElementById('promptModalGenerateBtn');

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => modeModal.classList.add('hidden'));
    }
    if (modeModal) {
        modeModal.addEventListener('click', (e) => {
            if (e.target === modeModal) modeModal.classList.add('hidden');
        });
    }

    const STORAGE_KEY = 'localcoder_state';
    let chats = [];
    let activeChatId = null;
    let versions = [];
    let projectFiles = [];
    let selections = {}; // filePath -> { filePath, lineStart, lineEnd, isMain, fileName }
    let currentPreviewFile = null; // filePath currently shown in preview
    let selClickState = null; // { filePath, selecting: 'start'|'end', startLine }

    function setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            if (darkIcon) darkIcon.style.display = 'inline-block';
            if (lightIcon) lightIcon.style.display = 'none';
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            if (darkIcon) darkIcon.style.display = 'none';
            if (lightIcon) lightIcon.style.display = 'inline-block';
            localStorage.setItem('theme', 'light');
        }
    }
    const savedTheme = localStorage.getItem('theme');
    setTheme(savedTheme === 'light' ? 'light' : 'dark');

    themeToggle.addEventListener('click', () => {
        setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
    });

    function updateTemplateParams() {
        const code = templateSelect.value;
        templateParams.classList.toggle('hidden', code !== '211');
    }
    templateSelect.addEventListener('change', updateTemplateParams);

    function saveState() {
        const state = {
            chats: chats.map(c => ({
                id: c.id,
                name: c.name,
                mode: c.mode || 'simple',
                sourceCode: c.sourceCode,
                contextCode: c.contextCode || '',
                templateCode: c.templateCode,
                algorithmCode: c.algorithmCode,
                algorithmDescription: c.algorithmDescription,
                algorithmLink: c.algorithmLink,
                authorities: c.authorities,
                slaP95: c.slaP95,
                slaP99: c.slaP99,
                versions: c.versions,
                currentVersion: c.currentVersion
            })),
            activeChatId: activeChatId
        };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const state = JSON.parse(raw);
            chats = state.chats || [];
            activeChatId = state.activeChatId || null;
            return true;
        } catch (e) { return false; }
    }

    function getActiveChat() {
        return chats.find(c => c.id === activeChatId) || null;
    }

    function showWorkspace(hasChats) {
        if (hasChats) {
            welcomeScreen.classList.add('hidden');
            mainWorkspace.classList.remove('hidden');
            sidebar.classList.remove('hidden');
        } else {
            welcomeScreen.classList.remove('hidden');
            mainWorkspace.classList.add('hidden');
            hideResult();
            sidebar.classList.add('hidden');
            resetStartBtn();
        }
    }

    function startRename(chatId, spanEl) {
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'chat-rename-input';
        input.value = chat.name;
        input.setAttribute('aria-label', 'Имя чата');
        spanEl.replaceWith(input);
        input.focus();
        input.select();

        function finish() {
            const val = input.value.trim() || chat.name;
            chat.name = val;
            const newSpan = document.createElement('span');
            newSpan.className = 'chat-item-name';
            newSpan.textContent = val;
            input.replaceWith(newSpan);
            saveState();
            fetch('/api/docs/chat/' + encodeURIComponent(chat.id) + '/rename', {
                method: 'PUT',
                headers: { 'Content-Type': 'text/plain' },
                body: val
            });
        }

        input.addEventListener('blur', finish);
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = chat.name; input.blur(); }
        });
    }

    function renderChatList() {
        chatList.innerHTML = '';
        chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = `chat-item${chat.id === activeChatId ? ' active' : ''}`;
            const nameSpan = document.createElement('span');
            nameSpan.className = 'chat-item-name';
            nameSpan.textContent = chat.name;
            nameSpan.title = 'Дважды кликните чтобы переименовать';
            nameSpan.addEventListener('dblclick', e => { e.stopPropagation(); startRename(chat.id, nameSpan); });
            div.appendChild(nameSpan);
            const renameBtn = document.createElement('button');
            renameBtn.className = 'chat-item-act';
            renameBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">edit</span>';
            renameBtn.title = 'Переименовать';
            renameBtn.addEventListener('click', e => { e.stopPropagation(); startRename(chat.id, nameSpan); });
            div.appendChild(renameBtn);
            const del = document.createElement('button');
            del.className = 'chat-item-act';
            del.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">close</span>';
            del.title = 'Удалить чат';
            del.addEventListener('click', e => { e.stopPropagation(); deleteChat(chat.id); });
            div.appendChild(del);
            div.addEventListener('click', () => switchChat(chat.id));
            chatList.appendChild(div);
        });
    }

    async function createChat(name, mode) {
        const response = await fetch('/api/docs/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name || 'Новый чат', mode: mode || 'simple' })
        });
        if (!response.ok) {
            showStatus('Ошибка создания чата', 'error');
            return null;
        }
        const data = await response.json();
        const chat = {
            id: data.id,
            name: data.name,
            mode: data.mode || 'simple',
            sourceCode: '',
            contextCode: '',
            templateCode: '230',
            algorithmCode: '',
            algorithmDescription: '',
            algorithmLink: '',
            authorities: '',
            slaP95: '',
            slaP99: '',
            versions: [],
            currentVersion: -1
        };
        chats.push(chat);
        await switchChat(chat.id);
        saveState();
        showWorkspace(true);
        return chat;
    }

    async function switchChat(id) {
        const prev = getActiveChat();
        if (prev) {
            prev.sourceCode = sourceCodeEl.value;
            prev.contextCode = contextCodeEl.value;
            prev.templateCode = templateSelect.value;
            prev.algorithmCode = algorithmCodeInput.value;
            prev.algorithmDescription = algorithmDescriptionInput.value;
            prev.algorithmLink = algorithmLinkInput.value;
            prev.authorities = authoritiesInput.value;
            prev.slaP95 = slaP95Input.value;
            prev.slaP99 = slaP99Input.value;
        }
        activeChatId = id;
        const chat = getActiveChat();
        if (!chat) return;
        sourceCodeEl.value = chat.sourceCode || '';
        contextCodeEl.value = chat.contextCode || '';
        templateSelect.value = chat.templateCode || '230';
        algorithmCodeInput.value = chat.algorithmCode || '';
        algorithmDescriptionInput.value = chat.algorithmDescription || '';
        algorithmLinkInput.value = chat.algorithmLink || '';
        authoritiesInput.value = chat.authorities || '';
        slaP95Input.value = chat.slaP95 || '';
        slaP99Input.value = chat.slaP99 || '';
        updateTemplateParams();
        versions = chat.versions || [];
        const targetTab = chat.mode === 'project' ? 'project' : 'simple';
        document.querySelector('.tabs').classList.toggle('hidden', true);
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab' + targetTab.charAt(0).toUpperCase() + targetTab.slice(1)));
        generateBtn.querySelector('span:last-child').textContent = 'Сгенерировать';
        const badge = document.getElementById('modeBadge');
        const badgeIcon = badge.querySelector('.mode-badge-icon');
        const badgeText = badge.querySelector('.mode-badge-text');
        if (targetTab === 'project') {
            badgeIcon.textContent = 'folder_open';
            badgeText.textContent = 'Режим: Проект';
        } else {
            badgeIcon.textContent = 'edit_note';
            badgeText.textContent = 'Режим: Обычный';
        }
        badge.classList.remove('hidden');
        renderChatList();
        if (versions.length > 0 && chat.currentVersion >= 0) {
            const idx = Math.min(chat.currentVersion, versions.length - 1);
            showResult(versions[idx], versions, idx);
        } else if (versions.length > 0) {
            const idx = versions.length - 1;
            showResult(versions[idx], versions, idx);
        } else {
            hideResult();
        }
        if (_generatingChatId !== null) {
            if (id === _generatingChatId) {
                setInputsDisabled(true);
                showStatus('Генерация документации...', 'info');
            } else {
                if (abortController) {
                    abortController.abort();
                    abortController = null;
                }
                _submitting = false;
                _generatingChatId = null;
                setInputsDisabled(false);
                hideStatus();
            }
        }
        saveState();
    }

    async function deleteChat(id) {
        const idx = chats.findIndex(c => c.id === id);
        if (idx === -1) return;
        await fetch('/api/docs/chat/' + encodeURIComponent(id), { method: 'DELETE' });
        chats.splice(idx, 1);
        if (chats.length === 0) {
            activeChatId = null;
            showWorkspace(false);
            saveState();
            return;
        }
        if (activeChatId === id) {
            const next = chats[Math.min(idx, chats.length - 1)];
            await switchChat(next.id);
        } else {
            renderChatList();
        }
        saveState();
    }

    function escHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    // === Project mode: file tree ===
    function buildFileTree(files) {
        const root = {};
        files.forEach(f => {
            const parts = f.path.split('/');
            let node = root;
            parts.forEach((part, i) => {
                if (i === parts.length - 1) {
                    node[part] = { type: 'file', path: f.path, size: f.size };
                } else {
                    if (!node[part]) node[part] = { type: 'dir', children: {} };
                    node = node[part].children;
                }
            });
        });
        return root;
    }

    function renderTreeNodes(nodes, depth) {
        const entries = Object.entries(nodes).sort((a, b) => {
            if (a[1].type !== b[1].type) return a[1].type === 'file' ? 1 : -1;
            return a[0].localeCompare(b[0]);
        });
        let html = '';
        entries.forEach(([name, data]) => {
            if (data.type === 'file') {
                const checked = selections[data.path] ? 'checked' : '';
                html += `<div class="file-tree-item" style="padding-left:${depth * 20 + 8}px">
                    <input type="checkbox" class="file-checkbox" data-path="${escHtml(data.path)}" ${checked}>
                    <span class="file-tree-name">${escHtml(name)}</span>
                    <span class="file-tree-size">${formatSize(data.size)}</span>
                </div>`;
            } else {
                html += `<div class="file-tree-dir" style="padding-left:${depth * 20 + 8}px">
                    <span class="dir-arrow">▶</span>
                    <span class="dir-name">${escHtml(name)}/</span>
                </div>
                <div class="dir-children" style="display:none">${renderTreeNodes(data.children, depth + 1)}</div>`;
            }
        });
        return html;
    }

    function renderFileTree(files) {
        projectFiles = files;
        const tree = buildFileTree(files);
        fileTree.innerHTML = renderTreeNodes(tree, 0);
        hideSelectionPreview();
        updateSelectionsSummary();
        updateProjectActions();

        fileTree.querySelectorAll('.file-checkbox').forEach(cb => {
            cb.addEventListener('change', onFileCheckboxChange);
        });

        fileTree.addEventListener('click', e => {
            const arrow = e.target.closest('.dir-arrow');
            if (arrow) {
                const dirEl = arrow.closest('.file-tree-dir');
                const children = dirEl.nextElementSibling;
                if (children && children.classList.contains('dir-children')) {
                    const closed = children.style.display === 'none';
                    children.style.display = closed ? '' : 'none';
                    arrow.textContent = closed ? '▼' : '▶';
                }
                return;
            }
            const item = e.target.closest('.file-tree-item');
            if (item) {
                const cb = item.querySelector('.file-checkbox');
                if (cb && !e.target.closest('.file-checkbox')) {
                    cb.checked = !cb.checked;
                    cb.dispatchEvent(new Event('change'));
                }
            }
        });
    }

    function onFileCheckboxChange(e) {
        const cb = e.target;
        const filePath = cb.dataset.path;

        if (cb.checked) {
            if (!selections[filePath]) {
                selections[filePath] = { filePath, lineStart: 1, lineEnd: 1, isMain: false };
            }
            showFileInPreview(filePath);
        } else {
            delete selections[filePath];
            if (currentPreviewFile === filePath) {
                hideSelectionPreview();
            }
        }
        updateSelectionsSummary();
        updateProjectActions();
        syncCheckboxStates();
    }

    function syncCheckboxStates() {
        fileTree.querySelectorAll('.file-checkbox').forEach(cb => {
            cb.checked = !!selections[cb.dataset.path];
        });
    }

    // === Code preview with line selection ===
    function hideSelectionPreview() {
        selectionPreview.classList.add('hidden');
        currentPreviewFile = null;
        selClickState = null;
    }

    async function showFileInPreview(filePath) {
        currentPreviewFile = filePath;
        selPreviewFileName.textContent = filePath;
        selectionPreview.classList.remove('hidden');
        selPreviewLines.innerHTML = '<div class="code-line" style="padding:0.5rem;color:var(--text-secondary)">Загрузка...</div>';
        selPreviewBar.classList.add('hidden');

        const rootPath = projectPath.value.trim().replace(/\\/g, '/').replace(/\/+$/, '');
        const fullPath = rootPath + '/' + filePath;

        try {
            const response = await fetch('/api/docs/project/read?path=' + encodeURIComponent(fullPath));
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                selPreviewLines.innerHTML = '<div class="code-line" style="padding:0.5rem;color:var(--status-error-text)">' + escHtml(err.error || 'Ошибка загрузки') + '</div>';
                return;
            }
            const data = await response.json();
            const lines = (data.content || '').split('\n');

            mainToggle.checked = selections[filePath]?.isMain || false;

            let html = '';
            lines.forEach((line, idx) => {
                const lineNo = idx + 1;
                const sel = selections[filePath];
                const selected = sel && lineNo >= sel.lineStart && lineNo <= sel.lineEnd;
                let cls = 'code-line';
                if (selected) {
                    cls += sel.isMain ? ' line-selected-main' : ' line-selected-context';
                }
                html += `<div class="${cls}" data-lineno="${lineNo}">
                    <span class="line-no">${lineNo}</span>
                    <span class="line-code">${escHtml(line)}</span>
                </div>`;
            });
            selPreviewLines.innerHTML = html;

            selClickState = null;
            updateSelPreviewBar(filePath);

            selPreviewLines.querySelectorAll('.line-no').forEach(el => {
                el.addEventListener('click', onLineNoClick);
            });

            selPreviewLines.querySelectorAll('.code-line').forEach(el => {
                el.addEventListener('click', function(e) {
                    if (e.target.closest('.line-no')) return;
                });
            });
        } catch (err) {
            selPreviewLines.innerHTML = '<div class="code-line" style="padding:0.5rem;color:var(--status-error-text)">Ошибка: ' + escHtml(err.message) + '</div>';
        }
    }

    function onLineNoClick(e) {
        const lineEl = e.target.closest('.line-no');
        if (!lineEl) return;
        const codeLine = lineEl.closest('.code-line');
        const lineNo = parseInt(codeLine.dataset.lineno);
        const filePath = currentPreviewFile;
        if (!filePath || !selections[filePath]) return;

        const sel = selections[filePath];

        if (selClickState === null) {
            sel.lineStart = lineNo;
            sel.lineEnd = lineNo;
            selClickState = { startLine: lineNo };
        } else {
            const start = selClickState.startLine;
            sel.lineStart = Math.min(start, lineNo);
            sel.lineEnd = Math.max(start, lineNo);
            selClickState = null;
        }

        updateLineHighlights(filePath);
        updateSelPreviewBar(filePath);
        updateSelectionsSummary();
    }

    function updateLineHighlights(filePath) {
        const sel = selections[filePath];
        if (!sel) return;
        selPreviewLines.querySelectorAll('.code-line').forEach(el => {
            const lineNo = parseInt(el.dataset.lineno);
            const selected = lineNo >= sel.lineStart && lineNo <= sel.lineEnd;
            el.classList.remove('line-selected-main', 'line-selected-context');
            if (selected) {
                el.classList.add(sel.isMain ? 'line-selected-main' : 'line-selected-context');
            }
        });
    }

    function updateSelPreviewBar(filePath) {
        const sel = selections[filePath];
        if (!sel || sel.lineStart === sel.lineEnd) {
            selPreviewBar.classList.add('hidden');
            return;
        }
        selPreviewBar.classList.remove('hidden');
        selRangeText.textContent = `Выбраны строки ${sel.lineStart}-${sel.lineEnd}`;
    }

    selClearBtn.addEventListener('click', () => {
        const filePath = currentPreviewFile;
        if (!filePath || !selections[filePath]) return;
        const sel = selections[filePath];
        sel.lineStart = 1;
        sel.lineEnd = 1;
        selClickState = null;
        updateLineHighlights(filePath);
        updateSelPreviewBar(filePath);
    });

    selPreviewClose.addEventListener('click', () => {
        const filePath = currentPreviewFile;
        if (filePath && selections[filePath]) {
            delete selections[filePath];
            fileTree.querySelectorAll('.file-checkbox').forEach(cb => {
                if (cb.dataset.path === filePath) cb.checked = false;
            });
        }
        hideSelectionPreview();
        updateSelectionsSummary();
        updateProjectActions();
    });

    mainToggle.addEventListener('change', () => {
        const filePath = currentPreviewFile;
        if (!filePath || !selections[filePath]) return;
        const isMain = mainToggle.checked;
        for (const path in selections) {
            selections[path].isMain = false;
        }
        selections[filePath].isMain = isMain;
        updateLineHighlights(filePath);
        updateSelectionsSummary();
    });

    // === Selections summary ===
    function updateSelectionsSummary() {
        const keys = Object.keys(selections);
        if (keys.length === 0) {
            selectionsSummary.classList.add('hidden');
            return;
        }
        selectionsSummary.classList.remove('hidden');
        selectionsList.innerHTML = '';
        for (const fp of keys) {
            const sel = selections[fp];
            const item = document.createElement('div');
            item.className = 'selection-item';
            const badge = document.createElement('span');
            badge.className = 'selection-item-badge ' + (sel.isMain ? 'main' : 'context');
            badge.textContent = sel.isMain ? 'Главный' : 'Контекст';
            item.appendChild(badge);
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${sel.filePath} (строки ${sel.lineStart}-${sel.lineEnd})`;
            item.appendChild(nameSpan);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'selection-item-remove';
            removeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
            removeBtn.title = 'Убрать';
            removeBtn.addEventListener('click', () => {
                delete selections[fp];
                if (currentPreviewFile === fp) hideSelectionPreview();
                syncCheckboxStates();
                updateSelectionsSummary();
                updateProjectActions();
            });
            item.appendChild(removeBtn);
            selectionsList.appendChild(item);
        }
    }

    function updateProjectActions() {
        const count = getSelectionsList().length;
        projectActions.classList.toggle('hidden', count === 0);
    }

    // === Build prompt selections for API ===
    function getSelectionsList() {
        return Object.values(selections)
            .filter(s => s.lineEnd > s.lineStart)
            .map(s => ({
                filePath: s.filePath,
                lineStart: Math.min(s.lineStart, s.lineEnd),
                lineEnd: Math.max(s.lineStart, s.lineEnd),
                main: s.isMain
            }));
    }

    function hasMainSelection() {
        return getSelectionsList().some(s => s.main);
    }

    // === Preview prompt ===
    previewPromptBtn.addEventListener('click', async () => {
        const selList = getSelectionsList();
        if (selList.length === 0) {
            showStatus('Нет выбранных фрагментов кода', 'error');
            return;
        }
        if (!hasMainSelection()) {
            showStatus('Отметьте один фрагмент как главный (документируемый код)', 'error');
            return;
        }
        const projectId = projectIdInput.value;
        if (!projectId) {
            showStatus('Сначала загрузите проект', 'error');
            return;
        }

        try {
            const response = await fetch('/api/docs/project/preview-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, selections: selList })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                showStatus(err.error || 'Ошибка предпросмотра', 'error');
                return;
            }
            const data = await response.json();
            promptPreviewContent.textContent = data.prompt || '(пустой промт)';
            promptModal.classList.remove('hidden');
        } catch (err) {
            showStatus('Ошибка: ' + err.message, 'error');
        }
    });

    promptModalClose.addEventListener('click', () => promptModal.classList.add('hidden'));
    promptModal.addEventListener('click', (e) => {
        if (e.target === promptModal) promptModal.classList.add('hidden');
    });

    // === Generate from selections ===
    promptModalGenerateBtn.addEventListener('click', async () => {
        promptModal.classList.add('hidden');
        await doProjectGenerate();
    });

    async function doProjectGenerate() {
        const selList = getSelectionsList();
        if (selList.length === 0) {
            showStatus('Нет выбранных фрагментов кода', 'error');
            return;
        }
        if (!hasMainSelection()) {
            showStatus('Отметьте один фрагмент как главный (документируемый код)', 'error');
            return;
        }
        const projectId = projectIdInput.value;
        if (!projectId) {
            showStatus('Сначала загрузите проект', 'error');
            return;
        }

        const templateCode = templateSelect.value;
        const algorithmCode = algorithmCodeInput.value.trim();
        const algorithmDescription = algorithmDescriptionInput.value.trim();
        const algorithmLink = algorithmLinkInput.value.trim();
        const authorities = authoritiesInput.value.trim();
        const slaP95 = slaP95Input.value.trim();
        const slaP99 = slaP99Input.value.trim();

        _submitting = true;
        setInputsDisabled(true);
        hideResult();
        showStatus('Генерация документации...', 'info');

        const chat = getActiveChat();
        if (!chat) { showStatus('Нет активного чата', 'error'); setInputsDisabled(false); _submitting = false; return; }

        const originChatId = chat.id;
        _generatingChatId = originChatId;
        abortController = new AbortController();

        try {
            const response = await fetch('/api/docs/project/generate-from-selections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    selections: selList,
                    templateCode,
                    algorithmCode,
                    algorithmDescription,
                    algorithmLink,
                    authorities,
                    slaP95,
                    slaP99
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                if (activeChatId === originChatId) {
                    showStatus(err.error || 'Ошибка генерации', 'error');
                }
                return;
            }

            const data = await response.json();
            hideStatus();

            const newChat = {
                id: data.chatId,
                name: getMainFileName() || 'project',
                mode: 'project',
                sourceCode: '',
                templateCode: templateCode,
                algorithmCode,
                algorithmDescription,
                algorithmLink,
                authorities,
                slaP95,
                slaP99,
                versions: data.versions || [],
                currentVersion: data.versionIndex || 0
            };
            chats.push(newChat);
            saveState();
            renderChatList();
            if (activeChatId === originChatId) {
                await switchChat(newChat.id);
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                if (activeChatId === originChatId) {
                    showStatus('Генерация прервана', 'info');
                    setTimeout(hideStatus, 3000);
                }
            } else if (activeChatId === originChatId) {
                showStatus('Ошибка: ' + err.message, 'error');
            }
        } finally {
            setInputsDisabled(false);
            _submitting = false;
            _generatingChatId = null;
            abortController = null;
        }
    }

    function buildSimplePrompt() {
        const main = sourceCodeEl.value.trim();
        const ctx = contextCodeEl.value.trim();
        let prompt = '';
        if (main) {
            prompt += '// === [ГЛАВНЫЙ] ===\n' + main + '\n';
        }
        if (ctx) {
            prompt += '\n// === [КОНТЕКСТ] ===\n' + ctx + '\n';
        }
        return prompt || main;
    }

    simplePreviewBtn.addEventListener('click', () => {
        const main = sourceCodeEl.value.trim();
        const ctx = contextCodeEl.value.trim();
        if (!main && !ctx) {
            showStatus('Введите код для документации', 'error');
            return;
        }
        const prompt = buildSimplePrompt();
        promptPreviewContent.textContent = prompt;
        promptModalGenerateBtn.onclick = () => {
            promptModal.classList.add('hidden');
            doGenerate();
        };
        promptModal.classList.remove('hidden');
    });

    function getMainFileName() {
        for (const fp in selections) {
            if (selections[fp].isMain) {
                return fp.includes('/') ? fp.substring(fp.lastIndexOf('/') + 1) : fp;
            }
        }
        return 'project';
    }

    // === Simple mode file handling ===
    function readFile(file) {
        const ext = file.name.split('.').pop();
        const langMap = { java: 'Java', kt: 'Kotlin', groovy: 'Groovy', py: 'Python', js: 'JavaScript', ts: 'TypeScript', cs: 'C#', cpp: 'C++', c: 'C', h: 'C/C++ Header', rs: 'Rust', go: 'Go', swift: 'Swift' };
        const lang = langMap[ext] || file.name;
        fileName.textContent = `${file.name} (${lang})`;
        const reader = new FileReader();
        reader.onload = function (e) {
            sourceCodeEl.value = e.target.result;
            const chat = getActiveChat();
            if (chat) {
                chat.name = file.name;
                fetch('/api/docs/chat/' + encodeURIComponent(chat.id) + '/rename', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'text/plain' },
                    body: file.name
                });
            }
            renderChatList();
            if (sourceCodeEl.value.trim() && !_submitting) {
                doGenerate();
            }
        };
        reader.readAsText(file);
    }

    ['dragenter', 'dragover'].forEach(evt => {
        dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove('drag-over'); });
    });
    dropZone.addEventListener('drop', e => {
        if (e.dataTransfer.files.length > 0) readFile(e.dataTransfer.files[0]);
    });
    fileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) readFile(fileInput.files[0]);
    });

    async function doGenerate() {
        if (_submitting) return;
        const sourceCode = buildSimplePrompt();
        const templateCode = templateSelect.value;
        if (!sourceCode) {
            showStatus('Введите код для документации', 'error');
            sourceCodeEl.classList.add('shake');
            setTimeout(() => sourceCodeEl.classList.remove('shake'), 500);
            return;
        }
        const algorithmCode = algorithmCodeInput.value.trim();
        const algorithmDescription = algorithmDescriptionInput.value.trim();
        const algorithmLink = algorithmLinkInput.value.trim();
        const authorities = authoritiesInput.value.trim();
        const slaP95 = slaP95Input.value.trim();
        const slaP99 = slaP99Input.value.trim();

        _submitting = true;
        setInputsDisabled(true);
        hideResult();
        showStatus('Генерация документации...', 'info');

        const chat = getActiveChat();
        if (!chat) { showStatus('Нет активного чата', 'error'); setInputsDisabled(false); _submitting = false; return; }

        const originChatId = chat.id;
        _generatingChatId = originChatId;
        abortController = new AbortController();

        try {
            const response = await fetch('/api/docs/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: chat.id, sourceCode, templateCode, algorithmCode, algorithmDescription, algorithmLink, authorities, slaP95, slaP99 }),
                signal: abortController.signal
            });
            if (response.ok) {
                const data = await response.json();
                hideStatus();
                const originChat = chats.find(c => c.id === originChatId);
                if (originChat) {
                    originChat.sourceCode = sourceCode;
                    originChat.templateCode = templateCode;
                    originChat.algorithmCode = algorithmCode;
                    originChat.algorithmDescription = algorithmDescription;
                    originChat.algorithmLink = algorithmLink;
                    originChat.authorities = authorities;
                    originChat.slaP95 = slaP95;
                    originChat.slaP99 = slaP99;
                    originChat.versions = data.versions || [];
                    originChat.currentVersion = data.versionIndex;
                }
                if (activeChatId === originChatId) {
                    showResult(data.documentation || 'Пустой ответ от модели', data.versions || [], data.versionIndex);
                } else {
                    saveState();
                }
            } else {
                if (activeChatId === originChatId) {
                    let errorMsg = `Ошибка ${response.status}`;
                    try { const errorData = await response.json(); errorMsg = errorData.message || errorData.error || errorMsg; } catch (e) {}
                    showStatus(errorMsg, 'error');
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                if (activeChatId === originChatId) {
                    showStatus('Генерация прервана', 'info');
                    setTimeout(hideStatus, 3000);
                }
            } else if (activeChatId === originChatId) {
                showStatus(`Ошибка: ${err.message}`, 'error');
            }
        } finally {
            if (activeChatId !== originChatId) hideStatus();
            setInputsDisabled(false);
            _submitting = false;
            _generatingChatId = null;
            abortController = null;
        }
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (_submitting) return;
        const chat = getActiveChat();
        if (chat && chat.mode === 'project') {
            doProjectGenerate();
        } else {
            doGenerate();
        }
    });

    stopBtn.addEventListener('click', function () {
        if (abortController) {
            abortController.abort();
            abortController = null;
        }
    });

    async function doCorrect(chatId, message) {
        const response = await fetch('/api/docs/correct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message })
        });
        return response;
    }

    correctBtn.addEventListener('click', async function () {
        const message = correctionInput.value.trim();
        const chat = getActiveChat();
        if (!message || !chat) return;

        const originChatId = chat.id;
        _generatingChatId = originChatId;
        _submitting = true;
        setInputsDisabled(true);
        showStatus('Исправляю документацию...', 'info');

        abortController = new AbortController();

        try {
            const response = await fetch('/api/docs/correct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: chat.id, message }),
                signal: abortController.signal
            });

            if (!response.ok) {
                if (activeChatId === originChatId) {
                    let errorMsg = `Ошибка ${response.status}`;
                    try { const ed = await response.json(); errorMsg = ed.message || errorMsg; } catch (e) {}
                    showStatus(errorMsg, 'error');
                }
                setInputsDisabled(false);
                _submitting = false;
                _generatingChatId = null;
                return;
            }

            const data = await response.json();
            hideStatus();
            const originChat = chats.find(c => c.id === originChatId);
            if (originChat) {
                originChat.algorithmCode = algorithmCodeInput.value;
                originChat.algorithmDescription = algorithmDescriptionInput.value;
                originChat.algorithmLink = algorithmLinkInput.value;
                originChat.authorities = authoritiesInput.value;
                originChat.slaP95 = slaP95Input.value;
                originChat.slaP99 = slaP99Input.value;
                originChat.versions = data.versions || [];
                originChat.currentVersion = data.versionIndex;
            }
            if (activeChatId === originChatId) {
                showResult(data.documentation || 'Пустой ответ от модели', data.versions || [], data.versionIndex);
            } else {
                saveState();
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                if (activeChatId === originChatId) {
                    showStatus('Корректировка прервана', 'info');
                    setTimeout(hideStatus, 3000);
                }
            } else if (activeChatId === originChatId) {
                showStatus(`Ошибка: ${err.message}`, 'error');
            }
        } finally {
            if (activeChatId !== originChatId) hideStatus();
            setInputsDisabled(false);
            _submitting = false;
            _generatingChatId = null;
            abortController = null;
        }
    });

    function renderPreview(html) {
        const styled = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            body { font-family: 'Inter', sans-serif; padding: 1rem; color: #1f2937; line-height: 1.6; }
            h1 { font-size: 1.5rem; margin: 0 0 0.75rem; color: #111827; }
            h2 { font-size: 1.2rem; margin: 1rem 0 0.5rem; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3rem; }
            table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
            th, td { border: 1px solid #d1d5db; padding: 0.4rem 0.6rem; text-align: left; font-size: 0.9rem; }
            th { background: #f3f4f6; font-weight: 600; }
            ol, ul { padding-left: 1.5rem; margin: 0.5rem 0; }
            li { margin: 0.25rem 0; }
            pre, code { font-family: 'Fira Code', monospace; background: #f1f5f9; border-radius: 6px; }
            pre { padding: 0.75rem; overflow-x: auto; font-size: 0.85rem; }
            code { padding: 0.1rem 0.3rem; font-size: 0.85rem; }
            p { margin: 0.5rem 0; }
            ac\\:structured-macro, ac\\:parameter, ac\\:plain-text-body { display: none; }
        </style><script>document.addEventListener('click',function(e){var t=e.target.closest('a');if(t&&t.getAttribute('href').startsWith('#')){e.preventDefault();var id=t.getAttribute('href').slice(1),el=document.getElementById(id);if(el)el.scrollIntoView()}})<\/script></head><body>${html}</body></html>`;
        previewFrame.srcdoc = styled;
    }

    viewToggle.addEventListener('click', e => {
        const btn = e.target.closest('.view-btn');
        if (!btn) return;
        viewToggle.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        previewMode = btn.dataset.view === 'preview';
        docContent.classList.toggle('hidden', previewMode);
        previewFrame.classList.toggle('hidden', !previewMode);
        if (previewMode) {
            renderPreview(docContent.textContent);
        }
    });

    const _origShowResult = showResult;
    window.showResult = showResult = function(text, vers, verIdx) {
        viewToggle.querySelector('.view-btn[data-view="code"]')?.click();
        _origShowResult(text, vers, verIdx);
    };

    function renderVersions(vers, currentIdx) {
        versionList.innerHTML = '';
        if (!vers || vers.length === 0) {
            versionBar.classList.add('hidden');
            return;
        }
        versionBar.classList.remove('hidden');
        vers.forEach((v, i) => {
            const btn = document.createElement('button');
            btn.className = `version-btn${i === currentIdx ? ' active' : ''}`;
            btn.textContent = `v${i + 1}`;
            btn.addEventListener('click', () => switchVersion(i));
            versionList.appendChild(btn);
        });
    }

    function switchVersion(idx) {
        const chat = getActiveChat();
        if (!chat || idx < 0 || idx >= versions.length) return;
        chat.currentVersion = idx;
        const content = versions[idx];
        docContent.textContent = content;
        if (previewMode) {
            renderPreview(content);
        }
        renderVersions(versions, idx);
        saveState();
    }

    function showStatus(message, type = 'info') {
        statusDiv.innerHTML = '';
        if (type === 'error') {
            const icon = document.createElement('span');
            icon.className = 'material-symbols-outlined';
            icon.textContent = 'warning';
            icon.style.fontSize = '1.2rem';
            statusDiv.appendChild(icon);
        } else {
            const dot = document.createElement('span');
            dot.className = 'dot-pulse';
            statusDiv.appendChild(dot);
        }
        statusDiv.appendChild(document.createTextNode(message));
        statusDiv.className = `status ${type}`;
        statusDiv.classList.remove('hidden');
        if (type === 'error') {
            setTimeout(() => statusDiv.classList.add('hidden'), 4000);
        }
    }

    function hideStatus() {
        statusDiv.classList.add('hidden');
    }

    function hideResult() {
        resultDiv.classList.add('hidden');
        correctionDiv.classList.add('hidden');
        versionBar.classList.add('hidden');
        fileName.textContent = '';
    }

    function showResult(text, vers, verIdx) {
        docContent.textContent = text;
        resultDiv.classList.remove('hidden');
        versions = vers || [];
        const idx = verIdx != null ? verIdx : (versions.length - 1);
        renderVersions(versions, idx);
        correctionDiv.classList.remove('hidden');
        correctionInput.value = '';
        correctBtn.disabled = false;
        correctionInput.disabled = false;
        const chat = getActiveChat();
        if (chat) {
            chat.sourceCode = sourceCodeEl.value;
            chat.contextCode = contextCodeEl.value;
            chat.templateCode = templateSelect.value;
            chat.algorithmCode = algorithmCodeInput.value;
            chat.algorithmDescription = algorithmDescriptionInput.value;
            chat.algorithmLink = algorithmLinkInput.value;
            chat.authorities = authoritiesInput.value;
            chat.slaP95 = slaP95Input.value;
            chat.slaP99 = slaP99Input.value;
            chat.versions = versions;
            chat.currentVersion = idx;
            saveState();
        }
    }

    let _submitting = false;
    let _generatingChatId = null;
    let abortController = null;

    function setInputsDisabled(disabled) {
        sourceCodeEl.disabled = disabled;
        contextCodeEl.disabled = disabled;
        templateSelect.disabled = disabled;
        correctionInput.disabled = disabled;
        correctBtn.disabled = disabled;
        fileBtn.disabled = disabled;
        uploadFolderBtn.disabled = disabled;
        generateBtn.disabled = disabled;
        previewPromptBtn.disabled = disabled;
        simplePreviewBtn.disabled = disabled;
        document.querySelectorAll('.file-checkbox').forEach(cb => cb.disabled = disabled);
        document.querySelectorAll('.tab').forEach(tab => tab.style.pointerEvents = disabled ? 'none' : '');
        stopBtn.classList.toggle('hidden', !disabled);
    }

    copyBtn.addEventListener('click', async () => {
        const text = docContent.textContent.trim();
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try { document.execCommand('copy'); } catch (fallbackErr) { alert('Не удалось скопировать. Выделите и скопируйте вручную.'); }
            finally { document.body.removeChild(textarea); }
            return;
        }
        copyToast.classList.remove('hidden');
        copyToast.classList.add('visible');
        setTimeout(() => {
            copyToast.classList.remove('visible');
            setTimeout(() => copyToast.classList.add('hidden'), 300);
        }, 2000);
    });

    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', () => downloadMenu.classList.add('hidden'));
    downloadMenu.addEventListener('click', (e) => e.stopPropagation());

    document.querySelectorAll('.download-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.dataset.format;
            const chatId = activeChatId;
            const chat = chats.find(c => c.id === chatId);
            const versionIndex = chat ? chat.currentVersion : null;
            if (!chatId || versionIndex == null || versionIndex < 0) return;
            downloadMenu.classList.add('hidden');
            window.open(`/api/docs/export/${chatId}/${versionIndex}?format=${format}`, '_blank');
        });
    });

    async function loadTemplates() {
        try {
            const response = await fetch('/api/docs/templates');
            if (response.ok) {
                const templates = await response.json();
                templateSelect.innerHTML = '';
                templates.forEach(code => {
                    const option = document.createElement('option');
                    option.value = code;
                    option.textContent = code;
                    templateSelect.appendChild(option);
                });
            }
        } catch (err) {
            console.warn('Не удалось загрузить список шаблонов');
        }
    }

    function setSidebarCollapsed(collapsed) {
        sidebar.classList.toggle('collapsed', collapsed);
        sidebarToggle.title = collapsed ? 'Показать панель' : 'Скрыть панель';
        sidebarToggle.querySelector('.material-symbols-outlined').textContent = collapsed ? 'chevron_right' : 'chevron_left';
        sidebarReveal.classList.toggle('hidden', !collapsed);
        localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '');
    }

    sidebarToggle.addEventListener('click', () => {
        setSidebarCollapsed(!sidebar.classList.contains('collapsed'));
    });

    sidebarReveal.addEventListener('click', () => {
        setSidebarCollapsed(false);
    });

    const savedCollapsed = localStorage.getItem('sidebar_collapsed');
    if (savedCollapsed === '1') {
        setSidebarCollapsed(true);
    }

    function showModeModal(onSelect) {
        modeModal.classList.remove('hidden');
        const handler = (e) => {
            const btn = e.target.closest('.modal-option');
            if (!btn) return;
            modeModal.classList.add('hidden');
            modeModal.removeEventListener('click', handler);
            onSelect(btn.dataset.mode);
        };
        modeModal.addEventListener('click', handler);
    }

    newChatBtn.addEventListener('click', () => {
        showModeModal((mode) => {
            if (abortController) {
                abortController.abort();
                abortController = null;
            }
            _submitting = false;
            _generatingChatId = null;
            setInputsDisabled(false);
            correctionInput.value = '';
            projectPath.value = '';
            projectIdInput.value = '';
            selections = {};
            projectFiles = [];
            currentPreviewFile = null;
            selClickState = null;
            hideSelectionPreview();
            selectionsSummary.classList.add('hidden');
            projectActions.classList.add('hidden');
            document.querySelectorAll('.file-checkbox:checked').forEach(cb => cb.checked = false);
            createChat('Новый чат', mode);
        });
    });

    function resetStartBtn() {
        startBtn.disabled = false;
        startBtn.innerHTML = '<span class="material-symbols-outlined">add_circle</span><span>Приступить к работе</span>';
    }

    startBtn.addEventListener('click', () => {
        showModeModal(async (mode) => {
            startBtn.disabled = true;
            startBtn.innerHTML = '<span class="material-symbols-outlined">sync</span><span>Создание...</span>';
            const chat = await createChat('Новый чат', mode);
            if (chat) resetStartBtn();
        });
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const chat = getActiveChat();
            if (chat && chat.mode === 'simple' && tab.dataset.tab === 'project') return;
            if (chat && chat.mode === 'project' && tab.dataset.tab === 'simple') return;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).classList.add('active');
            generateBtn.querySelector('span:last-child').textContent = 'Сгенерировать';
        });
    });

    uploadFolderBtn.addEventListener('click', () => folderInput.click());

    folderInput.addEventListener('change', async () => {
        if (folderInput.files.length === 0) return;
        console.log('[Project] Загрузка', folderInput.files.length, 'файлов');
        showStatus('Загрузка ' + folderInput.files.length + ' файлов...', 'info');

        const fileData = [];
        for (const file of folderInput.files) {
            const content = await file.text();
            fileData.push({ path: file.webkitRelativePath, content });
        }
        console.log('[Project] Файлы прочитаны, отправка...');

        try {
            console.log('[Project] POST /api/docs/project/upload');
            const response = await fetch('/api/docs/project/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fileData)
            });
            console.log('[Project] Ответ:', response.status, response.statusText);
            if (!response.ok) {
                const err = await response.json();
                console.error('[Project] Ошибка:', err);
                showStatus(err.error || 'Ошибка загрузки', 'error');
                return;
            }
            const data = await response.json();
            console.log('[Project] Загружено, root:', data.root, 'файлов:', data.files.length);
            hideStatus();

            selections = {};
            projectFiles = [];
            currentPreviewFile = null;
            selClickState = null;
            hideSelectionPreview();
            selectionsSummary.classList.add('hidden');
            projectActions.classList.add('hidden');

            projectPath.value = data.root;
            projectIdInput.value = data.projectId;

            // Wait for next tick to ensure DOM is ready, then send project path + scan
            const projectRoot = data.root;
            projectPath.value = projectRoot;
            renderFileTree(data.files);
        } catch (err) {
            console.error('[Project] Ошибка:', err);
            showStatus('Ошибка: ' + err.message, 'error');
        } finally {
            folderInput.value = '';
        }
    });

    async function init() {
        const hasSaved = loadState();
        if (hasSaved && chats.length > 0) {
            renderChatList();
            showWorkspace(true);
            await switchChat(activeChatId || chats[0].id);
        } else {
            showWorkspace(false);
        }
        loadTemplates();
    }

    init();
});
