# Review thiết kế VAT — ý kiến độc lập của Claude Code

> Coordinator: đây là đề xuất độc lập, có giả định chưa kiểm chứng. Đọc cùng [các điểm tiếp thu và điều chỉnh](review-status.md#vat-tiếp-thu-có-điều-chỉnh), đặc biệt về cảnh báo thời hạn raw, filter, cache và xung đột runtime.

Ngày: 2026-11-03. Đối tượng review: [`docs/vat-design.md`](../vat-design.md) và các dòng bổ sung trong `requirements.md`, `architecture.md`, `data-strategy.md`, `data-sources.md`, `README.md` ở commit `c4b55bc`.

Phạm vi: chỉ review thiết kế trên tài liệu. Chưa có implementation nào để review. Tôi không xác nhận toàn bộ pháp luật VAT và không suy ra mức thuế hay ý nghĩa ký hiệu từ chuỗi raw. Mọi khẳng định pháp lý dưới đây đều ghi rõ là đã kiểm tra hay là giả định.

---

## 0. Kết luận ngắn

Hướng thiết kế **đúng về nguyên tắc** và tốt hơn hẳn mô hình "một cột % cho mỗi mã HS". Các điểm đã làm tốt:

- Tách raw, quy tắc và kết quả đánh giá.
- Tách trạng thái pháp lý với trạng thái đánh giá.
- Dùng logic ba giá trị và không fallback về 10%.
- Không để LLM quyết định mức thuế.
- Chưa bật filter VAT áp dụng.

Năm điểm cần sửa hoặc làm rõ trước khi viết code:

1. **(P0) Hạn hiệu lực sát ngày.** Chính sách giảm VAT theo NQ 204/2025/QH15 hết hiệu lực ngày **31/12/2026**, tức còn khoảng 2 tháng tính từ hôm nay. Chuỗi raw dạng `8/10` sẽ gây hiểu sai ngay sau ngày đó nếu UI không gắn ngày. Cần quy tắc hiển thị raw theo thời điểm, và không nên đầu tư biên soạn quy tắc giảm 8% như một tính năng.
2. **(P0) Mô hình "xung đột" sẽ bị lạm dụng.** Nếu giảm thuế, ngoại lệ và quy tắc cơ bản đều là các "rule" ngang hàng thì gần như mọi mặt hàng có giảm thuế sẽ rơi vào trạng thái *xung đột*. Cần mô hình **lớp**: trạng thái → mức cơ bản → điều chỉnh (giảm/đặc thù). Quan hệ `exception_of`/`modifies` phải có căn cứ và được duyệt.
3. **(P0) Định nghĩa "đã xác định" phải tính toán được.** Thiết kế viết "không còn điều kiện chưa biết có thể thay đổi kết quả", nhưng chưa nói cách tính. Đề xuất: tập kết quả khả dĩ (mục 4).
4. **(P1) Hồ sơ đầu vào thiếu "loại hình/chế độ hải quan" làm trường bắt buộc** ở khâu nhập khẩu. Nhiều trường hợp không chịu thuế ở khâu này phụ thuộc chế độ (tạm nhập tái xuất, viện trợ, quá cảnh…) chứ không phụ thuộc hàng (giả định, cần kiểm chứng điều khoản).
5. **(P1) Phương án gọn cho OSS.** Quy tắc nên là file dữ liệu có review trong Git, được biên dịch thành *rule release* bất biến. Không nên dùng bảng `vat_rules`/`vat_rule_versions` sửa trực tiếp trong DB. Lịch sử, diff, người duyệt và CI test khi đó có sẵn mà không phải xây.

Ngoài ra còn một rủi ro sản phẩm: một bộ quy tắc VAT là **gánh nặng bảo trì pháp lý liên tục**. Nếu chưa có người nghiệp vụ cam kết duyệt, chỉ nên làm tới mức "raw có ngày, danh mục nguồn và checklist câu hỏi", không bật xác định VAT (mục 9).

---

## 1. Bằng chứng và giả định

| Khẳng định | Trạng thái |
|---|---|
| NQ 204/2025/QH15 có hiệu lực từ 01/07/2025 đến hết 31/12/2026. Loại trừ được nêu **theo nhóm ngành/hàng** (viễn thông, tài chính, kim loại, khai khoáng trừ than, hàng chịu TTĐB trừ xăng…) chứ không theo mã HS. Chính phủ được giao quy định chi tiết | Tôi đã đọc trang toàn văn ngày 2026-11-03: https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-quyet-so-204-2025-qh15-ve-giam-thue-gia-tri-gia-tang-119250628082120511.htm |
| NĐ 174/2025/NĐ-CP là văn bản quy định chi tiết, có phụ lục danh mục hàng không được giảm kèm mã HS | **Giả định**, chưa mở văn bản. Coordinator cũng ghi là chưa xác minh phụ lục |
| Thuế suất 0% chủ yếu áp cho hàng/dịch vụ xuất khẩu, gần như không xuất hiện ở khâu nhập khẩu | **Giả định từ hiểu biết chung**, cần kiểm chứng trên luật VAT hiện hành (114/VBHN-VPQH) |
| Thời điểm áp thuế suất VAT hàng nhập khẩu gắn với ngày đăng ký tờ khai hải quan | **Giả định từ hiểu biết chung**, cần dẫn điều khoản cụ thể |
| Các nguồn khác trong bảng "Danh mục nguồn" của `vat-design.md` | Tôi không kiểm tra lại; giữ nguyên mức kiểm chứng coordinator đã ghi |

---

## 2. Tách trạng thái pháp lý và trạng thái đánh giá — đồng ý, cần chặt hơn

Thiết kế đã tách hai trục. Đề xuất cụ thể hóa thành kiểu dữ liệu đóng để code không có đường lách:

```text
LegalOutcome   = Taxable{ base_rate, adjustments[], applied_rate? }
               | NotSubjectToVAT{ ground_ref }
               | NoDeclarationRequired{ ground_ref }
EvaluationStatus = Determined | NeedsFacts{ facts[] } | NoGrounds
                 | Conflict{ rules[] } | OutOfScope{ reason }
```

- `rate = 0` **chỉ** tồn tại bên trong `Taxable`. Hai trạng thái còn lại không có trường rate, nên không thể vô tình hiển thị "0%".
- `applied_rate` là optional: có thể biết `base_rate` mà chưa biết có được giảm (thiết kế đã nêu, nhưng nên ép bằng kiểu).
- Kết quả trả về là **(EvaluationStatus, tập LegalOutcome khả dĩ)**, không phải một LegalOutcome đơn. Khi `Determined` thì tập có đúng một phần tử.
- Nếu khâu nhập khẩu thực tế không có trường hợp 0% (giả định ở mục 1), test case "0%" phải đặt ở khâu xuất khẩu, hoặc đánh dấu là ngoài phạm vi phiên bản đầu. Không nên dựng fixture 0% cho nhập khẩu khi chưa có căn cứ.

---

## 3. Raw, rule và evaluation

Đồng ý với ba tầng. Bổ sung:

- **Raw phải mang "ngày hiệu lực ngầm định" của nguồn, không chỉ ngày tải.** Ví dụ dữ liệu ozvietnam có `versions/tax-v2026-01-01-base.json` (thấy trên trang repo ngày 2026-11-03, chưa mở). Nếu snapshot không nêu được ngày hiệu lực thì UI ghi "chưa rõ thời điểm áp dụng của nguồn".
- **Cảnh báo lỗi thời theo ngày (P0).** Khi ngày nghiệp vụ người dùng chọn (hoặc ngày hiện tại) vượt khỏi một mốc đã biết, ví dụ sau 31/12/2026 với dữ liệu có "8", UI phải ghi: "Giá trị nguồn có thể phản ánh chính sách đã hết hạn". Việc này **không cần giải mã raw**: chỉ cần registry nguồn biết các mốc hiệu lực.
- **Thống kê pattern raw là việc nên làm, nhưng chỉ ở mức cú pháp** (token, ký tự, tần suất), dùng để lập kế hoạch biên soạn. Kết quả thống kê không được thành trường ngữ nghĩa nào.
- Evaluation phải lưu `rule_release_id` (hoặc hash), `hs_dataset_version`, ngày nghiệp vụ và **tập fact dùng kèm revision**, để tái lập được chính xác kết quả cũ.

---

## 4. Logic ba giá trị — cần định nghĩa tính toán

Thiết kế nêu đúng/sai/chưa biết nhưng chưa nêu ngữ nghĩa. Đề xuất:

- Dùng **logic Kleene**:
  - `AND`: có một vế sai thì sai; tất cả đúng thì đúng; còn lại chưa biết.
  - `OR`: có một vế đúng thì đúng; tất cả sai thì sai; còn lại chưa biết.
  - `NOT unknown = unknown`.
- Mỗi lớp (trạng thái, mức cơ bản, điều chỉnh) tính **tập kết quả khả dĩ**. Rule có điều kiện đúng thì góp kết quả chắc chắn; rule có điều kiện chưa biết thì góp kết quả khả dĩ; rule có điều kiện sai thì bị loại và ghi vào trace.
- `Determined` khi và chỉ khi tập kết quả khả dĩ cuối cùng có đúng một phần tử *và* phần tử đó có căn cứ.
- **Câu hỏi VAT cần hỏi** là fact chưa biết mà khi đổi giá trị thì làm tập kết quả co lại. Đây là cùng nguyên tắc "chỉ hỏi khi tách ứng viên" đã áp cho HS. Có thể tính bằng cách thử gán đúng/sai cho từng fact chưa biết; quy mô rule nhỏ nên rẻ.
- "Không có trong bảng loại trừ ⇒ được giảm" chỉ hợp lệ nếu bảng đó được đánh dấu **đầy đủ (closed list) theo căn cứ**, kèm phạm vi phiên bản HS. Mặc định bảng là *open*, và khi không khớp thì kết quả là chưa biết. Thiết kế đã có ý này; nên thành thuộc tính `list_closure: closed|open` có căn cứ.

---

## 5. Hiệu lực và ngày nghiệp vụ

- Định nghĩa **loại mốc thời gian theo khâu** (`tax_point_type`), ví dụ với nhập khẩu là ngày đăng ký tờ khai (giả định, cần dẫn điều khoản). Không cho chọn "ngày" chung chung.
- Ngày dự kiến được phép dùng, nhưng kết quả được gắn nhãn `provisional`. **Nếu khoảng ngày dự kiến cắt qua một mốc thay đổi quy tắc** (ví dụ khai cuối tháng 12/2026 hoặc đầu tháng 01/2027), trả kết quả cho từng đoạn thay vì chọn một.
- Thời gian hai chiều: thiết kế đã tách "ngày tiếp nhận nguồn" với "ngày pháp lý áp dụng". Với OSS không cần DB bitemporal. **Rule release bất biến** (mục 8) đã giải quyết câu hỏi "khi đó dự án biết gì", còn `valid_from/valid_to` trong rule giải quyết câu hỏi "luật áp dụng ngày nào".
- Văn bản ban hành *sau* với hiệu lực *hồi tố* hoặc kéo dài (ví dụ gia hạn chính sách giảm): xử lý bằng release mới, sau đó gắn cờ các evaluation cũ có khoảng ngày bị ảnh hưởng là "cần đánh giá lại". Không sửa evaluation cũ.

---

## 6. Xung đột và ngoại lệ — điểm thiết kế cần sửa (P0)

`vat-design.md` đúng khi cấm `priority` do AI tự đặt. Nhưng chỉ có hai lựa chọn "thứ tự có căn cứ" hoặc "xung đột" thì sẽ sinh xung đột giả hàng loạt. Đề xuất:

1. **Phân lớp theo vai trò pháp lý thay vì xếp hạng rule:**
   - L1, trạng thái: không chịu thuế / không kê khai / chịu thuế. L1 đúng thì dừng.
   - L2, mức cơ bản theo luật.
   - L3, điều chỉnh có thời hạn: giảm thuế, chính sách đặc thù.

   Quy tắc giảm 2 điểm % không "xung đột" với mức 10%. Nó *biến đổi* mức cơ bản trong phạm vi và thời hạn của nó.
2. **Ngoại lệ là cạnh tường minh** `rule B exception_of rule A`, có trích dẫn câu "trừ…"/"không áp dụng đối với…" trong văn bản và được duyệt. Không suy ngoại lệ từ thứ tự ban hành.
3. **Xung đột thật** là khi hai rule cùng lớp, đều khớp, cho kết quả khác nhau, và không có cạnh ngoại lệ hay quan hệ thay thế giữa chúng. Đây là **lỗi biên soạn** và phải bị chặn ở CI trước khi publish (dùng case kiểm tra), không chỉ là trạng thái lúc chạy. Trạng thái `Conflict` ở runtime chỉ còn cho trường hợp fact của người dùng mâu thuẫn hoặc quy tắc chưa phủ.
4. Quy tắc phân xử như luật chuyên ngành ưu tiên luật chung, văn bản sau ưu tiên văn bản trước, hay hiệu lực pháp lý cao hơn: **chỉ** được người duyệt dùng khi tạo cạnh, có ghi lý do. Engine không tự áp.

---

## 7. Phạm vi hàng và HS trong rule

NQ 204 mô tả loại trừ theo **nhóm ngành/hàng bằng lời** (đã kiểm tra). Ánh xạ sang HS, nếu có, nằm ở văn bản chi tiết (giả định ở mục 1). Hệ quả cho mô hình:

- Mỗi phạm vi hàng là `(hs_selector, description_qualifier?, required_facts[], hs_version)`. Trong đó `hs_selector` là mã/tiền tố theo đúng phiên bản danh mục **mà văn bản dùng**.
- Mã khớp selector nhưng có qualifier ("chỉ áp dụng với…") thì điều kiện là **chưa biết** cho tới khi có fact. Không coi là khớp.
- Phạm vi mô tả bằng lời mà không có HS (ví dụ "sản phẩm kim loại") **không được** ánh xạ tự động sang chương 72–83 hay chương nào khác. Phải có ánh xạ được duyệt, nếu không thì luôn là fact cần hỏi hoặc trạng thái `NoGrounds`.
- Khi chuyển phiên bản danh mục (HS 2028 có hiệu lực 01/01/2028), selector của rule cũ phải đi qua bảng tương quan và được duyệt lại. Không áp tiền tố cũ lên mã mới.

---

## 8. Phương án gọn cho OSS

**Đề xuất: "rules-as-data trong Git".**

```text
rules/vat/
  sources.yaml            # registry văn bản: số hiệu, URL, hash, ngày ký/hiệu lực, quan hệ sửa đổi
  vn-import/
    L1-status/*.yaml
    L2-base/*.yaml
    L3-adjust/*.yaml      # mỗi rule: id, scope, conditions (AND/OR/NOT trên fact có kiểu),
                          #   valid_from/to, outcome, citations[{source_id, article, quote}], exception_of[]
  cases/*.yaml            # ca kiểm tra: facts + date → status + outcome set kỳ vọng
```

- CI kiểm tra: schema; mọi citation có `source_id` hợp lệ và `quote` khớp văn bản đã hash (khi có file nguồn); không còn xung đột cùng lớp; mọi case pass; cảnh báo các rule sắp hết hạn trong 60 ngày.
- Publish = biên dịch thành **rule release** bất biến (JSON + hash), sau đó nạp vào PostgreSQL chỉ để đọc. Các bảng `vat_rules`/`vat_rule_versions` trong `architecture.md` khi đó có thể gọn lại thành `vat_rule_releases` cộng các bảng được biên dịch ra.
- Audit, lịch sử, diff và người duyệt lấy từ PR/commit trong Git. **Điều kiện:** phải bật quy tắc bảo vệ nhánh, yêu cầu ít nhất một người duyệt khác tác giả cho thư mục `rules/`. Nếu không có người duyệt thứ hai thì rule chỉ ở trạng thái `draft` và không được bật.
- Engine là một hàm thuần `evaluate(release, facts, stage, date) → (status, outcomes, trace)`, khoảng vài trăm dòng và không có DSL tùy ý. Fact có kiểu (bool/enum/date/number) lấy từ một **từ điển fact** có phiên bản, để LLM chỉ có thể đề xuất giá trị cho fact đã định nghĩa.
- Đánh đổi: người duyệt nghiệp vụ phải làm việc qua PR/YAML. Có thể bù bằng một trang xem rule chỉ đọc, sinh từ release. Giao diện biên tập rule để sau.

Tại sao không dùng rule engine có sẵn (DMN, Drools, json-logic…): thêm dependency, phần lớn không hỗ trợ logic ba giá trị hay tập kết quả khả dĩ một cách tự nhiên, và đa số chi phí vẫn nằm ở biên soạn hay duyệt chứ không ở thực thi. Điều kiện để đổi: số rule vượt mức mà YAML còn duyệt được bằng tay (chưa có số; đo khi gặp), hoặc người nghiệp vụ không thể làm việc qua PR.

---

## 9. Vai trò RAG so với module quy tắc

Đồng ý: kết quả chỉ do module quy tắc trả về. Bổ sung:

- **Giá trị lớn nhất của RAG/LLM trong VAT nằm ở khâu biên soạn offline**, không ở runtime. Nó giúp tìm điều khoản, soạn rule nháp kèm citation và đề xuất case. Bản nháp luôn phải qua PR và người duyệt.
- Ở runtime, LLM chỉ được (a) trích fact theo từ điển fact, (b) diễn đạt câu hỏi do engine chọn, (c) diễn giải trace thành lời. Câu trả lời VAT trong chat phải lấy số và trạng thái **từ evaluation đã lưu**, không cho model viết số tự do. Hậu kiểm: mọi tỷ lệ % xuất hiện trong lời chat phải khớp với outcome của evaluation; không khớp thì chặn.
- Khi chưa có rule cho mặt hàng: hiển thị raw có ngày, các đoạn văn bản liên quan dưới nhãn "tài liệu tham khảo, chưa đánh giá", và trạng thái `NoGrounds`. Không nâng kết quả này thành `Determined`.

---

## 10. Filter VAT theo ngữ cảnh

Đồng ý chưa mở filter. Khi mở, đề xuất:

- Filter chỉ có nghĩa trong một **kịch bản** do người dùng chọn rõ: chip "Nhập khẩu · ngày 2026-11-03 · không khai chế độ đặc biệt". Không có kịch bản thì không có filter VAT.
- Với mỗi mã HS, tính trước **tập kết quả khả dĩ** dưới kịch bản mặc định (các fact về hàng để chưa biết). Có khoảng 11–12k mã và vài chục rule; vì kết quả chỉ đổi tại các mốc `valid_from/to`, có thể cache theo `(release, stage, khoảng ngày giữa hai mốc)`.
- Bucket hiển thị gồm "Chắc chắn X%", "Có thể X% (cần thêm thông tin)", "Chưa có quy tắc". Chọn "X%" mặc định gồm cả hai nhóm đầu và luôn hiện số mã "chưa có quy tắc". Đây là cùng cơ chế "X hoặc chưa rõ" đã áp cho facet HS.
- Không sắp xếp theo VAT.

---

## 11. Audit nguồn và lịch sử

- Registry nguồn (`sources.yaml`) là nơi duy nhất ghi URL, hash và quan hệ sửa đổi/bãi bỏ/hợp nhất. Mỗi văn bản hợp nhất (VBHN) cần trỏ về các văn bản gốc mà nó hợp nhất. Thiết kế đã nêu điều này; nên ép bằng schema.
- Khác biệt giữa bài giới thiệu trên cổng thông tin và văn bản ký: chỉ văn bản ký (hoặc VBHN chính thức) được làm `citation` của rule. Bài giới thiệu chỉ là `context`.
- Trace của evaluation chứa fact của người dùng, nên theo cùng chính sách retention và xóa của phiên. Trace không được đưa vào bộ case công khai khi chưa có đồng ý.
- Việc gắn cờ "cần đánh giá lại" khi có release mới phải hiển thị cho chủ phiên. Không âm thầm thay kết quả (thiết kế đã nêu).

---

## 12. Ưu tiên

**P0**

1. Hiển thị raw VAT kèm ngày nguồn và cảnh báo lỗi thời theo mốc (31/12/2026 là mốc gần nhất). Việc này cần ngay cả khi chỉ hiển thị raw ở MVP.
2. Đổi mô hình xung đột sang phân lớp L1/L2/L3 cộng cạnh `exception_of` có căn cứ; xung đột cùng lớp là lỗi CI.
3. Định nghĩa ngữ nghĩa Kleene, tập kết quả khả dĩ và tiêu chí `Determined`.
4. Quyết định ai duyệt rule VAT. Nếu không có ai, giữ VAT ở mức raw, registry nguồn và checklist; không bật xác định.

**P1**

5. Thêm `customs_regime`/loại hình vào hồ sơ nhập khẩu; thêm `tax_point_type` theo khâu.
6. Rules-as-data trong Git, rule release bất biến, từ điển fact có kiểu.
7. Mô hình scope hàng `(hs_selector, qualifier, required_facts, hs_version)` và `list_closure`.
8. Hậu kiểm số % trong lời chat.
9. Không đầu tư rule giảm 8% làm tính năng. Dùng nó làm **case kiểm thử thời gian** (trước, trong và sau 31/12/2026, và cả trường hợp gia hạn giả định).

**P2**

10. Trang xem rule chỉ đọc; cảnh báo rule sắp hết hạn; báo cáo coverage theo chương.
11. Tính tiền thuế, khấu trừ và hoàn thuế giữ ngoài phạm vi (đồng ý với thiết kế).

---

## 13. Kế hoạch xác minh

1. Đọc văn bản ký của luật VAT hiện hành (VBHN) để xác nhận: danh sách không chịu thuế áp ở khâu nhập khẩu, phạm vi 0%, và thời điểm xác định thuế suất với hàng nhập khẩu. Ghi kết quả vào `sources.yaml` với điều/khoản cụ thể.
2. Đọc NĐ 174/2025 và kiểm tra phụ lục có mã HS không, theo phiên bản danh mục nào, và là danh sách đóng hay mở.
3. Theo dõi xem có văn bản gia hạn chính sách giảm VAT sau 31/12/2026 không. Bất kể kết quả, case thời gian phải pass.
4. Viết 15–25 case giấy (chưa cần code) bao gồm: cùng mã khác khâu/ngày; ngày dự kiến cắt qua mốc; fact chưa biết; scope có qualifier; bảng mở và bảng đóng; ngoại lệ có cạnh; xung đột thật (phải bị CI chặn).
5. Người nghiệp vụ chạy tay engine nháp trên các case trên trước khi bật bất kỳ kết quả `Determined` nào trong UI.

## 14. Câu hỏi cho chủ dự án

1. Có người nghiệp vụ thuế cam kết duyệt rule VAT định kỳ không? Nếu không, có đồng ý dừng ở mức raw, nguồn và checklist?
2. Phạm vi phiên bản đầu chỉ là khâu nhập khẩu thương mại thông thường, hay phải gồm các chế độ đặc biệt?
3. Có chấp nhận quy trình duyệt rule qua PR trong Git (YAML) không?
4. Khi một chính sách hết hạn hoặc được gia hạn, ai chịu trách nhiệm phát hành release mới, trong bao lâu, và UI nên nói gì trong khoảng trống đó?
