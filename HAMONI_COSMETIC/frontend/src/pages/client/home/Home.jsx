import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  AlertCircle,
  Leaf,
  ShieldCheck,
  Truck,
  Sparkles,
  ArrowRight,
  Droplets,
  Flame,
} from "lucide-react";
import axiosClient from "../../../services/axiosClient";

// ==========================================
// COMPONENT: HERO SLIDER (ĐÃ BỎ ĐẾM NGƯỢC THỜI GIAN)
// ==========================================
const HeroSlider = ({ slides }) => {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [current, slides]);

  const handleViewDetails = (e, slide) => {
    if (e) e.stopPropagation();

    if (slide.MaSP) {
      navigate(`/product/${slide.MaSP}`);
    } else if (slide.URLDich) {
      if (slide.URLDich.startsWith("http")) {
        window.open(slide.URLDich, "_blank");
      } else {
        navigate(slide.URLDich);
      }
    } else {
      alert("Banner này chưa được gắn liên kết.");
    }
  };

  const nextSlide = (e) => {
    e.stopPropagation();
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };
  const prevSlide = (e) => {
    e.stopPropagation();
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  if (!slides || slides.length === 0) return null;

  const activeSlide = slides[current] || {};
  const slideTitle = activeSlide.title || "Khám phá bộ sưu tập mới nhất";
  const slideSubtitle =
    activeSlide.subtitle ||
    "Xem ngay các xu hướng và ưu đãi nổi bật đang chờ bạn.";
  const slideBadge = activeSlide.badge || "";

  return (
    <div
      className="relative w-full h-62.5 md:h-[480px] rounded-3xl overflow-hidden bg-slate-100 group shadow-md cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => handleViewDetails(e, activeSlide)}
    >
      <AnimatePresence initial={false}>
        <Motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={activeSlide.image}
            alt={slideTitle}
            className="w-full h-full object-cover"
          />
        </Motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 z-10 flex flex-col justify-end px-8 md:px-16 pb-12 pointer-events-none">
        <div
          className={`absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent transition-opacity duration-500 ease-out z-[-1] ${isHovered ? "opacity-100" : "opacity-0"}`}
        ></div>

        <div
          className={`transition-all duration-500 ease-out delay-75 ${isHovered ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
        >
          {slideBadge && (
            <span className="inline-block bg-rose-500 text-white font-bold uppercase tracking-wider mb-3 px-3 py-1 rounded text-xs shadow-md">
              {slideBadge}
            </span>
          )}

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-4 max-w-2xl leading-tight text-white">
            {slideTitle}
          </h2>
          <p className="text-slate-200 mb-6 max-w-lg text-sm md:text-base leading-relaxed">
            {slideSubtitle}
          </p>

          <div className="flex gap-4">
            <button
              onClick={(e) => handleViewDetails(e, activeSlide)}
              className="pointer-events-auto w-max bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-full text-base font-bold shadow-lg shadow-rose-500/40 transition-transform hover:-translate-y-1"
            >
              Xem chi tiết
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white text-white hover:text-slate-900 p-3 rounded-full backdrop-blur transition-all opacity-0 group-hover:opacity-100 shadow-lg z-20"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white text-white hover:text-slate-900 p-3 rounded-full backdrop-blur transition-all opacity-0 group-hover:opacity-100 shadow-lg z-20"
      >
        <ChevronRight size={24} />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              setCurrent(idx);
            }}
            className={`w-2 h-2 rounded-full transition-all ${idx === current ? "bg-rose-500 w-6" : "bg-white/50 hover:bg-white pointer-events-auto"}`}
          />
        ))}
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT: VÒNG QUAY DANH MỤC (NÚT TRÒN NHỎ - THU HẸP KHOẢNG CÁCH)
// ==========================================
const CategoryCarousel = ({ categories }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = Array.isArray(categories)
    ? categories.filter((category) => Number(category?.TrangThai) === 1)
    : [];

  const archColors = [
    "bg-[#E2F0EF]",
    "bg-[#F5E6D3]",
    "bg-[#FDE2E4]",
    "bg-[#FEF5E7]",
    "bg-[#E8F0FE]",
    "bg-[#F0E6EF]",
  ];

  const nextSlide = () => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const prevSlide = () => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items || items.length === 0) return null;

  const normalizedIndex = currentIndex % items.length;
  const visibleItems = [
    ...items.slice(normalizedIndex),
    ...items.slice(0, normalizedIndex),
  ].slice(0, 5);

  return (
    // Đã thay đổi margin: mt-8 mb-10 (thay vì my-16)
    <section className="mt-8 mb-6 relative w-full overflow-hidden px-2 md:px-8">
      <div className="flex flex-col items-center mb-6 text-center">
        <h2
          className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Khám Phá Danh Mục
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Tìm kiếm sản phẩm phù hợp nhất cho làn da của bạn
        </p>
      </div>

      <div className="relative w-full flex items-center justify-center max-w-7xl mx-auto">
        {/* NÚT BACK - HÌNH TRÒN NHỎ 40x40 */}
        <button
          type="button"
          onClick={prevSlide}
          style={{
            width: 40,
            height: 40,
            minWidth: 40,
            minHeight: 40,
            borderRadius: "9999px",
          }}
          className="absolute left-0 md:left-2 z-20 inline-flex aspect-square shrink-0 items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-200 text-slate-600 hover:text-rose-500 hover:border-rose-300 shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none"
        >
          <ChevronLeft size={20} className="-ml-px" />
        </button>

        {/* CONTAINER CHỨA DANH MỤC */}
        <div className="flex gap-4 md:gap-5 lg:gap-6 w-full justify-center px-12 md:px-16">
          <AnimatePresence mode="popLayout">
            {visibleItems.map((cat, idx) => {
              const originalIndex = items.findIndex(
                (c) => c.MaDM === cat.MaDM,
              );
              const bgColor =
                archColors[
                  (originalIndex === -1 ? idx : originalIndex) %
                    archColors.length
                ];
              const defaultImg =
                "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600&auto=format&fit=crop";

              return (
                <Motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5, ease: "anticipate" }}
                  key={cat.MaDM || cat.id}
                  whileHover={{ y: -6 }}
                  className={`flex flex-col items-center cursor-pointer group flex-1 max-w-[220px]
                    ${idx >= 2 ? "hidden sm:flex" : "flex"} 
                    ${idx >= 3 ? "sm:hidden md:flex" : ""}
                    ${idx >= 4 ? "md:hidden lg:flex" : ""}
                  `}
                  onClick={() =>
                    navigate(`/products?category=${cat.TenDM || cat.name}`)
                  }
                >
                  <div
                    className={`relative w-full aspect-[3/4] md:aspect-[3/4.2] ${bgColor} rounded-t-[100px] rounded-b-xl overflow-hidden mb-4 border border-white/50 shadow-sm transition-all duration-300 group-hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)]`}
                  >
                    <div className="absolute inset-2 border-[1.5px] border-white/50 rounded-t-[90px] rounded-b-lg z-10 pointer-events-none transition-colors duration-300 group-hover:border-white/80"></div>
                    <img
                      src={cat.DuongDanAnh || defaultImg}
                      alt={cat.TenDM || cat.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      style={{ objectPosition: "center" }}
                    />
                    <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>

                  <h3
                    className="text-slate-800 font-bold text-sm md:text-base lg:text-[17px] text-center transition-colors group-hover:text-rose-600"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {cat.TenDM || cat.name}
                  </h3>
                </Motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* NÚT NEXT - HÌNH TRÒN NHỎ 40x40 */}
        <button
          type="button"
          onClick={nextSlide}
          style={{
            width: 40,
            height: 40,
            minWidth: 40,
            minHeight: 40,
            borderRadius: "9999px",
          }}
          className="absolute right-0 md:right-2 z-20 inline-flex aspect-square shrink-0 items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-200 text-slate-600 hover:text-rose-500 hover:border-rose-300 shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none"
        >
          <ChevronRight size={20} className="-mr-px" />
        </button>
      </div>
    </section>
  );
};

// ==========================================
// LOGIC XỬ LÝ DỮ LIỆU
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
    const hasProductStock =
      Number(product?.stock ?? product?.soLuongTon ?? 0) > 0 ||
      product?.inStock === true ||
      product?.inStock === 1 ||
      product?.inStock === "1";

    const normalizedVariants =
      Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.map((variant, variantIndex) => ({
            id: variant.id || `${product.id || index}-v${variantIndex + 1}`,
            label:
              variant.label || variant.name || `Biến thể ${variantIndex + 1}`,
            type: variant.type || "Tùy chọn",
            price:
              variant.oldPrice != null ||
              variant.originalPrice != null ||
              variant.effectivePrice != null
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
            stock: Number(variant?.stock ?? variant?.soLuongTon ?? 0),
            inStock:
              Number(variant?.stock ?? variant?.soLuongTon ?? 0) > 0 ||
              variant?.inStock === true ||
              variant?.inStock === 1 ||
              variant?.inStock === "1",
            image: variant.image || product.image,
          }))
        : [
            {
              id: `${product.id || index}-default`,
              label: "Tiêu chuẩn",
              type: "Tùy chọn",
              price: defaultPrice,
              oldPrice: defaultOldPrice,
              stock: Number(product?.stock ?? product?.soLuongTon ?? 0),
              inStock: hasProductStock,
              image: product.image,
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
      id: product.id,
      name: product.name || product.TenSP,
      brand: product.brand || product.thuongHieu,
      category: product.category || product.TenDM,
      image: product.image || normalizedVariants[0].image,
      price: defaultPrice,
      oldPrice: defaultOldPrice,
      rating: Number(product.rating) || 5,
      reviews: Number(product.reviews) || 0,
      soldCount: Number(product.soldCount) || 0,
      totalStock: totalStock,
      isNew: isNew,
      discountPercent: discountPercent,
      variants: normalizedVariants,
      badges: product.badges || [],
    };
  });
};

// ==========================================
// COMPONENT: THẺ SẢN PHẨM
// ==========================================
const ProductCard = ({ product }) => {
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
    navigate(`/product/${product.id}`);
  };

  return (
    <Motion.article
      whileHover={{ y: -6 }}
      className="group bg-white rounded-2xl p-3 border border-rose-100/50 hover:border-rose-200 hover:shadow-[0_12px_30px_rgba(191,124,124,0.12)] transition-all duration-300 flex flex-col h-full relative overflow-hidden"
    >
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
        {discountPercent > 0 && (
          <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-md">
            -{discountPercent}%
          </span>
        )}
        {product.isNew && discountPercent === 0 && (
          <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-md">
            NEW
          </span>
        )}
      </div>

      <div
        className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3 bg-slate-50 flex items-center justify-center cursor-pointer"
        onClick={handleNavigate}
      >
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
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
              <span className="text-[15px] sm:text-[16px] font-black leading-none text-rose-600">
                {formatPrice(displayPrice)}
              </span>
              {displayOldPrice > displayPrice && (
                <span className="text-[10px] font-medium text-slate-400 line-through mt-1.5 leading-none">
                  {formatPrice(displayOldPrice)}
                </span>
              )}
            </div>

            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${hasAnyVariantInStock ? "text-emerald-500 bg-emerald-50" : "text-slate-500 bg-slate-100"}`}
            >
              {hasAnyVariantInStock ? "Còn hàng" : "Hết hàng"}
            </span>
          </div>
        </div>
      </div>
    </Motion.article>
  );
};

const ProductSkeleton = () => (
  <div className="bg-white p-3 rounded-2xl border border-slate-100">
    <div className="w-full aspect-[4/5] bg-slate-100 rounded-xl mb-3 animate-pulse"></div>
    <div className="h-3 bg-slate-100 rounded w-3/4 mb-2 animate-pulse"></div>
    <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse mt-auto"></div>
  </div>
);

// ==========================================
// MAIN PAGE
// ==========================================
export default function Home() {
  const [data, setData] = useState({ slides: [], products: [] });
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [homeResult, categoryResult] = await Promise.all([
          axiosClient.get("/home").catch((error) => {
            console.error("Lỗi tải sản phẩm:", error);
            return { products: [], slides: [] };
          }),
          axiosClient.get("/categories").catch((error) => {
            console.error("Lỗi tải danh mục:", error);
            return { data: [] };
          }),
        ]);

        const fromApi = normalizeProducts(homeResult.products || []);
        setData({
          slides: (homeResult.slides || []).map((s) => {
            return {
              ...s,
              image: s.DuongDanAnh || s.image,
              title: s.TieuDe || s.title,
              MaSP: s.MaSP,
              URLDich: s.URLDich,
              subtitle:
                s.subtitle ||
                s.MoTa ||
                "Xem ngay các xu hướng và ưu đãi nổi bật đang chờ bạn.",
            };
          }),
          products: fromApi,
        });

        let catData = categoryResult.data || categoryResult || [];
        if (!Array.isArray(catData)) catData = [];
        setDbCategories(
          catData.filter((category) => Number(category?.TrangThai) === 1),
        );
      } catch (err) {
        console.error("Lỗi Fetch Data:", err);
        setError(
          "Hệ thống đang bảo trì hoặc lỗi kết nối. Vui lòng thử lại sau.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  const todaySuggestionProducts = (data.products || [])
    .filter((product) => product.discountPercent > 0)
    .slice(0, 8);

  const featuredProducts = [...(data.products || [])]
    .filter((product) => (product.soldCount || 0) > 0)
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
    .slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium">
          <AlertCircle size={20} /> <p>{error}</p>
        </div>
      )}

      {/* HERO SLIDER (Giảm mb-6 -> mb-4) */}
      <div className="mb-2 shadow-sm">
        {loading ? (
          <div className="w-full h-62.5 md:h-[480px] bg-slate-100 rounded-3xl animate-pulse"></div>
        ) : (
          <HeroSlider slides={data.slides} />
        )}
      </div>

      {/* VÒNG QUAY DANH MỤC */}
      {!loading && dbCategories.length > 0 && (
        <CategoryCarousel categories={dbCategories} />
      )}

      {/* LIST SẢN PHẨM (Giảm space-y-12 -> space-y-8, mb-10 -> mb-8) */}
      <div className="w-full mb-4 space-y-4">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
          </div>
        ) : (
          <>
            {todaySuggestionProducts.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={28} className="text-amber-400" />
                  <h2
                    className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Gợi Ý Hôm Nay
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {todaySuggestionProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}

            {featuredProducts.length > 0 && (
              <section className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Flame size={28} className="text-rose-500" />
                  <h2
                    className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Sản Phẩm Nổi Bật
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {featuredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {!loading && data.products?.length > 0 && (
          <div className="mt-8 pb-4 text-center">
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-full font-bold transition-colors group"
            >
              Xem tất cả sản phẩm
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>
        )}
      </div>

      {/* KHỐI BANNER THÔNG TIN HAMONI */}
      <section className="py-12 bg-rose-50/50 rounded-3xl border border-rose-100/50 shadow-sm overflow-hidden mb-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-center px-8 lg:px-16">
          <div className="relative h-[350px] md:h-[400px] rounded-2xl overflow-hidden bg-slate-100 group">
            <img
              src="https://bizweb.dktcdn.net/thumb/1024x1024/100/413/259/files/my-pham-thien-nhien-8-jpeg.jpg?v=1674563308361"
              alt="Triết lý Hamoni"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <p
                className="text-white text-lg font-bold"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Nâng niu làn da từ những điều thuần khiết nhất.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-rose-600 font-bold text-xs uppercase tracking-wider shadow-sm">
              <Droplets size={14} /> Triết lý của chúng tôi
            </div>
            <h2
              className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Sự kết hợp hoàn hảo giữa <br className="hidden lg:block" />
              <span className="text-rose-500">Thiên nhiên & Khoa học</span>.
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              Mỗi sản phẩm của Hamoni không chỉ là mỹ phẩm, mà là một lời hứa về
              chất lượng. Chúng tôi tuyển chọn khắt khe từng thành phần thảo
              mộc, kết hợp cùng các hoạt chất da liễu tiên tiến để tạo ra những
              công thức độc quyền.
            </p>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              Hamoni hướng tới một quy trình Skincare tối giản nhưng mang lại
              hiệu quả tối đa, giúp bạn tự tin tỏa sáng với làn da mộc rạng rỡ
              và khỏe khoắn từ sâu bên trong.
            </p>
            <div className="pt-2">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-rose-600 font-bold hover:text-rose-700 transition-colors group"
              >
                Khám phá câu chuyện thương hiệu
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-4">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-center px-8 lg:px-16">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 font-bold text-xs uppercase tracking-wider">
              <Sparkles size={14} /> Về Hamoni Cosmetic
            </div>
            <h2
              className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Đánh thức vẻ đẹp <span className="text-rose-500">nguyên bản</span>{" "}
              của bạn.
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              Tại Hamoni, chúng tôi tin rằng vẻ đẹp thực sự bắt nguồn từ sự khỏe
              mạnh của làn da. Bằng việc chắt lọc những tinh túy thuần khiết
              nhất từ thiên nhiên, kết hợp cùng công nghệ làm đẹp tiên tiến,
              Hamoni mang đến những giải pháp chăm sóc sắc đẹp an toàn, hiệu quả
              và bền vững.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                  <Leaf size={20} />
                </div>
                <span className="font-bold text-xs md:text-sm text-slate-800">
                  100% Nguồn gốc
                  <br />
                  Thiên nhiên
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <span className="font-bold text-xs md:text-sm text-slate-800">
                  An toàn &<br />
                  Lành tính
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <Truck size={20} />
                </div>
                <span className="font-bold text-xs md:text-sm text-slate-800">
                  Giao hàng
                  <br />
                  Toàn quốc
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                  <Star size={20} />
                </div>
                <span className="font-bold text-xs md:text-sm text-slate-800">
                  Cam kết
                  <br />
                  Chính hãng
                </span>
              </div>
            </div>
          </div>

          <div className="relative h-[350px] md:h-[400px] rounded-2xl overflow-hidden bg-slate-100 group">
            <img
              src="https://myphamcacdai.vn/upload/ckfinder/images/q1(1).jpg"
              alt="Hamoni Cosmetic Store"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <p
                className="text-white text-lg font-bold"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Chăm sóc sắc đẹp bằng cả trái tim.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
