# QA06 — Report tiến độ hồi quy sau fetch mới, 23/11/2026

Main23bcb17 chưa có Sprint2. Đã merge origin/main vào nhánh task: up-to-date. Context POa68473d, FE09786605d, BE12102ce6b (gồm BE08/11), BE10Q4dfd7ba2, DB23b78ef, grants40f0c0f. Người chạy tự động: Codex, chưa có PO/INT02 ký nghiệm thu.

## Kết quả có bằng chứng

| Lớp | PASS | FAIL | BLOCKED | Giới hạn |
|---|---:|---:|---:|---|
| API preview + Supabase thật |37|1|0| Ghép router tường minh, không chứng nhận production wiring |
| Oracle tính độc lập món33/recipe25 |5|0|0| Đã nằm trong37 API pass, không cộng thêm |
| Browser smoke Chromium desktop |12|0|0| FE09 + preview, chưa FE10 |
| Browser smoke Firefox desktop |12|0|0| Retest ngoài sandbox, lỗi launch lần đầu giữ riêng |
| Browser smoke Chromium390×844 |12|0|0| Viewport mô phỏng, không phải máy điện thoại thật |
| BE12 suite |220|0|0|214 Vitest+6 Node, có mock/DB tạm, chồng lắp BE08/11 |
| BE10Q4 suite |75|0|0|69 Vitest+6 Node, gồm19 test Q4 |

Không cộng các lớp thành số AC đã pass. Full49 case QA04 chưa có kết quả đầy đủ; collection Postman41 request mới kiểm tra cú pháp, chưa chạy full. Năm oracle hiện có dữ liệu/expected/actual assertion trong qa05-live-preview-result.json trên nhánh QA05. Browser evidence có latest-results.json và ảnh; không có key/token/email QA.

## Kết luận theo Story

| Story | Kết luận | Thiếu gì |
|---|---|---|
| S2-01 | CHƯA NGHIỆM THU | Smoke guest/next/history/back đạt; còn mọi AC loading/error/exhaustion/tag và bản tích hợp cuối |
| S2-02 | CHƯA NGHIỆM THU |5 oracle và UI7/8 đạt; còn matrix, pantry có dữ liệu đúng, INCOMPLETE100%, bản cuối |
| S2-03 | BLOCKED UI | FE10 SearchPage còn placeholder |
| S2-04 | BLOCKED | FE10 chi tiết/công thức placeholder; API recipes-list thiếu route |
| FE11 / S2-02.18 | P1 CHƯA XONG | BE12 mẫu đạt; FE11 chuẩn bị riêng, chờ FE09 merge và nối UI |

## Bug và rủi ro còn mở

| ID local | Actual / Expected | Người nhận đề xuất | Trạng thái |
|---|---|---|---|
| BUG-S2-001 | /api/me guest: main401, BE10 cũ404; cần giữ route khi tích hợp | Châu/INT02 | Chưa có Jira/owner/hạn được nhóm xác nhận; chưa retest bản cuối |
| BUG-S2-002 | /api/dishes/33/recipes →404, contract7.6 yêu cầu200 data RecipeSummary | Châu/INT02 | Đã tái hiện trên preview Q4,1 API FAIL; chưa sửa/ret test |

Không tự gán severity hoặc tuyên bố P0 đã có owner/hạn khi chưa được nhóm xác nhận. Route list thiếu và FE10 là rủi ro chặn luồng Sprint Goal. Main chưa ghép, tag/pantry/dataset và chữ ký contract còn cần kiểm chứng. Demo PO có số nhóm trước Q4, không dùng làm expected cho bản mới.

## Việc còn lại để QA06 Done

1. INT02 ghép các PR đúng contract, giữ regression Sprint1; sửa2 bug trên, hoàn thiện FE10. Ghi SHA FE/BE/DB cuối và môi trường local chung (không có quyền Vercel).
2. Lấy QA04 mới49 case và case bổ sung, QA05 collection41 GET/runner/evidence. Chạy toàn bộP0 còn thiếu trên bản cuối, không lặp lại vô ích suite cũ khi source không đổi; sau sửa phải retest vùng ảnh hưởng.
3. Chromium và Firefox +390×844: đủ2 luồng đến công thức (Tự nấu vẫn qua danh sách dù1 công thức), tìm/lọc/phân trang/back; loading/rỗng/500/retry; controlled pantry/tag/INCOMPLETE100% và hidden/no-recipe. Ghi thực tế/ảnh/bug/runner/SHA từng case.
4. Bạn tạo Jira, xác nhận severity/owner/hạn sửa, không P0 mở; PO duyệt QA04 và chốt từng Story. Báo PASS/FAIL/BLOCKED/NOT RUN/P1 không làm riêng; không tính thiếu test thành pass.
5. Chia sẻ report trước Review theo hạn mới do PO xác nhận. Chưa gửi tin thay bạn trong phiên này.

Retest BUG-S2-001 trên dfd7ba2: script Supertest vẫn fail đúng assertion, main401 UNAUTHORIZED / bảnQ4 mới404 NOT_FOUND. Q4 chưa khôi phục /api/me; đây là lỗi còn mở trên source mới, không chỉ rủi ro từ nhánh cũ.
