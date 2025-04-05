const { app, BrowserWindow } = require("electron");
const path = require("path");
const express = require("express");

let mainWindow;

function createWindow() {
  // Starte kleinen lokalen Webserver
  const server = express();
  const frontendPath = path.join(__dirname, "frontend", "out");
  server.use(express.static(frontendPath));

  const PORT = 3000;
  server.listen(PORT, () => {
    console.log(`Express-Server läuft auf http://localhost:${PORT}`);

    // Electron-Fenster öffnen
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    mainWindow.loadURL(`http://localhost:${PORT}`);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
