document.addEventListener('DOMContentLoaded', () => {

    // DOM refs
    const form = document.getElementById('docForm');
    const sourceCodeEl = document.getElementById('sourceCode');
    const templateSelect = document.getElementById('templateCode');
    const generateBtn = document.getElementById('generateBtn');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');
    const docContent = document.getElementById('docContent');
    const copyBtn = document.getElementById('copyBtn');
    const copyToast = document.getElementById('copyToast');
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
    const versionBar = document.getElementById('versionBar');
    const versionList = document.getElementById('versionList');
    const previewFrame = document.getElementById('previewFrame');
    const viewToggle = document.getElementById('viewToggle');
    let previewMode = false;

    // === State ===
    const STORAGE_KEY = 'localcoder_state';
    let chats = [];
    let activeChatId = null;
    let currentSessionId = null;
    let versions = [];

    // === Theme ===
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

    // === Persistence ===
    function saveState() {
        const state = {
            chats: chats.map(c => ({
                id: c.id,
                name: c.name,
                sourceCode: c.sourceCode,
                templateCode: c.templateCode,
                sessionId: c.sessionId,
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

    function updateActiveChat(partial) {
        const chat = getActiveChat();
        if (chat) Object.assign(chat, partial);
    }

    // === Chat management ===
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

    function createChat(name) {
        const chat = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: name || 'Новый чат',
            sourceCode: '',
            templateCode: '200',
            sessionId: null,
            versions: [],
            currentVersion: -1
        };
        chats.push(chat);
        activeChatId = chat.id;
        switchChat(chat.id);
        saveState();
        return chat;
    }

    function switchChat(id) {
        const prev = getActiveChat();
        if (prev) {
            prev.sourceCode = sourceCodeEl.value;
            prev.templateCode = templateSelect.value;
        }
        activeChatId = id;
        const chat = getActiveChat();
        if (!chat) return;
        sourceCodeEl.value = chat.sourceCode || '';
        templateSelect.value = chat.templateCode || '200';
        currentSessionId = chat.sessionId;
        versions = chat.versions || [];
        renderChatList();
        if (chat.versions && chat.versions.length > 0 && chat.currentVersion >= 0) {
            const idx = Math.min(chat.currentVersion, chat.versions.length - 1);
            showResult(chat.versions[idx], chat.sessionId, chat.versions, idx);
        } else {
            hideResult();
            currentSessionId = chat.sessionId || null;
        }
        saveState();
    }

    function deleteChat(id) {
        if (chats.length <= 1) return;
        const idx = chats.findIndex(c => c.id === id);
        if (idx === -1) return;
        chats.splice(idx, 1);
        if (activeChatId === id) {
            const next = chats[Math.min(idx, chats.length - 1)];
            switchChat(next.id);
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

    // === Version bar ===
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
        if (!chat || !chat.versions || idx < 0 || idx >= chat.versions.length) return;
        chat.currentVersion = idx;
        const content = chat.versions[idx];
        docContent.textContent = content;
        if (previewMode) {
            renderPreview(content);
        }
        renderVersions(chat.versions, idx);
        saveState();
    }

    // === Status & Result ===
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
    }

    function showResult(text, sessionId, vers, verIdx) {
        docContent.textContent = text;
        resultDiv.classList.remove('hidden');
        currentSessionId = sessionId;
        versions = vers || [];
        const idx = verIdx != null ? verIdx : (versions.length - 1);
        renderVersions(versions, idx);
        correctionDiv.classList.remove('hidden');
        correctionInput.value = '';
        correctBtn.disabled = false;
        correctionInput.disabled = false;
        // sync chat state
        const chat = getActiveChat();
        if (chat) {
            chat.sourceCode = sourceCodeEl.value;
            chat.templateCode = templateSelect.value;
            chat.sessionId = sessionId;
            chat.versions = versions;
            chat.currentVersion = idx;
            saveState();
        }
    }

    // === File drop ===
    function readFile(file) {
        const ext = file.name.split('.').pop();
        const langMap = { java: 'Java', kt: 'Kotlin', groovy: 'Groovy', py: 'Python', js: 'JavaScript', ts: 'TypeScript', cs: 'C#', cpp: 'C++', c: 'C', h: 'C/C++ Header', rs: 'Rust', go: 'Go', swift: 'Swift' };
        const lang = langMap[ext] || file.name;
        fileName.textContent = `${file.name} (${lang})`;
        const reader = new FileReader();
        reader.onload = function (e) {
            sourceCodeEl.value = e.target.result;
            // auto-name chat if unnamed
            const chat = getActiveChat();
            if (chat) chat.name = file.name;
            renderChatList();
            if (sourceCodeEl.value.trim()) {
                form.dispatchEvent(new Event('submit'));
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

    // === Generate ===
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const sourceCode = sourceCodeEl.value.trim();
        const templateCode = templateSelect.value;
        if (!sourceCode) { showStatus('Введите исходный код', 'error'); return; }

        generateBtn.disabled = true;
        hideResult();
        showStatus('Генерация документации...', 'info');

        try {
            const response = await fetch('/api/docs/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceCode, templateCode })
            });
            if (response.ok) {
                const data = await response.json();
                hideStatus();
                const chat = getActiveChat();
                if (chat) {
                    chat.sourceCode = sourceCode;
                    chat.templateCode = templateCode;
                    chat.sessionId = data.sessionId;
                }
                showResult(data.documentation || 'Пустой ответ от модели', data.sessionId, data.versions || [], data.versionIndex);
            } else {
                let errorMsg = `Ошибка ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) errorMsg = errorData.message;
                    else if (errorData.error) errorMsg = `${errorData.error}: ${errorData.message || ''}`;
                } catch (parseErr) {}
                showStatus(errorMsg, 'error');
            }
        } catch (err) {
            showStatus(`Сетевая ошибка: ${err.message}`, 'error');
        } finally {
            generateBtn.disabled = false;
        }
    });

    async function doCorrect(sessionId, message) {
        const response = await fetch('/api/docs/correct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message })
        });
        return response;
    }

    // === Correct ===
    correctBtn.addEventListener('click', async function () {
        const message = correctionInput.value.trim();
        if (!message || !currentSessionId) return;
        correctBtn.disabled = true;
        correctionInput.disabled = true;
        showStatus('Исправляю документацию...', 'info');
        try {
            let response = await doCorrect(currentSessionId, message);
            if (!response.ok) {
                let errorMsg;
                try { const ed = await response.json(); errorMsg = ed.message; } catch (parseErr) {}
                // Session expired — re-generate then retry
                if (errorMsg && errorMsg.includes('Сессия не найдена')) {
                    const chat = getActiveChat();
                    if (chat && chat.sourceCode) {
                        showStatus('Сессия устарела, пересоздаю...', 'info');
                        const genResp = await fetch('/api/docs/generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sourceCode: chat.sourceCode, templateCode: chat.templateCode })
                        });
                        if (genResp.ok) {
                            const genData = await genResp.json();
                            currentSessionId = genData.sessionId;
                            chat.sessionId = genData.sessionId;
                            chat.versions = genData.versions || [];
                            chat.currentVersion = genData.versionIndex;
                            response = await doCorrect(currentSessionId, message);
                        } else {
                            showStatus('Не удалось восстановить сессию. Вставьте код заново и нажмите «Сгенерировать».', 'error');
                            correctBtn.disabled = false;
                            correctionInput.disabled = false;
                            return;
                        }
                    } else {
                        showStatus('Исходный код не сохранён. Вставьте код заново и нажмите «Сгенерировать».', 'error');
                        correctBtn.disabled = false;
                        correctionInput.disabled = false;
                        return;
                    }
                }
                if (!response.ok) {
                    try { const ed = await response.json(); errorMsg = ed.message || errorMsg; } catch (parseErr) {}
                    showStatus(errorMsg || `Ошибка ${response.status}`, 'error');
                    correctBtn.disabled = false;
                    correctionInput.disabled = false;
                    return;
                }
            }
            const data = await response.json();
            hideStatus();
            showResult(data.documentation || 'Пустой ответ от модели', data.sessionId, data.versions || [], data.versionIndex);
        } catch (err) {
            showStatus(`Сетевая ошибка: ${err.message}`, 'error');
            correctBtn.disabled = false;
            correctionInput.disabled = false;
        }
    });

    // === View toggle ===
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

    // Patch showResult to reset view
    const _origShowResult = showResult;
    window.showResult = showResult = function(text, sessionId, vers, verIdx) {
        viewToggle.querySelector('.view-btn[data-view="code"]')?.click();
        _origShowResult(text, sessionId, vers, verIdx);
    };

    // === Copy ===
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

    // === Templates ===
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

    // === New chat ===
    newChatBtn.addEventListener('click', () => {
        createChat('Новый чат');
    });

    // === Init ===
    function init() {
        const hasSaved = loadState();
        if (hasSaved && chats.length > 0) {
            renderChatList();
            switchChat(activeChatId || chats[0].id);
        } else {
            createChat('Чат 1');
        }
        loadTemplates();
    }

    init();
});
