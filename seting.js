const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const colorPicker = document.getElementById('color-picker');
const opacityRange = document.getElementById('opacity-range');
const opacityValue = document.getElementById('opacity-value');
const themeBtn = document.getElementById('theme-btn');
const centerBox = document.querySelector('.center-box');

let currentColor = '#000000';
let currentAlpha = 0.5;
let currentTheme = 'dark';

const configPath = path.join(__dirname, 'config.json');

// --- Загрузка конфигурации ---
function loadConfig() {
    if (!fs.existsSync(configPath)) return;

    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        if (config.color) {
            applyColor(config.color, false);
            const match = config.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([0-9.]*)\)/);
            if (match) {
                const [r, g, b, a] = [match[1], match[2], match[3], match[4] || 1];
                currentColor = rgbToHex(r, g, b);
                currentAlpha = parseFloat(a);
                colorPicker.value = currentColor;
                opacityRange.value = Math.round(currentAlpha * 100);
                opacityValue.textContent = opacityRange.value + '%';
            }
        }
        if (config.theme) {
            currentTheme = config.theme;
            updateThemeIcon();
            updateButtonTheme();
        }
    } catch (err) {
        console.error(err);
    }
}

// --- Сохранение конфигурации ---
function saveConfig() {
    const config = {
        color: hexToRgba(currentColor, currentAlpha),
        theme: currentTheme
    };
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Ошибка записи config.json:', err);
    }
}

// --- Применяем цвет ---
function applyColor(rgba, send = true) {
    if (centerBox) centerBox.style.background = rgba;
    if (send) ipcRenderer.send('change-main-color', rgba);
}

// --- HEX ↔ RGBA ---
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = parseInt(x).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}

// --- Обновляем цвет ---
function updateColor() {
    const rgba = hexToRgba(currentColor, currentAlpha);
    applyColor(rgba);
    saveConfig();
}

// --- Обновляем тему кнопок ---
function updateButtonTheme() {
    const buttons = document.querySelectorAll('button:not(#theme-btn)');
    buttons.forEach(btn => {
        btn.classList.remove('dark', 'light');
        btn.classList.add(currentTheme);
    });
}

// --- События контролов ---
colorPicker.addEventListener('input', () => {
    currentColor = colorPicker.value;
    updateColor();
});

opacityRange.addEventListener('input', () => {
    currentAlpha = opacityRange.value / 100;
    opacityValue.textContent = opacityRange.value + '%';
    updateColor();
});

// --- Смена темы ---
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    updateThemeIcon();
    ipcRenderer.send('change-theme', currentTheme);
    saveConfig();
}




function updateThemeIcon() {
    themeBtn.textContent = currentTheme === 'dark' ? '🌙' : '☀️';
}

themeBtn.addEventListener('click', toggleTheme);

// --- Инициализация ---
loadConfig();
updateButtonTheme(); // применяет тему к кнопкам сразу

