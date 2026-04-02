import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  UIManager,
  Platform,
  ScrollView,
} from 'react-native';

// Android'de LayoutAnimation etkinleştir
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const FAQS = [
  {
    title: 'Nasıl ametist taşı kazanırım?',
    content:
      'Ametist sadece iki yolla kazanılır: (1) Bakiye ekranındaki “Reklam İzle” butonuyla, (2) Google Play üzerinden satın alım yaparak. Görev/çekiliş vb. yoktur. Günlük reklam izleme hakkınız ve kazanacağınız miktar Bakiye ekranında yazar.',
  },
  {
    title: 'Satın alma nasıl çalışır?',
    content:
      'Bakiye ekranında paket seçip satın alma akışını tamamladığınızda ametist bakiyeniz otomatik güncellenir. İşlemlerinizi “Satın Alma Geçmişi” ekranından görebilirsiniz.',
  },
  {
    title: 'Satın alma işlemim görünmüyor veya başarısız oldu, ne yapmalıyım?',
    content:
      'Önce uygulamayı kapatıp açın ve internetinizi kontrol edin. Google Play’de oturumunuzun doğru hesapla açık olduğundan emin olun. Sorun sürerse “Satın Alma Geçmişi”ni kontrol edin ve bize destekten yazın.',
  },
  {
    title: 'Reklam izleyerek nasıl ametist kazanırım?',
    content:
      'Bakiye ekranındaki “Reklam İzle” butonuna basın. Reklam tamamlanınca ametist otomatik eklenir. Günlük izleme hakkınız sınırlıdır; kalan hak ve ödül miktarı aynı ekranda gösterilir. Reklam başlamazsa birkaç saniye sonra tekrar deneyin.',
  },
  {
    title: 'Fal sonucu ne zaman gelir?',
    content:
      'Fal gönderildikten sonra genellikle 5 dakika içinde hazır olur. Hazır olduğunda “Geçmiş” ekranında görünür; isterseniz filtrelerden fal türüne göre listeleyebilirsiniz.',
  },
  {
    title: 'Fal yorumunu kim yapıyor?',
    content:
      'Yorumlar, seçtiğiniz uzman yorumcular tarafından hazırlanır. “Yorumcular” ekranında bir yorumcuya dokunarak profilini ve detay açıklamasını görebilir, seçim yapabilirsiniz.',
  },
  {
    title: 'Gönderdiğim falları nereden takip ederim?',
    content:
      'Tüm sonuçlar “Geçmiş” ekranında listelenir. Üstteki filtreler ile fal türüne göre hızlıca arama yapabilirsiniz.',
  },
];


// Props tipi tanımı
type HelpTabProps = {
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function HelpTab({ setLoading }: HelpTabProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveIndex(index === activeIndex ? null : index);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {FAQS.map((item, index) => (
        <View key={index} style={styles.item}>
          <Pressable onPress={() => toggleAccordion(index)} style={styles.header}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.arrow}>{activeIndex === index ? '▲' : '▼'}</Text>
          </Pressable>
          {activeIndex === index && (
            <View style={styles.body}>
              <Text style={styles.contentText}>{item.content}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  item: {
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    padding: 14,
    backgroundColor: '#e7a96a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  arrow: {
    fontSize: 16,
    color: '#fff',
  },
  body: {
    padding: 14,
    backgroundColor: '#FAEFE6',
  },
  contentText: {
    fontSize: 14,
    color: '#351a75',
    lineHeight: 20,
  },
});
