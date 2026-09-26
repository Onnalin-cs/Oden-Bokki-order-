import "./globals.css";

export const metadata = {
  title: "Oden-Bokki | โอเด้งบ็อกกี",
  description:
    "Oden-Bokki (โอเด้งบ็อกกี) บุฟเฟต์โอเด้งและต็อกบ็อกกีฟิวชัน ญี่ปุ่น-เกาหลี",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className="bg-cream text-charcoal antialiased">{children}</body>
    </html>
  );
}
