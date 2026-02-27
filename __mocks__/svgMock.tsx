import React from 'react';
import { View } from 'react-native';

const SvgMock = ({ width, height }: { width?: number; height?: number }) => (
  <View testID="svg-mock" style={{ width, height }} />
);

export default SvgMock;
