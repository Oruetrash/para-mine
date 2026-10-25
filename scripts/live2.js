const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=420,900'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewport({ width: 420, height: 900 });
  await page.goto('https://oliverorue.github.io/para-mine/', { waitUntil: 'networkidle2', timeout: 40000 });

  const loginVisible = await page.$('#login-screen:not(.hidden)');
  console.log('Login visible:', !!loginVisible);

  await page.type('#password-input', '211623');
  await page.click('#login-btn');
  await page.waitForFunction(() => !document.querySelector('#app').classList.contains('hidden'), { timeout: 20000 });
  console.log('Login OK');

  const dias = await page.$eval('#cd-dias', (el) => el.textContent);
  console.log('Countdown días:', dias);

  await page.click('.nav-btn[data-view="album"]');
  await page.waitForFunction(() => document.querySelectorAll('#album .month-card').length > 0, { timeout: 40000 });
  console.log('Álbum meses:', await page.$eval('#album', (el) => el.querySelectorAll('.month-card').length));

  await page.click('.nav-btn[data-view="hoy"]');
  await new Promise((r) => setTimeout(r, 800));
  console.log('Hoy card:', !!(await page.$('#hoy .hoy-card')));

  await page.click('.nav-btn[data-view="cofre"]');
  console.log('Cofre bloqueado:', await page.$eval('#cofre', (el) => el.textContent.includes('se abre')));

  console.log('ERRORES:', errors.length ? errors : 'ninguno');
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
