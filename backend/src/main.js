import { fileURLToPath } from 'url';
import path from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load your Vite frontend
  win.loadURL('http://localhost:5173');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
  
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


ipcMain.on('convert-file', (event, { filePath, outputType }) => {
  console.log(`Received for conversion: ${filePath} → ${outputType}`);

  const output = filePath.replace(/\.[^/.]+$/, '') + '.' + outputType;

  event.reply('conversion-progress', { status: 'done', output });
});
