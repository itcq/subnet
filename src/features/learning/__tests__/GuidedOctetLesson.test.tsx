import { fireEvent, render, type RenderResult } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { GuidedOctetLesson, createGuidedLessonModel } from '../GuidedOctetLesson';
import { createGuidedLessonModel as createExtractedModel } from '../guidedLessonModel';

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
  it.each([
    {
      address: '192.168.1.130',
      prefix: 26,
      targetBinary: '10000010',
      split: 'NNHHHHHH',
      mask: '255.255.255.192',
      maskBinary: '11111111.11111111.11111111.11000000',
      proof: '2^6 = 64',
      pattern: '10xxxxxx',
      range: '128–191',
      networkProof: '10000000',
      broadcastProof: '10111111',
    },
    {
      address: '10.20.30.70',
      prefix: 27,
      targetBinary: '01000110',
      split: 'NNNHHHHH',
      mask: '255.255.255.224',
      maskBinary: '11111111.11111111.11111111.11100000',
      proof: '2^5 = 32',
      pattern: '010xxxxx',
      range: '64–95',
      networkProof: '01000000',
      broadcastProof: '01011111',
    },
  ])('derives complete $prefix lesson proofs from the subnet engine', (expected) => {
    const model = createExtractedModel(expected.address, expected.prefix);

    expect(model.targetBinary).toBe(expected.targetBinary);
    expect(model.prefixSplit).toBe(expected.split);
    expect(model.facts.mask).toBe(expected.mask);
    expect(model.maskBinary).toBe(expected.maskBinary);
    expect(model.totalPatternsProof).toBe(expected.proof);
    expect(model.blockBinaryPattern).toBe(expected.pattern);
    expect(model.blockRangeText).toBe(expected.range);
    expect(model.networkOctetBinary).toBe(expected.networkProof);
    expect(model.broadcastOctetBinary).toBe(expected.broadcastProof);
    expect(model.networkHostProof).toContain(`${'0'.repeat(model.hostBitsInFinalOctet)} host bits`);
    expect(model.broadcastHostProof).toContain(`${'1'.repeat(model.hostBitsInFinalOctet)} host bits`);
    expect(model.textEquivalent).toContain(`${expected.address}/${expected.prefix}`);
    expect(model.textEquivalent).toContain(expected.mask);
    expect(Object.isFrozen(model)).toBe(true);
    expect(createGuidedLessonModel(expected.address, expected.prefix)).toEqual(model);
  });

  it.each([24, 25, 26, 27, 28, 29, 30])(
    'keeps every /%s fourth-octet lesson choice and proof coherent',
    (prefix) => {
      const model = createExtractedModel('192.168.1.130', prefix);

      expect(new Set(model.networkBitChoices).size).toBe(model.networkBitChoices.length);
      expect(new Set(model.maskOctetChoices).size).toBe(model.maskOctetChoices.length);
      expect(model.networkBitChoices).toContain(model.networkBitsInFinalOctet);
      expect(model.maskOctetChoices).toContain(model.maskOctet);
      expect(model.addressBlocks.some(({ start, end }) => model.targetOctet >= start && model.targetOctet <= end)).toBe(true);
      expect(model.blockStart).toBe(Number(model.facts.network.split('.')[3]));
      expect(model.blockEnd).toBe(Number(model.facts.broadcast.split('.')[3]));
    },
  );

  it.each([0, 23, 31, 32])('rejects /%s because this lesson teaches a fourth-octet boundary', (prefix) => {
    expect(() => createExtractedModel('192.168.1.130', prefix)).toThrow(
      'Guided octet lessons support prefixes from /24 through /30',
    );
  });

  it('supports the /24 edge of the fourth-octet lesson', () => {
    expect(createExtractedModel('192.168.1.130', 24).facts.network).toBe('192.168.1.0');
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

  it('opens with one beginner story from interface address to the fourth-octet boundary', async () => {
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} />);

    expect(view.getByText(/Goal: find the subnet that contains 192\.168\.1\.130/)).toBeTruthy();
    expect(view.getByText(/192\.168\.1\.130 is an address on one device interface.*not the subnet itself/)).toBeTruthy();
    expect(view.getByText(/\/26 means the first 26 of IPv4’s 32 bits identify the shared network/)).toBeTruthy();
    expect(view.getByText(/IPv4 has 32 bits, grouped into four 8-bit octets/)).toBeTruthy();

    await buildTargetAddress(view);

    expect(view.getByText(/The first three octets already account for 24 bits/)).toBeTruthy();
    expect(view.getByText(/That is why we zoom in on octet four, 130/)).toBeTruthy();
    expect(view.queryByText(/\/26 needs 2 more network bits/)).toBeNull();
    expect(view.queryByText('130 = 128 + 2')).toBeNull();
    expect(view.queryByText(/10000010.*Next, we will place the \/26 boundary/)).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Toggle binary place 128, currently off' }));
    await fireEvent.press(view.getByRole('button', { name: 'Toggle binary place 2, currently off' }));

    expect(view.getByText('130 = 128 + 2')).toBeTruthy();
    expect(view.getByText(/10000010.*Next, we will place the \/26 boundary/)).toBeTruthy();
  });

  it('reveals four connected whiteboard diagrams only after each result is established', async () => {
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} />);

    expect(view.queryByLabelText('Whiteboard: See what octet four stores')).toBeNull();
    await buildTargetAddress(view);
    expect(view.queryByLabelText('Whiteboard: See what octet four stores')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Toggle binary place 128, currently off' }));
    await fireEvent.press(view.getByRole('button', { name: 'Toggle binary place 2, currently off' }));
    expect(view.getByLabelText('Whiteboard: See what octet four stores')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Continue to network and host bits' }));
    await fireEvent.press(view.getByRole('button', { name: 'Choose 2 network bits in octet 4' }));
    await fireEvent.press(view.getByRole('button', { name: 'Continue to subnet mask' }));
    expect(view.queryByLabelText('Whiteboard: Turn /26 into a subnet mask')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Choose mask octet 192' }));
    expect(view.getByLabelText('Whiteboard: Turn /26 into a subnet mask')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Continue to block size' }));
    expect(view.queryByLabelText('Whiteboard: Find the block that contains 130')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Choose address block 128 through 191' }));
    expect(view.getByLabelText('Whiteboard: Find the block that contains 130')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Continue to full address range' }));
    expect(view.getByLabelText('Whiteboard: Assign each address a role')).toBeTruthy();
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

  it('allows four octet fields to wrap without shrinking digits away', async () => {
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} />);
    const rowStyle = StyleSheet.flatten(view.getByLabelText('Four IPv4 octet columns').props.style);
    const fieldStyle = StyleSheet.flatten(view.getByLabelText('Guided octet 1').props.style);

    expect(rowStyle.flexWrap).toBe('wrap');
    expect(fieldStyle.minWidth).toBeGreaterThanOrEqual(64);
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
    expect(view.queryByText('24 + 2 = 26 network bits')).toBeNull();

    const continueButton = view.getByRole('button', { name: 'Continue to subnet mask' });
    expect(continueButton.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(view.getByRole('button', { name: 'Choose 6 network bits in octet 4' }));
    expect(view.getByText(/Not quite.*6.*is the number of host bits left in octet 4/)).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Choose 2 network bits in octet 4' }));
    expect(view.getByText('24 + 2 = 26 network bits')).toBeTruthy();
    expect(view.getByText('26 network bits · 6 host bits')).toBeTruthy();
    expect(view.getByText('NNHHHHHH')).toBeTruthy();
    expect(continueButton.props.accessibilityState).toEqual({ disabled: false });

    await fireEvent.press(continueButton);

    expect(view.getByRole('header', { name: 'Build the Subnet Mask' })).toBeTruthy();
    expect(view.getByText('Step 4 of 6')).toBeTruthy();
  });

  it('teaches the prefix and mask as two views of the same boundary', async () => {
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} />);
    await buildTargetAddress(view);
    await buildBinary130(view);

    expect(view.queryByText('24 + 2 = 26 network bits')).toBeNull();
    expect(view.getByText(/Network bits identify the shared subnet/)).toBeTruthy();
    expect(view.getByText(/Host bits identify addresses inside that subnet/)).toBeTruthy();

    await choosePrefixSplit(view);

    expect(view.getByText(/A subnet mask is a measuring guide, not another device address/)).toBeTruthy();
    expect(view.getByText(/A mask 1 marks a network position; a mask 0 marks a host position/)).toBeTruthy();
    expect(view.queryByText('11000000 = 128 + 64 = 192')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Choose mask octet 192' }));
    expect(view.getByText('11000000 = 128 + 64 = 192')).toBeTruthy();
    expect(view.getByText('/26 = 255.255.255.192')).toBeTruthy();
  });

  it('keeps alternate-prefix choices derived and coherent', () => {
    const model = createExtractedModel('10.20.30.70', 27);

    expect(model.networkBitChoices).toEqual([2, 3, 5]);
    expect(model.maskOctetChoices).toEqual([192, 224, 240]);
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
    expect(view.getByText(/Not quite.*too high.*leading 1s/)).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Choose mask octet 128' }));
    expect(view.getByText(/Not quite.*too low.*every place marked 1/)).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Choose mask octet 192' }));
    expect(view.getAllByText('Subnet mask: 255.255.255.192')).toHaveLength(2);
    expect(continueButton.props.accessibilityState).toEqual({ disabled: false });

    await fireEvent.press(continueButton);

    expect(view.getByRole('header', { name: 'Find the Address Block' })).toBeTruthy();
    expect(view.getByText('Step 5 of 6')).toBeTruthy();
  });

  it('proves the block in binary before using the decimal shortcut and assigns address roles', async () => {
    const view = await render(<GuidedOctetLesson onBack={jest.fn()} />);
    await buildTargetAddress(view);
    await buildBinary130(view);
    await choosePrefixSplit(view);
    await buildSubnetMask(view);

    expect(view.getByText('6 host bits can make 2^6 = 64 total patterns.')).toBeTruthy();
    expect(view.getByText(/Decimal shortcut: 256 − 192 = 64/)).toBeTruthy();
    expect(view.queryByText(/10000010 fits 10xxxxxx/)).toBeNull();
    expect(view.queryByText(/fixed 10 selects decimal block 128–191/)).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Choose address block 192 through 255' }));
    expect(view.getByText('Not quite. 130 is less than the start of that block.')).toBeTruthy();
    expect(view.queryByText(/fixed 10 selects decimal block 128–191/)).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Choose address block 128 through 191' }));
    expect(view.getByText(/10000010 fits 10xxxxxx/)).toBeTruthy();
    expect(view.getByText(/fixed 10 selects decimal block 128–191/)).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Continue to full address range' }));

    expect(view.getByText(/10000000: 000000 host bits are all zero/)).toBeTruthy();
    expect(view.getByText(/10111111: 111111 host bits are all one/)).toBeTruthy();
    expect(view.getByText(/All host bits zero means network/)).toBeTruthy();
    expect(view.getByText(/All host bits one means broadcast/)).toBeTruthy();
    expect(view.getByText(/Addresses between them are traditionally usable for hosts/)).toBeTruthy();
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
