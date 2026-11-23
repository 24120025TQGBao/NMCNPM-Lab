
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const COMPLETE = {
  id: 31,
  dish_id: 21,
  name: 'Rau muống xào thịt bò – công thức đầy đủ',
  servings: null,
  prep_time_minutes: 20,
  ingredient_count: 4,
  incomplete: false
};

const INCOMPLETE = {
  id: 32,
  dish_id: 21,
  name: 'Rau muống xào thịt bò – thiếu hướng dẫn',
  servings: null,
  prep_time_minutes: null,
  ingredient_count: 2,
  incomplete: true
};

const DISH = {
  id: 21,
  name: 'Rau muống xào thịt bò',
  description: 'Món xào dễ làm',
  image_url: null,
  cook_time_minutes: 20,
  flavor: null,
  tags: ['TROI_MUA', 'NAU_CHO_4'],
  region: 'NAM',
  recipes: [COMPLETE, INCOMPLETE]
};

const RECIPE = {
  id: COMPLETE.id,
  dish_id: COMPLETE.dish_id,
  name: COMPLETE.name,
  servings: null,
  prep_time_minutes: COMPLETE.prep_time_minutes,
  incomplete: COMPLETE.incomplete,
  ingredients: [
    { ingredient_id: 3, name: 'Rau muống', quantity: 300, unit: 'g', role: 'PRIMARY' },
    { ingredient_id: 4, name: 'Thịt bò', quantity: 200, unit: 'g', role: 'PRIMARY' }
  ],
  steps: [{ order: 1, content: 'Sơ chế nguyên liệu' }]
};

// Fake only the Supabase client, not the Express routes/controllers/services.
function makeApp(responses = {}) {
  const values = {
    search_public_dishes: { data: [{ id: 21, name: DISH.name, description: DISH.description, image_url: null }], total: 1 },
    search_catalog_dishes: { data: [{ id: 21, name: DISH.name, description: DISH.description, image_url: null }], total: 1 },
    get_catalog_dish: DISH,
    get_catalog_recipe: RECIPE,
    ...responses
  };

  const rpc = vi.fn(async (name, args) => {
    if (!Object.hasOwn(values, name)) {
      throw new Error(`Unexpected RPC: ${name}`);
    }
    const result = typeof values[name] === 'function' ? values[name](args) : values[name];
    if (result instanceof Error) return { data: null, error: result };
    return { data: result, error: null };
  });

  return { app: createApp({ dishesClient: { rpc } }), rpc };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('BE09 — GET /api/dishes', () => {
  it('200: danh sách công khai, đúng envelope và mặc định phân trang', async () => {
    const { app, rpc } = makeApp();
    const res = await request(app).get('/api/dishes');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 1 });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('search_public_dishes', {
      p_search: null, p_page: 1, p_limit: 20
    });
  });

  it('Tìm kiếm theo tên và phân trang truyền đúng RPC', async () => {
    const { app, rpc } = makeApp({
      search_public_dishes: { data: [], total: 12 }
    });
    const res = await request(app).get('/api/dishes?search=pho&page=2&limit=5');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], meta: { page: 2, limit: 5, total: 12 } });
    expect(rpc).toHaveBeenCalledWith('search_public_dishes', {
      p_search: 'pho', p_page: 2, p_limit: 5
    });
  });

  it('Lọc tag, khẩu vị, thời gian, nguyên liệu; KHÔNG gửi p_category', async () => {
    const { app, rpc } = makeApp();
    const res = await request(app).get(
      '/api/dishes?the=TROI_MUA&flavor=CHUA&max_cook_time=30&ingredients=3,4'
    );

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('search_catalog_dishes', {
      p_search: null,
      p_tag_codes: ['TROI_MUA'],
      p_flavor: 'CHUA',
      p_max_cook_time: 30,
      p_ingredient_ids: [3, 4],
      p_page: 1,
      p_limit: 20
    });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_category');
  });

  it('Route /api/dishes/search?q= vẫn hoạt động', async () => {
    const { app, rpc } = makeApp();
    const res = await request(app).get('/api/dishes/search?q=pho');

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('search_public_dishes', {
      p_search: 'pho', p_page: 1, p_limit: 20
    });
  });

  it.each([
    '/api/dishes?page=0',
    '/api/dishes?limit=51',
    '/api/dishes?the=UNKNOWN',
    '/api/dishes?flavor=UNKNOWN',
    '/api/dishes?max_cook_time=0',
    '/api/dishes?ingredients=abc'
  ])('400: tham số không hợp lệ: %s', async path => {
    const { app, rpc } = makeApp();
    const res = await request(app).get(path);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('400: RPC từ chối ID nguyên liệu không tồn tại (22023)', async () => {
    const { app } = makeApp({ search_catalog_dishes: Object.assign(new Error('Unknown ingredient'), { code: '22023' }) });
    const res = await request(app).get('/api/dishes?ingredients=999999');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('ingredients');
  });
});

describe('BE09 — Q15 và GET /api/dishes/:id', () => {
  it('200: tags[] đúng mã API viết hoa; giữ RecipeSummary và trạng thái Q17', async () => {
    const { app, rpc } = makeApp();
    const res = await request(app).get('/api/dishes/21');

    expect(res.status).toBe(200);
    expect(res.body.data.tags).toEqual(['TROI_MUA', 'NAU_CHO_4']);
    expect(res.body.data.tags).not.toContain('troi-mua');
    expect(res.body.data.recipes).toEqual([COMPLETE, INCOMPLETE]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('get_catalog_dish', { p_id: 21 });
  });

  it('404: món không tồn tại hoặc bị ẩn (RPC trả null)', async () => {
    const { app } = makeApp({ get_catalog_dish: null });
    const res = await request(app).get('/api/dishes/999999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('BE09 — GET /api/dishes/:id/recipes', () => {
  it('200: trả toàn bộ RecipeSummary theo envelope và đúng total', async () => {
    const { app, rpc } = makeApp();
    const res = await request(app).get('/api/dishes/21/recipes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [COMPLETE, INCOMPLETE],
      meta: { page: 1, limit: 20, total: 2 }
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('get_catalog_dish', { p_id: 21 });
  });

  it('Phân trang page=2, limit=1 không đổi total', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/dishes/21/recipes?page=2&limit=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [INCOMPLETE], meta: { page: 2, limit: 1, total: 2 } });
  });

  it('200: món có thật nhưng không có công thức trả data=[]', async () => {
    const { app } = makeApp({ get_catalog_dish: { ...DISH, recipes: [] } });
    const res = await request(app).get('/api/dishes/21/recipes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0 } });
  });

  it('404: món không tồn tại; 400: page/limit không hợp lệ', async () => {
    const missing = makeApp({ get_catalog_dish: null });
    expect((await request(missing.app).get('/api/dishes/21/recipes')).status).toBe(404);

    const { app, rpc } = makeApp();
    const invalid = await request(app).get('/api/dishes/21/recipes?page=0&limit=51');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details.map(item => item.field)).toEqual(['page', 'limit']);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('BE09 — Q17 và GET /api/recipes/:id', () => {
  it.each([
    [COMPLETE, false],
    [INCOMPLETE, true]
  ])('incomplete thống nhất giữa chi tiết món và công thức %s', async (summary, expected) => {
    const details = { ...RECIPE, id: summary.id, name: summary.name, incomplete: expected };
    const { app } = makeApp({
      get_catalog_recipe: args => (args.p_id === summary.id ? details : null)
    });

    const dish = await request(app).get('/api/dishes/21');
    const recipe = await request(app).get(`/api/recipes/${summary.id}`);

    expect(dish.status).toBe(200);
    expect(recipe.status).toBe(200);
    const found = dish.body.data.recipes.find(item => item.id === summary.id);
    expect(found.incomplete).toBe(expected);
    expect(recipe.body.data.incomplete).toBe(found.incomplete);
  });

  it('200: chi tiết công thức trả nguyên liệu và các bước theo đúng contract', async () => {
    const { app, rpc } = makeApp();
    const res = await request(app).get('/api/recipes/31');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(RECIPE);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('get_catalog_recipe', { p_id: 31 });
  });

  it('404: công thức không tồn tại/không công khai', async () => {
    const { app } = makeApp({ get_catalog_recipe: null });
    const res = await request(app).get('/api/recipes/999999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('BE09 — lỗi chung', () => {
  it.each(['/api/dishes/abc', '/api/dishes/abc/recipes', '/api/recipes/abc'])
    ('400: ID món/công thức phải là số nguyên dương: %s', async path => {
      const { app, rpc } = makeApp();
      const res = await request(app).get(path);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(rpc).not.toHaveBeenCalled();
    });

  it('500: không lộ lỗi DB nội bộ cho client', async () => {
    const { app } = makeApp({ get_catalog_dish: new Error('SECRET: SQL connection failed') });
    const res = await request(app).get('/api/dishes/21');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('SECRET');
  });
});