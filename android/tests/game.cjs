// Run with Node.js, Playwright, and Chromium installed. No app server needed.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox']
  });
  try {
    const source = process.env.GAME_HTML || path.resolve(__dirname, '../app/src/main/assets/index.html');
    const html = fs.readFileSync(source, 'utf8');
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://localhost/game', route => route.fulfill({contentType: 'text/html', body: html}));
    await page.clock.install({time: new Date('2026-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto('http://localhost/game');
    assert.equal(await page.locator('#name').isVisible(), true);
    await page.locator('#name').fill('   ');
    await page.locator('#draw').click();
    assert.equal(await page.locator('#records li').count(), 0);
    const names = ['小明', '小红', '小刚', '小美', '<b>小白</b>'];
    for (let index = 0; index < names.length; index++) {
      if (index === 1) {
        await page.locator('#name').fill(' 小明 ');
        await page.locator('#draw').click();
        assert.match(await page.locator('#error').innerText(), /已经抽过/);
      }
      await page.locator('#name').fill(names[index]);
      await page.locator('#draw').click();
      assert.equal(await page.locator('#draw').isDisabled(), true);
      assert.equal(await page.locator('#reset').isDisabled(), true);
      assert.equal(await page.locator('#records li').count(), index);
      // Even programmatic duplicate submissions must not consume another result.
      await page.evaluate(() => document.getElementById('form').dispatchEvent(new Event('submit', {cancelable:true})));
      if (index === 0) {
        const frames = new Set();
        for (let t = 0; t < 10; t++) {
          frames.add(await page.locator('#result').innerText());
          await page.clock.runFor(100);
        }
        assert.equal(frames.size, 5, 'All five tasks must appear in the animation');
        const selected = await page.evaluate(() => JSON.parse(localStorage.getItem('housework-simple-v1')).records[0].task);
        await page.reload();
        assert.equal(await page.locator('#records li').count(), 0);
        assert.equal(await page.locator('#draw').isDisabled(), true);
        await page.clock.runFor(3900);
        assert.equal(await page.locator('#records li').count(), 0, 'No reveal before 5 seconds');
        await page.clock.runFor(100);
        assert.equal(await page.locator('#result').innerText(), '小明 抽中了：' + selected);
      } else {
        await page.clock.runFor(4900);
        assert.equal(await page.locator('#records li').count(), index);
        await page.clock.runFor(100);
      }
      assert.equal(await page.locator('#records li').count(), index + 1);
    }
    const results = (await page.locator('#records li').allTextContents()).map(text => text.split(' → ')[1]);
    assert.equal(new Set(results).size, 5);
    assert.equal(await page.locator('#records b').count(), 0);
    assert.equal(await page.locator('#draw').isDisabled(), true);
    assert.equal(await page.locator('#progress').innerText(), '本轮全部抽完啦！');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#reset').click();
    assert.equal(await page.locator('#records li').count(), 5);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#reset').click();
    assert.equal(await page.locator('#records li').count(), 0);
    await page.locator('#count').selectOption('1');
    await page.locator('#name').fill('单人');
    await page.locator('#draw').click();
    await page.clock.runFor(5000);
    assert.equal(await page.locator('#draw').isDisabled(), true);
    assert.equal((await page.locator('#pool').innerText()).split('、').length, 4);
    assert.deepEqual(errors, []);
    // Also verify a five-second draw using real browser time, without the test clock.
    const real = await browser.newPage();
    await real.route('http://localhost/game', route => route.fulfill({contentType: 'text/html', body: html}));
    await real.goto('http://localhost/game');
    await real.locator('#name').fill('实际计时');
    const start = Date.now();
    await real.locator('#draw').click();
    await real.locator('#records li').waitFor({timeout: 8000});
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 5000 && elapsed < 7000, `Real draw took ${elapsed} ms`);
    console.log(`PASS: all five animation frames, reveal only after five seconds (${elapsed} ms real time), reload mid-animation, disabled controls, duplicate/blank names, unique results, safe rendering, reset, one player, mobile layout; no JS errors.`);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exit(1);});
