import React from 'react';
import { View, ViewProps } from 'react-native';
import { H_PADDING, isTablet, TABLET_MAX_CONTENT_WIDTH } from '../utils/responsive';

export default function PhoneCanvas({ style, children, ...rest }: ViewProps) {
  return (
    <View
      style={[{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }, style]}
      {...rest}
    >
      <View
        style={{
          width: '100%',
          // 👇 Telefon: undefined → hiçbir kısıt yok; Tablet: 560px (ya da 500–600)
          maxWidth: isTablet ? TABLET_MAX_CONTENT_WIDTH : undefined,
          alignSelf: 'center',
          paddingHorizontal: H_PADDING,
          flex: 1,
        }}
      >
        {children}
      </View>
    </View>
  );
}
