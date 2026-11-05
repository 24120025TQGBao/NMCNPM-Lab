import { getAnonClient } from '../lib/supabase.js';
import { AppError } from '../utils/AppError.js';
import { getPaginationRange } from '../utils/pagination.js';

/**
 * Mapper chuyển đổi dữ liệu bài viết dạng tóm tắt cho bảng tin (feed)
 */
export function mapPostSummary(raw) {
  const dish = raw.dish || raw.mon_an || {};
  const author = raw.author || raw.nguoi_dung || {};

  return {
    id: raw.id || raw.ma_bai_viet,
    title: raw.title || raw.tieu_de,
    created_at: raw.created_at || raw.ngay_tao,
    dish: {
      id: dish.id || dish.ma_mon,
      name: dish.name || dish.ten_mon
    },
    author: {
      id: author.id || author.ma_nd,
      display_name: author.display_name || author.ten_hien_thi
    }
  };
}

/**
 * Mapper chuyển đổi chi tiết bài viết (kèm món, tác giả, nguyên liệu, bước nấu)
 */
export function mapPostDetail(raw) {
  const summary = mapPostSummary(raw);

  const rawIngredients = raw.ingredients || raw.cong_thuc_nguyen_lieu || raw.recipe_ingredients || [];
  const rawSteps = raw.steps || raw.buoc_nau || raw.recipe_steps || [];

  const ingredients = rawIngredients.map(item => {
    const ingDetails = item.ingredient || item.nguyen_lieu || {};
    return {
      ingredient_id: item.ingredient_id || item.ma_nl || ingDetails.id || ingDetails.ma_nl,
      name: item.name || item.ten || ingDetails.name || ingDetails.ten,
      quantity: item.quantity !== undefined ? item.quantity : (item.dinh_luong !== undefined ? item.dinh_luong : null),
      unit: item.unit || item.don_vi || null
    };
  });

  const steps = rawSteps
    .map((step, index) => ({
      order: step.order ?? step.step_order ?? step.thu_tu ?? (index + 1),
      content: step.content || step.noi_dung || ''
    }))
    .sort((a, b) => a.order - b.order);

  return {
    ...summary,
    ingredients,
    steps
  };
}

export async function listPosts({ page = 1, limit = 20 }) {
  const supabase = getAnonClient();
  const { from, to } = getPaginationRange(page, limit);

  // Truy vấn embedded select kết hợp dish và author để tránh lỗi N+1
  const { data, count, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      created_at,
      dish:dishes ( id, name ),
      author:profiles ( id, display_name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[POSTS SERVICE ERROR - listPosts]', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống khi tải danh sách bài viết');
  }

  const posts = (data || []).map(mapPostSummary);

  return {
    data: posts,
    meta: {
      page,
      limit,
      total: count ?? posts.length
    }
  };
}

export async function getPostById(id) {
  const supabase = getAnonClient();

  // Truy vấn bài viết kèm quan hệ trong số truy vấn cố định
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      created_at,
      dish:dishes ( id, name ),
      author:profiles ( id, display_name ),
      ingredients:recipe_ingredients (
        ingredient_id,
        quantity,
        unit,
        ingredient:ingredients ( id, name )
      ),
      steps:recipe_steps (
        step_order,
        content
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[POSTS SERVICE ERROR - getPostById]', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống khi lấy chi tiết bài viết');
  }

  if (!data) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy bài viết');
  }

  return mapPostDetail(data);
}

