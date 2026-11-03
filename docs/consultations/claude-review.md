# Ý kiến tham vấn độc lập — Claude Code

> Ghi chú của coordinator: đây là ý kiến độc lập, có các giả định chưa xác minh. Đọc cùng [bản tổng hợp và giới hạn áp dụng](synthesis.md); đặc biệt không áp dụng mệnh đề “luôn có dòng Loại khác”, không coi trích dẫn khớp chữ là đủ chứng minh kết luận, và không suy thời điểm triển khai Việt Nam từ mốc HS quốc tế.

Ngày viết: 2026-11-03. Người viết: Claude Code (Opus 5.5), theo [đề bài](claude-brief.md).

Phạm vi: đây là phản biện thiết kế trên giấy. Repo chưa có ứng dụng, nên tôi **không chạy hay thử ứng dụng nào**, không benchmark và không đọc lại file dữ liệu trong Drive. Tôi thử đọc `import_postgres.sql` trong Drive nhưng connector yêu cầu đăng nhập lại, nên chỉ dùng các thống kê đã ghi trong `data-strategy.md`.

---

## 0. Tóm tắt khuyến nghị

1. **Thiếu sót dữ liệu lớn nhất là thiếu nền pháp lý của việc phân loại, chứ không phải chất lượng dòng 8 số.** Snapshot hiện có chỉ chứa dòng mã chi tiết, chưa có chú giải phần/chương, mô tả nhóm 4 số và phân nhóm 6 số, hay quy tắc tổng quát (GIR). Khi thiếu những phần này, RAG chỉ so độ giống của tên hàng và không giải thích được "vì sao" đúng nghĩa. Trước khi làm chat cần lấy được danh mục chính thức có chú giải (P0).
2. **Nên đổi thứ tự: tra cứu, cây HS và "thu hẹp có hướng dẫn" không cần LLM là MVP; chat LLM là lớp bổ sung.** Cây HS đã chứa sẵn các câu hỏi phân biệt (anh em cùng cấp: "- - Bằng tay" / "- - Loại khác"). Phần lớn giá trị "hỏi vừa đủ" có thể sinh tất định từ cây, và luồng này cũng chính là fallback khi AI lỗi.
3. **Bỏ bộ lọc thuế khỏi MVP.** Chỉ hiển thị chuỗi thuế thô kèm nhãn nguồn và ngày. Lọc theo một con số thuế chưa gắn ngày hiệu lực và điều kiện sẽ khiến người dùng hiểu sai.
4. **Kiến trúc: chọn một ứng dụng TypeScript với PostgreSQL duy nhất** (FTS + `unaccent` + `pg_trgm` + pgvector). Pipeline dữ liệu chạy offline và giao tiếp với ứng dụng qua *snapshot đã publish*, không qua API. Với khoảng 11–12 nghìn mã, chưa có lý do cho search engine hay vector DB riêng. Mục 4 ghi điều kiện để đổi lựa chọn.
5. **Quy tắc cứng chống mất mã:** chỉ chip do người dùng đặt mới là filter cứng. Mọi thứ AI suy ra chỉ dùng để xếp hạng. Bước sinh ứng viên luôn chạy cả khi không có ràng buộc suy đoán, và UI hiển thị số mã bị loại.
6. **Kịch bản con dấu đang tự minh họa rủi ro hỏi thừa.** Nhiều câu hỏi trong đó (vỏ nhựa, mặt cao su, tự có mực) có thể không làm đổi mã. Tiêu chí đánh giá một câu hỏi làm rõ phải là "câu trả lời có tách tập ứng viên hay không".

---

## 1. Bằng chứng đã kiểm tra và giả định

| Khẳng định | Trạng thái | Nguồn |
|---|---|---|
| Snapshot JSON có 11.414 dòng, 12 trường, thống kê trường trống | Coordinator đọc ngày 2026-11-03; tôi **không** đọc lại | `data-strategy.md` |
| SQL nhắc 457 mã chương 98 nhưng chưa thấy CSV | Coordinator ghi; tôi không mở được SQL (Drive cần đăng nhập lại) | `data-sources.md` |
| Kho upstream `ozvietnam/hs-code-api` có `data/tax.json` khoảng **11.871** mã | Đã kiểm tra trang repo ngày 2026-11-03 (qua công cụ tóm tắt, chưa tải file) | https://github.com/ozvietnam/hs-code-api |
| 11.414 + 457 = 11.871 | Phép cộng khớp. **Giả thuyết:** snapshot trong Drive là upstream bỏ chương 98. Cần đối soát mã, chưa được coi là đã xác nhận | Suy luận |
| Upstream còn có `notes.json` (chú giải chương), `explanatory-notes.json`, `precedents.json` (khoảng 3.033 thông báo TB-TCHQ), `trade-synonyms.json`, `decision-tables/`, `versions/` | Có trên trang repo ngày 2026-11-03; chưa kiểm tra nội dung hay chất lượng | Như trên |
| Dữ liệu upstream theo CC BY-SA 4.0 và yêu cầu attribution "HS Knowledge Base — github.com/ozvietnam/hs-code-api". Thư mục `data/wco-op/` là nội dung WCO **không** thuộc license này (dự án đó trả phí bản quyền). LICENSE-DATA viện dẫn Điều 15 Luật SHTT: văn bản QPPL không được bảo hộ quyền tác giả, nên CC chỉ áp cho phần biên soạn/làm giàu | Đọc ngày 2026-11-03 | https://github.com/ozvietnam/hs-code-api/blob/main/LICENSE-DATA |
| Điều 15 Luật SHTT loại văn bản QPPL khỏi đối tượng bảo hộ | **Chưa tự kiểm chứng** trên văn bản gốc; đang dựa vào LICENSE-DATA và hiểu biết chung. Cần người có chuyên môn pháp lý xác nhận | — |
| HS 2028 có hiệu lực ngày 2028-01-01 | Đã kiểm tra ngày 2026-11-03 | https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2028-edition.aspx |
| Danh mục hàng hóa XNK Việt Nam hiện dựa trên AHTN 2022 (Thông tư 31/2022/TT-BTC) và có chú giải phần/chương | **Giả định từ hiểu biết chung**, chưa mở văn bản. Cần xác minh số hiệu, hiệu lực và văn bản sửa đổi | — |
| HS 2022 có khoảng 1.228 nhóm 4 số và khoảng 5.600 phân nhóm 6 số | **Từ hiểu biết chung**, chưa kiểm chứng; chỉ dùng để ước lượng cỡ công việc gắn nhãn | — |
| Năng lực tiếng Việt của PostgreSQL FTS (không có stemmer/tách từ tiếng Việt) | Hiểu biết chung; cần đo bằng bộ truy vấn baseline | — |

Hệ quả của dòng chương 98: nếu giả thuyết trên đúng, có thể lấy lại 457 mã từ upstream thay vì "chờ CSV". Chương 98 là phần riêng của Việt Nam và có quan hệ với mã ở chương 1–97, nên cần mô hình hóa riêng (xem mục 3).

---

## 2. Phản biện UX

### 2.1 Hai nhóm người dùng có nhu cầu trái nhau

| | Người mới | Chuyên viên |
|---|---|---|
| Đầu vào | Tên thương mại, ảnh, công dụng | Mã, tiền tố, số chương |
| Cần | Được dẫn từng bước, ngôn ngữ đời thường | Mật độ thông tin, bàn phím, so sánh nhanh, chú giải |
| Rủi ro | Tin mã AI đưa ra như kết luận | Bị chat làm chậm |

Tôi đề xuất **một màn hình duy nhất, ba vùng dùng chung một hồ sơ**, không làm hai ứng dụng riêng:

- Thanh tìm kiếm: nhập số thì tra mã/tiền tố ngay, nhập chữ thì tìm theo mô tả.
- Danh sách ứng viên, *nhóm theo nhánh cây* (chương → nhóm 4 số → dòng), không phải danh sách phẳng. Chuyên viên thấy ngay các mã anh em; người mới thấy "đang ở khu vực nào".
- Bảng hồ sơ bên phải gồm "Đang hiểu / Còn thiếu / Chip lọc". Chat là *một cách nhập liệu* vào hồ sơ này, không phải nơi lưu trạng thái.

Chuyên viên cần thêm hai thứ mà tài liệu hiện chưa có: **so sánh 2–4 mã cạnh nhau** (mô tả đầy đủ theo nhánh, chú giải liên quan, đơn vị tính, chuỗi thuế thô) và **URL chia sẻ trạng thái** (đã có trong roadmap giai đoạn 2, cần xác định rõ URL không chứa lời khai).

### 2.2 Trạng thái dùng chung: cần mô hình hóa ba loại ràng buộc

`conversation-ux.md` đã phân biệt "ràng buộc người dùng" với "giả thuyết AI". Tôi đề nghị cụ thể hóa thành ba loại có hành vi khác nhau:

| Loại | Ví dụ | Tác động lên tìm kiếm | Hiển thị |
|---|---|---|---|
| `user_filter` | Người dùng bấm chip "Chương 96" | Filter cứng | Chip đậm, chỉ người dùng gỡ |
| `user_fact` | "đóng mực, bằng tay" (người dùng nói hoặc xác nhận) | Xếp hạng mạnh; được thành filter cứng **chỉ khi** người dùng bấm "dùng làm bộ lọc" | Mục "Đang hiểu" |
| `inferred` | AI đoán "vật liệu chính: nhựa" | Chỉ xếp hạng nhẹ, không bao giờ loại mã | Chữ nghiêng, có nút xác nhận/bác |

Điểm chưa được viết ra: **fact thuộc về sản phẩm, filter thuộc về phiên tìm kiếm.** Khi chuyển sang sản phẩm khác ("giờ tra máy in"), fact phải đổi theo sản phẩm. Filter người dùng đặt thủ công thì phải hỏi giữ hay bỏ. Nếu không tách, đây sẽ là nguồn lỗi kéo ngữ cảnh sang sản phẩm khác.

### 2.3 Hỏi vừa đủ — kịch bản con dấu cần sửa

Kịch bản hiện tại giả định mỗi lượt đều có một câu hỏi đáng hỏi. Trên thực tế, nếu mọi ứng viên còn lại cùng nằm trong một dòng mã (từ hiểu biết chung, con dấu cầm tay có thể đều thuộc nhóm 96.11; **chưa kiểm chứng và không phải kết luận phân loại**), thì hỏi về vỏ nhựa hay mặt cao su là thừa. Quy tắc tôi đề xuất:

- Chỉ hỏi khi câu trả lời **tách được tập ứng viên hiện tại**. Câu hỏi lấy từ điểm khác nhau giữa các nhánh anh em trong cây, hoặc từ chú giải loại trừ.
- Khi tập ứng viên đã hội tụ về một dòng thì dừng hỏi. Trả mã ứng viên, nêu "vì sao", và liệt kê *điều kiện có thể làm thay đổi kết quả* để người dùng tự kiểm.
- Mỗi lượt hỏi tối đa một câu (có thể kèm lựa chọn nhanh). Luôn có lựa chọn "không biết", và "không biết" không được chặn luồng.
- Thêm vào kịch bản một bước "**không hỏi thêm vì không làm đổi mã**" để kiểm tra hành vi này.

### 2.4 Sửa lời khai

Hướng event-sourcing (`fact_events`) là đúng. Cần bổ sung:

- Sửa ngầm ("à phải chấm khay mực ngoài") khác sửa tường minh. Với sửa ngầm, hệ thống nên **hiển thị diff** ("Đã đổi: tự có mực → dùng khay mực rời") kèm nút hoàn tác, thay vì hỏi xác nhận mỗi lần.
- Khi một fact thay đổi, phải tính lại ứng viên và nói rõ ứng viên nào vào/ra, nếu không người dùng không hiểu vì sao kết quả nhảy.
- Sửa trên UI và sửa bằng lời phải sinh cùng một loại event.

### 2.5 Nhiều sản phẩm, bộ hàng và biến thể

Tài liệu đã có "sản phẩm riêng", nhưng phân loại HS còn hai trường hợp chưa được mô hình hóa:

- **Bộ hàng đóng gói bán lẻ** (ví dụ con dấu kèm hộp mực bán thành bộ). Theo GIR 3(b), bộ này có thể phân loại theo thành phần tạo đặc trưng cơ bản. Đây không phải "hai sản phẩm" cũng không phải "một sản phẩm có nhiều vật liệu".
- **Biến thể để so sánh** ("còn loại bằng kim loại?"). Nên là một bản sao hồ sơ có liên kết `variant_of`, hiển thị cạnh nhau, không ghi đè sản phẩm gốc.

Đề xuất quan hệ: `product.kind ∈ {single, set, variant}` và `product.parent_id`.

### 2.6 Phiên dài

Trạng thái chuẩn là hồ sơ sản phẩm. Lịch sử chat chỉ là bằng chứng. Mỗi lượt gửi mô hình *hồ sơ có cấu trúc + vài tin gần nhất*, không gửi toàn bộ lịch sử. Khi đó phiên dài không làm chi phí tăng tuyến tính, và bản tóm tắt chỉ còn là tiện ích hiển thị. Phải luôn hiển thị sản phẩm đang chọn và cho đổi bằng một cú bấm.

### 2.7 Không có kết quả

Danh mục HS **bao phủ toàn bộ** hàng hóa: luôn có dòng "Loại khác" ở cấp cuối. Vì vậy "0 kết quả" gần như luôn do (a) filter quá chặt, hoặc (b) tìm từ khóa không khớp từ ngữ pháp lý. UI nên:

- Với (a): chỉ ra filter nào làm hẹp, kèm số lượng nếu gỡ từng filter (đã có trong tài liệu).
- Với (b): đề xuất duyệt theo chương/nhóm gần nhất, hoặc chuyển sang "hỗ trợ phân loại". Không được hiển thị "không có mã HS cho hàng này".

---

## 3. Phản biện dữ liệu

### 3.1 Hierarchy và ngữ cảnh — P0

- Mô tả dòng 8 số kiểu "- - - Loại khác" vô nghĩa nếu tách khỏi nhánh. Tài liệu đã nêu rõ việc "không chỉ suy ra tên cấp từ prefix", nhưng **dữ liệu để ghép đúng nhánh chưa có**: thiếu mô tả nhóm 4 số và phân nhóm 6 số, thiếu các dòng tiêu đề không mang mã (dòng gạch đầu dòng trung gian).
- Nguồn ưu tiên là văn bản danh mục chính thức (giả định: Thông tư 31/2022/TT-BTC cùng văn bản sửa đổi). Nếu Điều 15 Luật SHTT được xác nhận thì nguồn này không chịu ràng buộc ShareAlike. Upstream ozvietnam có `notes.json` và giải quyết tên đến cấp 4 số. Có thể dùng để **đối soát**, nhưng nếu dùng làm nguồn thì phần biên soạn phải theo CC BY-SA.
- **Chú giải phần/chương và GIR là bằng chứng bắt buộc** cho "vì sao". Không có chúng thì citation chỉ trỏ được về tên dòng.

### 3.2 Nhóm tiện ích nhiều-nhiều — chi phí duyệt

Gắn nhãn ở cấp dòng 8 số nghĩa là khoảng 11k × số nhóm cần duyệt, không khả thi cho dự án OSS mới. Đề xuất:

- Gắn nhãn ở **cấp nhóm 4 số** (ước khoảng 1.2k nhóm, chưa kiểm chứng), kế thừa xuống dòng con, và lưu ngoại lệ ở cấp dòng. Khối lượng duyệt giảm khoảng một bậc.
- Taxonomy tiện ích nên nhỏ (khoảng 20–40 nhóm cấp 1) và có phiên bản. Tránh để mỗi người đóng góp tự thêm nhóm.
- Nhóm tiện ích không bao giờ thay thế cây chính thức trong lời giải thích.

### 3.3 Facet chưa đủ coverage

- Một facet chỉ được hiển thị trong một phạm vi (chương/nhóm) khi **tỷ lệ mã trong phạm vi đó đã có nhãn đã duyệt ≥ ngưỡng** do chủ dự án chốt. Dưới ngưỡng thì facet chỉ xuất hiện như gợi ý xếp hạng.
- Mỗi facet luôn có bucket "chưa gắn nhãn (N)". Khi người dùng chọn một giá trị, mặc định là "giá trị X **hoặc chưa rõ**", và cho người dùng tắt phần "chưa rõ". Như vậy thiếu nhãn không làm mất mã, đúng yêu cầu FILTER-02.
- Thuộc tính quyết định mã thường đã nằm trong chính mô tả cây ("bằng tay", "dạng lỏng", "trọng lượng trên X kg"). Nên ưu tiên trích thuộc tính **từ mô tả nhánh bằng quy tắc**, vì có bằng chứng sẵn, trước khi dùng mô hình gắn nhãn.

### 3.4 Thuế thô — bỏ khỏi filter MVP

- Chuỗi như `*/5/8/10` hay `0 (-KH)` mã hóa điều kiện. Parse sai sẽ cho người dùng một con số có vẻ đáng tin.
- Thuế ưu đãi đặc biệt theo FTA phụ thuộc xuất xứ, ngày, C/O và từng nghị định. VAT có thay đổi gần đây (upstream nhắc Nghị định 174/2025, chưa kiểm chứng).
- **Khuyến nghị:** MVP chỉ hiển thị chuỗi thô, kèm nhãn "giá trị ghi trong dữ liệu tham khảo [nguồn, ngày snapshot]". Không filter và không sắp xếp theo thuế. Parse có cấu trúc để sau, khi có quy tắc được duyệt và tập kiểm thử riêng.

### 3.5 Phiên bản theo thời gian

Cần tách ba trục, hiện đang gộp chung vào "dataset_version":

1. **Phiên bản danh mục** (AHTN 2022, sau này 2028). HS 2028 có hiệu lực 2028-01-01, nên trong khoảng một năm tới sẽ phải xử lý chuyển đổi.
2. **Hiệu lực thuế và chính sách**, thay đổi theo từng văn bản và có `valid_from`/`valid_to`.
3. **Snapshot ingest** (ngày tải, hash).

Bổ sung **bảng tương quan mã giữa các phiên bản** (một-nhiều, nhiều-một). Phiên chat cũ phải ghi rõ đã dùng phiên bản nào. Khi mở lại sau khi có phiên bản mới, hệ thống báo "mã này đã đổi/tách" thay vì âm thầm dùng dữ liệu mới.

### 3.6 Giấy phép

- MIT cho mã, dữ liệu ngoài theo license riêng: đúng hướng.
- Nếu nhập dữ liệu phái sinh từ ozvietnam (rất có khả năng, nếu giả thuyết 11.414 + 457 đúng), **mọi dữ liệu derived publish lại** (alias, nhãn, mô tả đầy đủ ghép từ đó) phải theo CC BY-SA 4.0 và ghi attribution đúng câu chữ yêu cầu. Cần quyết định có chấp nhận ràng buộc này không.
- Không dùng `explanatory-notes.json` và không dùng bất cứ thứ gì có nguồn WCO (HSEN) khi chưa làm rõ quyền: upstream tự ghi rằng nội dung WCO cần trả phí bản quyền.
- `precedents.json` (thông báo phân loại) là nguồn đánh giá rất giá trị (xem mục 6). Cần xác minh quyền và nguồn gốc của từng thông báo.
- Lời khai do người dùng nhập không bao giờ được dùng làm dữ liệu huấn luyện hay đánh giá công khai nếu chưa có đồng ý tường minh.

### 3.7 Alias đa nghĩa

- Alias nên ánh xạ tới **khái niệm**, và khái niệm ánh xạ tới tập nhánh (nhiều-nhiều). Không ánh xạ thẳng alias tới mã.
- Alias đa nghĩa ("dấu", "stamp" theo nghĩa tem, "seal" theo nghĩa niêm phong/gioăng) cần cờ `ambiguous` và các nghĩa đã liệt kê. Truy vấn trúng alias đa nghĩa sẽ kích hoạt câu hỏi làm rõ nghĩa trước câu hỏi thuộc tính.
- Có thể khởi tạo từ `trade-synonyms.json` của upstream nếu chấp nhận license, nhưng vẫn phải duyệt.

### 3.8 Kiểm duyệt AI

- Hàng đợi duyệt sắp theo **tác động**: nhãn/alias dùng nhiều trong truy vấn và nhãn ở cấp nhóm 4 số có độ phủ rộng được ưu tiên.
- Mỗi lần duyệt lưu người duyệt, thời điểm và bằng chứng đã xem. Từ chối cũng là dữ liệu (dùng làm negative cho đánh giá).
- Đo **tỷ lệ đồng thuận** trên một mẫu duyệt chéo. Khi chưa có người duyệt thì nhãn AI luôn ở trạng thái `proposed` và chỉ dùng để xếp hạng.

---

## 4. Kiến trúc: so sánh và lựa chọn

### 4.1 Các phương án thực tế cho OSS tự triển khai

| | **P1. TS monolith + PostgreSQL duy nhất** | **P2. TS app + PostgreSQL + Meilisearch/Typesense** | **P3. TS web + Python API (FastAPI) + PostgreSQL** |
|---|---|---|---|
| Tìm kiếm tiếng Việt | FTS cấu hình `simple` + `unaccent` + `pg_trgm` cho typo + pgvector. Không có tách từ tiếng Việt; dùng n-gram/trigram bù lại | Typo-tolerance, facet và highlight có sẵn, chất lượng mặc định tốt | Như P1, cộng thêm thư viện NLP tiếng Việt (tách từ) |
| Facet theo nhãn đã duyệt | SQL thẳng, nhất quán giao dịch với dữ liệu | Phải đồng bộ index. Facet "X hoặc chưa rõ" phải tự dựng | SQL |
| Số dịch vụ | 2 (app, db) + worker cùng image | 3+; thêm bước đồng bộ, backup và phiên bản index | 3; hai runtime và một hợp đồng API |
| Người đóng góp | Một ngôn ngữ | Một ngôn ngữ, thêm kiến thức engine | Hai ngôn ngữ |
| Xử lý PDF văn bản pháp lý | Yếu hơn | Yếu hơn | Mạnh |
| Rollback dataset + index đồng bộ | Một transaction / một DB | Khó hơn (hai kho) | Một DB |

### 4.2 Lựa chọn: P1, với pipeline dữ liệu tách bằng hợp đồng snapshot

Lý do:

- Quy mô đã biết rất nhỏ: khoảng 12k mã cộng vài nghìn đoạn chú giải/thông báo. Embedding cho 12k dòng ở 1024 chiều float32 chỉ khoảng 50 MB; quét exact kNN cũng chấp nhận được và **không cần ANN index** ở MVP (sẽ đo lại bằng benchmark).
- Yêu cầu "rollback dataset và search index đồng bộ" gần như miễn phí khi cả hai nằm chung một PostgreSQL, ví dụ mỗi snapshot là một schema hoặc có cột `dataset_version` và chuyển bằng con trỏ "active version".
- Self-host đơn giản nhất (Docker Compose 2 dịch vụ), đúng tinh thần CONTRIBUTING về chi phí dependency.

Điều chỉnh so với `architecture.md`: **pipeline dữ liệu không cần là worker online.** Pipeline nên là một CLI có thể tái lập, chạy offline, xuất *snapshot đã publish* (SQL dump hoặc Parquet kèm manifest, hash và quality report). Ứng dụng chỉ nạp snapshot. Hợp đồng là schema của snapshot. Nhờ đó pipeline có thể viết bằng Python sau này mà không biến thành P3. Worker online chỉ cần cho việc embedding lại và các tác vụ của phiên.

**Điều kiện để đổi lựa chọn** (đo được, không theo cảm tính):

- Sang P2 nếu, trên bộ truy vấn baseline, recall@10 của tìm từ khóa P1 với nhóm truy vấn typo/không dấu thấp hơn đáng kể so với một bản thử Meilisearch/Typesense trên cùng tập (ngưỡng chốt sau baseline), *và* tinh chỉnh trigram/synonym không thu hẹp được khoảng cách.
- Sang pipeline Python (vẫn giữ hợp đồng snapshot, không cần P3) khi bắt đầu ingest PDF/văn bản pháp lý mà các thư viện TS không xử lý được bảng biểu.
- Dùng ANN index (HNSW) khi số chunk vượt mức làm exact scan vượt ngân sách độ trễ đã đo.
- Thêm Redis hay hàng đợi riêng chỉ khi có số đo tải. Tán thành `architecture.md` ở điểm này.

Tôi **không** gọi P1 là tối ưu. Đây là lựa chọn có chi phí đảo ngược thấp nhất với hiểu biết hiện tại.

---

## 5. RAG

### 5.1 Đơn vị truy xuất

Có hai kho, cần xử lý khác nhau:

- **Kho mã**: mỗi dòng 8 số được index bằng *mô tả đầy đủ theo nhánh* (tên chương › nhóm › phân nhóm › dòng), không bằng mô tả rời.
- **Kho bằng chứng**: chú giải phần/chương, GIR, thông báo phân loại (nếu được phép dùng). Mỗi chunk gắn `applies_to` (phạm vi mã), `doc_version` và `valid_from/to`.

### 5.2 Viết lại truy vấn

- Truy vấn gửi đi được **dựng tất định từ hồ sơ** (tên + fact đã xác nhận), không lấy từ câu chat cuối. Điều này giải quyết "không tìm riêng câu rời".
- LLM chỉ dùng để *mở rộng thuật ngữ*: từ tên thương mại sang thuật ngữ danh mục ("con dấu" → "dấu ngày, dấu niêm phong, dấu đánh số"), sinh 2–4 biến thể truy vấn. Lưu các biến thể này để audit.
- Từ điển alias đã duyệt chạy trước LLM, có thể dùng khi không có AI, và cho kết quả lặp lại được.

### 5.3 Retrieval lai và chống mất mã

1. Exact/prefix khi có số.
2. Lấy song song: lexical (FTS + trigram trên text không dấu) và vector, trên kho mã. Gộp bằng RRF (reciprocal rank fusion).
3. **Mở rộng theo cây:** đưa thêm các nhánh anh em và dòng "Loại khác" của mọi nhóm 4 số đã xuất hiện trong top-k. Bước này chống mất mã khi mô tả đúng chỉ ghi "Loại khác".
4. Áp `user_filter` (cứng). `user_fact` và `inferred` chỉ là tín hiệu rerank.
5. **Kiểm toán recall:** luôn tính thêm tập ứng viên khi bỏ mọi ràng buộc không cứng. Nếu một mã có thứ hạng cao ở tập này bị đẩy khỏi top hiển thị, hiển thị "N mã bị đẩy xuống do giả định X".
6. Facet đếm trên **tập ứng viên sau filter cứng**, không đếm trên top-k vector (đồng ý với architecture).

Reranker (cross-encoder hoặc LLM) chỉ thêm khi đánh giá cho thấy lợi ích trên tập held-out, đúng như roadmap.

### 5.4 Evidence và citation

- LLM **chỉ được chọn mã từ danh sách ứng viên đã đưa vào**, theo ID. Output bị ràng buộc bằng schema và hậu kiểm: mã nào không có trong tập thì bị loại, không "sửa".
- Mỗi lý do trích `chunk_id` cùng đoạn trích. Hậu kiểm bằng so khớp chuỗi rằng đoạn trích có trong chunk. Không khớp thì bỏ lý do đó và hạ trạng thái câu trả lời thành "thiếu căn cứ".
- Tách hiển thị: **"Danh mục ghi"** (nguyên văn) và **"Diễn giải"** (AI).
- Không trình bày lời giải như kết luận pháp lý. Gợi ý thủ tục xác định trước mã số chính thức khi người dùng cần chắc chắn. *Thủ tục và tên cơ quan sau tái cơ cấu năm 2025 cần được xác minh trước khi đưa vào UI.*

### 5.5 Câu hỏi làm rõ — sinh và đánh giá

- Sinh từ cấu trúc: tìm tổ tiên chung thấp nhất của các ứng viên hàng đầu, lấy các nhánh con khác nhau, đặt câu hỏi theo tiêu chí phân biệt (vật liệu, cơ chế, công dụng, ngưỡng). LLM chỉ diễn đạt lại cho dễ hiểu.
- Chỉ số:
  - **split rate**: tỷ lệ câu hỏi mà mọi câu trả lời khả dĩ đều làm thu hẹp tập ứng viên;
  - **số lượt đến khi hội tụ**;
  - **tỷ lệ câu hỏi thừa**: hỏi khi tập đã hội tụ;
  - **tỷ lệ hội tụ sai**: hội tụ về mã khác gold.
- Có thể đo **offline bằng người dùng mô phỏng**: một bộ trả lời theo hồ sơ gold đi kèm từng case. Như vậy đánh giá được câu hỏi trước khi có người dùng thật.

### 5.6 Provider-neutral, chi phí, fallback

- Định nghĩa interface nội bộ ở mức nhỏ nhất: `complete(messages, json_schema)` và `embed(texts)`. Adapter đầu tiên dùng API tương thích OpenAI, vì phủ được nhiều nhà cung cấp và cả máy chủ local như Ollama/vLLM (giả định, cần kiểm tra lúc triển khai). Không dựa vào tính năng riêng của nhà cung cấp, ví dụ tool-calling song song.
- Embedding: lưu `model`, `dims` và `version` theo index (đã có). Đổi model thì index lại toàn bộ kho mã. Kho nhỏ nên việc này rẻ.
- Chi phí mỗi lượt bị chặn bởi thiết kế "hồ sơ + vài tin gần nhất + top-N ứng viên + top-M chunk". Đặt trần token theo lượt và theo người dùng. Chưa ước tính số tiền vì nhà cung cấp chưa chốt. Đo cost/lượt ở pilot (đã có trong roadmap).
- **Fallback có thứ bậc:**
  1. LLM lỗi: tra cứu, cây, alias và câu hỏi sinh từ cây vẫn hoạt động; chat hiển thị "chế độ không AI".
  2. Embedding lỗi: chỉ dùng lexical.
  3. DB đọc được nhưng không ghi được: chỉ đọc, báo rõ là lời khai chưa được lưu.
- Văn bản truy xuất và lời khai đều là dữ liệu không đáng tin, không mang chỉ thị (đồng ý với architecture). LLM ở MVP không được cấp công cụ ghi; fact mới chỉ là *đề xuất* có schema, và backend quyết định ghi.

---

## 6. Thiếu sót theo mức ưu tiên

**P0 — chặn thiết kế hoặc chặn MVP**

1. Chưa có nguồn chính thức cho cây đầy đủ (4/6 số, dòng tiêu đề) và chú giải phần/chương/GIR.
2. Chưa quyết định chấp nhận CC BY-SA cho dữ liệu derived hay xây lại từ văn bản gốc. Quyết định này ảnh hưởng mọi thứ publish.
3. Chưa có **bộ đánh giá gold** nào. Mọi ngưỡng trong requirements phụ thuộc vào nó. Nguồn khả dĩ: thông báo kết quả phân loại công khai (cần xác minh quyền), cộng các case chuyên viên viết.
4. Chưa đối soát snapshot Drive với upstream (giả thuyết chương 98).

**P1 — cần trước khi chat**

5. Chưa mô hình hóa ba trục phiên bản và bảng tương quan mã (HS 2028 có hiệu lực 2028-01-01).
6. Chưa phân loại ràng buộc thành `user_filter`/`user_fact`/`inferred`; filter đang chưa gắn theo sản phẩm.
7. Chưa có khái niệm bộ hàng / biến thể (GIR 3b).
8. Chưa có quy tắc "không hỏi khi không tách ứng viên".
9. PRIV-01 ngầm đòi hỏi hệ thống tài khoản. Chưa quyết định MVP có tài khoản hay phiên ẩn danh lưu cục bộ.

**P2 — quan trọng nhưng có thể sau**

10. Chính sách retention và xóa đã có ý, nhưng thiếu con số cụ thể.
11. Tuyên bố trách nhiệm pháp lý trong UI (miễn trừ, giới hạn sử dụng).
12. Khả năng truy cập (a11y) và mobile: roadmap có nhắc, nhưng chưa có tiêu chí.
13. Hướng dẫn cập nhật dữ liệu định kỳ (ai chạy, bao lâu một lần, ai duyệt diff).

---

## 7. MVP đề xuất

**MVP-1: Tra cứu có căn cứ, không cần AI**

- Import snapshot có kiểm toán; cây đầy đủ (nếu P0-1 xong) hoặc **hiển thị rõ** "mô tả cấp cha chưa đầy đủ".
- Tra mã/tiền tố; tìm Việt/Anh không dấu; alias đã duyệt.
- Kết quả nhóm theo nhánh; trang chi tiết có mô tả nhánh, chú giải liên quan, chuỗi thuế thô và nguồn.
- So sánh 2–4 mã.
- "Thu hẹp có hướng dẫn": câu hỏi sinh từ cây, hồ sơ sản phẩm lưu cục bộ hoặc theo phiên.
- Không có filter thuế, không có facet AI chưa duyệt.

**MVP-2: Chat RAG**, bật bằng cấu hình

- Hồ sơ dùng chung, fact/event, nhiều sản phẩm và biến thể.
- Retrieval lai + mở rộng cây + kiểm toán recall; citation hậu kiểm; fallback về MVP-1.

Lý do tách: MVP-1 kiểm chứng được giá trị dữ liệu và UX mà không phụ thuộc nhà cung cấp AI, và trở thành baseline để đo xem chat có thêm giá trị hay không.

---

## 8. Tiêu chí đánh giá và kế hoạch xác minh

| Hạng mục | Chỉ số | Cách đo | Cổng |
|---|---|---|---|
| Dữ liệu | Đối soát số dòng, mã unique, node cha hợp lệ, % mô tả nhánh đầy đủ | Quality report của pipeline, so với snapshot trước | Không có lỗi khóa; mọi khác biệt được giải thích |
| Tìm kiếm | Recall@10 ở cấp 4 số và 8 số, tách theo loại truy vấn (mã, tên phổ thông, không dấu, typo, alias, "loại khác"); p95 latency | Bộ truy vấn baseline có held-out | Ngưỡng chốt sau baseline |
| Filter | Số mã bị mất do thiếu nhãn | So tập kết quả có/không có facet trên mẫu | Bằng 0 với chế độ "hoặc chưa rõ" |
| Câu hỏi làm rõ | split rate, số lượt đến hội tụ, tỷ lệ câu hỏi thừa, tỷ lệ hội tụ sai | Người dùng mô phỏng trên case gold | So với baseline MVP-1 |
| Lời giải | Mã ngoài snapshot; citation không khớp | Hậu kiểm tự động | **0**, cổng cứng |
| Lời giải | Tính đúng của "vì sao", từ chối đúng khi thiếu căn cứ | Chuyên gia chấm mù trên mẫu | Chốt sau pilot |
| Hội thoại | Kịch bản con dấu (bản sửa), sửa lời khai, bộ hàng, biến thể, chuyển sản phẩm, restart, hai tab, ownership | Test tích hợp tất định với LLM giả lập | Pass toàn bộ |
| Vận hành | Restore backup; AI lỗi; DB chỉ đọc | Diễn tập | Pass |
| Chi phí | Token/lượt, cost/lượt | Log pilot | Báo cáo, chưa đặt trần |

Thứ tự xác minh đề xuất:

1. Đối soát snapshot Drive với upstream (một buổi).
2. Lấy và kiểm tra văn bản danh mục chính thức có chú giải.
3. Dựng 100–200 case gold gồm truy vấn và mã đúng, kèm hồ sơ trả lời cho người dùng mô phỏng.
4. Đo baseline lexical P1.
5. Làm prototype giới hạn thời gian với Meilisearch trên cùng tập, chỉ nếu baseline yếu ở typo/không dấu.

---

## 9. Câu hỏi cho chủ dự án

1. Chấp nhận dữ liệu derived theo CC BY-SA 4.0 (dùng upstream ozvietnam), hay muốn tự xây từ văn bản gốc để chủ động license?
2. Đối tượng chính trong 3 tháng đầu là người mới hay chuyên viên? Câu trả lời quyết định MVP-1 thiên về dẫn dắt hay về mật độ thông tin.
3. MVP có cần tài khoản người dùng không, hay chấp nhận phiên ẩn danh lưu cục bộ hoặc theo link bí mật?
4. Ai là người duyệt nhãn/alias và case gold? Họ có bao nhiêu giờ mỗi tuần?
5. Có quyền dùng thông báo phân loại công khai, hay bất kỳ tài liệu chú giải chi tiết nào, làm bằng chứng và tập đánh giá không?
6. Ràng buộc về nhà cung cấp AI và nơi lưu dữ liệu: có bắt buộc chạy được với model local không?
7. Có cần hỗ trợ đồng thời HS 2022 và HS 2028 trong năm 2027 (giai đoạn chuyển tiếp) không?
8. Đồng ý bỏ filter thuế khỏi MVP và chỉ hiển thị chuỗi thô?
