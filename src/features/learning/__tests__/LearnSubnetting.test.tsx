import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { LearnSubnetting } from '../LearnSubnetting';

describe('LearnSubnetting', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts with why subnetting exists and shows the ordered beginner path', async () => {
    const view = await render(<LearnSubnetting onBack={jest.fn()} onStartPractice={jest.fn()} />);

    expect(view.getByRole('header', { name: 'Learn Subnetting' })).toBeTruthy();
    expect(view.getByText('Why subnetting exists')).toBeTruthy();
    expect(
      view.getByText(
        'Subnetting splits one network into smaller address groups so devices and traffic are easier to organize.',
      ),
    ).toBeTruthy();
    expect(view.getByText('An IP identifies one interface. The prefix tells you which network group it belongs to.')).toBeTruthy();
    expect(view.getByRole('header', { name: 'Why subnetting exists' })).toBeTruthy();
    expect(view.getByRole('header', { name: 'Your learning path' })).toBeTruthy();
    expect(view.getByRole('header', { name: 'Bits, Bytes & Octets' })).toBeTruthy();
    expect(view.getByRole('header', { name: 'Two reliable solving methods' })).toBeTruthy();
    expect(view.getByRole('header', { name: 'Worked examples' })).toBeTruthy();
    expect(view.getByRole('header', { name: 'Practice without pressure' })).toBeTruthy();
    expect(view.getByRole('header', { name: 'External learning resources' })).toBeTruthy();
    expect(view.getByText('1 · Why subnetting exists')).toBeTruthy();
    expect(view.getByText('2 · Guided whiteboard lesson')).toBeTruthy();
    expect(view.getByText('3 · Two reliable methods')).toBeTruthy();
    expect(view.getByText('4 · Worked examples')).toBeTruthy();
    expect(view.getByText('5 · Practice without pressure')).toBeTruthy();
    expect(view.getByText('6 · External resources')).toBeTruthy();
  });

  it('teaches binary and block size as two views of the same boundary', async () => {
    const view = await render(<LearnSubnetting onBack={jest.fn()} onStartPractice={jest.fn()} />);

    expect(view.getByText('Two reliable solving methods')).toBeTruthy();
    expect(
      view.getByText('Binary explains why the boundary works. Block size is the faster decimal shortcut for that same boundary.'),
    ).toBeTruthy();
    expect(view.getByText('Block-size method')).toBeTruthy();
    expect(
      view.getByText('Block size is the decimal width of the same host-bit patterns that binary shows.'),
    ).toBeTruthy();
    expect(view.getByText('Binary-boundary method')).toBeTruthy();
    expect(
      view.getByText('Binary shows the boundary directly; that boundary creates the block size used by the shortcut.'),
    ).toBeTruthy();
  });

  it('reveals method steps only when the learner asks for them', async () => {
    const view = await render(<LearnSubnetting onBack={jest.fn()} onStartPractice={jest.fn()} />);
    const firstStep = 'Convert the prefix to a subnet mask and identify the first mask octet that is not 255.';

    const reveal = view.getByRole('button', { name: 'Show steps for Block-size method' });
    expect(reveal.props.accessibilityState).toEqual({ expanded: false });
    expect(view.queryByText(`Step 1: ${firstStep}`)).toBeNull();
    await fireEvent.press(reveal);
    expect(view.getByText(`Step 1: ${firstStep}`)).toBeTruthy();
    expect(view.getByRole('button', { name: 'Hide steps for Block-size method' }).props.accessibilityState).toEqual({
      expanded: true,
    });
  });

  it('opens the optional guided Bits, Bytes & Octets lesson and returns to Learn', async () => {
    const onBack = jest.fn();
    const view = await render(<LearnSubnetting onBack={onBack} onStartPractice={jest.fn()} />);

    expect(view.getByText('Bits, Bytes & Octets')).toBeTruthy();
    expect(view.getByText(/Build 192.168.1.130\/26 step by step/)).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Start guided Bits, Bytes and Octets lesson' }));

    expect(view.getByRole('header', { name: 'Build an IPv4 Address' })).toBeTruthy();
    expect(view.queryByRole('header', { name: 'Learn Subnetting' })).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Back to Learn Subnetting' }));

    expect(view.getByRole('header', { name: 'Learn Subnetting' })).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
  });

  it('contextualizes each worked example with what changes and what stays the same', async () => {
    const view = await render(<LearnSubnetting onBack={jest.fn()} onStartPractice={jest.fn()} />);

    expect(view.getByText('A small office uses one familiar /24 network for its devices.')).toBeTruthy();
    expect(view.getByText('What changes: With /24, all eight bits in the final octet are host bits.')).toBeTruthy();
    expect(
      view.getAllByText('What stays the same: Keep the prefix bits and set every host bit to zero to find the network.'),
    ).toHaveLength(3);
    expect(view.getByText('A team needs a smaller address group inside an existing private network.')).toBeTruthy();
    expect(view.getByText('A device address must be placed in the correct one of four /26 groups.')).toBeTruthy();
  });

  it('reveals worked calculations on demand', async () => {
    const view = await render(<LearnSubnetting onBack={jest.fn()} onStartPractice={jest.fn()} />);
    const calculation = 'A /27 mask ends in 224, so the block size is 256 − 224 = 32.';

    expect(view.queryByText(`• ${calculation}`)).toBeNull();
    expect(view.queryByText('Network address: 192.168.10.0')).toBeNull();
    const reveal = view.getByRole('button', { name: 'Show calculation for A familiar /24 boundary' });
    expect(reveal.props.accessibilityState).toEqual({ expanded: false });
    await fireEvent.press(reveal);
    expect(view.getByRole('button', { name: 'Hide calculation for A familiar /24 boundary' }).props.accessibilityState).toEqual({
      expanded: true,
    });
    expect(view.getByText('• A /24 mask is 255.255.255.0, so the first three octets identify the network.')).toBeTruthy();
    expect(view.getByText('Network address: 192.168.10.0')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Show calculation for Use a block size of 32' }));
    expect(view.getByText(`• ${calculation}`)).toBeTruthy();
  });

  it('frames practice as optional, unlimited, and separate from competitive progress', async () => {
    const view = await render(<LearnSubnetting onBack={jest.fn()} onStartPractice={jest.fn()} />);

    expect(view.getByText('Practice without pressure')).toBeTruthy();
    expect(view.getByText('No timer. No score. Unlimited retries.')).toBeTruthy();
    expect(
      view.getByText('Practice here is optional and never changes Journey, Timed, rank, badge, or achievement progress.'),
    ).toBeTruthy();
    expect(view.getByRole('button', { name: 'Practice this concept' })).toBeTruthy();
  });

  it('renders engine-validated worked examples and pressure-free practice copy', async () => {
    const view = await render(<LearnSubnetting onBack={jest.fn()} onStartPractice={jest.fn()} />);

    expect(view.getByText('192.168.10.77 /24')).toBeTruthy();
    expect(view.getByText('10.20.35.200 /27')).toBeTruthy();
    expect(view.getByText('172.16.5.130 /26')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Show calculation for A familiar /24 boundary' }));
    await fireEvent.press(view.getByRole('button', { name: 'Show calculation for Use a block size of 32' }));
    await fireEvent.press(view.getByRole('button', { name: 'Show calculation for Use a block size of 64' }));

    expect(view.getByText('Network address: 192.168.10.0')).toBeTruthy();
    expect(view.getByText('Network address: 10.20.35.192')).toBeTruthy();
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
