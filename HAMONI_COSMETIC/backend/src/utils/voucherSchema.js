const db = require('../config/db');

const REQUIRED_COLUMNS = [
  'MaVoucher',
  'PhanTramGiam',
  'SoTienGiam',
  'GiamToiDa',
  'DonTaiThieu',
  'SoLuong',
  'SoLuongDaDung',
  'NgayBatDau',
  'NgayKetThuc',
  'TrangThai',
];

let cachedColumns = null;

const getVoucherColumns = async () => {
  if (cachedColumns) return cachedColumns;

  const [rows] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'Voucher'`,
  );

  const existing = new Set(rows.map((row) => row.COLUMN_NAME));
  cachedColumns = REQUIRED_COLUMNS.filter((column) => existing.has(column));
  return cachedColumns;
};

const hasVoucherColumn = async (columnName) => {
  const columns = await getVoucherColumns();
  return columns.includes(columnName);
};

const buildVoucherRow = (row = {}) => {
  const issued = Number(row.SoLuong ?? row.SoLuongToiDa ?? 0);
  const used = Number(row.SoLuongDaDung ?? 0);
  const remaining = Number.isFinite(issued) && Number.isFinite(used) ? Math.max(issued - used, 0) : 0;

  return {
    MaVoucher: row.MaVoucher,
    PhanTramGiam: row.PhanTramGiam ?? null,
    SoTienGiam: row.SoTienGiam ?? null,
    GiamToiDa: row.GiamToiDa ?? null,
    DonTaiThieu: row.DonTaiThieu ?? null,
    SoLuong: row.SoLuong ?? row.SoLuongToiDa ?? null,
    SoLuongDaDung: row.SoLuongDaDung ?? 0,
    SoLuongConLai: remaining,
    NgayBatDau: row.NgayBatDau ?? null,
    NgayKetThuc: row.NgayKetThuc ?? null,
    TrangThai:
      row.TrangThai ??
      (row.NgayBatDau && row.NgayKetThuc
        ? new Date() < new Date(row.NgayBatDau)
          ? 'TamDung'
          : new Date() > new Date(row.NgayKetThuc)
            ? 'HetHan'
            : remaining <= 0
              ? 'HetMa'
              : 'KichHoat'
        : 'TamDung'),
  };
};

module.exports = {
  getVoucherColumns,
  hasVoucherColumn,
  buildVoucherRow,
};