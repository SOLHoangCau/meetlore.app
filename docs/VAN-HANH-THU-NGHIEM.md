# Vận hành bản thử nghiệm công khai MeetLore

Áp dụng cho đợt thử nghiệm có mã mời, tối đa 500 người, 5 Hub ở Hà Nội và Sa Pa. Văn bản pháp lý trong app là **dự thảo chờ luật sư**.

## 1. Bên đứng tên

Công ty Cổ phần Dịch vụ Trực tuyến Mosa, mã số thuế 0107945928, Số 28C phố Vạn Bảo, phường Ngọc Hà, TP Hà Nội, phối hợp với SantaClaus Vietnam Foundation. Tên nhà phát hành trên App Store và Google Play: Santa Claus Vietnam Fdt & Mosa Online Service Joint Stock Company (Apple Team ID MF396VKW87). Email về dữ liệu cá nhân: hotro@meetlore.app (cần tên miền meetlore.app và hộp thư chạy thật trước khi gửi duyệt cửa hàng).

## 2. Ba tài khoản quản trị

Mỗi tài khoản gắn với đúng một người, bật xác thực 2 lớp cho email, không dùng chung mật khẩu.

| Tài khoản | Vai trò trong hệ thống | Việc |
| --- | --- | --- |
| Quản trị MeetLore 1 | admin, verifier, moderator, content_reviewer | Toàn quyền: Hub, mã mời, công tắc, quỹ, thống kê |
| Quản trị MeetLore 2 | verifier | Duyệt hồ sơ, đối chiếu tại Hub |
| Quản trị MeetLore 3 | moderator, content_reviewer | Xử lý báo cáo, duyệt ghi chép |

Cách cấp quyền: từng người đăng ký tài khoản trong app bằng email của mình và xác nhận email. Sau đó chạy trong Supabase SQL Editor (thay email thật):

```sql
select bootstrap_admin('email-quan-tri-1@...', array['admin','verifier','moderator','content_reviewer'], 'Quản trị MeetLore 1');
select bootstrap_admin('email-quan-tri-2@...', array['verifier'], 'Quản trị MeetLore 2');
select bootstrap_admin('email-quan-tri-3@...', array['moderator','content_reviewer'], 'Quản trị MeetLore 3');
```

Tài khoản quản trị không xuất hiện trong gợi ý kết nối và không tính vào giới hạn 500 người.

## 3. Người phụ trách Hub đối chiếu giấy tờ

Thêm người phụ trách vào bảng `hub_operators` (hub_id, user_id). Họ thấy mục **Đối chiếu giấy tờ tại Hub** ở tab Tôi. Họ chỉ xem giấy tờ tận mắt, không chụp, không giữ.

## 4. Mở Hub

Năm Hub được nạp ở trạng thái **Đang chuẩn bị**: ai cũng thấy và đăng ký làm người bản địa được, nhưng chưa bật "Tôi đang ở Hub", chưa báo khi đến gần. Admin 1 chuyển sang **Đang hoạt động** khi đủ điều kiện hệ thống kiểm tra: ít nhất 10 người bản địa sẵn sàng, 5 ghi chép đã duyệt, đã thử thông báo trên iPhone và Android, có số liên hệ an toàn. Chuyển trạng thái bằng SQL Editor khi đăng nhập quyền Admin, hoặc qua bảng `hubs` trên Supabase.

## 5. Thời hạn xử lý

| Việc | Thời hạn |
| --- | --- |
| Duyệt hồ sơ | Sớm nhất sau 24 giờ (rủi ro thấp) hoặc 48 giờ; xử lý trong 24 giờ tiếp theo |
| Báo cáo khẩn | Trong 2 giờ, từ 7:00 đến 22:00 |
| Báo cáo thường | Trong 48 giờ |
| Gỡ nội dung theo yêu cầu tác giả | Trong 30 ngày |

Không có AI sơ duyệt, nên mọi hồ sơ mặc định chờ 48 giờ. Người duyệt có thể hạ xuống rủi ro thấp (24 giờ) khi hồ sơ đầy đủ, khớp; việc này được ghi lại.

## 6. Tác vụ tự động

| Hàm | Lịch | Việc |
| --- | --- | --- |
| `send-push` | Mỗi phút | Gửi thông báo đẩy. Nội dung chỉ là câu chung, không chứa tin nhắn |
| `maintenance` | Mỗi giờ | Xóa ảnh xác minh 30 ngày sau quyết định, xóa tài khoản hết 7 ngày chờ, mở khóa tạm hết hạn |

## 7. Trước khi gửi duyệt App Store, Google Play

- [ ] Tên miền meetlore.app, hộp thư hotro@meetlore.app, trang meetlore.app/xoa-tai-khoan chạy được
- [ ] Văn bản đồng ý của 5 cơ sở làm Hub, đánh dấu trong Khu quản trị → Hub
- [ ] Tọa độ và giờ Hub đã cập nhật tại chỗ
- [ ] Luật sư duyệt bộ văn bản; cập nhật `src/data/legal.ts` và bỏ nhãn dự thảo
- [ ] Google Play: tờ khai vị trí nền kèm video, phần An toàn dữ liệu
- [ ] Tài khoản demo cho người duyệt cửa hàng
- [ ] Thử thông báo gần Hub trên iPhone và Android tại chỗ

## 8. Giới hạn đã biết

- Mẫu che giấy tờ dựa trên vị trí tương đối; người dùng tự xem lại và che thêm. Cần thử với thẻ căn cước thật và hộ chiếu nhiều nước.
- Bản dịch 9 ngôn ngữ ngoài tiếng Việt và tiếng Anh là bản dịch có máy hỗ trợ, chờ người bản ngữ rà soát. Màn hình dành cho Admin và cơ sở đăng ký Hub hiển thị tiếng Anh ở các ngôn ngữ đó.
- Nội dung Hub và chủ đề chỉ có tiếng Việt và tiếng Anh.
- Thông báo đẩy chưa chạy trên web.
- Khóa Face ID/vân tay chỉ có trên iPhone và Android. Trên web, phiên đăng nhập giữ 180 ngày trong trình duyệt.

## 9. Đăng nhập

- Người dùng đăng nhập một lần. Phiên lưu trong Keychain (iPhone) hoặc Keystore (Android) qua SecureStore; trên web lưu trong trình duyệt.
- Phiên tự giữ **180 ngày** kể từ lần xác thực gần nhất. Hết hạn thì app đăng xuất trên thiết bị đó và hỏi lại mật khẩu.
- Tùy chọn **Khóa app bằng Face ID, vân tay hoặc mã máy** (Tôi → Quyền riêng tư). Khi bật, app hỏi lúc mở và khi quay lại sau 5 phút ở nền; mỗi lần mở khóa thành công tính là một lần xác thực, nên phiên không bị cắt ở mốc 180 ngày.
- Mã 6 số qua email chỉ dùng khi đăng ký, đặt lại mật khẩu và lần đầu đăng nhập trên một thiết bị mới.
- Tự điền mật khẩu (iCloud Keychain, Google Password Manager): cần tệp `public/.well-known/apple-app-site-association` và `assetlinks.json` trên meetlore.app. Team ID `MF396VKW87` đã điền trong tệp Apple; trong assetlinks.json thay hai dấu vân tay SHA-256: khóa ký của Google Play (Play Console → App integrity) và khóa upload (EAS → Credentials). Tệp `public/_headers` cho Cloudflare Pages trả hai tệp này dạng JSON. Hai tệp này không chứa bí mật.
- Đăng xuất chỉ thoát thiết bị đang dùng, không thoát các thiết bị khác.

## 10. Tên miền, bản đồ, nhân vật hôm nay

- **Tên miền**: mua meetlore.app (chính) và meetlore.org qua Cloudflare Registrar. Hai Cloudflare Worker (gói miễn phí) cùng nối repo SOLHoangCau/meetlore.app, biến build `NODE_VERSION=22`. Lệnh deploy: `npx wrangler deploy --config wrangler.site.jsonc` cho trang giới thiệu, `npx wrangler deploy --config wrangler.app.jsonc` cho app web:
  - **meetlore.app** (trang giới thiệu, Hub, Cộng đồng, Đối tác, Liên hệ, văn bản pháp lý vi/en): build `npm run build:site`, thư mục `site-dist`. Thêm `EXPO_PUBLIC_SUPABASE_URL` để trang Cộng đồng hiện ảnh nhân vật. Tệp `.well-known` và `_redirects` nằm ở đây; các đường dẫn của app (/h, /k, /invite, /auth, /partner…) chuyển sang app.meetlore.app.
  - **app.meetlore.app** (bản web của app): build `npm run build:web`, thư mục `dist`, ba biến `EXPO_PUBLIC_…`.
  Supabase → Authentication → URL Configuration: thêm `https://app.meetlore.app/**` vào Redirect URLs.
  Privacy Policy URL cho Apple và Google: `https://meetlore.app/privacy`; Support URL: `https://meetlore.app/contact`; trang xóa tài khoản cho Google Play: `https://meetlore.app/delete-account`. meetlore.org chuyển hướng 301 về meetlore.app bằng Redirect Rule. Hộp thư hotro@meetlore.app dùng Cloudflare Email Routing chuyển về hộp thư có sẵn; gửi email tự động của Supabase cần SMTP riêng.
- **Tên Hub**: "TriGiao Hub – <địa danh>". TriGiao Hub là điểm gặp của MeetLore tại Việt Nam; trang Hub có dòng giải thích này.
- **Bản đồ Goong**: tạo 2 khóa trên account.goong.io, ví dụ `meetlore-maptiles` (Maptiles key, cho bản đồ) và `meetlore-api` (API key, chưa dùng). Giới hạn khóa theo tên miền meetlore.app và theo app `app.meetlore`. Gói miễn phí của Goong giới hạn khoảng 1.000 lượt tải bản đồ mỗi tháng; theo dõi trong trang Thống kê của Goong. Nút **Chỉ đường** mở Google Maps (iPhone hỏi Apple Maps hay Google Maps), không tốn khóa.
- **Nhân vật hôm nay**: dữ liệu trong bảng `daily_figures`, mặc định **tắt**. Admin 1 bật từ ngày 01/12 trong Khu quản trị → Nhân vật hôm nay. Cập nhật bằng CSV (mẫu: `supabase/daily-figures.csv`, hoặc nút Tải tệp mẫu trong app); có thể nhập thẳng bằng Supabase Table Editor → Import data from CSV. App lấy dữ liệu mới trong vòng 12 giờ; mất mạng thì dùng bản lưu trên máy hoặc bản đi kèm app.
- Ảnh 11 nhân vật 20–31/12 (đợt 2) đã xong, tải lên bucket `media/figures`. Đã bỏ tiêu đề, chú thích và vết màu đỏ cho cùng phong cách đợt 1; ảnh Rickey và Matisse đã xóa hình người (mất sau 1950). Kipling được đánh dấu gây tranh cãi trong cột `note`; có thể đặt `active` = false trước ngày 30/12 nếu không muốn hiện.
