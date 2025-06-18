const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { exec } = require("child_process");

// Load configuration
let config = {};
function loadConfig() {
  try {
    const configData = fs.readFileSync("config.json", "utf8");
    config = JSON.parse(configData);
  } catch (error) {
    console.error("Error loading config:", error);
    // Default config
    config = {
      server: { port: 3000, host: "localhost" },
      data: { baseUrl: "https://api.apartments.com" },
      app: { title: "Apartment Listings" },
    };
  }
}

// Save configuration
function saveConfig(newConfig) {
  try {
    fs.writeFileSync("config.json", JSON.stringify(newConfig, null, 2));
    config = newConfig;
    return true;
  } catch (error) {
    console.error("Error saving config:", error);
    return false;
  }
}

// Get MIME type
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

// Serve static files
function serveStaticFile(res, filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const mimeType = getMimeType(filePath);
      res.writeHead(200, { "Content-Type": mimeType });
      res.end(content);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server error");
  }
}

// Utility: tail last N lines from a file
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

// Create server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Routes
  switch (pathname) {
    case "/":
      serveStaticFile(res, "index.html");
      break;

    case "/admin":
    case "/admin.html":
      serveStaticFile(res, "admin.html");
      break;

    case "/api/config":
      if (method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(config, null, 2));
      } else if (method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const newConfig = JSON.parse(body);
            if (saveConfig(newConfig)) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  success: true,
                  message: "Configuration updated successfully",
                })
              );
            } else {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  success: false,
                  message: "Failed to save configuration",
                })
              );
            }
          } catch (error) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ success: false, message: "Invalid JSON data" })
            );
          }
        });
      }
      break;

    case "/api/restart":
      if (method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ success: true, message: "Server will restart..." })
        );
        setTimeout(() => {
          process.exit(0); // In production, use a process manager like PM2
        }, 1000);
      }
      break;

    case "/api/scraper/run":
      if (method === "POST") {
        // Run scrap.js and append output to scrap.log
        const child = exec("node scrap.js", (error, stdout, stderr) => {
          // Output is handled by streams below
        });

        // Pipe stdout and stderr to scrap.log
        const logStream = fs.createWriteStream(SCRAPER_LOG_FILE, { flags: "a" });
        child.stdout.pipe(logStream);
        child.stderr.pipe(logStream);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: "Scraper started successfully",
          })
        );
      }
      break;

    case "/api/scraper/logs":
      if (method === "GET") {
        // Return last 100 lines of scrap.log
        const logs = tailFile(SCRAPER_LOG_FILE, 100);
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(logs);
      }
      break;

    default:
      const filePath = pathname.slice(1) || "index.html";
      serveStaticFile(res, filePath);
  }
});

// Load config and start server
loadConfig();
const port = config.server?.port || 3000;
const host = config.server?.host || "localhost";

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
  console.log(`Admin panel: http://${host}:${port}/admin`);
});
