import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  GestureResponderEvent,
} from 'react-native';

type Props = {
  visible: boolean;
  message: string;
  onConfirm: (event: GestureResponderEvent) => void;
  onCancel: (event: GestureResponderEvent) => void;
  title?: string;
  confirmText?: string;
  cancelText?: string;
};

export default function CustomConfirmModal({
  visible,
  message,
  onConfirm,
  onCancel,
  title = 'Onay',
  confirmText = 'Evet',
  cancelText = 'İptal',
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.cancel} onPress={onCancel}>
              <Text style={styles.text}>{cancelText}</Text>
            </Pressable>
            <Pressable style={styles.confirm} onPress={onConfirm}>
              <Text style={styles.text}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    color: '#222',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  cancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#ccc',
    borderRadius: 8,
  },
  confirm: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#e7a96a',
    borderRadius: 8,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
