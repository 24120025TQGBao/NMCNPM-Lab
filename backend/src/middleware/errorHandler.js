import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function errorHandler(err, _req, res, _next) {
  // Lỗi JSON body không đúng cú pháp từ express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu JSON trong request body không hợp lệ'
      }
    });
  }

  // Lỗi validation từ Zod
  if (err instanceof ZodError) {
    const details = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details
      }
    });
  }

  // Lỗi nghiệp vụ định nghĩa qua AppError
  if (err instanceof AppError) {
    const response = {
      error: {
        code: err.code,
        message: err.message
      }
    };
    if (err.details) {
      response.error.details = err.details;
    }
    return res.status(err.statusCode).json(response);
  }

  // Lỗi nội bộ không lường trước
  console.error('[UNHANDLED ERROR]', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Đã xảy ra lỗi hệ thống'
    }
  });
}

