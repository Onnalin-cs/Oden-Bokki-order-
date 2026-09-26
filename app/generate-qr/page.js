'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

export default function GenerateQRPage() {
  const [tableNumber, setTableNumber] = useState('')
  const [adultCount, setAdultCount] = useState(1)
  const [childCount, setChildCount] = useState(0)
  const [qrUrl, setQrUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpenTable = async (e) => {
    e.preventDefault()
    if (!tableNumber) return alert('กรุณากรอกเลขโต๊ะ')

    setLoading(true)
    const token = crypto.randomUUID()

    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          table_number: Number(tableNumber),
          adult_count: Number(adultCount),
          child_count: Number(childCount),
          status: 'open',
          token: token
        }
      ])
      .select()
      .single()

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } else {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const url = `${origin}/order/${tableNumber}?token=${token}`
      setQrUrl(url)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <Link href="/" style={{ textDecoration: 'none', color: '#666', fontSize: '0.9rem' }}>
        ← กลับหน้าหลัก
      </Link>
      
      <h1 style={{ marginTop: '16px', color: '#C85A32' }}>📋 เปิดโต๊ะลูกค้า & QR Code</h1>

      <form onSubmit={handleOpenTable} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>เลขโต๊ะ</label>
          <input
            type="number"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="เช่น 1, 2, 3"
            required
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>ผู้ใหญ่</label>
            <input
              type="number"
              min="1"
              value={adultCount}
              onChange={(e) => setAdultCount(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>เด็ก</label>
            <input
              type="number"
              min="0"
              value={childCount}
              onChange={(e) => setChildCount(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC' }}
            />
          </div>
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
          {loading ? 'กำลังเปิดโต๊ะ...' : 'เปิดโต๊ะ & สร้าง QR Code'}
        </button>
      </form>

      {qrUrl && (
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#FFF', borderRadius: '12px', textAlign: 'center', border: '1px solid #EEE' }}>
          <h3>QR Code สำหรับโต๊ะ {tableNumber}</h3>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
            alt="QR Code"
            style={{ margin: '16px 0' }}
          />
          <p style={{ wordBreak: 'break-all', fontSize: '0.8rem', color: '#666' }}>{qrUrl}</p>
        </div>
      )}
    </div>
  )
}
