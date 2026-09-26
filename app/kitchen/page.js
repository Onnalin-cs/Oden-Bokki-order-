'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: true })

      if (!error && data) {
        setOrders(data)
      }
      setLoading(false)
    }

    fetchOrders()
  }, [])

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      backgroundColor: '#1E1E1E',
      color: '#FFFFFF',
      margin: 0,
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333',
        paddingBottom: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '2rem' }}>👨‍🍳</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#FFF' }}>Oden-Bokki Kitchen</h1>
            <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>หน้าจอควบคุมครัว</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            backgroundColor: '#2A2A2A',
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid #444',
            fontSize: '0.95rem'
          }}>
            🍲 <strong>{orders.length}</strong> ออเดอร์รอดำเนินการ
          </div>
        </div>
      </header>

      <main style={{ width: '100%' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '60px' }}>กำลังโหลดข้อมูลออเดอร์...</div>
        ) : orders.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '100px 0',
            color: '#666'
          }}>
            <span style={{ fontSize: '4rem', marginBottom: '16px' }}>🍲</span>
            <p style={{ fontSize: '1.2rem', margin: 0 }}>ยังไม่มีออเดอร์เข้ามา 🍳</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
            width: '100%'
          }}>
            {orders.map((order) => (
              <div key={order.id} style={{
                backgroundColor: '#2A2A2A',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #444'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#C85A32' }}>โต๊ะ {order.table_number}</h3>
                <p style={{ fontSize: '0.85rem', color: '#AAA' }}>สถานะ: {order.status}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
