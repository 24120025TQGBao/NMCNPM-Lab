import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as supabaseLib from '../src/lib/supabase.js';

describe('Posts Public Read API Tests (BE04)', () => {
  let app;

  beforeEach(() => {
    vi.restoreAllMocks();
    app = createApp();
  });

  describe('1. GET /api/posts (Bảng tin danh sách bài viết)', () => {
    it('Khách vãng lai gọi không cần token trả về 200 kèm data và meta', async () => {
      const mockPosts = [
        {
          id: '33333333-3333-3333-3333-333333333333',
          title: 'Phở bò gia truyền',
          created_at: '2026-11-06T10:00:00.000Z',
          dish: { id: '11111111-1111-1111-1111-111111111111', name: 'Phở bò' },
          author: { id: '44444444-4444-4444-4444-444444444444', display_name: 'Minh' }
        }
      ];

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockPosts,
          count: 1,
          error: null
        })
      };

      vi.spyOn(supabaseLib, 'getAnonClient').mockReturnValue({
        from: vi.fn().mockReturnValue(queryBuilder)
      });

      const res = await request(app).get('/api/posts?page=1&limit=20');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toEqual({
        id: '33333333-3333-3333-3333-333333333333',
        title: 'Phở bò gia truyền',
        created_at: '2026-11-06T10:00:00.000Z',
        dish: { id: '11111111-1111-1111-1111-111111111111', name: 'Phở bò' },
        author: { id: '44444444-4444-4444-4444-444444444444', display_name: 'Minh' }
      });
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 1 });
      // Không để lộ thông tin riêng tư như email
      expect(JSON.stringify(res.body)).not.toContain('email');
    });

    it('Danh sách rỗng phải trả về 200 và data: [] (không được trả về 404)', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          count: 0,
          error: null
        })
      };

      vi.spyOn(supabaseLib, 'getAnonClient').mockReturnValue({
        from: vi.fn().mockReturnValue(queryBuilder)
      });

      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 0 });
    });

    it('Truyền page hoặc limit sai định dạng/vượt giới hạn phải trả 400 VALIDATION_ERROR', async () => {
      // Limit > 50
      const res1 = await request(app).get('/api/posts?limit=100');
      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe('VALIDATION_ERROR');

      // Page = 0
      const res2 = await request(app).get('/api/posts?page=0');
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('VALIDATION_ERROR');

      // Page không phải số
      const res3 = await request(app).get('/api/posts?page=abc');
      expect(res3.status).toBe(400);
      expect(res3.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. GET /api/posts/:id (Chi tiết bài viết)', () => {
    it('Lấy chi tiết thành công: có đủ nguyên liệu và các bước sắp theo thứ tự tăng dần', async () => {
      const mockDetail = {
        id: '33333333-3333-3333-3333-333333333333',
        title: 'Phở bò nhà làm',
        created_at: '2026-11-06T10:00:00.000Z',
        dish: { id: '11111111-1111-1111-1111-111111111111', name: 'Phở bò' },
        author: { id: '44444444-4444-4444-4444-444444444444', display_name: 'Minh' },
        ingredients: [
          {
            ingredient_id: '22222222-2222-2222-2222-222222222222',
            quantity: 500,
            unit: 'g',
            ingredient: { id: '22222222-2222-2222-2222-222222222222', name: 'Thịt bò' }
          },
          {
            ingredient_id: '55555555-5555-5555-5555-555555555555',
            quantity: null,
            unit: null,
            ingredient: { id: '55555555-5555-5555-5555-555555555555', name: 'Muối' }
          }
        ],
        steps: [
          { step_order: 2, content: 'Ninh xương 3 tiếng' },
          { step_order: 1, content: 'Chần xương sạch' }
        ]
      };

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockDetail,
          error: null
        })
      };

      vi.spyOn(supabaseLib, 'getAnonClient').mockReturnValue({
        from: vi.fn().mockReturnValue(queryBuilder)
      });

      const res = await request(app).get('/api/posts/33333333-3333-3333-3333-333333333333');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('33333333-3333-3333-3333-333333333333');
      expect(res.body.data.ingredients).toHaveLength(2);
      expect(res.body.data.ingredients[0].name).toBe('Thịt bò');
      expect(res.body.data.steps).toHaveLength(2);
      // Kiểm tra bước được sắp xếp theo order tăng dần
      expect(res.body.data.steps[0].order).toBe(1);
      expect(res.body.data.steps[0].content).toBe('Chần xương sạch');
      expect(res.body.data.steps[1].order).toBe(2);
      expect(res.body.data.steps[1].content).toBe('Ninh xương 3 tiếng');
    });

    it('ID không đúng định dạng UUID phải trả về 400 VALIDATION_ERROR', async () => {
      const res = await request(app).get('/api/posts/not-a-valid-uuid');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Bài viết không tồn tại phải trả về 404 NOT_FOUND', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      vi.spyOn(supabaseLib, 'getAnonClient').mockReturnValue({
        from: vi.fn().mockReturnValue(queryBuilder)
      });

      const res = await request(app).get('/api/posts/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('Lỗi cơ sở dữ liệu phải trả về 500 INTERNAL_ERROR và không để lộ chi tiết nội bộ', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Postgres connection failed: role postgres does not exist')
        })
      };

      vi.spyOn(supabaseLib, 'getAnonClient').mockReturnValue({
        from: vi.fn().mockReturnValue(queryBuilder)
      });

      const res = await request(app).get('/api/posts/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(res.body)).not.toContain('Postgres connection failed');
    });
  });
});

