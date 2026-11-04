# Kiểm tra luồng tra cứu và hội thoại — 04/11/2026

## Phạm vi

Dùng Chromium có hiển thị cửa sổ, desktop 1440×960 và mobile giả lập 390×844 có touch. Thao tác bằng ô nhập/nút/chọn chương/mở chi tiết/chuyển hồ sơ; đọc request thực tế và ảnh giao diện. Các browser context riêng chỉ chứa dữ liệu thử, không thay đổi localStorage Safari của người dùng. Chưa thử Safari hay bàn phím ảo trên thiết bị thật.

## Lỗi tái hiện trước sửa

- Nhập `con dấu`, rồi gửi `tìm con dấu kim loại`: request assistant vẫn có `query: con dấu`, header giữ ngữ cảnh cũ.
- Xóa ô tra danh mục trong khi chat mở: root trở lại landing; khung chat nằm ở y=677, cao 850px, phần nhập nằm ngoài viewport 960px.
- Trang đầu hiện đồng thời ô mô tả RAG và ô “Tra nhanh”.
- Truy vấn đầy đủ `con dấu kim loại` còn trả 688 ứng viên, gồm các hàng chỉ khớp vật liệu và đồng vị phóng xạ.

## Thiết kế / sửa

- Trang đầu mặc định Hỏi trợ lý, có lựa chọn Tra danh mục; mỗi chế độ chỉ hiện một ô nhập. Bỏ nhãn Tra nhanh trùng luồng.
- Yêu cầu tìm rõ ràng hoặc nhắc lại tên hàng cập nhật truy vấn. Câu bổ sung thuộc tính/câu hỏi giữ tên hàng; yêu cầu tìm mặt hàng khác tạo hồ sơ riêng. Đây là bộ quy tắc dự phòng, không phải suy luận LLM tổng quát.
- Mở trợ lý từ danh mục đang tra đồng bộ sang mặt hàng đó, áp dụng thuộc tính khai rõ trong truy vấn. Nếu danh mục khác hồ sơ chat đang mở, có lời nhắc và nút chuyển rõ ràng. Hồ sơ trước vẫn được lưu.
- Giữ bố cục làm việc khi chat mở, kể cả truy vấn danh mục trống.
- Nếu mô tả dài chỉ khớp một phần, dùng cụm tên hàng đầu câu có trong nguồn để tránh trộn các kết quả chỉ có vật liệu. Không thu hẹp theo những cụm chung như “bộ phận”, “phụ kiện”, “thiết bị”. Lời khai vẫn chỉ xếp hạng, bộ lọc chương vẫn là phạm vi rõ ràng.

## Kết quả dùng lại trực tiếp

| Luồng | Kết quả quan sát |
|---|---|
| Desktop: con dấu → tìm con dấu kim loại | Query/header đổi đúng; trong ca này danh sách và câu trả lời cùng có một mã tham khảo 96110000. Đây là kiểm tra truy xuất nguồn, không xác nhận mã cho một lô hàng. |
| Cùng luồng, rồi xóa truy vấn | Panel trước/sau đều x=1038, y=83, rộng 370, cao 850; ô chat vẫn ở trong màn hình. |
| Đổi tra danh mục sang máy in → Hỏi về mặt hàng này | Header đổi sang máy in, không hiện hội thoại con dấu; menu có hai hồ sơ riêng. |
| Chuyển lại hồ sơ con dấu kim loại | Giữ hai lời khai cũ và ngữ cảnh đúng. |
| Mobile: tìm con dấu → tìm con dấu kim loại | Khung chat x=0, y=0, 390×844; ô nhập y=693.5, cao 90; không tràn ngang. Trang đầu chỉ có một textbox hiển thị. |
| Mobile: đóng chat → lọc chương 96 → mở mã | Đọc được chi tiết và các trường thuế trong nguồn. |
| Mobile: tải lại → mở lại trợ lý | Khôi phục đúng con dấu kim loại, lịch sử còn nguyên; sau frame layout, khoảng cách tới cuối hội thoại = 0px. |

Không ghi nhận lỗi JavaScript ở hai browser context cuối. Ảnh local/gitignored: `.cache/2026-11-04-desktop-flow.png`, `.cache/2026-11-04-mobile-flow.png`.

## Kiểm thử và review

- Đã quan sát các regression fail trước sửa: truy vấn bị giữ cũ, hai ô nhập, handoff sai hồ sơ, prefix nhầm máy in với mực máy in, câu hỏi thuế đổi tên hàng, vật liệu cũ còn sót và loại mất dòng phụ tùng máy in lưới.
- Review code độc lập chỉ đọc; phát hiện và sửa ba vấn đề quan trọng về tách mặt hàng, thuộc tính cũ và câu hỏi không dấu hỏi. Review lần tiếp theo phát hiện cụm chung làm mất recall; bổ sung fixture và ngoại lệ trước khi chạy lại toàn bộ.
- **49 unit + 6 dữ liệu + 38 browser = 93 kiểm thử đạt.** Typecheck, production build, Prettier và git diff check đạt.
- Claude chỉ có báo cáo tư vấn trước đó; không gán lần review code này cho Claude.

## Giới hạn còn lại

Chưa có model chat được cấu hình: trợ lý vẫn trích xuất nguồn và dùng quy tắc để nhận diện lượt hỏi. Bộ dữ liệu thiếu một phần mô tả cấp cha/chú giải; các cụm tên hàng mơ hồ vẫn cần đối chiếu. Các ca này không thay thế tập gold đánh giá recall/precision trên nhiều ngành hàng hay thử nghiệm với người dùng độc lập.
