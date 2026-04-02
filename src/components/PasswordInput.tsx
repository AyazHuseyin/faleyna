import React, { useState } from 'react';
import {
  TextInput,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

interface Props extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  inputStyle?: object;
}

export default function PasswordInput({
  value,
  onChangeText,
  placeholder,
  inputStyle,
  ...rest
}: Props) {
  const [secure, setSecure] = useState(true);

  return (
    <View style={StyleSheet.flatten([styles.inputContainer, inputStyle])}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#fff"
        secureTextEntry={secure}
        style={styles.textInput}
        {...rest}
      />
      <TouchableOpacity onPress={() => setSecure(!secure)} style={styles.iconContainer}>
        <FontAwesome name={secure ? 'eye-slash' : 'eye'} size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    backgroundColor: 'rgba(40, 30, 60, 0.9)',
    borderColor: '#5E4A76',
    borderWidth: 1,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  iconContainer: {
    marginLeft: 10,
  },
});
