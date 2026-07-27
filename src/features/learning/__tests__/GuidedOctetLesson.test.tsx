import { fireEvent, render, type RenderResult } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { GuidedOctetLesson, createGuidedLessonModel } from '../GuidedOctetLesson';

async function buildTargetAddress(view: RenderResult) {
  await fireEvent.changeText(view.getByLabelText('Guided octet 1'), '192');
  await fireEvent.changeText(view.getByLabelText('Guided octet 2'), '168');
  await fireEvent.changeText(view.getByLabelText('Guided octet 3'), '1');
  await fireEvent.changeText(view.getByLabelText('Guided octet 4'), '130');
  await fireEvent.press(view.getByRole('button', { name: 'Continue to binary bits' }));
}

async function buildBinary130(view: RenderResult) {
  await fireEvent.press(view.getByRole('button', { name: 'Toggle binary place 128, currently off' }));
  await fireEvent.press(view.getByRole('button', { name: 'Toggle binary place 2, currently off' }));
  await fireEvent.press(view.getByRole('button', { name: 'Continue to network and host bits' }));
}

async function choosePrefixSplit(view: RenderResult) {
  await fireEvent.press(view.getByRole('button', { name: 'Choose 2 network bits in octet 4' }));
  await fireEvent.press(view.getByRole('button', { name: 'Continue to subnet mask' }));
}

async function buildSubnetMask(view: RenderResult) {
  await fireEvent.press(view.getByRole('button', { name: 'Choose mask octet 192' }));
  await fireEvent.press(view.getByRole('button', { name: 'Continue to block size' }));
}

describe('GuidedOctetLesson', () => {
  it('derives every correctness gate and explanation value from the subnet engine', () => {
    const model = createGuidedLessonModel('10.20.30.70', 27);

    expect(model.targetOctet).toBe(70);
    expect(model.networkBitsInFinalOctet).toBe(3);
    expect(model.hostBitsInFinalOctet).toBe(5);
    expect(model.maskOctet).toBe(224);
    expect(model.maskBinary).toBe('11111111.11111111.11111111.11100000');
    expect(model.blockSize).toBe(32);
    expect(model.blockStart).toBe(64);
    expect(model.blockEnd).toBe(95);
    expect(model.boundaries).toEqual([0, 32, 64, 96, 128, 160, 192, 224]);
  });

  it('builds the target address in four octet columns before advancing to bits', async () => {
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} />);

    expect(view.getByRole('header', { name: 'Build an IPv4 Address' })).toBeTruthy();
    expect(view.getByText('Step 1 of 6')).toBeTruthy();

    const continueButton = view.getByRole('button', { name: 'Continue to binary bits' });
    expect(continueButton.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.changeText(view.getByLabelText('Guided octet 1'), '192');
    await fireEvent.changeText(view.getByLabelText('Guided octet 2'), '168');
    await fireEvent.changeText(view.getByLabelText('Guided octet 3'), '1');
    await fireEvent.changeText(view.getByLabelText('Guided octet 4'), '130');

    expect(view.getByDisplayValue('192')).toBeTruthy();
    expect(view.getByDisplayValue('168')).toBeTruthy();
    expect(view.getByDisplayValue('1')).toBeTruthy();
    expect(view.getByDisplayValue('130')).toBeTruthy();
    expect(continueButton.props.accessibilityState).toEqual({ disabled: false });

    await fireEvent.press(continueButton);

    expect(view.getByRole('header', { name: 'Count the Bits' })).toBeTruthy();
    expect(view.getByText('Step 2 of 6')).toBeTruthy();
  });

  it('returns the lesson scroller to the top after advancing', async () => {
    const scrollTo = jest.fn();
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} scrollToTop={scrollTo} />);

    await buildTargetAddress(view);

    expect(scrollTo).toHaveBeenCalledWith({ animated: false, y: 0 });
  });

  it('wraps binary controls without shrinking below a practical touch width', async () => {
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} />);
    await buildTargetAddress(view);

    const boardStyle = StyleSheet.flatten(
      view.getByLabelText('Binary place value controls').props.style,
    );
    const bitStyle = StyleSheet.flatten(
      view.getByRole('button', { name: 'Toggle binary place 128, currently off' }).props.style,
    );

    expect(boardStyle).toEqual(expect.objectContaining({ flexWrap: 'wrap' }));
    expect(bitStyle.minHeight).toBeGreaterThanOrEqual(44);
    expect(bitStyle.minWidth).toBeGreaterThanOrEqual(44);
  });

  it('lets the learner build decimal 130 from eight binary place values', async () => {
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} />);
    await buildTargetAddress(view);

    expect(view.getByText('128')).toBeTruthy();
    expect(view.getByText('64')).toBeTruthy();
    expect(view.getByText('32')).toBeTruthy();
    expect(view.getByText('16')).toBeTruthy();
    expect(view.getByText('8')).toBeTruthy();
    expect(view.getByText('4')).toBeTruthy();
    expect(view.getByText('2')).toBeTruthy();
    expect(view.getByText('1')).toBeTruthy();
    expect(view.getByText('Binary: 00000000')).toBeTruthy();
    expect(view.getByText('Decimal total: 0')).toBeTruthy();

    const continueButton = view.getByRole('button', { name: 'Continue to network and host bits' });
    expect(continueButton.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(view.getByRole('button', { name: 'Toggle binary place 128, currently off' }));
    await fireEvent.press(view.getByRole('button', { name: 'Toggle binary place 2, currently off' }));

    expect(view.getByText('Binary: 10000010')).toBeTruthy();
    expect(view.getByText('Decimal total: 130')).toBeTruthy();
    expect(continueButton.props.accessibilityState).toEqual({ disabled: false });

    await fireEvent.press(continueButton);

    expect(view.getByRole('header', { name: 'Count Network and Host Bits' })).toBeTruthy();
    expect(view.getByText('Step 3 of 6')).toBeTruthy();
  });

  it('teaches how a /26 prefix crosses into the fourth octet', async () => {
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} />);
    await buildTargetAddress(view);
    await buildBinary130(view);

    expect(view.getByText('24 network bits fill the first three octets.')).toBeTruthy();
    expect(view.getByText('How many network bits continue into octet 4?')).toBeTruthy();

    const continueButton = view.getByRole('button', { name: 'Continue to subnet mask' });
    expect(continueButton.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(view.getByRole('button', { name: 'Choose 6 network bits in octet 4' }));
    expect(view.getByText(/Not quite.*6.*is the number of host bits left in octet 4/)).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Choose 2 network bits in octet 4' }));
    expect(view.getByText('26 network bits · 6 host bits')).toBeTruthy();
    expect(view.getByText('NNHHHHHH')).toBeTruthy();
    expect(continueButton.props.accessibilityState).toEqual({ disabled: false });

    await fireEvent.press(continueButton);

    expect(view.getByRole('header', { name: 'Build the Subnet Mask' })).toBeTruthy();
    expect(view.getByText('Step 4 of 6')).toBeTruthy();
  });

  it('builds the /26 subnet mask from network bits', async () => {
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} />);
    await buildTargetAddress(view);
    await buildBinary130(view);
    await choosePrefixSplit(view);

    expect(view.getByText('11111111.11111111.11111111.11000000')).toBeTruthy();
    expect(view.getByText('What decimal value is 11000000?')).toBeTruthy();

    const continueButton = view.getByRole('button', { name: 'Continue to block size' });
    expect(continueButton.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(view.getByRole('button', { name: 'Choose mask octet 224' }));
    expect(view.getByText(/Not quite. Add the active place values:.*128 \+ 64/)).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Choose mask octet 192' }));
    expect(view.getByText('Subnet mask: 255.255.255.192')).toBeTruthy();
    expect(continueButton.props.accessibilityState).toEqual({ disabled: false });

    await fireEvent.press(continueButton);

    expect(view.getByRole('header', { name: 'Find the Address Block' })).toBeTruthy();
    expect(view.getByText('Step 5 of 6')).toBeTruthy();
  });

  it('finds the block containing 130 and completes the usable range', async () => {
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} />);
    await buildTargetAddress(view);
    await buildBinary130(view);
    await choosePrefixSplit(view);
    await buildSubnetMask(view);

    expect(view.getByText('256 − 192 = 64')).toBeTruthy();
    expect(view.getByText('Which fourth-octet block contains 130?')).toBeTruthy();

    const continueButton = view.getByRole('button', { name: 'Continue to full address range' });
    expect(continueButton.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(view.getByRole('button', { name: 'Choose address block 64 through 127' }));
    expect(view.getByText('Not quite. 130 is greater than the end of that block.')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Choose address block 128 through 191' }));
    expect(view.getByText('Correct. 130 falls between 128 and 191.')).toBeTruthy();
    expect(continueButton.props.accessibilityState).toEqual({ disabled: false });

    await fireEvent.press(continueButton);

    expect(view.getByRole('header', { name: 'Read the Subnet Range' })).toBeTruthy();
    expect(view.getByText('Step 6 of 6')).toBeTruthy();
    expect(view.getByText('Network address: 192.168.1.128')).toBeTruthy();
    expect(view.getByText('First usable: 192.168.1.129')).toBeTruthy();
    expect(view.getByText('Last usable: 192.168.1.190')).toBeTruthy();
    expect(view.getByText('Broadcast: 192.168.1.191')).toBeTruthy();
    expect(view.getByText('64 total addresses · 62 usable hosts')).toBeTruthy();
  });

  it('replays locally and returns to Learn Subnetting without changing progress', async () => {
    const onBack = jest.fn();
    const scrollToTop = jest.fn();
    const view = await render(<GuidedOctetLesson onBack={onBack} scrollToTop={scrollToTop} />);
    await buildTargetAddress(view);
    await buildBinary130(view);
    await choosePrefixSplit(view);
    await buildSubnetMask(view);
    await fireEvent.press(view.getByRole('button', { name: 'Choose address block 128 through 191' }));
    await fireEvent.press(view.getByRole('button', { name: 'Continue to full address range' }));

    scrollToTop.mockClear();
    await fireEvent.press(view.getByRole('button', { name: 'Replay guided lesson' }));
    expect(view.getByRole('header', { name: 'Build an IPv4 Address' })).toBeTruthy();
    expect(view.getByLabelText('Guided octet 1').props.value).toBe('');
    expect(scrollToTop).toHaveBeenCalledWith({ animated: false, y: 0 });

    await fireEvent.press(view.getByRole('button', { name: 'Back to Learn Subnetting' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
