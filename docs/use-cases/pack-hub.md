# Nhóm: Đóng gói & Hub

## HUB-01
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng OWNER-A. 1) Mở 'Tổng quan'. 2) Đối chiếu doanh thu / đơn / SP bán hôm nay với đơn vừa đặt.

**Kết quả mong đợi:**
Số liệu khớp với đơn đã tạo trong ngày.

**Đối chiếu code (Claude Code điền):** 🟢 Đạt (B14) — **tách 2 chỉ số "Đã đặt hôm nay" / "Đã giao hôm nay"**, mỗi chỉ số tự nhất quán basis giữa card và list.
- [x] File/route/màn hình liên quan:
  - FE màn `src/pages/farm/index.tsx` (2 tab Đặt/Giao → grid 2×2 + list "Sản phẩm hôm nay" cùng basis); hook `useFarmOverview("today")` + `useFarmProductsToday()` trong `src/utils/farm-api.ts`. Types `FarmOverview.placed/delivered` + `FarmProductsTodayResponse.products_placed/products_delivered` (`src/types.d.ts`).
  - BE `routes/api.php` `GET /farm/dashboard` → `FarmHubController@overview`; `GET /farm/products/today` → `productsToday`.
  - BE `FarmDashboardService::getOverview()` + `placedBaseQuery()`/`itemsBaseQuery()` (2 basis) + `aggregateMetrics()`.
- [x] Sai lệch cũ (đã sửa ở B14):
  - **Cũ:** card overview chỉ tính `status='delivered'` lọc `delivered_at` → đơn vừa đặt không hiện cho tới khi giao xong; list "Sản phẩm hôm nay" lại tính `sold` theo `delivering+delivered` + `created_at` → cùng 1 màn 2 con số "đã bán" lệch nhau.
  - **Đã chốt & sửa:** tách thành 2 chỉ số song song, **mỗi chỉ số tự nhất quán basis** giữa card và list (không trộn):
    - **Đã đặt hôm nay** (`placed`): đơn `created_at` = hôm nay, **mọi status trừ `cancelled`**; gồm cả đơn chưa giao.
    - **Đã giao hôm nay** (`delivered`): đơn `status='delivered'`, `delivered_at` = hôm nay.
  - Scope theo `zalo_order_items.farm_id` (không lẫn farm khác); **không** lọc `payment_status` (giữ policy COD). Timezone "hôm nay" = **Asia/Ho_Chi_Minh** (`config/app.php`).
  - Field top-level cũ của `getOverview` **giữ nguyên** (= basis "đã giao") cho backward-compat (`analytics`/timeseries/payout không đổi).
  - AI hint tính trên nhóm `placed` (nhịp bán trong ngày, gồm đơn mới).
- [x] **TZ-fix (B18) — sửa lỗi lệch 7h "hôm nay":**
  - **Phát hiện khi re-audit:** B14 (và code có sẵn) `whereBetween` sau khi `->setTimezone('UTC')` range vì **tưởng** `created_at`/`delivered_at` lưu UTC. Thực tế production lưu **giờ VN** (`app.timezone=Asia/Ho_Chi_Minh`, cột `dateTime` naive, `delivered_at=now()`, `created_at` từ FE gửi `+07:00`) → cửa sổ "hôm nay" lệch **-7h**: đơn đặt/giao sau ~07:00 sáng VN biến mất, đơn tối hôm qua lọt vào. Test B14 cũ **che bug** vì fixture ghi `Carbon::now('UTC')`.
  - **Đã sửa:** bỏ `->setTimezone('UTC')` — so bound **giờ VN** trực tiếp với cột (lưu giờ VN) ở `FarmDashboardService::placedBaseQuery`+`itemsBaseQuery`+`getRevenueTimeseries` (bỏ `CONVERT_TZ`), `FarmHubController@productsToday`, **và** `FarmStockController@suggestions` (cùng pattern). FE không đổi (payload shape giữ nguyên).
- [x] Test coverage (B14 + B18):
  - BE `FarmHubTest`: `test_overview_placed_includes_today_orders_all_statuses_except_cancelled`, `test_overview_delivered_does_not_leak_into_placed`, `test_overview_placed_scoped_to_current_farm`, `test_products_today_splits_placed_and_delivered`, `test_products_today_cancelled_excluded_from_placed`. Giữ xanh `test_overview_counts_only_delivered_orders` (top-level = delivered) + các `test_products_today_*` cũ (đổi sang key `products_placed`).
  - **B18 (TZ):** thêm `test_overview_today_counts_order_delivered_late_evening_vn` (giao 21:30 VN hôm nay → đếm) + `test_overview_today_excludes_order_placed_last_evening_vn` (đặt 22:00 VN hôm qua → KHÔNG đếm), freeze giờ bằng `Carbon::setTestNow`. **Chuyển toàn bộ fixture từ `Carbon::now('UTC')` → giờ VN (`now()`)** để phản ánh production (nếu không sẽ tiếp tục che bug). **42 passed.**
  - FE: chưa có hạ tầng test → checklist tay (đổi tab Đặt/Giao card+list đổi đồng bộ; đơn vừa đặt hiện ngay ở tab "Đã đặt"); `tsc --noEmit` sạch.

---

## HUB-02
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng OWNER-A. 1) Mở 'Thu nhập' / Payout. 2) Xem breakdown.

**Kết quả mong đợi:**
Hiển thị doanh thu, phí Vietponics (theo %), số farm thực nhận; số liệu hợp lý.

**Đối chiếu code (Claude Code điền):** 🟢 Đạt (phủ test tốt)
- [x] File/route/màn hình liên quan:
  - FE `src/pages/farm/payouts.tsx` (list) + `src/pages/farm/payout-detail.tsx` (`SummaryHeader`: Doanh thu gộp / Phí Vietponics (x%) / Đã bán + net); hooks `useFarmPayouts`, `useFarmPayoutDetail`.
  - BE `routes/api.php:114-115` `GET /farm/payouts`, `GET /farm/payouts/{id}` → `FarmHubController@payouts|payoutDetail`; logic ở `PackingService::formatPayout()` + `expectedPayDate()`. Model `FarmPayout`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - Khớp. `formatPayout`: `commission_amount = gross*(1-commission_rate)` (phí Vietponics giữ); `net_estimated = gross*commission_rate + adjustment`. FE hiển thị "Phí Vietponics ({Math.round((1-commission_rate)*100)}%)" và net = `net_payout` nếu paid, ngược lại `net_estimated`.
  - ⚠️ Lưu ý ngữ nghĩa **`commission_rate` = phần farm GIỮ LẠI** (vd 0.85 = farm nhận 85%, phí Vietponics 15%) — KHÔNG phải tỉ lệ phí. Nếu seed nhầm (đặt 0.15 tưởng là phí) thì breakdown đảo ngược. Rủi ro cấu hình dữ liệu (giống nhóm ORDER thiếu seed).
  - `expectedPayDate` = `period_end + 1 ngày`; null nếu paid/cancelled. payoutDetail liệt kê đơn đóng góp (gross theo `cost_price_snapshot*qty`, gom theo order, kỳ `[period_start,period_end]`).
- [x] Test coverage:
  - BE `FarmHubTest`: `test_farm_me_returns_commission_rate`, `test_payouts_list_includes_commission_breakdown`, `test_paid_payout_has_no_expected_pay_date`, `test_payout_detail_lists_contributing_orders`, `test_payout_detail_404_for_other_farms_payout`. Phủ tốt.
  - Thiếu test FE render breakdown.

---

## PACK-01
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng OWNER-A (chủ hub). 1) KH-1 đặt 1 đơn. 2) OWNER-A mở 'Đơn đang đến', thấy phiếu 'Chưa phân công'. 3) Bấm 'Xác nhận đơn'.

**Kết quả mong đợi:**
Đơn chuyển 'Đã xác nhận'.

**Đối chiếu code (Claude Code điền):** 🟢 Đạt
- [x] File/route/màn hình liên quan:
  - FE `src/pages/farm/orders.tsx` → `OwnerCard` nút "Xác nhận đơn" (chỉ hiện khi `order_status==='pending'`) → `confirmOrder()` (`farm-api.ts`). Phiếu mới hiện "Chưa phân công" (assignment_status `unassigned`) trong `useFarmIncomingOrders`.
  - BE `routes/api.php:111` `POST /farm/orders/{id}/confirm-order` → `FarmPackingController@confirmOrder` (gác `requirePackingHub` + chỉ owner) → `PackingService::confirmOrder()`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - Khớp. `confirmOrder`: chỉ tiến từ `pending`→`confirmed`, idempotent nếu đã ≥ confirmed; ghi `OrderPackingLog` ACTION_ORDER_CONFIRMED + bắn thông báo `status_changed`. Phiếu hub được sinh lazily (`ensureAssignmentsExist`/`findHubAssignment`) nên đơn mới luôn có phiếu 'unassigned' để owner thấy.
- [x] Test coverage:
  - BE `OrderPackingTest::test_owner_confirm_order_moves_pending_to_confirmed`. Đạt.

---

## PACK-02
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng OWNER-A. 1) Ở đơn vừa xác nhận, bấm 'Phân công'. 2) Chọn STAFF-A.

**Kết quả mong đợi:**
Phiếu chuyển 'Đã giao' cho STAFF-A; hiện tên người đóng.

**Đối chiếu code (Claude Code điền):** 🟢 Đạt
- [x] File/route/màn hình liên quan:
  - FE `orders.tsx` → `OwnerCard` nút "Phân công"/"Đổi người" mở picker, list từ `useFarmStaff()`; chọn → `assignPacker(orderId, packerId)`. Dòng trạng thái "⊙ Đã giao: {staffLabel(packerName)}" khi `assignment_status==='assigned'`.
  - BE `routes/api.php:109` `POST /farm/orders/{id}/assign` → `FarmPackingController@assign` (requirePackingHub + chỉ owner, validate `packer_customer_id` exists) → `PackingService::assign()`. Picker dùng `GET /farm/staff` → `FarmHubController@staff` (chỉ thành viên HUB).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - Khớp. `assign`: bắt packer phải thuộc đúng farm hub (`packer.farm_id === assignment.farm_id`) + `isFarmPartner`, không cho gán lại nếu đã 'packed'; set `assigned_customer_id`, status `unassigned→assigned`; ghi log ASSIGNED/REASSIGNED. Payload trả `is_mine`. Nhãn FE "Đã giao" khớp wording use case.
  - Nút "Phân công" chỉ hiện khi `!isPending && !isPacked && !isDelivering` → owner phải xác nhận đơn (PACK-01) trước mới gán được, đúng wireframe.
- [x] Test coverage:
  - BE `OrderPackingTest`: `test_owner_can_assign_order_to_staff_and_log_is_recorded`, `test_cannot_assign_packer_from_other_farm`, `test_staff_cannot_assign_orders`, `test_staff_picker_lists_hub_members_only`. Đạt.

---

## PACK-03
- **Vai trò:** Farm Staff | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng STAFF-A. 1) Mở đơn 'Chưa phân công' khác. 2) Bấm 'Nhận' (tự nhận).

**Kết quả mong đợi:**
Phiếu được gán cho chính STAFF-A.

**Đối chiếu code (Claude Code điền):** 🟢 Đạt
- [x] File/route/màn hình liên quan:
  - FE `orders.tsx` → `StaffView`/`StaffCard` nút "Nhận đóng gói" (hiện khi `assignment_status==='unassigned'`) → `claimOrder(orderId)`.
  - BE `routes/api.php:108` `POST /farm/orders/{id}/claim` → `FarmPackingController@claim` (requirePackingHub) → `PackingService::claim()`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - Khớp. `claim`: bắt packer thuộc farm hub; `lockForUpdate` chống race 2 NV cùng bấm; chỉ nhận phiếu chưa ai giữ — nếu đã có người → 422 "Đơn đã có người nhận đóng gói" (idempotent nếu chính mình). Set `assigned_customer_id = packer`, `assigned_by_customer_id = packer` (tự nhận), status → 'assigned'; log ACTION_CLAIMED.
- [x] Test coverage:
  - BE `OrderPackingTest`: `test_staff_can_claim_unassigned_order`, `test_staff_cannot_claim_order_already_taken`. Đạt.

---

## PACK-04
- **Vai trò:** Farm Staff | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng STAFF-A (đã được gán). 1) Mở đơn. 2) Bấm 'Bắt đầu đóng gói'.

**Kết quả mong đợi:**
Phiếu 'Đang đóng'; đơn lên 'Đang chuẩn bị'.

**Đối chiếu code (Claude Code điền):** 🟢 Đạt
- [x] File/route/màn hình liên quan:
  - FE `orders.tsx` → `StaffCard` nút "Bắt đầu đóng gói" (hiện khi `isMineAssigned`) → `startPacking(orderId)`; pill "Bạn đang đóng".
  - BE `routes/api.php:106` `POST /farm/orders/{id}/start-packing` → `FarmPackingController@startPacking` (requirePackingHub + `actAsAssignee`) → `PackingService::startPacking()`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - Khớp. `startPacking`: bắt phiếu đã được gán, set status → 'packing', `packing_started_at`; gọi `advanceOrderTo(order, 'preparing')` (chỉ tiến không lùi) → đơn lên 'Đang chuẩn bị'. Idempotent nếu đã 'packed'. Log PACKING_STARTED. Owner card hiện "◐ Đang đóng: {staffLabel}".
- [x] Test coverage:
  - BE `OrderPackingTest::test_start_packing_advances_order_to_preparing`. Đạt.

---

## PACK-05
- **Vai trò:** Farm Staff | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Tiếp nối PACK-04. 1) Bấm 'Xác nhận đã đóng xong'.

**Kết quả mong đợi:**
Phiếu 'Đã đóng'; đơn CHƯA tự sang 'Đang giao'.

**Đối chiếu code (Claude Code điền):** 🟢 Đạt
- [x] File/route/màn hình liên quan:
  - FE `orders.tsx` → `StaffCard` nút "Hoàn tất đóng gói" (hiện khi `isMinePacking`) → `confirmPacked(orderId)`; sau đó hiện "✓ Đã đóng gói xong — chờ chủ farm bàn giao".
  - BE `routes/api.php:107` `POST /farm/orders/{id}/confirm-packed` → `FarmPackingController@confirmPacked` (requirePackingHub + actAsAssignee) → `PackingService::confirmPacked()`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - Khớp chính xác kỳ vọng "CHƯA tự sang Đang giao". `confirmPacked`: set status → 'packed', `packed_at`; **KHÔNG** đụng tới `order.status` → đơn vẫn ở 'preparing'. Việc đẩy delivering tách sang `handoffShipping` (PACK-06) cho owner bấm. Idempotent; log PACKED.
- [x] Test coverage:
  - BE `OrderPackingTest::test_confirm_packed_marks_slip_packed_without_auto_delivering` (KEY — khẳng định không auto-delivering). Đạt.

---

## PACK-06
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng OWNER-A. 1) Mở đơn đã đóng xong. 2) Bấm 'Bàn giao ship'.

**Kết quả mong đợi:**
Đơn chuyển 'Đang giao'.

**Đối chiếu code (Claude Code điền):** 🟢 Đạt
- [x] File/route/màn hình liên quan:
  - FE `orders.tsx` → `OwnerCard` nút "Bàn giao ship" (hiện khi `canHandoff = isPacked && !isDelivering`) → `handoffShip(orderId)`.
  - BE `routes/api.php:112` `POST /farm/orders/{id}/handoff-ship` → `FarmPackingController@handoffShipping` (requirePackingHub + chỉ owner) → `PackingService::handoffShipping()`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - Khớp. `handoffShipping`: idempotent nếu đã ≥ delivering/cancelled; **chặn** nếu còn phiếu của đơn chưa 'packed' → 422 "Đơn chưa đóng gói xong — chưa thể bàn giao vận chuyển"; ngược lại `advanceOrderTo('delivering')`. Mô hình hub 1 phiếu/đơn nhưng query `remaining` vẫn an toàn cho legacy nhiều phiếu. `delivered_at` vẫn chỉ set ở 'delivered' (không ở đây).
- [x] Test coverage:
  - BE `OrderPackingTest`: `test_owner_handoff_ship_moves_packed_order_to_delivering`, `test_handoff_ship_blocked_when_a_farm_not_packed_yet`, `test_staff_cannot_handoff_or_confirm_order`. Đạt.

---

## PACK-07
- **Vai trò:** Farm Staff | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng STAFF-A. 1) Mở chi tiết 1 đơn cần đóng. 2) Xem thông tin người nhận.

**Kết quả mong đợi:**
SĐT và địa chỉ KH bị che bớt (vd 09xx*); đơn nhận-tại-trạm hiện tên trạm thay địa chỉ.

**Đối chiếu code (Claude Code điền):** 🟢 Đạt (B15) — wire màn chi tiết `/farm/orders/:id`; list + detail hiện **tên trạm** cho đơn pickup; che SĐT/địa chỉ GIỮ NGUYÊN (không nới lỏng).
- [x] File/route/màn hình liên quan:
  - BE `App\Support\ContactMasker::maskPhone()` (giữ 4 đầu + 3 cuối → "0937***739"), `maskAddress()` (rút còn 2 đoạn cuối, bỏ số nhà/đường). Áp **server-side** trong `FarmHubController@incomingOrders` (`:588-589`) và `FarmPackingController@show`.
  - BE `routes/api.php:105` `GET /farm/orders/{orderId}` → `FarmPackingController@show` (đã có sẵn). B15 **enrich** payload: thêm `station_name` (key riêng), `order_total`, `assigned_customer_name`, `packing_started_at`, `packed_at` — giữ nguyên masking + pickup `delivery_address = station_name`.
  - FE route mới `/farm/orders/:id` (`router.tsx`) → `src/pages/farm/orders/detail.tsx` (mới). List page chuyển vào `src/pages/farm/orders/index.tsx`; helper dùng chung tách ra `src/pages/farm/orders/_shared.tsx` (`recipientLocation`, `statusPill`, `useAction`, `staffLabel`, …). Hook `useFarmOrderDetail` + type `FarmOrderDetail`.
  - FE list: card `OwnerCard`/`StaffCard` bấm vào → `navigate("/farm/orders/:id")` (không hardcode basename; nút thao tác `stopPropagation`). Dòng người nhận dùng `recipientLocation`: pickup hiện **tên trạm** (thay chuỗi cứng " · Pickup"), shipping hiện địa chỉ đã che.
  - FE detail: hiển thị người nhận (SĐT đã che; pickup "Nhận tại trạm: {station_name}", shipping "Giao tới: {địa chỉ đã che}"), items + tổng kg, trạng thái đóng gói + người đóng, và **nút thao tác theo vai trò** (owner: xác nhận/phân công/bàn giao; staff: nhận/bắt đầu/hoàn tất). Farm thường (`read_only`) ẩn nút.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - **Che SĐT/địa chỉ: ĐẠT** và làm ở server (không lộ qua network/DevTools) — GIỮ NGUYÊN, không nới lỏng ở detail.
  - **Tên trạm: ĐẠT** — list + detail hiện `station_name` cho đơn pickup; `show()` đã wire vào màn `/farm/orders/:id`.
- [x] Test coverage:
  - BE `OrderPackingTest` (B15 mới): `test_show_returns_station_name_for_pickup_order`, `test_show_masks_phone_and_address_for_shipping_order`, `test_show_includes_packer_name_and_timestamps`, `test_staff_cannot_view_others_assignment_detail`. Giữ xanh `test_incoming_orders_mask_phone_and_address`, `test_contact_masker_*`. **26 passed.**
  - FE: chưa có hạ tầng test → kiểm tay; `tsc --noEmit` sạch.

---

## PACK-08
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng OWNER-B (farm KHÔNG phải hub). 1) Thử xác nhận / phân công / đóng 1 đơn.

**Kết quả mong đợi:**
Bị chặn 403 'Chỉ bộ phận đóng gói Vietponics được xử lý đơn'.

**Đối chiếu code (Claude Code điền):** 🟢 Đạt
- [x] File/route/màn hình liên quan:
  - BE `FarmPackingController::requirePackingHub()` (`:42-53`) — gác đầu MỌI action (confirm-order/assign/claim/start/confirm-packed/handoff): nếu farm đăng nhập `!is_packing_hub` → 403 `{error:true, message:'Chỉ bộ phận đóng gói Vietponics được xử lý đơn.'}`.
  - FE `orders.tsx`: farm không-hub render `ReadOnlyView` (`isHub=false`) — ẩn toàn bộ nút thao tác, chỉ xem phần hàng của mình.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - Khớp đúng cả message lẫn mã 403. Phòng vệ 2 lớp: FE ẩn UI (read-only) + BE chặn cứng nếu gọi thẳng API. `incomingOrders` cho farm thường trả `read_only=true` và chỉ item của farm đó.
- [x] Test coverage:
  - BE `OrderPackingTest`: `test_non_hub_farm_cannot_perform_packing_actions` (403 + đúng message), `test_non_hub_farm_sees_orders_read_only`, `test_hub_sees_all_orders_even_without_own_items`. Đạt.

---

## PACK-09
- **Vai trò:** Farm Staff | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng STAFF-A. 1) Mở 1 phiếu đã gán cho người khác. 2) Thử 'Bắt đầu đóng' / 'Xác nhận đóng'.

**Kết quả mong đợi:**
Bị chặn 'Bạn không được phân công đơn này'.

**Đối chiếu code (Claude Code điền):** 🟢 Đạt
- [x] File/route/màn hình liên quan:
  - BE `FarmPackingController::actAsAssignee()` (`:333-356`) — bọc start-packing/confirm-packed: nếu `assigned_customer_id !== customer.id` và không phải owner → 403 "Bạn không được phân công đơn này". `show()` (`:77-80`) cũng chặn staff xem phiếu của người khác bằng cùng message.
  - FE `orders.tsx`: `StaffCard` đơn của người khác (`isLockedByOther`) → khoá card, hiện "{staffLabel} đang đóng — không thể nhận", không render nút start/confirm.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - Khớp. Staff chỉ thao tác/xem phiếu gán cho mình; owner được thao tác mọi phiếu (đúng phân quyền hub). FE chỉ là lớp che; BE chặn cứng nếu gọi thẳng API.
- [x] Test coverage:
  - BE `OrderPackingTest`: `test_unassigned_staff_cannot_start_or_confirm`, `test_staff_sees_all_farm_orders_with_is_mine_flag`. Đạt.

---
