import { getAnonClient, createUserClient } from '../lib/supabase.js';
import { AppError } from '../utils/AppError.js';

// BE04: danh sách bài viết công khai (đọc qua RPC get_public_posts, chỉ RECIPE + PUBLIC)
export async function listPosts({ page = 1, limit = 20 }) {
  const { data, error } = await getAnonClient().rpc('get_public_posts', {
    p_page: page,
    p_limit: limit
  });

  if (error || !data) {
    console.error('[POSTS SERVICE ERROR - listPosts]', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống khi tải danh sách bài viết');
  }

  return {
    data: data.data ?? [],
    meta: { page, limit, total: Number(data.total) }
  };
}

// BE04: chi tiết một bài viết công khai (đọc qua RPC get_public_post)
export async function getPostById(id) {
  const { data, error } = await getAnonClient().rpc('get_public_post', { p_id: id });

  if (error) {
    console.error('[POSTS SERVICE ERROR - getPostById]', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống khi lấy chi tiết bài viết');
  }

  if (!data) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy bài viết');
  }

  return data;
}

// Ánh xạ mã lỗi do hàm RPC create_post_with_recipe ném ra sang lỗi theo contract
const RPC_ERRORS = {
  ERR_UNAUTHORIZED: () => new AppError(401, 'UNAUTHORIZED', 'Bạn cần đăng nhập để thực hiện thao tác này'),
  ERR_FORBIDDEN: () => new AppError(403, 'FORBIDDEN', 'Tài khoản không có quyền đăng bài'),
  ERR_DISH_NOT_FOUND: () =>
    new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', [
      { field: 'dish_id', message: 'Món ăn không tồn tại' }
    ]),
  ERR_INGREDIENT_NOT_FOUND: () =>
    new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', [
      { field: 'ingredients', message: 'Có nguyên liệu (ingredient_id) không tồn tại' }
    ]),
  ERR_INGREDIENT_DUPLICATE: () =>
    new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', [
      { field: 'ingredients', message: 'Nguyên liệu bị trùng trong cùng công thức' }
    ])
};

export async function createPost({ accessToken, input }) {
  const userClient = createUserClient(accessToken);

  // Toàn bộ việc lưu bài, công thức, nguyên liệu, bước chạy trong MỘT transaction của Postgres
  const { data, error } = await userClient.rpc('create_post_with_recipe', {
    p_dish_id: input.dish_id,
    p_title: input.title,
    p_content: input.content ?? null,
    p_ingredients: input.ingredients,
    p_steps: input.steps
  });

  if (error) {
    const key = Object.keys(RPC_ERRORS).find(k => error.message?.includes(k));
    if (key) throw RPC_ERRORS[key]();
    console.error('[POSTS SERVICE ERROR - createPost]', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống khi lưu bài viết');
  }

  return data;
}