# Bảng mô tả chức năng V2 — "Hợp tác xã Dược liệu Xatapha"

> **Phiên bản 2 — Phạm vi BÁN HÀNG.**
> Bản rút gọn từ [V1](XATAPHA-BANG-CHUC-NANG.md), chỉ giữ các chức năng phục vụ trực tiếp việc bán hàng,
> bổ sung đặc tả **Landing page** và **Admin page**.
> V1 vẫn giữ nguyên làm bản đầy đủ để đối chiếu khi mở rộng về sau.

---

## 0. Tổng quan & phạm vi

### 0.1 Nền tảng công nghệ

| Hạng mục | Nội dung |
|---|---|
| Ứng dụng khách | Zalo Mini App (React + TypeScript, zmp-ui, Jotai) |
| Backend | Laravel 9 / PHP 8, REST API, JWT cho khách, header bí mật cho quản trị |
| Landing page | Laravel Blade — website giới thiệu, chạy chung backend |
| Trang quản trị | Laravel Blade — trang quản trị nội bộ, chạy chung backend |
| Thanh toán | Zalo Pay SDK (COD / chuyển khoản / ví), webhook xác thực MAC HMAC-SHA256 |
| Vận chuyển | ViettelPost API (ước phí, tạo vận đơn, webhook trạng thái) |
| Thông báo | Zalo OA (tin nhắn trạng thái đơn) |

### 0.2 Ba bề mặt sản phẩm

| Bề mặt | Đối tượng | Mục đích |
|---|---|---|
| **Mini App** | Khách mua hàng | Duyệt, đặt, thanh toán, theo dõi đơn |
| **Landing page** | Khách vãng lai, tìm kiếm Google | Giới thiệu HTX, tạo niềm tin, kéo về Mini App |
| **Admin page** | Nhân viên HTX | Vận hành: sản phẩm, đơn hàng, kho, khách hàng |

### 0.3 Cắt khỏi V2 so với V1

Bảng này dùng khi thương thảo phạm vi — nêu rõ phần nào để lại cho giai đoạn sau.

| Nhóm bị cắt | Mã V1 | Lý do |
|---|---|---|
| Cổng thành viên HTX (hộ trồng đăng nhập, phân quyền 4 vai trò) | ROLE-01→06 | Quản trị chuỗi cung ứng nội bộ, không phải bán hàng |
| Khai báo lô & tồn kho theo lô, FEFO, hồ sơ kiểm nghiệm | STOCK-01→10 | Thay bằng tồn kho đơn giản (còn/hết) đủ cho bán hàng |
| Xưởng sơ chế – đóng gói (phân công, nhật ký thao tác) | PACK-01→10 | Quy trình nội bộ, xử lý thủ công ở giai đoạn đầu |
| Giao hàng nội bộ (đội xe HTX) | SHIP-01→04 | Dùng ViettelPost cho toàn bộ đơn |
| Báo cáo & thanh toán cho hộ trồng | HUB-01→03, PAY-01→03 | Đối soát ngoài hệ thống ở giai đoạn đầu |
| Cộng tác viên giới thiệu & hoa hồng | AFF-01→05 | Kênh bán mở rộng, chưa cần ở giai đoạn đầu |
| Truy xuất nguồn gốc lô (khách quét mã lô) | PROD-04 | Phụ thuộc tồn kho theo lô đã bị cắt |
| Thu hồi lô, cảnh báo hết hạn | ADM-12, SYS-08 | Phụ thuộc tồn kho theo lô đã bị cắt |

> **Lưu ý nghiệp vụ:** cảnh báo & chống chỉ định trên trang sản phẩm (PROD-03) **được giữ lại**
> dù mang tính đặc thù dược liệu — đây là yêu cầu an toàn người dùng, không phải chức năng
> chuỗi cung ứng.

---

## 1. MINI APP — Chức năng bán hàng

### 1.1 Xác thực & tài khoản (7 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| AUTH-01 | Đăng nhập bằng Zalo | Lấy mã truy cập từ Zalo SDK → đổi lấy JWT của hệ thống; tự tạo hồ sơ khách nếu chưa có | Cơ bản |
| AUTH-02 | Tự động gia hạn phiên | JWT hết hạn ~30 phút, tự làm mới trước 60 giây; gặp lỗi 401 thì xác thực lại một lần | Cơ bản |
| AUTH-03 | Lấy thông tin hồ sơ Zalo | Tên, ảnh đại diện; có bộ nhớ đệm để tránh lỗi giới hạn gọi SDK và nhấp nháy ảnh | Cơ bản |
| AUTH-04 | Cấp quyền số điện thoại | Xin quyền lấy số điện thoại phục vụ giao hàng; thao tác an toàn khi lặp lại | Cơ bản |
| AUTH-05 | Chỉnh sửa hồ sơ | Cập nhật họ tên, số điện thoại, địa chỉ mặc định | Nâng cao |
| AUTH-06 | Quan tâm Zalo OA | Mời theo dõi OA để nhận thông báo đơn hàng; xử lý mượt khi người dùng từ chối | Cơ bản |
| AUTH-07 | Tạo lối tắt ứng dụng | Thêm biểu tượng Mini App ra màn hình chính | Nâng cao |

### 1.2 Khám phá sản phẩm (7 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| PROD-01 | Trang chủ | Băng-rôn quảng bá, danh mục dược liệu, sản phẩm nổi bật, chương trình khuyến mại | Cơ bản |
| PROD-02 | Danh mục dược liệu | Phân nhóm theo công dụng (bổ khí huyết, an thần, tiêu hoá, hô hấp…) và theo dạng bào chế (khô, thái phiến, cao, trà túi lọc, tinh dầu) | Cơ bản |
| PROD-03 | Chi tiết sản phẩm | Ảnh nhiều góc, tên khoa học, bộ phận dùng, công dụng, cách dùng, liều lượng, **chống chỉ định & cảnh báo** (phụ nữ có thai, tương tác thuốc) | Cơ bản |
| PROD-05 | Tìm kiếm | Tìm theo tên thường gọi, tên khoa học, công dụng; gợi ý từ khoá | Cơ bản |
| PROD-06 | Hiển thị tồn kho | Sản phẩm hết hàng vẫn hiển thị nhưng gắn nhãn "Hết hàng" và khoá nút mua; hiện "Còn lại X" khi tồn thấp | Cơ bản |
| PROD-07 | Sản phẩm liên quan | Gợi ý dược liệu cùng nhóm công dụng hoặc thường dùng phối hợp | Cơ bản |
| PROD-08 | Chia sẻ sản phẩm | Chia sẻ qua Zalo kèm ảnh và mô tả ngắn | Cơ bản |

*Giữ nguyên mã số của V1 để đối chiếu — PROD-04 bị cắt nên số nhảy từ 03 sang 05.*

### 1.3 Giỏ hàng & đặt hàng (12 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| ORDER-01 | Thêm vào giỏ | Chọn số lượng theo đơn vị bán (gram, kg, hộp, gói, lọ); chặn vượt tồn khả dụng | Cơ bản |
| ORDER-02 | Đồng bộ giỏ hàng lên máy chủ | Giỏ hàng và mã giảm giá lưu phía máy chủ để không mất khi đổi thiết bị; chạy ngầm, thất bại không chặn thanh toán | Nâng cao |
| ORDER-03 | Chọn hình thức nhận hàng | Giao tận nơi qua ViettelPost hoặc nhận tại điểm bán liên kết | Cơ bản |
| ORDER-04 | Sổ địa chỉ | Chọn Tỉnh/Huyện/Xã theo dữ liệu chuẩn ViettelPost; lưu địa chỉ mặc định | Cơ bản |
| ORDER-05 | Ước tính phí vận chuyển | Gọi API ViettelPost theo khối lượng, kích thước, quãng đường; tự chọn dịch vụ rẻ nhất; có phí phẳng dự phòng khi mất kết nối | Cơ bản |
| ORDER-06 | Áp dụng mã giảm giá | Xem danh sách mã khả dụng, kiểm tra điều kiện (giá trị tối thiểu, hạn dùng, số lần dùng) | Cơ bản |
| ORDER-07 | Ghi chú đơn hàng | Ghi chú cho HTX (yêu cầu đóng gói, thời gian nhận, hướng dẫn sử dụng…) | Cơ bản |
| ORDER-08 | Tạo đơn hàng | Lưu đơn, các dòng hàng và thông tin giao nhận; chống tạo trùng bằng khoá phân tán | Cơ bản |
| ORDER-09 | Thanh toán Zalo Pay | Ký MAC HMAC-SHA256 ở máy chủ → mở giao diện Zalo Pay → nhận kết quả qua sự kiện và webhook | Cơ bản |
| ORDER-10 | Thanh toán khi nhận (COD) | Ghi nhận đơn COD, bỏ qua bước cổng thanh toán | Cơ bản |
| ORDER-11 | Đối soát trạng thái thanh toán | Tác vụ nền kiểm tra lại với Zalo sau ~20 phút phòng khi webhook thất lạc | Nâng cao |
| ORDER-12 | Tự huỷ đơn chưa thanh toán | Đơn trực tuyến quá 30 phút chưa thanh toán sẽ tự huỷ, hoàn kho, trả lại mã giảm giá và huỷ vận đơn | Nâng cao |

### 1.4 Theo dõi đơn & sau bán (8 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| ORDPRO-01 | Danh sách đơn theo tab | 5 tab: Chờ xác nhận · Đang chuẩn bị · Đang giao · Đã giao · Đã huỷ | Cơ bản |
| ORDPRO-02 | Chi tiết đơn | Dòng hàng, tổng tiền, giảm giá, phí ship, địa chỉ, phương thức thanh toán | Cơ bản |
| ORDPRO-03 | Theo dõi hành trình | Dòng thời gian trạng thái, đồng bộ từ webhook ViettelPost | Cơ bản |
| ORDPRO-04 | Khách tự huỷ đơn | Chỉ cho phép khi đơn chưa giao; bắt buộc chọn lý do, nếu chọn "Khác" phải nhập tối thiểu 5 ký tự | Cơ bản |
| ORDPRO-05 | Hoàn tiền | Tự động gọi API hoàn tiền Zalo Pay; hoặc hoàn thủ công (chuyển khoản/MoMo) với nhãn thời gian dự kiến rõ ràng | Nâng cao |
| ORDPRO-06 | Nhận thông báo OA | Tin nhắn Zalo OA khi đơn đổi trạng thái quan trọng | Cơ bản |
| ORDPRO-07 | Đặt lại đơn cũ | Thêm nhanh toàn bộ dòng hàng của đơn cũ vào giỏ | Cơ bản |
| ORDPRO-08 | Đánh giá sản phẩm | Chấm sao và nhận xét sau khi đơn ở trạng thái Đã giao | Cơ bản |

**Tổng Mini App: 34 mã chức năng.**

---

## 2. LANDING PAGE — Website giới thiệu

Website công khai, tối ưu tìm kiếm, mục tiêu chính là **tạo niềm tin** và **dẫn người dùng vào Mini App**.

| Mã | Khối | Mô tả | Mức |
|---|---|---|---|
| LP-01 | Khối mở đầu (Hero) | Tên HTX, thông điệp định vị, ảnh nền vùng trồng; hai nút: "Mở Mini App" (liên kết sâu Zalo) và "Xem sản phẩm" | Cơ bản |
| LP-02 | Thanh tin cậy | Dải logo/con số: chứng nhận GACP-WHO, VietGAP, OCOP; số năm hoạt động; số hộ thành viên; số sản phẩm | Cơ bản |
| LP-03 | Danh mục nổi bật | Lưới danh mục kèm số lượng sản phẩm, lấy động từ cơ sở dữ liệu | Cơ bản |
| LP-04 | Sản phẩm bán chạy | Lưới sản phẩm: ảnh, tên, tên khoa học, giá, nút dẫn sang Mini App | Cơ bản |
| LP-05 | Câu chuyện HTX | Giới thiệu Xatapha: lịch sử, vùng trồng, con người; ảnh hoặc video | Cơ bản |
| LP-06 | Quy trình sản xuất | Trình bày 6 bước: Trồng → Thu hái → Sơ chế → Kiểm nghiệm → Đóng gói → Giao hàng | Cơ bản |
| LP-07 | Chứng nhận & kiểm nghiệm | Trưng bày giấy chứng nhận, phiếu kiểm nghiệm dạng ảnh/PDF — điểm khác biệt then chốt của dược liệu | Cơ bản |
| LP-08 | Đánh giá khách hàng | Nhận xét thật kèm tên và ảnh đại diện | Nâng cao |
| LP-09 | Hướng dẫn tải Mini App | Mã QR + hướng dẫn 3 bước bằng hình | Cơ bản |
| LP-10 | Đăng ký nhận tin | Ô nhập email/số điện thoại nhận thông tin khuyến mại | Nâng cao |
| LP-11 | Liên hệ | Địa chỉ, bản đồ nhúng, hotline, liên kết Zalo OA, giờ làm việc | Cơ bản |
| LP-12 | Trang chính sách | Điều khoản, vận chuyển, đổi trả, bảo mật — nội dung quản trị được từ trang admin | Cơ bản |
| LP-13 | Tối ưu tìm kiếm (SEO) | Thẻ meta, Open Graph, sitemap, dữ liệu có cấu trúc cho sản phẩm và tổ chức | Nâng cao |
| LP-14 | Hiển thị đa thiết bị | Ưu tiên di động — phần lớn truy cập đến từ trong Zalo | Cơ bản |

**Tổng Landing page: 14 mã chức năng.**

---

## 3. ADMIN PAGE — Trang quản trị vận hành

Trang quản trị nội bộ, đăng nhập bằng tài khoản nhân viên, phân quyền theo vai trò.

### 3.1 Bảng điều khiển (2 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| ADM-01 | Tổng quan kinh doanh | Doanh thu hôm nay / tháng này, số đơn theo từng trạng thái, giá trị đơn trung bình | Cơ bản |
| ADM-02 | Việc cần xử lý | Đơn chờ xác nhận, sản phẩm sắp hết hàng, hoàn tiền chờ duyệt — mỗi mục dẫn thẳng tới danh sách tương ứng | Cơ bản |

### 3.2 Danh mục & sản phẩm (5 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| ADM-03 | Quản lý danh mục | Tạo/sửa/xoá danh mục, sắp thứ tự hiển thị, gắn ảnh đại diện | Cơ bản |
| ADM-04 | Quản lý sản phẩm | Tạo/sửa/xoá: tên, tên khoa học, danh mục, giá, đơn vị tính, mô tả | Cơ bản |
| ADM-05 | Thư viện ảnh sản phẩm | Tải nhiều ảnh, kéo thả sắp xếp thứ tự, xoá từng ảnh | Cơ bản |
| ADM-06 | Thông số vận chuyển | Khai báo khối lượng và kích thước từng sản phẩm — bắt buộc để tính đúng phí ViettelPost | Cơ bản |
| ADM-07 | Nội dung đặc thù dược liệu | Trường riêng: bộ phận dùng, công dụng, cách dùng, liều lượng, chống chỉ định & cảnh báo | Cơ bản |

### 3.3 Đơn hàng (5 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| ADM-08 | Danh sách đơn | Lọc theo trạng thái, khoảng ngày, phương thức thanh toán; tìm theo mã đơn hoặc số điện thoại | Cơ bản |
| ADM-09 | Chi tiết đơn | Toàn bộ thông tin đơn, khách, giao nhận, thanh toán, lịch sử trạng thái | Cơ bản |
| ADM-10 | Cập nhật trạng thái | Chuyển trạng thái theo quy trình; **chặn lùi trạng thái**, chặn huỷ đơn đã giao | Cơ bản |
| ADM-11 | Sửa dòng hàng | Thêm/bớt/sửa số lượng dòng hàng trong đơn chưa giao, tự tính lại tổng tiền | Nâng cao |
| ADM-12 | Xử lý vận đơn | Xem mã vận đơn, trạng thái ViettelPost; thử lại khi tạo vận đơn thất bại | Nâng cao |

### 3.4 Kho hàng (4 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| ADM-13 | Tồn kho | Danh sách tồn theo sản phẩm, giá trị tồn, lọc và tìm kiếm | Cơ bản |
| ADM-14 | Cảnh báo tồn thấp | Danh sách sản phẩm dưới điểm đặt hàng lại; đặt ngưỡng cảnh báo cho từng sản phẩm | Cơ bản |
| ADM-15 | Nhập & điều chỉnh kho | Nhập hàng, điều chỉnh sai lệch kiểm kê, xuất nhanh — mỗi thao tác bắt buộc ghi lý do | Cơ bản |
| ADM-16 | Sổ biến động kho | Nhật ký nhập/xuất/điều chỉnh: thời điểm, người thao tác, số lượng trước–sau, lý do | Cơ bản |

### 3.5 Khách hàng (2 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| ADM-17 | Danh sách khách hàng | Tìm kiếm, xem thông tin liên hệ, tổng chi tiêu, số đơn đã đặt | Cơ bản |
| ADM-18 | Khoá / mở tài khoản | Vô hiệu hoá tài khoản vi phạm — chặn ngay ở lượt gọi API kế tiếp | Nâng cao |

### 3.6 Khuyến mại & nội dung (3 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| ADM-19 | Mã giảm giá | Tạo mã, đặt loại giảm (số tiền / phần trăm), giá trị đơn tối thiểu, hạn dùng, giới hạn số lần; bật/tắt nhanh | Cơ bản |
| ADM-20 | Băng-rôn trang chủ | Tải ảnh, đặt liên kết đích, sắp thứ tự, hẹn lịch hiển thị | Cơ bản |
| ADM-21 | Chính sách & điều khoản | Soạn thảo nội dung hiển thị trên cả Mini App lẫn Landing page | Cơ bản |

### 3.7 Hoàn tiền (2 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| ADM-22 | Hàng chờ hoàn tiền | Danh sách đơn cần hoàn thủ công (chuyển khoản/MoMo), kèm số tiền và thông tin nhận | Nâng cao |
| ADM-23 | Xác nhận đã hoàn | Đánh dấu đã chuyển tiền, tải lên ảnh chứng từ, tự thông báo cho khách | Nâng cao |

### 3.8 Điểm bán & cấu hình (3 mã)

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| ADM-24 | Điểm bán liên kết | Quản lý nhà thuốc/điểm nhận hàng: tên, địa chỉ chuẩn ViettelPost, giờ mở cửa, bật/tắt | Cơ bản |
| ADM-25 | Cấu hình thông báo | Bật/tắt từng loại tin nhắn Zalo OA/ZNS mà không cần triển khai lại mã | Nâng cao |
| ADM-26 | Người dùng quản trị | Tạo tài khoản nhân viên, phân quyền theo vai trò, đặt lại mật khẩu | Cơ bản |

**Tổng Admin page: 26 mã chức năng.**

---

## 4. Chức năng nền tảng (chạy ngầm)

| Mã | Chức năng | Mô tả | Chu kỳ |
|---|---|---|---|
| SYS-01 | Tự huỷ đơn treo | Huỷ đơn trực tuyến thanh toán thất bại hoặc treo quá 30 phút; hoàn kho, trả mã giảm giá, huỷ vận đơn | 5 phút |
| SYS-02 | Đối soát thanh toán | Kiểm tra lại trạng thái giao dịch với Zalo Pay | Sau ~20 phút kể từ khi tạo đơn |
| SYS-03 | Thử lại huỷ vận đơn | Huỷ lại các vận đơn ViettelPost chưa huỷ được | 30 phút |
| SYS-05 | Đồng bộ danh mục địa chỉ | Cập nhật Tỉnh/Huyện/Xã từ ViettelPost | Theo yêu cầu |
| SYS-06 | Làm mới token vận chuyển | Gia hạn token ViettelPost | Hằng tuần |
| SYS-07 | Hàng đợi thông báo OA | Gửi tin nhắn Zalo OA bất đồng bộ, có thử lại khi lỗi | Liên tục |

*Giữ mã số V1 — SYS-04 (chốt số liệu vùng trồng) và SYS-08 (quét lô hết hạn) bị cắt.*

---

## 5. Mô hình trạng thái đơn hàng

| Hệ thống lưu | Khách nhìn thấy |
|---|---|
| `pending` | Chờ xác nhận |
| `confirmed`, `preparing` | Đang chuẩn bị |
| `delivering` | Đang giao |
| `delivered` | Đã giao |
| `cancelled` | Đã huỷ |

**Quy tắc chuyển trạng thái:**
- Chỉ được tiến, không được lùi
- Đơn `delivered` không thể huỷ
- Khách chỉ tự huỷ được khi đơn chưa ở `delivering` trở đi
- Mọi lần đổi trạng thái đều ghi nhật ký kèm người thao tác

---

## 6. Ma trận ba bề mặt

Cho thấy chức năng nào xuất hiện ở đâu — dùng để phát hiện phần nội dung dùng chung.

| Chức năng | Mini App | Landing | Admin |
|---|:---:|:---:|:---:|
| Danh mục sản phẩm | Duyệt | Trưng bày | Quản lý |
| Sản phẩm & giá | Duyệt, mua | Trưng bày | Quản lý |
| Ảnh sản phẩm | Xem | Xem | Tải, sắp xếp |
| Nội dung dược liệu (công dụng, cảnh báo) | Xem | Xem | Soạn thảo |
| Tồn kho | Nhãn còn/hết | — | Quản lý đầy đủ |
| Giỏ hàng & đặt hàng | ✅ | — | — |
| Thanh toán | ✅ | — | — |
| Đơn hàng | Đơn của mình | — | Toàn bộ |
| Mã giảm giá | Áp dụng | — | Tạo, quản lý |
| Băng-rôn | Hiển thị | — | Quản lý |
| Chính sách | Xem | Xem | Soạn thảo |
| Điểm bán liên kết | Chọn nhận hàng | Xem danh sách | Quản lý |
| Hồ sơ khách hàng | Của mình | — | Toàn bộ |
| Hoàn tiền | Theo dõi | — | Xử lý |
| Chứng nhận & kiểm nghiệm | — | Trưng bày | Tải lên |

---

## 7. Lộ trình triển khai V2

| Giai đoạn | Phạm vi | Ước tính |
|---|---|---|
| **1 — Nền tảng Mini App** | Xác thực, danh mục, sản phẩm, tìm kiếm, giỏ hàng, đặt hàng, Zalo Pay, ViettelPost, theo dõi đơn | 5–6 tuần |
| **2 — Trang quản trị** | Bảng điều khiển, sản phẩm, đơn hàng, kho, khách hàng | 3–4 tuần |
| **3 — Landing page** | Toàn bộ khối nội dung, tối ưu tìm kiếm, hiển thị đa thiết bị | 2–3 tuần |
| **4 — Hoàn thiện** | Mã giảm giá, băng-rôn, hoàn tiền, thông báo OA, đánh giá sản phẩm | 1–2 tuần |
| | **Tổng** | **11–15 tuần** |

So với V1 (~20–27 tuần), V2 rút ngắn khoảng **9–12 tuần** nhờ cắt toàn bộ phần quản trị chuỗi cung ứng nội bộ.

---

## 8. Hướng mở rộng sau V2

Các nhóm đã cắt vẫn giữ nguyên đặc tả trong [V1](XATAPHA-BANG-CHUC-NANG.md), có thể bổ sung theo thứ tự ưu tiên gợi ý:

| Ưu tiên | Nhóm mở rộng | Điều kiện nên làm |
|---|---|---|
| 1 | Truy xuất nguồn gốc lô + hồ sơ kiểm nghiệm | Khi khách bắt đầu hỏi về nguồn gốc, hoặc cần đáp ứng yêu cầu pháp lý |
| 2 | Cộng tác viên giới thiệu | Khi cần mở rộng kênh bán mà chưa tăng ngân sách quảng cáo |
| 3 | Cổng thành viên HTX + tồn kho theo lô | Khi số hộ trồng đủ nhiều để quản lý thủ công không xuể |
| 4 | Xưởng sơ chế – đóng gói | Khi sản lượng đơn/ngày vượt khả năng xử lý thủ công |
| 5 | Giao hàng nội bộ | Khi mật độ đơn trong bán kính gần đủ lớn để tự giao rẻ hơn ViettelPost |
