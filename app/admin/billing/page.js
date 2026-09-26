'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export default function BillingPage() {
  const [openSessions, setOpenSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [sessionOrders, setSessionOrders] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('qr') // 'qr' หรือ 'cash'
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  // 1. ดึงโต๊ะทั้งหมดที่กำลังใช้งานอยู่ (status = 'open')
  const fetchOpenSessions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'open')
      .order('table_number', { ascending: true })

    if (data) {
      setOpenSessions(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOpenSessions()
  }, [])

  // 2. เมื่อเลือกโต๊ะ ให้ดึงรายการออเดอร์ทั้งหมดของโต๊ะนั้นมาคำนวณยอดเงิน
  const handleSelectSession = async (session) => {
    setSelectedSession(session)
    setSessionOrders([])

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('session_id', session.id)

    if (orders) {
      setSessionOrders(orders)
    }
  }

  // คำนวณราคารวมทั้งหมดของเซสชันนี้
  const calculateTotal = () => {
    let total = 0
    sessionOrders.forEach((order) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item) => {
          total += (Number(item.price) || 0) * (Number(item.quantity) || 1)
        })
      }
    })
    return total
  }

  // 3. ฟังก์ชันกดยืนยันการชำระเงินและปิดโต๊ะ
  const handleCheckout = async () => {
    if (!selectedSession) return
    const totalAmount = calculateTotal()

    const confirmText = paymentMethod === 'qr' ? 'สแกน QR / โอนเงิน' : 'เงินสด'
    if (!confirm(`ยืนยันการรับชำระเงินด้วย [${confirmText}] ยอดรวม ${totalAmount} บาท และปิดโต๊ะ ${selectedSession.table_number}?`)) {
      return
    }

    setProcessing(true)

    // อัปเดตสถานะ session เป็น 'closed' พร้อมบันทึกวิธีชำระเงินและยอดเงิน
    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'closed',
        payment_method: paymentMethod,
        total_amount: totalAmount
      })
      .eq('id', selectedSession.id)

    if (!error) {
      alert(`🎉 รับชำระเงินเรียบร้อยแล้ว! โต๊ะ ${selectedSession.table_number} พร้อมรับลูกค้ารายใหม่`)
      setSelectedSession(null)
      setSessionOrders([])
      fetchOpenSessions() // ดึงรายการโต๊ะใหม่
    } else {
      alert('เกิดข้อผิดพลาดในการบันทึกการชำระเงิน: ' + error.message)
    }
    setProcessing(false)
  }

  if (loading) {
    return <div style={styles.center}>กำลังโหลดข้อมูลโต๊ะ...</div>
  }

  const grandTotal = calculateTotal()

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>💳 ระบบเช็กบิล / เรียกเก็บเงิน</h1>
        <p>เลือกโต๊ะที่ต้องการชำระเงิน</p>
      </header>

      <div style={styles.contentGrid}>
        {/* ฝั่งซ้าย: รายชื่อโต๊ะที่กำลังนั่งทานอยู่ */}
        <div style={styles.tableListSection}>
          <h3>โต๊ะที่มีลูกค้า ({openSessions.length} โต๊ะ)</h3>
          {openSessions.length === 0 ? (
            <p style={{ color: '#888' }}>ไม่มีโต๊ะที่กำลังใช้งานอยู่ในขณะนี้</p>
          ) : (
            <div style={styles.tableGrid}>
              {openSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSession(s)}
                  style={{
                    ...styles.tableCard,
                    backgroundColor: selectedSession?.id === s.id ? '#C85A32' : '#FFFFFF',
                    color: selectedSession?.id === s.id ? '#FFFFFF' : '#333333'
                  }}
                >
                  <div style={styles.tableCardTitle}>โต๊ะ {s.table_number}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    ผู้ใหญ่: {s.adult_count || 0} | เด็ก: {s.child_count || 0}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ฝั่งขวา: รายละเอียดใบแจ้งหนี้และการชำระเงิน */}
        {selectedSession ? (
          <div style={styles.billDetailSection}>
            <h2>🧾 ใบแจ้งหนี้ - โต๊ะ {selectedSession.table_number}</h2>
            
            <div style={styles.itemList}>
              <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>รายการอาหารที่สั่งทั้งหมด:</p>
              {sessionOrders.length === 0 ? (
                <p style={{ color: '#888' }}>ยังไม่มีรายการอาหารที่สั่ง</p>
              ) : (
                sessionOrders.map((order, oIdx) => (
                  <div key={oIdx}>
                    {Array.isArray(order.items) &&
                      order.items.map((item, iIdx) => (
                        <div key={iIdx} style={styles.itemRow}>
                          <span>{item.menu_name} x {item.quantity}</span>
                          <span>{item.price * item.quantity} บาท</span>
                        </div>
                      ))}
                  </div>
                ))
              )}
            </div>

            <div style={styles.totalRow}>
              <span>ยอดรวมทั้งสิ้น:</span>
              <span style={{ fontSize: '1.5rem', color: '#C85A32', fontWeight: 'bold' }}>
                {grandTotal} บาท
              </span>
            </div>

            {/* ส่วนเลือกวิธีการชำระเงิน */}
            <div style={styles.paymentMethodSection}>
              <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>ช่องทางการชำระเงิน:</p>
              <div style={styles.radioGroup}>
                <label style={{
                  ...styles.radioBtn,
                  borderColor: paymentMethod === 'qr' ? '#C85A32' : '#DDD',
                  backgroundColor: paymentMethod === 'qr' ? '#FAF5EF' : '#FFF'
                }}>
                  <input
                    type="radio"
                    name="payment"
                    value="qr"
                    checked={paymentMethod === 'qr'}
                    onChange={() => setPaymentMethod('qr')}
                  />
                  <span>📱 สแกน QR / โอนเงิน</span>
                </label>

                <label style={{
                  ...styles.radioBtn,
                  borderColor: paymentMethod === 'cash' ? '#C85A32' : '#DDD',
                  backgroundColor: paymentMethod === 'cash' ? '#FAF5EF' : '#FFF'
                }}>
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={() => setPaymentMethod('cash')}
                  />
                  <span>💵 เงินสด</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={processing}
              style={styles.checkoutBtn}
            >
              {processing ? 'กำลังบันทึก...' : '✅ ยืนยันชำระเงิน และปิดโต๊ะ'}
            </button>
          </div>
        ) : (
          <div style={styles.placeholderSection}>
            👈 กรุณาเลือกโต๊ะฝั่งซ้ายเพื่อเช็กบิล
          </div>
        )}
      </div>
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
    marginBottom: '20px'
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr',
    gap: '24px'
  },
  tableListSection: {
    backgroundColor: '#FFF',
    padding: '20px',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  },
  tableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: '12px',
    marginTop: '12px'
  },
  tableCard: {
    border: '1px solid #EAEAEA',
    borderRadius: '12px',
    padding: '16px 8px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  tableCardTitle: {
    fontWeight: 'bold',
    fontSize: '1.1rem',
    marginBottom: '4px'
  },
  billDetailSection: {
    backgroundColor: '#FFF',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  itemList: {
    backgroundColor: '#FAF5EF',
    padding: '12px 16px',
    borderRadius: '12px',
    maxHeight: '200px',
    overflowY: 'auto'
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #EAEAEA',
    fontSize: '0.95rem'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderTop: '2px solid #EAEAEA',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  paymentMethodSection: {
    marginTop: '8px'
  },
  radioGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  radioBtn: {
    flex: 1,
    border: '2px solid',
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  checkoutBtn: {
    backgroundColor: '#10B981',
    color: '#FFF',
    border: 'none',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '12px'
  },
  placeholderSection: {
    backgroundColor: '#FFF',
    padding: '40px',
    borderRadius: '16px',
    textAlign: 'center',
    color: '#888',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}
