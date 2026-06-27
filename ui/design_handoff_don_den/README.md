# Handoff: Trang "Đơn đến" — quản lý đơn hàng theo role (Zalo Mini App)

## Overview
Thiết kế lại trang quản lý đơn hàng của Farm Hub (Zalo Mini App, mobile 390px, tiếng Việt).
Vấn đề bản cũ: mọi role dùng chung một giao diện, khó phân biệt, nhồi quá nhiều nút + FAB
chồng nội dung, và chưa có màn chi tiết đơn. Bản này tách giao diện theo **nhóm role**, mỗi
nhóm có **dải màu nhận diện** riêng và **một nút hành động chính theo trạng thái**.

## About the Design Files
File trong gói là **bản thiết kế tham chiếu viết bằng HTML** (`Wireframe Don Den.dc.html`) —
prototype mô tả bố cục và hành vi mong muốn, KHÔNG phải code production để copy thẳng.
Nhiệm vụ là **dựng lại các màn này trong codebase hiện có** (React/Vue/… của Zalo Mini App)
theo design system & component sẵn có của dự án. Nếu chưa có môi trường, chọn framework phù
hợp rồi dựng lại.

> Lưu ý kỹ thuật: `.dc.html` là định dạng streaming nội bộ, cần runtime `support.js` mới mở
> trực tiếp được. Dùng nó để **đọc cấu trúc & class CSS** là chính. Bố cục, spacing, màu badge
> đều nằm trong khối `<style>` ở đầu file.

## Fidelity
**Low-fidelity (lo-fi wireframe).** Tập trung vào **cấu trúc, luồng, và phân quyền theo role**.
Màu sắc chỉ mang tính quy ước (grayscale + mã màu badge trạng thái). Khi dựng thật, **áp design
system / brand xanh lá của app**, giữ nguyên cấu trúc thông tin và logic nút theo trạng thái.

## Roles & quyền (nguồn: ma trận quyền của dự án)
| role | tên gọi | quyền chính |
|---|---|---|
| `owner` | Chủ farm | confirm-order, assign, handoff-ship, handoff-internal, xem payout |
| `admin` | Quản lý | như owner, **trừ** payout/tài chính |
| `packer` | NV đóng gói | claim, start-packing, confirm-packed |
| `shipper` | NV giao | pickup, deliver |
| `null` | Farm thường | chỉ đọc (read-only), chỉ thấy đơn của mình |

Mỗi nhóm role render một biến thể trang khác nhau. **Dải accent đầu màn** giúp nhận diện ngay:
owner/admin = xanh lá `#1f8a4c`, packer = vàng `#c79a12`, shipper = cam `#e07514`, null = xám `#9a958c`.

## Vòng đời đơn (state machine)
```
pending → confirmed → preparing → delivering → out_for_delivery → delivered
                                       │                                  
                                  (cancelled có thể xảy ra ở các bước đầu)
```
- `pending → confirmed`: owner/admin bấm **Xác nhận đơn**.
- gán packer (assign): owner/admin chọn người đóng gói.
- `assignment: unassigned → assigned`: sau khi gán hoặc packer **claim** (tự nhận).
- `assigned → packing`: packer bấm **Bắt đầu đóng gói**.
- `packing → packed`: packer bấm **Hoàn tất đóng gói** (chỉ bật khi tích đủ checklist).
- `confirmed + packed → delivering`: owner/admin **Bàn giao giao hàng**, chọn 1 trong 2:
  - **Giao qua VTP** (đối tác) → app chờ VTP cập nhật, nút thành "Chờ VTP cập nhật" (disabled).
  - **Giao nội bộ** → chọn shipper của farm.
- `delivering → out_for_delivery`: shipper nội bộ bấm **Tôi đã lấy hàng** (pickup).
- `out_for_delivery → delivered`: shipper bấm **Xác nhận giao thành công** (deliver) → dialog xác nhận.

## Screens / Views

### NHÓM ① — owner / admin (accent xanh lá)

**1.1 Danh sách đơn**
- Layout: phone shell → status bar → role bar (5px xanh) → top bar (title "Quản lý đơn hàng" + subtitle farm + role pill) → hàng filter tabs cuộn ngang → dòng tổng "268kg · cần chuẩn bị hôm nay" → list card cuộn dọc → bottom tab nav (4 mục: Tổng quan / Đơn hàng[active] / Phân tích / Thu nhập).
- Filter tabs: `Tất cả · 115` (active) | `Chờ xác nhận · 89` | `Đang đóng · 12` | `Chờ giao`.
- Order card: hàng trên `#403` (đậm) + giá phải; dòng meta `khách · vùng · giờ`; hàng badge = **badge trạng thái đơn** + **pill phân công**; dòng meta cuối `N sản phẩm · Nkg`. KHÔNG có nút trên card (chỉ vào chi tiết).
- **Không có FAB** (chủ ý bỏ so với bản cũ).
- `admin`: y hệt owner nhưng **ẩn tab/section "Thu nhập / payout"**.

**1.2 Chi tiết đơn**
- Layout: top bar có nút back `‹` + `#400` + subtitle; nội dung cuộn; **action bar cố định đáy** chứa 1 nút chính.
- Khối: badge trạng thái (lớn) → section "Khách hàng" (tên, SĐT, địa chỉ) → "Sản phẩm" (list item ×kg + giá) → tổng (tạm tính / phí giao / **Tổng** đậm) → "Đóng gói" (tên packer + pill packed + giờ xong).
- **Nút chính theo trạng thái** (action bar): xem mục "Nút chính" bên dưới.

**1.3 Bottom sheet — Chọn người đóng gói**
- Nền màn mờ + sheet trượt đáy (bo góc trên, grab handle).
- Tiêu đề "Chọn người đóng gói". List staff: avatar tròn + tên + sub (role · trạng thái rảnh/bận) + radio bên phải. Nút "Xác nhận" (đậm) đáy sheet.

**1.4 Bottom sheet — Bàn giao giao hàng**
- Tiêu đề "Bàn giao đơn #…". 2 option lớn dạng hàng có icon: **Giao qua VTP** (sub: đối tác, tự cập nhật) và **Giao nội bộ** (sub: chọn shipper ›).

### NHÓM ② — packer (accent vàng)

**2.1 Hàng chờ đóng gói (3 tab)**
- Tabs: `Có thể nhận · 3` (active) | `Của tôi · 2` | `Người khác`.
- Top bar: "Đơn đóng gói" + "Chào, <tên>" + role pill "Đóng gói".
- Card theo tab:
  - **Có thể nhận**: viền nhấn, pill đỏ "Chưa có người", nút xanh **"Nhận đóng gói"** (claim).
  - **Của tôi**: pill vàng "Đang đóng", nút "Xem chi tiết".
  - **Người khác**: card xám/dashed, khoá, hiện tên packer, **không có nút**.
- Bottom nav: Tổng quan / Đóng gói[active] / Kho / Cá nhân.

**2.2 Phiếu đóng gói (checklist)**
- Top bar: back + `#405` + badge "Đang đóng".
- Khối: khách (read-only tên + địa chỉ) → "Soạn hàng N/M" với checklist (checkbox + tên SP + ×kg; tích = ô xanh ✓, dòng done mờ) → "Ghi chú của khách" (read-only).
- Action bar: nút chính theo trạng thái (xem bên dưới). Khi chưa tích đủ → disabled, label phụ "(còn N món)".

### NHÓM ③ — shipper nội bộ (accent cam)

**3.1 Đơn giao của tôi (2 tab)**
- Tabs: `Cần lấy hàng · 2` (active) | `Đang giao · 1`.
- Card "Cần lấy": `#400` + badge "Chờ lấy" (cam); tên khách + địa chỉ; nút cam **"Đã lấy hàng"** (pickup).
- Card "Đang giao": badge tím "Đang giao", SĐT **bấm-để-gọi**, nút xanh **"Xác nhận đã giao"** (deliver).
- Bottom nav: Tổng quan / Giao hàng[active] / Lịch sử / Cá nhân.

**3.2 Chi tiết giao hàng**
- Khối: "Khách hàng" (tên, SĐT + nút **Gọi**, địa chỉ, link **Mở bản đồ ↗**) → "Đơn hàng" (item read-only + Tổng thu hộ) → "Tiến trình" timeline 3 mốc:
  - ✓ Đã đóng gói (giờ) — done
  - ● Đã lấy hàng (chưa) — current
  - ○ Đã giao khách (chưa) — wait
- Action bar: `delivering` → "Tôi đã lấy hàng" (cam); `out_for_delivery` → "Xác nhận giao thành công" (xanh) → dialog "Xác nhận đơn #… đã được giao?".

### NHÓM ④ — chung

**4.1 Farm thường / chỉ xem (null, accent xám)**
- Top bar "Đơn của tôi" + pill "Chỉ xem". Banner xám "Chế độ chỉ xem — chỉ thấy đơn của mình, không thao tác."
- Card chỉ hiện badge trạng thái, **không có pill phân công, không có nút**. Bottom nav rút gọn (Đơn / Kho / Cá nhân).

**4.2 Empty state**: icon + "Không có đơn nào" + "Kéo xuống để làm mới".
**4.3 Loading skeleton**: 3 card placeholder (thanh xám bo góc).
**4.4 Error**: toast tối đáy màn "Có lỗi xảy ra, thử lại" + nút "Thử lại".

## Nút hành động chính theo trạng thái (context-sensitive)

**Owner/admin (màn chi tiết 1.2):**
- `pending` → **Xác nhận đơn** (xanh dương `#2a5bd7`)
- `confirmed` + assignment=`packed` → **Bàn giao giao hàng** (cam) → mở sheet 1.4
- `delivering` (VTP) → **Chờ VTP cập nhật** (disabled)
- `delivering` (nội bộ) → hiện tên shipper được gán
- `delivered` → **Hoàn thành** (xanh lá, disabled)
- `cancelled` → **Đã huỷ** (đỏ, disabled)

**Packer (màn 2.2):**
- `assigned` → **Bắt đầu đóng gói** (xanh dương)
- `packing` → **Hoàn tất đóng gói** (xanh lá) — chỉ enable khi tích hết checklist
- `packed` → **Đã đóng xong** (disabled) + timestamp

**Shipper (màn 3.2):**
- `delivering` → **Tôi đã lấy hàng** (cam)
- `out_for_delivery` → **Xác nhận giao thành công** (xanh) → dialog xác nhận

## Interactions & Behavior
- Pull-to-refresh ở mọi màn list.
- Tap card → chi tiết tương ứng theo role.
- Bottom sheet trượt từ đáy (chọn packer, bàn giao); dim nền sau.
- Bấm SĐT (shipper) → gọi điện; "Mở bản đồ" → app bản đồ.
- Checklist packer: tick từng món, nút hoàn tất disabled tới khi đủ.
- Deliver: dialog confirm trước khi đổi trạng thái.
- Trạng thái: loading skeleton → data / empty / error toast (retry).

## State Management (gợi ý)
- `currentRole`: owner | admin | packer | shipper | null → quyết định màn render + dải accent + bottom nav.
- `orders[]`: mỗi đơn có `id, customer, address, phone, items[], total, shippingFee, status, assignment{state, packerId}, deliveryMode(vtp|internal), shipperId, timestamps`.
- `activeTab` theo từng màn list.
- `packingChecklist`: map itemId → checked (điều kiện enable "Hoàn tất").
- Data fetch theo role: packer/shipper chỉ lấy đơn liên quan; null chỉ lấy đơn của mình.

## Design Tokens

**Badge trạng thái đơn** (bg / text):
- pending (gray) `#ececec` / `#5a5a5a`
- confirmed (blue) `#dbe8ff` / `#2a5bd7`
- preparing (yellow) `#fdf0c8` / `#9a7b10`
- delivering (orange) `#ffe1cc` / `#c4630f`
- out_for_delivery (purple) `#ece1ff` / `#6b3fc4`
- delivered (green) `#d6f2dd` / `#1f8a4c`
- cancelled (red) `#ffdcdc` / `#c43838`

**Pill phân công**: unassigned = red, assigned = gray, packing = yellow, packed = green (cùng bộ màu trên).

**Accent role**: owner/admin `#1f8a4c` · packer `#c79a12` · shipper `#e07514` · null `#9a958c`.

**Nút**: primary blue `#2a5bd7`, orange `#e07514`, green `#1f8a4c`, dark `#2a2a2a`, disabled bg `#edebe5` text `#a7a299`.

**Neutrals**: nền `#fbfaf7`, card `#fff`, viền `#d4d0c7`, divider `#f0ede5`, text phụ `#8a857c`.

**Bo góc**: card 12px, nút 10px, sheet 20px (trên), pill/badge 999px. **Shadow**: card nhẹ `0 1px 4px rgba(0,0,0,.1)`.

**Typography (wireframe)**: header dùng "Caveat" (hand-drawn, chỉ để báo hiệu wireframe — KHÔNG dùng khi dựng thật). Khi dựng thật dùng font hệ thống / font app. Cỡ tham khảo: title 20px, oid 19px, body 16px, meta 13–14px.

## Assets
Không có ảnh thật — placeholder & icon là khối CSS đơn giản (ô vuông, chấm tròn). Dùng icon
set của app khi dựng thật.

## Files
- `Wireframe Don Den.dc.html` — toàn bộ wireframe trên 1 canvas (14 frame + chú thích + legend màu).
- (tuỳ chọn) ảnh chụp các màn nếu được thêm vào.
