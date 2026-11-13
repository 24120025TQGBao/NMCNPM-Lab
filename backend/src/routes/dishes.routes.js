import { Router } from 'express'
import { createDishesController } from '../controllers/dishes.controller.js'

export default function createDishesRouter(client) {
  const router = Router()
  const controller = createDishesController(client)

  router.get('/', controller.getDishes)
  router.get('/search', controller.searchByName)

  return router
}