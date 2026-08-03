# BÁO CÁO FIX CHATBOX TƯ VẤN V2

## Các lỗi đã sửa

1. **Không còn 5 chatbox nằm trong 5 khung mẫu.**
   - Năm iframe xem nhanh dùng `?embed=1`.
   - Chatbox tự dừng khi phát hiện đang chạy bên trong iframe.
   - Trang **Chọn mẫu** chỉ tạo đúng **một trợ lý dùng chung** ở ngoài dải 5 mẫu.

2. **Khung chat cuộn được rõ ràng.**
   - Khu tin nhắn có cuộn dọc bằng chuột và thao tác vuốt trên điện thoại.
   - Không để thao tác kéo mẫu bắt mất thao tác cuộn chat.
   - Có thanh cuộn riêng và nút mở rộng khung chat trên máy tính.

3. **Đổi tên đúng với thiết kế thực tế của 5 mẫu.**
   - Mẫu 01 – Bao Thư Tình Yêu.
   - Mẫu 02 – Lịch Cưới Hỷ Sắc.
   - Mẫu 03 – Thiệp Thư Thanh Lịch.
   - Mẫu 04 – Đỏ Rượu Chuyện Tình.
   - Mẫu 05 – Sage Hồng Hai Nhà.

4. **Cập nhật dữ liệu tư vấn theo đúng từng mẫu.**
   - Màu sắc.
   - Số ảnh.
   - Bao thư, lịch cưới, timeline, hai nhà và họa tiết.
   - Kiểu chữ.
   - Mức hiệu ứng.
   - Số lượng in và bảng giá tham khảo.
   - Có câu trả lời riêng cho “mẫu hot/mẫu nổi bật”.

## Vị trí hoạt động

- `/choose-template`: một trợ lý chung cho toàn bộ 5 mẫu.
- `/preview/mau01` đến `/preview/mau05` khi mở đầy đủ: mỗi trang độc lập có một trợ lý.
- Năm khung xem nhanh trên trang chọn mẫu: không tạo chatbox.
- Iframe Designer: không tạo chatbox, tránh che khu chỉnh sửa.

## Tệp chính đã sửa

- `config.py`
- `routes/guest.py`
- `templates/choose_template.html`
- `templates/invitation_view.html`
- `static/js/wedding-advisor.js`
- `static/css/wedding-advisor.css`

## Kiểm tra

- Mã JavaScript qua `node --check`.
- Toàn bộ Python biên dịch thành công.
- Trang chọn mẫu có 5 thẻ nhưng chỉ có 1 chatbox.
- Năm iframe có tổng số chatbox bằng 0.
- Khung tin nhắn có `overflow-y: auto`, hỗ trợ `touch-action: pan-y` và cuộn được từ đầu đến cuối.
- Quy trình hỏi 8 bước, trả lời mẫu nổi bật và đề xuất mẫu hoạt động không phát sinh lỗi JavaScript.
