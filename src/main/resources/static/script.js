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
    if (savedTheme === 'light') {
        setTheme('light');
    } else {
        setTheme('dark');
    }

    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark');
        setTheme(isDark ? 'light' : 'dark');
    });


    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileBtn = document.getElementById('fileBtn');
    const fileName = document.getElementById('fileName');
    const correctionDiv = document.getElementById('correction');
    const correctionInput = document.getElementById('correctionInput');
    const correctBtn = document.getElementById('correctBtn');
    let currentSessionId = null;

    function readFile(file) {
        const ext = file.name.split('.').pop();
        const langMap = { java: 'Java', kt: 'Kotlin', groovy: 'Groovy', py: 'Python', js: 'JavaScript', ts: 'TypeScript', cs: 'C#', cpp: 'C++', c: 'C', h: 'C/C++ Header', rs: 'Rust', go: 'Go', swift: 'Swift' };
        const lang = langMap[ext] || file.name;
        fileName.textContent = `${file.name} (${lang})`;

        const reader = new FileReader();
        reader.onload = function (e) {
            sourceCodeEl.value = e.target.result;
            if (sourceCodeEl.value.trim()) {
                form.dispatchEvent(new Event('submit'));
            }
        };
        reader.readAsText(file);
    }

    ['dragenter', 'dragover'].forEach(evt => {
        dropZone.addEventListener(evt, e => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, e => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });
    });

    dropZone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            readFile(files[0]);
        }
    });

    fileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            readFile(fileInput.files[0]);
        }
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
            console.warn('Не удалось загрузить список шаблонов, используются значения по умолчанию');
        }
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
    }

    function showResult(text, sessionId) {
        docContent.textContent = text;
        resultDiv.classList.remove('hidden');
        currentSessionId = sessionId;
        correctionDiv.classList.remove('hidden');
        correctionInput.value = '';
        correctBtn.disabled = false;
        correctionInput.disabled = false;
    }


    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const sourceCode = sourceCodeEl.value.trim();
        const templateCode = templateSelect.value;

        if (!sourceCode) {
            showStatus('Введите исходный код', 'error');
            return;
        }

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
                showResult(data.documentation || 'Пустой ответ от модели', data.sessionId);
            } else {
                let errorMsg = `Ошибка ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMsg = errorData.message;
                    } else if (errorData.error) {
                        errorMsg = `${errorData.error}: ${errorData.message || ''}`;
                    }
                } catch (parseErr) { /* тело не JSON */ }
                showStatus(errorMsg, 'error');
            }
        } catch (err) {
            showStatus(`Сетевая ошибка: ${err.message}`, 'error');
        } finally {
            generateBtn.disabled = false;
        }
    });


    correctBtn.addEventListener('click', async function () {
        const message = correctionInput.value.trim();
        if (!message || !currentSessionId) return;

        correctBtn.disabled = true;
        correctionInput.disabled = true;
        showStatus('Исправляю документацию...', 'info');

        try {
            const response = await fetch('/api/docs/correct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: currentSessionId, message })
            });

            if (response.ok) {
                const data = await response.json();
                hideStatus();
                showResult(data.documentation || 'Пустой ответ от модели', data.sessionId);
            } else {
                let errorMsg = `Ошибка ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (parseErr) { /* ignore */ }
                showStatus(errorMsg, 'error');
                correctBtn.disabled = false;
                correctionInput.disabled = false;
            }
        } catch (err) {
            showStatus(`Сетевая ошибка: ${err.message}`, 'error');
            correctBtn.disabled = false;
            correctionInput.disabled = false;
        }
    });

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
            try {
                document.execCommand('copy');
            } catch (fallbackErr) {
                alert('Не удалось скопировать. Выделите и скопируйте вручную.');
            } finally {
                document.body.removeChild(textarea);
            }
            return;
        }

        copyToast.classList.remove('hidden');
        copyToast.classList.add('visible');
        setTimeout(() => {
            copyToast.classList.remove('visible');
            setTimeout(() => {
                copyToast.classList.add('hidden');
            }, 300);
        }, 2000);
    });

    loadTemplates();
});