'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioCtxRef = useRef(null)

  // ฟังก์ชันเล่นเสียงแจ้งเตือน (Beep) ผ่าน Web Audio API
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // เสียงความถี่ 880Hz (A5)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch (e) {
      console.error('Audio play error:', e)
    }
  }

  // เปิด/ปิด การใช้งานเสียง
  const toggleSound = () => {
    if (!soundEnabled) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      audioCtxRef.current = new AudioContext()
      playNotificationSound() // ทดสอบเล่น 1 ครั้งตอนเปิด
    }
    setSoundEnabled(!soundEnabled)
  }

  // ดึงข้อมูลออเดอร์แรกเริ่ม
  const fetchPendingOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (!error && data) {
      setOrders(data)
    }
  }

  useEffect(() => {
    fetchPendingOrders()

    // เปิด Realtime ฟังคำสั่งซื้อใหม่
    const channel = supabase
      .channel('kitchen_orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          fetchPendingOrders()
          if (soundEnabled) {
            playNotificationSound()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [soundEnabled])

  // อัปเดตสถานะออเดอร์ (เช่น ทำเสร็จแล้ว)
  const handleUpdateStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (!error) {
      setOrders(orders.filter(o => o.id !== orderId))
    }
  }

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.brandGroup}>
          <div style={styles.logoIcon}>🧑‍🍳</div>
          <div>
            <h1 style={styles.title}>Oden-Bokki Kitchen</h1>
            <p style={styles.subtitle}>หน้าจอควบคุมครัว</p>
          </div>
        </div>

        <div style={styles.headerActions}>
          <div style={styles.badgeCount}>
            <span>♨️</span>
            <span>{orders.length} ออเดอร์รอดำเนินการ</span>
          </div>

          <button
            onClick={toggleSound}
            style={{
              ...styles.soundBtn,
              backgroundColor: soundEnabled ? '#2D1B11' : '#1F1F1F',
              color: soundEnabled ? '#E07A5F' : '#888888',
              borderColor: soundEnabled ? '#E07A5F' : '#333333'
            }}
          >
            <span>{soundEnabled ? '🔊' : '🔇'}</span>
            <span>{soundEnabled ? 'เปิดเสียงแจ้งเตือนแล้ว' : 'ปิดเสียงอยู่'}</span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      <main style={styles.mainContent}>
        {orders.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🍲</div>
            <p style={{ fontSize: '1.2rem', margin: 0 }}>ยังไม่มีออเดอร์เข้ามา 🍳</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {orders.map((order) => (
              <div key={order.id} style={styles.orderCard}>
                <div style={styles.cardHeader}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem' }}>โต๊ะ {order.table_number}</h3>
                  <span style={styles.timeText}>
                    {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div style={styles.itemList}>
                  {order.order_items?.map((item, idx) => (
                    <div key={idx} style={styles.itemRow}>
                      <span style={{ fontWeight: 'bold' }}>{item.menu_name}</span>
                      <span style={styles.qtyBadge}>x{item.quantity}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleUpdateStatus(order.id, 'completed')}
                  style={styles.completeBtn}
                >
                  ✓ ทำเสร็จแล้ว
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: '#171717',
    color: '#FFFFFF',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #282828',
    backgroundColor: '#121212'
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#C85A32',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem'
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    margin: 0,
    color: '#FFFFFF'
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#777777',
    margin: '2px 0 0 0'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  badgeCount: {
    backgroundColor: '#242424',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    color: '#D4D4D4',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid #333333'
  },
  soundBtn: {
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    border: '1px solid',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  mainContent: {
    padding: '32px 24px',
    display: 'flex',
    justifyContent: 'center'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '120px',
    color: '#666666'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    width: '100%'
  },
  orderCard: {
    backgroundColor: '#222222',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #333333',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid #333333'
  },
  timeText: {
    color: '#888888',
    fontSize: '0.85rem'
  },
  itemList: {
    margin: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '1rem'
  },
  qtyBadge: {
    backgroundColor: '#C85A32',
    color: '#FFFFFF',
    padding: '2px 8px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 'bold'
  },
  completeBtn: {
    backgroundColor: '#2E7D32',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    fontSize: '0.95rem'
  }
}
