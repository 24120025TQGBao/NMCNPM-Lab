import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import * as supabaseLib from '../src/lib/supabase.js';
import { requireAuth } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

describe('Express Scaffolding & Middleware Tests (BE02)', () => {
  let app;

  beforeEach(() => {
    vi.restoreAllMocks();
    app = createApp();
  });

  describe('1. Health check & route cơ bản', () => {
    it('GET /health phải trả về 200 { status: "ok" }', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('GET /api/health phải trả về 200 { status: "ok" }', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('Truy cập route không tồn tại phải trả về 404 NOT_FOUND theo contract', async () => {
      const res = await request(app).get('/api/unknown-route');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: expect.any(String)
        }
      });
    });
  });

  describe('2. Xử lý lỗi tập trung & định dạng lỗi', () => {
    it('Gửi body JSON hỏng phải trả về 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Content-Type', 'application/json')
        .send('{ "dish_id": "bad-json-syntax", ');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Lỗi hệ thống bất ngờ phải trả về 500 INTERNAL_ERROR và không làm lộ stack trace', async () => {
      const errorApp = express();
      errorApp.get('/error', () => {
        throw new Error('Secret database credentials leaked!');
      });
      errorApp.use(errorHandler);

      const res = await request(errorApp).get('/error');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Đã xảy ra lỗi hệ thống'
        }
      });
      expect(JSON.stringify(res.body)).not.toContain('Secret database credentials leaked!');
    });
  });

  describe('3. Middleware xác thực requireAuth', () => {
    let authTestApp;

    beforeEach(() => {
      authTestApp = express();
      authTestApp.use(express.json());
      authTestApp.get('/test/protected', requireAuth, (req, res) => {
        res.json({ message: 'success', userId: req.auth.userId });
      });
      authTestApp.use(errorHandler);
    });

    it('Không có header Authorization phải trả về 401 UNAUTHORIZED', async () => {
      const res = await request(authTestApp).get('/test/protected');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('Header Authorization sai định dạng (không có Bearer) phải trả về 401', async () => {
      const res = await request(authTestApp)
        .get('/test/protected')
        .set('Authorization', 'Basic 123456');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('Token bị Supabase từ chối phải trả về 401 UNAUTHORIZED', async () => {
      vi.spyOn(supabaseLib, 'getAnonClient').mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Token expired') })
        }
      });

      const res = await request(authTestApp)
        .get('/test/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('Token hợp lệ phải qua được middleware và trích xuất đúng req.auth.userId', async () => {
      vi.spyOn(supabaseLib, 'getAnonClient').mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-uuid-1234' } },
            error: null
          })
        }
      });

      const res = await request(authTestApp)
        .get('/test/protected')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'success',
        userId: 'user-uuid-1234'
      });
    });
  });
});
