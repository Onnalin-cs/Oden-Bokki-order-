'use client'

import { use, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function OrderPage({ params }) {
  const resolvedParams = use(params)
  const tableId = resolvedParams.tableId
  
  const searchParams = useSearchParams()
  const token = searchParams.get('token') // อ่านค่า ?token=... จาก URL

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setError('กรุณาสแกน QR Code จากที่โต๊ะอาหาร')
        setLoading(false)
        return
      }

      // ตรวจสอบว่าโต๊ะนี้ และ Token นี้ ยังเปิดอยู่อย่างถูกต้องไหม
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('table_number', Number(tableId))
        .eq('token', token)
        .eq('status', 'open')
        .single()

      if (error || !data) {
        setError('QR Code นี้หมดอายุแล้ว หรือโต๊ะนี้ถูกเช็กบิลเรียบร้อยแล้ว')
      } else {
        setSession(data)
      }
      setLoading(false)
    }

    verifySession()
  }, [tableId, token])

  // ยืนยันการสั่งอาหาร (ไม่ต้องใช้ User Login)
  const handleSubmitOrder = async (cartItems) => {
    const { error } = await supabase
      .from('orders')
      .insert([
        {
          session_id: session.id, // ผูกออเดอร์เข้ากับ Session ของโต๊ะ
          table_number: Number(tableId),
          items: cartItems,
          status: 'pending' // ส่งเข้าครัว
        }
      ])

    if (!error) {
      alert('ส่งรายการอาหารเข้าครัวเรียบร้อยแล้วครับ!')
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>กำลังเข้าสู่ระบบโต๊ะอาหาร...</div>
  if (error) return <div style={{ textAlign: 'center', padding: '40px', color: '#D32F2F' }}>⚠️ {error}</div>

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>🍢 สั่งอาหาร โต๊ะ {tableId}</h2>
      <p style={{ color: '#666' }}>สั่งได้เลยทันทีโดยไม่ต้องล็อกอิน</p>
      
      {/* แสดงรายการเมนูให้เลือกสั่งตรงนี้ */}
    </div>
  )
}
