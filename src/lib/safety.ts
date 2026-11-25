// Kiểm tra ngay trên máy trước khi gửi tin, không gửi nội dung đi đâu. Chỉ cảnh báo, người dùng vẫn quyết định.
export type Risk = 'phone' | 'link' | 'money';
const PHONE = /(\+?\d[\d\s.-]{7,}\d)/;
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|vn|io|me|ly|link)\b|zalo\.me|t\.me|wa\.me)/i;
const MONEY = /(chuyển khoản|chuyển tiền|số tài khoản|stk|vay|mượn tiền|đặt cọc|bank|transfer|deposit|wire|western union|paypal|crypto|usdt|bitcoin|momo|zalopay|\d+\s?(k|tr|triệu|usd|vnd|đ)\b)/i;
export function riskyText(text: string): Risk[] {
  const r: Risk[] = [];
  if (PHONE.test(text)) r.push('phone');
  if (LINK.test(text)) r.push('link');
  if (MONEY.test(text)) r.push('money');
  return r;
}
// Mẫu câu song ngữ để bắt chuyện khi chưa bật dịch tin nhắn.
export const PHRASES: [string, string][] = [
  ['Xin chào! Rất vui được kết nối.', 'Hello! Nice to connect with you.'],
  ['Mình có thể chia sẻ về chủ đề này.', 'I can share about this topic.'],
  ['Mình muốn học thêm về điều bạn biết.', 'I would like to learn more about what you know.'],
  ['Mình gặp nhau ở Hub nhé?', 'Shall we meet at the Hub?'],
  ['Khung giờ nào thuận tiện cho bạn?', 'What time works for you?'],
  ['Mình có thể nói chậm hơn được không?', 'Could we speak a bit more slowly?'],
  ['Cảm ơn bạn rất nhiều!', 'Thank you very much!'],
];
