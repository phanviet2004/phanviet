import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Tag, Percent, DollarSign, AlertCircle, ChevronRight } from 'lucide-react';
import promotionApi from '../../../services/promotionApi';
import './PromotionClient.css';

const PromotionClient = () => {
    const navigate = useNavigate();
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPromotions = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await promotionApi.getAll();
                // Lọc những KM còn hạn
                const validPromotions = data.filter(promo => {
                    const now = new Date();
                    const startDate = new Date(promo.NgayBatDau);
                    const endDate = new Date(promo.NgayKetThuc);
                    return now >= startDate && now <= endDate;
                });
                setPromotions(validPromotions);
            } catch (err) {
                console.error('Lỗi lấy danh sách khuyến mãi:', err);
                setError('Không thể tải danh sách khuyến mãi');
            } finally {
                setLoading(false);
            }
        };
        fetchPromotions();
    }, []);

    // SỬA LẠI ĐƯỜNG LINK CHUẨN: /khuyen-mai/id
    const handleViewPromotion = (promotionId) => {
        navigate(`/khuyen-mai/${promotionId}`); 
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const getDiscountDisplay = (promotion) => {
        if (promotion.LoaiGiamGia === 'PhanTram') return `Giảm ${promotion.GiaTriGiam}%`;
        return `Giảm ${promotion.GiaTriGiam.toLocaleString('vi-VN')}đ`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-3">🎉 Chương Trình Khuyến Mãi</h1>
                    <p className="text-slate-600 text-lg">Khám phá các chương trình khuyến mãi đặc biệt dành cho bạn</p>
                </div>

                {loading && (
                    <div className="flex justify-center items-center py-16">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-rose-500"></div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {!loading && promotions.length === 0 ? (
                    <div className="text-center py-16">
                        <Tag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 text-lg">Không có chương trình khuyến mãi đang diễn ra</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {promotions.map((promotion) => (
                            <div
                                key={promotion.MaCTKM}
                                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:scale-105"
                                onClick={() => handleViewPromotion(promotion.MaCTKM)}
                            >
                                {promotion.Banner && (
                                    <div className="relative h-40 bg-gradient-to-br from-rose-400 to-pink-500 overflow-hidden">
                                        <img
                                            src={promotion.Banner}
                                            alt={promotion.TenCTKM}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                        />
                                        <div className="absolute top-3 right-3 bg-rose-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                                            {getDiscountDisplay(promotion)}
                                        </div>
                                    </div>
                                )}
                                <div className="p-5">
                                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-rose-600 transition-colors">
                                        {promotion.TenCTKM}
                                    </h3>
                                    <div className="flex items-center gap-2 mb-4 bg-rose-50 p-3 rounded-lg">
                                        {promotion.LoaiGiamGia === 'PhanTram' ? (
                                            <><Percent className="w-5 h-5 text-rose-600" /><span className="font-bold text-rose-600">Giảm {promotion.GiaTriGiam}%</span></>
                                        ) : (
                                            <><DollarSign className="w-5 h-5 text-rose-600" /><span className="font-bold text-rose-600">Giảm {promotion.GiaTriGiam.toLocaleString('vi-VN')}đ</span></>
                                        )}
                                    </div>
                                    <div className="space-y-2 mb-4 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 flex-shrink-0" />
                                            <span>Từ {formatDate(promotion.NgayBatDau)} {formatTime(promotion.NgayBatDau)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 flex-shrink-0" />
                                            <span>Đến {formatDate(promotion.NgayKetThuc)} {formatTime(promotion.NgayKetThuc)}</span>
                                        </div>
                                    </div>
                                    <button className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition-all flex items-center justify-center gap-2 group">
                                        Xem chi tiết
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromotionClient;