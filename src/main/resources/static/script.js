// script.js
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('docForm');
    const sourceCodeEl = document.getElementById('sourceCode');
    const templateSelect = document.getElementById('templateCode');
    const generateBtn = document.getElementById('generateBtn');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');
    const docContent = document.getElementById('docContent');
    const copyBtn = document.getElementById('copyBtn');
    const copyToast = document.getElementById('copyToast');

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

    function showStatus(message, type = 'info', isLoading = false) {
        statusDiv.textContent = '';
        statusDiv.className = `status ${type}`;
        if (isLoading) {
            const textSpan = document.createElement('span');
            textSpan.textContent = message + ' ';
            statusDiv.appendChild(textSpan);
            const dotsWrapper = document.createElement('span');
            dotsWrapper.className = 'loading-dots';
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('span');
                dot.className = 'dot-pulse';
                dotsWrapper.appendChild(dot);
            }
            statusDiv.appendChild(dotsWrapper);
        } else {
            statusDiv.textContent = message;
        }
        statusDiv.classList.remove('hidden');
    }

    function hideStatus() {
        statusDiv.classList.add('hidden');
    }

    function hideResult() {
        resultDiv.classList.add('hidden');
    }

    function showResult(text) {
        docContent.textContent = text;
        resultDiv.classList.remove('hidden');
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function copyToClipboard() {
        const text = docContent.textContent;
        if (!text.trim()) return;
        try {
            await navigator.clipboard.writeText(text);
            copyToast.classList.remove('hidden');
            setTimeout(() => {
                copyToast.classList.add('hidden');
            }, 2000);
        } catch (err) {
            console.error('Ошибка копирования:', err);
            showStatus('Не удалось скопировать текст', 'error');
            setTimeout(() => hideStatus(), 2000);
        }
    }

    copyBtn.addEventListener('click', copyToClipboard);

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const sourceCode = sourceCodeEl.value.trim();
        const templateCode = templateSelect.value;

        if (!sourceCode) {
            showStatus('Введите исходный код', 'error');
            setTimeout(() => hideStatus(), 3000);
            return;
        }

        generateBtn.disabled = true;
        hideResult();
        showStatus('Генерация документации', 'info', true);

        try {
            const response = await fetch('/api/docs/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceCode, templateCode })
            });

            if (response.ok) {
                const data = await response.json();
                hideStatus();
                showResult(data.documentation || 'Пустой ответ от модели');
            } else {
                let errorMsg = `Ошибка ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) errorMsg = errorData.message;
                    else if (errorData.error) errorMsg = `${errorData.error}: ${errorData.message || ''}`;
                } catch (parseErr) {}
                showStatus(errorMsg, 'error');
                setTimeout(() => hideStatus(), 4000);
            }
        } catch (err) {
            showStatus(`Сетевая ошибка: ${err.message}`, 'error');
            setTimeout(() => hideStatus(), 4000);
        } finally {
            generateBtn.disabled = false;
        }
    });

    loadTemplates();
});