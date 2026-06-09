#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const port = process.env.SMOKE_PORT || '3123';
const base = `http://127.0.0.1:${port}`;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function waitForHealth() {
  let lastErr;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return r.json();
    } catch (err) { lastErr = err; }
    await sleep(500);
  }
  throw lastErr || new Error('health timeout');
}

async function main() {
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: port,
      NODE_ENV: 'development',
      SESSION_SECRET: 'local-smoke-session-secret',
      OWNER_USERNAME: 'darknet',
      OWNER_PASSWORD: 'local-smoke-password',
      MONGODB_URI: '',
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
      GROQ_API_KEY: '',
      GEMINI_API_KEY: '',
      APP_URL: base,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', d => { output += d.toString(); });
  child.stderr.on('data', d => { output += d.toString(); });

  try {
    const health = await waitForHealth();
    if (health.status !== 'ok') throw new Error('health.status != ok');

    const login = await fetch(`${base}/login`);
    const loginText = await login.text();
    if (login.status !== 200 || !loginText.includes('name="username"')) {
      throw new Error('GET /login não renderizou o formulário');
    }

    const dash = await fetch(`${base}/dashboard`, { redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(dash.status) || !String(dash.headers.get('location') || '').includes('/login')) {
      throw new Error('GET /dashboard deveria redirecionar para /login sem sessão');
    }

    const body = new URLSearchParams({ username: 'darknet', password: 'wrong' });
    const post = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const postText = await post.text();
    if (post.status !== 200 || !postText.includes('Base de dados indisponível')) {
      throw new Error('POST /login sem Mongo deveria falhar de forma amigável');
    }

    console.log('✅ Smoke OK: health, login, sessão protegida e erro amigável de Mongo');
  } catch (err) {
    console.error('❌ Smoke failed:', err.message);
    console.error(output.slice(-4000));
    process.exitCode = 1;
  } finally {
    child.kill('SIGTERM');
    await sleep(500);
    if (!child.killed) child.kill('SIGKILL');
  }
}

main().catch(err => {
  console.error('❌ Smoke crashed:', err);
  process.exit(1);
});
