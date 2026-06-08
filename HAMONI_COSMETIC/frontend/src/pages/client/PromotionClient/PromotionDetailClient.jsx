import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  Star,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import axiosClient from "../../../services/axiosClient";
import "./PromotionDetailClient.css";

// ==========================================
// COMPONENT: COUNTDOWN TIMER
// ==========================================
const parseVietnameseDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    if (dateStr.includes("-")) {
      return new Date(dateStr).getTime();
    } else if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length !== 3) return null;
      const [day, month, year] = parts;
      return new Date(`${year}-${month}-${day}T00:00:00`).getTime();
    }
    return null;
  } catch (e) {
    console.error("Lỗi parse ngày:", dateStr, e);
    return null;
  }
};

const CountdownTimer = ({ startDateStr, endDateStr }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const start = parseVietnameseDate(startDateStr);
    const end = parseVietnameseDate(endDateStr);

    if (!start || !end) {
      return;
    }

    const realEnd = end + 24 * 60 * 60 * 1000 - 1;

    const calculateTimeLeft = (difference) => {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${days} ngày ${hours}h ${minutes}p ${seconds}s`);
    };

    const timer = setInterval(() => {
      const now = new Date().getTime();

      if (now < start) {
        setStatus("upcoming");
        calculateTimeLeft(start - now);
      } else if (now >= start && now <= realEnd) {
        setStatus("ongoing");
        calculateTimeLeft(realEnd - now);
      } else {
        setStatus("ended");
        setTimeLeft("");
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startDateStr, endDateStr]);

  if (status === "ended") {
    return (
      <div className="inline-flex items-center gap-2.5 bg-slate-500 text-white px-5 py-2.5 rounded-[100px] shadow-sm border border-slate-400 w-max font-sans">
        <Info size={18} strokeWidth={2.5} />
        <span className="text-[14px] sm:text-[15px] font-medium tracking-wide">
          Chương trình đã kết thúc
        </span>
      </div>
    );
  }

  if (!timeLeft && status === "ended") return null;

  // Đổi màu: Sắp diễn ra = Vàng/Cam, Đang diễn ra = Đỏ/Hồng
  const bgColors =
    status === "upcoming"
      ? "from-amber-400 to-orange-500 border-orange-300"
      : "from-rose-500 to-pink-500 border-rose-300";

  return (
    <div
      className={`inline-flex items-center gap-3 bg-gradient-to-r ${bgColors} text-white px-5 py-2.5 rounded-[100px] shadow-md border w-max font-sans transition-colors duration-500`}
    >
      <span className="relative flex h-4 w-4">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-white`}
        ></span>
        <span
          className={`relative inline-flex rounded-full h-4 w-4 bg-white`}
        ></span>
      </span>
      <span className="text-[14px] sm:text-[15px] font-medium tracking-wide">
        {status === "upcoming" ? "Bắt đầu sau:" : "Kết thúc sau:"}
        <strong className="ml-2 tracking-wider font-bold text-white uppercase">
          {timeLeft || "đang tính..."}
        </strong>
      </span>
    </div>
  );
};

// ==========================================
// 1. LOGIC XỬ LÝ DỮ LIỆU
// ==========================================
const checkIsNewProduct = (dateString) => {
  if (!dateString) return false;
  const createdDate = new Date(dateString);
  if (Number.isNaN(createdDate.getTime())) return false;
  const today = new Date();
  const diffTime = today - createdDate;
  if (diffTime < 0) return false;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
};

const getDiscountPercent = (price, oldPrice) => {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
};

const normalizeProducts = (products = []) => {
  return products.map((product, index) => {
    const defaultPrice = Number(product.price) || 0;
    const defaultOldPrice = Number(product.oldPrice) || null;

    const rawStock =
      product?.stock ??
      product?.soLuongTon ??
      product?.SoLuongTon ??
      product?.SoLuong ??
      product?.soluong ??
      product?.tonKho ??
      product?.TonKho;

    let hasProductStock = true;
    if (rawStock !== undefined && rawStock !== null) {
      hasProductStock = Number(rawStock) > 0;
    } else if (
      product?.inStock !== undefined ||
      product?.TrangThai !== undefined
    ) {
      const inStockVal = product?.inStock ?? product?.TrangThai;
      hasProductStock =
        inStockVal === true ||
        inStockVal === 1 ||
        inStockVal === "1" ||
        inStockVal === "Còn hàng";
    }

    const normalizedVariants =
      Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.map((variant, variantIndex) => {
            const rawVStock =
              variant?.stock ??
              variant?.soLuongTon ??
              variant?.SoLuongTon ??
              variant?.SoLuong ??
              variant?.soluong ??
              variant?.tonKho ??
              variant?.TonKho;

            let hasVStock = true;
            if (rawVStock !== undefined && rawVStock !== null) {
              hasVStock = Number(rawVStock) > 0;
            } else if (
              variant?.inStock !== undefined ||
              variant?.TrangThai !== undefined
            ) {
              const vInStockVal = variant?.inStock ?? variant?.TrangThai;
              hasVStock =
                vInStockVal === true ||
                vInStockVal === 1 ||
                vInStockVal === "1" ||
                vInStockVal === "Còn hàng";
            }

            return {
              id:
                variant.id ||
                variant.MaBienThe ||
                `${product.id || index}-v${variantIndex + 1}`,
              label:
                variant.label ||
                variant.name ||
                variant.TenBienThe ||
                `Biến thể ${variantIndex + 1}`,
              type: variant.type || "Tùy chọn",
              price:
                variant.oldPrice != null ||
                variant.originalPrice != null ||
                variant.effectivePrice != null ||
                variant.price != null
                  ? Number(variant.effectivePrice ?? variant.price) ||
                    defaultPrice
                  : defaultPrice,
              oldPrice:
                variant.oldPrice != null ||
                variant.originalPrice != null ||
                variant.effectivePrice != null
                  ? Number(variant.oldPrice ?? variant.originalPrice) ||
                    defaultOldPrice
                  : defaultOldPrice,
              stock: Number(rawVStock || 0),
              inStock: hasVStock,
              image: variant.image || product.image || product.HinhAnh,
            };
          })
        : [
            {
              id: `${product.id || index}-default`,
              label: "Tiêu chuẩn",
              type: "Tùy chọn",
              price: defaultPrice,
              oldPrice: defaultOldPrice,
              stock: Number(rawStock || 0),
              inStock: hasProductStock,
              image: product.image || product.HinhAnh,
            },
          ];

    const isNew = checkIsNewProduct(
      product.createdAt || product.NgayTao || product.created_at,
    );
    const primaryVariant = normalizedVariants[0] || {};
    const basePrice = Number(primaryVariant.price) || defaultPrice;
    const baseOldPrice = Number(primaryVariant.oldPrice) || defaultOldPrice;
    const discountPercent = getDiscountPercent(basePrice, baseOldPrice);
    const totalStock = normalizedVariants.reduce(
      (sum, v) => sum + (v.stock || 0),
      0,
    );

    return {
      id: product.id || product.MaSP,
      name: product.name || product.TenSP,
      brand: product.brand || product.thuongHieu,
      category: product.category || product.TenDM || "Chăm sóc da",
      image: product.image || product.HinhAnh || normalizedVariants[0].image,
      price: defaultPrice,
      oldPrice: defaultOldPrice,
      rating: Number(product.rating) || 5,
      reviews: Number(product.reviews) || 0,
      soldCount: Number(
        product.DaBan || product.daBan || product.soldCount || 0,
      ),
      totalStock: totalStock,
      isNew: isNew,
      discountPercent: discountPercent,
      variants: normalizedVariants,
      badges: product.badges || [],
    };
  });
};

// ==========================================
// 2. GIAO DIỆN THẺ SẢN PHẨM
// ==========================================
const ProductCard = ({ product, isUpcoming, isExpired }) => {
  const navigate = useNavigate();

  const defaultVariant = product.variants?.[0] || {};
  const displayPrice =
    Number(defaultVariant.price) || Number(product.price) || 0;
  const displayOldPrice =
    Number(defaultVariant.oldPrice) || Number(product.oldPrice) || null;
  const discountPercent = product.discountPercent;
  const displayImage = defaultVariant.image || product.image;

  const hasAnyVariantInStock = product.variants?.some((v) => v.inStock);

  const formatPrice = (price) => {
    if (!price) return "Liên hệ";
    return Number(price).toLocaleString("vi-VN") + "đ";
  };

  const handleNavigate = () => {
    if (!isExpired) navigate(`/product/${product.id}`);
  };

  return (
    <Motion.article
      whileHover={!isExpired ? { y: -6 } : {}}
      className={`group bg-white rounded-2xl p-3 border border-rose-100/50 hover:border-rose-200 hover:shadow-[0_12px_30px_rgba(191,124,124,0.12)] transition-all duration-300 flex flex-col h-full relative overflow-hidden ${isExpired ? "promo-expired-card" : ""}`}
    >
      {isExpired ? (
        <div className="absolute top-0 left-0 bg-slate-500 text-white font-bold text-[11px] px-3 py-1 rounded-br-xl z-10 shadow-sm">
          HẾT HẠN
        </div>
      ) : (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
          {discountPercent > 0 && (
            <span
              className={`${isUpcoming ? "bg-amber-500" : "bg-rose-500"} text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-md`}
            >
              {isUpcoming ? "SẮP SALE " : ""}-{discountPercent}%
            </span>
          )}
          {product.isNew && discountPercent === 0 && (
            <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-md">
              NEW
            </span>
          )}
        </div>
      )}

      <div
        className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3 bg-slate-50 flex items-center justify-center cursor-pointer"
        onClick={handleNavigate}
      >
        <img
          src={displayImage}
          alt={product.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${isUpcoming || isExpired ? "opacity-80" : ""}`}
        />
      </div>

      <div className="mt-auto flex flex-col flex-1 px-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider font-bold text-rose-500 truncate pr-2">
            {product.brand}
          </span>
          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
            {product.category}
          </span>
        </div>

        <p
          className="font-bold text-slate-800 text-[14px] sm:text-[15px] leading-relaxed line-clamp-2 mb-2 group-hover:text-rose-600 transition-colors cursor-pointer"
          onClick={handleNavigate}
        >
          {product.name}
        </p>

        <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
          <Star size={10} className="fill-amber-400 text-amber-400" />
          <span className="font-bold text-slate-700">
            {product.rating?.toFixed(1) || "5.0"}
          </span>
          <span>({product.reviews || 0})</span>
        </div>

        <div className="mt-auto pt-2.5 border-t border-slate-100">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span
                className={`text-[15px] sm:text-[16px] font-black leading-none ${isUpcoming ? "text-slate-600" : "text-rose-600"}`}
              >
                {formatPrice(displayPrice)}
              </span>
              {!isExpired && displayOldPrice > displayPrice && (
                <span className="text-[10px] font-medium text-slate-400 line-through mt-1.5 leading-none">
                  {formatPrice(displayOldPrice)}
                </span>
              )}
            </div>

            {!isExpired && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${hasAnyVariantInStock ? "text-emerald-500 bg-emerald-50" : "text-slate-500 bg-slate-100"}`}
              >
                {hasAnyVariantInStock ? "Còn hàng" : "Hết hàng"}
              </span>
            )}
          </div>
        </div>
      </div>
    </Motion.article>
  );
};

// ==========================================
// 3. MAIN PAGE KHUYẾN MÃI CHI TIẾT
// ==========================================
export default function PromotionDetailClient() {
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [promoData, setPromoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState("default");

  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  useEffect(() => {
    const fetchPromoProducts = async () => {
      try {
        const res = await axiosClient.get(`/promotions/${id}/products`);

        const rawProducts = res.products || [];
        const groupedData = rawProducts.reduce((acc, currentItem) => {
          const productId = currentItem.id || currentItem.MaSP;

          if (!acc[productId]) {
            acc[productId] = {
              ...currentItem,
              variants: [currentItem],
            };
          } else {
            acc[productId].variants.push(currentItem);

            const currentPrice = Number(currentItem.price) || 0;
            const accPrice = Number(acc[productId].price) || 0;
            if (currentPrice > 0 && currentPrice < accPrice) {
              acc[productId].price = currentPrice;
              acc[productId].oldPrice = currentItem.oldPrice;
            }
          }
          return acc;
        }, {});

        const finalProductsArray = Object.values(groupedData);
        setProducts(normalizeProducts(finalProductsArray));
        if (res.promotion) {
          setPromoData(res.promotion);
        }
      } catch (error) {
        console.error("Lỗi lấy sản phẩm khuyến mãi:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPromoProducts();
  }, [id]);

  const now = new Date();
  const startDate = promoData ? new Date(promoData.NgayBatDau) : now;
  const endDate = promoData ? new Date(promoData.NgayKetThuc) : now;

  const isUpcoming = promoData && now < startDate;
  const isExpired = promoData && now > endDate;

  const sortedProducts = [...products].sort((a, b) => {
    if (sortType === "default") {
      if (b.soldCount !== a.soldCount) return b.soldCount - a.soldCount;
      return b.rating - a.rating;
    }
    const priceA = Number(a.variants?.[0]?.price) || Number(a.price) || 0;
    const priceB = Number(b.variants?.[0]?.price) || Number(b.price) || 0;
    if (sortType === "asc") return priceA - priceB;
    if (sortType === "desc") return priceB - priceA;
    return 0;
  });

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct,
  );
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 min-h-screen bg-[#FAFAFA]">
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-rose-500"></div>
        </div>
      ) : (
        <>
          {/* THANH "TẤT CẢ SẢN PHẨM" MỚI (TÍCH HỢP LUÔN TRẠNG THÁI VÀO GIỮA) */}
          <div className="bg-white border border-slate-200/60 rounded-[12px] p-4 mb-8 flex flex-col lg:flex-row items-center justify-between shadow-sm gap-4">
            {/* 1. BÊN TRÁI: Tiêu đề */}
            <h2 className="text-[18px] font-medium text-[#1E293B] shrink-0">
              Tất cả sản phẩm{" "}
              <span className="text-slate-500 text-sm font-normal ml-1">
                ({products?.length || 0})
              </span>
            </h2>

            {/* 2. Ở GIỮA: Đồng hồ đếm ngược / Nhãn kết thúc */}
            {promoData && promoData.NgayBatDau && promoData.NgayKetThuc && (
              <div className="flex-1 flex justify-center w-full lg:w-auto my-2 lg:my-0">
                <CountdownTimer
                  startDateStr={promoData.NgayBatDau}
                  endDateStr={promoData.NgayKetThuc}
                />
              </div>
            )}

            {/* 3. BÊN PHẢI: Dropdown Sắp xếp */}
            {products && products.length > 0 && (
              <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto scrollbar-hide shrink-0 lg:justify-end">
                <div className="flex items-center justify-between w-full sm:w-auto border border-slate-200 rounded-full px-4 py-1.5 bg-white shadow-sm">
                  <span className="text-[13px] text-slate-400 font-medium uppercase tracking-wide mr-2 whitespace-nowrap">
                    Sắp xếp theo
                  </span>
                  <div className="relative flex items-center">
                    <select
                      value={sortType}
                      onChange={(e) => {
                        setSortType(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="appearance-none bg-transparent pr-7 pl-1 py-1 text-[15px] font-medium text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="default">Mới nhất</option>
                      <option value="asc">Giá tăng dần</option>
                      <option value="desc">Giá giảm dần</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-0 text-slate-600 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RENDER LIST */}
          {currentProducts && currentProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {currentProducts.map((product, idx) => (
                  <ProductCard
                    key={product.id || product.MaBienThe || idx}
                    product={product}
                    isUpcoming={isUpcoming}
                    isExpired={isExpired}
                  />
                ))}
              </div>

              {/* BỘ NÚT ĐIỀU HƯỚNG PHÂN TRANG */}
              {totalPages > 0 && (
                <div className="mt-12 flex justify-center items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => handlePageChange(index + 1)}
                      className={`w-10 h-10 rounded-lg border font-bold transition-all shadow-sm ${currentPage === index + 1 ? "bg-rose-500 border-rose-500 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-rose-500 hover:text-rose-500"}`}
                    >
                      {index + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <p className="text-slate-500 text-lg">
                Hiện chưa có chương trình ưu đãi nào.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
