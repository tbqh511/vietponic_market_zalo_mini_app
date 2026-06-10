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

Backend (`cd ../vietponic_market_zalo_backend`):
- `composer install`
- `php artisan serve` — local dev (defaults to MySQL via `.env`)
- `composer test` — run full PHPUnit suite (uses `.env.testing`, sqlite `:memory:`)
- `composer test:unit` / `composer test:feature` — single suite
- `composer test:zalo` — runs only the Zalo Checkout flow tests defined in [phpunit.xml](../vietponic_market_zalo_backend/phpunit.xml) (MAC, prepare-order, notify webhook, payment-status job, order list, status update)
- `composer test:affiliate` / `composer test:shipping` — feature-specific suites (CTV commissions, VTP shipping estimate)
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

### Order status mapping

Backend stores six statuses (`pending | confirmed | preparing | delivering | delivered | cancelled` — `BackendOrderStatus` in [src/types.d.ts](thuy-canh-viet-vietponics/src/types.d.ts)). The frontend collapses these into four tab keys (`pending | shipping | completed | cancelled` — `OrderStatus`) via `ORDER_STATUS_MAP` in [src/state.ts](thuy-canh-viet-vietponics/src/state.ts). When changing status logic, update **both** the controller's allowed-status list and `ORDER_STATUS_MAP`, otherwise orders disappear from tabs.

### Backend (Laravel 9 / PHP 8 / JWT)

- All Mini App endpoints are in [routes/api.php](../vietponic_market_zalo_backend/routes/api.php). Four groupings:
  - **Public**: `categories`, `products`, `banners`, `stations`, `authenticate`, `infouser`, `get-location`, `notify` (Zalo webhook — MAC-protected, not JWT-protected). Also `locations/provinces|districts|wards` (VTP address lookup).
  - **Customer JWT** (`zalo.jwt` middleware → [ZaloJwtMiddleware](../vietponic_market_zalo_backend/app/Http/Middleware/ZaloJwtMiddleware.php), reads `customer_id` claim, checks `Customer.isActive`): `prepare-order`, `orders`, `orders/{id}`, `checkout` / `create-order` / `orders` (POST), `orders/{id}/cancel`, `link`, `shipping/estimate` (rate-limited 60/min), and all `affiliate/*` routes.
  - **Farm Partner** (`zalo.farm` middleware — JWT + `is_farm_partner` flag): `farm/inventory`, `farm/inventory/{id}/movements`, `farm/inventory/{id}/import`, `farm/inventory/{id}/export`. Served by [FarmStockController](../vietponic_market_zalo_backend/app/Http/Controllers/Farm/FarmStockController.php).
  - **Admin** (`zalo.admin` middleware, header `X-Admin-Secret: $ADMIN_API_SECRET`): `PATCH orders/{id}/status`, `orders/{id}/refund/confirm-manual`, and `admin/inventory/*` routes via [StockApiController](../vietponic_market_zalo_backend/app/Http/Controllers/Admin/StockApiController.php).
- The legacy real-estate (BDS) parts of this Laravel app share the same codebase — admin web routes (`zalo-categories`, `zalo-products`, `zalo-orders`, `zalo-stations`, `zalo-order-items`) live in [routes/web.php](../vietponic_market_zalo_backend/routes/web.php) under `auth + checklogin + language` middleware. The `Customer` model is shared with the older BDS app, which is why customer columns were progressively made nullable (see migrations dated 2026_05_08_*). Don't add NOT NULL columns to `customers` without checking BDS usage first.
- Background jobs: [`CheckPaymentStatus`](../vietponic_market_zalo_backend/app/Jobs/CheckPaymentStatus.php) (dispatched from `link()`, ~20min delay) and [`CheckRefundStatus`](../vietponic_market_zalo_backend/app/Jobs/CheckRefundStatus.php). Queue connection is `database` (set `QUEUE_CONNECTION=sync` for `.env.testing` so jobs run inline during tests).
- Services: [`StockService`](../vietponic_market_zalo_backend/app/Services/StockService.php) (stock check/reserve/release), [`RefundService`](../vietponic_market_zalo_backend/app/Services/RefundService.php), [`ViettelPostService`](../vietponic_market_zalo_backend/app/Services/ViettelPostService.php) (VTP shipping estimate — caches token 20h, provinces 30d, districts 7d). VTP credentials live in `config/viettelpost.php`.
- Tests use sqlite `:memory:` and the env vars in [phpunit.xml](../vietponic_market_zalo_backend/phpunit.xml) — note that `ZALO_CHECK_OUT_SECRET`, `ZALO_APP_SECRET`, `ADMIN_API_SECRET`, `JWT_SECRET` are overridden there with test values. If a Zalo test fails with MAC mismatch, check that the test isn't accidentally reading the real `.env`.

### Additional feature areas

- **Affiliate/CTV** — [src/pages/profile/affiliate/](thuy-canh-viet-vietponics/src/pages/profile/affiliate/) + [AffiliateController.php](../vietponic_market_zalo_backend/app/Http/Controllers/AffiliateController.php). Referral codes are applied via `applyPendingReferral()` in [src/utils/affiliate.ts](thuy-canh-viet-vietponics/src/utils/affiliate.ts) after auth. Commission events fire via `OrderPaymentSucceeded` → `RecordAffiliateCommission` listener.
- **Farm partner portal** — [src/pages/farm/](thuy-canh-viet-vietponics/src/pages/farm/). Guarded by `useFarmGuard()` in hooks.ts (redirects non-farm-partners to `/`). Inventory pagination and filter state live in `farmInventoryFiltersState` / `useFarmInventory()`.
- **Shipping fee estimate** — [src/hooks/useShippingFee.ts](thuy-canh-viet-vietponics/src/hooks/useShippingFee.ts) (note: separate file, not inside hooks.ts). Calls `POST /shipping/estimate` with VTP address IDs; auto-selects the first returned service. Falls back to a static flat fee when `apiUrl` is empty (offline/mock mode).
- **VTP address lookup** — Provinces/districts/wards are served from `GET /locations/provinces|districts|wards`. Data is synced from VTP via `php artisan vtp:sync-locations` (run after credential changes or if the dropdowns look stale).

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
Khi kiểm tra/refactor theo một use case (vd ORDER-06):
1. **Đọc** case đó trong file nhóm tương ứng
2. **Scan** code liên quan cả backend lẫn Mini App (controller, service, model, route, page/component)
3. **Điền** mục "Đối chiếu code" ngay trong file use case: file liên quan, sai lệch, test coverage
4. **Lập plan** sửa/refactor và CHỜ DUYỆT — không tự ý sửa
5. **Viết test trước** (Pest) mô phỏng đúng kết quả mong đợi của use case
6. **Sửa code** từng bước nhỏ, chạy test sau mỗi bước
7. **Cập nhật** trạng thái case trong file use case và INDEX.md