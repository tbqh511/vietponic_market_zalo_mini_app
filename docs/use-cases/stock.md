# Nhóm: Quản lý kho

## STOCK-01
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng OWNER-A. 1) Vào màn 'Khai báo nhập kho buổi sáng'. 2) Nhập 2-3 mặt hàng với số lượng. 3) Lưu.

**Kết quả mong đợi:**
Tồn kho mỗi mặt hàng tăng đúng số vừa nhập.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/pages/farm/stock-in.tsx` (màn "Khai báo nhập kho buổi sáng") → submit `POST /farm/stock-in/batch` body `{ items: [{product_id, quantity}] }`; hook `useStockInSuggestions` (`hooks.ts`) đọc `GET /farm/stock-in/suggestions`; lối vào `src/components/farm/stock-in-fab.tsx`; route trong `src/router.tsx`.
  - BE: `Farm/FarmStockController@importBatch:468-556` (route `api.php:90`, middleware `zalo.farm` gắn `farm` vào request — không tra farm theo URL/customer, tránh IDOR). Validate `items.*.product_id|quantity`; chặn SKU không thuộc farm (pivot `farm_product`) → 403 `'Một số sản phẩm chưa được gán cho farm…'`; mỗi dòng `FarmStockBatch::create(status='active', quantity_sold=0)` trong 1 transaction. Tồn = SUM(batch active `quantity_remaining`) nên batch mới làm tồn tăng đúng `quantity_in`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Mỗi lần khai báo tạo **batch MỚI** (không cộng dồn vào lô cũ) — đúng mô hình batch; tồn tổng `stock_available` vẫn tăng đúng tổng đã nhập. *Lưu ý:* màn này gửi cả các dòng auto-hiện (SKU cháy hàng/`suggested_qty>0`) — owner phải kiểm lại số trước khi bấm "Gửi khai báo" để không nhập dư.
- [x] Test coverage: `test_stock_in_batch_creates_multiple_batches` (FarmHubTest:743) ✅ + `test_stock_in_batch_rejects_unowned_product` (:780) ✅. **Thiếu:** assert `stock_available`/tồn tổng tăng đúng sau import (test chỉ đếm số batch + check expire), và test 403 đã rollback (không tạo batch nào).

---

## STOCK-02
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ✅ Đã sửa FE (B12)

**Ngữ cảnh & các bước:**
Dùng OWNER-A. 1) Nhập 1 lô có chọn HẠN SỬ DỤNG. 2) Xem lại lô vừa nhập.

**Kết quả mong đợi:**
Lô hiển thị đúng ngày hết hạn đã nhập.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE (đã hỗ trợ): `importBatch:473-481` validate `items.*.expire_date nullable|date` — nếu không truyền thì auto = `batch_date + DEFAULT_SHELF_LIFE_DAYS (5)` (`:519-520`); `import:564-604` (per-SKU, route `api.php:83`) cũng nhận `expire_date` nhưng nếu không truyền → `null` (lô KHÔNG hạn). `indexBatches` (view=batches, `:54-102`) TRẢ `expire_date`.
  - FE (thiếu): `stock-in.tsx:98-105` CHỈ gửi `{product_id, quantity}` — **không có date picker**; ô "Hạn sử dụng (tươi)" (`:344-353`) là **read-only** hiển thị `suggested_expire_date` (giá trị gợi ý, chưa lưu). `import-sheet.tsx:39` chỉ gửi `{quantity, note}` → lô KHÔNG hạn. Không màn nào gọi `inventory?view=batches`; `inventory-list.tsx`/`movements.tsx` **không** hiển thị `expire_date`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **🟡 Không khớp ở FE.** Người dùng **không thể "chọn hạn sử dụng"** ở bất kỳ màn nhập nào (BE có nhận `expire_date` nhưng FE không expose). Và sau khi nhập, **không có màn nào hiển thị `expire_date` của lô đã lưu** (list/movements đều là SKU-aggregate). Kỳ vọng "chọn hạn → lô hiển thị đúng hạn" chưa thực thi. Cần: thêm date picker ở `stock-in`/`import-sheet` + màn xem lô (view=batches) show `expire_date`.
- [x] Test coverage: `test_stock_in_batch_creates_multiple_batches` (:769-773) assert `expire_date = batch_date + 5` — chỉ phủ **nhánh AUTO**, KHÔNG phủ nhánh user truyền `expire_date` thủ công. **Thiếu** test importBatch/import với `expire_date` do client gửi.
- **✅ Đã sửa FE (B12):** (1) **Date picker hạn sử dụng** (`zmp-ui` `DatePicker`, **optional**) ở cả 2 màn nhập — `startDate`=hôm nay (chặn chọn quá khứ), hiển thị `dd/mm/yyyy`, gửi BE đúng `YYYY-MM-DD`. `stock-in.tsx`: picker **từng dòng**, mặc định giá trị gợi ý `suggested_expire_date` (vẫn sửa được); bỏ trống → không gửi field → BE auto `batch_date + 5`. `import-sheet.tsx`: field "Hạn sử dụng (tùy chọn)"; bỏ trống → lô không hạn (BE `null`). (2) **Màn xem lô**: thêm tab **"Lô hàng"** trong trang `/farm/movements/:id` dùng hook **`useFarmBatches`** (`usePolling` `view=batches&product_id=X`, KHÔNG useState+useEffect) — hiện `expire_date` từng lô (dd/MM/yyyy, "Không hạn" nếu null) + **cảnh báo màu**: `daysUntil<0` → badge đỏ "Đã hết hạn"; `0–6` (<7 ngày) → badge cam "Sắp hết hạn · còn N ngày". Helper `toYmd`/`formatYmdDisplay`/`daysUntil` (`farm-api.ts`) + type `InventoryBatch`. (3) **Bug đã sửa luôn:** `import-sheet.tsx` gọi sai route `POST /farm/inventory/{id}/import` (405 — route thực `POST /farm/inventory/import`, `product_id` trong body) → đã đổi đúng. **Test BE +3** phủ nhánh client-supplied `expire_date` (importBatch / import per-SKU có & không hạn / `view=batches` trả đúng `expire_date`) → `FarmHubTest` **40 passed**; `tsc --noEmit` sạch. **BE không đổi code** (đã hỗ trợ sẵn).

---

## STOCK-03
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Ghi lại tồn kho SP X (vd 10kg). 2) Đặt mua 3kg, hoàn tất đơn. 3) Quay lại xem tồn kho SP X.

**Kết quả mong đợi:**
Tồn kho còn 7kg (giảm đúng 3kg).

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `ZaloApiController@checkout` — sau khi tạo `ZaloOrder` + `ZaloOrderItem` trong transaction, gọi `stockService->reserveItems($order->id, $stockItems)` (`:408`). `StockService::reserveItems→allocateOneItem:122-227` phân bổ FEFO, tăng `batch.quantity_sold` theo qty (`quantity_remaining` = generated col, SQLite tự bù tay `:174-178`). `checkAvailability` (`:287`) chặn trước nếu thiếu.
  - Tồn khách thấy = `ZaloProduct::getStockAvailableAttribute:99-105` = SUM(active batch remaining); API `products:66` trả `stock_available`. FE `state.ts allProductsState` đọc lại khi vào app.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Mua 3/10 → batch.quantity_sold +3 → remaining 7 → `stock_available` = 7kg. **Lưu ý quan trọng:** kho bị trừ **NGAY khi tạo đơn** (reserve = deduct, không 2-phase; `deductOnPayment` là no-op `:276-279`), kể cả đơn online **chưa thanh toán**. Nếu khách bỏ dở thanh toán, kho chỉ được hoàn khi đơn bị huỷ (customer/admin/job/VTP webhook) → xem STOCK-06. Có thể tạm "giam" tồn cho tới khi job `CheckPaymentStatus` (~20p) huỷ đơn pending.
- [x] Test coverage: reserveItems FEFO tests (`:393`, `:477`) assert `quantity_sold` tăng đúng từng batch. **Thiếu** test end-to-end `POST /checkout` rồi assert `stock_available` giảm đúng (10→7) và remaining batch.

---

## STOCK-04
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ✅ Đã sửa FE (B13)

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Chọn SP Y chỉ còn 2kg. 2) Thử đặt 5kg.

**Kết quả mong đợi:**
Bị chặn: 'Một số sản phẩm không đủ số lượng tồn kho'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `ZaloApiController@checkout:287-294` `checkAvailability($stockItems)` → khi thiếu trả **422** với `message` **đúng từng chữ** `'Một số sản phẩm không đủ số lượng tồn kho'` + mảng `shortages[{product_id, product_name, requested, available}]`. `StockService::checkAvailability:50-86` aggregate SUM(active remaining) theo product, dung sai `1e-6`.
  - FE: `hooks.ts:774-784` (`useCheckout`) — nếu 422 + `shortages` → tạo Error message chi tiết `'Một số sản phẩm không đủ tồn kho:\n• {tên}: chỉ còn {available} (bạn đặt {requested})'`; product-detail (`product-detail.tsx`) **KHÔNG** giới hạn số lượng theo tồn (nút `+` chỉ tăng, không cap theo `stockAvailable`).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢) — chặn ở server.** Đặt 5kg/2kg → 422 message gốc đúng kỳ vọng. *Sai lệch:* (1) FE **không chặn sớm** ở bước chọn số lượng/thêm giỏ — khách thêm thừa rồi mới bị chặn ở checkout (UX); (2) FE **viết lại** message (thêm chi tiết "chỉ còn X / bạn đặt Y"), không hiện đúng nguyên văn chuỗi BE — nội dung hữu ích hơn nhưng khác từ ngữ. Cân nhắc thêm cap số lượng client-side theo `stockAvailable`.
- [x] Test coverage: `test_check_availability_returns_shortage_when_insufficient` (FarmHubTest:542) ✅ + `test_check_availability_returns_true_when_sufficient` (:574) ✅ (mức service). **Thiếu** feature test `POST /checkout` thực tế trả 422 + assert message/`shortages`.
- **✅ Đã sửa FE (B13):** (1) **Cap số lượng client theo `stockAvailable`** — `components/quantity-input.tsx` thêm prop `maxValue`: clamp giá trị (− / + / nhập tay), **disable nút "+"** khi đạt max và hiện **"Còn lại X"** (token `text-subtitle`, không hardcode màu). `ProductItem` truyền `maxValue={product.stockAvailable}`. Trang detail (`product-detail.tsx`) stepper riêng cũng cap: disable "+" + "Còn lại X" khi `quantity >= stockAvailable`. `maxValue === undefined` (mock/offline) → **không cap** (giữ behaviour cũ). (2) **Giữ NGUYÊN chốt chặn BE 422** — không đụng BE. (3) Khi BE trả 422 tồn kho, FE **không viết lại** message: dùng **nguyên văn `parsed.message`** của BE làm dòng đầu, rồi liệt kê `shortages` dưới dạng **dữ liệu thô** (`• {tên} — còn {available} / đặt {requested}`), không diễn giải lại câu chữ (`hooks.ts` `useCheckout`). **Chỉ sửa FE.** Kiểm: `tsc --noEmit` pass.

---

## STOCK-05
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Chọn SP chỉ còn 1 lô. 2) Mua hết sạch số lượng còn lại.

**Kết quả mong đợi:**
SP chuyển sang 'Hết hàng' sau khi đặt.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `StockService::allocateOneItem:182-185` — khi `quantity_remaining <= 1e-6` thì set `batch.status='depleted'`; SUM(active remaining)=0 → `stock_available`=0; `checkAvailability` lần sau trả shortage.
  - FE: `state.ts:43 isOutOfStock` (`stockAvailable` number && `<=0`); `productsState` ẩn khỏi list/search/home/category; `product-detail.tsx:107-120` hiện "Sản phẩm đang hết hàng" + nút "Hết hàng" `disabled`. (Trùng cơ chế PROD-05.)
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢) ở backend.** Mua hết lô cuối → batch `depleted`, `stock_available`=0 → SP "hết hàng". *Lưu ý (liên kết PROD-05):* sau khi hết, SP **bị ẩn hoàn toàn** khỏi list/search (do `productsState` filter) — khách chỉ thấy nhãn "Hết hàng" khi vào **thẳng product-detail**; không thấy badge trong danh sách. Là quyết định thiết kế (ẩn vs badge) cần chốt với product owner.
- [x] Test coverage: FEFO tests assert `status='depleted'` sau khi trừ hết lô (`:450`, `:531`) ✅. **Thiếu** test khẳng định `stock_available`=0 sau allocation và FE chuyển trạng thái disabled/ẩn.

---

## STOCK-06 ✅ (B6)
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** 🟢 Đạt (đã bổ sung test B6)

**Ngữ cảnh & các bước:**
Cần Khách + Admin. 1) KH-1 ghi tồn kho, đặt 1 đơn (trừ kho). 2) Admin huỷ đơn đó. 3) Xem lại tồn kho.

**Kết quả mong đợi:**
Tồn kho được HOÀN LẠI đúng số đã trừ.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `StockService::releaseReservation:238-270` — quét `zalo_order_items` có `farm_stock_batch_id`, giảm `batch.quantity_sold -= item.quantity` (`lockForUpdate`), và **revert `status` depleted→active** để bán tiếp; SQLite bù `quantity_remaining` tay. Gọi từ: admin `PATCH orders/{id}/status` (`ZaloApiController:571`), customer cancel `orders/{id}/cancel` (`:684`), và VTP webhook cancel.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢) ở code.** Huỷ đơn → hoàn đúng số đã trừ vào từng batch nguồn (theo `farm_stock_batch_id` đã ghi lúc reserve), không xoá row order_item (giữ audit), revert lô đã depleted về active. *Lưu ý:* release bọc try/catch + chỉ log nếu lỗi (không chặn việc huỷ đơn) — nếu releaseReservation văng lỗi giữa chừng, đơn vẫn cancelled nhưng kho có thể hoàn thiếu (không retry).
- [x] Test coverage: **✅ Đã bổ sung (B6 — 2026-06-11).** Kết luận điều tra: assert bị bỏ ở `ViettelPostWebhookTest:204-206` là do **lỗ hổng fixture** (setup cũ chạm `stock_reserved`/`stock_movements` đã gỡ khi sang FEFO; order không có item gắn batch → release no-op), **KHÔNG phải code bug**. Đã phủ:
  - `tests/Feature/StockReleaseOnCancelTest.php` (mới): `test_customer_cancel_cod_restores_stock_per_item` (sold→0, remaining hoàn đủ), `test_admin_cancel_restores_stock`, `test_cancel_reverts_depleted_batch_to_active` (depleted→active), `test_cancel_multi_batch_order_restores_each_batch` (mỗi lô hoàn đúng phần của mình), `test_customer_cancel_cod_sets_refund_status_not_required_and_restores_stock` (ORDPRO-08).
  - `ViettelPostWebhookTest::test_status_504_returns_cancels_order_and_releases_stock`: **khôi phục assert** — thêm fixture batch + reserve, assert sau 504 cancel kho hoàn đủ + lô depleted→active.
  - `CancelUnpaidOrderTest::test_auto_cancel_reverts_depleted_batch_to_active`: nhánh job B1 (auto-cancel đơn online timeout) cũng hoàn kho + depleted→active. (Nhánh job hoàn kho cơ bản đã có sẵn ở `test_cancels_unpaid_online_order_and_releases_stock`.)
  - Toàn bộ xanh: StockReleaseOnCancelTest (5), CancelUnpaidOrderTest (7), ViettelPostWebhookTest (13), FarmHubTest (29).

---

## STOCK-07
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Cần Owner + Khách. 1) OWNER-A nhập 2 lô cùng 1 SP: lô A hết hạn sớm hơn lô B. 2) KH-1 mua 1 ít. 3) Owner xem lô nào bị trừ.

**Kết quả mong đợi:**
Số lượng bị trừ vào LÔ A (hết hạn sớm) trước.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `FarmStockBatch::scopeFefo:88-95` — `ORDER BY expire_date IS NULL ASC, expire_date ASC, batch_date ASC, id ASC` (lô có hạn trước, NULL xuống cuối; tie-break lô cũ → id). `StockService::allocateOneItem:130-136` dùng `->fefo()->lockForUpdate()` để chọn batch trừ trước; `ZaloProduct::activeBatches:69-78` cùng thứ tự FEFO.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Lô A (hạn sớm) bị trừ trước, hết mới sang lô B. `lockForUpdate` chống race 2 đơn cùng trừ 1 batch xuống âm. Không có sai lệch.
- [x] Test coverage: **Phủ tốt.** `test_fefo_allocates_earliest_expiry_first` (FarmHubTest:393) ✅ (A exp+3 trừ hết 5 → depleted; B exp+10 trừ 2); `test_fefo_batch_with_no_expiry_allocated_last` (:477) ✅ (lô không hạn để sau cùng).

---
