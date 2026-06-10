# Nhóm: Xác thực

## AUTH-01
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🔴 Có lỗi

**Ngữ cảnh & các bước:**
Bạn là khách mới. 1) Mở app lần đầu. 2) Khi Zalo hỏi cấp quyền, bấm Đồng ý. 3) Vào trang Cá nhân.

**Kết quả mong đợi:**
Hiện đúng TÊN Zalo và ẢNH đại diện của bạn.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/components/layout.tsx` (mount `useInitAuth`) → `src/hooks.ts::useInitAuth` (getSetting/getUserInfo/getPhoneNumber + `authenticate`, cache SDK profile, set `customerProfileState`); `src/hooks.ts::useRequestInformation` (gọi `authorize({scope.userInfo, scope.userPhonenumber})` 1 lần); `src/state.ts::userInfoState` (giải tên/ảnh: SDK cache → backend profile → placeholder), `writeZaloSdkProfile`/`readZaloSdkProfile`; màn `src/pages/profile/index.tsx` → `src/pages/profile/user-info.tsx` (render name/avatar, có fallback chữ cái đầu khi ảnh lỗi).
  - BE: `POST /authenticate` → `ZaloApiController::authenticate` (dòng 846): gọi Graph API `me?fields=id,name,picture`, ưu tiên `name`/`avatar` client gửi rồi mới Graph; create/update `Customer` theo `firebase_id`; trả `user.{name,profile}`.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - **Có sai lệch — khớp với trạng thái 🔴.** Vấn đề thứ tự khởi tạo: `useInitAuth` chạy 1 lần lúc mount (`useEffect([])`). Trên lần mở ĐẦU TIÊN, popup cấp quyền chỉ bật qua `useRequestInformation` (lúc bấm Đăng ký/checkout), KHÔNG bật khi vào Profile. Nếu lúc `useInitAuth` chạy mà `getSetting` báo chưa cấp `scope.userInfo` → KHÔNG gọi `getUserInfo` → KHÔNG cache tên/ảnh và `authenticate` gửi lên không kèm name/avatar → backend phải dựa Graph API (chỉ trả tên thật khi đã cấp scope) → tên/ảnh dễ rơi về placeholder "Khách Zalo".
  - Sau khi user bấm Đồng ý, `refreshPermissions` chỉ bump `userInfoKeyState` để đọc lại `userInfoState`, KHÔNG re-chạy `getUserInfo` cũng KHÔNG re-`authenticate` → tên/ảnh thật thường chỉ xuất hiện ở lần mở thứ 2 (AUTH-04). Đây là nghi vấn gốc của 🔴: lần đầu cấp quyền xong vẫn chưa thấy tên/ảnh đúng ngay.
- [x] Test coverage: KHÔNG có test tự động cho `/authenticate` (cả backend lẫn FE). Luồng SDK getUserInfo/getSetting không test được ngoài runtime Zalo. → Cần test backend cho `authenticate` (ưu tiên client name/avatar, fallback Graph) + kịch bản re-auth sau khi cấp quyền.

---

## AUTH-02
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🟢 Đạt

**Ngữ cảnh & các bước:**
Tiếp nối AUTH-01. 1) Ở trang Cá nhân, làm theo bước app yêu cầu để chia sẻ số điện thoại.

**Kết quả mong đợi:**
Số điện thoại hiển thị đúng số thật của bạn.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `src/state.ts::phoneState` (gọi `getPhoneNumber` → `decodeToken`); `src/utils/zma.ts::decodeToken` (gọi `GET /infouser` với access_token + code); `useInitAuth` gửi `phone_token` lên `authenticate` để backend backfill `mobile`; `userInfoState.phone = saved.phone || profile?.mobile`; hiển thị ở `user-info.tsx` (`data?.phone || profile?.mobile`).
  - BE: `GET /infouser` → `ZaloApiController::zaloapiuser` (dòng 1006) decode phone token qua Graph `me/info`, trả `data.number`; `authenticate` (dòng 898–913, 965–967) decode `phone_token` và backfill `mobile` khi đang trống (`if ($phoneNumber && !$customer->mobile)`).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - **Khớp** (đúng trạng thái 🟢). Số điện thoại hiển thị lấy từ `customerProfileState.mobile` (đã backfill qua `authenticate` khi FE gửi `phone_token`), hoặc qua `phoneState`/`/infouser`.
  - Lưu ý nhỏ (không phải lỗi): `mobile` chỉ backfill khi đang trống — đúng chủ đích "số do user chủ động cấp", nhưng nghĩa là nếu user đổi SĐT Zalo thì DB không tự cập nhật theo. Comment route handler `zaloapiuser` còn để code cập nhật customer ở dạng đã comment (decode-only, không ghi DB) — hợp lý vì route public không có customer_id.
- [x] Test coverage: KHÔNG có test cho `/infouser` hay nhánh backfill `mobile` trong `authenticate`. → Nên thêm feature test: authenticate có `phone_token` ⇒ `mobile` được set; đã có `mobile` ⇒ không ghi đè.

---

## AUTH-03
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🟢 Đạt

**Ngữ cảnh & các bước:**
Dùng tài khoản Zalo CHƯA từng đăng nhập app. 1) Mở app lần đầu. 2) Khi hỏi quyền lấy tên, bấm Từ chối/Bỏ qua.

**Kết quả mong đợi:**
App vẫn vào được, không treo, không lỗi đỏ; tên hiện 'Zalo User' hoặc màn đăng ký.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - FE: `useRequestInformation` (hooks.ts:95) bắt lỗi `authorize` bị từ chối → `console.warn` rồi tiếp tục với fallback; `useInitAuth` bọc `getSetting` trong try/catch và mỗi call `getPhoneNumber`/`getUserInfo` tự nuốt lỗi → vẫn `authenticate` chỉ với `access_token`; `userInfoState` fallback tên "Khách Zalo"; `user-info.tsx` hiển thị thẻ user khi có `profile` (đã auth) hoặc hiện `Register` khi không có gì.
  - BE: `authenticate` tạo `Customer` với `name = 'Zalo User'` khi `resolvedName` rỗng (dòng 926).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - **Khớp** (đúng trạng thái 🟢). Từ chối quyền không làm app treo: mọi call SDK đều có fallback, `authenticate` chỉ cần `access_token`. App hiển thị thẻ user với placeholder hoặc màn Đăng ký.
  - Sai lệch nhỏ về wording: kết quả mong đợi nói tên 'Zalo User' (default backend), nhưng FE `userInfoState` mặc định "Khách Zalo". Hai placeholder khác nhau nhưng đều thoả "không lỗi đỏ + có placeholder". Backend ghi 'Zalo User' xuống DB; nếu `customerProfileState` về kịp thì có thể hiện 'Zalo User', còn trước đó FE hiện 'Khách Zalo' → có thể nháy đổi tên. Cân nhắc thống nhất 1 placeholder.
- [x] Test coverage: KHÔNG có test tự động (luồng từ chối quyền là hành vi runtime Zalo SDK). Backend nhánh tạo customer 'Zalo User' chưa có test.

---

## AUTH-04
- **Vai trò:** Khách | **Độ ưu tiên:** Cơ bản | **Kết quả test gần nhất:** 🟢 Đạt

**Ngữ cảnh & các bước:**
Dùng tài khoản đã đăng nhập ở AUTH-01. 1) Thoát hẳn app. 2) Mở lại app (đăng nhập lần 2).

**Kết quả mong đợi:**
Vẫn đúng tên/ảnh/SĐT cũ; KHÔNG tạo tài khoản mới trùng.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `authenticate` tìm customer theo `Customer::where('firebase_id', $zaloProfile['id'])->first()` (dòng 916) → tồn tại thì UPDATE, chưa có thì CREATE. Khoá định danh là `firebase_id` (= Zalo user id) ⇒ cùng tài khoản Zalo luôn map về 1 `Customer`, không tạo trùng.
  - FE: `customerProfileState` là `atomWithStorage("customer_profile")` (state.ts:577) → persist localStorage, render ngay khi cold start; `useInitAuth` re-`authenticate` nền để refresh tên/ảnh/flag mới nhất rồi ghi đè.
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - **Khớp** (đúng trạng thái 🟢). Mở lại app: lookup theo `firebase_id` đảm bảo không trùng tài khoản; tên/ảnh/mobile được sync lại từ DB; profile cache hiển thị tức thì tránh nháy "chưa đăng nhập".
  - Không phát hiện sai lệch. (Liên quan AUTH-01: chính ở lần mở thứ 2 này tên/ảnh thật mới chắc chắn hiện đủ vì SDK cache đã được ghi từ phiên trước.)
- [x] Test coverage: KHÔNG có test cho tính idempotent theo `firebase_id` (không tạo trùng) của `authenticate`. → Nên thêm test: gọi `authenticate` 2 lần cùng `firebase_id` ⇒ chỉ 1 row `customers`, dữ liệu được cập nhật chứ không nhân bản.

---

## AUTH-05
- **Vai trò:** Khách | **Độ ưu tiên:** Nâng cao | **Kết quả test gần nhất:** ⚪ Chưa kiểm tra

**Ngữ cảnh & các bước:**
Dùng tài khoản KH-KHOA (đã bị admin khoá). 1) Đăng nhập. 2) Thử đặt 1 đơn hoặc thao tác bất kỳ cần đăng nhập.

**Kết quả mong đợi:**
Báo: 'Tài khoản đã bị vô hiệu hoá, vui lòng liên hệ admin'.

**Đối chiếu code (Claude Code điền):**
- [x] File/route/màn hình liên quan:
  - BE: `InteractsWithAccountStatus::accountDisabledResponse` (trait — hợp đồng duy nhất: `403 + {error:true, message:'Tài khoản đã bị vô hiệu hoá, vui lòng liên hệ admin', code:'ACCOUNT_DISABLED'}`); dùng ở `ZaloJwtMiddleware` (isActive==0, dòng 56), `authenticate` (customer cũ isActive==0, dòng 938) và `EnsureFarmPartner`. Model `Customer::isActive`.
  - FE: `src/utils/request.ts` interceptor 403 → ném `AccountDisabledError` + `notifyAccountDisabled()`; `src/utils/account-disabled.ts` (bus cờ 1 chiều, `detectAccountDisabledResponse` cho fetch thô); `src/hooks.ts::useAccountDisabledGate` (xoá jwt + profile, bật cờ) gọi trong `layout.tsx`; `src/components/account-disabled-notice.tsx` (banner ở customer / màn chặn ở farm, nút "Liên hệ admin"); các luồng fetch thô tự xử lý 403 (`useCheckout` 3 chốt, `useCancelOrder`, voucher hooks).
- [x] Code hiện tại có khớp kết quả mong đợi không? Sai lệch:
  - **Khớp.** Đăng nhập bằng tài khoản đã khoá: `authenticate` (customer cũ) trả 403 ACCOUNT_DISABLED → `useInitAuth` bắt `isAccountDisabled` → xoá jwt + bật cờ → `layout` render banner đúng message. Thao tác cần JWT (đặt đơn, huỷ đơn, voucher, farm) đều bị middleware chặn 403 cùng message. Message khớp chính xác chuỗi mong đợi.
  - Không phát hiện sai lệch logic. (Cờ là 1 chiều tới khi reload — đúng thiết kế.)
- [x] Test coverage: **Có** (backend) — `tests/Feature/FarmHubTest.php`: `test_disabled_customer_gets_403_account_disabled_on_jwt_route` (route `/orders`) và `test_disabled_farm_partner_gets_403_account_disabled` (route farm). **Thiếu**: test cho nhánh `authenticate` khi customer cũ `isActive==0` (dòng 938) trả 403; và FE chưa có test cho gate/banner. → Bổ sung test backend cho `authenticate` + (tuỳ chọn) test cho `request.ts` interceptor.

---
