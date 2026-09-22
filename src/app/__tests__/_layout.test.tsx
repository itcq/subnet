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
      const elements = ReactModule.Children.toArray(children) as React.ReactElement<{
        children?: React.ReactNode;
        content?: string;
        name?: string;
      }>[];
      const title = elements.find((element) => element.type === 'title');
      const description = elements.find(
        (element) => element.type === 'meta' && element.props.name === 'description',
      );
      return ReactModule.createElement(
        ReactNative.View,
        null,
        ReactModule.createElement(
          ReactNative.Text,
          { testID: 'document-title' },
          title?.props.children,
        ),
        ReactModule.createElement(
          ReactNative.Text,
          { testID: 'document-description' },
          description?.props.content,
        ),
      );
    },
  };
});

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: React.PropsWithChildren) => children,
}));

describe('RootLayout', () => {
  it('positions the site for CCNA and Network+ learners in search and social metadata', async () => {
    const view = await render(<RootLayout />);

    expect(view.getByTestId('document-title')).toHaveTextContent(
      'Subnet Game | CCNA & Network+ Practice',
    );
    expect(view.getByTestId('document-description')).toHaveTextContent(
      'Short IPv4 subnetting practice for Cisco CCNA and CompTIA Network+ learners, with guided lessons, typed-answer challenges, and optional timed drills.',
    );
  });
});
