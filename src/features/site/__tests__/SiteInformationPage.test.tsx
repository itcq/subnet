import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { SiteInformationPage } from '../SiteInformationPage';

describe('SiteInformationPage', () => {
  it('renders the core Terms of Service sections without claiming verified outcomes', async () => {
    const screen = await render(
      <SiteInformationPage onNavigate={jest.fn()} page="terms" supportEmail={null} />,
    );

    expect(screen.getByRole('header', { name: 'Terms of Service' })).toBeTruthy();
    expect(screen.getByText('Subnet Game is operated by Rooted in Media, INC.')).toBeTruthy();
    expect(screen.getByText('Educational purpose')).toBeTruthy();
    expect(screen.getByText('Accounts and progress')).toBeTruthy();
    expect(screen.getByText(/not a certification, credential, or guarantee/i)).toBeTruthy();
  });

  it('shows an honest unavailable state until a public support address is configured', async () => {
    const screen = await render(
      <SiteInformationPage onNavigate={jest.fn()} page="contact" supportEmail={null} />,
    );

    expect(screen.getByRole('header', { name: 'Contact Us' })).toBeTruthy();
    expect(screen.getByText(/public support address is being finalized/i)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('opens the configured support email without exposing another address', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(undefined);
    const screen = await render(
      <SiteInformationPage
        onNavigate={jest.fn()}
        page="contact"
        supportEmail="support@example.test"
      />,
    );

    await fireEvent.press(screen.getByRole('link', { name: 'Email support@example.test' }));
    expect(openUrl).toHaveBeenCalledWith('mailto:support@example.test');
    openUrl.mockRestore();
  });

  it('uses the site map to navigate to public app destinations', async () => {
    const onNavigate = jest.fn();
    const screen = await render(
      <SiteInformationPage onNavigate={onNavigate} page="site-map" supportEmail={null} />,
    );

    await fireEvent.press(screen.getByRole('link', { name: 'Learn Subnetting' }));
    expect(onNavigate).toHaveBeenCalledWith('learn');
  });
});
