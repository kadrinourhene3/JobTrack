import React, { createContext, useContext } from 'react';
import { Theme } from './theme';

export const ThemeContext = createContext<Theme | null>(null);
export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeContext is missing');
  return value;
};
