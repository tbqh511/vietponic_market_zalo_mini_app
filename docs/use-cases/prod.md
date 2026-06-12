# Nhóm: Sản phẩm

## PROD-01
- **Vai trò:** Admin | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ✅ Đã sửa (B3)

**Ngữ cảnh & các bước:**
Trên admin web. 1) Tạo sản phẩm mới: nhập đủ tên, giá, danh mục, đơn vị, tải ảnh hợp lệ. 2) Bấm Lưu.

**Kết quả mong đợi:**
Lưu thành công, sản phẩm xuất hiện trong danh sách.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `routes/web.php:111` `Route::resource('zalo-products', ZaloProductController::class)` (middleware `auth + checklogin + language`); `app/Http/Controllers/Admin/ZaloProductController.php@create` (form) + `@store:33-67` (validate → lưu → redirect `zalo-products.index` với flash `'Product created'`); view `resources/views/admin/zalo_products/create.blade.php`; danh sách `@index:15-24` + `index.blade.php`. Model `app/Models/ZaloProduct.php` (`$incrementing=false`, `timestamps=false`).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Nhập đủ → validate pass → `ZaloProduct::create` → hiện trong `index` (orderBy id). *Sai lệch/Lưu ý:* (1) `category_id`, `unit_id`, **`image` đều `nullable`** — use case nói "nhập đủ danh mục, đơn vị, ảnh" nhưng code KHÔNG bắt buộc; chỉ `name`, `system_unit`, `conversion_factor` mới `required` (đều có default trong form). (2) ID gán thủ công `$max = ZaloProduct::max('id'); $id = $max+1` (vì `$incrementing=false`) → **race condition** nếu 2 admin tạo đồng thời có thể trùng id → lỗi insert. (3) flash message tiếng Anh `'Product created'` (lệ thuộc i18n, lẫn ngôn ngữ với UI tiếng Việt).
- [x] Test coverage: **Thiếu hoàn toàn** — không có Feature test cho admin-web product CRUD (tests hiện chỉ đọc qua API `/products` gián tiếp trong order tests). Cần thêm khi sửa.
- **✅ Đã sửa (B3):** `ZaloProductController@store` — (1) bỏ `max(id)+1` thô → bọc trong `DB::transaction` + `lockForUpdate()->max('id')` (atomic, race-safe MySQL + sqlite test); **giữ `$incrementing=false`** vì mock product dùng id cố định khớp FE → KHÔNG đổi schema, KHÔNG migration mới. (2) `category_id`/`unit_id`/`image` đổi `nullable` → **`required`** (khớp use case "nhập đủ danh mục, đơn vị, ảnh"). (3) flash `'Product created'` → `'Đã tạo sản phẩm'` (tiếng Việt). **Test:** `tests/Feature/AdminProductCreateTest.php` — `test_two_consecutive_products_get_distinct_ids` (2 SP liên tiếp id khác nhau), `test_missing_category_is_required` (thiếu danh mục → lỗi), `test_successful_create_flashes_vietnamese_message` (flash VN + SP xuất hiện).

---

## PROD-02
- **Vai trò:** Admin | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ✅ Đã sửa (B3)

**Ngữ cảnh & các bước:**
Trên admin web. 1) Tạo sản phẩm nhưng BỎ TRỐNG tên. 2) Bấm Lưu.

**Kết quả mong đợi:**
Bị chặn, báo lỗi 'tên bắt buộc'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `ZaloProductController@store:35` `'name' => 'required|string|max:255'` (server-side); `create.blade.php:31` `<input name="name" ... required>` (HTML client-side); khối hiện lỗi `create.blade.php:9-17` `@foreach($errors->all())`.
  - i18n: `config/app.php:85` `'locale' => 'vi'`, `:98` `'fallback_locale' => 'en'`; **KHÔNG có `resources/lang/vi/validation.php`** (chỉ có `lang/en/`); message lấy từ `lang/en/validation.php:120` `'required' => 'The :attribute field is required.'`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **🔴 (đã đánh dấu).** Chức năng chặn ĐÚNG (validation fail → redirect back hiện lỗi). NHƯNG **message KHÔNG phải 'tên bắt buộc'**: vì thiếu `lang/vi/validation.php`, locale `vi` fallback sang `en` → hiện *"The name field is required."* (tiếng Anh). Ngoài ra HTML `required` chặn ở trình duyệt trước khi submit → tooltip mặc định của browser (cũng không phải chuỗi 'tên bắt buộc' do app kiểm soát). Cần: thêm `lang/vi/validation.php` (+ `attributes.name = 'tên'`) hoặc `messages()` tuỳ biến trong controller để ra đúng "Tên sản phẩm là bắt buộc".
- [x] Test coverage: **Thiếu** — không có test gửi form thiếu `name` để khẳng định 422/redirect-with-errors và nội dung message.
- **✅ Đã sửa (B3):** tạo `resources/lang/vi/validation.php` (bản dịch đầy đủ, mirror cấu trúc `lang/en`) + mảng `attributes` Việt hoá tên field (`name → 'tên sản phẩm'`, `image → 'hình ảnh'`, `category_id → 'danh mục'`, `unit_id → 'đơn vị'`…). Locale = `vi` (đã xác nhận `config/app.php:85`) nên message giờ ra **"tên sản phẩm là bắt buộc."** thay vì "The name field is required.". **Test:** `AdminProductCreateTest::test_missing_name_returns_vietnamese_required_message` (assert chứa "tên sản phẩm là bắt buộc" + KHÔNG chứa "field is required").

---

## PROD-03
- **Vai trò:** Admin | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ✅ Đã sửa (B3)

**Ngữ cảnh & các bước:**
Trên admin web. 1) Tạo SP, tải ảnh SAI định dạng (vd .txt) hoặc ảnh >2MB. 2) Bấm Lưu.

**Kết quả mong đợi:**
Bị chặn, báo lỗi ảnh không hợp lệ.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `ZaloProductController@store:40` `'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'` (2048KB = 2MB); xử lý ảnh `@processImage:132-212` (`getimagesize` fail → `throw \Exception('Invalid image')`; mime lạ → `'Unsupported image type'`; resize 560×560, lưu JPEG).
  - FE: `create.blade.php:99-125` `previewImage()` validate client-side type + size với **alert tiếng Việt** ('Vui lòng chọn tệp hình ảnh hợp lệ (JPEG, PNG, JPG, GIF)' / 'Dung lượng tệp phải nhỏ hơn 2MB'); `accept="image/*"`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp về chức năng (🟢) — chặn được.** Sai lệch chi tiết: (1) **Message server tiếng Anh** (cùng gốc PROD-02, thiếu `lang/vi`): "The image must be a file of type: jpeg, png, jpg, gif." / "The image may not be greater than 2048 kilobytes." (2) **Rủi ro 500**: nếu file lọt qua rule `image|mimes` nhưng `getimagesize` fail/mime lạ thì `processImage` ném `\Exception` thô → trang lỗi 500 thay vì message thân thiện (validation `image` thường đã chặn trước nên hiếm, nhưng nhánh throw không có guard hiển thị). (3) Lớp JS client-side chặn sớm + thân thiện, nhưng tắt JS thì chỉ còn validate server (tiếng Anh).
- [x] Test coverage: **Thiếu** — không có test upload sai định dạng / >2MB (dùng `UploadedFile::fake()`), cũng chưa test nhánh `processImage` ném exception.
- **✅ Đã sửa (B3):** (1) message ảnh giờ ra tiếng Việt nhờ `lang/vi/validation.php` ("hình ảnh phải là tệp có định dạng: jpeg, png, jpg, gif." / "hình ảnh không được lớn hơn 2048 kilobyte."). (2) **Không-500**: bọc khối `processImage` trong `try/catch (\Throwable)` ở `@store` → khi xử lý ảnh lỗi (`getimagesize` fail / mime lạ) trả `ValidationException` "Hình ảnh không hợp lệ hoặc không thể xử lý." (redirect-back, HTTP 302) thay vì ném Exception thô gây 500; `processImage()` giữ nguyên (vẫn ném nội bộ — chỉ chuyển thành validation error ở store). **Test:** `AdminProductCreateTest` — `test_invalid_image_format_returns_vietnamese_error` (.txt), `test_oversized_image_returns_vietnamese_error` (>2MB, message "kilobyte"), `test_corrupt_image_does_not_500_and_returns_validation_error` (jpeg mime hợp lệ qua được rule `image|mimes` nhưng nội dung hỏng → nhận lỗi `image` VN, KHÔNG 500 — xác nhận đúng nhánh try/catch).

---

## PROD-04
- **Vai trò:** Admin | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ✅ Đã ghi chú (B13 — giữ nguyên logic)

**Ngữ cảnh & các bước:**
Cần phối hợp Admin + Khách. 1) Admin tạo SP và gắn vào farm. 2) Dùng KH-1 mở mini app, tìm SP đó.

**Kết quả mong đợi:**
Khách NHÌN THẤY sản phẩm mới trong app.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE tạo SP: `ZaloProductController@store`. Gắn farm: **màn riêng** — `Admin/FarmController@attachProduct:386-` (route `routes/web.php:153` `POST farms/{farm}/products`, pivot `farm_product`); form create SP **không có field gắn farm**.
  - BE public API: `routes/api.php:26` `GET products` → `ZaloApiController@products:46-70` trả **TẤT CẢ** `zalo_products` (KHÔNG join/lọc theo `farm_product`), kèm `stock_available` = SUM batch active.
  - FE: `state.ts:336 allProductsState` (`/products`) → `state.ts:383 productsState` lọc bỏ hết hàng; hiển thị ở home/category/search.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **🟡 Khớp CÓ điều kiện.** Khách thấy SP **không phải do "gắn farm"** mà do **có tồn kho**: API không lọc theo farm nên SP hiện ngay khi tồn > 0, kể cả chưa gắn farm nào; ngược lại SP **mới tạo + đã gắn farm nhưng CHƯA nhập kho** → `stock_available=0` → bị `productsState` ẩn → **khách KHÔNG thấy**. Vậy chuỗi đủ để khách thấy là: tạo SP → gắn farm → farm **nhập lô hàng (batch active)**. Bước "gắn farm" một mình KHÔNG đủ. (Liên quan trực tiếp PROD-05.)
- [x] Test coverage: **Thiếu** — không có test cho `GET /api/products` (shape, `stock_available`, có/không lọc farm). `attachProduct` cũng chưa thấy Feature test.
- **✅ Ghi chú (B13 — KHÔNG đổi logic API):** Chốt **giữ nguyên** hành vi: visibility = **tồn > 0** (API `/products` không lọc farm). Điều kiện đầy đủ để khách thấy SP mới = **tạo SP → gắn farm → farm nhập lô (batch `status='active'`, `quantity_remaining > 0`)** → khi đó `stock_available = SUM(...) > 0`. Riêng bước "gắn farm" **một mình KHÔNG đủ**: SP đã gắn farm nhưng chưa nhập kho → `stock_available = 0`. Sau B13 (PROD-05), SP `stock_available = 0` **không còn bị ẩn** khỏi list nữa mà hiện kèm badge "Hết hàng" — nên khách vẫn *thấy* SP nhưng chưa mua được tới khi có lô active. *(Chỉ ghi chú; không sửa code BE/FE cho case này.)*

---

## PROD-05
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ✅ Đã sửa FE (B13)

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Tìm 1 sản phẩm CHƯA nhập kho (chưa có lô hàng nào).

**Kết quả mong đợi:**
Hiển thị 'Hết hàng', không thêm vào giỏ được.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `ZaloProduct::getStockAvailableAttribute:99-105` = SUM(batch active `quantity_remaining`) → **0 khi chưa có batch**; `@products:66` trả `stock_available`.
  - FE: `state.ts:43 isOutOfStock` (= `stockAvailable` là number && `<= 0`); `state.ts:383 productsState` **lọc bỏ** item hết hàng → áp dụng cho MỌI surface duyệt/tìm: `flashSaleProductsState` (home), `productsByCategoryState:442` (danh mục), `searchResultState:430` + `recommendedProductsState` (tìm kiếm/gợi ý). Trang chi tiết `pages/catalog/product-detail.tsx:21,55,107-130` dùng `productState`→`allProductsState` (KHÔNG lọc): hiện "Sản phẩm đang hết hàng", nút "Hết hàng" `disabled`, ẩn bộ chọn số lượng. `cart-item.tsx:19` badge hết hàng; `state.ts:407 payableCartState` loại item hết hàng khỏi thanh toán.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **🟡 Khớp một phần.** Vế "**không thêm vào giỏ được**" ✅ đúng (nút disabled ở detail; payableCartState loại khỏi checkout). Vế "**hiển thị 'Hết hàng'**" KHÔNG khớp khi *tìm kiếm*: SP chưa nhập kho bị **ẩn hoàn toàn** khỏi list/search/category/home (do `productsState` filter) → khách **không tìm thấy** để thấy nhãn "Hết hàng"; chỉ khi vào **thẳng trang detail** (link share / item cũ trong giỏ) mới thấy "Hết hàng". Đây là **quyết định thiết kế** (ẩn hẳn thay vì badge "Hết hàng" trong list). Cần chốt với product owner: kỳ vọng "thấy nhãn Hết hàng" hay "ẩn"; nếu muốn thấy nhãn thì list phải đổi sang dùng `allProductsState` + badge thay vì `productsState`.
- [x] Test coverage: **Thiếu** — BE chưa unit-test `getStockAvailableAttribute`/`isAvailable` cho trường hợp 0 batch; FE chưa test `isOutOfStock`/`productsState` filter và trạng thái disabled ở product-detail. (`FarmHubTest:212 test_products_today_empty_when_no_batches` chỉ phủ phía farm.)
- **✅ Đã sửa FE (B13):** Chốt thiết kế = **hiện trong list kèm badge "Hết hàng"** (thay vì ẩn). Các surface duyệt/tìm đổi nguồn từ `productsState` (đã lọc) sang **`allProductsState`** (không lọc): `flashSaleProductsState` (home `flash-sales.tsx`), `recommendedProductsState` + `searchResultState` (search `search/index.tsx`), `productsByCategoryState` (category `category-detail.tsx`), và **`RelatedProducts`** ("Sản phẩm liên quan" `related-products.tsx` — bổ sung sau review B13, PO chốt cho đồng bộ toàn catalog). `productsState` **giữ nguyên** để nơi khác còn dùng (lookup normalized trong `useAddToCart` đổi sang `allProductsState` để item hết hàng vẫn resolve được stock fresh). UI `components/product-item.tsx`: ảnh `opacity-50 grayscale` + badge **"Hết hàng"** (token `bg-danger`/`text-white`, không hardcode màu); nút "Thêm vào giỏ" thay bằng nút **disabled "Hết hàng"** khi `isOutOfStock`. Trang detail giữ nguyên (đã có "Sản phẩm đang hết hàng" + nút disabled). **Chỉ sửa FE.** Kiểm: `tsc --noEmit` pass + review thủ công (chưa có harness test FE).

---
