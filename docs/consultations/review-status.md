# Tổng hợp review làm sạch và VAT — chưa thực thi

Ngày 2026-11-03. Chủ dự án yêu cầu review trước rồi mới làm. Không có pipeline làm sạch hay bản dữ liệu chuẩn hóa; chưa gắn category. Raw đã được tải để kiểm tra, nằm trong thư mục gitignored. Không công bố lại bộ dữ liệu.

## Làm sạch: phạm vi đề nghị duyệt

Đã đọc [review của Claude](claude-cleaning-review.md). Đề xuất A0/A1: audit có thể tái lập và tạo view chuẩn hóa kỹ thuật cạnh raw. Chưa triển khai B1 (cây có mô tả đầy đủ), B2 (taxonomy/alias), embedding hay parse ngữ nghĩa thuế.

| Đợt 1 có thể làm sau khi duyệt | Giữ nguyên/để sau |
|---|---|
| Validate mã dạng text và đối soát schema/khóa | Không ép mã sang số, không gộp các dòng cùng mô tả |
| Tạo mô tả VI dẫn xuất với NFC, xử lý NBSP và khoảng trắng trong phạm vi đã duyệt | Không ghi đè raw, không NFKC, không sửa chính tả hoặc ký hiệu |
| Ghi provenance, phép biến đổi, diff từng dòng và quarantine | Không tự điền tên cấp cha hoặc coi prefix là tên category đã xác minh |
| Trường tìm không dấu riêng, không dùng làm bản hiển thị chuẩn | Không coi chuỗi EN là bản dịch đầy đủ dòng VI 8 số |
| Thống kê mẫu chuỗi thuế | Không giải mã dấu `*`, không suy rate, không đổi `MT?` thành `MT` |

Đợt 1 nên tránh cả việc tách đơn vị tính: tách `/` có thể bị hiểu thành các lựa chọn đơn vị tương đương trong khi chưa biết quy ước nguồn. Chỉ thống kê cho tới khi có yêu cầu và bộ case riêng.

Cổng nghiệm thu: hash raw nguyên vẹn; output xác định/tái lập; input = accepted + quarantined; JSON/CSV khớp chính xác; trường cấm đổi được bảo toàn; tiền tố gạch kiểm tra từ raw; mọi thay đổi có diff; không xuất thêm nhãn hay mức thuế suy đoán. Con số cụ thể phải do pipeline sau này tái lập, không lấy báo cáo review làm kiểm thử thay thế.

## Bằng chứng coordinator đã kiểm tra lại, chỉ đọc

Raw hash vẫn khớp manifest. JSON/CSV bằng nhau từng trường và thứ tự dòng khi dùng parser CSV chuẩn.

| Chỉ số | Kết quả |
|---|---:|
| Bản ghi / mã unique | 11.414 / 11.414 |
| Prefix 2 / 4 / 6 số | 96 / 1.228 / 5.612 |
| Mô tả VI khác dạng NFC | 16 |
| Mô tả VI có khoảng trắng cuối / đầu | 465 / 9 |
| Ký tự NBSP trong mô tả VI | 10 |
| Prefix 6 số có nhiều hơn một chuỗi EN | 0 |
| Dòng BVMT có `MT?` | 3 |
| Dòng ghi chú giảm VAT có newline | 1 |

Đây là kiểm tra read-only, không phải kết quả làm sạch. Các số về dash/hierarchy còn lại trong báo cáo Claude chưa được coordinator tái lập độc lập. Sự lặp EN theo prefix 6 số là bằng chứng về tính hạt của nội dung nguồn, chưa đủ xác nhận mọi mô tả EN đúng danh mục chính thức; nhãn an toàn là “tham khảo, có dấu hiệu ở cấp 6 số”.

“Không có dòng kết thúc bằng dấu hai chấm” và nhảy cấp gạch là dấu hiệu nguồn không đủ để dựng cây mô tả một cách chắc chắn, không phải bộ quy tắc chứng minh mọi cấp cha. Phải đối chiếu danh mục có thẩm quyền trước khi ghép.

Nhóm tiện ích chưa có mapping nào; 20–40 nhóm là ý tưởng, chưa phải kết quả. Số prefix không thay thế tên và phạm vi các nhóm đã xác minh.

## VAT: tiếp thu có điều chỉnh

Đã đọc [review VAT](claude-vat-review.md). Nên làm rõ trong thiết kế tiếp theo:

- Phân lớp trạng thái → mức cơ bản → điều chỉnh có căn cứ, tránh coi giảm thuế với mức cơ bản là xung đột giả. Không dừng ở lớp “chịu thuế” trước khi xác định các lớp còn lại.
- Định nghĩa AND/OR/NOT ba giá trị, từ điển fact có kiểu và các kết quả còn khả dĩ. Một kết quả số duy nhất chưa đủ: phải kiểm tra tính nhất quán các điều kiện, độ phủ quy tắc và căn cứ đã duyệt.
- Cân nhắc rules-as-data trong Git, release bất biến; không chỉnh trực tiếp quy tắc runtime không qua review.
- Bổ sung loại hình/chế độ và loại mốc thời gian khi quy tắc yêu cầu. Chưa khai chế độ không đồng nghĩa nhập khẩu thông thường.
- Không bật xác định VAT khi chưa có người duyệt nghiệp vụ và quy trình cập nhật.

Không tiếp thu nguyên trạng các điểm sau:

1. Không suy raw hết hiệu lực chỉ vì chuỗi chứa số 8. Chỉ cảnh báo theo mốc khi có liên kết nguồn/quy tắc đã kiểm chứng; nếu chưa biết ngày áp dụng của nguồn, ghi chưa rõ.
2. Không bỏ hỗ trợ một chính sách chỉ vì sắp hết hạn: giá trị tra lịch sử vẫn có. Ưu tiên tính năng dựa trên nhu cầu và năng lực duy trì; chưa triển khai chính sách cụ thể khi chưa thẩm định căn cứ.
3. Test/CI có thể phát hiện nhiều xung đột, không chứng minh không còn xung đột trên mọi đầu vào. Vẫn cần trạng thái xung đột runtime và trace rõ.
4. Không có mặc định “chỉ X%” lại bao gồm “có thể X%”. UI phải ghi rõ nhóm xác định/khả dĩ/chưa biết và cách filter.
5. Cache đánh giá phải có release, dataset, khâu, khoảng ngày và fingerprint đầy đủ của facts liên quan; key chỉ có release/khâu/ngày chưa đủ cho kết quả theo hồ sơ.
6. Hậu kiểm tỷ lệ trong chat phải phân biệt mức cơ bản, mức giảm, mức áp dụng và các con số trích dẫn; không chỉ so mọi số phần trăm với rate cuối cùng.
7. Mọi ví dụ pháp lý còn là giả định trong review không được nâng thành rule/fixture đã duyệt.

## Trạng thái tiếp theo

Review làm sạch và VAT đã có; review UX riêng chưa nhận được báo cáo lúc ghi tài liệu này. Chờ chủ dự án duyệt phạm vi đợt 1 trước khi viết/chạy pipeline; chưa xin quyết định nhóm hàng, provider AI hoặc hạ tầng ở bước này.
