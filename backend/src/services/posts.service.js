import { getAnonClient, createUserClient } from '../lib/supabase.js';
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

export async function getPostById(id, client = null) {
  const supabase = client || getAnonClient();

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

/**
 * Hàm trung gian lưu bài viết theo phương án transaction RPC của TV3 (DB09)
 * hoặc kế hoạch dự phòng bù trừ (compensating rollback)
 */
export async function persistPost({ userClient, userId, input }) {
  const { dish_id, title, ingredients, steps } = input;

  const stepsWithOrder = steps.map((step, index) => ({
    order: index + 1,
    content: step.content
  }));

  // Thử gọi hàm RPC Postgres transaction (TV3 DB09)
  const { data: rpcData, error: rpcError } = await userClient.rpc('create_post_with_recipe', {
    p_dish_id: dish_id,
    p_title: title,
    p_ingredients: ingredients,
    p_steps: stepsWithOrder
  });

  if (!rpcError && rpcData) {
    const createdId = typeof rpcData === 'object' ? (rpcData.id || rpcData) : rpcData;
    return createdId;
  }

  // Nếu RPC chưa có hoặc không tồn tại (PGRST202: function not found)
  // Thực hiện kế hoạch dự phòng (ghi tuần tự có rollback bù trừ)
  if (rpcError && (rpcError.code === 'PGRST202' || rpcError.message?.includes('function') || rpcError.code === '42883')) {
    console.warn('[POSTS SERVICE WARNING] RPC create_post_with_recipe chưa khả dụng, chạy fallback bù trừ.');

    // 1. Kiểm tra dish tồn tại
    const { data: dishData, error: dishError } = await userClient
      .from('dishes')
      .select('id')
      .eq('id', dish_id)
      .maybeSingle();

    if (dishError || !dishData) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Món ăn không tồn tại', [
        { field: 'dish_id', message: 'Món ăn không tồn tại trong hệ thống' }
      ]);
    }

    // 2. Tạo bản ghi bài viết (posts)
    const { data: postData, error: postError } = await userClient
      .from('posts')
      .insert({
        dish_id,
        title,
        author_id: userId
      })
      .select('id')
      .single();

    if (postError || !postData) {
      console.error('[POSTS SERVICE ERROR - Fallback create post]', postError);
      throw new AppError(500, 'INTERNAL_ERROR', 'Không thể tạo bài viết mới');
    }

    const postId = postData.id;

    try {
      // 3. Chuẩn bị và lưu recipe_ingredients
      const ingredientsToInsert = ingredients.map(ing => ({
        post_id: postId,
        ingredient_id: ing.ingredient_id || null,
        name: ing.name || null,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null
      }));

      const { error: ingError } = await userClient
        .from('recipe_ingredients')
        .insert(ingredientsToInsert);

      if (ingError) throw ingError;

      // 4. Lưu recipe_steps
      const stepsToInsert = stepsWithOrder.map(s => ({
        post_id: postId,
        step_order: s.order,
        content: s.content
      }));

      const { error: stepError } = await userClient
        .from('recipe_steps')
        .insert(stepsToInsert);

      if (stepError) throw stepError;

      return postId;
    } catch (fallbackError) {
      // Rollback bù trừ: xóa bài viết đã tạo để tránh rác CSDL
      console.error('[POSTS SERVICE ROLLBACK] Lỗi khi tạo chi tiết, tiến hành dọn dẹp:', fallbackError);
      await userClient.from('posts').delete().eq('id', postId);
      throw new AppError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống khi lưu nguyên liệu và bước nấu');
    }
  }

  // Xử lý các mã lỗi cụ thể từ RPC của Supabase
  if (rpcError) {
    console.error('[POSTS SERVICE ERROR - RPC Error]', rpcError);
    // Vi phạm khóa ngoại món ăn
    if (rpcError.code === '23503' || rpcError.message?.toLowerCase().includes('dish')) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Món ăn không tồn tại', [
        { field: 'dish_id', message: 'Món ăn không tồn tại trong hệ thống' }
      ]);
    }
    // RLS Policy chặn
    if (rpcError.code === '42501') {
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');
    }
    throw new AppError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống khi lưu bài viết');
  }

  return rpcData?.id || rpcData;
}

export async function createPost({ userId, accessToken, input }) {
  const userClient = createUserClient(accessToken);

  const postId = await persistPost({ userClient, userId, input });

  // Lấy lại chi tiết bài viết vừa tạo bằng đúng cấu trúc của GET /api/posts/:id
  const postDetail = await getPostById(postId, userClient);
  return postDetail;
}
