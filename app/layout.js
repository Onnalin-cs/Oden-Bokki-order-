export const metadata = {
  title: 'Oden-Bokki',
  description: 'ระบบสั่งอาหารร้าน Oden-Bokki',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
