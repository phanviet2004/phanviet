import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link } from 'react-router-dom'
import orderApi from "../../../services/orderApi";
import "./Orderhistory.css";

const ITEMS_PER_PAGE = 5;

const Orderhistory = () => {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - index);
  const [activeYear, setActiveYear] = useState(currentYear);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: ITEMS_PER_PAGE,
    totalItems: 0,
    totalPages: 1,
  });

  const isMountedRef = useRef(true);

  const visibleOrders = useMemo(() => {
    return orders.filter((item) => {
      const orderDate = new Date(item?.ngayDat);
      return !Number.isNaN(orderDate.getTime()) && orderDate.getFullYear() === activeYear;
    });
  }, [orders, activeYear]);

  const fetchOrders = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setError("");
    setOrders([]);
    try {
      const response = await orderApi.getMyOrderHistory({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        year: activeYear,
      });
      const data = Array.isArray(response?.data) ? response.data : [];
      const serverPagination = response?.pagination || {};

      if (isMountedRef.current) {
        setOrders(data);
        setPagination({
          currentPage: Number(serverPagination.currentPage || currentPage),
          limit: Number(serverPagination.limit || ITEMS_PER_PAGE),
          totalItems: Number(serverPagination.totalItems || 0),
          totalPages: Number(serverPagination.totalPages || 1),
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        const message = err?.response?.data?.message || "Không tải được lịch sử đơn hàng";
        setError(message);
        setOrders([]);
        setPagination({
          currentPage: 1,
          limit: ITEMS_PER_PAGE,
          totalItems: 0,
          totalPages: 1,
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [activeYear, currentPage]);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchOrders();

    // Auto-refresh every 30s
    const intervalId = setInterval(() => {
      fetchOrders();
    }, 30000);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
    // Re-run when fetchOrders changes (it updates when currentPage changes)
  }, [fetchOrders]);

  const handleChangePage = (page) => {
    if (page < 1 || page > pagination.totalPages || page === currentPage) return;
    setCurrentPage(page);
  };

  const visiblePages = useMemo(() => {
    const totalPages = pagination.totalPages;
    const windowSize = 3;

    if (totalPages <= windowSize) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    let startPage = Math.max(1, currentPage - 1);
    let endPage = startPage + windowSize - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - windowSize + 1);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  }, [currentPage, pagination.totalPages]);

  const formatMoney = (amount) => `${new Intl.NumberFormat("vi-VN").format(Number(amount || 0))}đ`;

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const mapStatusText = (status) => {
    switch (status) {
      case "DaGiao":
        return "HOÀN THÀNH";
      case "DangGiao":
        return "ĐANG GIAO";
      case "DaHuy":
        return "ĐÃ HỦY";
      case "ChoXacNhan":
        return "CHỜ XÁC NHẬN";
      case "ChoThanhToan":
        return "CHỜ THANH TOÁN";
      default:
        return String(status || "KHÔNG XÁC ĐỊNH").toUpperCase();
    }
  };

  const getStatusClass = (status) => {
    switch (mapStatusText(status)) {
      case "HOÀN THÀNH":
        return "completed";
      case "ĐANG GIAO":
        return "delivering";
      case "ĐÃ HỦY":
        return "cancelled";
      default:
        return "";
    }
  };

  return (
    <div className="order-page">
      <div className="container">
        {/* HEADER */}
        <div className="header">
          <p className="breadcrumb">TRANG CHỦ / TÀI KHOẢN</p>
          <h1>Lịch sử đơn hàng của tôi</h1>
        </div>

        {/* FILTER */}
        <div className="filter-bar">
          <div className="year-picker-wrap">
            <select
              className="year-picker"
              value={activeYear}
              onChange={(e) => {
                setActiveYear(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Chọn năm xem lịch sử đơn hàng"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  Năm {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* LIST */}
        <div className="order-list">
          {loading && <p className="order-message">Đang tải lịch sử đơn hàng...</p>}
          {!loading && error && <p className="order-message error">{error}</p>}
          {!loading && !error && visibleOrders.length === 0 && (
            <p className="order-message">Không có đơn hàng</p>
          )}

          {!loading && !error && visibleOrders.map((item) => (
            <Link to={`/order/${item.id}`} key={item.id} className="no-underline">
              <div className="order-card">
              <div className="col">
                <p className="label">MÃ ĐƠN HÀNG</p>
                <h3>#{item.id}</h3>
              </div>

              <div className="col">
                <p className="label">NGÀY ĐẶT</p>
                <span>{formatDate(item.ngayDat)}</span>
              </div>

              <div className="col">
                <p className="label">TỔNG CỘNG</p>
                <span className="price">{formatMoney(item.tongTien)}</span>
              </div>

              <div className="col status-col">
                <span className={`status ${getStatusClass(item.trangThai)}`}>
                  {mapStatusText(item.trangThai)}
                </span>
              </div>

              <div className="col action">
                <span>{Number(item.tongSanPham || 0)} sản phẩm</span>
              </div>
              </div>
            </Link>
          ))}
        </div>

        {!loading && !error && visibleOrders.length > 0 && pagination.totalPages > 1 && (
          <div className="pagination-wrap">
            <button
              className="page-btn"
              onClick={() => handleChangePage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Trước
            </button>

            <div className="page-list">
              {visiblePages.map((page) => (
                <button
                  key={page}
                  className={`page-btn ${page === currentPage ? "active" : ""}`}
                  onClick={() => handleChangePage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="page-btn"
              onClick={() => handleChangePage(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orderhistory;