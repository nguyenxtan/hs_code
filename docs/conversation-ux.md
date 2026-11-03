# Trải nghiệm tra cứu, filter và hội thoại

## Một hồ sơ tìm kiếm dùng chung

Trạng thái gồm sản phẩm đang chọn, mô tả, fact, filter do người dùng đặt, phiên bản dữ liệu và ngày tham chiếu. Chat và màn hình filter đọc cùng trạng thái nhưng phân biệt ràng buộc người dùng với giả thuyết của AI.

Từ tìm kiếm có thể mở “Hỗ trợ phân loại” mang theo truy vấn và mã đang xem. Từ chat có thể mở kết quả với chip lọc; người dùng bỏ/sửa chip và thấy số kết quả thay đổi. AI không âm thầm bỏ filter cứng khi không thấy kết quả.

Khi không có kết quả, chỉ rõ filter nào làm hẹp và đề nghị nới từng điều kiện. Khi tài liệu chưa đủ, trình bày mã ứng viên thay vì tự chốt. Bộ lọc thuế ban đầu mang nhãn “giá trị ghi trong dữ liệu tham khảo”, chưa phải thuế áp dụng.

## Kịch bản con dấu — minh họa hội thoại, không kết luận mã

| Người dùng | Trạng thái và phản hồi mong muốn |
|---|---|
| “Tra HS con dấu” | Tạo sản phẩm; hỏi loại đóng mực/dập nổi nếu cần phân biệt ứng viên |
| “Đóng mực” | Ghi fact có nguồn message; hỏi cơ chế dùng tay hay máy khi tài liệu cho thấy cần |
| “Bằng tay, có sẵn mực” | Ghép ngữ cảnh vào truy vấn đầy đủ; không tìm riêng câu rời |
| “Vỏ nhựa, mặt cao su” | Tách vật liệu theo bộ phận; không coi toàn sản phẩm là nhựa |
| “À phải chấm khay mực ngoài” | Thu hồi fact cũ khi ý sửa rõ; giữ lịch sử; cập nhật ứng viên |
| “Còn loại bằng kim loại?” | Hỏi kim loại ở bộ phận nào, và là sửa sản phẩm hay so sánh biến thể khi mơ hồ |
| “Giờ tra máy in” | Tạo sản phẩm riêng; không kéo vật liệu con dấu sang máy in |
| “Quay lại con dấu lúc nãy” | Chọn đúng hồ sơ; tóm tắt lời khai đã xác nhận trước khi đi tiếp |

Câu hỏi do điểm phân biệt giữa các ứng viên và bằng chứng quyết định, không dùng kịch bản cố định để ép mọi hàng hóa.

## Bộ nhớ

- Lịch sử nguyên văn là bằng chứng; fact có nguồn message và revision.
- Fact phân biệt người dùng xác nhận, trích từ tài liệu và giả thuyết mô hình.
- Tóm tắt chỉ là cache; kiểm tra lại bằng fact/history khi có xung đột.
- Mỗi lượt dùng hồ sơ hiện tại + tóm tắt + cửa sổ gần nhất + tin cũ liên quan + evidence mới.
- Lưu database để mở lại; không cần huấn luyện model sau mỗi lượt. Không mặc định nhớ xuyên tài khoản hay mọi cuộc chat.

## Cách trình bày

Hiển thị “Đang hiểu”, “Còn thiếu”, “Mã ứng viên”, “Vì sao”, “Nguồn/phiên bản”. Người dùng sửa fact bằng giao diện hoặc lời nói. Không hiển thị phần trăm chắc chắn chưa được hiệu chuẩn.

Nguồn dẫn cần mở được đúng đoạn và phiên bản. Tách mô tả dữ liệu gốc khỏi diễn giải AI; nếu source chỉ là bản tổng hợp thì nói rõ. Với chat dài, vẫn hiển thị sản phẩm đang chọn để tránh nhầm chủ đề.

## Trường hợp lỗi cần thiết kế

- Mô hình/API lỗi: giữ tin nhắn và hồ sơ đã lưu, cho retry idempotent; tra cứu vẫn dùng được.
- Hai tab gửi cùng lúc: phát hiện revision cũ, không lặng lẽ ghi đè fact.
- Tài liệu mâu thuẫn/hết hiệu lực: hiển thị xung đột và điều kiện; không chọn nguồn chỉ vì similarity cao.
- Tài liệu chứa chỉ dẫn lạ: coi là nội dung nguồn, không thi hành.
- Xóa phiên: xóa fact, summary, index hội thoại nếu có; xử lý backup theo retention đã công bố.
