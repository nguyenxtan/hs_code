# VAT theo ngữ cảnh giao dịch — đề xuất thiết kế

Ngày cập nhật: 2026-11-03. Đầu vào: phần nghiên cứu VAT do chủ dự án cung cấp trong cuộc trao đổi. Đây là đặc tả sản phẩm/dữ liệu, chưa phải bộ quy tắc pháp lý đã duyệt hoặc module đang chạy.

## Điều chỉnh so với đề xuất trước

Giữ `vat_raw` là cần để bảo toàn nguồn, nhưng chưa đủ cho sản phẩm lâu dài. Một mã HS có thể liên quan nhiều quy tắc VAT, nhiều phạm vi và thời gian. Cột VAT áp dụng phải là kết quả từ hồ sơ và quy tắc đã kiểm chứng, không phải thuộc tính phần trăm duy nhất của `hs_codes`.

Tách riêng HS, thuế nhập khẩu và VAT. Mức thuế nhập khẩu bằng 0 không tự xác định trạng thái hay thuế suất VAT. Không suy thuế nhập khẩu, BVMT hoặc thuế khác từ kết quả VAT.

Phạm vi phiên bản đầu của chức năng VAT là khâu nhập khẩu. Mô hình để mở rộng bán trong nước/xuất khẩu nhưng không tự dùng quy tắc của khâu này cho khâu khác. Tính thuế phải nộp, khấu trừ và hoàn thuế là các phạm vi riêng.

## Ba tầng cần lưu

| Tầng | Nội dung | Quyền thay đổi |
|---|---|---|
| Quan sát từ nguồn | `vat_raw`, dòng nguồn, file/hash, thời điểm lấy, phiên bản HS | Bất biến theo snapshot; không sửa `8/10` thành một số |
| Quy tắc nghiệp vụ | Trạng thái VAT, mức cơ bản, cơ chế giảm, phạm vi hàng, khâu, điều kiện, hiệu lực, căn cứ và quyết định duyệt | Có revision, chỉ quy tắc đã duyệt được dùng để xác định |
| Kết quả đánh giá | Đầu vào, rule-set version, trạng thái, mức áp dụng nếu xác định được, dữ kiện thiếu, căn cứ và diễn giải | Lưu theo lần đánh giá; giữ lịch sử khi lời khai hoặc quy tắc đổi |

Đọc được các số trong `*/5/8/10` không có nghĩa đã biết điều kiện hoặc ý nghĩa dấu `*`. Dấu trong cột dữ liệu gốc không tự được đồng nhất với dấu trong một phụ lục pháp luật khác.

## Phân biệt trạng thái pháp lý với trạng thái đánh giá

Trạng thái VAT theo quy tắc: chịu thuế; không chịu thuế; không phải kê khai/tính nộp. Trường hợp chịu mức 0% vẫn thuộc trạng thái chịu thuế với `rate = 0`; các trạng thái khác không ép rate về 0. Ý nghĩa khấu trừ/hoàn thuế không được suy ra chỉ từ trạng thái này.

Trạng thái đánh giá riêng: đã xác định; cần dữ kiện; thiếu căn cứ; xung đột quy tắc; ngoài phạm vi hỗ trợ. Thiếu thông tin không phải một trạng thái miễn/giảm thuế và không được chuyển thành mức 10% mặc định.

Mức cơ bản, mức sau giảm và mức áp dụng là các trường khác nhau. Có thể xác định mức cơ bản nhưng chưa đủ dữ kiện xác định có được giảm hay không; khi đó mức áp dụng vẫn chưa xác định.

## Hồ sơ đầu vào

- Sản phẩm và mô tả thực tế, thuộc tính liên quan, HS dự kiến/đã xác định và phiên bản danh mục.
- Khâu giao dịch; thời điểm có ý nghĩa pháp lý cho giao dịch, loại thời điểm và nguồn xác nhận. Không tự thay bằng ngày mở trang; ngày dự kiến phải ghi là dự kiến.
- Loại hình, mục đích, chủ thể/phương pháp thuế và bên giao dịch khi quy tắc trong phạm vi yêu cầu.
- Hồ sơ chứng minh điều kiện đặc thù: loại, mã tham chiếu, trạng thái kiểm chứng và thời hạn nếu có. Không mặc định mọi trường hợp cần tất cả giấy tờ.

Mỗi dữ kiện có nguồn và trạng thái: người dùng khai, người dùng xác nhận, trích từ hồ sơ hoặc chưa xác minh. Chỉ hỏi trường mà các quy tắc ứng viên thực sự cần, không bắt khai một form pháp lý lớn ngay khi tra tên hàng.

## Mô hình quy tắc khái niệm

Mỗi rule có:

- ID, revision, phạm vi pháp quyền, khâu và phiên bản danh mục liên quan.
- Mô tả phạm vi hàng, tham chiếu HS mang tính tra cứu/giới hạn theo nguồn, điều kiện bao gồm/loại trừ.
- Điều kiện kiểu AND/OR để biểu diễn đúng các căn cứ thay thế hoặc đồng thời.
- Khoảng hiệu lực và quy định chuyển tiếp; thời điểm nguồn được tiếp nhận riêng với thời điểm pháp lý áp dụng.
- Kết quả trạng thái/mức cơ bản/giảm thuế, nghĩa vụ hồ sơ nếu có.
- Văn bản, điều/khoản/phụ lục, đoạn trích, URL và snapshot/hash; liên kết sửa đổi/bãi bỏ/thay thế.
- Trạng thái draft/reviewed/retired, người duyệt, ngày duyệt và case kiểm tra.

Không dùng một trường `priority` do AI tự đặt để giải quyết xung đột văn bản. Thứ tự áp dụng/ngoại lệ phải có căn cứ và được duyệt; nếu còn mâu thuẫn, trả trạng thái xung đột. Dự thảo được lưu để theo dõi, không dùng làm căn cứ đang hiệu lực.

Ban đầu dùng module quy tắc và bảng quyết định nhỏ trong ứng dụng; chưa cần một dịch vụ rule engine riêng. Không cho mô hình sinh rồi thi hành SQL/code/điều kiện tùy ý.

## Luồng xác định

1. Chốt phạm vi, loại giao dịch và thời điểm; kiểm tra đủ thông tin đầu vào tối thiểu.
2. Lấy các quy tắc đã duyệt và đúng thời gian, gồm ngoại lệ/chuyển tiếp có liên quan. HS giúp truy xuất ứng viên nhưng không thay kiểm tra mô tả và điều kiện.
3. Đánh giá mỗi điều kiện bằng ba giá trị: đúng / sai / chưa biết. “Không có dữ kiện” khác “đã chứng minh không thuộc”. Không tìm thấy mã trong một bảng loại trừ chưa đủ chứng minh được giảm.
4. Phát hiện thiếu nguồn hoặc xung đột. Chỉ trả kết quả xác định khi đường áp dụng có căn cứ và không còn điều kiện chưa biết có thể thay đổi kết quả.
5. Nếu cần dữ kiện, hỏi câu có khả năng phân biệt kết quả VAT; câu hỏi VAT khác câu hỏi để xác định HS.
6. Lưu trace gồm dữ kiện đã dùng, điều kiện chưa biết, quy tắc áp dụng/bị loại và căn cứ. Trả kết quả có trạng thái và thời điểm rõ ràng.

Không hiện mức cuối cùng chỉ vì một ứng viên đang có mức 8%, 5% hoặc 10%. Các khả năng chưa được loại có căn cứ vẫn phải được hiển thị là chưa xác định.

## Vai trò của RAG và LLM

RAG tìm điều khoản và giải thích từ evidence được phép dùng. LLM hỗ trợ trích lời khai, gợi ý câu hỏi và diễn đạt; không tự quyết định mức VAT từ kiến thức mô hình hoặc từ similarity.

Kết quả mức/trạng thái do module quy tắc đã duyệt trả về. Nếu chưa có quy tắc cho mặt hàng, chat có thể trình bày tài liệu tham khảo và yêu cầu kiểm chứng, nhưng không tự nâng thành kết quả đã xác định. AI lỗi vẫn có thể tra raw và chạy quy tắc đã có với dữ kiện được nhập thủ công.

## Hiển thị và filter

- Trang danh mục: “VAT trong nguồn: 8/10 — chưa đánh giá điều kiện”; không ghi nhãn “VAT áp dụng: 8%”.
- Trang kết quả theo hồ sơ: trạng thái, mức áp dụng nếu có, mức cơ bản, thời điểm, điều kiện, nguồn và dữ kiện còn thiếu.
- Không trộn kết quả nhập khẩu với kết quả bán trong nước; không gọi không chịu thuế hoặc không phải kê khai là 0%.
- Khi có chức năng filter VAT theo ngữ cảnh, phân biệt “đã xác định mức X” với “có quy tắc ứng viên mức X” và nhóm chưa đủ thông tin; không lọc mất nhóm chưa rõ một cách âm thầm.
- Chưa mở filter VAT áp dụng cho đến khi có đủ quy tắc được duyệt và kiểm tra độ phủ. Quyết định MVP chỉ hiển thị raw vẫn giữ nguyên trong thời gian đó.

## Tiền thuế và khấu trừ

Xác định trạng thái/thuế suất khác tính tiền. Bộ tính VAT nhập khẩu sau này cần trị giá và các thành phần thuế liên quan được xác định riêng theo quy định đã duyệt. Thiếu thành phần không tự coi bằng 0; phân biệt không phát sinh đã xác nhận với chưa biết. Tiền tệ, tỷ giá và làm tròn cần đặc tả riêng.

Không mặc định VAT đã nộp là chi phí cuối cùng hoặc được hoàn ngay. Khấu trừ/hoàn thuế cần module và hồ sơ riêng; chưa thuộc MVP tra cứu này.

## Làm sạch và cập nhật dữ liệu VAT

1. Bảo toàn dữ liệu nguồn, thống kê từng mẫu chuỗi và ghi chú; không tự giải mã ký hiệu.
2. Gắn cờ các dòng thiếu điều kiện/căn cứ/thời điểm; không tự ghi đè rate.
3. Lập danh mục văn bản và quan hệ sửa đổi/bãi bỏ; lấy bản nguồn có hash và vị trí điều khoản.
4. Biên soạn quy tắc nháp có phạm vi và ca kiểm tra; AI chỉ đề xuất để người nghiệp vụ duyệt.
5. Khi đổi chính sách, thêm revision/khoảng hiệu lực; giữ lịch sử và cảnh báo cần đánh giá lại kết quả cũ. Thay đổi HS và thay đổi VAT là hai luồng cập nhật khác nhau.
6. Chỉ publish rule-set khi có nguồn, người duyệt, kiểm tra xung đột và báo cáo coverage; snapshot HS vẫn có thể phát hành nếu chức năng VAT áp dụng chưa đủ điều kiện bật.

## Tình huống kiểm tra thiết kế

- Cùng mã, khác khâu hoặc ngày có thể có kết quả khác.
- Không chịu thuế / chịu 0% / không phải kê khai vẫn khác nhau dù số phải nộp có thể giống.
- Điều kiện chưa biết không rơi xuống 10%; số 0 không thay cho giá trị thiếu.
- Cùng mã nhưng khác phạm vi y tế hoặc hồ sơ: không tự dùng chung mức.
- Có quy định đặc thù: chỉ áp trong phạm vi và thời hạn đã được xác minh; không mở rộng theo tên gọi gần giống.
- Nhiều căn cứ thay thế biểu diễn bằng OR khi đúng văn bản, không biến thành yêu cầu đủ mọi giấy tờ.
- Hết thời hạn chính sách hoặc nguồn bị bãi bỏ: không dùng làm quy tắc hiện hành nhưng vẫn giữ khả năng tra lịch sử.
- Mở lại phiên cũ sau khi cập nhật: không âm thầm thay kết quả cũ; cho đánh giá lại và hiển thị thay đổi.

Các ví dụ phân bón, nông sản, thiết bị y tế, xăng dầu do chủ dự án cung cấp là đầu mối biên soạn case; chưa phải fixture gold hay quy tắc được bật cho đến khi xác minh từng căn cứ.

## Danh mục nguồn và mức kiểm chứng

Ngày kiểm tra 2026-11-03. “Đã đọc trang” không đồng nghĩa đã thẩm định đầy đủ văn bản gốc, sửa đổi hoặc từng dòng HS.

| Nguồn | Tình trạng và việc còn lại |
|---|---|
| [NQ 204/2025/QH15 — trang toàn văn trên Cổng Chính phủ](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-quyet-so-204-2025-qh15-ve-giam-thue-gia-tri-gia-tang-119250628082120511.htm) | Đã đọc trang công bố phạm vi giảm từ 10% xuống 8%, loại trừ và thời gian 01/07/2025–31/12/2026. Chưa thẩm định toàn bộ sửa đổi/ngoại lệ về sau. |
| [TT 25/2024/TT-BTC](https://chinhphu.vn/?classid=1&docid=210203&pageid=27160) | Đã đọc metadata chính thức: bãi bỏ TT 83/2014, hiệu lực 08/06/2024. Cần tải bản ký và ghi điều khoản vào source registry khi biên soạn quy tắc. |
| [Giới thiệu NĐ 359/2025/NĐ-CP](https://xaydungchinhsach.chinhphu.vn/nhung-diem-moi-cua-nghi-dinh-359-2025-nd-cp-ve-thue-gia-tri-gia-tang-119260110093134354.htm) | Đã đọc bài chính thức về điều chỉnh theo chủ thể/phương pháp và khâu thương mại nông sản. Cần đọc bản ký và đối chiếu văn bản sửa đổi khác trước khi dùng làm rule. |
| [NĐ 174/2025/NĐ-CP](https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/7/174nd.signed.pdf) | Chủ dự án cung cấp; chưa xác minh toàn bộ phụ lục và ghi chú trong đợt cập nhật này. |
| [114/VBHN-VPQH](https://xdcs.cdnchinhphu.vn/446259493575335936/2026/6/5/2026-305-114-vbhn-vpqh-17806273642891917566820.pdf) | Chủ dự án cung cấp; chưa đối chiếu đầy đủ luật gốc/các sửa đổi trong đợt này. |
| [18/VBHN-BTC](https://congbaocdn.chinhphu.vn/180507251028987904/2026/6/18/469709-1781753019_v1_1781755160_signed.pdf) | Chủ dự án cung cấp; chưa đối chiếu đầy đủ điều khoản/hiệu lực trong đợt này. |
| [Chính sách đặc thù xăng dầu 2026 — bài giới thiệu](https://xaydungchinhsach.chinhphu.vn/dua-muc-thue-bao-ve-moi-truong-voi-xang-dau-nhien-lieu-bay-ve-0-dong-11926041616531056.htm), [NQ 43/2026/NQ-CP](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/9/43_2026_nq-cp_30092026_1-signed.signed.pdf) | Chủ dự án cung cấp; cần xác minh số hiệu, toàn văn, phạm vi, chuỗi sửa đổi và thời hạn trước khi đưa vào bất kỳ kết quả VAT nào. |

Mỗi quy tắc phát hành sau này phải dẫn văn bản/điều khoản gốc và sửa đổi tương ứng; bản hợp nhất hỗ trợ đọc, không thay việc lưu provenance của thay đổi.
