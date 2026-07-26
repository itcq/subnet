import { fireEvent, render } from '@testing-library/react-native';

import { TimedModeSetup } from '../TimedModeSetup';

describe('TimedModeSetup', () => {
  it('discloses optional presets and scoring before a timer starts', async () => {
    const view = await render(
      <TimedModeSetup onBack={jest.fn()} onStartTimed={jest.fn()} onStartUntimed={jest.fn()} />,
    );

    expect(view.getByRole('header', { name: 'Choose Your Play Style' })).toBeTruthy();
    expect(view.getByText(/Timed practice is always optional/)).toBeTruthy();
    expect(view.getByText(/Start with 1,000 points/)).toBeTruthy();
    expect(view.getByText(/5 points per elapsed second/)).toBeTruthy();
    expect(view.getByText(/Hints unlock after three incorrect attempts/)).toBeTruthy();
    expect(view.getByText(/Each revealed hint deducts 150 points/)).toBeTruthy();
    expect(view.getByText(/Local practice result — unverified/)).toBeTruthy();
    expect(
      view.getByText(/Both presets contribute to the same session-local totals/),
    ).toBeTruthy();
    expect(view.getByText(/selected preset is retained with each result for context/)).toBeTruthy();
  });

  it('starts untimed, standard, extended, or back only after an explicit action', async () => {
    const onBack = jest.fn();
    const onStartTimed = jest.fn();
    const onStartUntimed = jest.fn();
    const view = await render(
      <TimedModeSetup
        onBack={onBack}
        onStartTimed={onStartTimed}
        onStartUntimed={onStartUntimed}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'UNTIMED JOURNEY' }));
    await fireEvent.press(view.getByRole('button', { name: 'START 2-MINUTE MODE' }));
    await fireEvent.press(view.getByRole('button', { name: 'START 4-MINUTE MODE' }));
    await fireEvent.press(view.getByRole('button', { name: 'BACK' }));

    expect(onStartUntimed).toHaveBeenCalledTimes(1);
    expect(onStartTimed).toHaveBeenNthCalledWith(1, 120);
    expect(onStartTimed).toHaveBeenNthCalledWith(2, 240);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
