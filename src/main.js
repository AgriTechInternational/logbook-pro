const { app, BrowserWindow, shell, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

// ─── AUTO UPDATER ─────────────────────────────────────────────────────────────
autoUpdater.checkForUpdatesAndNotify();

// ─── WINDOW ───────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "AgriTech Logbook",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: "#020617",
    vibrancy: null,
  });

  // Load the local React app bundle
  win.loadFile(path.join(__dirname, "dist", "index.html"));

  // Force dark background immediately before content loads
  win.webContents.on("did-start-loading", () => {
    win.setBackgroundColor("#020617");
  });

  // Open external links in system browser, not in the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Custom menu
  const menu = Menu.buildFromTemplate([
    {
      label: "AgriTech",
      submenu: [
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => win.reload() },
        { label: "Toggle Fullscreen", accelerator: "F11", click: () => win.setFullScreen(!win.isFullScreen()) },
        { type: "separator" },
        { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Zoom In",  accelerator: "CmdOrCtrl+=", click: () => win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5) },
        { label: "Zoom Out", accelerator: "CmdOrCtrl+-", click: () => win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5) },
        { label: "Reset Zoom", accelerator: "CmdOrCtrl+0", click: () => win.webContents.setZoomLevel(0) },
        { type: "separator" },
        { label: "Dev Tools", accelerator: "CmdOrCtrl+Shift+I", click: () => win.webContents.openDevTools() },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  // Force dark mode at OS level
  if (process.platform === "darwin") {
    app.dock?.setIcon(path.join(__dirname, "public", "pwa-192x192.png"));
  }
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
