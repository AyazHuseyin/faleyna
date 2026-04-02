import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';

interface Props {
  visible: boolean;
}

const Loader: React.FC<Props> = ({ visible }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        <LottieView
          source={require('../assets/animations/loader.json')}
          autoPlay
          loop
          style={styles.animation}
        />
      </View>
    </Modal>
  );
};

export default Loader;

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    width,
    height: Platform.OS === 'android' ? height + 50 : height,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height: Platform.OS === 'android' ? height + 50 : height,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  animation: {
    width: 150,
    height: 150,
    zIndex: 10000,
  },
});
