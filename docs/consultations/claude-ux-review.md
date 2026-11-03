# Review UX độc lập — Claude Code

Ngày viết: 2026-11-03. Người viết: Claude Code (Opus 5.5), vai trò chỉ tham vấn/review.

Đối tượng review: `README.md`, `docs/requirements.md`, `architecture.md`, `conversation-ux.md`, `data-strategy.md`, `data-sources.md`, `roadmap.md`, `vat-design.md`, `consultations/claude-review.md`, `consultations/claude-vat-review.md` (bản chưa commit) và `consultations/synthesis.md`, ở commit `c4b55bc`.

Trạng thái bằng chứng:

- Repo **chưa có ứng dụng, prototype hay pipeline làm sạch**. Tôi không chạy, không thử nghiệm với người dùng, không đo gì. Mọi con số "trước/sau" trong tài liệu này là **giả thuyết thiết kế**, không phải kết quả.
- Thống kê dữ liệu dùng trong bài lấy từ đề bài của coordinator: 11.414 mã 8 số, 96 prefix chương, 1.228 prefix nhóm (4 số), 5.612 prefix phân nhóm (6 số). Taxonomy tiện ích **chưa được gắn**; 20–40 nhóm mới là ý tưởng. Tôi không đọc lại file dữ liệu.
- Theo `claude-review.md` mục 3.1, snapshot có thể chỉ chứa mô tả ở dòng 8 số, thiếu tên chính thức của nhóm/phân nhóm và chú giải. Tôi coi đây là **giả định cần xác minh**; nó ảnh hưởng trực tiếp tới cách hiển thị cây (mục 3.3).
- Việc review cleaning do một task khác thực hiện. Tài liệu này chỉ nêu **yêu cầu UX đối với dữ liệu**, không đề xuất quy tắc làm sạch.
- Nội dung VAT tuân theo `vat-design.md`: chỉ có trạng thái, điều kiện, khâu/ngày và rule đã duyệt. Tài liệu này không tuyên bố mức thuế hiện hành nào và không đề xuất filter theo rate thô.

---

## 0. Kết luận ngắn

1. **Khuyến nghị hướng A, "Tìm trước, hồ sơ bên cạnh"** (mục 2). Màn hình kết quả là trung tâm. Câu hỏi làm rõ hiện **ngay trong kết quả** dưới dạng "lăng kính phân biệt": các ứng viên được nhóm theo điểm khác nhau, người dùng có thể trả lời hoặc bỏ qua. Chat là một cách nhập vào cùng hồ sơ và bật sau, không phải cửa vào chính. Không chọn wizard bắt buộc hoặc chat-first làm mặc định.
2. **Lỗ hổng UX lớn nhất trong tài liệu hiện tại nằm ở bước đầu tiên, trước cả danh sách ứng viên.** Đó là chuyện hiểu truy vấn: tiếng Việt không dấu tạo đa nghĩa thật ("con dau" có thể là con dấu, con dầu…, "dau" có thể là dầu/dấu/đậu/đầu), lỗi gõ, và tên phổ thông nhiều nghĩa. Cần một dải **"Đang hiểu là…"** cho phép chọn nghĩa *trước khi* hỏi bất kỳ thuộc tính nào. Sau đó, khi chưa chắc thì nhóm kết quả theo nghĩa thay vì đoán một nghĩa.
3. **Lời khai không bao giờ làm mất ứng viên.** Sau khi người dùng trả lời, ứng viên không khớp sẽ được **gập xuống** trong mục "Ít khớp với lời khai (n)", không bị xóa. Cách này giữ đúng nguyên tắc `user_fact` không phải filter cứng, đồng thời vẫn cho cảm giác thu hẹp.
4. **Chống dẫn dắt:** câu hỏi diễn đạt trung tính và lựa chọn xếp theo **thứ tự trong cây**, không xếp theo mã AI đang đoán. Luôn có "Không biết" và "Tả bằng lời". Mã đi kèm mỗi lựa chọn chỉ hiện trong chế độ chuyên viên.
5. **Trạng thái nguồn phải luôn nhìn thấy được, nhưng gọn.** Một "nhãn dữ liệu" cố định cho biết snapshot, phiên bản danh mục, phần còn thiếu (chương 98, chú giải) và ngày lấy. Chuỗi VAT luôn ghi "trong nguồn, chưa đánh giá điều kiện". Ngày 31/12/2026 là mốc cần cảnh báo riêng (theo `claude-vat-review.md`, chưa thẩm định lại).
6. **Giá trị trước khi bắt đăng nhập:** tra cứu, so sánh và lưu cục bộ không cần tài khoản. Tài khoản chỉ để đồng bộ nhiều thiết bị. Link chia sẻ mặc định **không chứa lời khai**.
7. **Ưu tiên MVP** (mục 5, 6): chuẩn hóa/hiểu truy vấn có dải "Đang hiểu là", kết quả nhóm theo nhánh, so sánh 2–4 mã, lăng kính phân biệt từ cây, nhãn trạng thái dữ liệu, lưu cục bộ + undo, nút "Báo sai" có cấu trúc. **Để sau:** chat, tài khoản, bộ hàng, tra hàng loạt, taxonomy tiện ích. **Không làm:** phần trăm tin cậy, wizard bắt buộc, filter VAT theo rate, ảnh/giọng nói ở giai đoạn đầu, tự học từ phản hồi chưa duyệt.

---

## 1. Nhận xét về thiết kế hiện tại từ góc nhìn UX

Những điểm đã đúng và nên giữ: tách `user_filter` / `user_fact` / `inferred`; "Đang hiểu / Còn thiếu / Mã ứng viên / Vì sao / Nguồn"; không hiện phần trăm chưa hiệu chuẩn; AI lỗi thì tra cứu vẫn chạy; no-results không tự gán "Loại khác"; URL chia sẻ không chứa lời khai; MVP không cần LLM.

Những chỗ còn thiếu hoặc mơ hồ:

| # | Khoảng trống | Hệ quả nếu để nguyên |
|---|---|---|
| G1 | Chưa mô tả bước **hiểu truy vấn**: không dấu, typo, alias đa nghĩa, IME tiếng Việt | Danh sách đầu tiên trộn nghĩa; người mới mất lòng tin ngay ở bước đầu |
| G2 | "Hỏi làm rõ" chỉ được mô tả trong chat | Người không mở chat không được hướng dẫn; chat trở thành bắt buộc trên thực tế |
| G3 | Chưa nói kết quả **thay đổi ra sao** sau khi khai: ẩn hay hạ hạng | Dễ biến `user_fact` thành filter cứng ở tầng UI dù backend đúng |
| G4 | Chưa có quy tắc **thứ tự lựa chọn** và cách diễn đạt câu hỏi | Rủi ro dẫn dắt người dùng xác nhận mã AI đã đoán |
| G5 | Bố cục "ba vùng" trong `claude-review.md` chưa có phương án mobile | Trên màn hình hẹp, hồ sơ và chip lọc bị giấu, người dùng không biết vì sao kết quả đổi |
| G6 | Nút cây 4/6 số có thể **không có tên chính thức** trong snapshot | Nhóm kết quả theo nhánh sẽ hiện nhãn trống, hoặc tệ hơn là tên do AI tự đặt |
| G7 | Trạng thái dữ liệu (thiếu chương 98, chưa có chú giải, VAT raw) chưa có chỗ hiển thị cố định | Người dùng hiểu raw `8/10` là thuế áp dụng; không biết khi nào nên tự kiểm thêm |
| G8 | Lưu/tiếp tục phụ thuộc vào quyết định tài khoản chưa chốt | MVP có nguy cơ bị chặn bởi đăng nhập |
| G9 | Phản hồi nghiệp vụ và curation alias/taxonomy chưa có vòng UX | Không có nguồn dữ liệu để cải thiện alias, vốn là điểm yếu lớn nhất của tra tên phổ thông |
| G10 | Chưa có chỉ số UX; roadmap chỉ đo retrieval/latency | Không biết UX tốt hơn hay chỉ retrieval tốt hơn |

---

## 2. Ba hướng UX và khuyến nghị

### Hướng A — Tìm trước, hồ sơ bên cạnh (khuyến nghị)

Một ô tìm kiếm duy nhất (nhận số thì tra mã/prefix, nhận chữ thì tìm mô tả). Kết quả nhóm theo nhánh cây. Phía trên kết quả có dải "Đang hiểu là" và, nếu ứng viên còn phân tán, **một** lăng kính phân biệt (ví dụ "Con dấu này hoạt động thế nào? Tự có mực · Dùng khay mực rời · Dập nổi không mực · Không biết"). Trả lời lăng kính sẽ ghi `user_fact`, xếp lại và gập phần ít khớp. Hồ sơ ("Đang hiểu / Còn thiếu / Bộ lọc") là cột bên phải trên desktop, thanh tóm tắt dính đáy trên mobile. Chat (sau MVP) là ngăn kéo mở từ kết quả, ghi vào cùng hồ sơ.

### Hướng B — Trình hướng dẫn từng bước (wizard)

Người dùng trả lời chuỗi câu hỏi (chất liệu → công dụng → cơ chế…) cho tới khi còn vài mã.

### Hướng C — Không gian làm việc chat-first

Cửa vào là khung chat. Kết quả và hồ sơ hiện như thẻ trong hội thoại hoặc bảng bên cạnh.

### So sánh

| Tiêu chí | A. Tìm trước + lăng kính | B. Wizard | C. Chat-first |
|---|---|---|---|
| Thời gian tới danh sách hữu ích (giả thuyết) | Ngắn: có danh sách ngay lượt đầu | Dài: phải qua vài câu trước khi thấy mã | Trung bình–dài: chờ LLM, phụ thuộc diễn đạt |
| Người mới | Tốt nếu dải "Đang hiểu là" và lăng kính rõ | Dễ hiểu ban đầu nhưng bị ép trả lời câu không biết | Thân thiện nhưng dễ tin câu trả lời như kết luận |
| Chuyên viên | Tốt: mật độ cao, bàn phím, bỏ qua câu hỏi | Kém: bị làm chậm | Kém: phải đọc văn xuôi để lấy mã |
| Rủi ro dẫn dắt | Thấp nếu thứ tự lựa chọn cố định | Cao: thứ tự câu hỏi là một giả định phân loại | Cao: mô hình hỏi theo mã đang đoán |
| Phụ thuộc AI | Không bắt buộc | Không, nhưng cần cây câu hỏi biên soạn tay cho mọi nhánh | Bắt buộc; AI lỗi thì mất cửa vào |
| Chi phí dữ liệu | Cần tên nút cây và điểm phân biệt từ anh em | Cần câu hỏi biên soạn cho toàn bộ ~1.228 nhóm, không khả thi sớm | Cần RAG, nguồn, eval |
| Tôn trọng "user_fact không phải filter cứng" | Tự nhiên (gập, không xóa) | Khó: mỗi bước thường loại nhánh | Phụ thuộc kỷ luật prompt/UI |
| Độ phức tạp xây dựng | Trung bình | Thấp với vài nhóm, cao khi phủ rộng | Cao |

**Khuyến nghị: A.** Hướng này giao giá trị ngay lượt đầu, vẫn hoạt động khi không có AI, và lăng kính chính là phần "hỏi vừa đủ" của B nhưng không ép trả lời. Nó cũng là baseline để đo xem chat (C) thêm được gì.

Đánh đổi chấp nhận: người hoàn toàn không biết diễn đạt có thể thấy danh sách đầu "khó đọc" hơn một câu chat. Giảm bằng hai cách: (1) dải "Đang hiểu là" diễn giải bằng lời thường, và (2) khi chat được bật, có nút "Mô tả thêm bằng lời" ngay trên kết quả. Nếu user test cho thấy người mới bỏ cuộc trước khi chạm lăng kính (chỉ số ở mục 7), cân nhắc thêm chế độ "Hỏi tôi từng bước" như **một lựa chọn**, không phải mặc định. Chế độ này dùng cùng lăng kính, hiển thị tuần tự.

---

## 3. Đề xuất chi tiết theo 10 chủ đề

### 3.1 Từ tên phổ thông / không dấu / lỗi gõ / alias tới mã ứng viên

Luồng đề xuất cho một truy vấn chữ:

1. **Chuẩn hóa hiển thị được:** NFC, bỏ dấu cho trường tìm riêng, sửa typo theo từ điển mô tả + alias đã duyệt. Mọi biến đổi đều hiện cho người dùng, không âm thầm.
2. **Dải "Đang hiểu là"**: tối đa 3–4 nghĩa ứng viên, ví dụ với `con dau`: `con dấu (đóng dấu)` · `dầu (chất lỏng)` · `Tìm đúng chữ "con dau"`. Nghĩa được chọn là `user_fact` về khái niệm. Nếu không chọn, kết quả **nhóm theo nghĩa**; hệ thống không tự chọn một nghĩa.
3. **Alias đa nghĩa** ("stamp": con dấu / tem bưu chính / dập) dùng cùng dải này. Alias phải có trạng thái duyệt; alias chưa duyệt hiện nhãn "gợi ý".
4. **Kết quả nhóm theo nhánh**: chương → nhóm 4 số → dòng 8 số, mỗi nhánh có số mã khớp. Tên nhánh lấy từ nguồn chính thức. Nếu thiếu (G6), hiện mã nhánh kèm "tên nhóm chưa có trong nguồn" và mô tả dòng con tiêu biểu. Không tự sinh tên pháp lý cho nhánh.
5. **Dòng 8 số hiển thị mô tả đầy đủ theo nhánh** (cha › con › dòng). Không chỉ hiện "- - Loại khác", vì trên danh sách phẳng dòng này vô nghĩa.
6. **IME tiếng Việt:** không chạy tìm kiếm trong lúc đang ghép dấu (composition). Chỉ debounce sau `compositionend`, nếu không gõ Telex/VNI sẽ nhấp nháy kết quả sai giữa chừng.
7. **Truy vấn số:** `9611`, `9611.00`, `96110000`, `96 11` đều hiểu là mã/prefix, giữ số 0 đầu. Prefix 2/4/6 số mở thẳng nút cây tương ứng.

Không nên: tự sửa chính tả mà không cho thấy; xếp hạng bằng một điểm ẩn trộn nhiều nghĩa; hiển thị "Có phải bạn muốn tìm…" kiểu một lựa chọn duy nhất.

### 3.2 Progressive disclosure: người mới và chuyên viên

- **Không có lựa chọn "chế độ" lúc vào.** Độ sâu thông tin mở theo hành vi: nhập số → mặc định hiện bảng dày (mã, mô tả nhánh, đơn vị, raw thuế có nhãn). Nhập chữ → hiện nhóm nhánh và lăng kính trước. Một công tắc "Hiện chi tiết" được nhớ cục bộ.
- **Ba tầng thông tin trên mỗi ứng viên:** (1) mã + mô tả đầy đủ; (2) mở rộng: điểm khác với anh em, đơn vị, nguồn/snapshot; (3) trang chi tiết: raw thuế/VAT có nhãn trạng thái, quản lý chuyên ngành, lịch sử phiên bản.
- **Giá trị trước khi đăng nhập/chat:** tra cứu, lăng kính, so sánh, lưu cục bộ, export đều không cần tài khoản. Chat chỉ hiện như lời mời ("Mô tả thêm bằng lời") **sau** khi đã có danh sách, không bật popup.
- Ngôn ngữ: nhãn giao diện dùng lời thường ("Mã ứng viên", "Còn cần biết"). Thuật ngữ pháp lý (GIR, chú giải) chỉ xuất hiện ở tầng 2–3 kèm giải thích ngắn.

### 3.3 Bố cục, liên kết search/filter/chat/hồ sơ, sửa/undo, nhiều sản phẩm

Bố cục desktop (≥1024px), ba cột co giãn:

```
[ Ô tìm | Sản phẩm: Con dấu ▾ | Dữ liệu: HS2022 · snapshot … ⓘ ]
[ Cây/Bộ lọc (thu gọn được) | Đang hiểu là… / Lăng kính / Kết quả nhóm theo nhánh | Hồ sơ: Đang hiểu · Còn cần biết · Bộ lọc · Lịch sử ]
```

- **Hồ sơ là nguồn sự thật duy nhất.** Mỗi mục trong hồ sơ có nhãn nguồn: *Bạn chọn* (filter), *Bạn khai* (fact), *AI đoán* (inferred, có nút Xác nhận/Bỏ). Phân biệt bằng **chữ + biểu tượng**, không chỉ bằng màu hay chữ nghiêng.
- **Mọi thay đổi đều có diff và undo:** sau mỗi trả lời/sửa, hiện toast "Đã ghi: dùng khay mực rời · 2 mã chuyển xuống 'Ít khớp' · Hoàn tác". Lịch sử hồ sơ cho phép quay về bất kỳ revision nào. Sửa bằng UI và sửa bằng lời sinh cùng loại event, như `claude-review.md` 2.4 đã nêu.
- **Kết quả đổi phải giải thích được:** ứng viên vào/ra được đánh dấu trong ~1 lượt sau thay đổi ("mới", "đã gập vì: bạn khai X").
- **Nhiều sản phẩm:** bộ chọn sản phẩm cố định ở đầu trang (tab trên desktop, menu trên mobile). Đổi sản phẩm thì hỏi giữ/bỏ từng `user_filter`; fact luôn theo sản phẩm.
- **Biến thể:** "Tạo biến thể" sao chép hồ sơ, đánh dấu khác biệt và hiển thị hai cột cạnh nhau. Bản gốc không bị ghi đè.
- **Bộ hàng:** MVP chỉ cho liệt kê thành phần và tra từng thành phần, kèm cảnh báo cố định "Bộ hàng có quy tắc phân loại riêng; danh sách này không thay việc xác định mã cho cả bộ". Chưa nên tự suy luận đặc trưng cơ bản.
- **Từ kết quả sang chat** (khi có): chat mở với tóm tắt hồ sơ hiện tại làm ngữ cảnh hiển thị. **Từ chat sang kết quả:** mỗi câu trả lời có nút "Xem trong danh sách" mở đúng trạng thái.

### 3.4 Hỏi ít nhưng đúng, không ép form, hỗ trợ "không biết", chống dẫn dắt

- **Chỉ hỏi khi câu trả lời tách được top ứng viên hiện tại.** Nguồn câu hỏi ở MVP là điểm khác nhau giữa các nhánh anh em có tên chính thức, cộng điểm phân biệt đã được người nghiệp vụ duyệt. Không có điểm phân biệt có căn cứ thì không hỏi; hiện so sánh thay vào đó.
- **Mỗi lượt một lăng kính**, có thể bỏ qua. Lăng kính thứ hai chỉ xuất hiện sau khi trả lời hoặc bỏ qua cái đầu. Không có form nhiều trường.
- **"Không biết" là câu trả lời hợp lệ:** ghi `unknown`, giữ các nhánh và chuyển mục đó vào "Còn cần biết", kèm gợi ý cách tự kiểm ("xem nhãn sản phẩm/catalog phần cơ chế"). Có thêm "Tả bằng lời" (ô ngắn) và "Không áp dụng/khác".
- **Chống dẫn dắt:**
  - Câu hỏi mở theo thuộc tính ("Con dấu hoạt động thế nào?"), không hỏi dạng xác nhận ("Có phải loại tự có mực không?").
  - Lựa chọn xếp theo thứ tự cây/nguồn, cố định, **không** theo xác suất mô hình.
  - Ở chế độ thường, lựa chọn không hiện mã đích. Chuyên viên bật "hiện mã" mới thấy.
  - Không tự điền sẵn lựa chọn mà AI đoán. Nếu có suy đoán, hiện ở hồ sơ với nhãn *AI đoán*, tách khỏi lăng kính.
  - Khi chat được bật, kiểm tra tự động: câu hỏi của LLM không được chứa mã hay tên nhánh đang dẫn đầu.
- **Câu đã trả lời không hỏi lại.** Nếu lời khai cũ mâu thuẫn với lời khai mới, hiện diff và hỏi một lần ("Trước bạn khai A, giờ là B. Dùng B?").

### 3.5 Giải thích khác biệt giữa 2–4 mã, điều kiện còn thiếu, mở đúng nguồn và thời điểm

Màn so sánh (chọn bằng nút "So sánh" hoặc phím `c`, tối đa 4):

| Hàng | Nội dung |
|---|---|
| Nhánh chung | Phần mô tả giống nhau được gộp lên trên, chỉ hiện một lần |
| Điểm khác | Đoạn mô tả **khác nhau** được làm nổi bật theo cấp ("- - Bằng tay" vs "- - Loại khác") |
| Khớp với hồ sơ | Theo từng điều kiện: khớp lời khai / trái lời khai / **chưa biết** (ba trạng thái, không gộp chưa biết thành không) |
| Còn cần biết | Điều kiện nào nếu biết sẽ tách các mã này; nút "Trả lời" mở đúng lăng kính |
| Nguồn | Liên kết mở đúng dòng/đoạn, kèm tên snapshot, phiên bản danh mục, ngày lấy. Ngày hiệu lực: "chưa xác minh" nếu chưa có |
| Thuế/VAT trong nguồn | Raw kèm nhãn "trong nguồn, chưa đánh giá điều kiện"; không tô màu theo cao/thấp, không sắp xếp |
| Chú giải/loại trừ | Có nếu nguồn có; nếu chưa có thì ghi "chưa có chú giải trong dữ liệu" thay vì để trống |

Phần "Vì sao" do AI viết (khi có) nằm trong khối riêng, nhãn "Diễn giải của AI", và tách khỏi mô tả gốc. Phần không có nguồn hỗ trợ thì không hiển thị.

### 3.6 Mobile, accessibility, bàn phím

- **Mobile:** một cột. Hồ sơ thu thành thanh dính đáy ("Con dấu · 2 đã khai · 1 còn cần biết ›"), chạm vào mở sheet. Lăng kính là các nút lớn xếp dọc. So sánh trên mobile chuyển thành thẻ xếp chồng có ghim hàng "Điểm khác" lên đầu, không ép bảng ngang. Vùng chạm ≥44px.
- **Accessibility:** thay đổi ứng viên được báo qua vùng `aria-live` lịch sự ("Còn 3 mã ứng viên, 2 đã gập"). Trạng thái *Bạn chọn / Bạn khai / AI đoán / chưa biết* có chữ, không chỉ màu. Sau undo, focus quay về phần tử bị ảnh hưởng. Nút cây có cấu trúc `tree` đúng ARIA. Tương phản đạt WCAG 2.2 AA (mục tiêu thiết kế, chưa kiểm).
- **Bàn phím:** `/` focus ô tìm; ↑/↓ di chuyển ứng viên; `Enter` mở; `c` thêm so sánh; `Esc` đóng; `Ctrl/Cmd+Z` hoàn tác thay đổi hồ sơ gần nhất khi focus không nằm trong ô nhập. Phím tắt có trang trợ giúp `?` và không xung đột với IME.

### 3.7 Lưu/tiếp tục, chia sẻ/export không lộ lời khai

- **MVP: lưu cục bộ trên trình duyệt** (hồ sơ, sản phẩm, lịch sử thay đổi), không cần tài khoản. Có cảnh báo rõ "chỉ lưu trên thiết bị này; xóa dữ liệu trình duyệt sẽ mất". Có nút "Xóa hồ sơ này" và "Xóa tất cả".
- **Tiếp tục:** trang đầu hiện "Tiếp tục: Con dấu (sửa lần cuối …)". Khi mở lại, tóm tắt lời khai đã xác nhận trước khi đi tiếp. Nếu snapshot dữ liệu đã đổi, hiện "Dữ liệu đã cập nhật từ X sang Y — Xem khác biệt / Giữ bản cũ để đối chiếu", không âm thầm thay kết quả.
- **Tài khoản (sau MVP):** chỉ để đồng bộ nhiều thiết bị và cho chat có lưu phía server. Đăng nhập được đề nghị ở thời điểm người dùng cần ("Mở trên máy khác?"), không đặt ở cổng vào.
- **Chia sẻ link:** mặc định chỉ chứa truy vấn, `user_filter`, danh sách mã so sánh, snapshot. **Không** chứa fact, mô tả tự do hay lịch sử. Trước khi copy, hiện xem trước "Link này gồm: …".
- **Export (CSV/PDF/in):** hộp chọn phần cần đưa vào. Mặc định gồm mã ứng viên, mô tả, nguồn/snapshot và phần "Còn cần biết"; lời khai **tắt mặc định**, bật thủ công và có xem trước. Mọi export có chân trang: "Danh sách ứng viên để tham khảo, không phải kết quả phân loại; VAT/thuế là chuỗi trong nguồn, chưa đánh giá điều kiện; dữ liệu: snapshot … ngày …".

### 3.8 Phản hồi người nghiệp vụ, taxonomy curation và cải thiện an toàn

- **"Báo sai" có cấu trúc** trên mỗi ứng viên, dòng "Đang hiểu là" và điểm phân biệt. Lý do có sẵn: sai nghĩa alias / thiếu mã đúng / mô tả nhánh sai / nguồn sai hoặc hết hạn / câu hỏi thừa / khác. Có ô "mã bạn cho là đúng" kèm trường căn cứ (không bắt buộc).
- **Phản hồi không tự đổi ranking hay nhãn.** Mọi phản hồi vào hàng đợi duyệt. Người nghiệp vụ chấp nhận → tạo alias/nhãn/điểm phân biệt có `review_status`, phiên bản taxonomy và ca kiểm tra hồi quy. Đây là cách mở rộng alias an toàn nhất.
- **Hàng đợi curation ưu tiên theo tác động:** (1) truy vấn 0 kết quả hoặc bị bỏ dở; (2) alias bị "Báo sai"; (3) nhánh có nhiều lượt "chưa biết". Thu truy vấn để curation cần **đồng ý rõ** hoặc chỉ ở dạng tổng hợp đã lọc thông tin nhạy cảm, vì truy vấn có thể chứa tên khách hàng/sản phẩm chưa công bố.
- **Taxonomy tiện ích (20–40 nhóm):** chưa đưa vào MVP làm lối duyệt chính. Khi bắt đầu, công cụ duyệt nên làm theo **cấp nhóm 4 số rồi kế thừa có ngoại lệ** (như `data-strategy.md`), hiển thị coverage của từng nhóm tiện ích. Trên UI người dùng, nhóm tiện ích có nhãn "nhóm gợi ý, không phải phân loại chính thức" và đếm riêng mã chưa gắn.
- **Màn hình duyệt cho người nghiệp vụ** chỉ cần: danh sách đề xuất, bằng chứng, nút chấp nhận/sửa/bác, lý do, và xem trước tác động (bao nhiêu truy vấn đổi kết quả). Không cần bảng điều khiển phức tạp.

### 3.9 Dữ liệu chưa đầy đủ, AI lỗi, no results, thời gian chờ

- **Nhãn dữ liệu cố định** ở đầu trang, mở ra bảng "Trạng thái nguồn": danh mục và phiên bản; snapshot và ngày lấy; phần đã biết là thiếu (chương 98, chú giải, tên nhóm 4/6 số nếu thiếu); VAT/thuế: raw, chưa đánh giá điều kiện; license/attribution. Viết bằng câu ngắn, không chỉ biểu tượng.
- **Mốc thời gian VAT:** nếu nguồn ghi chú giảm có thời hạn (ví dụ chính sách giảm hết hạn 31/12/2026 theo `claude-vat-review.md`, chưa thẩm định lại tại đây), hiển thị raw kèm "chuỗi trong nguồn, lấy ngày …; có thể không còn phản ánh chính sách sau …". Không tự đổi sang mức khác.
- **No results** — phân biệt và nói rõ từng trường hợp:
  - Do `user_filter`: liệt kê filter, kèm số mã nếu bỏ từng cái; chỉ người dùng mới gỡ được.
  - Do từ khóa không khớp: gợi ý dạng không dấu/có dấu, từ đồng nghĩa đã duyệt, hoặc duyệt chương gần nhất.
  - Do dữ liệu thiếu (chương 98, chú giải): nói thẳng "có thể nằm ngoài phần dữ liệu hiện có".
  - Không bao giờ hiện "không có mã HS cho hàng này", không tự gán "Loại khác".
- **AI lỗi/timeout** (khi có chat): tin nhắn và hồ sơ đã lưu được giữ nguyên, có nút Thử lại. Danh sách ứng viên vẫn từ tìm kiếm thường, với nhãn "chưa có diễn giải AI". Không hiện nửa câu trả lời như thể đã xong.
- **Thời gian chờ:** kết quả tìm kiếm thường hiện ngay. Diễn giải AI tải sau, trong khối riêng, có trạng thái "đang soạn…" và nút hủy. Không chặn tương tác với danh sách trong lúc chờ LLM. Ngưỡng latency cụ thể chốt sau baseline.

### 3.10 Cải tiến khác: giữ những gì có giá trị thật, bỏ những gì chỉ thêm phức tạp

Đáng cân nhắc:

- **Tra hàng loạt cho chuyên viên** (dán danh sách mã hoặc dòng hàng từ hóa đơn → bảng kiểm tra tồn tại/mô tả/nguồn). Không cần AI, giá trị cao cho người nghiệp vụ. Để sau MVP, kiểm chứng nhu cầu trong user test.
- **"Mã này thường bị nhầm với…"**: danh sách anh em/nhánh gần do người nghiệp vụ duyệt, hiện ở trang chi tiết.
- **Trang chi tiết mã có URL ổn định theo snapshot** để trích dẫn/chia sẻ nội bộ.
- **Lịch sử phiên bản của một mã** (khi có nhiều snapshot): "mô tả đổi từ… sang…".

Loại bỏ hoặc hoãn vì chỉ tăng độ phức tạp ở giai đoạn này: nhận diện ảnh; nhập giọng nói; avatar/nhân cách hóa chatbot; gamification; gợi ý cá nhân hóa xuyên phiên; điểm phần trăm tin cậy; dashboard thống kê cho người dùng cuối; thông báo email; đa ngôn ngữ giao diện ngoài Việt/Anh.

---

## 4. Ba hành trình minh họa: trước / sau

"Trước" là hành vi **có thể xảy ra** nếu xây đúng theo tài liệu hiện tại mà không bổ sung các điểm trên. "Sau" là đề xuất. Số bước và thời gian là **ước lượng thiết kế, chưa đo**. Mã cụ thể không được nêu vì đây không phải kết luận phân loại.

### Hành trình 1 — Người mới, gõ không dấu và đa nghĩa: "con dau go tay"

| Bước | Trước | Sau (đề xuất) |
|---|---|---|
| 1 | Nhập "con dau go tay"; tìm từ khóa không dấu trả trộn các dòng liên quan "dầu", "đầu", "dấu" | Dải "Đang hiểu là": `con dấu` · `dầu` · `Tìm đúng chữ`; kết quả tạm nhóm theo nghĩa |
| 2 | Người dùng không thấy dòng hợp lý, bấm sang chat; chat hỏi "Con dấu bằng vật liệu gì?" (câu không tách được ứng viên) | Chọn `con dấu`; kết quả nhóm theo nhánh, hiện tên nhánh và số mã |
| 3 | Trả lời "nhựa" → AI coi vật liệu là điều kiện, danh sách bị lọc hẹp | Lăng kính duy nhất: "Con dấu hoạt động thế nào?" — lựa chọn theo thứ tự cây + "Không biết" |
| 4 | Chat hỏi tiếp, gợi ý "Có phải loại tự có mực không?" → người dùng xác nhận theo gợi ý | Chọn "Không biết" → mục vào "Còn cần biết"; danh sách giữ các nhánh, nút So sánh nổi lên |
| 5 | Một mã, không rõ còn thiếu gì; raw thuế hiện như số áp dụng | So sánh 2–3 mã: hàng "Điểm khác" chỉ ra cơ chế là điểm tách; raw VAT có nhãn trạng thái; export không kèm lời khai |
| Kết quả mong đợi | ~5 lượt, có rủi ro hội tụ theo gợi ý | Danh sách hữu ích sau ~2 thao tác; 0 câu hỏi không tách ứng viên; người dùng biết cần kiểm gì |

### Hành trình 2 — Chuyên viên so sánh nhanh và chia sẻ cho đồng nghiệp

| Bước | Trước | Sau (đề xuất) |
|---|---|---|
| 1 | Gõ "9611.00" có thể bị coi là chữ, hoặc mất số 0 đầu với chương 0x | Nhận diện mã/prefix bất kể dấu chấm/khoảng trắng; mở thẳng nút cây, bảng dày |
| 2 | Mở từng mã trong tab riêng để so | `↓`/`c` thêm 3 mã vào So sánh, không rời bàn phím |
| 3 | Đọc mô tả cắt ngắn "- - Loại khác", phải tự dò cha | Mô tả nhánh đầy đủ; phần chung gộp, phần khác làm nổi bật |
| 4 | Cột VAT ghi "8/10", dễ hiểu là thuế đang áp dụng | "VAT trong nguồn: 8/10 — chưa đánh giá điều kiện, lấy ngày …"; không sắp xếp/tô màu theo rate |
| 5 | Copy URL trang (có thể chứa toàn bộ trạng thái phiên) | "Chia sẻ" hiện xem trước: chỉ gồm 3 mã + snapshot; không có lời khai |
| 6 | Không có cách báo mô tả nhánh sai | "Báo sai → mô tả nhánh sai" có trường căn cứ; vào hàng đợi duyệt |
| Kết quả mong đợi | Chậm, rủi ro hiểu sai raw thuế | So sánh và chia sẻ trong vài thao tác bàn phím; trạng thái nguồn rõ |

### Hành trình 3 — Hai sản phẩm, sửa lời khai, mở lại trên điện thoại, AI lỗi

Bối cảnh: nhân viên xuất nhập khẩu xử lý con dấu kèm hộp mực bán thành bộ, rồi hỏi thêm máy in; hôm sau tiếp tục trên điện thoại. Giả định chat đã bật (sau MVP).

| Bước | Trước | Sau (đề xuất) |
|---|---|---|
| 1 | "Con dấu kèm hộp mực bán theo bộ" → hệ thống coi là một sản phẩm nhiều vật liệu | Gợi ý "Đây có thể là bộ hàng" → tạo hồ sơ loại *bộ* với 2 thành phần; cảnh báo bộ hàng có quy tắc riêng |
| 2 | "À không, mực để ngoài" → fact cũ bị ghi đè lặng lẽ | Toast diff: "tự có mực → khay mực rời · 1 mã gập · Hoàn tác" |
| 3 | Người dùng bấm hoàn tác ở đâu? Không có | Bấm Hoàn tác; hồ sơ và danh sách quay về revision trước, focus quay về mục đó |
| 4 | "Giờ tra máy in" → vật liệu con dấu bị kéo sang máy in | Sản phẩm mới; hỏi giữ/bỏ từng `user_filter`; fact không mang theo |
| 5 | LLM timeout → màn hình trống hoặc lỗi chung | Tin nhắn đã lưu; "Chưa có diễn giải AI — Thử lại"; danh sách tìm kiếm vẫn hiện |
| 6 | Hôm sau mở trên điện thoại: phải đăng nhập mới thấy, hoặc mất (nếu chỉ lưu trên máy tính) | MVP: nói rõ "lưu trên thiết bị này". Sau khi có tài khoản: "Tiếp tục: Con dấu (bộ)" + tóm tắt lời khai đã xác nhận; snapshot đổi thì hiện khác biệt |
| 7 | Hồ sơ trên mobile bị ẩn, không biết vì sao kết quả đổi | Thanh dính đáy "Con dấu (bộ) · 3 đã khai · 1 còn cần biết" |
| Kết quả mong đợi | Lẫn ngữ cảnh, mất tin vì không hoàn tác được | Mỗi thay đổi nhìn thấy và hoàn tác được; AI lỗi không chặn việc tra |

---

## 5. Bảng ưu tiên cải tiến

Độ khó là tương đối (S < M < L), giả định đã có snapshot sạch và tìm kiếm lexical cơ bản. Toàn bộ cột "Giả thuyết" **chưa được kiểm chứng**.

| # | Cải tiến | Lợi ích | Độ khó | Dependency | Giả thuyết cần thử | Xếp loại |
|---|---|---|---|---|---|---|
| 1 | Dải "Đang hiểu là" (không dấu/typo/alias đa nghĩa) | Giảm danh sách lẫn nghĩa ở bước đầu | M | Từ điển alias có duyệt; trường tìm không dấu | Người mới chọn đúng nghĩa trong 1 thao tác và time-to-useful-list giảm so với danh sách trộn | MVP |
| 2 | Kết quả nhóm theo nhánh, mô tả nhánh đầy đủ | Định hướng "đang ở khu vực nào"; tránh "Loại khác" vô nghĩa | M | Cây và mô tả ghép có nguồn; xử lý thiếu tên nhóm | Người dùng nhận ra nhánh đúng nhanh hơn với danh sách phẳng | MVP |
| 3 | Nhãn/bảng trạng thái nguồn + nhãn VAT raw | Hiểu đúng phạm vi và giới hạn dữ liệu | S | Manifest snapshot; danh sách phần thiếu | ≥ đa số người thử trả lời đúng câu hỏi hiểu trạng thái (mục 7) | MVP |
| 4 | So sánh 2–4 mã có làm nổi bật điểm khác | Giá trị cao cho cả hai nhóm, không cần AI | M | #2 | Chuyên viên dùng thường xuyên; người mới hiểu điều kiện tách | MVP |
| 5 | Lăng kính phân biệt từ anh em trong cây, gập thay vì xóa | "Hỏi vừa đủ" không cần chat, tôn trọng `user_fact` | M | Tên nhánh chính thức; điểm phân biệt duyệt (dần) | Số câu hỏi thừa thấp; người dùng không nghĩ mã bị gập đã "biến mất" | MVP (chỉ ở nhánh có căn cứ) |
| 6 | Hồ sơ với nhãn nguồn + diff + undo | Kiểm soát, tin tưởng, sửa được | M | Mô hình event của hồ sơ | Tỷ lệ hoàn tác do hệ thống hiểu sai giảm qua vòng thử | MVP (bản cục bộ) |
| 7 | Lưu cục bộ, tiếp tục, xóa | Giá trị trước đăng nhập | S | #6 | Người dùng quay lại phiên mà không cần tài khoản | MVP |
| 8 | Chia sẻ/export có xem trước, mặc định không lời khai | Cộng tác an toàn | S | #4, #7 | Người dùng hiểu link/export chứa gì | MVP |
| 9 | "Báo sai" có cấu trúc + hàng đợi duyệt | Nguồn cải thiện alias an toàn | S (UI) / M (quy trình) | Người duyệt nghiệp vụ | Phản hồi đủ cụ thể để tạo alias/ca kiểm tra | MVP (thu thập), duyệt là quy trình |
| 10 | Mobile thanh hồ sơ dính đáy, bàn phím, aria-live | Dùng được trên điện thoại và trợ năng | M | #6 | Người dùng mobile vẫn giải thích được vì sao kết quả đổi | MVP |
| 11 | Chat ghi vào cùng hồ sơ, câu hỏi kiểm tra chống dẫn dắt | Hỗ trợ mô tả tự do | L | RAG, eval, #5–#6 | Chat tăng tỷ lệ tới danh sách hữu ích so với A thuần, không tăng hội tụ sai | Để sau |
| 12 | Tài khoản, đồng bộ thiết bị | Tiếp tục xuyên thiết bị | M | Quyết định PRIV/retention | Đủ người cần đa thiết bị để đáng làm | Để sau |
| 13 | Bộ hàng (cấu trúc thành phần) + biến thể song song | Phản ánh đúng thực tế nhập khẩu | M–L | #6; quy tắc duyệt cho bộ hàng | Người dùng hiểu cảnh báo bộ hàng, không coi danh sách thành phần là kết luận | Biến thể: sau MVP sớm; bộ hàng: để sau |
| 14 | Tra hàng loạt (dán danh sách) | Tiết kiệm thời gian chuyên viên | M | Exact/prefix ổn định | Chuyên viên có nhu cầu thật và dùng hằng tuần | Để sau, thử nhu cầu |
| 15 | Taxonomy tiện ích làm lối duyệt | Lối vào cho người mới | L (curation) | Người duyệt; coverage | Duyệt theo nhóm tiện ích nhanh hơn tìm chữ với người mới | Để sau |
| 16 | Chế độ "Hỏi tôi từng bước" (tuần tự hóa lăng kính) | Cho người thích được dẫn | S sau #5 | #5 | Có nhóm người mới bỏ cuộc trước khi chạm lăng kính | Chỉ làm nếu test cho thấy cần |
| 17 | Đánh giá VAT theo hồ sơ (khâu/ngày/điều kiện) | Thông tin thuế có căn cứ | L | Rule đã duyệt theo `vat-design.md` | — | Để sau, ngoài MVP |

---

## 6. MVP / Để sau / Không nên làm

**MVP (không cần LLM):** #1–#10 ở bảng trên. Lăng kính (#5) chỉ bật ở nhánh có tên chính thức hoặc điểm phân biệt đã duyệt; nhánh khác chỉ có so sánh. VAT/thuế chỉ hiển thị raw có nhãn và ngày.

**Để sau:** chat (#11) khi có baseline A để so sánh; tài khoản (#12); biến thể và bộ hàng (#13); tra hàng loạt (#14); taxonomy tiện ích (#15); chế độ từng bước (#16); đánh giá VAT (#17) khi có rule đã duyệt và người duy trì.

**Không nên làm:**

- Phần trăm hoặc thanh "độ chắc chắn" chưa hiệu chuẩn.
- Wizard/form bắt buộc trước khi thấy kết quả; cổng đăng nhập trước khi tra.
- Filter hoặc sắp xếp theo rate thuế/VAT thô; tô màu "thuế thấp".
- Tự áp `user_fact` hay `inferred` thành filter cứng; tự gỡ `user_filter` khi không có kết quả.
- Lựa chọn trả lời xếp theo mã AI đoán; câu hỏi dạng xác nhận.
- Nút "Chốt mã" hay ngôn ngữ ám chỉ kết quả được cơ quan chấp nhận.
- Phản hồi người dùng tự động đổi ranking/alias/nhãn.
- Nhận diện ảnh, giọng nói, nhân cách hóa bot, gamification trong giai đoạn này.
- Tên nhánh do AI tự sinh hiển thị như tên chính thức.

---

## 7. Kế hoạch user testing gọn

**Chưa có kết quả thử nghiệm nào.** Kế hoạch này mô tả việc cần làm khi đã có bản dùng được (hoặc mô phỏng Wizard-of-Oz trên dữ liệu thật). Không cần xây prototype riêng chỉ để test.

**Người tham gia (vòng 1):** 5–6 người mới (biết tên hàng, không biết HS) và 4–5 chuyên viên/nhân viên khai báo. Vòng 2 lặp lại với người khác sau khi sửa. Đây là nghiên cứu định tính, không đủ để kết luận thống kê.

**Nhiệm vụ (mỗi buổi 30–45 phút, think-aloud):**

1. Tìm mã ứng viên cho một hàng phổ thông gõ không dấu, có đa nghĩa (dạng hành trình 1).
2. So sánh 3 mã cho trước, giải thích khác biệt và chia sẻ cho đồng nghiệp (hành trình 2).
3. Khai một sản phẩm, sửa một lời khai, hoàn tác, chuyển sang sản phẩm thứ hai rồi quay lại (hành trình 3, phần không cần AI).
4. Trả lời 3 câu hỏi hiểu trạng thái nguồn (xem chỉ số 4).
5. Một nhiệm vụ cố ý không có kết quả trong dữ liệu (ví dụ thuộc phần đã biết là thiếu) để xem người dùng hiểu thông báo thế nào.

Case gold và đáp án nhánh đúng do người nghiệp vụ duyệt trước buổi test.

**Chỉ số (định nghĩa trước, ngưỡng chốt sau vòng 1 làm baseline):**

| Chỉ số | Định nghĩa | Cách đo |
|---|---|---|
| Thời gian tới danh sách ứng viên có ích | Từ lần nhập đầu tới khi top 5 hiển thị chứa mã/nhánh được chuyên gia duyệt là đúng **và** người dùng chỉ ra được nó | Ghi màn hình + log sự kiện; báo trung vị và phân tán theo nhóm người dùng |
| Số lượt hỏi thừa | Câu hỏi/lăng kính mà câu trả lời không đổi tập top 5, hoặc hỏi lại điều đã khai | Log + chấm lại từ case gold; tính theo phiên |
| Tỷ lệ sửa/hoàn tác | Số thay đổi hồ sơ bị hoàn tác hoặc sửa trong phiên / tổng thay đổi; tách "hệ thống hiểu sai" và "người dùng đổi ý" bằng phỏng vấn sau | Log + phỏng vấn |
| Khả năng hiểu trạng thái nguồn | Tỷ lệ trả lời đúng 3 câu: "8/10 có phải VAT đang áp dụng cho lô hàng của bạn không?", "Dữ liệu lấy từ đâu, ngày nào?", "Danh sách này có thể thiếu phần nào?" | Câu hỏi sau nhiệm vụ |
| Phụ: hội tụ theo gợi ý | Người dùng chọn lựa chọn trùng mã AI đoán dù case gold nói khác | Chỉ đo khi có chat hoặc suy đoán hiện trên UI |
| Phụ: hiểu "gập" | Người dùng có nghĩ mã bị gập đã bị loại hẳn không | Hỏi trực tiếp sau nhiệm vụ 1 |

Kiểm tra chống dẫn dắt nhỏ: trên cùng một case, đảo thứ tự hiển thị lựa chọn (thứ tự cây và thứ tự ngẫu nhiên) giữa hai nhóm nhỏ, quan sát lựa chọn có bị kéo theo vị trí đầu không. Với cỡ mẫu này, kết quả chỉ mang tính tín hiệu.

**Quyết định gắn với kết quả:** nếu người mới bỏ cuộc trước lăng kính → thử #16. Nếu tỷ lệ hiểu trạng thái nguồn thấp → sửa nhãn trước khi thêm tính năng. Nếu hoàn tác do hiểu sai cao → thu hẹp suy luận tự động. Chỉ mở chat (#11) khi đã có baseline A và bộ case để so sánh.

---

## 8. Câu hỏi cần chủ dự án trả lời (ảnh hưởng trực tiếp UX)

1. Nhóm pilot chính 3 tháng đầu: người mới hay chuyên viên? (Ảnh hưởng mặc định độ dày thông tin, không ảnh hưởng hướng A.)
2. Chấp nhận MVP chỉ lưu cục bộ, chưa có tài khoản?
3. Có người nghiệp vụ duyệt alias và điểm phân biệt hằng tuần không? Nếu không có, lăng kính chỉ dựa vào tên nhánh chính thức và sẽ thưa.
4. Có lấy được tên chính thức của nhóm 4 số/phân nhóm 6 số và chú giải không? Đây là điều kiện để nhóm theo nhánh và lăng kính có chất lượng.
5. Có đồng ý thu truy vấn 0 kết quả (ẩn danh, có đồng ý) để curation alias không?
