/** Proposed convenience lenses. They only boost ranking, never classify or exclude. */
export const categories = [
  {
    id: 'office',
    label: 'Văn phòng & in ấn',
    prefixes: ['4820', '8443', '8470', '8471', '9608', '9609', '9611', '9612'],
  },
  {
    id: 'food',
    label: 'Thực phẩm & đồ uống',
    prefixes: [
      '02',
      '03',
      '04',
      '07',
      '08',
      '09',
      '10',
      '11',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
    ],
  },
  {
    id: 'agriculture',
    label: 'Nông nghiệp',
    prefixes: ['01', '06', '07', '08', '10', '12', '23', '31', '8432', '8433', '8436'],
  },
  {
    id: 'textiles',
    label: 'Dệt may & giày dép',
    prefixes: [
      '50',
      '51',
      '52',
      '53',
      '54',
      '55',
      '56',
      '57',
      '58',
      '59',
      '60',
      '61',
      '62',
      '63',
      '64',
    ],
  },
  { id: 'electronics', label: 'Điện & điện tử', prefixes: ['85', '8471', '8473'] },
  { id: 'machinery', label: 'Máy móc & công cụ', prefixes: ['82', '84'] },
  {
    id: 'medical',
    label: 'Thiết bị & vật tư y tế',
    prefixes: ['30', '3005', '4015', '9018', '9019', '9020', '9021', '9022'],
  },
  {
    id: 'chemicals',
    label: 'Hóa chất & vật liệu',
    prefixes: ['28', '29', '32', '33', '34', '35', '36', '37', '38', '39', '40'],
  },
  {
    id: 'home',
    label: 'Nhà cửa & nội thất',
    prefixes: ['44', '46', '63', '69', '70', '94', '9603'],
  },
  {
    id: 'transport',
    label: 'Phương tiện & phụ tùng',
    prefixes: ['86', '87', '88', '89', '4011', '4012'],
  },
  {
    id: 'packaging',
    label: 'Bao bì & giấy',
    prefixes: ['3923', '4415', '47', '48', '49', '6305', '7310', '7612'],
  },
  {
    id: 'leisure',
    label: 'Đồ dùng & giải trí',
    prefixes: ['42', '65', '66', '67', '91', '92', '95', '96', '97'],
  },
] as const;
export function categoryMatch(id: string | undefined, code: string): boolean {
  const category = categories.find((c) => c.id === id);
  return !!category?.prefixes.some((prefix) => code.startsWith(prefix));
}
