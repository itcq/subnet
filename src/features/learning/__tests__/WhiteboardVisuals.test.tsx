import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { AddressRoleBoard } from '../visuals/AddressRoleBoard';
import { BlockRangeBoard } from '../visuals/BlockRangeBoard';
import { LearningPathStrip } from '../visuals/LearningPathStrip';
import { OctetBinaryBoard } from '../visuals/OctetBinaryBoard';
import { PrefixMaskBoard } from '../visuals/PrefixMaskBoard';
import { WhiteboardFrame } from '../visuals/WhiteboardFrame';

describe('whiteboard visual primitives', () => {
  it('renders a warm native-text frame with a visible equivalent and hidden decoration', async () => {
    const view = await render(
      <WhiteboardFrame title="Binary octet" summary="130 is 10000010.">
        <Text>Lesson content</Text>
      </WhiteboardFrame>,
    );

    expect(view.getByRole('header', { name: 'Binary octet' })).toBeTruthy();
    expect(view.getByText('130 is 10000010.')).toBeTruthy();
    expect(view.getByText('Lesson content')).toBeTruthy();

    const frameStyle = StyleSheet.flatten(view.getByLabelText('Whiteboard: Binary octet').props.style);
    expect(frameStyle).toEqual(
      expect.objectContaining({
        alignSelf: 'stretch',
        backgroundColor: '#fffaf0',
        maxWidth: '100%',
        overflow: 'hidden',
      }),
    );

    const decoration = view.getByTestId('whiteboard-marker-accent', { includeHiddenElements: true });
    expect(decoration.props.accessibilityElementsHidden).toBe(true);
    expect(decoration.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('shows the connected learning path with a textual current-step marker and wrapping', async () => {
    const view = await render(
      <LearningPathStrip
        currentStep={3}
        steps={['Address + prefix', 'Boundary', 'Mask', 'Block', 'Range']}
      />,
    );

    expect(view.getByText('Address + prefix')).toBeTruthy();
    expect(view.getByText('Boundary')).toBeTruthy();
    expect(view.getByText('Mask — Current')).toBeTruthy();
    expect(view.getByText('Block')).toBeTruthy();
    expect(view.getByText('Range')).toBeTruthy();
    expect(view.getByLabelText('Learning path, step 3 of 5: Mask')).toBeTruthy();

    const stripStyle = StyleSheet.flatten(view.getByLabelText('Learning path').props.style);
    expect(stripStyle).toEqual(
      expect.objectContaining({ flexWrap: 'wrap', maxWidth: '100%' }),
    );
  });

  it('renders model-supplied octets, place values, and binary output as wrapping native text', async () => {
    const view = await render(
      <OctetBinaryBoard
        activeOctetIndex={3}
        activePlaces={[64, 4, 2]}
        binary="01000110"
        decimalValue={70}
        octets={['10', '20', '30', '70']}
        placeValues={[128, 64, 32, 16, 8, 4, 2, 1]}
      />,
    );

    expect(view.getByText('Octet 4: 70 — Current focus')).toBeTruthy();
    expect(view.getByText('Binary output: 01000110')).toBeTruthy();
    expect(view.getByText('Decimal value: 70')).toBeTruthy();
    expect(view.getByText('Active places: 64 + 4 + 2')).toBeTruthy();
    expect(view.getByLabelText('Octet board summary: 10.20.30.70; octet 4 is 70; binary 01000110')).toBeTruthy();

    const octetsStyle = StyleSheet.flatten(view.getByLabelText('IPv4 octets').props.style);
    const bitsStyle = StyleSheet.flatten(view.getByLabelText('Eight binary place values').props.style);
    expect(octetsStyle).toEqual(expect.objectContaining({ flexWrap: 'wrap', maxWidth: '100%' }));
    expect(bitsStyle).toEqual(expect.objectContaining({ flexWrap: 'wrap', maxWidth: '100%' }));
  });

  it('labels network and host bits independently of color for a model-supplied prefix and mask', async () => {
    const view = await render(
      <PrefixMaskBoard
        hostBits={5}
        mask="255.255.255.224"
        maskBinary="11111111.11111111.11111111.11100000"
        networkBits={27}
        octetPatterns={['NNNNNNNN', 'NNNNNNNN', 'NNNNNNNN', 'NNNHHHHH']}
        prefix={27}
        totalBits={32}
      />,
    );

    expect(view.getByText('/27 = 27 network bits + 5 host bits')).toBeTruthy();
    expect(view.getByText('Fourth octet: NNNHHHHH')).toBeTruthy();
    expect(view.getAllByText('N — Network')).toHaveLength(3);
    expect(view.getAllByText('H — Host')).toHaveLength(5);
    expect(view.getByText('Mask binary: 11111111.11111111.11111111.11100000')).toBeTruthy();
    expect(view.getByText('Subnet mask: 255.255.255.224')).toBeTruthy();
    expect(view.getByLabelText('/27 boundary: 27 network bits and 5 host bits; mask 255.255.255.224')).toBeTruthy();

    const overviewStyle = StyleSheet.flatten(view.getByLabelText('32-bit prefix overview').props.style);
    const finalOctetStyle = StyleSheet.flatten(view.getByLabelText('Enlarged fourth octet').props.style);
    expect(overviewStyle).toEqual(expect.objectContaining({ flexWrap: 'wrap', maxWidth: '100%' }));
    expect(finalOctetStyle).toEqual(expect.objectContaining({ flexWrap: 'wrap', maxWidth: '100%' }));
  });

  it('renders a segmented block range with visible selection and focus labels without scrolling', async () => {
    const blocks = Array.from({ length: 8 }, (_, index) => ({
      end: (index + 1) * 32 - 1,
      start: index * 32,
    }));
    const view = await render(
      <BlockRangeBoard blockSize={32} blocks={blocks} focusValue={70} selectedStart={64} />,
    );

    expect(view.getByText('Block size: 32 addresses')).toBeTruthy();
    expect(view.getByText('Boundaries: 0, 32, 64, 96, 128, 160, 192, 224')).toBeTruthy();
    expect(view.getByText('64–95 — Selected block')).toBeTruthy();
    expect(view.getByText('70 — Given value')).toBeTruthy();
    expect(view.getByLabelText('Block range summary: value 70 is in selected block 64 through 95')).toBeTruthy();

    const lineStyle = StyleSheet.flatten(view.getByLabelText('Segmented address number line').props.style);
    expect(lineStyle).toEqual(
      expect.objectContaining({ flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden' }),
    );
  });

  it('stacks every address role with text labels, proofs, and totals', async () => {
    const view = await render(
      <AddressRoleBoard
        broadcast="10.20.30.95"
        firstUsable="10.20.30.65"
        givenAddress="10.20.30.70"
        lastUsable="10.20.30.94"
        network="10.20.30.64"
        totalAddresses={32}
        usableHosts={30}
      />,
    );

    expect(view.getByText('Network (N · reserved): 10.20.30.64')).toBeTruthy();
    expect(view.getByText('Proof: all host bits are 0')).toBeTruthy();
    expect(view.getByText('First traditionally usable (✓): 10.20.30.65')).toBeTruthy();
    expect(view.getByText('Given IP (current focus): 10.20.30.70')).toBeTruthy();
    expect(view.getByText('Last traditionally usable (✓): 10.20.30.94')).toBeTruthy();
    expect(view.getByText('Broadcast (end · reserved): 10.20.30.95')).toBeTruthy();
    expect(view.getByText('Proof: all host bits are 1')).toBeTruthy();
    expect(view.getByText('32 total addresses · 30 traditionally usable hosts')).toBeTruthy();
    expect(view.getByLabelText('Address roles from 10.20.30.64 network through 10.20.30.95 broadcast; given IP 10.20.30.70')).toBeTruthy();

    const ladderStyle = StyleSheet.flatten(view.getByLabelText('Vertical address role ladder').props.style);
    expect(ladderStyle).toEqual(
      expect.objectContaining({ flexDirection: 'column', maxWidth: '100%', width: '100%' }),
    );
  });
});
