# Nhóm: Xử lý đơn

## ORDPRO-01
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Cần Khách + Owner. 1) KH-1 đặt 1 đơn có SP của Farm A. 2) OWNER-A mở 'Đơn đang đến'.

**Kết quả mong đợi:**
Đơn mới xuất hiện (trong ~30s), đúng SP & số lượng.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `routes/api.php:99` `GET orders/incoming` → `FarmHubController@incomingOrders:~460-540` (middleware `zalo.farm`). Query join `zalo_order_items oi` + `zalo_orders o` + `zalo_deliveries d`, lọc `o.status IN (pending,confirmed,preparing,delivering)`. Farm thường (`!isHub`) chỉ thấy đơn có ≥1 item của mình (`whereExists mine.farm_id`) **và chỉ phần item của farm mình** (`where oi.farm_id=$farm->id`); hub thấy mọi đơn. Trả `quantity`/`price`/`product_name`/`order_status`… `orderByDesc(o.created_at) limit 200`.
  - FE: `src/utils/farm-api.ts:189-193 useFarmIncomingOrders` → `usePolling("/farm/orders/incoming")` với **poll mặc định 30s** (farm-api.ts:18-19, skip khi tab ẩn); `src/pages/farm/orders.tsx:129,140-177` render danh sách.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** OWNER-A mở "Đơn đang đến" → poll 30s tự kéo đơn mới của Farm A kèm đúng SP/số lượng (quantity, product_name từ `zalo_order_items`). *Lưu ý:* poll 30s **tạm dừng khi webview ẩn** (visibilityState hidden) → nếu owner để app nền thì có thể chậm hơn 30s cho tới khi quay lại foreground (đúng thiết kế Mini App, không phải lỗi).
- [x] Test coverage: `OrderPackingTest:559 test_incoming_orders_mask_phone_and_address` phủ endpoint (che SĐT/địa chỉ). **Thiếu** test khẳng định "đơn mới của farm xuất hiện trong incoming với đúng quantity/product" và test isolation 2 farm trên incoming (đã ghi nhận ở ROLE-06).

---

## ORDPRO-02
- **Vai trò:** Admin | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Cần Admin + Khách. 1) Admin xác nhận đơn (pending → confirmed). 2) KH-1 mở lại đơn của mình.

**Kết quả mong đợi:**
Trạng thái đơn phía khách cũng đổi sang 'Đã xác nhận'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE (admin): 2 đường cùng đổi status — (a) admin web `routes/web.php:112` `ZaloOrderController@update:123-210`; (b) API admin `routes/api.php:133` `PATCH orders/{id}/status` → `ZaloApiController@updateStatus:506-611` (middleware `zalo.admin`, header `X-Admin-Secret`). Đổi `pending→confirmed` lưu DB + `dispatchOrderNotification(status_changed)`.
  - FE (khách): `src/pages/orders/detail.tsx:33-46` fetch `GET /orders/{id}` mỗi lần mở; map status BE→FE qua `convertApiOrderToOrder` (state.ts) + `ORDER_STATUS_MAP` (state.ts:530-534, `confirmed` ∈ tab `pending`/"Đang xử lý").
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Admin set `confirmed` → khách mở lại đơn (re-fetch) thấy trạng thái cập nhật. *Lưu ý UX:* cập nhật phía khách **không real-time** — khách phải mở lại trang đơn mới thấy (không có push/polling ở màn chi tiết khách). `confirmed` hiển thị trong tab "Đang xử lý" (cùng nhóm với pending/preparing), không có nhãn tab riêng "Đã xác nhận" — vẫn đúng về trạng thái nhưng nhãn 4-tab gộp 3 status đầu.
- [x] Test coverage: `ZaloNotificationTest:82 test_admin_status_change_dispatches_status_changed` (dùng `preparing`) + `:108 test_no_dispatch_when_status_unchanged`. **Thiếu** test khẳng định `GET /orders/{id}` phía khách trả đúng status sau khi admin đổi.

---

## ORDPRO-03
- **Vai trò:** Admin | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Trên admin web. 1) Chuyển đơn theo thứ tự: Đã xác nhận → Đang chuẩn bị → Đang giao → Đã giao.

**Kết quả mong đợi:**
Mỗi bước lưu được, không lỗi.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE admin web: `ZaloOrderController@update:123-177`. Validate `status: nullable|string|max:255`; guard chặn lùi (delivering/delivered → pending/confirmed/preparing) + chặn huỷ đơn delivered; ngược lại `$order->update($data)` trong transaction, recalc `total` từ items. Khi `→delivered` set `delivered_at=now()` (idempotent, web:164-171).
  - View: `resources/views/admin/zalo_orders/edit.blade.php` (dropdown status).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Chuỗi tiến confirmed→preparing→delivering→delivered đều là chuyển "tiến" → không vướng guard → lưu OK từng bước; `delivered_at` được chốt ở bước cuối. *Sai lệch/Lưu ý:* (1) admin web **không ràng buộc enum** status (`nullable|string|max:255`) → về lý thuyết nhập status rác vẫn lưu (API `updateStatus` thì có `in:...`); (2) **không bắt buộc đi tuần tự** — admin có thể nhảy confirmed→delivered trực tiếp (use case chỉ yêu cầu "mỗi bước lưu được", nên không phải lỗi, nhưng là khoảng hở quy trình).
- [x] Test coverage: **Thiếu** test happy-path đi hết chuỗi 4 bước và assert `delivered_at`. Mapping status từ webhook VTP có test gián tiếp (`ViettelPostWebhookTest:134/142/150`). Admin-web update CRUD chưa có Feature test.

---

## ORDPRO-04
- **Vai trò:** Admin | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Trên admin web. 1) Chọn đơn đang 'Đang giao'. 2) Thử đổi NGƯỢC về 'Chờ xác nhận'.

**Kết quả mong đợi:**
Bị chặn, báo 'Không thể chuyển đơn từ ... về ...'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE admin web: `ZaloOrderController@update:150-159` — nếu `previousStatus ∈ {delivering,delivered}` và `newStatus ∈ {pending,confirmed,preparing}` → `redirect()->back()->withErrors(['status' => "Không thể chuyển đơn từ \"{$previousStatus}\" về \"{$data['status']}\"."])`.
  - BE API: `ZaloApiController@updateStatus:535-543` — cùng guard, trả `422 {error:true, message:"Không thể chuyển đơn từ \"…\" về \"…\"."}`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Đơn `delivering` → đổi về `pending`/`confirmed`/`preparing` đều bị chặn với message đúng mẫu kỳ vọng. *Lưu ý:* guard chỉ chặn về 3 status trước; **không chặn** delivering↔delivered hay delivered→delivering (chỉnh sửa cùng/ kế cận vẫn cho) — nằm ngoài phạm vi case này.
- [x] Test coverage: **🔴 Thiếu** — không có test nào assert 422 + chuỗi "Không thể chuyển đơn từ" (cả admin web lẫn API). Cần thêm khi sửa.

---

## ORDPRO-05
- **Vai trò:** Admin | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Trên admin web. 1) Chọn đơn 'Đã giao'. 2) Thử huỷ.

**Kết quả mong đợi:**
Bị chặn: 'Không thể hủy đơn hàng đã giao thành công'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE admin web: `ZaloOrderController@update:135-142` — `newStatus='cancelled'` & `previousStatus='delivered'` → `withErrors(['status' => 'Không thể hủy đơn hàng đã giao thành công. Liên hệ kế toán nếu cần xử lý hoàn tiền thủ công.'])`.
  - BE API: `ZaloApiController@updateStatus:521-527` → `422 {message:'Không thể hủy đơn hàng đã giao thành công (status: delivered). Liên hệ kế toán để xử lý hoàn tiền thủ công nếu cần.'}`.
  - BE khách: `cancelByCustomer:643-648` — khách chỉ huỷ được khi status ∈ {pending,confirmed,preparing}; `delivered` → 422 'Đơn hàng đang ở trạng thái "delivered" — không thể huỷ…'.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Đơn delivered bị chặn huỷ ở cả admin web/API/khách. *Sai lệch nhỏ về chuỗi:* message admin/API có thêm đuôi "(status: delivered). Liên hệ kế toán…" so với chuỗi rút gọn trong use case — vẫn chứa đúng cụm 'Không thể hủy đơn hàng đã giao thành công'.
- [x] Test coverage: **🔴 Thiếu** — không có test assert 422 + 'Không thể hủy đơn hàng đã giao thành công' (admin lẫn khách). Cần thêm khi sửa.

---

## ORDPRO-06
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Mở trang Đơn hàng. 2) Xem 4 tab: Đang xử lý / Đang giao / Lịch sử / Đã huỷ.

**Kết quả mong đợi:**
Mỗi đơn nằm đúng tab theo trạng thái.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/pages/orders/index.tsx:18-29` 4 tab — `pending`="Đang xử lý", `shipping`="Đang giao", `completed`="Lịch sử", `cancelled`="Đã huỷ"; mỗi tab `OrderList ordersState(<key>)`.
  - FE map: `src/state.ts:530-534 ORDER_STATUS_MAP` (`pending:[pending,confirmed,preparing]`, `shipping:[delivering]`, `completed:[delivered]`, `cancelled:[cancelled]`); `state.ts:537-559 ordersState` lọc theo `allowedStatuses`.
  - BE: `GET orders` → `ZaloApiController` trả danh sách đơn của customer (status gốc 6 giá trị).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** 6 status backend gộp đúng vào 4 tab; mọi status đều có tab tương ứng (không rơi rớt). Đồng bộ với khế ước trong CLAUDE.md ("đổi status phải sửa cả allowed-list controller lẫn ORDER_STATUS_MAP"). *Lưu ý:* `confirmed`/`preparing` nằm chung tab "Đang xử lý" với `pending` (đúng thiết kế gộp 6→4).
- [x] Test coverage: **Thiếu** test FE cho `ordersState` filter theo từng tab (đảm bảo không có status rơi ngoài 4 nhóm). Không có test tự động cho phần FE này.

---

## ORDPRO-07
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Đặt 1 đơn COD có giao hàng (ship). 2) Xem chi tiết đơn.

**Kết quả mong đợi:**
Có mã vận đơn VTP / thông tin theo dõi được tạo.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE tạo VTP cho COD ship **ngay tại checkout**: `ZaloApiController@checkout:426-445` (chỉ khi `isCodOrder && delivery.type==='shipping'`) → `VtpOrderService@dispatchOrderToVtp:35-165` build payload → `ViettelPostService@createOrder:215` → lưu `zalo_deliveries.vtp_order_number` (VtpOrderService:148). Online (BANK/ZALOPAY/MOMO) tạo qua listener `CreateVtpOrderOnPayment` sau khi payment success. Tracking cập nhật qua webhook `/notify` VTP → `VtpWebhookService`/`VtpTrackingEvent`.
  - FE: `src/pages/orders/order-tracking.tsx:28-82` — chỉ hiện khi `delivery.type==='shipping' && delivery.vtpOrderNumber`; hiện "Mã VTP: …" + timeline `trackingEvents` (icon theo `STATUS_ICON`).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Đơn COD + ship → VTP được gọi đồng bộ trong checkout, lưu mã vận đơn → FE hiện mã + hành trình. *Lưu ý:* nếu VTP createOrder fail thì **KHÔNG rollback đơn** (chỉ log) → đơn vẫn tạo nhưng `vtp_order_number=null` → FE ẩn khối tracking; admin retry qua `zalo-orders/{order}/vtp-retry` (web.php:113). Đơn **pickup** không tạo VTP (đúng).
- [x] Test coverage: **🟢 Phủ tốt** — `VtpCreateOrderTest`: `test_shipping_order_calls_vtp_and_saves_order_number:121`, `test_pickup_order_does_not_call_vtp:146`, `test_vtp_failure_does_not_rollback_order:162`, `test_dispatch_throws_if_order_already_has_vtp_number:182`. Webhook/tracking phủ ở `ViettelPostWebhookTest`. **Thiếu** test FE order-tracking render.

---

## ORDPRO-08 ✅ (B6 kho + B5 refund)
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🟢 Đạt (B6: kho + refund_status; B5: assert COD không gọi refund API)

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Đặt 1 đơn COD (chưa giao). 2) Vào đơn, bấm Hủy, chọn lý do.

**Kết quả mong đợi:**
Báo 'Đơn chưa thanh toán, không phát sinh hoàn tiền'; đơn chuyển 'Đã huỷ'; tồn kho được hoàn lại.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/pages/orders/cancel-modal.tsx` — chọn lý do → `useCancelOrder` (hooks.ts:1109) → `POST /orders/{id}/cancel {reason_code, reason}`. `refundExpectationMessage:20-36`: COD/chưa trả → **"Đơn hàng chưa thanh toán, không phát sinh hoàn tiền."** `detail.tsx:14-20 REFUND_STATUS_LABEL.not_required`="Không phát sinh hoàn tiền".
  - BE: `cancelByCustomer:618-723` (transaction set `status='cancelled', cancelled_by='customer'`) → sau commit: `stockService->releaseReservation` (:684) + `refundService->processCancellationRefund(order,'customer')`. `RefundService:32-39`: COD hoặc chưa `payment_status='success'` → `refund_status='not_required'`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢) cả 3 vế.** (1) Message FE đúng "Đơn hàng chưa thanh toán, không phát sinh hoàn tiền."; (2) status → cancelled; (3) `releaseReservation` hoàn batch (revert quantity_sold + depleted→active). *Lưu ý:* khớp với phát hiện STOCK-06 — code hoàn kho đúng nhưng **không có assertion test**.
- [x] Test coverage: **✅ Đã bổ sung (B6 — 2026-06-11).** `StockReleaseOnCancelTest::test_customer_cancel_cod_sets_refund_status_not_required_and_restores_stock` khẳng định **cả 2 vế BE**: `refund_status='not_required'` (COD chưa trả) **và** kho được hoàn (sold→0, remaining hoàn đủ). Phần kho dùng chung với STOCK-06 (xem). **✅ B5 bổ sung (2026-06-11):** `RefundServiceTest::test_cod_unpaid_sets_not_required_without_api_call` + `test_cod_method_even_if_paid_is_not_required` khẳng định COD → `not_required` **và KHÔNG gọi `ZaloPayRefundClient::requestRefund`** (mock `shouldNotReceive`). Nhãn FE `not_required` → ẩn dòng hoàn tiền (xem ORDPRO-09).

---

## ORDPRO-09 ✅ (B5)
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** 🟢 Đạt (B5 — nhãn phản ánh refund_status thật + test nhánh ZALOPAY/job)

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Đặt đơn + thanh toán ZaloPay (Sandbox) thành công. 2) Hủy đơn.

**Kết quả mong đợi:**
Báo tiền hoàn về ví ZaloPay trong 5–15 phút; đơn 'Đã huỷ', hiện trạng thái hoàn tiền.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `cancel-modal.tsx:26-28` (modal TRƯỚC-huỷ) — ZALOPAY → **"…hoàn về ví ZaloPay trong 5–15 phút."** (giữ nguyên — chốt PO); `detail.tsx refundStatusInfo()` (nhãn SAU-huỷ) key theo CẢ `refundStatus` + `paymentMethod`.
  - BE: `RefundService:46-77` (ZALOPAY) → `ZaloPayRefundClient->requestRefund`: `refunded`→`refund_status='refunded'+refunded_at`; `processing`→`refund_status='processing'` + dispatch `CheckRefundStatus` (delay 60s, poll); fail→fallback `pending_manual`. `CheckRefundStatus` job + `confirmManualRefund`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **✅ Đã sửa (B5 — 2026-06-11).** Logic BE đã đúng từ trước (set `refund_status` chính xác); sửa **nhãn FE sau-huỷ** ở `detail.tsx`: ZALOPAY `processing` → "Đang hoàn tiền về ví ZaloPay (trong 5–15 phút)"; ZALOPAY `pending_manual` (auto-refund **fail**) → **"Hoàn tiền tự động chưa thành công — đang xử lý thủ công, vui lòng liên hệ hỗ trợ"** (KHÔNG còn hiện "2–7 ngày" mâu thuẫn); `refunded` → "Đã hoàn tiền ✓". Modal trước-huỷ giữ nguyên (dự báo hợp lý, chốt PO).
- [x] Test coverage: **✅ Đã bổ sung (B5).** `RefundServiceTest`: `test_zalopay_paid_refund_success_sets_refunded`, `test_zalopay_processing_dispatches_check_refund_job` (assert job dispatch), `test_zalopay_refund_failure_falls_back_to_pending_manual`. `CheckRefundStatusJobTest` (5): refunded / failed / re-dispatch / fallback manual / bail khi không còn `processing`. Mock `ZaloPayRefundClient` qua container. FE (không có hạ tầng test) → bảng map nhãn review tay + checklist sandbox.

---

## ORDPRO-10 ✅ (B5)
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** 🟢 Đạt (B5 — nhãn pending_manual theo payment_method + test MOMO/BANK)

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Đặt + thanh toán MoMo hoặc Banking (Sandbox) thành công. 2) Hủy đơn.

**Kết quả mong đợi:**
Báo hoàn tiền thủ công (MoMo ~24h / Bank 2–7 ngày làm việc); trạng thái 'Chờ hoàn tiền'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `cancel-modal.tsx:29-33` (modal trước-huỷ, giữ nguyên) — MoMo→"~24 giờ", Bank→"2–7 ngày làm việc"; `detail.tsx refundStatusInfo()` (nhãn sau-huỷ) nay key theo `payment_method`.
  - BE: `RefundService:79-88` — MOMO/BANK (đã trả) → `refund_status='pending_manual'` + `refund_amount=total` + `refund_method` + `refund_note`. Kế toán chốt qua `confirmManualRefund` (route `orders/{id}/refund/confirm-manual`, middleware admin).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **✅ Đã sửa (B5 — 2026-06-11).** Nhãn sau-huỷ `detail.tsx` `pending_manual` nay **theo payment_method**: MoMo → "Chờ hoàn tiền về ví MoMo (~24 giờ)"; Bank → "Chờ hoàn tiền về tài khoản ngân hàng (2–7 ngày làm việc)" — khớp modal trước-huỷ, hết mâu thuẫn "2 con số khác nhau". (Logic BE đã đúng từ trước, không đổi.)
- [x] Test coverage: **✅ Đã bổ sung (B5).** `RefundServiceTest::test_momo_paid_goes_to_pending_manual_without_api_call` + `test_bank_paid_goes_to_pending_manual_without_api_call`: khẳng định `pending_manual` + `refund_amount=total` + `refund_method` + `refund_note`, **và KHÔNG gọi** `ZaloPayRefundClient` (mock `shouldNotReceive`). `test_unknown_method_paid_goes_to_pending_manual` phủ method lạ. (`confirmManualRefund` của kế toán thuộc admin-flow — ngoài phạm vi B5.)

---

## ORDPRO-11
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-1. 1) Hủy đơn, chọn 'Lý do khác'. 2) Bỏ trống hoặc nhập dưới 5 ký tự, bấm xác nhận.

**Kết quả mong đợi:**
Bị chặn, yêu cầu nhập lý do tối thiểu 5 ký tự.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `cancel-modal.tsx:52-59 handleSubmit` — `isOther = reasonCode==='other'`; nếu `isOther && otherText.trim().length < 5` → `toast.error('Vui lòng nhập lý do (tối thiểu 5 ký tự).')` và **return (không gọi API)**. Textarea placeholder nhắc "(tối thiểu 5 ký tự)".
  - BE: `cancelByCustomer:620-623` validate `reason: nullable|string|max:500` — **KHÔNG có rule min:5**.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **🟡 Khớp ở FE, hở ở BE.** Trên UI khách: chọn "Lý do khác" + để trống/<5 ký tự → bị chặn đúng với thông báo yêu cầu ≥5 ký tự (đúng kỳ vọng). *Sai lệch:* ràng buộc **chỉ ở client** — gọi thẳng `POST /orders/{id}/cancel {reason_code:'other', reason:'a'}` qua API vẫn huỷ thành công (BE không validate min-5). Nếu coi đây là quy tắc nghiệp vụ thì cần thêm rule BE (vd `reason: required_if:reason_code,other|min:5`).
- [x] Test coverage: **🔴 Thiếu** — không test FE (chặn <5 ký tự) lẫn BE (hiện không enforce nên cũng chưa có test khẳng định hành vi). Cần thêm khi chốt yêu cầu.

---
