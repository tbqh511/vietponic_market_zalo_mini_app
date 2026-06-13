# CHECKLIST TEST TAY — Vietponics Zalo Mini App

> Gom toàn bộ **66 use case** thành 1 checklist thực thi tay trên **Zalo sandbox / thiết bị thật**.
> Mỗi mục: kịch bản từng bước (theo CSV gốc), kết quả mong đợi, ô tick.
> Nguồn kịch bản: `docs/use-cases/{auth,role,prod,stock,ordpro,order,aff,pack-hub}.md`.
> Trạng thái fix tự động: xem `INDEX.md` + `FIX-PLAN.md`. Luồng thanh toán chuyên sâu: `../vietponic_market_zalo_backend/zalo_production_test_plan.md`.

## Cách dùng

1. Test trên **Zalo sandbox** trước (channel `COD_SANDBOX`/`BANK_SANDBOX`), rồi thiết bị thật qua QR.
2. Mục 🔴 **bắt buộc** chạy trên Zalo runtime / thiết bị thật (SDK, deep link, thanh toán) — automated test KHÔNG phủ được.
3. Tick `[x]` Pass hoặc Fail + ghi chú khi xong. Mục ✅ chỉ cần **smoke nhẹ** (đã có test tự động phủ).

### Chú thích mức ưu tiên test tay

| Ký hiệu | Ý nghĩa |
|---|---|
| 🔴 | **Bắt buộc thiết bị/Zalo runtime** — SDK auth/phone, deep link, thanh toán, double-tap, vị trí. Không automated được. |
| 🟡 | **FE-only / sandbox** — đã đổi FE nhưng repo KHÔNG có hạ tầng test FE → phải kiểm tay. |
| ⚪ | **Chưa từng test tay** — code đã audit, không sai lệch; cần chạy 1 lượt xác nhận. |
| ✅ | **Đã phủ test tự động tốt** — vẫn liệt kê để đối soát; smoke nhẹ là đủ. |

### Tiền đề dữ liệu / môi trường (chuẩn bị trước khi test)

- **Tài khoản test:** `KH-1` (khách thường), `KH-2` (khách → CTV), `KH-REQ` (đã đăng ký farm, chờ duyệt), `KH-KHOA` (bị admin khoá `isActive=0`), `OWNER-A` (chủ farm/hub A), `OWNER-B` (chủ farm B, **không** phải hub), `STAFF-A` (nhân viên farm A), `SUSPEND-A` (farm tạm dừng: `is_active=false` hoặc `farm_partner_status='suspended'`).
- **Seed voucher** (`php artisan db:seed --class=VoucherSeeder`): `GIAM20K` (fixed 20.000đ, min 100.000đ), `SALE10` (10%, trần 50.000đ), `FREESHIP`.
- **Setting affiliate:** `affiliate_enabled='1'` (nếu '0' → toàn module CTV trả 404); `affiliate_auto_approve` (off → đăng ký = "Chờ duyệt").
- **Hạ tầng:** queue worker chạy (`php artisan queue:listen`) cho `CheckPaymentStatus`/`CancelUnpaidOrder`; cron `orders:auto-cancel-stale` (schedule:run); webhook `/notify` có public URL (ngrok khi sandbox).

### Tổng quan ưu tiên (đếm theo nhóm)

- 🔴 Runtime/thiết bị: AUTH-01..05, ROLE-01..06, ORDER-03/04/05/06/08/16, ORDPRO-09/10, AFF-02/03.
- 🟡 FE/sandbox: PROD-05, STOCK-02/04, HUB-01, (AFF-04 form bank).
- ⚪ Chưa test tay: STOCK-01/03/05/07, ORDPRO-01/02/03/06/07, ORDER-01/02/07/09/10/11/12/13/14/15, HUB-02, PACK-01..09, PROD-04, AFF-01.
- ✅ Đã phủ test: PROD-01/02/03, STOCK-06, ORDPRO-04/05/08/11, ORDER (voucher), AFF-04/05.

---

## 1. Xác thực (AUTH) — 5 case

### AUTH-01 — Hiện tên + ảnh Zalo ngay lần đầu cấp quyền · 🔴 · Fix B10
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** (1) Khách mới mở app lần đầu. (2) Zalo hỏi cấp quyền → bấm **Đồng ý**. (3) Vào trang Cá nhân.
- **Kết quả mong đợi:** Hiện đúng **TÊN Zalo + ẢNH đại diện** thật **ngay trong chính phiên này** (điểm B10 sửa — KHÔNG phải đợi mở lại app lần 2).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### AUTH-02 — Hiển thị số điện thoại thật · 🔴
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Tiếp nối AUTH-01. (1) Ở trang Cá nhân, làm theo bước app yêu cầu để **chia sẻ số điện thoại**.
- **Kết quả mong đợi:** Số điện thoại hiển thị đúng **số thật** của tài khoản.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### AUTH-03 — Từ chối quyền: app không treo, placeholder "Khách Zalo" · 🔴 · Fix B10
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Tài khoản Zalo CHƯA từng đăng nhập. (1) Mở app lần đầu. (2) Khi hỏi quyền lấy tên → bấm **Từ chối/Bỏ qua**.
- **Kết quả mong đợi:** App **vẫn vào được**, không treo, không lỗi đỏ; tên hiện **"Khách Zalo"** (thống nhất FE+BE) hoặc màn đăng ký.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### AUTH-04 — Mở lại app: giữ tên/ảnh/SĐT, không tạo trùng · 🔴
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng tài khoản đã đăng nhập ở AUTH-01. (1) Thoát hẳn app. (2) Mở lại (đăng nhập lần 2).
- **Kết quả mong đợi:** Vẫn đúng tên/ảnh/SĐT cũ; **KHÔNG** tạo tài khoản mới trùng (lookup theo `firebase_id`).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### AUTH-05 — Tài khoản bị khoá: báo vô hiệu hoá · 🔴 ⚪ (chưa test tay)
- **Vai trò:** Khách · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `KH-KHOA` (admin đã khoá). (1) Đăng nhập. (2) Thử đặt 1 đơn hoặc thao tác cần đăng nhập.
- **Kết quả mong đợi:** Báo **"Tài khoản đã bị vô hiệu hoá, vui lòng liên hệ admin"** (banner phía khách / màn chặn phía farm), mọi thao tác cần JWT bị chặn 403 cùng message.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

---

## 2. Phân quyền (ROLE) — 6 case (test trên app thật)

### ROLE-01 — Khách thường bị chặn vào Farm Hub · 🔴 · Fix B8
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Khách thường. (1) Tìm/thử mở khu vực Quản lý Farm (Farm Hub).
- **Kết quả mong đợi:** **Không thấy** FAB Hub; mở `/farm*` → màn **"Khu vực dành cho đối tác farm"** + nút "Đăng ký đối tác" (KHÔNG còn silent-redirect). Bấm đăng ký → vào `/farm/register` không loop.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ROLE-02 — KH chờ duyệt thấy màn "Đang chờ duyệt" · 🔴 · Fix B8
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-REQ` (đã đăng ký, admin CHƯA duyệt). (1) Thử vào Farm Hub.
- **Kết quả mong đợi:** Hiện màn **"Đang chờ duyệt"** (KHÔNG đẩy lại form đăng ký); gọi API trực tiếp → 403 `'Bạn không có quyền truy cập chức năng Farm Partner'`.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ROLE-03 — Owner vào được TẤT CẢ mục (kể cả payout) · 🔴 ⚪ (chưa test tay)
- **Vai trò:** Farm Owner · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `OWNER-A`. (1) Vào Hub. (2) Mở lần lượt: Bảng điều khiển, Kho, Đơn đang đến, **Thanh toán/Rút tiền (payout)**.
- **Kết quả mong đợi:** Vào được **mọi mục**, kể cả payout (`is_owner=true` mở thêm UI chỉ-owner như nút Phân công).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ROLE-04 — Staff KHÔNG thấy/không vào được payout · 🔴 · Fix B7
- **Vai trò:** Farm Staff · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `STAFF-A`. (1) Vào Hub. (2) Mở Kho & Đơn. (3) Tìm mục Thanh toán/Rút tiền.
- **Kết quả mong đợi:** Vào được Kho & Đơn; **KHÔNG thấy tab "Thu nhập"**; vào thẳng `/farm/payouts` → màn "Bạn không có quyền xem mục này"; API `/farm/payouts*` → **403**.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ROLE-05 — Farm tạm dừng: 1 message thống nhất · 🔴 · Fix B8
- **Vai trò:** Farm Owner · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `SUSPEND-A`. (1) Thử vào Hub. (Kiểm cả 2 đường: farm `is_active=false` và `farm_partner_status='suspended'`.)
- **Kết quả mong đợi:** Cả 2 đường → **1 message thống nhất** `"Farm của bạn đang tạm dừng, vui lòng liên hệ admin"` + nút "Liên hệ admin".
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ROLE-06 — Owner-B chỉ thấy dữ liệu Farm B · 🔴 ⚪ (chưa test tay)
- **Vai trò:** Farm Owner · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `OWNER-B`. (1) Vào Hub. (2) Xem danh sách Kho và Đơn.
- **Kết quả mong đợi:** **Chỉ thấy dữ liệu Farm B**; KHÔNG thấy đơn/kho của Farm A (kể cả trong đơn nhiều farm chỉ thấy phần item của mình).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

---

## 3. Sản phẩm (PROD) — 5 case

### PROD-01 — Tạo SP hợp lệ → hiện trong danh sách · ✅ · Fix B3 (admin web)
- **Vai trò:** Admin · **Ưu tiên:** Cơ bản
- **Kịch bản:** Admin web. (1) Tạo SP mới: đủ tên, giá, **danh mục, đơn vị, ảnh hợp lệ**. (2) Bấm Lưu.
- **Kết quả mong đợi:** Lưu thành công, flash **tiếng Việt "Đã tạo sản phẩm"**, SP xuất hiện trong danh sách; 2 SP tạo liên tiếp có id khác nhau (race-safe).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PROD-02 — Bỏ trống tên → lỗi tiếng Việt · ✅ · Fix B3
- **Vai trò:** Admin · **Ưu tiên:** Cơ bản
- **Kịch bản:** Admin web. (1) Tạo SP **bỏ trống tên**. (2) Bấm Lưu.
- **Kết quả mong đợi:** Bị chặn, báo lỗi **"tên sản phẩm là bắt buộc"** (tiếng Việt, KHÔNG còn "The name field is required").
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PROD-03 — Ảnh sai định dạng/>2MB → lỗi tiếng Việt, không 500 · ✅ · Fix B3
- **Vai trò:** Admin · **Ưu tiên:** Cơ bản
- **Kịch bản:** Admin web. (1) Tạo SP, tải ảnh **.txt** hoặc ảnh **>2MB** (và thử file ảnh hỏng). (2) Bấm Lưu.
- **Kết quả mong đợi:** Bị chặn, **message ảnh tiếng Việt**; ảnh hỏng → trả validation error VN, **KHÔNG 500**.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PROD-04 — Khách thấy SP sau khi tạo+gắn farm+nhập lô · ⚪ · Ghi chú B13
- **Vai trò:** Admin + Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** (1) Admin tạo SP & gắn vào farm. (2) `KH-1` mở app, tìm SP đó. *(Điều kiện đủ: tạo → gắn farm → **nhập lô batch active**.)*
- **Kết quả mong đợi:** Khách **nhìn thấy** SP. Lưu ý: gắn farm mà CHƯA nhập kho → `stock_available=0` → sau B13 SP vẫn hiện **kèm badge "Hết hàng"**, mua được khi có lô active.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PROD-05 — SP chưa nhập kho hiện badge "Hết hàng" · 🟡 · Fix B13 (FE)
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Tìm 1 SP CHƯA nhập kho (chưa có lô nào) ở home/search/category.
- **Kết quả mong đợi:** SP **hiện trong list kèm badge "Hết hàng"** (ảnh xám), **không thêm vào giỏ được** (nút disabled). (Không còn ẩn hoàn toàn.)
- [ ] Pass [ ] Fail — Ghi chú: ____________________

---

## 4. Quản lý kho (STOCK) — 7 case

### STOCK-01 — Nhập kho buổi sáng → tồn tăng đúng · ⚪
- **Vai trò:** Farm Owner · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `OWNER-A`. (1) Vào "Khai báo nhập kho buổi sáng". (2) Nhập 2–3 mặt hàng + số lượng. (3) Lưu.
- **Kết quả mong đợi:** Tồn kho mỗi mặt hàng **tăng đúng** số vừa nhập (mỗi lần tạo batch mới, tồn tổng = SUM batch active).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### STOCK-02 — Nhập lô có hạn dùng → xem lại đúng hạn · 🟡 · Fix B12 (FE)
- **Vai trò:** Farm Owner · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `OWNER-A`. (1) Nhập 1 lô có **chọn HẠN SỬ DỤNG** (date picker, không chọn quá khứ). (2) Mở tab **"Lô hàng"** trong `/farm/movements/:id` xem lại lô.
- **Kết quả mong đợi:** Lô hiển thị **đúng ngày hết hạn** đã nhập (dd/MM/yyyy); badge cảnh báo màu: đỏ "Đã hết hạn" (<0), cam "Sắp hết hạn · còn N ngày" (0–6). Bỏ trống hạn → "Không hạn"/auto.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### STOCK-03 — Mua 3kg/10kg → tồn còn 7kg · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Ghi tồn SP X (vd 10kg). (2) Đặt mua 3kg, hoàn tất đơn. (3) Xem lại tồn SP X.
- **Kết quả mong đợi:** Tồn còn **7kg** (giảm đúng 3kg ngay khi tạo đơn — reserve = deduct).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### STOCK-04 — Đặt vượt tồn → chặn 422 + cap số lượng FE · 🟡 · Fix B13 (FE)
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Chọn SP Y chỉ còn 2kg. (2) Thử đặt 5kg.
- **Kết quả mong đợi:** FE **cap số lượng** theo `stockAvailable` (disable nút "+", hiện "Còn lại X"). Nếu vẫn lọt → checkout BE chặn **422** với **nguyên văn** message BE "Một số sản phẩm không đủ số lượng tồn kho" + dòng shortages thô.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### STOCK-05 — Mua hết lô cuối → SP "Hết hàng" · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `KH-1`. (1) Chọn SP chỉ còn 1 lô. (2) Mua hết sạch số còn lại.
- **Kết quả mong đợi:** SP chuyển **"Hết hàng"** sau khi đặt (batch → depleted, `stock_available=0`); list hiện badge "Hết hàng" (B13).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### STOCK-06 — Huỷ đơn → hoàn kho đúng số · ✅ · Fix B6
- **Vai trò:** Khách + Admin · **Ưu tiên:** Nâng cao
- **Kịch bản:** (1) `KH-1` ghi tồn, đặt 1 đơn (trừ kho). (2) Admin huỷ đơn đó. (3) Xem lại tồn.
- **Kết quả mong đợi:** Tồn được **hoàn lại đúng số đã trừ** vào từng batch nguồn; lô đã `depleted` → revert `active`.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### STOCK-07 — FEFO: trừ lô hết hạn sớm trước · ⚪
- **Vai trò:** Farm Owner + Khách · **Ưu tiên:** Nâng cao
- **Kịch bản:** (1) `OWNER-A` nhập 2 lô cùng SP: lô A hết hạn sớm hơn lô B. (2) `KH-1` mua 1 ít. (3) Owner xem lô nào bị trừ.
- **Kết quả mong đợi:** Số lượng bị trừ vào **LÔ A (hết hạn sớm)** trước; hết A mới sang B.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

---

## 5. Xử lý đơn (ORDPRO) — 11 case

### ORDPRO-01 — Đơn mới hiện ở "Đơn đang đến" (~30s) · ⚪
- **Vai trò:** Khách + Owner · **Ưu tiên:** Cơ bản
- **Kịch bản:** (1) `KH-1` đặt 1 đơn có SP của Farm A. (2) `OWNER-A` mở "Đơn đang đến".
- **Kết quả mong đợi:** Đơn mới xuất hiện trong ~30s (poll), **đúng SP & số lượng**. (Poll tạm dừng khi app nền — đúng thiết kế.)
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDPRO-02 — Admin xác nhận → khách thấy "Đã xác nhận" · ⚪
- **Vai trò:** Admin + Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** (1) Admin xác nhận đơn (pending → confirmed). (2) `KH-1` **mở lại** đơn của mình.
- **Kết quả mong đợi:** Trạng thái phía khách đổi sang "Đã xác nhận" (trong tab "Đang xử lý"). *Lưu ý:* cập nhật không real-time, khách phải mở lại trang đơn.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDPRO-03 — Chuyển chuỗi trạng thái tiến → lưu OK · ⚪
- **Vai trò:** Admin · **Ưu tiên:** Cơ bản
- **Kịch bản:** Admin web. (1) Chuyển đơn theo thứ tự: Đã xác nhận → Đang chuẩn bị → Đang giao → Đã giao.
- **Kết quả mong đợi:** Mỗi bước **lưu được, không lỗi**; bước cuối set `delivered_at`.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDPRO-04 — Chặn chuyển lùi trạng thái · ✅ · Fix B4
- **Vai trò:** Admin · **Ưu tiên:** Cơ bản
- **Kịch bản:** Admin web. (1) Chọn đơn "Đang giao". (2) Thử đổi **ngược** về "Chờ xác nhận".
- **Kết quả mong đợi:** Bị chặn, báo **'Không thể chuyển đơn từ "delivering" về "pending".'** (đơn không đổi).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDPRO-05 — Chặn huỷ đơn đã giao · ✅ · Fix B4
- **Vai trò:** Admin · **Ưu tiên:** Cơ bản
- **Kịch bản:** Admin web. (1) Chọn đơn "Đã giao". (2) Thử huỷ.
- **Kết quả mong đợi:** Bị chặn: **"Không thể hủy đơn hàng đã giao thành công"** (chặn ở cả admin web/API/khách).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDPRO-06 — 4 tab đơn khách phân loại đúng · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Mở trang Đơn hàng. (2) Xem 4 tab: Đang xử lý / Đang giao / Lịch sử / Đã huỷ.
- **Kết quả mong đợi:** Mỗi đơn nằm **đúng tab** theo trạng thái (6 status BE → 4 tab; không đơn nào rơi rớt).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDPRO-07 — Đơn COD ship có mã vận đơn VTP · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `KH-1`. (1) Đặt 1 đơn **COD có giao hàng (ship)**. (2) Xem chi tiết đơn.
- **Kết quả mong đợi:** Có **mã vận đơn VTP** + timeline tracking (tạo ngay tại checkout cho COD ship).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDPRO-08 — Huỷ đơn COD chưa giao: không hoàn tiền, hoàn kho · ✅ · Fix B5/B6
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Đặt 1 đơn COD (chưa giao). (2) Vào đơn, bấm Hủy, chọn lý do.
- **Kết quả mong đợi:** Báo **"Đơn hàng chưa thanh toán, không phát sinh hoàn tiền."**; đơn → "Đã huỷ"; **tồn kho được hoàn lại**.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDPRO-09 — Huỷ đơn ZaloPay đã trả: nhãn hoàn tiền đúng · 🔴 · Fix B5
- **Vai trò:** Khách · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `KH-1`. (1) Đặt + thanh toán **ZaloPay (Sandbox)** thành công. (2) Hủy đơn.
- **Kết quả mong đợi:** Modal trước-huỷ báo "hoàn về ví ZaloPay trong **5–15 phút**"; sau-huỷ nhãn theo trạng thái thật (`processing` → "5–15′"; auto-fail → "đang xử lý thủ công, liên hệ hỗ trợ" — KHÔNG còn hiện "2–7 ngày" mâu thuẫn).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDPRO-10 — Huỷ đơn MoMo/Bank đã trả: nhãn theo method · 🔴 · Fix B5
- **Vai trò:** Khách · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `KH-1`. (1) Đặt + thanh toán **MoMo hoặc Banking (Sandbox)** thành công. (2) Hủy đơn.
- **Kết quả mong đợi:** Nhãn hoàn tiền thủ công **theo method**: MoMo "~24 giờ", Bank "2–7 ngày làm việc"; trạng thái "Chờ hoàn tiền" (nhãn sau-huỷ khớp modal trước-huỷ).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDPRO-11 — "Lý do khác" < 5 ký tự → chặn · ✅ · Fix B4
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Hủy đơn, chọn "Lý do khác". (2) Bỏ trống hoặc nhập dưới 5 ký tự, xác nhận.
- **Kết quả mong đợi:** Bị chặn, yêu cầu nhập lý do **tối thiểu 5 ký tự** (chặn cả ở BE: gọi thẳng API `reason:'a'` → 422).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

---

## 6. Đặt hàng & Thanh toán (ORDER) — 16 case

### ORDER-01 — Đổi số lượng → tổng tính đúng · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Thêm vài SP vào giỏ. (2) Đổi số lượng tăng/giảm (ở list/detail).
- **Kết quả mong đợi:** Số lượng & tổng tiền tính đúng theo từng thay đổi. *(Trên trang giỏ chỉ xoá bằng swipe, không sửa qty inline.)*
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-02 — Chọn địa chỉ → hiện phí ship, cộng tổng · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Vào thanh toán. (2) Chọn địa chỉ giao (tỉnh/phường VTP).
- **Kết quả mong đợi:** **Phí vận chuyển hiện ra**, cộng vào "Tổng thanh toán" (auto-chọn dịch vụ đầu tiên). *(Offline/mock → flat 35.000đ.)*
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-03 — Đặt COD → đơn tạo, COD, "Chờ xác nhận" · 🔴
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Đặt hàng chọn **COD (Sandbox)**. (2) Hoàn tất.
- **Kết quả mong đợi:** Đơn tạo thành công, `payment_status='cod'` ("Thanh toán khi nhận"), nằm tab "Đang xử lý" (status `pending`), KHÔNG chờ PaymentDone.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-04 — Banking thành công → "Đã thanh toán" · 🔴 · Fix B1
- **Vai trò:** Khách (queue worker chạy) · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Đặt hàng chọn **Banking (Sandbox)**. (2) Thanh toán thành công trên cổng.
- **Kết quả mong đợi:** BANK **chờ `PaymentDone`** như MoMo (KHÔNG báo "đặt hàng thành công" ngay khi chưa trả); webhook/job xác nhận → đơn chuyển **"Đã thanh toán"**.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-05 — MoMo thành công → "Đã thanh toán" · 🔴
- **Vai trò:** Khách (queue worker chạy) · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Đặt hàng chọn **MoMo (Sandbox)**. (2) Thanh toán thành công.
- **Kết quả mong đợi:** PaymentDone `resultCode=1` → toast "Thanh toán thành công"; webhook/job xác nhận → "Đã thanh toán". (PaymentDone không fire trong 10s → fallback "Giao dịch đang xử lý", đơn vẫn pending tới khi xác nhận.)
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-06 — Đóng cổng/không trả → không tính "đã thanh toán" · 🔴 · Fix B1
- **Vai trò:** Khách · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `KH-1`. (1) Đặt hàng online (Bank/MoMo). (2) **Đóng cổng / không trả tiền**.
- **Kết quả mong đợi:** Đơn ở trạng thái **chờ thanh toán** (`pending`), KHÔNG bị tính "đã thanh toán". Sau ~20′ job `CancelUnpaidOrder` tự huỷ + **hoàn kho** + nhả voucher. (Xem Phase 8 `zalo_production_test_plan.md` cho các nhánh race.)
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-07 — Giỏ rỗng → không cho đặt · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Để giỏ trống (hoặc toàn SP hết hàng). (2) Thử bấm đặt.
- **Kết quả mong đợi:** Không cho đặt / nút "Thanh toán" mờ + cảnh báo "Không có sản phẩm khả dụng để thanh toán".
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-08 — Double-tap đặt → chỉ 1 đơn · 🔴 · Fix B17
- **Vai trò:** Khách · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `KH-1`. (1) Ở bước đặt hàng, bấm nút đặt **2 lần thật nhanh**.
- **Kết quả mong đợi:** Chỉ tạo **1 đơn**, không nhân đôi (FE `inFlightRef` + BE idempotency + database lock TOCTOU).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-09 — Áp SALE10 (giảm 10%, trần 50k) · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Thêm vài SP. (2) Áp dụng **SALE10** (giảm 10%).
- **Kết quả mong đợi:** Giảm 10% **không vượt trần 50.000đ**; tổng cập nhật đúng.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-10 — GIAM20K dưới mức tối thiểu → chặn · ⚪ · Fix B9 (seed)
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Để tổng giỏ **DƯỚI 100.000đ**. (2) Áp dụng mã **GIAM20K**.
- **Kết quả mong đợi:** Bị chặn, báo **"Đơn tối thiểu 100.000đ..."**. *(Cần seed `VoucherSeeder`.)*
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-11 — FREESHIP đơn giao → phí ship về 0 · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Chọn giao hàng (có phí ship). (2) Áp dụng **FREESHIP**.
- **Kết quả mong đợi:** Phí vận chuyển **về 0**; tổng giảm đúng phần phí ship.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-12 — FREESHIP đơn pickup → chặn · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `KH-1`. (1) Chọn **NHẬN TẠI TRẠM** (không phí ship). (2) Áp dụng **FREESHIP**.
- **Kết quả mong đợi:** Bị chặn, báo **"Mã chỉ áp dụng cho đơn giao hàng"**.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-13 — Mã sai → "không tồn tại" · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Nhập mã sai 'ABC123'. (2) Bấm Áp dụng.
- **Kết quả mong đợi:** Báo **"Mã giảm giá không tồn tại"**.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-14 — Nhận tại trạm: list trạm + khoảng cách, không phí · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Chọn "Nhận tại trạm". (2) Xem danh sách trạm.
- **Kết quả mong đợi:** Hiện danh sách trạm **kèm khoảng cách** (khi có toạ độ + cấp quyền vị trí); **không phát sinh phí** vận chuyển.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-15 — Pickup + COD → không tạo đơn VTP · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-1`. (1) Chọn nhận tại trạm + COD. (2) Đặt hàng.
- **Kết quả mong đợi:** Đơn tạo thành công dạng "nhận tại trạm" (lưu snapshot trạm), **KHÔNG tạo đơn vận chuyển VTP**.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### ORDER-16 — Online ship thành công → tự tạo mã VTP · 🔴 · Fix B16
- **Vai trò:** Khách (queue worker chạy) · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `KH-1`. (1) Đặt đơn **GIAO HÀNG + thanh toán online** (Bank/ZaloPay/MoMo Sandbox) thành công. (2) Đợi ~1 phút, mở chi tiết đơn.
- **Kết quả mong đợi:** Đơn có **mã vận đơn ViettelPost** (tạo tự động qua listener `CreateVtpOrderOnPayment` sau khi payment success).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

---

## 7. Giới thiệu/CTV (AFF) — 5 case

### AFF-01 — Đăng ký CTV → nhận mã giới thiệu · ⚪
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-2` (chưa là CTV). (1) Vào Cá nhân → Cộng tác viên. (2) Bấm Đăng ký.
- **Kết quả mong đợi:** Nhận **Mã giới thiệu**; trạng thái "Đã duyệt" (auto-approve on) hoặc "Chờ duyệt". *(Cần `affiliate_enabled='1'`.)*
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### AFF-02 — Mở link giới thiệu trên máy mới → ghi nhận referrer · 🔴 (BẮT BUỘC thiết bị thật) · Fix B19
- **Vai trò:** Khách · **Ưu tiên:** Nâng cao
- **Kịch bản chi tiết (theo aff.md):** Device A có CTV `approved`, biết share link; Device B **chưa từng mở** app (hoặc xoá data).
  1. **Lấy share link (A):** màn CTV → copy link chứa `?ref=<CODE>`; xác nhận `<CODE>` = affiliate_code của A.
  2. **Mở deep link trên B (fresh):** bấm link trong Zalo (webview `/zapps/${APP_ID}`). Xác nhận `pending_ref_code` set = `<CODE>` viết hoa (chứng minh `getRouteParams().ref` đọc được dù URL bị rewrite).
  3. **Auth trên B:** đăng nhập → có JWT → trigger `applyPendingReferral`. App không bị chặn; sau outcome `pending_ref_code` bị xoá; chỉ **1** `POST /affiliate/apply-referral` hiệu lực.
  4. **Đặt đơn trên B:** thêm SP, checkout, hoàn tất.
  5. **Kiểm ghi nhận (A):** màn "Khách giới thiệu" → B xuất hiện, `referrals_count` tăng; DB `referred_by_customer_id` của B = id A.
  6. **Idempotency:** B mở lại app / mở link CTV khác → vẫn referrer A (BE 409), không referral trùng.
  7. **Fallback browser:** local/preview mở `?ref=<CODE>` → vẫn bắt qua `window.location.search`.
- **Kết quả mong đợi:** Tài khoản mới (B) được ghi nhận do A giới thiệu.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### AFF-03 — Đơn giao thành công → CTV phát sinh hoa hồng (gồm COD) · 🔴 · Fix B2
- **Vai trò:** Khách · **Ưu tiên:** Nâng cao
- **Kịch bản:** Tiếp nối AFF-02. (1) Tài khoản được giới thiệu đặt 1 đơn và **giao thành công (delivered)**. (2) `KH-2` mở mục Cộng tác viên.
- **Kết quả mong đợi:** `KH-2` phát sinh **1 dòng hoa hồng** tương ứng đơn đó — áp dụng **mọi method gồm COD**. (Đơn online đã trả nhưng CHƯA giao → chưa có hoa hồng.)
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### AFF-04 — Xem danh sách giới thiệu + lưu tài khoản ngân hàng · ✅/🟡 · Fix B11
- **Vai trò:** Khách · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `KH-2` (đã là CTV). (1) Mở Cộng tác viên. (2) Xem danh sách đã giới thiệu + tổng hoa hồng. (3) Nhập tài khoản ngân hàng, lưu.
- **Kết quả mong đợi:** Hiển thị **đúng số khách + tổng hoa hồng**; lưu tài khoản ngân hàng thành công (toast "Đã cập nhật thông tin nhận tiền"). Gửi "" = xoá, vắng field = không đổi.
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### AFF-05 — Admin duyệt/từ chối CTV · ✅ · Fix B11
- **Vai trò:** Admin · **Ưu tiên:** Cơ bản
- **Kịch bản:** Admin web. (1) Vào danh sách Cộng tác viên. (2) Duyệt (hoặc Từ chối) 1 CTV đang chờ.
- **Kết quả mong đợi:** Trạng thái CTV đổi đúng; duyệt → "Đã duyệt" + set `affiliate_approved_at` (mã có hiệu lực cho apply-referral).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

---

## 8. Đóng gói & Hub (HUB / PACK) — 11 case

### HUB-01 — Dashboard "hôm nay" khớp đơn đã đặt · 🟡 · Fix B14/B18 (FE+BE)
- **Vai trò:** Farm Owner · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `OWNER-A`. (1) Mở "Tổng quan". (2) Đối chiếu doanh thu/đơn/SP **đã đặt** & **đã giao** hôm nay với đơn vừa tạo. (Test gần mốc 07:00 & tối khuya VN để bắt lỗi lệch 7h.)
- **Kết quả mong đợi:** 2 tab **"Đã đặt hôm nay"** (created_at, mọi status trừ cancelled) / **"Đã giao hôm nay"** (delivered_at) — card + list mỗi tab tự nhất quán; cửa sổ "hôm nay" theo giờ VN (đơn vừa đặt hiện ngay ở tab "Đã đặt").
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### HUB-02 — Payout breakdown hợp lý · ⚪
- **Vai trò:** Farm Owner · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `OWNER-A`. (1) Mở "Thu nhập"/Payout. (2) Xem breakdown.
- **Kết quả mong đợi:** Hiển thị doanh thu gộp, phí Vietponics (%), số farm thực nhận (net); số liệu hợp lý. *(Lưu ý: `commission_rate` = phần farm GIỮ LẠI, vd 0.85 = farm nhận 85%.)*
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PACK-01 — Owner xác nhận đơn → "Đã xác nhận" · ⚪
- **Vai trò:** Farm Owner (hub) · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `OWNER-A`. (1) `KH-1` đặt 1 đơn. (2) `OWNER-A` mở "Đơn đang đến", thấy phiếu "Chưa phân công". (3) Bấm "Xác nhận đơn".
- **Kết quả mong đợi:** Đơn chuyển **"Đã xác nhận"** (chỉ tiến pending→confirmed, idempotent).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PACK-02 — Phân công cho STAFF-A · ⚪
- **Vai trò:** Farm Owner · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `OWNER-A`. (1) Ở đơn vừa xác nhận, bấm "Phân công". (2) Chọn `STAFF-A`.
- **Kết quả mong đợi:** Phiếu chuyển **"Đã giao" cho STAFF-A**; hiện tên người đóng (packer phải thuộc đúng farm hub).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PACK-03 — Staff tự nhận phiếu · ⚪
- **Vai trò:** Farm Staff · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `STAFF-A`. (1) Mở đơn "Chưa phân công" khác. (2) Bấm "Nhận" (tự nhận).
- **Kết quả mong đợi:** Phiếu được gán cho chính `STAFF-A` (nếu đã có người → 422 "Đơn đã có người nhận đóng gói").
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PACK-04 — Bắt đầu đóng gói → đơn "Đang chuẩn bị" · ⚪
- **Vai trò:** Farm Staff (đã gán) · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `STAFF-A`. (1) Mở đơn. (2) Bấm "Bắt đầu đóng gói".
- **Kết quả mong đợi:** Phiếu "Đang đóng"; đơn lên **"Đang chuẩn bị"** (`packing_started_at` set).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PACK-05 — Hoàn tất đóng gói: đơn CHƯA tự sang "Đang giao" · ⚪
- **Vai trò:** Farm Staff · **Ưu tiên:** Cơ bản
- **Kịch bản:** Tiếp nối PACK-04. (1) Bấm "Xác nhận đã đóng xong".
- **Kết quả mong đợi:** Phiếu "Đã đóng"; đơn **CHƯA** tự sang "Đang giao" (vẫn `preparing`, chờ owner bàn giao).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PACK-06 — Owner bàn giao ship → "Đang giao" · ⚪
- **Vai trò:** Farm Owner · **Ưu tiên:** Cơ bản
- **Kịch bản:** Dùng `OWNER-A`. (1) Mở đơn đã đóng xong. (2) Bấm "Bàn giao ship".
- **Kết quả mong đợi:** Đơn chuyển **"Đang giao"** (chặn nếu còn phiếu chưa "packed" → 422).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PACK-07 — Chi tiết đơn: che SĐT/địa chỉ, pickup hiện tên trạm · 🟡 · Fix B15 (FE)
- **Vai trò:** Farm Staff · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `STAFF-A`. (1) Mở **chi tiết** 1 đơn cần đóng (`/farm/orders/:id`). (2) Xem thông tin người nhận.
- **Kết quả mong đợi:** SĐT + địa chỉ KH **bị che** (vd "0937***739"); đơn nhận-tại-trạm hiện **tên trạm** thay địa chỉ (che làm server-side).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PACK-08 — Farm không-hub bị chặn xử lý đơn · ⚪
- **Vai trò:** Farm Owner (không hub) · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `OWNER-B` (farm KHÔNG phải hub). (1) Thử xác nhận/phân công/đóng 1 đơn.
- **Kết quả mong đợi:** Bị chặn **403 "Chỉ bộ phận đóng gói Vietponics được xử lý đơn"** (FE ẩn nút, BE chặn cứng).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

### PACK-09 — Staff thao tác phiếu của người khác bị chặn · ⚪
- **Vai trò:** Farm Staff · **Ưu tiên:** Nâng cao
- **Kịch bản:** Dùng `STAFF-A`. (1) Mở 1 phiếu đã gán cho người khác. (2) Thử "Bắt đầu đóng"/"Xác nhận đóng".
- **Kết quả mong đợi:** Bị chặn **"Bạn không được phân công đơn này"** (owner thì thao tác được mọi phiếu).
- [ ] Pass [ ] Fail — Ghi chú: ____________________

---

## 9. Chuyển PRODUCTION (cutover checklist)

> Đối chiếu `../vietponic_market_zalo_backend/zalo_production_test_plan.md` (Phase 8–9 là plan thanh toán chuẩn — KHÔNG lặp lại 54 case ở đây, chỉ trỏ).
> **Thứ tự bắt buộc:** chạy lại toàn bộ Phase 8 (auto-cancel + VTP timing) trên sandbox PASS → mới làm cutover Phase 9.

### 9.1. Thay đổi code/cấu hình bắt buộc

- [ ] **FE channels** — `thuy-canh-viet-vietponics/src/hooks.ts:652-653`: `COD_SANDBOX → COD`, `BANK_SANDBOX → BANK`. Cập nhật comment liên quan ở `:1027`.
- [ ] **Backend secrets** — `.env`: `ZALO_CHECK_OUT_SECRET` + `ZALO_APP_SECRET` → giá trị **production**. Sau khi đổi, verify MAC vẫn đúng: chạy lại `composer test:zalo` (test MAC) hoặc `bash test_api.sh`.
- [ ] **FE deploy config** — `.env` (FE): `APP_ID` + `ZMP_TOKEN` production; `app-config.json.template.apiUrl = https://vietponics.vn/api` (KHÔNG hardcode trong fetch).
- [ ] **Queue worker** — `php artisan queue:work` chạy thường trực (xử lý `CheckPaymentStatus` ~20′, `CancelUnpaidOrder`, `CheckRefundStatus`).
- [ ] **Cron** — `crontab -l` có `* * * * * php artisan schedule:run`; verify `orders:auto-cancel-stale` fire (tail log).
- [ ] **Webhook** — `POST /api/notify` có **public URL** Zalo gọi được (production domain).

### 9.2. Caveat đã biết

- [ ] **ZaloPay refund** (probe 2026-05-22): endpoint `transaction/refund` trả `200 + []` (không có `returnCode`) → `ZaloPayRefundClient::requestRefund()` luôn fallback `pending_manual`. Theo dõi & xử action item ở `docs/production_queue_setup.md`. Xác nhận lại trên môi trường production trước khi mở ZaloPay.

### 9.3. Regression cuối (Phase 9 — sau khi tất cả phase trước PASS)

- [ ] #50 Đổi channel `COD`/`BANK` → test lại toàn luồng với phương thức thật.
- [ ] #51 Đổi key production → kiểm MAC vẫn đúng.
- [ ] #52 Verify cron `orders:auto-cancel-stale` đang chạy mỗi 5′.
- [ ] #53 Test trên **thiết bị thật qua QR**: chọn SP → thanh toán → xem đơn.
- [ ] #54 Theo dõi `storage/logs/laravel.log` 24h đầu (Notify SDK, CheckPaymentStatus, channel `viettelpost`).

---

> **Tổng:** 66 use case (AUTH 5 · ROLE 6 · PROD 5 · STOCK 7 · ORDPRO 11 · ORDER 16 · AFF 5 · HUB/PACK 11) + cutover production.
> Cập nhật trạng thái fix: `INDEX.md` / `FIX-PLAN.md`. Kịch bản gốc & đối chiếu code: các file nhóm `docs/use-cases/*.md`.
