import React, { useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { buildVietQrImageUrl } from "../../../config/paymentQr";
import "./ordernotification.css";

const paymentBankName = import.meta.env.VITE_PAYMENT_BANK_NAME || "MoMo";
const paymentAccountNumber =
  import.meta.env.VITE_PAYMENT_ACCOUNT_NUMBER || "0823434270";
const paymentAccountName =
  import.meta.env.VITE_PAYMENT_ACCOUNT_NAME || "HAMONI Cosmetic";
const paymentBankBin = import.meta.env.VITE_PAYMENT_BANK_BIN || "";

const OrderNotification = ({
  isCod = false,
  transactionCode,
  orderId,
  paidAt,
  paymentMethodLabel,
  totalAmount,
  onViewOrder,
  onContinueShopping,
}) => {
  const formatCurrency = (amount) =>
    `${new Intl.NumberFormat("vi-VN").format(Number(amount) || 0)}đ`;
  const formatDate = (dateLike) =>
    new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateLike));

  return (
    // 👉 Đã xóa div.payment-success-page bọc ngoài
    <div className="payment-success-card">
      <div className="payment-success-hero">
        <div className="payment-success-icon">
          <CheckCircle2 size={30} />
        </div>
        <h2>{isCod ? "Đặt hàng thành công!" : "Thanh toán thành công!"}</h2>
      </div>

      <p className="payment-success-subtitle">
        {isCod
          ? "Đơn hàng của bạn đã được ghi nhận thành công."
          : "Cảm ơn bạn đã tin tưởng. Đơn hàng của bạn đã được ghi nhận thành công."}
      </p>

      <div className="payment-success-meta-grid">
        <div className="meta-box">
          <span>{isCod ? "Mã giao dịch" : "Mã giao dịch (VNPAY)"}</span>
          <strong>{transactionCode}</strong>
        </div>
        <div className="meta-box">
          <span>Mã đơn hàng</span>
          <strong>#HM-{orderId}</strong>
        </div>
      </div>

      <div className="payment-success-details">
        <div className="detail-row">
          <span>{isCod ? "Ngày đặt hàng" : "Ngày thanh toán"}</span>
          <strong>{formatDate(paidAt)}</strong>
        </div>
        <div className="detail-row">
          <span>Phương thức</span>
          <strong>{paymentMethodLabel}</strong>
        </div>
        <div className="detail-row total">
          <span>Tổng cộng</span>
          <strong>{formatCurrency(totalAmount)}</strong>
        </div>
      </div>

      <button className="primary-action" onClick={onViewOrder}>
        XEM CHI TIẾT ĐƠN HÀNG
      </button>
      <button className="secondary-action" onClick={onContinueShopping}>
        TIẾP TỤC MUA SẮM
      </button>
    </div>
  );
};

export const OnlinePaymentModal = ({
  orderId,
  totalAmount,
  onCancel,
  onRequestCancel,
  confirming = false,
  formatCurrency,
}) => {
  console.log(
    "[OnlinePaymentModal] RENDER - orderId:",
    orderId,
    "confirming:",
    confirming,
    "onRequestCancel:",
    typeof onRequestCancel,
  );
  const cancelHandledRef = useRef(false);

  const handleCancelClick = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (cancelHandledRef.current) {
      return;
    }

    cancelHandledRef.current = true;
    console.log(
      "[OrderNotification] Button clicked - confirming:",
      confirming,
      "onRequestCancel type:",
      typeof onRequestCancel,
    );

    if (confirming) {
      console.log("[OrderNotification] Already confirming, returning early");
      cancelHandledRef.current = false;
      return;
    }

    if (typeof onRequestCancel === "function") {
      console.log("[OrderNotification] Calling onRequestCancel callback");
      await onRequestCancel();
      cancelHandledRef.current = false;
      return;
    }

    console.log("[OrderNotification] Using fallback onCancel");
    if (onCancel) {
      onCancel(false);
    }
    cancelHandledRef.current = false;
  };

  const transferCode = `HM-${orderId}`;

  const { hasValidBankConfig, qrImageUrl } = buildVietQrImageUrl({
    bankBin: paymentBankBin,
    accountNumber: paymentAccountNumber,
    accountName: paymentAccountName,
    amount: totalAmount,
    transferCode,
  });

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Quét mã để thanh toán</h3>

        <p className="payment-modal-subtitle">
          Vui lòng dùng mã QR bên dưới để thanh toán đơn hàng.
        </p>

        <div className="payment-qr-section">
          <div className="payment-qr-box" aria-label="Mã QR thanh toán">
            <div className="payment-qr-frame">
              <span className="qr-corner qr-tl" />
              <span className="qr-corner qr-tr" />
              <span className="qr-corner qr-bl" />
              <span className="qr-corner qr-br" />

              {hasValidBankConfig ? (
                <img
                  className="payment-qr-image"
                  src={qrImageUrl}
                  alt={`QR thanh toán đơn ${transferCode}`}
                  loading="lazy"
                />
              ) : (
                <p className="payment-qr-fallback">
                  Thiếu cấu hình ngân hàng để tạo QR.
                </p>
              )}
            </div>

            <p>Mã QR thanh toán</p>
          </div>

          <div className="payment-detail-list">
            <div className="payment-detail-row">
              <span>Ngân hàng</span>
              <strong>{paymentBankName}</strong>
            </div>

            <div className="payment-detail-row">
              <span>TK</span>
              <strong>{paymentAccountNumber}</strong>
            </div>

            <div className="payment-detail-row">
              <span>Tên TK</span>
              <strong>{paymentAccountName}</strong>
            </div>

            <div className="payment-detail-row">
              <span>Mã đơn</span>
              <strong>#HM-{orderId}</strong>
            </div>

            <div className="payment-detail-row total">
              <span>Số tiền</span>
              <strong>{formatCurrency(totalAmount)}</strong>
            </div>
          </div>
        </div>

        <div className="payment-modal-actions">
          {console.log(
            "[OnlinePaymentModal] About to render button, confirming:",
            confirming,
          )}
          <button
            className="btn-cancel"
            type="button"
            onPointerDown={handleCancelClick}
            onClick={handleCancelClick}
            disabled={confirming}
          >
            Hủy đơn hàng
          </button>

          <p
            className="payment-waiting-text"
            style={{
              marginTop: "12px",
              textAlign: "center",
              color: "#666",
              fontSize: "14px",
            }}
          >
            {confirming
              ? "Đang kiểm tra thanh toán..."
              : "Đang chờ xác nhận thanh toán..."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderNotification;
