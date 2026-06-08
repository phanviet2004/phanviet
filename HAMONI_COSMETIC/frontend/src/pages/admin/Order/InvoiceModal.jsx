import React, { forwardRef } from 'react';
import './InvoiceModal.css';

const InvoiceModal = forwardRef(({ order, onClose, onPrint }, ref) => {
  if (!order) return null;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN').format(parseFloat(amount) || 0) + 'đ';

  // Fix lỗi "impure function": Tính toán ngày trước khi return JSX
  const dateStr = order.ngayTao 
    ? new Date(order.ngayTao).toLocaleDateString('vi-VN') 
    : new Date().toLocaleDateString('vi-VN');

  const items = Array.isArray(order.chiTiet) ? order.chiTiet : [];
  const invoiceNote = String(order.ghiChu || order.GhiChu || order.note || '').trim();

  return (
    <div className="invoice-modal-overlay">
      <div className="invoice-modal-content">
        <div className="invoice-modal-header">
          <h2>XEM TRƯỚC HÓA ĐƠN</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="invoice-printable" ref={ref}>
          <div className="invoice-header">
            <h1 className="brand-name">HAMONI COSMETIC</h1>
            <p className="invoice-title">HÓA ĐƠN BÁN HÀNG</p>
          </div>

          <div className="invoice-meta">
             <div className="meta-col">
                <p><strong>Khách hàng:</strong> {order.khachHang?.hoTen}</p>
                <p><strong>Địa chỉ:</strong> {order.diaChiGiaoHang}</p>
               {invoiceNote && <p className="invoice-note"><strong>Ghi chú:</strong> {invoiceNote}</p>}
             </div>
             <div className="meta-col right">
                <p><strong>Mã đơn:</strong> #{order.id}</p>
                <p><strong>Ngày:</strong> {dateStr}</p> {/* Dùng biến đã fix */}
             </div>
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th className="text-center">SL</th>
                <th className="text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>{item.tenSP} <br/><small>{item.TenBienThe}</small></td>
                  <td className="text-center">{item.soLuong}</td>
                  <td className="text-right">{formatCurrency(item.soLuong * item.giaBan)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-footer-summary">

  <div className="summary-line">
    <span>Tạm tính:</span> 
    <span>{formatCurrency(order.tamTinh)}</span>
  </div>

  {/* ✅ VOUCHER */}
  <div className="summary-line">
    <span>Giảm giá:</span> 
    <span>-{formatCurrency(order.giamGia)}</span>
  </div>

  {/* ✅ PHÍ SHIP */}
  <div className="summary-line">
    <span>Phí vận chuyển:</span> 
    <span>{formatCurrency(order.phiShip)}</span>
  </div>

  <div className="summary-line total">
    <strong>TỔNG CỘNG:</strong> 
    <strong>{formatCurrency(order.tongTien)}</strong>
  </div>

</div>
          <p className="thanks-msg">Cảm ơn bạn đã tin dùng sản phẩm của Hamoni Cosmetic!</p>
        </div>

        <div className="invoice-modal-footer">
          <button className="btn-print" onClick={onPrint}>📄 Xác nhận In</button>
          <button className="btn-cancel-modal" onClick={onClose}> Đóng </button>
        </div>
      </div>
    </div>
  );
});

export default InvoiceModal;