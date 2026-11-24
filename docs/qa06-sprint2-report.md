# QA06 — Report hiện trạng hồi quy, 24/11/2026

PR [#30](https://github.com/24120025TQGBao/NMCNPM-Lab/pull/30) vẫn draft, chưa phải nghiệm thu cuối. Main23bcb17 chưa merge Sprint2. Nguồn mới: INT02449d189 đã push, FE09786605d, FE11 đã merge dependency FE09 và hoàn thiện code, PO72be7e1, BE12102ce6b, BE09c7ceb72. Không suy rằng mọi source branch đã nằm trong main.

## Kết quả đã xác minh

| Lớp | PASS | FAIL | Giới hạn |
|---|---:|---:|---|
| HTTP app/route thật INT02 + Supabase |40|0| GET-only wrapper; không chứng nhận main đã tích hợp |
|5 oracle độc lập món33/recipe25 |5|0| Đã nằm trong40 API, không cộng thêm |
| FE09 browser smoke: Chromium/Firefox desktop và390×844 |36|0| Hai tab/back/placeholder, không full recipe flow |
| FE11 browser: Chromium/Firefox desktop và390×844 |33|0| Mua thêm/ghim/copy/session/retry/[]; Firefox clipboard có kiểm soát, Chromium native |
| FE11+FE09 frontend full suite |214|0| Unit/component/integration, có mock; sau đổi thông báo clipboard đã test lại9 primitive và browser |

JSON API mới: docs/qa05-int02-retest-2026-11-24.json trên nhánh QA05; runner qa05-int02-api-check.mjs. FE11 evidence: docs/fe11-browser-evidence trên nhánh FE11. Collection Postman41 GET mới parse, chưa chạy đủ với fixture riêng. Full49 AC QA04 chưa có kết quả đầy đủ. Không cộng các lớp thành số AC hoặc báo mọi case đã pass.

Báo cáo23/11 API37/1 và BE10 cũ là lịch sử, không phải hiện trạng nhánh INT02 mới. Suite BE12/Q4 trước đó chồng lắp với Sprint1, không cộng tổng độc lập.

## Kết luận theo Story/task

| Story/task | Kết luận | Còn thiếu |
|---|---|---|
| S2-01 | CHƯA NGHIỆM THU | Smoke guest/next/history/back đạt; còn full AC và bản tích hợp cuối |
| S2-02 | CHƯA NGHIỆM THU |5 oracle và UI7/8,8/8 đạt; còn controlled pantry/tag/INCOMPLETE100%, full matrix |
| S2-03 | BLOCKED UI | FE10 SearchPage placeholder; thời gian/phân trang/tìm kiếm UI chưa đủ |
| S2-04 | BLOCKED UI | FE10 chi tiết/công thức placeholder; API recipes-list mới đã đạt |
| FE11 / S2-02.18 P1 | CODE/TEST ĐÃ XONG | PR31 cần CI SHA cuối/reviewer/merge; không còn chờ FE09 merge để viết code |

PO72be7e1: lọc loại món/khẩu vị DEFERRED Sprint3, servings=null hiển thị chưa có thông tin. Không coi các phần đó là bug P0 Sprint2; S2-03.2 vẫn kiểm tra giới hạn thời gian. Dataset tag/pantry còn cần xác minh riêng.

## Retest bug

| ID local | Lịch sử | Kết quả24/11 | Việc còn lại |
|---|---|---|---|
| BUG-S2-001 | /me guest trên BE10 cũ404, main401 | INT02449d189 trả401 UNAUTHORIZED, PASS | Retest main cuối; nhóm quản lý Jira nếu có, không tự đóng ticket |
| BUG-S2-002 | recipes-list trả404, contract cần200 | /dishes/33/recipes trên INT02 trả200 córecipe25, PASS | Retest main cuối và các case400/404/hidden theo QA04 |

Không còn tái hiện2 lỗi này trên source tích hợp đã kiểm tra; không nói lỗi đã sửa trong mọi nhánh. Severity/owner/hạn và Jira cần nhóm xác nhận nếu còn bug khác. FE10 thiếu là phụ thuộc tính năng, không giả lập thành luồng đã chạy xong.

## Để QA06 Done

1. INT02 tích hợp PR đã duyệt và hoàn thiện FE10; giữ chức năng/test Sprint1. Ghi SHA FE/BE/DB và URL/môi trường local chung (không có quyền Vercel).
2. Chạy mọi AC P0 QA04 còn thiếu và collection QA05 với fixture/biến chuẩn, retest trên SHA cuối. Mỗi case có actual/status/evidence/runner/SHA/bug. Phân biệt PASS/FAIL/BLOCKED/NOT RUN và P1 chưa làm.
3. Trên Chromium/Firefox và390×844: đủ2 luồng đến công thức, Tự nấu vẫn qua danh sách dù1 công thức; tìm/giới hạn thời gian/phân trang/back; loading/rỗng/500/retry; hidden/no-recipe/thiếu dữ liệu/INCOMPLETE100% và pantry có dữ liệu đúng.
4. Hồi quy /me, login, feed/detail/create post trên môi trường QA phù hợp; không tự ghi dữ liệu dùng chung. Mọi bug mở có Jira, severity, owner, hạn và kết quả retest; không P0 mở mới đề xuất đạt.
5. PO duyệt QA04, xác nhận từng Story và phương án local; bạn chia sẻ report trước Review theo hạn mới do PO chốt. Chưa gửi tin hoặc đóng Jira thay bạn.
