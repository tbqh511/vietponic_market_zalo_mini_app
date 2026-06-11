# Nhóm: Phân quyền

## ROLE-01
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🟢 Đã sửa (B8)

**Ngữ cảnh & các bước:**
Bạn là khách thường. 1) Tìm/thử mở khu vực Quản lý Farm (Farm Hub).

**Kết quả mong đợi:**
Không thấy menu Hub, hoặc mở bị chặn — không được vào.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/components/farm/farm-hub-fab.tsx` (FAB Hub chỉ hiện khi `isFarmPartner` = true → khách KHÔNG thấy lối tắt); `src/components/layout.tsx` (route guard) — **B8 đổi:** thay `navigate("/farm/register")` âm thầm bằng **overlay** `FarmAccessNotice` (mới: `src/components/farm/farm-access-notice.tsx`) hiện thông báo "Khu vực dành cho đối tác farm" + nút "Đăng ký đối tác"; `src/state.ts isFarmPartnerState` + `farmPartnerStatusState` (mới); `src/hooks.ts:338 useFarmGuard` (giữ làm defense-in-depth).
  - BE: `app/Http/Middleware/EnsureFarmPartner.php` — **B8:** 403 kèm `code:FARM_PARTNER_REQUIRED` (message giữ nguyên `'Bạn không có quyền truy cập chức năng Farm Partner'`); `routes/api.php:78` group `zalo.farm` bọc toàn bộ `/farm/*`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **✅ ĐÃ KHỚP (🟢) sau B8.** Khách không thấy FAB Hub; mở `/farm*` → màn "Khu vực dành cho đối tác farm" + nút đăng ký (KHÔNG còn silent-redirect); gọi API trực tiếp → 403 `code:FARM_PARTNER_REQUIRED`. Nút "Đăng ký đối tác" mở `/farm/register` (vào được vì guard short-circuit route register), không loop.
- [x] Test coverage: BE `test_regular_customer_gets_403_on_farm_endpoint` (FarmHubTest) — **B8 bổ sung** assert `code:FARM_PARTNER_REQUIRED` + message nguyên văn; `test_farm_endpoint_requires_jwt`. FE chưa có hạ tầng test → checklist sandbox (mở `/farm` bằng tài khoản khách → thấy màn mời đăng ký).

---

## ROLE-02
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🟢 Đã sửa (B8)

**Ngữ cảnh & các bước:**
Dùng tài khoản KH-REQ (đã đăng ký làm đối tác farm nhưng admin CHƯA duyệt). 1) Thử vào Farm Hub.

**Kết quả mong đợi:**
Bị chặn: 'Bạn không có quyền truy cập chức năng Farm Partner'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `app/Models/Customer.php:84-87 isFarmPartner()` (yêu cầu `role='farm_partner'` **VÀ** `farm_partner_status='approved'`; `'requested'/'suspended'/'none'` → false); `EnsureFarmPartner.php` → 403 message **giữ nguyên chính xác** `'Bạn không có quyền truy cập chức năng Farm Partner'` + **B8:** thêm `code:FARM_PARTNER_REQUIRED`. **B8:** `ZaloApiController::authenticate` trả thêm `data.user.farm_partner_status` (thô) để FE phân biệt trạng thái.
  - FE: guard `layout.tsx` — **B8 đổi:** KH-REQ (`farm_partner_status='requested'`) nay thấy màn **"Đang chờ duyệt"** (`FarmAccessNotice` variant `requested`, đọc `farmPartnerStatusState`), KHÔNG đẩy lại form đăng ký.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **✅ ĐÃ KHỚP (🟢) sau B8.** Backend message vẫn đúng từng chữ (hợp đồng giữ nguyên). FE phân biệt `requested` vs chưa đăng ký: `requested` → "Đang chờ duyệt" (không có form), `none`/khách → "Khu vực dành cho đối tác farm" (có nút đăng ký). Discriminator `code:FARM_PARTNER_REQUIRED` (cùng code cho cả requested lẫn none — FE dùng `farm_partner_status` để chia màn).
- [x] Test coverage: **B8 thêm** `test_requested_farm_partner_gets_403_distinguishable` (FarmHubTest — assert `code:FARM_PARTNER_REQUIRED` + message nguyên văn, phân biệt với suspended) + `test_authenticate_returns_farm_partner_status` (AuthenticateTest — `data.user.farm_partner_status='requested'`, `is_farm_partner=false`). FE: checklist sandbox (set `requested` → mở `/farm` thấy "Đang chờ duyệt").

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
- **Vai trò:** Farm Staff | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🟢 Đã sửa (B7) — test đạt

**Ngữ cảnh & các bước:**
Dùng tài khoản STAFF-A (nhân viên farm). 1) Vào Hub. 2) Mở Kho & Đơn. 3) Tìm mục Thanh toán/Rút tiền (payout).

**Kết quả mong đợi:**
Vào được Kho & Đơn; KHÔNG vào/không thấy mục payout.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/components/footer.tsx` `FARM_NAV` — **đã lọc** tab "Thu nhập" khi `!is_owner` (đọc `is_owner` qua `useFarmProfile()` → `viewer.is_owner`, fail-closed: ẩn cho tới khi xác nhận owner); `src/pages/farm/payouts.tsx` — **đã thêm** màn chặn khi `!is_owner` + gate `useFarmPayouts(isFarm && isOwner)` để staff không bao giờ fetch dữ liệu (defense-in-depth).
  - BE: `EnsureFarmPartner.php:90-96` lookup theo `farm_id` → staff vẫn PASS middleware (đúng — staff cần vào Kho/Đơn); `FarmHubController` — **đã thêm** private helper `ensureOwner()` gọi ở ĐẦU `payouts()` + `payoutDetail()` → 403 `'Bạn không có quyền xem mục này'` nếu `!isFarmOwner()`. Gate đặt trước scope-farm nên staff farm khác cũng nhận 403 (không leak 404).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **✅ ĐÃ KHỚP (🟢) sau B7.** Staff không còn thấy tab "Thu nhập"; vào thẳng `/farm/payouts` → màn "Bạn không có quyền xem mục này"; gọi `/farm/payouts` + `/farm/payouts/{id}` → **403** ở backend (chỉ owner xem gross/phí/net). Owner giữ nguyên truy cập đầy đủ; owner farm khác xem payout farm này vẫn **404** (scope-farm, không đổi).
- [x] Test coverage: **Đã bổ sung** trong `tests/Feature/FarmHubTest.php` — `test_owner_can_access_payouts` (200), `test_staff_cannot_access_payouts_list` (403), `test_staff_cannot_access_payout_detail` (403), `test_staff_of_other_farm_cannot_access_payout_detail` (403); giữ `test_payout_detail_404_for_other_farms_payout` (owner farm khác → 404). Helper mới `makeFarmStaff()`. FarmHubTest: **29/29 pass**.

---

## ROLE-05
- **Vai trò:** Farm Owner | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** 🟢 Đã sửa (B8)

**Ngữ cảnh & các bước:**
Dùng tài khoản SUSPEND-A (farm bị tạm dừng). 1) Thử vào Hub.

**Kết quả mong đợi:**
Bị chặn với 1 message "tạm dừng" thống nhất: **"Farm của bạn đang tạm dừng, vui lòng liên hệ admin"** (áp cho cả farm `is_active=false` lẫn `farm_partner_status='suspended'`).

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `EnsureFarmPartner.php` — **B8 đổi:** KHÔNG dùng `Farm::active()` trực tiếp (vốn gộp inactive với no-record thành null), mà tra `Farm::find()` không scope rồi branch: row tồn tại nhưng `is_active=false` → 403 `code:FARM_SUSPENDED` + message "tạm dừng"; không có row HOẶC `approved_at=null` (onboarding) → 403 `code:FARM_NOT_ASSIGNED` + message "chưa được gán". Đường suspend qua `farm_partner_status='suspended'` (`Customer.isFarmPartner()` false) → **cùng** message "tạm dừng" + `code:FARM_SUSPENDED` (branch theo status). FE: màn `FarmAccessNotice` variant `suspended` + nút "Liên hệ admin".
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **✅ ĐÃ KHỚP (🟢) sau B8.** Cả 2 đường tạm dừng (`is_active=false` lẫn `farm_partner_status='suspended'`) nay → **1 message thống nhất** `'Farm của bạn đang tạm dừng, vui lòng liên hệ admin'` + `code:FARM_SUSPENDED`. *(Chốt PO:* farm `approved_at=null` — đang onboarding chưa duyệt lần đầu — vẫn là "chưa được gán" `FARM_NOT_ASSIGNED`, KHÔNG phải "tạm dừng"; chỉ `is_active=false` = từng active rồi tắt mới là suspended.)
- [x] Test coverage: **B8 thêm** `test_suspended_farm_partner_gets_403_paused` (`farm_partner_status='suspended'` → FARM_SUSPENDED + message thống nhất) + `test_farm_partner_with_inactive_farm_gets_403_paused` (farm còn record `is_active=false` → FARM_SUSPENDED) + `test_farm_partner_without_farm_record_gets_403` (B8 bổ sung assert `code:FARM_NOT_ASSIGNED`). FE: checklist sandbox.

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
