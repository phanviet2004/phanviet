const db = require('../config/db'); // Đường dẫn tới file cấu hình DB

const getClientProductSlides = async () => {
    const [banners] = await db.query(`
        SELECT MaBanner, TieuDe, DuongDanAnh as image
        FROM BannerToanCuc 
        WHERE TrangThai IN ('Active', 'KichHoat')
          AND ViTriHienThi IN ('TrangChu', 'HeroBanner')
          AND DuongDanAnh IS NOT NULL
          AND DuongDanAnh <> ''
        ORDER BY ThuTuHienThi ASC, MaBanner ASC
    `);

    return banners.map((banner) => ({
        id: banner.MaBanner,
        image: banner.image,
        title: banner.TieuDe,
        cta: 'Xem chi tiết'
    }));
};

const getFormattedClientProducts = async () => {
    const [products] = await db.query(`
        SELECT 
            sp.MaSP as id, 
            sp.TenSP as name,
            NULL as brand,
            sp.NgayTao as createdAt,
            sp.MaDM as categoryId,
            COALESCE(dm.TenDM, 'Chưa phân loại') as category,
            COALESCE(
                (
                    SELECT h1.DuongDanAnh
                    FROM HinhAnh h1
                    WHERE h1.MaThamChieu = sp.MaSP
                      AND h1.LoaiThamChieu = 'SanPham'
                      AND h1.LaAnhChinh = 1
                    ORDER BY h1.ThuTuHienThi ASC, h1.MaHinhAnh ASC
                    LIMIT 1
                ),
                (
                    SELECT h2.DuongDanAnh
                    FROM HinhAnh h2
                    WHERE h2.MaThamChieu = sp.MaSP
                      AND h2.LoaiThamChieu = 'SanPham'
                    ORDER BY h2.ThuTuHienThi ASC, h2.MaHinhAnh ASC
                    LIMIT 1
                )
            ) as image,
            IFNULL((SELECT ROUND(AVG(SoSao), 1) FROM DanhGia WHERE MaSP = sp.MaSP), 5.0) as rating,
            (SELECT COUNT(*) FROM DanhGia WHERE MaSP = sp.MaSP) as reviews,
            IFNULL((
                SELECT SUM(ct.SoLuong)
                FROM ChiTietDonHang ct
                JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
                WHERE bt.MaSP = sp.MaSP
            ), 0) as soldCount,
            IF(
                IFNULL((
                    SELECT SUM(SoLuongTon)
                    FROM TonKho tk 
                    JOIN BienTheSanPham bt ON tk.MaBienThe = bt.MaBienThe
                    WHERE bt.MaSP = sp.MaSP
                ), 0) > 0, 1, 0
            ) as inStock
        FROM SanPham sp
        LEFT JOIN DANHMUC dm ON sp.MaDM = dm.MaDM
        ORDER BY sp.NgayTao DESC
    `);

    if (products.length === 0) {
        return [];
    }

    const productIds = products.map((product) => product.id);
    let variantsByProduct = new Map();

    if (productIds.length > 0) {
        const placeholders = productIds.map(() => '?').join(',');
        const [variantRows] = await db.query(
            `
            SELECT 
                bt.MaSP as productId,
                bt.MaBienThe as id,
                bt.TenBienThe as name,
                COALESCE(tk.SoLuongTon, 0) as stock,
                CASE
                    WHEN km.MaCTKM IS NOT NULL
                         AND NOW() BETWEEN km.NgayBatDau AND km.NgayKetThuc
                    THEN CASE
                        WHEN km.LoaiGiamGia = 'PhanTram' THEN GREATEST(0, bt.Gia - (bt.Gia * km.GiaTriGiam / 100))
                        WHEN km.LoaiGiamGia = 'SoTien' THEN GREATEST(0, bt.Gia - km.GiaTriGiam)
                        ELSE bt.Gia
                    END
                    ELSE bt.Gia
                END as effectivePrice,
                CASE
                    WHEN km.MaCTKM IS NOT NULL
                         AND NOW() BETWEEN km.NgayBatDau AND km.NgayKetThuc
                    THEN bt.Gia 
                    ELSE NULL 
                END as originalPrice
            FROM BienTheSanPham bt
            LEFT JOIN (
                SELECT MaBienThe, SUM(SoLuongTon) as SoLuongTon
                FROM TonKho
                GROUP BY MaBienThe
            ) tk ON tk.MaBienThe = bt.MaBienThe
            LEFT JOIN SanPham_KhuyenMai spkm ON spkm.MaBienThe = bt.MaBienThe
            LEFT JOIN ChuongTrinhKhuyenMai km ON km.MaCTKM = spkm.MaCTKM
            WHERE bt.MaSP IN (${placeholders})
            ORDER BY bt.MaSP ASC, bt.MaBienThe ASC
            `,
            productIds
        );

        variantsByProduct = variantRows.reduce((accumulator, variant) => {
            const productId = String(variant.productId);
            if (!accumulator.has(productId)) {
                accumulator.set(productId, []);
            }

            accumulator.get(productId).push({
                id: variant.id,
                name: variant.name,
                price: Number(variant.effectivePrice) || 0,
                oldPrice: variant.originalPrice !== null ? Number(variant.originalPrice) : null,
                inStock: Number(variant.stock) > 0
            });

            return accumulator;
        }, new Map());
    }

    return products.map(p => {
        const productVariants = variantsByProduct.get(String(p.id)) || [];

        let displayPrice = 0;
        let displayOldPrice = null;

        if (productVariants.length > 0) {
            const sortedVariants = [...productVariants].sort((a, b) => a.price - b.price);
            displayPrice = sortedVariants[0].price;
            displayOldPrice = sortedVariants[0].oldPrice;
        }

        return {
            id: p.id,
            name: p.name,
            brand: p.brand || 'Hamoni',
            createdAt: p.createdAt,
            categoryId: p.categoryId,
            category: p.category,
            image: p.image || '/images/default-product.jpg',
            price: displayPrice,
            oldPrice: displayOldPrice,
            rating: parseFloat(p.rating) || 5.0,
            reviews: Number(p.reviews) || 0,
            soldCount: Number(p.soldCount) || 0,
            inStock: p.inStock === 1,
            variants: productVariants
        };
    });
};

const getClientProducts = async (req, res) => {
    try {
        const formattedData = await getFormattedClientProducts();
        res.status(200).json(formattedData);

    } catch (error) {
        console.error("Lỗi Controller (getClientProducts):", error);
        res.status(500).json({ message: "Lỗi server nội bộ khi tải danh sách sản phẩm." });
    }
};

const getClientProductsPageData = async (req, res) => {
    try {
        const slides = await getClientProductSlides();
        const products = await getFormattedClientProducts();

        res.status(200).json({ slides, products });
    } catch (error) {
        console.error("Lỗi Controller (getClientProductsPageData):", error);
        res.status(500).json({
            message: "Lỗi server nội bộ khi tải dữ liệu trang sản phẩm.",
            detail: error.message
        });
    }
};

module.exports = {
    getClientProducts,
    getClientProductsPageData
};