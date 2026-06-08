import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Filter, RefreshCcw, AlertCircle, SlidersHorizontal } from 'lucide-react';
import axiosClient from '../../../services/axiosClient';

const normalizeText = (value = '') =>
    value
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .trim();

const getProductPrice = (product) => {
    const variantPrice = Number(product?.variants?.[0]?.price);
    if (!Number.isNaN(variantPrice) && variantPrice > 0) return variantPrice;

    const basePrice = Number(product?.price);
    if (!Number.isNaN(basePrice) && basePrice > 0) return basePrice;

    return 0;
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

    const nextSlide = (e) => { e.stopPropagation(); setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1)); };
    const prevSlide = (e) => { e.stopPropagation(); setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1)); };

    if (!slides || slides.length === 0) return null;

    const activeSlide = slides[current] || {};
    const slideTitle = activeSlide.title || 'Tất cả sản phẩm';
    const slideSubtitle = activeSlide.subtitle || 'Khám phá bộ sưu tập mỹ phẩm an toàn và lành tính từ thiên nhiên.';
    const slideBadge = activeSlide.badge || '';

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
                    <img src={activeSlide.image} alt={slideTitle} className="w-full h-full object-cover" />
                </Motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 z-10 flex flex-col justify-end px-8 md:px-16 pb-12 pointer-events-none">
                <div className={`absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent transition-opacity duration-500 ease-out z-[-1] ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>

                <div className={`transition-all duration-500 ease-out delay-75 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
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
                </div>
            </div>

            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white text-white hover:text-slate-900 p-3 rounded-full backdrop-blur transition-all opacity-0 group-hover:opacity-100 shadow-lg z-20"><ChevronLeft size={24} /></button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white text-white hover:text-slate-900 p-3 rounded-full backdrop-blur transition-all opacity-0 group-hover:opacity-100 shadow-lg z-20"><ChevronRight size={24} /></button>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {slides.map((_, idx) => (
                    <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrent(idx); }} className={`w-2 h-2 rounded-full transition-all ${idx === current ? 'bg-rose-500 w-6' : 'bg-white/50 hover:bg-white pointer-events-auto'}`} />
                ))}
            </div>
        </div>
    );
};

// ==========================================
// COMPONENT: THẺ SẢN PHẨM (Tối giản - Không nhãn NEW)
// ==========================================
const ProductCard = ({ product, compact = false }) => {
    const navigate = useNavigate();

    const defaultVariant = product.variants?.[0] || {};
    const hasAnyVariantInStock = Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.some((variant) => Number(variant?.stock ?? variant?.soLuongTon ?? 0) > 0
            || variant?.inStock === true
            || variant?.inStock === 1
            || variant?.inStock === '1')
        : (Number(product?.stock ?? product?.soLuongTon ?? 0) > 0
            || product?.inStock === true
            || product?.inStock === 1
            || product?.inStock === '1');
    const displayPrice = Number(defaultVariant.price) || Number(product.price) || 0;
    const displayOldPrice = Number(defaultVariant.oldPrice) || Number(product.oldPrice) || null;
    const displayImage = defaultVariant.image || product.image;

    // Tính phần trăm giảm giá để hiện nhãn (nếu có)
    const discountPercent = (displayOldPrice && displayOldPrice > displayPrice) 
        ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100) 
        : 0;

    const formatPrice = (price) => (price ? Number(price).toLocaleString('vi-VN') + 'đ' : 'Liên hệ');

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
                    <img src={displayImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
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
            {/* Nhãn dán Giảm giá (Chỉ hiện khi có discount) */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
                {discountPercent > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-lg shadow-rose-500/30">
                        -{discountPercent}%
                    </span>
                )}
            </div>

            {/* Container Hình ảnh */}
            <div 
                className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3 bg-slate-50 flex items-center justify-center cursor-pointer"
                onClick={handleNavigate}
            >
                <img src={displayImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
            </div>

            {/* Thông tin sản phẩm */}
            <div className="mt-auto flex flex-col flex-1 px-1">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-rose-500 truncate pr-2">{product.brand}</span>
                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">{product.category}</span>
                </div>

                <p 
                    className="font-bold text-slate-800 text-[15px] leading-relaxed line-clamp-2 mb-2 group-hover:text-rose-600 transition-colors cursor-pointer"
                    onClick={handleNavigate}
                >
                    {product.name}
                </p>

                <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-700">{product.rating?.toFixed(1) || '5.0'}</span>
                    <span>({product.reviews || 0})</span>
                </div>

                <div className="mt-auto pt-2.5 border-t border-slate-100">
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className="text-base font-black text-rose-600 leading-none">{formatPrice(displayPrice)}</span>
                            {displayOldPrice > displayPrice && (
                                <span className="text-[10px] font-medium text-slate-400 line-through mt-1.5 leading-none">{formatPrice(displayOldPrice)}</span>
                            )}
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${hasAnyVariantInStock ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                            {hasAnyVariantInStock ? 'Còn hàng' : 'Hết hàng'}
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
    const [allProducts, setAllProducts] = useState([]);
    const [slides, setSlides] = useState([]);
    const [dbCategories, setDbCategories] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Bộ lọc và Sắp xếp
    const [maxPrice, setMaxPrice] = useState(3000000);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedBrand, setSelectedBrand] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'price-asc', 'price-desc'

    const searchKeyword = new URLSearchParams(location.search).get('search')?.trim() || '';
    const normalizedKeyword = normalizeText(searchKeyword);
    const isSearchMode = Boolean(normalizedKeyword);

    // Phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = isSearchMode ? 8 : 20;

    // Luon dua nguoi dung ve dau trang khi vao trang san pham
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, []);

    // Fetch dữ liệu
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Tải dữ liệu riêng cho trang sản phẩm, không dùng chung API home nữa
                const [pageRes, catRes] = await Promise.all([
                    axiosClient.get('/client/products/page'), 
                    axiosClient.get('/categories')
                ]);
                
                setSlides(pageRes.slides || []);
                setDbCategories(catRes || []);
                
                // Backend trang sản phẩm trả về products + slides trong một payload riêng
                const productsData = Array.isArray(pageRes.products) ? pageRes.products : [];
                setAllProducts(productsData);

            } catch (err) {
                console.error("Lỗi tải trang Sản Phẩm:", err);
                setError('Hệ thống đang tải dữ liệu hoặc bảo trì. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const brands = ['all', ...new Set(allProducts.map((p) => p.brand).filter(Boolean))];

    // Reset về trang 1 khi người dùng đổi bộ lọc/sắp xếp
    useEffect(() => {
        setCurrentPage(1);
    }, [maxPrice, selectedCategory, selectedBrand, sortOrder, normalizedKeyword]);

    const handleResetFilter = () => {
        setMaxPrice(3000000);
        setSelectedCategory('all');
        setSelectedBrand('all');
        setSortOrder('newest');
    };

    // 1. Áp dụng Lọc
    let filteredProducts = allProducts.filter((product) => {
        const productPrice = getProductPrice(product);
        const matchPrice = productPrice <= maxPrice;
        const matchCategory = selectedCategory === 'all' || product.category === selectedCategory;
        const matchBrand = selectedBrand === 'all' || product.brand === selectedBrand;

        if (!isSearchMode) return matchPrice && matchCategory && matchBrand;

        const searchableText = [
            product.name,
            product.brand,
            product.category,
            ...(Array.isArray(product.variants) ? product.variants.map((item) => item.label) : [])
        ]
            .filter(Boolean)
            .map((item) => normalizeText(item))
            .join(' ');

        const matchKeyword = searchableText.includes(normalizedKeyword);
        return matchKeyword;
    });

    // 2. Áp dụng Sắp xếp
    filteredProducts.sort((a, b) => {
        if (sortOrder === 'price-asc') return getProductPrice(a) - getProductPrice(b);
        if (sortOrder === 'price-desc') return getProductPrice(b) - getProductPrice(a);
        
        // Mặc định: Mới nhất
        const dateA = new Date(a.createdAt).getTime() || a.id;
        const dateB = new Date(b.createdAt).getTime() || b.id;
        return dateB - dateA; 
    })

    // 3. Xử lý Phân trang (20 sản phẩm / trang)
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        // Tự động cuộn lên đầu danh sách sản phẩm khi bấm qua trang (Bỏ qua đoạn Slider)
        window.scrollTo({ top: isSearchMode ? 0 : 400, behavior: 'smooth' });
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
                <div className="mb-10 shadow-sm">
                    {loading ? <div className="w-full h-[250px] md:h-[400px] bg-slate-100 rounded-3xl animate-pulse"></div> : <HeroSlider slides={slides} />}
                </div>
            )}

            {isSearchMode && (
                <div className="mb-6 md:mb-8">
                    <h1 className="text-[40px] leading-none font-semibold text-slate-900 tracking-tight mb-3">Kết quả tìm kiếm</h1>
                    <p className="text-slate-500 text-sm">Hiển thị {filteredProducts.length} sản phẩm cho "{searchKeyword}"</p>
                </div>
            )}

            {/* THANH BỘ LỌC NGANG & SẮP XẾP */}
            {!isSearchMode ? (
                <div className="bg-white p-4 md:px-6 md:py-5 rounded-2xl border border-slate-200 shadow-sm mb-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 sticky top-[var(--client-nav-offset)] z-30">
                    <div className="flex flex-wrap items-center gap-3 w-full">
                        <div className="flex items-center gap-2 text-rose-500 font-bold mr-2">
                            <Filter size={20} /> <span className="hidden md:inline text-slate-800 text-base">Bộ lọc:</span>
                        </div>

                        <div className="flex-1 min-w-[140px] max-w-[180px]">
                            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 cursor-pointer">
                                <option value="all">Tất cả danh mục</option>
                                {dbCategories.map((item) => (
                                    <option key={item.id || item.MaDM} value={item.name || item.TenDM}>
                                        {item.name || item.TenDM}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 min-w-[140px] max-w-[180px]">
                            <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 cursor-pointer">
                                {brands.map((item) => (
                                    <option key={item} value={item}>{item === 'all' ? 'Tất cả thương hiệu' : item}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 min-w-[240px] max-w-[320px]">
                            <span className="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap">Giá tới:</span>
                            <input type="range" min="0" max="3000000" step="50000" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                            <span className="text-sm font-bold text-rose-600 whitespace-nowrap w-20 text-right">{maxPrice.toLocaleString('vi-VN')}đ</span>
                        </div>

                        <div className="flex-1 min-w-[140px] max-w-[180px] ml-auto xl:ml-4 border-l xl:border-slate-200 xl:pl-4">
                            <div className="flex items-center gap-2 relative">
                                <SlidersHorizontal size={16} className="text-slate-400 absolute left-3 pointer-events-none" />
                                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 cursor-pointer appearance-none">
                                    <option value="newest">Hàng mới nhất</option>
                                    <option value="price-asc">Giá: Thấp đến Cao</option>
                                    <option value="price-desc">Giá: Cao đến Thấp</option>
                                </select>
                            </div>
                        </div>

                        <button onClick={handleResetFilter} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold transition-colors w-full xl:w-auto">
                            <RefreshCcw size={16} /> <span className="xl:hidden">Làm mới bộ lọc</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white px-4 py-3 md:px-5 rounded-2xl border border-slate-200 shadow-sm mb-8">
                    <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 uppercase tracking-wide">Sắp xếp theo</span>
                            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-transparent border-0 text-sm font-semibold text-slate-700 pr-2 outline-none cursor-pointer">
                                <option value="newest">Mới nhất</option>
                                <option value="price-asc">Giá tăng dần</option>
                                <option value="price-desc">Giá giảm dần</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* DANH SÁCH LƯỚI SẢN PHẨM */}
            <div className="w-full mb-12">
                {loading ? (
                    <div className={`grid ${isSearchMode ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6'}`}>
                        {Array(12).fill(0).map((_, i) => <ProductSkeleton key={i} />)}
                    </div>
                ) : (
                    <>
                        <div className={`grid ${isSearchMode ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6'}`}>
                            {currentItems.map((product) => (
                                <ProductCard key={product.id} product={product} compact={false} />
                            ))}
                        </div>

                        {filteredProducts.length === 0 && !error && (
                            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm mt-8">
                                <p className="text-slate-600 text-lg font-medium mb-4">Không có sản phẩm nào phù hợp với tìm kiếm của bạn.</p>
                                <button onClick={handleResetFilter} className="text-white bg-rose-500 hover:bg-rose-600 px-8 py-3 rounded-xl font-bold text-base transition-all shadow-lg shadow-rose-500/30">
                                    Tải lại toàn bộ sản phẩm
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* NÚT PHÂN TRANG (PAGINATION) */}
            {!loading && totalPages > 1 && (
                <div className={`flex items-center justify-center gap-2 mt-8 ${isSearchMode ? 'mb-4' : 'mb-16'}`}>
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        disabled={currentPage === 1}
                        className={`w-9 h-9 flex items-center justify-center ${isSearchMode ? 'rounded-full' : 'rounded-xl'} border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                        <button
                            key={number}
                            onClick={() => handlePageChange(number)}
                            className={`${isSearchMode ? 'w-9 h-9 rounded-full' : 'w-10 h-10 rounded-xl'} flex items-center justify-center text-sm font-bold transition-colors shadow-sm ${
                                currentPage === number 
                                    ? 'bg-slate-900 text-white shadow-slate-900/20' 
                                    : `${isSearchMode ? 'bg-transparent border-0 text-slate-500 hover:text-slate-900 shadow-none' : 'bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'}`
                            }`}
                        >
                            {number}
                        </button>
                    ))}

                    <button 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        disabled={currentPage === totalPages}
                        className={`w-9 h-9 flex items-center justify-center ${isSearchMode ? 'rounded-full' : 'rounded-xl'} border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

        </div>
    );
}