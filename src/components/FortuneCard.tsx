import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  ImageSourcePropType,
  GestureResponderEvent,
} from 'react-native';

interface FortuneCardProps {
  title: string;
  image: ImageSourcePropType;
  onPress: (event: GestureResponderEvent) => void;
}

const FortuneCard: React.FC<FortuneCardProps> = ({ title, image, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.imageWrapper}>
        <Image source={image} style={styles.image} resizeMode="cover" />
      </View>
      <View style={styles.textWrapper}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default FortuneCard;

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#FAEFE6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 5,
    marginVertical: 7,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 2.2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textWrapper: {
    backgroundColor: '#FAEFE6',
    paddingVertical: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3e2b6f',
  },
});
