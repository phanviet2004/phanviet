// src/pages/admin/products/ProductManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Download } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";

import axiosClient from "../../../services/axiosClient";
import "./ProductManagement.css";

const PAGE_SIZE = 10;

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value ?? "");
  } catch {
    return fallback;
  }
};

const formatDate = (value) => {
  if (!value) return "Không rõ";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Không rõ"
    : date.toLocaleDateString("vi-VN");
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "0 VND";
  return `${amount.toLocaleString("vi-VN")} VND`;
};

const ProductManagement = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const userPermissions = safeJsonParse(
    localStorage.getItem("userPermissions"),
    [],
  );
  const userInfo = safeJsonParse(localStorage.getItem("user"), {});
  const isAdminRole = userInfo?.maQuyen === "ADMIN";

  const hasPermission = useCallback(
    (permissionCode) =>
      isAdminRole ||
      userPermissions.includes("ALL") ||
      userPermissions.includes(permissionCode),
    [isAdminRole, userPermissions],
  );

  const loadCategories = useCallback(async () => {
    try {
      const res = await axiosClient.get("/categories");
      const categoryList = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
      setCategories(categoryList);
    } catch (error) {
      console.error("Lỗi khi tải danh mục:", error);
      setCategories([]);
      toast.error("Không thể tải danh mục!");
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);

    try {
      const res = await axiosClient.get("/products", {
        params: {
          search: search.trim(),
          category: categoryFilter,
          page: currentPage,
          limit: PAGE_SIZE,
        },
      });

      const dataList = Array.isArray(res?.data) ? res.data : [];
      const total =
        Number(res?.pagination?.totalPages) > 0
          ? Number(res.pagination.totalPages)
          : 1;

      setProducts(dataList);
      setTotalPages(total);
    } catch (error) {
      console.error("Lỗi khi tải danh sách sản phẩm:", error);
      setProducts([]);
      setTotalPages(1);
      toast.error("Không thể tải danh sách sản phẩm!");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, currentPage]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  const getCategoryName = useCallback(
    (maDM) => {
      const foundCategory = categories.find(
        (category) => category.MaDM === maDM,
      );
      return foundCategory?.TenDM || "Khác";
    },
    [categories],
  );

  const handleRowClick = (maSP) => {
    if (hasPermission("VIEW_PRODUCT") || hasPermission("EDIT_PRODUCT")) {
      navigate(`/admin/products/${maSP}`);
      return;
    }

    toast.warning("Bạn không có quyền xem chi tiết hoặc chỉnh sửa sản phẩm!");
  };

  const handleExportExcel = async () => {
    try {
      const res = await axiosClient.get("/products", {
        params: {
          search: search.trim(),
          category: categoryFilter,
          limit: 99999,
        },
      });

      const dataList = Array.isArray(res?.data) ? res.data : [];

      if (dataList.length === 0) {
        toast.warning("Không có dữ liệu để xuất!");
        return;
      }

      const exportData = dataList.map((product, index) => {
        const variants = Array.isArray(product?.BienThe)
          ? product.BienThe
          : Array.isArray(product?.variants)
            ? product.variants
            : [];

        const variantText =
          variants.length > 0
            ? variants
                .map((variant) => {
                  const name = variant?.TenBienThe || "Không tên";
                  const price = formatCurrency(variant?.Gia);
                  return `${name}: ${price}`;
                })
                .join(" | ")
            : "Chưa có biến thể";

        return {
          STT: index + 1,
          "Mã SP": `SP${String(product?.MaSP ?? "").padStart(3, "0")}`,
          "Tên Sản Phẩm": product?.TenSP || "Không có tên",
          "Danh Mục": getCategoryName(product?.MaDM),
          "Mô Tả": product?.MoTa || "Không có",
          "Thành Phần": product?.ThanhPhan || "Không có",
          "Cách Sử Dụng": product?.CachSuDung || "Không có",
          "Loại Da Phù Hợp": product?.LoaiDaPhuHop || "Mọi loại da",
          "Biến Thể & Giá": variantText,
          "Ngày Tạo": formatDate(product?.NgayTao),
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();

      worksheet["!cols"] = [
        { wch: 5 },
        { wch: 10 },
        { wch: 35 },
        { wch: 15 },
        { wch: 50 },
        { wch: 40 },
        { wch: 40 },
        { wch: 20 },
        { wch: 45 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Data_TuVan_AI");
      XLSX.writeFile(workbook, `Danhsach_sanpham_${Date.now()}.xlsx`);

      toast.success("Xuất file Excel thành công!");
    } catch (error) {
      console.error("Lỗi khi xuất Excel:", error);
      toast.error("Không thể xuất file Excel!");
    }
  };

  const pageNumbers = Array.from(
    { length: Math.max(totalPages, 1) },
    (_, index) => index + 1,
  );

  return (
    <div className="product-admin-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="main-title m-0">QUẢN LÝ SẢN PHẨM</h1>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-success d-flex align-items-center gap-2"
            onClick={handleExportExcel}
            style={{
              fontWeight: 600,
              borderRadius: "8px",
              padding: "0.5rem 1rem",
            }}
          >
            <Download size={18} />
            <span>Xuất dữ liệu SP</span>
          </button>

          {hasPermission("ADD_PRODUCT") && (
            <button
              type="button"
              className="btn-add-primary d-flex align-items-center gap-2"
              onClick={() => navigate("/admin/products/add")}
            >
              <Plus size={18} />
              <span>Thêm sản phẩm mới</span>
            </button>
          )}
        </div>
      </div>

      <div className="filter-card">
        <div className="search-input-group">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="category-filter-group">
          <Filter className="text-muted" size={18} />
          <select
            className="form-select border-0 bg-transparent fw-semibold"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.MaDM} value={category.MaDM}>
                {category.TenDM}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="product-table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th width="15%">MÃ SP</th>
              <th width="35%">TÊN SẢN PHẨM</th>
              <th width="20%">DANH MỤC</th>
              <th width="30%">THÀNH PHẦN CHÍNH</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center py-5 text-muted">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-5 text-muted">
                  Không tìm thấy sản phẩm nào!
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.MaSP}
                  className="product-row clickable-row"
                  onClick={() => handleRowClick(product.MaSP)}
                  title="Click để xem chi tiết / chỉnh sửa"
                >
                  <td className="product-id-cell">
                    <span className="product-code">
                      SP{String(product.MaSP).padStart(3, "0")}
                    </span>
                  </td>
                  <td>
                    <strong className="product-name">{product.TenSP}</strong>
                    <div
                      className="text-muted"
                      style={{ fontSize: "12px", marginTop: "4px" }}
                    >
                      Ngày tạo: {formatDate(product.NgayTao)}
                    </div>
                  </td>
                  <td>
                    <span className="category-badge">
                      {getCategoryName(product.MaDM)}
                    </span>
                  </td>
                  <td>
                    <p
                      className="ingredient-text"
                      title={product.ThanhPhan || "Chưa cập nhật"}
                    >
                      {product.ThanhPhan || "Chưa cập nhật"}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="pagination-wrapper">
          <button
            type="button"
            className="pagi-arrow"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            ‹
          </button>

          <div className="pagi-numbers-group">
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`pagi-item ${currentPage === pageNum ? "active" : ""}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="pagi-arrow"
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
          >
            ›
          </button>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
};

export default ProductManagement;
