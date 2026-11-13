import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[SERVER] Đang chạy tại http://localhost:${env.PORT} (Môi trường: ${env.NODE_ENV})`);
});
