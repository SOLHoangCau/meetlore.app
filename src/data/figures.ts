// "Nhân vật hôm nay": danh nhân theo ngày sinh. Bản đi kèm app: 20/11 đến 31/12, cùng 1 nhân vật chưa rõ ngày sinh.
// Dữ liệu chính lấy từ bảng daily_figures trên Supabase (nhập bằng CSV); bản này dùng khi offline hoặc ở chế độ demo.
// Quy tắc nội dung (xem docs/NHAN-VAT-365.md):
// - art 'portrait' chỉ dùng cho người mất trước năm 1950; người mất sau đó dùng 'symbol' (ký họa biểu tượng thành tựu, không vẽ mặt hay dáng nhận ra được).
// - Không chọn người còn sống, chính khách hiện đại, nhân vật gây tranh cãi.
// - Câu nói phải có nguồn gốc rõ ràng (tác phẩm, năm); không chắc thì chỉ ghi thành tựu.
// - Ngày sinh theo lịch Gregory, trừ khi ghi chú khác trong `note`.

export type FieldKey = 'literature' | 'philosophy' | 'music' | 'art' | 'economy' | 'astronomy' | 'physics' | 'chemistry' | 'biology' | 'medicine' | 'math' | 'engineering' | 'linguistics' | 'history' | 'sport';
export const FIELDS: Record<FieldKey, { vi: string; en: string }> = {
  literature: { vi: 'Văn học', en: 'Literature' }, philosophy: { vi: 'Triết học', en: 'Philosophy' }, music: { vi: 'Âm nhạc', en: 'Music' }, art: { vi: 'Mỹ thuật', en: 'Fine arts' },
  economy: { vi: 'Kinh tế', en: 'Economy' }, astronomy: { vi: 'Thiên văn', en: 'Astronomy' }, physics: { vi: 'Vật lý', en: 'Physics' }, chemistry: { vi: 'Hóa học', en: 'Chemistry' },
  biology: { vi: 'Sinh học', en: 'Biology' }, medicine: { vi: 'Y học', en: 'Medicine' }, math: { vi: 'Toán học', en: 'Mathematics' }, engineering: { vi: 'Kỹ thuật', en: 'Engineering' }, linguistics: { vi: 'Ngôn ngữ học', en: 'Linguistics' },
  history: { vi: 'Sử học', en: 'History' }, sport: { vi: 'Thể thao', en: 'Sport' },
};
type Text2 = { hint: string; fact: string };
export type Figure = {
  id: string; name: string; born: { y: number; m?: number; d?: number }; died: number; field: FieldKey; art: 'portrait' | 'symbol';
  vi: Text2; en: Text2; quote?: { orig: string; vi: string; en: string; src: string }; symbol: string; note?: string;
  /** Tên tệp ảnh trong Storage media/figures; mặc định `<id>.webp`. */
  image?: string;
};

const F = (x: Figure) => x;
/** Theo ngày sinh MM-DD. */
export const FIGURES: Record<string, Figure> = {
  '11-20': F({ id: 'hubble', name: 'Edwin Hubble', born: { y: 1889, m: 11, d: 20 }, died: 1953, field: 'astronomy', art: 'symbol', symbol: 'Kính thiên văn và các thiên hà xoắn ốc trôi xa nhau',
    vi: { hint: 'Nhà thiên văn chỉ ra rằng ngoài Ngân Hà còn vô số thiên hà khác.', fact: 'Năm 1929 ông công bố mối liên hệ giữa khoảng cách và tốc độ lùi xa của các thiên hà, nay gọi là định luật Hubble–Lemaître, bằng chứng quan trọng cho thấy vũ trụ đang giãn nở. Kính thiên văn không gian Hubble mang tên ông.' },
    en: { hint: 'The astronomer who showed there are countless galaxies beyond the Milky Way.', fact: 'In 1929 he published the link between a galaxy’s distance and how fast it recedes, now called the Hubble–Lemaître law, key evidence that the universe is expanding. The Hubble Space Telescope is named after him.' } }),
  '11-21': F({ id: 'voltaire', name: 'Voltaire', born: { y: 1694, m: 11, d: 21 }, died: 1778, field: 'philosophy', art: 'portrait', symbol: 'Bút lông ngỗng và cuốn Candide',
    vi: { hint: 'Nhà văn, triết gia Khai sáng người Pháp, tác giả tiểu thuyết Candide.', fact: 'Ông bảo vệ tự do ngôn luận và khoan dung tôn giáo. Candide (1759) châm biếm thói lạc quan mù quáng.' },
    en: { hint: 'French Enlightenment writer and philosopher, author of Candide.', fact: 'He defended free speech and religious tolerance. Candide (1759) mocks blind optimism.' },
    quote: { orig: 'Le mieux est l’ennemi du bien.', vi: 'Cầu toàn là kẻ thù của điều tốt.', en: 'The best is the enemy of the good.', src: 'La Bégueule, 1772' } }),
  '11-22': F({ id: 'george-eliot', name: 'George Eliot', born: { y: 1819, m: 11, d: 22 }, died: 1880, field: 'literature', art: 'portrait', symbol: 'Chồng bản thảo bên ô cửa thị trấn nhỏ nước Anh',
    vi: { hint: 'Nữ văn sĩ Anh dùng bút danh nam để tác phẩm được nhìn nhận nghiêm túc.', fact: 'Tên thật là Mary Ann Evans. Tiểu thuyết Middlemarch (1871–1872) của bà thường được xếp vào hàng tiểu thuyết Anh vĩ đại nhất.' },
    en: { hint: 'English novelist who wrote under a male pen name to be taken seriously.', fact: 'Born Mary Ann Evans. Her novel Middlemarch (1871–1872) is often ranked among the greatest English novels.' } }),
  '11-23': F({ id: 'falla', name: 'Manuel de Falla', born: { y: 1876, m: 11, d: 23 }, died: 1946, field: 'music', art: 'portrait', symbol: 'Cây đàn guitar và khuông nhạc',
    vi: { hint: 'Nhà soạn nhạc Tây Ban Nha đưa âm hưởng flamenco vào nhạc giao hưởng.', fact: 'Tác phẩm tiêu biểu: vở ballet Tình yêu phù thủy (El amor brujo) và Chiếc mũ ba góc (El sombrero de tres picos).' },
    en: { hint: 'Spanish composer who brought flamenco colours into orchestral music.', fact: 'Best known for the ballets El amor brujo and The Three-Cornered Hat.' } }),
  '11-24': F({ id: 'spinoza', name: 'Baruch Spinoza', born: { y: 1632, m: 11, d: 24 }, died: 1677, field: 'philosophy', art: 'portrait', symbol: 'Bàn mài thấu kính và trang sách hình học',
    vi: { hint: 'Triết gia Hà Lan kiếm sống bằng nghề mài thấu kính.', fact: 'Tác phẩm Đạo đức học (Ethica), xuất bản sau khi ông mất, trình bày triết học theo lối chứng minh hình học.' },
    en: { hint: 'Dutch philosopher who earned his living grinding lenses.', fact: 'His Ethics, published after his death, sets out philosophy in the form of geometric proofs.' },
    quote: { orig: 'Non ridere, non lugere, neque detestari, sed intelligere.', vi: 'Đừng cười, đừng than khóc, đừng căm ghét, mà hãy hiểu.', en: 'Not to laugh, not to lament, not to detest, but to understand.', src: 'Tractatus Politicus, I.4' } }),
  '11-25': F({ id: 'carnegie', name: 'Andrew Carnegie', born: { y: 1835, m: 11, d: 25 }, died: 1919, field: 'economy', art: 'portrait', symbol: 'Dầm thép và thư viện cổ điển',
    vi: { hint: 'Từ cậu bé nhập cư nghèo thành "vua thép" của nước Mỹ.', fact: 'Ông bán công ty thép năm 1901 rồi dành phần lớn tài sản cho từ thiện, tài trợ xây hơn 2.500 thư viện công cộng trên thế giới.' },
    en: { hint: 'A poor immigrant boy who became America’s “steel king”.', fact: 'He sold his steel company in 1901 and gave most of his fortune away, funding more than 2,500 public libraries worldwide.' } }),
  '11-26': F({ id: 'saussure', name: 'Ferdinand de Saussure', born: { y: 1857, m: 11, d: 26 }, died: 1913, field: 'linguistics', art: 'portrait', symbol: 'Hai mặt của tờ giấy: chữ viết và hình ảnh',
    vi: { hint: 'Nhà ngôn ngữ học Thụy Sĩ, được xem là cha đẻ của ngôn ngữ học hiện đại.', fact: 'Giáo trình ngôn ngữ học đại cương (1916), do học trò biên soạn từ bài giảng của ông, đặt nền móng cho chủ nghĩa cấu trúc.' },
    en: { hint: 'Swiss linguist regarded as the father of modern linguistics.', fact: 'His Course in General Linguistics (1916), compiled by students from his lectures, laid the foundation of structuralism.' } }),
  '11-27': F({ id: 'celsius', name: 'Anders Celsius', born: { y: 1701, m: 11, d: 27 }, died: 1744, field: 'astronomy', art: 'portrait', symbol: 'Nhiệt kế thủy tinh và bầu trời phương Bắc',
    vi: { hint: 'Nhà thiên văn Thụy Điển có tên gắn với một thang nhiệt độ.', fact: 'Năm 1742 ông đề xuất thang 100 độ giữa điểm sôi và điểm đông của nước. Ban đầu thang của ông ngược với ngày nay: 0 là điểm sôi, 100 là điểm đông.' },
    en: { hint: 'Swedish astronomer whose name is on a temperature scale.', fact: 'In 1742 he proposed a 100-degree scale between water’s boiling and freezing points. His original scale was upside down: 0 was boiling, 100 was freezing.' } }),
  '11-28': F({ id: 'blake', name: 'William Blake', born: { y: 1757, m: 11, d: 28 }, died: 1827, field: 'literature', art: 'portrait', symbol: 'Hạt cát trong lòng bàn tay và bông hoa dại',
    vi: { hint: 'Nhà thơ kiêm họa sĩ Anh, tự khắc và in những tập thơ có minh họa của mình.', fact: 'Tập Bài ca Ngây thơ và Kinh nghiệm (1789–1794) kết hợp thơ và tranh khắc do chính ông thực hiện.' },
    en: { hint: 'English poet and painter who engraved and printed his own illustrated books.', fact: 'Songs of Innocence and of Experience (1789–1794) combines his poems with his own relief etchings.' },
    quote: { orig: 'To see a World in a Grain of Sand / And a Heaven in a Wild Flower', vi: 'Thấy cả thế giới trong một hạt cát, thấy thiên đường trong một bông hoa dại.', en: 'To see a World in a Grain of Sand / And a Heaven in a Wild Flower', src: 'Auguries of Innocence' } }),
  '11-29': F({ id: 'doppler', name: 'Christian Doppler', born: { y: 1803, m: 11, d: 29 }, died: 1853, field: 'physics', art: 'portrait', symbol: 'Những vòng sóng dồn lại phía trước một đoàn tàu',
    vi: { hint: 'Nhà vật lý Áo; hiệu ứng mang tên ông giải thích vì sao tiếng còi đổi cao độ khi xe chạy qua.', fact: 'Năm 1842 ông mô tả sự thay đổi tần số sóng khi nguồn phát và người nhận chuyển động với nhau. Hiệu ứng Doppler nay dùng trong radar, siêu âm y khoa và thiên văn.' },
    en: { hint: 'Austrian physicist; his effect explains why a passing siren changes pitch.', fact: 'In 1842 he described how wave frequency shifts when source and observer move relative to each other. The Doppler effect is used in radar, medical ultrasound and astronomy.' } }),
  '11-30': F({ id: 'jc-bose', name: 'Jagadish Chandra Bose', born: { y: 1858, m: 11, d: 30 }, died: 1937, field: 'physics', art: 'portrait', symbol: 'Ăng-ten sóng vô tuyến bên một chậu cây',
    vi: { hint: 'Nhà khoa học Ấn Độ nghiên cứu cả sóng vô tuyến lẫn đời sống thực vật.', fact: 'Từ những năm 1890 ông tiên phong nghiên cứu sóng vô tuyến bước sóng milimét, rồi chế tạo máy crescograph đo những chuyển động tăng trưởng rất nhỏ của cây.' },
    en: { hint: 'Indian scientist who studied both radio waves and plant life.', fact: 'In the 1890s he pioneered millimetre-wave radio research, and later built the crescograph to measure tiny growth movements of plants.' } }),
  '12-01': F({ id: 'lobachevsky', name: 'Nikolai Lobachevsky', born: { y: 1792, m: 12, d: 1 }, died: 1856, field: 'math', art: 'portrait', symbol: 'Tam giác trên mặt yên ngựa', note: 'Ngày 1/12 theo lịch Gregory (20/11 theo lịch Julius).',
    vi: { hint: 'Nhà toán học Nga dám nghi ngờ tiên đề đường song song của Euclid.', fact: 'Năm 1829 ông công bố hình học phi Euclid, mở ra cách nghĩ mới về không gian.' },
    en: { hint: 'Russian mathematician who dared to question Euclid’s parallel postulate.', fact: 'In 1829 he published non-Euclidean geometry, opening a new way of thinking about space.' } }),
  '12-02': F({ id: 'seurat', name: 'Georges Seurat', born: { y: 1859, m: 12, d: 2 }, died: 1891, field: 'art', art: 'portrait', symbol: 'Bờ sông vẽ bằng hàng nghìn chấm màu',
    vi: { hint: 'Họa sĩ Pháp vẽ tranh bằng hàng nghìn chấm màu nhỏ.', fact: 'Ông khởi xướng lối vẽ chấm điểm. Kiệt tác: Một chiều Chủ nhật trên đảo La Grande Jatte (1884–1886).' },
    en: { hint: 'French painter who built pictures from thousands of tiny dots.', fact: 'He pioneered pointillism. Masterpiece: A Sunday Afternoon on the Island of La Grande Jatte (1884–1886).' } }),
  '12-03': F({ id: 'conrad', name: 'Joseph Conrad', born: { y: 1857, m: 12, d: 3 }, died: 1924, field: 'literature', art: 'portrait', symbol: 'Con tàu buồm trên dòng sông rậm rạp',
    vi: { hint: 'Thủy thủ gốc Ba Lan học tiếng Anh khi đã trưởng thành, rồi thành đại văn hào Anh.', fact: 'Tác phẩm tiêu biểu: Tâm bóng tối (1899) và Lord Jim (1900).' },
    en: { hint: 'A Polish-born sailor who learned English as an adult and became a great English novelist.', fact: 'Best known for Heart of Darkness (1899) and Lord Jim (1900).' } }),
  '12-04': F({ id: 'rilke', name: 'Rainer Maria Rilke', born: { y: 1875, m: 12, d: 4 }, died: 1926, field: 'literature', art: 'portrait', symbol: 'Lá thư và cánh cửa sổ mở',
    vi: { hint: 'Nhà thơ viết tiếng Đức, tác giả những lá thư nổi tiếng gửi một nhà thơ trẻ.', fact: 'Bi ca Duino (1923) được xem là một đỉnh cao của thơ ca thế kỷ 20.' },
    en: { hint: 'German-language poet, author of famous letters to a young poet.', fact: 'The Duino Elegies (1923) are considered a summit of 20th-century poetry.' },
    quote: { orig: 'Leben Sie jetzt die Fragen.', vi: 'Hãy sống với những câu hỏi ngay lúc này.', en: 'Live the questions now.', src: 'Thư gửi nhà thơ trẻ, 16/7/1903' } }),
  '12-05': F({ id: 'heisenberg', name: 'Werner Heisenberg', born: { y: 1901, m: 12, d: 5 }, died: 1976, field: 'physics', art: 'symbol', symbol: 'Một hạt nhòe thành đám mây xác suất',
    vi: { hint: 'Nhà vật lý Đức gắn với một "nguyên lý" về giới hạn của phép đo.', fact: 'Ông đặt nền móng cho cơ học lượng tử dạng ma trận (1925) và phát biểu nguyên lý bất định (1927). Giải Nobel Vật lý 1932.' },
    en: { hint: 'German physicist known for a “principle” about the limits of measurement.', fact: 'He founded matrix mechanics (1925) and stated the uncertainty principle (1927). Nobel Prize in Physics 1932.' } }),
  '12-06': F({ id: 'gay-lussac', name: 'Joseph Louis Gay-Lussac', born: { y: 1778, m: 12, d: 6 }, died: 1850, field: 'chemistry', art: 'portrait', symbol: 'Khinh khí cầu và bình thủy tinh lấy mẫu khí',
    vi: { hint: 'Nhà hóa học Pháp từng bay khinh khí cầu lên cao hơn 7.000 m để lấy mẫu không khí.', fact: 'Ông tìm ra định luật về tỉ lệ thể tích của các khí khi phản ứng (1808) và góp phần phát hiện nguyên tố bo.' },
    en: { hint: 'French chemist who rose by balloon above 7,000 m to sample the air.', fact: 'He found the law of combining volumes of gases (1808) and helped discover the element boron.' } }),
  '12-07': F({ id: 'bernini', name: 'Gian Lorenzo Bernini', born: { y: 1598, m: 12, d: 7 }, died: 1680, field: 'art', art: 'portrait', symbol: 'Hàng cột vòng cung của quảng trường',
    vi: { hint: 'Nhà điêu khắc, kiến trúc sư làm nên diện mạo Baroque của thành Rome.', fact: 'Ông thiết kế quảng trường Thánh Phêrô với hàng cột ôm vòng cung và tạc tượng Cực lạc của Thánh Teresa.' },
    en: { hint: 'Sculptor and architect who shaped Baroque Rome.', fact: 'He designed St Peter’s Square with its embracing colonnades and carved The Ecstasy of Saint Teresa.' } }),
  '12-08': F({ id: 'sibelius', name: 'Jean Sibelius', born: { y: 1865, m: 12, d: 8 }, died: 1957, field: 'music', art: 'symbol', symbol: 'Rừng thông, mặt hồ và khuông nhạc',
    vi: { hint: 'Nhà soạn nhạc trở thành biểu tượng văn hóa của Phần Lan.', fact: 'Bản giao hưởng thơ Finlandia (1899–1900) trở thành biểu tượng của tinh thần dân tộc Phần Lan.' },
    en: { hint: 'Composer who became a cultural symbol of Finland.', fact: 'His tone poem Finlandia (1899–1900) became a symbol of Finnish national spirit.' } }),
  '12-09': F({ id: 'milton', name: 'John Milton', born: { y: 1608, m: 12, d: 9 }, died: 1674, field: 'literature', art: 'portrait', symbol: 'Ngọn nến và trang trường ca',
    vi: { hint: 'Nhà thơ Anh đọc cho người khác chép lại thiên sử thi lớn nhất của mình khi đã mù.', fact: 'Thiên đường đã mất (1667) là trường ca lớn của văn học Anh. Ông cũng viết Areopagitica (1644) bảo vệ tự do in ấn.' },
    en: { hint: 'English poet who dictated his greatest epic after going blind.', fact: 'Paradise Lost (1667) is a great English epic. He also wrote Areopagitica (1644) in defence of a free press.' } }),
  '12-10': F({ id: 'lovelace', name: 'Ada Lovelace', born: { y: 1815, m: 12, d: 10 }, died: 1852, field: 'math', art: 'portrait', symbol: 'Bánh răng của cỗ máy tính và hoa văn dệt',
    vi: { hint: 'Nữ bá tước Anh viết thuật toán cho một cỗ máy chưa từng được chế tạo xong.', fact: 'Trong ghi chú năm 1843 về Máy Giải tích của Charles Babbage, bà trình bày cách máy tính các số Bernoulli, thường được xem là chương trình máy tính đầu tiên.' },
    en: { hint: 'English countess who wrote an algorithm for a machine that was never finished.', fact: 'In her 1843 notes on Charles Babbage’s Analytical Engine she showed how it could compute Bernoulli numbers, often called the first computer program.' },
    quote: { orig: 'The Analytical Engine weaves algebraical patterns just as the Jacquard-loom weaves flowers and leaves.', vi: 'Máy Giải tích dệt nên những hoa văn đại số, như khung cửi Jacquard dệt hoa và lá.', en: 'The Analytical Engine weaves algebraical patterns just as the Jacquard-loom weaves flowers and leaves.', src: 'Ghi chú A, 1843' } }),
  '12-11': F({ id: 'koch', name: 'Robert Koch', born: { y: 1843, m: 12, d: 11 }, died: 1910, field: 'medicine', art: 'portrait', symbol: 'Kính hiển vi và đĩa nuôi cấy',
    vi: { hint: 'Bác sĩ Đức tìm ra vi khuẩn gây bệnh lao.', fact: 'Năm 1882 ông công bố vi khuẩn lao; ông cũng xác định vi khuẩn gây bệnh than và bệnh tả. Giải Nobel Y học 1905.' },
    en: { hint: 'German physician who identified the bacterium that causes tuberculosis.', fact: 'He announced the tuberculosis bacterium in 1882 and also identified the causes of anthrax and cholera. Nobel Prize in Medicine 1905.' } }),
  '12-12': F({ id: 'flaubert', name: 'Gustave Flaubert', born: { y: 1821, m: 12, d: 12 }, died: 1880, field: 'literature', art: 'portrait', symbol: 'Bàn viết với những trang bị gạch xóa',
    vi: { hint: 'Nhà văn Pháp có thể mất cả tuần để chọn đúng một chữ.', fact: 'Bà Bovary (1857) mở đầu tiểu thuyết hiện thực hiện đại. Ông từng bị đưa ra tòa vì tác phẩm này và được tha bổng.' },
    en: { hint: 'French writer who could spend a week searching for the right word.', fact: 'Madame Bovary (1857) helped launch the modern realist novel. He was put on trial over it and acquitted.' } }),
  '12-13': F({ id: 'siemens', name: 'Werner von Siemens', born: { y: 1816, m: 12, d: 13 }, died: 1892, field: 'engineering', art: 'portrait', symbol: 'Máy phát điện và dây điện báo',
    vi: { hint: 'Kỹ sư, nhà sáng lập một tập đoàn điện của Đức.', fact: 'Năm 1847 ông đồng sáng lập hãng Siemens & Halske, xây dựng mạng điện báo, và năm 1866 phát triển máy phát điện tự kích.' },
    en: { hint: 'Engineer and founder of a German electrical company.', fact: 'He co-founded Siemens & Halske in 1847, built telegraph networks and in 1866 developed the self-excited dynamo.' } }),
  '12-14': F({ id: 'tycho', name: 'Tycho Brahe', born: { y: 1546, m: 12, d: 14 }, died: 1601, field: 'astronomy', art: 'portrait', symbol: 'Thước đo góc khổng lồ dưới bầu trời sao', note: 'Ngày sinh theo lịch Julius.',
    vi: { hint: 'Nhà thiên văn Đan Mạch đo vị trí sao chính xác nhất thời chưa có kính thiên văn.', fact: 'Năm 1572 ông quan sát một "ngôi sao mới" (siêu tân tinh), cho thấy bầu trời không bất biến. Dữ liệu của ông giúp Kepler tìm ra các định luật chuyển động hành tinh.' },
    en: { hint: 'Danish astronomer who made the most precise naked-eye star measurements.', fact: 'In 1572 he observed a “new star” (a supernova), showing the heavens can change. His data let Kepler find the laws of planetary motion.' } }),
  '12-15': F({ id: 'eiffel', name: 'Gustave Eiffel', born: { y: 1832, m: 12, d: 15 }, died: 1923, field: 'engineering', art: 'portrait', symbol: 'Khung thép đan chéo của một ngọn tháp',
    vi: { hint: 'Kỹ sư Pháp; công ty của ông dựng ngọn tháp biểu tượng của Paris.', fact: 'Tháp Eiffel hoàn thành năm 1889 cho Triển lãm Thế giới. Ông cũng thiết kế khung sắt bên trong tượng Nữ thần Tự do.' },
    en: { hint: 'French engineer whose company built the symbol of Paris.', fact: 'The Eiffel Tower was finished in 1889 for the World’s Fair. He also designed the iron frame inside the Statue of Liberty.' } }),
  '12-16': F({ id: 'austen', name: 'Jane Austen', born: { y: 1775, m: 12, d: 16 }, died: 1817, field: 'literature', art: 'portrait', symbol: 'Bàn viết nhỏ và tách trà',
    vi: { hint: 'Nữ văn sĩ Anh viết về hôn nhân và giai cấp với giọng châm biếm tinh tế.', fact: 'Kiêu hãnh và định kiến (1813) là một trong những tiểu thuyết được đọc nhiều nhất thế giới.' },
    en: { hint: 'English novelist who wrote about marriage and class with gentle irony.', fact: 'Pride and Prejudice (1813) is one of the most widely read novels in the world.' },
    quote: { orig: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', vi: 'Ai cũng thừa nhận một sự thật rằng một người đàn ông độc thân có tài sản lớn hẳn đang cần một người vợ.', en: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', src: 'Kiêu hãnh và định kiến, 1813' } }),
  '12-17': F({ id: 'davy', name: 'Humphry Davy', born: { y: 1778, m: 12, d: 17 }, died: 1829, field: 'chemistry', art: 'portrait', symbol: 'Pin điện, bình điện phân và đèn mỏ',
    vi: { hint: 'Nhà hóa học Anh dùng dòng điện để tách ra nhiều nguyên tố mới.', fact: 'Năm 1807 ông dùng điện phân tách được natri và kali, sau đó là canxi, magie, bari. Ông cũng phát minh đèn an toàn cho thợ mỏ (1815).' },
    en: { hint: 'English chemist who used electricity to isolate new elements.', fact: 'In 1807 he isolated sodium and potassium by electrolysis, then calcium, magnesium and barium. He also invented the miners’ safety lamp (1815).' } }),
  '12-18': F({ id: 'jj-thomson', name: 'J. J. Thomson', born: { y: 1856, m: 12, d: 18 }, died: 1940, field: 'physics', art: 'portrait', symbol: 'Ống tia âm cực phát sáng',
    vi: { hint: 'Nhà vật lý Anh tìm ra hạt mang điện đầu tiên nhỏ hơn nguyên tử.', fact: 'Năm 1897 ông phát hiện electron. Giải Nobel Vật lý 1906.' },
    en: { hint: 'English physicist who found the first particle smaller than an atom.', fact: 'He discovered the electron in 1897. Nobel Prize in Physics 1906.' } }),
  '12-19': F({ id: 'michelson', name: 'Albert A. Michelson', born: { y: 1852, m: 12, d: 19 }, died: 1931, field: 'physics', art: 'portrait', symbol: 'Hai chùm sáng giao thoa trên bàn đá',
    vi: { hint: 'Nhà vật lý đo tốc độ ánh sáng chính xác bậc nhất thời của mình.', fact: 'Thí nghiệm Michelson–Morley (1887) không tìm thấy "ê-te", góp phần mở đường cho thuyết tương đối. Năm 1907 ông là người Mỹ đầu tiên đoạt giải Nobel khoa học.' },
    en: { hint: 'Physicist who measured the speed of light more precisely than anyone of his time.', fact: 'The Michelson–Morley experiment (1887) found no “ether”, helping pave the way to relativity. In 1907 he became the first American to win a Nobel Prize in science.' } }),
  '12-20': F({ id: 'rickey', name: 'Branch Rickey', born: { y: 1881, m: 12, d: 20 }, died: 1965, field: 'sport', art: 'symbol', symbol: 'Quả bóng chày, găng bắt bóng và bản hợp đồng trên bàn',
    vi: { hint: 'Nhà quản lý bóng chày Mỹ đã mở cánh cửa giải nhà nghề cho cầu thủ da màu.', fact: 'Năm 1945 ông ký hợp đồng với Jackie Robinson; năm 1947 Robinson ra sân cho Brooklyn Dodgers, xóa bỏ rào cản màu da ở giải Major League. Ông cũng lập ra hệ thống đội trẻ (farm system) để đào tạo cầu thủ.' },
    en: { hint: 'American baseball executive who opened the major leagues to Black players.', fact: 'In 1945 he signed Jackie Robinson, who took the field for the Brooklyn Dodgers in 1947 and broke Major League Baseball’s colour barrier. He also created the farm system for developing young players.' } }),
  '12-21': F({ id: 'ranke', name: 'Leopold von Ranke', born: { y: 1795, m: 12, d: 21 }, died: 1886, field: 'history', art: 'portrait', symbol: 'Chồng hồ sơ lưu trữ và cây bút', note: 'Sổ sách ghi ngày 20/12; theo truyền thống gia đình là 21/12 (Neue Deutsche Biographie).',
    vi: { hint: 'Nhà sử học Đức đặt nền cho lối viết sử dựa trên tư liệu gốc.', fact: 'Ông yêu cầu sử gia làm việc với văn khố và tài liệu gốc, và là người đầu tiên tổ chức seminar sử học ở đại học. Năm 1865 ông được phong tước, từ đó có chữ "von" trong tên.' },
    en: { hint: 'German historian who grounded the writing of history in original sources.', fact: 'He required historians to work from archives and primary documents, and was the first to run a history seminar at a university. He was ennobled in 1865, adding "von" to his name.' },
    quote: { orig: 'Er will blos zeigen, wie es eigentlich gewesen.', vi: 'Tác phẩm này chỉ muốn cho thấy sự việc đã thực sự diễn ra thế nào.', en: 'This work merely wants to show how it really was.', src: 'Geschichten der romanischen und germanischen Völker, 1824' } }),
  '12-22': F({ id: 'ramanujan', name: 'Srinivasa Ramanujan', born: { y: 1887, m: 12, d: 22 }, died: 1920, field: 'math', art: 'portrait', symbol: 'Trang sổ tay đầy công thức chuỗi vô hạn',
    vi: { hint: 'Nhà toán học Ấn Độ phần lớn tự học, để lại hàng nghìn công thức.', fact: 'Năm 1913 ông viết thư cho G. H. Hardy ở Cambridge rồi sang Anh làm việc cùng Hardy. Ông đóng góp lớn về lý thuyết số, chuỗi vô hạn và hàm phân hoạch, được bầu vào Hội Hoàng gia Anh năm 1918. Ấn Độ lấy ngày sinh của ông làm Ngày Toán học Quốc gia.' },
    en: { hint: 'Largely self-taught Indian mathematician who left thousands of formulas.', fact: 'In 1913 he wrote to G. H. Hardy in Cambridge and went on to work with him in England. He made major contributions to number theory, infinite series and the partition function, and was elected a Fellow of the Royal Society in 1918. India marks his birthday as National Mathematics Day.' } }),
  '12-23': F({ id: 'champollion', name: 'Jean-François Champollion', born: { y: 1790, m: 12, d: 23 }, died: 1832, field: 'linguistics', art: 'portrait', symbol: 'Phiến đá Rosetta với ba loại chữ',
    vi: { hint: 'Học giả Pháp giải mã chữ tượng hình Ai Cập.', fact: 'Năm 1822, dựa vào Phiến đá Rosetta và nhiều văn bản khác, ông công bố cách đọc chữ tượng hình, mở đầu ngành Ai Cập học hiện đại.' },
    en: { hint: 'French scholar who deciphered Egyptian hieroglyphs.', fact: 'In 1822, working from the Rosetta Stone and other texts, he published how hieroglyphs could be read, founding modern Egyptology.' } }),
  '12-24': F({ id: 'joule', name: 'James Prescott Joule', born: { y: 1818, m: 12, d: 24 }, died: 1889, field: 'physics', art: 'portrait', symbol: 'Cánh khuấy trong bình nước nối với quả nặng',
    vi: { hint: 'Nhà vật lý Anh, con nhà nấu bia, đo được đương lượng cơ của nhiệt.', fact: 'Ông chứng minh công cơ học chuyển thành nhiệt theo một tỉ lệ cố định, góp phần xác lập định luật bảo toàn năng lượng. Đơn vị năng lượng joule (J) mang tên ông.' },
    en: { hint: 'English physicist and brewer’s son who measured the mechanical equivalent of heat.', fact: 'He showed that mechanical work turns into heat at a fixed rate, helping establish the conservation of energy. The joule (J), the unit of energy, is named after him.' } }),
  '12-25': F({ id: 'newton', name: 'Isaac Newton', born: { y: 1642, m: 12, d: 25 }, died: 1727, field: 'physics', art: 'portrait', symbol: 'Lăng kính tách ánh sáng và quỹ đạo hành tinh', note: 'Ngày 25/12/1642 theo lịch Julius dùng ở Anh lúc đó; theo lịch Gregory là 4/1/1643.',
    vi: { hint: 'Nhà khoa học Anh nêu ra ba định luật chuyển động và định luật vạn vật hấp dẫn.', fact: 'Tác phẩm Principia (1687) giải thích chuyển động trên Trái Đất và của các thiên thể bằng cùng những định luật. Ông còn nghiên cứu ánh sáng với lăng kính và phát triển phép tính vi tích phân, độc lập với Leibniz. Ngày sinh 25/12 tính theo lịch Julius khi đó ở Anh.' },
    en: { hint: 'English scientist behind the three laws of motion and universal gravitation.', fact: 'His Principia (1687) explained motion on Earth and in the heavens with the same laws. He also studied light with prisms and developed calculus independently of Leibniz. The 25 December date is from the Julian calendar then used in England.' },
    quote: { orig: 'If I have seen further it is by standing on the shoulders of Giants.', vi: 'Nếu tôi nhìn được xa hơn, đó là nhờ đứng trên vai những người khổng lồ.', en: 'If I have seen further it is by standing on the shoulders of Giants.', src: 'Letter to Robert Hooke, 1675/76' } }),
  '12-26': F({ id: 'babbage', name: 'Charles Babbage', born: { y: 1791, m: 12, d: 26 }, died: 1871, field: 'engineering', art: 'portrait', symbol: 'Các cột bánh răng của Máy sai phân',
    vi: { hint: 'Nhà toán học Anh thiết kế những cỗ máy tính cơ học đầu tiên.', fact: 'Ông thiết kế Máy sai phân và Máy giải tích. Máy giải tích có bộ nhớ, bộ xử lý và nhận lệnh bằng thẻ đục lỗ, được xem là ý tưởng sớm nhất về máy tính lập trình được. Ada Lovelace viết các ghi chú nổi tiếng về cỗ máy này năm 1843.' },
    en: { hint: 'English mathematician who designed the first mechanical computers.', fact: 'He designed the Difference Engine and the Analytical Engine. The Analytical Engine had a memory, a processor and punched-card instructions, the earliest idea of a programmable computer. Ada Lovelace wrote her famous notes on it in 1843.' } }),
  '12-27': F({ id: 'hai-thuong-lan-ong', name: 'Hải Thượng Lãn Ông', born: { y: 1724, m: 12, d: 27 }, died: 1791, field: 'medicine', art: 'symbol', symbol: 'Trang mở đầu quyển 28 bộ Hải Thượng y tông tâm lĩnh (bản khắc in)', note: 'Sinh giờ Dần ngày 12 tháng 11 năm Giáp Thìn theo gia phả họ Lê, tức 27/12/1724; nhiều tài liệu cũ ghi 1720. Ảnh dựng từ bản khắc in, đã bỏ dấu thư viện. Không dùng ảnh chụp lan truyền trên mạng: ông mất năm 1791, trước khi có nhiếp ảnh.',
    vi: { hint: 'Danh y Việt Nam thế kỷ 18, tên thật Lê Hữu Trác, được tôn là Y thánh của Việt Nam.', fact: 'Ông soạn bộ Hải Thượng y tông tâm lĩnh (海上醫宗心領), viết bằng chữ Hán, gồm 28 tập, 66 quyển: từ lý luận, cách chữa, bài thuốc, vị thuốc đến nội khoa, ngoại khoa, sản phụ khoa, nhi khoa, cấp cứu, đạo đức nghề y và vệ sinh phòng bệnh.' },
    en: { hint: '18th-century Vietnamese physician Lê Hữu Trác, honoured as the saint of Vietnamese medicine.', fact: 'He compiled the Hải Thượng y tông tâm lĩnh (海上醫宗心領), written in classical Chinese in 28 volumes and 66 books, covering medical theory, treatments, prescriptions and herbs, internal and external medicine, obstetrics, paediatrics, emergency care, medical ethics and disease prevention.' } }),
  '12-28': F({ id: 'eddington', name: 'Arthur Eddington', born: { y: 1882, m: 12, d: 28 }, died: 1944, field: 'astronomy', art: 'portrait', symbol: 'Nhật thực toàn phần và tia sáng sao bị bẻ cong',
    vi: { hint: 'Nhà thiên văn Anh dẫn đoàn quan sát nhật thực năm 1919.', fact: 'Quan sát nhật thực năm 1919 cho thấy ánh sáng sao bị lệch khi đi gần Mặt Trời, phù hợp với thuyết tương đối rộng của Einstein. Ông cũng đặt nền cho lý thuyết về cấu trúc bên trong các ngôi sao.' },
    en: { hint: 'English astronomer who led an expedition to the 1919 solar eclipse.', fact: 'Observations of the 1919 eclipse showed starlight bending near the Sun, as Einstein’s general relativity predicted. He also laid the foundations of the theory of stellar interiors.' } }),
  '12-29': F({ id: 'goodyear', name: 'Charles Goodyear', born: { y: 1800, m: 12, d: 29 }, died: 1860, field: 'chemistry', art: 'portrait', symbol: 'Bếp lò và tấm cao su lưu hóa',
    vi: { hint: 'Nhà phát minh Mỹ tự học, tìm ra cách lưu hóa cao su.', fact: 'Năm 1839 ông phát hiện rằng nung cao su với lưu huỳnh làm cao su bền, không chảy nhão khi nóng và không giòn khi lạnh; ông được cấp bằng sáng chế năm 1844. Hãng lốp Goodyear mang tên ông nhưng không do ông lập ra. Ông mất trong cảnh nghèo khó.' },
    en: { hint: 'Self-taught American inventor who found how to vulcanize rubber.', fact: 'In 1839 he found that heating rubber with sulphur made it durable, neither sticky in heat nor brittle in cold; he patented the process in 1844. The Goodyear tyre company is named after him but was not founded by him. He died poor.' } }),
  '12-30': F({ id: 'kipling', name: 'Rudyard Kipling', born: { y: 1865, m: 12, d: 30 }, died: 1936, field: 'literature', art: 'portrait', symbol: 'Khu rừng nhiệt đới và cuốn sách mở', note: 'Nhân vật gây tranh cãi vì quan điểm đế quốc. Nội dung chỉ nêu tác phẩm và giải thưởng; admin cân nhắc trước khi bật.',
    vi: { hint: 'Nhà văn Anh sinh ở Bombay, tác giả Sách rừng xanh.', fact: 'Ông viết Sách rừng xanh (1894) và Kim (1901). Năm 1907 ông là nhà văn viết tiếng Anh đầu tiên nhận giải Nobel Văn học. Một số tác phẩm của ông ca ngợi chủ nghĩa đế quốc Anh nên đến nay vẫn gây tranh cãi.' },
    en: { hint: 'English writer born in Bombay, author of The Jungle Book.', fact: 'He wrote The Jungle Book (1894) and Kim (1901). In 1907 he became the first English-language writer to win the Nobel Prize in Literature. Some of his work celebrates British imperialism and remains controversial.' } }),
  '12-31': F({ id: 'matisse', name: 'Henri Matisse', born: { y: 1869, m: 12, d: 31 }, died: 1954, field: 'art', art: 'symbol', symbol: 'Những mảng giấy màu cắt rời và cây kéo',
    vi: { hint: 'Họa sĩ Pháp nổi tiếng với màu sắc táo bạo và tranh cắt giấy.', fact: 'Ông là gương mặt chính của trường phái Dã thú đầu thế kỷ 20. Những năm cuối đời, khi sức khỏe yếu, ông chuyển sang cắt dán giấy màu thành những tác phẩm khổ lớn.' },
    en: { hint: 'French painter known for bold colour and paper cut-outs.', fact: 'He was a leading figure of Fauvism in the early 20th century. In his last years, when his health failed, he turned to large works made of cut and pasted coloured paper.' } }),
};

/** Nhân vật chưa rõ ngày sinh: chỉ đoán năm. Dùng cho những ngày chưa có nhân vật. */
export const UNDATED: Figure[] = [
  F({ id: 'nguyen-trai', name: 'Nguyễn Trãi', born: { y: 1380 }, died: 1442, field: 'literature', art: 'symbol', symbol: 'Các trang khắc in Bình Ngô đại cáo trong Hoàng Việt văn tuyển', note: 'Ảnh dựng từ bản khắc in Hoàng Việt văn tuyển (thế kỷ 19). Câu tôn vinh do người gửi cung cấp, dẫn từ Wikipedia tiếng Việt; cần đối chiếu nguồn gốc.',
    vi: { hint: 'Nhà tư tưởng, nhà thơ Việt Nam hiệu Ức Trai (抑齋), tác giả một bản tuyên ngôn nổi tiếng thế kỷ 15.', fact: 'Ông viết Bình Ngô đại cáo (1428) và Quốc âm thi tập, tập thơ chữ Nôm sớm nhất còn lại. Ông mất ngày 19/9/1442. Năm 1980, UNESCO kỷ niệm 600 năm ngày sinh của ông. Đời sau tôn vinh: "Gặp gỡ long hổ phong vân, còn ghi duyên cũ; truyền tụng văn chương sự nghiệp, để mãi đời sau."' },
    en: { hint: 'Vietnamese thinker and poet, pen name Ức Trai (抑齋), author of a famous 15th-century proclamation.', fact: 'He wrote the Great Proclamation upon the Pacification of the Wu (1428) and the earliest surviving collection of poems in Nôm script. He died on 19 September 1442. UNESCO marked his 600th birth anniversary in 1980. A later tribute reads: “His meeting with the ruler was destiny; his writing and deeds are handed down to all generations.”' },
    quote: { orig: '仁義之舉，要在安民', vi: 'Việc nhân nghĩa cốt ở yên dân.', en: 'The aim of benevolence and righteousness is to bring peace to the people.', src: 'Bình Ngô đại cáo, 1428' } }),
];

/** Giống dayNumber trong lib/daily, chép lại để file dữ liệu không phụ thuộc file khác. */
const dayNumber = (key: string) => { const [y, m, d] = key.split('-').map(Number); return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000); };
/** Nhân vật của ngày: ưu tiên người sinh đúng ngày, nếu chưa có thì luân phiên trong toàn bộ danh sách. */
export function pickFigure(key: string, dated: Record<string, Figure>, undated: Figure[]): { figure: Figure; birthday: boolean } {
  const f = dated[key.slice(5)];
  if (f) return { figure: f, birthday: true };
  const all = [...Object.values(dated), ...undated]; const n = dayNumber(key);
  return { figure: all[((n % all.length) + all.length) % all.length], birthday: false };
}
export const figureFor = (key: string) => pickFigure(key, FIGURES, UNDATED);
/** Có hiện ngày tháng sinh không: chỉ khi có đủ ngày và tháng. */
export const hasFullDate = (f: Figure) => !!(f.born.m && f.born.d);
