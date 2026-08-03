# Báo cáo sửa Master Template & Independent Copy

## 1. Cơ chế mẫu chính và mẫu phụ

- Đổi cách hiển thị ngôi sao thành nhãn rõ ràng: **Mẫu chính** và **Mẫu phụ**.
- Mỗi mã mẫu `mau01` đến `mau05` có thể chọn một đơn làm **Mẫu chính**.
- Khi tạo đơn mới bằng mã mẫu đó, hệ thống thực hiện **Template Cloning / Template Instantiation**:
  - Sao chép độc lập toàn bộ cài đặt thiết kế đang lưu.
  - Sao chép ảnh và nhạc thành file vật lý mới trong thư mục của đơn mới.
  - Lưu `template_source_order_id` để biết bản phụ được tạo từ mẫu chính nào.
  - Dữ liệu khách mới như tên cô dâu/chú rể, ngày cưới, địa chỉ, phụ huynh và ghi chú không bị lấy từ đơn cũ.
  - Dữ liệu khách nhập lúc tạo đơn có quyền ghi đè phần tương ứng của bản sao.
- Chỉnh sửa hoặc xóa file của bản phụ không làm thay đổi dữ liệu/file của mẫu chính.
- File ZIP mới được tạo riêng, không ghi đè file người dùng đã gửi.

## 2. Sửa khu vực intro và khung chỉnh sửa

- Chuẩn hóa intro cho cả 5 mẫu, dùng đủ chiều rộng của khung xem.
- Không còn ép text xuống dòng hoặc cắt mất tên dài.
- Tên cô dâu/chú rể được đo lại sau khi font tải xong và tự co theo chiều ngang khi cần.
- Giữ text trên một dòng, bỏ `clip-path` gây cắt chữ ở intro.
- Khung intro trong Designer chuyển thành section bình thường, không còn `fixed` phủ iframe.
- Khung chỉnh sửa giữ đúng kích thước, không bị khác tỷ lệ so với trang khách xem.
- Thêm chế độ xem nhanh **Laptop** và **Điện thoại** trong Designer.

## 3. Font chữ

Danh sách font được mở rộng lên 13 lựa chọn:

- Allura
- Cormorant Garamond
- Great Vibes
- Imperial Script
- Italiana
- Montserrat
- Playfair Display
- Georgia
- Times New Roman
- Arial
- Trebuchet MS
- Verdana
- Tahoma

Font được đồng bộ ở model, form Designer, CSS sinh động và JavaScript chỉnh chữ trực tiếp.

## 4. Sửa phần khách xem của 5 mẫu

- Gỡ giới hạn `max-width: 560px` ở trang khách xem.
- `.invite-shell` và `.invitation` dùng toàn bộ chiều rộng khả dụng.
- Chặn tràn ngang nhưng vẫn giữ nội dung intro đầy đủ.
- Intro có vùng cuộn dọc an toàn trên màn hình thấp, không làm mất phần text/nút mở thư.
- Giữ spacing riêng của từng mẫu thay vì dùng CSS chung ghi đè line-height và khoảng cách.
- Ảnh vẫn nằm trong khung cố định và giữ trạng thái kéo/zoom/contain/cover.

## 5. Kiểm tra đã chạy

- Python: compile toàn bộ project thành công.
- JavaScript: kiểm tra cú pháp toàn bộ file `.js` thành công.
- Deep clone độc lập: settings, ảnh và nhạc được sao chép sang đường dẫn mới; sửa bản phụ không đổi mẫu chính.
- Dashboard: hiển thị đúng nhãn Mẫu chính/Mẫu phụ, không còn nút ngôi sao cũ.
- Designer detail: có nút Laptop/Điện thoại và vai trò mẫu.
- Public preview: `mau01` đến `mau05` đều trả HTTP 200.
- Kiểm tra trình duyệt headless ở 390px và 760px:
  - Cả 5 mẫu không tràn ngang.
  - Tên dài vẫn nằm trong vùng intro.
  - Public view và Designer view đều đạt.
