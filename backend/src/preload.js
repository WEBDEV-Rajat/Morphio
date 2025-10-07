import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  convertFile: (data) => ipcRenderer.send('convert-file', data),
  onConversionProgress: (callback) => ipcRenderer.on('conversion-progress', (event, data) => callback(data))
});