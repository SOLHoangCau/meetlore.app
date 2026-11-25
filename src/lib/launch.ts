// Bản web: mở thẳng một đường dẫn cụ thể (không phải trang chủ) thì bỏ qua màn hình nhà tài trợ.
export async function openedDirectly(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  return !['/', '/hubs', ''].includes(window.location.pathname);
}
