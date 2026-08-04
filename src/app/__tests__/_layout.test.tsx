import React from 'react';
import { render } from '@testing-library/react-native';

import RootLayout from '../_layout';

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  const Stack = ({ children }: React.PropsWithChildren) =>
    ReactModule.createElement(ReactModule.Fragment, null, children);
  return { Stack };
});

jest.mock('expo-router/head', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  const ReactNative = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    __esModule: true,
    default: ({ children }: React.PropsWithChildren) => {
      const title = ReactModule.Children.toArray(children)[0] as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      return ReactModule.createElement(
        ReactNative.Text,
        { testID: 'document-title' },
        title.props.children,
      );
    },
  };
});

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: React.PropsWithChildren) => children,
}));

describe('RootLayout', () => {
  it('sets a descriptive static and hydrated document title', async () => {
    const view = await render(<RootLayout />);

    expect(view.getByTestId('document-title')).toHaveTextContent('Subnet Game');
  });
});
