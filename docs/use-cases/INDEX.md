# Danh mục Use Case — Vietponics Zalo Mini App

Tổng: 66 case. Trạng thái kiểm thử lấy từ CSV ngày 2026-06-10.

## Xác thực (5 case) — `docs/use-cases/auth.md`
- **AUTH-01** — 🔴 Có lỗi — Khách — Cơ bản — ✅ audit
- **AUTH-02** — 🟢 Đạt — Khách — Cơ bản — ✅ audit
- **AUTH-03** — 🟢 Đạt — Khách — Cơ bản — ✅ audit
- **AUTH-04** — 🟢 Đạt — Khách — Cơ bản — ✅ audit
- **AUTH-05** — ⚪ Chưa kiểm tra — Khách — Nâng cao — ✅ audit

## Phân quyền (6 case) — `docs/use-cases/role.md`
- **ROLE-01** — ⚪ Chưa kiểm tra — Khách — Cơ bản — ✅ audit
- **ROLE-02** — ⚪ Chưa kiểm tra — Khách — Cơ bản — ✅ audit
- **ROLE-03** — ⚪ Chưa kiểm tra — Farm Owner — Cơ bản — ✅ audit
- **ROLE-04** — 🟢 Đã sửa (B7) — Farm Staff — Cơ bản — ✅ audit
- **ROLE-05** — ⚪ Chưa kiểm tra — Farm Owner — Nâng cao — ✅ audit
- **ROLE-06** — ⚪ Chưa kiểm tra — Farm Owner — Nâng cao — ✅ audit

## Sản phẩm (5 case) — `docs/use-cases/prod.md`
- **PROD-01** — ⚪ Chưa kiểm tra — Admin — Cơ bản — ✅ audit
- **PROD-02** — 🔴 Có lỗi — Admin — Cơ bản — ✅ audit
- **PROD-03** — ⚪ Chưa kiểm tra — Admin — Cơ bản — ✅ audit
- **PROD-04** — ⚪ Chưa kiểm tra — Admin — Cơ bản — ✅ audit
- **PROD-05** — ⚪ Chưa kiểm tra — Khách — Cơ bản — ✅ audit

## Quản lý kho (7 case) — `docs/use-cases/stock.md`
- **STOCK-01** — ⚪ Chưa kiểm tra — Farm Owner — Cơ bản — ✅ audit
- **STOCK-02** — 🟡 Sai lệch (phát hiện khi audit) — Farm Owner — Cơ bản — ✅ audit
- **STOCK-03** — ⚪ Chưa kiểm tra — Khách — Cơ bản — ✅ audit
- **STOCK-04** — ⚪ Chưa kiểm tra — Khách — Cơ bản — ✅ audit
- **STOCK-05** — ⚪ Chưa kiểm tra — Khách — Nâng cao — ✅ audit
- **STOCK-06** — 🟡 Thiếu test hoàn kho (phát hiện khi audit) — Khách — Nâng cao — ✅ audit
- **STOCK-07** — ⚪ Chưa kiểm tra — Farm Owner — Nâng cao — ✅ audit

## Xử lý đơn (11 case) — `docs/use-cases/ordpro.md`
- **ORDPRO-01** — ⚪ Chưa kiểm tra — Khách — Cơ bản — ✅ audit
- **ORDPRO-02** — ⚪ Chưa kiểm tra — Admin — Cơ bản — ✅ audit
- **ORDPRO-03** — ⚪ Chưa kiểm tra — Admin — Cơ bản — ✅ audit
- **ORDPRO-04** — 🟡 Thiếu test guard (phát hiện khi audit) — Admin — Cơ bản — ✅ audit
- **ORDPRO-05** — 🟡 Thiếu test guard (phát hiện khi audit) — Admin — Cơ bản — ✅ audit
- **ORDPRO-06** — ⚪ Chưa kiểm tra — Khách — Cơ bản — ✅ audit
- **ORDPRO-07** — 🟢 Đạt (phủ test tốt) — Khách — Nâng cao — ✅ audit
- **ORDPRO-08** — 🟡 Thiếu test hoàn kho/refund (phát hiện khi audit) — Khách — Cơ bản — ✅ audit
- **ORDPRO-09** — 🟡 Lệch thông điệp + thiếu test (phát hiện khi audit) — Khách — Nâng cao — ✅ audit
- **ORDPRO-10** — 🟡 Lệch nhãn thời gian + thiếu test (phát hiện khi audit) — Khách — Nâng cao — ✅ audit
- **ORDPRO-11** — 🟡 Validate chỉ ở FE (phát hiện khi audit) — Khách — Cơ bản — ✅ audit

## Đặt hàng & TT (16 case) — `docs/use-cases/order.md`
- **ORDER-01** — 🟢 Đạt — Khách — Cơ bản — ✅ audit
- **ORDER-02** — 🟢 Đạt (phủ test tốt) — Khách — Cơ bản — ✅ audit
- **ORDER-03** — 🟢 Đạt (lệch wording "Chờ xác nhận") — Khách — Cơ bản — ✅ audit
- **ORDER-04** — 🟡 BANK gộp luồng offline + thiếu test (phát hiện khi audit) — Khách — Cơ bản — ✅ audit
- **ORDER-05** — 🟢 Đạt (thiếu test MoMo) — Khách — Cơ bản — ✅ audit
- **ORDER-06** — 🔴 Có lỗi — kho bị giữ khi bỏ dở + thiếu test (xác nhận khi audit) — Khách — Nâng cao — ✅ audit
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
- **AFF-03** — 🔴 Lệch nghiệp vụ: hoa hồng theo thanh toán online, đơn COD không sinh hoa hồng (phát hiện khi audit) — Khách — Nâng cao — ✅ audit
- **AFF-04** — 🟡 Thiếu test referrals/updateBank + updateBank "" ghi đè (phát hiện khi audit) — Khách — Cơ bản — ✅ audit
- **AFF-05** — 🟢 Đạt (thiếu test admin-web) — Admin — Cơ bản — ✅ audit

## Đóng gói & Hub (11 case) — `docs/use-cases/pack-hub.md`
- **HUB-01** — 🟡 Dashboard tính theo đơn ĐÃ GIAO, không phải đơn vừa đặt + 2 nguồn số khác basis (phát hiện khi audit) — Farm Owner — Cơ bản — ✅ audit
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
