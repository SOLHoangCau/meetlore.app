// Danh mục dùng chung cho app và cho file seed.sql (sinh bằng scripts/generate-seed.ts).
export type Domain = { id: string; vi: string; en: string };
export type Topic = { id: string; domain: string; vi: string; en: string };
export type LanguageInfo = { code: string; native: string; english: string; ui: boolean };
export type HubSeed = {
  id?: string; slug: string; region: string; level: 'open' | 'partner'; wageRegion: 1 | 2 | 3 | 4; lat: number; lng: number; radius: number;
  vi: { name: string; summary: string; story: string; meeting: string; hours?: string; entry?: string };
  en: { name: string; summary: string; story: string; meeting: string; hours?: string; entry?: string };
  topics: string[];
  venue?: string; ticket?: boolean; agreement?: boolean; status?: 'preparing' | 'active';
};

export const LANGUAGES: LanguageInfo[] = [
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese', ui: true },
  { code: 'en', native: 'English', english: 'English', ui: true },
  { code: 'zh-Hans', native: '简体中文', english: 'Chinese (Simplified)', ui: false },
  { code: 'zh-Hant', native: '繁體中文', english: 'Chinese (Traditional)', ui: false },
  { code: 'ko', native: '한국어', english: 'Korean', ui: false },
  { code: 'ru', native: 'Русский', english: 'Russian', ui: false },
  { code: 'ja', native: '日本語', english: 'Japanese', ui: false },
  { code: 'fr', native: 'Français', english: 'French', ui: false },
  { code: 'de', native: 'Deutsch', english: 'German', ui: false },
  { code: 'es', native: 'Español', english: 'Spanish', ui: false },
  { code: 'pt-BR', native: 'Português (Brasil)', english: 'Portuguese (Brazil)', ui: false },
  { code: 'hmn', native: "Hmoob / H'Mông", english: 'Hmong', ui: false },
  { code: 'th', native: 'ไทย', english: 'Thai', ui: false },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian', ui: false },
  { code: 'km', native: 'ខ្មែរ', english: 'Khmer', ui: false },
  { code: 'lo', native: 'ລາວ', english: 'Lao', ui: false },
];

export const DOMAINS: Domain[] = [
  { id: 'history', vi: 'Lịch sử, di sản', en: 'History & heritage' },
  { id: 'craft', vi: 'Nghề thủ công', en: 'Crafts' },
  { id: 'food', vi: 'Ẩm thực, nông sản', en: 'Food & farming' },
  { id: 'language', vi: 'Ngôn ngữ, chữ viết', en: 'Language & writing' },
  { id: 'arts', vi: 'Nghệ thuật, âm nhạc', en: 'Arts & music' },
  { id: 'nature', vi: 'Thiên nhiên, sinh thái', en: 'Nature & ecology' },
  { id: 'community', vi: 'Đời sống cộng đồng', en: 'Community life' },
  { id: 'belief', vi: 'Tín ngưỡng, lễ hội', en: 'Beliefs & festivals' },
  { id: 'work', vi: 'Nghề nghiệp, khởi nghiệp', en: 'Work & enterprise' },
  { id: 'science', vi: 'Khoa học, công nghệ', en: 'Science & technology' },
  { id: 'health', vi: 'Sức khỏe, y học cổ truyền', en: 'Health & traditional medicine' },
  { id: 'engineering', vi: 'Kỹ thuật', en: 'Engineering' },
  { id: 'technology', vi: 'Công nghệ', en: 'Technology' },
  { id: 'business', vi: 'Kinh doanh, marketing', en: 'Business & marketing' },
  { id: 'research', vi: 'Nghiên cứu', en: 'Research' },
  { id: 'agriculture', vi: 'Nông nghiệp, môi trường', en: 'Agriculture & environment' },
  { id: 'education', vi: 'Giáo dục, học tập', en: 'Education & learning' },
];

const t = (id: string, domain: string, vi: string, en: string): Topic => ({ id, domain, vi, en });
export const TOPICS: Topic[] = [
  t('confucian-exam', 'history', 'Khoa cử, Nho học', 'Imperial exams & Confucian learning'),
  t('old-quarter-history', 'history', 'Lịch sử phố cổ', 'Old Quarter history'),
  t('architecture', 'history', 'Kiến trúc truyền thống', 'Traditional architecture'),
  t('family-history', 'history', 'Ký ức gia đình, làng xã', 'Family & village memory'),
  t('indigo-dyeing', 'craft', 'Nhuộm chàm', 'Indigo dyeing'),
  t('weaving', 'craft', 'Dệt thổ cẩm', 'Brocade weaving'),
  t('batik', 'craft', 'Vẽ sáp ong', 'Beeswax batik'),
  t('silversmith', 'craft', 'Chạm bạc', 'Silversmithing'),
  t('ceramics', 'craft', 'Gốm', 'Ceramics'),
  t('calligraphy', 'craft', 'Thư pháp', 'Calligraphy'),
  t('street-food', 'food', 'Món ăn đường phố', 'Street food'),
  t('coffee', 'food', 'Cà phê', 'Coffee culture'),
  t('terraced-rice', 'food', 'Lúa ruộng bậc thang', 'Terraced rice farming'),
  t('forest-herbs', 'food', 'Thảo dược, rau rừng', 'Forest herbs & greens'),
  t('fermentation', 'food', 'Men, rượu, đồ lên men', 'Fermentation'),
  t('vietnamese-language', 'language', 'Tiếng Việt', 'Vietnamese language'),
  t('han-nom', 'language', 'Chữ Hán Nôm', 'Han-Nom script'),
  t('ethnic-language', 'language', 'Tiếng dân tộc', 'Ethnic minority languages'),
  t('translation', 'language', 'Dịch thuật', 'Translation'),
  t('folk-music', 'arts', 'Âm nhạc dân gian', 'Folk music'),
  t('photography', 'arts', 'Nhiếp ảnh', 'Photography'),
  t('painting', 'arts', 'Hội họa', 'Painting'),
  t('storytelling', 'arts', 'Kể chuyện, viết', 'Storytelling & writing'),
  t('birds-forest', 'nature', 'Rừng và chim', 'Forests & birds'),
  t('climate-local', 'nature', 'Thích ứng khí hậu', 'Local climate adaptation'),
  t('lake-ecology', 'nature', 'Sinh thái hồ đô thị', 'Urban lake ecology'),
  t('village-life', 'community', 'Đời sống bản làng', 'Village life'),
  t('urban-life', 'community', 'Đời sống đô thị', 'City life'),
  t('family-customs', 'community', 'Phong tục gia đình', 'Family customs'),
  t('festivals', 'belief', 'Lễ hội', 'Festivals'),
  t('ancestor-worship', 'belief', 'Thờ cúng tổ tiên', 'Ancestor worship'),
  t('small-business', 'work', 'Kinh doanh nhỏ', 'Small business'),
  t('design', 'work', 'Thiết kế', 'Design'),
  t('career-abroad', 'work', 'Học và làm việc ở nước ngoài', 'Studying & working abroad'),
  t('software', 'science', 'Phần mềm', 'Software'),
  t('engineering', 'science', 'Kỹ thuật', 'Engineering'),
  t('traditional-medicine', 'health', 'Y học cổ truyền', 'Traditional medicine'),
  t('teaching', 'education', 'Phương pháp dạy học', 'Teaching methods'),
  t('language-teaching', 'education', 'Dạy ngoại ngữ', 'Language teaching'),
  t('mechanical-engineering', 'engineering', 'Kỹ sư cơ khí', 'Mechanical engineering'),
  t('electrical-engineering', 'engineering', 'Kỹ sư điện', 'Electrical engineering'),
  t('electronics-engineering', 'engineering', 'Kỹ sư điện tử', 'Electronics engineering'),
  t('civil-engineering', 'engineering', 'Kỹ sư xây dựng', 'Civil engineering'),
  t('programming', 'technology', 'Lập trình', 'Programming'),
  t('data', 'technology', 'Dữ liệu', 'Data'),
  t('artificial-intelligence', 'technology', 'Trí tuệ nhân tạo', 'Artificial intelligence'),
  t('cybersecurity', 'technology', 'An toàn thông tin', 'Cybersecurity'),
  t('marketing', 'business', 'Marketing', 'Marketing'),
  t('sales', 'business', 'Bán hàng', 'Sales'),
  t('finance', 'business', 'Tài chính', 'Finance'),
  t('startup', 'business', 'Khởi nghiệp', 'Startups'),
  t('hospitality', 'business', 'Du lịch, khách sạn', 'Tourism & hospitality'),
  t('research-methods', 'research', 'Phương pháp nghiên cứu', 'Research methods'),
  t('academic-writing', 'research', 'Viết học thuật', 'Academic writing'),
  t('crop-farming', 'agriculture', 'Canh tác', 'Crop farming'),
  t('food-processing', 'agriculture', 'Chế biến nông sản', 'Food processing'),
  t('conservation', 'agriculture', 'Bảo tồn', 'Conservation'),
];

// Năm Hub đợt thử nghiệm. Tọa độ đọc từ bản đồ người sáng lập gửi, Admin cập nhật lại tại chỗ.
// agreement=false: chưa có văn bản đồng ý của cơ sở. Phải có trước khi gửi duyệt lên App Store, Google Play.
export const HUBS: HubSeed[] = [
  {
    slug: 'ho-guom', region: 'vn-hanoi', level: 'partner', wageRegion: 1, lat: 21.02648, lng: 105.85142, radius: 150,
    venue: 'Conifer Bốn Mùa - Four Seasons', ticket: false, agreement: false,
    vi: { name: 'TriGiao Hub – Hồ Hoàn Kiếm', summary: 'Phố nghề, quán nhỏ và những câu chuyện của người sống quanh hồ.', story: 'Mỗi con phố giữ một phần ký ức về nghề và về cách người Hà Nội sống cùng nhau.', meeting: 'Quán Conifer Bốn Mùa - Four Seasons, ven hồ Hoàn Kiếm.', hours: 'Giờ Hub đang cập nhật' },
    en: { name: 'TriGiao Hub – Hoan Kiem Lake', summary: 'Craft streets, small cafés and stories from people who live around the lake.', story: 'Each street keeps a piece of memory about trades and about how Hanoians live together.', meeting: 'Conifer Bốn Mùa - Four Seasons café, by Hoan Kiem Lake.', hours: 'Hub hours to be announced' },
    topics: ['old-quarter-history', 'street-food', 'coffee', 'urban-life', 'lake-ecology', 'marketing', 'startup'],
  },
  {
    slug: 'van-mieu', region: 'vn-hanoi', level: 'partner', wageRegion: 1, lat: 21.03038, lng: 105.83556, radius: 200,
    venue: 'Bảo tàng Mỹ thuật Việt Nam, tầng 5', ticket: true, agreement: false,
    vi: { name: 'TriGiao Hub – Văn Miếu Quốc Tử Giám', summary: 'Nơi gặp nhau để nói về học vấn, mỹ thuật, chữ nghĩa và cách người Việt trọng tri thức.', story: 'Ngay cạnh Văn Miếu, Hub đặt tại tầng 5 Bảo tàng Mỹ thuật Việt Nam. Hub không liên kết với đơn vị quản lý di tích Văn Miếu.', meeting: 'Tầng 5, Bảo tàng Mỹ thuật Việt Nam.', hours: 'Theo giờ mở cửa của bảo tàng', entry: 'Có thể cần vé vào bảo tàng.' },
    en: { name: 'TriGiao Hub – Van Mieu Quoc Tu Giam', summary: 'A place to talk about learning, fine arts, script and how Vietnam honors knowledge.', story: 'Next to the Temple of Literature, this Hub is on the 5th floor of the Vietnam National Fine Arts Museum. It is not affiliated with the Temple of Literature management.', meeting: '5th floor, Vietnam National Fine Arts Museum.', hours: 'Museum opening hours', entry: 'A museum ticket may be required.' },
    topics: ['confucian-exam', 'han-nom', 'calligraphy', 'vietnamese-language', 'teaching', 'programming', 'research-methods'],
  },
  {
    slug: 'sa-pa', region: 'vn-laocai', level: 'partner', wageRegion: 3, lat: 22.33573, lng: 103.839, radius: 200,
    venue: 'Trung tâm Văn hóa thị xã Sa Pa', ticket: false, agreement: false,
    vi: { name: 'TriGiao Hub – Trung tâm Sa Pa', summary: 'Điểm hẹn đầu tiên để làm quen trước khi xuống bản.', story: 'Nơi nhiều dân tộc, nhiều thế hệ và nhiều cách làm du lịch gặp nhau.', meeting: 'Trung tâm Văn hóa thị xã Sa Pa.', hours: 'Giờ Hub đang cập nhật' },
    en: { name: 'TriGiao Hub – Sa Pa Center', summary: 'A first meeting point before heading to the villages.', story: 'Many peoples, generations and ways of hosting visitors meet here.', meeting: 'Sa Pa Town Cultural Center.', hours: 'Hub hours to be announced' },
    topics: ['ethnic-language', 'climate-local', 'forest-herbs', 'village-life', 'hospitality', 'marketing'],
  },
  {
    slug: 'cat-cat', region: 'vn-laocai', level: 'partner', wageRegion: 3, lat: 22.32936, lng: 103.83012, radius: 250,
    venue: 'Cà phê view Cát Cát', ticket: true, agreement: false,
    vi: { name: 'TriGiao Hub – Cát Cát', summary: "Nghề dệt, nhuộm chàm và đời sống của người H'Mông.", story: 'Tri thức của cộng đồng chỉ được đăng khi người đại diện cộng đồng đồng ý.', meeting: 'Cà phê view Cát Cát.', hours: 'Giờ Hub đang cập nhật', entry: 'Có thể cần vé vào bản Cát Cát.' },
    en: { name: 'TriGiao Hub – Cat Cat', summary: 'Weaving, indigo dyeing and Hmong daily life.', story: 'Community knowledge is published only with the consent of community representatives.', meeting: 'Cà phê view Cát Cát.', hours: 'Hub hours to be announced', entry: 'A Cat Cat village ticket may be required.' },
    topics: ['indigo-dyeing', 'weaving', 'batik', 'silversmith', 'ethnic-language'],
  },
  {
    slug: 'ta-van', region: 'vn-laocai', level: 'partner', wageRegion: 3, lat: 22.31579, lng: 103.84978, radius: 300,
    venue: 'Lúa Cafe Sapa', ticket: false, agreement: false,
    vi: { name: 'TriGiao Hub – Tả Van', summary: 'Ruộng bậc thang, nhà cộng đồng và tri thức canh tác vùng cao.', story: 'Mùa vụ, nước và rừng là những bài học được truyền qua nhiều đời. Tri thức của cộng đồng chỉ được đăng khi người đại diện đồng ý.', meeting: 'Lúa Cafe Sapa, thung lũng Mường Hoa.', hours: 'Giờ Hub đang cập nhật' },
    en: { name: 'TriGiao Hub – Ta Van', summary: 'Rice terraces, community houses and upland farming knowledge.', story: 'Seasons, water and forest are lessons passed down through generations. Community knowledge is published only with representatives’ consent.', meeting: 'Lúa Cafe Sapa, Muong Hoa valley.', hours: 'Hub hours to be announced' },
    topics: ['terraced-rice', 'forest-herbs', 'village-life', 'family-customs'],
  },
];

export const COUNTRIES = [
  ['VN', 'Việt Nam', 'Vietnam', 1, 21.2, 2025, 'ASEAN Secretariat qua VNAT', ['vi']],
  ['MY', 'Malaysia', 'Malaysia', 3, 42, 2025, 'ASEAN Secretariat qua VNAT', ['ms', 'en', 'zh-Hans']],
  ['TH', 'Thái Lan', 'Thailand', 3, 33, 2025, 'ASEAN Secretariat qua VNAT', ['th']],
  ['SG', 'Singapore', 'Singapore', 4, 16.9, 2025, 'SeasiaStats', ['en', 'zh-Hans']],
  ['ID', 'Indonesia', 'Indonesia', 3, 15.4, 2025, 'SeasiaStats', ['id']],
  ['PH', 'Philippines', 'Philippines', 4, 6.5, 2025, 'SeasiaStats', ['en']],
  ['LA', 'Lào', 'Laos', 3, 4.6, 2025, 'SeasiaStats', ['lo']],
  ['KH', 'Campuchia', 'Cambodia', 3, null, null, null, ['km']],
  ['JP', 'Nhật Bản', 'Japan', 5, null, null, null, ['ja']],
  ['KR', 'Hàn Quốc', 'South Korea', 5, null, null, null, ['ko']],
  ['TW', 'Đài Loan', 'Taiwan', 5, null, null, null, ['zh-Hant']],
  ['IN', 'Ấn Độ', 'India', 5, null, null, null, ['hi', 'en']],
] as const;

// wave: 1 thí điểm, 2 Việt Nam mở rộng, 3 Đông Nam Á gần, 4 Đông Nam Á đô thị, 5 châu Á.
export const DESTINATIONS = [
  ['vn-hanoi', 'VN', 'Hà Nội', 21.03, 105.85, 1, 'Sinh viên đông, di sản học vấn', null, null, null],
  ['vn-sapa', 'VN', 'Sa Pa', 22.34, 103.84, 1, 'Tri thức bản địa, cộng đồng dân tộc', null, null, null],
  ['vn-hoian', 'VN', 'Hội An', 15.88, 108.33, 2, 'Làng nghề và phố cổ, gần Đà Nẵng', null, null, null],
  ['vn-danang', 'VN', 'Đà Nẵng', 16.05, 108.21, 2, 'Lượng khách quốc tế rất lớn, nhiều trường đại học', 17.3, 7.6, '2025'],
  ['vn-hue', 'VN', 'Huế', 16.46, 107.59, 2, 'Di sản cung đình, Hán Nôm, làng nghề', 2.6, 1.13, '4 tháng đầu 2026'],
  ['vn-ninhbinh', 'VN', 'Ninh Bình', 20.25, 105.97, 2, 'Lượng khách tăng mạnh, cố đô, làng quê', 19.4, 2.2, '2025'],
  ['vn-hcm', 'VN', 'TP. Hồ Chí Minh', 10.78, 106.7, 2, 'Nguồn sinh viên và người đi làm lớn nhất', null, null, null],
  ['vn-dongvan', 'VN', 'Đồng Văn', 23.28, 105.36, 2, 'Cao nguyên đá, cần người kết nối cộng đồng', null, null, null],
  ['la-luangprabang', 'LA', 'Luang Prabang', 19.89, 102.13, 3, 'Di sản, nghề dệt, gần về văn hóa', null, null, null],
  ['kh-siemreap', 'KH', 'Siem Reap', 13.36, 103.86, 3, 'Di sản, nghề truyền thống', null, null, null],
  ['th-chiangmai', 'TH', 'Chiang Mai', 18.79, 98.99, 3, 'Thủ công, đại học, người làm việc từ xa', null, null, null],
  ['id-yogyakarta', 'ID', 'Yogyakarta', -7.8, 110.36, 3, 'Thành phố đại học, batik', null, null, null],
  ['my-georgetown', 'MY', 'George Town', 5.41, 100.34, 3, 'Di sản đa văn hóa', null, null, null],
  ['sg-singapore', 'SG', 'Singapore', 1.29, 103.85, 4, 'Trung tâm trung chuyển, đa ngôn ngữ', null, null, null],
  ['ph-vigan', 'PH', 'Vigan', 17.57, 120.39, 4, 'Phố cổ, nghề dệt', null, null, null],
  ['jp-kyoto', 'JP', 'Kyoto', 35.01, 135.77, 5, 'Nghề truyền thống, đại học', null, null, null],
  ['kr-jeonju', 'KR', 'Jeonju', 35.82, 127.15, 5, 'Làng hanok, ẩm thực, giấy truyền thống', null, null, null],
  ['tw-tainan', 'TW', 'Đài Nam', 22.99, 120.2, 5, 'Phố cổ, tín ngưỡng dân gian', null, null, null],
  ['in-varanasi', 'IN', 'Varanasi', 25.32, 83, 5, 'Dệt lụa, học thuật truyền thống', null, null, null],
] as const;

export const CANDIDATES = [
  ['vn-hoian', 'Phố cổ Hội An', 'heritage', 'partner'], ['vn-hoian', 'Làng gốm Thanh Hà', 'craft_workshop', 'partner'],
  ['vn-danang', 'Bảo tàng Điêu khắc Chăm', 'museum', 'open'], ['vn-danang', 'Làng đá Non Nước', 'village', 'partner'],
  ['vn-hue', 'Đại Nội Huế', 'heritage', 'open'], ['vn-hue', 'Làng hương Thủy Xuân', 'village', 'partner'],
  ['vn-ninhbinh', 'Cố đô Hoa Lư', 'heritage', 'open'], ['vn-ninhbinh', 'Làng thêu Văn Lâm', 'village', 'partner'],
  ['vn-hcm', 'Bảo tàng Lịch sử TP.HCM', 'museum', 'open'], ['vn-hcm', 'Khu Chợ Lớn', 'market', 'partner'],
  ['vn-dongvan', 'Phố cổ Đồng Văn', 'heritage', 'partner'], ['vn-dongvan', 'Làng lanh Lùng Tám', 'village', 'partner'],
  ['la-luangprabang', 'Bán đảo phố cổ Luang Prabang', 'heritage', 'open'], ['kh-siemreap', 'Làng nghề quanh Siem Reap', 'craft_workshop', 'partner'],
  ['th-chiangmai', 'Khu phố cổ Chiang Mai', 'heritage', 'open'], ['id-yogyakarta', 'Khu Kraton Yogyakarta', 'heritage', 'open'],
  ['my-georgetown', 'Phố cổ George Town', 'heritage', 'open'], ['jp-kyoto', 'Khu nghề Nishijin', 'craft_workshop', 'partner'],
  ['kr-jeonju', 'Làng Hanok Jeonju', 'village', 'open'], ['tw-tainan', 'Khu Anping', 'heritage', 'open'],
] as const;
