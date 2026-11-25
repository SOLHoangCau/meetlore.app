// Bản web: chưa gửi thông báo đẩy. Người dùng vẫn thấy tin mới khi mở trang.
export async function registerPush(): Promise<string> { throw new Error('push_not_supported_on_web'); }
