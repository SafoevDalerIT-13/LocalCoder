document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('docForm');
    const sourceCodeEl = document.getElementById('sourceCode');
    const templateSelect = document.getElementById('templateCode');
    const generateBtn = document.getElementById('generateBtn');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');
    const docContent = document.getElementById('docContent');

    async function loadTemplates() {
        try {
            const response = await fetch('/api/docs/templates');
            if (response.ok) {
                const templates = await response.json();
                // Очищаем select и добавляем полученные шаблоны
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
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sourceCode: sourceCode,
                    templateCode: templateCode
                })
            });

            if (response.ok) {
                const data = await response.json();
                hideStatus();
                showResult(data.documentation || 'Пустой ответ от модели');
            } else {
                let errorMsg = `Ошибка ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMsg = errorData.message;
                    } else if (errorData.error) {
                        errorMsg = `${errorData.error}: ${errorData.message || ''}`;
                    }
                } catch (parseErr) {
                    // Игнорируем, если тело не JSON
                }
                showStatus(errorMsg, 'error');
            }
        } catch (err) {
            showStatus(`Сетевая ошибка: ${err.message}`, 'error');
        } finally {
            generateBtn.disabled = false;
        }
    });

    loadTemplates();
});