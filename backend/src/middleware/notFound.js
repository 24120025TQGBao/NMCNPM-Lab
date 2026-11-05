export function notFoundHandler(_req, res) {
  return res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Đường dẫn hoặc tài nguyên không tồn tại'
    }
  });
}

