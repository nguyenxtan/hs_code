# Chuẩn hóa, phân nhóm và kiểm soát dữ liệu

## Những gì đã kiểm tra trong cuộc trao đổi

File JSON trong Drive có 11.414 dòng, 11.414 mã khác nhau và 12 trường. Đây là kết quả đọc snapshot trong phiên tư vấn ngày 2026-11-03, chưa phải báo cáo kiểm toán tái lập từ repo.

- `hs_code`, `mo_ta_vi`, `mo_ta_en_tham_khao`, `don_vi_tinh`, các trường thuế và `source_url` đều có giá trị.
- 3.742 dòng trống quản lý chuyên ngành; 11.280 trống BVMT; 9.853 trống ghi chú giảm VAT.
- VAT có chuỗi `8/10`, `10/8`, `*/5/8/10`; ACFTA có `0 (-KH)` và các biến thể.
- Mô tả tiếng Việt có nhiều mục phụ thuộc cấp cha; bản tiếng Anh là tham khảo, không mặc định tương đương pháp lý hoàn toàn.
- SQL nhắc 457 mã chương 98, nhưng thư mục đã liệt kê chỉ có bốn file và chưa thấy CSV chương 98.

## Ba lớp dữ liệu

1. **Raw:** bytes gốc, SHA-256, nguồn, thời điểm lấy, license, snapshot; bất biến.
2. **Canonical:** chuẩn định dạng, HS hierarchy đúng phiên bản, trường thuế có trạng thái parse, mô tả đầy đủ có nguồn.
3. **Discovery:** nhóm tiện ích, alias, thuộc tính, search text, embedding; tái tạo được từ lớp trước và các quyết định duyệt.

## Pipeline đề xuất

Nhập nguồn → kiểm tra checksum/schema/encoding → validate → chuẩn hóa → ghép cây HS → trích trường có quy tắc → đề xuất nhãn → duyệt → xuất quality report → publish snapshot/index.

Lỗi khóa/phiên bản/mã sai bị quarantine. Không tự bỏ dòng rồi báo import thành công. Phải có thống kê input/accepted/quarantined, lý do và cách phục hồi. Import lại cùng snapshot không nhân đôi dữ liệu.

## Quy tắc làm sạch

| Trường | Quy tắc |
|---|---|
| Mã HS | Text 8 số ở dataset này; giữ leading zero; kiểm tra duplicate theo version |
| Mô tả | Unicode NFC, khoảng trắng; giữ raw và ký hiệu cấp; search không dấu là trường riêng |
| Mô tả đầy đủ | Ghép đúng nhánh và cấp mô tả có căn cứ; không chỉ suy ra tên cấp từ prefix; bảo toàn chú giải và từ loại trừ |
| Thuế | Giữ raw; parse mức/đơn vị/điều kiện chỉ khi quy tắc đã xác minh; không lấy số đầu tiên hoặc nhỏ nhất làm thuế áp dụng |
| Trống | Phân biệt unknown/not-recorded/not-applicable; không map trống thành false hoặc 0 |
| Quản lý chuyên ngành | Tách từng yêu cầu, mã văn bản, phụ lục và nguồn khi có; tên viết tắt cần từ điển duyệt |
| Nguồn | URL + snapshot/hash; bổ sung căn cứ chính thức khi có; ngày tải khác ngày hiệu lực |

Không gộp mã chỉ vì cùng mô tả “Loại khác”. Không tự sửa nội dung pháp lý bằng mô hình. Thay đổi quy tắc cần diff, kiểm tra hồi quy và ghi phiên bản.

VAT được chuẩn hóa thành quan sát nguồn và bộ quy tắc có phạm vi/hiệu lực, không thành một phần trăm cố định của mã HS. Giữ riêng không chịu thuế, chịu 0% và không phải kê khai/tính nộp; phân biệt mức cơ bản, mức sau giảm, kết quả áp dụng và tình trạng chưa đủ dữ kiện. Xem [thiết kế VAT](vat-design.md) để biên soạn dữ liệu và kiểm tra.

## Phân nhóm ba lớp

- Cây HS chính thức: phần/chương/nhóm/phân nhóm và các cấp chi tiết của đúng danh mục.
- Nhóm tiện ích: văn phòng phẩm, máy móc, thực phẩm… có nhiều-nhiều, dùng để khám phá.
- Thuộc tính theo nhóm: vật liệu, công dụng, cơ chế, trạng thái hàng; không áp một schema phẳng lên mọi sản phẩm.

Mỗi mapping lưu `source`, `method` (rule/manual/model), `review_status`, `evidence`, `taxonomy_version`. Điểm tự tin của mô hình không phải xác suất đúng đã được kiểm định.

Nhãn đã duyệt có thể dùng filter cứng khi người dùng chủ động chọn; nhãn AI chưa duyệt chỉ boost/rerank hoặc hiển thị để xác nhận. Thiếu nhãn không đồng nghĩa không phù hợp. Với facet thuộc tính chưa phủ đủ, hiển thị mức bao phủ và nhóm “chưa rõ”. Nếu có chế độ bao gồm chưa rõ, phải ghi rõ trên chip và đếm riêng, không hiển thị như chỉ có giá trị đã chọn.

Thử gắn nhóm tiện ích ở cấp nhóm rồi kế thừa có ngoại lệ thay vì duyệt mọi dòng riêng lẻ; kiểm tra độ phủ và tính đúng trước khi áp rộng. Alias đa nghĩa nên gắn khái niệm và các nghĩa, rồi ánh xạ sang nhiều nhánh; không ép một tên phổ thông về một mã duy nhất.

Alias có thể một-nhiều và theo ngữ cảnh. Ví dụ “con dấu”, “dấu đóng”, “stamp” cần kiểm tra, không ép mọi nghĩa về một mã duy nhất.

## Cổng chất lượng trước publish

- Đối soát số bản ghi; mã hợp lệ/unique trong version; node cha hợp lệ; phát hiện vòng lặp.
- Báo tỷ lệ trường thiếu, mô tả phụ thuộc cha, parse thuế thất bại, nhãn chưa duyệt.
- So sánh diff với snapshot trước; có thể rollback dataset và search index đồng bộ.
- Bộ mẫu chuyên gia kiểm tra mapping, mô tả ghép và alias đa nghĩa.
- Xác minh quyền sử dụng, attribution và nghĩa vụ phân phối từng nguồn trước khi commit raw/derived data.
