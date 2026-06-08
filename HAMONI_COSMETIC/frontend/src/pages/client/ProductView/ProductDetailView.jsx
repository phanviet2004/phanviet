import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import productApi from '../../../services/productApi';
import shoppingCartApi from '../../../services/shoppingCartApi';
import { useStore } from '../../../store/useStore';
import './ProductDetailView.css';
import { CheckCircle2, MessageCircleMore, ShoppingBag, ShoppingCart, X, ChevronLeft, ChevronRight } from 'lucide-react';

const PRODUCT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop';

const ProductDetailView = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  
  // Lấy hàm cập nhật giỏ hàng từ store
  const { syncCartFromBackend } = useStore();

  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showCartAddedPopup, setShowCartAddedPopup] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [quantityInput, setQuantityInput] = useState('1');
  const [quantityWarning, setQuantityWarning] = useState('');
  const [selectedReviewStars, setSelectedReviewStars] = useState(0);
  const [selectedReviewHasMedia, setSelectedReviewHasMedia] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const popupTimerRef = useRef(null);

  const images = useMemo(() => {
    if (!product?.images || product.images.length === 0) {
      return [PRODUCT_FALLBACK_IMAGE];
    }
    return product.images;
  }, [product]);

  const variantOptions = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return [];

    const variantType = detectVariantType(product.variants);

    // Remove duplicate variants by MaBienThe
    const uniqueVariants = product.variants.filter((variant, index, array) => {
      return index === array.findIndex(v => v.MaBienThe === variant.MaBienThe);
    });

    return uniqueVariants.map((variant, index) => {
      const stock = Number(variant.SoLuongTon ?? product.stock ?? 0);
      const price = Number(
        variant.GiaBan ?? variant.giaBan ?? variant.Gia ?? variant.gia ?? (product.price || 0)
      );
      const oldPrice = variant.GiaGoc ?? variant.giaGoc ?? null;

      return {
        id: variant.MaBienThe,
        name: variant.TenBienThe || `Biến thể ${index + 1}`,
        price,
        oldPrice: oldPrice !== null && oldPrice !== undefined ? Number(oldPrice) : null,
        stock,
        imageIndex: index % images.length,
        displayName: getVariantDisplayName(variant.TenBienThe, variantType, index + 1)
      };
    });
  }, [images.length, product]);

  const variantType = useMemo(() => detectVariantType(product?.variants || []), [product]);
  const variantLabel = variantType === 'weight' ? 'Khối lượng' : 'Màu sắc';

  const selectedVariant = useMemo(() => {
    if (variantOptions.length === 0) return null;
    return variantOptions.find((variant) => variant.id === selectedVariantId) || variantOptions[0];
  }, [selectedVariantId, variantOptions]);

  const availableStock = selectedVariant ? selectedVariant.stock : product?.stock || 0;
  const displayPrice = selectedVariant ? selectedVariant.price : product?.price || 0;
  const displayOldPrice = selectedVariant ? selectedVariant.oldPrice : product?.oldPrice || null;

  const reviewCountsByStars = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 0)));
      counts[star] += 1;
    });
    return counts;
  }, [reviews]);

  const reviewMediaCount = useMemo(
    () => reviews.filter((review) => hasReviewMedia(review)).length,
    [reviews]
  );

  const filteredReviews = useMemo(() => {
    let nextReviews = [...reviews];

    if (selectedReviewStars !== 0) {
      nextReviews = nextReviews.filter((review) => {
        const star = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 0)));
        return star === selectedReviewStars;
      });
    }

    if (selectedReviewHasMedia) {
      nextReviews = nextReviews.filter((review) => hasReviewMedia(review));
    }

    return nextReviews;
  }, [reviews, selectedReviewHasMedia, selectedReviewStars]);

  const reviewFilterItems = useMemo(
    () => [
      { value: 0, label: 'Tất Cả', count: reviews.length },
      { value: 5, label: '5 Sao', count: reviewCountsByStars[5] },
      { value: 4, label: '4 Sao', count: reviewCountsByStars[4] },
      { value: 3, label: '3 Sao', count: reviewCountsByStars[3] },
      { value: 2, label: '2 Sao', count: reviewCountsByStars[2] },
      { value: 1, label: '1 Sao', count: reviewCountsByStars[1] }
    ],
    [reviewCountsByStars, reviews.length]
  );

  const handleToggleReviewMedia = () => {
    setSelectedReviewHasMedia((prev) => {
      const nextValue = !prev;
      if (nextValue) {
        setSelectedReviewStars(0);
      }
      return nextValue;
    });
  };

  useEffect(() => {
    return () => {
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }
    };
  }, []);

const handlePrevImage = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (productId) {
      sessionStorage.setItem('lastProductPageId', String(productId));
    }

    const loadProductData = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const detailRes = await productApi.getPublicDetail(productId);

        const info = detailRes?.info || {};
        const detailImages = (detailRes?.images || [])
          .map((item) => item.DuongDanAnh)
          .filter(Boolean);

        setProduct({
          id: info.MaSP,
          name: info.TenSP || 'Sản phẩm',
          price: Number(info.GiaBan || 0),
          oldPrice: info.GiaGoc !== undefined && info.GiaGoc !== null ? Number(info.GiaGoc) : null,
          rating: Number(info.SoSaoTB || 0),
          reviewCount: Number(info.LuotDanhGia || 0),
          stock: Number(info.SoLuongTon || 0),
          description: info.MoTa || 'Sản phẩm chưa có mô tả.',
          ingredients: info.ThanhPhan || 'Đang cập nhật.',
          usage: info.CachSuDung || 'Đang cập nhật.',
          brand: 'HAMONI',
          origin: 'Việt Nam',
          variants: detailRes?.variants || [],
          images: detailImages
        });

        try {
          const reviewsRes = await productApi.getProductReviews(productId, { limit: 4 });
          const mappedReviews = (reviewsRes || []).map((item) => ({
            id: item.MaDG,
            customerName: item.HoTen || 'Khách hàng',
            rating: Number(item.SoSao || 0),
            comment: item.BinhLuan || '',
            date: formatDate(item.NgayDanhGia),
            sortDate: item.NgayDanhGia ? new Date(item.NgayDanhGia).getTime() : 0,
            media: extractReviewMedia(item),
            replies: Array.isArray(item.replies)
              ? item.replies.map((reply) => ({
                  id: reply.MaPH,
                  customerName: reply.HoTen || 'Shop',
                  comment: reply.NoiDung || '',
                  date: formatDate(reply.NgayTao)
                }))
              : [],
            avatar: `https://ui-avatars.com/api/?background=e5e7eb&color=111827&name=${encodeURIComponent(item.HoTen || 'KH')}`
          }));
          setReviews(mappedReviews);
        } catch (reviewsError) {
          console.warn('Không tải được đánh giá:', reviewsError);
          setReviews([]);
        }

        try {
          const suggestedRes = await productApi.getSuggestedProducts(productId, { limit: 4 });
          const mappedSuggested = (suggestedRes || []).map((item) => ({
            id: item.MaSP,
            name: item.TenSP || 'Sản phẩm',
            price: Number(item.GiaBan || 0),
            rating: Number(item.SoSaoTB || 0),
            image: item.AnhChinh || PRODUCT_FALLBACK_IMAGE
          }));
          setSuggestedProducts(mappedSuggested);
        } catch (suggestedError) {
          console.warn('Không tải được sản phẩm gợi ý:', suggestedError);
          setSuggestedProducts([]);
        }

        setQuantity(1);
        setQuantityInput('1');
        setQuantityWarning('');
        setSelectedImageIndex(0);
        const firstAvailableVariant = (detailRes?.variants || []).find(
          (variant) => Number(variant.SoLuongTon || 0) > 0
        );
        setSelectedVariantId(
          firstAvailableVariant?.MaBienThe || detailRes?.variants?.[0]?.MaBienThe || null
        );
      } catch (error) {
        console.error('Lỗi tải chi tiết sản phẩm:', error);
        toast.error('Không thể tải chi tiết sản phẩm từ MySQL.');
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [productId]);

  const handleQuantityChange = (step) => {
    if (!product) return;
    const maxStock = Math.max(1, availableStock);
    setQuantity((prev) => {
      const nextQty = Math.max(1, Math.min(maxStock, Number(prev) + step));
      setQuantityInput(String(nextQty));
      setQuantityWarning('');
      return nextQty;
    });
  };

  const handleQuantityInputChange = (event) => {
    if (!product) return;

    const rawValue = event.target.value;
    const numericText = String(rawValue).replace(/\D/g, '');
    const maxStock = Math.max(1, availableStock);

    if (!numericText) {
      setQuantityInput('');
      return;
    }

    const parsedValue = Number.parseInt(numericText, 10);
    if (Number.isNaN(parsedValue)) {
      return;
    }

    const isOverStock = parsedValue > maxStock;
    const nextValue = Math.max(1, Math.min(maxStock, parsedValue));
    setQuantityInput(String(nextValue));
    setQuantity(nextValue);
    setQuantityWarning(
      isOverStock ? 'Số lượng bạn chọn đã đạt mức tối đa của sản phẩm này' : ''
    );
  };

  const handleQuantityInputBlur = () => {
    if (!product) return;

    const maxStock = Math.max(1, availableStock);
    const parsedValue = Number.parseInt(quantityInput, 10);
    const nextQty = Number.isNaN(parsedValue)
      ? 1
      : Math.max(1, Math.min(maxStock, parsedValue));

    setQuantity(nextQty);
    setQuantityInput(String(nextQty));
    setQuantityWarning(parsedValue > maxStock ? 'Số lượng bạn chọn đã đạt mức tối đa của sản phẩm này' : '');
  };

  const handleSelectVariant = (variant) => {
    if (!variant || variant.stock <= 0) return;

    setSelectedVariantId(variant.id);
    setSelectedImageIndex(variant.imageIndex);
    setQuantity((prev) => {
      const nextQty = Math.max(1, Math.min(prev, variant.stock));
      setQuantityInput(String(nextQty));
      setQuantityWarning('');
      return nextQty;
    });
  };

  const getMaKhachHang = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.id || user?.maND || user?.MaND || null;
  };

  const openCartAddedPopup = () => {
    setLastAddedItem({
      image: images[selectedImageIndex] || images[0] || PRODUCT_FALLBACK_IMAGE,
      name: product?.name || 'Sản phẩm',
      variant: selectedVariant?.displayName || '',
      quantity,
      price: displayPrice
    });
    setShowCartAddedPopup(true);

    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
    }

    popupTimerRef.current = setTimeout(() => {
      setShowCartAddedPopup(false);
    }, 2800);
  };

  const addToCart = async ({ showPopup = false } = {}) => {
    if (!product || isAddingToCart) return false;

    const parsedInputQuantity = Number.parseInt(quantityInput, 10);
    const maxStock = Math.max(1, availableStock);
    const nextQuantity = Number.isNaN(parsedInputQuantity)
      ? 1
      : Math.max(1, Math.min(maxStock, parsedInputQuantity));

    if (nextQuantity !== quantity) {
      setQuantity(nextQuantity);
    }
    setQuantityInput(String(nextQuantity));

    if (availableStock <= 0) {
      toast.error('Sản phẩm này đã hết hàng. Vui lòng chọn phân loại khác.');
      return false;
    }

    if (variantOptions.length > 0 && !selectedVariant) {
      toast.warning(`Vui lòng chọn ${variantLabel.toLowerCase()} trước khi thêm vào giỏ.`);
      return false;
    }

    const currentVariantId = selectedVariant?.id;
    if (!currentVariantId) {
      toast.warning('Sản phẩm này chưa có biến thể hợp lệ để thêm vào giỏ hàng.');
      return false;
    }

    const maKhachHang = getMaKhachHang();
    if (!maKhachHang) {
      toast.warning('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
      navigate('/login');
      return false;
    }

    try {
      setIsAddingToCart(true);
      const response = await shoppingCartApi.addToCart({
        maKhachHang,
        maBienThe: currentVariantId,
        soLuong: nextQuantity
      });
      
      console.log('✅ addToCart response:', response);

      // Đồng bộ giỏ hàng với store để cập nhật badge icon
      try {
        const cartResponse = await shoppingCartApi.getCartItems(maKhachHang);
        const cartItems = Array.isArray(cartResponse?.data) ? cartResponse.data : (Array.isArray(cartResponse) ? cartResponse : []);
        
        // Cập nhật store với dữ liệu giỏ hàng từ backend
        syncCartFromBackend(cartItems);
      } catch (syncError) {
        console.error('⚠️ Lỗi khi đồng bộ giỏ hàng:', syncError);
        // Không dừng quy trình nếu đồng bộ thất bại
      }

      if (showPopup) {
        openCartAddedPopup();
      }

      toast.success(`Đã thêm ${nextQuantity} sản phẩm vào giỏ hàng`);
      return true;
    } catch (error) {
      const message = error?.response?.data?.message || 'Không thể thêm vào giỏ hàng. Vui lòng thử lại.';
      toast.error(message);
      return false;
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleAddToCart = async () => {
    await addToCart({ showPopup: true });
  };

  const handleBuyNow = async () => {
    const added = await addToCart();
    if (added) {
      navigate('/cart');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="spinner" />
          <p className="mt-3 text-slate-500">Đang tải dữ liệu sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-0 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">Không tìm thấy sản phẩm.</div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <div>
          <div className="image-gallery">
            <div 
              className="main-image-container cursor-pointer" 
              onClick={() => setShowImageModal(true)}
            >
              <img src={images[selectedImageIndex]} alt={product.name} />
            </div>

            <div className="thumbnail-container">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                  onMouseEnter={() => {
        setSelectedImageIndex(index); // 1. Nhảy đến đúng ảnh đó
        
      }} 
      onClick={() => {
      setSelectedImageIndex(index); // Đảm bảo Popup mở đúng ảnh này
      setShowImageModal(true);
    }}
      style={{ cursor: 'pointer' }}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="product-info">
            <div className="product-header">
              <h1 className="product-title">{product.name}</h1>

              <div className="rating-section">
                <div className="stars stars--brand">
                  {renderStars(product.rating)}
                </div>
                <span className="rating-summary">
                  {product.rating.toFixed(1)}/5 ({product.reviewCount} lượt đánh giá)
                </span>
              </div>

              <div>
                <div className="price-section">
                  <span className="current-price">{formatVnd(displayPrice)}đ</span>
                  {displayOldPrice && displayOldPrice > displayPrice && (
                    <>
                      <span className="original-price">{formatVnd(displayOldPrice)}đ</span>
                      <span className="discount-text">
                        Tiết kiệm {formatVnd(displayOldPrice - displayPrice)}đ
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {variantOptions.length > 0 && (
              <div className="variant-selector">
                <div className="variant-selector-header">
                  <p className="variant-label">{variantLabel}</p>
                  {selectedVariant && (
                    <p className="variant-selected-text">Đã chọn: {selectedVariant.displayName}</p>
                  )}
                </div>

                <div className="variant-grid">
  {variantOptions.map((variant) => (
    <button
      key={variant.id}
      type="button"
      className={`variant-item ${selectedVariant?.id === variant.id ? 'active' : ''} ${variant.stock <= 0 ? 'disabled' : ''}`}
      onClick={() => handleSelectVariant(variant)}
      disabled={variant.stock <= 0}
    >
      <img
        src={images[variant.imageIndex] || images[0]}
        alt={variant.displayName}
        className="variant-item-image"
      />
      <span className="variant-item-name">{variant.displayName}</span>
      {variant.stock <= 0 && <span className="variant-item-stock">Hết hàng</span>}
    </button>
  ))}
</div>
              </div>
            )}

            <div className="stock-status">
              <span className="stock-indicator" />
              <span className="stock-text">
                {availableStock > 0
                  ? `Còn hàng (${availableStock} sản phẩm)`
                  : 'Hết hàng'}
              </span>
            </div>

            <div className="quantity-selector">
              <div className="quantity-input">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={availableStock <= 0 || quantity <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, availableStock)}
                  value={quantityInput}
                  onChange={handleQuantityInputChange}
                  onBlur={handleQuantityInputBlur}
                  disabled={availableStock <= 0}
                  aria-label="Số lượng sản phẩm"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  disabled={availableStock <= 0 || quantity >= availableStock}
                >
                  +
                </button>
              </div>
              <small className="text-slate-500">Tối đa: {availableStock} sản phẩm</small>
              {quantityWarning && (
                <small className="quantity-warning" role="alert">
                  {quantityWarning}
                </small>
              )}
            </div>

            <div className="action-buttons">
              <button
                type="button"
                className="btn-add-cart"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                <ShoppingCart size={18} />
                {isAddingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
              </button>
              <button
                type="button"
                className="btn-buy-now"
                onClick={handleBuyNow}
                disabled={isAddingToCart}
              >
                Mua ngay
              </button>
            </div>

            <div className="product-details">
              <div className="product-description">
                
                <div className="product-description__body">
                  <div className="product-description__section">
                    <p className="product-description__section-title">Mô tả sản phẩm</p>
                    <p className="product-description__lead">{product.description}</p>
                  </div>

                  <div className="product-description__section">
                    <p className="product-description__section-title">Thành phần</p>
                    <p className="product-description__lead">{product.ingredients}</p>
                  </div>

                  <div className="product-description__section">
                    <p className="product-description__section-title">Hướng dẫn sử dụng</p>
                    <p className="product-description__lead">{product.usage}</p>
                  </div>

                  <div className="product-description__section">
                    <p className="product-description__section-title">Thương hiệu</p>
                    <p className="product-description__lead">{product.brand}</p>
                  </div>

                  <div className="product-description__section">
                    <p className="product-description__section-title">Xuất xứ</p>
                    <p className="product-description__lead">{product.origin}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="reviews" className="reviews-section">
        <div className="section-banner">
          <div className="section-banner-main">
            <span className="section-banner-icon-wrap" aria-hidden="true">
              <MessageCircleMore size={14} />
            </span>
            <div>
              <p className="section-banner-title">Đánh giá sản phẩm</p>
              <p className="section-banner-subtitle">Phản hồi thực tế từ những người đã trải nghiệm.</p>
            </div>
          </div>
          
        </div>

        <div className="reviews-panel" id="all-reviews">
          

          {reviews.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">Chưa có đánh giá nào.</div>
          ) : (
            <>
              <div className="reviews-summary-bar">
                <div className="reviews-score-block">
                  <div className="reviews-score-row">
                    <span className="reviews-score">{product.rating.toFixed(1)}</span>
                    <span className="reviews-score-max">trên 5</span>
                  </div>
                  <span className="reviews-score-stars" aria-label="Điểm đánh giá trung bình">
                    {renderStars(product.rating, { activeColor: '#facc15', inactiveColor: '#fde68a' })}
                  </span>
                </div>
                <div className="reviews-controls">
                  <div className="reviews-filter-row" role="tablist" aria-label="Lọc theo số sao">
                    {reviewFilterItems.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={`review-filter-chip ${selectedReviewStars === item.value && !(item.value === 0 && selectedReviewHasMedia) ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedReviewStars(item.value);
                          setSelectedReviewHasMedia(false);
                        }}
                      >
                        {item.label} ({item.count})
                      </button>
                    ))}
                  </div>
                  <div className="reviews-media-row">
                    <button
                      type="button"
                      className={`review-media-chip ${selectedReviewHasMedia ? 'active' : ''}`}
                      onClick={handleToggleReviewMedia}
                    >
                      Có Hình Ảnh/Video ({reviewMediaCount})
                    </button>
                  </div>
                </div>
              </div>

              <div className="reviews-list">
                {filteredReviews.length === 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">
                    Không có đánh giá nào ở mức sao này.
                  </div>
                )}

                {filteredReviews.map((review) => (
                  <article key={review.id} className="review-card">
                    <div className="review-header">
                      <div className="reviewer-avatar" aria-hidden="true">
                        {getInitials(review.customerName)}
                      </div>
                      <div className="reviewer-info">
                        <p className="reviewer-name mb-1">{review.customerName}</p>
                        <div className="review-meta">
                          <span className="review-stars">{renderStars(review.rating)}</span>
                          <span className="review-date">{review.date}</span>
                        </div>
                        <p className="review-text mb-0">{review.comment}</p>
                        {review.replies?.length > 0 && (
                          <div className="review-replies">
                            {review.replies.map((reply) => (
                              <div key={reply.id} className="review-reply">
                                <div className="review-reply-header">
                                  <span className="review-reply-badge">Phản hồi từ shop</span>
                                  <span className="review-reply-date">{reply.date}</span>
                                </div>
                                <p className="review-reply-text mb-0">{reply.comment}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="suggested-section">
        <div className="section-banner section-banner--suggested">
          <div className="section-banner-main">
            <span className="section-banner-icon-wrap" aria-hidden="true">
              <ShoppingBag size={14} />
            </span>
            <div>
              <p className="section-banner-title">Gợi ý cho bạn</p>
              <p className="section-banner-subtitle">Những sản phẩm được chọn lọc dành riêng cho bạn.</p>
            </div>
          </div>
        </div>

        {suggestedProducts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">Không có sản phẩm gợi ý.</div>
        ) : (
          <div className="products-grid products-grid--featured" id="suggested-products">
            {suggestedProducts.map((item) => (
              <article
                key={item.id}
                className="product-card"
                onClick={() => navigate(`/product/${item.id}`)}
              >
                <div className="product-image">
                  <img src={item.image} alt={item.name} />
                </div>
                <p className="product-name">{item.name}</p>
                <p className="product-price">{formatVnd(item.price)}đ</p>
              </article>
            ))}
          </div>
        )}
      </section>
      </div>

      {showCartAddedPopup && (
        <div className="cart-added-overlay" onClick={() => setShowCartAddedPopup(false)}>
          <div className="cart-added-popup" onClick={(event) => event.stopPropagation()}>
            <div className="cart-added-icon-wrap">
              <CheckCircle2 size={42} />
            </div>
            <p className="cart-added-title">Sản phẩm đã được thêm vào Giỏ hàng</p>

            {lastAddedItem && (
              <div className="cart-added-item">
                <img src={lastAddedItem.image} alt={lastAddedItem.name} />
                <div className="cart-added-item-info">
                  <p className="cart-added-item-name">{lastAddedItem.name}</p>
                  <p className="cart-added-item-meta">
                    {lastAddedItem.variant ? `${lastAddedItem.variant} • ` : ''}
                    SL: {lastAddedItem.quantity} • {formatVnd(lastAddedItem.price)}đ
                  </p>
                </div>
              </div>
            )}

            <div className="cart-added-actions">
              <button
                type="button"
                className="cart-added-btn cart-added-btn-primary"
                onClick={() => {
                  setShowCartAddedPopup(false);
                  navigate('/cart');
                }}
              >
                Xem giỏ hàng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal xem ảnh kiểu Shopee */}
      {showImageModal && (
        <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setShowImageModal(false)}>
              <X size={24} />
            </button>
            <div className="image-modal-layout">
              {/* Cột trái: Ảnh lớn */}
              <div className="image-modal-main">
                <button className="image-modal-nav prev" onClick={handlePrevImage}>
                  <ChevronLeft size={36} />
                </button>
                <img src={images[selectedImageIndex]} alt={product.name} />
                <button className="image-modal-nav next" onClick={handleNextImage}>
                  <ChevronRight size={36} />
                </button>
              </div>
              
              {/* Cột phải: Danh sách ảnh thu nhỏ */}
              <div className="image-modal-thumbnails">
                <div className="image-modal-title">{product.name}</div>
                <div className="image-modal-thumb-grid">
                  {images.map((image, index) => (
                    <div
                      key={`modal-thumb-${index}`}
                      className={`image-modal-thumb ${selectedImageIndex === index ? 'active' : ''}`}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img src={image} alt={`Thumbnail ${index + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
};

function renderStars(rating = 0, options = {}) {
  const { activeColor = '#f59e0b', inactiveColor = '#d1d5db' } = options;
  const filled = Math.round(rating);
  return Array.from({ length: 5 }, (_, index) => (
    <span key={index} style={{ color: index < filled ? activeColor : inactiveColor }}>
      ★
    </span>
  ));
}

function formatDate(dateValue) {
  if (!dateValue) return 'Vừa xong';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Vừa xong';
  return date.toLocaleDateString('vi-VN');
}

function formatVnd(value = 0) {
  return Number(value).toLocaleString('vi-VN');
}

function extractReviewMedia(review = {}) {
  const candidates = [
    review.media,
    review.mediaItems,
    review.attachments,
    review.images,
    review.videos,
    review.HinhAnh,
    review.Video,
    review.DinhKem,
    review.DuongDanAnh
  ];

  return candidates.flatMap((item) => {
    if (!item) return [];
    if (Array.isArray(item)) return item.filter(Boolean);
    return [item];
  });
}

function hasReviewMedia(review = {}) {
  return extractReviewMedia(review).length > 0;
}

function getInitials(name = '') {
  const words = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'KH';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase();
}

function getVariantDisplayName(name = '', variantType = 'color', fallbackIndex = 1) {
  const normalizedName = String(name || '').trim();
  if (!normalizedName) {
    return variantType === 'weight'
      ? `Khối lượng ${fallbackIndex}`
      : `Màu ${String(fallbackIndex).padStart(2, '0')}`;
  }

  if (variantType === 'weight') {
    const weightToken = normalizedName.match(/\b\d+(?:[.,]\d+)?\s*(?:ml|g|gr|gram|kg|l|lit|oz|lb)\b/i);
    if (weightToken?.[0]) {
      return weightToken[0].replace(/\s+/g, '').toUpperCase();
    }
  } else {
    const colorCodeToken = normalizedName.match(/\b[A-Za-z]{1,4}\d{1,4}\b/);
    if (colorCodeToken?.[0]) {
      return colorCodeToken[0].toUpperCase();
    }
  }

  return normalizedName;
}

function detectVariantType(variants = []) {
  if (!Array.isArray(variants) || variants.length === 0) return 'color';

  const names = variants.map((variant) => String(variant?.TenBienThe || '').trim()).filter(Boolean);
  if (names.length === 0) return 'color';

  const weightPattern = /\b\d+(?:[.,]\d+)?\s*(?:ml|g|gr|gram|kg|l|lit|oz|lb)\b/i;
  const colorKeywordPattern = /\b(mau|màu|shade|color|đen|trang|trắng|do|đỏ|hong|hồng|cam|nau|nâu|xanh|tim|tím|be|nude|brown|red|pink|orange|coral|peach|rose)\b/i;
  const colorCodePattern = /\b[A-Za-z]{1,4}\d{1,4}\b/;

  let weightHits = 0;
  let colorHits = 0;

  names.forEach((name) => {
    if (weightPattern.test(name)) {
      weightHits += 1;
      return;
    }

    if (colorKeywordPattern.test(name) || colorCodePattern.test(name)) {
      colorHits += 1;
    }
  });

  if (weightHits > 0 && weightHits >= colorHits) return 'weight';
  return 'color';
}

export default ProductDetailView;
