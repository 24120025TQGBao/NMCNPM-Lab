import { z } from 'zod';
import { parseCsvCodes, parseCsvIds } from '../utils/csv.js';

// Chip hoàn cảnh của tab Gợi ý món (tag.slug, DB10). Tập chính thức theo docs/api.md mục 7.0.
export const CONTEXT_TAG_CODES = ['TROI_MUA', 'LUOI_NAU', 'CUOI_THANG', 'NAU_CHO_4', 'AN_NHE'];
// Giá trị mon_an.vung_mien (snapshot Supabase 22/11/2026).
export const REGION_CODES = ['BAC', 'TRUNG', 'NAM', 'KHAC'];

const EXCLUDE_MAX = 200;
const LIMIT_DEFAULT = 1;
const LIMIT_MAX = 10;

function csvField(parse, options, invalidTypeMessage) {
  return z
    .string({ invalid_type_error: invalidTypeMessage })
    .optional()
    .transform((value, ctx) => {
      const result = parse(value, options);
      if (!result.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.message });
        return z.NEVER;
      }
      return result.values;
    });
}

// Mỗi tham số chỉ nhận một giá trị chuỗi (`?the=a&the=b` bị từ chối).
export const suggestionsQuerySchema = z.object({
  exclude: csvField(parseCsvIds, { max: EXCLUDE_MAX, label: 'exclude' }, 'exclude phải là một chuỗi'),
  the: csvField(
    parseCsvCodes,
    { allowed: CONTEXT_TAG_CODES, max: CONTEXT_TAG_CODES.length, label: 'the' },
    'the phải là một chuỗi'
  ),
  random: z
    .enum(['true', 'false'], { errorMap: () => ({ message: 'random phải là true hoặc false' }) })
    .optional()
    .transform(value => value === 'true'),
  limit: z
    .string({ invalid_type_error: 'limit phải là một số nguyên' })
    .optional()
    .refine(
      value => value === undefined || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= LIMIT_MAX),
      { message: `limit phải là số nguyên từ 1 đến ${LIMIT_MAX}` }
    )
    .transform(value => (value === undefined ? LIMIT_DEFAULT : Number(value))),
  vung_mien: z
    .enum(REGION_CODES, { errorMap: () => ({ message: `vung_mien phải là một trong: ${REGION_CODES.join(', ')}` }) })
    .optional()
});
