const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Areti - AI Agent",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.setMenuBarVisibility(false);

  // Possible paths for index.html
  const candidates = [
    path.join(__dirname, "dist", "index.html"),
    path.join(process.resourcesPath || "", "app.asar", "dist", "index.html"),
    path.join(process.resourcesPath || "", "app", "dist", "index.html"),
  ];

  let loaded = false;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      win.loadFile(p);
      loaded = true;
      break;
    }
  }

  if (!loaded) {
    // Fallback: show helpful instructions
    win.loadURL(`data:text/html,${encodeURIComponent(`<!DOCTYPE html>
<html>
<head><title>Areti</title></head>
<body style="background:#0a0a0a;color:#fafafa;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
<div>
<h1 style="color:#3b82f6;font-size:2rem;margin-bottom:1rem;">Areti AI Agent</h1>
<p style="color:#94a3b8;margin-bottom:1.5rem;">The web files need to be built first.</p>
<p style="color:#64748b;font-size:0.85rem;">Open a terminal in this folder and run:<br><br>
<code style="background:#1e293b;padding:0.4rem 0.8rem;border-radius:6px;color:#38bdf8;">npm install</code><br><br>
<code style="background:#1e293b;padding:0.4rem 0.8rem;border-radius:6px;color:#38bdf8;">npm run build</code><br><br>
Then restart this app.</p>
</div>
</body>
</html>`)}`);
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
