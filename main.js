const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, screen, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process'); // Добавляем для выполнения команд

let win;
let settingsWin;
let tray;
let isAnimating = false;

// Используем userData для конфига
const configPath = path.join(app.getPath('userData'), 'config.json');

// --- Чтение конфигурации ---
function loadConfig() {
    try {
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify({ mainColor: 'rgba(0,0,0,0.5)', theme: 'dark' }, null, 2));
        }
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (err) {
        return { mainColor: 'rgba(0,0,0,0.5)', theme: 'dark' };
    }
}

// --- Сохранение конфигурации ---
function saveConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

let config = loadConfig();

// --- Создание главного окна ---
function createWindow() {
    const display = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = display.workAreaSize;
    const winWidth = 450;
    const winHeight = 250;

    win = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        x: Math.floor((screenWidth - winWidth) / 2),
        y: Math.floor((screenHeight - winHeight) / 2),
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        show: false,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        alwaysOnTop: true,
        focusable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');

    win.webContents.on('did-finish-load', () => {
        // Отправляем текущий цвет и тему сразу после загрузки
        win.webContents.send('update-color', config.mainColor);
        win.webContents.send('update-theme', config.theme);

        // Подключаем кнопку настроек
        win.webContents.send('attach-settings-btn');
    });
}

// --- Создание окна настроек ---
function createSettingsWindow() {
    if (settingsWin) {
        toggleSettingsWindow();
        return;
    }

    const display = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = display.workAreaSize;
    const winWidth = 450;
    const winHeight = 650;

    settingsWin = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        x: Math.floor((screenWidth - winWidth) / 2 + 500),
        y: Math.floor((screenHeight - winHeight) / 2),
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        show: false,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        alwaysOnTop: true,
        focusable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    settingsWin.loadFile('seting.html'); // Исправлено
    fadeInWindow(settingsWin);

    settingsWin.on('closed', () => {
        settingsWin = null;
    });
}

// --- Создание трея ---
function createTray() {
    tray = new Tray(nativeImage.createEmpty());
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Показать/Скрыть', click: toggleMainWindow },
        { label: 'Выход', click: () => app.quit() }
    ]);
    tray.setToolTip('PowerControl');
    tray.setContextMenu(contextMenu);
    tray.on('click', toggleMainWindow);
}

// --- Анимация появления ---
function fadeInWindow(targetWin, callback) {
    if (!targetWin) return;
    isAnimating = true;
    let opacity = 0;
    targetWin.setOpacity(opacity);
    targetWin.show();
    targetWin.setAlwaysOnTop(true, 'screen-saver');

    const interval = setInterval(() => {
        opacity += 0.05;
        if (opacity >= 1) {
            opacity = 1;
            clearInterval(interval);
            isAnimating = false;
            if (callback) callback();
        }
        targetWin.setOpacity(opacity);
    }, 16);
}

// --- Анимация скрытия ---
function fadeOutWindow(targetWin, callback) {
    if (!targetWin) return;
    isAnimating = true;
    let opacity = targetWin.getOpacity();

    const interval = setInterval(() => {
        opacity -= 0.05;
        if (opacity <= 0) {
            opacity = 0;
            targetWin.hide();
            clearInterval(interval);
            isAnimating = false;
            if (callback) callback();
        }
        targetWin.setOpacity(opacity);
    }, 16);
}

// --- Toggle главного окна ---
function toggleMainWindow() {
    if (isAnimating) return;
    if (win.isVisible()) {
        fadeOutWindow(win);
    } else {
        fadeInWindow(win);
    }
}

// --- Toggle окна настроек ---
function toggleSettingsWindow() {
    if (isAnimating) return;
    if (!settingsWin) {
        createSettingsWindow();
        return;
    }
    if (settingsWin.isVisible()) {
        fadeOutWindow(settingsWin);
    } else {
        fadeInWindow(settingsWin);
    }
}

// --- IPC ---
ipcMain.on('open-settings', () => {
    toggleSettingsWindow();
});

ipcMain.on('change-main-color', (event, color) => {
    if (win) {
        win.webContents.send('update-color', color);
    }
    config.mainColor = color;
    saveConfig(config);
});

ipcMain.on('change-theme', (event, theme) => {
    if (!win) return;
    config.theme = theme;
    saveConfig(config);

    const icons = {
        dark: {
            Power: './ico/power/power-dark.png',
            Restart: './ico/restart/restart-dark.png',
            Sleep: './ico/sleep/sleep-dark.png'
        },
        light: {
            Power: './ico/power/power-light.png',
            Restart: './ico/restart/restart-light.png',
            Sleep: './ico/sleep/sleep-light.png'
        }
    };

    win.webContents.send('update-theme', theme, icons[theme]);
});

// --- Обработчики действий ---
ipcMain.on('perform-action', (event, action) => {
    let command;
    switch (action) {
        case 'shutdown':
            command = 'shutdown /s /t 0'; // Выключение сразу
            break;
        case 'restart':
            command = 'shutdown /r /t 0'; // Перезагрузка сразу
            break;
        case 'sleep':
            command = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0'; // Сон
            break;
        default:
            console.error('Unknown action:', action);
            return;
    }
    exec(command, (error) => {
        if (error) console.error('Action failed:', error);
    });
});

// --- App ready ---
app.whenReady().then(() => {
    createWindow();
    createTray();
    globalShortcut.register('Control+F12', toggleMainWindow);

    // Автозагрузка в Windows
    app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath
    });
});

// --- Cleanup ---
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});