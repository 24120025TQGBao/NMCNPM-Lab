export const CONTEXT_CHIPS = [
  { id: 'TROI_MUA', label: 'Trời mưa' },
  { id: 'LUOI_NAU', label: 'Lười nấu' },
  { id: 'CUOI_THANG', label: 'Cuối tháng' },
  { id: 'NAU_CHO_4', label: 'Nấu cho 4 người' },
  { id: 'AN_NHE', label: 'Ăn nhẹ' },
]

export const FLAVOR_LABELS = {
  MAN: 'Mặn',
  CAY: 'Cay',
  NGOT: 'Ngọt',
  CHUA: 'Chua',
  THANH: 'Thanh',
}

export function formatFlavor(flavor) {
  if (!flavor) return ''
  return FLAVOR_LABELS[flavor] || flavor
}

export const REGIONS = [
  { id: 'BAC', label: 'Miền Bắc' },
  { id: 'TRUNG', label: 'Miền Trung' },
  { id: 'NAM', label: 'Miền Nam' },
]
