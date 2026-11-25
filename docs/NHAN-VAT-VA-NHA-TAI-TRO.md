# Màn hình nhà tài trợ và "Nhân vật hôm nay"

Cập nhật: 20/11/2026. Trạng thái: đã có trong mã, nội dung đợt 1 chờ duyệt.

## 1. Thứ tự khi mở app

1. Logo khởi động của app (dưới 1 giây).
2. **Màn hình nhà tài trợ**: chỉ lần mở đầu tiên trong ngày.
3. **Trang chủ (tab Hub)**: thẻ "Nhân vật hôm nay" ở trên cùng.

Không có màn hình chào riêng, để người dùng không phải qua 3 bước mỗi sáng.

## 2. Màn hình nhà tài trợ

**Căn cứ:** Nghị định 342/2025/NĐ-CP, Điều 17, hiệu lực từ 15/02/2026: quảng cáo ảnh tĩnh không có thời gian chờ tắt; ảnh động hoặc video chờ tắt tối đa 5 giây. Google Play không cho quảng cáo toàn màn hình xuất hiện trước khi app tải xong.

**Quy tắc đã lập trình:**

| Quy tắc | Giá trị |
|---|---|
| Ảnh tĩnh | Nút Đóng có ngay từ giây 0 |
| Ảnh động | Chờ đóng do Admin chọn, app khóa tối đa 5 giây |
| Thời gian hiện | 5, 6, 7 hoặc 8 giây, Admin chọn (mặc định 6) |
| Luân phiên | Mỗi ngày một nhà tài trợ đang chạy, lần lượt theo cột Thứ tự. Ví dụ 3 nhà tài trợ: A, B, C, A, B, C... |
| Không hiện khi | Ngày đầu tiên dùng app; chưa xong hồ sơ; mở từ thông báo hoặc liên kết; ảnh chưa tải xong trong 1,5 giây; đã hiện hôm nay |
| Nhãn bắt buộc | "Nhà tài trợ · Quảng cáo · tên nhà tài trợ" |
| Bấm vào ảnh | Mở trang của nhà tài trợ (nếu có) và vào app |

**Quản lý:** Admin vào Quản trị → Nhà tài trợ: bật/tắt, thời gian, thêm/sửa, tạm dừng, ngày bắt đầu và kết thúc, xem thử đúng màn hình người dùng thấy. Mọi thay đổi được ghi nhật ký.

**Ảnh nhà tài trợ:** ảnh dọc 9:16 (1080 x 1920), dưới 300 KB, định dạng WebP hoặc JPG. Chữ và logo nằm ở vùng giữa, cách mép trên và dưới 15% (phía trên có nhãn và nút Đóng, phía dưới có đếm ngược). Có thể làm thêm bản tiếng Anh.

**Hợp đồng tài trợ nên ghi rõ:** nội dung quảng cáo do nhà tài trợ chịu trách nhiệm về tính hợp pháp; MeetLore có quyền từ chối hoặc gỡ quảng cáo vi phạm; không quảng cáo nhóm hàng cấm hoặc hạn chế (thuốc lá, rượu bia mạnh, cờ bạc, thuốc, thực phẩm chức năng...) nếu chưa được luật sư duyệt.

## 3. Nhân vật hôm nay

**Cách chơi:** thẻ hiện ảnh, tên, lĩnh vực, ngày tháng sinh và một gợi ý. Nhãn trên ảnh ghi "Đoán năm sinh: 18__"; ba số hai chữ số (ví dụ 41, 89, 36) trôi trên ảnh, người dùng chạm số đúng. Chọn xong thì hiện đúng/sai, năm sinh–năm mất, thành tựu và câu nói (nếu có). Nhân vật chưa rõ ngày sinh chỉ hiện "Chưa rõ ngày sinh" và vẫn đoán năm.

- Mọi người cùng thấy một bộ lựa chọn trong ngày. Hai lựa chọn sai lấy ngẫu nhiên, cách nhau ít nhất 5.
- Có chuỗi ngày chơi liên tiếp. **Không cộng điểm đổi ưu đãi**, để không thành trò chơi có thưởng.
- Kết quả lưu trên máy người dùng.
- Dưới ảnh có dòng nhỏ "Ký họa minh họa bằng AI" (11 ngôn ngữ), chỉ hiện khi có ảnh thật.
- Ngày chưa có nhân vật sinh đúng ngày: app luân phiên một nhân vật trong danh sách, tiêu đề đổi thành "Nhân vật để nhớ".

**Quy tắc chọn nhân vật:**

1. Người mất **trước năm 1950**: được vẽ ký họa chân dung.
2. Người mất **từ năm 1950** trở đi: chỉ vẽ **biểu tượng thành tựu**, không vẽ mặt hay dáng người nhận ra được. Ví dụ Michael Jackson: không vẽ dáng nhảy đặc trưng, chỉ vẽ sàn diễn và nốt nhạc. Lý do: Bộ luật Dân sự Điều 32 yêu cầu sự đồng ý của người có hình ảnh, hoặc vợ, chồng, con thành niên nếu người đó đã mất; nhiều nước có quyền nhân thân sau khi mất (bang California 70 năm).
3. Không chọn người còn sống, chính khách thế kỷ 20 trở lại đây, lãnh tụ Việt Nam, nhân vật gây tranh cãi. Tổng thống Mỹ thời xa như Washington, Lincoln dùng được.
4. Câu nói phải có nguồn (tác phẩm, năm). Câu phổ biến trên mạng nhưng không rõ nguồn thì bỏ. Người mất sau khoảng năm 1955: ghi thành tựu thay câu nói (lời văn có thể còn bản quyền).
5. Cân bằng quốc gia, nữ giới, lĩnh vực; ưu tiên danh nhân Việt Nam và danh nhân gắn với Hub.
6. Ngày sinh theo lịch Gregory; ghi chú khi nguồn dùng lịch Julius hoặc âm lịch.

## 4. Ảnh ký họa

**Bố cục trong app:** ảnh ngang tỉ lệ 3:2 chiếm hết bề ngang thẻ (thẻ thấp để người dùng vẫn thấy Hub bên dưới). Ba số hai chữ số trôi chậm ngang dọc trên ảnh, mỗi số trong một làn dọc riêng; người dùng chạm số đúng với hai chữ số cuối năm sinh. Góc trên bên trái có nhãn "Đoán năm sinh: 18__". Hai lựa chọn sai lấy ngẫu nhiên trong 00–99 (ví dụ 41, 89, 36), không nhất thiết gần đáp án.

**Thông số ảnh:**

| Mục | Giá trị |
|---|---|
| Kích thước | 1200 x 800 px (ngang, 3:2); nhận ảnh từ 1024 x 683 px trở lên |
| Định dạng | WebP, chất lượng khoảng 75, sRGB, không nền trong suốt |
| Dung lượng | Dưới 100 KB |
| Nền | Ngà ấm `#ECE5D6`, phủ kín ảnh |
| Nét vẽ | Chàm `#24426B` hoặc gần đen `#1B2A33`; điểm nhấn nhỏ đỏ son `#B23521` hoặc vàng nghệ `#8A6112` |
| Bố cục | Nhân vật hoặc biểu tượng nằm giữa, trong khoảng 60% bề ngang ở giữa (px 240–960); đỉnh đầu cách mép trên khoảng 10% |
| Góc trên trái | Khoảng 400 x 120 px để trơn hoặc rất nhạt, vì có nhãn "Đoán năm sinh" |
| Độ đậm | Nét ký họa thoáng, không tô đen mảng lớn (dưới khoảng 20% diện tích), để các số tròn màu trắng nổi rõ khi trôi qua |
| Không có | Khung, viền, góc bo, chữ, chữ ký, logo, năm tháng (lộ đáp án) |
| Tên file | `<mã>.webp` theo bảng danh sách, đặt trong bucket `media`, thư mục `figures/` |

App tự bo góc và đặt ảnh vào thẻ. Ảnh khác tỉ lệ 3:2 sẽ bị cắt mép. Chưa có ảnh thì app hiện chữ cái đầu tên.

**Mẫu mô tả cho công cụ tạo ảnh (chân dung, chỉ người mất trước 1950):**

> Landscape 3:2 pencil and ink sketch portrait of [tên], [trang phục thế kỷ ...], head and shoulders, three-quarter view, centred, generous empty paper around the figure, the top-left area is the same plain paper as the rest of the background (no white box), loose light cross-hatching, no large solid black areas, warm ivory paper background (#ECE5D6), muted indigo ink, no border, no frame, no text, no numbers, no logo, no signature, simple and respectful.

**Mẫu cho biểu tượng:**

> Landscape 3:2 pencil and ink sketch of [mô tả biểu tượng], centred, generous empty paper around, the top-left area is the same plain paper as the rest of the background (no white box), no people, no faces, no text, no numbers, no border, loose light cross-hatching, warm ivory paper background (#ECE5D6), muted indigo ink.

**Kiểm tra mỗi ảnh trước khi đăng:** không chép một bức ảnh hay tranh nổi tiếng cụ thể; không có chữ, logo, chữ ký giả; khuôn mặt đúng tinh thần nhân vật, không biếm họa; với ảnh biểu tượng thì không có người nhận ra được.

**Tạo bucket:** chạy file `supabase/storage-media.sql` một lần trong SQL Editor (tạo bucket `media` công khai, giới hạn 1 MB mỗi ảnh, chỉ Admin được tải lên).

Chỉ Admin tải ảnh lên qua trang Storage của Supabase. Bucket `media` công khai, chỉ dùng cho ảnh nhân vật và nhà tài trợ, không bao giờ chứa ảnh giấy tờ.

## 5. Đợt 1: 20/11 đến 19/12 và 2 nhân vật chưa rõ ngày (chờ duyệt)

| Ngày | Nhân vật | Năm | Lĩnh vực | Ảnh | Câu nói | Biểu tượng |
|---|---|---|---|---|---|---|
| 20/11 | Edwin Hubble | 1889–1953 | Thiên văn | Biểu tượng | — | Kính thiên văn và các thiên hà xoắn ốc trôi xa nhau |
| 21/11 | Voltaire | 1694–1778 | Triết học | Chân dung | Có | Bút lông ngỗng và cuốn Candide |
| 22/11 | George Eliot | 1819–1880 | Văn học | Chân dung | — | Chồng bản thảo bên ô cửa thị trấn nhỏ nước Anh |
| 23/11 | Manuel de Falla | 1876–1946 | Âm nhạc | Chân dung | — | Cây đàn guitar và khuông nhạc |
| 24/11 | Baruch Spinoza | 1632–1677 | Triết học | Chân dung | Có | Bàn mài thấu kính và trang sách hình học |
| 25/11 | Andrew Carnegie | 1835–1919 | Kinh tế | Chân dung | — | Dầm thép và thư viện cổ điển |
| 26/11 | Ferdinand de Saussure | 1857–1913 | Ngôn ngữ học | Chân dung | — | Hai mặt của tờ giấy: chữ viết và hình ảnh |
| 27/11 | Anders Celsius | 1701–1744 | Thiên văn | Chân dung | — | Nhiệt kế thủy tinh và bầu trời phương Bắc |
| 28/11 | William Blake | 1757–1827 | Văn học | Chân dung | Có | Hạt cát trong lòng bàn tay và bông hoa dại |
| 29/11 | Christian Doppler | 1803–1853 | Vật lý | Chân dung | — | Những vòng sóng dồn lại phía trước một đoàn tàu |
| 30/11 | Jagadish Chandra Bose | 1858–1937 | Vật lý | Chân dung | — | Ăng-ten sóng vô tuyến bên một chậu cây |
| 01/12 | Nikolai Lobachevsky | 1792–1856 | Toán học | Chân dung | — | Tam giác trên mặt yên ngựa |
| 02/12 | Georges Seurat | 1859–1891 | Mỹ thuật | Chân dung | — | Bờ sông vẽ bằng hàng nghìn chấm màu |
| 03/12 | Joseph Conrad | 1857–1924 | Văn học | Chân dung | — | Con tàu buồm trên dòng sông rậm rạp |
| 04/12 | Rainer Maria Rilke | 1875–1926 | Văn học | Chân dung | Có | Lá thư và cánh cửa sổ mở |
| 05/12 | Werner Heisenberg | 1901–1976 | Vật lý | Biểu tượng | — | Một hạt nhòe thành đám mây xác suất |
| 06/12 | Joseph Louis Gay-Lussac | 1778–1850 | Hóa học | Chân dung | — | Khinh khí cầu và bình thủy tinh lấy mẫu khí |
| 07/12 | Gian Lorenzo Bernini | 1598–1680 | Mỹ thuật | Chân dung | — | Hàng cột vòng cung của quảng trường |
| 08/12 | Jean Sibelius | 1865–1957 | Âm nhạc | Biểu tượng | — | Rừng thông, mặt hồ và khuông nhạc |
| 09/12 | John Milton | 1608–1674 | Văn học | Chân dung | — | Ngọn nến và trang trường ca |
| 10/12 | Ada Lovelace | 1815–1852 | Toán học | Chân dung | Có | Bánh răng của cỗ máy tính và hoa văn dệt |
| 11/12 | Robert Koch | 1843–1910 | Y học | Chân dung | — | Kính hiển vi và đĩa nuôi cấy |
| 12/12 | Gustave Flaubert | 1821–1880 | Văn học | Chân dung | — | Bàn viết với những trang bị gạch xóa |
| 13/12 | Werner von Siemens | 1816–1892 | Kỹ thuật | Chân dung | — | Máy phát điện và dây điện báo |
| 14/12 | Tycho Brahe | 1546–1601 | Thiên văn | Chân dung | — | Thước đo góc khổng lồ dưới bầu trời sao |
| 15/12 | Gustave Eiffel | 1832–1923 | Kỹ thuật | Chân dung | — | Khung thép đan chéo của một ngọn tháp |
| 16/12 | Jane Austen | 1775–1817 | Văn học | Chân dung | Có | Bàn viết nhỏ và tách trà |
| 17/12 | Humphry Davy | 1778–1829 | Hóa học | Chân dung | — | Pin điện, bình điện phân và đèn mỏ |
| 18/12 | J. J. Thomson | 1856–1940 | Vật lý | Chân dung | — | Ống tia âm cực phát sáng |
| 19/12 | Albert A. Michelson | 1852–1931 | Vật lý | Chân dung | — | Hai chùm sáng giao thoa trên bàn đá |
| — | Nguyễn Trãi | 1380–1442 | Văn học | Biểu tượng | — | Bút lông, nghiên mực và cuộn văn bản chữ Hán |
| — | Hải Thượng Lãn Ông | 1720–1791 | Y học | Biểu tượng | — | Thang thuốc nam, cối giã và sách thuốc |

Cần bổ sung ở các đợt sau: nhiều danh nhân Việt Nam, châu Á, châu Phi, Mỹ Latinh và nữ giới hơn. Mỗi đợt 30–60 nhân vật, người duyệt kiểm lại ngày sinh và câu nói trước khi phát hành.
