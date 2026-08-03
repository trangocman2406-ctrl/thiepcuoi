# Thiệp Cưới Nhà Yến — bản sửa khung ảnh cố định

## Chạy web

Trên Windows, mở `CHAY_NGAY.bat`.

Hoặc mở Terminal tại thư mục dự án và chạy:

```bash
python app.py
```

Sau đó mở:

- Trang web: `http://127.0.0.1:8000`
- Khu Designer: `http://127.0.0.1:8000/designer`
- Tài khoản thử: `designer`
- Mật khẩu thử: `designer123`

## Cách chỉnh ảnh

- Bấm một lần vào ảnh để chọn đúng khung đó.
- Giữ chuột và kéo để dịch chuyển ảnh **bên trong khung cố định**.
- Lăn con lăn trên ảnh để phóng to hoặc thu nhỏ ảnh bên trong; khung không thay đổi kích thước.
- Bấm đúp vào ảnh hoặc bấm **Thay ảnh đang chọn** để chọn file khác.
- **Đưa về giữa** trả tọa độ và zoom về mặc định.
- **Đổi cover/contain** chuyển cách ảnh lấp đầy khung.
- Bấm thumbnail ở cột bên phải chỉ để chọn vị trí ảnh, không tự thay ảnh và không tự đổi kiểu hiển thị.

Khi một file ảnh xuất hiện nhiều lần trong mẫu, mỗi vị trí có thể kéo và zoom riêng. Thay file ảnh vẫn thay đồng thời tất cả vị trí đang dùng file đó.

Hiệu ứng được tạm dừng trong khung Designer để chỉnh ảnh ổn định. Link thiệp khách xem vẫn chạy hiệu ứng bình thường.

## Trang chọn mẫu

- Xóa các ảnh minh họa mặc định; card hiển thị trực tiếp thiệp thật.
- Desktop hiển thị năm mẫu trên cùng một hàng.
- Giữ chuột và kéo dọc trong khung để xem nội dung bên trong.
- Rê chuột lên card để preview tự cuộn nhẹ.
- Màn hình hẹp cuộn ngang cả hàng mẫu thay vì thu nhỏ card quá mức.

## File chính

- `static/js/designer-preview.js`: chọn khung, kéo, zoom và thay ảnh trong iframe.
- `static/js/designer-edit.js`: đồng bộ form, trạng thái ảnh và tự lưu.
- `static/js/template-gallery.js`: preview thật và kéo xem mẫu ở trang chọn mẫu.
- `routes/templates.py`: nhận diện từng lần xuất hiện của ảnh và tạo khung chỉnh riêng.
- `models.py`: kiểm tra, lưu và khôi phục trạng thái từng vị trí ảnh.
- `templates/mau01` đến `templates/mau05`: năm mẫu thiệp được giữ lại.

Database được tạo và nâng cấp tự động khi chạy `app.py`; không cần chạy SQL riêng.

Sau khi thay bản mới, xóa thư mục cũ rồi giải nén lại. Nếu trình duyệt vẫn hiện giao diện cũ, bấm `Ctrl + F5`.

## Mẫu chính và bản sao độc lập

- Trong Dashboard, chọn **Đặt làm mẫu chính** cho đơn muốn dùng làm nguồn thiết kế.
- Khi tạo đơn mới cùng mã mẫu, hệ thống deep clone bố cục, font, trạng thái ảnh, ảnh và nhạc sang một bản phụ độc lập.
- Mỗi bản phụ có file và settings riêng; chỉnh bản phụ không làm thay đổi mẫu chính.
- Dashboard hiển thị nhãn **Mẫu chính** hoặc **Mẫu phụ** thay cho biểu tượng ngôi sao.
- Khung Designer có hai chế độ xem **Laptop** và **Điện thoại**.

Chi tiết kỹ thuật và kết quả kiểm tra nằm trong `BAO_CAO_FIX_MASTER_TEMPLATE_INDEPENDENT_COPY.md`.

## Hệ thống tài khoản, ví và phân quyền

Bản này đã dùng **một trang đăng nhập chung** tại:

- `http://127.0.0.1:8000/login`
- Khách hàng đăng ký tại `http://127.0.0.1:8000/register`
- Tài khoản khách: `http://127.0.0.1:8000/account`
- Khu thiết kế: `http://127.0.0.1:8000/designer`
- Khu Admin: `http://127.0.0.1:8000/admin`

Sau khi đăng nhập, hệ thống tự chuyển theo vai trò:

- `customer`: hồ sơ, địa chỉ đầy đủ, số dư, nạp tiền, lịch sử ví, đơn thiệp.
- `designer`: danh sách đơn và toàn bộ khu chỉnh sửa 5 mẫu.
- `admin`: duyệt/từ chối yêu cầu nạp tiền, xem biên lai, cộng/trừ số dư và mở khu thiết kế.

### Tài khoản có sẵn để chạy thử

- Designer: `designer` / `designer123`
- Admin 1: `admin1` / `8520963`
- Admin 2: `admin02` / `9638520741`
- Khách hàng: tự đăng ký ở `/register`.

Các mật khẩu trên chỉ phù hợp để chạy thử nội bộ. Khi đưa web lên Internet cần đổi mật khẩu mặc định và chạy sau HTTPS.

### Quy trình nạp tiền

1. Khách đăng nhập, mở icon người bên trái hoặc vào `/account`.
2. Chọn **Nạp tiền**, chuyển khoản theo thông tin hiển thị.
3. Khách nhập số tiền, tên người chuyển, mã giao dịch và có thể tải ảnh biên lai.
4. Admin mở `/admin`, kiểm tra rồi bấm **Duyệt & cộng tiền** hoặc **Từ chối**.
5. Khi duyệt, hệ thống dùng giao dịch SQLite nguyên khối để vừa đổi trạng thái vừa cộng số dư, tránh cộng lặp.
6. Số tiền và lịch sử giao dịch hiện ngay trong khu tài khoản khách.

### Đổi thông tin nhận chuyển khoản

Mở `config.py` và chỉnh các biến:

- `PAYMENT_BANK_NAME`
- `PAYMENT_ACCOUNT_NUMBER`
- `PAYMENT_ACCOUNT_HOLDER`
- `PAYMENT_BRANCH`

Cũng có thể truyền các biến môi trường cùng tên khi chạy máy chủ.

### Dữ liệu mới trong SQLite

- `users`: thêm họ tên, email, điện thoại, địa chỉ, số dư, trạng thái.
- `auth_sessions`: phiên đăng nhập lưu trong database, không mất khi server khởi động lại.
- `topup_requests`: yêu cầu nạp tiền và trạng thái Admin duyệt.
- `wallet_transactions`: lịch sử tăng/giảm số dư.
- `orders.user_id`: liên kết đơn được gửi khi khách đang đăng nhập.

Database cũ được tự nâng cấp khi chạy `python app.py`; không cần chạy câu lệnh SQL thủ công.
