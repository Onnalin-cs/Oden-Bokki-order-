'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export default function TableOpenPage() {
  const [tableNumber, setTableNumber] = useState('')
  const [adultCount, setAdultCount] = useState(0)
  const [childCount, setChildCount] = useState(0)
  const [qrUrl, setQrUrl] = useState('')
  const [loading, setLoading] = useState(false)

  // ราคาหัวต่อคน (ปรับราคาตามต้องการได้)
  const ADULT_PRICE = 219
  const CHILD_PRICE = 109

  // คำนวณยอดประเมินรวม
  const estimatedTotal = (Number(adultCount) * ADULT_PRICE) + (Number(childCount) * CHILD_PRICE)

  const handleOpenTable = async (e) => {
    e.preventDefault()
    if (!tableNumber) return alert('กรุณาระบุหมายเลขโต๊ะ')

    setLoading(true)
    setQrUrl('')

    const tableNum = Number(tableNumber)

    try {
      // 1. ตรวจสอบว่ามีเซสชันโต๊ะนี้เปิดค้างอยู่หรือไม่
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('table_number', tableNum)
        .eq('status', 'open')
        .maybeSingle()

      if (existingSession) {
        alert(`⚠️ โต๊ะ ${tableNum} กำลังมีลูกค้านั่งอยู่! กรุณาเช็กบิล/ปิดโต๊ะเดิมก่อนเปิดใหม่ครับ`)
        setLoading(false)
        return
      }

      // 2. สร้าง Token สุ่มสำหรับ QR Code
      const newToken = crypto.randomUUID()

      // 3. บันทึกเซสชันลงฐานข้อมูล Supabase
      const { data: newSession, error: insertError } = await supabase
        .from('sessions')
        .insert([
          {
            table_number: tableNum,
            adult_count: Number(adultCount),
            child_count: Number(childCount),
            total_amount: estimatedTotal,
            status: 'open',
            token: newToken
          }
        ])
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505' || insertError.message.includes('unique_open_table_session')) {
          alert(`⚠️ โต๊ะ ${tableNum} กำลังมีลูกค้านั่งอยู่! กรุณาเช็กบิล/ปิดโต๊ะเดิมก่อนเปิดใหม่ครับ`)
        } else {
          alert('เกิดข้อผิดพลาดในการเปิดโต๊ะ: ' + insertError.message)
        }
        setLoading(false)
        return
      }

      // 4. สร้าง URL ลิงก์สำหรับสแกนเข้าสั่งอาหาร
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
    <div style={styles.pageBackground}>
      <div style={styles.topNav}>
        <span style={styles.backLink}>← หน้าแรก</span>
        <div style={styles.topBadge}>📱 เปิดโต๊ะ & QR Code</div>
      </div>

      <div style={styles.cardContainer}>
        <div style={styles.headerBox}>
          <div style={styles.iconHeader}>📱</div>
          <h1 style={styles.mainTitle}>เปิดโต๊ะลูกค้า</h1>
          <p style={styles.subTitle}>Oden-Bokki — โอเด้งบ็อกกี</p>
        </div>

        <form onSubmit={handleOpenTable} style={styles.formGroup}>
          <div>
            <label style={styles.inputLabel}>เลขโต๊ะ</label>
            <input
              type="number"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="เช่น 12"
              required
              style={styles.tableInput}
            />
          </div>

          <div style={styles.peopleGrid}>
            <div>
              <label style={styles.peopleLabel}>👥 ผู้ใหญ่</label>
              <input
                type="number"
                min="0"
                value={adultCount}
                onChange={(e) => setAdultCount(e.target.value)}
                style={styles.peopleInput}
              />
              <span style={styles.priceSubText}>คนละ {ADULT_PRICE} บาท</span>
            </div>

            <div>
              <label style={styles.peopleLabel}>👶 เด็ก</label>
              <input
                type="number"
                min="0"
                value={childCount}
                onChange={(e) => setChildCount(e.target.value)}
                style={styles.peopleInput}
              />
              <span style={styles.priceSubText}>คนละ {CHILD_PRICE} บาท</span>
            </div>
          </div>

          <div style={styles.totalBar}>
            <span style={styles.totalLabel}>💵 ยอดประเมิน</span>
            <span style={styles.totalAmount}>{estimatedTotal} บาท</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={styles.submitButton}
          >
            {loading ? 'กำลังเปิดโต๊ะ...' : '📱 เปิดโต๊ะ'}
          </button>
        </form>

        {qrUrl && (
          <div style={styles.successBox}>
            <h3 style={{ color: '#10B981', margin: '0 0 8px 0' }}>✅ เปิดโต๊ะสำเร็จ!</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#666' }}>
              ลิงก์สำหรับสร้าง QR Code โต๊ะ {tableNumber}:
            </p>
            <input
              type="text"
              readOnly
              value={qrUrl}
              style={styles.qrUrlInput}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  pageBackground: {
    backgroundColor: '#FAF5EF',
    minHeight: '100vh',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  topNav: {
    width: '100%',
    maxWidth: '440px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  backLink: {
    fontSize: '0.9rem',
    color: '#888',
    cursor: 'pointer'
  },
  topBadge: {
    backgroundColor: '#F3EAE0',
    color: '#C85A32',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '28px 24px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.03)'
  },
  headerBox: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  iconHeader: {
    fontSize: '2rem',
    marginBottom: '4px'
  },
  mainTitle: {
    fontSize: '1.6rem',
    fontWeight: 'bold',
    color: '#2C2C2C',
    margin: 0
  },
  subTitle: {
    fontSize: '0.85rem',
    color: '#AAA',
    margin: '4px 0 0 0'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputLabel: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: '8px',
    display: 'block'
  },
  tableInput: {
    width: '100%',
    padding: '14px',
    borderRadius: '16px',
    border: '1px solid #EAEAEA',
    backgroundColor: '#F9F9F9',
    fontSize: '1.2rem',
    textAlign: 'center',
    boxSizing: 'border-box',
    outline: 'none'
  },
  peopleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  peopleLabel: {
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: '6px',
    display: 'block'
  },
  peopleInput: {
    width: '100%',
    padding: '12px',
    borderRadius: '14px',
    border: '1px solid #EAEAEA',
    backgroundColor: '#F9F9F9',
    fontSize: '1.1rem',
    textAlign: 'center',
    boxSizing: 'border-box',
    outline: 'none'
  },
  priceSubText: {
    display: 'block',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#AAA',
    marginTop: '6px'
  },
  totalBar: {
    backgroundColor: '#C85A32',
    color: '#FFFFFF',
    padding: '14px 20px',
    borderRadius: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(200, 90, 50, 0.2)'
  },
  totalLabel: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    opacity: 0.9
  },
  totalAmount: {
    fontSize: '1.3rem',
    fontWeight: 'bold'
  },
  submitButton: {
    backgroundColor: '#C85A32',
    color: '#FFFFFF',
    border: 'none',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 4px 12px rgba(200, 90, 50, 0.25)',
    transition: 'all 0.2s ease'
  },
  successBox: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#E6F7ED',
    borderRadius: '16px',
    textAlign: 'center'
  },
  qrUrlInput: {
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #A7F3D0',
    backgroundColor: '#FFF',
    fontSize: '0.8rem',
    boxSizing: 'border-box'
  }
}
