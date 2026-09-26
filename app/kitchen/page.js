'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient' // ปรับ path ตามโครงสร้างของคุณ

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. ฟังก์ชันดึงรายการออเดอร์จาก Supabase
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending') // ดึงเฉพาะออเดอร์ที่รอดำเนินการ
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    // 2. ระบบ Realtime - พอมีออเดอร์ส่งเข้ามาปุ๊บ หน้าจอจะเด้งทันทีโดยไม่ต้องกดรีเฟรช
    const subscription = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders() // ดึงข้อมูลใหม่ทันทีเมื่อมีการ Insert หรือ Update
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  // 3. ฟังก์ชันอัปเดตสถานะเมื่อทำอาหารเสร็จแล้ว
  const handleCompleteOrder = async (orderId) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId)

    if (!error) {
      // เอาออเดอร์ที่เสร็จแล้วออกจากหน้าจอครัว
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    } else {
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <p>กำลังโหลดข้อมูลออเดอร์...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>👨‍🍳 หน้าจอห้องครัว (Kitchen Dashboard)</h1>
        <p>จำนวนออเดอร์ที่รอทำ: {orders.length} รายการ</p>
      </header>

      {orders.length === 0 ? (
        <div style={styles.emptyState}>
          <h2>🍳 ยังไม่มีออเดอร์เข้ามาในขณะนี้</h2>
          <p>เมื่อลูกค้าสั่งอาหาร รายการจะแสดงขึ้นที่นี่อัตโนมัติ</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {orders.map((order) => (
            <div key={order.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.tableBadge}>โต๊ะ {order.table_number}</span>
                <span style={styles.timeText}>
                  {new Date(order.created_at).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <div style={styles.itemList}>
                {/* อ่านรายการอาหารจากคอลัมน์ items */}
                {Array.isArray(order.items) &&
                  order.items.map((item, idx) => (
                    <div key={idx} style={styles.itemRow}>
                      <span style={styles.itemName}>• {item.menu_name}</span>
                      <span style={styles.itemQty}>x{item.quantity}</span>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => handleCompleteOrder(order.id)}
                style={styles.doneBtn}
              >
                ✅ ทำเสร็จแล้ว / พร้อมเสิร์ฟ
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#FAF5EF',
    minHeight: '100vh',
    fontFamily: 'sans-serif'
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '24px',
    borderBottom: '2px solid #EAEAEA',
    paddingBottom: '12px'
  },
  emptyState: {
    textAlign: 'center',
    marginTop: '60px',
    color: '#888'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px dashed #EEE'
  },
  tableBadge: {
    backgroundColor: '#C85A32',
    color: '#FFF',
    padding: '4px 12px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  timeText: {
    color: '#888',
    fontSize: '0.85rem'
  },
  itemList: {
    margin: '12px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '1rem',
    color: '#333'
  },
  itemName: {
    fontWeight: '500'
  },
  itemQty: {
    fontWeight: 'bold',
    color: '#C85A32'
  },
  doneBtn: {
    backgroundColor: '#10B981',
    color: '#FFF',
    border: 'none',
    padding: '10px',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '12px',
    width: '100%'
  }
}
