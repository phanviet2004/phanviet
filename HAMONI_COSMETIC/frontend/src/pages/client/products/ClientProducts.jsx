import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Filter,
  RefreshCcw,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import axiosClient from "../../../services/axiosClient";

const normalizeText = (value = "") =>
  value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();

const getProductPrice = (product) => {
  const variantPrice = Number(product?.variants?.[0]?.price);
  if (!Number.isNaN(variantPrice) && variantPrice > 0) return variantPrice;

  const basePrice = Number(product?.price);
  if (!Number.isNaN(basePrice) && basePrice > 0) return basePrice;

  return 0;
};

// ==========================================
// COMPONENT: TÙY CHỈNH DROPDOWN (ĐẸP & KHÔNG BỊ CẮT CHỮ)
// ==========================================
const CustomSelect = ({
  value,
  onChange,
  options,
  icon: Icon,
  placeholder,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative w-full ${className}`}>
      {/* NÚT BẤM HIỂN THỊ - CHIỀU CAO CHUẨN 46PX */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[46px] flex items-center justify-between bg-white border ${isOpen ? "border-rose-300 ring-4 ring-rose-50" : "border-slate-200"} rounded-xl px-4 text-sm font-medium text-slate-700 hover:border-rose-300 transition-all focus:outline-none shadow-sm`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon size={16} className="text-slate-400 shrink-0" />}
          <span className="truncate whitespace-nowrap">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-rose-500" : ""}`}
        />
      </button>

      {/* MENU THẢ XUỐNG */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Lớp phủ tàng hình để click ra ngoài thì đóng menu */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            ></div>

            <Motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.12)] z-50 overflow-hidden"
            >
              <div className="max-h-[240px] overflow-y-auto py-2">
                {options.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center ${
                      value === opt.value
                        ? "bg-rose-50 text-rose-600 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// COMPONENT: HERO SLIDER
// ==========================================
const HeroSlider = ({ slides }) => {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [current, slides]);

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
  const slideTitle = activeSlide.title || "Tất cả sản phẩm";
  const slideSubtitle =
    activeSlide.subtitle ||
    "Khám phá bộ sưu tập mỹ phẩm an toàn và lành tính từ thiên nhiên.";
  const slideBadge = activeSlide.badge || "";

  return (
    <div
      className="relative w-full h-[250px] md:h-[400px] rounded-3xl overflow-hidden bg-slate-100 group shadow-md cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
          <h2
            className="text-3xl md:text-5xl lg:text-6xl font-black mb-4 max-w-2xl leading-tight text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {slideTitle}
          </h2>
          <p className="text-slate-200 mb-6 max-w-lg text-sm md:text-base leading-relaxed">
            {slideSubtitle}
          </p>
        </div>
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white text-white hover:text-slate-900 p-3 rounded-full backdrop-blur transition-all opacity-0 group-hover:opacity-100 shadow-lg z-20"
      >
        <ChevronLeft size={24} className="ml-[-2px]" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white text-white hover:text-slate-900 p-3 rounded-full backdrop-blur transition-all opacity-0 group-hover:opacity-100 shadow-lg z-20"
      >
        <ChevronRight size={24} className="mr-[-2px]" />
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
// COMPONENT: THẺ SẢN PHẨM
// ==========================================
const ProductCard = ({ product, compact = false }) => {
  const navigate = useNavigate();

  const defaultVariant = product.variants?.[0] || {};
  const hasAnyVariantInStock =
    Array.isArray(product.variants) && product.variants.length > 0
      ? product.variants.some(
          (variant) =>
            Number(variant?.stock ?? variant?.soLuongTon ?? 0) > 0 ||
            variant?.inStock === true ||
            variant?.inStock === 1 ||
            variant?.inStock === "1",
        )
      : Number(product?.stock ?? product?.soLuongTon ?? 0) > 0 ||
        product?.inStock === true ||
        product?.inStock === 1 ||
        product?.inStock === "1";
  const displayPrice =
    Number(defaultVariant.price) || Number(product.price) || 0;
  const displayOldPrice =
    Number(defaultVariant.oldPrice) || Number(product.oldPrice) || null;
  const displayImage = defaultVariant.image || product.image;

  const discountPercent =
    displayOldPrice && displayOldPrice > displayPrice
      ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100)
      : 0;

  const formatPrice = (price) =>
    price ? Number(price).toLocaleString("vi-VN") + "đ" : "Liên hệ";

  const handleNavigate = () => {
    navigate(`/product/${product.id}`);
  };

  if (compact) {
    return (
      <Motion.article
        whileHover={{ y: -4 }}
        className="group flex flex-col h-full"
      >
        <div
          className="relative aspect-square rounded-3xl overflow-hidden mb-3 bg-slate-100 flex items-center justify-center cursor-pointer"
          onClick={handleNavigate}
        >
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        </div>

        <p
          className="font-medium text-slate-700 text-[15px] leading-6 line-clamp-2 mb-2 cursor-pointer min-h-[48px]"
          onClick={handleNavigate}
        >
          {product.name}
        </p>

        <span className="text-[20px] font-black text-slate-900 tracking-tight mt-auto">
          {formatPrice(displayPrice)}
        </span>
      </Motion.article>
    );
  }

  return (
    <Motion.article
      whileHover={{ y: -6 }}
      className="group bg-white rounded-2xl p-3 border border-rose-100/50 hover:border-rose-200 hover:shadow-[0_12px_30px_rgba(191,124,124,0.12)] transition-all duration-300 flex flex-col h-full relative overflow-hidden"
    >
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
        {discountPercent > 0 && (
          <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-lg shadow-rose-500/30">
            -{discountPercent}%
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
          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
            {product.category}
          </span>
        </div>

        <p
          className="font-bold text-slate-800 text-[15px] leading-relaxed line-clamp-2 mb-2 group-hover:text-rose-600 transition-colors cursor-pointer"
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
              <span className="text-base font-black text-rose-600 leading-none">
                {formatPrice(displayPrice)}
              </span>
              {displayOldPrice > displayPrice && (
                <span className="text-[10px] font-medium text-slate-400 line-through mt-1.5 leading-none">
                  {formatPrice(displayOldPrice)}
                </span>
              )}
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${hasAnyVariantInStock ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
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
// MAIN PAGE: TRANG TẤT CẢ SẢN PHẨM
// ==========================================
export default function Products() {
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const searchKeyword = queryParams.get("search")?.trim() || "";
  const categoryFromUrl = queryParams.get("category")?.trim() || "";

  const normalizedKeyword = normalizeText(searchKeyword);
  const isSearchMode = Boolean(normalizedKeyword);

  const [allProducts, setAllProducts] = useState([]);
  const [slides, setSlides] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [maxPrice, setMaxPrice] = useState(3000000);
  const [selectedCategory, setSelectedCategory] = useState(
    categoryFromUrl || "all",
  );
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isSearchMode ? 8 : 20;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    } else {
      setSelectedCategory("all");
    }
  }, [categoryFromUrl]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pageRes, catRes] = await Promise.all([
          axiosClient.get("/client/products/page"),
          axiosClient.get("/categories"),
        ]);

        setSlides(pageRes.slides || []);
        setDbCategories(catRes.data || catRes || []);

        const productsData = Array.isArray(pageRes.products)
          ? pageRes.products
          : [];
        setAllProducts(productsData);
      } catch (err) {
        console.error("Lỗi tải trang Sản Phẩm:", err);
        setError(
          "Hệ thống đang tải dữ liệu hoặc bảo trì. Vui lòng thử lại sau.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const brands = [
    "all",
    ...new Set(allProducts.map((p) => p.brand).filter(Boolean)),
  ];

  useEffect(() => {
    setCurrentPage(1);
  }, [maxPrice, selectedCategory, selectedBrand, sortOrder, normalizedKeyword]);

  const handleResetFilter = () => {
    setMaxPrice(3000000);
    setSelectedCategory("all");
    setSelectedBrand("all");
    setSortOrder("newest");
  };

  const categoryOptions = [
    { value: "all", label: "Tất cả danh mục" },
    ...dbCategories.map((item) => ({
      value: item.name || item.TenDM,
      label: item.name || item.TenDM,
    })),
  ];

  const brandOptions = brands.map((b) => ({
    value: b,
    label: b === "all" ? "Tất cả thương hiệu" : b,
  }));

  const sortOptions = [
    { value: "newest", label: "Hàng mới nhất" },
    { value: "price-asc", label: "Giá: Thấp đến Cao" },
    { value: "price-desc", label: "Giá: Cao đến Thấp" },
  ];

  let filteredProducts = allProducts.filter((product) => {
    const productPrice = getProductPrice(product);
    const matchPrice = productPrice <= maxPrice;
    const matchCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    const matchBrand =
      selectedBrand === "all" || product.brand === selectedBrand;

    if (!isSearchMode) return matchPrice && matchCategory && matchBrand;

    const searchableText = [
      product.name,
      product.brand,
      product.category,
      ...(Array.isArray(product.variants)
        ? product.variants.map((item) => item.label)
        : []),
    ]
      .filter(Boolean)
      .map((item) => normalizeText(item))
      .join(" ");

    const matchKeyword = searchableText.includes(normalizedKeyword);
    return matchKeyword;
  });

  filteredProducts.sort((a, b) => {
    if (sortOrder === "price-asc")
      return getProductPrice(a) - getProductPrice(b);
    if (sortOrder === "price-desc")
      return getProductPrice(b) - getProductPrice(a);

    const dateA = new Date(a.createdAt).getTime() || a.id;
    const dateB = new Date(b.createdAt).getTime() || b.id;
    return dateB - dateA;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: isSearchMode ? 0 : 400, behavior: "smooth" });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium">
          <AlertCircle size={20} /> <p>{error}</p>
        </div>
      )}

      {/* HERO SLIDER */}
      {!isSearchMode && (
        <div className="mb-8 shadow-sm">
          {loading ? (
            <div className="w-full h-[250px] md:h-[400px] bg-slate-100 rounded-3xl animate-pulse"></div>
          ) : (
            <HeroSlider slides={slides} />
          )}
        </div>
      )}

      {isSearchMode && (
        <div className="mb-6 md:mb-8">
          <h1 className="text-[40px] leading-none font-semibold text-slate-900 tracking-tight mb-3">
            Kết quả tìm kiếm
          </h1>
          <p className="text-slate-500 text-sm">
            Hiển thị {filteredProducts.length} sản phẩm cho "{searchKeyword}"
          </p>
        </div>
      )}

      {/* THANH BỘ LỌC - THIẾT KẾ MỚI SANG TRỌNG */}
      {!isSearchMode ? (
        <div className="bg-white/80 backdrop-blur-md p-3 md:px-5 md:py-4 rounded-2xl border border-rose-50 shadow-[0_8px_30px_rgba(225,29,72,0.06)] mb-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 sticky top-[var(--client-nav-offset)] z-30">
          <div className="flex flex-wrap xl:flex-nowrap items-center gap-3 w-full">
            <div className="hidden md:flex items-center gap-2 text-rose-500 font-bold shrink-0 mr-1">
              <Filter size={20} />{" "}
              <span className="text-slate-800 text-base">Bộ lọc:</span>
            </div>

            {/* DROPDOWN DANH MỤC */}
            <CustomSelect
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryOptions}
              placeholder="Tất cả danh mục"
              className="flex-[1.2] min-w-[170px]"
            />

            {/* DROPDOWN THƯƠNG HIỆU - Được cấp thêm không gian */}
            <CustomSelect
              value={selectedBrand}
              onChange={setSelectedBrand}
              options={brandOptions}
              placeholder="Tất cả thương hiệu"
              className="flex-[1.5] min-w-[210px]"
            />

            {/* KHỐI KÉO CHỌN GIÁ - CHIỀU CAO CHUẨN 46PX */}
            <div className="flex-[1.5] flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-xl px-4 h-[46px] min-w-[200px]">
              <span className="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap">
                Giá tới:
              </span>
              <input
                type="range"
                min="0"
                max="3000000"
                step="50000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <span className="text-sm font-bold text-rose-600 whitespace-nowrap w-20 text-right">
                {maxPrice.toLocaleString("vi-VN")}đ
              </span>
            </div>

            {/* ĐƯỜNG NGĂN CÁCH TRÊN PC */}
            <div className="hidden xl:block w-px h-8 bg-slate-200 mx-1 shrink-0"></div>

            {/* DROPDOWN SẮP XẾP */}
            <div className="flex-[1.2] min-w-[170px]">
              <CustomSelect
                value={sortOrder}
                onChange={setSortOrder}
                options={sortOptions}
                icon={SlidersHorizontal}
                placeholder="Sắp xếp"
              />
            </div>

            {/* NÚT RESET - THU NHỎ GỌN GÀNG 46x46 */}
            <button
              onClick={handleResetFilter}
              title="Làm mới bộ lọc"
              className="flex items-center justify-center w-[46px] h-[46px] bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-xl transition-all shrink-0 focus:outline-none"
            >
              <RefreshCcw size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white px-4 py-3 md:px-5 rounded-2xl border border-slate-200 shadow-sm mb-8 flex justify-end">
          <div className="w-[220px]">
            <CustomSelect
              value={sortOrder}
              onChange={setSortOrder}
              options={sortOptions}
              icon={SlidersHorizontal}
              placeholder="Sắp xếp"
            />
          </div>
        </div>
      )}

      {/* DANH SÁCH LƯỚI SẢN PHẨM */}
      <div className="w-full mb-12">
        {loading ? (
          <div
            className={`grid ${isSearchMode ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"}`}
          >
            {Array(12)
              .fill(0)
              .map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
          </div>
        ) : (
          <>
            <div
              className={`grid ${isSearchMode ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"}`}
            >
              {currentItems.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  compact={false}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && !error && (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm mt-8">
                <p className="text-slate-600 text-lg font-medium mb-4">
                  Không có sản phẩm nào phù hợp với tìm kiếm của bạn.
                </p>
                <button
                  onClick={handleResetFilter}
                  className="text-white bg-rose-500 hover:bg-rose-600 px-8 py-3 rounded-xl font-bold text-base transition-all shadow-lg shadow-rose-500/30"
                >
                  Tải lại toàn bộ sản phẩm
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* NÚT PHÂN TRANG (PAGINATION) */}
      {!loading && totalPages > 1 && (
        <div
          className={`flex items-center justify-center gap-2 mt-8 ${isSearchMode ? "mb-4" : "mb-16"}`}
        >
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`w-9 h-9 flex items-center justify-center ${isSearchMode ? "rounded-full" : "rounded-xl"} border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            <ChevronLeft size={20} />
          </button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`${isSearchMode ? "w-9 h-9 rounded-full" : "w-10 h-10 rounded-xl"} flex items-center justify-center text-sm font-bold transition-colors shadow-sm ${
                  currentPage === number
                    ? "bg-slate-900 text-white shadow-slate-900/20"
                    : `${isSearchMode ? "bg-transparent border-0 text-slate-500 hover:text-slate-900 shadow-none" : "bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"}`
                }`}
              >
                {number}
              </button>
            ),
          )}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`w-9 h-9 flex items-center justify-center ${isSearchMode ? "rounded-full" : "rounded-xl"} border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
