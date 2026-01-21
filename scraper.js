import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PLAYLIST } from './src/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTENT_DIR = path.join(__dirname, 'public', 'content');

async function scrape() {
    console.log('🚀 Starting Dhamma Reader Scraper...');

    // Ensure content directory exists
    try {
        await fs.mkdir(CONTENT_DIR, { recursive: true });
    } catch (e) { }

    for (const item of PLAYLIST) {
        const filePath = path.join(CONTENT_DIR, `${item.order}.json`);

        // Skip if already exists (optional, but good for speed)
        try {
            await fs.access(filePath);
            console.log(`- Skipping ${item.title} (Already exists)`);
            continue;
        } catch (e) { }

        console.log(`- Fetching ${item.title}...`);

        try {
            const response = await fetch(item.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                    'Referer': 'https://writer.dek-d.com/'
                }
            });
            const html = await response.text();

            // Basic parsing to check if we got content or bot challenge
            if (html.toLowerCase().includes('human verification') || html.toLowerCase().includes('cloudflare')) {
                console.error(`❌ Blocked by Cloudflare for: ${item.title}. Try again in a few minutes.`);
                continue;
            }

            // Save the raw HTML to JSON (so we can keep meta if needed)
            await fs.writeFile(filePath, JSON.stringify({
                order: item.order,
                title: item.title,
                html: html,
                scrapedAt: new Date().toISOString()
            }, null, 2));

            // Random delay to avoid being blocked
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

        } catch (error) {
            console.error(`❌ Error fetching ${item.title}:`, error.message);
        }
    }

    console.log('\n✅ Scraping complete! You can now push your code to GitHub.');
}

scrape();
