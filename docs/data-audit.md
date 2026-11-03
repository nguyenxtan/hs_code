# Kết quả chuẩn hóa kỹ thuật — 2026-11-03

Phạm vi đã chạy sau khi chủ dự án giao thực hiện A–Z: JSON, CSV, SQL metadata và workbook được cung cấp. Không diễn giải thuế, không tự dựng cây có tên pháp lý, không ghi đè raw.

## Kết quả

| Hạng mục | Kết quả |
|---|---:|
| Mã chính | 11.414 |
| Mã chương 98, lấy từ sheet riêng trong XLSX | 457 |
| Tổng input / accepted | 11.871 / 11.871 |
| Quarantine | 0 |
| Dòng có mô tả VI dẫn xuất khác raw | 531 |
| Trong đó main / chapter98 | 505 / 26 |
| Dòng áp chuẩn hóa khoảng trắng | 506 |
| Dòng có NBSP → space | 10 |
| Dòng cần NFC | 16 |
| Chương 98 thiếu mã tương ứng | 3 |
| Prefix 2 / 4 / 6 số của bộ main | 96 / 1.228 / 5.612 |

Các nhóm biến đổi có thể chồng lấp, không cộng ba dòng thống kê để suy số bản ghi đổi. Số prefix là đếm mã, không chứng minh đủ mô tả cây và không phải số category tiện ích.

JSON và CSV khớp từng trường/từng dòng bằng parser chuẩn. Sheet `HS_2022` khớp JSON. File CSV chương 98 riêng vẫn không có trong Drive, nhưng 457 bản ghi đã có trong workbook; không còn phải đoán hoặc chờ file CSV đó.

## Bảo toàn và tái lập

- Trường raw của mọi dòng main so khớp nguyên vẹn với JSON nguồn, gồm các chuỗi thuế, marker và newline.
- Chỉ tạo mô tả VI dẫn xuất bằng NFC/NBSP/khoảng trắng; không dùng NFKC, không đổi gạch dài hoặc ký hiệu đơn vị.
- Kiểm tra dash-level từ raw và bản dẫn xuất; không có trường hợp đổi cấp.
- Từng dòng có index, sheet, hash nguồn và phiên bản ruleset.
- Chạy lại cùng input cho output giống byte; raw hash trước/sau khớp.

Phiên bản snapshot sau hardening: `vn-hs2022-89808434c391-technical-v1`. Danh tính gồm đúng các file pin và nội dung records dẫn xuất; file lạ như `.DS_Store` không làm đổi bản. Checksum nguồn được pin trong `scripts/sources.json`; importer từ chối cùng version khác nội dung thay vì ghi đè.

Có 10 bản ghi chương 98 có mã tương ứng không có trong bộ main, ngoài 3 ô mã tương ứng trống đã thống kê. Giữ nguyên giá trị nguồn, chưa sửa mapping bằng suy đoán.

## File đầu ra local

`data/processed/2026-11-03/` gồm `snapshot.json`, `audit.json`, `transform-diff.json`, `quarantine.json`, `reconciliation.json`. Dữ liệu đầy đủ không được commit/publish lại lên GitHub.

## Phần chưa được chứng minh

Tên/mô tả cấp cha và chú giải phân loại đầy đủ; quyền và hiệu lực từng nội dung pháp lý; ngữ nghĩa ký hiệu thuế; tính đúng nghiệp vụ của từng dòng. 12 nhóm tiện ích trong UI là mapping đề xuất dùng xếp hạng, chưa phải taxonomy duyệt. Embedding không biến dữ liệu tham khảo thành căn cứ pháp lý.
