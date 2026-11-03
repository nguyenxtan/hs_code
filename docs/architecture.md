# Kiến trúc đề xuất

## So sánh phương án

| Phương án | Ưu điểm | Đánh đổi |
|---|---|---|
| A. Next.js/TypeScript + PostgreSQL + worker cùng repo | Ít thành phần, dễ đóng góp, dùng chung kiểu dữ liệu | Cần quản lý worker và giới hạn xử lý tài liệu; kiểm chứng thư viện tiếng Việt |
| B. Next.js + FastAPI/Python + PostgreSQL | Thuận tiện khi xử lý dữ liệu/OCR phức tạp | Hai runtime, thêm hợp đồng API và vận hành |
| C. Dịch vụ tìm kiếm/vector và workflow riêng | Tách mở rộng từng phần | Nhiều dịch vụ, chi phí và cấu hình chưa cần cho quy mô hiện biết |

Đề xuất khởi điểm A cho sản phẩm; cho phép công cụ xử lý dữ liệu viết Python nếu chứng minh được lợi ích. Chuyển sang B khi pipeline tài liệu cần hệ sinh thái Python đáng kể. Chưa gọi đây là tối ưu trước benchmark và phản biện.

## Thành phần

- Web: tra cứu, facet, bảng kết quả, chi tiết mã, chat và nguồn dẫn.
- API: xác thực, phiên, hồ sơ sản phẩm, tìm kiếm tham số hóa, truy xuất và phản hồi streaming.
- PostgreSQL: HS có phiên bản, cây phân cấp, nhãn, trạng thái hội thoại, tài liệu và nhật ký thay đổi.
- Tìm kiếm: ưu tiên exact/prefix; kết hợp từ khóa và vector khi có embedding; rerank nếu đo được lợi ích. Facet từ dữ liệu có cấu trúc, không từ top-k vector.
- Worker: import, validation, chuẩn hóa, chia đoạn, embedding, xuất quality report; công việc idempotent theo hash nội dung và phiên bản pipeline.
- Model adapters: chat và embedding có thể dùng nhà cung cấp khác; không gắn cứng tên model. Thay embedding model cần tạo lại index tương thích, không trộn vector khác không gian.
- File storage: file gốc, bản xuất, backup; MVP có thể dùng volume, production dùng kho riêng ngoài máy ứng dụng.

## Luồng mỗi lượt chat

1. Kiểm tra quyền truy cập session, khóa/kiểm tra revision để tránh hai tab ghi đè.
2. Ghi message với idempotency key; trích đề xuất cập nhật có schema.
3. Đối chiếu câu nguồn, sửa/thu hồi fact cũ khi rõ; hỏi lại nếu mâu thuẫn chưa rõ.
4. Dựng truy vấn đầy đủ từ sản phẩm đang chọn và filter; áp dụng ngày/phiên bản.
5. Tìm mã ứng viên và tài liệu liên quan; chỉ dùng nguồn người dùng có quyền đọc.
6. Kiểm tra tồn tại mã và nguồn dẫn; trả câu hỏi làm rõ hoặc kết quả có căn cứ.
7. Lưu kết quả, evidence và revision. Chỉ dữ kiện đã ghi thành công được coi là đã nhớ.

## Lưu trữ logic

- `dataset_versions`, `hs_nodes`, `hs_codes`: mã là text; khóa duy nhất theo dataset/version/code, không chỉ code.
- `tax_records`: raw + bản chuẩn hóa + điều kiện, thời gian, căn cứ, trạng thái xác minh.
- `categories`, `code_categories`, `attributes`, `code_attributes`, `aliases`: quan hệ nhiều-nhiều, nguồn và trạng thái duyệt.
- `documents`, `document_versions`, `chunks`, `embeddings`: URI, hash, vị trí đoạn, license, model/version/dimensions.
- `conversations`, `messages`, `products`, `product_facts`, `fact_events`, `summaries`: owner, revision, nguồn message, trạng thái xác nhận/suy đoán và lịch sử thay đổi.
- `ingestion_runs`, `quality_issues`, `evaluation_runs`: tái lập và kiểm tra chất lượng.

Đây là mô hình khái niệm, chưa phải migration SQL.

## Hạ tầng và vận hành

Khởi điểm pilot: VPS 4 vCPU/8 GB RAM với SSD, Docker Compose, HTTPS; AI qua API nên không cần GPU nội bộ. Đây là giả định định cỡ, không phải cam kết concurrency. Redis, database riêng và nhiều API replica chỉ thêm khi đo tải cho thấy cần.

Backup mã hóa ra ngoài VPS và thử restore; log không ghi lời khai/secret mặc định. Rate limit theo người dùng, giới hạn token/công việc; timeout và retry có giới hạn. Khi AI lỗi, tra cứu/filter vẫn hoạt động.

Giới hạn dữ liệu gửi nhà cung cấp theo tác vụ; tài liệu truy xuất là dữ liệu không đáng tin, không được tự cấp quyền gọi công cụ hay thay chỉ dẫn hệ thống. Kiểm tra ownership ở backend, không dựa vào UUID khó đoán.

## Tài liệu kỹ thuật cần đối chiếu khi triển khai

- [pgvector](https://github.com/pgvector/pgvector)
- [PostgreSQL backup](https://www.postgresql.org/docs/current/backup.html)

Phiên bản dependency, provider và chi phí phải được kiểm chứng lại lúc triển khai.
