# Nguồn và giấy phép dữ liệu

## Nguồn được người dùng cung cấp

[Thư mục Drive](https://drive.google.com/drive/folders/1jEN1kzB0qVbjA7UH7Zm49WAZ5XdHR1A7), kiểm tra ngày 2026-11-03:

| File | Drive ID | Ghi chú |
|---|---|---|
| import_postgres.sql | 1c5y-vRM174CoXMsOxIu0UNRk_3ijD6W8 | 1.556 bytes; tham chiếu thêm CSV chương 98 chưa thấy |
| hs_codes_2022_11414.json | 15gjIKxqpbytRGSdsTLhFSfsizJe8vpoD | 7.600.998 bytes; đã đọc 11.414 bản ghi trong phiên tư vấn |
| hs_codes_2022_11414.csv | 1Jwy8ueCuvFe6z3dQE5h0gQOPknCC0vpf | 5.116.913 bytes; chưa đối soát từng dòng với JSON |
| Vietnam_HS_2022_11414_codes_2026-11-03.xlsx | 1BrT27dzdxLZChn8rQLoJibFbtribUbgH | 927.693 bytes; chưa kiểm tra workbook |

Các file chưa được vendor vào repo. Cần lấy checksum và snapshot manifest khi triển khai importer. Không dùng link download tạm có token làm nguồn công khai.

## Nguồn được dữ liệu nhắc đến

- [ozvietnam/hs-code-api](https://github.com/ozvietnam/hs-code-api)
- [data/tax.json](https://github.com/ozvietnam/hs-code-api/blob/main/data/tax.json)
- [LICENSE-DATA](https://github.com/ozvietnam/hs-code-api/blob/main/LICENSE-DATA)

SQL nguồn ghi dữ liệu CC BY-SA 4.0 và các trường thuế thô chưa được xác minh độc lập là thuế pháp lý hiện hành. Trước khi tái phân phối phải kiểm tra license của snapshot thực tế, ghi attribution, chỉ rõ thay đổi và nghĩa vụ với bản dữ liệu phái sinh. Không suy rằng license phần mềm áp dụng cho mọi dữ liệu/tài liệu bên ngoài.

Ngày file 2026 không chứng minh danh mục/thuế đều đang hiệu lực năm 2026. Các chú giải hoặc tài liệu trả phí cần kiểm tra quyền sử dụng riêng; không scrape/commit mặc định.

## Tham khảo cấu trúc

[WCO HS FAQ](https://www.wcoomd.org/en/faq/harmonized_system_faq) giải thích chương, nhóm và phân nhóm. Cần thêm danh mục Việt Nam đúng phiên bản và nguồn căn cứ trước khi dựng cây đầy đủ.
