# HS Atlas — tra cứu mã HS Việt Nam

Ứng dụng mã nguồn mở để tìm, lọc, so sánh mã HS và khai báo sản phẩm qua hội thoại có nguồn tham khảo.

**Trạng thái:** local MVP đã có pipeline chuẩn hóa kỹ thuật, tra cứu/filter, 12 nhóm gợi ý, so sánh, hồ sơ trình duyệt và trợ lý truy xuất. Chưa phải công cụ tự động chốt mã hoặc VAT, chưa triển khai public production. Claude chỉ tham vấn/review; coordinator triển khai.

## Chạy nhanh

Cần Node 22+, Python 3.9+. Tải bốn file nguồn theo [hướng dẫn dữ liệu](data/README.md) trước khi chạy chuẩn hóa.

```sh
npm ci
npm run data:prepare
cp .env.example .env.local
npm run dev
```

Mở **http://127.0.0.1:3100**. Không cần API key để tra cứu hoặc dùng trợ lý trích xuất. PostgreSQL và embedding local là các tùy chọn trong [runbook](docs/runbook.md).

## Có gì trong bản đầu?

- 11.414 mã chính và 457 mã chương 98 từ workbook nguồn, tổng 11.871 bản ghi.
- Tra mã chính xác/tiền tố có dấu chấm, tên Việt/Anh, tìm không dấu và fallback typo.
- Lọc trực tiếp theo chương/bộ dữ liệu. 12 nhóm tiện ích còn ở bản đề xuất, chỉ ưu tiên thứ tự, không loại mã.
- So sánh 2–4 mã; xem nguyên văn thuế, ghi chú, provenance và nguồn.
- Khai báo dần, sửa/hoàn tác và giữ riêng từng sản phẩm; lưu trên thiết bị, xuất/xóa hồ sơ được.
- Trợ lý trích xuất có references. Tùy chọn embedding multilingual local và mô hình Chat Completions qua cấu hình server; khi AI không dùng được vẫn có tìm kiếm thường.
- Chia sẻ danh sách mã/snapshot không kèm lời khai hoặc lịch sử.

## Chuẩn hóa dữ liệu

Raw bất biến; code giữ text. Mô tả chuẩn hóa lưu riêng và có diff. Đã đối soát JSON/CSV/XLSX mã chính, 11.871 dòng accepted, 0 quarantine, 531 dòng có biến đổi kỹ thuật. Xem [báo cáo](docs/data-audit.md). Đầu ra đầy đủ, model weights, vectors và backup nằm local/gitignored.

Mô tả cấp cha/chú giải còn thiếu. Tiếng Anh là tham khảo. Ô thuế trống không phải số 0; VAT raw không phải mức áp dụng. Chức năng xác định VAT theo điều kiện/thời gian mới ở mức [thiết kế](docs/vat-design.md), chưa bật.

## Kiểm tra và vận hành

```sh
npm run test:data
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Browser tests cần dữ liệu local và Chromium. [Runbook](docs/runbook.md) có thiết lập PostgreSQL, embedding, provider chat, backup/restore và các việc còn cần cho public production.

## Thiết kế và các lượt tham vấn

- [Yêu cầu](docs/requirements.md), [kiến trúc](docs/architecture.md), [hội thoại UX](docs/conversation-ux.md).
- [Chiến lược dữ liệu](docs/data-strategy.md), [nguồn/giấy phép](docs/data-sources.md), [VAT](docs/vat-design.md).
- Claude: [kiến trúc](docs/consultations/claude-review.md), [làm sạch](docs/consultations/claude-cleaning-review.md), [VAT](docs/consultations/claude-vat-review.md), [UX](docs/consultations/claude-ux-review.md).
- [Tổng hợp review](docs/consultations/review-status.md), [kế hoạch thực hiện](docs/superpowers/plans/2026-11-03-hs-code-mvp.md), [tiến độ và quyết định](docs/implementation-progress.md).
- [Review code/UI của Claude](docs/consultations/claude-implementation-review.md) và [xử lý phát hiện](docs/consultations/implementation-review-response.md).

Các báo cáo tư vấn là tài liệu theo thời điểm, có giả định chưa xác minh; xem runbook và progress để biết trạng thái code thực tế.

## Giấy phép và đóng góp

Mã/tài liệu dự án: [MIT](LICENSE). Dữ liệu ngoài có giấy phép riêng: **HS Knowledge Base — github.com/ozvietnam/hs-code-api**, CC BY-SA 4.0 theo nguồn. Không phát hành lại dataset hoặc nội dung WCO trong repo. [Đóng góp](CONTRIBUTING.md).
