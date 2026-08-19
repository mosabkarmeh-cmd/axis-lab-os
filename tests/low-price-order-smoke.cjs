const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const port = 3321;
const dbFile = path.join('/tmp', `axis-low-price-${process.pid}.sqlite`);
try { fs.unlinkSync(dbFile); } catch {}

const server = spawn(process.execPath, ['dist/server.cjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    DB_MODE: 'sqlite',
    AXIS_DATA_FILE: dbFile,
    PORT: String(port),
    SERVER_HOST: '127.0.0.1',
    ALLOW_PUBLIC_REGISTRATION: 'true',
    BOOTSTRAP_ADMIN_PASSWORD: '12345',
    JWT_SECRET: 'low-price-smoke-secret-01234567890123456789'
  },
  stdio: 'ignore'
});

const base = `http://127.0.0.1:${port}`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let cookie = '';

async function request(pathname, options = {}) {
  const response = await fetch(base + pathname, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) }
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${pathname} HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

(async () => {
  try {
    let healthy = false;
    for (let i = 0; i < 60; i += 1) {
      try {
        const health = await request('/api/health');
        if (health.status === 'ok') { healthy = true; break; }
      } catch {}
      await wait(250);
    }
    if (!healthy) throw new Error('server did not become healthy');

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@axislab.com', password: '12345' })
    });
    if (!login.token) throw new Error('test login did not return a token');
    await request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: '12345', newPassword: '12345678' })
    });

    const customers = await request('/api/customers');
    const customerId = customers?.[0]?.id || 'cust-1';
    const prices = [1, 50, 100];
    for (const price of prices) {
      const order = await request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          items: [{ productName: `اختبار سعر منخفض ${price}`, quantity: 1, unitPrice: price }],
          totalPrice: price,
          paidAmount: 0,
          taxPercent: 0,
          discount: 0,
          createdById: 'u-1'
        })
      });
      if (order.items?.[0]?.unitPrice !== price || order.items?.[0]?.totalPrice !== price || order.totalPrice !== price) {
        throw new Error(`price ${price} was not preserved: ${JSON.stringify(order)}`);
      }
    }
    console.log(JSON.stringify({ status: 'PASS', prices, message: 'low prices preserved in order items and totals' }));
  } finally {
    server.kill();
    try { fs.unlinkSync(dbFile); } catch {}
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

process.on('SIGINT', () => server.kill());
process.on('SIGTERM', () => server.kill());
