# Báo cáo sửa khung ảnh, zoom và trang chọn mẫu

## Lỗi người dùng phản ánh

Ảnh QR trong hình chỉ là ảnh dùng để kiểm tra. Lỗi cốt lõi không nằm ở QR mà nằm ở cơ chế chỉnh ảnh:

- Khi phóng to, cả vùng chứa hoặc đường viền chọn bị phóng theo ảnh.
- Khung ảnh không giữ nguyên kích thước nên ảnh tràn và che nội dung xung quanh.
- Một ảnh được dùng nhiều lần trong mẫu có thể cùng nhảy hoặc cùng nhận một tọa độ.
- Bấm vào ảnh dễ mở hộp thay ảnh ngoài ý muốn.
- Trang chọn mẫu lúc hiện ảnh minh họa, lúc hiện preview thật; preview nhỏ, mờ và khó kéo xem.

## Cách sửa cốt lõi

### 1. Tách khung cố định và ảnh có thể zoom

Mỗi ảnh chỉnh sửa hiện có hai lớp độc lập:

- **Khung ảnh:** giữ nguyên chiều rộng, chiều cao và vị trí; luôn cắt phần ảnh tràn bằng `overflow: hidden`.
- **Ảnh bên trong:** chỉ lớp này nhận thao tác kéo, phóng to, thu nhỏ và `cover/contain`.

Đường viền xanh được đặt lên khung thay vì đặt lên ảnh. Vì vậy khi zoom, đường viền và kích thước khung không phóng theo.

Hai vùng collage đặc biệt của Mẫu 01 trước đây đặt ảnh trực tiếp bằng kích thước tự do đã được bọc trong khung riêng có kích thước cố định.

### 2. Mỗi lần xuất hiện của ảnh có tọa độ riêng

Một file ảnh có thể xuất hiện nhiều lần trong cùng mẫu. Bản mới tách thành:

- `photo0`: file ảnh được tải lên.
- `photo0`, `photo0__2`, `photo0__3`...: từng vị trí xuất hiện của file đó.

Thay file ảnh vẫn cập nhật tất cả nơi dùng chung `photo0`, nhưng kéo hoặc zoom một vị trí chỉ thay tọa độ của chính vị trí đó. Không còn kéo một ảnh mà các ảnh lặp cùng nhảy.

### 3. Sửa thao tác chuột và cảm ứng

- Bấm một lần: chỉ chọn ảnh.
- Giữ chuột rồi kéo: canh ảnh bên trong khung.
- Lăn con lăn: chỉ zoom ảnh đang chọn.
- Bấm đúp hoặc dùng nút **Thay ảnh đang chọn**: mở hộp chọn file.
- Chỉ lưu tọa độ sau khi thả chuột hoặc dừng zoom.
- Nếu thao tác bị hủy, ảnh quay lại trạng thái trước khi kéo.
- Bỏ qua ngón tay thứ hai và sự kiện con trỏ không thuộc thao tác hiện tại.

### 4. Lưu trạng thái ổn định hơn

- Tọa độ mới được lưu theo phần trăm kích thước khung, không phụ thuộc độ rộng màn hình.
- Zoom được giới hạn trong khoảng an toàn.
- Server kiểm tra lại `x`, `y`, `zoom`, `fit` và đơn vị trước khi lưu.
- Khi thay file ảnh, toàn bộ tọa độ cũ của file đó được xóa để không mang vị trí sai sang ảnh mới.
- Đổi mẫu xóa trạng thái khung ảnh của mẫu trước.

### 5. Sửa trang chọn mẫu

- Xóa toàn bộ ảnh thumbnail minh họa mặc định.
- Năm card hiển thị trực tiếp nội dung thiệp thật bằng iframe.
- Preview không dùng `blur`, opacity thấp hoặc ảnh phủ bên trên.
- Card được mở rộng, giữ cùng một hàng ở desktop.
- Màn hình hẹp dùng hàng cuộn ngang thay vì ép năm card nhỏ lại.
- Giữ chuột và kéo dọc trên preview để xem phần bên trong.
- Rê chuột lên card sẽ tự cuộn nhẹ; tại một thời điểm chỉ một card tự chạy để giảm tải.

## Các phần khác đã kiểm tra

- Giữ đúng 5 mẫu `mau01` đến `mau05`.
- Mẫu 06–10 không còn trong danh mục và URL preview trả về 404.
- Hiệu ứng chỉ tạm dừng trong iframe Designer để ảnh không chuyển động khi chỉnh; thiệp khách xem vẫn giữ hiệu ứng.
- Tên class quản trị không còn đè lên `.top`, `.hero`, `.btn` của từng mẫu.
- Form không còn tự cuộn lại sau mỗi ký tự.
- Nút **Tải lại** tự lưu trước khi tải lại preview.
- Đăng nhập, tạo đơn, tự lưu, thay ảnh, đổi mẫu và render preview đã được kiểm tra.
- Database cuối không chứa đơn hoặc ảnh kiểm thử.

## Kết quả kiểm tra kỹ thuật

- Python compile: đạt.
- Toàn bộ JavaScript syntax check: đạt.
- Toàn bộ CSS parse: không phát hiện lỗi cú pháp.
- Năm preview: HTTP 200.
- Mẫu 06: HTTP 404 như mong đợi.
- Trang chọn mẫu có đúng 5 iframe preview thật và không còn thumbnail mặc định.
- Tài nguyên CSS, JavaScript và ảnh nội bộ được quét không có đường dẫn lỗi trong các trang đã kiểm tra.
- Trạng thái hai vị trí dùng cùng một ảnh được lưu độc lập và render lại đúng.
- File ZIP cuối được kiểm tra tính toàn vẹn sau khi đóng gói.

## Lưu ý khi thay bản

Xóa thư mục bản cũ, giải nén bản mới rồi chạy `CHAY_NGAY.bat`. Trên tab trình duyệt đang mở, bấm `Ctrl + F5` một lần để bỏ JavaScript và CSS cũ trong bộ nhớ đệm.

Bản này xử lý các lỗi tái hiện được trong ảnh chụp và các luồng chỉnh ảnh đã kiểm tra. Không nên hiểu là cam kết website sẽ không bao giờ phát sinh lỗi trên mọi trình duyệt hoặc thiết bị chưa được thử.
