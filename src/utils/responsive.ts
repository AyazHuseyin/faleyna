import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

export const isTablet = Math.min(width, height) >= 600;

// SADECE TABLETTE üst sınır (istersen 500–600 arası oynat)
export const TABLET_MAX_CONTENT_WIDTH = 560;

// Yatay padding aynen kalsın
export const H_PADDING = 0;

// Formların aşağı kaymaması için offset 0
export const AUTH_TOP_OFFSET = 0;
