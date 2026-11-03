# Tổng hợp sau tham vấn Claude Code

Ngày: 2026-11-03. Trạng thái: đề xuất của coordinator để chủ dự án xem xét, chưa phải phê duyệt triển khai.

## Vai trò và bằng chứng

Claude chỉ tạo báo cáo `claude-review.md`; không tạo/sửa code, không cài dependency, không deploy và không review implementation chưa tồn tại. Coordinator đã đọc toàn bộ báo cáo, đối chiếu các tài liệu repo và kiểm tra lại LICENSE-DATA upstream. Các thống kê Drive vẫn là kết quả đọc ban đầu của coordinator; Claude không tải lại được file.

## Đề xuất tiếp thu

| Chủ đề | Đề xuất sau phản biện | Vì sao |
|---|---|---|
| Kiến trúc | Next.js/TypeScript + một PostgreSQL; pipeline offline xuất snapshot | Ít dịch vụ, tách xử lý tài liệu khỏi runtime, có thể đổi pipeline sang Python mà không thêm API |
| MVP | Tra cứu/cây/filter/so sánh mã trước, chat RAG sau | Có baseline và vẫn sử dụng được khi AI lỗi |
| Thuế | Chỉ hiển thị raw có nguồn/ngày; bỏ lọc và sắp xếp thuế khỏi MVP | Chưa có parser điều kiện và hiệu lực đã xác minh |
| Ràng buộc | Tách user_filter, user_fact, inferred | Lời khai đúng không đồng nghĩa dữ liệu nhãn đủ tốt để filter cứng |
| Hội thoại | Hỏi theo điểm phân biệt có căn cứ; có lựa chọn không biết | Giảm hỏi thừa mà không tự chốt mã khi retrieval thiếu |
| Phân nhóm | Thử gắn nhãn cấp nhóm rồi kế thừa, có ngoại lệ và kiểm tra coverage | Giảm công duyệt, giữ khả năng sửa ở dòng chi tiết |
| Version | Tách nomenclature, hiệu lực chính sách và snapshot ingest | Phiên cũ phải giải thích được kết quả theo đúng thời điểm/nguồn |
| Đánh giá | Bộ case chuyên gia và held-out trước khi tinh chỉnh search/RAG | Chưa có cơ sở gọi một phương án là tối ưu |

Đây là khuyến nghị sau tham vấn, không phải lựa chọn đã được người dùng chốt từng mục.

## Các điểm không tiếp thu nguyên trạng

1. **Không mặc định “luôn có dòng Loại khác” hay 0 kết quả chỉ do filter.** Snapshot có thể thiếu, ngoài phiên bản, thuật ngữ chưa được bao phủ hoặc sản phẩm chưa đủ mô tả. UI báo không tìm thấy trong dữ liệu/phạm vi hiện tại; không tự gán mã dư và không kết luận hàng hóa không có mã.
2. **Một mã trong top-k không đủ để dừng kiểm tra nghiệp vụ.** Retrieval có thể bỏ sót nhánh đúng. Chỉ dừng hỏi về thuộc tính không giúp phân biệt; vẫn kiểm tra chú giải, loại trừ và mức đủ dữ kiện. Luôn giữ trạng thái ứng viên nếu thiếu căn cứ.
3. **Citation khớp chữ chỉ chứng minh đoạn có tồn tại.** Phải kiểm tra đoạn có hỗ trợ đúng nhận định, đúng phạm vi hàng hóa, phiên bản và thời gian không. Một lời giải trích đúng văn bản vẫn có thể áp dụng sai.
4. **Cây HS chưa đủ tự sinh toàn bộ quyết định.** Câu hỏi từ nhánh cây là baseline; phải bổ sung chú giải/quy tắc liên quan được phép sử dụng và người nghiệp vụ duyệt. Không tự suy luật phân loại chỉ từ nhãn nhánh.
5. **Facet “X hoặc chưa rõ” không được hiển thị như chỉ có X.** Nếu cung cấp chế độ bao gồm chưa rõ, UI ghi rõ và đếm riêng phần này; người dùng có thể chọn chỉ X. Facet thiếu coverage được gắn cảnh báo hoặc dùng làm gợi ý, không âm thầm thay nghĩa filter.
6. **Kế thừa nhóm có ngoại lệ.** Mô tả cấp cha không tự động chứng minh mọi thuộc tính của mọi dòng con. Mapping phải lưu cấp áp dụng, ngoại lệ và nguồn. Mở rộng nhánh anh em là heuristic retrieval cần đo recall/chi phí, không bảo đảm đúng.
7. **Không cam kết hiệu năng hoặc bộ nhớ toàn hệ thống từ kích thước vector thô.** Ước lượng 12k × 1024 × 4 bytes chỉ là payload vector; chưa gồm chunk tài liệu, index và overhead. Chọn exact hay ANN sau benchmark thực tế.
8. **Không tự suy điều kiện áp dụng Việt Nam từ HS quốc tế hoặc giấy phép từ tên file.** Mốc quốc tế không xác định ngày chuyển đổi nội địa. Quyền tái sử dụng cần xét snapshot và từng nội dung; không coi mọi nhãn độc lập đều tự động là dữ liệu phái sinh.

## Nguồn đã kiểm tra lại

[LICENSE-DATA upstream](https://github.com/ozvietnam/hs-code-api/blob/main/LICENSE-DATA), đọc 2026-11-03: công bố CC BY-SA 4.0 cho dữ liệu thuộc phạm vi, attribution và chia sẻ tương tự cho bản sửa/phái sinh; nêu ngoại lệ `data/wco-op/`. Đây là tuyên bố của upstream, không chứng minh quyền dùng của dự án này với nội dung WCO. Chưa nhập hay tái phân phối dữ liệu ngoài vào repo.

Chưa đối soát byte/mã giữa Drive và upstream; phép cộng 11.414 + 457 chỉ hỗ trợ giả thuyết, không xác nhận hai nguồn giống nhau. Các nguồn phụ upstream cần được audit trước khi chọn dùng.

## Thứ tự công việc đề xuất

1. Chốt đối tượng pilot, nguồn dữ liệu và người duyệt nghiệp vụ.
2. Audit snapshot: hash, schema, cây bị thiếu, giấy phép và đối soát chương 98.
3. Tạo bộ đánh giá ban đầu gồm tình huống đủ/thiếu dữ kiện, alias đa nghĩa, “loại khác”, sửa lời khai và nhiều sản phẩm.
4. Chuẩn hóa dữ liệu và làm baseline lexical/cây/filter; so sánh mã và thu hẹp có hướng dẫn khi đủ căn cứ.
5. Thêm retrieval ngữ nghĩa và chat session; đo giá trị tăng thêm so với baseline, kiểm tra nguồn hỗ trợ nhận định.

Không cần thêm search engine, Redis hay microservice trước khi đo được hạn chế. Chưa cần ấn định nhà cung cấp AI để chốt thiết kế adapter.

## Cần chủ dự án quyết định trước implementation

- Người dùng pilot chính: người mới hay chuyên viên.
- Tài khoản để lưu xuyên thiết bị, hay MVP chỉ lưu trên một trình duyệt; hai lựa chọn có hành vi bảo mật/khôi phục khác nhau.
- Người duyệt nhãn, quy tắc và bộ case; quyền dùng các nguồn bổ sung.
- Có chấp nhận phân phối dữ liệu phái sinh theo điều kiện nguồn hiện tại hay cần pipeline nguồn khác.

Các lựa chọn này không cản việc hoàn tất repo và tư vấn đã được yêu cầu; chúng cần được ghi vào thiết kế được duyệt trước khi xây ứng dụng.
