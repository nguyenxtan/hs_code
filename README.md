# HS Code Việt Nam

Dự án mã nguồn mở hỗ trợ tra cứu HS, lọc hàng hóa và hội thoại RAG có dẫn nguồn.

**Trạng thái:** đã có phản biện thiết kế từ Claude Code và bản tổng hợp của coordinator; chưa có ứng dụng chạy được. Các lựa chọn kỹ thuật dưới đây là đề xuất cần kiểm chứng bằng dữ liệu và thử nghiệm người dùng.

## Trải nghiệm hướng đến

- Tìm bằng mã hoặc mô tả hàng hóa tiếng Việt/Anh, có hoặc không dấu.
- Duyệt cây HS và nhóm hàng dễ hiểu; lọc theo thuộc tính có căn cứ.
- Chuyển kết quả tìm kiếm sang chat, hoặc chuyển lời khai trong chat thành bộ lọc có thể sửa.
- Khai báo sản phẩm dần qua nhiều lượt; lưu trạng thái, sửa lời khai và tiếp tục phiên trước.
- Đề xuất mã ứng viên, giải thích khác biệt, dẫn nguồn và chỉ rõ dữ kiện còn thiếu.
- Xuất bản dữ liệu có phiên bản, nguồn gốc và báo cáo chất lượng.

## Tài liệu

1. [Yêu cầu và tiêu chí nghiệm thu](docs/requirements.md)
2. [Kiến trúc đề xuất và các phương án](docs/architecture.md)
3. [Dữ liệu, làm sạch và phân nhóm](docs/data-strategy.md)
4. [Hội thoại và trải nghiệm filter/RAG](docs/conversation-ux.md)
5. [Lộ trình và đánh giá](docs/roadmap.md)
6. [Nguồn và giấy phép dữ liệu](docs/data-sources.md)
7. [Đề bài tham vấn Claude Code](docs/consultations/claude-brief.md)
8. [Báo cáo độc lập của Claude Code](docs/consultations/claude-review.md)
9. [Tổng hợp, điều chỉnh và đề xuất sau tham vấn](docs/consultations/synthesis.md)
10. [Thiết kế VAT theo điều kiện và thời điểm](docs/vat-design.md)
11. [Review làm sạch dữ liệu](docs/consultations/claude-cleaning-review.md)
12. [Review thiết kế VAT](docs/consultations/claude-vat-review.md)
13. [Tổng hợp review và phạm vi đợt 1 chờ duyệt](docs/consultations/review-status.md)

Theo yêu cầu review trước khi thực hiện, hiện chưa có pipeline hay dữ liệu đã làm sạch. Chỉ raw đã được tải để kiểm tra read-only và được gitignore. Chưa có category tiện ích được gắn.

## Hướng triển khai ban đầu

Ứng dụng Next.js/TypeScript và PostgreSQL, thêm pgvector khi triển khai truy xuất ngữ nghĩa. Pipeline dữ liệu chạy offline, xuất snapshot có manifest và báo cáo chất lượng; worker online chỉ thêm khi có tác vụ cần. Tách adapter mô hình chat/embedding, giữ API key phía server. Docker Compose cho tự triển khai. Đây là lựa chọn khởi điểm, chưa phải kết quả benchmark hay quyết định đã được chủ dự án duyệt.

MVP đề xuất đi theo hai bước: tra cứu/filter có căn cứ và so sánh mã trước; chat RAG dùng chung hồ sơ sau. Thuế thô được hiển thị tham khảo, chưa dùng lọc hoặc sắp xếp theo mức thuế. Xem bản tổng hợp để hiểu các giới hạn của báo cáo tham vấn.

## Đóng góp

Xem [CONTRIBUTING.md](CONTRIBUTING.md). Trước khi triển khai tính năng, thống nhất thiết kế và tiêu chí đánh giá. Không đưa hội thoại thật, API key hoặc dữ liệu chưa rõ quyền sử dụng vào Git.

## Giấy phép

Mã và tài liệu do dự án tạo: [MIT](LICENSE). Dữ liệu bên ngoài có giấy phép riêng; giấy phép MIT không cấp lại quyền với dữ liệu nguồn. Xem [nguồn dữ liệu](docs/data-sources.md).
