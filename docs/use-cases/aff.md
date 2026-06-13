# Nhóm: Giới thiệu/CTV

## AFF-01
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-2 (chưa là CTV). 1) Vào Cá nhân → Cộng tác viên. 2) Bấm Đăng ký.

**Kết quả mong đợi:**
Nhận được Mã giới thiệu; trạng thái 'Đã duyệt' hoặc 'Chờ duyệt'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/pages/profile/affiliate/index.tsx:53-75 handleRegister` → `registerAffiliate()` (`src/utils/affiliate.ts:124-130`) `POST /affiliate/register`; chưa đăng ký → màn "Trở thành Cộng tác viên" + nút "Đăng ký ngay" (`index.tsx:89-112`); sau đăng ký hiện mã `profile.affiliate_code` + `labelForStatus` (`index.tsx:154-167`: approved→"Đã duyệt", pending→"Chờ duyệt", suspended→"Tạm khoá", rejected→"Từ chối"); toast theo status (`index.tsx:64-68`).
  - BE: `routes/api.php:53` `POST affiliate/register` (middleware `zalo.jwt`) → `AffiliateController@register:41-69`. `ensureEnabled():16-23` (Setting `affiliate_enabled` != '1' → 404 "Affiliate disabled"). Đã có code → trả lại profile. Chưa có → `AffiliateCodeGenerator::generate()` (`app/Support/AffiliateCodeGenerator.php`: 8 ký tự, alphabet loại 0/O/1/I, check trùng), `affiliate_status` = `autoApprove()?'approved':'pending'` (Setting `affiliate_auto_approve`), set `affiliate_approved_at`. Message tiếng Việt ("Đăng ký thành công" / "...đang chờ duyệt"). `profilePayload:82-127` trả `is_registered/affiliate_code/affiliate_status/share_url/commission_rate/...`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Đăng ký → nhận mã, trạng thái đúng theo `autoApprove`. *Lưu ý phụ thuộc DATA (không seed trong repo):* (1) **Setting `affiliate_enabled` phải = '1'** nếu không CẢ module trả 404 (kể cả `me`/`commissions`/`referrals`) → khi test/chạy thật phải tạo setting này. (2) Thiếu Setting `affiliate_auto_approve` → `autoApprove()` trả `false` → mặc định đăng ký = **'Chờ duyệt'**. (3) Cột `customers.affiliate_*` phải tồn tại (migration). (4) FE toast/label đều tiếng Việt — đạt convention.
- [x] Test coverage: **Phủ tốt (🟢)** — `tests/Feature/AffiliateRegistrationTest.php` (4): `test_register_auto_approves_when_setting_enabled`, `test_register_pends_when_auto_approve_disabled`, `test_double_register_returns_existing_code`, `test_returns_404_when_module_disabled`. + `tests/Unit/AffiliateCodeGeneratorTest.php` (2: độ dài 8 + alphabet an toàn, unique 30 lần). Thiếu test FE (render màn register/đã đăng ký).

---

## AFF-02
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** 🟢 Đã sửa (B19) — chờ verify thiết bị thật

**Ngữ cảnh & các bước:**
Lấy link/QR giới thiệu của KH-2. 1) Dùng tài khoản Zalo KHÁC chưa từng vào app, mở link đó. 2) Vào app.

**Kết quả mong đợi:**
Tài khoản mới được ghi nhận do KH-2 giới thiệu.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE bắt mã: `src/app.ts:30-34` đọc `?ref=` từ `window.location.search` → `localStorage.setItem("pending_ref_code", ref.toUpperCase())` (try/catch, không chặn boot). Áp mã sau auth: `applyPendingReferral(jwt)` gọi tại nhiều điểm sau khi có JWT (`src/hooks.ts:241, 319, 579, 729, 1222`) → `src/utils/affiliate.ts:30-56` `POST /affiliate/apply-referral { ref_code }`; clear key khi `ok || 404|409|422` (giữ lại nếu lỗi mạng để retry).
  - BE: `routes/api.php:58` `POST affiliate/apply-referral` → `AffiliateController@applyReferral:254-310`. Guards: đã `referred_by_customer_id` → 409 "Bạn đã được giới thiệu trước đó"; đã có đơn (`ZaloOrder::where customer_id exists`) → 409 "...đã có đơn hàng"; tự giới thiệu (mã trùng affiliate_code mình) → 422; referrer phải `affiliate_status='approved'` nếu không → 404 "Mã giới thiệu không hợp lệ hoặc chưa được duyệt". OK → set `referred_by_customer_id = referrer->id`. Share URL tạo ở `profilePayload:105-108` dạng `{base}/?ref={code}` với base = `https://zalo.me/s/{mini_app_id}/`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp về logic (🟢); rủi ro tích hợp đã xử lý ở FE (B19).** Attribution chỉ ghi khi tài khoản **chưa có đơn nào** (đúng tinh thần "tài khoản mới"). **Đã sửa (B19):**
  - **Rủi ro #1 (Zalo strip `?ref=`):** thêm helper `readRefFromSources()` (`utils/affiliate.ts`) đọc mã từ **2 nguồn** — ưu tiên `getRouteParams().ref` (kênh tham số CHÍNH THỨC của ZMP SDK, sống sót khi Zalo rewrite URL webview sang `/zapps/${APP_ID}`; sync, minVersion 2.11.0 — `zmp-sdk ^2.41.0` thoả), fallback `window.location.search ?ref=` (cho browser/local-dev/preview). Helper `captureRefCode()` thay block inline ở `app.ts`, normalize `trim().toUpperCase()`, **first-capture-wins** (không ghi đè `pending_ref_code` nếu đã có → cold-open sau không kèm ref không xoá mã đã bắt), toàn bộ bọc try/catch không chặn boot.
  - **Rủi ro #3 (apply nhiều điểm bắn POST trùng):** thêm guard module-level (`referralAppliedThisSession` + `referralApplyInFlight`) trong `applyPendingReferral`: 5 điểm gọi đồng thời → 1 POST (cùng promise); sau outcome deterministic (`ok`/404/409/422) → latch, không gọi lại trong phiên; **lỗi mạng KHÔNG latch** → vẫn retry thật lần auth sau. BE 409 vẫn là backstop khi reload reset state.
  - **Không ghi đè referrer cũ:** đảm bảo bởi BE — `applyReferral` trả 409 nếu `referred_by_customer_id` đã có (`AffiliateController.php:265-270`). FE guard chỉ tránh gọi dư.
  - (2) Mã treo ở localStorage tới khi auth xong mới áp — chấp nhận (có retry).
- [x] Test coverage: **Phủ BE tốt (🟢)** — `tests/Feature/ApplyReferralTest.php` (5): new_customer, already_referred (409), self_referral (422), prior_orders (409), ref_code_not_approved (404). **FE không có hạ tầng test (không vitest/jest)** → AFF-02 **PHẢI verify thiết bị thật** bằng checklist dưới.

**Checklist test tay (thiết bị thật — BẮT BUỘC cho AFF-02):**
Chuẩn bị: Device A có CTV `affiliate_status='approved'`, biết `affiliate_code`/share link. Device B **chưa từng cài/mở** Mini App này (hoặc xoá data) → khách mới, chưa `referred_by_customer_id`.
1. **Lấy share link (A):** màn CTV → copy share link (chứa `?ref=<CODE>`). Xác nhận `<CODE>` = affiliate_code của A.
2. **Mở deep link trên B (fresh):** bấm link trong Zalo (webview production `/zapps/${APP_ID}`). Xác nhận `pending_ref_code` set = `<CODE>` viết hoa (remote-debug localStorage, hoặc gián tiếp ở bước 4) → chứng minh `getRouteParams().ref` đọc được dù URL bị rewrite.
3. **Auth trên B:** đăng nhập bình thường → có JWT → trigger `applyPendingReferral`. Xác nhận: app boot/auth không bị chặn; sau outcome deterministic `pending_ref_code` bị xoá; chỉ **1** `POST /affiliate/apply-referral` hiệu lực (lần dư trả 409 vô hại) — kiểm network/log.
4. **Đặt đơn trên B:** thêm SP, checkout, hoàn tất bình thường.
5. **Kiểm tra ghi nhận (A):** màn "Khách giới thiệu" (`referrals-list.tsx`, `GET /affiliate/referrals`) → B xuất hiện (mobile mask/tên/joined), `referrals_count` tăng. Cross-check DB: `customers.referred_by_customer_id` của B = id A.
6. **Không ghi đè/idempotency:** trên B mở lại app (hoặc mở link CTV khác) rồi auth lại → `referred_by_customer_id` của B vẫn là A; BE 409; không có dòng referral trùng.
7. **Fallback browser (dev sanity):** local/browser preview (`getRouteParams()` rỗng) mở `?ref=<CODE>` → vẫn bắt qua `window.location.search`.

---

## AFF-03
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** 🟢 Đã sửa (B2)

**Ngữ cảnh & các bước:**
Tiếp nối AFF-02. 1) Tài khoản được giới thiệu đặt 1 đơn và hoàn tất (giao thành công). 2) KH-2 mở mục Cộng tác viên.

**Kết quả mong đợi:**
KH-2 phát sinh 1 dòng hoa hồng tương ứng đơn đó.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE ghi hoa hồng: `app/Listeners/RecordAffiliateCommission.php:14-67` (handle **`OrderDelivered`** — B2 đã dời từ `OrderPaymentSucceeded`): tìm order → referred customer → `referred_by_customer_id` → referrer phải `affiliate_status='approved'` → `commissionAmount = round(orderTotal * rate/100)` → `AffiliateCommission::firstOrCreate(['order_id'=>...], [... 'status'=>'confirmed'])`. Rate: `resolveCommissionRate():69-76` (Setting `affiliate_commission_rate`, mặc định 5.0).
  - **Event mới `app/Events/OrderDelivered.php`** (B2). Đăng ký listener: `app/Providers/EventServiceProvider.php` → `OrderDelivered::class => [RecordAffiliateCommission::class]` (đã GỠ khỏi `OrderPaymentSucceeded`; 3 listener còn lại — DeductStock/CreateVtp/SendNotification — GIỮ ở mốc paid).
  - **Điểm fire `OrderDelivered` (mọi điểm chuyển status→delivered — không sót):** (1) `ZaloApiController::updateStatus` (API admin PATCH `/orders/{id}/status`), (2) `Admin/ZaloOrderController::update` (admin web, fire sau commit), (3) `VtpWebhookService::processEvent` (webhook VTP code 501→delivered, fire sau commit qua cờ `$justDelivered`). Mỗi điểm guard `$previousStatus !== 'delivered'`; idempotent toàn cục nhờ `firstOrCreate(['order_id'])`.
  - FE: dòng hoa hồng hiện ở `src/pages/profile/affiliate/index.tsx` qua `CommissionSummary` (stats) + `CommissionList` + `ReferralsList` (commission_total từng khách). **FE KHÔNG đổi trong B2.**
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **🟢 ĐÃ SỬA (B2).** Hoa hồng giờ tính theo đơn **GIAO THÀNH CÔNG** (status→delivered), áp dụng **MỌI** payment method gồm **COD**. Mốc ghi đã dời từ "thanh toán online" sang "delivered" qua event `OrderDelivered`. (1) **COD giao thành công → CÓ hoa hồng** (fix chính). (2) Đơn online đã trả tiền nhưng **chưa giao → CHƯA có hoa hồng** (notify/job chỉ set `payment_status=success`). (3) Clawback khi huỷ/hoàn giữ nguyên (revert pending/confirmed → 'cancelled', không đụng 'paid') ở 3 nơi: `ZaloApiController::clawbackAffiliateCommission`, `VtpWebhookService::handleStatusSideEffects`, `AutoCancelStaleOrders`.
- [x] Test coverage: **Đầy đủ.** `tests/Feature/CommissionOnDeliveryTest.php` (6: COD delivered→commission, online-paid delivered→commission, delivered 2 lần idempotent→1 row, **paid-nhưng-chưa-delivered→0 commission**, no-referral→0, **VTP webhook 501→commission**) + `CommissionCreditedOnPaymentTest.php` (5, đã sửa: notify/job set paid nhưng KHÔNG sinh commission; double-fire `OrderDelivered`→1 row; COD-skip) + `AffiliateCommissionCalculationTest.php` (7, đổi sang `OrderDelivered`) + `CommissionClawbackOnCancelTest.php` (4, không đổi). `composer test:affiliate` = 33 passed, `composer test:zalo` = 34 passed.

---

## AFF-04
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🟢 Đã sửa (B11)

**Ngữ cảnh & các bước:**
Dùng KH-2 (đã là CTV). 1) Mở mục Cộng tác viên. 2) Xem danh sách đã giới thiệu + tổng hoa hồng. 3) Nhập thông tin tài khoản ngân hàng, lưu.

**Kết quả mong đợi:**
Hiển thị đúng số khách đã giới thiệu + tổng hoa hồng; lưu tài khoản ngân hàng thành công.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/pages/profile/affiliate/index.tsx:114-151` render: header `referrals_count` "khách đã giới thiệu"; `commission-summary.tsx` (3 ô: Chờ/Đã xác nhận/Đã chi trả = `commission_stats`); `referrals-list.tsx` (`fetchAffiliateReferrals` `GET /affiliate/referrals` → tên/mobile đã mask, `orders_count`, `commission_total`, tổng "X khách", nút "Tải thêm" phân trang); `commission-list.tsx`; `bank-info-form.tsx` (`updateAffiliateBank` `PATCH /affiliate/bank`, 3 field, toast "Đã cập nhật thông tin nhận tiền"). Utils: `src/utils/affiliate.ts:132-182`.
  - BE: `AffiliateController@referrals:175-231` (leftJoinSub orders_agg + commission_agg, `maskName`/`maskMobile`, paginate per_page 5–50, meta total); `@updateBank:129-150` (validate `bank_name/bank_account/bank_holder` nullable max → save → trả `profilePayload`); `@me`/`@commissions` cho summary + list. `referrals_count` & `commission_stats` tính trong `profilePayload:84-123`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **🟡 Khớp, vài lưu ý nhỏ.** Số khách (`referrals_count` = COUNT customers referred_by) + tổng hoa hồng (`commission_stats` theo status, `balance=confirmed`) hiển thị đúng; lưu bank OK. *Lưu ý:* (1) `updateBank` dùng `$data['x'] ?? $customer->x` — gửi chuỗi rỗng `""` **vẫn ghi đè thành ""** (vì `"" !== null`); FE luôn gửi cả 3 field `.trim()` nên muốn xoá thì set "" (chấp nhận được, nhưng không phân biệt "không đổi" vs "xoá"). (2) Tên/mobile khách giới thiệu **bị mask** (privacy) — đúng, nhưng use case không nêu; OK. (3) "Tổng hoa hồng" hiển thị 3 ô (Chờ/Đã xác nhận/Đã chi trả), không có ô "Đã huỷ" (cancelled) — `commission_stats` vẫn track cancelled nhưng UI ẩn; chấp nhận được.
- [x] Test coverage: **🟢 Đã sửa (B11)** — `tests/Feature/AffiliateBankAndProfileTest.php` (6): (1) `test_absent_key_does_not_overwrite` key vắng → field giữ nguyên; (2) `test_empty_string_clears_field` `""` → null; (3) `test_new_value_is_saved` giá trị mới lưu đúng; (4) `test_me_returns_correct_shape` response đủ 13 key; (5) `test_referrals_masks_name_and_mobile` mask tên + mask mobile, không lộ thô; (6) `test_referrals_pagination_meta` meta total/per_page/current_page/last_page đúng. Đồng thời **sửa bug `updateBank`**: dùng `array_key_exists` thay `??` để phân biệt key vắng vs key = "" (🟢 fix).

---

## AFF-05
- **Vai trò:** Admin | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🟢 Đã sửa (B11)

**Ngữ cảnh & các bước:**
Trên admin web. 1) Vào danh sách Cộng tác viên. 2) Duyệt (hoặc Từ chối) 1 CTV đang chờ.

**Kết quả mong đợi:**
Trạng thái CTV đổi đúng; nếu duyệt thì CTV vào trạng thái 'Đã duyệt'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE (admin web): `routes/web.php:183` `Route::resource('affiliate-partners', AffiliatePartnerController::class)->except(['create','store'])` + `:184` `PATCH affiliate-partners/{id}/status` → `app/Http/Controllers/Admin/AffiliatePartnerController.php`. `index:16-38` (danh sách, filter status/q, panel commissionRate/autoApprove/enabled); `updateStatus:107-120` (validate `affiliate_status in:pending,approved,suspended,rejected`; set status; nếu `approved` & chưa có `affiliate_approved_at` → set `now()`; redirect success "Đã đổi trạng thái cộng tác viên"); `destroy:122-129` (set status='rejected', "Đã từ chối cộng tác viên" — soft, không xoá). View `resources/views/admin/affiliate_partners/index.blade.php` + `show.blade.php`.
  - Middleware: nhóm `auth + checklogin + language` (admin web session), **không** phải `X-Admin-Secret` API.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Duyệt → `affiliate_status='approved'` + set `affiliate_approved_at` (mã mới có hiệu lực cho `applyReferral` vốn chỉ chấp nhận referrer `approved` — liên kết AFF-02/AFF-03). Từ chối → 'rejected' (qua PATCH status hoặc DELETE/destroy). *Lưu ý:* (1) "Từ chối" có 2 đường (PATCH status='rejected' và destroy) — đều set 'rejected', destroy không xoá bản ghi (giữ lịch sử). (2) Có thêm suspended/rejected ngoài approved/pending — FE customer `labelForStatus` đã map đủ ("Tạm khoá"/"Từ chối"). (3) `createPayout:154-194` (chi trả FIFO commission confirmed→paid) nằm cùng controller, ngoài phạm vi case này nhưng liên quan AFF-04 balance.
- [x] Test coverage: **🟢 Đã sửa (B11)** — `tests/Feature/AffiliateAdminTest.php` (10): approve/reject: (1) `test_approve_sets_status_and_approved_at`; (2) `test_approve_does_not_overwrite_existing_approved_at`; (3) `test_reject_sets_status_rejected`; (4) `test_suspend_via_updateStatus`. Payout FIFO: (5) `test_payout_marks_commissions_fifo` (3 commission confirmed cũ→mới, amount=3000 → 2 cũ nhất paid, mới vẫn confirmed); (6) `test_payout_skips_commission_larger_than_remaining` (commission > remaining → không chia nhỏ); (7) `test_payout_creates_payout_record` (row affiliate_payouts status=paid). Toggle settings: (8) `test_toggle_commission_rate` rate=7.5; (9) `test_toggle_auto_approve_off`; (10) `test_toggle_enabled_off`. Code đã đúng, B11 chỉ bổ sung coverage.

---
