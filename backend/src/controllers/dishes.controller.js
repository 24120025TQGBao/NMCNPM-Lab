import { createDishesService } from '../services/dishes.service.js';

const FLAVORS = new Set(['MAN', 'CAY', 'NGOT', 'CHUA', 'THANH']);
const TAGS = new Set(['TROI_MUA', 'LUOI_NAU', 'CUOI_THANG', 'NAU_CHO_4', 'AN_NHE']);

function positiveInteger(raw, fallback, max = Number.MAX_SAFE_INTEGER) {
  if (raw === undefined) return fallback;
  if (typeof raw !== 'string' || !/^[0-9]+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : null;
}

function csv(raw, field, max, valid, details) {
  if (raw === undefined || raw === '') return [];
  if (typeof raw !== 'string' || /\s/.test(raw)) {
    details.push({ field, message: `${field} phải là danh sách cách nhau bằng dấu phẩy, không có khoảng trắng` });
    return [];
  }
  const parts = raw.split(',');
  if (parts.length > max || parts.some(value => !valid(value))) {
    details.push({ field, message: `${field} chứa giá trị không hợp lệ hoặc vượt quá ${max} phần tử` });
    return [];
  }
  return [...new Set(parts)];
}

function invalid(res, details) {
  return res.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details }
  });
}

function serverError(res, error) {
  console.error('[BE09 dishes] database error:', error);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' } });
}

function idFromParams(req, res) {
  const id = positiveInteger(req.params.id, null);
  if (id === null) {
    invalid(res, [{ field: 'id', message: 'id phải là số nguyên dương' }]);
  }
  return id;
}

export function createDishesController(client) {
  const service = createDishesService(client);

  async function list(req, res, searchParameter) {
    const details = [];
    const rawSearch = req.query[searchParameter];
    let search = null;
    if (rawSearch !== undefined) {
      if (typeof rawSearch !== 'string' || rawSearch.trim().length > 100) {
        details.push({ field: searchParameter, message: 'Từ khóa tìm kiếm phải là chuỗi tối đa 100 ký tự' });
      } else search = rawSearch.trim() || null;
    }

    const page = positiveInteger(req.query.page, 1);
    if (page === null) details.push({ field: 'page', message: 'page phải là số nguyên dương' });
    const limit = positiveInteger(req.query.limit, 20, 50);
    if (limit === null) details.push({ field: 'limit', message: 'limit phải từ 1 đến 50' });

    const tags = csv(req.query.the, 'the', 5, value => TAGS.has(value), details);
    const ingredients = csv(req.query.ingredients, 'ingredients', 20,
      value => positiveInteger(value, null) !== null && value[0] !== '0', details).map(Number);

    const rawFlavor = req.query.flavor;
    let flavor = null;
    if (rawFlavor !== undefined) {
      if (typeof rawFlavor !== 'string' || !FLAVORS.has(rawFlavor)) {
        details.push({ field: 'flavor', message: 'flavor phải là MAN, CAY, NGOT, CHUA hoặc THANH' });
      } else flavor = rawFlavor;
    }

    // Optional catalog type; resolved via thuoc_tinh_mon (not a new mon_an column).
    const rawCategory = req.query.category;
    let category = null;
    if (rawCategory !== undefined) {
      if (typeof rawCategory !== 'string' || !/^[A-Z][A-Z0-9_]{0,49}$/.test(rawCategory)) {
        details.push({ field: 'category', message: 'category phải là mã in hoa, tối đa 50 ký tự' });
      } else category = rawCategory;
    }

    let maxCookTime = null;
    if (req.query.max_cook_time !== undefined) {
      maxCookTime = positiveInteger(req.query.max_cook_time, null, 1440);
      if (maxCookTime === null) details.push({ field: 'max_cook_time', message: 'max_cook_time phải từ 1 đến 1440 phút' });
    }
    if (details.length) return invalid(res, details);

    try {
      const result = await service.getDishes({ search, page, limit, tags, flavor, category, maxCookTime, ingredients });
      return res.status(200).json({ data: result.data, meta: { page, limit, total: result.total } });
    } catch (error) {
      if (error?.code === '22023') return invalid(res, [
        { field: 'ingredients', message: 'Danh sách nguyên liệu chứa ID không tồn tại hoặc không hợp lệ' }
      ]);
      return serverError(res, error);
    }
  }

  return {
    getDishes(req, res) { return list(req, res, 'search'); },
    searchByName(req, res) { return list(req, res, 'q'); },

    async getDishById(req, res) {
      const id = idFromParams(req, res);
      if (id === null) return;
      try {
        const data = await service.getDishById(id);
        if (!data) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy món ăn' } });
        return res.status(200).json({ data });
      } catch (error) { return serverError(res, error); }
    },

    async getRecipeById(req, res) {
      const id = idFromParams(req, res);
      if (id === null) return;
      try {
        const data = await service.getRecipeById(id);
        if (!data) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy công thức' } });
        return res.status(200).json({ data });
      } catch (error) { return serverError(res, error); }
    }
  };
}
