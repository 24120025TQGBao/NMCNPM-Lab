# Trạng thái Sprint 2 sau cập nhật PO — 23/11/2026

Đã fetch origin --prune lần nữa; main vẫn 23bcb17, không có commit Sprint 2 mới. Đã chạy merge origin/main trên main và cả năm nhánh task: tất cả up-to-date, không xung đột. Không merge các nhánh phụ thuộc chưa duyệt vào main/task; kiểm thử bằng snapshot và preview riêng.

## Nguồn hiện tại

| Nhánh | SHA | Thay đổi |
|---|---|---|
| origin/main | 23bcb17 | Chưa merge FE09/BE Sprint 2 |
| linh/sprint2-po-be | a68473d | AC mới, BE12/FE11 vẫn P1, demo INT02 |
| linh/be12-suggest-next | 102ce6b | BE12 xong code, chứa BE08/BE11 |
| linh/be08-suggestions | 57af6da | Mã tag ↔ slug, chỉ món có ảnh/mô tả |
| linh/be10-q4-filter | dfd7ba2 | Q4, readiness INCOMPLETE, giữ thứ tự RPC; 19 test mới |
| linh/db-grants | 40f0c0f | Migration quyền service_role |
| huong/feat/FE07-FE09-suggest-tabs | 786605d | FE09 vẫn chưa merge |
| be09 / be10 / db | 41e2a65 / 0a5a8b3 / 23b78ef | Nền BE09/10 cũ và migrations |

Thông tin PO người dùng cung cấp ưu tiên hơn kết luận hoãn cũ. FE11 KHÔNG mặc định dời Sprint 3; vẫn P1 theo capacity, ưu tiên QA04–06 P0. BE12 không còn là blocker. Không sửa hoặc gửi tin thay thành viên.

## Phân loại theo yêu cầu

| Task | Phân loại | Đã làm | Còn thiếu / người nhận |
|---|---|---|---|
| QA04 | Đã hoàn chỉnh phần tài liệu — có thể push | Plan, 49 case cập nhật AC mới, ca Q4/BE12/pin/copy và oracle live | PO review/xác nhận mới đủ Done |
| DO04 | Đã hoàn chỉnh phần code — có thể push; cần xác nhận môi trường | CI tắt hai cờ mock, syntax gate toàn BE, local lint/test/build pass | Run xanh đúng SHA PR; không có quyền Vercel, demo local theo fallback, PO/INT02 xác nhận |
| QA05 | Đã làm — chưa hoàn chỉnh, cần tiếp tục kiểm thử/nghiệm thu | Collection 41 GET; runner preview đọc-only; API live 37 PASS/1 FAIL, 5 oracle PASS, BE12 mẫu PASS; browser smoke ghi riêng | INT02 route wiring, FE10, full QA04, fixture 4 nhóm/pantry, Jira bug/ret test |
| QA06 | Đã làm baseline — còn phụ thuộc | Report và quy trình hồi quy, tổng hợp bằng chứng thật | QA05/INT02 chưa đạt, FE10 chưa làm; không thể ký nghiệm thu cuối |
| FE11 | Đã làm một phần độc lập — chưa hoàn chỉnh; còn phụ thuộc | Helpers và component ghim/copy riêng, 9 test mới; không sửa component Hương | FE09 chưa merge; chưa nối UI/session/BE12; pin cần metadata thành phần chính xác và PO chốt ưu tiên |

Tất cả nhánh đều có thể push phần code/tài liệu review được; push không đồng nghĩa task Done. FE11 là bản chuẩn bị riêng, không PR nghiệm thu tính năng khi FE09 chưa merge.

## Bằng chứng và giới hạn

- BE12 102ce6b: 214 Vitest + 6 Node PASS (gồm BE08/BE11/Sprint 1). BE10 Q4 dfd7ba2: 69 Vitest + 6 Node PASS (19 case Q4). Không cộng suite chồng lắp thành số test độc lập.
- DO04 lần trước: BE 83+6, FE149, lint hai bên, build và syntax29 PASS. FE11 thêm 9 behavior tests, lint/build PASS; full suite có kết quả ở tài liệu nhánh.
- QA05 preview ghép router thực của hai nhánh, inject service_role dùng .env local; chỉ GET, không ghi DB. Live 37 PASS/1 FAIL. Không chứng minh routes/index.js production đã ghép đúng, không chứng minh INT02 hoàn tất.
- FAIL đã tái hiện: GET /api/dishes/33/recipes →404 NOT_FOUND, contract 7.6 yêu cầu200. BUG-S2-002, đề xuất Châu/INT02.
- BUG-S2-001 lần trước: /api/me main401, BE10 cũ404; cần giữ khi INT02 ghép nhánh nền cũ. Không coi Q4 đã sửa route này.
- Năm ca món33/công thức25 dùng 8 nguyên liệu có tổng weight15, pantry=false: ratio 0.0667/0.2/0.4667/0.8667/1, count1/2/4/7/8. Kỳ vọng tính từ recipe/role độc lập trước gọi matcher. Không nạp fixture chung.
- BE12: bộ7 `5,6,8,11,28,55,57` mở món33 qua nguyên liệu56 Sườn heo; đủ8 không mở lại món33. Không khẳng định mọi bộ nguyên liệu đều có gợi ý; [] là hợp lệ.
- Demo INT02 trên nhánh PO là bằng chứng của TV1, không phải lần bấm browser của TV5. Một số con số nhóm trong demo trước Q4 đã cũ, không dùng làm expected cho Q4 mới.

## Còn phụ thuộc rõ ràng

FE09 chưa merge main là điều kiện nối FE11 để tránh sửa chồng component. FE10 vẫn placeholder nên S2-03/S2-04 và hai luồng đến công thức chưa đủ. Dataset tag/pantry/role phải được kiểm chứng theo từng ca, không suy rằng snapshot PO đã chứng minh AC hôm nay. Giữ flavor=null/servings=null theo PO, không bịa dữ liệu. Jira bug, owner/hạn sửa, PO review và CI PR cần bằng chứng riêng. Không có quyền Vercel: dùng hướng dẫn DO04 demo local, không ghi có staging khi chưa có.

Browser smoke bổ sung: Chromium desktop, Firefox desktop và Chromium390×844 đều12/12 PASS, tổng36/36 sau retest Firefox ngoài sandbox. Có screenshot và latest-results.json trên nhánh QA05. Đây là smoke trên FE09+preview live, không phải hồi quy toàn bộ49 AC hoặc nghiệm thu FE10. Mobile8 có đủ4 nhóm; chưa test INCOMPLETE100% và pantry thay đổi dữ liệu.

Retest BUG-S2-001 trên dfd7ba2: script Supertest vẫn fail đúng assertion, main401 UNAUTHORIZED / bảnQ4 mới404 NOT_FOUND. Q4 chưa khôi phục /api/me; đây là lỗi còn mở trên source mới, không chỉ rủi ro từ nhánh cũ.
