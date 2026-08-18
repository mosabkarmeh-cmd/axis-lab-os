const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('axisDesktop', {
  platform: process.platform,
  isDesktop: true,
  version: '0.13.20',
});
