# Trải nghiệm tra cứu, filter và hội thoại

## Một hồ sơ tìm kiếm dùng chung

Trạng thái gồm sản phẩm đang chọn, mô tả, fact, filter do người dùng đặt, phiên bản dữ liệu và ngày tham chiếu. Chat và màn hình filter đọc cùng trạng thái nhưng phân biệt ràng buộc người dùng với giả thuyết của AI.

Ba loại ràng buộc: `user_filter` do người dùng chủ động chọn là filter cứng; `user_fact` là lời khai dùng để xếp hạng mạnh; `inferred` là suy đoán dùng để gợi ý/xếp hạng nhẹ. Fact không tự trở thành filter cứng. Fact gắn sản phẩm, filter gắn phạm vi tìm kiếm; khi đổi sản phẩm phải hiển thị rõ filter nào còn áp dụng.

Từ tìm kiếm có thể mở “Hỗ trợ phân loại” mang theo truy vấn và mã đang xem. Từ chat có thể mở kết quả với chip lọc; người dùng bỏ/sửa chip và thấy số kết quả thay đổi. AI không âm thầm bỏ filter cứng khi không thấy kết quả.

Khi không có kết quả, chỉ rõ filter nào làm hẹp và đề nghị nới từng điều kiện; cũng xét dữ liệu thiếu hoặc truy vấn chưa khớp. Không tự gán “Loại khác”. Khi tài liệu chưa đủ, trình bày mã ứng viên thay vì tự chốt. MVP chỉ hiển thị chuỗi thuế thô có nguồn/ngày, chưa lọc hay sắp xếp thuế.

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

Các lượt trong bảng là minh họa khả năng cập nhật hồ sơ, không phải chuỗi câu hỏi bắt buộc. Nếu vật liệu vỏ không ảnh hưởng phân biệt mã thì không hỏi. Có lựa chọn “không biết”; một mã còn lại trong kết quả truy xuất chưa đủ chứng minh đã hội tụ đúng. Biến thể có hồ sơ liên kết riêng; bộ hàng giữ cấu trúc thành phần để đối chiếu quy tắc khi có căn cứ.

## Bộ nhớ

- Lịch sử nguyên văn là bằng chứng; fact có nguồn message và revision.
- Fact phân biệt người dùng xác nhận, trích từ tài liệu và giả thuyết mô hình.
- Tóm tắt chỉ là cache; kiểm tra lại bằng fact/history khi có xung đột.
- Mỗi lượt dùng hồ sơ hiện tại + tóm tắt + cửa sổ gần nhất + tin cũ liên quan + evidence mới.
- Lưu database để mở lại; không cần huấn luyện model sau mỗi lượt. Không mặc định nhớ xuyên tài khoản hay mọi cuộc chat.

## Cách trình bày

Hiển thị “Đang hiểu”, “Còn thiếu”, “Mã ứng viên”, “Vì sao”, “Nguồn/phiên bản”. Người dùng sửa fact bằng giao diện hoặc lời nói. Không hiển thị phần trăm chắc chắn chưa được hiệu chuẩn.

Nguồn dẫn cần mở được đúng đoạn và phiên bản. Tách mô tả dữ liệu gốc khỏi diễn giải AI; nếu source chỉ là bản tổng hợp thì nói rõ. Với chat dài, vẫn hiển thị sản phẩm đang chọn để tránh nhầm chủ đề.

Kiểm tra citation gồm tồn tại đoạn, đúng phiên bản/phạm vi và hỗ trợ nhận định. Kiểm tra khớp chữ không đủ đánh giá tính đúng của lời giải. Có thể so sánh 2–4 mã; URL chia sẻ filter không chứa lời khai riêng tư.

## Trường hợp lỗi cần thiết kế

- Mô hình/API lỗi: giữ tin nhắn và hồ sơ đã lưu, cho retry idempotent; tra cứu vẫn dùng được.
- Hai tab gửi cùng lúc: phát hiện revision cũ, không lặng lẽ ghi đè fact.
- Tài liệu mâu thuẫn/hết hiệu lực: hiển thị xung đột và điều kiện; không chọn nguồn chỉ vì similarity cao.
- Tài liệu chứa chỉ dẫn lạ: coi là nội dung nguồn, không thi hành.
- Xóa phiên: xóa fact, summary, index hội thoại nếu có; xử lý backup theo retention đã công bố.
