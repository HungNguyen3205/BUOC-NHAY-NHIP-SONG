# Sửa lỗi `Truy cập bị từ chối: DriveApp`

Bản hiện tại giữ bill ở chế độ **riêng tư** trên Drive và chèn ảnh xem trước trực tiếp vào cột P của Google Sheet. Không cần bật chia sẻ công khai cho hóa đơn.

## Bắt buộc làm lại sau khi cập nhật Code.gs

1. Trong Apps Script, bật **Project Settings → Show "appsscript.json" manifest file in editor**.
2. Sao chép cả `Code.gs` và `appsscript.json` từ thư mục này vào project Apps Script.
3. Vào **Project Settings → Script Properties**, đặt:
   - `DRIVE_FOLDER_ID`: ID của thư mục `BCNS_BILLS`, không phải link giả hoặc chuỗi mẫu.
   - `SPREADSHEET_ID`: ID Google Sheet.
4. Thư mục `BCNS_BILLS` phải thuộc tài khoản chạy Apps Script hoặc tài khoản đó phải có quyền **Editor**.
5. Chọn hàm `KICH_HOAT_QUYEN_DRIVE`, bấm **Run**, chọn đúng tài khoản và bấm **Allow**. Hàm sẽ tạo rồi chuyển một file kiểm tra vào thùng rác.
6. Chọn **Deploy → Manage deployments → Edit → New version**:
   - **Execute as:** Me
   - **Who has access:** Anyone
7. Bấm **Deploy** và giữ nguyên URL `/exec` hiện có. Nếu Google tạo URL mới thì cập nhật `GOOGLE_SCRIPT_URL` trong `assets/js/config.js`.
8. Gửi thử một bill nhỏ. Cột O lưu File ID; cột P hiển thị ảnh; menu **BCNS → Mở bill dòng đang chọn** mở file gốc.

> Nếu `KICH_HOAT_QUYEN_DRIVE` vẫn báo từ chối ngay trong Editor, đây là lỗi quyền tài khoản/Google Workspace chứ không phải frontend. Hãy dùng tài khoản sở hữu thư mục hoặc nhờ quản trị viên Workspace bật Google Drive/Apps Script cho tài khoản đó.

---

# Hướng Dẫn Tích Hợp Google Apps Script & Google Drive

Tài liệu này hướng dẫn chi tiết cách thiết lập Backend cho hệ thống tải Hóa Đơn và Quản Lý Trạng Thái (Có duyệt).

## BƯỚC 1: Chuẩn bị Google Drive và Google Sheets
1. Truy cập [Google Drive](https://drive.google.com). Tạo một Thư mục mới tên là `BCNS_BILLS`.
2. Mở thư mục đó ra, nhìn lên thanh địa chỉ trình duyệt, copy đoạn mã phía sau `folders/`. Đó chính là **DRIVE_FOLDER_ID**.
3. Mở **Google Sheets cũ** của bạn (hoặc tạo file mới).
4. Đổi tên tab (Sheet) đang dùng thành: `DANG_KY_BCNS`.
5. Tạo hàng tiêu đề (Hàng 1) với **23 cột** đúng thứ tự sau:
   - A: Thời gian đăng ký | B: Mã đăng ký | C: Họ và tên | D: Ngày sinh | E: Giới tính
   - F: Số điện thoại | G: Gmail | H: Địa chỉ | I: Cự ly | J: Size áo | K: Người liên hệ khẩn cấp | L: SĐT khẩn cấp
   - M: Số tiền | N: Nội dung chuyển khoản | O: Drive File ID | P: Link bill
   - Q: Trạng thái | R: Lý do không hợp lệ | S: Thời gian xử lý | T: Đã gửi email | U: Loại email cuối | V: Thời gian gửi email | W: Ghi chú
6. Chọn cột Q, tạo Dropdown với các mục: `CHỜ KIỂM TRA`, `HỢP LỆ`, `KHÔNG HỢP LỆ`, `ĐÃ XÁC NHẬN`, `ĐÃ HỦY`.

## BƯỚC 2: Thêm Code.gs vào Apps Script
1. Trong Google Sheets, bấm **Tiện ích mở rộng -> Apps Script**.
2. Xóa code mặc định, copy toàn bộ nội dung file `Code.gs` và dán vào.
3. Bấm Lưu (Ctrl+S).

## BƯỚC 3: Cấu hình PropertiesService (CỰC KỲ QUAN TRỌNG)
Hệ thống sử dụng PropertiesService để giấu thông tin nhạy cảm.
1. Nhìn lên thanh công cụ của Apps Script, chọn hàm `setupProperties` trong dropdown bên cạnh nút **Chạy (Run)**.
2. Bấm nút **Chạy**.
3. Google sẽ yêu cầu quyền truy cập (Review Permissions). Bạn hãy cấp quyền (Cho phép/Allow).
4. **Lưu ý:** Trước khi chạy, bạn phải kéo xuống đầu file `Code.gs`, sửa dòng `'DRIVE_FOLDER_ID': 'THAY_BẰNG_ID_THƯ_MỤC_DRIVE_CỦA_BẠN'` thành ID bạn đã lấy ở Bước 1.

## BƯỚC 4: Tạo Trigger Tự Động (Bộ kích hoạt)
Để hệ thống gửi email tự động khi bạn đổi Trạng Thái:
1. Ở menu trái Apps Script, bấm vào biểu tượng **Đồng hồ (Triggers)**.
2. Thêm Trigger mới:
   - Hàm sự kiện: `handleStatusChange`
   - Loại sự kiện: `Đang chỉnh sửa` (On edit)
3. Lưu và cấp quyền nếu được hỏi.

## BƯỚC 5: Triển Khai Web App
1. Trở lại trình soạn thảo Apps Script, bấm **Triển khai (Deploy)** -> **Trình triển khai mới**.
2. Loại: `Ứng dụng Web`.
3. Ứng dụng thực thi dưới dạng: `Tôi`.
4. Người có quyền truy cập: **Bất kỳ ai (Anyone)**.
5. Bấm Triển khai, lấy URL ứng dụng.

## BƯỚC 6: Gắn URL vào Frontend
1. Mở file `assets/js/config.js` trong thư mục code website.
2. Dán URL vừa lấy vào biến `APPS_SCRIPT_URL`.

## HƯỚNG DẪN QUẢN TRỊ (ADMIN)
Khi tải lại trang Google Sheets, bạn sẽ thấy menu **BCNS** ở thanh công cụ phía trên cùng.
- Khi có bill mới nảy vào, cột P sẽ chứa Link ảnh. Bấm **Mở bill dòng đang chọn**.
- Đối soát xong: Chọn ô Trạng thái (Cột Q), đổi thành `HỢP LỆ`. Chờ 5s, thư chúc mừng sẽ được tự động gửi đi.
- Nếu bill sai: Điền lý do vào cột **Lý do không hợp lệ** (Cột R) -> Chọn trạng thái `KHÔNG HỢP LỆ`. Thư cảnh báo từ chối sẽ được gửi.
- Nếu lỡ nhập sai Gmail: Sửa trực tiếp Gmail ở cột G -> Chọn `BCNS -> Gửi lại email dòng đang chọn`.
