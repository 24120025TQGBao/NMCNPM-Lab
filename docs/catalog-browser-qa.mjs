// Run against a Vite dev server with VITE_USE_MOCK=true. See catalog-handoff.md.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseUrl = process.env.CATALOG_QA_URL || 'http://127.0.0.1:5174'
const output = process.env.CATALOG_QA_OUTPUT || '/tmp/citrus-catalog-qa'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
})
const results = []
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const fits = async (name) => {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${name}: overflow at ${width}px`)
    }
    await page.goto(`${baseUrl}/search`)
    await page.getByText('Tìm thấy 5 món ăn').waitFor()
    await fits('search')
    await page.getByRole('searchbox').fill('pho bo')
    await page.getByRole('combobox', { name: 'Loại món', exact: true }).selectOption('MON_NUOC')
    await page.getByRole('combobox', { name: 'Khẩu vị', exact: true }).selectOption('THANH')
    await page.getByRole('combobox', { name: 'Thời gian chế biến', exact: true }).selectOption('60')
    await page.getByText('Tìm thấy 1 món ăn').waitFor()
    const searchUrl = page.url()
    await page.screenshot({ path: `${output}/search-${width}.png`, fullPage: true })
    await page.getByRole('link', { name: /Phở bò.*Xem món/ }).click()
    await page.getByRole('heading', { name: 'Phở bò', exact: true, level: 1 }).waitFor()
    assert.ok(await page.getByRole('button', { name: /Quán ăn.*Sắp có/ }).isDisabled())
    await fits('dish')
    await page.getByRole('link', { name: 'Tự nấu', exact: true }).click()
    await page.getByRole('heading', { name: 'Công thức cho Phở bò', exact: true }).waitFor()
    await fits('recipe list')
    await page.getByRole('link', { name: 'Xem công thức', exact: true }).first().click()
    await page.getByRole('heading', { name: 'Phở bò truyền thống', exact: true, level: 1 }).waitFor()
    await page.getByText('400 g', { exact: true }).waitFor()
    assert.deepEqual(await page.getByRole('heading', { name: /^Bước/ }).allTextContents(), ['Bước 1', 'Bước 2', 'Bước 3'])
    await fits('recipe detail')
    await page.screenshot({ path: `${output}/recipe-${width}.png`, fullPage: true })
    await page.getByRole('link', { name: 'Quay lại danh sách công thức', exact: true }).click()
    await page.getByRole('heading', { name: 'Công thức cho Phở bò', exact: true }).waitFor()
    await page.getByRole('link', { name: 'Quay lại tìm món', exact: true }).click()
    await page.getByText('Tìm thấy 1 món ăn').waitFor()
    assert.equal(page.url(), searchUrl)
    assert.equal(await page.getByRole('searchbox').inputValue(), 'pho bo')
    assert.equal(await page.getByRole('combobox', { name: 'Loại món', exact: true }).inputValue(), 'MON_NUOC')
    assert.equal(await page.getByRole('combobox', { name: 'Khẩu vị', exact: true }).inputValue(), 'THANH')
    assert.equal(await page.getByRole('combobox', { name: 'Thời gian chế biến', exact: true }).inputValue(), '60')
    await page.getByRole('searchbox').fill('khong-co-mon')
    await page.getByRole('heading', { name: 'Không tìm thấy món phù hợp', exact: true }).waitFor()
    await fits('empty search')
    await page.goto(`${baseUrl}/dishes/105/recipes`)
    await page.getByRole('heading', { name: 'Món này chưa có công thức', exact: true }).waitFor()
    await page.goto(`${baseUrl}/recipes/505`)
    await page.getByText('Chưa cập nhật các bước thực hiện.', { exact: true }).waitFor()
    await fits('incomplete recipe')
    await page.goto(`${baseUrl}/dishes/99999`)
    await page.getByRole('alert').filter({ hasText: 'Món ăn không còn tồn tại' }).waitFor()
    await page.goto(`${baseUrl}/search`)
    await page.getByText('Tìm thấy 5 món ăn').waitFor()
    // In-memory test records only; no server/database writes.
    await page.evaluate(async () => {
      const { DISHES } = await import('/src/lib/api/mock/seed.js')
      for (let index = 0; index < 13; index++) DISHES.push({ id: 9000 + index, name: `Món thử phân trang ${index}` })
    })
    await page.getByRole('searchbox').fill('Món thử phân trang')
    await page.getByText('Tìm thấy 13 món ăn').waitFor()
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click()
    await page.getByText('Trang 2 / 2', { exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: /Xem món và công thức/ }).count(), 1)
    await fits('pagination')
    assert.deepEqual(errors, [])
    results.push({ width, status: 'PASS', checks: ['flow', 'unaccented search', 'combined filters', 'return state', 'pagination', 'empty', '404', 'incomplete', 'no horizontal overflow', 'no runtime errors'] })
    await page.close()
  }
} finally {
  await browser.close()
}
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
