import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createDishesMatchRouter } from '../src/routes/dishes-match.routes.js';

// Client giả: `rpc('match_dishes')` trả các trang do test chỉ định; `from(table)` lọc in() thật trên dữ liệu mẫu,
// hỗ trợ order()/range() như PostgREST để chạy cả truy vấn đếm nguyên liệu lẫn truy vấn lọc Q4.
function createFakeClient({ pages = [[]], rpcError = null, ingredients = [], images = {}, failTable = null } = {}) {
  const queries = [];
  const rpc = vi.fn(async (_name, args) => {
    if (rpcError) return { data: null, error: rpcError };
    return { data: pages[args.p_offset / 500] ?? [], error: null };
  });

  const from = vi.fn(table => {
    const filters = [];
    const recorded = { table, in: [] };
    let ordering = [];
    let window = null;
    queries.push(recorded);
    const builder = {
      select(columns) {
        recorded.columns = columns;
        return builder;
      },
      in(column, values) {
        recorded.in.push({ column, values });
        filters.push(row => values.includes(row[column]));
        return builder;
      },
      order(column) {
        ordering.push(column);
        return builder;
      },
      range(from_, to) {
        window = [from_, to];
        return builder;
      },
      then(resolve, reject) {
        if (table === failTable) {
          return Promise.resolve({ data: null, error: { code: '42501', message: `denied for ${table}` } }).then(resolve, reject);
        }
        let rows;
        if (table === 'mon_an') {
          rows = Object.keys(images).map(id => ({ ma_mon: Number(id), hinh_anh: images[id] }));
        } else {
          rows = [...ingredients];
        }
        rows = rows.filter(row => filters.every(filter => filter(row)));
        for (const column of [...ordering].reverse()) rows.sort((a, b) => a[column] - b[column]);
        if (window) rows = rows.slice(window[0], window[1] + 1);
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      }
    };
    return builder;
  });

  return { client: { rpc, from }, rpc, from, queries };
}

const miss = (id, name, role = 'SECONDARY') => ({ ma_nl: id, ten_nl: name, role, so_luong: 1, don_vi: 'g', ghi_chu: null });

// Một dòng của match_dishes (cột đúng như migration 202611220001).
function row(dishId, recipeId, missing, extra = {}) {
  const readiness = missing.length === 0 ? 'COOK_NOW' : missing.length <= 2 ? 'MISSING_1_2' : 'NEED_SHOPPING';
  return {
    ma_mon: dishId,
    ten_mon: `Món ${dishId}`,
    ma_ct: recipeId,
    ten_ct: `Công thức ${recipeId}`,
    match_percent: 50,
    matched_weight: 2,
    total_weight: 4,
    missing_count: missing.length,
    missing_ingredients: missing,
    readiness,
    is_incomplete: false,
    ...extra
  };
}

// Dòng ct_nguyen_lieu: công thức `recipeId` chứa nguyên liệu `ingredientId`.
const has = (recipeId, ingredientId) => ({ ma_ct: recipeId, ma_nl: ingredientId });
// Công thức có `n` nguyên liệu (id 900+) để total_count/have_count tính được.
const filler = (recipeId, n) => Array.from({ length: n }, (_, i) => has(recipeId, 900 + i));

function appWith(options) {
  const mocks = createFakeClient(options);
  const app = express();
  app.use('/api/dishes/match', createDishesMatchRouter(mocks.client));
  return { ...mocks, app };
}

const get = (app, query = 'ingredients=46') => request(app).get(`/api/dishes/match?${query}`);
const ids = response => response.body.data.map(item => item.id);

describe('GET /api/dishes/match: KAN-257 (Q4 filter, readiness of incomplete dishes, RPC order)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Q4: keep only dishes whose recipe contains an ingredient the user selected', () => {
    it('drops dishes whose chosen recipe has none of the selected ingredients (0% matches)', async () => {
      const { app } = appWith({
        pages: [[
          row(1, 101, [miss(3, 'Hành lá')], { matched_weight: 2, total_weight: 3, match_percent: 66.67 }),
          row(2, 102, [miss(3, 'Hành lá'), miss(9, 'Nước mắm'), miss(5, 'Dầu ăn')], { matched_weight: 0, match_percent: 0 }),
          row(3, 103, [miss(9, 'Nước mắm')], { matched_weight: 0, match_percent: 0 })
        ]],
        ingredients: [has(101, 46), ...filler(101, 2), ...filler(102, 3), ...filler(103, 1)],
        images: { 1: 'https://img/1.jpg' }
      });

      const response = await get(app, 'ingredients=46');

      expect(response.status).toBe(200);
      expect(ids(response)).toEqual([1]);
      expect(response.body.data[0]).toEqual({
        id: 1,
        name: 'Món 1',
        image_url: 'https://img/1.jpg',
        match_ratio: 0.6667,
        have_count: 2,
        total_count: 3,
        missing: [{ id: 3, name: 'Hành lá', role: 'SECONDARY' }],
        readiness: 'MISSING_1_2',
        is_incomplete: false
      });
    });

    it('does not count pantry: a dish that matched only through the pantry is dropped', async () => {
      // Công thức 101 chỉ chứa Dầu ăn (5, tủ bếp) nên RPC có matched_weight > 0 nhưng người dùng chỉ chọn Cà chua (46).
      const { app } = appWith({
        pages: [[row(1, 101, [miss(46, 'Cà chua')], { matched_weight: 1, total_weight: 3, match_percent: 33.33 })]],
        ingredients: [has(101, 5), has(101, 7)]
      });

      const response = await get(app, 'ingredients=46');

      expect(response.body).toEqual({ data: [] });
    });

    it('keeps that dish when the user explicitly selects the pantry ingredient', async () => {
      const { app } = appWith({
        pages: [[row(1, 101, [miss(7, 'Tiêu')], { matched_weight: 1, total_weight: 2, match_percent: 50 })]],
        ingredients: [has(101, 5), has(101, 7)],
        images: { 1: null }
      });

      const response = await get(app, 'ingredients=5');

      expect(ids(response)).toEqual([1]);
    });

    it('drops dishes that have no recipe (ma_ct is null)', async () => {
      const { app } = appWith({
        pages: [[
          row(1, null, [], { is_incomplete: true, readiness: 'INCOMPLETE', match_percent: null, matched_weight: 0, total_weight: 0 }),
          row(2, 102, [miss(3, 'A')])
        ]],
        ingredients: [has(102, 46), ...filler(102, 1)],
        images: { 2: null }
      });

      const response = await get(app);

      expect(ids(response)).toEqual([2]);
    });

    it('queries ct_nguyen_lieu only for the selected ingredients, in batches of at most 30 recipes', async () => {
      const rows = Array.from({ length: 65 }, (_, i) => row(i + 1, 1000 + i, [miss(3, 'A')]));
      const { app, queries } = appWith({ pages: [rows], ingredients: rows.map(r => has(r.ma_ct, 46)) });

      await get(app, 'ingredients=46,1,46');

      const userIngredientQueries = queries.filter(q => q.table === 'ct_nguyen_lieu' && q.in.some(f => f.column === 'ma_nl'));
      expect(userIngredientQueries.map(q => q.in.find(f => f.column === 'ma_ct').values.length)).toEqual([30, 30, 5]);
      for (const q of userIngredientQueries) {
        expect(q.in.find(f => f.column === 'ma_nl').values).toEqual([46, 1]);
        expect(q.columns).toBe('ma_ct,ma_nl');
      }
    });

    it('does not look up images or ingredient counts for dishes that were filtered out', async () => {
      const { app, queries } = appWith({
        pages: [[row(1, 101, [miss(3, 'A')]), row(2, 102, [miss(3, 'A')])]],
        ingredients: [has(101, 46), ...filler(101, 1), ...filler(102, 2)],
        images: { 1: null, 2: null }
      });

      await get(app);

      const imageQuery = queries.find(q => q.table === 'mon_an');
      expect(imageQuery.in).toEqual([{ column: 'ma_mon', values: [1] }]);
      const countQueries = queries.filter(q => q.table === 'ct_nguyen_lieu' && !q.in.some(f => f.column === 'ma_nl'));
      expect(countQueries.flatMap(q => q.in.find(f => f.column === 'ma_ct').values)).toEqual([101]);
    });

    it('returns 200 and [] (no image or count queries) when every dish is filtered out', async () => {
      const { app, queries } = appWith({
        pages: [[row(1, 101, [miss(3, 'A')])]],
        ingredients: [...filler(101, 2)]
      });

      const response = await get(app);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
      expect(queries.some(q => q.table === 'mon_an')).toBe(false);
    });

    it('returns 500 without leaking details when the Q4 lookup fails', async () => {
      const { app } = appWith({
        pages: [[row(1, 101, [miss(3, 'A')])]],
        failTable: 'ct_nguyen_lieu'
      });

      const response = await get(app);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(response.body)).not.toMatch(/denied|42501|ct_nguyen_lieu/);
    });
  });

  describe('incomplete dishes: readiness follows missing_count, is_incomplete stays true', () => {
    it.each([
      [0, 'READY'],
      [1, 'MISSING_1_2'],
      [2, 'MISSING_1_2'],
      [3, 'NEED_SHOPPING'],
      [8, 'NEED_SHOPPING']
    ])('missing_count %i -> readiness %s', async (count, expected) => {
      const missing = Array.from({ length: count }, (_, i) => miss(10 + i, `NL ${10 + i}`));
      const { app } = appWith({
        pages: [[row(1, 101, missing, { is_incomplete: true, readiness: 'INCOMPLETE' })]],
        ingredients: [has(101, 46), ...filler(101, count)],
        images: { 1: null }
      });

      const response = await get(app);

      expect(response.status).toBe(200);
      expect(response.body.data[0].readiness).toBe(expected);
      expect(response.body.data[0].is_incomplete).toBe(true);
    });

    it('treats an RPC INCOMPLETE readiness as incomplete even if is_incomplete is false', async () => {
      const { app } = appWith({
        pages: [[row(1, 101, [miss(3, 'A')], { is_incomplete: false, readiness: 'INCOMPLETE' })]],
        ingredients: [has(101, 46), ...filler(101, 1)],
        images: { 1: null }
      });

      const response = await get(app);

      expect(response.body.data[0]).toMatchObject({ readiness: 'MISSING_1_2', is_incomplete: true });
    });

    it('keeps the mapping of complete dishes: COOK_NOW -> READY, others unchanged', async () => {
      const { app } = appWith({
        pages: [[
          row(1, 101, []),
          row(2, 102, [miss(3, 'A'), miss(4, 'B')]),
          row(3, 103, [miss(3, 'A'), miss(4, 'B'), miss(5, 'C')])
        ]],
        ingredients: [has(101, 46), has(102, 46), has(103, 46), ...filler(102, 2), ...filler(103, 3)],
        images: { 1: null, 2: null, 3: null }
      });

      const response = await get(app);

      expect(response.body.data.map(item => [item.id, item.readiness, item.is_incomplete])).toEqual([
        [1, 'READY', false],
        [2, 'MISSING_1_2', false],
        [3, 'NEED_SHOPPING', false]
      ]);
    });
  });

  describe('order is the RPC order (no re-sorting)', () => {
    it('keeps complete-before-incomplete, ties by fewer missing, and does not sort by match_ratio then id', async () => {
      // Thứ tự RPC: món đủ dữ liệu trước; cùng 50% thì ít thiếu hơn trước (id 9 trước id 2); món chưa đầy đủ sau cùng.
      const { app } = appWith({
        pages: [[
          row(7, 107, [miss(3, 'A')], { match_percent: 80, matched_weight: 4, total_weight: 5 }),
          row(9, 109, [miss(3, 'A')], { match_percent: 50, matched_weight: 2, total_weight: 4 }),
          row(2, 102, [miss(3, 'A'), miss(4, 'B')], { match_percent: 50, matched_weight: 2, total_weight: 4 }),
          row(1, 101, [miss(3, 'A')], { match_percent: 90, matched_weight: 9, total_weight: 10, is_incomplete: true, readiness: 'INCOMPLETE' })
        ]],
        ingredients: [101, 102, 107, 109].flatMap(recipe => [has(recipe, 46), ...filler(recipe, 2)]),
        images: { 1: null, 2: null, 7: null, 9: null }
      });

      const response = await get(app);

      expect(ids(response)).toEqual([7, 9, 2, 1]);
    });
  });

  describe('unchanged behavior (regression)', () => {
    it('always passes p_include_pantry, p_limit 500, p_offset 0 and reads another page only when full', async () => {
      const full = Array.from({ length: 500 }, (_, i) => row(i + 1, 1000 + i, [miss(3, 'A')]));
      const second = [row(900, 2000, [miss(3, 'A')])];
      const { app, rpc } = appWith({
        pages: [full, second],
        ingredients: [...full, ...second].map(r => has(r.ma_ct, 46)),
        images: {}
      });

      await get(app, 'ingredients=46&pantry=false');

      expect(rpc.mock.calls.map(call => call[1])).toEqual([
        { p_ingredient_ids: [46], p_include_pantry: false, p_limit: 500, p_offset: 0 },
        { p_ingredient_ids: [46], p_include_pantry: false, p_limit: 500, p_offset: 500 }
      ]);
    });

    it('still maps 22023 to 400 and other RPC errors to 500', async () => {
      const unknown = appWith({ rpcError: { code: '22023', message: 'unknown ingredient' } });
      const other = appWith({ rpcError: { code: '42501', message: 'permission denied' } });

      const first = await get(unknown.app, 'ingredients=999999');
      const second = await get(other.app);

      expect(first.status).toBe(400);
      expect(first.body.error.code).toBe('VALIDATION_ERROR');
      expect(second.status).toBe(500);
      expect(JSON.stringify(second.body)).not.toMatch(/permission|42501/);
    });

    it('still returns 400 without ingredients and does not call the database', async () => {
      const { app, rpc, from } = appWith();

      const response = await request(app).get('/api/dishes/match');

      expect(response.status).toBe(400);
      expect(rpc).not.toHaveBeenCalled();
      expect(from).not.toHaveBeenCalled();
    });
  });
});
