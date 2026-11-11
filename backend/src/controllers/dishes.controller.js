import { createDishesService } from '../services/dishes.service.js'

export function createDishesController(client) {
  const service = createDishesService(client)

  const validationError = (res, field, message) => {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: [{ field, message }]
      }
    })
  }

  const parsePositiveInteger = (value, defaultValue) => {
    if (value === undefined) return defaultValue

    if (
      typeof value !== 'string' ||
      !/^\d+$/.test(value)
    ) {
      return null
    }

    const number = Number(value)

    if (!Number.isSafeInteger(number) || number < 1) {
      return null
    }

    return number
  }

  return {
    async getDishes(req, res) {
      try {
        const { search } = req.query

        if (search !== undefined && typeof search !== 'string') {
          return validationError(
            res,
            'search',
            'Từ khóa tìm kiếm không hợp lệ'
          )
        }

        const page = parsePositiveInteger(req.query.page, 1)
        const limit = parsePositiveInteger(req.query.limit, 20)

        if (page === null) {
          return validationError(
            res,
            'page',
            'page phải là số nguyên dương'
          )
        }

        if (limit === null || limit > 50) {
          return validationError(
            res,
            'limit',
            'limit phải từ 1 đến 50'
          )
        }

        const result = await service.getDishes({
          search: search?.trim() || '',
          page,
          limit
        })

        return res.status(200).json(result)

      } catch (error) {
        console.error('Get dishes error:', error)

        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Lỗi máy chủ'
          }
        })
      }
    }
  }
}