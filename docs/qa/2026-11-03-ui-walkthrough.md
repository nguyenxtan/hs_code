# Dùng thử UI/UX trực tiếp — 03/11/2026

## Cách thử

Dùng dữ liệu thử riêng ở localhost, không thao tác hồ sơ Safari của chủ dự án. Thử thao tác từng bước qua trình duyệt nhúng rồi Chromium **có hiển thị cửa sổ**: nhập chữ, bấm nút, chọn chương, tick so sánh, mở chi tiết, hỏi về mã, sửa/hoàn tác hồ sơ, đóng/tải lại/mở lại chat. Ảnh sau sửa được chụp và xem trực tiếp. Trình duyệt nhúng không chụp được frame nên phần kiểm tra bằng mắt dùng Chromium.

Desktop 1440×900; mobile 390×844, touch/mobile được giả lập trong Chromium. Chưa kiểm tra Safari hay bàn phím ảo trên điện thoại thật. Đây là walkthrough của người triển khai, không phải nghiên cứu với người dùng độc lập hay benchmark phân loại HS.

## Kết quả thao tác

| Tác vụ thực tế | Kết quả |
|---|---|
| Nhập “Tôi cần tra con dấu” vào ô chính | Trước sửa có da chồn xếp trước. Sau sửa danh sách và trích dẫn đều trả 96110000 trong ca này. Đây là kiểm tra tìm văn bản nguồn, không kết luận mã của một lô hàng. |
| Bổ sung “Bằng tay, vỏ nhựa, mặt cao su” | Hồ sơ lưu đúng ba thuộc tính. Lời khai giờ được gửi cho xếp hạng danh sách khi truy vấn thuộc đúng hồ sơ đang chọn. |
| Sửa vật liệu vỏ thành kim loại rồi hoàn tác | Trở lại nhựa; mặt cao su được giữ nguyên. |
| Tra máy in → chương 84 → chọn 84431200 và 84431400 | Mở được màn so sánh, đọc mô tả/đơn vị/VAT nguyên văn và nguồn. |
| Mở chi tiết từ so sánh → hỏi trợ lý về mã | Giữ được truy vấn “máy in” và phạm vi chương, hội thoại gắn đúng mã. |
| Đổi truy vấn khi dữ liệu đang tải | Trước sửa lộ danh sách ngựa từ lần tải cũ; sau sửa hiện trạng thái chờ, không gắn kết quả cũ với truy vấn mới. |
| Đóng chat, tải lại trang, mở lại trên mobile | Giữ lịch sử và lời khai. Trước sửa mở ở đầu lịch sử; sau sửa ở câu trả lời cuối, khoảng cách tới cuối = 0px trong lần dùng lại. Ô soạn vẫn trong màn hình. |
| Hỏi “Đây có phải máy in phun không?” trong hồ sơ mã offset | Trợ lý hiện trích lại mô tả nguồn; chưa diễn giải câu hỏi như một LLM. Giới hạn này còn tồn tại, không được coi đã khắc phục bằng UI. |

## Các sửa thực hiện

1. Dùng các từ khóa có nghĩa cho ưu tiên cụm; khi có khớp đầy đủ với chữ có dấu người dùng nhập, ưu tiên tập khớp đó để tránh “dấu” bị trộn với “đầu”. Khi không có, vẫn có fallback không dấu/fuzzy. Kiểm tra có dấu đọc từ description/description_en vì search_text trong dữ liệu thật đã bị fold. Fixture unit cũng được sửa để phản ánh điểm này.
2. Danh sách và chat dùng chung lời khai xếp hạng, không biến chúng thành bộ lọc loại trừ. Lời khai gửi trong body POST của search, không đưa vào link chia sẻ. Đổi sang truy vấn không thuộc hồ sơ hiện tại thì không mang thuộc tính cũ theo.
3. Không hiện dòng/count/facet của từ khóa cũ dưới truy vấn mới trong lúc chờ. Phạm vi chương vẫn được giữ trong state và dòng tiêu đề.
4. Rút gọn phần trích xuất dài thành đoạn trích có dấu “…”, giữ mã/citation và nhắc phần cấp cha/chú giải thiếu. Toàn văn vẫn trong chi tiết nguồn.
5. Khi mở lại hội thoại hoặc chuyển hồ sơ, cuộn sau khi layout hiện để thấy lượt mới nhất.

## Bằng chứng và giới hạn

- Đã thấy unit và browser regressions fail trước sửa: xếp sai con dấu; kết quả cũ còn hiện; mobile mở lại cách cuối 410px.
- Review code độc lập phát hiện search_text dữ liệu thật đã mất dấu; sửa để đọc trường mô tả còn dấu. Không gán review này cho Claude; Claude chỉ có báo cáo thiết kế trước đó.
- Sau sửa: **32 unit + 6 kiểm thử dữ liệu + 33 browser = 71 đạt**; typecheck và production build đạt.
- Ảnh local/gitignored: `.cache/manual-ux-after-desktop.png`, `.cache/manual-ux-after-mobile.png`.
- Còn cần: model/endpoint thực tế cho diễn giải hội thoại, tập gold đánh giá recall/precision ở nhiều nhóm hàng, thử người dùng và kiểm tra Safari/thiết bị thật. Không khẳng định đã giải quyết mọi mơ hồ khi tìm không dấu hoặc mọi trường hợp phân loại.
