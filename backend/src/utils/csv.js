// Parse tham số dạng CSV theo quy ước docs/api.md mục 7.0:
// - chuỗi rỗng coi như không gửi (trả danh sách rỗng);
// - phần tử rỗng ("1,,2"), khoảng trắng hoặc phần tử sai định dạng bị từ chối;
// - loại trùng, giữ thứ tự xuất hiện đầu tiên.

function splitCsv(value) {
  if (value === undefined || value === '') return [];
  return value.split(',');
}

function dedupe(values) {
  return [...new Set(values)];
}

export function parseCsvIds(value, { max, label }) {
  const parts = splitCsv(value);
  if (parts.some(part => !/^\d+$/.test(part))) {
    return { ok: false, message: `${label} phải là danh sách ID số nguyên dương cách nhau bằng dấu phẩy` };
  }

  const ids = dedupe(parts.map(Number));
  if (ids.some(id => !Number.isSafeInteger(id) || id < 1)) {
    return { ok: false, message: `${label} chứa ID không hợp lệ` };
  }
  if (ids.length > max) {
    return { ok: false, message: `${label} tối đa ${max} ID` };
  }
  return { ok: true, values: ids };
}

export function parseCsvCodes(value, { allowed, max, label }) {
  const parts = splitCsv(value);
  const unknown = parts.find(part => !allowed.includes(part));
  if (unknown !== undefined) {
    return { ok: false, message: `${label} chứa mã không hợp lệ (được phép: ${allowed.join(', ')})` };
  }

  const codes = dedupe(parts);
  if (codes.length > max) {
    return { ok: false, message: `${label} tối đa ${max} mã` };
  }
  return { ok: true, values: codes };
}
