import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as supabaseLib from '../src/lib/supabase.js';

const AUTH = { Authorization: 'Bearer valid-token' };

const validBody = () => ({
  dish_id: 17,
  title: 'Phở bò nhà làm, nước dùng trong',
  content: 'Công thức phở bò nước trong.',
  ingredients: [
    { ingredient_id: 100, quantity: 500, unit: 'g', role: 'PRIMARY' },
    { name: 'hành tây', quantity: 1, unit: 'củ' },
    { name: 'muối', quantity: null, unit: null }
  ],
  steps: [{ content: 'Chần xương 5 phút.' }, { content: 'Hầm xương 3 tiếng.' }]
});

const createdPost = {
  id: 51,
  title: 'Phở bò nhà làm, nước dùng trong',
  content: 'Công thức phở bò nước trong.',
  created_at: '2026-11-11T09:30:00.000Z',
  dish: { id: 17, name: 'Chả trứng' },
  author: { id: 'user-uuid-1234', display_name: 'Minh' },
  ingredients: [
    { ingredient_id: 100, name: 'Gầu bò', quantity: 500, unit: 'g', role: 'PRIMARY' },
    { ingredient_id: 210, name: 'hành tây', quantity: 1, unit: 'củ', role: 'SECONDARY' },
    { ingredient_id: 211, name: 'muối', quantity: null, unit: null, role: 'SECONDARY' }
  ],
  steps: [
    { order: 1, content: 'Chần xương 5 phút.' },
    { order: 2, content: 'Hầm xương 3 tiếng.' }
  ]
};

describe('POST /api/posts (BE03)', () => {
  let app;

  function mockAuth() {
    vi.spyOn(supabaseLib, 'getAnonClient').mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-uuid-1234' } }, error: null })
      }
    });
  }

  function mockRpc(result) {
    const rpc = vi.fn().mockResolvedValue(result);
    const from = vi.fn();
    const spy = vi.spyOn(supabaseLib, 'createUserClient').mockReturnValue({ rpc, from });
    return { rpc, from, spy };
  }

  const send = (body, headers = AUTH) => request(app).post('/api/posts').set(headers).send(body);
  const fields = res => res.body.error.details.map(d => d.field);

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    app = createApp();
  });

  describe('Xác thực', () => {
    it('Không có token trả 401 UNAUTHORIZED và không gọi DB', async () => {
      const { spy } = mockRpc({ data: createdPost, error: null });
      const res = await send(validBody(), {});
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Tạo bài thành công', () => {
    it('Trả 201 kèm dữ liệu bài vừa tạo và gọi RPC đúng tham số', async () => {
      mockAuth();
      const { rpc } = mockRpc({ data: createdPost, error: null });

      const res = await send(validBody());

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ data: createdPost });
      expect(rpc).toHaveBeenCalledTimes(1);
      const [fn, args] = rpc.mock.calls[0];
      expect(fn).toBe('create_post_with_recipe');
      expect(args.p_dish_id).toBe(17);
      expect(args.p_title).toBe('Phở bò nhà làm, nước dùng trong');
      expect(args.p_ingredients).toHaveLength(3);
      expect(args.p_steps).toHaveLength(2);
    });

    it('Bỏ qua author_id / user_id do client gửi (người đăng lấy từ token)', async () => {
      mockAuth();
      const { rpc } = mockRpc({ data: createdPost, error: null });

      const res = await send({ ...validBody(), author_id: 'hacker-id', user_id: 'hacker-id' });

      expect(res.status).toBe(201);
      expect(JSON.stringify(rpc.mock.calls[0])).not.toContain('hacker-id');
    });

    it('Làm sạch thẻ HTML trong tiêu đề, nguyên liệu và bước nấu', async () => {
      mockAuth();
      const { rpc } = mockRpc({ data: createdPost, error: null });
      const body = validBody();
      body.title = '<b>Phở</b> bò <script>alert(1)</script>';
      body.steps = [{ content: '<img src=x onerror=alert(1)>Chần xương' }];

      const res = await send(body);

      expect(res.status).toBe(201);
      const args = rpc.mock.calls[0][1];
      expect(args.p_title).toBe('Phở bò alert(1)');
      expect(args.p_steps[0].content).toBe('Chần xương');
    });
  });

  describe('Validation trả 400 theo từng trường', () => {
    it('Body rỗng thiếu các trường bắt buộc', async () => {
      mockAuth();
      const { rpc } = mockRpc({ data: null, error: null });
      const res = await send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(fields(res)).toEqual(expect.arrayContaining(['dish_id', 'title', 'ingredients', 'steps']));
      expect(rpc).not.toHaveBeenCalled();
    });

    it('dish_id không phải số nguyên dương (ví dụ UUID)', async () => {
      mockAuth();
      const { rpc } = mockRpc({ data: null, error: null });
      const res = await send({ ...validBody(), dish_id: '11111111-1111-1111-1111-111111111111' });
      expect(res.status).toBe(400);
      expect(fields(res)).toContain('dish_id');
      expect(rpc).not.toHaveBeenCalled();
    });

    it('Tiêu đề quá ngắn hoặc quá dài', async () => {
      mockAuth();
      mockRpc({ data: null, error: null });
      const short = await send({ ...validBody(), title: 'ab' });
      expect(short.status).toBe(400);
      expect(fields(short)).toContain('title');
      const long = await send({ ...validBody(), title: 'a'.repeat(151) });
      expect(long.status).toBe(400);
      expect(fields(long)).toContain('title');
    });

    it('Định lượng không hợp lệ (âm, bằng 0, chuỗi)', async () => {
      mockAuth();
      mockRpc({ data: null, error: null });
      for (const quantity of [-1, 0, 'abc']) {
        const body = validBody();
        body.ingredients[0].quantity = quantity;
        const res = await send(body);
        expect(res.status).toBe(400);
        expect(fields(res)).toContain('ingredients[0].quantity');
      }
    });

    it('Nguyên liệu thiếu cả ingredient_id lẫn name', async () => {
      mockAuth();
      mockRpc({ data: null, error: null });
      const body = validBody();
      body.ingredients = [{ quantity: 1, unit: 'g' }];
      const res = await send(body);
      expect(res.status).toBe(400);
      expect(fields(res)).toContain('ingredients[0].name');
    });

    it('Vai trò nguyên liệu (role) không hợp lệ', async () => {
      mockAuth();
      mockRpc({ data: null, error: null });
      const body = validBody();
      body.ingredients[0].role = 'MAIN';
      const res = await send(body);
      expect(res.status).toBe(400);
      expect(fields(res)).toContain('ingredients[0].role');
    });

    it('Nguyên liệu trùng trong cùng công thức', async () => {
      mockAuth();
      mockRpc({ data: null, error: null });
      const body = validBody();
      body.ingredients = [{ name: 'Muối' }, { name: 'muối' }];
      const res = await send(body);
      expect(res.status).toBe(400);
      expect(fields(res)).toContain('ingredients[1]');
    });

    it('Vượt giới hạn 50 nguyên liệu và 50 bước', async () => {
      mockAuth();
      mockRpc({ data: null, error: null });
      const body = validBody();
      body.ingredients = Array.from({ length: 51 }, (_, i) => ({ ingredient_id: i + 1 }));
      body.steps = Array.from({ length: 51 }, () => ({ content: 'Bước nấu' }));
      const res = await send(body);
      expect(res.status).toBe(400);
      expect(fields(res)).toEqual(expect.arrayContaining(['ingredients', 'steps']));
    });

    it('Bước nấu rỗng', async () => {
      mockAuth();
      mockRpc({ data: null, error: null });
      const body = validBody();
      body.steps = [{ content: '   ' }];
      const res = await send(body);
      expect(res.status).toBe(400);
      expect(fields(res)).toContain('steps[0].content');
    });
  });

  describe('Lỗi từ cơ sở dữ liệu (RPC)', () => {
    it('Món ăn không tồn tại trả 400 tại trường dish_id', async () => {
      mockAuth();
      mockRpc({ data: null, error: { message: 'ERR_DISH_NOT_FOUND' } });
      const res = await send(validBody());
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(fields(res)).toContain('dish_id');
    });

    it('Tài khoản bị khóa trả 403 FORBIDDEN', async () => {
      mockAuth();
      mockRpc({ data: null, error: { message: 'ERR_FORBIDDEN' } });
      const res = await send(validBody());
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Lỗi giữa chừng trả 500, không lộ chi tiết và backend không tự ghi bảng nào', async () => {
      mockAuth();
      const { rpc, from } = mockRpc({ data: null, error: { message: 'boom: secret sql detail' } });
      const res = await send(validBody());
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(res.body)).not.toContain('boom');
      // Toàn bộ việc ghi nằm trong 1 lệnh RPC (1 transaction), backend không ghi lẻ từng bảng
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(from).not.toHaveBeenCalled();
    });
  });
});