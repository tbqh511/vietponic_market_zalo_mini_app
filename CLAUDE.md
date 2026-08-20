# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

This repo is the **frontend** Zalo Mini App. The matching Laravel backend lives in a sibling repo at `../vietponic_market_zalo_backend` (also configured as an additional working directory). When tracing the checkout / order / auth flow you almost always need to read both sides.

The actual mini-app source is one level down in [thuy-canh-viet-vietponics/](thuy-canh-viet-vietponics/) — `cd` into it before running any npm/zmp command. The top-level `app-config.json` and `package-lock.json` here are scaffolding artifacts and are not used by the build.

## Common commands

Frontend (`cd thuy-canh-viet-vietponics`):
- `npm install` — install deps
- `zmp start` — dev server on `localhost:3000` (uses [zmp-cli](https://mini.zalo.me/docs/dev-tools/cli/intro/), `vite` underneath)
- `zmp login && zmp deploy` — deploy to Zalo using `APP_ID` / `ZMP_TOKEN` from `.env`
- `npm run build:css` — one-shot Tailwind compile (normally not needed; vite handles it)
- There is no frontend test runner or linter configured — typecheck with `npx tsc --noEmit`.

Backend (`cd ../vietponic_market_zalo_backend`):
- `composer install`
- `php artisan serve` — local dev (defaults to MySQL via `.env`)
- `composer test` — run full PHPUnit suite (uses `.env.testing`, sqlite `:memory:`)
- `composer test:unit` / `composer test:feature` — single suite
- Focused suites defined in [phpunit.xml](../vietponic_market_zalo_backend/phpunit.xml) — prefer these over the full suite, which can OOM at PHP's default memory limit:
  - `composer test:zalo` — Zalo checkout flow (MAC, prepare-order, notify webhook, payment-status job, idempotency, auto-cancel, order list/status)
  - `composer test:farm` — Farm Hub (`tests/Feature/FarmHubTest.php`)
  - `composer test:affiliate` / `composer test:shipping` / `composer test:notify` — CTV commissions, VTP shipping estimate, OA notifications
  - `--testsuite=VtpOrder` — VTP order creation + webhook (no composer alias: `php artisan test --env=testing --testsuite=VtpOrder`)
- `composer test:coverage` — full suite with coverage, fails under 80%
- Run a single test file: `php artisan test --env=testing tests/Feature/PrepareOrderTest.php`
- `bash test_api.sh` — black-box smoke against `https://vietponics.vn/api` (fill in JWT/secrets first)

## Architecture

### Frontend (React + TypeScript, Vite, zmp-ui, Jotai)

- Entry: [src/app.ts](thuy-canh-viet-vietponics/src/app.ts) merges `app-config.json` into `window.APP_CONFIG` (so `template.apiUrl` etc. can be overridden at runtime by the Zalo platform), then mounts [src/router.tsx](thuy-canh-viet-vietponics/src/router.tsx).
- Router uses `createBrowserRouter` with `basename = getBasePath()` from [src/utils/zma.ts](thuy-canh-viet-vietponics/src/utils/zma.ts). In production / Zalo previews the basename becomes `/zapps/${window.APP_ID}`; locally it's empty. Never hardcode `/` paths into fetch URLs — go through `request()`.
- Path alias `@/*` → `src/*` (configured in both [vite.config.mts](thuy-canh-viet-vietponics/vite.config.mts) and [tsconfig.json](thuy-canh-viet-vietponics/tsconfig.json)).
- Global state is Jotai (despite `zmp-cli.json` saying recoil — ignore that file, it's stale scaffolding metadata). Atoms live in [src/state.ts](thuy-canh-viet-vietponics/src/state.ts). Cross-cutting business logic (cart, checkout, customer support, route handle) lives in hooks in [src/hooks.ts](thuy-canh-viet-vietponics/src/hooks.ts), not in pages.
- [src/utils/request.ts](thuy-canh-viet-vietponics/src/utils/request.ts) is the single fetch wrapper:
  - Reads `apiUrl` via `getConfig(c => c.template.apiUrl)` (i.e. from `window.APP_CONFIG`, which was merged from `app-config.json`).
  - **Mock fallback**: if `apiUrl` is empty/null it serves `src/mock/*.json` via Vite's `import.meta.glob` — this is how the template runs offline. To work against the real backend, `apiUrl` must be set in `app-config.json` (currently `https://vietponics.vn/api`).
  - 15s `AbortController` timeout, JSON content-type guard, and `requestWithFallback` for non-critical reads (banners, categories, products, stations) so a backend outage degrades to empty lists rather than a crashing page.
  - Enable verbose logging at runtime with `localStorage.DEBUG_API = '1'`.
- API responses are not strictly typed — backend wraps payloads inconsistently (`res`, `res.data`, `res.payload`, `res.payload.data`, or domain-keyed `res.banners`/`res.products`/etc.). [`extractArray<T>`](thuy-canh-viet-vietponics/src/state.ts) in `state.ts` normalizes all of these. **When you add a new list endpoint, route it through `extractArray`**, otherwise unexpected shapes will silently render as empty.
- Products from the API may have `categoryId` under any of `categoryId | category_id | catId | cat_id | category` and ids as strings; `productsState` coerces these. Mirror that pattern when adding new fields.

### Order / checkout flow (the load-bearing path)

The end-to-end Zalo Pay flow is implemented in [`useCheckout`](thuy-canh-viet-vietponics/src/hooks.ts) and the matching backend handlers in [ZaloApiController.php](../vietponic_market_zalo_backend/app/Http/Controllers/ZaloApiController.php). Sequence:

1. **Auth** — `POST /authenticate { access_token }` → backend exchanges the Zalo access token (validates against `ZALO_VERIFY_URL`), upserts a `Customer`, returns a JWT. Frontend caches it in `localStorage.jwt_token`. `isJwtExpired()` in `hooks.ts` re-auths ~60s before expiry. On any 401 from a protected endpoint, the JWT is dropped and re-fetched once.
2. **Create order** — `POST /checkout` (alias: `/orders`, `/create-order`) with `{ customer_id, items, delivery, total, note, created_at }`. Returns `{ orderId }`. Persists to `zalo_orders`, `zalo_order_items`, `zalo_deliveries`.
3. **Prepare MAC** — `POST /prepare-order { amount, desc, item, extradata, method }`. Backend computes HMAC-SHA256 over the sorted-and-joined params using `ZALO_CHECK_OUT_SECRET` (see `calculateMac()` in the controller). The exact algorithm — `ksort → join → HMAC-SHA256` — is the contract Zalo verifies, do not change without coordinated test updates.
4. **Zalo SDK** — `createOrder({ desc, item, amount, extradata, method, mac })` from `zmp-sdk/apis` opens the Zalo Pay UI and returns a `checkoutSdkOrderId`.
5. **Link** — `POST /link { orderId, checkoutSdkOrderId, miniAppId }` writes `checkout_sdk_order_id` and dispatches the `CheckPaymentStatus` job (delayed ~20min) which polls Zalo for final status.
6. **Webhook** — Zalo calls `POST /notify` (public, MAC-verified with `ZALO_APP_SECRET`). Updates `payment_status` and `payment_method`. `events.once(EventName.PaymentDone, ...)` on the frontend resolves the in-app result via `CheckoutSDK.checkTransaction`.

Sandbox channels currently used: `COD_SANDBOX`, `BANK_SANDBOX` (in `useCheckout`'s `Payment.selectPaymentMethod`). For production, swap to `COD` / `BANK` and update `ZALO_CHECK_OUT_SECRET` / `ZALO_APP_SECRET` to production values. See [zalo_production_test_plan.md](../vietponic_market_zalo_backend/zalo_production_test_plan.md) for the full pre-production checklist.

Post-payment work is event-driven, not inline in the controller. `OrderPaymentSucceeded` fans out to listeners in [app/Listeners/](../vietponic_market_zalo_backend/app/Listeners/): `DeductStockOnPayment`, `RecordAffiliateCommission`, `SendOrderNotification` (Zalo OA message), and `CreateVtpOrderOnPayment` — the last one skips COD, non-`shipping` deliveries, and orders the farm delivers itself (`delivery_method === 'internal'`). `OrderDelivered` and `ReleaseStockOnCancellation` cover the other ends. **When adding post-payment side effects, add a listener rather than extending `notify()`/`link()`** — those run for both the webhook and the polling job, so inline work double-fires.

Scheduled cleanup ([app/Console/Kernel.php](../vietponic_market_zalo_backend/app/Console/Kernel.php)): `orders:auto-cancel-stale` runs every 5 min and cancels non-COD orders left `pending` with `payment_status` `failed`, or `pending` for over 30 min — releasing stock, voucher, and the VTP booking. So an unpaid online order does not linger; tests that create a pending order and assert on it later must account for this.

### Order status mapping

Backend stores six statuses (`pending | confirmed | preparing | delivering | delivered | cancelled` — `BackendOrderStatus` in [src/types.d.ts](thuy-canh-viet-vietponics/src/types.d.ts)). The frontend collapses these into five customer-facing tab keys via `ORDER_STATUS_MAP` in [src/state.ts](thuy-canh-viet-vietponics/src/state.ts):

| Tab (`OrderStatus`) | Backend statuses |
|---|---|
| `confirming` | `pending` |
| `packing` | `confirmed`, `preparing` |
| `shipping` | `delivering` |
| `review` | `delivered` |
| `cancelled` | `cancelled` |

When changing status logic, update **both** the controller's allowed-status list and `ORDER_STATUS_MAP`, otherwise orders disappear from tabs. Note this is a *different* axis from the packing-assignment status (`unassigned | assigned | packing | packed` on `OrderFarmAssignment`) — an order carries both, and the farm portal shows them as two separate pills (`statusPill` / `assignmentPill` in [pages/farm/orders/_shared.tsx](thuy-canh-viet-vietponics/src/pages/farm/orders/_shared.tsx)).

### Backend (Laravel 9 / PHP 8 / JWT)

- All Mini App endpoints are in [routes/api.php](../vietponic_market_zalo_backend/routes/api.php). Four groupings:
  - **Public**: `categories`, `products`, `banners`, `stations`, `authenticate`, `infouser`, `get-location`, plus three webhooks that are signature-verified rather than JWT-protected — `notify` (Zalo Pay, MAC), `viettelpost/webhook` (shipment status), `oa/webhook` (Zalo OA). Also `locations/provinces|districts|wards` (VTP address lookup).
  - **Customer JWT** (`zalo.jwt` → [ZaloJwtMiddleware](../vietponic_market_zalo_backend/app/Http/Middleware/ZaloJwtMiddleware.php), reads `customer_id` claim, checks `Customer.isActive`): `prepare-order`, `orders` (GET/POST), `orders/{id}`, `checkout` / `create-order`, `orders/{id}/cancel`, `link`, `shipping/estimate` (throttled 60/min), `vouchers/available`, `vouchers/validate`, `cart` (GET/POST/DELETE), `customer/address` (GET/PUT), `farm/request-partnership`, and all `affiliate/*` routes.
  - **Farm Partner** (`zalo.farm` — see the Farm Partner Hub section): inventory + stock-in via [FarmStockController](../vietponic_market_zalo_backend/app/Http/Controllers/Farm/FarmStockController.php); dashboard/analytics/payouts/staff via [FarmHubController](../vietponic_market_zalo_backend/app/Http/Controllers/Farm/FarmHubController.php); order packing actions via `FarmPackingController`; internal delivery via `FarmShipperController`. Note the `farm/hub/*` sub-prefix exists purely so the frontend can separate read-only dashboard endpoints from the inventory write endpoints — several of them alias the same controller methods as the unprefixed routes.
  - **Admin** (`zalo.admin` middleware, header `X-Admin-Secret: $ADMIN_API_SECRET`): `PATCH orders/{id}/status`, `orders/{id}/refund/confirm-manual`, and `admin/inventory/*` routes via [StockApiController](../vietponic_market_zalo_backend/app/Http/Controllers/Admin/StockApiController.php).
- The legacy real-estate (BDS) parts of this Laravel app share the same codebase — admin web routes (`zalo-categories`, `zalo-products`, `zalo-orders`, `zalo-stations`, `zalo-order-items`) live in [routes/web.php](../vietponic_market_zalo_backend/routes/web.php) under `auth + checklogin + language` middleware. The `Customer` model is shared with the older BDS app, which is why customer columns were progressively made nullable (see migrations dated 2026_05_08_*). Don't add NOT NULL columns to `customers` without checking BDS usage first.
- Background jobs: `CheckPaymentStatus` (dispatched from `link()`, ~20min delay), `CheckRefundStatus`, `CancelUnpaidOrder`, `SendZaloNotification`. Queue connection is `database` (set `QUEUE_CONNECTION=sync` in `.env.testing` so jobs run inline during tests).
- Services in [app/Services/](../vietponic_market_zalo_backend/app/Services/): `StockService` (check/reserve/release), `PackingService` (packing state machine), `VoucherService`, `RefundService` + `ZaloPayRefundClient`, `FarmDashboardService`, `StationPickerService`, `ZaloOaClient` (OA messaging), and the VTP trio — `ViettelPostService` (rate estimate; caches token 20h, provinces 30d, districts 7d), `VtpOrderService` (create/cancel shipment), `VtpWebhookService` (status ingest). VTP credentials live in `config/viettelpost.php`.
- Scheduled commands ([app/Console/Kernel.php](../vietponic_market_zalo_backend/app/Console/Kernel.php)): `orders:auto-cancel-stale` (5 min), `vtp:retry-cancel` (30 min), `farms:snapshot-daily` (23:30 — powers farm analytics history), `vtp:sync-locations`, `vtp:refresh-token` (weekly). A missing cron is the usual explanation for stale analytics or orphaned VTP bookings.
- Tests use sqlite `:memory:` and the env vars in [phpunit.xml](../vietponic_market_zalo_backend/phpunit.xml) — note that `ZALO_CHECK_OUT_SECRET`, `ZALO_APP_SECRET`, `ADMIN_API_SECRET`, `JWT_SECRET` are overridden there with test values. If a Zalo test fails with MAC mismatch, check that the test isn't accidentally reading the real `.env`.

### Additional feature areas

- **Affiliate/CTV** — [src/pages/profile/affiliate/](thuy-canh-viet-vietponics/src/pages/profile/affiliate/) + [AffiliateController.php](../vietponic_market_zalo_backend/app/Http/Controllers/AffiliateController.php). Referral codes are applied via `applyPendingReferral()` in [src/utils/affiliate.ts](thuy-canh-viet-vietponics/src/utils/affiliate.ts) after auth. Commission events fire via `OrderPaymentSucceeded` → `RecordAffiliateCommission` listener.
- **Farm partner portal** — see the dedicated section below; it is now the largest feature area, not just inventory.
- **Vouchers** — `useAvailableVouchers()` / `useValidateVoucher()` in hooks.ts against `vouchers/available` and `vouchers/validate`, backed by `VoucherService`. The applied voucher is part of cart state and is released when an order is auto-cancelled.
- **Server-side cart & address** — `useCartSync()` in hooks.ts mirrors cart + applied voucher to `GET/POST /cart` so the cart survives a device change. It is **best-effort and deliberately silent**: restore happens once per session (on mount if a JWT exists, else after first auth), saves are debounced 1.5s, and every failure is swallowed rather than surfaced — never make checkout block on it. Default shipping address syncs through `customer/address`.
- **Shipping fee estimate** — [src/hooks/useShippingFee.ts](thuy-canh-viet-vietponics/src/hooks/useShippingFee.ts) (note: separate file, not inside hooks.ts). Calls `POST /shipping/estimate` with VTP address IDs; auto-selects the first returned service. Falls back to a static flat fee when `apiUrl` is empty (offline/mock mode).
- **VTP address lookup** — Provinces/districts/wards are served from `GET /locations/provinces|districts|wards`. Data is synced from VTP via `php artisan vtp:sync-locations` (run after credential changes or if the dropdowns look stale).

### Farm Partner Hub (roles + packing workflow)

The farm portal ([src/pages/farm/](thuy-canh-viet-vietponics/src/pages/farm/), routes `/farm/*`) is a second app inside the mini app: dashboard, analytics, inventory/stock-in, payouts, and an order packing→shipping workflow. Understanding it requires three layers.

**1. Access gate.** `zalo.farm` → [EnsureFarmPartner](../vietponic_market_zalo_backend/app/Http/Middleware/EnsureFarmPartner.php) requires `customers.role = 'farm_partner'` AND `farm_partner_status = 'approved'` AND an active `Farm` the customer belongs to. It deliberately **re-reads the customer from the DB on every request instead of trusting the `is_farm_partner` JWT claim** — the JWT lives ~30 min, during which an admin can suspend or reassign a partner. Don't "optimize" this into a claim check. On success it attaches `zalo_customer_id`, `zalo_customer`, and `farm` to the request, so controllers should read `$request->attributes->get('farm')` rather than re-querying. Frontend counterpart is `useFarmGuard()`, which distinguishes `requested` (pending-approval screen) from non-partner (registration CTA at `/farm/register`, which posts to `farm/request-partnership` — that route sits outside the `zalo.farm` group precisely because the caller isn't a partner yet).

**2. Roles.** `customers.farm_role` is one of `owner | admin | packer | shipper`, with helpers on [Customer](../vietponic_market_zalo_backend/app/Models/Customer.php):

| Helper | Means |
|---|---|
| `canManageFarm()` | owner or admin — confirm order, assign packer, handoff |
| `canPack()` | owner, admin, or packer — claim, start-packing, confirm-packed |
| `isFarmShipper()` | internal delivery — pickup, deliver |
| `isFarmStaff()` | any non-owner member (admin/packer/shipper) |

Only owners see payouts. A packer or shipper may act **only on assignments given to them** (`actAsAssignee` in [FarmPackingController](../vietponic_market_zalo_backend/app/Http/Controllers/Farm/FarmPackingController.php)); owner/admin act on any. Historical trap: before migration `2026_05_19_100000`, `$customer->farm` implied ownership; now staff have it too, so **check `isFarmOwner()`, never the mere presence of `farm`**.

**3. Packing hub.** Packing is centralized: `farms.is_packing_hub` marks the farm that physically packs orders, resolved via `Farm::primaryPackingHub()`. Ordinary farms get read-only visibility of incoming orders; write actions from a non-hub farm return 403 (`requirePackingHub`). The assignment record is `OrderFarmAssignment` with status `unassigned → assigned → packing → packed`, driven by [PackingService](../vietponic_market_zalo_backend/app/Services/PackingService.php), which throws `DomainException` (surfaced as a Vietnamese message) on invalid transitions — e.g. reassigning or unassigning an already-`packed` slip. After `packed`, an owner/admin hands off either to VTP (`handoff-ship`) or to an internal shipper (`handoff-internal`, which sets `delivery_method = 'internal'` and so suppresses `CreateVtpOrderOnPayment`). Every transition writes an `OrderPackingLog`.

### Farm API layer (`src/utils/farm-api.ts`)

Farm portal routes do **not** go through `request.ts`/`requestWithFallback` — they use a dedicated `farmRequest`/`farmPost` wrapper in [src/utils/farm-api.ts](thuy-canh-viet-vietponics/src/utils/farm-api.ts) that:
- Injects JWT from `localStorage.getItem("jwt_token")` directly (does not re-auth on 401 — that's already done by `useEnsureJwt()` before entering farm pages).
- Unwraps the farm response envelope `{ error: boolean, data: T, message? }` and throws on `error: true`.
- Exposes a `usePolling<T>(path, enabled, pollMs)` internal hook used by all farm dashboard hooks. Poll interval is 30s for real-time data (overview, productsToday, incoming orders), 60s for payouts, and 0 (fetch-once) for static data (profile, staff list). The poller skips ticks when `document.visibilityState === "hidden"` — Zalo Mini Apps keep webviews alive in the background, so this prevents wasted background fetches.

When adding new farm dashboard data: use `usePolling` from `farm-api.ts`, not `useState + useEffect` manually.

### Zalo SDK graceful fallback (`src/utils/zalo-prompts.ts`)

Any Zalo SDK call that can be denied by the user or unsupported outside Zalo runtime (`createShortcut`, `followOA`) must go through [src/utils/zalo-prompts.ts](thuy-canh-viet-vietponics/src/utils/zalo-prompts.ts). It:
- Guards with `isZaloRuntime()` — checks `window.ZJSBridge`; skips silently in browser/desktop.
- Maps SDK error code `-201` to `{ ok: false, cancelled: true }` (user dismissed the prompt).
- Returns `{ ok: false, unsupported: true }` when not in Zalo runtime, so callers can branch without try/catch.

## Notes on existing docs

- [thuy-canh-viet-vietponics/README.md](thuy-canh-viet-vietponics/README.md) is the upstream ZaUI Market template README, kept as-is. Its "Load data from your server" recipe is generic and superseded by the `request.ts` / `extractArray` notes above — prefer this file when they conflict.

## Conventions

- All frontend user-facing strings are Vietnamese — keep that when adding UI.
- Money is stored as `string` over the wire (`price`, `total`, `quantity`) and parsed into numbers in `convertApiOrderToOrder` / `convertApiOrderItemToCartItem`. New API contracts should follow the same string-on-wire pattern to avoid float precision drift.
- Protected API calls (JWT routes) must include `Authorization: Bearer <token>` from `localStorage.getItem("jwt_token")`. Use `useEnsureJwt()` to obtain/refresh the token before making protected calls.
- Tailwind theme tokens come from CSS variables in `src/css/tailwind.scss` — change colors there, not in component classes.
- `app-config.json.template.apiUrl` is the single source of truth for the API host. Don't hardcode `https://vietponics.vn/api` in fetches; read it via `getConfig`.

### localStorage key split

`src/config.ts` exports `CONFIG.STORAGE_KEYS` for all non-JWT data (`USER_INFO`, `DELIVERY`, `SHIPPING_ADDRESS`, `ZALO_SDK_PROFILE`, etc.) — always use these constants, not bare strings. The JWT token is the **only** exception: it is stored and read under the hardcoded key `"jwt_token"` throughout `hooks.ts` and `farm-api.ts` — it intentionally does not appear in `STORAGE_KEYS` (the key `TOKEN = "token"` in config is a stale artifact, not used for auth).

## Quy trình làm việc (BẮT BUỘC theo thứ tự)

Đặc tả use case nằm trong [docs/use-cases/](docs/use-cases/) — 66 case chia theo nhóm (`auth`, `role`, `prod`, `stock`, `ordpro`, `order`, `pack-hub`, `aff`), mã dạng `ORDER-06`. [INDEX.md](docs/use-cases/INDEX.md) là bảng trạng thái tổng, [FIX-PLAN.md](docs/use-cases/FIX-PLAN.md) ghi lịch sử batch sửa, [MANUAL-TEST.md](docs/use-cases/MANUAL-TEST.md) là checklist test tay.

Khi kiểm tra/refactor theo một use case (vd ORDER-06):
1. **Đọc** case đó trong file nhóm tương ứng
2. **Scan** code liên quan cả backend lẫn Mini App (controller, service, model, route, page/component)
3. **Điền** mục "Đối chiếu code" ngay trong file use case: file liên quan, sai lệch, test coverage
4. **Lập plan** sửa/refactor và CHỜ DUYỆT — không tự ý sửa
5. **Viết test trước** (PHPUnit, `tests/Feature` hoặc `tests/Unit`) mô phỏng đúng kết quả mong đợi của use case; thêm file vào testsuite phù hợp trong `phpunit.xml` để chạy nhanh
6. **Sửa code** từng bước nhỏ, chạy test sau mỗi bước
7. **Cập nhật** trạng thái case trong file use case và INDEX.md