import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { subnetFacts } from '@/domain/subnet';
import type { DifficultyTier, SubnetQuestion } from '@/domain/questions/types';

import { NetworkChallenge } from '../NetworkChallenge';

function question(
  ordinal: number,
  ip: string,
  prefix: number,
  tier: DifficultyTier,
  hints = { showMaskBeforeAnswer: true, showBlockSizeBeforeAnswer: true },
): SubnetQuestion {
  return {
    id: `fixture-${ordinal}`,
    ordinal,
    catalogVersion: 'ipv4-network-v1',
    tier,
    type: 'network-address',
    ip,
    prefix,
    answer: subnetFacts(ip, prefix).network,
    hints,
  };
}

const easyQuestions = [
  question(1, '10.10.10.70', 27, 'easy'),
  question(2, '10.20.30.200', 26, 'easy'),
] as const;

async function enterAnswer(
  getByLabelText: (label: string) => Parameters<typeof fireEvent.changeText>[0],
  answer: string,
) {
  for (const [index, octet] of answer.split('.').entries()) {
    await fireEvent.changeText(getByLabelText(`Answer octet ${index + 1}`), octet);
  }
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('NetworkChallenge catalog session UI', () => {
  it('starts the default catalog as a focused journey without exposing the global question total', async () => {
    const { getByText, queryByText } = await render(<NetworkChallenge />);

    expect(getByText('FOUNDATIONS · UNIT 1')).toBeTruthy();
    expect(getByText('Lesson 1 · Challenge 1 of 5')).toBeTruthy();
    expect(queryByText(/500/)).toBeNull();
  });

  it('starts at the first incomplete fixture and shows fixture, tier, and tier progress', async () => {
    const questions = [
      question(99, '10.0.1.70', 27, 'easy'),
      question(100, '10.0.2.70', 27, 'easy'),
    ] as const;
    const { getByText, queryByText } = await render(
      <NetworkChallenge questions={questions} initialCompletedOrdinals={[99]} />,
    );

    expect(getByText('FOUNDATIONS · UNIT 5')).toBeTruthy();
    expect(getByText('Lesson 4 · Challenge 5 of 5')).toBeTruthy();
    expect(getByText('10.0.2.70 /27')).toBeTruthy();
    expect(queryByText('10.0.1.70 /27')).toBeNull();
  });

  it.each([
    ['shows both', true, true],
    ['shows only mask', true, false],
    ['hides both', false, false],
  ])('%s according to pre-answer hint policy and reveals all facts after an incorrect answer', async (_, showMask, showBlockSize) => {
    const active = question(101, '10.33.44.70', 27, 'intermediate', {
      showMaskBeforeAnswer: showMask,
      showBlockSizeBeforeAnswer: showBlockSize,
    });
    const facts = subnetFacts(active.ip, active.prefix);
    const view = await render(<NetworkChallenge questions={[active]} />);

    expect(Boolean(view.queryByText(facts.mask))).toBe(showMask);
    expect(Boolean(view.queryByText(String(facts.blockSize)))).toBe(showBlockSize);

    await enterAnswer(view.getByLabelText, active.ip);
    await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));

    expect(view.getByText(facts.mask)).toBeTruthy();
    expect(view.getByText(String(facts.blockSize))).toBeTruthy();
    expect(view.getByText(/Network 10\.33\.44\.64; broadcast 10\.33\.44\.95\./)).toBeTruthy();
    expect(view.getByText(/70 falls in the 64–95 block/)).toBeTruthy();
  });

  it('gives complete correct instruction and persists only correct submissions', async () => {
    const onQuestionCompleted = jest.fn();
    const active = easyQuestions[0];
    const view = await render(
      <NetworkChallenge questions={[active]} onQuestionCompleted={onQuestionCompleted} />,
    );

    await enterAnswer(view.getByLabelText, active.ip);
    await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));
    expect(onQuestionCompleted).not.toHaveBeenCalled();

    await enterAnswer(view.getByLabelText, active.answer);
    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));
    });

    expect(onQuestionCompleted).toHaveBeenCalledTimes(1);
    expect(onQuestionCompleted).toHaveBeenCalledWith(active);
    expect(view.getByText('✓ Network found')).toBeTruthy();
    expect(view.getByText(/Mask 255\.255\.255\.224 gives a block size of 32\./)).toBeTruthy();
    expect(view.getByText(/Network 10\.10\.10\.64; broadcast 10\.10\.10\.95\./)).toBeTruthy();
  });

  it('waits for persistence before committing correct UI state', async () => {
    const pending = deferred();
    const active = easyQuestions[0];
    const view = await render(
      <NetworkChallenge questions={[active]} onQuestionCompleted={() => pending.promise} />,
    );
    await enterAnswer(view.getByLabelText, active.answer);

    await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));

    expect(view.queryByText('✓ Network found')).toBeNull();
    expect(view.getByRole('button', { name: 'Saving completion' }).props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(view.getByLabelText('Answer octet 1').props.value).toBe('10');

    await act(async () => pending.resolve());

    expect(view.getByText('✓ Network found')).toBeTruthy();
  });

  it('retains the answer after failed persistence, blocks duplicate in-flight writes, and allows retry', async () => {
    const first = deferred();
    const second = deferred();
    const onQuestionCompleted = jest
      .fn<Promise<void>, [SubnetQuestion]>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const active = easyQuestions[0];
    const view = await render(
      <NetworkChallenge questions={[active]} onQuestionCompleted={onQuestionCompleted} />,
    );
    await enterAnswer(view.getByLabelText, active.answer);

    const check = view.getByRole('button', { name: 'Check answer' });
    await fireEvent.press(check);
    await fireEvent.press(check);
    expect(onQuestionCompleted).toHaveBeenCalledTimes(1);

    await act(async () => first.reject(new Error('disk full')));

    expect(view.getByText('We could not save your progress. Your answer is still here—try again.')).toBeTruthy();
    expect(view.queryByText('✓ Network found')).toBeNull();
    expect(view.getByLabelText('Answer octet 4').props.value).toBe('64');

    await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));
    expect(onQuestionCompleted).toHaveBeenCalledTimes(2);
    await act(async () => second.resolve());
    expect(view.getByText('✓ Network found')).toBeTruthy();
  });

  it('advances with the session engine and resets answer and feedback while rendering only the active question', async () => {
    const view = await render(<NetworkChallenge questions={easyQuestions} />);
    await enterAnswer(view.getByLabelText, easyQuestions[0].answer);
    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));
    });
    await fireEvent.press(view.getByRole('button', { name: 'NEXT CHALLENGE' }));

    expect(view.getByText('Lesson 1 · Challenge 2 of 5')).toBeTruthy();
    expect(view.getByText('10.20.30.200 /26')).toBeTruthy();
    expect(view.queryByText('10.10.10.70 /27')).toBeNull();
    expect(view.getByLabelText('Answer octet 1').props.value).toBe('');
    expect(view.queryByText('✓ Network found')).toBeNull();
  });

  it('uses the true ordinal for the tier checkpoint action label', async () => {
    const questions = [
      question(99, '10.1.1.70', 27, 'easy'),
      question(100, '10.1.2.70', 27, 'easy'),
      question(101, '10.1.3.70', 27, 'intermediate'),
    ] as const;
    const view = await render(
      <NetworkChallenge questions={questions} initialCompletedOrdinals={[99]} />,
    );
    await enterAnswer(view.getByLabelText, questions[1].answer);
    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));
    });

    expect(view.getByRole('button', { name: 'ENTER BUILDER' })).toBeTruthy();
    expect(view.getByText('ENTER BUILDER')).toBeTruthy();
  });

  it('marks lesson boundaries as short journey milestones', async () => {
    const questions = [
      question(5, '10.1.1.70', 27, 'easy'),
      question(6, '10.1.2.70', 27, 'easy'),
    ] as const;
    const view = await render(<NetworkChallenge questions={questions} />);
    await enterAnswer(view.getByLabelText, questions[0].answer);
    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));
    });

    expect(view.getByRole('button', { name: 'CONTINUE TO LESSON 2' })).toBeTruthy();
  });

  it('marks balanced unit boundaries as journey milestones', async () => {
    const questions = [
      question(20, '10.1.1.70', 27, 'easy'),
      question(21, '10.1.2.70', 27, 'easy'),
    ] as const;
    const view = await render(<NetworkChallenge questions={questions} />);
    await enterAnswer(view.getByLabelText, questions[0].answer);
    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));
    });

    expect(view.getByRole('button', { name: 'CONTINUE TO UNIT 2' })).toBeTruthy();
  });

  it('completes the final fixture question without wrapping or enabling another action', async () => {
    const questions = [
      question(499, '10.2.1.70', 27, 'hardest'),
      question(500, '10.2.2.70', 27, 'hardest'),
    ] as const;
    const view = await render(
      <NetworkChallenge questions={questions} initialCompletedOrdinals={[499]} />,
    );
    await enterAnswer(view.getByLabelText, questions[1].answer);
    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));
    });

    expect(view.getByText('Journey complete')).toBeTruthy();
    expect(view.getByText('10.2.2.70 /27')).toBeTruthy();
    const complete = view.getByRole('button', { name: 'JOURNEY COMPLETE' });
    expect(complete.props.accessibilityState).toEqual({ disabled: true });
    expect(view.getByText('JOURNEY COMPLETE')).toBeTruthy();
  });

  it('restores an already completed curriculum as a locked final state', async () => {
    const finalQuestion = question(500, '10.9.8.7', 32, 'hardest', {
      showMaskBeforeAnswer: false,
      showBlockSizeBeforeAnswer: false,
    });
    const view = await render(
      <NetworkChallenge
        questions={[finalQuestion]}
        initialCompletedOrdinals={[500]}
      />,
    );

    expect(view.getByText('Journey complete')).toBeTruthy();
    expect(
      view.getByRole('button', { name: 'JOURNEY COMPLETE' }).props.accessibilityState,
    ).toEqual({ disabled: true });
    expect(view.getByLabelText('Answer octet 1').props.editable).toBe(false);

    await fireEvent.changeText(view.getByLabelText('Answer octet 1'), '200');
    expect(view.getByLabelText('Answer octet 1').props.value).toBe('');
  });

  it('preserves the active session when an equivalent catalog array is supplied', async () => {
    const active = easyQuestions[0];
    const view = await render(<NetworkChallenge questions={[active]} />);
    await fireEvent.changeText(view.getByLabelText('Answer octet 1'), '10');

    await act(async () => {
      view.rerender(
        <NetworkChallenge
          questions={[{ ...active, hints: { ...active.hints } }]}
        />,
      );
    });

    expect(view.getByText('10.10.10.70 /27')).toBeTruthy();
    expect(view.getByLabelText('Answer octet 1').props.value).toBe('10');
  });

  it('starts a fresh session when the semantic catalog changes', async () => {
    const replacement = question(101, '172.20.40.70', 27, 'intermediate');
    const view = await render(<NetworkChallenge questions={[easyQuestions[0]]} />);
    await fireEvent.changeText(view.getByLabelText('Answer octet 1'), '10');

    await act(async () => {
      view.rerender(<NetworkChallenge questions={[replacement]} />);
    });

    expect(view.getByText('172.20.40.70 /27')).toBeTruthy();
    expect(view.queryByText('10.10.10.70 /27')).toBeNull();
    expect(view.getByLabelText('Answer octet 1').props.value).toBe('');
  });

  it('does not commit an old pending completion into a replacement catalog', async () => {
    const pending = deferred();
    const replacement = question(101, '172.20.40.70', 27, 'intermediate');
    const view = await render(
      <NetworkChallenge
        questions={[easyQuestions[0]]}
        onQuestionCompleted={() => pending.promise}
      />,
    );
    await enterAnswer(view.getByLabelText, easyQuestions[0].answer);
    await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));

    await act(async () => {
      view.rerender(
        <NetworkChallenge
          questions={[replacement]}
          onQuestionCompleted={() => pending.promise}
        />,
      );
    });
    expect(view.getByText('172.20.40.70 /27')).toBeTruthy();

    await act(async () => pending.resolve());

    expect(view.getByText('172.20.40.70 /27')).toBeTruthy();
    expect(view.queryByText('✓ Network found')).toBeNull();
    expect(view.getByLabelText('Answer octet 1').props.value).toBe('');
  });

  it('handles /31 and /32 instructional feedback without boundary math errors', async () => {
    for (const [ordinal, prefix] of [[400, 31], [401, 32]] as const) {
      const active = question(ordinal, `10.4.5.${prefix === 31 ? 7 : 9}`, prefix, 'hardest', {
        showMaskBeforeAnswer: false,
        showBlockSizeBeforeAnswer: false,
      });
      const view = await render(<NetworkChallenge questions={[active]} />);
      await enterAnswer(view.getByLabelText, active.ip);
      await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));
      await waitFor(() => expect(view.getByText(new RegExp(`Mask .* gives a block size of ${subnetFacts(active.ip, prefix).blockSize}\\.`))).toBeTruthy());
      await view.unmount();
    }
  });
});
