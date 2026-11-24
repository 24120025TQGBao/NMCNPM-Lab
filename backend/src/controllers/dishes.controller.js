import { createDishesService } from '../services/dishes.service.js'

function parsePositiveInteger(value, defaultValue, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return defaultValue
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null

  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) return null
  return parsed
}

export function createDishesController(client) {
  const service = createDishesService(client)

  function validationError(res, details) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details
      }
    })
  }

  async function listDishes(req, res, searchParam) {
    const details = []
    const rawSearch = req.query[searchParam]
    let search = null

    if (rawSearch !== undefined) {
      if (typeof rawSearch !== 'string') {
        details.push({ field: 'search', message: 'Từ khóa tìm kiếm không hợp lệ' })
      } else {
        search = rawSearch.trim()
        if (search.length > 100) {
          details.push({ field: 'search', message: 'Từ khóa tìm kiếm tối đa 100 ký tự' })
        }
        if (!search) search = null
      }
    }

    const page = parsePositiveInteger(req.query.page, 1)
    if (page === null) details.push({ field: 'page', message: 'page phải là số nguyên dương' })

    const limit = parsePositiveInteger(req.query.limit, 20, 50)
    if (limit === null) details.push({ field: 'limit', message: 'limit phải từ 1 đến 50' })

    if (details.length) return validationError(res, details)

    try {
      const result = await service.getDishes({ search, page, limit })
      return res.status(200).json({
        data: result.data,
        meta: { page, limit, total: result.total }
      })
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

  return {
    getDishes(req, res) {
      return listDishes(req, res, 'search')
    },

    searchByName(req, res) {
      return listDishes(req, res, 'q')
    }
  }
}
