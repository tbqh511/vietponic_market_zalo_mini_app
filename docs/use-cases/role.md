# Nhóm: Phân quyền

## ROLE-01
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Bạn là khách thường. 1) Tìm/thử mở khu vực Quản lý Farm (Farm Hub).

**Kết quả mong đợi:**
Không thấy menu Hub, hoặc mở bị chặn — không được vào.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/components/farm/farm-hub-fab.tsx` (FAB Hub chỉ hiện khi `isFarmPartner` = true → khách KHÔNG thấy lối tắt); `src/components/layout.tsx:48-54` (route guard: vào `/farm*` mà `profile !== null && !isFarmPartner` → `navigate("/farm/register")`); `src/state.ts:594 isFarmPartnerState`; `src/hooks.ts:338 useFarmGuard`.
  - BE: `app/Http/Middleware/EnsureFarmPartner.php:81-86` (role≠farm_partner → 403 `'Bạn không có quyền truy cập chức năng Farm Partner'`); `routes/api.php:78` group `zalo.farm` bọc toàn bộ `/farm/*`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Khách không thấy FAB Hub; nếu cố mở `/farm*` bị đẩy về `/farm/register`; gọi API trực tiếp → 403. *Sai lệch nhỏ:* FE không hiện thông báo "không có quyền" mà âm thầm redirect sang form đăng ký (hợp lý cho khách thường, nhưng khác trải nghiệm "bị chặn có thông báo").
- [x] Test coverage: BE có `test_regular_customer_gets_403_on_farm_endpoint` (FarmHubTest.php:109) + `test_farm_endpoint_requires_jwt` (:99). **Thiếu** test FE cho guard redirect.

---

## ROLE-02
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng tài khoản KH-REQ (đã đăng ký làm đối tác farm nhưng admin CHƯA duyệt). 1) Thử vào Farm Hub.

**Kết quả mong đợi:**
Bị chặn: 'Bạn không có quyền truy cập chức năng Farm Partner'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `app/Models/Customer.php:84-87 isFarmPartner()` (yêu cầu `role='farm_partner'` **VÀ** `farm_partner_status='approved'`; `'requested'/'suspended'/'none'` → false); `EnsureFarmPartner.php:81-86` → 403 với message **khớp chính xác** `'Bạn không có quyền truy cập chức năng Farm Partner'`.
  - FE: cùng guard `layout.tsx:48-54` — KH-REQ có `is_farm_partner=false` nên bị redirect về `/farm/register`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp ở backend (🟢)** — message trả về đúng từng chữ. *Sai lệch FE:* KH-REQ (đã đăng ký, chờ duyệt) bị đẩy lại `/farm/register` — có thể gây bối rối ("đã đăng ký rồi sao lại thấy form đăng ký"). FE không phân biệt trạng thái `requested` vs chưa đăng ký để hiện thông báo "đang chờ duyệt".
- [x] Test coverage: **Thiếu** test riêng cho `farm_partner_status='requested'`. Test hiện có chỉ cover `role='customer'` (:109) và `role=farm_partner` **đã approved nhưng thiếu farm** (:123) — chưa cover nhánh status chưa duyệt.

---

## ROLE-03
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng tài khoản OWNER-A (chủ farm). 1) Vào Hub. 2) Mở lần lượt: Bảng điều khiển, Kho, Đơn đang đến, Thanh toán/Rút tiền (payout).

**Kết quả mong đợi:**
Vào được TẤT CẢ mục, kể cả payout.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `EnsureFarmPartner.php:94-103` (lookup farm theo `customers.farm_id` → owner pass; gắn `farm` vào request); `FarmHubController.php` các method `profile/overview/analytics/productsToday/incomingOrders/payouts/payoutDetail` đều scope theo `farm` attribute; `profile():62-63` trả `farm_role` + `is_owner = isFarmOwner()` (Customer.php:141, `farm_role='owner'`).
  - FE: `src/components/footer.tsx:51-82 FARM_NAV` 4 tab (Tổng quan / Đơn đến / Phân tích / **Thu nhập**); các trang `pages/farm/{index,orders,analytics,payouts,payout-detail}.tsx`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Owner pass middleware, có farm active → vào được mọi mục kể cả `/farm/payouts` + `/farm/payouts/{id}`. `is_owner=true` mở thêm UI chỉ-owner (vd nút Phân công đơn).
- [x] Test coverage: setUp tạo customer `farm_role='owner'` nên hầu hết test chạy dưới vai owner: `test_approved_farm_partner_can_access_farm_me` (:179), `test_farm_partner_can_access_dashboard_overview` (:195), `test_payouts_list_includes_commission_breakdown` (:821), `test_payout_detail_lists_contributing_orders` (:881). ✅ phủ tốt cho owner.

---

## ROLE-04
- **Vai trò:** Farm Staff | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng tài khoản STAFF-A (nhân viên farm). 1) Vào Hub. 2) Mở Kho & Đơn. 3) Tìm mục Thanh toán/Rút tiền (payout).

**Kết quả mong đợi:**
Vào được Kho & Đơn; KHÔNG vào/không thấy mục payout.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/components/footer.tsx:78-81` `FARM_NAV` hiện tab **"Thu nhập"** cho MỌI farm user — KHÔNG lọc theo `is_owner`/`farm_role`; `src/pages/farm/payouts.tsx:80,103` chỉ gate `useFarmGuard()` (= `is_farm_partner`), KHÔNG kiểm tra `is_owner`.
  - BE: `EnsureFarmPartner.php:90-96` lookup theo `farm_id` → **staff PASS** middleware; `FarmHubController.payouts():647-672` và `payoutDetail():683-691` chỉ scope `where farm_id=$farm->id`, **KHÔNG có check `is_owner`**.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **❌ KHÔNG KHỚP (🔴).** Staff VẪN thấy tab "Thu nhập" và VẪN gọi được `/farm/payouts` + `/farm/payouts/{id}` → nhận đủ dữ liệu payout (gross/phí/net) của farm. Kỳ vọng "staff không thấy/không vào payout" **chưa được thực thi ở cả FE lẫn BE**. Cần: (a) FE ẩn tab Thu nhập khi `!viewer.is_owner`; (b) BE gate `is_owner` trong `payouts()`/`payoutDetail()` (403 nếu staff). *Lưu ý so với Đóng gói:* thao tác đơn (confirm-order/handoff-ship) đã được tách quyền owner trong `FarmPackingController` — nhưng payout thì chưa.
- [x] Test coverage: **Thiếu hoàn toàn** — không có test staff-bị-chặn-payout. Cần thêm khi sửa.

---

## ROLE-05
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng tài khoản SUSPEND-A (farm bị tạm dừng). 1) Thử vào Hub.

**Kết quả mong đợi:**
Bị chặn: tài khoản chưa được gán farm / farm đã bị vô hiệu hoá.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `EnsureFarmPartner.php:94-103` — `Farm::active()->find($customer->farm_id)`; `scopeActive` yêu cầu `is_active=true` AND `approved_at NOT NULL`. Farm bị vô hiệu hoá (is_active=false) → `null` → 403 `'Tài khoản farm partner chưa được gán farm hoặc farm đã bị vô hiệu hoá'`. Nếu admin suspend qua `farm_partner_status='suspended'` thì chặn sớm hơn ở `Customer.isFarmPartner():84-87` → 403 `'Bạn không có quyền truy cập chức năng Farm Partner'`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp về kết quả "bị chặn" (🟢).** *Sai lệch chi tiết:* có **2 đường khác message** tuỳ cách admin tạm dừng:
  - Vô hiệu hoá record Farm (`is_active=false`) → message **khớp đúng** kỳ vọng.
  - Suspend partner (`farm_partner_status='suspended'`) → message khác ("không có quyền truy cập chức năng Farm Partner") nhưng vẫn chặn.
  - Cần thống nhất quy ước admin dùng cách nào để message hiển thị nhất quán với UI.
- [x] Test coverage: `test_farm_partner_without_farm_record_gets_403` (:123) cover nhánh "approved nhưng không có farm active" (gần với farm inactive). **Thiếu** test riêng cho farm còn record nhưng `is_active=false`, và cho `farm_partner_status='suspended'`.

---

## ROLE-06
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng tài khoản OWNER-B (chủ Farm B). 1) Vào Hub. 2) Xem danh sách Kho và Đơn.

**Kết quả mong đợi:**
Chỉ thấy dữ liệu của Farm B; KHÔNG thấy đơn/kho của Farm A.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `EnsureFarmPartner.php:94-109` gắn đúng `farm` của customer vào request (theo `farm_id` của chính họ). Mọi truy vấn scope theo `$request->attributes->get('farm')`: `payouts():657` + `payoutDetail():688` (`where farm_id=$farm->id`); `incomingOrders():485-496` (farm thường chỉ thấy đơn có item của farm mình + `where oi.farm_id=$farm->id`, che item farm khác); inventory/analytics/overview cùng pattern.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Owner-B chỉ thấy dữ liệu Farm B; ranh giới dữ liệu giữa các farm được giữ kể cả trong cùng một đơn nhiều farm. *Lưu ý (không áp dụng case này):* nếu một farm là **packing hub** (`is_packing_hub=true`) thì hub thấy MỌI đơn để đóng gói — đây là thiết kế Hub, không phải rò rỉ giữa 2 farm thường A/B.
- [x] Test coverage: `test_payout_detail_404_for_other_farms_payout` (:945) cover isolation cho payout. **Thiếu** test isolation cho `inventory` và `orders/incoming` giữa 2 farm khác nhau.

---
