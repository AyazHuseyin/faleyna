import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  GestureResponderEvent,
} from 'react-native';

interface SweetAlertProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: (event: GestureResponderEvent) => void;
}

const SweetAlert: React.FC<SweetAlertProps> = ({
  visible,
  title,
  message,
  onClose,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.title}>{title || 'Uyarı'}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.85 },
            ]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Tamam</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default SweetAlert;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#e7a96a',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
