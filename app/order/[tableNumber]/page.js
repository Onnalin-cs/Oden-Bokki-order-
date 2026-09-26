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
  const [menus, setMenus] = useState([])
  const [cart, setCart] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  useEffect(() => {
    async function initPage() {
      if (!tableNumber || !token) {
        setLoading(false)
        return
      }

      // 1. ตรวจสอบว่าโต๊ะและ token นี้เปิดใช้งานอยู่จริงหรือไม่ (ไม่ต้องล็อกอิน)
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('table_number', Number(tableNumber))
        .eq('token', token)
        .eq('status', 'open')
        .single()

      if (sessionError || !session) {
        setSessionData(null)
      } else {
        setSessionData(session)
      }

      // 2. ดึงรายการเมนูอาหาร
      const { data: menuData } = await supabase
        .from('menus')
        .select('*')
        .order('id', { ascending: true })

      if (menuData) {
        setMenus(menuData)
      }

      setLoading(false)
    }

    initPage()
  }, [tableNumber, token])

  // เพิ่ม/ลด จำนวนสินค้าในตะกร้า
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

  // ส่งออเดอร์เข้าห้องครัว
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

    if (cartItems.length === 0) {
      return alert('กรุณาเลือกรายการอาหารก่อนสั่งครับ')
    }

    setSubmitting(true)

    // บันทึกออเดอร์หลัก
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          table_number: Number(tableNumber),
          session_id: sessionData.id,
          status: 'pending'
        }
      ])
      .select()
      .single()

    if (orderError) {
      alert('เกิดข้อผิดพลาดในการส่งออเดอร์: ' + orderError.message)
      setSubmitting(false)
      return
    }

    // บันทึกรายการอาหารในออเดอร์
    const orderItemsPayload = cartItems.map((item) => ({
      order_id: order.id,
      menu_id: item.menu_id,
      menu_name: item.menu_name,
      price: item.price,
      quantity: item.quantity
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload)

    if (itemsError) {
      alert('เกิดข้อผิดพลาดในการบันทึกรายการอาหาร')
    } else {
      setOrderSuccess(true)
      setCart({})
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  // กรณี QR Code ไม่ถูกต้อง หรือปิดโต๊ะไปแล้ว
  if (!sessionData) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.errorCard}>
          <h2>⚠️ ไม่พบข้อมูลโต๊ะอาหาร</h2>
          <p>ลิงก์สั่งอาหารนี้ไม่ถูกต้อง หรือโต๊ะนี้ถูกปิดไปแล้วครับ</p>
        </div>
      </div>
    )
  }

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  return (
    <div style={styles.container}>
      {/* Header โต๊ะ */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Oden-Bokki</h1>
        <div style={styles.tableBadge}>โต๊ะ {tableNumber}</div>
      </header>

      {/* แจ้งเตือนเมื่อสั่งสำเร็จ */}
      {orderSuccess && (
        <div style={styles.successAlert}>
          🎉 ส่งออเดอร์เรียบร้อยแล้ว! ห้องครัวกำลังเตรียมอาหารให้ครับ
          <button onClick={() => setOrderSuccess(false)} style={styles.closeAlertBtn}>✕</button>
        </div>
      )}

      {/* เมนูอาหาร */}
      <main style={styles.menuList}>
        {menus.map((menu) => (
          <div key={menu.id} style={styles.menuCard}>
            {menu.image_url && (
              <img src={menu.image_url} alt={menu.name} style={styles.menuImage} />
            )}
            <div style={styles.menuInfo}>
              <h3 style={styles.menuName}>{menu.name}</h3>
              <p style={styles.menuPrice}>
                {menu.price > 0 ? `${menu.price} บาท` : 'รวมอยู่ในบุฟเฟต์'}
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
        ))}
      </main>

      {/* แถบกดสั่งอาหารด้านล่าง */}
      {totalCartCount > 0 && (
        <div style={styles.bottomBar}>
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            style={styles.submitOrderBtn}
          >
            {submitting ? 'กำลังส่งออเดอร์...' : `ส่งออเดอร์เข้าครัว (${totalCartCount} รายการ)`}
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
    paddingBottom: '90px',
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
    padding: '32px 24px',
    borderRadius: '24px',
    textAlign: 'center',
    color: '#333',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
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
  tableBadge: {
    backgroundColor: '#C85A32',
    color: '#FFFFFF',
    padding: '6px 14px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '0.9rem'
  },
  successAlert: {
    backgroundColor: '#E6F7ED',
    color: '#10B981',
    padding: '12px 20px',
    margin: '16px',
    borderRadius: '16px',
    fontSize: '0.95rem',
    fontWeight: '600',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeAlertBtn: {
    background: 'none',
    border: 'none',
    color: '#10B981',
    fontSize: '1.1rem',
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
    borderRadius: '16px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  },
  menuImage: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    objectFit: 'cover'
  },
  menuInfo: {
    flex: 1
  },
  menuName: {
    margin: '0 0 4px 0',
    fontSize: '1rem',
    color: '#2C2C2C'
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
    justifyContent: 'center'
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
  }
}
