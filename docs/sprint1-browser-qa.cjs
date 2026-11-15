// Run with QA_PLAYWRIGHT pointing to a temporary Playwright installation.
// Credentials stay in memory; artifacts contain no session tokens.
const { chromium, firefox } = require(process.env.QA_PLAYWRIGHT)
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { randomBytes } = require('node:crypto')
const base = 'http://localhost:5173'
const output = path.join(__dirname, 'qa-evidence-2026-11-15')
fs.mkdirSync(output, { recursive: true })
const stamp = Date.now()
const email = `qa.sprint1.${stamp}@example.com`
const password = `Qa!${randomBytes(16).toString('hex')}`
const name = `QA Retest ${stamp}`
const results = []
let session
async function rollbackCheck() {
  const { createClient } = require('../backend/node_modules/@supabase/supabase-js')
  require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env'), quiet: true })
  const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const user = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  })
  const result = { label: 'database-rollback', checks: [] }
  results.push(result)
  const marker = `QA rollback ${stamp}`
  try {
    const dishes = await fetch(`${base}/api/dishes?limit=1`).then(r => r.json())
    const tables = [['cong_thuc', 'ten_ct'], ['nguyen_lieu', 'ten_nl']]
    async function counts() {
      const values = []
      for (const [table, column] of tables) {
        const r = await service.from(table).select(column, { count: 'exact' }).eq(column, marker)
        if (r.error) throw new Error(`Cannot verify ${table}: ${r.error.code} ${r.error.message}`)
        values.push(r.count)
      }
      return values
    }
    // Read access is checked before submitting the deliberately failing transaction.
    const before = await counts()
    assert.deepEqual(before, [0, 0])
    const { error } = await user.rpc('create_post_with_recipe', {
      p_dish_id: dishes.data[0].id, p_title: marker, p_content: marker,
      p_ingredients: [{ name: marker, quantity: 1, role: 'PRIMARY' }, { ingredient_id: 9007199254740991, quantity: 1 }],
      p_steps: [{ content: 'QA rollback must not persist' }],
    })
    assert(error?.message.includes('ERR_INGREDIENT_NOT_FOUND'), 'expected error inside ingredient transaction')
    assert.deepEqual(await counts(), before)
    const feed = await fetch(`${base}/api/posts?limit=20`).then(r => r.json())
    assert(Array.isArray(feed.data), 'public feed must return data array')
    assert(!feed.data.some(p => p.title === marker))
    result.status = 'PASS'
    result.checks.push('ERR_INGREDIENT_NOT_FOUND after recipe and first new ingredient insertion; zero recipe/ingredient marker rows before and after; no public post')
    result.limitation = 'service_role has no SELECT on bai_dang; post absence checked via public feed, recipe and ingredient absence checked directly in DB'
  } catch (e) { result.status = 'BLOCKED'; result.error = e.message }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(result))
}
async function member(page) {
  await page.getByRole('button', { name: `Tài khoản: ${name}`, exact: true }).waitFor()
}
async function logout(page) {
  await page.getByRole('button', { name: `Tài khoản: ${name}`, exact: true }).click()
  await page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click()
  await page.getByRole('button', { name: 'Tài khoản (chưa đăng nhập)', exact: true }).waitFor()
}
async function run(label, engine, viewport, signup) {
  const browser = await engine.launch({ headless: true })
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const result = { label, browserVersion: browser.version(), viewport, checks: [] }
  results.push(result)
  try {
    await page.goto(`${base}/posts/new`)
    await page.waitForURL('**/login?**')
    result.checks.push('guest route guard')
    if (signup) {
      await page.goto(`${base}/register`)
      await page.getByLabel('Tên hiển thị', { exact: true }).fill(name)
      await page.getByLabel('Email', { exact: true }).fill(email)
      await page.getByLabel('Mật khẩu', { exact: true }).fill(password)
      const signupResponse = page.waitForResponse(r => r.url().includes('/auth/v1/signup'))
      await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click()
      const signupResult = await signupResponse
      if (signupResult.status() === 429) {
        const body = await signupResult.json()
        results.push({ label: 'public-signup', status: 'BLOCKED', httpStatus: 429, code: body.code, reason: 'Supabase Auth rate limit' })
        await page.screenshot({ path: path.join(output, 'signup-blocked.png'), fullPage: true })
        const { createClient } = require('../backend/node_modules/@supabase/supabase-js')
        require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env'), quiet: true })
        const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
        const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } })
        if (error) throw new Error(`QA fixture creation: ${error.message}`)
        result.checks.push('QA fixture via admin; public signup remains blocked')
      } else {
        assert.equal(signupResult.status(), 200)
        await member(page)
        result.checks.push('public signup and profile')
        await logout(page)
      }
    }
    await page.goto(`${base}/login`)
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Mật khẩu', { exact: true }).fill('Wrong-Password-123!')
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await page.getByText('Email hoặc mật khẩu không đúng.', { exact: true }).waitFor()
    result.checks.push('wrong password rejected')
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await member(page)
    result.checks.push('login and profile')
    if (signup) session = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k))
      return key ? JSON.parse(localStorage.getItem(key)) : null
    })
    await page.goto(`${base}/posts/new`)
    const title = `QA Retest Sprint1 ${label} ${stamp}`
    const select = page.getByLabel('Món ăn', { exact: true })
    await select.locator('option').nth(1).waitFor({ state: 'attached' })
    await select.selectOption({ index: 1 })
    await page.getByLabel('Tiêu đề', { exact: true }).fill(title)
    await page.getByLabel('Tên nguyên liệu 1', { exact: true }).fill('Muối')
    await page.getByLabel('Định lượng 1', { exact: true }).fill('1')
    await page.getByLabel('Đơn vị 1', { exact: true }).fill('g')
    await page.getByRole('button', { name: 'Thêm nguyên liệu', exact: true }).click()
    await page.getByLabel('Tên nguyên liệu 2', { exact: true }).fill('Nước')
    await page.getByLabel('Định lượng 2', { exact: true }).fill('100')
    await page.getByLabel('Đơn vị 2', { exact: true }).fill('ml')
    await page.getByLabel('Bước 1', { exact: true }).fill('Chuẩn bị nguyên liệu QA.')
    await page.getByRole('button', { name: 'Thêm bước', exact: true }).click()
    await page.getByLabel('Bước 2', { exact: true }).fill('Trộn và hoàn thành QA.')
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow in create form')
    await page.screenshot({ path: path.join(output, `${label}-form.png`), fullPage: true })
    const created = page.waitForResponse(r => r.url().endsWith('/api/posts') && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Đăng bài', exact: true }).click()
    const response = await created
    assert.equal(response.status(), 201)
    const { data } = await response.json()
    result.postId = data.id
    assert.equal(data.ingredients.length, 2)
    assert.deepEqual(data.steps.map(s => s.order), [1, 2])
    assert(!Object.hasOwn(data.author, 'email'))
    await page.waitForURL(`**/posts/${data.id}`)
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
    result.checks.push('create recipe with two ingredients and ordered steps')
    await page.reload()
    await member(page)
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
    result.checks.push('reload restores session and detail')
    await page.screenshot({ path: path.join(output, `${label}-detail.png`), fullPage: true })
    await page.goto(base)
    await page.getByRole('link', { name: new RegExp(title) }).first().waitFor()
    result.checks.push('feed contains created post')
    await logout(page)
    await page.reload()
    await page.getByRole('button', { name: 'Tài khoản (chưa đăng nhập)', exact: true }).waitFor()
    await page.goto(`${base}/posts/new`)
    await page.waitForURL('**/login?**')
    result.checks.push('logout survives reload and route is guarded')
    assert.deepEqual(errors, [])
    result.status = 'PASS'
  } catch (e) {
    result.status = 'FAIL'
    result.error = e.message
    await page.screenshot({ path: path.join(output, `${label}-failure.png`), fullPage: true }).catch(() => {})
  } finally {
    await browser.close()
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2))
    console.log(JSON.stringify(result))
  }
}
;(async () => {
  if (process.env.QA_ROLLBACK_ONLY === 'true') {
    const saved = JSON.parse(fs.readFileSync(path.join(output, 'results.json'), 'utf8'))
    results.push(...saved.filter(r => r.label !== 'database-rollback'))
    const { createClient } = require('../backend/node_modules/@supabase/supabase-js')
    require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env'), quiet: true })
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } })
    if (error) throw error
    const user = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const login = await user.auth.signInWithPassword({ email, password })
    if (login.error) throw login.error
    session = login.data.session
    await rollbackCheck()
    await user.auth.signOut()
    process.exitCode = results.some(r => r.status !== 'PASS') ? 1 : 0
    return
  }
  await run('chromium-desktop', chromium, { width: 1920, height: 1080 }, true)
  if (session) {
    await run('firefox-desktop', firefox, { width: 1920, height: 1080 }, false)
    await run('chromium-mobile', chromium, { width: 390, height: 844 }, false)
    await rollbackCheck()
  }
  process.exitCode = results.some(r => r.status !== 'PASS') ? 1 : 0
})().catch(e => { console.error(e.message); process.exitCode = 1 })
