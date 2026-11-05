import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Bảo mật HTTP Headers
  app.use(helmet());

  // Cấu hình CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Cho phép các request không có origin (server-to-server, curl, Postman, test)
        if (!origin) return callback(null, true);
        if (env.corsOriginsList.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS_NOT_ALLOWED'));
      },
      allowedHeaders: ['Authorization', 'Content-Type'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );

  // Parse JSON body với giới hạn dung lượng 100kb
  app.use(express.json({ limit: '100kb' }));

  // Endpoint kiểm tra sức khỏe
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Alias /api/health để tương thích ngược
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Gắn router nghiệp vụ
  app.use('/api', apiRouter);

  // Xử lý 404 cho route không tồn tại
  app.use(notFoundHandler);

  // Xử lý lỗi tập trung
  app.use(errorHandler);

  return app;
}

export default createApp();
