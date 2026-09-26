// ตอนสั่งสร้าง session ใน Supabase
const { data: newSession, error } = await supabase
  .from('sessions')
  .insert([
    {
      table_number: Number(tableNumber),
      adult_count: Number(adultCount),
      child_count: Number(childCount),
      status: 'open',
      token: crypto.randomUUID() // สร้าง Token สุ่มป้องกันการเดา URL
    },
  ])
  .select()
  .single()

// ลิงก์สำหรับสร้าง QR Code
const orderUrl = `${window.location.origin}/order/${newSession.table_number}?token=${newSession.token}`
