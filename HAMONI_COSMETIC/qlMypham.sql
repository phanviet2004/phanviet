DROP DATABASE IF EXISTS QLBanMyPham_Hamoni;
CREATE DATABASE QLBanMyPham_Hamoni CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE QLBanMyPham_Hamoni;

-- ==========================================
-- PHẦN I: ĐỊNH NGHĨA CẤU TRÚC BẢNG (DDL)
-- ==========================================

-- 1. QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN
CREATE TABLE PHANQUYEN (
    MaQuyen CHAR(5) PRIMARY KEY,
    TenQuyen VARCHAR(50),
    MoTa TEXT,
    DanhSachQuyen TEXT
);

CREATE TABLE NguoiDung (
    MaND INT PRIMARY KEY AUTO_INCREMENT,
    MaQuyen CHAR(5),
    HoTen VARCHAR(100), 
    Email VARCHAR(100) UNIQUE NOT NULL,
    MatKhau VARCHAR(255) NOT NULL,
    SoDienThoai VARCHAR(20),
    DiaChi VARCHAR(255),
    GioiTinh VARCHAR(20),
    NgaySinh DATE,
    AvatarUrl VARCHAR(255) NULL,
    TrangThai TINYINT(1) DEFAULT 1, 
    NgayDangKy DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_NguoiDung_PhanQuyen FOREIGN KEY (MaQuyen) REFERENCES PHANQUYEN(MaQuyen)
);

-- 2. QUẢN LÝ MEDIA (BẢNG ĐA HÌNH)
CREATE TABLE HinhAnh (
    MaHinhAnh INT PRIMARY KEY AUTO_INCREMENT,
    LoaiThamChieu VARCHAR(50) NOT NULL, 
    MaThamChieu VARCHAR(50) NOT NULL, 
    DuongDanAnh VARCHAR(255) NOT NULL,
    LaAnhChinh TINYINT(1) DEFAULT 0,
    ThuTuHienThi INT DEFAULT 0
);

-- 3. QUẢN LÝ SẢN PHẨM & BIẾN THỂ (CATALOG)
CREATE TABLE DANHMUC (
    MaDM CHAR(5) PRIMARY KEY,
    TenDM VARCHAR(50)
);

CREATE TABLE SanPham (
    MaSP INT PRIMARY KEY AUTO_INCREMENT,
    MaDM CHAR(5),
    TenSP VARCHAR(200),
    MoTa TEXT,
    ThanhPhan TEXT, 
    CachSuDung TEXT,
    LoaiDaPhuHop VARCHAR(100),
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_SanPham_DanhMuc FOREIGN KEY (MaDM) REFERENCES DANHMUC(MaDM)
);

CREATE TABLE BienTheSanPham (
    MaBienThe INT PRIMARY KEY AUTO_INCREMENT,
    MaSP INT,
    TenBienThe VARCHAR(100), 
    Gia DECIMAL(18,2),
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_BienThe_SanPham FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP)
);

-- 4. QUẢN LÝ KHO HÀNG & NHẬP KHO NỘI BỘ
CREATE TABLE KhoHang (
    MaKho INT PRIMARY KEY AUTO_INCREMENT,
    TenKho VARCHAR(100),
    DiaChi VARCHAR(255)
);

CREATE TABLE TonKho (
    MaKho INT,
    MaBienThe INT,
    SoLuongTon INT DEFAULT 0,
    PRIMARY KEY (MaKho, MaBienThe),
    CONSTRAINT FK_TonKho_Kho FOREIGN KEY (MaKho) REFERENCES KhoHang(MaKho),
    CONSTRAINT FK_TonKho_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

CREATE TABLE PhieuNhapKho (
    MaPN INT PRIMARY KEY AUTO_INCREMENT,
    MaKho INT, 
    MaND INT, 
    NgayNhap DATETIME DEFAULT CURRENT_TIMESTAMP,
    CaSanXuat VARCHAR(50) NULL, 
    GhiChu TEXT,
    CONSTRAINT FK_PhieuNhapKho_Kho FOREIGN KEY (MaKho) REFERENCES KhoHang(MaKho),
    CONSTRAINT FK_PhieuNhapKho_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND)
);

CREATE TABLE ChiTietPhieuNhapKho (
    MaPN INT,
    MaBienThe INT,
    SoLuongNhap INT,
    ChiPhiSanXuatUocTinh DECIMAL(18,2) NULL, 
    SoLo VARCHAR(50) NOT NULL, 
    NgaySanXuat DATE NOT NULL,
    HanSuDung DATE NOT NULL,          
    PRIMARY KEY (MaPN, MaBienThe),
    CONSTRAINT FK_CTPNK_PhieuNhap FOREIGN KEY (MaPN) REFERENCES PhieuNhapKho(MaPN),
    CONSTRAINT FK_CTPNK_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

-- 5. CHƯƠNG TRÌNH KHUYẾN MÃI & VOUCHER
CREATE TABLE ChuongTrinhKhuyenMai (
    MaCTKM INT PRIMARY KEY AUTO_INCREMENT,
    TenCTKM VARCHAR(200),
    LoaiGiamGia VARCHAR(50), 
    GiaTriGiam DECIMAL(18,2),
    NgayBatDau DATETIME,
    NgayKetThuc DATETIME,
    Banner VARCHAR(255)
);

CREATE TABLE SanPham_KhuyenMai (
    MaCTKM INT,
    MaBienThe INT,
    PRIMARY KEY (MaCTKM, MaBienThe),
    CONSTRAINT FK_SPKM_KM FOREIGN KEY (MaCTKM) REFERENCES ChuongTrinhKhuyenMai(MaCTKM),
    CONSTRAINT FK_SPKM_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

CREATE TABLE Voucher (
    MaVoucher CHAR(20) PRIMARY KEY,
    PhanTramGiam INT NULL,
    SoTienGiam DECIMAL(18,2) NULL,
    GiamToiDa DECIMAL(18,2) NULL,
    DonTaiThieu DECIMAL(18,2) NULL,
    SoLuong INT,
    SoLuongDaDung INT DEFAULT 0,
    NgayBatDau DATETIME,
    NgayKetThuc DATETIME,
    TrangThai ENUM('KichHoat', 'TamDung', 'HetHan') DEFAULT 'KichHoat'
);

-- 6. GIỎ HÀNG, ĐƠN HÀNG & BÁN HÀNG
CREATE TABLE GioHang (
    MaND INT,
    MaBienThe INT,
    SoLuong INT,
    IsSelected TINYINT(1) NOT NULL DEFAULT 1,
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MaND, MaBienThe),
    CONSTRAINT FK_GioHang_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND),
    CONSTRAINT FK_GioHang_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

CREATE TABLE GiuHangTam (
    MaND INT NOT NULL,
    MaBienThe INT NOT NULL,
    SoLuong INT NOT NULL,
    ThoiGianHetHan DATETIME NOT NULL,
    PRIMARY KEY (MaND, MaBienThe)
);

CREATE TABLE DonHang (
    MaDH INT PRIMARY KEY AUTO_INCREMENT,
    MaND INT,
    MaVoucher CHAR(20) NULL,
    NgayDat DATETIME DEFAULT CURRENT_TIMESTAMP,
    TrangThai VARCHAR(50), 
    TongTien DECIMAL(18,2),
    PhiShip DECIMAL(18,2) DEFAULT 0,
    TienGiamGia DECIMAL(18,2) DEFAULT 0,
    ThanhTien DECIMAL(18,2), 
    ThongTinGiaoHang TEXT NOT NULL, 
    GhiChu TEXT,
    DaHoanTien TINYINT(1),
    CONSTRAINT FK_DonHang_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND),
    CONSTRAINT FK_DonHang_Voucher FOREIGN KEY (MaVoucher) REFERENCES Voucher(MaVoucher)
);

CREATE TABLE ChiTietDonHang (
    MaDH INT,
    MaBienThe INT,
    SoLuong INT,
    DonGia DECIMAL(18,2), 
    PRIMARY KEY (MaDH, MaBienThe),
    CONSTRAINT FK_CTDH_DonHang FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH),
    CONSTRAINT FK_CTDH_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

CREATE TABLE ThanhToan (
    MaThanhToan INT PRIMARY KEY AUTO_INCREMENT,
    MaDH INT,
    PhuongThuc VARCHAR(50), 
    TrangThai VARCHAR(50), 
    MaGiaoDichDoiTac VARCHAR(100) NULL, 
    MaPhanHoi VARCHAR(10) NULL, 
    DuLieuWebhook TEXT NULL, 
    NgayThanhToan DATETIME,
    CONSTRAINT FK_ThanhToan_DonHang FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH)
);

-- 7. TƯƠNG TÁC & LOG HỆ THỐNG
CREATE TABLE DanhGia (
    MaDG INT PRIMARY KEY AUTO_INCREMENT,
    MaND INT,
    MaSP INT,
    MaDH INT,
    SoSao INT CHECK (SoSao BETWEEN 1 AND 5),
    BinhLuan TEXT,
    HinhAnh TEXT,
    TrangThai ENUM('CHUA_PHAN_HOI', 'DA_PHAN_HOI') DEFAULT 'CHUA_PHAN_HOI',
    IsHidden TINYINT DEFAULT 0,
    NgayDanhGia DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_DanhGia_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND),
    CONSTRAINT FK_DanhGia_SanPham FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP),
    CONSTRAINT FK_DanhGia_DonHang FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH)
);

CREATE TABLE DanhGia_PhanHoi (
    MaPH INT PRIMARY KEY AUTO_INCREMENT,
    MaDG INT,
    MaND INT, -- admin hoặc staff trả lời
    NoiDung TEXT,
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_PH_DanhGia FOREIGN KEY (MaDG) REFERENCES DanhGia(MaDG) ON DELETE CASCADE,
    CONSTRAINT FK_PH_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND)
);

CREATE TABLE BannerToanCuc (
    MaBanner INT PRIMARY KEY AUTO_INCREMENT,
    TieuDe VARCHAR(100),
    DuongDanAnh VARCHAR(255) NOT NULL,
    URLDich VARCHAR(255), 
    ViTriHienThi VARCHAR(50), 
    ThuTuHienThi INT DEFAULT 0,
    TrangThai VARCHAR(50) DEFAULT 'KichHoat',
    NgayBatDau DATE NULL,
    NgayHetHan DATE NULL
);

CREATE TABLE LienHe (
    MaLH INT PRIMARY KEY AUTO_INCREMENT,
    MaND INT NULL,
    HoTen VARCHAR(100),
    Email VARCHAR(100),
    NoiDung TEXT,
    TrangThai VARCHAR(50) DEFAULT 'ChuaXuLy',
    NgayGui DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_LienHe_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND)
);

CREATE TABLE LogTonKho (
    MaLog INT PRIMARY KEY AUTO_INCREMENT,
    MaBienThe INT,
    LoaiGiaoDich VARCHAR(50), 
    SoLuongThayDoi INT, 
    SoLuongTonHienTai INT, 
    MaThamChieu INT NULL, 
    GhiChu TEXT,
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_LogTonKho_BienThe FOREIGN KEY (MaBienThe) REFERENCES BienTheSanPham(MaBienThe)
);

CREATE TABLE LogDonHang (
    MaLog INT PRIMARY KEY AUTO_INCREMENT,
    MaDH INT,
    TrangThaiCu VARCHAR(50),
    TrangThaiMoi VARCHAR(50),
    GhiChu TEXT,
    NguoiThaoTac INT NULL, 
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_LogDonHang_DH FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH)
);

CREATE TABLE PhienChat (
    MaPhien INT PRIMARY KEY AUTO_INCREMENT,
    MaND INT NULL,
    SessionID VARCHAR(255) NULL UNIQUE, -- Khách vãng lai dùng SessionID
    MaNhanVienXuLy INT NULL, -- Nhân viên đang xử lý (khi TrangThai = 'human')
    TieuDe VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Cuộc hội thoại mới',
    TrangThai ENUM('pending', 'bot', 'human', 'closed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'bot',
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted TINYINT(1) DEFAULT 0,
    CONSTRAINT FK_Chat_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND) ON DELETE SET NULL,
    CONSTRAINT FK_Chat_NhanVien FOREIGN KEY (MaNhanVienXuLy) REFERENCES NguoiDung(MaND) ON DELETE SET NULL,
    INDEX idx_MaND (MaND),
    INDEX idx_SessionID (SessionID),
    INDEX idx_TrangThai (TrangThai),
    INDEX idx_NgayTao (NgayTao),
    INDEX idx_IsDeleted (IsDeleted)
);

CREATE TABLE ChiTietChat (
    MaTinNhan INT PRIMARY KEY AUTO_INCREMENT,
    MaPhien INT NOT NULL,
    VaiTro ENUM('CUST', 'BOT', 'STAFF', 'ADMIN') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    NoiDung TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    NgayGui DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsDeleted TINYINT(1) DEFAULT 0,
    CONSTRAINT FK_ChiTietChat_Phien FOREIGN KEY (MaPhien) REFERENCES PhienChat(MaPhien) ON DELETE CASCADE,
    INDEX idx_MaPhien (MaPhien),
    INDEX idx_NgayGui (NgayGui),
    INDEX idx_VaiTro (VaiTro)
);

-- 9. CẤU HÌNH AI & THÔNG BÁO
CREATE TABLE CauHinhAI (
    MaCauHinh INT PRIMARY KEY AUTO_INCREMENT,
    PromptCoBan TEXT, 
    DuLieuHuanLuyen LONGTEXT, 
    NgayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_NgayCapNhat (NgayCapNhat)
);

CREATE TABLE ThongBao (
    MaTB INT AUTO_INCREMENT PRIMARY KEY,
    MaND INT NOT NULL,               -- Khóa ngoại trỏ đến bảng NguoiDung
    TieuDe VARCHAR(255) NOT NULL,    
    NoiDung TEXT NOT NULL,           
    TrangThaiDoc TINYINT(1) DEFAULT 0, 
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP, 
    CONSTRAINT FK_ThongBao_NguoiDung FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND) ON DELETE CASCADE
);

