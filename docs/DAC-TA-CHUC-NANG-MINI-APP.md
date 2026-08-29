# Đặc tả chức năng — Zalo Mini App Vietponics

| Hạng mục | Nội dung |
|---|---|
| Sản phẩm | Zalo Mini App "Thuỷ canh Việt Vietponics" (`zaui-market`) |
| Phạm vi | Toàn bộ chức năng Mini App + các API backend mà Mini App gọi |
| Ngày lập | 2026-08-29 |
| Nguồn đối chiếu | Frontend `thuy-canh-viet-vietponics/src`, backend `../vietponic_market_zalo_backend` (nhánh `main`) |
| Tài liệu liên quan | [use-cases/INDEX.md](use-cases/INDEX.md) (66 use case + trạng thái test), [FIX-PLAN.md](use-cases/FIX-PLAN.md), [MANUAL-TEST.md](use-cases/MANUAL-TEST.md) |

> Tài liệu này mô tả **hệ thống đang chạy trong code**, không phải mong muốn tương lai.
> Mỗi mục ghi kèm file nguồn để tra ngược. Phần lệch chuẩn phát hiện khi đối chiếu
> nằm ở [§8](#8-lệch-chuẩn--rủi-ro-phát-hiện-khi-đối-chiếu).

---

## 1. Tổng quan hệ thống

### 1.1 Mục tiêu

Mini App là kênh bán lẻ rau thuỷ canh trực tiếp trên Zalo, đồng thời là **cổng vận hành**
cho nông trại đối tác (Farm Partner) và cộng tác viên giới thiệu (CTV). Một ứng dụng
phục vụ ba nhóm người dùng với ba bề mặt tách biệt.

### 1.2 Kiến trúc & công nghệ

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Mini App | React 18 + TypeScript, Vite (`zmp-cli`), `zmp-ui`, Jotai, TailwindCSS | SPA, `createBrowserRouter`, basename `/zapps/{APP_ID}` khi chạy trên Zalo |
| Backend | Laravel 9 / PHP 8, REST JSON | Dùng chung codebase với ứng dụng BDS cũ (bảng `customers` chia sẻ) |
| Xác thực | Zalo `getAccessToken` → JWT (`tymon/jwt-auth`) | Token lưu `localStorage.jwt_token` |
| Thanh toán | Zalo Pay SDK (`zmp-sdk/apis` Payment/CheckoutSDK) + webhook MAC HMAC-SHA256 | Kênh hiện tại là SANDBOX |
| Vận chuyển | ViettelPost API v2/v3 | Ước phí, tạo vận đơn, webhook trạng thái |
| Thông báo | Zalo OA (`ZaloOaClient`) | Tin nhắn trạng thái đơn |
| Hàng đợi | Laravel queue `database` | `CheckPaymentStatus`, `CancelUnpaidOrder`, `SendZaloNotification`, `CheckRefundStatus` |

Cấu hình runtime nằm ở `app-config.json → template` (`apiUrl`, `oaIDtoOpenChat`, `logoUrl`,
`shopName`, `shopAddress`), được merge vào `window.APP_CONFIG` trong `src/app.ts` để
Zalo có thể override lúc chạy. **Không hardcode host API trong code.**

### 1.3 Vai trò người dùng

| Vai trò | Xác định bởi | Phạm vi |
|---|---|---|
| Khách mua hàng | Mọi tài khoản Zalo mở app | Duyệt, đặt, thanh toán, theo dõi đơn |
| Cộng tác viên (CTV) | `customers.affiliate_code` + `affiliate_status = approved` | Link giới thiệu, hoa hồng, thông tin nhận tiền |
| Chủ farm (owner) | `farm_role = owner` | Toàn quyền farm + xem thu nhập/đối soát |
| Quản lý farm (admin) | `farm_role = admin` | Như owner trừ mục Thu nhập |
| Nhân viên đóng gói (packer) | `farm_role = packer` | Chỉ thao tác phiếu được gán/tự nhận |
| Shipper nội bộ | `farm_role = shipper` | Chỉ đơn giao nội bộ được gán |
| Quản trị viên | Header `X-Admin-Secret` / web admin Blade | Ngoài phạm vi Mini App, có tác động tới dữ liệu đơn |

Điều kiện vào khu vực farm (`zalo.farm` → `EnsureFarmPartner`) — **cả ba phải đúng**:
`customers.role = 'farm_partner'` **và** `farm_partner_status = 'approved'` **và** thuộc một
`Farm` đang `is_active`. Middleware **đọc lại DB mỗi request**, không tin claim `is_farm_partner`
trong JWT (JWT sống ~30 phút, admin có thể khoá giữa chừng).

### 1.4 Hai không gian điều hướng

App có hai tab bar, chuyển theo `handle.space` của route (`src/components/footer.tsx`):

- **Customer space**: Trang chủ · Danh mục · Đơn hàng · Giỏ hàng
- **Farm space**: Tổng quan · Đơn đến (badge số đơn chờ) · Phân tích · Thu nhập

`appSpaceState` tự đồng bộ khi deep-link thẳng vào `/farm/*`; FAB `farm-hub-fab` /
`back-to-shop-fab` cho phép nhảy qua lại.

---

## 2. Bản đồ màn hình

| Route | Màn hình | Space | Ghi chú |
|---|---|---|---|
| `/` | Trang chủ (danh mục, banner, flash sale) | customer | có ô tìm kiếm |
| `/categories` | Danh sách danh mục | customer | |
| `/category/:id` | Sản phẩm theo danh mục | customer | |
| `/product/:id` | Chi tiết sản phẩm | customer | gallery ảnh, chọn số lượng, sản phẩm liên quan |
| `/search` | Tìm kiếm | customer | lọc client-side theo `keywordState` |
| `/cart` | Giỏ hàng | customer | giao nhận + voucher + tổng tiền + nút thanh toán |
| `/shipping-address` | Địa chỉ nhận hàng | customer | chọn tỉnh/phường VTP |
| `/stations` | Điểm nhận hàng (pickup) | customer | sắp theo khoảng cách |
| `/orders/:status?` | Danh sách đơn theo 5 tab | customer | |
| `/order/:id` | Chi tiết đơn + hành trình | customer | huỷ đơn, theo dõi VTP |
| `/profile` | Cá nhân | customer | thẻ CTV, thẻ Farm, theo dõi OA, shortcut |
| `/profile/edit` | Sửa hồ sơ | customer | |
| `/profile/affiliate` | Trang CTV | customer | mã, QR, hoa hồng, danh sách giới thiệu |
| `/farm` | Tổng quan farm | farm | |
| `/farm/orders` | Đơn đến (đóng gói) | farm | |
| `/farm/orders/:id` | Chi tiết đơn cho đóng gói | farm | |
| `/farm/analytics` | Phân tích doanh thu | farm | |
| `/farm/payouts`, `/farm/payouts/:id` | Thu nhập & đối soát | farm | chỉ owner |
| `/farm/stock-in` (alias `/farm/inventory`) | Khai báo nhập kho | farm | |
| `/farm/movements/:id` | Lịch sử biến động tồn | farm | |
| `/farm/register` | Đăng ký Farm Partner | (không thuộc farm space) | khách thường vào được |

---

## 3. Đặc tả chức năng

Ký hiệu: **Actor** — người dùng thực hiện; **API** — endpoint backend; **Nguồn** — file code.

### A. Xác thực & tài khoản

#### A1 — Đăng nhập bằng Zalo
- **Actor**: Khách.
- **Luồng**: `getAccessToken()` từ Zalo SDK → `POST /authenticate { access_token, phone_token?, name?, avatar? }` → backend gọi `graph.zalo.me/v2.0/me` xác thực, tìm/khởi tạo `Customer` theo `firebase_id` → trả `{ token, user }`. FE lưu `localStorage.jwt_token` + `customerProfileState`.
- **Quy tắc**:
  - Khách mới chưa cấp `scope.userInfo` → tên mặc định `"Khách Zalo"`, app vẫn dùng được.
  - Tên/ảnh: Zalo là nguồn sự thật, ghi đè DB mỗi lần có giá trị **thật** (placeholder không ghi đè). Số điện thoại chỉ backfill khi DB đang trống.
  - `isActive = 0` → trả 403 `ACCOUNT_DISABLED`, FE bật banner chặn toàn cục (`account-disabled-notice.tsx`).
  - Response kèm `is_farm_partner`, `farm_partner_status`, `saved_address` để FE dựng guard và khôi phục địa chỉ.
- **API**: `POST /authenticate`. **Nguồn**: `ZaloApiController::authenticate`, `src/hooks.ts::useInitAuth/useZaloAuthSync`.

#### A2 — Gia hạn phiên
- JWT sống ~30 phút. `isJwtExpired()` coi là hết hạn khi còn <60s → tự `authenticate` lại.
- Mọi endpoint bảo vệ gặp **401** → xoá token, `authenticate` lại **một lần**, retry request.
- **Nguồn**: `src/hooks.ts::useEnsureJwt`, `useCheckout`, `useCancelOrder`.

#### A3 — Hoàn thiện hồ sơ (gate)
- Hiện trên các trang có ngữ cảnh danh tính (Cá nhân / Đơn hàng / Giỏ hàng) khi thiếu **bất kỳ** trường: số điện thoại, tên thật, avatar.
- "Cho phép" → xin đúng quyền còn thiếu (`authorize`, `getPhoneNumber`, `getUserInfo`) rồi `authenticate` lại để backend backfill. "Để sau" → đóng gate, vẫn dùng app bình thường (bắt buộc có lối thoát).
- Gate không persist: vào lại trang là hiện lại nếu hồ sơ vẫn thiếu.
- **Nguồn**: `components/profile-gate.tsx`, `components/phone-required-gate.tsx`.

#### A4 — Cache hồ sơ Zalo
- Tên/ảnh từ SDK được cache ở `localStorage.zaloSdkProfile` (tách khỏi `userInfo`) để `userInfoState` không gọi lại SDK — tránh rate-limit `-1409` và nháy avatar.
- **Nguồn**: `state.ts::readZaloSdkProfile/writeZaloSdkProfile`.

#### A5 — Tài khoản bị vô hiệu hoá
- Mọi route JWT trả 403 `{ code: "ACCOUNT_DISABLED" }`. FE bắt ở `utils/account-disabled.ts` → bật cờ toàn cục, dừng luồng đang chạy (kể cả giữa `/checkout` và `/prepare-order`).

#### A6 — Đổi tài khoản trên cùng thiết bị
- `localStorage.authedCustomerId` phát hiện đổi tài khoản → reset `shippingAddressState` để không dùng nhầm địa chỉ người trước.

---

### B. Danh mục & sản phẩm

#### B1 — Trang chủ
- Ba khối: danh mục (`GET /categories`), banner (`GET /banners`), flash sale/gợi ý (lấy từ `allProductsState`).
- Tất cả dùng `requestWithFallback` — backend lỗi thì hiện danh sách rỗng, **không** vỡ trang.

#### B2 — Danh sách & chi tiết sản phẩm
- `GET /products` (không phân trang từ FE). Chuẩn hoá qua `extractArray<T>` vì backend trả nhiều shape (`res`, `res.data`, `res.products`…).
- `categoryId` chấp nhận `categoryId | category_id | catId | cat_id | category`, id có thể là string → `productsState` ép kiểu.
- Chi tiết: gallery nhiều ảnh (embla carousel), đơn vị hiển thị (`unit.unitLabel` + `systemUnit` + `conversionFactor`), nút chia sẻ, sản phẩm liên quan.

#### B3 — Hiển thị tồn kho
- `stockAvailable` do backend trả. `isOutOfStock()` → badge **"Hết hàng"**, chặn thêm vào giỏ.
- `stockAvailable === undefined` (mock/offline) → coi như còn hàng.
- Ô số lượng bị cap theo `stockAvailable` ngay trên client; backend vẫn kiểm tra lại lúc đặt (422).

#### B4 — Tìm kiếm
- Lọc trên `allProductsState` phía client theo `keywordState`; không có endpoint search riêng.

#### B5 — Chế độ mock/offline
- `apiUrl` rỗng → `request.ts` phục vụ `src/mock/*.json` qua `import.meta.glob`. Dùng để chạy template không cần backend.
- Bật log chi tiết: `localStorage.DEBUG_API = '1'`.

---

### C. Giỏ hàng & mã giảm giá

#### C1 — Thao tác giỏ
- `cartState` (Jotai) giữ `CartItem[]`. Thêm/sửa/xoá qua `useAddToCart` + `cart-item.tsx`.
- `payableCartState` lọc bỏ sản phẩm đã hết hàng; nếu rỗng → chặn thanh toán với thông báo rõ.
- Mở lại giỏ luôn refresh `allProductsState` để badge hết hàng phản ánh tồn thật.

#### C2 — Đồng bộ giỏ theo tài khoản
- `useCartSync()` mirror giỏ + voucher lên `GET/POST /cart`, xoá bằng `DELETE /cart`.
- **Best-effort và im lặng**: restore một lần mỗi phiên, save debounce 1.5s, mọi lỗi bị nuốt. **Không được** để checkout phụ thuộc vào nó.

#### C3 — Voucher khả dụng
- `GET /vouchers/available` trả kèm cờ `usable`, `unusable_reason`, và preview `subtotal/shipping/total`. Tự refetch khi subtotal hoặc phí ship đổi.

#### C4 — Áp dụng voucher
- `POST /vouchers/validate`. Ba loại:
  | Loại | Cách tính |
  |---|---|
  | `percent` | `floor(subtotal × value/100)`, cap bởi `max_discount_amount`, không vượt subtotal |
  | `fixed` | `min(value, subtotal)` |
  | `free_shipping` | `value > 0` → cap giảm phí ship theo `value`; `value = 0` → miễn toàn bộ phí ship; `max_discount_amount` là cap bổ sung |
- `free_shipping` trên đơn không có phí ship → từ chối ngay ("Mã chỉ áp dụng cho đơn giao hàng").
- FE tính lại discount (`recalculateVoucherDiscount`) mỗi khi số lượng/phí ship đổi, tránh giảm giá cũ (stale).

#### C5 — Vòng đời voucher
- `redeem()` chạy **trong cùng transaction** tạo đơn (tạo `voucher_redemptions` + `increment used_count`).
- Đơn bị huỷ (khách/admin/auto-cancel) → `VoucherService::release()` trả mã lại cho khách.

---

### D. Giao nhận & địa chỉ

#### D1 — Hai hình thức nhận hàng
- `deliveryModeState` lưu `localStorage.delivery`: `shipping` (giao tận nơi) hoặc `pickup` (tự đến lấy).

#### D2 — Địa chỉ giao hàng
- Chọn theo dữ liệu ViettelPost: `GET /locations/provinces|districts|wards`. Đơn `shipping` **bắt buộc** có `province_id` và `ward_id`.
- Đồng bộ hai chiều với server qua `GET/PUT /customer/address`; `authenticate` trả `saved_address` để khôi phục khi đổi thiết bị.
- Dữ liệu địa giới đồng bộ bằng `php artisan vtp:sync-locations` (cron hằng ngày, `--no-wards`).

#### D3 — Ước phí vận chuyển
- `POST /shipping/estimate` (throttle 60 req/phút) → VTP `getPriceAll`. Backend **tự tính trọng lượng/kích thước từ DB**, không tin payload client.
- Trạm gửi chọn bằng `StationPickerService`: ưu tiên cùng tỉnh người nhận, fallback Haversine theo toạ độ. Không có trạm cấu hình VTP → 422 `NO_PICKUP_STATION`.
- VTP trả rỗng → dùng bảng phí fallback (`fallback: true`). Chế độ mock → phí phẳng `FLAT_SHORT`.
- FE tự chọn dịch vụ đầu tiên; **chưa chọn được dịch vụ thì không cho thanh toán**.
- **Nguồn**: `ShippingController::estimate`, `src/hooks/useShippingFee.ts`.

#### D4 — Điểm nhận hàng (pickup)
- `GET /stations`, sắp theo khoảng cách tới vị trí người dùng (`POST /get-location` + `localStorage.userLocation`).
- Khi đặt đơn pickup, backend **snapshot** tên/ảnh/địa chỉ/toạ độ trạm vào `zalo_deliveries` để đơn cũ vẫn đúng nếu trạm bị xoá. Phí ship = 0.

---

### E. Thanh toán & tạo đơn

Luồng chuẩn (`useCheckout` ↔ `ZaloApiController`):

```
① kiểm tra giỏ/địa chỉ/dịch vụ ship  →  ② đảm bảo JWT
③ Payment.selectPaymentMethod (SDK)  →  ④ POST /checkout        (tạo đơn, giữ kho)
⑤ POST /prepare-order (tính MAC)     →  ⑥ createOrder (SDK Zalo Pay)
⑦ POST /link (gắn checkoutSdkOrderId + hẹn job poll)
⑧ COD → kết thúc ngay | Online → chờ event PaymentDone (tối đa 10s) → checkTransaction
⑨ Webhook POST /notify từ Zalo chốt payment_status
```

#### E1 — Chọn phương thức thanh toán
- Kênh đang bật: `COD_SANDBOX`, `BANK_SANDBOX`, `MOMO_SANDBOX`. `ZALOPAY_SANDBOX` đang tắt (chưa cấu hình MAC production).
- Whitelist backend: `COD, COD_SANDBOX, BANK, BANK_SANDBOX, ZALOPAY, ZALOPAY_SANDBOX, MOMO, MOMO_SANDBOX`. Method lạ → log cảnh báo và fallback `COD`.
- **Lên production**: đổi sang `COD`/`BANK`/`MOMO` và thay `ZALO_CHECK_OUT_SECRET`, `ZALO_APP_SECRET`.

#### E2 — Tạo đơn `POST /checkout` (alias `/orders`, `/create-order`)
Kiểm soát phía server, theo thứ tự:
1. **Chống trùng đơn (idempotency)**: khoá = `customer_id + (product_id:qty đã sort) + total + payment_method + delivery.type`, cache 90 giây. Request thứ hai nhận lại `orderId` cũ kèm `duplicated: true` (vẫn HTTP 201).
2. **Chống TOCTOU**: khoá phân tán qua `Cache::store('database')->lock(...)`, chờ tối đa 3s, re-check cache trong khoá. Timeout khoá → vẫn đi tiếp (thà hiếm khi lọt còn hơn kẹt khách).
3. **Tính lại tiền hàng từ DB**, không tin giá client. Sản phẩm không tồn tại → 422.
4. **Voucher** validate lại phía server; sai → 422 `reason: voucher_invalid` (FE tự gỡ voucher).
5. **Chống sửa tổng tiền**: lệch `|client_total − server_total| > 1.000đ` → 422.
6. **Kiểm tra tồn kho** (`StockService::checkAvailability`) → 422 kèm mảng `shortages` (FE hiện nguyên văn message + liệt kê thiếu bao nhiêu).
7. **Ghi đơn trong transaction**: `zalo_orders` + `zalo_order_items` (giá/đơn vị lấy từ DB) + `zalo_deliveries` + redeem voucher.
8. **Phân bổ tồn FEFO** (`reserveItems`) — thất bại do race → tự huỷ đơn và trả 422.
9. **COD + shipping** → tạo vận đơn VTP ngay. Online → hoãn tới khi thanh toán thành công.
10. Hẹn job `CancelUnpaidOrder` cho đơn online; xoá giỏ server-side; trả `{ orderId }` 201.

- `status = pending`; `payment_status = cod` (COD) hoặc `pending` (online); `received_at = created_at + 3 ngày`.

#### E3 — Ký MAC `POST /prepare-order`
- MAC = `HMAC-SHA256( ksort(params) → "k=v&k=v...", ZALO_CHECK_OUT_SECRET )` với params `{amount, desc, item, extradata, method}`.
- **Thuật toán này là hợp đồng với Zalo — không đổi nếu không cập nhật test đồng bộ.**
- `amount` phải là **tổng cuối** (hàng + ship − giảm giá); đổi dịch vụ ship sau khi ký thì MAC cũ vô hiệu.

#### E4 — Gắn giao dịch `POST /link`
- Ghi `checkout_sdk_order_id`; đơn online chuyển `payment_status = pending` và dispatch `CheckPaymentStatus` (delay 30s, tự lặp lại 30s → 2 phút → 10 phút). Đơn COD giữ nguyên `cod`, không poll.

#### E5 — Webhook `POST /notify` (công khai, xác thực MAC)
- Xác thực `overallMac` bằng `ZALO_CHECK_OUT_SECRET`; sai → bỏ qua.
- **Guard đơn đã huỷ**: đơn `cancelled` không được "hồi sinh" thành đã trả (ghi log để kế toán hoàn tiền thủ công nếu đã thu).
- **Idempotent**: `payment_status` đã `success`/`failed` → bỏ qua (tránh trừ kho / tạo VTP / ghi hoa hồng lần hai).
- **COD**: chỉ lưu `payment_method`, **không** đánh dấu đã trả.
- **Online**: `resultCode` bắt buộc có và là số; thiếu → giữ `pending` (không mặc định thành công). `resultCode === 1` → `success` + fire `OrderPaymentSucceeded`, ngược lại `failed`.

#### E6 — Phản hồi trên app
- COD: báo "Đặt hàng thành công" ngay, dọn giỏ, chuyển `/orders`.
- Online: chờ `EventName.PaymentDone` → `CheckoutSDK.checkTransaction` (`1` thành công, `0` đang xử lý, `-1` thất bại, `-2` chưa chọn phương thức). Không có event trong 10s → vẫn dọn giỏ + báo "Giao dịch đang xử lý" (đơn đã tồn tại ở backend).
- Sau khi xong: refresh danh sách đơn ở 2.5s và 7s; gợi ý theo dõi OA (một lần, `oaFollowPrompted`).
- Chặn double-click bằng `inFlightRef`.

---

### F. Theo dõi & xử lý đơn phía khách

#### F1 — Danh sách đơn theo tab
`GET /orders` một lần, chia tab client-side (`ORDER_STATUS_MAP`):

| Tab hiển thị | Trạng thái backend |
|---|---|
| Chờ xác nhận (`confirming`) | `pending` |
| Đang chuẩn bị (`packing`) | `confirmed`, `preparing` |
| Đang giao (`shipping`) | `delivering` |
| Đánh giá (`review`) | `delivered` |
| Đã huỷ (`cancelled`) | `cancelled` |

> Đổi logic trạng thái phải sửa **cả** danh sách hợp lệ ở controller **và** `ORDER_STATUS_MAP`, nếu không đơn sẽ biến mất khỏi tab.

#### F2 — Chi tiết đơn
- `GET /orders/{id}`: sản phẩm (kèm đơn vị snapshot), thông tin giao nhận, tiền (subtotal / ship / giảm giá / tổng), ghi chú, trạng thái hoàn tiền.
- **Hành trình đơn hàng** (`order_history`) do backend tổng hợp từ `created_at`, `OrderPackingLog`, `cancelled_at`, `refunded_at` với các mốc: `order_placed, confirmed, preparing, delivering, delivered, cancelled, refunded`.
- **Theo dõi vận đơn** (`tracking_events`): các mốc VTP kèm vị trí, nhân viên giao, cờ chuyển hoàn.

#### F3 — Khách tự huỷ đơn
- `POST /orders/{id}/cancel { reason_code, reason? }`.
- Chỉ huỷ được khi đơn ở `pending | confirmed | preparing`; `delivering`/`delivered` → 422 hướng dẫn liên hệ tổng đài. Đã huỷ rồi → idempotent 200.
- `reason_code = other` → `reason` bắt buộc ≥ 5 ký tự (đồng bộ ràng buộc FE).
- Sau khi huỷ, backend chạy tuần tự (mỗi bước bọc try/catch, không chặn nhau): hoàn tồn kho → trả voucher → xử lý hoàn tiền → thu hồi hoa hồng CTV (chỉ trạng thái `pending`/`confirmed`, **không** đụng `paid`) → huỷ vận đơn VTP → gửi thông báo OA.
- Lý do huỷ được dịch sang tiếng Việt khi trả về (`wrong_item`, `changed_mind`, `duplicate`, `too_long`, `bad_price`, `other`).

#### F4 — Tự huỷ đơn chưa thanh toán
- `CancelUnpaidOrder` chạy sau `ZALO_UNPAID_TIMEOUT_MINUTES` (mặc định **20 phút**): poll Zalo trước, nếu thực sự đã trả thì đánh `success` và **không** huỷ; ngược lại huỷ + hoàn kho.
- Cron `orders:auto-cancel-stale` mỗi 5 phút quét đơn non-COD còn `pending` với `payment_status = failed`, hoặc `pending` quá 30 phút.
- Hệ quả cho test: đơn pending không tồn tại lâu — test tạo đơn rồi assert sau đó phải tính đến điều này.

#### F5 — Hoàn tiền
| `refund_status` | Ý nghĩa |
|---|---|
| `not_required` | COD hoặc chưa thu tiền |
| `pending_manual` | Chờ kế toán chuyển tay (Bank ~2–7 ngày, MoMo ~24h) |
| `processing` | Đang gọi API hoàn tiền ZaloPay |
| `refunded` | Đã hoàn |
| `failed` | Hoàn thất bại, cần xử lý tay |

- Admin xác nhận hoàn tay: `POST /orders/{id}/refund/confirm-manual` (chỉ từ `pending_manual`).

---

### G. Thông báo & tiện ích Zalo

#### G1 — Tin nhắn OA
- `SendZaloNotification` gửi qua `ZaloOaClient` ở các mốc: thanh toán thành công, đổi trạng thái, huỷ đơn. Webhook `POST /oa/webhook` ghi nhận follow/unfollow (xác thực MAC bằng `oa_secret_key`).

#### G2 — Mời theo dõi OA / tạo shortcut
- Mọi lệnh SDK có thể bị từ chối phải đi qua `utils/zalo-prompts.ts`: kiểm tra `isZaloRuntime()` (`window.ZJSBridge`), map lỗi `-201` thành `{ cancelled: true }`, ngoài Zalo trả `{ unsupported: true }` — **không** try/catch rải rác.
- Mời theo dõi OA hiện một lần sau đơn đầu tiên (`oaFollowPrompted`).

#### G3 — Liên hệ cửa hàng
- `useCustomerSupport()` mở chat OA theo `template.oaIDtoOpenChat`.

---

### H. Cộng tác viên (CTV / Affiliate)

Toàn bộ tính năng bị tắt nếu setting `affiliate_enabled ≠ 1` (API trả 404).

| Mã | Chức năng | Chi tiết |
|---|---|---|
| H1 | Đăng ký CTV | `POST /affiliate/register` → sinh `affiliate_code`; `affiliate_auto_approve = 1` thì duyệt ngay, ngược lại `pending` |
| H2 | Trang CTV | `GET /affiliate/me`: mã, link chia sẻ `https://zalo.me/s/{miniAppId}/?ref=CODE`, QR, số người giới thiệu, thống kê hoa hồng theo `pending/confirmed/paid/cancelled`, số dư = `confirmed` |
| H3 | Thông tin nhận tiền | `PATCH /affiliate/bank` (tên ngân hàng, BIN, số tài khoản, chủ tài khoản) |
| H4 | Bắt mã giới thiệu | Ưu tiên `getRouteParams()` của ZMP, fallback `?ref=`; **first-capture-wins**, chỉ áp dụng một lần mỗi phiên sau khi có JWT (`applyPendingReferral` → `POST /affiliate/apply-referral`) |
| H5 | Danh sách & lịch sử | `GET /affiliate/referrals` (tên/SĐT đã che), `GET /affiliate/commissions` (phân trang) |

**Quy tắc ghi hoa hồng** (`RecordAffiliateCommission` nghe `OrderDelivered`):
- Chỉ ghi khi đơn **đã giao thành công** — áp dụng cho **cả COD**.
- Bỏ qua nếu người mua không có người giới thiệu, tự giới thiệu chính mình, hoặc người giới thiệu chưa `approved`.
- Tỷ lệ lấy từ setting `affiliate_commission_rate` (mặc định **5%**), tính trên `order.total`, ghi `firstOrCreate` theo `order_id` (chống ghi trùng), trạng thái `confirmed`.
- Đơn bị huỷ sau đó → clawback về `cancelled` (trừ khoản đã `paid`).

---

### I. Farm Partner Hub

#### I1 — Đăng ký làm đối tác
- `POST /farm/request-partnership { name, address, description? }` (route nằm **ngoài** nhóm `zalo.farm` vì người gọi chưa được duyệt).
- Đã `approved` hoặc đang `requested` → 409 kèm thông báo tương ứng. Thành công → `farm_partner_status = requested`, hẹn duyệt 1–3 ngày làm việc.

#### I2 — Cổng kiểm soát truy cập
`useFarmGuard()` phân biệt bốn màn:
| Trạng thái | Màn hiển thị |
|---|---|
| `approved` + farm active | Vào Farm Hub |
| `requested` | "Đang chờ duyệt" |
| `suspended` hoặc farm `is_active = 0` | "Tạm dừng" (`FARM_SUSPENDED`) |
| còn lại | "Khu vực dành cho đối tác" + nút đăng ký |

#### I3 — Phân quyền trong farm
| Helper (`Customer`) | Ai thoả | Được làm |
|---|---|---|
| `canManageFarm()` | owner, admin | Xác nhận đơn, phân công, bàn giao vận chuyển |
| `canPack()` | owner, admin, packer | Tự nhận, bắt đầu đóng, xác nhận đã đóng |
| `isFarmShipper()` | shipper | Nhận hàng, xác nhận đã giao (đơn nội bộ) |
| `isFarmStaff()` | admin, packer, shipper | Thành viên không phải chủ |
- Packer/shipper **chỉ** thao tác trên phiếu/đơn được gán cho mình; owner/admin thao tác mọi phiếu.
- Chỉ **owner** xem mục Thu nhập (`ensureOwner`).
- ⚠️ Bẫy lịch sử: nhân viên cũng có `farm_id` → phải kiểm tra `isFarmOwner()`, **không** dựa vào việc "có farm".

#### I4 — Tổng quan (Dashboard)
- `GET /farm/dashboard` (= `/farm/hub/overview`). Hai bộ chỉ số tách biệt, mỗi bộ tự nhất quán với danh sách cùng tab:
  - **Đã đặt hôm nay** — theo `created_at`, mọi trạng thái trừ `cancelled`.
  - **Đã giao hôm nay** — theo `delivered_at`, trạng thái `delivered`.
- Mỗi bộ gồm: doanh thu, giá vốn, lợi nhuận, số đơn, số lượng bán, giá trị đơn trung bình; kèm sản phẩm bán chạy nhất.
- Cửa sổ "hôm nay" so **trực tiếp theo giờ VN** (cột `dateTime` naive, `app.timezone = Asia/Ho_Chi_Minh`) — **không** convert sang UTC.

#### I5 — Sản phẩm hôm nay
- `GET /farm/products/today` trả hai nhóm (`products_placed`, `products_delivered`), mỗi dòng: đã nhập, đã bán, còn lại, doanh thu, `sellthrough_pct` và `status` màu:
  `danger` ≥ 95% hoặc hết hàng · `warning` ≥ 70% hoặc còn < 5kg · `good` còn lại.
- Kèm gợi ý `hint` (`restock` hoặc `flash_sale`).

#### I6 — Phân tích
- `GET /farm/analytics?range=7d|30d|custom&bucket=day|week` → `overview` + chuỗi doanh thu theo bucket + top sản phẩm (số lượng, doanh thu, giá vốn, lợi nhuận, số đơn).
- Dữ liệu lịch sử dựa vào cron `farms:snapshot-daily` (23:30). Thiếu cron → số liệu cũ.

#### I7 — Khai báo nhập kho (Stock-In)
- `GET /farm/stock-in/suggestions`: mỗi SKU của farm kèm tồn hiện tại, trung bình bán 7 ngày (chỉ tính đơn `delivered`), gợi ý số lượng nhập, cờ **cháy hàng hôm qua**, hạn dùng gợi ý (mặc định theo `DEFAULT_SHELF_LIFE_DAYS`).
- `POST /farm/stock-in/batch { batch_date?, items[] }`: tạo nhiều lô một lần trong một transaction. Mỗi dòng thiếu `expire_date` → tự tính `batch_date + shelf_life`; thiếu `cost_price` → lấy giá vốn từ pivot `farm_product`.
- SKU không thuộc farm → 403 kèm danh sách `product_ids` vi phạm.

#### I8 — Tồn kho & lô
- `GET /farm/inventory` (có `view=batches` để xem theo lô), lọc theo từ khoá / danh mục / tình trạng tồn (`all|low|out|in_stock`), sắp xếp (`name|stock_asc|stock_desc|low_first`), kèm `stats` (tổng SKU, sắp hết, hết hàng, tổng tồn).
- `GET /farm/inventory/{id}/movements` — lịch sử biến động: `import, export, adjustment, reserved, unreserved, return, damage`.
- `POST /farm/inventory/{id}/close` — đóng/thu hồi/hết hạn lô.

#### I9 — Đóng gói tập trung (Packing Hub)
- Farm được đánh dấu `is_packing_hub` đóng gói **toàn bộ** đơn. Farm thường chỉ **xem chỉ-đọc** đơn có hàng của mình; mọi thao tác ghi từ farm không phải hub → 403 "Chỉ bộ phận đóng gói Vietponics được xử lý đơn."
- Mỗi đơn có đúng **một** phiếu `OrderFarmAssignment` thuộc hub, vòng đời:

```
unassigned ──claim/assign──▶ assigned ──start-packing──▶ packing ──confirm-packed──▶ packed
```

- Chuyển trạng thái sai (ví dụ gán lại phiếu đã `packed`) → `DomainException` → HTTP 422 kèm thông báo tiếng Việt.
- Mọi thao tác ghi `OrderPackingLog` để truy vết.
- Thông tin khách trong màn đóng gói **được che ở server**: SĐT dạng `0937***739`, địa chỉ rút gọn; đơn pickup chỉ hiện tên trạm.

| Endpoint | Quyền | Tác dụng |
|---|---|---|
| `POST /farm/orders/{id}/confirm-order` | owner/admin | `pending → confirmed` (idempotent) |
| `POST /farm/orders/{id}/claim` | canPack | Tự nhận phiếu chưa ai nhận |
| `POST /farm/orders/{id}/assign` | owner/admin | Gán/đổi packer (phải cùng hub); đang đóng dở thì giữ nguyên `packing`, chỉ đổi người |
| `POST /farm/orders/{id}/start-packing` | người được gán | `assigned → packing` |
| `POST /farm/orders/{id}/confirm-packed` | người được gán | `packing → packed` |
| `POST /farm/orders/{id}/handoff-ship` | owner/admin | `preparing → delivering`, chỉ khi phiếu đã `packed` |
| `POST /farm/orders/{id}/handoff-internal` | owner/admin | Giao nội bộ: gán shipper, `delivery_method = internal`, `→ delivering` |

- `delivery_method = internal` **triệt tiêu** listener `CreateVtpOrderOnPayment` (farm tự giao, không tạo vận đơn VTP).

#### I10 — Giao hàng nội bộ
- `GET /farm/shipments` — owner/admin xem tất cả đơn nội bộ; shipper chỉ xem đơn của mình.
- `POST /farm/shipments/{id}/pickup`: `delivering → out_for_delivery`, ghi `picked_up_at`.
- `POST /farm/shipments/{id}/deliver`: `out_for_delivery → delivered`, ghi `delivered_at`, fire `OrderDelivered` (kích hoạt ghi hoa hồng CTV).

#### I11 — Thu nhập & đối soát (chỉ owner)
- `GET /farm/payouts?status=&limit=` và `GET /farm/payouts/{id}`.
- Mỗi kỳ: khoảng thời gian, tổng kg đã bán, doanh thu gộp, `commission_rate` (**phần farm giữ lại**, ví dụ 0.85 = farm nhận 85%; phí Vietponics = `1 − rate`), điều chỉnh của admin, `net_payout` chốt sổ và `net_estimated` để FE hiển thị, trạng thái `draft|pending|paid|cancelled`, ngày dự kiến trả.
- Chi tiết liệt kê từng đơn đóng góp (kg, doanh thu gộp) để farm đối soát; kỳ `draft` phản ánh trạng thái live.

#### I12 — Hồ sơ farm
- `GET /farm/me` (= `/farm/hub/profile`): mã, tên, logo, ảnh bìa, mô tả, địa chỉ, chu kỳ thanh toán, `commission_rate`, `is_packing_hub`, và khối `viewer` (vai trò người đang đăng nhập) để bật/tắt UI theo quyền.
- `POST /farm/me/logo` — cập nhật logo.

---

## 4. Quy tắc nghiệp vụ chốt

### 4.1 Vòng đời trạng thái đơn

```
pending ─▶ confirmed ─▶ preparing ─▶ delivering ─▶ delivered
   │            │            │            │
   └────────────┴────────────┴────────────┴─────▶ cancelled
                                    (internal) delivering ─▶ out_for_delivery ─▶ delivered
```

Ràng buộc bất biến:
- **Không lùi** từ `delivering`/`delivered` về `pending|confirmed|preparing` → 422 kèm nhãn tiếng Việt.
- **Không huỷ** đơn đã `delivered` → 422 (hướng dẫn xử lý hoàn tiền thủ công).
- `delivered_at` chốt một lần: webhook VTP dùng thời điểm VTP báo; admin/shipper dùng `now()`; đã có thì không ghi đè.
- Ánh xạ trạng thái VTP → đơn:

| Mã VTP | Trạng thái |
|---|---|
| 103, 104 | `confirmed` |
| 200, 202 | `preparing` |
| 300, 400, 500, 506–509, 515, 550 | `delivering` |
| 501 | `delivered` |
| 101, 107, 201, 503, 504, 505 | `cancelled` (kèm lý do cụ thể) |
| khác | giữ nguyên, chỉ ghi log sự kiện |

Webhook VTP dedupe theo `(order_id, status_code, status_at)` và bỏ qua khi đơn đã ở trạng thái cuối.

### 4.2 Trạng thái thanh toán
| `payment_status` | Khi nào |
|---|---|
| `cod` | Đơn COD — thu tiền khi giao, **không bao giờ** chuyển `success` qua webhook |
| `pending` | Đơn online chờ webhook/poll |
| `success` | `resultCode = 1` từ `/notify` hoặc job poll → fire `OrderPaymentSucceeded` |
| `failed` | `resultCode ≠ 1` |

### 4.3 Việc sau thanh toán = listener, không phải inline
`OrderPaymentSucceeded` phân nhánh tới: `DeductStockOnPayment`, `RecordAffiliateCommission`,
`SendOrderNotification`, `CreateVtpOrderOnPayment` (bỏ qua COD, bỏ qua đơn không `shipping`,
bỏ qua `delivery_method = internal`).
`OrderDelivered` → ghi hoa hồng. `ReleaseStockOnCancellation` → hoàn kho.
**Thêm tác vụ sau thanh toán phải viết listener mới**, không sửa `notify()`/`link()` — hai hàm này
chạy cho cả webhook lẫn job poll nên code inline sẽ chạy hai lần.

### 4.4 Tồn kho
- Mô hình lô (`farm_stock_batches`), phân bổ **FEFO** (hết hạn gần nhất trước).
- Giữ hàng ngay khi tạo đơn (không có hai pha). Huỷ đơn → `releaseReservation`.
- Mọi thay đổi ghi `stock_movements` (ledger).

### 4.5 Tác vụ nền & định kỳ
| Tên | Nhịp | Việc |
|---|---|---|
| `CheckPaymentStatus` | 30s → 2′ → 10′ sau `/link` | Poll Zalo phòng webhook không tới |
| `CancelUnpaidOrder` | +20′ sau checkout | Huỷ đơn online chưa trả + hoàn kho |
| `orders:auto-cancel-stale` | 5 phút | Quét đơn treo còn sót |
| `vtp:retry-cancel` | 30 phút | Thử lại huỷ vận đơn VTP thất bại |
| `farms:snapshot-daily` | 23:30 | Chốt số liệu cho phân tích farm |
| `vtp:sync-locations` | hằng ngày | Đồng bộ tỉnh/huyện/xã |
| `vtp:refresh-token` | hằng tuần | Làm mới token VTP |

> Thiếu cron là nguyên nhân phổ biến nhất của "phân tích không cập nhật" và "vận đơn VTP mồ côi".

---

## 5. Ma trận phân quyền

| Chức năng | Khách | CTV | Packer | Shipper | Admin farm | Owner farm | Quản trị |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Duyệt/đặt/thanh toán | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Huỷ đơn của mình | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trang CTV & hoa hồng | ➖ đăng ký | ✅ | — | — | — | — | quản lý |
| Xem đơn đến (hub) | — | — | ✅ | — | ✅ | ✅ | ✅ |
| Tự nhận / đóng gói | — | — | ✅ phiếu của mình | — | ✅ | ✅ | ✅ |
| Xác nhận đơn, phân công, bàn giao | — | — | — | — | ✅ | ✅ | ✅ |
| Nhận hàng / xác nhận đã giao (nội bộ) | — | — | — | ✅ đơn của mình | ✅ | ✅ | ✅ |
| Khai báo nhập kho / tồn kho | — | — | — | — | ✅ | ✅ | ✅ |
| Thu nhập & đối soát | — | — | — | — | — | ✅ | ✅ |
| Đổi trạng thái đơn bất kỳ | — | — | — | — | — | — | ✅ (`X-Admin-Secret`) |

---

## 6. Danh mục API Mini App gọi

**Công khai**

| Method | Endpoint | Dùng cho |
|---|---|---|
| GET | `/categories`, `/products`, `/banners`, `/stations` | Danh mục & catalog |
| GET | `/locations/provinces\|districts\|wards` | Chọn địa chỉ VTP |
| POST | `/authenticate` | Đăng nhập / gia hạn |
| GET | `/infouser` | Thông tin người dùng Zalo |
| POST | `/get-location` | Định vị (sắp xếp trạm) |
| POST | `/notify` | Webhook Zalo Pay (MAC) |
| POST | `/viettelpost/webhook`, `/oa/webhook` | Webhook VTP / OA |

**JWT khách** (`Authorization: Bearer <jwt_token>`)

| Method | Endpoint | Dùng cho |
|---|---|---|
| POST | `/checkout` (alias `/orders`, `/create-order`) | Tạo đơn |
| POST | `/prepare-order`, `/link` | Ký MAC, gắn giao dịch |
| GET | `/orders`, `/orders/{id}` | Danh sách / chi tiết đơn |
| POST | `/orders/{id}/cancel` | Khách huỷ đơn |
| POST | `/shipping/estimate` | Ước phí ship (60 req/phút) |
| GET/POST | `/vouchers/available`, `/vouchers/validate` | Mã giảm giá |
| GET/POST/DELETE | `/cart` | Đồng bộ giỏ |
| GET/PUT | `/customer/address` | Địa chỉ mặc định |
| POST/GET/PATCH | `/affiliate/*` | CTV |
| POST | `/farm/request-partnership` | Xin làm đối tác |

**JWT + đối tác farm** (`zalo.farm`): `/farm/me`, `/farm/dashboard`, `/farm/analytics`,
`/farm/products/today`, `/farm/orders/incoming`, `/farm/orders/{id}` + 7 thao tác đóng gói,
`/farm/staff`, `/farm/shipments/*`, `/farm/inventory*`, `/farm/stock-in*`, `/farm/payouts*`,
và nhóm chỉ-đọc `/farm/hub/*`.

**Quản trị** (`X-Admin-Secret`): `PATCH /orders/{id}/status`,
`POST /orders/{id}/refund/confirm-manual`, `/admin/inventory/*`.

---

## 7. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
|---|---|
| Ngôn ngữ | **Toàn bộ chuỗi hiển thị bằng tiếng Việt** |
| Tiền tệ | Truyền qua mạng dạng **chuỗi** (`price`, `total`, `quantity`), parse ở `convertApiOrderToOrder` — tránh sai số dấu phẩy động. API mới phải theo quy ước này |
| Múi giờ | Lưu **giờ VN** trong cột `dateTime` naive (`app.timezone = Asia/Ho_Chi_Minh`). Query khoảng thời gian **không** convert sang UTC |
| Chịu lỗi | Đọc không trọng yếu (banner, danh mục, sản phẩm, trạm) qua `requestWithFallback` → backend chết thì hiện rỗng, không vỡ trang |
| Timeout | Mọi fetch có `AbortController` 15s + kiểm tra content-type JSON |
| Polling farm | 30s (tổng quan, sản phẩm hôm nay, đơn đến) · 60s (thu nhập) · 0 = tải một lần (hồ sơ, danh sách nhân viên). Bỏ nhịp khi `document.visibilityState === "hidden"` vì Zalo giữ webview chạy nền |
| Tầng API farm | Farm **không** dùng `request.ts` mà dùng `farmRequest`/`farmPost`/`usePolling` trong `utils/farm-api.ts` (tự gắn JWT, bóc envelope `{error, data, message}`, không tự re-auth) |
| Bảo mật | Server tính lại giá/tổng/trọng lượng; whitelist phương thức thanh toán; che SĐT/địa chỉ ở màn đóng gói; xác thực MAC mọi webhook |
| Chống trùng | Idempotency 90s ở checkout + khoá DB; guard idempotent ở `/notify`, huỷ đơn, đổi trạng thái |
| Giao diện | Token màu khai báo ở `src/css/tailwind.scss` (biến CSS), không đặt màu cứng trong class |
| Kiểm thử | Frontend: `npx tsc --noEmit` (chưa có test runner). Backend: chạy suite hẹp (`composer test:zalo`, `test:farm`, `test:affiliate`, `test:shipping`, `test:notify`) — suite đầy đủ dễ tràn bộ nhớ ở mức PHP mặc định |

---

## 8. Lệch chuẩn & rủi ro phát hiện khi đối chiếu

| # | Vấn đề | Ảnh hưởng | Vị trí |
|---|---|---|---|
| 1 | Trạng thái `out_for_delivery` (giao nội bộ) **không có** trong `BackendOrderStatus` lẫn `ORDER_STATUS_MAP` | Đơn giao nội bộ sau khi shipper "nhận hàng" **biến mất khỏi mọi tab** của khách cho tới khi được đánh `delivered` | `src/types.d.ts`, `src/state.ts:584`, `FarmShipperController.php:87` |
| 2 | Kênh thanh toán vẫn là `*_SANDBOX`, `ZALOPAY_SANDBOX` đang comment | Chưa sẵn sàng production; cần đổi mã kênh + secret production | `src/hooks.ts` (`Payment.selectPaymentMethod`) |
| 3 | `CONFIG.STORAGE_KEYS.TOKEN = "token"` không được dùng; JWT lưu ở khoá cứng `"jwt_token"` | Dễ nhầm khi refactor | `src/config.ts`, `hooks.ts`, `farm-api.ts` |
| 4 | `zmp-cli.json` khai báo state là recoil trong khi dự án dùng Jotai | Metadata scaffolding cũ, gây hiểu nhầm | `zmp-cli.json` |
| 5 | Theo `INDEX.md`: **ORDER-03** (nhãn trạng thái đơn) đã chốt nhưng chưa implement; 11 case chưa test tay | Rủi ro tồn đọng đã biết | [use-cases/INDEX.md](use-cases/INDEX.md) |

> Mục 1 nên được xác nhận và đưa vào backlog trước đợt phát hành tiếp theo.

---

## 9. Phụ lục

### 9.1 Khoá localStorage
| Khoá | Nội dung |
|---|---|
| `jwt_token` | **Ngoại lệ duy nhất** — không nằm trong `STORAGE_KEYS` |
| `userInfo` | Hồ sơ người dùng nhập |
| `zaloSdkProfile` | Tên/ảnh cache từ SDK Zalo |
| `authedCustomerId` | Phát hiện đổi tài khoản |
| `delivery`, `shippingAddress`, `userLocation` | Lựa chọn giao nhận |
| `shortcutPrompted`, `oaFollowPrompted` | Đã mời tạo shortcut / theo dõi OA |
| `DEBUG_API`, `DEBUG_ZALO_PAY` | Cờ gỡ lỗi thủ công |

### 9.2 Biến môi trường trọng yếu (backend)
`ZALO_CHECK_OUT_SECRET` (ký MAC prepare-order **và** xác thực webhook `/notify`),
`ZALO_APP_SECRET`, `JWT_SECRET`, `ADMIN_API_SECRET`, `ZALO_UNPAID_TIMEOUT_MINUTES` (mặc định 20),
cụm cấu hình `config/viettelpost.php`.

### 9.3 Mã lỗi hay gặp
| Mã | Ý nghĩa |
|---|---|
| `ACCOUNT_DISABLED` (403) | Tài khoản bị khoá |
| `FARM_SUSPENDED` | Đối tác farm bị tạm dừng |
| `NO_PICKUP_STATION` (422) | Không có trạm gửi hàng cấu hình VTP |
| `voucher_invalid` (422) | Voucher không dùng được, FE tự gỡ |
| `shortages[]` (422) | Không đủ tồn kho, kèm chi tiết từng sản phẩm |
| `duplicated: true` (201) | Đơn trùng trong 90s, trả lại `orderId` cũ |
