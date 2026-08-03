# BÁO CÁO FIX RESPONSIVE VÀ QR – 5 MẪU

## Lỗi đã xử lý

1. Intro bị phóng to, lệch, tràn và đổi bố cục khi mở trên điện thoại.
2. Tên cô dâu – chú rể dài bị co/lệch do hai đoạn JavaScript cùng chỉnh `transform`.
3. Phần nội dung thiệp có phần tử làm phát sinh cuộn ngang trên màn hình nhỏ.
4. QR không tạo được do trang gọi `QRCode` nhưng thư viện cục bộ chỉ cung cấp `QRCodeLocal`.
5. QR/link có thể trỏ nhầm `127.0.0.1` sau khi chuyển database từ máy tính lên Render.

## Cách sửa

- Tạo một canvas intro cố định `1180 × 640` cho cả 5 mẫu và scale đồng đều theo kích thước viewport.
- Dùng `visualViewport`, cập nhật lại khi xoay màn hình/thay đổi kích thước.
- Chỉ chạy một bộ co tên, căn giữa đúng tâm, không còn double-transform.
- Khóa chiều rộng phần nội dung, ảnh, video, iframe, canvas và các khối con theo màn hình.
- Tạo bộ render QR bằng canvas từ thư viện QR có sẵn trong dự án.
- QR luôn lấy domain hiện tại qua `X-Forwarded-Host`, `Host`, `X-Forwarded-Proto`; không dùng link localhost cũ trong SQLite.
- Link tại trang designer dùng đường dẫn tương đối nên chạy đúng trên localhost và Render.

## File chính đã thay đổi/thêm mới

- `templates/invitation_view.html`
- `static/css/invitation-responsive.css` *(mới)*
- `static/js/invitation-responsive.js` *(mới)*
- `static/js/invitation.js`
- `templates/qr.html`
- `static/js/qr-renderer.js` *(mới)*
- `routes/invitations.py`
- `routes/designer.py`
- `routes/templates.py`

## Kiểm tra đã thực hiện

- Python compile: đạt.
- JavaScript syntax: đạt.
- Intro mẫu 01–05 ở viewport điện thoại: card ngang, scale đều, không tràn document.
- QR canvas: tạo được, tải PNG được và nội dung QR giải mã đúng link thiệp.
- QR với header Render: tạo đúng domain `https://thiepcuoinhayen-2.onrender.com/...`.

## Triển khai

1. Giải nén và thay toàn bộ source cũ bằng source trong thư mục này.
2. Push/Deploy lại trên Render.
3. Sau khi deploy xong, mở trang bằng cửa sổ ẩn danh hoặc xóa cache/nhấn `Ctrl + F5` trên máy tính.
