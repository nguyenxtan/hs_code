# Yêu cầu sản phẩm — bản đề xuất

## Mục tiêu

Giúp người dùng đi từ tên hàng chưa đầy đủ đến danh sách mã có căn cứ, bằng tra cứu trực tiếp hoặc khai báo qua hội thoại. Giảm công nhập lại dữ liệu và tránh biến gợi ý của AI thành kết luận chắc chắn.

Người dùng chính chưa được xác nhận: cần thử với cả người mới chỉ biết tên sản phẩm và nhân viên nghiệp vụ biết mã HS. Giao diện nên có tìm kiếm đơn giản trước, bộ lọc nâng cao mở theo nhu cầu.

## Phạm vi bắt buộc

| Mã | Yêu cầu | Tiêu chí nghiệm thu |
|---|---|---|
| SEARCH-01 | Tìm mã chính xác và tiền tố | Giữ số 0 đầu; truy vấn mã chính xác trả đúng bản ghi trong phiên bản đã chọn |
| SEARCH-02 | Tìm tên Việt/Anh, có/không dấu | Tập truy vấn chuẩn có cùng mặt hàng trong top-k; đo trước/sau chuẩn hóa |
| FILTER-01 | Cây HS và nhóm tìm kiếm | Nhóm chính thức khác nhóm tiện ích; hiển thị số lượng, bỏ từng bộ lọc được |
| FILTER-02 | Thuộc tính theo nhóm hàng | Chỉ hiện facet có ích cho nhóm; có trạng thái chưa rõ; không suy diễn ô trống thành không áp dụng |
| UX-01 | Filter và chat dùng chung hồ sơ tìm kiếm | Người dùng thấy và sửa được chip lọc; chat xin xác nhận khi muốn nới filter do người dùng đặt |
| CHAT-01 | Khai báo dần, sửa và đổi sản phẩm | Kịch bản con dấu, sửa thông tin, hai sản phẩm và mở lại phiên đều giữ đúng ngữ cảnh |
| CHAT-02 | Gợi ý có căn cứ | Mã phải tồn tại trong snapshot; căn cứ dẫn đúng tài liệu/đoạn; thiếu căn cứ thì báo thiếu |
| DATA-01 | Làm sạch có thể tái lập | Cùng input và cấu hình cho cùng output; không sửa dữ liệu gốc; xuất báo cáo lỗi |
| DATA-02 | Phân nhóm truy vết được | Mỗi nhãn có nguồn, phương pháp, trạng thái duyệt và phiên bản |
| OPS-01 | Tự triển khai | Có hướng dẫn, cấu hình mẫu không có secret, backup và khôi phục được thử |
| PRIV-01 | Phân quyền phiên | Người dùng không đọc/sửa được phiên của người khác; có chính sách lưu và xóa dữ liệu |

## Ngoài MVP

- Tự động chốt mã khai báo hoặc bảo đảm kết quả được cơ quan có thẩm quyền chấp nhận.
- Tính thuế áp dụng chỉ dựa trên chuỗi thuế thô, không xét ngày/điều kiện.
- OCR quy mô lớn, tự host LLM/GPU, Kubernetes, tích hợp nghiệp vụ doanh nghiệp.

## Quyết định còn mở

- Đối tượng chính và khối lượng truy cập thực tế.
- Quyền sử dụng tài liệu chú giải và tài liệu phân loại bổ sung.
- Nhà cung cấp AI, yêu cầu nơi lưu dữ liệu, chính sách retention.
- Người duyệt nhãn, quy tắc chuẩn hóa thuế và các câu trả lời nghiệp vụ.
- Ngưỡng chất lượng sau khi có bộ đánh giá và baseline; không đặt SLA khi chưa đo.
