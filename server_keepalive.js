'use strict';
const path = require('path');
const fs   = require('fs');
const https = require('https');
const LOG  = '/home/u492425110/domains/barmagly.tech/pos-nodejs/startup.log';
const ERR_LOG = '/home/u492425110/domains/barmagly.tech/pos-nodejs/error.log';

function log(msg) {
  fs.appendFileSync(LOG, new Date().toISOString() + ' ' + msg + '\n');
  console.log(msg);
}

process.on('uncaughtException', (err) => {
  fs.appendFileSync(ERR_LOG, new Date().toISOString() + '\n' + err.stack + '\n');
  process.exit(1);
});

// ── Load .env ──────────────────────────────────────────────────────────
const envFile = '/home/u492425110/pos-app/.env';
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const idx = t.indexOf('=');
    const key = t.substring(0, idx).trim();
    const val = t.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
  log('Loaded .env OK');
} else {
  log('WARNING: .env not found at ' + envFile);
}

log('PORT=' + process.env.PORT);
log('DB set=' + !!process.env.DATABASE_URL);

// ── Set working dir so require() finds node_modules ───────────────────
process.chdir('/home/u492425110/pos-app');
log('cwd=' + process.cwd());

// ── Start server ──────────────────────────────────────────────────────
log('Loading server_dist/index.js...');
require('/home/u492425110/pos-app/server_dist/index.js');
log('server_dist loaded');

// ── Self-ping keepalive (every 4 minutes) ─────────────────────────────
// Prevents Passenger from killing the idle worker — no cron job needed
function selfPing() {
  const req = https.request({
    hostname: 'pos.barmagly.tech',
    path: '/api/health',
    method: 'GET',
    rejectUnauthorized: false,
    timeout: 10000
  }, (res) => {
    log('keepalive -> ' + res.statusCode);
    res.resume();
  });
  req.on('error', (e) => {
    log('keepalive error: ' + e.message);
  });
  req.end();
}

// First ping after 30s, then every 4 minutes
setTimeout(function startKeepalive() {
  selfPing();
  setInterval(selfPing, 4 * 60 * 1000);
}, 30 * 1000);

log('Self-ping keepalive scheduled (every 4 min)');
