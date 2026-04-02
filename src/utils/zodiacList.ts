export type ZodiacItem = {
  name: string;
  code: string;
  image: any;
};

const zodiacList: ZodiacItem[] = [
  { name: 'Koç', code: 'aries', image: require('../assets/images/burclar/koc.webp') },
  { name: 'Boğa', code: 'taurus', image: require('../assets/images/burclar/boga.webp') },
  { name: 'İkizler', code: 'gemini', image: require('../assets/images/burclar/ikizler.webp') },
  { name: 'Yengeç', code: 'cancer', image: require('../assets/images/burclar/yengec.webp') },
  { name: 'Aslan', code: 'leo', image: require('../assets/images/burclar/aslan.webp') },
  { name: 'Başak', code: 'virgo', image: require('../assets/images/burclar/basak.webp') },
  { name: 'Terazi', code: 'libra', image: require('../assets/images/burclar/terazi.webp') },
  { name: 'Akrep', code: 'scorpio', image: require('../assets/images/burclar/akrep.webp') },
  { name: 'Yay', code: 'sagittarius', image: require('../assets/images/burclar/yay.webp') },
  { name: 'Oğlak', code: 'capricorn', image: require('../assets/images/burclar/oglak.webp') },
  { name: 'Kova', code: 'aquarius', image: require('../assets/images/burclar/kova.webp') },
  { name: 'Balık', code: 'pisces', image: require('../assets/images/burclar/balik.webp') },
];

export default zodiacList;
