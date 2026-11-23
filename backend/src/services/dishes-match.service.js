
const RPC_PAGE_SIZE = 500;
const LOOKUP_BATCH_SIZE = 100;
const INGREDIENT_ROWS_PAGE_SIZE = 1000;
// 30 công thức × tối đa 30 nguyên liệu người dùng chọn = 900 dòng, dưới giới hạn 1000 dòng mặc định của PostgREST.
const USER_INGREDIENT_LOOKUP_BATCH_SIZE = 30;

function requireRows(response, label) {
  if (response?.error) throw response.error;
  if (!Array.isArray(response?.data)) throw new Error(`Unexpected ${label} response`);
  return response.data;
}

function positiveId(value, label) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error(`Invalid ${label} from database`);
  return n;
}

function nonnegativeInteger(value, label) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`Invalid ${label} from database`);
  return n;
}

function chunks(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

async function getAllMatches(client, ingredientIds, includePantry) {
  const rows = [];
  let offset = 0;
  while (true) {
    const batch = requireRows(await client.rpc('match_dishes', {
      p_ingredient_ids: ingredientIds,
      p_include_pantry: includePantry,
      p_limit: RPC_PAGE_SIZE,
      p_offset: offset
    }), 'match_dishes');
    if (batch.length > RPC_PAGE_SIZE) throw new Error('DB12 exceeded RPC page size');
    rows.push(...batch);
    if (batch.length < RPC_PAGE_SIZE) break;
    offset += batch.length;
    if (!Number.isSafeInteger(offset)) throw new Error('Dish match offset overflow');
  }
  return rows;
}

// Q4 (docs/api.md 7.3, quy tắc 6): chỉ giữ món mà công thức do RPC chọn chứa ít nhất một nguyên liệu
// NGƯỜI DÙNG chọn. Nguyên liệu tủ bếp cơ bản tự được coi là có KHÔNG tính; chỉ so với `ingredientIds` của request.
async function getRecipesWithUserIngredient(client, recipeIds, ingredientIds) {
  const matching = new Set();
  for (const ids of chunks(recipeIds, USER_INGREDIENT_LOOKUP_BATCH_SIZE)) {
    const rows = requireRows(
      await client.from('ct_nguyen_lieu')
        .select('ma_ct,ma_nl')
        .in('ma_ct', ids)
        .in('ma_nl', ingredientIds),
      'user ingredient recipes'
    );
    for (const row of rows) matching.add(positiveId(row.ma_ct, 'recipe ID'));
  }
  return matching;
}

async function getImageUrls(client, dishIds) {
  const images = new Map();
  for (const ids of chunks(dishIds, LOOKUP_BATCH_SIZE)) {
    const rows = requireRows(
      await client.from('mon_an').select('ma_mon,hinh_anh').in('ma_mon', ids),
      'mon_an images'
    );
    for (const row of rows) {
      if (row.hinh_anh !== null && row.hinh_anh !== undefined && typeof row.hinh_anh !== 'string') {
        throw new Error('Invalid image URL from database');
      }
      images.set(positiveId(row.ma_mon, 'dish ID'), row.hinh_anh ?? null);
    }
  }
  return images;
}

async function getIngredientCounts(client, recipeIds) {
  const counts = new Map();
  for (const ids of chunks(recipeIds, LOOKUP_BATCH_SIZE)) {
    // Query all ingredient rows in pages; do not rely on PostgREST's default max_rows.
    let offset = 0;
    while (true) {
      const rows = requireRows(await client.from('ct_nguyen_lieu')
        .select('ma_ct,ma_nl')
        .in('ma_ct', ids)
        .order('ma_ct', { ascending: true })
        .order('ma_nl', { ascending: true })
        .range(offset, offset + INGREDIENT_ROWS_PAGE_SIZE - 1), 'recipe ingredients');
      if (rows.length > INGREDIENT_ROWS_PAGE_SIZE) throw new Error('Ingredient page too large');
      for (const row of rows) {
        const recipeId = positiveId(row.ma_ct, 'recipe ID');
        positiveId(row.ma_nl, 'ingredient ID');
        counts.set(recipeId, (counts.get(recipeId) ?? 0) + 1);
      }
      if (rows.length < INGREDIENT_ROWS_PAGE_SIZE) break;
      offset += rows.length;
    }
  }
  return counts;
}

function adaptRow(row, images, counts) {
  if (!row || typeof row !== 'object') throw new Error('Malformed DB12 match row');
  const id = positiveId(row.ma_mon, 'dish ID');
  const recipeId = row.ma_ct == null ? null : positiveId(row.ma_ct, 'recipe ID');
  if (typeof row.ten_mon !== 'string' || row.ten_mon.length === 0) {
    throw new Error('Malformed dish name');
  }
  if (typeof row.is_incomplete !== 'boolean') throw new Error('Malformed completeness flag');

  const missingCount = nonnegativeInteger(row.missing_count, 'missing_count');
  if (!Array.isArray(row.missing_ingredients)) throw new Error('Malformed missing_ingredients');
  const missing = row.missing_ingredients.map(item => {
    if (typeof item?.ten_nl !== 'string' || !['PRIMARY', 'SECONDARY'].includes(item.role)) {
      throw new Error('Malformed missing ingredient');
    }
    return {
      id: positiveId(item.ma_nl, 'missing ingredient ID'),
      name: item.ten_nl,
      role: item.role
    };
  });
  if (missing.length !== missingCount) throw new Error('DB12 missing_count mismatch');

  const percent = row.match_percent === null ? null : Number(row.match_percent);
  if (percent !== null && (!Number.isFinite(percent) || percent < 0 || percent > 100)) {
    throw new Error('Invalid DB12 match_percent');
  }
  const rawReadiness = row.readiness;
  if (!['COOK_NOW', 'READY', 'MISSING_1_2', 'NEED_SHOPPING', 'INCOMPLETE'].includes(rawReadiness)) {
    throw new Error('Unknown DB12 readiness');
  }
  const isIncomplete = row.is_incomplete || rawReadiness === 'INCOMPLETE' || recipeId === null;
  // Món chưa đầy đủ: readiness tính theo số nguyên liệu thiếu (docs/api.md 7.3, quy tắc 3); is_incomplete vẫn là true.
  const readiness = isIncomplete
    ? (missingCount === 0 ? 'READY' : missingCount <= 2 ? 'MISSING_1_2' : 'NEED_SHOPPING')
    : rawReadiness === 'COOK_NOW' ? 'READY' : rawReadiness;
  const totalCount = recipeId === null ? 0 : counts.get(recipeId) ?? 0;
  if (totalCount < missingCount) throw new Error('Insufficient ingredient count metadata');

  return {
    id,
    name: row.ten_mon,
    image_url: images.get(id) ?? null,
    match_ratio: percent === null ? 0 : Number((percent / 100).toFixed(4)),
    have_count: totalCount - missingCount,
    total_count: totalCount,
    missing,
    readiness,
    is_incomplete: isIncomplete
  };
}

export function createDishesMatchService(client) {
  return {
    async matchDishes({ ingredientIds, includePantry }) {
      const rows = await getAllMatches(client, ingredientIds, includePantry);
      if (rows.length === 0) return [];

      // Lọc Q4 trước khi tra ảnh và số nguyên liệu, để không truy vấn cho các món bị loại.
      const candidateRecipeIds = [...new Set(rows.filter(row => row.ma_ct != null)
        .map(row => positiveId(row.ma_ct, 'recipe ID')))];
      const recipesWithUserIngredient = await getRecipesWithUserIngredient(client, candidateRecipeIds, ingredientIds);
      const kept = rows.filter(row => row.ma_ct != null && recipesWithUserIngredient.has(Number(row.ma_ct)));
      if (kept.length === 0) return [];

      const dishIds = [...new Set(kept.map(row => positiveId(row.ma_mon, 'dish ID')))];
      const recipeIds = [...new Set(kept.map(row => positiveId(row.ma_ct, 'recipe ID')))];
      const [images, counts] = await Promise.all([
        getImageUrls(client, dishIds),
        getIngredientCounts(client, recipeIds)
      ]);
      // Giữ nguyên thứ tự của RPC: món đủ dữ liệu trước, rồi % khớp giảm dần, ít thiếu hơn, rồi id (docs/api.md 7.3).
      return kept.map(row => adaptRow(row, images, counts));
    }
  };
}
