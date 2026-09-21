import { fireEvent, render } from '@testing-library/react-native';

import { AppNavigation, type AppScreen } from '../AppNavigation';

describe('AppNavigation', () => {
  it('opens an accessible menu and navigates to a selected destination', async () => {
    const onNavigate = jest.fn<void, [AppScreen]>();
    const screen = await render(
      <AppNavigation currentScreen="learn" onNavigate={onNavigate} signedIn={false} />,
    );

    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeTruthy();
    expect(screen.queryByTestId('navigation-drawer')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Open navigation menu' }));

    expect(screen.getByTestId('navigation-drawer')).toBeTruthy();
    expect(screen.getByText('Navigate')).toBeTruthy();
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Global Scoreboard' }));

    expect(onNavigate).toHaveBeenCalledWith('scoreboard');
    expect(screen.queryByTestId('navigation-drawer')).toBeNull();
  });

  it('marks the current destination and closes without navigating', async () => {
    const onNavigate = jest.fn<void, [AppScreen]>();
    const screen = await render(
      <AppNavigation currentScreen="terms" onNavigate={onNavigate} signedIn />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(screen.getByRole('menuitem', { name: 'Terms of Service, current page' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'My Account' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Close navigation menu' }));
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('navigation-drawer')).toBeNull();
  });
});
