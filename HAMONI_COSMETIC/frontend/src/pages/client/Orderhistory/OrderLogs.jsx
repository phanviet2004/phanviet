import React from 'react'

// OrderLogs modal component
// Props:
// - isOpen: boolean
// - onClose: function
// - order: object containing fields used below (id, statusHistory, recipient, shippingAddress, items, totals)

export default function OrderLogs({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null

  const { 
    id, 
    recipient = order.khachHang || {},
    diaChiGiaoHang = '',
    chiTiet: itemsFromOrder = [],
    lichSu = [],
    tamTinh = 0,
    phiShip = 0,
    giamGia = 0,
    tongTien = 0
  } = order

  // Fallback to alternative field names
  const recipient_final = recipient || order.khachHang || {}
  const shippingAddress = diaChiGiaoHang || order.diaChiGiaoHang || ''
  const items = itemsFromOrder || order.chiTiet || []
  const statusHistory = lichSu || order.lichSu || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-[95%] max-w-4xl bg-white rounded-lg shadow-lg p-6 mx-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-semibold">Đơn hàng #{id}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">Đóng ✕</button>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <div className="flex items-center gap-6">
            {statusHistory.map((s, idx) => (
              <div key={idx} className="flex-1 text-center">
                <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center ${s.done ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {s.icon || (idx + 1)}
                </div>
                <div className="mt-2 text-sm text-gray-700">{s.label || s.moTa || ''}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recipient & Shipping */}
          <div className="md:col-span-2 bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">Thông tin nhận hàng</h3>
            <div className="text-sm text-gray-700 mb-2">
              <div className="font-medium">Người nhận</div>
              <div>{recipient_final.hoTen || recipient_final.HoTen || recipient_final.name || recipient_final.fullName || recipient_final.recipientName || '—'}</div>
              {(recipient_final.soDienThoai || recipient_final.SoDienThoai || recipient_final.phone) && <div className="text-xs text-gray-500">{recipient_final.soDienThoai || recipient_final.SoDienThoai || recipient_final.phone}</div>}
            </div>

            <div className="text-sm text-gray-700 mb-4">
              <div className="font-medium">Địa chỉ giao hàng</div>
              <div>{shippingAddress || recipient_final.address || '—'}</div>
            </div>

            <h3 className="font-semibold text-lg mb-3">Sản phẩm</h3>
            <div className="space-y-3">
              {items.length === 0 && <div className="text-gray-500">Không có sản phẩm</div>}
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-4 bg-white rounded p-3 shadow-sm">
                  <img src={it.DuongDanAnh || it.hinhAnh || it.image || it.img || '/placeholder.png'} alt={it.TenSP || it.tenSP || it.name} className="w-16 h-16 object-cover rounded" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{it.TenSP || it.tenSP || it.tenSanPham || it.name}</div>
                    <div className="text-xs text-gray-500">Dung tích: {it.TenBienThe || it.size || it.volume || '—'} • Số lượng: {it.SoLuong || it.soLuong || it.quantity || it.qty || 1}</div>
                  </div>
                  <div className="text-right font-medium text-red-600">{formatCurrency(it.giaBan || it.DonGia || it.price)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-lg mb-3">Tóm tắt thanh toán</h3>
            <div className="text-sm text-gray-700 mb-2 flex justify-between"><span>Tổng tiền hàng</span><span>{formatCurrency(tamTinh)}</span></div>
            <div className="text-sm text-gray-700 mb-2 flex justify-between"><span>Phí vận chuyển</span><span>{formatCurrency(phiShip)}</span></div>
            <div className="text-sm text-gray-700 mb-2 flex justify-between"><span>Giảm giá</span><span className="text-red-600">-{formatCurrency(giamGia)}</span></div>
            <div className="border-t mt-3 pt-3 font-semibold text-lg flex justify-between items-center"><span>Tổng cộng</span><span className="text-red-600">{formatCurrency(tongTien)}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(value) {
  if (value == null) return '0₫'
  try {
    const n = Number(value)
    return n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
  } catch {
    return String(value)
  }
}
