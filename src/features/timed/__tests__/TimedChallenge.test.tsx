import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState, StyleSheet, type AppStateStatus } from 'react-native';

import { subnetFacts } from '@/domain/subnet';
import type { SubnetQuestion } from '@/domain/questions/types';

import { TimedChallenge } from '../TimedChallenge';

const question: SubnetQuestion = {
  id: 'timed-fixture',
  ordinal: 1,
  catalogVersion: '17dd300a',
  tier: 'easy',
  type: 'network-address',
  ip: '10.20.30.200',
  prefix: 27,
  answer: subnetFacts('10.20.30.200', 27).network,
  hints: { showMaskBeforeAnswer: true, showBlockSizeBeforeAnswer: true },
};

async function enterAnswer(
  getByLabelText: (label: string) => Parameters<typeof fireEvent.changeText>[0],
  answer: string,
) {
  for (const [index, octet] of answer.split('.').entries()) {
    await fireEvent.changeText(getByLabelText(`Timed answer octet ${index + 1}`), octet);
  }
}

describe('TimedChallenge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: null });
    jest.useRealTimers();
  });

  it('uses shrinkable WebKit-safe numeric octet inputs without focus-time auto-selection', async () => {
    const view = await render(<TimedChallenge question={question} />);
    const input = view.getByLabelText('Timed answer octet 1');
    const style = StyleSheet.flatten(input.props.style) as Record<string, unknown>;

    expect(input.props.inputMode).toBe('numeric');
    expect(input.props.selectTextOnFocus).toBeFalsy();
    expect(style.flexBasis).toBe(0);
    expect(style.minWidth).toBe(0);
    expect(style.color).toBe('#101820');
    expect(style.WebkitTextFillColor).toBe('#101820');
    expect(style.caretColor).toBe('#101820');
  });

  it('starts a separate typed-answer challenge with a two-minute timer and visible score', async () => {
    const view = await render(<TimedChallenge question={question} />);

    expect(view.getByRole('header', { name: 'Timed Challenge' })).toBeTruthy();
    expect(view.getByText('10.20.30.200 /27')).toBeTruthy();
    expect(view.getByText('02:00')).toBeTruthy();
    expect(view.getByText('1,000 points available')).toBeTruthy();
    expect(view.getByLabelText('Timed answer octet 1')).toBeTruthy();
    expect(view.queryByText(/Question 1|of 500|Easy/)).toBeNull();
  });

  it('supports a disclosed extended-time preset without changing the answer interaction', async () => {
    const view = await render(<TimedChallenge durationSeconds={240} question={question} />);

    expect(view.getByText('04:00')).toBeTruthy();
    expect(view.getByText(/4-minute local practice preset/)).toBeTruthy();
  });

  it('counts down and reduces available score using elapsed whole seconds', async () => {
    const view = await render(<TimedChallenge question={question} />);

    await act(async () => jest.advanceTimersByTime(10_000));

    expect(view.getByText('01:50')).toBeTruthy();
    expect(view.getByText('950 points available')).toBeTruthy();
  });

  it('derives elapsed time from the foreground clock when interval callbacks are delayed', async () => {
    let nowMilliseconds = 0;
    const view = await render(
      <TimedChallenge nowMilliseconds={() => nowMilliseconds} question={question} />,
    );

    nowMilliseconds = 10_000;
    await act(async () => jest.advanceTimersByTime(1_000));

    expect(view.getByText('01:50')).toBeTruthy();
    expect(view.getByText('950 points available')).toBeTruthy();
  });

  it('is unaffected when the system wall clock moves backward', async () => {
    jest.setSystemTime(new Date('2026-07-26T12:00:00.000Z'));
    const view = await render(<TimedChallenge question={question} />);

    await act(async () => jest.advanceTimersByTime(10_000));
    expect(view.getByText('01:50')).toBeTruthy();

    jest.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));
    await act(async () => jest.advanceTimersByTime(1_000));
    expect(view.getByText('01:49')).toBeTruthy();
  });

  it('rejects a correct submission after the foreground deadline even before another timer callback', async () => {
    let nowMilliseconds = 0;
    const onCompleted = jest.fn();
    const view = await render(
      <TimedChallenge
        nowMilliseconds={() => nowMilliseconds}
        onCompleted={onCompleted}
        question={question}
      />,
    );
    await enterAnswer(view.getByLabelText, question.answer);

    nowMilliseconds = 121_000;
    await fireEvent.press(view.getByRole('button', { name: 'Check timed answer' }));

    expect(view.getByText('Time expired')).toBeTruthy();
    expect(view.getByText('00:00')).toBeTruthy();
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('pauses the local-alpha timer while the app is backgrounded', async () => {
    let onAppStateChange: ((state: 'active' | 'background') => void) | undefined;
    jest.mocked(AppState.addEventListener).mockImplementation((_event, handler) => {
      onAppStateChange = handler as (state: 'active' | 'background') => void;
      return { remove: jest.fn() };
    });
    const view = await render(<TimedChallenge question={question} />);

    await act(async () => jest.advanceTimersByTime(10_000));
    expect(view.getByText('01:50')).toBeTruthy();

    await act(async () => onAppStateChange?.('background'));
    await act(async () => jest.advanceTimersByTime(20_000));
    expect(view.getByText('01:50')).toBeTruthy();

    await act(async () => onAppStateChange?.('active'));
    await act(async () => jest.advanceTimersByTime(10_000));
    expect(view.getByText('01:40')).toBeTruthy();
  });

  it('counts time only while AppState is confirmed active', async () => {
    let onAppStateChange: ((state: AppStateStatus) => void) | undefined;
    jest.mocked(AppState.addEventListener).mockImplementation((_event, handler) => {
      onAppStateChange = handler;
      return { remove: jest.fn() };
    });
    const view = await render(<TimedChallenge question={question} />);

    await act(async () => onAppStateChange?.('active'));
    await act(async () => jest.advanceTimersByTime(1_000));
    expect(view.getByText('01:59')).toBeTruthy();

    for (const state of ['unknown', 'extension', 'inactive', 'background'] as const) {
      await act(async () => onAppStateChange?.(state));
      await act(async () => jest.advanceTimersByTime(10_000));
      expect(view.getByText('01:59')).toBeTruthy();
    }

    await act(async () => onAppStateChange?.('active'));
    await act(async () => jest.advanceTimersByTime(1_000));
    expect(view.getByText('01:58')).toBeTruthy();
  });

  it('unlocks hints after three incorrect submissions and deducts points only when used', async () => {
    const view = await render(<TimedChallenge question={question} />);
    await enterAnswer(view.getByLabelText, question.ip);

    await fireEvent.press(view.getByRole('button', { name: 'Check timed answer' }));
    await fireEvent.press(view.getByRole('button', { name: 'Check timed answer' }));
    expect(view.queryByRole('button', { name: /Reveal subnet mask hint/ })).toBeNull();
    expect(view.getByText('1,000 points available')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Check timed answer' }));
    expect(view.getByText(/Hints are now available/)).toBeTruthy();
    await fireEvent.press(
      view.getByRole('button', { name: 'Reveal subnet mask hint for a 150 point deduction' }),
    );

    expect(view.getByText('Subnet mask: 255.255.255.224')).toBeTruthy();
    expect(view.getByText('850 points available')).toBeTruthy();
  });

  it('emits at most one result for rapid duplicate correct submissions', async () => {
    const onCompleted = jest.fn();
    const view = await render(
      <TimedChallenge
        createResultId={() => 'single-result'}
        onCompleted={onCompleted}
        question={question}
      />,
    );
    await enterAnswer(view.getByLabelText, question.answer);

    const checkAnswer = view.getByRole('button', { name: 'Check timed answer' });
    const clickEvent = { currentTarget: checkAnswer, target: checkAnswer };
    await act(async () => {
      checkAnswer.props.onClick(clickEvent);
      checkAnswer.props.onClick(clickEvent);
    });

    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('freezes a correct result and emits local achievement data without advancing Journey progress', async () => {
    const onCompleted = jest.fn();
    const view = await render(
      <TimedChallenge
        createResultId={() => 'local-result-1'}
        onCompleted={onCompleted}
        question={question}
      />,
    );
    await act(async () => jest.advanceTimersByTime(20_000));
    await enterAnswer(view.getByLabelText, question.answer);
    await fireEvent.press(view.getByRole('button', { name: 'Check timed answer' }));

    expect(view.getByText('Timed solve complete')).toBeTruthy();
    expect(view.getByText('You earned 900 points.')).toBeTruthy();
    expect(onCompleted).toHaveBeenCalledWith({
      resultId: 'local-result-1',
      score: 900,
      elapsedSeconds: 20,
      failureCount: 0,
      hintsUsed: 0,
      timeLimitSeconds: 120,
    });
    expect(view.getByLabelText('Timed answer octet 1').props.editable).toBe(false);
  });

  it('resets accumulated foreground time when retrying an expired challenge', async () => {
    let nowMilliseconds = 0;
    const view = await render(
      <TimedChallenge nowMilliseconds={() => nowMilliseconds} question={question} />,
    );
    nowMilliseconds = 120_000;
    await act(async () => jest.advanceTimersByTime(1_000));

    await fireEvent.press(view.getByRole('button', { name: 'Retry timed challenge' }));
    expect(view.getByText('02:00')).toBeTruthy();

    nowMilliseconds = 121_000;
    await act(async () => jest.advanceTimersByTime(1_000));
    expect(view.getByText('01:59')).toBeTruthy();
  });

  it('preserves the answer at expiry and allows an unscored untimed continuation or retry', async () => {
    const onCompleted = jest.fn();
    const view = await render(<TimedChallenge onCompleted={onCompleted} question={question} />);

    await fireEvent.changeText(view.getByLabelText('Timed answer octet 1'), '10');
    await act(async () => jest.advanceTimersByTime(120_000));

    expect(view.getByText('Time expired')).toBeTruthy();
    expect(view.getByText('00:00')).toBeTruthy();
    expect(view.getByText('0 points available')).toBeTruthy();
    expect(view.getByLabelText('Timed answer octet 1').props.value).toBe('10');
    expect(view.getByLabelText('Timed answer octet 1').props.editable).toBe(false);
    expect(view.getByRole('button', { name: 'Continue without timer' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Retry timed challenge' })).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Continue without timer' }));
    expect(view.getByLabelText('Timed answer octet 1').props.editable).toBe(true);
    expect(view.getByRole('button', { name: 'Show subnet mask hint without a score deduction' })).toBeTruthy();

    await enterAnswer(view.getByLabelText, '10.20.30.192');
    await fireEvent.press(view.getByRole('button', { name: 'Check untimed answer' }));
    expect(view.getByText('Untimed practice complete — no timed score recorded.')).toBeTruthy();
    expect(onCompleted).not.toHaveBeenCalled();
  });
});
