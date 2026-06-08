// src/controllers/voucherController.js
const db = require('../config/db');
const {
    getVoucherColumns,
    hasVoucherColumn,
    buildVoucherRow,
} = require('../utils/voucherSchema');

const voucherController = {
    // [GET] /api/vouchers - Lấy danh sách
    getAllVouchers: async (req, res) => {
        try {
            const columns = await getVoucherColumns();
            const canUseQuantityState = columns.includes('SoLuong') && columns.includes('SoLuongDaDung') && columns.includes('TrangThai');

            if (canUseQuantityState) {
                await db.execute(`
                    UPDATE Voucher
                    SET TrangThai = 'TamDung'
                    WHERE TrangThai = 'KichHoat'
                      AND (SoLuong - IFNULL(SoLuongDaDung, 0)) <= 0
                `);
            }

            const selectColumns = columns.length > 0 ? columns.join(', ') : '*';
            const [rows] = await db.execute(`
                SELECT ${selectColumns}
                FROM Voucher
                ORDER BY NgayBatDau DESC, MaVoucher DESC
            `);

            res.status(200).json(rows.map(buildVoucherRow));
        } catch (error) {
            console.error("Lỗi get vouchers:", error);
            res.status(500).json({ message: "Lỗi server" });
        }
    },

    // [POST] /api/vouchers - Tạo mã mới
    createVoucher: async (req, res) => {
        try {
            const { 
                MaVoucher, LoaiGiamGia, GiaTriGiam, DonHangToiThieu, 
                SoLuongToiDa, NgayBatDau, NgayKetThuc 
            } = req.body;

            // === VALIDATE DỮ LIỆU BẮT BUỘC ===
            if (!MaVoucher || !GiaTriGiam || !SoLuongToiDa || !NgayBatDau || !NgayKetThuc) {
                return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
            }

            if (!['PhanTram', 'SoTien'].includes(LoaiGiamGia)) {
                return res.status(400).json({ message: "Loại giảm giá không hợp lệ!" });
            }

            // === VALIDATE NGÀY THÁNG ===
            const startDate = new Date(NgayBatDau);
            const endDate = new Date(NgayKetThuc);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({ message: "Định dạng ngày không hợp lệ!" });
            }

            if (endDate <= startDate) {
                return res.status(400).json({ message: "Ngày kết thúc phải sau ngày bắt đầu!" });
            }

            // === VALIDATE GIÁ TRỊ SỐ ===
            const giaTriGiam = Number(GiaTriGiam);
            const donHangToiThieu = Number(DonHangToiThieu) || 0;
            const soLuongToiDa = Number(SoLuongToiDa);

            if (!Number.isFinite(giaTriGiam) || giaTriGiam <= 0) {
                return res.status(400).json({ message: "Giá trị giảm phải lớn hơn 0!" });
            }

            if (LoaiGiamGia === 'PhanTram' && (giaTriGiam > 100)) {
                return res.status(400).json({ message: "Giảm theo % không được vượt quá 100%!" });
            }

            if (!Number.isFinite(donHangToiThieu) || donHangToiThieu < 0) {
                return res.status(400).json({ message: "Đơn hàng tối thiểu không hợp lệ!" });
            }

            if (!Number.isFinite(soLuongToiDa) || soLuongToiDa <= 0) {
                return res.status(400).json({ message: "Số lượng tối đa phải lớn hơn 0!" });
            }

            const phanTramGiam = LoaiGiamGia === 'PhanTram' ? giaTriGiam : null;
            const soTienGiam = LoaiGiamGia === 'SoTien' ? giaTriGiam : null;
            const trangThaiKhoiTao = soLuongToiDa > 0 ? 'KichHoat' : 'TamDung';
            const columns = await getVoucherColumns();
            const values = [
                String(MaVoucher).toUpperCase().trim(),
                phanTramGiam,
                soTienGiam,
                donHangToiThieu,
                soLuongToiDa,
                NgayBatDau,
                NgayKetThuc,
            ];

            const insertColumns = ['MaVoucher'];
            const insertValues = ['?'];

            if (columns.includes('PhanTramGiam')) {
                insertColumns.push('PhanTramGiam');
                insertValues.push('?');
            }

            if (columns.includes('SoTienGiam')) {
                insertColumns.push('SoTienGiam');
                insertValues.push('?');
            }

            if (columns.includes('GiamToiDa')) {
                insertColumns.push('GiamToiDa');
                insertValues.push('NULL');
            }

            if (columns.includes('DonTaiThieu')) {
                insertColumns.push('DonTaiThieu');
                insertValues.push('?');
            }

            if (columns.includes('SoLuong')) {
                insertColumns.push('SoLuong');
                insertValues.push('?');
            }

            if (columns.includes('SoLuongDaDung')) {
                insertColumns.push('SoLuongDaDung');
                insertValues.push('0');
            }

            if (columns.includes('NgayBatDau')) {
                insertColumns.push('NgayBatDau');
                insertValues.push('?');
            }

            if (columns.includes('NgayKetThuc')) {
                insertColumns.push('NgayKetThuc');
                insertValues.push('?');
            }

            if (columns.includes('TrangThai')) {
                insertColumns.push('TrangThai');
                insertValues.push('?');
            }

            const sql = `
                INSERT INTO Voucher
                (${insertColumns.join(', ')})
                VALUES (${insertValues.join(', ')})
            `;

            const filteredValues = [
                String(MaVoucher).toUpperCase().trim(),
                phanTramGiam,
                soTienGiam,
                donHangToiThieu,
                soLuongToiDa,
                NgayBatDau,
                NgayKetThuc,
                trangThaiKhoiTao,
            ];

            // Chỉ lấy đúng thứ tự placeholder tương ứng với các cột đã có
            const placeholderValues = [];
            if (columns.includes('PhanTramGiam')) placeholderValues.push(filteredValues[1]);
            if (columns.includes('SoTienGiam')) placeholderValues.push(filteredValues[2]);
            if (columns.includes('DonTaiThieu')) placeholderValues.push(filteredValues[3]);
            if (columns.includes('SoLuong')) placeholderValues.push(filteredValues[4]);
            if (columns.includes('NgayBatDau')) placeholderValues.push(filteredValues[5]);
            if (columns.includes('NgayKetThuc')) placeholderValues.push(filteredValues[6]);
            if (columns.includes('TrangThai')) placeholderValues.push(filteredValues[7]);

            await db.execute(sql, [filteredValues[0], ...placeholderValues]);
            res.status(201).json({ message: "Tạo thành công", MaVoucher: String(MaVoucher).toUpperCase() });

        } catch (error) {
            console.error("Lỗi tạo voucher:", error);
            if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Mã Voucher này đã tồn tại!" });
            res.status(500).json({ message: "Lỗi server" });
        }
    }
};

module.exports = voucherController;