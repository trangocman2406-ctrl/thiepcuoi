# BÁO CÁO BỔ SUNG TÀI KHOẢN – NẠP TIỀN – ADMIN

## 1. Chức năng đã hoàn thành

- Thêm icon người cố định ở mép trái trên toàn bộ website.
- Khi chưa đăng nhập: icon hiển thị Đăng nhập và Đăng ký.
- Khi đã đăng nhập: icon hiển thị tên, vai trò, số dư khách và đường dẫn đúng khu vực.
- Đổi mục “Designer” ngoài trang khách thành “Đăng nhập”.
- Dùng chung một màn đăng nhập cho khách hàng, Designer và Admin.
- Tự chuyển trang dựa theo vai trò sau đăng nhập.
- Khách hàng có thể đăng ký, cập nhật họ tên, số điện thoại, email, địa chỉ đầy đủ và đổi mật khẩu.
- Khách hàng có ví, số dư, lịch sử giao dịch, lịch sử yêu cầu nạp và danh sách đơn thiệp.
- Khi khách đăng nhập rồi gửi yêu cầu làm thiệp, đơn tự liên kết với tài khoản khách.
- Khách gửi yêu cầu nạp tiền kèm số tiền, người chuyển, mã giao dịch, ghi chú và ảnh biên lai.
- Admin xem toàn bộ yêu cầu, duyệt hoặc từ chối.
- Khi Admin duyệt, hệ thống cộng đúng một lần vào số dư và ghi lịch sử ví.
- Admin có thể cộng/trừ thủ công nhưng không cho phép làm số dư âm.
- Customer không thể truy cập `/designer` hoặc `/admin`.
- Designer chỉ vào khu thiết kế; Admin vào được cả khu quản trị lẫn khu thiết kế.

## 2. Các file chính đã thêm

- `routes/accounts.py`: đăng ký, hồ sơ, tài khoản, nạp tiền.
- `routes/admin.py`: duyệt nạp tiền và quản lý số dư.
- `templates/register.html`
- `templates/account_dashboard.html`
- `templates/account_profile.html`
- `templates/account_topup.html`
- `templates/admin_dashboard.html`

## 3. Các file chính đã sửa

- `app.py`: thêm đường dẫn mới và điều hướng tài khoản động.
- `models.py`: mở rộng SQLite, phiên đăng nhập, ví và giao dịch.
- `routes/auth.py`: đăng nhập chung, session lưu database, phân quyền.
- `routes/designer.py`: giới hạn quyền Designer/Admin.
- `routes/guest.py`: tự liên kết đơn với khách đang đăng nhập.
- `templates/base.html`: icon tài khoản bên trái và menu động.
- `templates/login.html`: giao diện đăng nhập theo vai trò.
- `templates/request_form.html`: tự điền số điện thoại và địa chỉ khách.
- `static/css/base.css`: toàn bộ giao diện tài khoản, ví và Admin.
- `config.py`: thông tin ngân hàng và thư mục biên lai.

## 4. Kiểm tra thực tế đã chạy

- Đăng ký khách mới: đạt.
- Đăng nhập khách và mở tài khoản: đạt.
- Tự điền điện thoại/địa chỉ vào form làm thiệp: đạt.
- Đơn mới xuất hiện trong tài khoản khách: đạt.
- Gửi nạp tiền 200.000đ có biên lai: đạt.
- Admin nhìn thấy yêu cầu: đạt.
- Admin duyệt và cộng số dư: đạt.
- Khách thấy 200.000đ và trạng thái “Đã cộng tiền”: đạt.
- Admin điều chỉnh thêm số dư: đạt.
- Designer đăng nhập và mở dashboard cũ: đạt.
- Customer truy cập Designer nhận lỗi 403: đạt.
- Admin mở được cả `/admin` và `/designer`: đạt.

## 5. Lưu ý khi đưa lên Internet

Bản hiện tại phù hợp chạy local/intranet theo cấu trúc Python thuần của dự án. Khi triển khai công khai cần dùng HTTPS, đổi mật khẩu mặc định, sao lưu SQLite định kỳ và đặt thông tin ngân hàng thật trong `config.py` hoặc biến môi trường.
