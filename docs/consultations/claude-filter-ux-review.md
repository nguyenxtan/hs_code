# Tham vấn UX: bộ lọc và tái cấu trúc toàn bộ trải nghiệm tra cứu — Claude (chỉ tư vấn, không sửa code)

- Commit được xem: `5c9ba1b` (main).
- Ngày: 2026-11-03.
- Phạm vi: chỉ là đánh giá và đề xuất. Không có thay đổi nào với code, config, test, dataset hay git.
- Báo cáo gồm hai phần:
  - **Phần I (mục 0–5):** bộ lọc. Đây là brief ban đầu.
  - **Phần II (mục 6–11):** toàn bộ giao diện, theo yêu cầu "refactor lại UI UX" (`.cache/claude-ui-refactor-expanded-brief.md`). Phần II dựa trên Phần I; khi hai phần có vẻ khác nhau, Phần II thống nhất lại.

## 0. Bằng chứng đã xem và giới hạn

| Nguồn | Đã xem? | Ghi chú |
|---|---|---|
| `.cache/filters-desktop.png` (1280×900, truy vấn "con dấu", đã chọn Chương 96, panel đang mở) | Có, đã xem ảnh | |
| `.cache/filters-mobile.png` (390 px, cùng trạng thái) | Có, đã xem ảnh | |
| `.cache/filters-mobile-priority.png` (390 px, đã chọn ưu tiên "Văn phòng & in ấn", đang tải) | Có, đã xem ảnh | |
| `src/components/search-filters.tsx`, `src/components/workspace.tsx` (dòng 500–720), `src/app/globals.css` (1884–2113, `.quick-search`), `src/lib/categories.ts`, `src/app/api/search/route.ts`, `src/lib/search.ts` (phần facets), `tests/e2e/filters.spec.ts` | Có, đã đọc | |
| API trên máy (`127.0.0.1:3100/api/search`) | Có, chỉ gọi GET để đọc | Đã kiểm chứng giả định về dữ liệu ở mục 1.2 |
| Điều khiển trình duyệt trực tiếp (click, focus, bàn phím) | **Không** | Mọi nhận định về bàn phím và focus đều dựa trên việc đọc code, không phải thao tác thật |

Ký hiệu dùng trong báo cáo: **[QS]** là quan sát trực tiếp từ ảnh hoặc code. **[SL]** là suy luận của tôi.

---

## 1. Vì sao bộ lọc hiện tại vẫn "chưa ưng"

Các vấn đề được xếp theo mức ảnh hưởng tới việc người dùng tìm ra mã hàng.

### 1.1 Bộ lọc giống một form cấu hình, không bám theo kết quả (ảnh hưởng lớn nhất)

- **[QS]** Ảnh desktop: thứ tự từ trên xuống là ô tìm kiếm, hàng "Thử tìm", hàng "Bộ lọc 1 · Chương 96 · Xóa tất cả", rồi một card "Phạm vi tra cứu" cao khoảng 220 px. Card này có 2 ô select, 1 câu gợi ý, 1 dòng "Tự cập nhật khi chọn" và 1 mục "Ưu tiên kết quả". Kết quả đầu tiên bắt đầu ở khoảng y≈750 trên khung cao 900 px.
- **[QS]** Ảnh `filters-mobile-priority.png`: kết quả đầu tiên nằm ở khoảng y≈1050. Như vậy nó nằm dưới màn hình đầu tiên (844 px) của máy 390×844.
- **[QS]** Với truy vấn "con dấu", ô "Chương" chỉ có một lựa chọn thực sự ("Chương 96 · 1 mã"). Một ô select chiếm cả một hàng mà chỉ có đúng một lựa chọn, nên gần như không giúp được gì.
- **[SL]** Người dùng phải mở panel, đọc nhãn, mở select rồi cuộn danh sách. Đó là cách làm của một form tìm kiếm nâng cao. Người tra mã chỉ muốn "thu hẹp vào nhóm đúng" bằng một cú chạm, ngay cạnh kết quả. Kết luận: vấn đề nằm ở mô hình tương tác. Bọc hai ô select trong một card đẹp hơn không giải quyết được điều đó.

### 1.2 "Bộ mã" buộc người dùng hiểu cấu trúc dữ liệu, và nó thực ra trùng với "Chương"

- **[QS]** Ô "Bộ mã" có ba lựa chọn: "Tất cả mã HS", "Danh mục chính · HS 2022", "Chương 98 bổ sung". Đây là khái niệm về nguồn dữ liệu, không phải khái niệm về hàng hóa.
- **[QS, đã kiểm chứng qua API]** Ba lựa chọn này hóa ra chỉ là cách nói khác của chương:
  - `chapter=98` trả về đúng 457 dòng, tất cả có `dataset=chapter98`.
  - `dataset=main` trả về 11.414 dòng thuộc 96 chương, không dòng nào thuộc chương 98.
  - Tức là "Chương 98 bổ sung" giống hệt "Chương 98", và "Danh mục chính" giống hệt "mọi chương trừ 98".
- **[QS]** Code phải xử lý riêng sự trùng lặp này: `changeDataset` xóa chương không tương thích, ô chương bị khóa khi chọn chapter98 (`search-filters.tsx:32-38, 127-133`). Cả 4 test e2e đều chủ yếu kiểm tra sự tương tác giữa hai ô này.
- **[SL]** Ô "Bộ mã" vừa làm tăng tải nhận thức, vừa sinh ra trạng thái xung đột phải xử lý thêm, mà không mở ra khả năng nào mới. Vì vậy nó không nên nằm trong luồng chính.

### 1.3 Chọn chương chỉ thấy số, không thấy nội dung

- **[QS]** Các lựa chọn có dạng `Chương 84 · 82 mã` (`search-filters.tsx:139`). Khi chưa nhập gì, danh sách có khoảng 97 dòng chỉ gồm số chương và số mã.
- **[SL]** Người không thuộc HS không biết "Chương 84" khác "Chương 85" ở chỗ nào. Hiện ta chưa có tên chương chính thức đã kiểm chứng. Tuy vậy, mỗi chương đã có sẵn mô tả các dòng hàng *thật* khớp với truy vấn. Có thể dùng chúng làm "ví dụ" mà không cần bịa ra tên phân loại (xem mục 2, điểm C3).

### 1.4 Hai thứ khác bản chất (lọc và xếp hạng) bị đặt trong cùng một panel

- **[QS]** "Ưu tiên kết quả" nằm trong card có tiêu đề "Phạm vi tra cứu", ngay dưới hai bộ lọc. Chip "Ưu tiên: …" xếp chung hàng với chip "Chương 96", và nút "Xóa tất cả" xóa cả hai.
- **[QS]** Huy hiệu đếm trên nút "Bộ lọc" là `1`, nhưng hàng chip hiển thị 2 mục (Chương 96 và Ưu tiên) (`filters-mobile-priority.png`, `filterCount` ở dòng 24). Về mặt kỹ thuật thì đúng, vì ưu tiên không phải bộ lọc. Nhưng người dùng nhìn vào sẽ thấy hai con số mâu thuẫn nhau.
- **[SL]** Vị trí đặt hiện tại khiến người dùng nghĩ ưu tiên cũng là một bộ lọc. Đây đúng là điều mà ràng buộc dự án muốn tránh.

### 1.5 Quá nhiều chữ phụ và "chip xám" phía trên kết quả

- **[QS]** Trước khi tới kết quả, người dùng gặp: hàng "Thử tìm" (vẫn hiện dù đã có truy vấn), hàng chip lọc, rồi trong panel thêm "Tự cập nhật khi chọn", "Chỉ hiện các chương có mã khớp…", "Đưa nhóm đã chọn lên trước…". Sau đó còn có "Từ khóa + ngữ nghĩa" và dải lưu ý "Kết quả là gợi ý mã…".
- **[QS]** Thứ bậc chữ bị đảo ngược. Chip chỉ cỡ 11 px và nút trigger 12 px (CSS 1925–1934, 1893–1904), trong khi select trên mobile là 16 px (CSS 2096–2098). Kết quả là hai ô select to nhất màn hình, còn trạng thái đang lọc thì nhỏ nhất.
- **[QS]** Trên mobile, chip "Ưu tiên: Văn phòng & in ấn" bị xuống dòng thứ hai cùng "Xóa tất cả" (ảnh priority).

### 1.6 Các chi tiết hành vi nhỏ nhưng làm giảm niềm tin

- **[QS]** Khi đang tải, ô Chương trông như bị vô hiệu (nền xám), dòng gợi ý đổi thành "Đang cập nhật số mã…", và số kết quả hiển thị "…" (ảnh priority). Mỗi lần chọn, giao diện nhấp nháy ở ba chỗ.
- **[QS]** Màn hình rỗng có nút "Bỏ bộ lọc" chỉ đặt lại chương và bộ mã (`workspace.tsx:640-645`). Nút này không cho biết các chương khác có bao nhiêu kết quả, dù `available_facets` đã được tính *bỏ qua chương* (`route.ts:30`) nên dữ liệu đã có sẵn.
- **[SL]** Nếu người dùng mở panel bằng bàn phím, sau đó chỉ có cách đóng bằng nút "Bộ lọc". Panel không xử lý Esc. Tôi chưa thử bằng trình duyệt.

---

## 2. Các mô hình tương tác thay thế

| | A. Giữ panel, tinh chỉnh | **B. Chip chương bám theo kết quả + menu "Xếp trước" (khuyến nghị)** | C. Cột facet bên trái (desktop), sheet đáy (mobile) |
|---|---|---|---|
| Mô tả | Bỏ "Bộ mã", giữ một select Chương, tách Ưu tiên ra ngoài panel | Không còn nút "Bộ lọc" hay panel. Dưới tiêu đề kết quả có một hàng chip "Chương" sinh từ facets, kèm nút "Thêm chương…". "Xếp trước" là một menu nhỏ ở bên phải tiêu đề kết quả | Cột trái cố định liệt kê toàn bộ chương có kết quả, kèm số đếm, kiểu trang thương mại điện tử |
| Ưu | Ít sửa nhất | Thu hẹp kết quả bằng 1 lần chạm. Chỉ hiện những chương thực sự có kết quả. Không có trạng thái xung đột. Lọc và xếp hạng tách nhau về vị trí, nhãn và kiểu điều khiển | Dễ duyệt kết quả lớn |
| Nhược | Vẫn là form, vẫn chỉ có số, tốn chỗ phía trên kết quả | Phải xử lý trường hợp có nhiều chương (tràn, cần nút "Thêm") | Nặng, chiếm cột mà màn hình đang để dành cho hộp hỗ trợ. Trên mobile vẫn phải mở sheet. Thừa so với nhu cầu, vì đa số truy vấn chỉ có 1–5 chương |
| Lượng việc | S | M | L |

**Khuyến nghị: B.** Lý do và cách trả lời các giả định đề bài đặt ra:

- **C1. "Bộ mã" có cần nằm ở luồng chính không?** Không. Hãy bỏ khỏi UI. Chương 98 trở thành một chip hoặc một mục trong danh sách chương, với nhãn `Chương 98 · bổ sung VN`. Lựa chọn "chỉ danh mục chính" (trừ chương 98) là nhu cầu hiếm, nên tôi bỏ qua. Nếu sau này cần, thêm một ô tick ở cuối popover "Thêm chương", không làm thành một ô select riêng. Backend vẫn giữ tham số `dataset`, nên không phải sửa API.
- **C2. Các điều khiển có cần nổi bật như nhau không?** Không.
  - Truy vấn là quan trọng nhất.
  - Kế đến là chip chương. Chúng chỉ xuất hiện khi đã có kết quả.
  - "Xếp trước" ít quan trọng nhất. Nó là một nút văn bản nhỏ cạnh số kết quả.
  - Hộp hỗ trợ là lối thoát khi không tìm ra, nên đặt ở màn hình rỗng và khi có quá nhiều chương.
- **C3. Làm sao để chương dễ hiểu mà không bịa ra cấu trúc phân loại?** Hiển thị **ví dụ lấy từ dữ liệu thật**, ghi rõ là "vd:". Ví dụ lấy từ mô tả (đã rút gọn) của dòng xếp hạng cao nhất trong chương đó cho truy vấn hiện tại. Mẫu: `Chương 84 · 82 mã — vd: Máy in phun…`. Cách này không khẳng định chương 84 *là* gì, chỉ cho biết *trong chương này có gì khớp*.
  - Cách làm tối thiểu: lấy ví dụ từ `result.items` đã tải về. Chương nào chưa có trong 30 kết quả đầu thì không hiện ví dụ.
  - Cách làm tốt hơn: thêm trường `sample` (mô tả và `heading` của dòng đứng đầu) vào từng facet trong `searchRecords`. Việc này chỉ thêm dữ liệu đã có vào kết quả trả về, không làm sạch dữ liệu.
- **C4. Tách bộ lọc khỏi "lăng kính" xếp hạng như thế nào?**
  - Khác vị trí: chip chương nằm *trên* danh sách, "Xếp trước" nằm *ở dòng tiêu đề kết quả*, cạnh nhãn chế độ tìm.
  - Khác cách gọi: chương là "Lọc", ưu tiên là "Xếp trước", có ghi chú "không ẩn kết quả nào".
  - Khác kiểu điều khiển: chip bật/tắt cho chương, menu radio cho ưu tiên.
  - Không đếm chung: huy hiệu và "Xóa lọc" không tính ưu tiên.

---

## 3. Bố cục đề xuất (phương án B)

### 3.1 Desktop (rộng ≥ 761 px)

```
[🔍 con dấu                                              ✕ ]
(ẩn hàng "Thử tìm" khi ô tìm kiếm có chữ)

Kết quả tra cứu  12                       Xếp trước: Mặc định ▾   Từ khóa + ngữ nghĩa
Lọc theo chương:  [Tất cả 12] [Ch. 96 · 5] [Ch. 84 · 4] [Ch. 39 · 2] [Ch. 98 · bổ sung VN · 1]  [+ 2 chương]
ⓘ Kết quả là gợi ý mã. Mở chi tiết để đối chiếu mô tả, thuế và nguồn.
┌ 9611.00.00 ...                                                   CHƯƠNG 96 ┐
```

- Hàng chip là một nhóm `role="group"` có nhãn "Lọc theo chương". Mỗi chip là một `button` có `aria-pressed`.
- Chip "Tất cả" luôn đứng đầu và đang được bật khi chưa chọn chương nào.
- Hiện tối đa **5 chương có nhiều kết quả nhất**. Các chương còn lại gom vào chip `+ N chương`, mở ra một popover.
- Hover hoặc focus vào chip sẽ hiện tooltip ví dụ "vd: Con dấu ngày, con dấu niêm phong…". Trên desktop có thể đưa ví dụ vào thẳng popover thay vì dùng tooltip.
- Chỉ chọn **một** chương mỗi lần, giống hành vi hiện tại, để API giữ nguyên. Chọn chip khác sẽ thay chương đang chọn. Bấm lại chip đang bật thì quay về "Tất cả".
- Popover "Thêm chương" chứa ô lọc nhanh ("Gõ số chương…") và danh sách theo dạng sau:
  ```
  Chương 85 · 31 mã
    vd: Máy in laser dùng cho…
  ```
  Danh sách sắp theo số kết quả, giảm dần. Khi chưa có truy vấn (chế độ duyệt), danh sách sắp theo số chương.
- Khi chưa có truy vấn và chưa ở chế độ duyệt, ẩn hẳn hàng chip. Màn hình mở đầu chỉ có ô tìm kiếm, đúng với hướng ưu tiên tìm kiếm.

### 3.2 Mobile (390 px)

```
[🔍 con dấu                    ✕]
Kết quả tra cứu 12          Xếp trước ▾
[Tất cả 12] [Ch. 96 · 5] [Ch. 84 · 4]
[+ 3 chương]
9611.00.00 …
```

- Chip được **xuống dòng, tối đa 2 hàng**. Không dùng cuộn ngang, vì cuộn ngang làm người dùng không thấy các chương bị khuất. Hiện 3 chương có nhiều kết quả nhất, phần còn lại gom vào `+ N chương`, mở thành **sheet đáy** có cùng nội dung với popover desktop.
- Chip cao ≥ 44 px, chữ ≥ 13 px. Hiện nay chip chỉ 11 px.
- "Xếp trước ▾" mở sheet đáy gồm danh sách radio: "Mặc định (độ khớp)" và 12 nhóm. Cuối sheet có dòng: "Chỉ đổi thứ tự, không ẩn mã nào."
- Mục tiêu đo được: với máy 390×844 và truy vấn "con dấu", **mã đầu tiên phải hiện trong màn hình đầu tiên**, khi chưa cuộn và khi chưa chọn gì.

### 3.3 Nhãn tiếng Việt

| Phần tử | Nhãn |
|---|---|
| Nhóm chip | "Lọc theo chương" (sr-only trên mobile, hiện chữ trên desktop) |
| Chip | `Tất cả` · `Ch. 96 · 5` (aria-label: "Chương 96, 5 kết quả") · `Ch. 98 · bổ sung VN` |
| Nút thêm | `+ N chương` (aria-label "Xem thêm N chương") |
| Popover/sheet | Tiêu đề "Chọn chương"; ô lọc "Gõ số chương…"; dòng ví dụ bắt đầu bằng "vd:" |
| Xếp hạng | Nút `Xếp trước: Mặc định ▾` hoặc `Xếp trước: Văn phòng & in ấn ▾`; tiêu đề menu "Đưa nhóm này lên trước"; chú thích "Chỉ đổi thứ tự, không ẩn mã nào. Nhóm là gợi ý tiện dụng, không phải phân loại chính thức." |
| Khi lọc chương mà không có kết quả | xem 3.4 |

### 3.4 Hành vi

- **Mở:** Hàng chip không cần mở, vì nó luôn hiện khi đã có kết quả. Popover hoặc sheet chỉ mở khi bấm `+ N chương` hoặc `Xếp trước`.
- **Chọn:** Áp dụng ngay. Trong lúc tải:
  - Giữ nguyên các chip và số đếm cũ, giảm độ mờ xuống 0.6.
  - Không đổi chữ, không làm xám, không đặt `disabled`.
  - Chip vừa bấm đổi sang trạng thái bật ngay lập tức (cập nhật lạc quan).
- **Khi truy vấn đổi mà chương đã chọn không còn kết quả:** giữ nguyên chương đã chọn (đúng với hành vi đang có test). Chip đó vẫn hiện với số `0` để người dùng thấy và bỏ được.
- **Xóa:**
  - Bấm "Tất cả" hoặc bấm lại chip đang bật sẽ bỏ lọc chương.
  - "Xếp trước" được đặt lại riêng, bằng mục "Mặc định" trong menu.
  - Bỏ nút "Xóa tất cả" gộp, vì giờ chỉ còn tối đa một bộ lọc.
  - Nút ✕ trong ô tìm kiếm chỉ xóa truy vấn, giữ nguyên chương và ưu tiên, đúng ràng buộc "giữ query/facts".
- **Kết quả rỗng khi đang lọc chương** (dùng `available_facets` vốn đã bỏ qua chương):
  > **Không có mã khớp trong Chương 01.**
  > Có 1 kết quả ở chương khác. [Xem 1 kết quả ở mọi chương]
  > Chưa đúng ý? [Mô tả hàng bằng lời với Hỗ trợ tìm mã]
- **Kết quả rỗng khi không lọc:** giữ câu "Điều này không có nghĩa hàng không có mã HS." và thêm nút mở hộp hỗ trợ.
- **Nhiều chương (≥ 8 chương có kết quả):** thêm một dòng nhỏ dưới hàng chip: "Kết quả trải trên 12 chương — [mô tả thêm để thu hẹp]". Dòng này mở hộp hỗ trợ, cho người dùng thêm thông tin mà không phải tự đoán chương.

### 3.5 Bàn phím và focus

- `Tab` vào nhóm chip, rồi dùng ←/→ để di chuyển giữa các chip (roving tabindex). `Enter` hoặc `Space` để bật/tắt. Một lần `Tab` nữa sẽ thoát khỏi nhóm. Nếu phần này quá tốn công, chấp nhận Tab qua từng chip, nhưng tối đa chỉ khoảng 7 điểm dừng.
- Sau khi chọn, focus **vẫn ở chip vừa bấm**. Không được nhảy lên ô tìm kiếm, kể cả khi danh sách chip được render lại. Vì vậy key của chip phải là số chương, không dùng index.
- Popover/sheet:
  - Khi mở, focus vào ô "Gõ số chương…". ↑/↓ để duyệt, Enter để chọn.
  - `Esc` để đóng, và focus quay lại nút `+ N chương`.
  - Bấm ra ngoài cũng đóng popover.
  - Trên mobile, sheet giữ focus bên trong (focus trap) cho tới khi đóng.
- Menu "Xếp trước" dùng `role="menu"` và các `menuitemradio`, hoặc dùng `<fieldset>` radio bên trong một popover. Esc sẽ đóng menu và trả focus về nút.
- Giữ phím tắt `/` để focus ô tìm kiếm. Số kết quả (`aria-live="polite"`) đọc lên "12 kết quả trong Chương 96".

### 3.6 Vị trí của tính năng ưu tiên

Ưu tiên nằm ở dòng tiêu đề kết quả, cùng hàng với nhãn chế độ tìm. Không đặt nó trong khu vực lọc, không cho chip của nó xếp chung hàng với chip chương, và không tính nó vào bất kỳ số đếm "bộ lọc" nào. Khi ưu tiên đang bật, chính nhãn nút (`Xếp trước: Văn phòng & in ấn`) đã đủ để thể hiện trạng thái, nên không cần chip riêng.

---

## 4. Phạm vi triển khai gọn cho coordinator

### 4.1 File bị ảnh hưởng

| File | Việc cần làm |
|---|---|
| `src/components/search-filters.tsx` | Viết lại thành hai component: `ChapterChips` (gồm hàng chip, nút `+N`, popover/sheet) và `RankLens` (menu "Xếp trước"). Xóa ô select "Bộ mã", `changeDataset`, `filterCount`, `details.filter-priority`, `filter-panel-heading` và nút "Xóa tất cả". |
| `src/components/workspace.tsx` | Chuyển phần render bộ lọc từ dòng 579–590 xuống *sau* `.results-heading`. Đặt `RankLens` vào trong `.results-heading`. Ẩn `.quick-search` khi `q.trim()` có chữ (dòng 570). Viết lại empty state (637–648) theo mục 3.4, đặt `chapter=''` và giữ nguyên `dataset`. UI không còn đổi `dataset`, nên state luôn là `'all'`. Có thể giữ state này để gửi cho `/api/assistant`, không cần sửa. |
| `src/app/globals.css` | Xóa `.filter-panel*`, `.filter-fields`, `.filter-field*`, `.filter-priority*`, `.priority-*`, `.filter-trigger*`, `.filter-count`, `.filter-reset` (khoảng dòng 1884–2113). Thêm style cho chip (≥ 13 px; ≥ 44 px trên mobile), popover/sheet và trạng thái tải bằng độ mờ. |
| `src/lib/search.ts` (tùy chọn, bước 2) | Thêm `sample: { description, heading }` vào từng facet: lấy dòng đầu tiên của chương đó sau khi đã sắp xếp. Bước 1 có thể bỏ qua, chỉ lấy ví dụ từ `result.items`. |
| `tests/e2e/filters.spec.ts` | Viết lại. Ba test xoay quanh việc chuyển dataset sẽ thành vô nghĩa, xem 4.3. |

Không đổi: `route.ts` (vẫn nhận `dataset`), `categories.ts`, dữ liệu, cấu hình LLM.

### 4.2 Tiêu chí chấp nhận

1. Không còn ô nào có nhãn "Bộ mã" hoặc "Bộ dữ liệu" trên giao diện. Chương 98 chọn được như mọi chương khác, với nhãn chứa "bổ sung VN".
2. Màn hình đầu tiên (chưa nhập gì) không có hàng chip và không có nút "Bộ lọc".
3. Truy vấn "máy in" hiện chip "Tất cả" cùng tối đa 5 chip (desktop) hoặc 3 chip (390 px), sắp theo số kết quả giảm dần, cộng thêm `+ N chương` với N đúng bằng số chương còn lại.
4. Bấm một chip chương thì lọc được kết quả, chip có `aria-pressed=true` và focus vẫn ở chip. Bấm lại thì quay về "Tất cả".
5. Ở 390×844 với truy vấn "con dấu": mã kết quả đầu tiên nằm trọn trong khung nhìn khi chưa cuộn. `scrollWidth <= innerWidth`.
6. "Xếp trước" nằm trong `.results-heading`. Chọn một nhóm không làm thay đổi `total`, chỉ đổi thứ tự. Không có chip ưu tiên trong hàng chip chương.
7. Chọn Chương 01 rồi tìm "96110000" sẽ hiện "Không có mã khớp trong Chương 01", kèm nút "Xem 1 kết quả ở mọi chương". Bấm nút đó thì `9611.00.00` xuất hiện và truy vấn vẫn giữ nguyên.
8. Trong lúc tải, không có điều khiển lọc nào bị `disabled`, và các chip không đổi chữ.
9. Popover/sheet "Thêm chương": Esc đóng và trả focus về nút `+ N chương`. Ô lọc "Gõ số chương" lọc được danh sách.

### 4.3 Kiểm tra trên trình duyệt (thay cho test cũ)

- **Desktop 1280×900, truy vấn "máy in":** chụp ảnh và đếm chip. Chọn `Ch. 85`, kiểm tra mọi `.dataset-tag` là `CHƯƠNG 85` và `document.activeElement` là chip đó. Nhấn ←/→ để kiểm tra di chuyển giữa các chip.
- **Mobile 390×844, truy vấn "con dấu":** kiểm tra `boundingBox` của `.result-card` đầu tiên có `y + height < 844`.
- **Chương 98:** truy vấn rỗng, bật chế độ duyệt, mở `+ N chương`, gõ "98", nhấn Enter. Mọi thẻ kết quả phải là `CHƯƠNG 98`.
- **Rỗng có gợi ý:** kịch bản như tiêu chí 7.
- **Xếp trước:** với truy vấn "con dấu", ghi lại `total`. Chọn "Văn phòng & in ấn", kiểm tra `total` không đổi và nút hiện tên nhóm. Chọn "Mặc định" để đặt lại.
- **Bàn phím thuần:** chỉ dùng phím (`/`, gõ chữ, Tab tới chip, mũi tên, Enter, Tab tới `+N`, Enter, Esc) và kiểm tra focus quay về đúng chỗ.
- Chụp lại `.cache/filters-desktop.png` và `.cache/filters-mobile.png` sau khi sửa, để chủ dự án so sánh bằng mắt. Test pass chưa đủ để kết luận UX tốt hơn.

### 4.4 Những việc không làm trong đợt này

- Không thêm tên chương hay cây phân loại.
- Không lọc theo thuế.
- Không cho chọn nhiều chương cùng lúc.
- Không sửa API, trừ trường `sample` tùy chọn.

---

## 5. Câu hỏi còn mở

Không có câu hỏi nào chặn việc triển khai. Hai quyết định tôi tự đưa ra, coordinator có thể bác bỏ nếu chủ dự án đã nói khác:

1. **Bỏ hẳn lựa chọn "chỉ danh mục chính (trừ chương 98)".** Theo những gì tôi xem được, không có nhu cầu nào cần tới nó. Nếu cần, thêm một ô tick ở cuối popover chương.
2. **Chỉ chọn một chương mỗi lần.** Tôi giữ cách này để không phải sửa API. Chọn nhiều chương là việc có thể làm sau.

---
---

# Phần II — Tái cấu trúc toàn bộ UI/UX

## 6. Bằng chứng bổ sung

| Nguồn | Đã xem? |
|---|---|
| `.cache/ui-home-desktop.png` (1440×960, trang mở đầu) | Có, đã xem ảnh |
| `.cache/ui-results-chat-desktop.png` (1440×960, truy vấn "máy in", hộp hỗ trợ đang mở) | Có, đã xem ảnh |
| `.cache/ui-results-mobile.png` (390 px, truy vấn "máy in") | Có, đã xem ảnh |
| Toàn bộ `src/components/workspace.tsx` (1190 dòng): `RecordDetails`, so sánh, chia sẻ, hộp hỗ trợ, hồ sơ | Có, đã đọc |
| `globals.css`: `.workspace-grid`, `.assistant-panel`, `.result-card`, `.compare-toggle`, `.search-box input` và các khối `@media` | Có, đã đọc từng đoạn |
| Thao tác thật trên trình duyệt (bàn phím, mở/đóng hộp hỗ trợ trên mobile) | **Không**. Các nhận định về hành vi đều dựa trên code |

## 7. Chẩn đoán tổng thể

Các vấn đề xếp theo mức ảnh hưởng tới việc tra mã.

### 7.1 Khi đã tìm, giao diện vẫn giữ phần hero của trang mở đầu

- **[QS]** Ảnh `ui-results-chat-desktop.png`: đã có truy vấn "máy in", nhưng phía trên kết quả vẫn còn:
  - eyebrow "DANH MỤC HÀNG HÓA VIỆT NAM",
  - H1 "Tra cứu mã HS" và câu giới thiệu,
  - hàng "Thử tìm",
  - nút "Bộ lọc",
  - dải lưu ý.

  Thẻ kết quả đầu tiên bắt đầu ở y≈512 trên khung cao 960. **Cả màn hình chỉ thấy khoảng 2,2 kết quả.**
- **[QS]** Ảnh `ui-results-mobile.png`: kết quả đầu tiên ở y≈537 trên khung 844, nên màn hình đầu tiên chỉ thấy được một thẻ.
- **[SL]** Đây là lý do lớn nhất khiến giao diện "chưa ưng". Người dùng đang làm việc với một danh sách, nhưng màn hình vẫn đang "giới thiệu sản phẩm". `showResults` (`workspace.tsx:466`) đã phân biệt được hai trạng thái này, nhưng bố cục không thay đổi theo.

### 7.2 Thẻ kết quả quá thưa và không giúp phân biệt các mã

- **[QS]** Mỗi thẻ cao khoảng 190 px trên desktop. Bên trong có:
  - mã,
  - nhãn "CHƯƠNG 84" lặp lại ở mọi thẻ (hai chữ số đầu của mã đã cho biết chương),
  - mô tả tiếng Việt,
  - mô tả tiếng Anh,
  - một đường kẻ,
  - dòng chân "chiếc • Nhóm 8443 •". Dấu `•` cuối đi trước "Nguồn tham khảo", nhưng chữ này gần như không nhìn thấy (`.reference-label`).
- **[QS]** Truy vấn "máy in" có 156 kết quả, tức 6 trang × 30 kết quả, nhưng mỗi màn hình chỉ thấy khoảng 2 kết quả.
- **[QS]** Chữ quá nhỏ ở nhiều chỗ: `.compare-toggle` 9–10 px, `.eyebrow` 8–9 px, `.data-caveat` 9 px trên mobile. Cùng một selector `.search-box input` được khai báo cỡ chữ ở 5 nơi khác nhau trong CSS (358, 1321, 1541, 1733, 1827 `!important`). Nhờ khai báo cuối, ô nhập trên mobile vẫn là 16 px.
- **[SL]** Công việc thật của người dùng là *quét nhiều mã gần giống nhau để thấy điểm khác*. Thiết kế hiện tại tối ưu cho việc đọc từng thẻ một, không cho việc quét.

### 7.3 Màn hình mở đầu có quá nhiều lối vào cạnh tranh nhau

- **[QS]** Ảnh `ui-home-desktop.png` có:
  - hero,
  - ô tìm kiếm,
  - "Thử tìm" (4 chip),
  - "Bộ lọc" (vô nghĩa khi chưa có kết quả),
  - một khối minh họa lặp lại hướng dẫn "Có thể nhập tên không dấu…",
  - "Duyệt toàn bộ danh mục",
  - "Chưa biết tìm thế nào? Mô tả thêm bằng lời.",
  - và nút "Hỗ trợ tìm mã" ở header.

  Trên một màn hình gần như trống có tổng cộng 9 điểm có thể bấm.

### 7.4 Hộp hỗ trợ không biết người dùng đang tra gì

- **[QS]** Ảnh `ui-results-chat-desktop.png`: ô tìm kiếm đang là "máy in", nhưng hộp hỗ trợ ghi "Sản phẩm mới", đưa ví dụ "Tra con dấu đóng mực bằng tay", và có tab "Hồ sơ 0".
- **[QS]** Hộp hỗ trợ có tới 4 lớp khái niệm: tab Hội thoại/Hồ sơ, ô select "Sản phẩm đang trao đổi", nút `+` tạo sản phẩm, và các "lời khai".
- **[QS]** Ngược lại, khi gửi chat, `send()` lại ghi đè ô tìm kiếm bằng `setQ(initialQuery)` (`workspace.tsx:396`). Như vậy luồng từ chat sang ô tìm kiếm có tồn tại, còn chiều từ ô tìm kiếm sang chat thì không.
- **[QS, rất quan trọng trên mobile]** Ở ≤760 px, `.assistant-panel` dùng `position: static` và nằm trong cột flex *sau* `.search-area`. Tức là nó nằm sau toàn bộ danh sách, phân trang và footer. `openHelp()` xử lý bằng `scrollIntoView`, nên người dùng bị cuộn qua mọi kết quả và mất chỗ đang xem. Muốn quay lại danh sách thì phải tự cuộn ngược lên.
- **[SL]** Hộp hỗ trợ đang hoạt động như một ứng dụng thứ hai đặt cạnh ứng dụng chính, thay vì là trợ giúp cho truy vấn đang tra.

### 7.5 Chi tiết và so sánh dùng được, nhưng làm đứt mạch quét

- **[QS]** `RecordDetails` mở dạng dialog modal (rộng 900 px). Trong dialog không có nút "So sánh" và không có nút chuyển sang mã trước/sau. Muốn xem mã kế tiếp, người dùng phải đóng dialog rồi bấm mã khác.
- **[QS]** Phần so sánh hoạt động tốt và đúng tinh thần dự án: tối đa 4 mã, có thanh `compare-bar`, link chia sẻ chỉ chứa mã và snapshot, xuất file không kèm lời khai. Nên giữ nguyên.

## 8. Ba cấu trúc thay thế

| | A. Giữ cấu trúc hiện tại, chỉnh lại khoảng cách và chữ | **B. "Bàn tra cứu": giao diện đổi theo trạng thái (khuyến nghị)** | C. Đặt hộp hỗ trợ làm trung tâm |
|---|---|---|---|
| Ý tưởng | Giữ hero, thu nhỏ khoảng cách, làm thẻ gọn hơn | Trang mở đầu chỉ là một ô tìm kiếm ở giữa màn hình. Khi đã có truy vấn, ô tìm kiếm lên thanh trên cùng (sticky), hero biến mất và danh sách dày hơn. Chip chương (Phần I) và "Xếp trước" nằm trên danh sách. Hộp hỗ trợ là ngăn bên phải trên desktop và sheet toàn màn hình trên mobile, luôn biết truy vấn hiện tại | Giao diện kiểu chat, kết quả hiện như tham chiếu bên dưới |
| Ưu | Ít rủi ro | Kết quả lên đầu màn hình. Lọc nằm cạnh kết quả. Hộp hỗ trợ là tùy chọn và gắn với truy vấn | Thân thiện với người không biết HS |
| Nhược | Không sửa được lỗi gốc ở 7.1, 7.4 | Phải tách layout theo trạng thái, cần viết lại một số test | Trái với yêu cầu "tra cứu trước, trợ lý là tùy chọn". Phụ thuộc vào năng lực LLM vốn có giới hạn. Mất khả năng quét danh sách |
| Lượng việc | S | M | L |

**Khuyến nghị: B.** C bị loại vì trái định hướng của chủ dự án. A không giải quyết được nguyên nhân gốc.

## 9. Thiết kế đề xuất (phương án B)

### 9.1 Trạng thái mở đầu (chưa có truy vấn và chưa ở chế độ duyệt)

```
Desktop
┌ HS Atlas                                   Hỗ trợ tìm mã   HS 2022 · 11.871 mã ⓘ ┐
│                                                                                  │
│                 Tra cứu mã HS                                                    │
│      [🔍 Nhập tên hàng, công dụng hoặc mã HS…                         / ]        │
│       Thử: con dấu · máy in · cà phê · 01.01        Duyệt theo chương →          │
│                                                                                  │
│       Không chắc gọi tên hàng thế nào? Mô tả bằng lời →                          │
└ footer nguồn/giấy phép ──────────────────────────────────────────────────────────┘
```

- **Bỏ:** eyebrow, câu giới thiệu dài, nút "Bộ lọc", khối minh họa (icon, tiêu đề phụ và đoạn hướng dẫn lặp lại). Gợi ý "nhập không dấu / tiếng Anh / một phần mã" chuyển vào placeholder hoặc một dòng chú thích nhỏ dưới ô tìm kiếm.
- **Giữ:** một H1 ngắn, các ví dụ (thành chữ liên kết, không còn là chip có viền), "Duyệt" (đổi thành "Duyệt theo chương", mở danh sách chương ở chế độ duyệt) và **một** lối vào hỗ trợ trong nội dung trang, cộng với nút ở header.
- Ô tìm kiếm được tự động focus trên desktop. Trên mobile thì không, để bàn phím không che màn hình.

### 9.2 Trạng thái kết quả, desktop (≥ 1000 px)

```
┌ HS Atlas  [🔍 máy in                                  ✕]   Hỗ trợ tìm mã   HS 2022 ⓘ ┐  ← sticky, cao 56–64 px
├──────────────────────────────────────────────────────────────┬──────────────────────┤
│ 156 kết quả · Từ khóa + ngữ nghĩa        Xếp trước: Mặc định ▾│ (ngăn hỗ trợ,        │
│ [Tất cả] [Ch. 84 · 82] [Ch. 85 · 31] [Ch. 90 · 14] … [+12]   │  chỉ khi mở)          │
│ ⓘ Gợi ý mã, cần đối chiếu mô tả và nguồn trước khi khai.      │                      │
│──────────────────────────────────────────────────────────────│ Đang hỏi về: máy in  │
│ 8443.12.00  Máy in offset, in theo tờ, loại sử dụng trong      │ ...                  │
│             văn phòng (… không quá 22 × 36 cm)        [☐ So sánh]│                      │
│             Printing machinery; offset, sheet-fed…  · chiếc · Nhóm 8443 │             │
│──────────────────────────────────────────────────────────────│                      │
│ 8443.14.00  Máy in letterpress, in cuộn, trừ loại máy in flexo  [☐ So sánh]           │
│             Printing machinery; letterpress… · chiếc · Nhóm 8443│                     │
│ …                                                             │                      │
```

- **Danh sách dạng hàng** (bỏ khung card, chỉ dùng đường kẻ giữa các hàng). Mỗi hàng có:
  - cột mã cố định khoảng 112 px, chữ số đều (`tabular-nums`);
  - mô tả tiếng Việt cỡ 14–15 px, tối đa 3 dòng;
  - một dòng phụ 12 px gồm tiếng Anh (tối đa 1 dòng), đơn vị và nhóm;
  - ô "So sánh" là checkbox có nhãn 12 px, căn phải.
- Mục tiêu: **mỗi hàng ≤ 110 px, và ≥ 5 kết quả hiện trong khung 1440×960.**
- **Bỏ nhãn "CHƯƠNG xx" ở từng thẻ.** Riêng chương 98 giữ một nhãn nhỏ "Bổ sung VN", vì đó là thông tin về nguồn mà người dùng thật sự cần biết.
- Bấm vào mã hoặc mô tả sẽ mở chi tiết (9.5).
- Lưu ý pháp lý (`data-caveat`) chỉ giữ một dòng dưới hàng chip. Không lặp ở nơi khác.
- Thanh trên cùng là `position: sticky`. Khi chuyển từ trạng thái mở đầu sang trạng thái kết quả, **giữ nguyên phần tử input** (chỉ đổi class hoặc vị trí trong cùng một cây). Không render hai ô input khác nhau, để focus, IME và con trỏ không bị mất khi người dùng đang gõ.

### 9.3 Trạng thái kết quả, mobile (≤ 760 px)

```
┌ ≡HS  [🔍 máy in        ✕]  💬 ┐  ← sticky 56 px; dòng "HS 2022 · 11.871 mã" chuyển vào footer hoặc dialog nguồn
│ 156 kết quả        Xếp trước ▾ │
│ [Tất cả] [Ch.84·82] [Ch.85·31]│
│ [+13 chương]                  │
│ ⓘ Gợi ý mã, cần đối chiếu…    │
│───────────────────────────────│
│ 8443.12.00            ☐ So sánh│
│ Máy in offset, in theo tờ, loại│
│ sử dụng trong văn phòng (…)    │
│ chiếc · Nhóm 8443              │
│───────────────────────────────│
│ 8443.14.00 …                  │
└ [ 2 mã đã chọn · So sánh → ] ┘  ← compare-bar giữ nguyên
```

- Ẩn dòng tiếng Anh trong danh sách mobile. Tiếng Anh vẫn có trong chi tiết.
- **Mục tiêu: hàng đầu tiên bắt đầu ở y ≤ 260 px, và ≥ 2,5 kết quả hiện ở khung 390×844.**
- Hộp hỗ trợ và chi tiết mã mở thành **sheet toàn màn hình** (`<dialog>` hoặc một lớp phủ có giữ focus). Không còn render hộp hỗ trợ ở cuối trang. Đóng sheet sẽ quay về đúng vị trí cuộn và đúng phần tử đã mở nó.

### 9.4 Hộp hỗ trợ: tùy chọn, nhưng gắn với truy vấn

- **Vị trí:**
  - Desktop ≥ 1280 px: giữ dạng cột phải sticky như hiện nay.
  - 1000–1279 px: ngăn trượt phủ lên bên phải, không làm hẹp danh sách.
  - Mobile: sheet toàn màn hình.
- **Đầu ngăn** gồm một dòng ngữ cảnh: `Đang hỏi về: máy in · 156 kết quả · Ch. 84` và nút đóng.
  - Bỏ phụ đề "Mô tả thêm theo từng sản phẩm".
  - Bỏ khối chào mừng lớn (icon, tiêu đề, ví dụ "con dấu"). Thay bằng một câu: "Mô tả công dụng, vật liệu hoặc cách hoạt động của *máy in* để thu hẹp kết quả." Câu này chèn truy vấn hiện tại vào. Nếu chưa có truy vấn, dùng "món hàng".
- **Gắn ngữ cảnh (chỉ sửa ở client):** khi mở hộp hỗ trợ mà `q` có chữ và sản phẩm đang chọn còn trống `query` (hoặc vẫn tên "Sản phẩm mới"), gọi `updateProduct` để gán `name` và `query` bằng `q`. Không đổi API.
- **Đơn giản hóa khái niệm "sản phẩm" và "hồ sơ":**
  - Ô select sản phẩm và nút `+` gộp thành một nút `Hồ sơ: máy in ▾`. Menu của nút này gồm danh sách sản phẩm, "Tra món hàng khác" (thay cho `+`) và "Xem/sửa thông tin đã khai (n)" (thay cho tab "Hồ sơ").
  - Bỏ thanh tab. Nội dung hồ sơ hiện nay giữ nguyên, nhưng mở như một khối con có nút "← Quay lại hội thoại".
  - Toàn bộ dữ liệu, cách lưu localStorage, hoàn tác, xuất file và xóa đều giữ nguyên.
- **Không hứa năng lực ảo:** giữ nhãn "Diễn giải AI" và "Theo dữ liệu tham khảo". Không thêm câu hỏi gợi ý nào ngụ ý hệ thống tự phân loại hàng.

### 9.5 Chi tiết mã và so sánh

- **Làm ngay:** giữ `Dialog`, vì nó đã xử lý đúng focus và Esc. Bổ sung:
  1. Một hàng hành động ở đầu dialog: `☐ Thêm vào so sánh` · `‹ Mã trước` `Mã sau ›`. Hai nút trước/sau đi theo thứ tự trong `result.items`, có phím ←/→ khi focus nằm trong dialog nhưng không ở ô nhập.
  2. Sắp lại thứ tự nội dung: mô tả, đơn vị/nhóm, thuế ghi trong nguồn (giữ nguyên nhãn "Thuế ghi trong nguồn" và câu "Chưa xác định mức áp dụng…"), ghi chú quản lý, nguồn, dữ liệu gốc.
  3. Trên mobile, dialog chiếm toàn màn hình.
- **Để sau (cần thử với người dùng):** ở ≥ 1440 px, chi tiết hiện trong ngăn phải thay cho modal (dạng danh sách + chi tiết). Chỉ làm khi có quy tắc rõ về việc chi tiết và hộp hỗ trợ dùng chung ngăn phải như thế nào. Hiện chưa đủ căn cứ để quyết.
- **So sánh:** giữ nguyên dialog, thanh compare, chia sẻ và xuất. Chỉ đổi nút bật/tắt so sánh trong danh sách thành checkbox có nhãn, chữ ≥ 12 px.

### 9.6 Bàn phím (toàn ứng dụng)

- `/` đưa focus vào ô tìm kiếm (giữ nguyên). `Esc` trong ô tìm kiếm có chữ thì xóa truy vấn; nếu ô đã trống thì bỏ focus.
- `↓` từ ô tìm kiếm chuyển focus tới mã của kết quả đầu tiên. `↑`/`↓` di chuyển giữa các mã kết quả (roving trên `.code-link`), `Enter` mở chi tiết, `Space` (hoặc `x`) bật/tắt so sánh.
- Chip chương, "Xếp trước", popover và sheet: theo mục 3.5.
- Mọi sheet và dialog đều: giữ focus bên trong, đóng bằng Esc, trả focus về đúng phần tử đã mở.
- Thêm link "Bỏ qua tới kết quả" (skip link) khi đang ở trạng thái kết quả.

## 10. Loại bỏ và giữ nguyên

| Loại bỏ hoặc gộp | Giữ nguyên (không được làm hỏng) |
|---|---|
| Hero (eyebrow, H1, câu giới thiệu) khi đang ở trạng thái kết quả | Thuật toán tìm, debounce 180 ms, xử lý IME (`composing`), phân trang 30 |
| Hàng "Thử tìm" khi đã có truy vấn | Lọc chương tường minh (Phần I). Tham số `dataset` của API |
| Nút "Bộ lọc", panel và ô select "Bộ mã" (Phần I) | 12 nhóm ưu tiên **chỉ để xếp hạng**, có nhãn "không ẩn mã nào" |
| Khối minh họa ở trang mở đầu và lối vào hỗ trợ bị lặp | Nhãn thuế nguyên văn, các câu "chưa xác định mức áp dụng", "không đồng nghĩa không có yêu cầu" |
| Nhãn "CHƯƠNG xx" trên từng thẻ (trừ 98), đường kẻ trong thẻ, dấu `•` thừa | Hồ sơ sản phẩm riêng tư, localStorage, hoàn tác, xuất file, xóa, cảnh báo lỗi lưu |
| Tab Hội thoại/Hồ sơ, select sản phẩm + nút `+` (gộp thành một menu) | So sánh 2–4 mã, link chia sẻ (chỉ mã + snapshot), xuất file không kèm lời khai, cảnh báo khác phiên bản |
| Cách đặt hộp hỗ trợ ở cuối trang trên mobile | Dialog nguồn và giấy phép, footer CC BY-SA |
| Các khai báo cỡ chữ trùng lặp trong CSS (5 khai báo cho `.search-box input`, nhiều khối `@media 760px` chồng nhau) | Phím tắt `/`, focus trả về sau dialog |

## 11. Ưu tiên triển khai và tiêu chí chấp nhận

### 11.1 Thứ tự làm (mỗi bước có thể merge riêng)

| Ưu tiên | Việc | File chính |
|---|---|---|
| P0-1 | Layout theo trạng thái: trang mở đầu tối giản; trạng thái kết quả có thanh tìm kiếm sticky trên cùng và bỏ hero | `workspace.tsx` (khoảng 500–575), `globals.css` |
| P0-2 | Chip chương và "Xếp trước" thay cho panel bộ lọc (Phần I, mục 4) | `search-filters.tsx`, `workspace.tsx`, `globals.css`, `tests/e2e/filters.spec.ts` |
| P0-3 | Danh sách dạng hàng dày hơn, chữ tối thiểu 12 px, checkbox so sánh | `workspace.tsx` (654–700), `globals.css` |
| P0-4 | Hộp hỗ trợ trên mobile thành sheet; desktop 1000–1279 px thành ngăn phủ; dòng ngữ cảnh "Đang hỏi về"; gán sản phẩm từ `q` | `workspace.tsx` (`openHelp`, 718–1010), `globals.css` |
| P1-1 | Dialog chi tiết có so sánh và trước/sau, mobile toàn màn hình | `workspace.tsx` (`RecordDetails`) |
| P1-2 | Gộp tab và select sản phẩm thành menu `Hồ sơ: … ▾` | `workspace.tsx` |
| P1-3 | Điều hướng bàn phím trong danh sách, Esc trong ô tìm kiếm, skip link | `workspace.tsx` |
| P1-4 | Dọn CSS: bỏ các khai báo bị ghi đè, gom về một hệ cỡ chữ (12/13/14/16/20/28) | `globals.css` |
| Sau / cần nghiên cứu | Ngăn chi tiết dạng danh sách + chi tiết; trường `sample` trong facet; tên chương chính thức từ nguồn đã kiểm chứng; thử nghiệm với 5 người theo 3 tác vụ (tra theo tên, tra theo mã, phân biệt 2 mã gần nhau) | `search.ts`, nghiên cứu dữ liệu |

### 11.2 Tiêu chí chấp nhận đo được (kiểm bằng Playwright và ảnh chụp)

1. **Trang mở đầu (1440×960):** không có nút "Bộ lọc" và không có khối `.search-intro` như cũ. Có tối đa 1 lối vào hỗ trợ trong nội dung trang (ngoài nút ở header). Ô tìm kiếm có focus sau khi tải trang.
2. **Kết quả "máy in" (1440×960):** `.result-row` đầu tiên có `top ≤ 200 px`, có **≥ 5** hàng nằm trọn trong khung nhìn, và không có phần tử nào chứa chữ "DANH MỤC HÀNG HÓA VIỆT NAM".
3. **Kết quả "máy in" (390×844):** hàng đầu tiên có `top ≤ 260 px`, có ≥ 2 hàng nằm trọn trong khung nhìn, và `scrollWidth <= innerWidth`.
4. **Cỡ chữ:** một script duyệt mọi phần tử đang hiển thị có chữ. Không phần tử nào có `font-size < 12px`. Ô tìm kiếm và ô chat trên mobile ≥ 16 px.
5. **Thanh tìm kiếm sticky:** cuộn xuống 2000 px, ô tìm kiếm vẫn nằm trong khung nhìn. Đang gõ tiếng Việt có dấu (IME) mà chuyển từ trạng thái mở đầu sang trạng thái kết quả thì không mất ký tự và không mất focus. Kiểm bằng cách gõ "máy in" qua `page.keyboard.type` và so khớp giá trị.
6. **Hỗ trợ trên mobile:** cuộn tới kết quả thứ 10, bấm 💬. Sheet hiện ô soạn tin trong khung nhìn, header có "Đang hỏi về: máy in". Nhấn Esc thì sheet đóng, `scrollY` giữ như trước (sai số ±10 px) và focus quay về nút 💬.
7. **Gắn ngữ cảnh:** khi đang tra "máy in", mở hỗ trợ với sản phẩm trống thì tên sản phẩm thành "máy in". Tải lại trang (localStorage) thì vẫn còn.
8. **Chi tiết:** mở mã đầu tiên, nhấn "Mã sau ›" thì dialog hiện mã thứ hai. Bấm "Thêm vào so sánh" thì thanh compare hiện "1 mã đã chọn". Esc đóng dialog và focus về `.code-link` vừa mở.
9. **Không hồi quy:**
   - So sánh 2 mã, mở link chia sẻ thì nhận đúng mã và cảnh báo phiên bản.
   - Xuất file vẫn tải được.
   - Nhãn "Thuế ghi trong nguồn" và các câu lưu ý vẫn hiện nguyên văn.
   - Chọn "Xếp trước" không làm đổi tổng số kết quả.
10. **Bàn phím thuần:** chuỗi `/` → gõ → `↓` → `↓` → `Enter` → `Esc` → `Space` hoàn thành được việc mở chi tiết và chọn so sánh mà không cần chuột.
11. **Ảnh chụp mới** cho cả 3 trạng thái (mở đầu, kết quả, kết quả có hỗ trợ), mỗi trạng thái ở cả desktop và mobile, lưu vào `.cache/` để chủ dự án duyệt bằng mắt. Test pass không thay được bước này.

### 11.3 Câu hỏi còn mở (không chặn việc triển khai)

Tôi tự quyết các điểm sau trong phạm vi chủ dự án đã ủy quyền:

- **Bỏ hero ở trạng thái kết quả.**
- **Giữ chi tiết ở dạng modal** cho đợt này.
- **Ẩn tiếng Anh trong danh sách mobile.**

Điều duy nhất nên hỏi lại chủ dự án *sau* khi có ảnh mới: liệu họ có muốn chi tiết mã hiện cạnh danh sách thay vì modal không (mục "Sau / cần nghiên cứu").
