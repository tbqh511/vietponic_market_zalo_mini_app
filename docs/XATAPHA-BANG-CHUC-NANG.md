# Bảng mô tả chức năng — Zalo Mini App "Hợp tác xã Dược liệu Xatapha"

> Tài liệu đặc tả chức năng cho hệ thống thương mại điện tử + quản trị chuỗi cung ứng dược liệu,
> kiến trúc theo mô hình đã triển khai ở Vietponics (Zalo Mini App + Laravel API),
> chuyển đổi nghiệp vụ từ *nông trại rau thuỷ canh* sang *hợp tác xã dược liệu*.

## 0. Tổng quan hệ thống

| Hạng mục | Nội dung |
|---|---|
| Nền tảng người dùng | Zalo Mini App (React + TypeScript, zmp-ui, Jotai) |
| Backend | Laravel 9 / PHP 8, REST API, JWT cho khách, header bí mật cho admin |
| Thanh toán | Zalo Pay SDK (COD / chuyển khoản / ví), webhook `notify` xác thực MAC HMAC-SHA256 |
| Vận chuyển | ViettelPost API (ước phí, tạo vận đơn, webhook trạng thái) + đội giao nội bộ HTX |
| Thông báo | Zalo OA (tin nhắn trạng thái đơn, nhắc thanh toán) |
| Ba nhóm người dùng | Khách mua hàng · Thành viên HTX (Tổ hợp tác/hộ trồng) · Quản trị HTX |

### Ánh xạ khái niệm so với hệ thống gốc

| Hệ thống gốc (Vietponics) | Hệ thống Xatapha | Ghi chú |
|---|---|---|
| Farm (nông trại đối tác) | **Thành viên HTX** / hộ trồng — vùng nguyên liệu | Mỗi thành viên có mã vùng trồng, diện tích, loại dược liệu canh tác |
| Farm Partner Hub | **Cổng thành viên HTX** | Không gian ứng dụng thứ hai trong cùng Mini App |
| Farm Stock Batch (lô rau) | **Lô dược liệu** | Bổ sung: dạng chế biến, độ ẩm, hàm lượng hoạt chất, số phiếu kiểm nghiệm |
| Packing Hub (kho đóng gói) | **Xưởng sơ chế – đóng gói tập trung của HTX** | Nơi sấy, thái phiến, định lượng, dán tem truy xuất |
| Cộng tác viên (CTV) bán hàng | **Cộng tác viên giới thiệu** | Giữ nguyên cơ chế hoa hồng theo đơn giao thành công |
| Trạm nhận hàng (station) | **Điểm bán / nhà thuốc liên kết** | Khách có thể chọn nhận tại điểm |

---

## 1. Nhóm chức năng KHÁCH HÀNG (Người mua)

### 1.1 Xác thực & tài khoản

| Mã | Chức năng | Mô tả | Vai trò | Mức |
|---|---|---|---|---|
| AUTH-01 | Đăng nhập bằng Zalo | Lấy `access_token` từ Zalo SDK → đổi lấy JWT của hệ thống; tự tạo hồ sơ khách nếu chưa có | Khách | Cơ bản |
| AUTH-02 | Tự động gia hạn phiên | JWT hết hạn ~30 phút, tự làm mới trước 60 giây; gặp lỗi 401 thì xác thực lại một lần | Khách | Cơ bản |
| AUTH-03 | Lấy thông tin hồ sơ Zalo | Tên, ảnh đại diện; có bộ nhớ đệm để tránh lỗi giới hạn gọi SDK và nhấp nháy ảnh | Khách | Cơ bản |
| AUTH-04 | Cấp quyền số điện thoại | Xin quyền lấy số điện thoại phục vụ giao hàng; thao tác an toàn khi lặp lại | Khách | Cơ bản |
| AUTH-05 | Chỉnh sửa hồ sơ | Cập nhật họ tên, số điện thoại, địa chỉ mặc định | Khách | Nâng cao |
| AUTH-06 | Quan tâm Zalo OA | Mời theo dõi OA để nhận thông báo đơn hàng; xử lý mượt khi người dùng từ chối | Khách | Cơ bản |
| AUTH-07 | Tạo lối tắt ứng dụng | Thêm biểu tượng Mini App ra màn hình chính | Khách | Nâng cao |

### 1.2 Khám phá & tra cứu dược liệu

| Mã | Chức năng | Mô tả | Vai trò | Mức |
|---|---|---|---|---|
| PROD-01 | Trang chủ | Băng-rôn quảng bá, danh mục dược liệu, sản phẩm nổi bật, chương trình khuyến mại | Khách | Cơ bản |
| PROD-02 | Danh mục dược liệu | Phân nhóm theo công dụng (bổ khí huyết, an thần, tiêu hoá, hô hấp…) hoặc theo dạng (tươi, khô, thái phiến, cao, trà túi lọc, tinh dầu) | Khách | Cơ bản |
| PROD-03 | Chi tiết sản phẩm | Ảnh nhiều góc, tên khoa học, bộ phận dùng, công dụng, cách dùng, liều lượng, **chống chỉ định & cảnh báo** (phụ nữ có thai, tương tác thuốc) | Khách | Cơ bản |
| PROD-04 | Truy xuất nguồn gốc lô | Quét/mở mã lô để xem: hộ trồng, vùng trồng, ngày thu hái, ngày sơ chế, hạn dùng, số phiếu kiểm nghiệm, chứng nhận (VietGAP/GACP-WHO/hữu cơ) | Khách | **Nâng cao — đặc thù dược liệu** |
| PROD-05 | Tìm kiếm | Tìm theo tên thường gọi, tên khoa học, công dụng; gợi ý từ khoá | Khách | Cơ bản |
| PROD-06 | Hiển thị tồn kho | Sản phẩm hết hàng vẫn hiển thị nhưng gắn nhãn "Hết hàng" và khoá nút mua; hiện "Còn lại X" khi tồn thấp | Khách | Cơ bản |
| PROD-07 | Sản phẩm liên quan | Gợi ý dược liệu cùng nhóm công dụng hoặc thường dùng phối hợp | Khách | Cơ bản |
| PROD-08 | Chia sẻ sản phẩm | Chia sẻ qua Zalo kèm ảnh và mã giới thiệu của CTV (nếu có) | Khách | Cơ bản |

### 1.3 Giỏ hàng & đặt hàng

| Mã | Chức năng | Mô tả | Vai trò | Mức |
|---|---|---|---|---|
| ORDER-01 | Thêm vào giỏ | Chọn số lượng theo đơn vị bán (gram, kg, hộp, gói, lọ); chặn vượt tồn khả dụng | Khách | Cơ bản |
| ORDER-02 | Đồng bộ giỏ hàng lên máy chủ | Giỏ hàng và mã giảm giá được lưu phía máy chủ để không mất khi đổi thiết bị; chạy ngầm, thất bại không chặn thanh toán | Khách | Nâng cao |
| ORDER-03 | Chọn hình thức nhận hàng | Giao tận nơi (ViettelPost / đội giao HTX) hoặc nhận tại điểm bán liên kết | Khách | Cơ bản |
| ORDER-04 | Sổ địa chỉ | Chọn Tỉnh/Huyện/Xã theo dữ liệu chuẩn ViettelPost; lưu địa chỉ mặc định | Khách | Cơ bản |
| ORDER-05 | Ước tính phí vận chuyển | Gọi API ViettelPost theo khối lượng, kích thước, quãng đường; tự chọn dịch vụ rẻ nhất; có phí phẳng dự phòng khi mất kết nối | Khách | Cơ bản |
| ORDER-06 | Áp dụng mã giảm giá | Xem danh sách mã khả dụng, kiểm tra điều kiện (giá trị tối thiểu, hạn dùng, số lần dùng) | Khách | Cơ bản |
| ORDER-07 | Ghi chú đơn hàng | Ghi chú cho HTX (yêu cầu đóng gói, thời gian nhận, hướng dẫn sử dụng…) | Khách | Cơ bản |
| ORDER-08 | Tạo đơn hàng | Lưu đơn, các dòng hàng và thông tin giao nhận; chống tạo trùng bằng khoá phân tán | Khách | Cơ bản |
| ORDER-09 | Thanh toán Zalo Pay | Ký MAC HMAC-SHA256 ở máy chủ → mở giao diện Zalo Pay → nhận kết quả qua sự kiện và webhook | Khách | Cơ bản |
| ORDER-10 | Thanh toán khi nhận (COD) | Ghi nhận đơn COD, bỏ qua bước cổng thanh toán | Khách | Cơ bản |
| ORDER-11 | Đối soát trạng thái thanh toán | Tác vụ nền kiểm tra lại với Zalo sau ~20 phút phòng khi webhook thất lạc | Khách | Nâng cao |
| ORDER-12 | Tự huỷ đơn chưa thanh toán | Đơn trực tuyến quá 30 phút chưa thanh toán sẽ tự huỷ, hoàn kho, trả lại mã giảm giá và huỷ vận đơn | Khách | Nâng cao |

### 1.4 Theo dõi đơn & sau bán

| Mã | Chức năng | Mô tả | Vai trò | Mức |
|---|---|---|---|---|
| ORDPRO-01 | Danh sách đơn theo tab | 5 tab: Chờ xác nhận · Đang chuẩn bị · Đang giao · Đã giao · Đã huỷ | Khách | Cơ bản |
| ORDPRO-02 | Chi tiết đơn | Dòng hàng, tổng tiền, giảm giá, phí ship, địa chỉ, phương thức thanh toán, **mã lô dược liệu đã giao** | Khách | Cơ bản |
| ORDPRO-03 | Theo dõi hành trình | Dòng thời gian trạng thái, đồng bộ từ webhook ViettelPost hoặc cập nhật của shipper nội bộ | Khách | Cơ bản |
| ORDPRO-04 | Khách tự huỷ đơn | Chỉ cho phép khi đơn chưa giao; bắt buộc chọn lý do, nếu chọn "Khác" phải nhập tối thiểu 5 ký tự | Khách | Cơ bản |
| ORDPRO-05 | Hoàn tiền | Tự động gọi API hoàn tiền Zalo Pay; hoặc hoàn thủ công (chuyển khoản/MoMo) với nhãn thời gian dự kiến rõ ràng | Khách | Nâng cao |
| ORDPRO-06 | Nhận thông báo OA | Tin nhắn Zalo OA khi đơn đổi trạng thái quan trọng | Khách | Cơ bản |
| ORDPRO-07 | Đặt lại đơn cũ | Thêm nhanh toàn bộ dòng hàng của đơn cũ vào giỏ | Khách | Cơ bản |
| ORDPRO-08 | Đánh giá sản phẩm | Chấm sao và nhận xét sau khi đơn ở trạng thái Đã giao | Khách | Cơ bản |

### 1.5 Cộng tác viên giới thiệu

| Mã | Chức năng | Mô tả | Vai trò | Mức |
|---|---|---|---|---|
| AFF-01 | Đăng ký cộng tác viên | Khách đăng ký, hệ thống cấp mã giới thiệu riêng | Khách | Cơ bản |
| AFF-02 | Liên kết & mã QR giới thiệu | Sinh liên kết sâu và mã QR; mã được ghi nhận theo nguyên tắc "ai đến trước tính trước", mỗi phiên chỉ áp một lần | Khách | Nâng cao |
| AFF-03 | Ghi nhận hoa hồng | Chỉ tính khi đơn **giao thành công** (áp dụng cho cả đơn COD) | Khách | Nâng cao |
| AFF-04 | Thông tin nhận tiền | Khai báo ngân hàng, số tài khoản, chủ tài khoản; khoá sửa khi đang có kỳ chi trả | Khách | Cơ bản |
| AFF-05 | Sổ hoa hồng & lịch sử giới thiệu | Danh sách hoa hồng, tổng chờ chi trả, danh sách khách đã giới thiệu (che bớt thông tin cá nhân) | Khách | Cơ bản |

---

## 2. Nhóm chức năng THÀNH VIÊN HTX (Cổng thành viên)

### 2.1 Gia nhập & phân quyền

| Mã | Chức năng | Mô tả | Vai trò | Mức |
|---|---|---|---|---|
| ROLE-01 | Đăng ký gia nhập HTX | Hộ trồng nộp hồ sơ: tên hộ, vùng trồng, diện tích, chủng loại dược liệu, chứng nhận GACP/VietGAP | Khách | Cơ bản |
| ROLE-02 | Trạng thái chờ duyệt | Màn hình riêng cho hồ sơ đã nộp nhưng chưa được Ban quản trị duyệt | Khách | Cơ bản |
| ROLE-03 | Cổng chỉ dành cho thành viên | Kiểm tra quyền ở **mọi lượt gọi API** (đọc lại từ cơ sở dữ liệu, không tin vào token) — cho phép Ban quản trị đình chỉ ngay lập tức | Thành viên | Cơ bản |
| ROLE-04 | Bốn vai trò nội bộ | **Chủ hộ/Tổ trưởng** · **Quản trị viên HTX** · **Nhân viên sơ chế – đóng gói** · **Nhân viên giao hàng** | Thành viên | Cơ bản |
| ROLE-05 | Đình chỉ thành viên | Thành viên bị tạm ngưng nhận một thông báo thống nhất và bị chặn mọi thao tác ghi | Ban quản trị | Nâng cao |
| ROLE-06 | Quản lý nhân sự tổ | Chủ hộ/Tổ trưởng xem danh sách thành viên trong tổ và phân công công việc | Chủ hộ | Nâng cao |

### 2.2 Vùng trồng & lô dược liệu

| Mã | Chức năng | Mô tả | Vai trò | Mức |
|---|---|---|---|---|
| STOCK-01 | Hồ sơ vùng trồng | Tên hộ/tổ, mã vùng trồng, toạ độ, diện tích, ảnh đại diện, mô tả, chứng nhận | Chủ hộ | Cơ bản |
| STOCK-02 | Khai báo lô thu hái | Nhập: sản phẩm, ngày thu hái, khối lượng tươi, giá vốn, hạn dùng, ghi chú | Chủ hộ | Cơ bản |
| STOCK-03 | Thuộc tính đặc thù dược liệu | Bổ sung cho mỗi lô: bộ phận dùng, dạng sơ chế (tươi/khô/thái phiến/sao tẩm), độ ẩm sau sấy, tỷ lệ hao hụt tươi→khô, hàm lượng hoạt chất, số phiếu kiểm nghiệm, đơn vị kiểm nghiệm | Chủ hộ | **Nâng cao — đặc thù** |
| STOCK-04 | Gợi ý sản lượng cần nhập | Dựa trên trung bình bán 7 ngày, giá, và cảnh báo mặt hàng cháy hàng | Chủ hộ | Nâng cao |
| STOCK-05 | Khai báo nhiều mặt hàng một lần | Nhập hàng loạt nhiều mã hàng trong một phiên (đầu buổi giao nguyên liệu) | Chủ hộ | Cơ bản |
| STOCK-06 | Xuất kho theo hạn dùng gần nhất (FEFO) | Hệ thống tự phân bổ đơn vào lô có hạn dùng sớm nhất — **bắt buộc với dược liệu** | Hệ thống | Nâng cao |
| STOCK-07 | Đóng / thu hồi / hết hạn lô | Đánh dấu lô hết hàng, hết hạn, hoặc **thu hồi** khi phát hiện vấn đề chất lượng; lô đã đóng không tham gia phân bổ | Chủ hộ | Nâng cao |
| STOCK-08 | Sổ cái nhập – xuất – tồn | Toàn bộ biến động kho có nhật ký: nhập, bán, hoàn, điều chỉnh, huỷ; truy vết được người thao tác | Chủ hộ | Cơ bản |
| STOCK-09 | Trừ kho & hoàn kho tự động | Trừ kho khi thanh toán thành công; hoàn kho khi huỷ đơn hoặc hoàn hàng | Hệ thống | Nâng cao |
| STOCK-10 | Cảnh báo sắp hết hạn | Thông báo cho chủ hộ và Ban quản trị khi lô còn dưới N ngày hạn dùng | Hệ thống | **Nâng cao — đặc thù** |

### 2.3 Xưởng sơ chế – đóng gói tập trung

| Mã | Chức năng | Mô tả | Vai trò | Mức |
|---|---|---|---|---|
| PACK-01 | Danh sách đơn đến | Đơn cần xử lý, kèm hai nhãn trạng thái độc lập: trạng thái đơn và trạng thái phân công đóng gói | Quản trị viên | Cơ bản |
| PACK-02 | Xác nhận đơn | Chuyển đơn từ *Chờ xác nhận* sang *Đã xác nhận* | Quản trị viên | Cơ bản |
| PACK-03 | Nhận việc / Phân công | Nhân viên tự nhận phiếu, hoặc quản trị viên phân công cho người cụ thể | Nhân viên sơ chế | Cơ bản |
| PACK-04 | Bắt đầu sơ chế – đóng gói | Chuyển phiếu sang trạng thái *Đang đóng gói*; hiển thị danh sách cần lấy theo lô (FEFO) | Nhân viên sơ chế | Cơ bản |
| PACK-05 | Xác nhận đóng gói xong | Chốt lô thực xuất, in/dán tem truy xuất nguồn gốc kèm mã lô | Nhân viên sơ chế | Cơ bản |
| PACK-06 | Bàn giao vận chuyển ngoài | Chuyển giao ViettelPost, tự tạo vận đơn và mã theo dõi | Quản trị viên | Cơ bản |
| PACK-07 | Bàn giao giao hàng nội bộ | Giao cho đội xe của HTX; hệ thống không tạo vận đơn ViettelPost | Quản trị viên | Cơ bản |
| PACK-08 | Nhật ký thao tác đóng gói | Mọi chuyển trạng thái đều được ghi nhật ký: ai, lúc nào, từ trạng thái nào sang trạng thái nào | Hệ thống | Nâng cao |
| PACK-09 | Ràng buộc chuyển trạng thái | Chặn thao tác sai quy trình (ví dụ phân công lại phiếu đã đóng gói xong) với thông báo tiếng Việt rõ ràng | Hệ thống | Nâng cao |
| PACK-10 | Che thông tin cá nhân khách | Nhân viên chỉ thấy phần thông tin cần thiết; số điện thoại và địa chỉ được che bớt | Nhân viên | Nâng cao |

### 2.4 Giao hàng nội bộ

| Mã | Chức năng | Mô tả | Vai trò | Mức |
|---|---|---|---|---|
| SHIP-01 | Danh sách chuyến giao | Nhân viên giao hàng xem các đơn được phân công | NV giao hàng | Cơ bản |
| SHIP-02 | Nhận hàng đi giao | Đánh dấu đã lấy hàng tại xưởng, đơn chuyển sang *Đang giao* | NV giao hàng | Cơ bản |
| SHIP-03 | Xác nhận đã giao | Đánh dấu giao thành công; kích hoạt tính hoa hồng CTV và chốt doanh thu | NV giao hàng | Cơ bản |
| SHIP-04 | Chỉ thao tác trên đơn của mình | Nhân viên chỉ được xử lý đơn đã phân công cho mình; quản trị viên thao tác được mọi đơn | Hệ thống | Nâng cao |

### 2.5 Báo cáo & thanh toán cho thành viên

| Mã | Chức năng | Mô tả | Vai trò | Mức |
|---|---|---|---|---|
| HUB-01 | Bảng điều khiển | Đã đặt hôm nay · Đã giao hôm nay · Doanh thu · Tồn kho · Đơn chờ xử lý (tự động làm mới 30 giây, tạm dừng khi ứng dụng chạy nền) | Chủ hộ | Cơ bản |
| HUB-02 | Phân tích kinh doanh | Doanh thu theo thời gian, mặt hàng bán chạy, tỷ lệ huỷ, vòng quay tồn kho; dữ liệu lịch sử chốt hằng ngày lúc 23:30 | Chủ hộ | Nâng cao |
| HUB-03 | Sản phẩm bán hôm nay | Chi tiết từng mã hàng đã bán trong ngày kèm lô xuất | Chủ hộ | Cơ bản |
| PAY-01 | Bảng kê thanh toán | Kỳ thanh toán, doanh thu, tỷ lệ chiết khấu HTX, số thực nhận | **Chỉ Chủ hộ** | Cơ bản |
| PAY-02 | Chi tiết kỳ thanh toán | Bóc tách theo từng đơn/lô, kèm ảnh chứng từ chuyển khoản | **Chỉ Chủ hộ** | Cơ bản |
| PAY-03 | Thông tin ngân hàng nhận tiền | Khai báo và cập nhật tài khoản nhận thanh toán của hộ | Chủ hộ | Cơ bản |

---

## 3. Nhóm chức năng BAN QUẢN TRỊ HTX

| Mã | Chức năng | Mô tả | Mức |
|---|---|---|---|
| ADM-01 | Quản lý danh mục & sản phẩm | Tạo/sửa dược liệu: tên, tên khoa học, danh mục, đơn vị tính, ảnh, kích thước & khối lượng (phục vụ tính phí ship), công dụng, cảnh báo | Cơ bản |
| ADM-02 | Duyệt hồ sơ thành viên | Xét duyệt / từ chối hồ sơ gia nhập HTX; gán vai trò và vùng trồng | Cơ bản |
| ADM-03 | Chỉ định xưởng sơ chế tập trung | Đánh dấu cơ sở nào là xưởng đóng gói; các vùng trồng khác chỉ xem, không thao tác ghi | Nâng cao |
| ADM-04 | Quản lý đơn hàng | Cập nhật trạng thái đơn, chặn lùi trạng thái, chặn huỷ đơn đã giao | Cơ bản |
| ADM-05 | Xác nhận hoàn tiền thủ công | Ghi nhận đã hoàn tiền cho các đơn không hoàn tự động được | Nâng cao |
| ADM-06 | Quản trị kho tổng | Xem toàn bộ tồn kho, cảnh báo tồn thấp, nhập & điều chỉnh kho, xem sổ biến động | Cơ bản |
| ADM-07 | Quản lý mã giảm giá | Tạo mã, đặt điều kiện áp dụng, hạn dùng, giới hạn số lần | Cơ bản |
| ADM-08 | Duyệt & chi trả hoa hồng CTV | Duyệt/từ chối CTV, chi trả theo thứ tự vào trước – ra trước, bật/tắt cấu hình hoa hồng | Cơ bản |
| ADM-09 | Quản lý điểm bán liên kết | Danh sách nhà thuốc/điểm bán nhận hàng, kèm địa chỉ chuẩn ViettelPost | Cơ bản |
| ADM-10 | Quản lý băng-rôn & nội dung | Băng-rôn trang chủ, bài viết giới thiệu dược liệu, chính sách | Cơ bản |
| ADM-11 | Quản lý hồ sơ chất lượng | Tải lên phiếu kiểm nghiệm, chứng nhận GACP-WHO/VietGAP/hữu cơ, gắn vào vùng trồng hoặc lô | **Nâng cao — đặc thù** |
| ADM-12 | Thu hồi lô sản phẩm | Đánh dấu thu hồi một lô, truy ngược danh sách đơn hàng đã giao lô đó, gửi thông báo cho khách | **Nâng cao — đặc thù** |

---

## 4. Chức năng nền tảng (chạy ngầm)

| Mã | Chức năng | Mô tả | Chu kỳ |
|---|---|---|---|
| SYS-01 | Tự huỷ đơn treo | Huỷ đơn trực tuyến thanh toán thất bại hoặc treo quá 30 phút; hoàn kho, trả mã giảm giá, huỷ vận đơn | 5 phút |
| SYS-02 | Đối soát thanh toán | Kiểm tra lại trạng thái giao dịch với Zalo Pay | Sau ~20 phút kể từ khi tạo |
| SYS-03 | Thử lại huỷ vận đơn | Huỷ lại các vận đơn ViettelPost chưa huỷ được | 30 phút |
| SYS-04 | Chốt số liệu ngày | Chụp số liệu doanh thu/tồn kho từng vùng trồng phục vụ báo cáo lịch sử | 23:30 hằng ngày |
| SYS-05 | Đồng bộ danh mục địa chỉ | Cập nhật Tỉnh/Huyện/Xã từ ViettelPost | Theo yêu cầu |
| SYS-06 | Làm mới token vận chuyển | Gia hạn token ViettelPost | Hằng tuần |
| SYS-07 | Hàng đợi thông báo OA | Gửi tin nhắn Zalo OA bất đồng bộ, có thử lại khi lỗi | Liên tục |
| SYS-08 | Quét lô sắp hết hạn | Cảnh báo lô dược liệu gần hạn dùng cho chủ hộ và Ban quản trị | Hằng ngày |

---

## 5. Mô hình trạng thái

### 5.1 Trạng thái đơn hàng

| Hệ thống lưu | Khách nhìn thấy |
|---|---|
| `pending` | Chờ xác nhận |
| `confirmed`, `preparing` | Đang chuẩn bị |
| `delivering` | Đang giao |
| `delivered` | Đã giao |
| `cancelled` | Đã huỷ |

### 5.2 Trạng thái phiếu sơ chế – đóng gói

`Chưa phân công → Đã phân công → Đang đóng gói → Đã đóng gói → Bàn giao vận chuyển`

*Đây là trục trạng thái độc lập với trạng thái đơn hàng — một đơn mang đồng thời hai nhãn.*

### 5.3 Trạng thái lô dược liệu

`Đang hiệu lực (active) → Hết hàng (depleted) | Hết hạn (expired) | Thu hồi (recalled)`

*Chỉ lô `active` mới tham gia phân bổ đơn hàng và tính vào báo cáo tồn kho.*

---

## 6. Khác biệt trọng yếu so với hệ thống nông sản gốc

| # | Nội dung | Lý do |
|---|---|---|
| 1 | **Truy xuất nguồn gốc theo lô là bắt buộc** — mỗi đơn ghi rõ lô đã xuất, khách tra cứu được | Yêu cầu pháp lý và niềm tin đối với dược liệu |
| 2 | **Hồ sơ kiểm nghiệm & chứng nhận** gắn với vùng trồng và lô | Tuân thủ GACP-WHO / VietGAP |
| 3 | **Cảnh báo & chống chỉ định** hiển thị bắt buộc trên trang sản phẩm | An toàn người dùng, tránh tương tác thuốc |
| 4 | **FEFO là bắt buộc**, không phải tuỳ chọn | Dược liệu suy giảm hoạt chất theo thời gian |
| 5 | **Quy trình thu hồi lô** với khả năng truy ngược đơn đã giao | Xử lý sự cố chất lượng |
| 6 | **Theo dõi hao hụt tươi → khô** trong khâu sơ chế | Tính đúng giá vốn và sản lượng thực |
| 7 | **Ghi nhận độ ẩm và hàm lượng hoạt chất** cho từng lô | Chỉ tiêu chất lượng đặc thù dược liệu |

---

## 7. Lộ trình triển khai gợi ý

| Giai đoạn | Phạm vi | Thời lượng ước tính |
|---|---|---|
| **1 — Nền tảng bán hàng** | Xác thực, danh mục, sản phẩm, giỏ hàng, đặt hàng, Zalo Pay, theo dõi đơn, thông báo OA | 6–8 tuần |
| **2 — Cổng thành viên HTX** | Gia nhập, phân quyền, khai báo lô, quản lý tồn kho, bảng điều khiển | 4–6 tuần |
| **3 — Sơ chế & vận chuyển** | Quy trình đóng gói, phân công, ViettelPost, giao hàng nội bộ | 4–5 tuần |
| **4 — Đặc thù dược liệu** | Truy xuất nguồn gốc, hồ sơ kiểm nghiệm, cảnh báo hạn dùng, thu hồi lô | 3–4 tuần |
| **5 — Mở rộng** | Cộng tác viên, mã giảm giá, phân tích nâng cao, thanh toán cho thành viên | 3–4 tuần |
