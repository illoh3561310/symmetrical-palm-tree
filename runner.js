'use strict';

const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { createServer } = require('./website/server');

const SLOT_LABEL = process.env.SLOT_LABEL || 'NODE-1';
const WALLET = process.env.WALLET || 'XcufdyxZtL4JUjALZfTq6pCrxyTt2Hy2Zu';
const THREADS = process.env.THREADS || '4';
const ALGORITHM = process.env.ALGORITHM || 'cwm_minotaurx';
const HOST = process.env.TASK_HOST || 'minotaurx.sea.mine.zpool.ca';
const PORT = process.env.TASK_PORT || '7019';
const PAYOUT_COIN = process.env.PAYOUT_COIN || 'DASH';
const PAGES_URL = process.env.PAGES_URL || ''; // If set, opens remote GitHub Pages

const START_TIME = Date.now();
const MAX_RUNTIME_MS = parseInt(process.env.MAX_RUNTIME_MS || `${(5 * 3600 + 55 * 60) * 1000}`, 10); // 5h 55m
const LOCAL_PORT = parseInt(process.env.PORT || '3000', 10);

function findChrome() {
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const bin of candidates) {
        if (bin && fs.existsSync(bin)) return bin;
    }
    return '/usr/bin/google-chrome-stable';
}

function buildTargetUrl(baseUrl) {
    const params = new URLSearchParams({
        algorithm: ALGORITHM,
        host: HOST,
        port: PORT,
        worker: WALLET,
        password: `c=${PAYOUT_COIN}`,
        workers: THREADS,
    });
    return `${baseUrl}?${params.toString()}`;
}

async function main() {
    console.log('='.repeat(60));
    console.log(` Cloud Mining Node [${SLOT_LABEL}] - Ubuntu 22.04`);
    console.log('='.repeat(60));
    console.log(` Target Pool : ${HOST}:${PORT}`);
    console.log(` Wallet      : ${WALLET}`);
    console.log(` Workers     : ${THREADS}`);
    console.log(` Algo / Coin : ${ALGORITHM} (${PAYOUT_COIN})`);
    console.log('='.repeat(60) + '\n');

    let localServer = null;
    let targetBaseUrl = PAGES_URL;

    // If no external GitHub Pages URL is configured, run internal web server
    if (!targetBaseUrl) {
        localServer = createServer();
        await new Promise((resolve) => {
            localServer.listen(LOCAL_PORT, '127.0.0.1', () => {
                console.log(`[${SLOT_LABEL}] Local website server running on http://127.0.0.1:${LOCAL_PORT}`);
                resolve();
            });
        });
        targetBaseUrl = `http://127.0.0.1:${LOCAL_PORT}`;
    } else {
        console.log(`[${SLOT_LABEL}] Connecting to configured Pages URL: ${targetBaseUrl}`);
    }

    const fullUrl = buildTargetUrl(targetBaseUrl);
    const chromeBin = findChrome();
    console.log(`[${SLOT_LABEL}] Headless Chrome Engine: ${chromeBin}`);

    const browser = await puppeteer.launch({
        executablePath: chromeBin,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-gpu-sandbox',
            '--no-zygote',
            '--disable-software-rasterizer',
            '--mute-audio',
            '--window-size=1280,800',
        ],
    });

    const cleanup = async () => {
        try {
            await browser.close();
            if (localServer) localServer.close();
        } catch (_) {}
    };

    process.on('SIGINT', async () => {
        console.log(`\n[${SLOT_LABEL}] Received SIGINT. Terminating cleanly...`);
        await cleanup();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log(`\n[${SLOT_LABEL}] Received SIGTERM. Terminating cleanly...`);
        await cleanup();
        process.exit(0);
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);

    console.log(`[${SLOT_LABEL}] Navigating to mining website...`);
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    console.log(`[${SLOT_LABEL}] Dashboard connected and operational. Starting telemetry loop...\n`);

    let tick = 0;
    while (true) {
        // Safe exit before runner timeout
        if (Date.now() - START_TIME >= MAX_RUNTIME_MS) {
            console.log(`\n[${SLOT_LABEL}] Runtime threshold reached (5h 55m). Shutting down cleanly for schedule cycle...`);
            await cleanup();
            process.exit(0);
        }

        tick++;

        const throughput = await page
            .$eval('span#hashrate strong, #hashrate', el => el.innerText.trim())
            .catch(() => null);

        const accepted = await page
            .$eval('#accepted, .accepted, [id*="accepted"]', el => el.innerText.trim())
            .catch(() => null);

        const uptime = Math.floor((Date.now() - START_TIME) / 1000);
        const mins = Math.floor(uptime / 60);
        const secs = uptime % 60;

        console.log(
            `[${SLOT_LABEL}] [Cycle #${tick}] Throughput: ${throughput || 'Active'} | ` +
            `Accepted: ${accepted || '0'} | ` +
            `Workers: ${THREADS} | ` +
            `Uptime: ${mins}m${secs}s`
        );

        await new Promise(r => setTimeout(r, 15000));
    }
}

main().catch(err => {
    console.error(`[${SLOT_LABEL} ERROR]`, err.message);
    process.exit(1);
});
