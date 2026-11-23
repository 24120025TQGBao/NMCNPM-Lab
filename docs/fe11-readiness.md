# FE11 — P1 Sprint 2, đã chuẩn bị riêng, chờ FE09 merge để nối

Cập nhật PO do người dùng cung cấp và origin/linh/sprint2-po-be a68473d thay kết luận hoãn trước đó: FE11 vẫn P1 Sprint2, tùy capacity TV5, ưu tiên QA04–06 P0. BE12 đã có code102ce6b, không còn blocker RPC. Main vẫn23bcb17; FE09 786605d chưa merge. Không sửa component/state/adapter của Hương trước merge.

## Đã tự thực hiện

Thêm riêng frontend/src/features/ingredient-match/enhancements, không đụng file thành viên:

- shoppingList.js: danh sách chỉ từ missing của món được chọn theo camelCase FE09, loại trùng ID chuẩn, không bịa định lượng. copyShoppingList chờ writeText resolve, lỗi thì reject.
- ShoppingListButton.jsx: dùng Button/theme hiện có, disabled khi không có phần thiếu, báo thành công sau copy xong, lỗi có alert, xóa feedback cũ khi danh sách thay đổi.
- PinIngredientButton.jsx: nút aria-pressed, callback ID chuẩn, không đổi chip/state FE09.
- pinnedIngredients.js: chỉ ghim ID đã chọn, bỏ ID cũ/trùng; ưu tiên ổn định trong từng group.items, không đổi nhóm/ratio/isIncomplete hoặc mutate input.
-9 behavior tests PASS; lint/build PASS. Full suite158/158 PASS, gồm149 test cũ và9 test mới.

Đây là code riêng để nối sau, CHƯA có hành vi trên trang. Không đánh FE11 Done.

## Contract và chỗ nối sau merge

1. Giữ frontend/src/api/adapters.js, get từ frontend/src/lib/api/client.js, snake_case→camelCase. MatchResults của Hương có unlockSectionSlot (#fe11-unlock-slot). Nối phần Mua thêm vào slot, không tạo theme/client khác.
2. BE12 GET /api/ingredients/suggest-next?ingredients=CSV&pantry=true|false; mặc địnhtrue; data:[{ingredient:{id,name},unlock_count,dish_ids}]. Tối đa10, unlock_count giảm dần rồi ingredient.id tăng dần. Abort request cũ khi input/pantry đổi; [] ẩn mục, lỗi không phá kết quả match.
3. Demo đã chạy API: `5,6,8,11,28,55,57`, pantry=false → nguyên liệu56 Sườn heo mở món33 (Canh khổ qua hầm xương). Đủ8 gồm56 không mở lại33. Không dùng bộ phổ biến ngẫu nhiên để kỳ vọng có gợi ý; [] thường hợp lệ.
4. Lưu ghim trong session FE09, bỏ ghim khi xóa nguyên liệu, dùng PinIngredientButton và helpers. Cần PO/Hương chốt ngoại lệ ưu tiên ghim so với quy ước S2-02.11 giữ thứ tự API.
5. Blocker kỹ thuật của ghim: MatchDish FE09 chỉ có missing[] và ID món, không có ingredient IDs đang có hay ID công thức được RPC chọn. Không thể suy món chứa nguyên liệu ghim từ missing (ID ghim đã chọn sẽ không nằm trong missing). Helper nhận ingredientIdsByDish xác thực từ caller. Cần chốt nguồn metadata (frontend lấy recipe details thích hợp hoặc extension contract được nhóm duyệt); không tự thêm field BE hay đoán từ tên món. Unit test đã chứng minh không tự reorder khi thiếu metadata.
6. Phạm vi danh sách đi chợ: truyền đúng các món người dùng chọn cho ShoppingListButton, không copy toàn bộ result tự động. Với incomplete chỉ copy phần thiếu đã biết, UI phải giữ nhãn chưa đủ dữ liệu, không khẳng định danh sách đầy đủ.

## Còn thiếu

FE09 merge → phối hợp Hương nối component/session/slot; chốt metadata ghim và phạm vi chọn món; thêm client/hook/UI Mua thêm theo BE12; test tích hợp ghim/clipboard thành công+thất bại, [] và mẫu33; review/CI. Nhánh hiện có thể push để review phần chuẩn bị, không nghiệm thu tính năng hoặc sửa chồng FE09.
