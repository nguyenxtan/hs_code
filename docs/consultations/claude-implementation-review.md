# Claude implementation review — feat/hs-code-mvp

- Phạm vi: `a912c4e..197628e` (46 file, ~8.4k dòng). Vai trò: chỉ review/tư vấn, không sửa code.
- Ngày: 2026-11-03. App kiểm tra: http://127.0.0.1:3100 (DB + hybrid, như brief).
- **Verdict: ready-to-merge = with fixes.** Cần sửa C1–C2 và I1–I4 trước khi merge vào main. Các mục còn lại có thể ghi lại làm việc tiếp theo.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `npm test` (vitest) | 16/16 pass |
| `npm run test:data` (unittest) | 4/4 pass |
| Đọc diff: prepare_data.py, import/embed, db/search/semantic/assistant/session, các route, workspace.tsx, CSS mobile | đã đọc |
| HTTP read-only `/api/search`, `/api/assistant` (đúng các truy vấn bên dưới) | đã chạy, số liệu bên dưới là output thật |
| Gọi trực tiếp `extractFacts` / `safeGeneratedText` bằng `tsx` (script ở /tmp) | đã chạy |
| Kiểm tra snapshot: trùng mã main/CH98, chương của CH98 | không trùng mã; 457 bản ghi CH98 đều thuộc chương `98`; 10 bản ghi có `ma_hs_tuong_ung` không có trong bộ mã chính |
| Ảnh `.cache/mobile.png` | đã xem |

Không chạy: build, e2e Playwright (cần browser/server riêng), restart, import/embed. Không sửa tracked file nào.

## Critical

### C1. Hybrid search luôn trả 40 “kết quả” cho truy vấn vô nghĩa, nên không bao giờ hiện trạng thái không có kết quả
`src/lib/semantic.ts:77-91`. Top-40 ngữ nghĩa luôn được gộp vô điều kiện, kể cả khi bên lexical không có kết quả nào.
Tái hiện (output thật):
```
q=xqzvw      → mode=hybrid total=40 [98343400 Micro, 90223000 Ống phát tia X, 79031000 Bụi kẽm]
q=asdfghjk   → hybrid 40 [Micro, Măng tây, Măng tây]
q=847130201  → hybrid 40 (gõ thừa 1 chữ số → Micro, Loại khác…)
q=8471-30    → hybrid 40 mã “Loại khác” của 8471, nhưng không có 84713020
```
Ảnh hưởng: nhánh empty-state trong `workspace.tsx:603` không bao giờ chạy ở mode hybrid. Người dùng thấy danh sách trông có căn cứ nhưng thực ra là nhiễu. Trợ lý (`api/assistant/route.ts:62`) cũng nhận các dòng này làm references, nên câu trả lời “Chưa tìm thấy ứng viên” trong `assistant.ts:12` không bao giờ xuất hiện. Điều này trái ràng buộc “không bịa căn cứ”.
Đề xuất: chỉ gộp kết quả ngữ nghĩa có cosine ≥ ngưỡng (hiệu chỉnh trên vài truy vấn chuẩn), hoặc chỉ khi lexical/fuzzy có ít nhất một hit. Có thể hiển thị kết quả ngữ nghĩa ở mục riêng “gợi ý gần nghĩa”. Thêm test: query vô nghĩa → `total=0`.

### C2. Tie-break của RRF đẩy mã khớp nguyên cụm xuống dưới mã chỉ khớp ngữ nghĩa, và hỏng đúng kịch bản mẫu “con dấu”
`src/lib/semantic.ts:17-21`: hạng 1 lexical và hạng 1 semantic cùng được 1/61, rồi hòa điểm thì xếp theo `localeCompare(code)`.
Tái hiện: `q=con dau` → `82121000 Dao cạo` đứng đầu, `96110000 Con dấu…` thứ hai, `03024300 Cá trích dầu` thứ ba. `total=424`.
Ảnh hưởng: chính câu ví dụ trên UI (“con dấu”) cho kết quả sai thứ tự. Thứ tự lại phụ thuộc mã số chứ không phụ thuộc mức liên quan.
Đề xuất: khi hòa điểm, ưu tiên mã có cả lexical lẫn semantic, rồi đến hạng lexical. Cho lexical trọng số cao hơn (ví dụ k nhỏ hơn), hoặc giữ nguyên các hit khớp nguyên cụm (+50) ở đầu. Thêm regression test: `con dau` → 96110000 đứng #1.

## Important

### I1. Sửa lời khai có phủ định bị hiểu ngược (CHAT-01)
`src/lib/session.ts:54-60`: `if/else` dừng ở mẫu khớp đầu tiên và không xử lý phủ định.
Tái hiện (`extractFacts` thật):
- “À không, nó gắn máy tự động chứ không phải bằng tay” → `{operation:'bằng tay'}` (sai)
- “Không phải vỏ nhựa” → `{body:'nhựa'}` (sai)

Vì facts được ghi bằng phép merge (`updateProduct`), lời sửa sai này đè lên lời khai đúng trước đó. Toast còn báo “Đã cập nhật lời khai”.
Đề xuất: nhận diện các mẫu phủ định trong cùng mệnh đề (`không phải|chứ không|không có`) và bỏ qua hoặc đánh dấu “cần xác nhận”. Lấy mẫu khớp cuối cùng thay vì mẫu đầu tiên. Hiển thị fact vừa trích để người dùng xác nhận. Thêm test cho hai câu trên.

### I2. Trợ lý trả 4 mã đầu danh mục (ngựa sống) khi query rỗng hoặc chỉ gồm stopword
`src/lib/search.ts:63` cho `score=1` với mọi bản ghi khi `terms` rỗng. `assistant.ts:20` lại diễn đạt kết quả thành “4 mã tham khảo gần nhất”.
Tái hiện: `POST /api/assistant {"message":"giúp tôi","query":"","facts":{}}` → 01012100, 01012900, 01013010, 01013090. Từ UI: gửi “tìm mã” hoặc “tra hs” → `workspace.tsx:309` cắt thành query “mã”/“hs” (stopword) → cùng kết quả.
Đề xuất: ở route assistant, nếu query sau khi fold không còn term thì trả lời extractive “cần mô tả hàng” và không kèm references. Không dùng chế độ duyệt (score=1) cho chat.

### I3. Kiểm tra grounding bỏ lọt mã có dấu chấm, nên LLM có thể nêu mã ngoài danh sách ứng viên
`src/lib/assistant.ts:24-25` chỉ bắt `\b\d{8}\b`. UI hiển thị mã dạng `8471.30.90`, nên model rất dễ viết theo dạng đó.
Tái hiện: `safeGeneratedText('Nên chọn 8471.30.90 [1]', ['96110000'])` → `true`. Mã 4/6 số (“nhóm 8471”) cũng lọt.
Ảnh hưởng: hiện chưa bật được (chưa cấu hình model), nhưng đây chính là ranh giới an toàn đã hứa trong runbook.
Đề xuất: chuẩn hóa `\d{4}[.\s]?\d{2}[.\s]?\d{2}` và `\d{4}(\.\d{2})?` trước khi so khớp. Kiểm thêm rằng mã đứng cạnh `[n]` đúng là `items[n-1].code`. Thêm test.

### I4. Chat bỏ qua bộ lọc chương/dataset người dùng đã đặt (UX-01)
`src/components/workspace.tsx:338-345` không gửi `chapter`/`dataset`. `api/assistant/route.ts:62-66` cũng không nhận hai tham số này.
Tái hiện: lọc “Chương 98”, rồi chat “con dấu đóng mực bằng tay” → references có thể là 9611…, nằm ngoài bộ lọc người dùng đang thấy. Panel hồ sơ lại ghi “Bộ lọc danh sách chỉ đổi khi bạn chọn trực tiếp”, khiến người dùng hiểu là chat tôn trọng bộ lọc.
Đề xuất: truyền bộ lọc cứng sang assistant và validate giống `/api/search`. Nếu không có kết quả trong bộ lọc, trả lời “không có trong phạm vi lọc, có muốn bỏ lọc?” đúng như yêu cầu UX-01.

## Minor

1. **Undo bị hỏng khi sửa từng ký tự**: `workspace.tsx:826-896` gọi `updateProduct` ở mỗi lần gõ phím, và `session.ts:34-37` đẩy history cả khi không có gì thay đổi (`send()` luôn gọi). Gõ 30 ký tự là mất bản khai trước đó (`slice(-29)`), và một lần undo chỉ lùi một ký tự. Đề xuất: chỉ ghi history khi có thay đổi thật, gom theo blur/debounce. Ngoài ra, xóa trắng một fact vẫn để lại key rỗng (merge), nên không có cách xóa hẳn thuộc tính.
2. **Phiên bản snapshot phụ thuộc mọi file trong thư mục raw** (`prepare_data.py:113-114`, `:161`): một `.DS_Store` của macOS hoặc file lạ cũng làm đổi `version`. Embeddings và DB khi đó lệch phiên bản dù dữ liệu không đổi. Ngược lại, sửa logic chuẩn hóa mà không tăng `RULESET` thì giữ nguyên version, và `import.ts:24-37` sẽ `ON CONFLICT DO UPDATE` ghi đè snapshot đang active. Điều này trái với tuyên bố “giữ snapshot cũ”. Đề xuất: chỉ hash các file trong `sources.json`, đưa hash nội dung records vào version, và từ chối import khi version đã tồn tại với nội dung khác. Thêm nữa, `root.glob('*.xlsx')[0]` không xác định thứ tự nếu có nhiều workbook, nên dùng đúng tên pinned.
3. **Mã có dấu gạch hoặc khoảng trắng lạ không được nhận là mã**: `search.ts:14-15` chỉ bỏ `.` và khoảng trắng. `8471-30` hay `8471/30` rơi sang text hoặc semantic (xem C1). Mã 9–10 số (mã nước khác hoặc gõ thừa) cũng không được báo rõ. Đề xuất: bỏ `-`, `/`, `_`. Nếu chuỗi toàn số và dài hơn 8, gợi ý cắt còn 8 số.
4. **Không hiện số lượng theo chương (FILTER-01)**: API trả về `facets` nhưng UI không dùng, và `workspace.tsx:523` liệt kê cứng 97 chương không kèm số lượng. Nhóm tiện ích (`category`) đang bật cũng không có chip (`:483` chỉ xét chapter/dataset), nên người dùng không biết thứ tự đang được boost.
5. **Mobile:** ô tìm kiếm 11–13px và textarea chat 12px (`globals.css` khoảng dòng 1346 và 1389) làm iOS Safari tự zoom khi focus. Nhiều chữ 8–9px (`.data-status`, `.data-caveat`, footer) khó đọc. Nút “Hỗ trợ tìm mã” trên mobile mở panel tĩnh ở cuối trang, bên dưới kết quả (`:1371`), nhưng không cuộn hay chuyển focus tới đó, nên người dùng tưởng nút không hoạt động. Đề xuất: input ≥16px, chữ tối thiểu khoảng 12px, khi mở panel thì gọi `scrollIntoView` và focus textarea.
6. **Focus sau khi đóng dialog**: `Dialog` (`workspace.tsx:50-81`) unmount khi đang `showModal()` mà không gọi `close()`. Focus vì vậy rơi về `body` thay vì nút đã mở dialog. Người dùng bàn phím hoặc screen reader bị mất vị trí trong danh sách. Đề xuất: lưu `document.activeElement` khi mở, rồi `close()` và restore focus khi unmount.
7. **localStorage phình và references cũ**: mỗi tin trả lời lưu toàn bộ `HSRecord` (gồm raw) vào `references` (`workspace.tsx:349-353`). Với 50 tin × 100 sản phẩm thì dễ vượt quota. Khi đó chỉ hiện một toast, các thay đổi sau đó âm thầm không được lưu. `validWorkspace` cũng không kiểm tra `references`, nên dữ liệu cũ hoặc hỏng có thể làm crash `RecordDetails` (`r.provenance.raw_row_index`). Đề xuất: chỉ lưu `{code, version}` rồi tra lại khi mở. Validate references và nhánh lỗi không giới hạn số tin (`:376`).
8. **Link chia sẻ bỏ qua `snapshot`**: `workspace.tsx:398-411` không so sánh tham số `snapshot` với `status.version`, nên toast cảnh báo hiện giống nhau dù snapshot khớp hay lệch. Nếu một số mã không còn tồn tại thì danh sách bị rút gọn mà không báo. Đề xuất: so version và báo cụ thể mã nào không tìm thấy. Về quyền riêng tư: link đúng là chỉ chứa mã và snapshot, không kèm facts hay query. Đạt.

Các điểm nhỏ khác không xếp hạng: lịch sử gửi lên LLM chứa luôn tin hiện tại, nên bị lặp với `request`. Lỗi parse JSON từ server (HTML 500) hiện nguyên văn “Unexpected token…” trong chat. Có 10 bản ghi CH98 có `ma_hs_tuong_ung` không nằm trong bộ mã chính, nên đánh dấu trên UI thay vì chỉ hiện chuỗi.

## Đã kiểm tra và thấy ổn

- Pipeline: raw không bị ghi, hash pinned và kiểm lại sau khi chạy. Đối soát JSON = CSV = XLSX được so trên toàn bộ dict. Formula cell bị chặn. Mã giữ dạng chuỗi. `dash_level` được bảo vệ. Không có mã trùng giữa main và CH98 trong snapshot hiện tại.
- Import: một transaction, có advisory lock, count check, chỉ một snapshot active (unique partial index).
- Fallback khi thiếu index: version mismatch, lỗi đọc hoặc lỗi model đều về `lexical_fallback` và tự xóa cache promise. Index chỉ phủ một phần có mode riêng.
- Search route có validate chapter/dataset/category và độ dài q. `offset` âm hoặc rất lớn không gây lỗi (trả mảng rỗng).
- Assistant route: kiểm Origin, giới hạn kích thước, kiểm kiểu của history/facts, rate limit trong process. Câu hỏi VAT trả về extractive cố định, không chốt thuế. Key chỉ ở phía server.
- Đổi sản phẩm bị khóa khi đang gửi (`disabled={sending}`). Câu trả lời được ghi vào đúng `id` đã chụp lúc gửi, nên không lẫn giữa các sản phẩm.

## Từ chối đánh giá (declined to judge)

- **Chất lượng recall/precision của semantic**: chưa có bộ truy vấn chuẩn. Tôi chỉ chỉ ra lỗi cấu trúc (C1, C2), không đưa ra con số chất lượng.
- **E2E Playwright và production build**: không chạy, vì brief cấm build/restart. Tôi dựa vào evidence của coordinator.
- **Tính đúng pháp lý của 12 nhóm tiện ích và nội dung thuế**: ngoài chuyên môn review code. Các nhóm này đã được ghi là proposed, chỉ dùng để boost.
- **Bảo mật khi public, PRIV-01 nhiều người dùng, rate limit bền vững, auth**: đã ghi rõ là ngoài phạm vi (bind 127.0.0.1, phiên lưu trên trình duyệt). Không tính là lỗi của bản local, nhưng phải xử lý trước khi public.
- **License của model embedding**: runbook đã nêu cần kiểm tra. Tôi không xác minh.

## Thứ tự sửa đề xuất

C1 → C2 (cùng file, kèm 2 regression test) → I2 → I1 → I4 → I3 → Minor 1, 2, 5. Sau đó chạy lại các truy vấn tái hiện ở trên và chụp lại ảnh mobile.
