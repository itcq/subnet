import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { LearnSubnetting } from '../LearnSubnetting';

describe('LearnSubnetting', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('presents the module as optional and explains both learning methods', async () => {
    const view = await render(<LearnSubnetting onBack={jest.fn()} onStartPractice={jest.fn()} />);

    expect(view.getByRole('header', { name: 'Learn Subnetting' })).toBeTruthy();
    expect(view.getByText(/This section is optional/)).toBeTruthy();
    expect(view.getByText('Find the Network Address')).toBeTruthy();
    expect(view.getByText('Block-size method')).toBeTruthy();
    expect(view.getByText('Binary-boundary method')).toBeTruthy();
    expect(view.getAllByText(/Step [1-4]/)).toHaveLength(8);
  });

  it('renders engine-validated worked examples and pressure-free practice copy', async () => {
    const view = await render(<LearnSubnetting onBack={jest.fn()} onStartPractice={jest.fn()} />);

    expect(view.getByText('192.168.10.77 /24')).toBeTruthy();
    expect(view.getByText('Network address: 192.168.10.0')).toBeTruthy();
    expect(view.getByText('10.20.35.200 /27')).toBeTruthy();
    expect(view.getByText('Network address: 10.20.35.192')).toBeTruthy();
    expect(view.getByText('172.16.5.130 /26')).toBeTruthy();
    expect(view.getByText('Network address: 172.16.5.128')).toBeTruthy();
    expect(view.getByText(/does not affect Journey progress, scores, ranks, or badges/)).toBeTruthy();
  });

  it('shows attributed external resources and the no-affiliation disclaimer', async () => {
    const view = await render(<LearnSubnetting onBack={jest.fn()} onStartPractice={jest.fn()} />);

    expect(view.getByRole('link', { name: /NetworkChuck: what is an IP Address/ })).toBeTruthy();
    expect(view.getByRole('link', { name: /The Cyber Mentors: Subnetting Made Easy/ })).toBeTruthy();
    expect(view.getByRole('link', { name: /Jeremy Cioara: DESIGNING Subnets/ })).toBeTruthy();
    expect(view.getByRole('link', { name: /Practical Networking: What is Subnetting/ })).toBeTruthy();
    expect(view.getByText(/does not imply partnership, affiliation, or endorsement/)).toBeTruthy();
  });

  it('shows a student-visible message when an external resource cannot open', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('unavailable'));
    const view = await render(<LearnSubnetting onBack={jest.fn()} onStartPractice={jest.fn()} />);

    await fireEvent.press(view.getByRole('link', { name: /NetworkChuck: what is an IP Address/ }));

    expect(view.getByText('That external resource could not be opened. Please try again later.')).toBeTruthy();
  });

  it('invokes back and practice actions without gating either path', async () => {
    const onBack = jest.fn();
    const onStartPractice = jest.fn();
    const view = await render(<LearnSubnetting onBack={onBack} onStartPractice={onStartPractice} />);

    await fireEvent.press(view.getByRole('button', { name: 'Back to main menu' }));
    await fireEvent.press(view.getByRole('button', { name: 'Practice this concept' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onStartPractice).toHaveBeenCalledTimes(1);
  });
});
