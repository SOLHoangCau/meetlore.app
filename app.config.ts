// Cấu hình động bổ sung cho app.json. Tệp Firebase của Android (google-services.json) không nằm trong GitHub:
// trên EAS, tạo biến môi trường kiểu "File" tên GOOGLE_SERVICES_JSON ở nhóm production; khi build máy cục bộ
// thì đặt tệp google-services.json ở thư mục gốc. Thiếu tệp này app vẫn build được, chỉ không nhận thông báo đẩy trên Android.
import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? (existsSync('./google-services.json') ? './google-services.json' : undefined);
  return { ...(config as ExpoConfig), android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) } };
};
