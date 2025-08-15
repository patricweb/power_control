const { ipcRenderer } = require('electron');

const powerBtn = document.querySelector('.Power');
const restartBtn = document.querySelector('.Restart');
const sleepBtn = document.querySelector('.Sleep');
const centerBox = document.querySelector('.center-box');

// --- Изменение цвета ---
ipcRenderer.on('update-color', (event, color) => {
    if (centerBox) centerBox.style.background = color;
});

// --- Изменение темы и иконок ---
ipcRenderer.on('update-theme', (event, theme, icons) => {
    Object.keys(icons).forEach(btnClass => {
        const btnImg = document.querySelector(`.${btnClass} img`);
        if (btnImg) btnImg.src = icons[btnClass];
    });

    const buttons = document.querySelectorAll('button:not(.settings-btn)');
    buttons.forEach(btn => {
        btn.classList.remove('dark', 'light');
        btn.classList.add(theme);
    });
});

// --- Подключение кнопки настроек ---
ipcRenderer.on('attach-settings-btn', () => {
    const btn = document.getElementById('open-settings');
    if (btn) {
        btn.addEventListener('click', () => {
            ipcRenderer.send('open-settings');
        });
    }
});

// --- Обработчики кнопок ---
if (powerBtn) powerBtn.addEventListener('click', () => ipcRenderer.send('perform-action', 'shutdown'));
if (restartBtn) restartBtn.addEventListener('click', () => ipcRenderer.send('perform-action', 'restart'));
if (sleepBtn) sleepBtn.addEventListener('click', () => ipcRenderer.send('perform-action', 'sleep'));