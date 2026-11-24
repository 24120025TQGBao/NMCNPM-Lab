import { AppError } from '../utils/AppError.js';

const INTERNAL_MESSAGE = 'Đã xảy ra lỗi hệ thống khi gợi ý nguyên liệu';
const RPC_PAGE_SIZE = 500; // tối đa của match_dishes
const RECIPE_LOOKUP_BATCH = 30; // 30 công thức × tối đa 30 nguyên liệu < 1000 dòng mặc định của PostgREST
const MAX_RESULTS = 10;

function internalError(context, error) {
  // Chỉ ghi log phía server; không đưa chi tiết DB ra response.
  console.error(`[SUGGEST-NEXT SERVICE ERROR] ${context}`, error);
  return new AppError(500, 'INTERNAL_ERROR', INTERNAL_MESSAGE);
}

function chunks(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

// Lấy mọi món bằng đúng quy tắc gọi của docs/api.md mục 7.3: luôn truyền p_include_pantry,
// p_limit = 500; chỉ gọi thêm trang khi trang trước đầy.
async function getAllMatches(client, ingredientIds, includePantry) {
  const rows = [];
  for (let offset = 0; ; offset += RPC_PAGE_SIZE) {
    const { data, error } = await client.rpc('match_dishes', {
      p_ingredient_ids: ingredientIds,
      p_include_pantry: includePantry,
      p_limit: RPC_PAGE_SIZE,
      p_offset: offset
    });

    if (error) {
      // ID nguyên liệu không tồn tại (hoặc null): lỗi do người gọi, không phải lỗi máy chủ.
      if (error.code === '22023') {
        throw new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', [
          { field: 'ingredients', message: 'Danh sách nguyên liệu chứa ID không tồn tại' }
        ]);
      }
      throw internalError('match_dishes', error);
    }
    if (!Array.isArray(data)) throw internalError('match_dishes', new Error('RPC returned a non-array result'));

    rows.push(...data);
    if (data.length < RPC_PAGE_SIZE) return rows;
  }
}

// Quy tắc Q4 (7.3, quy tắc 6): chỉ giữ món có công thức do RPC chọn chứa ít nhất một nguyên liệu
// NGƯỜI DÙNG chọn; nguyên liệu tủ bếp tự được coi là có không tính.
async function recipesWithUserIngredient(client, recipeIds, ingredientIds) {
  const matching = new Set();
  for (const batch of chunks(recipeIds, RECIPE_LOOKUP_BATCH)) {
    const { data, error } = await client
      .from('ct_nguyen_lieu')
      .select('ma_ct, ma_nl')
      .in('ma_ct', batch)
      .in('ma_nl', ingredientIds);
    if (error) throw internalError('ct_nguyen_lieu', error);
    if (!Array.isArray(data)) throw internalError('ct_nguyen_lieu', new Error('Non-array result'));
    for (const row of data) matching.add(row.ma_ct);
  }
  return matching;
}

/**
 * Gợi ý nguyên liệu nên mua thêm (BE12, docs/api.md mục 7.8). Không có RPC riêng: gọi `match_dishes`
 * một lần, giữ món thiếu đúng 1 nguyên liệu và đủ dữ liệu, lọc theo Q4, rồi gom theo nguyên liệu thiếu.
 * Không viết lại công thức đối sánh trong Node.
 */
export function createSuggestNextService(client) {
  return {
    async suggestNext({ ingredients, pantry }) {
      const rows = await getAllMatches(client, ingredients, pantry);

      const oneAway = rows.filter(
        row => row.missing_count === 1 && row.is_incomplete === false && Number.isInteger(row.ma_ct)
      );
      if (oneAway.length === 0) return [];

      const eligibleRecipes = await recipesWithUserIngredient(
        client,
        [...new Set(oneAway.map(row => row.ma_ct))],
        ingredients
      );

      const byIngredient = new Map();
      for (const row of oneAway) {
        if (!eligibleRecipes.has(row.ma_ct)) continue;

        const missing = row.missing_ingredients;
        if (!Array.isArray(missing) || missing.length !== 1 || !Number.isInteger(missing[0]?.ma_nl)) {
          throw internalError('match_dishes', new Error('missing_count = 1 but missing_ingredients is malformed'));
        }
        const { ma_nl: id, ten_nl: name } = missing[0];
        if (!byIngredient.has(id)) byIngredient.set(id, { ingredient: { id, name }, dishIds: new Set() });
        byIngredient.get(id).dishIds.add(row.ma_mon);
      }

      return [...byIngredient.values()]
        .map(({ ingredient, dishIds }) => ({
          ingredient,
          unlock_count: dishIds.size,
          dish_ids: [...dishIds].sort((a, b) => a - b)
        }))
        .sort((a, b) => b.unlock_count - a.unlock_count || a.ingredient.id - b.ingredient.id)
        .slice(0, MAX_RESULTS);
    }
  };
}
