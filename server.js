const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

let config = {};
function loadConfig() {
  try {
    const configData = fs.readFileSync("config.json", "utf8");
    config = JSON.parse(configData);
  } catch (error) {
    config = {
      server: { port: 3000, host: "localhost" },
      data: { baseUrl: "https://api.apartments.com" },
      app: { title: "Apartment Listings" },
    };
  }
}
function saveConfig(newConfig) {
  try {
    fs.writeFileSync("config.json", JSON.stringify(newConfig, null, 2));
    config = newConfig;
    return true;
  } catch (error) {
    return false;
  }
}
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };
  return mimeTypes[ext] || "text/plain";
}
const SCRAPER_LOG_FILE = "scrap.log";
function tailFile(filePath, lines = 100) {
  try {
    if (!fs.existsSync(filePath)) return "";
    const data = fs.readFileSync(filePath, "utf8");
    const arr = data.split("\n");
    return arr.slice(-lines).join("\n");
  } catch (e) {
    return "";
  }
}

loadConfig();
const port = config.server?.port || 3000;
const host = config.server?.host || "localhost";
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.get("/", (req, res) => {
  const filePath = "index.html";
  if (fs.existsSync(filePath)) {
    res.type(getMimeType(filePath)).send(fs.readFileSync(filePath));
  } else {
    res.status(404).send("File not found");
  }
});
app.get(["/admin", "/admin.html"], (req, res) => {
  const filePath = "admin.html";
  if (fs.existsSync(filePath)) {
    res.type(getMimeType(filePath)).send(fs.readFileSync(filePath));
  } else {
    res.status(404).send("File not found");
  }
});
app.get("/api/config", (req, res) => {
  res.type("application/json").send(JSON.stringify(config, null, 2));
});
app.post("/api/config", (req, res) => {
  try {
    const newConfig = req.body;
    if (saveConfig(newConfig)) {
      res.json({ success: true, message: "Configuration updated successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to save configuration" });
    }
  } catch {
    res.status(400).json({ success: false, message: "Invalid JSON data" });
  }
});
app.post("/api/restart", (req, res) => {
  res.json({ success: true, message: "Server will restart..." });
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});
app.post("/api/scraper/run", (req, res) => {
  const child = exec("node scrap.js");
  const logStream = fs.createWriteStream(SCRAPER_LOG_FILE, { flags: "a" });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  res.json({ success: true, message: "Scraper started successfully" });
});
app.get("/api/scraper/logs", (req, res) => {
  const logs = tailFile(SCRAPER_LOG_FILE, 100);
  res.type("text/plain").send(logs);
});
app.use(express.static(process.cwd()));
app.use((req, res) => {
  const filePath = req.path.slice(1) || "index.html";
  if (fs.existsSync(filePath)) {
    res.type(getMimeType(filePath)).send(fs.readFileSync(filePath));
  } else {
    res.status(404).send("File not found");
  }
});

app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
  console.log(`Admin panel: http://${host}:${port}/admin`);
});