import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

// RPC `search_ingredients` (DB11) chỉ trả ma_nl, ten_nl và tự xử lý dấu/đồng nghĩa.
// Test dùng client giả: kiểm tra backend truyền nguyên tham số cho RPC và ghép cờ gia vị đúng.
function createClient({ rpcResult = { data: [], error: null }, flagsResult = { data: [], error: null } } = {}) {
  const query = {};
  query.select = vi.fn(() => query);
  query.in = vi.fn().mockResolvedValue(flagsResult);

  return {
    client: {
      rpc: vi.fn().mockResolvedValue(rpcResult),
      from: vi.fn(() => query)
    },
    query
  };
}

function appWith(options) {
  const mocks = createClient(options);
  return { ...mocks, app: createApp({ ingredientsClient: mocks.client }) };
}

describe('GET /api/ingredients', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('search and result shape', () => {
    it('is public and returns { id, name, is_basic_pantry } in the envelope without meta', async () => {
      const { app, client, query } = appWith({
        rpcResult: { data: [{ ma_nl: 46, ten_nl: 'Cà chua' }], error: null },
        flagsResult: { data: [{ ma_nl: 46, la_gia_vi_co_ban: false }], error: null }
      });

      const response = await request(app).get('/api/ingredients?search=Cà chua');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [{ id: 46, name: 'Cà chua', is_basic_pantry: false }] });
      expect(client.rpc).toHaveBeenCalledWith('search_ingredients', { p_search: 'Cà chua', p_limit: 8 });
      expect(client.from).toHaveBeenCalledWith('nguyen_lieu');
      expect(query.select).toHaveBeenCalledWith('ma_nl, la_gia_vi_co_ban');
      expect(query.in).toHaveBeenCalledWith('ma_nl', [46]);
    });

    it('passes accented, unaccented and mixed-case input to the RPC unchanged (no Node-side normalization)', async () => {
      for (const term of ['cà chua', 'ca chua', 'CÀ CHUA']) {
        const { app, client } = appWith({
          rpcResult: { data: [{ ma_nl: 46, ten_nl: 'Cà chua' }], error: null },
          flagsResult: { data: [{ ma_nl: 46, la_gia_vi_co_ban: false }], error: null }
        });

        const response = await request(app).get('/api/ingredients').query({ search: term });

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual([{ id: 46, name: 'Cà chua', is_basic_pantry: false }]);
        expect(client.rpc).toHaveBeenCalledWith('search_ingredients', { p_search: term, p_limit: 8 });
      }
    });

    it('returns the canonical ingredient when the RPC resolves a synonym', async () => {
      const { app, client } = appWith({
        rpcResult: { data: [{ ma_nl: 28, ten_nl: 'Hành lá' }], error: null },
        flagsResult: { data: [{ ma_nl: 28, la_gia_vi_co_ban: false }], error: null }
      });

      const response = await request(app).get('/api/ingredients').query({ search: 'hành xanh' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([{ id: 28, name: 'Hành lá', is_basic_pantry: false }]);
      expect(client.rpc).toHaveBeenCalledWith('search_ingredients', { p_search: 'hành xanh', p_limit: 8 });
    });

    it('marks pantry staples from nguyen_lieu.la_gia_vi_co_ban and keeps the RPC order', async () => {
      const { app } = appWith({
        rpcResult: {
          data: [
            { ma_nl: 144, ten_nl: 'Hành' },
            { ma_nl: 5, ten_nl: 'Dầu ăn' },
            { ma_nl: 28, ten_nl: 'Hành lá' }
          ],
          error: null
        },
        flagsResult: {
          data: [
            { ma_nl: 28, la_gia_vi_co_ban: false },
            { ma_nl: 5, la_gia_vi_co_ban: true },
            { ma_nl: 144, la_gia_vi_co_ban: false }
          ],
          error: null
        }
      });

      const response = await request(app).get('/api/ingredients?search=h');

      expect(response.body.data).toEqual([
        { id: 144, name: 'Hành', is_basic_pantry: false },
        { id: 5, name: 'Dầu ăn', is_basic_pantry: true },
        { id: 28, name: 'Hành lá', is_basic_pantry: false }
      ]);
    });

    it('treats a missing flag row as not a pantry staple', async () => {
      const { app } = appWith({
        rpcResult: { data: [{ ma_nl: 46, ten_nl: 'Cà chua' }], error: null },
        flagsResult: { data: [], error: null }
      });

      const response = await request(app).get('/api/ingredients?search=ca');

      expect(response.body.data[0].is_basic_pantry).toBe(false);
    });

    it('does not repeat an ingredient the RPC returns twice', async () => {
      const { app, query } = appWith({
        rpcResult: {
          data: [
            { ma_nl: 28, ten_nl: 'Hành lá' },
            { ma_nl: 28, ten_nl: 'Hành lá' },
            { ma_nl: 144, ten_nl: 'Hành' }
          ],
          error: null
        },
        flagsResult: { data: [], error: null }
      });

      const response = await request(app).get('/api/ingredients?search=hanh');

      expect(response.body.data.map(item => item.id)).toEqual([28, 144]);
      expect(query.in).toHaveBeenCalledWith('ma_nl', [28, 144]);
    });
  });

  describe('empty results', () => {
    it('returns 200 and [] when nothing matches, without querying pantry flags', async () => {
      const { app, client } = appWith({ rpcResult: { data: [], error: null } });

      const response = await request(app).get('/api/ingredients?search=xyz');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
      expect(client.from).not.toHaveBeenCalled();
    });
  });

  describe('search validation (400, never reaches the database)', () => {
    it.each([
      ['search is missing', ''],
      ['search is empty', '?search='],
      ['search is only whitespace', '?search=%20%20%20'],
      ['search is longer than 50 characters', `?search=${'a'.repeat(51)}`],
      ['search is repeated', '?search=a&search=b']
    ])('returns 400 when %s', async (_name, queryString) => {
      const { app, client } = appWith();

      const response = await request(app).get(`/api/ingredients${queryString}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.map(detail => detail.field)).toContain('search');
      expect(client.rpc).not.toHaveBeenCalled();
      expect(client.from).not.toHaveBeenCalled();
    });

    it('accepts search of exactly 50 characters and trims surrounding whitespace', async () => {
      const { app, client } = appWith();

      const response = await request(app).get('/api/ingredients').query({ search: `  ${'a'.repeat(50)}  ` });

      expect(response.status).toBe(200);
      expect(client.rpc).toHaveBeenCalledWith('search_ingredients', { p_search: 'a'.repeat(50), p_limit: 8 });
    });
  });

  describe('limit', () => {
    it('defaults to 8', async () => {
      const { app, client } = appWith();

      await request(app).get('/api/ingredients?search=ca');

      expect(client.rpc).toHaveBeenCalledWith('search_ingredients', { p_search: 'ca', p_limit: 8 });
    });

    it.each(['1', '20'])('accepts limit=%s', async value => {
      const { app, client } = appWith();

      const response = await request(app).get(`/api/ingredients?search=ca&limit=${value}`);

      expect(response.status).toBe(200);
      expect(client.rpc).toHaveBeenCalledWith('search_ingredients', { p_search: 'ca', p_limit: Number(value) });
    });

    it.each(['21', '0', '-1', 'abc', '2.5', '', '1&limit=2'])('returns 400 for limit=%s', async value => {
      const { app, client } = appWith();

      const response = await request(app).get(`/api/ingredients?search=ca&limit=${value}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.map(detail => detail.field)).toContain('limit');
      expect(client.rpc).not.toHaveBeenCalled();
    });

    it('never returns more than limit items even if the RPC does', async () => {
      const { app } = appWith({
        rpcResult: {
          data: [
            { ma_nl: 1, ten_nl: 'A' },
            { ma_nl: 2, ten_nl: 'B' },
            { ma_nl: 3, ten_nl: 'C' }
          ],
          error: null
        },
        flagsResult: { data: [], error: null }
      });

      const response = await request(app).get('/api/ingredients?search=a&limit=2');

      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('errors', () => {
    it('returns 500 without leaking database details when the RPC fails', async () => {
      const { app } = appWith({
        rpcResult: { data: null, error: { message: 'relation "nguyen_lieu" secret detail', code: '42501' } }
      });

      const response = await request(app).get('/api/ingredients?search=ca');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(response.body)).not.toMatch(/nguyen_lieu|secret|42501/);
    });

    it('returns 500 without leaking details when reading pantry flags fails', async () => {
      const { app } = appWith({
        rpcResult: { data: [{ ma_nl: 46, ten_nl: 'Cà chua' }], error: null },
        flagsResult: { data: null, error: { message: 'permission denied for table nguyen_lieu', code: '42501' } }
      });

      const response = await request(app).get('/api/ingredients?search=ca');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(response.body)).not.toMatch(/permission|nguyen_lieu|42501/);
    });

    it('returns 500 when the RPC result is not an array', async () => {
      const { app } = appWith({ rpcResult: { data: { unexpected: true }, error: null } });

      const response = await request(app).get('/api/ingredients?search=ca');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  it('ignores an Authorization header (endpoint is public)', async () => {
    const { app } = appWith({
      rpcResult: { data: [{ ma_nl: 46, ten_nl: 'Cà chua' }], error: null },
      flagsResult: { data: [{ ma_nl: 46, la_gia_vi_co_ban: false }], error: null }
    });

    const response = await request(app)
      .get('/api/ingredients?search=ca')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(response.status).toBe(200);
  });
});
