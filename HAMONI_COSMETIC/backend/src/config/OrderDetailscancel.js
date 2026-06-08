const fs = require('fs');

const filePath = 'src/controllers/orderpaymentController.js';
let content = fs.readFileSync(filePath, 'utf8');

const searchStr = `        await conn.commit();

        return res.json({
            message: 'Đã hủy đơn hàng thành công',
            data: {
                orderId,
                newStatus: 'DaHuy'
            }
        });`;

const replaceStr = `        await conn.commit();

        // Check nếu có thanh toán từ Casso
        const [[paymentRecord]] = await conn.execute(\`
            SELECT TrangThai FROM ThanhToan WHERE MaDH = ? LIMIT 1
        \`, [orderId]);

        const hasCassoPayment = paymentRecord?.TrangThai === 'DaThanhToan';

        return res.json({
            message: 'Đã hủy đơn hàng thành công',
            data: {
                orderId,
                newStatus: 'DaHuy',
                hasCassoPayment
            }
        });`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Thêm check Casso vào backend thành công');
} else {
    console.log('❌ Không tìm thấy section cần thay thế');
}
