# Chạy và vận hành bản local

## Khởi động

Yêu cầu Node >=22, Python >=3.9 và npm. Docker chỉ cần khi chọn PostgreSQL.

1. `npm ci`
2. Tải đúng bốn file theo `data/README.md` vào `data/raw/2026-11-03/`.
3. `npm run data:prepare`
4. `cp .env.example .env.local`
5. `npm run dev` → http://127.0.0.1:3100

Không có dữ liệu: trang báo chưa sẵn sàng, không tự tạo dữ liệu giả. Muốn thử bản production: `npm run build` rồi `npm start`. Không chạy dev/start đồng thời cùng cổng. Server bind loopback; chưa phải cấu hình public production.

## PostgreSQL tùy chọn

`docker compose up -d db`, rồi `npm run data:import`. Mặc định script dùng tài khoản development local trong compose, cổng 55439. Để app đọc database, đặt `DATABASE_URL=postgresql://hs_code:hs_code_local@127.0.0.1:55439/hs_code` trong `.env.local`, restart app.

Với môi trường khác, truyền `DATABASE_URL` trong environment khi chạy script; file `.env.local` được Next đọc nhưng script CLI không tự nạp. Không dùng password development này khi triển khai public. Port DB chỉ bind 127.0.0.1.

Importer có transaction, khóa theo tác vụ, khóa mã theo version và idempotency; giữ snapshot cũ, chỉ đổi con trỏ active sau khi đủ bản ghi. Sau khi đổi active cần restart app vì snapshot được cache theo process.

## Embedding local

`npm run data:embed` tải model `Xenova/multilingual-e5-small` vào `.cache/models`, dùng CPU và model quantized. Lần đầu cần mạng để tải model; các lượt sau dùng cache. Cần kiểm tra license model và nguồn khi phân phối, không commit weights hoặc vectors.

Index ghi nguyên tử, có ID snapshot/model/dimensions; script có thể chạy lại để tiếp tục. Bật `HS_EMBEDDINGS_ENABLED=true` và restart app sau khi index hoàn thành. Mất index, khác snapshot hoặc model lỗi thì dùng lexical fallback. Index một phần được gắn mode riêng, không coi đã phủ toàn dataset. Sau review, vector chỉ xếp lại ứng viên từ khóa/fuzzy; không có căn cứ từ khóa thì trả rỗng, không đưa top-40 vô điều kiện. Đây là lựa chọn bảo thủ trước khi có bộ gold và alias duyệt; không bảo đảm tìm được mọi tên thương mại.

Giới hạn dev: vectors nằm file runtime, tìm cosine ở app; chưa cần ANN cho quy mô này. Không xem việc tạo đủ vectors là benchmark recall. Giới hạn memory/tải đồng thời và chất lượng search cần pilot trước public deployment.

## Trợ lý và mô hình chat

Mặc định là trợ lý trích xuất: tìm dòng mã theo hồ sơ, trả references, báo thiếu chú giải. Có thể khai dần các thuộc tính được hỗ trợ, sửa/undo; không giả lập việc đã gọi LLM.

Để bật diễn giải LLM, cấu hình `HS_CHAT_MODEL`, `HS_CHAT_BASE_URL` và `HS_CHAT_API_KEY` (hoặc `OPENAI_API_KEY`) phía server. Local endpoint localhost tương thích Chat Completions có thể không cần key. Không có model hoặc provider lỗi thì giữ chế độ trích xuất. Chat không được tự chốt VAT. Mã/số %/citation được hậu kiểm cú pháp; đây không phải xác minh tự động mọi nhận định pháp lý.

Quota đăng nhập Codex không được dùng thay project API key. Theo [OpenAI API credits](https://developers.openai.com/api/docs/guides/chatgpt-api-credits), một số gói ChatGPT đủ điều kiện có thể nhận API credits riêng sau khi liên kết tổ chức. Chưa kiểm tra eligibility/balance tài khoản của chủ dự án. Dự án không đọc auth.json hay chuyển OAuth token sang API.

## Phiên, chia sẻ và quyền riêng tư

Hồ sơ/chat/facts/revisions lưu trong localStorage của origin. References chỉ giữ code/version, không lặp raw trong từng tin. Khi mở reference, app đọc đúng version nếu còn trong database; file mode chỉ có thể đọc snapshot hiện tại và báo rõ khi bản cũ không còn. Không đồng bộ xuyên thiết bị; xóa dữ liệu trình duyệt sẽ mất. Hồ sơ được khôi phục nhưng trợ lý không tự mở khi tải lại; người dùng mở “Hỗ trợ tìm mã” để tiếp tục. Phạm vi UI hiện chọn theo chương (gồm chương 98), còn dataset vẫn được API hỗ trợ. Lưu thất bại có cảnh báo cố định kèm export. Nút xuất hồ sơ ghi rõ có lời khai.

Link chia sẻ chỉ có code và snapshot ID, không có truy vấn/facts/chat. Người nhận cần app có dữ liệu; bản đầu cảnh báo đối chiếu snapshot nhưng chưa phục hồi tự động snapshot lịch sử. File export mã không kèm lời khai. Không gửi truy vấn hay feedback tới dịch vụ thu thập thống kê.

## Backup và khôi phục

Giữ raw và source registry; processed/index có thể tái tạo. Giữ bản xuất hồ sơ riêng nếu người dùng cần khôi phục browser.

Backup PostgreSQL:

```sh
mkdir -p backups
docker compose exec -T db pg_dump -U hs_code -d hs_code -Fc > backups/hs_code.dump
```

Thử restore vào database tạm để đối soát, không ghi đè database đang dùng:

```sh
docker compose exec -T db createdb -U hs_code hs_code_restore_check
docker compose exec -T db pg_restore -U hs_code -d hs_code_restore_check < backups/hs_code.dump
docker compose exec -T db psql -U hs_code -d hs_code_restore_check -c 'SELECT count(*) FROM hs_records;'
docker compose exec -T db dropdb -U hs_code hs_code_restore_check
```

Các backup chứa dữ liệu nguồn và có giấy phép tương ứng; dùng lưu trữ ngoài máy khi vận hành thực tế. Chưa cấu hình scheduler/HA tự động.

## Kiểm tra

- `npm run test:data` — biến đổi và bảo toàn raw.
- `npm test` — tìm kiếm, facts/filter, session và ground checks.
- `npm run typecheck` và `npm run build`.
- `npx playwright install chromium`, `npm run test:e2e` — dùng dataset thật đã chuẩn bị, không chạy trên GitHub CI mặc định vì full dataset không được phát hành trong repo.

## Còn cần trước public production

Xác thực nếu lưu server, rate limit bền vững, kiểm soát budget AI, hợp đồng retention, backup tự động, quan sát vận hành, kiểm duyệt nghiệp vụ và nguồn pháp lý. Các cải tiến này không được mô tả là đã hoàn thành chỉ vì local MVP chạy được.
