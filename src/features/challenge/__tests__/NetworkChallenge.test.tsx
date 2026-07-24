import { fireEvent, render } from '@testing-library/react-native';

import { NetworkChallenge } from '../NetworkChallenge';

describe('NetworkChallenge', () => {
  it('presents the first network-address challenge', async () => {
    const { getByText } = await render(<NetworkChallenge />);

    expect(getByText('192.168.10.70 /27')).toBeTruthy();
    expect(getByText('What is the network address?')).toBeTruthy();
  });

  it('explains why a correct network address is correct', async () => {
    const { getByLabelText, getByRole, getByText } = await render(<NetworkChallenge />);

    const answer = ['192', '168', '10', '64'];
    for (const [index, octet] of answer.entries()) {
      await fireEvent.changeText(getByLabelText(`Answer octet ${index + 1}`), octet);
    }
    await fireEvent.press(getByRole('button', { name: 'Check answer' }));

    expect(getByText('Correct — 70 lands in the 64–95 block.')).toBeTruthy();
  });

  it('gives a targeted cue after an incorrect answer', async () => {
    const { getByLabelText, getByRole, getByText } = await render(<NetworkChallenge />);

    const answer = ['192', '168', '10', '70'];
    for (const [index, octet] of answer.entries()) {
      await fireEvent.changeText(getByLabelText(`Answer octet ${index + 1}`), octet);
    }
    await fireEvent.press(getByRole('button', { name: 'Check answer' }));

    expect(
      getByText('Not quite — /27 moves in blocks of 32. Find the boundary just below 70.'),
    ).toBeTruthy();
  });

  it('uses the current challenge values in its explanation', async () => {
    const { getByLabelText, getByRole, getByText } = await render(<NetworkChallenge />);

    for (const [index, octet] of ['192', '168', '10', '64'].entries()) {
      await fireEvent.changeText(getByLabelText(`Answer octet ${index + 1}`), octet);
    }
    await fireEvent.press(getByRole('button', { name: 'Check answer' }));
    await fireEvent.press(getByRole('button', { name: 'Next challenge' }));

    for (const [index, octet] of ['10', '20', '30', '192'].entries()) {
      await fireEvent.changeText(getByLabelText(`Answer octet ${index + 1}`), octet);
    }
    await fireEvent.press(getByRole('button', { name: 'Check answer' }));

    expect(getByText('Correct — 200 lands in the 192–255 block.')).toBeTruthy();
    expect(
      getByText(
        'A /26 moves in blocks of 64: 0, 64, 128, 192. The target sits in the block beginning at 192.',
      ),
    ).toBeTruthy();
  });

  it('uses the current challenge values in retry guidance', async () => {
    const { getByLabelText, getByRole, getByText } = await render(<NetworkChallenge />);

    for (const [index, octet] of ['192', '168', '10', '64'].entries()) {
      await fireEvent.changeText(getByLabelText(`Answer octet ${index + 1}`), octet);
    }
    await fireEvent.press(getByRole('button', { name: 'Check answer' }));
    await fireEvent.press(getByRole('button', { name: 'Next challenge' }));

    for (const [index, octet] of ['10', '20', '30', '200'].entries()) {
      await fireEvent.changeText(getByLabelText(`Answer octet ${index + 1}`), octet);
    }
    await fireEvent.press(getByRole('button', { name: 'Check answer' }));

    expect(
      getByText('Not quite — /26 moves in blocks of 64. Find the boundary just below 200.'),
    ).toBeTruthy();
  });

  it('restarts the mission after the final challenge', async () => {
    const { getByLabelText, getByRole, getByText, queryByText } =
      await render(<NetworkChallenge />);
    const answers = [
      ['192', '168', '10', '64'],
      ['10', '20', '30', '192'],
      ['192', '168', '4', '16'],
      ['172', '16', '32', '0'],
      ['192', '168', '50', '12'],
    ];

    for (const [challengeNumber, answer] of answers.entries()) {
      for (const [index, octet] of answer.entries()) {
        await fireEvent.changeText(getByLabelText(`Answer octet ${index + 1}`), octet);
      }
      await fireEvent.press(getByRole('button', { name: 'Check answer' }));
      if (challengeNumber < answers.length - 1) {
        await fireEvent.press(getByRole('button', { name: 'Next challenge' }));
      }
    }

    expect(getByText('5 / 5')).toBeTruthy();
    expect(
      getByText(
        'A /30 moves in blocks of 4: 4, 8, 12, 16. The target sits in the block beginning at 12.',
      ),
    ).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Restart mission' }));

    expect(getByText('192.168.10.70 /27')).toBeTruthy();
    expect(getByText('1 / 5')).toBeTruthy();
    expect(getByLabelText('Answer octet 1').props.value).toBe('');
    expect(queryByText('✓ Network found')).toBeNull();
  });

  it('advances to the next challenge and clears challenge-specific state', async () => {
    const { getByLabelText, getByRole, getByText, queryByText } =
      await render(<NetworkChallenge />);

    const answer = ['192', '168', '10', '64'];
    for (const [index, octet] of answer.entries()) {
      await fireEvent.changeText(getByLabelText(`Answer octet ${index + 1}`), octet);
    }
    await fireEvent.press(getByRole('button', { name: 'Check answer' }));
    await fireEvent.press(getByRole('button', { name: 'Next challenge' }));

    expect(getByText('10.20.30.200 /26')).toBeTruthy();
    expect(getByText('2 / 5')).toBeTruthy();
    expect(getByLabelText('Answer octet 1').props.value).toBe('');
    expect(getByRole('button', { name: 'Check answer' }).props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(queryByText('✓ Network found')).toBeNull();
  });
});
