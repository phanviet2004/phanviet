const db = require('../config/db');
const ExcelJS = require('exceljs');

const TONKHO_STOCK_COLUMNS = ['SoLuongTon', 'TonKho', 'SoLuong', 'SLTon'];
const PRODUCT_STOCK_COLUMNS = ['SoLuongTon', 'TonKho', 'SoLuong', 'SLTon'];
const VARIANT_STOCK_COLUMNS = ['SoLuongTon', 'TonKho', 'SoLuong', 'SLTon'];

// Biến toàn cục để lưu Cache cấu hình kho (Tránh query DB nhiều lần)
let cachedStockConfig = null;

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const toStatusCode = (stock) => {
    if (stock <= 0) return 'hethang';
    if (stock < 100) return 'saphet';
    return 'conhang';
};

const toStatusLabel = (statusCode) => {
    if (statusCode === 'hethang') return 'Hết hàng';
    if (statusCode === 'saphet') return 'Sắp hết';
    return 'Còn hàng';
};

const toStatusColor = (statusCode) => {
    if (statusCode === 'hethang') return 'red';
    if (statusCode === 'saphet') return 'orange';
    return 'green';
};

const normalizeStatusQuery = (status) => {
    if (!status || status === 'all') return 'all';
    const normalized = String(status).toLowerCase();
    if (['conhang', 'saphet', 'hethang'].includes(normalized)) {
        return normalized;
    }
    return 'all';
};

const getTableColumns = async (tableName) => {
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
    return rows.map((row) => row.Field);
};

const resolveStockConfig = async () => {
    // 🔥 TỐI ƯU HIỆU NĂNG: Nếu đã cache thì trả về luôn, không query DB nữa
    if (cachedStockConfig) return cachedStockConfig;

    try {
        const tonKhoColumns = await getTableColumns('TonKho');
        const tonKhoStockColumn = TONKHO_STOCK_COLUMNS.find((col) => tonKhoColumns.includes(col));

        if (tonKhoStockColumn) {
            cachedStockConfig = {
                stockMode: 'inventory',
                stockExpression: `COALESCE(SUM(tk.\`${tonKhoStockColumn}\`), 0)`
            };
            return cachedStockConfig;
        }
    } catch (error) {
        console.error('Không thể kiểm tra cột bảng TonKho:', error.message);
    }

    try {
        const productColumns = await getTableColumns('SanPham');
        const productStockColumn = PRODUCT_STOCK_COLUMNS.find((col) => productColumns.includes(col));

        if (productStockColumn) {
            cachedStockConfig = {
                stockMode: 'product',
                stockExpression: `COALESCE(sp.\`${productStockColumn}\`, 0)`
            };
            return cachedStockConfig;
        }
    } catch (error) {
        console.error('Không thể kiểm tra cột bảng SanPham:', error.message);
    }

    try {
        const variantColumns = await getTableColumns('BienTheSanPham');
        const variantStockColumn = VARIANT_STOCK_COLUMNS.find((col) => variantColumns.includes(col));

        if (variantStockColumn) {
            cachedStockConfig = {
                stockMode: 'variant',
                stockExpression: `COALESCE(SUM(bt.\`${variantStockColumn}\`), 0)`
            };
            return cachedStockConfig;
        }
    } catch (error) {
        console.error('Không thể kiểm tra cột bảng BienTheSanPham:', error.message);
    }

    cachedStockConfig = { stockMode: 'none', stockExpression: '0' };
    return cachedStockConfig;
};

const buildInventorySql = (stockConfig, hasCategoryFilter) => {
    const soldSubquery = `
        SELECT bt.MaSP, SUM(ct.SoLuong) AS totalSold
        FROM ChiTietDonHang ct
        JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
        GROUP BY bt.MaSP
    `;

    const selectFields = `
        sp.MaSP,
        sp.TenSP AS name,
        COALESCE(dm.TenDM, 'Chưa phân loại') AS category,
        ${stockConfig.stockExpression} AS stock,
        COALESCE(sold.totalSold, 0) AS sold
    `;

    const joins = [
        `LEFT JOIN DANHMUC dm ON sp.MaDM = dm.MaDM`, 
        `LEFT JOIN (${soldSubquery}) sold ON sold.MaSP = sp.MaSP`
    ];

    if (stockConfig.stockMode === 'inventory') {
        joins.push('LEFT JOIN BienTheSanPham bt ON bt.MaSP = sp.MaSP');
        joins.push('LEFT JOIN TonKho tk ON tk.MaBienThe = bt.MaBienThe');
    }

    if (stockConfig.stockMode === 'variant') {
        joins.push('LEFT JOIN BienTheSanPham bt ON bt.MaSP = sp.MaSP');
    }

    const where = ['WHERE 1=1'];
    if (hasCategoryFilter) {
        where.push('AND (dm.TenDM = ? OR sp.MaDM = ?)');
    }

    let groupBy = '';
    if (stockConfig.stockMode === 'variant' || stockConfig.stockMode === 'inventory') {
        groupBy = 'GROUP BY sp.MaSP, sp.TenSP, dm.TenDM, sold.totalSold';
    }

    return `
        SELECT ${selectFields}
        FROM SanPham sp
        ${joins.join('\n')}
        ${where.join('\n')}
        ${groupBy}
        ORDER BY sp.MaSP DESC
    `;
};

const loadInventoryProducts = async (query = {}, debug = false) => {
    const category = query.category || 'all';
    const statusFilter = normalizeStatusQuery(query.status);

    const stockConfig = await resolveStockConfig();
    const hasCategoryFilter = category !== 'all';
    const sql = buildInventorySql(stockConfig, hasCategoryFilter);
    const params = hasCategoryFilter ? [category, category] : [];

    const [rows] = await db.query(sql, params);

    if (debug) {
        console.log('[InventoryReport][DEBUG] stockConfig:', stockConfig);
        console.log('[InventoryReport][DEBUG] category:', category, 'statusFilter:', statusFilter);
        console.log('[InventoryReport][DEBUG] sql:', sql.replace(/\s+/g, ' ').trim());
        console.log('[InventoryReport][DEBUG] params:', params);
        console.log('[InventoryReport][DEBUG] rowCount:', rows.length);
        if (rows.length > 0) {
            console.log('[InventoryReport][DEBUG] firstRow:', rows[0]);
        }
    }

    const mapped = rows.map((row) => {
        const stock = Number(row.stock || 0);
        const sold = Number(row.sold || 0);
        const statusCode = toStatusCode(stock);

        return {
            id: row.MaSP,
            name: row.name,
            category: row.category,
            stock,
            sold,
            status: toStatusLabel(statusCode),
            statusCode,
            color: toStatusColor(statusCode)
        };
    });

    if (statusFilter === 'all') {
        if (debug) console.log('[InventoryReport][DEBUG] mappedCount(all):', mapped.length);
        return mapped;
    }

    const filtered = mapped.filter((item) => item.statusCode === statusFilter);
    if (debug) {
        console.log('[InventoryReport][DEBUG] mappedCount(beforeStatusFilter):', mapped.length);
        console.log('[InventoryReport][DEBUG] mappedCount(afterStatusFilter):', filtered.length);
    }
    return filtered;
};

const buildSummary = (products) => {
    const totalProducts = products.length;
    const totalInventory = products.reduce((sum, item) => sum + item.stock, 0);
    const lowStock = products.filter((item) => item.stock > 0 && item.stock < 100).length;
    const topProduct = [...products].sort((a, b) => b.sold - a.sold)[0];

    return {
        totalProducts,
        totalInventory,
        lowStock,
        topSelling: topProduct ? topProduct.name : 'N/A'
    };
};

const buildChart = (products) => {
    if (!Array.isArray(products) || products.length === 0) return [];

    // Lấy Top 10 sản phẩm BÁN CHẠY NHẤT
    const sanitized = products
        .filter((item) => item && (item.name || item.id))
        .map((item) => ({
            ...item,
            stock: Number.isFinite(Number(item.stock)) ? Number(item.stock) : 0,
            sold: Number.isFinite(Number(item.sold)) ? Number(item.sold) : 0
        }));

    if (sanitized.length === 0) return [];

    const topSelling = [...sanitized].sort((a, b) => b.sold - a.sold).slice(0, 10);

    // Tìm giá trị cực đại (của cả bán và tồn) để làm mốc 100% chiều cao cho biểu đồ
    const maxVal = Math.max(...topSelling.flatMap(item => [item.stock, item.sold]), 1);

    return topSelling.map((item) => {
        const safeName = String(item.name || 'N/A');
        return ({
        label: safeName.length > 12 ? `${safeName.slice(0, 12)}...` : safeName,
        stockVal: item.stock,
        soldVal: item.sold,
        // Tính % chiều cao cho thanh Tồn kho
        stockPercent: Math.max(2, Math.round((item.stock / maxVal) * 100)),
        // Tính % chiều cao cho thanh Đã bán
        soldPercent: Math.max(2, Math.round((item.sold / maxVal) * 100))
    });
    });
};

exports.getInventoryReport = async (req, res) => {
    try {
        const debug = String(req.query.debug || '') === '1';
        const page = parsePositiveInt(req.query.page, 1);
        const limit = parsePositiveInt(req.query.limit, 10);

        const products = await loadInventoryProducts(req.query, debug);

        if (debug) {
            console.log('[InventoryReport][DEBUG] productsCountForChart:', products.length);
        }

        const totalItems = products.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / limit));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * limit;
        const pagedProducts = products.slice(start, start + limit);

        const summary = buildSummary(products);
        const chart = buildChart(products);

        const payload = {
            summary,
            chart,
            products: pagedProducts,
            totalItems,
            totalPages,
            currentPage: safePage
        };

        if (debug) {
            payload.debugInfo = {
                query: req.query,
                totalItems,
                pagedItems: pagedProducts.length,
                chartItems: chart.length,
                sampleProduct: products[0] || null,
                sampleChart: chart[0] || null
            };
            console.log('[InventoryReport][DEBUG] responseMeta:', payload.debugInfo);
        }

        res.status(200).json(payload);
    } catch (error) {
        console.error('Lỗi getInventoryReport:', error);
        res.status(500).json({ message: 'Lỗi khi tải báo cáo tồn kho.' });
    }
};

exports.exportExcel = async (req, res) => {
    try {
        const products = await loadInventoryProducts(req.query, false);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('BaoCaoTonKho');

        worksheet.columns = [
            { header: 'Mã SP', key: 'id', width: 10 },
            { header: 'Tên sản phẩm', key: 'name', width: 40 },
            { header: 'Danh mục', key: 'category', width: 25 },
            { header: 'Tồn kho', key: 'stock', width: 15 },
            { header: 'Đã bán', key: 'sold', width: 15 },
            { header: 'Trạng thái', key: 'status', width: 20 }
        ];

        products.forEach((product) => {
            worksheet.addRow(product);
        });

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B5A41' } };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Hamoni_TonKho_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Lỗi exportExcel:', error);
        res.status(500).json({ message: 'Lỗi khi xuất file Excel.' });
    }
};