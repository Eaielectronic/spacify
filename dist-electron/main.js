"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    electron_1.app.quit();
}
let mainWindow = null;
const createWindow = () => {
    // Create the browser window.
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        icon: path_1.default.join(__dirname, '../src/icone/Gemini_Generated_Image_skr8laskr8laskr8-Photoroom.icns'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false, // For local file search/download
        },
        frame: true,
        titleBarStyle: 'default',
        backgroundColor: '#121212',
    });
    // ROBUST DEV MODE CHECK
    const isEnvDev = process.env.NODE_ENV === 'development';
    const isNotPackaged = !electron_1.app.isPackaged;
    const distExists = fs_1.default.existsSync(path_1.default.join(__dirname, '../dist/index.html'));
    // Rule: If explicit dev env, OR not packaged, OR dist doesn't exist -> DEV MODE
    const isDev = isEnvDev || isNotPackaged || !distExists;
    console.log("--- ELECTRON STARTUP ---");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("isPackaged:", electron_1.app.isPackaged);
    console.log("distExists:", distExists);
    console.log("DECISION isDev:", isDev);
    if (isDev) {
        console.log("Loading Development URL...");
        // Introduce a small delay or retry to ensure Vite is ready if wait-on missed it
        mainWindow.loadURL('http://localhost:5175').catch(e => {
            console.error("Failed to load localhost, retrying in 1s...", e);
            setTimeout(() => {
                mainWindow?.loadURL('http://localhost:5175');
            }, 1000);
        });
        mainWindow.webContents.openDevTools();
    }
    else {
        console.log("Loading Production File...");
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
};
electron_1.app.whenReady().then(() => {
    // Register IPC Handlers FIRST
    // Setup download directory
    const downloadPath = path_1.default.join(electron_1.app.getPath('userData'), 'downloads');
    if (!fs_1.default.existsSync(downloadPath)) {
        fs_1.default.mkdirSync(downloadPath, { recursive: true });
    }
    // API: Get Local Songs
    electron_1.ipcMain.handle('get-local-songs', async () => {
        try {
            if (!fs_1.default.existsSync(downloadPath))
                return [];
            const files = fs_1.default.readdirSync(downloadPath);
            const songs = files.filter(file => file.endsWith('.mp3')).map(file => {
                return {
                    name: file,
                    path: path_1.default.join(downloadPath, file),
                    url: `file://${path_1.default.join(downloadPath, file)}`
                };
            });
            return songs;
        }
        catch (e) {
            console.error('Error reading local songs', e);
            return [];
        }
    });
    // API: Download Image
    electron_1.ipcMain.handle('download-image', async (event, { url, filename }) => {
        return new Promise((resolve, reject) => {
            const filePath = path_1.default.join(downloadPath, filename);
            if (fs_1.default.existsSync(filePath)) {
                resolve(filePath);
                return;
            }
            const file = fs_1.default.createWriteStream(filePath);
            https_1.default.get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(filePath);
                });
            }).on('error', (err) => {
                fs_1.default.unlink(filePath, () => { });
                reject(err);
            });
        });
    });
    // API: Download Song (Updated to accept potential image download)
    electron_1.ipcMain.handle('download-song', async (event, { url, filename }) => {
        return new Promise((resolve, reject) => {
            const filePath = path_1.default.join(downloadPath, filename);
            if (fs_1.default.existsSync(filePath)) {
                console.log('File already exists:', filePath);
                resolve(filePath);
                return;
            }
            const file = fs_1.default.createWriteStream(filePath);
            https_1.default.get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log('Download finished:', filePath);
                    resolve(filePath);
                });
            }).on('error', (err) => {
                fs_1.default.unlink(filePath, () => { });
                console.error('Download error:', err);
                reject(err);
            });
        });
    });
    // API: Delete File
    electron_1.ipcMain.handle('delete-file', async (event, filePath) => {
        if (!filePath)
            return false;
        return new Promise((resolve) => {
            fs_1.default.unlink(filePath, (err) => {
                if (err) {
                    console.error("Failed to delete file:", filePath, err);
                    resolve(false);
                }
                else {
                    console.log("Deleted file:", filePath);
                    resolve(true);
                }
            });
        });
    });
    // API: Rename File
    electron_1.ipcMain.handle('rename-file', async (event, { oldPath, newPath }) => {
        if (!oldPath || !newPath)
            return false;
        return new Promise((resolve) => {
            fs_1.default.rename(oldPath, newPath, (err) => {
                if (err) {
                    console.error("Failed to rename file:", oldPath, "to", newPath, err);
                    resolve(false);
                }
                else {
                    console.log("Renamed file:", oldPath, "to", newPath);
                    resolve(true);
                }
            });
        });
    });
    // API: Select File (Add from PC) - CORRECTLY REGISTERED HERE
    electron_1.ipcMain.handle('select-file', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg'] }]
        });
        if (result.canceled)
            return null;
        return result.filePaths;
    });
    createWindow();
    // Prevent window from closing, hide it instead for background play
    if (mainWindow) {
        mainWindow.on('close', (event) => {
            if (!isQuitting && !process.env.IS_TEST) {
                event.preventDefault();
                mainWindow?.hide();
                return false;
            }
        });
    }
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
        else {
            mainWindow?.show();
        }
    });
});
let isQuitting = false;
electron_1.app.on('before-quit', () => {
    isQuitting = true;
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
