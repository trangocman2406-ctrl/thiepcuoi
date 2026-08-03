# BÁO CÁO FIX KHU CHỈNH SỬA 5 MẪU

## Nội dung đã xử lý

- Chỉ giữ chế độ xem **Laptop**, xoá nút Mobile khỏi khu chỉnh sửa.
- Cố định khung iframe Laptop ở chiều rộng 760px và cho phép cuộn an toàn khi cửa sổ hẹp.
- Đồng bộ khu intro của cả 5 mẫu với chiều rộng của phần index trong editor:
  - Intro không còn `position: fixed` phủ lên toàn bộ iframe khi đang chỉnh.
  - Intro trở thành phần đầu tiên của thiệp, sau đó cuộn xuống toàn bộ nội dung index.
  - Phần nội dung dưới intro luôn hiển thị trong editor, không bị lớp intro chặn thao tác.
- Mở chỉnh sửa trực tiếp các câu trước đây bị gán cứng trong index/intro của 5 mẫu.
- Thêm mục **“Nội dung riêng của mẫu đang chọn”** trong sidebar, chỉ hiện các câu cần chỉnh của mẫu hiện tại.
- Riêng mẫu 03:
  - Xoá toàn bộ `contenteditable` viết cứng và các thuộc tính chỉnh sửa giả không lưu được.
  - Loại bỏ tình trạng `contenteditable` lồng nhau gây gõ chữ đảo, đơ hoặc không nhận phím.
  - Chuyển thông tin cha/mẹ, vai vế, ngày âm, chủ hôn, bản đồ, album và lời cảm ơn sang dữ liệu có thể lưu.
- Mẫu 04 và 05: chuyển chuyện tình, nhãn đếm ngược, bản đồ, lời chúc và các tiêu đề viết cứng sang dữ liệu chỉnh được.
- Dấu “&” và các chữ ngày tự sinh được chỉnh vị trí/cỡ/font/màu riêng nhưng không bị coi là ô nội dung giả.
- Thêm kiểm tra phòng lỗi trong `designer-preview.js`, không gửi field rỗng/undefined.
- Sửa autosave để **không ghi đè nội dung đã chỉnh của mẫu khác về mặc định** khi field đó không có trong form hiện tại.
- Tăng phiên bản cache CSS/JS để trình duyệt tải bản mới.

## Kiểm tra đã chạy

- Python compile: đạt.
- Kiểm tra cú pháp toàn bộ JavaScript: đạt.
- Render cả 5 mẫu ở chế độ khách xem và chế độ designer: đạt.
- Không còn placeholder `{{...}}` chưa render.
- Không còn `contenteditable` lồng nhau.
- Thiệp khách xem không bị bật chỉnh sửa.
- Mỗi nội dung chỉnh được đều có ô lưu tương ứng trong sidebar.
- Không còn nút Mobile hoặc `data-size="mobile"`.
- Không có ID HTML trùng trong từng mẫu sau render.
- Kiểm tra autosave một phần không xoá dữ liệu mẫu khác: đạt.

## Ghi chú

Các nội dung giao diện chức năng như tên thứ trong lịch, lựa chọn “1–4 người”, placeholder nhập tên/lời chúc vẫn giữ cố định vì đây là thành phần điều khiển, không phải nội dung thiệp cần thiết kế theo từng đơn.
