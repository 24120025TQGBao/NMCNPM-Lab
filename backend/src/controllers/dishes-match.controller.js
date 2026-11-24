import { createDishesMatchService } from '../services/dishes-match.service.js';

function parseIngredients(raw, details) {
  if (typeof raw !== 'string' || raw.length === 0) {
    details.push({ field: 'ingredients', message: 'Cần chọn ít nhất 1 nguyên liệu' });
    return [];
  }

  const parts = raw.split(',');
  if (parts.length > 300 || parts.some(id => !/^[1-9][0-9]*$/.test(id))) {
    details.push({ field: 'ingredients', message: 'ingredients phải là danh sách ID nguyên dương cách nhau bằng dấu phẩy' });
    return [];
  }
  const ids = [...new Set(parts.map(Number))];
  if (ids.some(id => !Number.isSafeInteger(id)) || ids.length < 1 || ids.length > 30) {
    details.push({ field: 'ingredients', message: 'ingredients phải có từ 1 đến 30 ID nguyên liệu hợp lệ' });
    return [];
  }
  return ids;
}

function parsePantry(raw, details) {
  if (raw === undefined) return true;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  details.push({ field: 'pantry', message: 'pantry chỉ nhận true hoặc false' });
  return null;
}

function validationError(res, details) {
  return res.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details }
  });
}

export function createDishesMatchController(client) {
  const service = createDishesMatchService(client);
  return {
    async matchDishes(req, res) {
      const details = [];
      const ingredientIds = parseIngredients(req.query.ingredients, details);
      const includePantry = parsePantry(req.query.pantry, details);
      if (details.length) return validationError(res, details);

      try {
        const data = await service.matchDishes({ ingredientIds, includePantry });
        return res.status(200).json({ data });
      } catch (error) {
        // DB12 rejects unknown canonical ingredient IDs with SQLSTATE 22023.
        if (error?.code === '22023') return validationError(res, [
          { field: 'ingredients', message: 'Danh sách nguyên liệu chứa ID không tồn tại' }
        ]);
        console.error('[BE10 dishes/match] error:', error);
        return res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' }
        });
      }
    }
  };
}
