'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [newOrderToast, setNewOrderToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const audioCtxRef = useRef(null)

  // 1. ฟังก์ชันกระตุ้นระบบเสียง (ต้องทำผ่านการคลิกของผู้ใช้ 1 ครั้ง)
  const enableAudio = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
      setAudioEnabled(true)
      // เล่นเสียงทดสอบสั้นๆ ให้รู้ว่าเปิดเสียงสำเร็จแล้ว
      playKitchenBell()
    } catch (e) {
      console.log('Audio error:', e)
    }
  }

  // 2. ฟังก์ชันเล่นเสียงกระดิ่งครัว (Ding-Dong)
  const playKitchenBell = () => {
    try {
      if (!audioCtxRef.current) return
      const ctx = audioCtxRef.current

      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const playNote = (freq, startTime, duration) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq

        gain.gain.setValueAtTime(0.3, startTime)
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(startTime)
        osc.stop(startTime + duration)
      }

      const now = ctx.currentTime
      playNote(880, now, 0.6)         // เสียงกระดิ่งช็อตที่ 1
      playNote(1174.66, now + 0.15, 0.8) // เสียงกระดิ่งช็อตที่ 2
    } catch (e) {
      console.log('Audio playback error:', e)
    }
  }

  // ดึงรายการออเดอร์ที่ยังไม่ได้เสิร์ฟ
  const fetchActiveOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['pending', 'cooking'])
      .order('created_at', { ascending: true })

    if (!error && data) {
      setOrders(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchActiveOrders()

    // Subscribe สัญญาณ Realtime จากตาราง orders
    const channel = supabase
      .channel('realtime-kitchen-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new

          // เล่นเสียงกระดิ่งเตือน
          playKitchenBell()

          // แสดง Toast ป๊อปอัปแจ้งเตือนออเดอร์ใหม่
          setNewOrderToast(`🔔 ออเดอร์ใหม่! โต๊ะ ${newOrder.table_number || 'ไม่ระบุ'}`)
          setTimeout(() => setNewOrderToast(null), 5000)

          fetchActiveOrders()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          fetchActiveOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ฟังก์ชันอัปเดตสถานะออเดอร์
  const handleUpdateStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (!error) {
      fetchActiveOrders()
    } else {
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + error.message)
    }
  }

  const getMinutesElapsed = (createdAt) => {
    const start = new Date(createdAt).getTime()
    const now = new Date().getTime()
    return Math.floor((now - start) / 60000)
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <h2>👨‍🍳 กำลังโหลดจอแสดงผลครัว...</h2>
      </div>
    )
  }

  return (
    <div style={styles.pageBackground}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>👨‍🍳 Oden-Bokki Kitchen Display (KDS)</h1>
          <p style={styles.subTitle}>ระบบจัดการรายการอาหารในครัวแบบ Realtime</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* ปุ่มเปิดเสียงเพื่อปลุก Autoplay ของเบราว์เซอร์ */}
          <button
            onClick={enableAudio}
            style={{
              ...styles.audioBtn,
              backgroundColor: audioEnabled ? '#10B981' : '#EF4444'
            }}
          >
            {audioEnabled ? '🔔 เปิดเสียงเรียบร้อย' : '🔊 กดเปิดเสียงแจ้งเตือน'}
          </button>

          <div style={styles.orderBadge}>
            รอประกอบอาหาร: {orders.length} รายการ
          </div>
        </div>
      </header>

      {/* 🔔 ป๊อปอัป Toast แจ้งเตือน Realtime */}
      {newOrderToast && (
        <div style={styles.toastNotification}>
          <span style={{ fontSize: '1.8rem' }}>🔔</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{newOrderToast}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>รายการอาหารใหม่เข้าครัวแล้ว!</div>
          </div>
        </div>
      )}

      {/* Order Grid */}
      <main style={styles.gridContainer}>
        {orders.length === 0 ? (
          <div style={styles.emptyState}>
            ☕ ไม่มีออเดอร์ค้างในครัวขณะนี้
          </div>
        ) : (
          orders.map((order) => {
            const minutes = getMinutesElapsed(order.created_at)
            const isLate = minutes >= 10

            return (
              <div
                key={order.id}
                style={{
                  ...styles.orderCard,
                  borderColor: isLate ? '#EF4444' : order.status === 'cooking' ? '#F59E0B' : '#3B82F6',
                  backgroundColor: isLate ? '#1F1213' : '#1E293B'
                }}
              >
                <div style={styles.cardHeader}>
                  <div style={styles.tableNumber}>โต๊ะ {order.table_number}</div>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: isLate ? '#EF4444' : order.status === 'cooking' ? '#F59E0B' : '#3B82F6'
                  }}>
                    {isLate ? `⚠️ นาน ${minutes} นาที` : order.status === 'cooking' ? '🔥 กำลังปรุง' : '⏳ รอคิว'}
                  </div>
                </div>

                <div style={styles.timeText}>
                  สั่งเมื่อ: {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                </div>

                <div style={styles.itemList}>
                  {Array.isArray(order.items) &&
                    order.items.map((item, idx) => (
                      <div key={idx} style={styles.itemRow}>
                        <span style={styles.itemName}>• {item.menu_name || item.name}</span>
                        <span style={styles.itemQty}>x{item.quantity}</span>
                      </div>
                    ))}
                </div>

                <div style={styles.cardActions}>
                  {order.status === 'pending' ? (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'cooking')}
                      style={styles.cookingBtn}
                    >
                      🔥 เริ่มทำอาหาร
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'served')}
                      style={styles.serveBtn}
                    >
                      ✅ เสิร์ฟแล้ว
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}

const styles = {
  pageBackground: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    minHeight: '100vh',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  loadingContainer: {
    backgroundColor: '#0F172A',
    color: '#FFF',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #334155',
    paddingBottom: '16px',
    marginBottom: '24px'
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 'bold',
    color: '#F59E0B',
    margin: 0
  },
  subTitle: {
    fontSize: '0.85rem',
    color: '#94A3B8',
    margin: '4px 0 0 0'
  },
  audioBtn: {
    color: '#FFF',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  orderBadge: {
    backgroundColor: '#334155',
    padding: '8px 16px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    color: '#F8FAFC'
  },
  toastNotification: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    backgroundColor: '#F59E0B',
    color: '#0F172A',
    padding: '16px 24px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)',
    zIndex: 999
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    color: '#64748B',
    padding: '60px 0',
    fontSize: '1.2rem'
  },
  orderCard: {
    borderRadius: '16px',
    border: '2px solid',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '260px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  tableNumber: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#FFF'
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: '#FFF'
  },
  timeText: {
    fontSize: '0.8rem',
    color: '#94A3B8',
    marginBottom: '12px'
  },
  itemList: {
    flex: 1,
    borderTop: '1px solid #334155',
    borderBottom: '1px solid #334155',
    padding: '12px 0',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '180px',
    overflowY: 'auto'
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemName: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#E2E8F0'
  },
  itemQty: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#F59E0B'
  },
  cardActions: {
    display: 'flex',
    gap: '8px'
  },
  cookingBtn: {
    width: '100%',
    backgroundColor: '#F59E0B',
    color: '#0F172A',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    cursor: 'pointer'
  },
  serveBtn: {
    width: '100%',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    cursor: 'pointer'
  }
}
