import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'HS Atlas — Tra cứu mã HS Việt Nam',
  description:
    'Tra cứu 11.414 mã HS và 457 mã chương 98. Tìm kiếm, so sánh và lưu hồ sơ, có nguồn dữ liệu rõ ràng.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
