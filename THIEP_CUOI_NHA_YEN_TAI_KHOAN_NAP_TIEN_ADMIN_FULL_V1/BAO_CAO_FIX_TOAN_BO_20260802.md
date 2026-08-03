# BÁO CÁO FIX TOÀN BỘ 5 MẪU - 02/08/2026

## Các lỗi đã xử lý

- QR tạo đúng URL theo domain hiện tại của website, không dùng lại link localhost cũ; khung QR luôn vuông và căn giữa.
- Nhạc chỉ bắt đầu sau thao tác bấm **Mở thiệp**; toàn bộ 5 mẫu dùng chung một bộ điều khiển nhạc, không tự phát khi tải trang hoặc cuộn.
- Chat AI chỉ tải tại trang xem thử 5 mẫu `/preview/mau01` đến `/preview/mau05`; link thiệp đã xuất `/i/...` và khu chỉnh sửa không hiển thị chat.
- Bỏ giới hạn kéo chữ và ảnh quá nhỏ. Tọa độ chữ cho phép từ -5000 đến 5000 px; ảnh cho phép phạm vi rộng theo px hoặc phần trăm và được lưu phía máy chủ.
- Có thể kéo trực tiếp các cụm chữ trong khu chỉnh sửa; tọa độ được gửi về form và tự lưu.
- Sửa co giãn tên cô dâu/chú rể ở intro cả 5 mẫu: đo bằng bản sao ẩn, dùng thuộc tính `scale`, không ghi đè `transform/translate`, không làm méo hoặc gom cụm khi zoom/thu phóng.
- Mẫu 1: sửa mở phong bì theo đúng cấu trúc HTML, 96 tim SVG bay ra; sửa dải ảnh ngang/dọc chạy theo chiều dài thật, không giật ở điểm nối; mọi hàng ảnh giữ cùng tỷ lệ 255:185.
- Mẫu 5: tách riêng vị trí/font/màu/cỡ cho tên chú rể và cô dâu ở khối gia đình và phần cảm ơn, không còn chỉnh một tên làm cả cụm bị lệch.
- Tăng phiên bản cache CSS/JavaScript để trình duyệt tải đúng mã mới sau khi deploy.

## Kiểm tra đã thực hiện

- Python compile toàn bộ: đạt.
- JavaScript syntax toàn bộ: đạt.
- HTTP 5 trang xem mẫu: đạt, không còn biến template chưa render.
- Kiểm tra trình duyệt mô phỏng cả 5 mẫu: không có page error hoặc console error.
- Kiểm tra màn hình hẹp 375 px với tên rất dài: cả 5 mẫu nằm trong khung và giữ tọa độ riêng.
- Kiểm tra kéo tên 800 px: gửi đúng thông điệp lưu tọa độ.
- Kiểm tra QR với proxy HTTPS/Render: tạo đúng URL `https://domain/i/slug`.
