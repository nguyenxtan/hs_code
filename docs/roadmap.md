# Lộ trình và đánh giá

## Giai đoạn 0 — thiết kế và bằng chứng

Brief, báo cáo Claude và tổng hợp đã có trong `consultations/`; đề xuất vẫn chờ thống nhất trước implementation. Xác nhận license và quyền dùng nguồn bổ sung. Không coi tài liệu kiến trúc là ứng dụng đã triển khai.

## Giai đoạn 1 — nền dữ liệu

Importer có snapshot/hash; validation và quarantine; cây HS có mô tả đầy đủ; báo cáo chất lượng; taxonomy và alias bản đầu có duyệt. Chưa cần AI runtime để tra mã chính xác.

Nghiệm thu: tái lập import; bảo toàn raw; đối soát 11.414 dòng của snapshot đã xác nhận hoặc báo rõ khác biệt; không bịa dữ liệu chương 98 còn thiếu.

## Giai đoạn 2 — tra cứu và filter

Exact/prefix, tìm từ khóa Việt/Anh, facet và trang chi tiết/nguồn; so sánh mã, thu hẹp có hướng dẫn dựa trên điểm phân biệt đã duyệt. Có link chia sẻ trạng thái filter an toàn; UI responsive và bàn phím dùng được. Chưa filter/sắp xếp thuế thô.

Nghiệm thu: bộ truy vấn baseline gồm tên phổ thông, không dấu, typo, alias, “loại khác”; đo top-k và độ trễ; kiểm tra filter không làm mất dòng do thiếu nhãn.

## Giai đoạn 3 — chat theo session và RAG

Hồ sơ sản phẩm, sửa fact, nhiều sản phẩm, tiếp tục phiên; retrieval lai và nguồn dẫn; giới hạn AI và fallback. Chat/filter cùng trạng thái.

Nghiệm thu: con dấu nhiều lượt, sửa lời khai, câu hỏi rời, chuyển chủ đề, phiên dài, restart server, hai tab và ownership. Mã được gợi ý phải tồn tại, citation trỏ đúng evidence.

## Giai đoạn 4 — pilot và phát hành

Đánh giá cùng người dùng mới và người làm nghiệp vụ; đo chi phí/lượt, latency, retrieval recall, chất lượng câu hỏi làm rõ và tỷ lệ câu trả lời không đủ căn cứ. Thử restore backup, provider outage và dữ liệu sai. Công bố hạn chế và quy trình cập nhật.

## Bộ đánh giá

Tập câu hỏi chuẩn do chuyên gia duyệt, có phần tách riêng không dùng để tinh chỉnh. Gồm mã dễ, mã gần nhau, thiếu dữ kiện, thuật ngữ đa nghĩa, nguồn mâu thuẫn và ngoài phạm vi.

So sánh từ khóa với hybrid trên cùng tập trước khi thêm reranker. Đánh giá riêng tìm ứng viên, hỏi làm rõ, trích dẫn và lời giải; không chỉ chấm văn phong. Đo cả câu hỏi thừa và hội tụ sai, citation có hỗ trợ nhận định chứ không chỉ khớp chữ. Mục tiêu số cụ thể được chốt sau baseline, không suy từ điểm similarity.

## Điều kiện bắt đầu code

Chủ dự án duyệt thiết kế cuối và phạm vi MVP; sau đó viết kế hoạch triển khai có thứ tự, acceptance criteria và kiểm tra phù hợp. Không tự triển khai chỉ vì đã có repo.
