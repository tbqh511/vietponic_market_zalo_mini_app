# FIX-PLAN — Kế hoạch sửa theo Use Case

Tổng hợp từ mục **"Đối chiếu code"** trong `docs/use-cases/*.md` (audit ngày 2026-06-10).
Chỉ liệt kê case **CÓ sai lệch** (🔴/🟡 hoặc 🟢 nhưng có sai lệch hành vi/wording). Các case 🟢 "Đạt" thuần (chỉ thiếu test không nghiêm trọng) **không** đưa vào đây.

> Quy ước: **Mức rủi ro** = Cao / Trung bình / Thấp · **Ước lượng** = nhỏ / vừa / lớn.
> ⚖️ = quyết định nghiệp vụ/thiết kế — **đã chốt** (xem mục "Quyết định đã chốt").

---

## Quyết định đã chốt (PO — 2026-06-10)

### Nghiệp vụ lớn (đã hỏi & chốt)

1. ~~**AFF-03 — Hoa hồng CTV:** tính theo **đơn GIAO THÀNH CÔNG (gồm COD)**~~ ✅ **(B2 done)** → event `OrderDelivered` fire khi `status→delivered` (API admin / admin web / webhook VTP), dời mốc ghi `RecordAffiliateCommission` sang đó; giữ clawback.
2. **ORDER-06 — Kho đơn online chưa trả:** **Auto-cancel + hoàn kho sau timeout** — job tự huỷ đơn `pending` online & gọi `releaseReservation` sau ~15–20 phút chưa trả. **Không** đổi sang 2-phase reserve.
3. **ORDER-04 — BANK:** **Tách BANK khỏi `isOfflineFlow` NGAY** (mở SDK, chờ `PaymentDone` như MoMo) để sẵn sàng production.
4. **HUB-01 — Dashboard farm:** **Tách riêng 2 chỉ số** "đã đặt (hôm nay)" và "đã giao (hôm nay)" hiển thị song song; mỗi chỉ số tự nhất quán basis.
5. **PROD-05 — SP hết hàng:** **Hiện trong list kèm badge "Hết hàng"** (list/search/home/category đổi sang `allProductsState` + badge, nút thêm giỏ disabled). *(thay vì ẩn hoàn toàn)*
6. **ORDER-03 — Nhãn trạng thái đơn (khách):** **Thêm nhãn chữ** map 6 status BE → tiếng Việt ở `detail` + list đơn khách.
7. **ROLE-05 — Tạm dừng farm:** tạo **1 message "tạm dừng" chung** (vd "Farm của bạn đang tạm dừng, vui lòng liên hệ admin") áp cho cả `is_active=false` lẫn `farm_partner_status='suspended'`.

### Mục nhỏ — default đã áp (báo trước, override sau nếu cần)

- **ORDPRO-11:** thêm rule BE `reason: required_if:reason_code,other|min:5`.
- **ORDPRO-09/10:** nhãn hoàn tiền sau-huỷ truyền theo `payment_method` (ZaloPay 5–15′ / MoMo ~24h / Bank 2–7 ngày); giữ nguyên các mốc SLA hiện có, bỏ con số cứng dùng chung.
- **STOCK-04:** thêm cap số lượng client theo `stockAvailable` ở stepper/`QuantityInput` (vẫn giữ chốt BE 422).
- **AFF-04:** `updateBank` coi field **vắng mặt** trong request là "không đổi" (chỉ ghi khi key tồn tại); gửi `""` mới = xoá.
- **PROD-04:** **giữ nguyên** hành vi "khách thấy SP khi tồn>0 (không lọc farm)"; chỉ ghi rõ chuỗi đủ điều kiện = tạo SP → gắn farm → **nhập lô (batch active)**. Không đổi logic API.
- **ROLE-01/02:** thay silent-redirect bằng thông báo "bị chặn"; phân biệt `requested` → hiện "đang chờ duyệt" thay vì đẩy lại form đăng ký.
- **AUTH-03:** thống nhất 1 placeholder tên (**"Khách Zalo"**) ở cả FE lẫn nhánh tạo customer BE.

---

## 1) Bốn case lỗi đã ghi nhận (ưu tiên cao nhất)

| Mã case | Sai lệch chính | File liên quan | Mức rủi ro | Ước lượng |
|---|---|---|---|---|
| **AUTH-01** | Lần đầu cấp quyền xong tên/ảnh chưa hiện ngay: `useInitAuth` chạy 1 lần lúc mount; `refreshPermissions` chỉ bump key, KHÔNG re-`getUserInfo` cũng KHÔNG re-`authenticate` → tên/ảnh thật chỉ ra ở lần mở thứ 2. | FE `src/hooks.ts` (`useInitAuth`, `useRequestInformation`, `refreshPermissions`); BE `ZaloApiController::authenticate` | Trung bình | vừa |
| **PROD-02** | Báo lỗi "tên bắt buộc" ra **tiếng Anh** ("The name field is required.") do thiếu `lang/vi/validation.php` (locale `vi` fallback `en`); HTML `required` chặn bằng tooltip browser. | BE thiếu `resources/lang/vi/validation.php`; `ZaloProductController@store`; `create.blade.php` | Thấp | nhỏ |
| **ORDER-10** | Code đúng (message + chặn ở validate/checkout) nhưng repo **KHÔNG có seeder voucher** → `GIAM20K`/`SALE10`/`FREESHIP` không tồn tại → manual test fail vì DATA, không phải code. | BE thiếu seeder trong `database/seeders`; `Voucher::isUsable` | Trung bình | nhỏ |
| **ORDER-06** ✅ | ~~Đơn online bỏ dở **GIỮ kho**; **BANK gộp luồng offline**; `resultCode` mặc định = 1 (success) khi thiếu field~~ → **Đã sửa (B1):** job `CancelUnpaidOrder` tự huỷ + hoàn kho sau ~20′; tách BANK; chặn default-success + race guard. | BE `ZaloApiController` (`checkout`, `notifySDK`), `Jobs/CancelUnpaidOrder` (mới), `Jobs/CheckPaymentStatus`; FE `hooks.ts` `useCheckout` | **Cao** | lớn |

---

## 2) Nhóm ROLE — phân quyền (rủi ro bảo mật)

| Mã case | Sai lệch chính | File liên quan | Mức rủi ro | Ước lượng |
|---|---|---|---|---|
| **ROLE-04** ✅ | ~~🔴 Staff VẪN thấy tab "Thu nhập" và VẪN gọi được `/farm/payouts` + `/farm/payouts/{id}`~~ → **Đã sửa (B7)**: BE gate `ensureOwner()` (403 nếu staff) + FE ẩn tab/màn chặn khi `!is_owner`. | FE `components/footer.tsx` (`FARM_NAV`), `pages/farm/payouts.tsx`; BE `FarmHubController::payouts/payoutDetail` | **Cao** | vừa |
| **ROLE-01** | Khách cố mở `/farm*` bị **âm thầm redirect** `/farm/register` thay vì thông báo "bị chặn". | FE `components/layout.tsx:48-54` | Thấp | nhỏ |
| **ROLE-02** | KH-REQ (đã đăng ký, **chờ duyệt**) bị đẩy lại form `/farm/register`; FE không phân biệt trạng thái `requested` để hiện "đang chờ duyệt" (BE message đúng). | FE `components/layout.tsx`; BE `Customer::isFarmPartner` | Thấp | nhỏ–vừa |
| **ROLE-05** ✅ | 2 đường tạm dừng cho **2 message khác nhau**: farm `is_active=false` (đúng kỳ vọng) vs `farm_partner_status='suspended'` ("không có quyền…") → UI không nhất quán. **→ Chốt: 1 message "tạm dừng" chung cho cả 2 đường.** | BE `EnsureFarmPartner.php`, `Customer::isFarmPartner` | Thấp | nhỏ |

---

## 3) Nhóm ORDER / ORDPRO — luồng tiền

| Mã case | Sai lệch chính | File liên quan | Mức rủi ro | Ước lượng |
|---|---|---|---|---|
| **ORDER-04** ✅ | ~~`BANK_SANDBOX` ∈ `isOfflineFlow` → hiện "Đặt hàng thành công" ngay~~ → **Đã sửa (B1):** `isOfflineFlow` chỉ còn `startsWith("COD")`; BANK chờ `PaymentDone` như MoMo (production-ready). | FE `hooks.ts` `useCheckout` (`isOfflineFlow`) | **Cao** | vừa |
| **ORDER-08** | Thiếu test idempotency 2×`/checkout`; **TOCTOU**: `Cache::put` chỉ chạy SAU khi tạo đơn → 2 request đồng thời lý thuyết vẫn lọt 2 đơn (FE `inFlightRef` chặn double-tap thực tế). | BE `ZaloApiController:175-206,448`; FE `useCheckout` | Trung bình | nhỏ |
| **ORDER-16** | Thiếu test nhánh **listener** `CreateVtpOrderOnPayment` (đơn online shipping tạo VTP qua event); test hiện chỉ phủ COD-inline. | BE `Listeners/CreateVtpOrderOnPayment` | Thấp | nhỏ |
| **ORDER-03** ✅ | Không có **nhãn chữ "Chờ xác nhận"** phía khách (chuỗi chỉ ở `farm/orders.tsx`); `detail.tsx` không render label trạng thái đơn dạng chữ cho khách. **→ Chốt: thêm nhãn trạng thái đơn (map 6 status → tiếng Việt).** | FE `pages/orders/detail.tsx`, `order-summary.tsx` | Thấp | nhỏ–vừa |
| **ORDPRO-04** | Guard chặn lùi status **có code** nhưng **thiếu test** 422 "Không thể chuyển đơn từ …". | BE `ZaloOrderController@update`, `ZaloApiController@updateStatus` | Thấp | nhỏ |
| **ORDPRO-05** | Guard chặn huỷ đơn `delivered` **có code** nhưng **thiếu test** 422 "Không thể hủy đơn hàng đã giao thành công" (admin/API/khách). | BE `ZaloOrderController@update`, `ZaloApiController@updateStatus`, `cancelByCustomer` | Thấp | nhỏ |
| **ORDPRO-08** | Thiếu test khẳng định `refund_status='not_required'` **và** hoàn kho sau huỷ khách (COD). Code đúng, không assertion. | BE `cancelByCustomer`, `RefundService`, `StockService::releaseReservation` | Trung bình | nhỏ–vừa |
| **ORDPRO-09** | Message "5–15 phút" là chuỗi **tĩnh ở modal**, không phản ánh kết quả thật; nếu refund API fail → `pending_manual` nhưng label hiện "2–7 ngày" (mâu thuẫn). Thiếu test nhánh ZALOPAY. | FE `cancel-modal.tsx`, `detail.tsx`; BE `RefundService:46-77`, `CheckRefundStatus` | Trung bình | vừa |
| **ORDPRO-10** | Nhãn sau-huỷ **luôn "(2–7 ngày)"** cho cả MoMo lẫn Bank → mâu thuẫn modal MoMo "~24 giờ". Thiếu test MOMO/BANK. | FE `detail.tsx` (`REFUND_STATUS_LABEL`); BE `RefundService:79-88` | Trung bình | nhỏ |
| **ORDPRO-11** | Ràng buộc lý do ≥5 ký tự **chỉ ở FE**; gọi thẳng API vẫn huỷ với `reason:'a'` (BE chỉ `nullable|max:500`, không có `min:5`). | BE `cancelByCustomer:620-623` | Thấp | nhỏ |

---

## 4) Còn lại (xếp theo rủi ro giảm dần)

| Mã case | Sai lệch chính | File liên quan | Mức rủi ro | Ước lượng |
|---|---|---|---|---|
| ~~**AFF-03**~~ ✅ B2 | ~~🔴 **Lệch nghiệp vụ:** hoa hồng chỉ sinh khi **thanh toán ONLINE thành công** — đơn **COD KHÔNG BAO GIỜ** sinh hoa hồng~~ → **Đã sửa (B2):** dời mốc ghi commission sang event `OrderDelivered` (fire tại API/admin-web/VTP-webhook khi `status→delivered`), áp dụng mọi method gồm COD; giữ clawback. | BE `Events/OrderDelivered`, `Listeners/RecordAffiliateCommission`, `EventServiceProvider`, `ZaloApiController::updateStatus`, `Admin/ZaloOrderController::update`, `VtpWebhookService` | **Cao** | ✅ |
| **AFF-02** | Rủi ro Zalo **strip query `?ref=`** khi mở từ share link → không bắt được mã giới thiệu (phải verify thiết bị thật). Thiếu test FE capture/apply. | FE `src/app.ts:30-34`, `utils/affiliate.ts` | Trung bình | vừa |
| **HUB-01** ✅ | Dashboard "hôm nay" tính theo đơn **ĐÃ GIAO** (`delivered_at`), không gồm đơn vừa đặt; card "Đã bán" (delivered) vs list "Sản phẩm hôm nay" (`delivering,delivered` + `created_at`) **khác basis** → 2 con số lệch. **→ Chốt: tách riêng 2 chỉ số "đã đặt" / "đã giao".** | BE `FarmDashboardService` (`itemsBaseQuery`), `FarmHubController@overview/productsToday` | Trung bình | vừa |
| **STOCK-06** | Code hoàn kho đúng nhưng test **cố tình bỏ** assert hoàn kho (`ViettelPostWebhookTest:204-206`) → không test nào khẳng định `quantity_sold/remaining` hoàn đúng + `depleted→active` sau cancel. | BE `StockService::releaseReservation`; tests | Trung bình | nhỏ–vừa |
| **STOCK-02** | FE **không có date picker** hạn sử dụng ở mọi màn nhập (BE đã nhận `expire_date`); không màn nào hiển thị `expire_date` của lô đã lưu (list/movements là SKU-aggregate). | FE `pages/farm/stock-in.tsx`, `import-sheet.tsx` (BE `importBatch` đã hỗ trợ) | Trung bình | vừa |
| **PROD-01** | ID gán thủ công `max(id)+1` (`$incrementing=false`) → **race condition** 2 admin tạo đồng thời trùng id; flash `'Product created'` tiếng Anh; field danh mục/đơn vị/ảnh **không** `required`. | BE `ZaloProductController@store` | Trung bình | vừa |
| **PACK-07** | FE list pickup hiện chuỗi cứng " · Pickup" **chưa hiện tên trạm**; `show()` có `station_name` nhưng **chưa wire route** `/farm/orders/:id`. (Che SĐT/địa chỉ ĐẠT.) | FE `pages/farm/orders.tsx`; BE `FarmPackingController@show` | Trung bình | vừa |
| **STOCK-04** | FE **không chặn sớm** số lượng theo tồn (chỉ chặn ở checkout 422); FE **viết lại** message thay vì nguyên văn BE. | FE `pages/catalog/product-detail.tsx`, `hooks.ts` `useCheckout` | Thấp | nhỏ–vừa |
| **PROD-03** | Message ảnh sai định dạng/>2MB ra **tiếng Anh**; nhánh `processImage` ném `\Exception` thô → rủi ro **500** (không guard hiển thị). Thiếu test upload. | BE `ZaloProductController@store/@processImage`; `lang/vi` | Thấp | nhỏ |
| **PROD-04** ✅ | "Gắn farm" **một mình KHÔNG đủ** để khách thấy SP: API `/products` không lọc farm, SP hiện khi tồn>0; SP đã gắn farm nhưng chưa nhập kho → `stock_available=0` → bị ẩn. **→ Chốt: giữ nguyên (visibility = tồn>0), chỉ ghi rõ điều kiện.** | BE `ZaloApiController@products`; `FarmController@attachProduct` | Thấp | nhỏ |
| **PROD-05** ✅ | SP hết hàng bị **ẩn hoàn toàn** khỏi list/search/home/category (`productsState` filter), không hiện badge "Hết hàng" — chỉ thấy nhãn khi vào thẳng product-detail. **→ Chốt: hiện trong list kèm badge "Hết hàng".** | FE `src/state.ts` `productsState`; `pages/catalog` | Thấp | vừa |
| **AFF-04** | `updateBank` gửi `""` **vẫn ghi đè thành ""** (không phân biệt "không đổi" vs "xoá"). Thiếu test `referrals`/`bank`/`me` (shape, mask, phân trang). | BE `AffiliateController@updateBank:129-150`, `@referrals`; FE `bank-info-form.tsx` | Thấp | nhỏ |
| **AFF-05** | Toàn bộ admin-web `AffiliatePartnerController` (approve/reject, payout FIFO, toggle settings) **KHÔNG có test**. Code khớp kỳ vọng. | BE `Admin/AffiliatePartnerController` | Thấp | vừa |
| **AUTH-03** | Placeholder lệch: FE mặc định **"Khách Zalo"** vs BE **"Zalo User"** → có thể nháy đổi tên. (Không lỗi đỏ.) | FE `src/state.ts` `userInfoState`; BE `authenticate` | Thấp | nhỏ |

---

## Nhóm batch — sửa chung 1 chỗ code

Gộp các case động vào cùng file/lớp để sửa + viết test 1 lần (thứ tự đề xuất theo độ ưu tiên & phụ thuộc).

| # | Batch (chỗ code chung) | Case gộp | Ghi chú |
|---|---|---|---|
| **B1** ✅ | **Vòng đời thanh toán & giữ kho** — `ZaloApiController` (`checkout`/`notifySDK`) + `Jobs/CancelUnpaidOrder` (mới) + `Jobs/CheckPaymentStatus` + FE `useCheckout` (`isOfflineFlow`) | **ORDER-06** ✅, **ORDER-04** ✅ | **Done:** job mới `CancelUnpaidOrder` tự huỷ + `releaseReservation` đơn online `pending` sau ~20′ (`ZALO_UNPAID_TIMEOUT_MINUTES`), best-effort poll Zalo trước khi huỷ; dispatch từ `checkout` (phủ cả khi đóng cổng trước `/link`); `notifySDK` chặn default-success (thiếu/sai `resultCode` → KHÔNG paid) + race guard `status='cancelled'`; `CheckPaymentStatus` thêm guard cancelled; FE tách BANK khỏi `isOfflineFlow`. Test: khôi phục toàn bộ suite `Zalo` (`composer test:zalo` 34 xanh) + `CancelUnpaidOrderTest`. |
| **B2** ✅ | **Sự kiện hoa hồng** — `Events/OrderDelivered` (mới) + `Listeners/RecordAffiliateCommission` + `EventServiceProvider` + 3 điểm fire (`ZaloApiController::updateStatus`, `Admin/ZaloOrderController::update`, `VtpWebhookService`) | **AFF-03** ✅ | **Done:** hoa hồng theo **đơn giao thành công (gồm COD)** — tạo event `OrderDelivered`, fire tại MỌI điểm `status→delivered` (API admin / admin web / webhook VTP 501); GỠ `RecordAffiliateCommission` khỏi `OrderPaymentSucceeded` (giữ DeductStock/CreateVtp/SendNotification ở mốc paid), gắn vào `OrderDelivered`; idempotent `firstOrCreate`; giữ clawback. Test: `CommissionOnDeliveryTest` (6) + sửa `CommissionCreditedOnPaymentTest`/`AffiliateCommissionCalculationTest`; `composer test:affiliate` 33 xanh. |
| **B3** | **i18n validation tiếng Việt** — `resources/lang/vi/validation.php` (+ `attributes`) + `ZaloProductController` | **PROD-02**, **PROD-03**, **PROD-01** (flash + race-id) | 1 file lang sửa message PROD-02/03; PROD-01 thêm: bỏ `max+1` (dùng auto-increment/transaction) + Việt hoá flash. |
| **B4** | **Guard & validate trạng thái/huỷ đơn** — `ZaloOrderController@update` + `ZaloApiController@updateStatus` + `cancelByCustomer` | **ORDPRO-04**, **ORDPRO-05**, **ORDPRO-11** | Code guard đã có (04/05) → chủ yếu **viết test**; ORDPRO-11 thêm rule BE `required_if:reason_code,other|min:5`. |
| **B5** | **Refund** — `RefundService` + FE `cancel-modal.tsx`/`detail.tsx` (`REFUND_STATUS_LABEL`) | **ORDPRO-09**, **ORDPRO-10**, **ORDPRO-08** (phần refund) | Thống nhất nhãn theo `payment_method`; bỏ con số cứng "2–7 ngày" cho mọi method; test nhánh ZALOPAY/MOMO/BANK. |
| **B6** | **Hoàn kho khi huỷ** — `StockService::releaseReservation` + tests | **STOCK-06**, **ORDPRO-08** (phần kho) | Khôi phục assertion hoàn kho đã bị bỏ; test admin-cancel & customer-cancel → tồn về đúng + `depleted→active`. |
| **B7** ✅ | **Phân quyền payout farm** — `FarmHubController::payouts/payoutDetail` + FE `footer.tsx`/`payouts.tsx` | **ROLE-04** | **Done:** helper `ensureOwner()` đầu `payouts()`+`payoutDetail()` → 403 `'Bạn không có quyền xem mục này'` nếu `!isFarmOwner()`; FE ẩn tab "Thu nhập" + màn chặn khi `!is_owner` (gate cả fetch). Test: +4 case (owner 200, staff list/detail/farm-khác 403) trong `FarmHubTest` (29/29 pass). |
| **B8** | **Guard/redirect farm** — `EnsureFarmPartner` + `Customer::isFarmPartner` + FE `layout.tsx` | **ROLE-01**, **ROLE-02**, **ROLE-05** | **Chốt:** 1 message "tạm dừng" chung cho cả `is_active=false` lẫn `status='suspended'`; phân biệt `requested` → hiện "đang chờ duyệt" thay vì đẩy lại form; thay silent-redirect bằng thông báo "bị chặn". |
| **B9** ✅ | **Seed dữ liệu** — `database/seeders` | **ORDER-10** | **Done:** tạo `VoucherSeeder` (`GIAM20K` fixed 20.000đ `min_order_amount=100000`, `SALE10`, `FREESHIP`) idempotent + wire `DatabaseSeeder`; test `VoucherSeederTest` (4). Settings `affiliate_*` **đã có** qua migration `2026_05_14_000004` → không seed lại. |
| **B10** | **Auth re-cấp quyền** — FE `hooks.ts` (`useInitAuth`/`refreshPermissions`) | **AUTH-01**, **AUTH-03** | Sau khi user Đồng ý: re-`getUserInfo` + re-`authenticate`; thống nhất 1 placeholder ("Khách Zalo" vs "Zalo User"). |
| **B11** | **Affiliate referrals/bank + admin-web** — `AffiliateController` + `Admin/AffiliatePartnerController` | **AFF-04**, **AFF-05** | Fix `""` ghi đè trong `updateBank`; bổ sung Feature test referrals/bank/me + admin approve/reject/payout. |
| **B12** | **FE nhập kho hạn dùng** — `pages/farm/stock-in.tsx`, `import-sheet.tsx` + màn xem lô (`view=batches`) | **STOCK-02** | Thêm date picker `expire_date` + màn hiển thị `expire_date` lô đã lưu. |
| **B13** | **Hiển thị tồn/hết hàng** — FE `state.ts` (`productsState`) + `product-detail` + `QuantityInput` | **PROD-05** ✅, **PROD-04** ✅, **STOCK-04** | **Chốt:** list/search/home/category đổi sang `allProductsState` + **badge "Hết hàng"** (nút thêm giỏ disabled); thêm **cap số lượng client** theo `stockAvailable`; PROD-04 giữ nguyên (chỉ ghi rõ điều kiện hiển thị). |
| **B14** | **Dashboard farm** — `FarmDashboardService` | **HUB-01** ✅ | **Chốt:** **tách riêng 2 chỉ số** "đã đặt (hôm nay)" / "đã giao (hôm nay)" hiển thị song song; mỗi chỉ số tự nhất quán basis. |
| **B15** | **Màn chi tiết đóng gói** — `FarmPackingController@show` + FE route `/farm/orders/:id` | **PACK-07** | Wire màn chi tiết; hiện `station_name` thay địa chỉ cho đơn pickup. |
| **B16** | **Test nhánh listener VTP** — `Listeners/CreateVtpOrderOnPayment` | **ORDER-16** | Chỉ thêm test (fire `OrderPaymentSucceeded` đơn BANK/MOMO shipping). |
| **B17** | **Test idempotency checkout** — `ZaloApiController` checkout | **ORDER-08** | Thêm test 2×`/checkout` trùng → 1 đơn + `duplicated:true`; (tuỳ chọn) lock chống TOCTOU. |

---

## Tổng quan ưu tiên

- **Cao (sửa trước):** ~~ORDER-06 + ORDER-04 (B1)~~ ✅, ~~ROLE-04 (B7)~~ ✅, ~~AFF-03 (B2)~~ ✅. → rủi ro tiền/kho/bảo mật & sẽ sai khi lên production.
- **Trung bình:** AUTH-01 (B10), ORDER-10 (B9), ORDPRO-08/09/10 (B5/B6), STOCK-06 (B6), STOCK-02 (B12), HUB-01 (B14), PROD-01 (B3), PACK-07 (B15), AFF-02, ORDER-08 (B17).
- **Thấp:** PROD-02/03 (B3), ROLE-01/02/05 (B8), ORDPRO-04/05/11 (B4), ORDER-03/16, STOCK-04 + PROD-04/05 (B13), AFF-04/05 (B11), AUTH-03 (B10).

> **Theo quy trình BẮT BUỘC (CLAUDE.md):** mọi batch phải **lập plan chi tiết + CHỜ DUYỆT** trước khi sửa, **viết test trước**, rồi sửa từng bước nhỏ. Các case gắn ✅ đã chốt hướng (xem mục **"Quyết định đã chốt"**) — sẵn sàng vào bước lập plan/viết test.
