# Xử lý review triển khai — coordinator

Ngày 2026-11-03. Review độc lập: [Claude implementation review](claude-implementation-review.md), trên commit `197628e`. Claude chỉ đọc/tư vấn, không sửa code. Các sửa dưới đây do coordinator thực hiện và kiểm chứng bằng hồi quy; không mô tả là Claude đã review lại hoặc xác nhận pháp lý.

## Phát hiện và xử lý

| Mục | Quyết định và sửa | Bằng chứng |
|---|---|---|
| C1 — vector trả kết quả vô nghĩa | Không dùng nearest-neighbor làm chứng cứ khi không có ứng viên từ khóa/fuzzy. Vector chỉ xếp lại ứng viên đã có căn cứ từ khóa. | Unit guard + browser/API với `xqzvw`, `asdfghjk`, mã 9 số trả 0 |
| C2 — `con dau` sai hạng đầu | Tie-break ưu tiên thứ hạng từ khóa; giữ khớp nguyên cụm ở đầu, không dùng mã số làm ưu tiên liên quan | Unit RRF, giữ từ `con` trong cụm tên hàng và API thật: `con dau`, `con dấu bằng tay` → `96110000` đầu tiên |
| I1 — phủ định làm đảo lời khai | Xét mệnh đề phủ định/không rõ, xử lý câu đối lập tiếng Việt; bỏ fact bị phủ định khi trùng fact cũ, không ghi thành khẳng định | Unit phủ định, sửa thành tự động, `không phải loại dùng bằng tay`, `mà gắn máy` |
| I2 — chat rỗng đưa 4 mã ngựa | Phân biệt yêu cầu mô tả mặt hàng với chế độ duyệt. Yêu cầu chỉ có stopword không tạo references | Browser/API với query rỗng, `tìm mã`, `tra hs`, `giúp tôi` |
| I3 — mã có dấu chấm lọt grounding | Chuẩn hóa mã 4/6/8 số, chặn mã ngoài tập/prefix ứng viên và citation sai mã | Unit với `8471.30.90`, nhóm 8471 và `[2]` trỏ sai mã |
| I4 — chat bỏ qua filter | UI gửi chương/dataset/category; API kiểm tra và áp scope. Không tìm thấy thì nói rõ phạm vi, không tự gỡ filter | Browser/API scope chương 98 và filter sai định dạng |
| Minor 1, nâng mức vì undo ảnh hưởng thao tác thật | Coalesce một lần sửa ô theo focus, không đẩy history khi dữ liệu không đổi; xóa fact rỗng khỏi hồ sơ | Unit + browser gõ tên dài rồi undo một lần |
| Minor 2, nâng mức vì lịch sử snapshot | Chỉ hash các file pin; identity gồm nội dung dẫn xuất; importer kiểm checksum, từ chối cùng version khác dữ liệu/metadata | Python identity tests; thử import snapshot giả có hash mới nhưng cùng version: bị từ chối, DB không đổi |
| Minor 3 — định dạng mã | Nhận dấu chấm, khoảng trắng, gạch, slash và underscore; mã dài hơn 8 không rơi sang semantic | Unit separators, API mã 9 số |
| Minor 4 — trạng thái filter | Số lượng chương có trong lựa chọn; chip riêng cho nhóm ưu tiên để người dùng bỏ được khi đóng bộ lọc | UI đã cập nhật; nhóm tiện ích vẫn chỉ boost |
| Minor 5/6, nâng mức vì mobile và accessibility | Input mobile >=16px; mở trợ lý cuộn và focus; dialog đóng/khôi phục focus về nút mở | Browser mobile viewport và native focus |
| Minor 7, nâng mức vì lưu hồ sơ | References lưu code/version, đọc chi tiết khi mở; migrate references cũ, loại tham chiếu hỏng mà giữ nội dung trao đổi; cảnh báo lưu thất bại giữ trên màn hình và có export | Unit serialization giảm payload, restore; browser lưu/tiếp tục/mở references |
| Minor 8 — chia sẻ | So snapshot; ghi rõ mã thiếu/phiên bản khác; không âm thầm coi danh sách bị rút ngắn là đầy đủ | Browser link version cũ + mã không có; link vẫn không chứa lời khai |

## Quyết định và giới hạn được giữ

- **Ruling:** chọn lexical-anchored semantic reranking, chưa mở semantic-only suggestions. Tránh đặt ngưỡng cosine tùy ý khi chưa có bộ gold. Đánh đổi: tên thương mại/đồng nghĩa chưa xuất hiện trong nguồn có thể cần alias được duyệt hoặc cách diễn đạt khác.
- **Ruling:** không chạy lại vòng reviewer để chứng minh từng sửa; dùng test tái hiện đã thấy lỗi rồi kiểm tra sửa, cùng toàn bộ suite và production build. Báo cáo gốc vẫn là ý kiến trước sửa.
- **Ruling:** bản này là local MVP. Auth nhiều người dùng, rate limit bền vững, budget API và HA chưa được coi đã xong; chúng là điều kiện cho public production, không bị che bằng kết quả test local.
- **Minor deferred:** 10 mã chương 98 có mã tương ứng không có trong bộ main được giữ nguyên như nguồn, không đoán/sửa mapping. UI gọi rõ là “mã tương ứng trong nguồn”; cần người nghiệp vụ xử lý trong đợt curation.
- **Minor deferred:** chưa chứng nhận WCAG/đo user test hay độ chính xác retrieval trên bộ gold. Các kiểm tra browser/focus/viewport là kiểm tra chức năng, không thay nghiên cứu người dùng.
- Không phát hành model weights hoặc dataset. Runbook giữ yêu cầu kiểm tra quyền khi phân phối nguồn bên ngoài; không nâng license MIT của code thành quyền dùng mọi dữ liệu.

## Những phần reviewer không kết luận

Recall/precision, tính đúng nghiệp vụ của taxonomy/thuế, license và public security đã được phân biệt khỏi kiểm tra code local. Không dùng kết quả tự động để thay người duyệt nghiệp vụ. Build và browser tests được coordinator chạy trực tiếp; không gán những kiểm tra đó cho Claude.

## Kiểm chứng cuối

Coordinator chạy trực tiếp: 29 unit TypeScript, 6 Python, 10 browser tests đều đạt; typecheck và production build đạt. Browser test bổ sung phát hiện Origin hợp lệ bị chặn do NextURL chuẩn hóa loopback; đã tái hiện 403 trước sửa, sửa đối chiếu HTTP Host và kiểm tra lại nguồn cùng host/khác host cùng luồng mở reference.
