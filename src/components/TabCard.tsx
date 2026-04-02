// src/components/TabCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
} from 'react-native';

export type TabCardProps = {
  name: string;
  motto?: string;
  description?: string;
  image?: string | ImageSourcePropType;
  onPress?: () => void;
  pressable?: boolean;
  variant?: 'advisor' | 'fortune';
  price?: number;
  isFreeToday?: boolean; // ✅ Günlük ücretsiz hakkı (Coffee için)
  detail?: string;
  detailOnPress?: () => void;
  showBadge?: boolean;
  /** Varsayılan "new". "pending" geldiğinde yeni tasarım devreye girer. */
  badgeKind?: 'new' | 'pending';
};

function TabCard({
  name,
  motto,
  description,
  image,
  onPress,
  pressable = true,
  variant = 'advisor',
  price,
  isFreeToday = false,
  detail,
  detailOnPress,
  showBadge = false,
  badgeKind = 'new',
}: TabCardProps) {
  const Wrapper: any = pressable ? TouchableOpacity : View;
  const isRemoteImage = typeof image === 'string';

  const isPending = showBadge && badgeKind === 'pending';

  return (
    <Wrapper
      onPress={pressable ? onPress : undefined}
      activeOpacity={0.8}
      style={[
        styles.card,
        showBadge && badgeKind === 'new' && styles.unreadCard,
        isPending && styles.pendingCardOuter, // dış soluk katman
      ]}
    >
      {/* BEKLENİYOR / YENİ etiketi */}
      {showBadge && (
        <View style={[
          styles.badgeContainer,
          badgeKind === 'pending' && styles.badgePending,
        ]}>
          <Text style={styles.badgeText}>
            {badgeKind === 'pending' ? '⏱ BEKLENİYOR' : 'YENİ'}
          </Text>
        </View>
      )}

      {/* İç panel (pending’de daha koyu, yumuşak köşeler) */}
      <View style={[isPending ? styles.pendingInner : undefined]}>
        {variant === 'fortune' ? (
          <>
            {image ? (
              <Image
                source={isRemoteImage ? { uri: image } : image}
                style={[styles.fortuneImage, isPending && styles.imageMuted]}
                resizeMode="cover"
              />
            ) : null}
            <Text style={[styles.fortuneName, isPending && styles.namePending]}>{name}</Text>
            {motto ? (
              <Text style={[styles.fortuneDesc, isPending && styles.textMuted]}>
                {motto}
              </Text>
            ) : null}
            {description ? (
              <Text style={[styles.fortuneDesc, isPending && styles.textMuted]}>
                {description}
              </Text>
            ) : null}
            {price != null && (
              <View style={styles.priceCard}>
                {!isFreeToday && (
                  <Image
                    source={require('../assets/images/bakiye.png')}
                    style={styles.bakiyeImage}
                    resizeMode="contain"
                  />
                )}
                <Text style={[styles.price, isFreeToday && styles.priceFree]}>
                  {isFreeToday ? 'Ücretsiz' : `${price} kredi`}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.cardContent}>
            {image ? (
              <View style={styles.avatarCard}>
                <Image
                  source={isRemoteImage ? { uri: image } : image}
                  style={[styles.avatar, isPending && styles.imageMuted]}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            <View style={styles.textBlock}>
              <Text style={[styles.name, isPending && styles.namePending]}>{name}</Text>
              {motto ? (
                <Text style={[styles.motto, isPending && styles.textMuted]}>
                  {motto}
                </Text>
              ) : null}
              {description ? (
                <Text style={[styles.description, isPending && styles.textMuted]}>
                  {description}
                </Text>
              ) : null}

              {detail && (
                <TouchableOpacity style={styles.detailContainer} onPress={detailOnPress}>
                  <Text style={styles.detailText}>{detail}</Text>
                </TouchableOpacity>
              )}

              {price != null && (
                <View style={styles.priceCard}>
                  {!isFreeToday && (
                    <Image
                      source={require('../assets/images/bakiye.png')}
                      style={styles.bakiyeImage}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={[styles.price, isFreeToday && styles.priceFree]}>
                    {isFreeToday ? 'Ücretsiz' : `${price} Ametist Taşı`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Wrapper>
  );
}

export default TabCard;

const styles = StyleSheet.create({
  /* Dış kart */
  card: {
    backgroundColor: '#FAEFE6',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    position: 'relative',
  },

  /* “YENİ” görünümü (mevcut) */
  unreadCard: {
    backgroundColor: '#FAEFE6',
    borderColor: '#5f3d9f',
    borderWidth: 1,
    shadowColor: '#5f3d9f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  /* Pending dış katman — mock’a yakın soluk bej */
  pendingCardOuter: {
    backgroundColor: '#EDE9E2',
  },

  /* İç panel — biraz daha koyu ton ve yuvarlatılmış */
  pendingInner: {
    backgroundColor: '#DCD7CF',
    borderRadius: 14,
    padding: 12,
  },

  /* Rozetler */
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e67e22', // "YENİ"
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 2,
  },
  badgePending: {
    backgroundColor: '#9E9E9E', // Gri rozet (⏱ BEKLENİYOR)
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  /* İçerik */
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCard: {
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    width: 100,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  imageMuted: {
    opacity: 0.55, // görseli soluklaştır
  },

  textBlock: { flex: 1 },

  /* Metinler */
  name: {
    fontSize: 18,
    color: '#e7a96a',
    fontWeight: 'bold',
  },
  namePending: {
    color: '#6F6F6F', // pending başlık rengi
  },
  motto: {
    fontSize: 14,
    color: '#351a75',
    fontStyle: 'italic',
    marginTop: 4,
    fontWeight: 'bold',
  },
  textMuted: {
    color: '#7A7A7A',
  },
  description: {
    fontSize: 14,
    color: '#351a75',
    marginTop: 6,
  },

  detailContainer: { marginTop: 8, alignItems: 'flex-end' },
  detailText: { fontSize: 15, color: '#5f3d9f', fontWeight: 'bold' },

  /* Fortune varyantı */
  fortuneCard: { alignItems: 'center' },
  fortuneImage: {
    width: '100%', height: 160, borderRadius: 12, marginBottom: 12, backgroundColor: '#ccc',
  },
  fortuneName: { fontSize: 18, fontWeight: 'bold', color: '#5f3d9f', textAlign: 'center' },
  fortuneDesc: { fontSize: 14, color: '#351a75', textAlign: 'center', marginTop: 6 },

  /* Fiyat */
  priceCard: { flexDirection: 'row', marginTop: 8, alignItems: 'center' },
  bakiyeImage: { width: 30, height: 25 },
  price: { marginLeft: 3, fontSize: 16, color: '#5f3d9f', fontWeight: 'bold' },
  priceFree: { marginLeft: 0, color: '#e7a96a', fontSize: 18 },
});
