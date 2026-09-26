'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function GenerateQRPage() {
  const [tableNumber, setTableNumber] = useState('')
  const [adultCount, setAdultCount] = useState('')
  const [childCount, setChildCount] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdSession, setCreatedSession] = useState(null)
  const [copied, setCopied] = useState(false)

  const adultPrice = 219
  const childPrice = 109
  const totalAmount = ((Number(adultCount) || 0) * adultPrice) + ((Number(childCount) || 0) * childPrice)

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
          adult_count: Number(adultCount) || 0,
          child_count: Number(childCount) || 0,
          status: 'open',
          token: token
        }
      ])
      .select()
      .single()

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } else {
      setCreatedSession(data)
    }
    setLoading(false)
  }

  const getOrderUrl = () => {
    if (typeof window === 'undefined' || !createdSession) return ''
    return `${window.location.origin}/order/${createdSession.table_number}?token=${createdSession.token}`
  }

  const handleCopyLink = () => {
    const url = getOrderUrl()
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setCreatedSession(null)
    setTableNumber('')
    setAdultCount('')
    setChildCount('')
  }

  return (
    <div style={styles.container}>
      {!createdSession ? (
        <>
          <div style={styles.header}>
            <div style={styles.titleRow}>
              <span style={{ fontSize: '1.8rem' }}>📱</span>
              <h1 style={styles.title}>เปิดโต๊ะลูกค้า</h1>
            </div>
            <p style={styles.subtitle}>Oden-Bokki — โอเด้งบ็อกกี</p>
          </div>

          <div style={styles.card}>
            <form onSubmit={handleOpenTable} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>เลขโต๊ะ</label>
                <input
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="เช่น 12"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.row}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>🧑‍🤝‍🧑 ผู้ใหญ่</label>
                  <input
                    type="number"
                    min="0"
                    value={adultCount}
                    onChange={(e) => setAdultCount(e.target.value)}
                    placeholder="0"
                    style={{ ...styles.input, textAlign: 'center' }}
                  />
                  <span style={styles.subText}>คนละ 219 บาท</span>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>👶 เด็ก</label>
                  <input
                    type="number"
                    min="0"
                    value={childCount}
                    onChange={(e) => setChildCount(e.target.value)}
                    placeholder="0"
                    style={{ ...styles.input, textAlign: 'center' }}
                  />
                  <span style={styles.subText}>คนละ 109 บาท</span>
                </div>
              </div>

              <div style={styles.estimateBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💵</span>
                  <span>ยอดประเมิน</span>
                </div>
                <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
                  {totalAmount.toLocaleString()} บาท
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ ...styles.submitButton, opacity: loading ? 0.7 : 1 }}
              >
                <span style={{ fontSize: '1.1rem' }}>🧾</span>
                {loading ? 'กำลังเปิดโต๊ะ...' : 'เปิดโต๊ะ'}
              </button>
            </form>
          </div>
        </>
      ) : (
        /* UI แบบเดิมจากรูป IMG_0879.jpg */
        <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={styles.resultCard}>
            <div style={styles.successBadge}>
              ✓ เปิดโต๊ะสำเร็จ
            </div>

            <div style={styles.qrBox}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(getOrderUrl())}`}
                alt={`QR Code โต๊ะ ${createdSession.table_number}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            <div style={styles.summaryCard}>
              <h2 style={styles.tableTitle}>โต๊ะ {createdSession.table_number}</h2>
              <div style={styles.peopleCount}>
                <span>🧑‍🤝‍🧑 ผู้ใหญ่ {createdSession.adult_count} คน</span>
                <span>👶 เด็ก {createdSession.child_count} คน</span>
              </div>
              <div style={styles.totalPriceText}>
                ยอดรวม <strong style={{ color: '#C85A32', fontSize: '1.2rem' }}>
                  {((createdSession.adult_count * adultPrice) + (createdSession.child_count * childPrice)).toLocaleString()} บาท
                </strong>
              </div>
            </div>

            <p style={styles.urlText}>{getOrderUrl()}</p>
          </div>

          <div style={styles.actionRow}>
            <button onClick={handleCopyLink} style={styles.actionBtn}>
              📋 {copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
            </button>
            <button onClick={() => window.print()} style={styles.actionBtn}>
              🖨️ พิมพ์ QR Code
            </button>
          </div>

          <button onClick={handleReset} style={styles.nextTableBtn}>
            เปิดโต๊ะถัดไป →
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: '#FAF5EF',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#2C2C2C',
    margin: 0
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#999',
    margin: '4px 0 0 0'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '32px 24px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
    boxSizing: 'border-box'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#4A4A4A'
  },
  input: {
    width: '100%',
    padding: '14px',
    fontSize: '1.1rem',
    borderRadius: '16px',
    border: '1.5px solid #EAEAEA',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#333'
  },
  subText: {
    fontSize: '0.8rem',
    color: '#AAA',
    textAlign: 'center',
    marginTop: '-2px'
  },
  estimateBox: {
    backgroundColor: '#C85A32',
    color: '#FFFFFF',
    padding: '16px 20px',
    borderRadius: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: '600',
    fontSize: '1rem'
  },
  submitButton: {
    backgroundColor: '#C85A32',
    color: '#FFFFFF',
    padding: '16px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%'
  },
  /* สไตล์ผลลัพธ์ตามรูป IMG_0879.jpg */
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
    boxSizing: 'border-box'
  },
  successBadge: {
    backgroundColor: '#E6F7ED',
    color: '#10B981',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    marginBottom: '20px'
  },
  qrBox: {
    width: '100%',
    maxWidth: '240px',
    padding: '12px',
    borderRadius: '16px',
    border: '1px solid #F0F0F0',
    marginBottom: '20px'
  },
  summaryCard: {
    backgroundColor: '#FAF5EF',
    borderRadius: '16px',
    padding: '16px',
    width: '100%',
    textAlign: 'center',
    boxSizing: 'border-box',
    marginBottom: '12px'
  },
  tableTitle: {
    margin: '0 0 8px 0',
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: '#2C2C2C'
  },
  peopleCount: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '12px'
  },
  totalPriceText: {
    fontSize: '0.95rem',
    color: '#666'
  },
  urlText: {
    fontSize: '0.75rem',
    color: '#CCC',
    margin: 0,
    wordBreak: 'break-all',
    textAlign: 'center'
  },
  actionRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    width: '100%'
  },
  actionBtn: {
    backgroundColor: '#FFFFFF',
    color: '#333333',
    border: 'none',
    padding: '14px',
    borderRadius: '16px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  nextTableBtn: {
    backgroundColor: '#C85A32',
    color: '#FFFFFF',
    border: 'none',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 4px 12px rgba(200, 90, 50, 0.2)'
  }
}
