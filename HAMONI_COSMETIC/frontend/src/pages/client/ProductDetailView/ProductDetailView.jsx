import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import productApi from "../../../services/productApi";
import shoppingCartApi from "../../../services/shoppingCartApi";
import { useStore } from "../../../store/useStore";
import "./ProductDetailView.css";
import {
  CheckCircle2,
  MessageCircleMore,
  ShoppingBag,
  ShoppingCart,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const PRODUCT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop";

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
  const [quantityInput, setQuantityInput] = useState("1");
  const [quantityWarning, setQuantityWarning] = useState("");
  const [selectedReviewStars, setSelectedReviewStars] = useState(0);
  const [selectedReviewHasMedia, setSelectedReviewHasMedia] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [reviewMediaViewer, setReviewMediaViewer] = useState(null);
  const [reviewReplyEligibility, setReviewReplyEligibility] = useState({
    canReply: false,
    hasReviewed: false,
    hasCompletedPurchase: false,
  });
  const [reviewReplyInputByReview, setReviewReplyInputByReview] = useState({});
  const [submittingReplyReviewId, setSubmittingReplyReviewId] = useState(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [expandedRepliesByReview, setExpandedRepliesByReview] = useState({});
  const [currentReviewPage, setCurrentReviewPage] = useState(1);

  const REVIEWS_PER_PAGE = 5;

  const currentUserId = useMemo(() => getLoggedInUserId(), []);

  const popupTimerRef = useRef(null);

  const images = useMemo(() => {
    if (!product?.images || product.images.length === 0) {
      return [PRODUCT_FALLBACK_IMAGE];
    }
    return product.images;
  }, [product]);

  const thumbnailContainerRef = useRef(null);

  const variantOptions = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return [];

    const variantType = detectVariantType(product.variants);

    // Remove duplicate variants by MaBienThe
    const uniqueVariants = product.variants.filter((variant, index, array) => {
      return (
        index === array.findIndex((v) => v.MaBienThe === variant.MaBienThe)
      );
    });

    return uniqueVariants.map((variant, index) => {
      const stock = Number(variant.SoLuongTon ?? product.stock ?? 0);
      const price = Number(
        variant.GiaBan ??
          variant.giaBan ??
          variant.Gia ??
          variant.gia ??
          (product.price || 0),
      );
      const oldPrice = variant.GiaGoc ?? variant.giaGoc ?? null;

      return {
        id: variant.MaBienThe,
        name: variant.TenBienThe || `Biến thể ${index + 1}`,
        price,
        oldPrice:
          oldPrice !== null && oldPrice !== undefined ? Number(oldPrice) : null,
        stock,
        imageIndex: index % images.length,
        displayName: getVariantDisplayName(
          variant.TenBienThe,
          variantType,
          index + 1,
        ),
      };
    });
  }, [images.length, product]);

  const variantType = useMemo(
    () => detectVariantType(product?.variants || []),
    [product],
  );
  const variantLabel = variantType === "weight" ? "Khối lượng" : "Màu sắc";

  const selectedVariant = useMemo(() => {
    if (variantOptions.length === 0) return null;
    return (
      variantOptions.find((variant) => variant.id === selectedVariantId) ||
      variantOptions[0]
    );
  }, [selectedVariantId, variantOptions]);

  const availableStock = selectedVariant
    ? selectedVariant.stock
    : product?.stock || 0;
  const displayPrice = selectedVariant
    ? selectedVariant.price
    : product?.price || 0;
  const displayOldPrice = selectedVariant
    ? selectedVariant.oldPrice
    : product?.oldPrice || null;

  const reviewCountsByStars = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      const star = Math.min(
        5,
        Math.max(1, Math.round(Number(review.rating) || 0)),
      );
      counts[star] += 1;
    });
    return counts;
  }, [reviews]);

  const reviewMediaCount = useMemo(
    () => reviews.filter((review) => hasReviewMedia(review)).length,
    [reviews],
  );

  const filteredReviews = useMemo(() => {
    let nextReviews = [...reviews];

    if (selectedReviewStars !== 0) {
      nextReviews = nextReviews.filter((review) => {
        const star = Math.min(
          5,
          Math.max(1, Math.round(Number(review.rating) || 0)),
        );
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
      { value: 0, label: "Tất Cả", count: reviews.length },
      { value: 5, label: "5 Sao", count: reviewCountsByStars[5] },
      { value: 4, label: "4 Sao", count: reviewCountsByStars[4] },
      { value: 3, label: "3 Sao", count: reviewCountsByStars[3] },
      { value: 2, label: "2 Sao", count: reviewCountsByStars[2] },
      { value: 1, label: "1 Sao", count: reviewCountsByStars[1] },
    ],
    [reviewCountsByStars, reviews.length],
  );

  const descriptionTextLength = useMemo(() => {
    if (!product) return 0;
    return [
      product.description,
      product.ingredients,
      product.usage,
      product.brand,
      product.origin,
    ]
      .filter(Boolean)
      .join(" ").length;
  }, [product]);

  const canToggleDescription = descriptionTextLength > 300;

  const totalReviewPages = Math.max(
    1,
    Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE),
  );
  const safeCurrentReviewPage = Math.min(currentReviewPage, totalReviewPages);

  const paginatedReviews = useMemo(() => {
    const start = (safeCurrentReviewPage - 1) * REVIEWS_PER_PAGE;
    return filteredReviews.slice(start, start + REVIEWS_PER_PAGE);
  }, [filteredReviews, safeCurrentReviewPage]);

  const reviewPaginationItems = useMemo(() => {
    if (totalReviewPages <= 7) {
      return Array.from({ length: totalReviewPages }, (_, index) => index + 1);
    }

    const items = [1];

    if (safeCurrentReviewPage > 3) {
      items.push("ellipsis-left");
    }

    const midStart = Math.max(2, safeCurrentReviewPage - 1);
    const midEnd = Math.min(totalReviewPages - 1, safeCurrentReviewPage + 1);
    for (let page = midStart; page <= midEnd; page += 1) {
      items.push(page);
    }

    if (safeCurrentReviewPage < totalReviewPages - 2) {
      items.push("ellipsis-right");
    }

    items.push(totalReviewPages);
    return items;
  }, [safeCurrentReviewPage, totalReviewPages]);

  const handleToggleReviewMedia = () => {
    setSelectedReviewHasMedia((prev) => {
      const nextValue = !prev;
      if (nextValue) {
        setSelectedReviewStars(0);
      }
      return nextValue;
    });
  };

  const openReviewMediaViewer = (review, index = 0) => {
    const media = Array.isArray(review?.media)
      ? review.media
      : extractReviewMedia(review);

    if (media.length === 0) {
      return;
    }

    setReviewMediaViewer({
      reviewTitle: review?.customerName || "Đánh giá",
      media,
      currentIndex: Math.min(Math.max(index, 0), media.length - 1),
    });
  };

  const closeReviewMediaViewer = () => {
    setReviewMediaViewer(null);
  };

  const handlePrevReviewMedia = (event) => {
    event.stopPropagation();
    setReviewMediaViewer((prev) => {
      if (!prev || prev.media.length === 0) return prev;

      return {
        ...prev,
        currentIndex:
          prev.currentIndex === 0
            ? prev.media.length - 1
            : prev.currentIndex - 1,
      };
    });
  };

  const handleNextReviewMedia = (event) => {
    event.stopPropagation();
    setReviewMediaViewer((prev) => {
      if (!prev || prev.media.length === 0) return prev;

      return {
        ...prev,
        currentIndex:
          prev.currentIndex === prev.media.length - 1
            ? 0
            : prev.currentIndex + 1,
      };
    });
  };

  const selectReviewMediaIndex = (index) => {
    setReviewMediaViewer((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        currentIndex: index,
      };
    });
  };

  const hasVisibleReplyableReview = useMemo(() => {
    if (!reviewReplyEligibility.canReply) return false;

    return filteredReviews.some((review) => {
      const isOwner = Number(review.customerId || 0) === currentUserId;
      const hasShopReply =
        Array.isArray(review.replies) &&
        review.replies.some((reply) => reply.isShopReply);
      return isOwner && hasShopReply;
    });
  }, [currentUserId, filteredReviews, reviewReplyEligibility.canReply]);

  useEffect(() => {
    return () => {
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!reviewMediaViewer) return undefined;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeReviewMediaViewer();
      }
      if (event.key === "ArrowLeft") {
        handlePrevReviewMedia(event);
      }
      if (event.key === "ArrowRight") {
        handleNextReviewMedia(event);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [reviewMediaViewer]);

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1,
    );
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1,
    );
  };

  useEffect(() => {
    if (productId) {
      sessionStorage.setItem("lastProductPageId", String(productId));
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
          name: info.TenSP || "Sản phẩm",
          price: Number(info.GiaBan || 0),
          oldPrice:
            info.GiaGoc !== undefined && info.GiaGoc !== null
              ? Number(info.GiaGoc)
              : null,
          rating: Number(info.SoSaoTB || 0),
          reviewCount: Number(info.LuotDanhGia || 0),
          stock: Number(info.SoLuongTon || 0),
          description: info.MoTa || "Sản phẩm chưa có mô tả.",
          ingredients: info.ThanhPhan || "Đang cập nhật.",
          usage: info.CachSuDung || "Đang cập nhật.",
          brand: "HAMONI",
          origin: "Việt Nam",
          variants: detailRes?.variants || [],
          images: detailImages,
        });

        try {
          const reviewsRes = await productApi.getProductReviews(productId, {
            limit: 50,
          });
          const mappedReviews = (reviewsRes || []).map((item) => ({
            id: item.MaDG,
            customerId: Number(item.MaND || 0),
            customerName: item.HoTen || "Khách hàng",
            rating: Number(item.SoSao || 0),
            comment: item.BinhLuan || "",
            date: formatDate(item.NgayDanhGia),
            sortDate: item.NgayDanhGia
              ? new Date(item.NgayDanhGia).getTime()
              : 0,
            media: extractReviewMedia(item),
            replies: Array.isArray(item.replies)
              ? item.replies.map((reply) => ({
                  id: reply.MaPH,
                  authorId: Number(reply.MaND || 0),
                  authorRole: reply.MaQuyen || "CUST",
                  customerName: reply.HoTen || "Người dùng",
                  isShopReply: reply.MaQuyen !== "CUST",
                  comment: reply.NoiDung || "",
                  date: formatDate(reply.NgayTao),
                }))
              : [],
            avatar: `https://ui-avatars.com/api/?background=e5e7eb&color=111827&name=${encodeURIComponent(item.HoTen || "KH")}`,
          }));
          setReviews(mappedReviews);
        } catch (reviewsError) {
          console.warn("Không tải được đánh giá:", reviewsError);
          setReviews([]);
        }

        if (currentUserId > 0) {
          try {
            const eligibility =
              await productApi.getReviewReplyEligibility(productId);
            setReviewReplyEligibility({
              canReply: Boolean(eligibility?.canReply),
              hasReviewed: Boolean(eligibility?.hasReviewed),
              hasCompletedPurchase: Boolean(eligibility?.hasCompletedPurchase),
            });
          } catch (eligibilityError) {
            console.warn(
              "Không tải được quyền phản hồi đánh giá:",
              eligibilityError,
            );
            setReviewReplyEligibility({
              canReply: false,
              hasReviewed: false,
              hasCompletedPurchase: false,
            });
          }
        } else {
          setReviewReplyEligibility({
            canReply: false,
            hasReviewed: false,
            hasCompletedPurchase: false,
          });
        }

        try {
          const suggestedRes = await productApi.getSuggestedProducts(
            productId,
            { limit: 4 },
          );
          const mappedSuggested = (suggestedRes || []).map((item) => ({
            id: item.MaSP,
            name: item.TenSP || "Sản phẩm",
            price: Number(item.GiaBan || 0),
            oldPrice:
              item.GiaGoc !== undefined && item.GiaGoc !== null
                ? Number(item.GiaGoc)
                : null,
            rating: Number(item.SoSaoTB || 0),
            reviews: Number(item.LuotDanhGia || 0),
            stock: Number(item.SoLuongTon || 0),
            brand: item.ThuongHieu || item.TenTH || "HAMONI",
            category: item.TenDM || item.DanhMuc || "Gợi ý",
            image: item.AnhChinh || PRODUCT_FALLBACK_IMAGE,
          }));
          setSuggestedProducts(mappedSuggested);
        } catch (suggestedError) {
          console.warn("Không tải được sản phẩm gợi ý:", suggestedError);
          setSuggestedProducts([]);
        }

        setQuantity(1);
        setQuantityInput("1");
        setQuantityWarning("");
        setSelectedImageIndex(0);
        const firstAvailableVariant = (detailRes?.variants || []).find(
          (variant) => Number(variant.SoLuongTon || 0) > 0,
        );
        setSelectedVariantId(
          firstAvailableVariant?.MaBienThe ||
            detailRes?.variants?.[0]?.MaBienThe ||
            null,
        );
      } catch (error) {
        console.error("Lỗi tải chi tiết sản phẩm:", error);
        toast.error("Không thể tải chi tiết sản phẩm từ MySQL.");
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [productId, currentUserId]);

  // Scroll the active thumbnail into view when selectedImageIndex changes
  useEffect(() => {
    try {
      const container = thumbnailContainerRef.current;
      if (!container) return;
      const active =
        container.querySelectorAll(".thumbnail")[selectedImageIndex];
      if (active && typeof active.scrollIntoView === "function") {
        active.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    } catch {
      // ignore
    }
  }, [selectedImageIndex]);

  useEffect(() => {
    setIsDescriptionExpanded(false);
    setExpandedRepliesByReview({});
    setCurrentReviewPage(1);
  }, [productId]);

  useEffect(() => {
    setExpandedRepliesByReview({});
    setCurrentReviewPage(1);
  }, [selectedReviewStars, selectedReviewHasMedia]);

  const handleQuantityChange = (step) => {
    if (!product) return;
    const maxStock = Math.max(1, availableStock);
    setQuantity((prev) => {
      const nextQty = Math.max(1, Math.min(maxStock, Number(prev) + step));
      setQuantityInput(String(nextQty));
      setQuantityWarning("");
      return nextQty;
    });
  };

  const handleQuantityInputChange = (event) => {
    if (!product) return;

    const rawValue = event.target.value;
    const numericText = String(rawValue).replace(/\D/g, "");
    const maxStock = Math.max(1, availableStock);

    if (!numericText) {
      setQuantityInput("");
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
      isOverStock ? "Số lượng bạn chọn đã đạt mức tối đa của sản phẩm này" : "",
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
    setQuantityWarning(
      parsedValue > maxStock
        ? "Số lượng bạn chọn đã đạt mức tối đa của sản phẩm này"
        : "",
    );
  };

  const handleSelectVariant = (variant) => {
    if (!variant || variant.stock <= 0) return;

    setSelectedVariantId(variant.id);
    setSelectedImageIndex(variant.imageIndex);
    setQuantity((prev) => {
      const nextQty = Math.max(1, Math.min(prev, variant.stock));
      setQuantityInput(String(nextQty));
      setQuantityWarning("");
      return nextQty;
    });
  };

  const getMaKhachHang = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.id || user?.maND || user?.MaND || null;
  };

  const openCartAddedPopup = () => {
    setLastAddedItem({
      image: images[selectedImageIndex] || images[0] || PRODUCT_FALLBACK_IMAGE,
      name: product?.name || "Sản phẩm",
      variant: selectedVariant?.displayName || "",
      quantity,
      price: displayPrice,
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
      toast.error("Sản phẩm này đã hết hàng. Vui lòng chọn phân loại khác.");
      return false;
    }

    if (variantOptions.length > 0 && !selectedVariant) {
      toast.warning(
        `Vui lòng chọn ${variantLabel.toLowerCase()} trước khi thêm vào giỏ.`,
      );
      return false;
    }

    const currentVariantId = selectedVariant?.id;
    if (!currentVariantId) {
      toast.warning(
        "Sản phẩm này chưa có biến thể hợp lệ để thêm vào giỏ hàng.",
      );
      return false;
    }

    const maKhachHang = getMaKhachHang();
    if (!maKhachHang) {
      toast.warning("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
      navigate("/login");
      return false;
    }

    try {
      setIsAddingToCart(true);
      const response = await shoppingCartApi.addToCart({
        maKhachHang,
        maBienThe: currentVariantId,
        soLuong: nextQuantity,
      });

      console.log("✅ addToCart response:", response);

      // Đồng bộ giỏ hàng với store để cập nhật badge icon
      try {
        const cartResponse = await shoppingCartApi.getCartItems(maKhachHang);
        const cartItems = Array.isArray(cartResponse?.data)
          ? cartResponse.data
          : Array.isArray(cartResponse)
            ? cartResponse
            : [];

        // Cập nhật store với dữ liệu giỏ hàng từ backend
        syncCartFromBackend(cartItems);
      } catch (syncError) {
        console.error("⚠️ Lỗi khi đồng bộ giỏ hàng:", syncError);
        // Không dừng quy trình nếu đồng bộ thất bại
      }

      if (showPopup) {
        openCartAddedPopup();
      }

      toast.success(`Đã thêm ${nextQuantity} sản phẩm vào giỏ hàng`);
      return true;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Không thể thêm vào giỏ hàng. Vui lòng thử lại.";
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
      navigate("/cart");
    }
  };

  const handleReviewReplyInputChange = (reviewId, value) => {
    setReviewReplyInputByReview((prev) => ({
      ...prev,
      [reviewId]: value,
    }));
  };

  const handleSubmitReviewReply = async (reviewId) => {
    const content = String(reviewReplyInputByReview?.[reviewId] || "").trim();
    if (!content) {
      toast.warning("Vui lòng nhập nội dung phản hồi.");
      return;
    }

    try {
      setSubmittingReplyReviewId(reviewId);
      const response = await productApi.postReplyToReview(reviewId, content);
      const createdReply = response?.reply;

      if (!createdReply) {
        toast.success("Đã gửi phản hồi.");
        setReviewReplyInputByReview((prev) => ({ ...prev, [reviewId]: "" }));
        return;
      }

      setReviews((prevReviews) =>
        prevReviews.map((review) => {
          if (review.id !== reviewId) return review;

          const nextReply = {
            id: createdReply.MaPH,
            authorId: Number(createdReply.MaND || currentUserId || 0),
            authorRole: createdReply.MaQuyen || "CUST",
            customerName: createdReply.HoTen || "Bạn",
            isShopReply: createdReply.MaQuyen !== "CUST",
            comment: createdReply.NoiDung || content,
            date: formatDate(createdReply.NgayTao),
          };

          return {
            ...review,
            replies: [...(review.replies || []), nextReply],
          };
        }),
      );

      setReviewReplyInputByReview((prev) => ({ ...prev, [reviewId]: "" }));
      toast.success("Đã gửi phản hồi cho shop.");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Không thể gửi phản hồi, vui lòng thử lại.";
      toast.error(message);
    } finally {
      setSubmittingReplyReviewId(null);
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
        <div className="mb-0 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
          Không tìm thấy sản phẩm.
        </div>
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

              <div className="thumbnail-container" ref={thumbnailContainerRef}>
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    className={`thumbnail ${selectedImageIndex === index ? "active" : ""}`}
                    onMouseEnter={() => {
                      setSelectedImageIndex(index);
                    }}
                    onClick={() => {
                      setSelectedImageIndex(index);
                      setShowImageModal(true);
                    }}
                    style={{ cursor: "pointer" }}
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
                    {product.rating.toFixed(1)}/5 ({product.reviewCount} lượt
                    đánh giá)
                  </span>
                </div>

                <div>
                  <div className="price-section">
                    <span className="current-price">
                      {formatVnd(displayPrice)}đ
                    </span>
                    {displayOldPrice && displayOldPrice > displayPrice && (
                      <>
                        <span className="original-price">
                          {formatVnd(displayOldPrice)}đ
                        </span>
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
                      <p className="variant-selected-text">
                        Đã chọn: {selectedVariant.displayName}
                      </p>
                    )}
                  </div>

                  <div className="variant-grid">
                    {variantOptions.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        className={`variant-item ${selectedVariant?.id === variant.id ? "active" : ""} ${variant.stock <= 0 ? "disabled" : ""}`}
                        onClick={() => handleSelectVariant(variant)}
                        disabled={variant.stock <= 0}
                      >
                        <img
                          src={images[variant.imageIndex] || images[0]}
                          alt={variant.displayName}
                          className="variant-item-image"
                        />
                        <span className="variant-item-name">
                          {variant.displayName}
                        </span>
                        {variant.stock <= 0 && (
                          <span className="variant-item-stock">Hết hàng</span>
                        )}
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
                    : "Hết hàng"}
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
                <small className="text-slate-500">
                  Tối đa: {availableStock} sản phẩm
                </small>
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
                  {isAddingToCart ? "Đang thêm..." : "Thêm vào giỏ hàng"}
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
            </div>
          </div>
        </div>

        <div className="product-details">
          <div className="product-description">
            <div
              className={`product-description__body ${!isDescriptionExpanded && canToggleDescription ? "is-collapsed" : ""}`}
            >
              <div className="product-description__section">
                <p className="product-description__section-title">
                  MÔ TẢ SẢN PHẨM
                </p>
                <p className="product-description__lead">
                  {product.description}
                </p>
              </div>

              <div className="product-description__section">
                <p className="product-description__section-title">THÀNH PHẦN</p>
                <p className="product-description__lead">
                  {product.ingredients}
                </p>
              </div>

              <div className="product-description__section">
                <p className="product-description__section-title">
                  HƯỚNG DẪN SỬ DỤNG
                </p>
                <p className="product-description__lead">{product.usage}</p>
              </div>

              <div className="product-description__section">
                <p className="product-description__section-title">
                  THƯƠNG HIỆU
                </p>
                <p className="product-description__lead">{product.brand}</p>
              </div>

              <div className="product-description__section">
                <p className="product-description__section-title">XUẤT XỨ</p>
                <p className="product-description__lead">{product.origin}</p>
              </div>
            </div>

            {canToggleDescription && (
              <div className="section-toggle-wrap">
                <button
                  type="button"
                  className="section-toggle-btn"
                  onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                >
                  {isDescriptionExpanded ? (
                    <>
                      Thu gọn mô tả
                      <ChevronUp size={16} />
                    </>
                  ) : (
                    <>
                      Xem thêm mô tả
                      <ChevronDown size={16} />
                    </>
                  )}
                </button>
              </div>
            )}
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
                <p className="section-banner-subtitle">
                  Phản hồi thực tế từ những người đã trải nghiệm.
                </p>
              </div>
            </div>
          </div>

          <div className="reviews-panel" id="all-reviews">
            {reviews.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">
                Chưa có đánh giá nào.
              </div>
            ) : (
              <>
                <div className="reviews-summary-bar">
                  <div className="reviews-score-block">
                    <div className="reviews-score-row">
                      <span className="reviews-score">
                        {product.rating.toFixed(1)}
                      </span>
                      <span className="reviews-score-max">trên 5</span>
                    </div>
                    <span
                      className="reviews-score-stars"
                      aria-label="Điểm đánh giá trung bình"
                    >
                      {renderStars(product.rating, {
                        activeColor: "#facc15",
                        inactiveColor: "#fde68a",
                      })}
                    </span>
                  </div>
                  <div className="reviews-controls">
                    <div
                      className="reviews-filter-row"
                      role="tablist"
                      aria-label="Lọc theo số sao"
                    >
                      {reviewFilterItems.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className={`review-filter-chip ${selectedReviewStars === item.value && !(item.value === 0 && selectedReviewHasMedia) ? "active" : ""}`}
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
                        className={`review-media-chip ${selectedReviewHasMedia ? "active" : ""}`}
                        onClick={handleToggleReviewMedia}
                      >
                        Có Hình Ảnh/Video ({reviewMediaCount})
                      </button>
                    </div>
                  </div>
                </div>

                <div className="reviews-list">
                  {reviewReplyEligibility.canReply &&
                    !hasVisibleReplyableReview && (
                      <div className="customer-reply-hint">
                        Bạn chỉ có thể phản hồi trong đúng đánh giá của mình sau
                        khi shop đã trả lời. Hãy đổi bộ lọc hoặc kéo xuống để
                        tìm bài của bạn.
                      </div>
                    )}

                  {filteredReviews.length === 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">
                      Không có đánh giá nào ở mức sao này.
                    </div>
                  )}

                  {paginatedReviews.map((review) => (
                    <article key={review.id} className="review-card">
                      <div className="review-header">
                        <div className="reviewer-avatar" aria-hidden="true">
                          {getInitials(review.customerName)}
                        </div>
                        <div className="reviewer-info">
                          <p className="reviewer-name mb-1">
                            {review.customerName}
                          </p>
                          <div className="review-meta">
                            <span className="review-stars">
                              {renderStars(review.rating)}
                            </span>
                            <span className="review-date">{review.date}</span>
                          </div>
                          <p className="review-text mb-0">{review.comment}</p>
                          {review.media?.length > 0 && (
                            <div className="review-media-grid">
                              {review.media.map((mediaUrl, index) => {
                                const isVideo =
                                  /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(
                                    mediaUrl,
                                  );
                                return (
                                  <button
                                    key={`${review.id}-media-${index}`}
                                    type="button"
                                    className={`review-media-item ${isVideo ? "review-media-item--video" : ""}`}
                                    onClick={() =>
                                      openReviewMediaViewer(review, index)
                                    }
                                  >
                                    {isVideo ? (
                                      <>
                                        <video
                                          src={mediaUrl}
                                          muted
                                          playsInline
                                          preload="metadata"
                                        />
                                        <span
                                          className="review-media-play-indicator"
                                          aria-hidden="true"
                                        >
                                          ▶
                                        </span>
                                      </>
                                    ) : (
                                      <img
                                        src={mediaUrl}
                                        alt={`Đánh giá ${index + 1}`}
                                        loading="lazy"
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {review.replies?.length > 0 && (
                            <div className="review-replies">
                              {(expandedRepliesByReview[review.id]
                                ? review.replies
                                : review.replies.slice(0, 2)
                              ).map((reply) => {
                                const isCurrentUserReply =
                                  reply.authorId === currentUserId;
                                const replyLabel = reply.isShopReply
                                  ? "Phản hồi từ shop"
                                  : isCurrentUserReply
                                    ? "Phản hồi của bạn"
                                    : `Phản hồi từ ${reply.customerName}`;

                                return (
                                  <div key={reply.id} className="review-reply">
                                    <div className="review-reply-header">
                                      <span
                                        className={`review-reply-badge ${reply.isShopReply || isCurrentUserReply ? "" : "review-reply-badge--customer"}`}
                                      >
                                        {replyLabel}
                                      </span>
                                      <span className="review-reply-date">
                                        {reply.date}
                                      </span>
                                    </div>
                                    <p className="review-reply-text mb-0">
                                      {reply.comment}
                                    </p>
                                  </div>
                                );
                              })}

                              {review.replies.length > 2 && (
                                <button
                                  type="button"
                                  className="review-replies-toggle"
                                  onClick={() =>
                                    setExpandedRepliesByReview((prev) => ({
                                      ...prev,
                                      [review.id]: !prev[review.id],
                                    }))
                                  }
                                >
                                  {expandedRepliesByReview[review.id]
                                    ? "Thu gọn phản hồi"
                                    : `Xem thêm ${review.replies.length - 2} phản hồi`}
                                </button>
                              )}
                            </div>
                          )}

                          {reviewReplyEligibility.canReply &&
                            review.customerId === currentUserId &&
                            Array.isArray(review.replies) &&
                            review.replies.some(
                              (reply) => reply.isShopReply,
                            ) && (
                              <div className="customer-reply-compose">
                                <textarea
                                  className="customer-reply-input"
                                  rows={2}
                                  placeholder="Viết phản hồi tiếp theo cho shop..."
                                  value={
                                    reviewReplyInputByReview?.[review.id] || ""
                                  }
                                  onChange={(event) =>
                                    handleReviewReplyInputChange(
                                      review.id,
                                      event.target.value,
                                    )
                                  }
                                  disabled={
                                    submittingReplyReviewId === review.id
                                  }
                                />
                                <div className="customer-reply-actions">
                                  <button
                                    type="button"
                                    className="customer-reply-submit"
                                    onClick={() =>
                                      handleSubmitReviewReply(review.id)
                                    }
                                    disabled={
                                      submittingReplyReviewId === review.id ||
                                      !String(
                                        reviewReplyInputByReview?.[review.id] ||
                                          "",
                                      ).trim()
                                    }
                                  >
                                    {submittingReplyReviewId === review.id
                                      ? "Đang gửi..."
                                      : "Gửi phản hồi"}
                                  </button>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </article>
                  ))}

                  {filteredReviews.length > 0 && (
                    <div className="review-pagination">
                      <button
                        type="button"
                        className="review-page-nav"
                        disabled={safeCurrentReviewPage === 1}
                        onClick={() =>
                          setCurrentReviewPage((prev) => Math.max(1, prev - 1))
                        }
                      >
                        ‹
                      </button>

                      {reviewPaginationItems.map((item) => {
                        if (typeof item !== "number") {
                          return (
                            <span key={item} className="review-page-ellipsis">
                              ...
                            </span>
                          );
                        }

                        return (
                          <button
                            key={item}
                            type="button"
                            className={`review-page-btn ${safeCurrentReviewPage === item ? "active" : ""}`}
                            onClick={() => setCurrentReviewPage(item)}
                          >
                            {item}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        className="review-page-nav"
                        disabled={safeCurrentReviewPage === totalReviewPages}
                        onClick={() =>
                          setCurrentReviewPage((prev) =>
                            Math.min(totalReviewPages, prev + 1),
                          )
                        }
                      >
                        ›
                      </button>
                    </div>
                  )}
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
                <p className="section-banner-subtitle">
                  Những sản phẩm được chọn lọc dành riêng cho bạn.
                </p>
              </div>
            </div>
          </div>

          {suggestedProducts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">
              Không có sản phẩm gợi ý.
            </div>
          ) : (
            <div
              className="products-grid products-grid--featured"
              id="suggested-products"
            >
              {suggestedProducts.map((item) => (
                <SuggestedProductCard
                  key={item.id}
                  product={item}
                  onClick={() => navigate(`/product/${item.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {reviewMediaViewer && (
        <div
          className="image-modal-overlay review-media-modal-overlay"
          onClick={closeReviewMediaViewer}
        >
          <div
            className="image-modal-content review-media-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="image-modal-close"
              onClick={closeReviewMediaViewer}
            >
              <X size={24} />
            </button>
            <div className="image-modal-layout review-media-modal-layout">
              <div
                className={`image-modal-main ${/\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(reviewMediaViewer.media[reviewMediaViewer.currentIndex] || "") ? "image-modal-main--video" : ""}`}
              >
                {reviewMediaViewer.media.length > 1 && (
                  <button
                    className="image-modal-nav prev"
                    onClick={handlePrevReviewMedia}
                  >
                    <ChevronLeft size={36} />
                  </button>
                )}

                {/\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(
                  reviewMediaViewer.media[reviewMediaViewer.currentIndex] || "",
                ) ? (
                  <video
                    src={
                      reviewMediaViewer.media[reviewMediaViewer.currentIndex]
                    }
                    controls
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    src={
                      reviewMediaViewer.media[reviewMediaViewer.currentIndex]
                    }
                    alt={reviewMediaViewer.reviewTitle}
                  />
                )}

                {reviewMediaViewer.media.length > 1 && (
                  <button
                    className="image-modal-nav next"
                    onClick={handleNextReviewMedia}
                  >
                    <ChevronRight size={36} />
                  </button>
                )}
              </div>

              <div className="image-modal-thumbnails review-media-modal-thumbnails">
                <div className="image-modal-title">
                  {reviewMediaViewer.reviewTitle}
                </div>
                <div className="image-modal-thumb-grid">
                  {reviewMediaViewer.media.map((mediaUrl, index) => {
                    const isVideo = /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(
                      mediaUrl,
                    );

                    return (
                      <button
                        key={`${mediaUrl}-${index}`}
                        type="button"
                        className={`image-modal-thumb ${reviewMediaViewer.currentIndex === index ? "active" : ""}`}
                        onClick={() => selectReviewMediaIndex(index)}
                      >
                        {isVideo ? (
                          <video
                            src={mediaUrl}
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img src={mediaUrl} alt={`Đánh giá ${index + 1}`} />
                        )}
                        {isVideo && (
                          <span
                            className="review-media-play-indicator review-media-play-indicator--thumb"
                            aria-hidden="true"
                          >
                            ▶
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCartAddedPopup && (
        <div
          className="cart-added-overlay"
          onClick={() => setShowCartAddedPopup(false)}
        >
          <div
            className="cart-added-popup"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cart-added-icon-wrap">
              <CheckCircle2 size={42} />
            </div>
            <p className="cart-added-title">
              Sản phẩm đã được thêm vào Giỏ hàng
            </p>

            {lastAddedItem && (
              <div className="cart-added-item">
                <img src={lastAddedItem.image} alt={lastAddedItem.name} />
                <div className="cart-added-item-info">
                  <p className="cart-added-item-name">{lastAddedItem.name}</p>
                  <p className="cart-added-item-meta">
                    {lastAddedItem.variant ? `${lastAddedItem.variant} • ` : ""}
                    SL: {lastAddedItem.quantity} •{" "}
                    {formatVnd(lastAddedItem.price)}đ
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
                  navigate("/cart");
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
        <div
          className="image-modal-overlay"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="image-modal-close"
              onClick={() => setShowImageModal(false)}
            >
              <X size={24} />
            </button>
            <div className="image-modal-layout">
              {/* Cột trái: Ảnh lớn */}
              <div className="image-modal-main">
                <button
                  className="image-modal-nav prev"
                  onClick={handlePrevImage}
                >
                  <ChevronLeft size={36} />
                </button>
                <img src={images[selectedImageIndex]} alt={product.name} />
                <button
                  className="image-modal-nav next"
                  onClick={handleNextImage}
                >
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
                      className={`image-modal-thumb ${selectedImageIndex === index ? "active" : ""}`}
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

const SuggestedProductCard = ({ product, onClick }) => {
  const displayPrice = Number(product.price) || 0;
  const displayOldPrice = Number(product.oldPrice) || null;
  const hasAnyVariantInStock = Number(product.stock ?? 0) > 0;
  const discountPercent =
    displayOldPrice && displayOldPrice > displayPrice
      ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100)
      : 0;

  return (
    <article
      className="group bg-white rounded-2xl p-3 border border-rose-100/50 hover:border-rose-200 hover:shadow-[0_12px_30px_rgba(191,124,124,0.12)] transition-all duration-300 flex flex-col h-full relative overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
        {discountPercent > 0 && (
          <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-lg shadow-rose-500/30">
            -{discountPercent}%
          </span>
        )}
      </div>

      <div className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3 bg-slate-50 flex items-center justify-center cursor-pointer">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
      </div>

      <div className="mt-auto flex flex-col flex-1 px-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider font-bold text-rose-500 truncate pr-2">
            {product.category || ""}
          </span>
        </div>

        <p className="font-bold text-slate-800 text-[15px] leading-relaxed line-clamp-2 mb-2 group-hover:text-rose-600 transition-colors cursor-pointer">
          {product.name}
        </p>

        <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
          <Star size={10} className="fill-amber-400 text-amber-400" />
          <span className="font-bold text-slate-700">
            {Number(product.rating || 0).toFixed(1)}
          </span>
          <span>({Number(product.reviews || 0)})</span>
        </div>

        <div className="mt-auto pt-2.5 border-t border-slate-100">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-base font-black text-rose-600 leading-none">
                {formatVnd(displayPrice)}đ
              </span>
              {displayOldPrice > displayPrice && (
                <span className="text-[10px] font-medium text-slate-400 line-through mt-1.5 leading-none">
                  {formatVnd(displayOldPrice)}đ
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
    </article>
  );
};

function renderStars(rating = 0, options = {}) {
  const { activeColor = "#facc15", inactiveColor = "#fde68a" } = options;
  const fullStars = Math.floor(rating);
  const fraction = Math.max(0, Math.min(1, rating - fullStars));

  return Array.from({ length: 5 }, (_, index) => {
    // fully filled star
    if (index < fullStars) {
      return (
        <span
          key={index}
          style={{ display: "inline-flex", alignItems: "center" }}
        >
          <Star
            size={20}
            fill={activeColor}
            color={activeColor}
            strokeWidth={2}
          />
        </span>
      );
    }

    // partially filled star for fractional part
    if (index === fullStars && fraction > 0) {
      const percent = Math.round(fraction * 100);
      return (
        <span
          key={index}
          style={{
            display: "inline-flex",
            alignItems: "center",
            position: "relative",
            width: 20,
            height: 20,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0 }}>
            <Star size={20} fill="none" color={inactiveColor} strokeWidth={2} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${percent}%`,
              overflow: "hidden",
            }}
          >
            <Star
              size={20}
              fill={activeColor}
              color={activeColor}
              strokeWidth={2}
            />
          </div>
        </span>
      );
    }

    // empty star
    return (
      <span
        key={index}
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        <Star size={20} fill="none" color={inactiveColor} strokeWidth={2} />
      </span>
    );
  });
}

function formatDate(dateValue) {
  if (!dateValue) return "Vừa xong";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Vừa xong";
  return date.toLocaleDateString("vi-VN");
}

function formatVnd(value = 0) {
  return Number(value).toLocaleString("vi-VN");
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
    review.DuongDanAnh,
  ];

  return candidates.flatMap((item) => normalizeReviewMediaItems(item));
}

function normalizeReviewMediaItems(item) {
  if (!item) return [];

  if (Array.isArray(item)) {
    return item.flatMap((entry) => normalizeReviewMediaItems(entry));
  }

  if (typeof item === "string") {
    const trimmed = item.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.flatMap((entry) => normalizeReviewMediaItems(entry));
      }
      if (parsed && typeof parsed === "object") {
        return normalizeReviewMediaItems(parsed);
      }
    } catch {
      // Chuỗi là một URL đơn lẻ, giữ nguyên.
    }

    return [trimmed];
  }

  if (typeof item === "object") {
    const mediaUrl =
      item.url || item.src || item.DuongDanAnh || item.path || item.fileUrl;
    return mediaUrl ? [String(mediaUrl)] : [];
  }

  return [String(item)].filter(Boolean);
}

function hasReviewMedia(review = {}) {
  return extractReviewMedia(review).length > 0;
}

function getInitials(name = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "KH";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[words.length - 1][0] || ""}`.toUpperCase();
}

function getVariantDisplayName(
  name = "",
  variantType = "color",
  fallbackIndex = 1,
) {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) {
    return variantType === "weight"
      ? `Khối lượng ${fallbackIndex}`
      : `Màu ${String(fallbackIndex).padStart(2, "0")}`;
  }

  if (variantType === "weight") {
    const weightToken = normalizedName.match(
      /\b\d+(?:[.,]\d+)?\s*(?:ml|g|gr|gram|kg|l|lit|oz|lb)\b/i,
    );
    if (weightToken?.[0]) {
      return weightToken[0].replace(/\s+/g, "").toUpperCase();
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
  if (!Array.isArray(variants) || variants.length === 0) return "color";

  const names = variants
    .map((variant) => String(variant?.TenBienThe || "").trim())
    .filter(Boolean);
  if (names.length === 0) return "color";

  const weightPattern =
    /\b\d+(?:[.,]\d+)?\s*(?:ml|g|gr|gram|kg|l|lit|oz|lb)\b/i;
  const colorKeywordPattern =
    /\b(mau|màu|shade|color|đen|trang|trắng|do|đỏ|hong|hồng|cam|nau|nâu|xanh|tim|tím|be|nude|brown|red|pink|orange|coral|peach|rose)\b/i;
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

  if (weightHits > 0 && weightHits >= colorHits) return "weight";
  return "color";
}

function getLoggedInUserId() {
  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) return 0;
    const user = JSON.parse(userRaw);
    const id = Number(user?.id || user?.maND || user?.MaND || 0);
    return Number.isInteger(id) && id > 0 ? id : 0;
  } catch {
    return 0;
  }
}

export default ProductDetailView;
