# Danh mục Use Case — Vietponics Zalo Mini App

Tổng: 66 case. Trạng thái kiểm thử lấy từ CSV ngày 2026-06-10.

## Xác thực (5 case) — `docs/use-cases/auth.md`
- **AUTH-01** — 🟢 Đã sửa (B10) — Khách — Cơ bản — ✅ audit
- **AUTH-02** — 🟢 Đạt — Khách — Cơ bản — ✅ audit
- **AUTH-03** — 🟢 Đạt (thống nhất placeholder — B10) — Khách — Cơ bản — ✅ audit
- **AUTH-04** — 🟢 Đạt (test idempotent — B10) — Khách — Cơ bản — ✅ audit
- **AUTH-05** — ⚪ Chưa kiểm tra — Khách — Nâng cao — ✅ audit

## Phân quyền (6 case) — `docs/use-cases/role.md`
- **ROLE-01** — 🟢 Đã sửa (B8 — thay silent-redirect bằng màn "Khu vực dành cho đối tác farm" + nút đăng ký) — Khách — Cơ bản — ✅ audit
- **ROLE-02** — 🟢 Đã sửa (B8 — phân biệt `requested` → màn "Đang chờ duyệt"; authenticate trả `farm_partner_status`) — Khách — Cơ bản — ✅ audit
- **ROLE-03** — ⚪ Chưa kiểm tra — Farm Owner — Cơ bản — ✅ audit
- **ROLE-04** — 🟢 Đã sửa (B7) — Farm Staff — Cơ bản — ✅ audit
- **ROLE-05** — 🟢 Đã sửa (B8 — 1 message "tạm dừng" thống nhất cho is_active=false + suspended, code FARM_SUSPENDED) — Farm Owner — Nâng cao — ✅ audit
- **ROLE-06** — ⚪ Chưa kiểm tra — Farm Owner — Nâng cao — ✅ audit

## Sản phẩm (5 case) — `docs/use-cases/prod.md`
- **PROD-01** — 🟢 Đã sửa (B3 — lockForUpdate id race-safe + required danh mục/đơn vị/ảnh + flash VN) — Admin — Cơ bản — ✅ fixed
- **PROD-02** — 🟢 Đã sửa (B3 — `lang/vi/validation.php` + attributes → "tên sản phẩm là bắt buộc") — Admin — Cơ bản — ✅ fixed
- **PROD-03** — 🟢 Đã sửa (B3 — message ảnh tiếng Việt + try/catch processImage không-500) — Admin — Cơ bản — ✅ fixed
- **PROD-04** — ✅ B13 — 🟢 Đã ghi chú (giữ nguyên logic: visibility = tồn>0; đủ ĐK = tạo→gắn farm→nhập lô active) — Admin — Cơ bản — ✅ audit
- **PROD-05** — ✅ B13 — 🟢 Đã sửa FE (list/search/home/category dùng allProductsState + badge "Hết hàng", nút disabled) — Khách — Cơ bản — ✅ audit

## Quản lý kho (7 case) — `docs/use-cases/stock.md`
- **STOCK-01** — ⚪ Chưa kiểm tra — Farm Owner — Cơ bản — ✅ audit
- **STOCK-02** — ✅ Đã sửa FE (B12) — Farm Owner — Cơ bản — date picker hạn dùng + tab "Lô hàng"
- **STOCK-03** — ⚪ Chưa kiểm tra — Khách — Cơ bản — ✅ audit
- **STOCK-04** — ✅ B13 — 🟢 Đã sửa FE (cap số lượng client theo stockAvailable + "Còn lại X"; giữ BE 422; hiện nguyên văn message BE) — Khách — Cơ bản — ✅ audit
- **STOCK-05** — ⚪ Chưa kiểm tra — Khách — Nâng cao — ✅ audit
- **STOCK-06** — ✅ B6 — 🟢 Đạt + đã bổ sung test hoàn kho — Khách — Nâng cao — ✅ audit
- **STOCK-07** — ⚪ Chưa kiểm tra — Farm Owner — Nâng cao — ✅ audit

## Xử lý đơn (11 case) — `docs/use-cases/ordpro.md`
- **ORDPRO-01** — ⚪ Chưa kiểm tra — Khách — Cơ bản — ✅ audit
- **ORDPRO-02** — ⚪ Chưa kiểm tra — Admin — Cơ bản — ✅ audit
- **ORDPRO-03** — ⚪ Chưa kiểm tra — Admin — Cơ bản — ✅ audit
- **ORDPRO-04** — 🟢 Đã sửa (B4 — test guard chặn lùi 422 + message: admin web `AdminWebOrderUpdateGuardTest` + API `UpdateOrderStatusTest`) — Admin — Cơ bản — ✅ fixed
- **ORDPRO-05** — 🟢 Đã sửa (B4 — test chặn huỷ đơn delivered 422 + message: admin web/API/khách) — Admin — Cơ bản — ✅ fixed
- **ORDPRO-06** — ⚪ Chưa kiểm tra — Khách — Cơ bản — ✅ audit
- **ORDPRO-07** — 🟢 Đạt (phủ test tốt) — Khách — Nâng cao — ✅ audit
- **ORDPRO-08** — ✅ B6 (kho/refund_status) + ✅ B5 (assert COD không gọi refund API) — 🟢 Đạt — Khách — Cơ bản — ✅ audit
- **ORDPRO-09** — ✅ B5 — 🟢 nhãn ZaloPay phản ánh refund_status thật + test nhánh ZALOPAY/job — Khách — Nâng cao — ✅ audit
- **ORDPRO-10** — ✅ B5 — 🟢 nhãn pending_manual theo payment_method (MoMo ~24h / Bank 2–7 ngày) + test MOMO/BANK — Khách — Nâng cao — ✅ audit
- **ORDPRO-11** — 🟢 Đã sửa (B4 — thêm rule BE `required_if:reason_code,other|min:5` + test `CustomerCancelGuardTest`) — Khách — Cơ bản — ✅ fixed

## Đặt hàng & TT (16 case) — `docs/use-cases/order.md`
- **ORDER-01** — 🟢 Đạt — Khách — Cơ bản — ✅ audit
- **ORDER-02** — 🟢 Đạt (phủ test tốt) — Khách — Cơ bản — ✅ audit
- **ORDER-03** — 🟢 Đạt (lệch wording "Chờ xác nhận") — Khách — Cơ bản — ✅ audit
- **ORDER-04** — 🟢 Đạt (B1 — tách BANK khỏi offline flow, chờ PaymentDone) — Khách — Cơ bản — ✅ fixed
- **ORDER-05** — 🟢 Đạt (thiếu test MoMo) — Khách — Cơ bản — ✅ audit
- **ORDER-06** — 🟢 Đã sửa (B1 — auto-cancel + hoàn kho, chặn default-success, race guard) — Khách — Nâng cao — ✅ fixed
- **ORDER-07** — 🟢 Đạt — Khách — Cơ bản — ✅ audit
- **ORDER-08** — 🟡 Thiếu test idempotency (phát hiện khi audit) — Khách — Nâng cao — ✅ audit
- **ORDER-09** — 🟢 Đạt (phủ test tốt) — Khách — Cơ bản — ✅ audit
- **ORDER-10** — 🟢 Đạt (B9 — đã seed `GIAM20K` qua `VoucherSeeder` + test `VoucherSeederTest`) — Khách — Cơ bản — ✅ fixed
- **ORDER-11** — 🟢 Đạt (phủ test tốt) — Khách — Cơ bản — ✅ audit
- **ORDER-12** — 🟢 Đạt (phủ test tốt) — Khách — Nâng cao — ✅ audit
- **ORDER-13** — 🟢 Đạt (phủ test tốt) — Khách — Cơ bản — ✅ audit
- **ORDER-14** — 🟢 Đạt (thiếu test) — Khách — Cơ bản — ✅ audit
- **ORDER-15** — 🟢 Đạt (phủ test tốt) — Khách — Cơ bản — ✅ audit
- **ORDER-16** — 🟡 Thiếu test nhánh listener on-payment (phát hiện khi audit) — Khách — Nâng cao — ✅ audit

## Giới thiệu/CTV (5 case) — `docs/use-cases/aff.md`
- **AFF-01** — 🟢 Đạt (phủ test tốt) — Khách — Cơ bản — ✅ audit
- **AFF-02** — 🟡 Rủi ro Zalo giữ query ?ref= + thiếu test FE (phát hiện khi audit) — Khách — Nâng cao — ✅ audit
- **AFF-03** — 🟢 Đã sửa (B2 — hoa hồng theo đơn GIAO THÀNH CÔNG/delivered, áp dụng cả COD, qua event OrderDelivered) — Khách — Nâng cao — ✅ fixed
- **AFF-04** — 🟡 Thiếu test referrals/updateBank + updateBank "" ghi đè (phát hiện khi audit) — Khách — Cơ bản — ✅ audit
- **AFF-05** — 🟢 Đạt (thiếu test admin-web) — Admin — Cơ bản — ✅ audit

## Đóng gói & Hub (11 case) — `docs/use-cases/pack-hub.md`
- **HUB-01** — 🟢 Đã sửa (B14): tách 2 chỉ số "Đã đặt hôm nay" / "Đã giao hôm nay", mỗi chỉ số tự nhất quán basis card+list — Farm Owner — Cơ bản — ✅ fixed
- **HUB-02** — 🟢 Đạt (phủ test tốt) — Farm Owner — Nâng cao — ✅ audit
- **PACK-01** — 🟢 Đạt — Farm Owner — Cơ bản — ✅ audit
- **PACK-02** — 🟢 Đạt — Farm Owner — Cơ bản — ✅ audit
- **PACK-03** — 🟢 Đạt — Farm Staff — Cơ bản — ✅ audit
- **PACK-04** — 🟢 Đạt — Farm Staff — Cơ bản — ✅ audit
- **PACK-05** — 🟢 Đạt (không auto-delivering, phủ test tốt) — Farm Staff — Cơ bản — ✅ audit
- **PACK-06** — 🟢 Đạt — Farm Owner — Cơ bản — ✅ audit
- **PACK-07** — 🟡 Che SĐT/địa chỉ đạt; FE hiện "Pickup" chứ chưa hiện tên trạm + chưa wire màn chi tiết (phát hiện khi audit) — Farm Staff — Nâng cao — ✅ audit
- **PACK-08** — 🟢 Đạt — Farm Owner — Nâng cao — ✅ audit
- **PACK-09** — 🟢 Đạt — Farm Staff — Nâng cao — ✅ audit
