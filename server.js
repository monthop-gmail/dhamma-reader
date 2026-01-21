import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, 'cache');
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
}

const getCachePath = (url) => {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return path.join(CACHE_DIR, `${hash}.html`);
};

const app = express();
const PORT = process.env.PORT || 80;

app.use(cors());

// Proxy endpoint
app.get('/api/fetch', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL is required');
    }

    const hash = crypto.createHash('md5').update(targetUrl).digest('hex');
    const ext = path.extname(new URL(targetUrl).pathname) || '.html';
    const cachePath = path.join(CACHE_DIR, `${hash}${ext}`);

    // Check disk cache
    try {
        if (existsSync(cachePath)) {
            const stats = await fs.stat(cachePath);
            if (Date.now() - stats.mtimeMs < CACHE_TTL) {
                console.log(`Serving from disk cache: ${targetUrl}`);
                const data = await fs.readFile(cachePath);

                // Set content type based on extension
                if (ext === '.woff' || ext === '.woff2') res.setHeader('Content-Type', 'font/woff2');
                else if (ext === '.ttf') res.setHeader('Content-Type', 'font/ttf');
                else if (ext === '.eot') res.setHeader('Content-Type', 'application/vnd.ms-fontobject');
                else res.setHeader('Content-Type', 'text/html; charset=utf-8');

                return res.send(data);
            }
            await fs.unlink(cachePath); // Expired
        }
    } catch (e) {
        console.error('Cache read error:', e);
    }

    try {
        console.log(`Fetching from remote: ${targetUrl}`);
        const response = await fetch(targetUrl, {
            headers: {
                'authority': 'writer.dek-d.com',
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
                'cache-control': 'max-age=0',
                'referer': 'https://writer.dek-d.com/',
                'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        const contentType = response.headers.get('content-type');
        const buffer = await response.buffer();

        // Detect if we got a challenge page
        const bodyContent = buffer.toString().toLowerCase();
        if (bodyContent.includes('human verification') || bodyContent.includes('cloudflare') || bodyContent.includes('ddos-guard')) {
            console.warn(`Blocked by anti-bot challenge: ${targetUrl}`);
        }

        // Store in disk cache
        try {
            await fs.writeFile(cachePath, buffer);
        } catch (e) {
            console.error('Cache write error:', e);
        }

        if (contentType) res.setHeader('Content-Type', contentType);
        res.send(buffer);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send('Error fetching content');
    }
});

// Serve static files from the Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
