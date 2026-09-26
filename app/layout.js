import './globals.css'

export const metadata = {
  title: 'Oden-Bokki - ระบบสั่งอาหาร',
  description: 'ระบบสั่งอาหารร้าน Oden-Bokki',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
