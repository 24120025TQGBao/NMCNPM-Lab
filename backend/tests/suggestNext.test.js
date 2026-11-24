import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

// Client giả: `rpc('match_dishes')` trả các trang do test chỉ định, `from('ct_nguyen_lieu')` lọc eq/in thật.
function createClient({ pages = [[]], rpcError = null, recipeIngredients = [], recipeError = null } = {}) {
  const queries = [];
  const rpc = vi.fn(async (_name, args) => {
    if (rpcError) return { data: null, error: rpcError };
    return { data: pages[args.p_offset / 500] ?? [], error: null };
  });

  const from = vi.fn(table => {
    const filters = [];
    const recorded = { table, filters: [] };
    queries.push(recorded);
    const builder = {
      select(columns) {
        recorded.columns = columns;
        return builder;
      },
      in(column, values) {
        recorded.filters.push({ column, values });
        filters.push(row => values.includes(row[column]));
        return builder;
      },
      then(resolve, reject) {
        if (recipeError) return Promise.resolve({ data: null, error: recipeError }).then(resolve, reject);
        const rows = recipeIngredients.filter(row => filters.every(filter => filter(row)));
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      }
    };
    return builder;
  });

  return { client: { rpc, from }, rpc, from, queries };
}

const missing = (id, name, role = 'SECONDARY') => ({ ma_nl: id, ten_nl: name, role, so_luong: 1, don_vi: 'g', ghi_chu: null });

// Một dòng của match_dishes.
function row(dishId, recipeId, missingIngredients, extra = {}) {
  return {
    ma_mon: dishId,
    ten_mon: `Món ${dishId}`,
    ma_ct: recipeId,
    ten_ct: `Công thức ${recipeId}`,
    match_percent: 50,
    matched_weight: 2,
    total_weight: 4,
    missing_count: missingIngredients.length,
    missing_ingredients: missingIngredients,
    readiness: missingIngredients.length === 0 ? 'COOK_NOW' : missingIngredients.length <= 2 ? 'MISSING_1_2' : 'NEED_SHOPPING',
    is_incomplete: false,
    ...extra
  };
}

// Công thức nào chứa nguyên liệu người dùng (46 = Cà chua, 1 = Trứng).
const userHas = (recipeId, ingredientId = 46) => ({ ma_ct: recipeId, ma_nl: ingredientId });

function appWith(options) {
  const mocks = createClient(options);
  return { ...mocks, app: createApp({ ingredientsClient: mocks.client }) };
}

const get = (app, query = 'ingredients=46,1') => request(app).get(`/api/ingredients/suggest-next?${query}`);

describe('GET /api/ingredients/suggest-next', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('grouping (BE12 / docs/api.md 7.8)', () => {
    it('counts dishes that are exactly one ingredient away, grouped by that ingredient', async () => {
      const { app } = appWith({
        pages: [[
          row(12, 112, [missing(3, 'Hành lá')]),
          row(7, 107, [missing(3, 'Hành lá')]),
          row(21, 121, [missing(3, 'Hành lá')]),
          row(15, 115, [missing(9, 'Nước mắm')])
        ]],
        recipeIngredients: [userHas(112), userHas(107), userHas(121), userHas(115)]
      });

      const response = await get(app);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: [
          { ingredient: { id: 3, name: 'Hành lá' }, unlock_count: 3, dish_ids: [7, 12, 21] },
          { ingredient: { id: 9, name: 'Nước mắm' }, unlock_count: 1, dish_ids: [15] }
        ]
      });
    });

    it('ignores dishes missing 0, 2 or more ingredients', async () => {
      const { app } = appWith({
        pages: [[
          row(1, 101, []),
          row(2, 102, [missing(3, 'Hành lá'), missing(9, 'Nước mắm')]),
          row(3, 103, [missing(3, 'Hành lá'), missing(9, 'Nước mắm'), missing(5, 'Dầu ăn')]),
          row(4, 104, [missing(3, 'Hành lá')])
        ]],
        recipeIngredients: [userHas(101), userHas(102), userHas(103), userHas(104)]
      });

      const response = await get(app);

      expect(response.body.data).toEqual([{ ingredient: { id: 3, name: 'Hành lá' }, unlock_count: 1, dish_ids: [4] }]);
    });

    it('ignores incomplete dishes even when they are one ingredient away', async () => {
      const { app } = appWith({
        pages: [[
          row(1, 101, [missing(3, 'Hành lá')], { is_incomplete: true, readiness: 'INCOMPLETE' }),
          row(2, 102, [missing(3, 'Hành lá')])
        ]],
        recipeIngredients: [userHas(101), userHas(102)]
      });

      const response = await get(app);

      expect(response.body.data).toEqual([{ ingredient: { id: 3, name: 'Hành lá' }, unlock_count: 1, dish_ids: [2] }]);
    });

    it('ignores dishes that have no recipe (ma_ct is null)', async () => {
      const { app } = appWith({
        pages: [[row(1, null, [missing(3, 'Hành lá')], { is_incomplete: true, readiness: 'INCOMPLETE' }), row(2, 102, [missing(3, 'Hành lá')])]],
        recipeIngredients: [userHas(102)]
      });

      const response = await get(app);

      expect(response.body.data[0].dish_ids).toEqual([2]);
    });

    it('sorts by unlock_count descending, then by ingredient id ascending', async () => {
      const { app } = appWith({
        pages: [[
          row(1, 101, [missing(30, 'C')]),
          row(2, 102, [missing(10, 'A')]),
          row(3, 103, [missing(20, 'B')]),
          row(4, 104, [missing(20, 'B')]),
          row(5, 105, [missing(30, 'C')]),
          row(6, 106, [missing(40, 'D')])
        ]],
        recipeIngredients: [101, 102, 103, 104, 105, 106].map(id => userHas(id))
      });

      const response = await get(app);

      expect(response.body.data.map(item => [item.ingredient.id, item.unlock_count])).toEqual([
        [20, 2],
        [30, 2],
        [10, 1],
        [40, 1]
      ]);
    });

    it('returns at most 10 ingredients', async () => {
      const rows = Array.from({ length: 12 }, (_, i) => row(i + 1, 100 + i, [missing(i + 1, `NL ${i + 1}`)]));
      const { app } = appWith({ pages: [rows], recipeIngredients: rows.map(r => userHas(r.ma_ct)) });

      const response = await get(app);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.data.map(item => item.ingredient.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('returns 200 and [] when no dish is one ingredient away, without querying recipes', async () => {
      const { app, from } = appWith({ pages: [[row(1, 101, []), row(2, 102, [missing(3, 'A'), missing(4, 'B')])]] });

      const response = await get(app);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
      expect(from).not.toHaveBeenCalled();
    });

    it('returns 200 and [] when match_dishes returns nothing', async () => {
      const { app } = appWith({ pages: [[]] });

      const response = await get(app);

      expect(response.body).toEqual({ data: [] });
    });
  });

  describe('Q4 filter: the chosen recipe must contain an ingredient the user selected', () => {
    it('drops dishes whose recipe only matched through the pantry', async () => {
      const { app } = appWith({
        pages: [[row(1, 101, [missing(3, 'Hành lá')]), row(2, 102, [missing(3, 'Hành lá')])]],
        // Công thức 101 không chứa nguyên liệu nào người dùng chọn; 102 có Cà chua (46)
        recipeIngredients: [userHas(102, 46), { ma_ct: 101, ma_nl: 5 }]
      });

      const response = await get(app);

      expect(response.body.data).toEqual([{ ingredient: { id: 3, name: 'Hành lá' }, unlock_count: 1, dish_ids: [2] }]);
    });

    it('queries ct_nguyen_lieu only for candidate recipes and only for the ingredients the user sent', async () => {
      const { app, queries } = appWith({
        pages: [[row(1, 101, []), row(2, 102, [missing(3, 'A')]), row(3, 103, [missing(3, 'A'), missing(4, 'B')])]],
        recipeIngredients: [userHas(102)]
      });

      await get(app, 'ingredients=46,1,46');

      expect(queries).toHaveLength(1);
      expect(queries[0].table).toBe('ct_nguyen_lieu');
      expect(queries[0].filters).toEqual([
        { column: 'ma_ct', values: [102] },
        { column: 'ma_nl', values: [46, 1] }
      ]);
    });

    it('batches recipe lookups so that no request can exceed the PostgREST row limit', async () => {
      const rows = Array.from({ length: 65 }, (_, i) => row(i + 1, 1000 + i, [missing(3, 'A')]));
      const { app, queries } = appWith({ pages: [rows], recipeIngredients: rows.map(r => userHas(r.ma_ct)) });

      const response = await get(app);

      expect(queries.map(query => query.filters[0].values.length)).toEqual([30, 30, 5]);
      expect(response.body.data[0].unlock_count).toBe(65);
    });

    it('returns [] when every candidate recipe lacks the ingredients the user selected', async () => {
      const { app } = appWith({ pages: [[row(1, 101, [missing(3, 'A')])]], recipeIngredients: [] });

      const response = await get(app);

      expect(response.body).toEqual({ data: [] });
    });
  });

  describe('how match_dishes is called (docs/api.md 7.3 rules)', () => {
    it('calls match_dishes exactly once with pantry default true, p_limit 500, p_offset 0', async () => {
      const { app, rpc } = appWith({ pages: [[row(1, 101, [missing(3, 'A')])]], recipeIngredients: [userHas(101)] });

      await get(app, 'ingredients=46,1');

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith('match_dishes', {
        p_ingredient_ids: [46, 1],
        p_include_pantry: true,
        p_limit: 500,
        p_offset: 0
      });
    });

    it('always passes p_include_pantry, including pantry=false', async () => {
      const { app, rpc } = appWith();

      await get(app, 'ingredients=46&pantry=false');
      await get(app, 'ingredients=46&pantry=true');

      expect(rpc.mock.calls.map(call => call[1].p_include_pantry)).toEqual([false, true]);
    });

    it('removes duplicate ingredient ids before calling the RPC', async () => {
      const { app, rpc } = appWith();

      await get(app, 'ingredients=46,1,46,1');

      expect(rpc.mock.calls[0][1].p_ingredient_ids).toEqual([46, 1]);
    });

    it('reads another page only when the previous page is full', async () => {
      const full = Array.from({ length: 500 }, (_, i) => row(i + 1, 1000 + i, [missing(3, 'A'), missing(4, 'B')]));
      const second = [row(900, 2000, [missing(3, 'A')])];
      const { app, rpc } = appWith({ pages: [full, second], recipeIngredients: [userHas(2000)] });

      const response = await get(app);

      expect(rpc.mock.calls.map(call => call[1].p_offset)).toEqual([0, 500]);
      expect(response.body.data).toEqual([{ ingredient: { id: 3, name: 'A' }, unlock_count: 1, dish_ids: [900] }]);
    });

    it('does not call search_ingredients or the search route', async () => {
      const { app, rpc } = appWith();

      await get(app);

      expect(rpc.mock.calls.every(call => call[0] === 'match_dishes')).toBe(true);
    });
  });

  describe('validation (400, never reaches the database)', () => {
    it.each([
      ['ingredients is missing', '', 'ingredients'],
      ['ingredients is empty', 'ingredients=', 'ingredients'],
      ['ingredients has a non-numeric id', 'ingredients=46,abc', 'ingredients'],
      ['ingredients has an empty item', 'ingredients=46,,1', 'ingredients'],
      ['ingredients has id 0', 'ingredients=0', 'ingredients'],
      ['ingredients has a negative id', 'ingredients=-3', 'ingredients'],
      ['ingredients has more than 30 ids', `ingredients=${Array.from({ length: 31 }, (_, i) => i + 1).join(',')}`, 'ingredients'],
      ['ingredients is repeated', 'ingredients=1&ingredients=2', 'ingredients'],
      ['pantry is not a boolean', 'ingredients=46&pantry=yes', 'pantry'],
      ['pantry is empty', 'ingredients=46&pantry=', 'pantry']
    ])('returns 400 when %s', async (_name, queryString, field) => {
      const { app, rpc, from } = appWith();

      const response = await get(app, queryString);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.map(detail => detail.field)).toContain(field);
      expect(rpc).not.toHaveBeenCalled();
      expect(from).not.toHaveBeenCalled();
    });

    it('accepts exactly 30 ingredients', async () => {
      const { app } = appWith();

      const response = await get(app, `ingredients=${Array.from({ length: 30 }, (_, i) => i + 1).join(',')}`);

      expect(response.status).toBe(200);
    });

    it('returns 400 (not 500) when match_dishes rejects an unknown ingredient with 22023', async () => {
      const { app } = appWith({
        rpcError: { code: '22023', message: 'Use 0..1000 canonical ingredient IDs; null/unknown IDs are invalid' }
      });

      const response = await get(app, 'ingredients=999999');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual([
        { field: 'ingredients', message: 'Danh sách nguyên liệu chứa ID không tồn tại' }
      ]);
      expect(JSON.stringify(response.body)).not.toMatch(/canonical|null\/unknown/);
    });
  });

  describe('server errors never leak details', () => {
    it('returns 500 when match_dishes fails with another error', async () => {
      const { app } = appWith({ rpcError: { code: '42501', message: 'permission denied for table han_che_nguyen_lieu' } });

      const response = await get(app);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(response.body)).not.toMatch(/permission|han_che|42501/);
    });

    it('returns 500 when reading ct_nguyen_lieu fails', async () => {
      const { app } = appWith({
        pages: [[row(1, 101, [missing(3, 'A')])]],
        recipeError: { code: '42501', message: 'permission denied for table ct_nguyen_lieu' }
      });

      const response = await get(app);

      expect(response.status).toBe(500);
      expect(JSON.stringify(response.body)).not.toMatch(/permission|ct_nguyen_lieu|42501/);
    });

    it('returns 500 when the RPC result is not an array', async () => {
      const mocks = createClient();
      mocks.rpc.mockResolvedValueOnce({ data: { unexpected: true }, error: null });
      const app = createApp({ ingredientsClient: mocks.client });

      const response = await get(app);

      expect(response.status).toBe(500);
    });

    it('returns 500 when missing_count is 1 but missing_ingredients disagrees', async () => {
      const { app } = appWith({
        pages: [[{ ...row(1, 101, [missing(3, 'A')]), missing_ingredients: [] }]],
        recipeIngredients: [userHas(101)]
      });

      const response = await get(app);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  it('is public (ignores Authorization) and does not collide with GET /api/ingredients?search=', async () => {
    const { app, rpc } = appWith();

    const next = await request(app).get('/api/ingredients/suggest-next?ingredients=46').set('Authorization', 'Bearer x');
    const search = await request(app).get('/api/ingredients?search=ca');

    expect(next.status).toBe(200);
    expect(search.status).toBe(200);
    expect(rpc.mock.calls.map(call => call[0])).toEqual(['match_dishes', 'search_ingredients']);
  });
});
