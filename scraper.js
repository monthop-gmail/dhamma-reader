import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { PLAYLIST } from './src/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTENT_DIR = path.join(__dirname, 'public', 'content');
const CACHE_DIR = path.join(__dirname, 'cache');

async function scrape() {
    console.log('🚀 Starting Dhamma Reader Scraper...');
    console.log('💡 Tip: This script will automatically use your existing cache to save time.');

    // Ensure content directory exists
    try {
        await fs.mkdir(CONTENT_DIR, { recursive: true });
    } catch (e) { }

    for (const item of PLAYLIST) {
        const filePath = path.join(CONTENT_DIR, `${item.order}.json`);

        // Skip if already exists in public/content
        if (existsSync(filePath)) {
            // console.log(`- Skipping ${item.title} (Already exists in content)`);
            continue;
        }

        // Try to find in cache first
        const hash = crypto.createHash('md5').update(item.url).digest('hex');
        const cachePath = path.join(CACHE_DIR, `${hash}.php`); // server.js saves as .php for articles
        const cachePathAlt = path.join(CACHE_DIR, `${hash}.html`);

        let html = '';
        let source = '';

        if (existsSync(cachePath)) {
            html = await fs.readFile(cachePath, 'utf8');
            source = 'Cache';
        } else if (existsSync(cachePathAlt)) {
            html = await fs.readFile(cachePathAlt, 'utf8');
            source = 'Cache';
        }

        if (html) {
            console.log(`- Converting ${item.title} from ${source}...`);
        } else {
            console.log(`- Fetching ${item.title} from Remote...`);
            try {
                const response = await fetch(item.url, {
                    headers: {
                        'authority': 'writer.dek-d.com',
                        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'accept-language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
                        'cache-control': 'no-cache',
                        'pragma': 'no-cache',
                        'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                        'sec-fetch-dest': 'document',
                        'sec-fetch-mode': 'navigate',
                        'sec-fetch-site': 'none',
                        'sec-fetch-user': '?1',
                        'upgrade-insecure-requests': '1',
                        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
                    }
                });
                html = await response.text();

                const lowerHtml = html.toLowerCase();
                if (lowerHtml.includes('human verification') || lowerHtml.includes('cloudflare') || lowerHtml.includes('<title>just a moment...</title>')) {
                    console.error(`  ❌ Blocked by Cloudflare for: ${item.title}.`);
                    continue; // Skip and try next
                }

                // Random delay between remote fetches
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
            } catch (error) {
                console.error(`  ❌ Error fetching ${item.title}:`, error.message);
                continue;
            }
        }

        if (html) {
            await fs.writeFile(filePath, JSON.stringify({
                order: item.order,
                title: item.title,
                html: html,
                scrapedAt: new Date().toISOString()
            }, null, 2));
        }
    }

    console.log('\n✅ Content generation complete!');
    console.log('👉 Next Steps: git add . && git commit -m "Upload content" && git push');
}

scrape();
