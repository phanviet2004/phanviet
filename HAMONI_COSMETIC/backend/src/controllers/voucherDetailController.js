// src/controllers/voucherDetailController.js
const db = require('../config/db');
const {
    getVoucherColumns,
    buildVoucherRow,
} = require('../utils/voucherSchema');

const voucherDetailController = {
    // [GET] /api/vouchers/:id - Lấy chi tiết 1 Voucher
    getDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const columns = await getVoucherColumns();
            const canUseQuantityState = columns.includes('SoLuong') && columns.includes('SoLuongDaDung') && columns.includes('TrangThai');

            if (canUseQuantityState) {
                await db.execute(`
                    UPDATE Voucher
                    SET TrangThai = 'TamDung'
                    WHERE MaVoucher = ?
                      AND TrangThai = 'KichHoat'
                      AND (SoLuong - IFNULL(SoLuongDaDung, 0)) <= 0
                `, [id]);
            }
            
            // Lấy thông tin từ CSDL
            const selectColumns = columns.length > 0 ? columns.join(', ') : '*';
            const [rows] = await db.execute(`SELECT ${selectColumns} FROM Voucher WHERE MaVoucher = ?`, [id]);
            
            if (rows.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy mã giảm giá này!" });
            }

            const v = buildVoucherRow(rows[0]);

            // Đổi tên biến cho khớp với Form trên React (Adapter Pattern)
            res.status(200).json({
                MaVoucher: v.MaVoucher,
                PhanTramGiam: v.PhanTramGiam,
                SoTienGiam: v.SoTienGiam,
                DonHangToiThieu: v.DonTaiThieu,
                SoLuongToiDa: v.SoLuong,
                SoLuongDaDung: v.SoLuongDaDung,
                NgayBatDau: v.NgayBatDau,
                NgayKetThuc: v.NgayKetThuc,
                TrangThai: v.TrangThai,
            });
        } catch (error) {
            console.error("Lỗi get chi tiết voucher:", error);
            res.status(500).json({ message: "Lỗi server khi lấy chi tiết" });
        }
    },

    // [PUT] /api/vouchers/:id - Cập nhật thông tin (Chỉ sửa Ngày, SL, Đơn tối thiểu)
    updateDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const { DonHangToiThieu, SoLuongToiDa, NgayBatDau, NgayKetThuc } = req.body;

            // === VALIDATE DỮ LIỆU ===
            if (DonHangToiThieu === undefined || SoLuongToiDa === undefined || !NgayBatDau || !NgayKetThuc) {
                return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
            }

            const donHangToiThieu = Number(DonHangToiThieu);
            const soLuongToiDa = Number(SoLuongToiDa);

            // === VALIDATE NGÀY THÁNG ===
            const startDate = new Date(NgayBatDau);
            const endDate = new Date(NgayKetThuc);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({ message: "Định dạng ngày không hợp lệ!" });
            }

            if (endDate <= startDate) {
                return res.status(400).json({ message: "Ngày kết thúc phải sau ngày bắt đầu!" });
            }

            // === VALIDATE GIÁ TRỊ ===
            if (!Number.isFinite(donHangToiThieu) || donHangToiThieu < 0) {
                return res.status(400).json({ message: "Đơn hàng tối thiểu không hợp lệ!" });
            }

            if (!Number.isFinite(soLuongToiDa) || soLuongToiDa <= 0) {
                return res.status(400).json({ message: "Số lượng tối đa phải lớn hơn 0!" });
            }

            const columns = await getVoucherColumns();
            const updates = [];
            const values = [];

            if (columns.includes('DonTaiThieu')) {
                updates.push('DonTaiThieu = ?');
                values.push(donHangToiThieu);
            }
            if (columns.includes('SoLuong')) {
                updates.push('SoLuong = ?');
                values.push(soLuongToiDa);
            }
            if (columns.includes('NgayBatDau')) {
                updates.push('NgayBatDau = ?');
                values.push(NgayBatDau);
            }
            if (columns.includes('NgayKetThuc')) {
                updates.push('NgayKetThuc = ?');
                values.push(NgayKetThuc);
            }

            if (updates.length === 0) {
                return res.status(400).json({ message: 'Schema voucher hiện tại không hỗ trợ cập nhật.' });
            }

            const sql = `
                UPDATE Voucher
                SET ${updates.join(', ')}
                WHERE MaVoucher = ?
            `;
            values.push(id);

            const [result] = await db.execute(sql, values);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Không tìm thấy mã giảm giá để cập nhật" });
            }

            // Auto-sync trạng thái nếu hết số lượng
            if (columns.includes('SoLuong') && columns.includes('SoLuongDaDung') && columns.includes('TrangThai')) {
                await db.execute(
                    `
                        UPDATE Voucher
                        SET TrangThai = 'TamDung'
                        WHERE MaVoucher = ?
                          AND TrangThai = 'KichHoat'
                          AND (SoLuong - IFNULL(SoLuongDaDung, 0)) <= 0
                    `,
                    [id],
                );
            }

            res.status(200).json({ message: "Cập nhật thông tin thành công" });
        } catch (error) {
            console.error("Lỗi cập nhật voucher:", error);
            res.status(500).json({ message: "Lỗi server khi cập nhật" });
        }
    },

    // [PATCH] /api/vouchers/:id/status - Đổi trạng thái Bật/Tắt
    toggleStatus: async (req, res) => {
        try {
            const { id } = req.params; 
            const { TrangThai } = req.body; 

            // === VALIDATE TRẠNG THÁI ===
            if (!['KichHoat', 'TamDung'].includes(TrangThai)) {
                return res.status(400).json({ message: "Trạng thái không hợp lệ!" });
            }

            const columns = await getVoucherColumns();
            const selectCols = [
                columns.includes('SoLuong') ? 'SoLuong' : 'NULL AS SoLuong',
                columns.includes('SoLuongDaDung') ? 'IFNULL(SoLuongDaDung, 0) AS SoLuongDaDung' : '0 AS SoLuongDaDung',
                columns.includes('NgayBatDau') ? 'NgayBatDau' : 'NULL AS NgayBatDau',
                columns.includes('NgayKetThuc') ? 'NgayKetThuc' : 'NULL AS NgayKetThuc',
            ].join(', ');

            const [rows] = await db.execute(
                `SELECT ${selectCols} FROM Voucher WHERE MaVoucher = ?`,
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy mã giảm giá" });
            }

            const voucher = rows[0];

            // === KIỂM TRA KHI KÍCH HOẠT ===
            if (TrangThai === 'KichHoat') {
                const soLuongConLai = Number(voucher.SoLuong) - Number(voucher.SoLuongDaDung);

                // 1. Kiểm tra số lượng còn lại
                if (soLuongConLai <= 0) {
                    return res.status(400).json({ message: "Voucher đã hết lượt sử dụng, không thể kích hoạt." });
                }

                // 2. Kiểm tra ngày hiện tại có nằm trong khoảng thời gian hoạt động
                const now = new Date();
                const startDate = new Date(voucher.NgayBatDau);
                const endDate = new Date(voucher.NgayKetThuc);

                if (now < startDate) {
                    return res.status(400).json({ message: "Voucher chưa đến ngày bắt đầu, không thể kích hoạt." });
                }

                if (now > endDate) {
                    return res.status(400).json({ message: "Voucher đã hết hạn, không thể kích hoạt." });
                }
            }

            if (!columns.includes('TrangThai')) {
                return res.status(400).json({ message: 'Schema voucher hiện tại không hỗ trợ đổi trạng thái.' });
            }

            const [result] = await db.execute(`UPDATE Voucher SET TrangThai = ? WHERE MaVoucher = ?`, [TrangThai, id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Không tìm thấy mã giảm giá" });
            }
            
            res.status(200).json({ message: "Cập nhật trạng thái thành công" });
        } catch (error) {
            console.error("Lỗi cập nhật trạng thái:", error);
            res.status(500).json({ message: "Lỗi server khi đổi trạng thái" });
        }
    }
};

module.exports = voucherDetailController;