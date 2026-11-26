// Văn bản pháp lý: bản tiếng Việt là bản gốc, bản tiếng Anh có giá trị tương đương.
// Đây là DỰ THẢO chờ luật sư rà soát. Nguồn chung: tài liệu "MeetLore: Bộ điều khoản và chính sách (bản gửi luật sư)".
// Cú pháp: "### " tiêu đề mục, "- " gạch đầu dòng, "1. " danh sách số, "> " trích dẫn cam kết.
import type { Locale } from '../i18n';
export type LegalDoc = 'terms' | 'privacy' | 'community' | 'safety' | 'points' | 'content' | 'delete-account' | 'hub-rules';
type Doc = { title: string; body: string };
export const LEGAL_VERSION = '2026-11-19-draft';
export const LEGAL_DRAFT: Record<Locale, string> = {
  vi: 'Dự thảo, đang chờ luật sư rà soát. Phiên bản 19/11/2026.',
  en: 'Draft pending legal review. Version 19 Nov 2026.',
};
export const LEGAL_REFERENCE_NOTE = 'This text is shown in English. A translation in your language is for reference only and has no legal effect.';

const vi: Record<LegalDoc, Doc> = {
  terms: { title: 'Điều khoản sử dụng', body: `Khi tạo tài khoản, bạn đồng ý toàn bộ điều khoản này, Chính sách riêng tư, Quy tắc cộng đồng, Cam kết an toàn và Quy chế điểm. Nếu không đồng ý, vui lòng không sử dụng MeetLore.
### 1. Bên cung cấp
MeetLore do Công ty Cổ phần Dịch vụ Trực tuyến Mosa (mã số thuế 0107945928, Số 28C phố Vạn Bảo, phường Ngọc Hà, TP Hà Nội) vận hành, phối hợp với SantaClaus Vietnam Foundation, sau đây gọi chung là "MeetLore". Tên nhà phát hành trên App Store và Google Play: Santa Claus Vietnam Fdt & Mosa Online Service Joint Stock Company. Liên hệ: hotro@meetlore.app.
### 2. MeetLore là gì và không phải là gì
MeetLore là công cụ giúp du khách và người bản địa tìm nhau để trao đổi tri thức, kỹ năng và ngôn ngữ miễn phí, gặp nhau tại các địa điểm công cộng gọi là Hub.
MeetLore không là:
- dịch vụ lữ hành, hướng dẫn du lịch hay đưa đón;
- dịch vụ hẹn hò, môi giới việc làm, dạy học có thu phí hay giao dịch mua bán;
- bên tổ chức, giám sát hay có mặt tại các buổi gặp giữa người dùng.
Các Hub là cơ sở độc lập đã đồng ý cho người dùng gặp tại đó. MeetLore không sở hữu, không quản lý và không đại diện cho các cơ sở này. Hub gần di tích không có nghĩa MeetLore liên kết với đơn vị quản lý di tích.
### 3. Điều kiện sử dụng
1. Bạn đủ 18 tuổi và có đầy đủ năng lực hành vi dân sự.
2. Bạn chỉ có một tài khoản, dùng thông tin thật của chính mình.
3. Thông tin khai báo, giấy tờ và ảnh cung cấp là đúng, đầy đủ và được cập nhật khi thay đổi.
4. Bạn không thuộc trường hợp bị pháp luật cấm tiếp xúc, làm việc với người khác hoặc đến các khu vực có Hub.
5. Bạn giữ bí mật thông tin đăng nhập và chịu trách nhiệm về mọi hoạt động từ tài khoản của mình.
Khai sai hoặc mạo danh là vi phạm nghiêm trọng, dẫn đến khóa tài khoản và có thể được báo cơ quan có thẩm quyền.
### 4. Xác minh tài khoản
1. Bạn chỉ được kết nối, nhắn tin, hẹn gặp và dùng quyền tại Hub sau khi Admin duyệt. Thời gian chờ tối thiểu là 24 giờ hoặc 48 giờ tùy mức rủi ro; đủ thời gian không có nghĩa là tự động được duyệt.
2. Bạn chọn một trong hai cách: tải ảnh giấy tờ đã được che vùng nhạy cảm trên điện thoại, hoặc đến Hub để người phụ trách đối chiếu trực tiếp. MeetLore có thể tạm tắt một trong hai cách.
3. MeetLore có quyền từ chối, yêu cầu bổ sung hoặc thu hồi kết quả duyệt mà không phải nêu toàn bộ lý do, nếu việc nêu lý do có thể ảnh hưởng đến an toàn của người khác.
4. Xác minh chỉ là đối chiếu thông tin bạn khai với giấy tờ bạn đưa ra. MeetLore không kiểm tra lý lịch tư pháp, không xác nhận giấy tờ với cơ quan nhà nước và không bảo đảm về nhân thân, tính cách, kỹ năng hay hành vi của bất kỳ người dùng nào. Trình độ và nghề nghiệp trên hồ sơ là do người dùng tự khai.
### 5. Nghĩa vụ tuân thủ pháp luật Việt Nam
Khi sử dụng MeetLore và khi gặp người khác qua MeetLore, bạn tự chịu trách nhiệm tuân thủ pháp luật Việt Nam, gồm:
- quy định về an ninh mạng, bảo vệ dữ liệu cá nhân và cung cấp thông tin trên mạng;
- với người nước ngoài: quy định về nhập cảnh, cư trú, khai báo tạm trú, mục đích thị thực và lao động;
- quy định về du lịch: không hành nghề hướng dẫn du lịch hay kinh doanh lữ hành qua MeetLore;
- nội quy của Hub, di tích, bảo tàng, khu dân cư và phong tục của cộng đồng địa phương;
- nghĩa vụ thuế nếu bạn có thu nhập từ hoạt động bên ngoài MeetLore.
Bạn không được dùng MeetLore để làm bất kỳ việc gì mà pháp luật Việt Nam cấm, kể cả việc đó được phép ở quốc gia của bạn.
### 6. Hành vi bị cấm
1. Thu tiền, đề nghị trả công, bán hàng, quảng cáo hoặc dẫn người khác sang giao dịch có trả phí.
2. Quấy rối, đe dọa, phân biệt đối xử, theo dõi hay tiếp cận người khác khi họ đã từ chối.
3. Nội dung hoặc hành vi tình dục, hẹn hò, hoặc bất kỳ nội dung nào liên quan đến người dưới 18 tuổi.
4. Lừa đảo, vay mượn, kêu gọi chuyển tiền, đầu tư, đa cấp.
5. Thu thập, lưu, chia sẻ hoặc công khai thông tin cá nhân, hình ảnh, tin nhắn của người khác khi chưa được họ đồng ý.
6. Giả mạo người khác, tổ chức, cơ quan nhà nước, hoặc tự nhận là đại diện của MeetLore hay của Hub.
7. Đăng nội dung trái pháp luật, xúc phạm cá nhân, tổ chức, cộng đồng dân tộc, tôn giáo, hoặc xâm phạm quyền tác giả.
8. Gian lận điểm: điểm danh hộ, xác nhận sai thời gian, nội dung hay số người, tạo tài khoản phụ.
9. Can thiệp kỹ thuật, thu thập dữ liệu tự động, dò lỗ hổng hoặc vượt giới hạn của hệ thống.
### 7. Bạn tự chịu trách nhiệm về an toàn của mình
1. Việc kết nối, nhắn tin, gặp ai, gặp ở đâu, khi nào và đi cùng ai là quyết định của riêng bạn. Bạn tự đánh giá rủi ro trước mỗi quyết định.
2. Bạn cam kết tuân thủ Cam kết an toàn khi gặp mặt, đặc biệt là gặp lần đầu tại Hub, nơi công cộng, trong giờ Hub mở cửa.
3. Bạn tự lo sức khỏe, phương tiện đi lại, bảo hiểm du lịch, tài sản và chi phí của mình khi tham gia các buổi gặp.
4. Khi có nguy hiểm, hãy gọi ngay 113 (công an), 114 (cứu hỏa), 115 (cấp cứu) trước khi báo cho MeetLore. MeetLore không phải dịch vụ cứu hộ hay khẩn cấp.
### 8. Giới hạn trách nhiệm của MeetLore
1. MeetLore cung cấp dịch vụ miễn phí theo hiện trạng, trong giai đoạn thử nghiệm. Tính năng có thể lỗi, gián đoạn, thay đổi hoặc ngừng.
2. Trong phạm vi pháp luật cho phép, MeetLore không chịu trách nhiệm về: hành vi, lời nói, nội dung của người dùng khác; sự việc xảy ra trong hoặc sau buổi gặp; thiệt hại tại Hub hay do cơ sở đối tác gây ra; thông báo gần Hub đến trễ hoặc không đến; quyết định bạn đưa ra dựa trên thông tin người khác tự khai.
3. MeetLore vẫn chịu trách nhiệm về lỗi của chính mình mà pháp luật không cho phép loại trừ, gồm cả nghĩa vụ bảo vệ dữ liệu cá nhân.
4. Bạn bồi thường cho MeetLore, các Hub và người dùng khác mọi thiệt hại, chi phí phát sinh do bạn vi phạm điều khoản này hoặc pháp luật.
### 9. Xử lý vi phạm
Tùy mức độ, MeetLore có thể cảnh báo, ẩn nội dung, tạm khóa chức năng, khóa tài khoản, hủy điểm có được do gian lận, và cung cấp thông tin cho cơ quan có thẩm quyền khi có yêu cầu hợp lệ hoặc khi cần bảo vệ tính mạng, sức khỏe của người khác. Khi an toàn bị đe dọa, MeetLore có thể khóa tạm thời trước rồi xem xét sau. Bạn có thể khiếu nại qua hotro@meetlore.app trong 30 ngày.
### 10. Thay đổi, chấm dứt
1. MeetLore thông báo trong app ít nhất 7 ngày trước khi thay đổi điều khoản theo hướng bất lợi cho người dùng. Tiếp tục sử dụng sau ngày hiệu lực là đồng ý; nếu không đồng ý, bạn có thể xóa tài khoản.
2. Bạn có thể ngừng sử dụng và xóa tài khoản bất kỳ lúc nào.
### 11. Luật áp dụng và tranh chấp
Điều khoản này theo pháp luật Việt Nam. Tranh chấp được thương lượng trước trong 30 ngày; không thành thì đưa ra Tòa án có thẩm quyền tại Việt Nam. Điều này không làm mất các quyền mà pháp luật bảo vệ người tiêu dùng dành cho bạn.
### 12. Ngôn ngữ
Bản tiếng Việt là bản gốc. Bản tiếng Anh có giá trị tương đương; khi khác nhau, bản tiếng Việt được áp dụng. Bản dịch sang ngôn ngữ khác chỉ để tham khảo.` },
  privacy: { title: 'Chính sách riêng tư', body: `MeetLore chỉ thu dữ liệu cần để kết nối an toàn, không bán dữ liệu và không dùng dữ liệu để quảng cáo. Bên kiểm soát dữ liệu: Công ty Cổ phần Dịch vụ Trực tuyến Mosa, phối hợp với SantaClaus Vietnam Foundation (nhà phát hành trên kho ứng dụng: Santa Claus Vietnam Fdt & Mosa Online Service Joint Stock Company). Liên hệ về dữ liệu cá nhân: hotro@meetlore.app.
### 1. Dữ liệu, mục đích và thời gian lưu
- Email, mật khẩu đã mã hóa: để đăng nhập. Lưu đến khi xóa tài khoản.
- Tên hiển thị, giới thiệu, nghề nghiệp, trình độ, ngôn ngữ, điều muốn cho đi và muốn nhận: để gợi ý kết nối. Người dùng đã duyệt được gợi ý thấy. Lưu đến khi xóa tài khoản.
- Ảnh đại diện (không bắt buộc): để người khác nhận ra bạn khi gặp. Chỉ người đã đăng nhập xem được, qua liên kết hết hạn sau 1 ngày. Bạn gỡ được bất cứ lúc nào; xóa khi xóa tài khoản.
- Ngày sinh, giới tính, quốc gia, tỉnh và phường nơi ở (không số nhà): để kiểm tra đủ 18 tuổi, lọc theo mong muốn gặp, thống kê. Chỉ Admin thấy. Lưu đến khi xóa tài khoản.
- Kế hoạch chuyến đi: để gợi ý người cùng nơi, cùng thời gian. Chỉ bạn thấy; người khác chỉ thấy lý do gợi ý. Lưu đến khi bạn xóa.
- Họ tên, quốc tịch, số điện thoại, loại giấy tờ, 4 số cuối, kết quả duyệt: để xác minh và xử lý sự cố an toàn. Chỉ người duyệt hồ sơ thấy. Lưu đến khi xóa tài khoản, cộng 12 tháng (chờ luật sư xác nhận).
- Ảnh giấy tờ đã che và ảnh chân dung: để xác minh. Người duyệt hồ sơ xem qua liên kết hết hạn sau vài phút, mỗi lần xem được ghi lại. Xóa 30 ngày sau khi có quyết định duyệt.
- Người trợ giúp (tên, quan hệ, số điện thoại): để liên hệ khi khẩn cấp. Admin chỉ mở khi có báo cáo khẩn cấp. Lưu đến khi bạn xóa.
- Tin nhắn: để trò chuyện. Chỉ hai người trong cuộc trò chuyện thấy; Admin chỉ đọc tin nằm trong báo cáo. Lưu đến khi xóa tài khoản; tin trong báo cáo giữ 12 tháng.
- Buổi hẹn, điểm danh, nhận xét: để xác nhận gặp, tính điểm, an toàn. Lưu đến khi xóa tài khoản.
- "Tôi đang ở Hub này": người đã kết nối thấy. Tự tắt sau 2 giờ.
- Sổ điểm, mã ưu đãi: để ghi nhận đóng góp và đổi ưu đãi. Được tách khỏi danh tính khi xóa tài khoản.
- Báo cáo vi phạm: để bảo vệ người dùng. Lưu 12 tháng sau khi đóng vụ việc.
- Nhật ký thao tác của Admin: để kiểm soát truy cập dữ liệu. Lưu 24 tháng.
- Số liệu tổng hợp không tên: để đánh giá hiệu quả Hub. Chỉ công khai khi từ 5 người trở lên.
### 2. Vị trí
- Điện thoại tải danh sách Hub về và tự so sánh để báo khi bạn đến gần. Vị trí không được gửi lên máy chủ.
- Tối đa 1 thông báo gần Hub mỗi ngày, có giờ yên tĩnh. Bạn tắt được bất cứ lúc nào; app vẫn dùng được khi không cấp quyền vị trí.
- MeetLore không lưu vết di chuyển và không hiện khoảng cách hay tọa độ của người khác.
### 3. Ảnh giấy tờ
Nếu bạn chọn tải ảnh, app che bằng khối đặc các phần số giấy tờ (trừ 4 số cuối), mã QR, dòng mã máy đọc, địa chỉ, quê quán và đặc điểm nhận dạng ngay trên điện thoại, xóa thông tin vị trí và thời gian chụp, rồi mới tải lên. Máy chủ không nhận ảnh gốc. Nếu bạn chọn đối chiếu tại Hub, MeetLore không lưu ảnh, chỉ ghi người đối chiếu và thời điểm.
### 4. Nhà cung cấp và chuyển dữ liệu ra nước ngoài
- Supabase: cơ sở dữ liệu, đăng nhập, lưu ảnh. Xử lý tại Tokyo, Nhật Bản.
- Expo, Apple, Google: gửi thông báo đẩy, chỉ gồm nội dung chung, không chứa tin nhắn. Xử lý tại Hoa Kỳ và nơi khác.
- Anthropic (Claude): AI sơ duyệt hồ sơ xác minh như mô tả ở trên. Xử lý tại Hoa Kỳ.
- Resend: gửi email mã xác minh và thông báo. Xử lý tại Hoa Kỳ.
- Cloudflare: tên miền, trang web meetlore.app và chuyển tiếp email hỗ trợ. Xử lý tại Hoa Kỳ và nơi khác.
- Goong: bản đồ trong app. Máy chủ bản đồ nhận địa chỉ IP và vùng bản đồ đang xem, không nhận tài khoản hay vị trí GPS của bạn. Xử lý tại Việt Nam.
AI sơ duyệt hồ sơ xác minh: khi bạn gửi hồ sơ, máy chủ gửi thông tin khai báo (không gồm số điện thoại của bạn và người trợ giúp) cùng ảnh giấy tờ đã che và ảnh chân dung tới dịch vụ AI Claude của Anthropic để đối chiếu và gắn mức rủi ro. AI không duyệt hay từ chối ai; mọi quyết định do Admin là con người đưa ra. Theo điều khoản thương mại của Anthropic, dữ liệu gửi qua API không được dùng để huấn luyện mô hình và được xóa khỏi hệ thống của họ trong khoảng 30 ngày. Dịch tin nhắn đang tắt; khi bật, MeetLore sẽ cập nhật chính sách này.
### 5. Quyền của bạn
Bạn có quyền được biết, đồng ý hoặc rút lại đồng ý, xem, sửa, nhận bản sao, hạn chế xử lý, phản đối xử lý và xóa dữ liệu, khiếu nại và yêu cầu bồi thường theo pháp luật. Hầu hết việc này làm được ngay trong mục Tôi → Quyền riêng tư; việc khác gửi về hotro@meetlore.app. Rút lại đồng ý xác minh hoặc xử lý tài khoản sẽ dừng các chức năng kết nối.
### 6. Bảo mật và sự cố
Dữ liệu được mã hóa khi truyền, phân quyền theo từng vai trò, Admin dùng tài khoản riêng có xác thực 2 lớp. Khi có vi phạm dữ liệu, MeetLore thông báo cơ quan chuyên trách và người bị ảnh hưởng trong thời hạn pháp luật quy định.` },
  community: { title: 'Quy tắc cộng đồng', body: `MeetLore là nơi trao đổi tri thức miễn phí, tôn trọng và an toàn. Vi phạm sẽ bị xử lý theo mục 9 Điều khoản sử dụng.
1. Cho đi trước, không đòi đáp lại. Không thu tiền, không đòi quà, không chào bán.
2. Nói thật về mình. Chỉ khai chuyên môn mà bạn thật sự có.
3. Tôn trọng lời từ chối. Không trả lời cũng là từ chối. Không nhắn dồn, không tìm cách liên hệ ngoài app.
4. Giữ chủ đề là tri thức. Không tán tỉnh, không hỏi chuyện riêng tư khi người kia chưa muốn chia sẻ.
5. Tôn trọng văn hóa. Không chụp ảnh, quay phim người khác khi chưa xin phép, nhất là ở bản làng. Theo nội quy của Hub và cộng đồng.
6. Tri thức cộng đồng có chủ. Ghi rõ nguồn, không đăng tri thức của cộng đồng dân tộc khi chưa có người đại diện đồng ý.
7. Không chia sẻ thông tin của người khác. Tin nhắn, ảnh, số điện thoại của người khác chỉ được dùng khi họ đồng ý.
8. Ghi điểm trung thực. Chỉ điểm danh khi có mặt, chỉ xác nhận đúng thời gian và nội dung.
9. Báo cáo khi thấy sai. Dùng nút Báo cáo hoặc Cần giúp đỡ. Báo cáo sai sự thật để hại người khác cũng là vi phạm.` },
  safety: { title: 'Cam kết an toàn khi gặp mặt', body: `Bạn tự chịu trách nhiệm về an toàn của mình. Trước lần hẹn đầu tiên, app yêu cầu bạn đánh dấu đã đọc và cam kết làm theo các điều dưới đây.
### Trước khi gặp
1. Trò chuyện trong app trước. Không chuyển sang kênh khác cho đến khi bạn thực sự tin tưởng.
2. Không gửi tiền, giấy tờ, mã xác thực, ảnh riêng tư cho bất kỳ ai.
3. Báo cho người thân biết bạn gặp ai, ở Hub nào, lúc mấy giờ.
### Khi gặp
1. Lần đầu chỉ gặp tại Hub, trong giờ Hub mở cửa. Không gặp tại nhà riêng, khách sạn, xe riêng hay nơi vắng người.
2. Tự đi đến và tự về, không nhận đưa đón.
3. Tự giữ đồ uống, giấy tờ, điện thoại và tài sản của mình. Không dùng rượu bia, chất kích thích.
4. Buổi gặp được rời đi bất cứ lúc nào, không cần giải thích.
5. Hoạt động di chuyển ngoài Hub như leo núi, đi bản, đi xe máy không thuộc MeetLore. Nếu bạn tự thỏa thuận với nhau, đó là việc riêng và bạn tự chịu mọi rủi ro.
### Khi có sự cố
1. Gọi ngay 113 (công an), 114 (cứu hỏa), 115 (cấp cứu). Nút Cần giúp đỡ trong app hiện các số này và địa chỉ Hub.
2. Sau đó báo cho MeetLore trong app. Báo cáo khẩn được ưu tiên xử lý trong 2 giờ, từ 7:00 đến 22:00.
3. MeetLore có thể khóa tạm thời tài khoản bị báo cáo và liên hệ người trợ giúp bạn đã khai.
### Cam kết của người dùng
> Tôi đã đọc và cam kết tuân thủ hướng dẫn an toàn. Tôi hiểu MeetLore không tổ chức, không giám sát các buổi gặp và không bảo đảm về hành vi của người khác. Tôi tự quyết định và tự chịu trách nhiệm về an toàn, sức khỏe và tài sản của mình khi gặp người khác, trong phạm vi pháp luật cho phép.` },
  points: { title: 'Quy chế điểm và ưu đãi', body: `Điểm MeetLore ghi nhận tri thức bạn đã chia sẻ và được xác nhận. Điểm không phải tiền, không phải tài sản, không đổi ra tiền, không mua, không nạp và không chuyển cho người khác.
### 1. Cách nhận điểm
- Buổi chia sẻ miễn phí tại Hub: 50 × số người nhận được xác nhận × số giờ được xác nhận; tối đa 600 điểm mỗi buổi. Người phụ trách Hub hoặc người nhận xác nhận.
- Ghi chép tri thức được Admin duyệt: theo thang chấm công khai trong app.
- Việc xây dựng cộng đồng đã xác nhận: do Admin quyết định từ quỹ app.
- Tối đa 1.200 điểm mỗi tháng từ chia sẻ và ghi chép.
- Điểm chờ 30 ngày mới dùng được, để còn thời gian xử lý khiếu nại.
- Điểm hết hạn 24 tháng sau ngày dùng được.
- Không tính điểm cho việc dẫn tham quan, đưa đón hay gặp mặt thông thường.
### 2. Giá trị tham chiếu
100 điểm tương đương 1 giờ chuyên gia. App hiển thị giá trị tham chiếu bằng tiền theo mức lương từng vùng, ví dụ vùng I là 1.442 đồng mỗi điểm, để bạn thấy giá trị mình đã cho đi. Con số này chỉ để tham khảo, không phải cam kết thanh toán hay quy đổi.
### 3. Đổi ưu đãi
1. Ưu đãi do cơ sở đối tác tự đặt và tự tài trợ, dưới dạng phần trăm giảm giá có mức tối đa.
2. Bạn nhận mã, đưa mã khi thanh toán, cơ sở nhập số tiền hóa đơn, app tính số điểm cần dùng, và bạn xác nhận trên điện thoại của mình.
3. Số điểm dùng = số tiền giảm ÷ giá trị tham chiếu mỗi điểm của vùng, làm tròn lên.
4. Một nửa số điểm chuyển cho chủ cơ sở, phần còn lại vào quỹ cộng đồng của app. Chủ cơ sở dùng điểm này ở cơ sở khác, không dùng tại chính cơ sở mình.
5. Mỗi cơ sở tự đặt ngân sách ưu đãi hàng tháng, tối đa 5% doanh thu từ khách MeetLore tháng trước. Hết ngân sách thì ưu đãi tạm ẩn; mã đã cấp vẫn dùng được đến hạn.
6. Ưu đãi, chất lượng hàng hóa, dịch vụ tại cơ sở do cơ sở chịu trách nhiệm.
### 4. Quỹ cộng đồng
Quỹ dùng để ghi nhận việc xây dựng cộng đồng đã được xác nhận. Mỗi tháng chi tối đa 50% số điểm quỹ nhận được. Việc thuê người có trả lương được trả bằng tiền, tách riêng khỏi quỹ điểm.
### 5. Thay đổi và gian lận
- MeetLore có thể điều chỉnh cách tính điểm hoặc ngừng chương trình, báo trước ít nhất 30 ngày. Điểm đã có được giữ đến hết hạn.
- Điểm có được do gian lận bị hủy. Mã ưu đãi đã dùng do gian lận có thể bị thu hồi giá trị.
- Khi xóa tài khoản, điểm chưa dùng bị hủy và không được hoàn lại dưới bất kỳ hình thức nào.` },
  content: { title: 'Giấy phép nội dung của người đóng góp', body: `Bạn giữ quyền tác giả với nội dung mình viết. Khi gửi ghi chép tri thức, bạn cấp cho MeetLore quyền sử dụng như sau.
1. Phạm vi: không độc quyền, miễn phí, trên toàn thế giới, để lưu trữ, hiển thị tại Hub và trên app, web của MeetLore, dịch sang ngôn ngữ khác, chỉnh định dạng và biên tập nhỏ mà không đổi ý.
2. Ghi tên: MeetLore luôn ghi tên bạn, trừ khi bạn chọn ẩn danh. Bản dịch máy được ghi rõ là bản dịch máy.
3. Thời hạn: đến khi bạn gỡ nội dung hoặc xóa tài khoản. MeetLore gỡ trong 30 ngày kể từ khi nhận yêu cầu.
4. Đồng tác giả: nội dung có nhiều người viết chỉ được xuất bản khi tất cả đồng ý.
5. Tri thức cộng đồng: tri thức của cộng đồng dân tộc ghi nguồn là cộng đồng, cần người đại diện đồng ý trước khi xuất bản, và được gỡ khi cộng đồng yêu cầu.
6. Cam đoan: bạn có quyền đăng nội dung, không xâm phạm quyền của người khác, và đã xin phép người xuất hiện trong ảnh hoặc được nhắc tên.
7. Không trả tiền: bạn nhận điểm theo Quy chế điểm, không nhận nhuận bút. MeetLore không bán nội dung của bạn cho bên thứ ba.
8. MeetLore có quyền từ chối, ẩn hoặc gỡ nội dung vi phạm pháp luật hoặc Quy tắc cộng đồng.` },
  'delete-account': { title: 'Xóa tài khoản', body: `Bạn xóa được tài khoản ngay trong app, không cần liên hệ ai.
### Cách gửi yêu cầu
1. Trong app: Tôi → Quyền riêng tư → Xóa tài khoản, nhập lại email để xác nhận.
2. Khi đã gỡ app: trang meetlore.app/xoa-tai-khoan, đăng nhập rồi bấm xóa; hoặc gửi email từ địa chỉ đã đăng ký đến hotro@meetlore.app.
### Sau khi yêu cầu
- Ngay lập tức: tài khoản bị ẩn, không ai tìm thấy hay nhắn tin được; buổi hẹn sắp tới bị hủy; mã ưu đãi chưa dùng bị hủy.
- Trong 7 ngày: bạn đăng nhập lại để hủy yêu cầu nếu đổi ý.
- Sau 7 ngày: xóa vĩnh viễn hồ sơ, ảnh, tin nhắn, kế hoạch chuyến đi, người trợ giúp, ghi chép chưa xuất bản. Ghi chép đã xuất bản bị gỡ, trừ phần của đồng tác giả khác (tên bạn được thay bằng "Người đóng góp đã rời đi").
### Dữ liệu vẫn giữ sau khi xóa
- Kết quả xác minh và báo cáo vi phạm liên quan đến bạn, để xử lý sự cố an toàn và ngăn tài khoản bị khóa đăng ký lại, trong thời hạn ở Chính sách riêng tư.
- Sổ điểm đã tách khỏi danh tính và số liệu tổng hợp không tên.
- Dữ liệu mà pháp luật hoặc cơ quan có thẩm quyền yêu cầu giữ.
Tin nhắn bạn đã gửi sẽ không còn hiển thị với người nhận, trừ tin đã nằm trong báo cáo vi phạm.` },
  'hub-rules': { title: 'Quy tắc dành cho Hub', body: `1. Buổi gặp diễn ra ở khu vực chung, không dùng phòng riêng hay phòng ngủ.
2. Không ép mua hàng; nếu có yêu cầu gọi món hoặc vé vào cửa, phải ghi rõ trên trang Hub.
3. Có người phụ trách trong giờ Hub mở cửa và biết quy trình xử lý sự cố.
4. Cơ sở không mua được thứ hạng và không xem được dữ liệu cá nhân người dùng.
5. Cơ sở ký văn bản đồng ý làm Hub trước khi Hub hoạt động chính thức.` },
};

const en: Record<LegalDoc, Doc> = {
  terms: { title: 'Terms of Use', body: `By creating an account you accept these Terms in full, together with the Privacy Policy, Community Rules, Safety Commitment and Points Rules. If you do not agree, please do not use MeetLore.
### 1. Provider
MeetLore is operated by Mosa Online Service Joint Stock Company (tax code 0107945928, 28C Van Bao Street, Ngoc Ha Ward, Hanoi), in cooperation with SantaClaus Vietnam Foundation, together "MeetLore". Publisher name on the App Store and Google Play: Santa Claus Vietnam Fdt & Mosa Online Service Joint Stock Company. Contact: hotro@meetlore.app.
### 2. What MeetLore is and is not
MeetLore helps travelers and locals find each other to exchange knowledge, skills and languages free of charge, meeting at public places called Hubs.
MeetLore is not:
- a travel agency, tour guiding or transport service;
- a dating, job brokerage, paid tutoring or trading service;
- an organizer or supervisor of, or present at, meetings between users.
Hubs are independent venues that have agreed to let users meet there. MeetLore does not own, manage or represent them. A Hub near a heritage site does not mean MeetLore is affiliated with the site's management.
### 3. Eligibility
1. You are at least 18 and have full legal capacity.
2. You have only one account and use your own real information.
3. Your information, documents and photos are true, complete and kept up to date.
4. You are not prohibited by law from contacting or working with others or from visiting the areas where Hubs are located.
5. You keep your login details secret and are responsible for all activity on your account.
False information or impersonation is a serious violation, leads to account closure and may be reported to the authorities.
### 4. Account verification
1. You can connect, message, plan meetings and use Hub features only after an Admin approves you. The minimum waiting time is 24 or 48 hours depending on risk; reaching that time does not mean automatic approval.
2. You choose one method: upload a document photo with sensitive areas covered on your phone, or have a Hub staff member check your document in person. MeetLore may temporarily disable either method.
3. MeetLore may reject, request more information or withdraw approval without giving every reason where doing so could affect the safety of others.
4. Verification only compares the information you declare with the document you show. MeetLore does not check criminal records, does not confirm documents with state authorities and gives no guarantee about any user's identity, character, skills or behaviour. Qualifications and occupations on profiles are self-declared.
### 5. Compliance with Vietnamese law
When using MeetLore and meeting others through it, you are responsible for complying with Vietnamese law, including:
- rules on cybersecurity, personal data protection and online information;
- for foreigners: rules on entry, residence, temporary residence registration, visa purpose and work;
- tourism rules: you may not work as a tour guide or run a travel business through MeetLore;
- the rules of Hubs, heritage sites, museums, residential areas and the customs of local communities;
- tax obligations for any income you earn outside MeetLore.
You may not use MeetLore for anything prohibited by Vietnamese law, even if it is allowed in your country.
### 6. Prohibited conduct
1. Charging money, asking for payment, selling, advertising or steering others to paid transactions.
2. Harassing, threatening, discriminating against, following or approaching someone who has declined.
3. Sexual content or conduct, dating, or any content involving people under 18.
4. Fraud, borrowing, requests for money transfers, investments or multi-level marketing.
5. Collecting, storing, sharing or publishing other people's personal information, photos or messages without consent.
6. Impersonating others, organizations or authorities, or claiming to represent MeetLore or a Hub.
7. Posting unlawful content, insulting individuals, organizations, ethnic communities or religions, or infringing copyright.
8. Points fraud: checking in for others, confirming false times, content or attendance, creating secondary accounts.
9. Technical interference, automated data collection, probing for vulnerabilities or bypassing system limits.
### 7. You are responsible for your own safety
1. Whether to connect, message or meet someone, where, when and with whom, is your own decision. You assess the risks before each decision.
2. You commit to the Safety Commitment, in particular meeting for the first time at a Hub, in public, during Hub hours.
3. You take care of your own health, transport, travel insurance, belongings and costs when attending meetings.
4. In danger, call 113 (police), 114 (fire) or 115 (ambulance) before reporting to MeetLore. MeetLore is not a rescue or emergency service.
### 8. Limitation of liability
1. MeetLore is a free service provided as is, during a trial period. Features may fail, be interrupted, change or stop.
2. To the extent permitted by law, MeetLore is not liable for: the conduct, words or content of other users; events during or after meetings; damage at Hubs or caused by partner venues; nearby-Hub alerts arriving late or not at all; decisions you make based on information others declare.
3. MeetLore remains liable for its own faults where the law does not allow exclusion, including its personal data protection obligations.
4. You will compensate MeetLore, Hubs and other users for any loss or cost caused by your breach of these Terms or the law.
### 9. Enforcement
Depending on severity, MeetLore may warn, hide content, restrict features, suspend or close accounts, cancel points obtained by fraud, and provide information to the authorities on a valid request or when needed to protect someone's life or health. Where safety is at risk, MeetLore may suspend first and review afterwards. You may appeal to hotro@meetlore.app within 30 days.
### 10. Changes and termination
1. MeetLore will give at least 7 days' notice in the app before changing these Terms to users' disadvantage. Continued use after the effective date means acceptance; if you disagree, you may delete your account.
2. You may stop using MeetLore and delete your account at any time.
### 11. Governing law and disputes
These Terms are governed by Vietnamese law. Disputes are first negotiated for 30 days, then brought before a competent Vietnamese court. This does not remove any consumer rights the law gives you.
### 12. Language
The Vietnamese version is the original. The English version has equivalent effect; if they differ, the Vietnamese version prevails. Translations into other languages are for reference only.` },
  privacy: { title: 'Privacy Policy', body: `MeetLore collects only the data needed for safe connections, never sells data and does not use it for advertising. Data controller: Mosa Online Service Joint Stock Company, in cooperation with SantaClaus Vietnam Foundation (app store publisher: Santa Claus Vietnam Fdt & Mosa Online Service Joint Stock Company). Personal data contact: hotro@meetlore.app.
### 1. Data, purposes and retention
- Email and hashed password: to sign in. Kept until account deletion.
- Display name, introduction, occupation, education, languages, what you offer and want to learn: to suggest connections. Visible to approved users you are matched with. Kept until account deletion.
- Profile photo (optional): so others can recognise you when you meet. Only signed-in members can see it, through links that expire after 1 day. You can remove it at any time; deleted with your account.
- Birth date, gender, country, province and ward of residence (no street address): to check age 18+, apply meeting preferences and produce statistics. Admins only. Kept until account deletion.
- Trip plans: to suggest people in the same place at the same time. Visible only to you; others see only the reason for a suggestion. Kept until you delete them.
- Legal name, nationality, phone, document type, last 4 characters, review outcome: for verification and safety incidents. Reviewers only. Kept until account deletion plus 12 months (pending legal confirmation).
- Covered document photo and portrait: for verification. Reviewers view them through links that expire within minutes; every view is logged. Deleted 30 days after the review decision.
- Emergency helper (name, relationship, phone): to contact in an emergency. Opened by Admins only for an urgent report. Kept until you delete it.
- Messages: for conversations. Visible to the two participants; Admins read only messages included in a report. Kept until account deletion; reported messages kept 12 months.
- Meetings, check-ins, feedback: to confirm meetings, calculate points and for safety. Kept until account deletion.
- "I am at this Hub": visible to people you are connected with. Turns off after 2 hours.
- Points ledger and reward codes: to record contributions and redeem rewards. De-identified on account deletion.
- Reports: to protect users. Kept 12 months after the case is closed.
- Admin action log: to control access to data. Kept 24 months.
- Aggregated anonymous statistics: to evaluate Hubs. Published only for groups of 5 or more.
### 2. Location
- Your phone downloads the list of Hubs and compares locally to alert you when you are nearby. Your location is not sent to our servers.
- At most 1 nearby alert per day, with quiet hours. You can turn it off at any time; the app works without location permission.
- MeetLore does not store movement history and never shows other people's distance or coordinates.
### 3. Document photos
If you choose to upload a photo, the app covers with solid blocks the document number (except the last 4 characters), QR code, machine-readable zone, address, place of origin and identifying marks on your phone, removes location and capture-time metadata, and only then uploads it. Our servers never receive the original photo. If you choose an in-person check at a Hub, no photo is stored; only the checker and time are recorded.
### 4. Providers and transfers abroad
- Supabase: database, sign-in, photo storage. Processed in Tokyo, Japan.
- Expo, Apple, Google: push notifications containing only generic text, never message content. Processed in the United States and elsewhere.
- Anthropic (Claude): AI pre-screening of verification as described above. Processed in the United States.
- Resend: sending verification codes and notices by email. Processed in the United States.
- Cloudflare: domain, the meetlore.app website and forwarding of support email. Processed in the United States and elsewhere.
- Goong: maps in the app. The map server receives your IP address and the map area you view, not your account or GPS location. Processed in Vietnam.
AI pre-screening of verification: when you submit verification, our server sends your declared details (without your or your helper’s phone numbers) together with your covered ID photo and portrait to Anthropic’s Claude AI service to cross-check them and assign a risk level. The AI does not approve or reject anyone; every decision is made by a human Admin. Under Anthropic’s commercial terms, data sent through its API is not used to train models and is deleted from its systems within about 30 days. Message translation is switched off; if enabled, MeetLore will update this policy.
### 5. Your rights
You have the right to be informed, to consent or withdraw consent, to access, correct and receive a copy of your data, to restrict or object to processing, to have data deleted, and to complain and claim compensation under the law. Most of this is available in Me → Privacy; other requests go to hotro@meetlore.app. Withdrawing consent to verification or account processing stops connection features.
### 6. Security and incidents
Data is encrypted in transit and access is role-based; Admins use individual accounts with two-factor authentication. In the event of a data breach, MeetLore will notify the competent authority and affected people within the time required by law.` },
  community: { title: 'Community Rules', body: `MeetLore is a place for free, respectful and safe knowledge exchange. Violations are handled under section 9 of the Terms of Use.
1. Give first, expect nothing back. No charging, no asking for gifts, no selling.
2. Be honest about yourself. Only list expertise you really have.
3. Respect a no. No reply is also a no. Do not message repeatedly or try to make contact outside the app.
4. Keep to knowledge. No flirting, no personal questions the other person has not chosen to discuss.
5. Respect culture. Do not photograph or film people without permission, especially in villages. Follow Hub and community rules.
6. Community knowledge has owners. Credit sources, and do not publish ethnic community knowledge without a representative's consent.
7. Do not share other people's information. Others' messages, photos and phone numbers may be used only with their consent.
8. Record points honestly. Check in only when present; confirm only true times and content.
9. Report what is wrong. Use Report or Get help. Making false reports to harm others is also a violation.` },
  safety: { title: 'Safety Commitment', body: `You are responsible for your own safety. Before your first meeting the app asks you to confirm that you have read and will follow these points.
### Before meeting
1. Talk in the app first. Do not move to another channel until you genuinely trust the person.
2. Never send money, documents, verification codes or private photos to anyone.
3. Tell someone close to you who you are meeting, at which Hub and when.
### When meeting
1. Meet the first time only at a Hub during its opening hours. Never at a private home, hotel, private vehicle or isolated place.
2. Travel there and back on your own; do not accept rides.
3. Keep your own drinks, documents, phone and belongings. No alcohol or drugs.
4. You may leave a meeting at any time without explanation.
5. Activities away from the Hub such as hiking, village visits or motorbike trips are not part of MeetLore. If you arrange them between yourselves, it is a private matter and you bear all risks.
### If something goes wrong
1. Call 113 (police), 114 (fire) or 115 (ambulance) immediately. The Get help button in the app shows these numbers and the Hub address.
2. Then report to MeetLore in the app. Urgent reports are prioritized within 2 hours, between 7:00 and 22:00.
3. MeetLore may temporarily suspend a reported account and contact the emergency helper you named.
### User commitment
> I have read and will follow the safety guidance. I understand MeetLore does not organize or supervise meetings and gives no guarantee about other people's behaviour. I make my own decisions and am responsible for my own safety, health and belongings when meeting others, to the extent permitted by law.` },
  points: { title: 'Points and Rewards Rules', body: `MeetLore points recognize knowledge you have shared that has been confirmed. Points are not money or property; they cannot be cashed out, bought, topped up or transferred to others.
### 1. Earning points
- Free sharing session at a Hub: 50 × confirmed recipients × confirmed hours; up to 600 points per session. Confirmed by Hub staff or recipients.
- Knowledge note approved by an Admin: according to the public scoring rubric in the app.
- Confirmed community-building work: decided by Admins from the app fund.
- Up to 1,200 points per month from sessions and notes.
- Points become usable after 30 days, leaving time to handle disputes.
- Points expire 24 months after becoming usable.
- No points for guiding, transport or ordinary meetings.
### 2. Reference value
100 points equal 1 expert hour. The app shows a reference money value based on regional pay, for example 1,442 VND per point in region I, so you can see the value you have given. This figure is for reference only and is not a promise of payment or exchange.
### 3. Redeeming rewards
1. Rewards are set and funded by partner venues, as a percentage discount with a maximum.
2. You get a code, show it when paying, the venue enters the bill amount, the app calculates the points needed and you confirm on your own phone.
3. Points used = discount ÷ the region's reference value per point, rounded up.
4. Half of the points go to the venue owner and the rest to the app's community fund. Owners use these points at other venues, not at their own.
5. Each venue sets a monthly reward budget of up to 5% of its revenue from MeetLore guests in the previous month. When the budget runs out, the offer is hidden; codes already issued remain valid until they expire.
6. Venues are responsible for their offers and the quality of their goods and services.
### 4. Community fund
The fund recognizes confirmed community-building work. Up to 50% of points received each month may be spent. Paid staff are paid in money, separately from the points fund.
### 5. Changes and fraud
- MeetLore may change how points are calculated or end the programme with at least 30 days' notice. Existing points remain until they expire.
- Points obtained by fraud are cancelled. The value of rewards redeemed by fraud may be recovered.
- When you delete your account, unused points are cancelled and are not refunded in any form.` },
  content: { title: 'Contributor Content Licence', body: `You keep copyright in what you write. When you submit a knowledge note, you grant MeetLore the following rights.
1. Scope: non-exclusive, free, worldwide, to store, display at Hubs and in MeetLore's app and website, translate into other languages, format and lightly edit without changing the meaning.
2. Credit: MeetLore always credits you unless you choose to stay anonymous. Machine translations are labelled as such.
3. Duration: until you remove the content or delete your account. MeetLore removes it within 30 days of your request.
4. Co-authors: content with several authors is published only when all agree.
5. Community knowledge: ethnic community knowledge is credited to the community, needs a representative's consent before publication and is removed at the community's request.
6. Warranty: you have the right to post the content, it does not infringe others' rights, and you have permission from people who appear in photos or are named.
7. No payment: you receive points under the Points Rules, not royalties. MeetLore does not sell your content to third parties.
8. MeetLore may refuse, hide or remove content that breaks the law or the Community Rules.` },
  'delete-account': { title: 'Deleting Your Account', body: `You can delete your account in the app without contacting anyone.
### How to request
1. In the app: Me → Privacy → Delete account, and re-enter your email to confirm.
2. If you have uninstalled the app: go to meetlore.app/xoa-tai-khoan, sign in and delete; or email hotro@meetlore.app from your registered address.
### After your request
- Immediately: your account is hidden, nobody can find or message you, upcoming meetings and unused reward codes are cancelled.
- Within 7 days: sign in again to cancel the request if you change your mind.
- After 7 days: your profile, photos, messages, trip plans, emergency helpers and unpublished notes are permanently deleted. Published notes are removed, except for other co-authors' parts (your name is replaced by "A former contributor").
### Data kept after deletion
- Verification results and reports concerning you, to handle safety incidents and prevent banned users from re-registering, for the periods in the Privacy Policy.
- De-identified points records and anonymous aggregated statistics.
- Data the law or competent authorities require us to keep.
Messages you sent will no longer be shown to recipients, except those already included in a report.` },
  'hub-rules': { title: 'Rules for Hubs', body: `1. Meetings take place in shared areas, never in private rooms or bedrooms.
2. No forced purchases; any order or entry ticket requirement must be shown on the Hub page.
3. A staff member is present during Hub hours and knows the incident procedure.
4. Venues cannot buy ranking and cannot see users' personal data.
5. Venues sign a written agreement before the Hub officially operates.` },
};
export const LEGAL: Record<Locale, Record<LegalDoc, Doc>> = { vi, en };
