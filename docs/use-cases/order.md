# Nhóm: Đặt hàng & TT

## ORDER-01
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Thêm vài SP vào giỏ. 2) Đổi số lượng tăng/giảm.

**Kết quả mong đợi:**
Số lượng & tổng tiền tính đúng theo từng thay đổi.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `components/quantity-input.tsx` (stepper +/- + input number, min 0); `components/product-item.tsx:75-90` (QuantityInput `value=cartQuantity onChange=addToCart` ở list/home); `pages/catalog/product-detail.tsx:59-74,117-125` (stepper riêng + `addToCart(q => q+quantity)`); `hooks.ts:105-149 useAddToCart` (set qty, `≤0` → splice xoá item); `state.ts:417-426 cartTotalState` (`totalAmount = Σ price*quantity` trên `payableCartState`); `state.ts:635-645 cartGrandTotalState`. Trang giỏ `cart-item.tsx` chỉ HIỂN THỊ qty + swipe-to-delete (không có stepper inline); `cart-summary.tsx:43-44` hiện "Tạm tính".
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Tăng/giảm ở list (product-item) hoặc product-detail → `cartState` cập nhật → `cartTotalState`/`cartGrandTotalState` tính lại đúng theo từng thay đổi. *Lưu ý:* (1) **Trên chính trang giỏ KHÔNG sửa được số lượng** (chỉ xoá bằng swipe) — muốn đổi qty phải vào list/detail; (2) **KHÔNG có chặn trần theo tồn kho** ở stepper/QuantityInput → khách có thể đặt vượt tồn; chỉ bị chặn ở checkout (BE `checkAvailability` → 422 `shortages`) — liên quan nhóm STOCK; (3) input number cho nhập tay, `min 0`, nhập 0 = xoá item.
- [x] Test coverage: **Thiếu (FE)** — chưa có test cho `useAddToCart`/`cartTotalState`/`cartGrandTotalState`. BE không liên quan case này.

---

## ORDER-02
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Vào thanh toán. 2) Chọn địa chỉ giao (tỉnh/phường).

**Kết quả mong đợi:**
Phí vận chuyển hiện ra, cộng vào tổng.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `hooks/useShippingFee.ts` (debounce 500ms; POST `/shipping/estimate` khi có `province_id`+`ward_id`; auto-select dịch vụ đầu tiên `setSelectedService(prev ?? data[0])`); `pages/cart/shipping-address.tsx` (chọn tỉnh/phường VTP v3); `components/shipping-method-picker.tsx`; `pages/cart/cart-summary.tsx:47-67` (dòng "Phí vận chuyển"); `state.ts:635-645 cartGrandTotalState` (cộng `svc.total_fee`).
  - BE: `routes/api.php:60-62` `POST shipping/estimate` (rate-limit **60/phút**) → `ShippingController@estimate` → `ViettelPostService` (cache token/tỉnh/huyện).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Chọn địa chỉ (tỉnh+phường) → estimate trả danh sách dịch vụ → phí hiện ở "Phí vận chuyển" + cộng vào "Tổng thanh toán". *Lưu ý:* (1) VTP v3 bỏ cấp huyện — chỉ cần province+ward; (2) chưa chọn dịch vụ ship thì checkout chặn ("Vui lòng chọn dịch vụ vận chuyển trước khi thanh toán"); (3) offline/mock (`apiUrl` rỗng) → flat 35.000đ; (4) `disableCheckout` bật khi địa chỉ đủ nhưng estimate lỗi/rỗng.
- [x] Test coverage: **🟢 BE phủ tốt** — `ShippingEstimateTest` (8 test: trả services từ VTP, fallback khi VTP timeout, require ward, require auth, reject invalid province, provinces public, districts...). FE chưa test.

---

## ORDER-03
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Đặt hàng chọn COD (Sandbox). 2) Hoàn tất.

**Kết quả mong đợi:**
Đơn tạo thành công, trạng thái 'Chờ xác nhận', thanh toán = COD.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `hooks.ts:525-1002 useCheckout` — `COD_SANDBOX` ∈ `isOfflineFlow` (`codePrefix.startsWith("COD")`, :993-994) → tạo đơn, toast "Đặt hàng thành công", `finalizeCheckoutUI` (clear cart + navigate `/orders`), KHÔNG chờ PaymentDone; `pages/orders/order-summary.tsx:56-63` map `cod` → "Thanh toán khi nhận".
  - BE: `ZaloApiController@checkout` — `status='pending'`; `$isCodOrder = str_starts_with($paymentMethod,'COD')` (:313) → `payment_status='cod'` (:314), giữ `payment_method='COD_SANDBOX'`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp về chức năng (🟢).** Đơn tạo thành công, `payment_status='cod'`. *Sai lệch wording:* trạng thái lưu `='pending'` → phía khách nằm trong **tab "Đang xử lý"**; **KHÔNG có nhãn chữ "Chờ xác nhận"** ở màn khách (chuỗi "Chờ xác nhận" chỉ xuất hiện ở phía Farm `farm/orders.tsx`). `detail.tsx` không render label trạng thái đơn dạng chữ cho khách — chỉ hiện trạng thái thanh toán ("Thanh toán khi nhận") + nhãn refund.
- [x] Test coverage: **Thiếu assertion riêng** — `OrderCreationWithShippingTest::test_order_created_with_shipping_fields` + `test_pickup_order_with_zero_shipping_fee` phủ tạo đơn nhưng không khẳng định `payment_status='cod'` & `status='pending'` cho COD.

---

## ORDER-04
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🟢 Đạt (B1 — đã tách BANK khỏi offline flow)

**Ngữ cảnh & các bước:**
Dùng KH-1 (queue worker phải chạy). 1) Đặt hàng chọn Banking (Sandbox). 2) Thanh toán thành công trên cổng.

**Kết quả mong đợi:**
Quay lại app, đơn chuyển sang đã thanh toán.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `useCheckout` `isOfflineFlow` — **B1: chỉ còn `startsWith("COD")`**; BANK đi tiếp nhánh `PaymentDone` như MoMo (chờ xác nhận trả tiền, KHÔNG báo "Đặt hàng thành công" ngay). BANK_SANDBOX không fire PaymentDone → rơi vào timeout 10s fallback "Giao dịch đang xử lý" (đúng kỳ vọng production).
  - BE: lúc tạo `payment_status='pending'` (online); chuyển `'success'` qua `notifySDK` (fire `OrderPaymentSucceeded`) hoặc job `CheckPaymentStatus` (`returnCode==1`). `order-summary.tsx:60` `success` → "Đã thanh toán".
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **🟢 Đã sửa (B1).** Tách BANK khỏi `isOfflineFlow` → BANK chờ `PaymentDone`, không tự nhận "đặt hàng thành công" trước khi trả tiền → sẵn sàng production. Webhook/job vẫn xác nhận `payment_status='success'` → "Đã thanh toán".
- [x] Test coverage: **🟢 (B1)** — `ZaloNotifyTest::test_online_result_code_1_marks_success_and_fires_event` (method BANK_SANDBOX) + `CheckPaymentStatusJobTest::test_return_code_1_marks_success_and_fires_event`; regression `CommissionCreditedOnPaymentTest` vẫn xanh. FE: thay đổi 1 dòng (`isOfflineFlow`) chưa có test FE.

---

## ORDER-05
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1 (queue worker phải chạy). 1) Đặt hàng chọn MoMo (Sandbox). 2) Thanh toán thành công.

**Kết quả mong đợi:**
Đơn chuyển sang đã thanh toán.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `useCheckout:1004-1060` — `MOMO_SANDBOX` **KHÔNG** phải offline → mở SDK `createOrder`, chờ `EventName.PaymentDone` (race timeout 10s), `CheckoutSDK.checkTransaction` → `resultCode=1` toast "Thanh toán thành công" + `finalizeCheckoutUI`.
  - BE: như ORDER-04 — `notifySDK`/`CheckPaymentStatus` set `payment_status='success'` + fire `OrderPaymentSucceeded`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** MoMo là luồng online thật: PaymentDone `resultCode=1` → finalize; webhook/job xác nhận `success` → "Đã thanh toán". *Lưu ý:* nếu PaymentDone không fire trong 10s → fallback finalize (toast "Giao dịch đang xử lý"), đơn vẫn `pending` cho tới khi webhook/job xác nhận (đúng — không tự nhận paid).
- [x] Test coverage: như ORDER-04 (`CommissionCreditedOnPaymentTest` notify/job credit). **Thiếu** test gắn riêng method MOMO.

---

## ORDER-06
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** 🟢 Đã sửa (B1)

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Đặt hàng online (Bank/MoMo). 2) Đóng cổng / không trả tiền.

**Kết quả mong đợi:**
Đơn ở trạng thái chờ thanh toán, KHÔNG bị tính 'đã thanh toán'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `notifySDK` (**B1**: chặn default-success — online thiếu/sai `resultCode` → giữ `pending`, return `returnCode 0`, log; + race guard `status='cancelled'` → KHÔNG hồi sinh thành paid); `Jobs/CancelUnpaidOrder` (**MỚI B1**: tự huỷ đơn online `pending` quá `ZALO_UNPAID_TIMEOUT_MINUTES` (≈20′) + `releaseReservation` + nhả voucher; best-effort poll Zalo trước khi huỷ để cứu đơn đã trả nhưng webhook trễ); `Jobs/CheckPaymentStatus` (**B1**: thêm guard `status='cancelled'` → job poll không hồi sinh đơn đã huỷ); dispatch `CancelUnpaidOrder` từ `ZaloApiController::checkout` cho đơn online (phủ cả khi khách đóng cổng trước `/link`). `StockService::releaseReservation` hoàn `quantity_sold` + `depleted→active`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **🟢 Đã sửa (B1).** (1) Đơn online bỏ dở: sau ≈20′ job `CancelUnpaidOrder` huỷ đơn (`status='cancelled'`, `payment_status='failed'`, `cancelled_by='system'`) + **HOÀN KHO** + nhả voucher → hết kẹt kho; (2) BANK tách khỏi offline (xem ORDER-04); (3) `resultCode` thiếu/sai KHÔNG còn mặc định success. Race "trả tiền đúng lúc job chạy": `lockForUpdate` + re-check + best-effort poll cứu đơn đã trả; "notify paid đến sau khi đã huỷ" bị race guard chặn (giữ `cancelled`, log refund thủ công).
- [x] Test coverage: **🟢 (B1)** — `CancelUnpaidOrderTest` (6: huỷ+hoàn kho, không đụng paid/COD, poll cứu đơn đã trả / poll fail thì huỷ, idempotent); `ZaloNotifyTest` (thiếu/sai resultCode KHÔNG paid; race notify-sau-huỷ); `CheckPaymentStatusJobTest::test_cancelled_order_is_not_revived_by_poll`. `composer test:zalo` xanh (34).

---

## ORDER-07
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Để giỏ hàng trống. 2) Thử bấm đặt.

**Kết quả mong đợi:**
Không cho đặt / nút đặt mờ.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `pages/cart/index.tsx:15-17` (cart rỗng → `<EmptyCart/>`, không render `Pay`); `pages/cart/pay.tsx:23,33-37,51` (`noPayable = payableCart.length===0` → nút "Thanh toán" `disabled` + cảnh báo "Không có sản phẩm khả dụng để thanh toán"); `useCheckout:559-562` (guard `payableCart.length===0` → toast).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Giỏ rỗng → màn EmptyCart (không có nút đặt). Giỏ có item nhưng tất cả hết hàng → `payableCart` rỗng → nút "Thanh toán" mờ + cảnh báo. 3 lớp bảo vệ (render guard + disable + guard trong checkout).
- [x] Test coverage: **Thiếu (FE)** — chưa test render EmptyCart / disable nút. BE `checkout` validate `items` required (gián tiếp, không phải case này).

---

## ORDER-08
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** 🟢 (B17 — `composer test:zalo` 52 xanh)

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Ở bước đặt hàng, bấm nút đặt 2 lần thật nhanh (double tap).

**Kết quả mong đợi:**
Chỉ tạo 1 đơn, không bị nhân đôi.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `useCheckout:546,553-557,1075-1077` (`inFlightRef` — bỏ qua click khi luồng checkout đang chạy, reset ở `finally`); `pay.tsx:22,47-51` (`paying` state disable nút khi đang gọi).
  - BE: `ZaloApiController::store` (idempotency key `md5(customer_id + items(id:qty sorted) + total + payment_method + delivery_type)`; `Cache::get` hit → `respondDuplicatedOrder()` trả lại `orderId` cũ kèm `duplicated:true`, vẫn 201; `Cache::put(..., 90s)` sau khi tạo đơn). **B17:** critical section (re-check → tạo đơn → `Cache::put`) bọc trong **database lock** `Cache::store('database')->lock($lockKey,10)->block(3)` (release ở `finally`); migration `2026_06_12_000001_create_cache_locks_table`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢) — TOCTOU đã đóng (B17).** 3 lớp: FE `inFlightRef` chặn double-tap cùng client; BE fast-path `Cache::get` ngoài lock; **atomic lock** serialize 2 request đồng thời thật → request 2 đợi lock, RE-CHECK cache thấy `orderId` → trả `duplicated` thay vì tạo đơn 2. *Lưu ý hạ tầng:* production `CACHE_STORE=file` không hỗ trợ lock → cố tình trỏ lock vào `database` store (bảng `cache_locks`); nếu lock timeout 3s thì đi tiếp idempotency-an-toàn (re-check 1 lần, miss thì tạo — thà hiếm khi lọt hơn kẹt khách).
- [x] Test coverage: **🟢** — `tests/Feature/CheckoutIdempotencyTest` (3, đăng ký suite `Zalo`): 2× `/checkout` trùng → 1 đơn + lần 2 `duplicated:true` + `orderId` cũ; orderId đã cache short-circuit trước khi tạo đơn (thứ-tự add-trước/đọc-sau); payload khác (qty khác) → key khác → 2 đơn riêng. `composer test:zalo` 52 xanh.

---

## ORDER-09
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Thêm vài sản phẩm vào giỏ. 2) Mở 'Chọn mã giảm giá', áp dụng SALE10 (giảm 10%).

**Kết quả mong đợi:**
Hiển thị số tiền giảm 10% (không vượt mức trần 50.000đ); tổng tiền cập nhật đúng.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `VoucherService::breakdown:90-97` (percent: `floor(subtotal*value/100)`, `min(raw, max_discount_amount)`); `Voucher::TYPE_PERCENT`. Endpoint `GET vouchers/available` (preview) + `POST vouchers/validate`.
  - FE: `voucher-sheet.tsx:21-36 describeDiscount` ("Giảm 10% (tối đa 50.000đ)"); `useValidateVoucher`/`useAvailableVouchers` (hooks.ts:1237-1407); `cart-summary.tsx:69-77` (dòng "Giảm giá CODE -X"); `cartGrandTotalState` trừ `discount_subtotal`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Giảm 10% bị chặn trần bởi `max_discount_amount` (50.000đ); tổng cập nhật qua `cartGrandTotalState`. (Phụ thuộc voucher SALE10 được cấu hình `discount_type=percent, discount_value=10, max_discount_amount=50000` — xem ghi chú seeder ở ORDER-10.)
- [x] Test coverage: **🟢 Phủ tốt (BE)** — `VoucherCalculationTest::test_percent_with_max_cap` + `test_percent_without_cap` + `test_percent_rounds_down`; integration `OrderWithVoucherTest::test_order_with_percent_voucher_applies_discount`.

---

## ORDER-10
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🟢 Đạt (B9 — đã seed `GIAM20K`)

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Để tổng giỏ DƯỚI 100.000đ. 2) Áp dụng mã GIAM20K.

**Kết quả mong đợi:**
Bị chặn, báo 'Đơn tối thiểu 100.000đ...'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `Voucher::isUsable:90-91` (`$subtotal < (int)min_order_amount` → `'Đơn tối thiểu ' . number_format(min,0,',','.') . 'đ'`); `VoucherService::validate:44-46`; `VoucherApiController::validateCode` (422 + message). Cũng được re-validate ở `checkout:234-247` (422 `reason:voucher_invalid`).
  - FE: `voucher-sheet.tsx:63-65` (hiện `inputError` từ message BE) / list mark `usable=false` + `unusable_reason`; `useValidateVoucher` mock-fallback cùng message.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **ĐÃ XỬ LÝ (🟢) — B9.** CODE vốn đã đúng (message "Đơn tối thiểu 100.000đ", chặn ở cả validate lẫn checkout); nguồn 🔴 là **DỮ LIỆU**: repo thiếu seeder voucher. **Đã sửa:** tạo `database/seeders/VoucherSeeder.php` (idempotent `updateOrCreate` theo `code`) seed `GIAM20K` (`fixed` 20.000đ, `min_order_amount=100000`), `SALE10` (`percent` 10%, cap 50.000), `FREESHIP` (`free_shipping`); wire vào `DatabaseSeeder::run()`. (Settings `affiliate_*` đã có sẵn qua migration `2026_05_14_000004_seed_affiliate_settings.php` → không seed lại.)
- [x] Test coverage: **🟢 logic + seed được test** — `VoucherValidationTest::test_rejects_below_min_order`; **mới (B9)** `tests/Feature/VoucherSeederTest.php` (4): seeder tạo đúng 3 voucher + cấu hình `GIAM20K`, `isUsable` chặn đơn <100k ("Đơn tối thiểu 100.000đ") và `true` cho đơn ≥100k, seeder idempotent. **Thiếu** test integration ở tầng checkout cho min-order.

---

## ORDER-11
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Chọn giao hàng (có phí ship). 2) Áp dụng mã FREESHIP.

**Kết quả mong đợi:**
Phí vận chuyển về 0; tổng tiền giảm đúng phần phí ship.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `VoucherService::breakdown:103-112` (`TYPE_FREE_SHIPPING`: `value>0` → cap `min(value, shippingFee)`; `value=0` → free toàn bộ = `shippingFee`).
  - FE: `cart-summary.tsx:53-60` (gạch ngang phí cũ → còn `max(0, fee - discount_shipping)`); `cartGrandTotalState:642-644` trừ `discount_shipping`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** FREESHIP (value=0) → `discount_shipping = shippingFee` → phí về 0; tổng giảm đúng phần phí ship.
- [x] Test coverage: **🟢** — `VoucherCalculationTest::test_free_shipping_full` + `test_free_shipping_with_cap`; integration `OrderWithVoucherTest::test_order_with_free_shipping_voucher`.

---

## ORDER-12
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Chọn NHẬN TẠI TRẠM (không có phí ship). 2) Áp dụng mã FREESHIP.

**Kết quả mong đợi:**
Bị chặn, báo 'Mã chỉ áp dụng cho đơn giao hàng'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `VoucherService::validate:53-58` (`TYPE_FREE_SHIPPING` & `shippingFee<=0` → `'Mã chỉ áp dụng cho đơn giao hàng'`); `VoucherApiController::available:50-57` mark `usable=false`, reason `'Áp dụng cho đơn giao hàng'`.
  - FE: pickup mode → `shippingFee=0` (`deliveryModeState !== 'shipping'`); message từ BE hiện ở `voucher-sheet.tsx`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢)** — đúng từng chữ message kỳ vọng "Mã chỉ áp dụng cho đơn giao hàng". *Lưu ý nhỏ:* message ở `validate` (nhập tay) khác message ở `available` (list: "Áp dụng cho đơn giao hàng") — chỉ lệch nhẹ wording, không sai logic.
- [x] Test coverage: **🟢** — `VoucherValidationTest::test_free_shipping_rejected_when_no_shipping_fee` + `VoucherCalculationTest::test_free_shipping_zero_when_no_shipping_fee`.

---

## ORDER-13
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Mở 'Chọn mã giảm giá', nhập mã sai 'ABC123'. 2) Bấm Áp dụng.

**Kết quả mong đợi:**
Báo 'Mã giảm giá không tồn tại'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `VoucherService::validate:39-42` (`Voucher::whereRaw('UPPER(code)=?')` không thấy → `'Mã giảm giá không tồn tại'`).
  - FE: `voucher-sheet.tsx:54-71 handleApplyCode` → `useValidateVoucher` → hiện `result.error` ở `inputError`; mock-fallback (apiUrl rỗng) trả cùng message.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢)** — đúng từng chữ. So sánh code không phân biệt hoa/thường (UPPER), khớp `test_code_case_insensitive`.
- [x] Test coverage: **🟢** — `VoucherValidationTest::test_rejects_unknown_code` (+ `test_rejects_empty_code`).

---

## ORDER-14
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Ở bước giao hàng, chọn 'Nhận tại trạm'. 2) Xem danh sách trạm.

**Kết quả mong đợi:**
Hiện danh sách trạm kèm khoảng cách; không phát sinh phí vận chuyển.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `pages/cart/stations.tsx` (render name/address/distance, chọn → set index + toast + back); `state.ts:447-511 stationsState` (`getLocation` → `decodeLocationToken` → `calculateDistance`/`formatDistant`, normalize nhiều shape toạ độ); `pages/cart/delivery.tsx:146` (`ShippingServiceSection` chỉ render khi `shipping` → pickup KHÔNG có phí); `cart-summary.tsx:49` (pickup → "—").
  - BE: `routes/api.php:28 GET stations` → `ZaloApiController@stations`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Danh sách trạm hiện kèm khoảng cách; pickup không phát sinh phí ship. *Lưu ý:* `distance` chỉ hiện khi station có toạ độ hợp lệ VÀ khách cấp quyền vị trí (`getLocation`); từ chối quyền/station thiếu toạ độ → `distance=undefined`, không hiện (degrade im lặng, không lỗi).
- [x] Test coverage: **Thiếu** — BE chưa test endpoint `/stations` (shape/sort); FE chưa test `stationsState` (distance/normalize toạ độ).

---

## ORDER-15
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Chọn nhận tại trạm + COD. 2) Đặt hàng.

**Kết quả mong đợi:**
Đơn tạo thành công dạng 'nhận tại trạm', không tạo đơn vận chuyển VTP.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `checkout:366-393` (pickup → resolve station snapshot `station_name/image/lat/lng/address` từ `station_id`); `:432` (VTP inline **chỉ khi** `delivery->type==='shipping'` → pickup BỎ QUA); listener `CreateVtpOrderOnPayment:43-46` cũng skip non-shipping.
  - FE: `useCheckout:676-682` (deliveryData `type:'pickup'`, gửi `station_id`).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Đơn pickup + COD: tạo đơn thành công, lưu snapshot trạm, KHÔNG gọi VTP (cả luồng COD-inline lẫn listener-on-payment).
- [x] Test coverage: **🟢** — `VtpCreateOrderTest::test_pickup_order_does_not_call_vtp` (mock `shouldNotReceive('createOrder')`) + `OrderCreationWithShippingTest::test_pickup_order_with_zero_shipping_fee`.

---

## ORDER-16
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1 (queue worker phải chạy). 1) Đặt đơn GIAO HÀNG + thanh toán online (Bank/ZaloPay/MoMo Sandbox) thành công. 2) Đợi ~1 phút, mở chi tiết đơn.

**Kết quả mong đợi:**
Đơn có mã vận đơn ViettelPost (tạo tự động sau khi thanh toán).

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `Listeners/CreateVtpOrderOnPayment` (on `OrderPaymentSucceeded`: skip COD `:37-41` & non-shipping `:43-46`; idempotent guard `vtp_order_number` `:51-53` → `VtpOrderService::dispatchOrderToVtp`); đăng ký `EventServiceProvider:26-29`; event fire từ `notifySDK:1257` hoặc `CheckPaymentStatus:89`. (COD-shipping đã tạo VTP inline lúc checkout `:432`, listener skip.)
  - FE: `pages/orders/order-tracking.tsx` (render mã + hành trình khi `delivery.type==='shipping'` && `vtpOrderNumber`).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp logic (🟢).** Online (BANK/ZALOPAY/MOMO) shipping trả thành công → `OrderPaymentSucceeded` → `CreateVtpOrderOnPayment` tạo VTP → khách thấy mã vận đơn. *Lưu ý:* VTP fail không rollback (chỉ log; retry qua `artisan vtp:retry-create`).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch (test): **🟡 Thiếu test cho nhánh listener** — `VtpCreateOrderTest::test_shipping_order_calls_vtp` chỉ phủ path **COD-inline** (payload helper KHÔNG gửi `payment_method` → default COD → VTP tạo trong `store()`). KHÔNG có test nào fire `OrderPaymentSucceeded` với đơn BANK/MOMO shipping để khẳng định VTP tạo qua listener, cũng không test guard skip-COD/skip-pickup của listener.
- [x] Test coverage: **🟡** — như trên: phủ tốt COD-inline (`test_shipping_order_calls_vtp`, `test_vtp_failure_does_not_rollback_order`, `test_dispatch_throws_if_order_already_has_vtp_number`); **thiếu** test listener on-payment (ORDER-16 đúng nghĩa).

---
