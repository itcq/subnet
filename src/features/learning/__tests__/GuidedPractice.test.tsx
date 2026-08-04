import { fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { GuidedPractice } from '../GuidedPractice';

async function enterAnswer(
  view: Awaited<ReturnType<typeof render>>,
  answer: string,
) {
  for (const [index, octet] of answer.split('.').entries()) {
    await fireEvent.changeText(view.getByLabelText(`Practice answer octet ${index + 1}`), octet);
  }
}

async function solveAndContinue(
  view: Awaited<ReturnType<typeof render>>,
  answer: string,
  nextPractice: number,
) {
  await enterAnswer(view, answer);
  await fireEvent.press(view.getByRole('button', { name: 'Check practice answer' }));
  await fireEvent.press(view.getByRole('button', { name: `Continue to practice ${nextPractice}` }));
}

describe('GuidedPractice', () => {
  it('opens as optional pressure-free transfer practice with a fully scaffolded first target', async () => {
    const view = await render(<GuidedPractice onBack={jest.fn()} />);

    expect(view.getByRole('header', { name: 'Guided Practice' })).toBeTruthy();
    expect(view.getByText('Practice 1 of 4')).toBeTruthy();
    expect(view.getByText('192.168.1.70 /26')).toBeTruthy();
    expect(view.getByText('No timer. No score. Unlimited retries.')).toBeTruthy();
    expect(view.getByText(/never changes Journey, Timed, rank, badge, or achievement progress/)).toBeTruthy();
    expect(view.getByText('Subnet mask: 255.255.255.192')).toBeTruthy();
    expect(view.getByText('Block size: 64')).toBeTruthy();
    expect(view.getByText('Boundaries: 0, 64, 128, 192')).toBeTruthy();
    expect(view.queryByText('Network address: 192.168.1.64')).toBeNull();

    const submit = view.getByRole('button', { name: 'Check practice answer' });
    expect(submit.props.accessibilityState).toEqual({ disabled: true });
  });

  it('uses one-line WebKit-safe numeric octet inputs at narrow mobile widths', async () => {
    const view = await render(<GuidedPractice onBack={jest.fn()} />);
    const row = StyleSheet.flatten(view.getByTestId('practice-octet-row').props.style) as Record<string, unknown>;
    const group = StyleSheet.flatten(
      view.getByTestId('practice-octet-group-1').props.style,
    ) as Record<string, unknown>;
    const input = view.getByLabelText('Practice answer octet 1');
    const inputStyle = StyleSheet.flatten(input.props.style) as Record<string, unknown>;

    expect(row.flexWrap).toBe('nowrap');
    expect(group).toEqual(expect.objectContaining({ flexBasis: 0, flexGrow: 1, minWidth: 0 }));
    expect(input.props.inputMode).toBe('numeric');
    expect(input.props.keyboardType).toBe('number-pad');
    expect(input.props.selectTextOnFocus).toBeFalsy();
    expect(inputStyle.minWidth).toBe(0);
    expect(inputStyle.minHeight).toBeGreaterThanOrEqual(52);
    expect(inputStyle.WebkitTextFillColor).toBe('#F8FAFC');
    expect(inputStyle.caretColor).toBe('#F6C857');
  });

  it('strips non-digits and clamps each practice octet to 255', async () => {
    const view = await render(<GuidedPractice onBack={jest.fn()} />);
    const firstOctet = view.getByLabelText('Practice answer octet 1');

    await fireEvent.changeText(firstOctet, '2a56');

    expect(firstOctet.props.value).toBe('255');
  });

  it('shows only the mask on stage 2 so the learner must derive block size', async () => {
    const view = await render(<GuidedPractice onBack={jest.fn()} />);
    await solveAndContinue(view, '192.168.1.64', 2);

    expect(view.getByText('Practice 2 of 4')).toBeTruthy();
    expect(view.getByText('10.0.0.200 /27')).toBeTruthy();
    expect(view.getByText('Subnet mask: 255.255.255.224')).toBeTruthy();
    expect(view.queryByText('Block size: 32')).toBeNull();
    expect(view.queryByText(/Boundaries:/)).toBeNull();
    expect(view.queryByText('Network address: 10.0.0.192')).toBeNull();
  });

  it('unlocks a method-only hint after one Stage 3 attempt without revealing the answer', async () => {
    const view = await render(<GuidedPractice onBack={jest.fn()} />);
    await solveAndContinue(view, '192.168.1.64', 2);
    await solveAndContinue(view, '10.0.0.192', 3);

    expect(view.getByText('Practice 3 of 4')).toBeTruthy();
    expect(view.getByText('172.16.5.45 /28')).toBeTruthy();
    expect(view.queryByText(/Subnet mask:/)).toBeNull();
    expect(view.queryByText(/Block size:/)).toBeNull();
    expect(view.queryByRole('button', { name: 'Show a process hint' })).toBeNull();
    expect(view.queryByText('Network address: 172.16.5.32')).toBeNull();

    await enterAnswer(view, '172.16.5.45');
    await fireEvent.press(view.getByRole('button', { name: 'Check practice answer' }));

    const reveal = view.getByRole('button', { name: 'Show a process hint' });
    expect(reveal.props.accessibilityState).toEqual({ expanded: false });
    await fireEvent.press(reveal);
    expect(view.getByRole('button', { name: 'Hide the process hint' }).props.accessibilityState).toEqual({ expanded: true });
    expect(view.getByText(/Turn the prefix into a mask/)).toBeTruthy();
    expect(view.queryByText('Network address: 172.16.5.32')).toBeNull();
  });

  it('waits for two Stage 4 attempts before offering a method hint', async () => {
    const view = await render(<GuidedPractice onBack={jest.fn()} />);
    await solveAndContinue(view, '192.168.1.64', 2);
    await solveAndContinue(view, '10.0.0.192', 3);
    await solveAndContinue(view, '172.16.5.32', 4);

    expect(view.getByText('Practice 4 of 4')).toBeTruthy();
    expect(view.getByText('192.0.2.173 /29')).toBeTruthy();
    expect(view.queryByText(/Subnet mask:/)).toBeNull();
    expect(view.queryByText(/Block size:/)).toBeNull();

    await enterAnswer(view, '192.0.2.173');
    await fireEvent.press(view.getByRole('button', { name: 'Check practice answer' }));
    expect(view.queryByRole('button', { name: 'Show a process hint' })).toBeNull();
    expect(view.queryByText('Network address: 192.0.2.168')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Check practice answer' }));
    expect(view.getByRole('button', { name: 'Show a process hint' })).toBeTruthy();
    expect(view.queryByText('Network address: 192.0.2.168')).toBeNull();
  });

  it('ends with a transfer milestone and replays from a clean Stage 1', async () => {
    const onBack = jest.fn();
    const view = await render(<GuidedPractice onBack={onBack} />);
    await solveAndContinue(view, '192.168.1.64', 2);
    await solveAndContinue(view, '10.0.0.192', 3);
    await solveAndContinue(view, '172.16.5.32', 4);
    await enterAnswer(view, '192.0.2.168');
    await fireEvent.press(view.getByRole('button', { name: 'Check practice answer' }));

    expect(view.getByRole('header', { name: 'Transfer complete' })).toBeTruthy();
    expect(view.getByText(/You applied the same boundary method with less help each time/)).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Continue to practice 5' })).toBeNull();
    expect(view.getByRole('button', { name: 'Replay guided practice' })).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Replay guided practice' }));
    expect(view.getByText('Practice 1 of 4')).toBeTruthy();
    expect(view.getByText('192.168.1.70 /26')).toBeTruthy();
    expect(view.getByLabelText('Practice answer octet 1').props.value).toBe('');
    expect(view.queryByText('✓ Boundary found')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Back to Learn Subnetting' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('announces retry feedback and final completion for iPhone VoiceOver', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(jest.fn());
    const view = await render(<GuidedPractice onBack={jest.fn()} />);
    await solveAndContinue(view, '192.168.1.64', 2);
    await solveAndContinue(view, '10.0.0.192', 3);
    await solveAndContinue(view, '172.16.5.32', 4);

    announce.mockClear();
    await enterAnswer(view, '192.0.2.173');
    await fireEvent.press(view.getByRole('button', { name: 'Check practice answer' }));
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('Try that boundary again'));

    announce.mockClear();
    await enterAnswer(view, '192.0.2.168');
    await fireEvent.press(view.getByRole('button', { name: 'Check practice answer' }));
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('Transfer complete'));

    announce.mockRestore();
  });

  it('resets the practice scroller after advancing and replaying', async () => {
    const scrollToTop = jest.fn();
    const view = await render(<GuidedPractice onBack={jest.fn()} scrollToTop={scrollToTop} />);

    await solveAndContinue(view, '192.168.1.64', 2);
    expect(scrollToTop).toHaveBeenLastCalledWith({ animated: false, y: 0 });

    await solveAndContinue(view, '10.0.0.192', 3);
    await solveAndContinue(view, '172.16.5.32', 4);
    await enterAnswer(view, '192.0.2.168');
    await fireEvent.press(view.getByRole('button', { name: 'Check practice answer' }));
    await fireEvent.press(view.getByRole('button', { name: 'Replay guided practice' }));

    expect(scrollToTop).toHaveBeenCalledTimes(4);
    expect(scrollToTop).toHaveBeenLastCalledWith({ animated: false, y: 0 });
  });

  it('keeps the answer hidden after a misconception and reveals the proof only after success', async () => {
    const view = await render(<GuidedPractice onBack={jest.fn()} />);

    await enterAnswer(view, '192.168.1.70');
    await fireEvent.press(view.getByRole('button', { name: 'Check practice answer' }));
    expect(view.getByText(/That is the device interface address/)).toBeTruthy();
    expect(view.queryByText('Network address: 192.168.1.64')).toBeNull();

    await enterAnswer(view, '192.168.1.64');
    await fireEvent.press(view.getByRole('button', { name: 'Check practice answer' }));

    expect(view.getByText('✓ Boundary found')).toBeTruthy();
    expect(view.getByText('Network address: 192.168.1.64')).toBeTruthy();
    expect(view.getByText('Broadcast address: 192.168.1.127')).toBeTruthy();
    expect(view.getByText('Usable range: 192.168.1.65–192.168.1.126')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Continue to practice 2' })).toBeTruthy();
  });
});
