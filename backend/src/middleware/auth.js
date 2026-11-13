import { getAnonClient } from '../lib/supabase.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Bạn cần đăng nhập để thực hiện thao tác này'
      }
    });
  }

  const match = authHeader.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Định dạng token không hợp lệ (cần Bearer <token>)'
      }
    });
  }

  const token = match[1];

  try {
    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn'
        }
      });
    }

    req.auth = {
      userId: data.user.id,
      accessToken: token
    };

    return next();
  } catch (err) {
    console.error('[AUTH ERROR]', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Đã xảy ra lỗi hệ thống khi xác thực tài khoản'
      }
    });
  }
}

