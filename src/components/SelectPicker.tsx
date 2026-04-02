import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface SelectPickerProps {
  label?: string;
  selectedValue: string | number;
  onValueChange: (value: string | number, index: number) => void;
  items: { label: string; value: string | number }[];
}

export default function SelectPicker({
  label,
  selectedValue,
  onValueChange,
  items,
}: SelectPickerProps) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.maskWrapper}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedValue}
            onValueChange={onValueChange}
            mode="dropdown"
            style={styles.picker}
            dropdownIconColor="#5f3d9f"
          >
            <Picker.Item label="Seçiniz" value="" />
            {items.map((item) => (
              <Picker.Item key={String(item.value)} label={item.label} value={item.value} />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  maskWrapper: {
    height: 40, // dışarıdan görünen yükseklik
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  pickerContainer: {
    height: 80, // picker'ın gerçek çalışacağı alan (Android'de böyle gerekiyor)
    justifyContent: 'center',
  },
  picker: {
    fontSize: 13,
    color: '#000',
  },
});
