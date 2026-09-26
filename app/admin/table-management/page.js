'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export default function GenerateQRPage() {
  const [tableNumber, setTableNumber] = useState('')
  const [adultCount, setAdultCount] = useState(1)
  const [childCount, setChildCount] = useState(0)
  const [qrUrl, setQrUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpenTable = async (e) => {
    e.preventDefault()
    if (!tableNumber) return alert('กรุณาระบุเลขโต๊ะ')

    setLoading(true)
    setQrUrl('')

    const tableNum = Number(tableNumber)

    try {
      // 1. เช็กก่อนว่าโต๊ะนี้มี Session ที่เปิดใช้งาน (status = 'open') อยู่หรือเปล่า
      const { data: existingSession, error: checkError } = await supabase
        .from('sessions')
        .select('id, status')
        .eq('table_number', tableNum)
        .eq('status', 'open')
        .maybeSingle()

      if (checkError) {
        console.error('Check session error:', checkError)
      }

      // 🔴 ถ้าพบว่าโต๊ะนี้เปิดค้างไม่อยู่ (status = 'open') ให้เด้งเตือนและหยุดการทำงานทันที
      if (existingSession) {
        alert(`⚠️ โต๊ะ ${tableNum} มีลูกค้านั่งอยู่แล้ว! ไม่สามารถเปิดโต๊ะซ้ำได้ กรุณาปิดโต๊ะเดิมก่อนครับ`)
        setLoading(false)
        return
      }

      // 2. ถ้าโต๊ะว่างจริงๆ ค่อยสร้าง Token และเพิ่มลงตาราง sessions
      const newToken = crypto.randomUUID()

      const { data: newSession, error: insertError } = await supabase
        .from('sessions')
        .insert([
          {
            table_number: tableNum,
            adult_count: Number(adultCount),
            child_count: Number(childCount),
            status: 'open',
            token: newToken
          }
        ])
        .select()
        .single()

      if (insertError) {
        alert('เกิดข้อผิดพลาดในการเปิดโต๊ะ: ' + insertError.message)
        setLoading(false)
        return
      }

      // 3. สร้าง URL สำหรับสั่งอาหาร
      const baseUrl = window.location.origin
      const customerOrderUrl = `${baseUrl}/order/${tableNum}?token=${newToken}`
      setQrUrl(customerOrderUrl)

    } catch (err) {
      alert('เกิดข้อผิดพลาดที่ไม่คาดคิด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>🚪 เปิดโต๊ะใหม่ / สร้าง QR Code</h2>
      
      <form onSubmit={handleOpenTable} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        <div>
          <label>หมายเลขโต๊ะ:</label>
          <input
            type="number"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="เช่น 1, 2, 3"
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>

        <div>
          <label>จำนวนผู้ใหญ่:</label>
          <input
            type="number"
            min="1"
            value={adultCount}
            onChange={(e) => setAdultCount(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>

        <div>
          <label>จำนวนเด็ก:</label>
          <input
            type="number"
            min="0"
            value={childCount}
            onChange={(e) => setChildCount(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: '#C85A32',
            color: '#FFF',
            padding: '12px',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '8px'
          }}
        >
          {loading ? 'กำลังตรวจสอบ...' : 'เปิดโต๊ะและสร้าง QR Code'}
        </button>
      </form>

      {qrUrl && (
        <div style={{ marginTop: '24px', textAlign: 'center', padding: '16px', background: '#FFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#10B981' }}>✅ เปิดโต๊ะสำเร็จ!</h3>
          <p>ลิงก์สั่งอาหารของโต๊ะ {tableNumber}:</p>
          <input type="text" readOnly value={qrUrl} style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }} />
        </div>
      )}
    </div>
  )
}
