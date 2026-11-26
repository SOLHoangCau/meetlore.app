# MeetLore

App kết nối du khách và người bản địa qua Hub. Một bộ mã Expo cho iOS, Android và web; máy chủ dùng Supabase.

Thiết kế đầy đủ: `docs/THIET-KE-SAN-PHAM.md`.

## Xem ngay trên máy tính

```powershell
npm install
npm run web
```

Mở địa chỉ hiện ra, bấm **Xem bản demo**. Không cần tài khoản hay khóa nào; dữ liệu chỉ lưu trên trình duyệt. Khi tự đăng ký trong demo, nhập 6 chữ số bất kỳ ở bước mã email.

Năm tab: Hub, Kết nối, Hành trình, Tin nhắn, Tôi. Sổ tri thức nằm trong trang Hub, Hành trình và Tôi.

Khu quản trị nằm ở tab **Tôi → Khu quản trị**. Nút "Demo: tua nhanh 24 giờ" giúp thử bước Admin duyệt.

## Kiểm tra

```bash
npm test          # matching, điểm, xác minh, chấm Hub
npm run typecheck
npm run test:db   # cần Linux có PostgreSQL 16 và quyền root
```

## Bản thử nghiệm công khai (tối đa 500 người)

Hướng dẫn vận hành đầy đủ: `docs/VAN-HANH-THU-NGHIEM.md`. Tóm tắt:

1. Dự án Supabase đặt tại **Tokyo (ap-northeast-1)**; văn bản pháp lý đã ghi đúng nơi này. Chạy lần lượt `supabase/migrations/*.sql` (đến `0014_save_profile.sql`), rồi `supabase/seed.sql`, `supabase/storage.sql`, `supabase/storage-media.sql`, `supabase/storage-avatars.sql`.
2. Bật xác nhận email, cấu hình SMTP riêng. Ba mẫu email phải hiển thị mã `{{ .Token }}`: **Confirm signup** (đăng ký), **Magic Link** (mã khi đăng nhập trên thiết bị mới) và **Reset Password** (đặt lại mật khẩu). Authentication → URL Configuration: Site URL `https://meetlore.app`.
3. Triển khai `supabase/functions/*`. Đặt bí mật `WEBHOOK_SECRET`. Đặt lịch (Supabase Cron): `send-push` mỗi phút, `maintenance` mỗi giờ, đều gửi header `x-webhook-secret`.
4. Đăng ký 3 tài khoản quản trị trong app, rồi chạy `bootstrap_admin(...)` trong SQL Editor (xem hướng dẫn vận hành).
5. Tạo `.env` từ `.env.example`, điền URL và anon key. Khi có hai biến này, app tự rời chế độ demo. Bản đồ Goong: thêm `EXPO_PUBLIC_GOONG_MAPTILES_KEY` (Maptiles key, không phải API key) vào biến môi trường EAS và Cloudflare Pages; thiếu biến này app dùng sơ đồ vẽ tay.
6. Admin 1 tạo mã mời ở **Tôi → Khu quản trị → Mã mời**, cập nhật tọa độ, giờ Hub và đánh dấu văn bản đồng ý của từng cơ sở.

Công tắc tính năng (Admin 1, mục Thông số): cần mã mời, xác minh bằng ảnh đã che, xác minh tại Hub, đổi điểm, dịch tin nhắn. Dịch tin nhắn và AI sơ duyệt đang tắt.

Nhà tài trợ và "Nhân vật hôm nay": xem `docs/NHAN-VAT-VA-NHA-TAI-TRO.md` (Quản trị → Nhà tài trợ; ảnh tải lên bucket `media`).

Kiểm tra thêm: `npm run test:i18n` (đủ bản dịch 11 ngôn ngữ), `npm run test:db` (194 kiểm tra cơ sở dữ liệu).

Đăng nhập và bản đồ: xem mục 9 và 10 trong `docs/VAN-HANH-THU-NGHIEM.md`.

## Build iPhone nối máy chủ thật

Hồ sơ `testflight` lấy địa chỉ Supabase từ biến môi trường **preview** trên EAS (không lấy từ `.env`, vì `.env` không được tải lên). Hồ sơ `test` không có biến này nên vẫn là bản demo.

## Dự án Expo

Đã nối với `santaclausvietnams-team/trigiao-waylore` trong `app.json`. Logo nằm ở `assets/logo`; muốn dùng logo 2 làm biểu tượng app, chép các tệp `bo-2-*` đè lên tệp cùng tên trong `assets`.

## Build bản phát hành

```powershell
npx eas-cli build --platform ios --profile production
npx eas-cli build --platform android --profile production
```

Cả hai dùng biến môi trường nhóm **production** trên EAS. Android ra tệp .aab cho Google Play; tệp Firebase lấy từ biến kiểu File `GOOGLE_SERVICES_JSON` (xem `app.config.ts`). Các bước nộp lên cửa hàng nằm trong tài liệu "MeetLore: Hồ sơ phát hành App Store và Google Play".

## Không đưa vào mã nguồn

Khóa service role, khóa AI, keystore, ảnh giấy tờ và mọi tệp `.env`.
