export const parseVndAmount = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) {
    return Number(raw.replace(/[.,]/g, '')) || 0;
  }

  const numeric = Number(raw.replace(/\s/g, '').replace(',', '.'));
  if (Number.isFinite(numeric)) {
    return Math.max(0, Math.round(numeric));
  }

  const digitsOnly = raw.replace(/\D/g, '');
  return digitsOnly ? Number(digitsOnly) : 0;
};

export const buildVietQrImageUrl = ({
  bankBin,
  accountNumber,
  accountName,
  amount,
  transferCode,
}) => {
  const normalizedBankBin = String(bankBin ?? '').replace(/\D/g, '');
  const normalizedAccountNumber = String(accountNumber ?? '').replace(/\D/g, '');
  const hasValidBankConfig = Boolean(normalizedBankBin && normalizedAccountNumber);
  if (!hasValidBankConfig) {
    return {
      hasValidBankConfig: false,
      qrImageUrl: '',
    };
  }

  const normalizedAmount = parseVndAmount(amount);
  const qrQuery = new URLSearchParams({
    amount: String(normalizedAmount),
    addInfo: String(transferCode ?? ''),
    accountName: String(accountName ?? ''),
  });

  return {
    hasValidBankConfig: true,
    qrImageUrl: `https://img.vietqr.io/image/${normalizedBankBin}-${normalizedAccountNumber}-print.png?${qrQuery.toString()}`,
  };
};
