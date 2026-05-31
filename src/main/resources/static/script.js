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

    function saveState() {
        const state = {
            chats: chats.map(c => ({
                id: c.id,
                name: c.name,
                sourceCode: c.sourceCode,
                templateCode: c.templateCode,
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

    async function createChat(name) {
        const response = await fetch('/api/docs/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: name || 'Новый чат'
        });
        if (!response.ok) {
            showStatus('Ошибка создания чата', 'error');
            return null;
        }
        const data = await response.json();
        const chat = {
            id: data.id,
            name: data.name,
            sourceCode: '',
            templateCode: '200',
            versions: [],
            currentVersion: -1
        };
        chats.push(chat);
        activeChatId = chat.id;
        switchChat(chat.id);
        saveState();
        showWorkspace(true);
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
        versions = chat.versions || [];
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
            chat.versions = versions;
            chat.currentVersion = idx;
            saveState();
        }
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

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const sourceCode = sourceCodeEl.value.trim();
        const templateCode = templateSelect.value;
        if (!sourceCode) { showStatus('Введите исходный код', 'error'); return; }

        generateBtn.disabled = true;
        hideResult();
        showStatus('Генерация документации...', 'info');

        try {
            const chat = getActiveChat();
            if (!chat) { showStatus('Нет активного чата', 'error'); generateBtn.disabled = false; return; }
            const response = await fetch('/api/docs/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: chat.id, sourceCode, templateCode })
            });
            if (response.ok) {
                const data = await response.json();
                hideStatus();
                chat.sourceCode = sourceCode;
                chat.templateCode = templateCode;
                showResult(data.documentation || 'Пустой ответ от модели', data.versions || [], data.versionIndex);
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
        correctBtn.disabled = true;
        correctionInput.disabled = true;
        showStatus('Исправляю документацию...', 'info');
        try {
            const response = await doCorrect(chat.id, message);
            if (!response.ok) {
                let errorMsg;
                try { const ed = await response.json(); errorMsg = ed.message; } catch (parseErr) {}
                showStatus(errorMsg || `Ошибка ${response.status}`, 'error');
                correctBtn.disabled = false;
                correctionInput.disabled = false;
                return;
            }
            const data = await response.json();
            hideStatus();
            showResult(data.documentation || 'Пустой ответ от модели', data.versions || [], data.versionIndex);
        } catch (err) {
            showStatus(`Сетевая ошибка: ${err.message}`, 'error');
            correctBtn.disabled = false;
            correctionInput.disabled = false;
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

    newChatBtn.addEventListener('click', () => {
        createChat('Новый чат');
    });

    function resetStartBtn() {
        startBtn.disabled = false;
        startBtn.innerHTML = '<span class="material-symbols-outlined">add_circle</span><span>Приступить к работе</span>';
    }

    startBtn.addEventListener('click', async () => {
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="material-symbols-outlined">sync</span><span>Создание...</span>';
        const chat = await createChat('Новый чат');
        if (chat) resetStartBtn();
    });

    async function init() {
        const hasSaved = loadState();
        if (hasSaved && chats.length > 0) {
            renderChatList();
            showWorkspace(true);
            switchChat(activeChatId || chats[0].id);
        } else {
            showWorkspace(false);
        }
        loadTemplates();
    }

    init();
});
