import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AppNavigation } from '../AppNavigation';

describe('AppNavigation', () => {
  it('keeps the entire app in a centered mobile-sized column on wide screens', async () => {
    const view = await render(
      <AppNavigation activeScreen="menu" onContinue={jest.fn()} onNavigate={jest.fn()} />,
    );

    expect(StyleSheet.flatten(view.getByTestId('app-shell').props.style)).toEqual(
      expect.objectContaining({ alignSelf: 'center', maxWidth: 960, width: '100%' }),
    );
  });

  it('renders the four primary destinations in one shared navigation group', async () => {
    const onContinue = jest.fn();
    const onNavigate = jest.fn();
    const view = await render(
      <AppNavigation activeScreen="learn" onContinue={onContinue} onNavigate={onNavigate} />,
    );

    const primary = view.getByTestId('primary-navigation');
    expect(primary.props.accessibilityLabel).toBe('Primary navigation');
    expect(view.getByRole('button', { name: 'Continue' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Learn' }).props.accessibilityState).toEqual({ selected: true });
    expect(view.getByRole('button', { name: 'Play' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Stats' })).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(view.getByRole('button', { name: 'Play' }));
    await fireEvent.press(view.getByRole('button', { name: 'Stats' }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenNthCalledWith(1, 'timed-setup');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'achievements');
  });

  it('renders secondary destinations in a matching footer group', async () => {
    const onNavigate = jest.fn();
    const view = await render(
      <AppNavigation activeScreen="account" onContinue={jest.fn()} onNavigate={onNavigate} />,
    );

    const secondary = view.getByTestId('secondary-navigation');
    expect(secondary.props.accessibilityLabel).toBe('Secondary navigation');
    expect(view.getByRole('button', { name: 'How to Play' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Journey' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Account' }).props.accessibilityState).toEqual({ selected: true });

    await fireEvent.press(view.getByRole('button', { name: 'How to Play' }));
    await fireEvent.press(view.getByRole('button', { name: 'Journey' }));
    await fireEvent.press(view.getByRole('button', { name: 'Account' }));

    expect(onNavigate).toHaveBeenNthCalledWith(1, 'how-to-play');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'journey');
    expect(onNavigate).toHaveBeenNthCalledWith(3, 'account');
  });
});
