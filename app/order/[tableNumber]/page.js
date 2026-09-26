'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

export default function CustomerOrderPage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const tableNumber = params.tableNumber
  const token = searchParams.get('token')

  const [sessionData, setSessionData] = useState(null)
  const [categories, setCategories] = useState([])
  const [menus, setMenus] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart, setCart] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  // โมดอลเช็กบิล
  const [showBillModal, setShowBillModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState('qr')
  const [checkoutRequested, setCheckoutRequested] = useState(false)

  const getCategoryEmoji = (categoryName) => {
    if (!categoryName) return '🥢'
    const name = categoryName.toLowerCase()
    if (name.includes('โอเด้ง') || name.includes('oden')) return '🍢'
    if (name.includes('ต๊อก') || name.includes('bokki')) return '🥘'
    if (name.includes('ของทอด') || name.includes('fried')) return '🍤'
    if (name.includes('เครื่องดื่ม') || name.includes('drink')) return '🥤'
    if (name.includes('ซุป') || name.includes('soup')) return '🍜'
    if (name.includes('ของหวาน') || name.includes('dessert')) return '🍦'
    return '🍱'
  }

  useEffect(() => {
    async function initPage() {
      if (!tableNumber || !token) {
        setLoading(false)
        return
      }

      // 1. ตรวจสอบ Session จาก token
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('table_number', Number(tableNumber))
        .eq('token', token)
        .eq('status', 'open')
        .single()

      if (!sessionError && session) {
        setSessionData(session)
        if (session.requested_checkout) {
          setCheckoutRequested(true)
        }
      }

      // 2. ดึงหมวดหมู่ทั้งหมด
      const { data: catData } = await supabase
        .from('menu_categories')
        .select('*')
        .order('id', { ascending: true })

      if (catData && catData.length > 0) {
        setCategories(catData)
        setActiveCategory(catData[0].id)
      }

      // 3. ดึงรายการเมนูจาก menu_items
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .order('id', { ascending: true })

      if (menuData) {
        setMenus(menuData)
      }

      setLoading(false)
    }

    initPage()
  }, [tableNumber, token])

  const updateQuantity = (menuId, change) => {
    setCart((prev) => {
      const currentQty = prev[menuId] || 0
      const newQty = currentQty + change
      if (newQty <= 0) {
        const updated = { ...prev }
        delete updated[menuId]
        return updated
      }
      return { ...prev, [menuId]: newQty }
    })
  }

  const handleSubmitOrder = async () => {
    const cartItems = Object.keys(cart).map((menuId) => {
      const menu = menus.find((m) => m.id === Number(menuId))
      return {
        menu_id: Number(menuId),
        menu_name: menu?.name || '',
        price: menu?.price || 0,
        quantity: cart[menuId]
      }
    })

    if (cartItems.length === 0) return alert('กรุณาเลือกรายการอาหารก่อนส่งครับ')

    setSubmitting(true)

    const { error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          table_number: Number(tableNumber),
          session_id: sessionData.id,
          items: cartItems,
          status: 'pending'
        }
      ])

    if (orderError) {
      alert('เกิดข้อผิดพลาดในการส่งออเดอร์: ' + orderError.message)
    } else {
      setOrderSuccess(true)
      setCart({})
    }

    setSubmitting(false)
  }

  // ฟังก์ชันส่งสัญญาณเรียกเช็กบิล
  const handleRequestCheckout = async () => {
    if (!sessionData) return

    setSubmitting(true)
    const { error } = await supabase
      .from('sessions')
      .update({
        requested_checkout: true,
        payment_method: selectedPayment
      })
      .eq('id', sessionData.id)

    if (!error) {
      setCheckoutRequested(true)
      setShowBillModal(false)
    } else {
      alert('เกิดข้อผิดพลาดในการเรียกเก็บเงิน: ' + error.message)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <p style={{ color: '#888' }}>กำลังโหลดเมนูอาหาร...</p>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.errorCard}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>⚠️ ไม่พบข้อมูลโต๊ะอาหาร</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>กรุณาสแกน QR Code ใหม่ หรือติดต่อพนักงานครับ</p>
        </div>
      </div>
    )
  }

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const filteredMenus = activeCategory
    ? menus.filter((item) => item.category_id === activeCategory)
    : menus

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>Oden-Bokki</h1>
          <p style={styles.headerSub}>โต๊ะ {tableNumber}</p>
        </div>
        <button
          onClick={() => setShowBillModal(true)}
          style={styles.callBillBtn}
        >
          💳 เรียกเช็กบิล
        </button>
      </header>

      {/* แจ้งเตือนเมื่อเรียกเช็กบิลแล้ว */}
      {checkoutRequested && (
        <div style={styles.checkoutAlert}>
          🔔 แจ้งเรียกพนักงานมาเช็กบิลแล้วครับ กรุณารอพนักงานสักครู่...
        </div>
      )}

      {/* Categories Bar */}
      {categories.length > 0 && (
        <div style={styles.categoryBar}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  ...styles.categoryTab,
                  backgroundColor: isActive ? '#C85A32' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#4A4A4A',
                  borderColor: isActive ? '#C85A32' : '#EAEAEA',
                  fontWeight: isActive ? 'bold' : 'normal'
                }}
              >
                <span>{getCategoryEmoji(cat.name)}</span>
                <span>{cat.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Order Success Alert */}
      {orderSuccess && (
        <div style={styles.successAlert}>
          <span>🎉 ส่งออเดอร์เข้าครัวเรียบร้อยแล้วครับ!</span>
          <button onClick={() => setOrderSuccess(false)} style={styles.closeAlertBtn}>✕</button>
        </div>
      )}

      {/* Menu List */}
      <main style={styles.menuList}>
        {filteredMenus.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', marginTop: '40px' }}>ไม่มีรายการอาหารในหมวดนี้</p>
        ) : (
          filteredMenus.map((menu) => (
            <div key={menu.id} style={styles.menuCard}>
              <div style={styles.menuImageContainer}>
                {menu.image_url ? (
                  <img src={menu.image_url} alt={menu.name} style={styles.menuImage} />
                ) : (
                  <div style={styles.placeholderImage}>
                    {getCategoryEmoji(
                      categories.find((c) => c.id === menu.category_id)?.name
                    )}
                  </div>
                )}
              </div>

              <div style={styles.menuInfo}>
                <h3 style={styles.menuName}>{menu.name}</h3>
                <p style={styles.menuPrice}>
                  {menu.price > 0 ? `${menu.price} บาท` : 'บุฟเฟต์'}
                </p>
              </div>

              <div style={styles.qtyControl}>
                {cart[menu.id] ? (
                  <>
                    <button onClick={() => updateQuantity(menu.id, -1)} style={styles.qtyBtn}>-</button>
                    <span style={styles.qtyText}>{cart[menu.id]}</span>
                    <button onClick={() => updateQuantity(menu.id, 1)} style={styles.qtyBtn}>+</button>
                  </>
                ) : (
                  <button onClick={() => updateQuantity(menu.id, 1)} style={styles.addBtn}>
                    + เพิ่ม
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Bottom Cart Bar */}
      {totalCartCount > 0 && (
        <div style={styles.bottomBar}>
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            style={styles.submitOrderBtn}
          >
            {submitting ? 'กำลังส่งออเดอร์...' : `🛒 ส่งออเดอร์เข้าครัว (${totalCartCount} รายการ)`}
          </button>
        </div>
      )}

      {/* Modal ป๊อปอัปเลือกชำระเงิน */}
      {showBillModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={{ margin: '0 0 12px 0' }}>💳 เรียกพนักงานเช็กบิล</h3>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '16px' }}>
              กรุณาเลือกช่องทางการชำระเงินที่คุณสะดวก:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{
                ...styles.paymentOption,
                borderColor: selectedPayment === 'qr' ? '#C85A32' : '#DDD',
                backgroundColor: selectedPayment === 'qr' ? '#FAF5EF' : '#FFF'
              }}>
                <input
                  type="radio"
                  name="payment"
                  checked={selectedPayment === 'qr'}
                  onChange={() => setSelectedPayment('qr')}
                />
                <span>📱 สแกน QR Code / โอนเงิน</span>
              </label>

              <label style={{
                ...styles.paymentOption,
                borderColor: selectedPayment === 'cash' ? '#C85A32' : '#DDD',
                backgroundColor: selectedPayment === 'cash' ? '#FAF5EF' : '#FFF'
              }}>
                <input
                  type="radio"
                  name="payment"
                  checked={selectedPayment === 'cash'}
                  onChange={() => setSelectedPayment('cash')}
                />
                <span>💵 เงินสด</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowBillModal(false)}
                style={styles.cancelModalBtn}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRequestCheckout}
                disabled={submitting}
                style={styles.confirmModalBtn}
              >
                {submitting ? 'กำลังส่ง...' : 'ยืนยันเรียกพนักงาน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: '#FAF5EF',
    minHeight: '100vh',
    paddingBottom: '100px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  centerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#FAF5EF',
    padding: '20px'
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '20px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  headerTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#C85A32',
    margin: 0
  },
  headerSub: {
    fontSize: '0.8rem',
    color: '#666',
    margin: 0,
    fontWeight: 'bold'
  },
  callBillBtn: {
    backgroundColor: '#10B981',
    color: '#FFF',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  checkoutAlert: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: '12px 20px',
    margin: '12px 16px 0 16px',
    borderRadius: '14px',
    fontSize: '0.85rem',
    fontWeight: '600',
    textAlign: 'center'
  },
  categoryBar: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    padding: '12px 16px',
    backgroundColor: '#FAF5EF',
    position: 'sticky',
    top: '57px',
    zIndex: 9,
    scrollbarWidth: 'none'
  },
  categoryTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  successAlert: {
    backgroundColor: '#E6F7ED',
    color: '#10B981',
    padding: '12px 20px',
    margin: '12px 16px 0 16px',
    borderRadius: '16px',
    fontSize: '0.9rem',
    fontWeight: '600',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeAlertBtn: {
    background: 'none',
    border: 'none',
    color: '#10B981',
    fontSize: '1rem',
    cursor: 'pointer'
  },
  menuList: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '500px',
    margin: '0 auto'
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '18px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  },
  menuImageContainer: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    overflow: 'hidden',
    backgroundColor: '#FAF5EF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  menuImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  placeholderImage: {
    fontSize: '1.8rem'
  },
  menuInfo: {
    flex: 1
  },
  menuName: {
    margin: '0 0 4px 0',
    fontSize: '0.95rem',
    color: '#2C2C2C',
    fontWeight: '600'
  },
  menuPrice: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#888'
  },
  qtyControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  addBtn: {
    backgroundColor: '#FAF5EF',
    color: '#C85A32',
    border: '1px solid #C85A32',
    padding: '6px 14px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  qtyBtn: {
    backgroundColor: '#C85A32',
    color: '#FFFFFF',
    border: 'none',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer'
  },
  qtyText: {
    fontWeight: 'bold',
    fontSize: '0.95rem',
    minWidth: '16px',
    textAlign: 'center'
  },
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: '12px 20px',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.05)',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 20
  },
  submitOrderBtn: {
    backgroundColor: '#C85A32',
    color: '#FFFFFF',
    border: 'none',
    padding: '14px 24px',
    borderRadius: '16px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '500px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: '20px'
  },
  modalCard: {
    backgroundColor: '#FFF',
    padding: '20px',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '360px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
  },
  paymentOption: {
    border: '2px solid',
    padding: '12px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.95rem'
  },
  cancelModalBtn: {
    flex: 1,
    padding: '10px',
    border: '1px solid #DDD',
    backgroundColor: '#FFF',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  confirmModalBtn: {
    flex: 1,
    padding: '10px',
    border: 'none',
    backgroundColor: '#10B981',
    color: '#FFF',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
}
