import { Router } from 'express';
import { postsRouter } from './posts.routes.js';
import { dishesRouter } from './dishes.routes.js';

export const apiRouter = Router();

apiRouter.use('/posts', postsRouter);
apiRouter.use('/dishes', dishesRouter);

