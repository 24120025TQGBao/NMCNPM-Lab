import { AppError } from '../utils/AppError.js';
import { slugToTagCode, tagCodeToSlug } from '../utils/tagCodes.js';

const INTERNAL_MESSAGE = 'Đã xảy ra lỗi hệ thống khi gợi ý món';

function internalError(context, error) {
  // Chỉ ghi log phía server; không đưa chi tiết DB ra response.
  console.error(`[SUGGESTIONS SERVICE ERROR] ${context}`, error);
  return new AppError(500, 'INTERNAL_ERROR', INTERNAL_MESSAGE);
}

async function query(context, builder) {
  const { data, error } = await builder;
  if (error) throw internalError(context, error);
  if (!Array.isArray(data)) throw internalError(context, new Error('Supabase returned a non-array result'));
  return data;
}

// Giống `search_dishes` của DB: món đủ điều kiện gợi ý phải có ảnh và mô tả không rỗng (Q16).
function hasText(value) {
  return typeof value === 'string' && /\S/.test(value);
}

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Gợi ý món (BE08).
 * - Chỉ món ACTIVE có ảnh và mô tả không rỗng; lọc AND theo tất cả `the` (mã API, ánh xạ sang tag.slug); loại các id trong `exclude`; lọc `vung_mien`.
 * - Không bao giờ nới điều kiện: hết món thì trả mảng rỗng (QĐ 1.2).
 * - `random`: xáo trong backend; ngược lại sắp xếp ổn định theo id tăng dần.
 * - `flavor` luôn null cho đến khi chốt nguồn dữ liệu (docs/api.md mục 7.9).
 * - `cook_time_minutes` = MIN thời gian các công thức ACTIVE của món, null nếu không có.
 */
export function createSuggestionsService(client, { random = Math.random } = {}) {
  async function findDishIdsWithAllTags(codes) {
    const slugs = codes.map(tagCodeToSlug);
    const tags = await query('tag', client.from('tag').select('ma_tag, slug').in('slug', slugs));
    // Có mã chưa tồn tại trong bảng tag (ví dụ DA04 chưa nạp): không món nào thỏa AND.
    const tagIds = [...new Set(tags.map(row => row.ma_tag))];
    if (tagIds.length < slugs.length) return new Set();

    const links = await query('mon_an_tag', client.from('mon_an_tag').select('ma_mon, ma_tag').in('ma_tag', tagIds));
    const tagsByDish = new Map();
    for (const { ma_mon: dishId, ma_tag: tagId } of links) {
      if (!tagsByDish.has(dishId)) tagsByDish.set(dishId, new Set());
      tagsByDish.get(dishId).add(tagId);
    }
    return new Set([...tagsByDish].filter(([, set]) => set.size === tagIds.length).map(([dishId]) => dishId));
  }

  async function loadTagCodes(dishIds) {
    const links = await query('mon_an_tag', client.from('mon_an_tag').select('ma_mon, ma_tag').in('ma_mon', dishIds));
    const tagIds = [...new Set(links.map(row => row.ma_tag))];
    const codeById = new Map();
    if (tagIds.length > 0) {
      const tags = await query('tag', client.from('tag').select('ma_tag, slug').in('ma_tag', tagIds));
      for (const row of tags) codeById.set(row.ma_tag, slugToTagCode(row.slug));
    }

    const codesByDish = new Map(dishIds.map(id => [id, []]));
    for (const { ma_mon: dishId, ma_tag: tagId } of links) {
      const code = codeById.get(tagId);
      if (code !== undefined) codesByDish.get(dishId)?.push(code);
    }
    for (const codes of codesByDish.values()) codes.sort();
    return codesByDish;
  }

  async function loadCookTimes(dishIds) {
    const recipes = await query(
      'cong_thuc',
      client.from('cong_thuc').select('ma_mon, thoi_gian_phut').eq('trang_thai', 'ACTIVE').in('ma_mon', dishIds)
    );
    const minByDish = new Map();
    for (const { ma_mon: dishId, thoi_gian_phut: minutes } of recipes) {
      if (!Number.isInteger(minutes)) continue;
      const current = minByDish.get(dishId);
      if (current === undefined || minutes < current) minByDish.set(dishId, minutes);
    }
    return minByDish;
  }

  return {
    async getSuggestions({ exclude, the, random: useRandom, limit, vung_mien: region }) {
      let allowedByTags = null;
      if (the.length > 0) {
        allowedByTags = await findDishIdsWithAllTags(the);
        if (allowedByTags.size === 0) return [];
      }

      let dishesQuery = client
        .from('mon_an')
        .select('ma_mon, ten_mon, mo_ta_ngan, hinh_anh, vung_mien')
        .eq('trang_thai', 'ACTIVE');
      if (region) dishesQuery = dishesQuery.eq('vung_mien', region);
      if (allowedByTags) dishesQuery = dishesQuery.in('ma_mon', [...allowedByTags]);

      const excluded = new Set(exclude);
      const candidates = (await query('mon_an', dishesQuery)).filter(
        dish => hasText(dish.hinh_anh) && hasText(dish.mo_ta_ngan) && !excluded.has(dish.ma_mon)
      );
      if (candidates.length === 0) return [];

      const ordered = useRandom
        ? shuffle(candidates, random)
        : [...candidates].sort((a, b) => a.ma_mon - b.ma_mon);
      const picked = ordered.slice(0, limit);
      const pickedIds = picked.map(dish => dish.ma_mon);

      const [codesByDish, cookTimes] = await Promise.all([loadTagCodes(pickedIds), loadCookTimes(pickedIds)]);

      return picked.map(dish => ({
        id: dish.ma_mon,
        name: dish.ten_mon,
        short_description: dish.mo_ta_ngan ?? null,
        image_url: dish.hinh_anh ?? null,
        cook_time_minutes: cookTimes.get(dish.ma_mon) ?? null,
        flavor: null,
        tags: codesByDish.get(dish.ma_mon) ?? [],
        region: dish.vung_mien ?? null
      }));
    }
  };
}
