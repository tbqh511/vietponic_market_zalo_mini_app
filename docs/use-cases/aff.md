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
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Lấy link/QR giới thiệu của KH-2. 1) Dùng tài khoản Zalo KHÁC chưa từng vào app, mở link đó. 2) Vào app.

**Kết quả mong đợi:**
Tài khoản mới được ghi nhận do KH-2 giới thiệu.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE bắt mã: `src/app.ts:30-34` đọc `?ref=` từ `window.location.search` → `localStorage.setItem("pending_ref_code", ref.toUpperCase())` (try/catch, không chặn boot). Áp mã sau auth: `applyPendingReferral(jwt)` gọi tại nhiều điểm sau khi có JWT (`src/hooks.ts:241, 319, 579, 729, 1222`) → `src/utils/affiliate.ts:30-56` `POST /affiliate/apply-referral { ref_code }`; clear key khi `ok || 404|409|422` (giữ lại nếu lỗi mạng để retry).
  - BE: `routes/api.php:58` `POST affiliate/apply-referral` → `AffiliateController@applyReferral:254-310`. Guards: đã `referred_by_customer_id` → 409 "Bạn đã được giới thiệu trước đó"; đã có đơn (`ZaloOrder::where customer_id exists`) → 409 "...đã có đơn hàng"; tự giới thiệu (mã trùng affiliate_code mình) → 422; referrer phải `affiliate_status='approved'` nếu không → 404 "Mã giới thiệu không hợp lệ hoặc chưa được duyệt". OK → set `referred_by_customer_id = referrer->id`. Share URL tạo ở `profilePayload:105-108` dạng `{base}/?ref={code}` với base = `https://zalo.me/s/{mini_app_id}/`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp về logic (🟢) NHƯNG có rủi ro tích hợp (🟡).** Attribution chỉ ghi khi tài khoản **chưa có đơn nào** (đúng tinh thần "tài khoản mới"). *Rủi ro cần kiểm thử thực tế trên Zalo:* (1) FE chỉ bắt `?ref=` qua `window.location.search` lúc boot — **phụ thuộc Zalo có truyền query `ref` vào webview Mini App khi mở từ share link hay không**; nếu Zalo strip query / dùng deep-link param khác thì mã không được bắt → không ghi nhận. Cần verify trên thiết bị thật bằng đúng `share_url`. (2) Mã lưu ở localStorage tới khi auth xong mới áp — nếu user mở link nhưng chưa từng auth thành công thì mã treo (acceptable, có retry). (3) Vì áp mã sau auth ở nhiều điểm, nếu gọi đồng thời có thể trùng request nhưng BE idempotent (lần 2 trả 409 → clear).
- [x] Test coverage: **Phủ BE tốt (🟢)** — `tests/Feature/ApplyReferralTest.php` (5): `test_applies_referral_for_new_customer`, `test_rejects_when_customer_already_referred` (409), `test_rejects_self_referral` (422), `test_rejects_when_customer_has_prior_orders` (409), `test_rejects_when_ref_code_not_approved` (404). **Thiếu test FE** cho `app.ts` capture `?ref=` và `applyPendingReferral` (clear-on-deterministic-outcome) — và đặc biệt **chưa có kiểm thử thực tế Zalo giữ query param** (rủi ro #1).

---

## AFF-03
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Tiếp nối AFF-02. 1) Tài khoản được giới thiệu đặt 1 đơn và hoàn tất (giao thành công). 2) KH-2 mở mục Cộng tác viên.

**Kết quả mong đợi:**
KH-2 phát sinh 1 dòng hoa hồng tương ứng đơn đó.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE ghi hoa hồng: `app/Listeners/RecordAffiliateCommission.php:14-67` (handle `OrderPaymentSucceeded`): tìm order → referred customer → `referred_by_customer_id` → referrer phải `affiliate_status='approved'` → `commissionAmount = round(orderTotal * rate/100)` → `AffiliateCommission::firstOrCreate(['order_id'=>...], [... 'status'=>'confirmed'])`. Rate: `resolveCommissionRate():69-76` (Setting `affiliate_commission_rate`, mặc định 5.0).
  - **Điểm fire `OrderPaymentSucceeded` (mấu chốt):** CHỈ 2 chỗ — `app/Http/Controllers/ZaloApiController.php:1257` (`notifySDK` webhook, **đơn online**) và `app/Jobs/CheckPaymentStatus.php:89` (job poll, **đơn online**). Đăng ký listener: `app/Providers/EventServiceProvider.php:26-31`.
  - FE: dòng hoa hồng hiện ở `src/pages/profile/affiliate/index.tsx` qua `CommissionSummary` (stats) + `CommissionList` + `ReferralsList` (commission_total từng khách).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **🔴 LỆCH NGHIỆP VỤ (phát hiện khi audit).** Use case mong đợi hoa hồng phát sinh **khi đơn "giao thành công"**. Thực tế hoa hồng chỉ ghi khi **thanh toán ONLINE thành công**, KHÔNG theo mốc giao hàng: (1) **Đơn COD KHÔNG BAO GIỜ phát sinh hoa hồng** — `payment_status='cod'` không bao giờ fire `OrderPaymentSucceeded`; test `CommissionCreditedOnPaymentTest::test_webhook_notify_cod_keeps_status_and_skips_commission` xác nhận đây là **chủ đích**. Với COD là luồng chủ đạo VN → phần lớn đơn giới thiệu KHÔNG sinh hoa hồng. (2) Admin chuyển đơn → `delivered` (`updateStatus:549`) **chỉ set `delivered_at`, KHÔNG fire `OrderPaymentSucceeded`** → "giao thành công" không kích hoạt hoa hồng. (3) Với đơn online, hoa hồng ghi ngay lúc **thanh toán** (TRƯỚC khi giao) và status = **'confirmed' ngay** (không phải 'pending' chờ giao). ⇒ **Cần chốt product owner:** hoa hồng theo "thanh toán online" (hiện tại) hay theo "đơn giao thành công" (use case)? Nếu theo use case: cần fire 1 event khi `status→delivered` (áp dụng cả COD) và dời mốc ghi `RecordAffiliateCommission` sang đó. Clawback khi huỷ đã có (`clawbackAffiliateCommission` revert pending/confirmed → 'cancelled').
- [x] Test coverage: **Luồng ONLINE phủ rất tốt** — `tests/Feature/CommissionCreditedOnPaymentTest.php` (5: webhook credits, **COD skips (chủ đích)**, job path credits, double-fire→1 row idempotent, no-commission khi không referred) + `tests/Unit/AffiliateCommissionCalculationTest.php` (7: rate/default/rounding/zero-total-skip/no-referrer/not-approved/idempotent). **NHƯNG không có (và không thể có với code hiện tại) test cho kịch bản use case "đơn COD giao thành công → sinh hoa hồng"** — vì code chủ đích không hỗ trợ. Đây chính là lý do đánh 🔴.

---

## AFF-04
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng KH-2 (đã là CTV). 1) Mở mục Cộng tác viên. 2) Xem danh sách đã giới thiệu + tổng hoa hồng. 3) Nhập thông tin tài khoản ngân hàng, lưu.

**Kết quả mong đợi:**
Hiển thị đúng số khách đã giới thiệu + tổng hoa hồng; lưu tài khoản ngân hàng thành công.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/pages/profile/affiliate/index.tsx:114-151` render: header `referrals_count` "khách đã giới thiệu"; `commission-summary.tsx` (3 ô: Chờ/Đã xác nhận/Đã chi trả = `commission_stats`); `referrals-list.tsx` (`fetchAffiliateReferrals` `GET /affiliate/referrals` → tên/mobile đã mask, `orders_count`, `commission_total`, tổng "X khách", nút "Tải thêm" phân trang); `commission-list.tsx`; `bank-info-form.tsx` (`updateAffiliateBank` `PATCH /affiliate/bank`, 3 field, toast "Đã cập nhật thông tin nhận tiền"). Utils: `src/utils/affiliate.ts:132-182`.
  - BE: `AffiliateController@referrals:175-231` (leftJoinSub orders_agg + commission_agg, `maskName`/`maskMobile`, paginate per_page 5–50, meta total); `@updateBank:129-150` (validate `bank_name/bank_account/bank_holder` nullable max → save → trả `profilePayload`); `@me`/`@commissions` cho summary + list. `referrals_count` & `commission_stats` tính trong `profilePayload:84-123`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **🟡 Khớp, vài lưu ý nhỏ.** Số khách (`referrals_count` = COUNT customers referred_by) + tổng hoa hồng (`commission_stats` theo status, `balance=confirmed`) hiển thị đúng; lưu bank OK. *Lưu ý:* (1) `updateBank` dùng `$data['x'] ?? $customer->x` — gửi chuỗi rỗng `""` **vẫn ghi đè thành ""** (vì `"" !== null`); FE luôn gửi cả 3 field `.trim()` nên muốn xoá thì set "" (chấp nhận được, nhưng không phân biệt "không đổi" vs "xoá"). (2) Tên/mobile khách giới thiệu **bị mask** (privacy) — đúng, nhưng use case không nêu; OK. (3) "Tổng hoa hồng" hiển thị 3 ô (Chờ/Đã xác nhận/Đã chi trả), không có ô "Đã huỷ" (cancelled) — `commission_stats` vẫn track cancelled nhưng UI ẩn; chấp nhận được.
- [x] Test coverage: **🟡 Thiếu** — KHÔNG có Feature test cho `GET /affiliate/referrals` (shape, mask name/mobile, join orders/commission, phân trang) lẫn `PATCH /affiliate/bank` (lưu/ghi đè/validate) và `GET /affiliate/me` (`referrals_count`/`commission_stats`/`balance`). Các test affiliate hiện chỉ phủ register / apply-referral / commission-credit / clawback. Cần bổ sung khi sửa.

---

## AFF-05
- **Vai trò:** Admin | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Trên admin web. 1) Vào danh sách Cộng tác viên. 2) Duyệt (hoặc Từ chối) 1 CTV đang chờ.

**Kết quả mong đợi:**
Trạng thái CTV đổi đúng; nếu duyệt thì CTV vào trạng thái 'Đã duyệt'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE (admin web): `routes/web.php:183` `Route::resource('affiliate-partners', AffiliatePartnerController::class)->except(['create','store'])` + `:184` `PATCH affiliate-partners/{id}/status` → `app/Http/Controllers/Admin/AffiliatePartnerController.php`. `index:16-38` (danh sách, filter status/q, panel commissionRate/autoApprove/enabled); `updateStatus:107-120` (validate `affiliate_status in:pending,approved,suspended,rejected`; set status; nếu `approved` & chưa có `affiliate_approved_at` → set `now()`; redirect success "Đã đổi trạng thái cộng tác viên"); `destroy:122-129` (set status='rejected', "Đã từ chối cộng tác viên" — soft, không xoá). View `resources/views/admin/affiliate_partners/index.blade.php` + `show.blade.php`.
  - Middleware: nhóm `auth + checklogin + language` (admin web session), **không** phải `X-Admin-Secret` API.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch: **Khớp (🟢).** Duyệt → `affiliate_status='approved'` + set `affiliate_approved_at` (mã mới có hiệu lực cho `applyReferral` vốn chỉ chấp nhận referrer `approved` — liên kết AFF-02/AFF-03). Từ chối → 'rejected' (qua PATCH status hoặc DELETE/destroy). *Lưu ý:* (1) "Từ chối" có 2 đường (PATCH status='rejected' và destroy) — đều set 'rejected', destroy không xoá bản ghi (giữ lịch sử). (2) Có thêm suspended/rejected ngoài approved/pending — FE customer `labelForStatus` đã map đủ ("Tạm khoá"/"Từ chối"). (3) `createPayout:154-194` (chi trả FIFO commission confirmed→paid) nằm cùng controller, ngoài phạm vi case này nhưng liên quan AFF-04 balance.
- [x] Test coverage: **Thiếu hoàn toàn (🔴 về test)** — KHÔNG có Feature test cho admin-web `AffiliatePartnerController` (`updateStatus` approve/reject set approved_at, `destroy`, `createPayout` FIFO, các toggle setting `commission-rate`/`auto-approve`/`enabled`). Đây là CRUD admin-web (giống PROD-01..03) hiện chưa được test. Cần bổ sung khi sửa.

---
