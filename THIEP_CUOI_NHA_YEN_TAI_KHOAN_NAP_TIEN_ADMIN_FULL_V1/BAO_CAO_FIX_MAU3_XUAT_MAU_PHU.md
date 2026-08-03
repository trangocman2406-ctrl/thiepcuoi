# Báo cáo sửa mẫu 03 và luồng xuất Mẫu chính

## 1. Mẫu 03 không chỉnh sửa được

Đã sửa theo hướng không phụ thuộc vào CSS `:has(...)` hoặc việc JavaScript tự đoán iframe:

- Server gắn trực tiếp `is-editor-preview`, `is-content-visible` và `data-editor="true"` cho khung chỉnh sửa.
- Mở khóa `pointer-events`, `visibility`, `opacity` của body và intro mẫu 03.
- Tắt reveal/transition trong khu chỉnh sửa để chữ và ảnh luôn bấm được.
- Các vùng `contenteditable` được ưu tiên nhận chuột và chọn chữ.
- Tăng phiên bản cache CSS/JS để trình duyệt không giữ file cũ.

Kết quả kiểm tra: mẫu 03 tạo được 55 vùng chữ chỉnh trực tiếp, không còn placeholder chưa render.

## 2. Xuất Mẫu chính phải tạo Mẫu phụ

Luồng mới:

1. Mẫu chính chỉ là nguồn thiết kế.
2. Khi bấm **Tạo mẫu phụ + Xuất link + QR**, hệ thống deep clone thành một đơn mới.
3. Mã bản sao tự sinh theo dạng `MA-DON-COPY-01`, `MA-DON-COPY-02`...
4. Link và QR chỉ được tạo cho Mẫu phụ mới.
5. Mẫu chính không đổi trạng thái, không bị ghi đè link và không nhận lời chúc của bản phụ.
6. Chỉnh hoặc xóa Mẫu phụ không ảnh hưởng Mẫu chính.

Bản sao có dữ liệu độc lập gồm:

- Nội dung và thông tin thiệp.
- Toàn bộ cài đặt font, màu, vị trí chữ, zoom và vị trí ảnh.
- File ảnh và nhạc được sao chép sang đường dẫn riêng.
- Không sao chép link thiệp cũ hoặc lời chúc cũ.

## 3. Sửa thêm

- Khung Link demo của Mẫu chính không còn hiển thị link cũ gây nhầm lẫn.
- Sửa phản hồi đăng nhập/đăng xuất HTTP/1.1 bị treo do thiếu `Content-Length`.

## 4. Kiểm tra kỹ thuật

- Python: hợp lệ toàn bộ file chính và routes.
- JavaScript: hợp lệ cho editor, preview, dashboard, invitation và mẫu 03.
- Render chế độ xem/chỉnh: đạt cho cả 5 mẫu.
- Deep clone ảnh/nhạc: đường dẫn và file độc lập.
- Luồng thật qua server: đăng nhập → xuất Mẫu chính → chuyển sang ID Mẫu phụ mới → có link/QR.
