import React from 'react';
import { Platform } from 'react-native';

type Props = any;

let Component: React.ComponentType<Props> | null = null;

function getComponent() {
  if (Component) return Component;
  try {
    if (Platform.OS === 'web') {
      // web implementation
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Component = require('./RideMap.web').default;
    } else {
      // native implementation
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Component = require('./RideMap.native').default;
    }
  } catch (e) {
    console.warn('RideMap platform implementation not found:', e);
    Component = () => null;
  }
  return Component;
}

const RideMapWrapper: React.FC<Props> = (props) => {
  const Comp = getComponent();
  return Comp ? <Comp {...props} /> : null;
};

export default RideMapWrapper;
