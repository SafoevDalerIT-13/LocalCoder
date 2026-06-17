document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('docForm');
    const sourceCodeEl = document.getElementById('sourceCode');
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
    const fileTree = document.getElementById('fileTree');
    const projectActions = document.getElementById('projectActions');
    const selectedCount = document.getElementById('selectedCount');
    const filePreview = document.getElementById('filePreview');
    const previewContent = document.getElementById('previewContent');
    const previewFileName = document.getElementById('previewFileName');
    const previewClose = document.getElementById('previewClose');
    const uploadFolderBtn = document.getElementById('uploadFolderBtn');
    const folderInput = document.getElementById('folderInput');
    const stopBtn = document.getElementById('stopBtn');
    const modeModal = document.getElementById('modeModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const templateParams = document.getElementById('templateParams');
    const algorithmCodeInput = document.getElementById('algorithmCode');
    const authoritiesInput = document.getElementById('authorities');
    const slaP95Input = document.getElementById('slaP95');
    const slaP99Input = document.getElementById('slaP99');

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
                templateCode: c.templateCode,
                algorithmCode: c.algorithmCode,
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
            templateCode: '200',
            algorithmCode: '',
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
            prev.templateCode = templateSelect.value;
            prev.algorithmCode = algorithmCodeInput.value;
            prev.authorities = authoritiesInput.value;
            prev.slaP95 = slaP95Input.value;
            prev.slaP99 = slaP99Input.value;
        }
        activeChatId = id;
        const chat = getActiveChat();
        if (!chat) return;
        sourceCodeEl.value = chat.sourceCode || '';
        templateSelect.value = chat.templateCode || '200';
        algorithmCodeInput.value = chat.algorithmCode || '';
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
                html += `<div class="file-tree-item" style="padding-left:${depth * 20 + 8}px">
                    <input type="radio" name="primaryFile" class="file-radio" data-path="${escHtml(data.path)}" title="Основной файл для документации">
                    <input type="checkbox" class="file-checkbox" data-path="${escHtml(data.path)}">
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

    async function showFilePreview(relativePath) {
        const rootPath = projectPath.value.trim().replace(/\\/g, '/').replace(/\/+$/, '');
        const fullPath = rootPath + '/' + relativePath;

        previewFileName.textContent = relativePath;
        previewContent.textContent = 'Загрузка...';
        filePreview.classList.remove('hidden');

        try {
            const response = await fetch('/api/docs/project/read?path=' + encodeURIComponent(fullPath));
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                previewContent.textContent = err.error || 'Ошибка загрузки файла';
                return;
            }
            const data = await response.json();
            previewContent.textContent = data.content || '(пустой файл)';
        } catch (err) {
            previewContent.textContent = 'Ошибка: ' + err.message;
        }
    }

    previewClose.addEventListener('click', () => {
        filePreview.classList.add('hidden');
    });

    function renderFileTree(files) {
        const tree = buildFileTree(files);
        fileTree.innerHTML = renderTreeNodes(tree, 0);
        projectActions.classList.remove('hidden');
        hidePreview();
        updateSelectedCount();
        fileTree.querySelectorAll('.file-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSelectedCount);
        });
        fileTree.querySelectorAll('.file-radio').forEach(rb => {
            rb.addEventListener('change', () => {
                if (rb.checked) {
                    const cb = rb.closest('.file-tree-item').querySelector('.file-checkbox');
                    if (cb) cb.checked = true;
                    updateSelectedCount();
                }
            });
        });
        fileTree.addEventListener('click', e => {
            if (e.target.closest('.file-checkbox')) return;
            if (e.target.closest('.file-radio')) return;
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
                if (cb) showFilePreview(cb.dataset.path);
            }
        });
    }

    function hidePreview() {
        filePreview.classList.add('hidden');
        previewContent.textContent = '';
    }

    function updateSelectedCount() {
        const checked = document.querySelectorAll('.file-checkbox:checked').length;
        const primary = document.querySelector('.file-radio:checked');
        let text = checked + ' файлов выбрано';
        if (primary) {
            const name = primary.closest('.file-tree-item').querySelector('.file-tree-name').textContent;
            text += ' — главный: ' + name;
        } else {
            text += ' (выберите главный файл для документации)';
        }
        selectedCount.textContent = text;
    }

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
        const dot = document.createElement('span');
        dot.className = 'dot-pulse';
        statusDiv.appendChild(dot);
        statusDiv.appendChild(document.createTextNode(message));
        statusDiv.className = `status ${type}`;
        statusDiv.classList.remove('hidden');
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
            chat.templateCode = templateSelect.value;
            chat.algorithmCode = algorithmCodeInput.value;
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
        templateSelect.disabled = disabled;
        correctionInput.disabled = disabled;
        correctBtn.disabled = disabled;
        fileBtn.disabled = disabled;
        uploadFolderBtn.disabled = disabled;
        generateBtn.disabled = disabled;
        document.querySelectorAll('.file-checkbox').forEach(cb => cb.disabled = disabled);
        document.querySelectorAll('.file-radio').forEach(rb => rb.disabled = disabled);
        document.querySelectorAll('.tab').forEach(tab => tab.style.pointerEvents = disabled ? 'none' : '');
        stopBtn.classList.toggle('hidden', !disabled);
    }

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
        const sourceCode = sourceCodeEl.value.trim();
        const templateCode = templateSelect.value;
        if (!sourceCode) { showStatus('Введите исходный код', 'error'); return; }
        const algorithmCode = algorithmCodeInput.value.trim();
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
                body: JSON.stringify({ chatId: chat.id, sourceCode, templateCode, algorithmCode, authorities, slaP95, slaP99 }),
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
            const primaryRb = document.querySelector('.file-radio:checked');
            if (!primaryRb) {
                showStatus('Выберите главный файл для документирования (радио-кнопка слева)', 'error');
                return;
            }
            const contextCbs = document.querySelectorAll('.file-checkbox:checked');
            if (contextCbs.length === 0) {
                showStatus('Выберите файлы для контекста', 'error');
                return;
            }
            const rootPath = projectPath.value.trim().replace(/\\/g, '/').replace(/\/+$/, '');
            if (!rootPath) {
                showStatus('Сначала загрузите папку с проектом', 'error');
                return;
            }

            const primaryFile = rootPath + '/' + primaryRb.dataset.path;
            const contextFiles = Array.from(contextCbs)
                .map(cb => rootPath + '/' + cb.dataset.path)
                .filter(f => f !== primaryFile);
            const templateCode = templateSelect.value;

            _submitting = true;
            setInputsDisabled(true);
            showStatus('Генерация документации...', 'info');

            const originChatId = activeChatId;
            _generatingChatId = originChatId;
            abortController = new AbortController();

            (async () => {
                try {
                    const response = await fetch('/api/docs/project/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ primaryFile, contextFiles, templateCode }),
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
                        name: primaryRb.dataset.path.split('/').pop(),
                        mode: 'project',
                        sourceCode: '',
                        templateCode: templateCode,
                        versions: data.versions || [],
                        currentVersion: data.versionIndex || 0
                    };
                    chats.push(newChat);
                    saveState();
                    renderChatList();
                    if (activeChatId === originChatId) {
                        await switchChat(newChat.id);
                    }
                    showStatus('Готово', 'info');
                    setTimeout(hideStatus, 2000);
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
            })();
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
        </style></head><body>${html}</body></html>`;
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
            const fileListEl = document.getElementById('projectFileList');
            if (fileListEl) fileListEl.innerHTML = '';
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
            projectPath.value = data.root;
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
