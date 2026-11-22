// Mã tag trong API luôn viết hoa, còn `tag.slug` trong DB bắt buộc là chữ thường kebab-case
// (CHECK slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'). Quy tắc ánh xạ chốt ở docs/api.md mục 7.0 (Q15):
// `troi-mua` <-> `TROI_MUA`, `nau-cho-4` <-> `NAU_CHO_4`.

export function tagCodeToSlug(code) {
  return code.toLowerCase().replaceAll('_', '-');
}

export function slugToTagCode(slug) {
  return slug.toUpperCase().replaceAll('-', '_');
}
