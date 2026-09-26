import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FDFBF7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '2.5rem', color: '#C85A32', marginBottom: '10px' }}>
        🍢 Oden-Bokki
      </h1>
      <p style={{ color: '#7A685A', marginBottom: '30px' }}>
        ระบบสั่งอาหารร้านโอเด้งบ็อกกี
      </p>

      <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', width: '100%', maxWidth: '300px' }}>
        <Link href="/generate-qr" style={{
          backgroundColor: '#C85A32',
          color: '#FFF',
          padding: '14px',
          borderRadius: '10px',
          textAlign: 'center',
          textDecoration: 'none',
          fontWeight: 'bold'
        }}>
          📱 เปิดโต๊ะ & ออก QR Code
        </Link>

        <Link href="/kitchen" style={{
          backgroundColor: '#4A3E3D',
          color: '#FFF',
          padding: '14px',
          borderRadius: '10px',
          textAlign: 'center',
          textDecoration: 'none',
          fontWeight: 'bold'
        }}>
          🍳 จอแสดงผลในครัว (Kitchen)
        </Link>
      </div>
    </div>
  )
}
