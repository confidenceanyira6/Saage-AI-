export const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', cur: 'NGN' },
  { code: 'GH', name: 'Ghana', cur: 'GHS' },
  { code: 'KE', name: 'Kenya', cur: 'KES' },
  { code: 'ZA', name: 'South Africa', cur: 'ZAR' },
  { code: 'GB', name: 'United Kingdom', cur: 'GBP' },
  { code: 'US', name: 'United States', cur: 'USD' },
  { code: 'CA', name: 'Canada', cur: 'CAD' },
  { code: 'FR', name: 'France', cur: 'EUR' },
  { code: 'DE', name: 'Germany', cur: 'EUR' },
  { code: 'IE', name: 'Ireland', cur: 'EUR' },
  { code: 'AE', name: 'United Arab Emirates', cur: 'AED' },
];

export const countryName = (c?: string | null) => COUNTRIES.find((x) => x.code === c)?.name ?? c ?? '';

export const BANKS = [
  { code: '044', name: 'Access Bank' }, { code: '058', name: 'GTBank' }, { code: '011', name: 'First Bank' },
  { code: '033', name: 'UBA' }, { code: '057', name: 'Zenith Bank' }, { code: '070', name: 'Fidelity Bank' },
  { code: '032', name: 'Union Bank' }, { code: '232', name: 'Sterling Bank' }, { code: '221', name: 'Stanbic IBTC' },
  { code: '035', name: 'Wema Bank' }, { code: '214', name: 'FCMB' }, { code: '076', name: 'Polaris Bank' },
  { code: '050', name: 'Ecobank' }, { code: '082', name: 'Keystone Bank' }, { code: '101', name: 'Providus Bank' },
  { code: '50211', name: 'Kuda' }, { code: '999992', name: 'OPay' }, { code: '999991', name: 'PalmPay' },
  { code: '50515', name: 'Moniepoint' },
];

export const MEN_CATEGORIES = ['Haircut', 'Skin Fade', 'Low Cut', 'Afro', 'Beard Grooming', 'Hair + Beard', 'Hair Coloring', 'Hair Styling', 'Kids Haircut'];
export const WOMEN_CATEGORIES = ['Braids', 'Weaves', 'Styling', 'Coloring', 'Natural Hair', 'Wigs', 'Treatments', 'Kids Hair'];
