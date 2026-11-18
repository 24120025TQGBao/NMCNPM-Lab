import { AppError } from '../utils/AppError.js';

const PROFILE_COLUMNS = 'ma_nd, ten_hien_thi, anh_dai_dien, vai_tro, trang_thai';

export async function getCurrentProfile(client, userId) {
  const { data, error } = await client
    .from('nguoi_dung')
    .select(PROFILE_COLUMNS)
    .eq('ma_nd', userId)
    .maybeSingle();

  if (error) {
    console.error('[ME SERVICE ERROR]', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống khi tải hồ sơ');
  }

  if (!data) {
    throw new AppError(409, 'PROFILE_NOT_FOUND', 'Chưa có hồ sơ người dùng');
  }

  if (data.trang_thai !== 'ACTIVE') {
    throw new AppError(403, 'FORBIDDEN', 'Tài khoản không được phép truy cập');
  }

  return data;
}
