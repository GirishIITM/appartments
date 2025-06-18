const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// In-memory storage for scraper status and config
let scrapingProcess = null;
let scrapingStatus = 'Ready';
let currentConfig = {
    data: {
        baseUrl: 'https://www.apartments.com/',
        endpoints: {
            apartments: '/avon-ct/'
        },
        maxRetries: 3
    }
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Config endpoints
app.get('/api/config', (req, res) => {
    res.json(currentConfig);
});

app.post('/api/config', (req, res) => {
    try {
        currentConfig = req.body;
        // Optionally save to file
        fs.writeFileSync('admin-config.json', JSON.stringify(currentConfig, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// Scraper endpoints
app.post('/api/scraper/run', (req, res) => {
    try {
        if (scrapingProcess && !scrapingProcess.killed) {
            return res.json({ success: false, message: 'Scraper is already running' });
        }

        scrapingStatus = 'Starting';
        scrapingProcess = spawn('node', ['scrap.js'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });

        scrapingProcess.stdout.on('data', (data) => {
            console.log(`Scraper output: ${data}`);
        });

        scrapingProcess.stderr.on('data', (data) => {
            console.error(`Scraper error: ${data}`);
        });

        scrapingProcess.on('close', (code) => {
            console.log(`Scraper process exited with code ${code}`);
            scrapingStatus = code === 0 ? 'Completed' : 'Failed';
            scrapingProcess = null;
        });

        scrapingStatus = 'Running';
        res.json({ success: true, message: 'Scraper started' });
    } catch (error) {
        scrapingStatus = 'Error';
        res.json({ success: false, message: error.message });
    }
});

app.get('/api/scraper/status', (req, res) => {
    res.json({ status: scrapingStatus });
});

// Cron job endpoints
app.post('/api/cron/set', async (req, res) => {
    try {
        const { cronExpression } = req.body;
        
        if (!cronExpression) {
            return res.json({ success: false, message: 'Cron expression is required' });
        }

        // Validate cron expression (basic validation)
        const cronParts = cronExpression.split(' ');
        if (cronParts.length !== 5) {
            return res.json({ success: false, message: 'Invalid cron expression format' });
        }

        const scriptPath = path.join(__dirname, 'scrap.js');
        const cronCommand = `${cronExpression} cd ${__dirname} && node ${scriptPath}`;
        
        // Remove existing cron job first
        await execAsync('crontab -l | grep -v "scrap.js" | crontab -').catch(() => {});
        
        // Add new cron job
        const { stdout } = await execAsync('crontab -l').catch(() => ({ stdout: '' }));
        const newCrontab = stdout + `${cronCommand}\n`;
        
        await execAsync(`echo "${newCrontab}" | crontab -`);
        
        res.json({ success: true, message: 'Cron job set successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/cron/remove', async (req, res) => {
    try {
        await execAsync('crontab -l | grep -v "scrap.js" | crontab -');
        res.json({ success: true, message: 'Cron job removed successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.get('/api/cron/status', async (req, res) => {
    try {
        const { stdout } = await execAsync('crontab -l').catch(() => ({ stdout: '' }));
        const cronLines = stdout.split('\n').filter(line => line.includes('scrap.js'));
        
        if (cronLines.length > 0) {
            const cronExpression = cronLines[0].split(' ').slice(0, 5).join(' ');
            res.json({ 
                status: 'Active', 
                cronExpression,
                fullCommand: cronLines[0]
            });
        } else {
            res.json({ status: 'Not set' });
        }
    } catch (error) {
        res.json({ status: 'Error', message: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Admin server running on http://localhost:${PORT}`);
    console.log('Open your browser and navigate to the admin panel');
});
