import { AppError } from '../utils/AppError.js';

const INTERNAL_MESSAGE = 'Đã xảy ra lỗi hệ thống khi tìm nguyên liệu';

function internalError(context, error) {
  // Chỉ ghi log phía server; không đưa chi tiết DB ra response.
  console.error(`[INGREDIENTS SERVICE ERROR] ${context}`, error);
  return new AppError(500, 'INTERNAL_ERROR', INTERNAL_MESSAGE);
}

/**
 * Tìm nguyên liệu cho autocomplete.
 * Việc bỏ dấu, không phân biệt hoa thường và từ đồng nghĩa do RPC `search_ingredients` (DB11) xử lý;
 * service không tự chuẩn hóa chuỗi tìm kiếm.
 * RPC chỉ trả `ma_nl`, `ten_nl`, nên cờ gia vị cơ bản được lấy bằng một truy vấn thứ hai.
 */
export function createIngredientsService(client) {
  return {
    async searchIngredients({ search, limit }) {
      const { data: found, error: searchError } = await client.rpc('search_ingredients', {
        p_search: search,
        p_limit: limit
      });

      if (searchError) throw internalError('search_ingredients', searchError);
      if (!Array.isArray(found)) {
        throw internalError('search_ingredients', new Error('RPC returned a non-array result'));
      }

      // Giữ nguyên thứ tự RPC, loại trùng id, giữ không quá `limit` phần tử.
      const seen = new Set();
      const ingredients = [];
      for (const row of found) {
        if (!Number.isInteger(row?.ma_nl) || typeof row?.ten_nl !== 'string') {
          throw internalError('search_ingredients', new Error('RPC returned a malformed row'));
        }
        if (seen.has(row.ma_nl)) continue;
        seen.add(row.ma_nl);
        ingredients.push(row);
        if (ingredients.length === limit) break;
      }

      if (ingredients.length === 0) return [];

      const { data: flags, error: flagsError } = await client
        .from('nguyen_lieu')
        .select('ma_nl, la_gia_vi_co_ban')
        .in('ma_nl', ingredients.map(row => row.ma_nl));

      if (flagsError) throw internalError('nguyen_lieu.la_gia_vi_co_ban', flagsError);

      const pantryById = new Map((flags ?? []).map(row => [row.ma_nl, row.la_gia_vi_co_ban === true]));

      return ingredients.map(row => ({
        id: row.ma_nl,
        name: row.ten_nl,
        is_basic_pantry: pantryById.get(row.ma_nl) ?? false
      }));
    }
  };
}
