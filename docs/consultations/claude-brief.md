# Đề bài tham vấn Claude Code

## Bối cảnh và yêu cầu của chủ dự án

Tạo repo mã nguồn mở `hs_code`, tra cứu HS Việt Nam, filter dễ dùng và chat RAG khai báo dần. Tham vấn trực tiếp Claude Code để phản biện yêu cầu và đề xuất giải pháp phù hợp, không chỉ liệt kê công nghệ.

Dữ liệu, ví dụ con dấu, hiện trạng đã được ghi ở các tài liệu trong `docs/`. Chưa có mã ứng dụng. Những lựa chọn trong architecture là đề xuất của coordinator, chưa được chủ dự án duyệt và chưa benchmark.

## Phạm vi tư vấn

Vai trò được chủ dự án xác nhận: Claude chỉ tham vấn, review kiến trúc tổng thể, review code khi có và đề xuất phương án tối ưu có đánh đổi. Claude không viết/sửa code ứng dụng hoặc triển khai. Hiện chưa có code nên báo cáo chỉ đánh giá thiết kế, không được mô tả là đã review implementation. Coordinator tổng hợp ý kiến và chịu trách nhiệm triển khai sau khi thống nhất thiết kế.

1. Đọc README và tất cả tài liệu hiện có. Phân biệt bằng chứng đã kiểm tra với giả định.
2. Phản biện UX: người mới và chuyên viên, tìm kiếm/filter/chat dùng chung trạng thái, hỏi vừa đủ, sửa lời khai, nhiều sản phẩm, phiên dài, không kết quả.
3. Phản biện dữ liệu: hierarchy/context thiếu, nhóm nhiều-nhiều, facet chưa đủ coverage, raw tax, temporal versioning, licensing, alias đa nghĩa, kiểm duyệt AI.
4. So sánh ít nhất hai lựa chọn kiến trúc thực tế cho OSS tự triển khai; chọn một với lý do và điều kiện cần thay đổi, không tự gọi tối ưu nếu chưa đo.
5. RAG: query rewriting, retrieval lai, evidence/citation, chống mất mã do filter suy đoán, đánh giá câu hỏi làm rõ, provider-neutral, chi phí và fallback.
6. Chỉ ra thiếu sót cụ thể theo mức ưu tiên; đề xuất MVP, tiêu chí đánh giá, câu hỏi còn cần chủ dự án trả lời.

## Đầu ra và giới hạn

Viết ý kiến độc lập bằng tiếng Việt tại `docs/consultations/claude-review.md`. Chỉ được tạo/sửa file review này. Không thay tài liệu coordinator, không code/scaffold/install, không commit/push, không tạo tài khoản/tài nguyên cloud, không truy cập secret hay chat riêng khác.

Nếu cần dẫn khẳng định kỹ thuật hoặc pháp lý, ưu tiên nguồn chính thức, ghi URL và ngày kiểm tra. Nếu không kiểm chứng được, ghi rõ giả định. Không cần tải lại toàn bộ dữ liệu nếu không giúp kết luận; các thống kê đã có được gắn nguồn trong data-strategy.

Hoàn thành khi file tồn tại, có khuyến nghị rõ, tradeoff, blockers và kế hoạch xác minh. Báo đường dẫn và tóm tắt cho coordinator qua worker_done. Nếu chỉ ghi được hạn chế, báo đúng tình trạng; không khẳng định đã thử ứng dụng chưa tồn tại.
