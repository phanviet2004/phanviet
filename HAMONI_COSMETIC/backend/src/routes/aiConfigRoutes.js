const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx'); // Thêm thư viện xlsx
const db = require('../config/db');

// Cấu hình lưu tạm file trong bộ nhớ (Buffer)
const upload = multer({ storage: multer.memoryStorage() });

// 1. API Lấy cấu hình hiện tại
router.get('/config', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT MaCauHinh, PromptCoBan, DuLieuHuanLuyen FROM CauHinhAI WHERE MaCauHinh = 1 LIMIT 1');

        if (rows.length === 0) {
            const defaultConfig = { maCauHinh: 1, promptCoBan: '', duLieuHuanLuyen: '' };
            await db.query(
                'INSERT INTO CauHinhAI (MaCauHinh, PromptCoBan, DuLieuHuanLuyen) VALUES (1, ?, ?)',
                ['', '']
            );
            return res.json({ success: true, config: defaultConfig });
        }

        const config = rows[0];
        res.json({
            success: true,
            config: {
                maCauHinh: config.MaCauHinh,
                promptCoBan: config.PromptCoBan || '',
                duLieuHuanLuyen: config.DuLieuHuanLuyen || ''
            }
        });
    } catch (error) {
        console.error('Lỗi lấy cấu hình AI:', error);
        res.status(500).json({ message: "Lỗi lấy cấu hình" });
    }
});

// 2. API Cập nhật Prompt và Huấn luyện file (Hỗ trợ PDF, Word, Excel)
router.post('/train', upload.single('file'), async (req, res) => {
    try {
        const { promptCoBan } = req.body;
        let extractedText = "";

        if (req.file) {
            const buffer = req.file.buffer;
            const mimeType = req.file.mimetype;
            const originalName = (req.file.originalname || '').toLowerCase();

            // Xử lý file PDF
            if (mimeType === 'application/pdf') {
                const data = await pdfParse(buffer);
                extractedText = data.text;
            } 
            // Xử lý file Word
            else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
                const result = await mammoth.extractRawText({ buffer: buffer });
                extractedText = result.value;
            }
            // Xử lý file EXCEL (Bổ sung mới)
            else if (
                mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                mimeType === 'application/vnd.ms-excel' ||
                originalName.endsWith('.xlsx') ||
                originalName.endsWith('.xls')
            ) {
                const workbook = xlsx.read(buffer, { type: 'buffer' });
                extractedText = "DỮ LIỆU TỪ FILE EXCEL:\n";
                
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    // Chuyển sheet thành CSV để AI hiểu cấu trúc hàng/cột tốt hơn
                    const csvData = xlsx.utils.sheet_to_csv(worksheet);
                    extractedText += `\n[Sheet: ${sheetName}]\n${csvData}\n`;
                });
            }
        }

        const [currentRows] = await db.query('SELECT DuLieuHuanLuyen FROM CauHinhAI WHERE MaCauHinh = 1 LIMIT 1');
        const currentTrainingText = currentRows[0]?.DuLieuHuanLuyen || '';
        
        // Nếu không tải file mới, giữ lại text cũ. Nếu có file mới, ghi đè text mới.
        const nextTrainingText = extractedText || currentTrainingText;

        await db.query(
            `INSERT INTO CauHinhAI (MaCauHinh, PromptCoBan, DuLieuHuanLuyen)
             VALUES (1, ?, ?)
             ON DUPLICATE KEY UPDATE
                PromptCoBan = VALUES(PromptCoBan),
                DuLieuHuanLuyen = VALUES(DuLieuHuanLuyen)`,
            [promptCoBan, nextTrainingText]
        );

        res.json({ 
            success: true, 
            message: "Đã huấn luyện AI thành công!",
            config: {
                maCauHinh: 1,
                promptCoBan: promptCoBan || '',
                duLieuHuanLuyen: nextTrainingText
            },
            textPreview: extractedText ? extractedText.substring(0, 1000) + "..." : "Không có thay đổi về tài liệu huan luyện."
        });
    } catch (error) {
        console.error("Lỗi huấn luyện AI:", error);
        res.status(500).json({ message: "Lỗi máy chủ khi xử lý file" });
    }
});

module.exports = router;