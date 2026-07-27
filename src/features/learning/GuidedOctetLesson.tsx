import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
} from 'react-native';

import { subnetFacts } from '@/domain/subnet';

const TARGET_ADDRESS = '192.168.1.130';
const TARGET_PREFIX = 26;
const BINARY_PLACES = [128, 64, 32, 16, 8, 4, 2, 1] as const;

export function createGuidedLessonModel(address: string, prefix: number) {
  const facts = subnetFacts(address, prefix);
  const targetOctets = address.split('.').map(Number);
  const maskOctets = facts.mask.split('.').map(Number);
  const networkBitsInFinalOctet = Math.max(0, Math.min(8, prefix - 24));
  const targetOctet = targetOctets[3];
  const maskOctet = maskOctets[3];
  const blockStart = Number(facts.network.split('.')[3]);
  const blockEnd = Number(facts.broadcast.split('.')[3]);

  return {
    address,
    prefix,
    facts,
    targetOctets: targetOctets.map(String),
    targetOctet,
    targetPlaces: BINARY_PLACES.filter((place) => (targetOctet & place) !== 0),
    networkBitsInFinalOctet,
    hostBitsInFinalOctet: 8 - networkBitsInFinalOctet,
    maskOctet,
    maskPlaces: BINARY_PLACES.filter((place) => (maskOctet & place) !== 0),
    maskBinary: maskOctets.map((octet) => octet.toString(2).padStart(8, '0')).join('.'),
    blockSize: facts.blockSize,
    blockStart,
    blockEnd,
    boundaries: Array.from({ length: 256 / facts.blockSize }, (_, index) => index * facts.blockSize),
  };
}

const LESSON_MODEL = createGuidedLessonModel(TARGET_ADDRESS, TARGET_PREFIX);
const LESSON_FACTS = LESSON_MODEL.facts;
const TARGET_OCTETS = LESSON_MODEL.targetOctets;
const ADDRESS_BLOCKS = Array.from(
  { length: 256 / LESSON_MODEL.blockSize },
  (_, index) => ({
    start: index * LESSON_MODEL.blockSize,
    end: (index + 1) * LESSON_MODEL.blockSize - 1,
  }),
);

type GuidedOctetLessonProps = {
  onBack: () => void;
  scrollToTop?: (options: { animated: false; y: 0 }) => void;
};

function sanitizeOctet(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 3);
  if (digits === '') {
    return '';
  }
  return String(Math.min(255, Number(digits)));
}

export function GuidedOctetLesson({ onBack, scrollToTop }: GuidedOctetLessonProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [octets, setOctets] = useState(['', '', '', '']);
  const [binaryBits, setBinaryBits] = useState(BINARY_PLACES.map(() => false));
  const [selectedNetworkBits, setSelectedNetworkBits] = useState<number | null>(null);
  const [selectedMaskOctet, setSelectedMaskOctet] = useState<number | null>(null);
  const [selectedBlockStart, setSelectedBlockStart] = useState<number | null>(null);
  const addressComplete = octets.every((octet, index) => octet === TARGET_OCTETS[index]);
  const binaryTotal = BINARY_PLACES.reduce(
    (total, place, index) => total + (binaryBits[index] ? place : 0),
    0,
  );
  const binaryValue = binaryBits.map((bit) => (bit ? '1' : '0')).join('');
  const selectedBlock = ADDRESS_BLOCKS.find((block) => block.start === selectedBlockStart);

  function updateOctet(index: number, value: string) {
    setOctets((current) =>
      current.map((octet, octetIndex) =>
        octetIndex === index ? sanitizeOctet(value) : octet,
      ),
    );
  }

  function toggleBinaryBit(index: number) {
    setBinaryBits((current) => current.map((bit, bitIndex) => (bitIndex === index ? !bit : bit)));
  }

  function resetScroll() {
    const options = { animated: false, y: 0 } as const;
    scrollRef.current?.scrollTo(options);
    scrollToTop?.(options);
  }

  function advanceTo(nextStep: 2 | 3 | 4 | 5 | 6) {
    setStep(nextStep);
    resetScroll();
  }

  function replayLesson() {
    setStep(1);
    setOctets(['', '', '', '']);
    setBinaryBits(BINARY_PLACES.map(() => false));
    setSelectedNetworkBits(null);
    setSelectedMaskOctet(null);
    setSelectedBlockStart(null);
    resetScroll();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityLabel="Back to Learn Subnetting"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹ Back to Learn Subnetting</Text>
        </Pressable>

        <Text style={styles.stepLabel}>Step {step} of 6</Text>

        {step === 1 ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              Build an IPv4 Address
            </Text>
            <Text style={styles.body}>
              IPv4 addresses have four number columns. Each column is an octet: eight bits with a decimal value from 0 through 255.
            </Text>
            <View style={styles.lessonCard}>
              <Text style={styles.cardLabel}>TYPE THIS ADDRESS</Text>
              <Text style={styles.target}>192.168.1.130</Text>
              <View accessibilityLabel="Four IPv4 octet columns" style={styles.octetRow}>
                {octets.map((octet, index) => (
                  <View key={index} style={styles.octetGroup}>
                    <TextInput
                      accessibilityLabel={`Guided octet ${index + 1}`}
                      inputMode="numeric"
                      keyboardType="number-pad"
                      maxLength={3}
                      onChangeText={(value) => updateOctet(index, value)}
                      placeholder={TARGET_OCTETS[index]}
                      placeholderTextColor="#506579"
                      style={styles.octetInput}
                      value={octet}
                    />
                    {index < 3 ? <Text style={styles.dot}>.</Text> : null}
                  </View>
                ))}
              </View>
              <Text style={styles.helper}>
                The periods separate the four octets. Complete every column to continue.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Continue to binary bits"
              accessibilityRole="button"
              accessibilityState={{ disabled: !addressComplete }}
              disabled={!addressComplete}
              onPress={() => advanceTo(2)}
              style={({ pressed }) => [
                styles.primaryButton,
                !addressComplete && styles.buttonDisabled,
                pressed && addressComplete && styles.pressed,
              ]}>
              <Text style={styles.primaryButtonText}>CONTINUE TO BINARY BITS →</Text>
            </Pressable>
          </>
        ) : step === 2 ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              Count the Bits
            </Text>
            <Text style={styles.body}>
              One octet is one byte: eight bits. Turn on the place values that add up to the final octet, {LESSON_MODEL.targetOctet}.
            </Text>
            <View accessibilityLabel="Binary place values for one octet" style={styles.lessonCard}>
              <Text style={styles.cardLabel}>BINARY PLACE VALUES</Text>
              <View accessibilityLabel="Binary place value controls" style={styles.binaryRow}>
                {BINARY_PLACES.map((place, index) => {
                  const active = binaryBits[index];
                  return (
                    <Pressable
                      key={place}
                      accessibilityLabel={`Toggle binary place ${place}, currently ${active ? 'on' : 'off'}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => toggleBinaryBit(index)}
                      style={({ pressed }) => [
                        styles.bitButton,
                        active && styles.bitButtonActive,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={[styles.bitPlace, active && styles.bitPlaceActive]}>{place}</Text>
                      <Text style={[styles.bitValue, active && styles.bitValueActive]}>{active ? '1' : '0'}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text accessibilityLiveRegion="polite" style={styles.binaryReadout}>Binary: {binaryValue}</Text>
              <Text accessibilityLiveRegion="polite" style={styles.binaryTotal}>Decimal total: {binaryTotal}</Text>
              <Text style={styles.helper}>
                {LESSON_MODEL.targetOctet} = {LESSON_MODEL.targetPlaces.join(' + ')}, so only those bit positions are on.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Continue to network and host bits"
              accessibilityRole="button"
              accessibilityState={{ disabled: binaryTotal !== LESSON_MODEL.targetOctet }}
              disabled={binaryTotal !== LESSON_MODEL.targetOctet}
              onPress={() => advanceTo(3)}
              style={({ pressed }) => [
                styles.primaryButton,
                binaryTotal !== LESSON_MODEL.targetOctet && styles.buttonDisabled,
                pressed && binaryTotal === LESSON_MODEL.targetOctet && styles.pressed,
              ]}>
              <Text style={styles.primaryButtonText}>CONTINUE TO THE /26 PREFIX →</Text>
            </Pressable>
          </>
        ) : step === 3 ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              Count Network and Host Bits
            </Text>
            <Text style={styles.body}>
              A /26 prefix assigns 26 of the address’s 32 bits to the network. The rest identify hosts inside that network.
            </Text>
            <View style={styles.lessonCard}>
              <Text style={styles.cardLabel}>FOLLOW THE /26 PREFIX</Text>
              <Text style={styles.prefixSummary}>24 network bits fill the first three octets.</Text>
              <View accessibilityLabel="Network bits by octet" style={styles.octetBitRow}>
                <Text style={styles.fullNetworkOctet}>8 network</Text>
                <Text style={styles.fullNetworkOctet}>8 network</Text>
                <Text style={styles.fullNetworkOctet}>8 network</Text>
                <Text style={styles.partialOctet}>?</Text>
              </View>
              <Text style={styles.question}>How many network bits continue into octet 4?</Text>
              <View style={styles.choiceRow}>
                {[1, 2, 6].map((count) => (
                  <Pressable
                    key={count}
                    accessibilityLabel={`Choose ${count} network bit${count === 1 ? '' : 's'} in octet 4`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedNetworkBits === count }}
                    onPress={() => setSelectedNetworkBits(count)}
                    style={({ pressed }) => [
                      styles.choiceButton,
                      selectedNetworkBits === count && styles.choiceButtonSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.choiceText}>{count}</Text>
                  </Pressable>
                ))}
              </View>
              {selectedNetworkBits === LESSON_MODEL.hostBitsInFinalOctet ? (
                <Text accessibilityLiveRegion="polite" style={styles.correction}>
                  Not quite. {LESSON_MODEL.hostBitsInFinalOctet} is the number of host bits left in octet 4.
                </Text>
              ) : selectedNetworkBits !== null && selectedNetworkBits !== LESSON_MODEL.networkBitsInFinalOctet ? (
                <Text accessibilityLiveRegion="polite" style={styles.correction}>
                  Not quite. Subtract the first 24 network bits from {TARGET_PREFIX}.
                </Text>
              ) : null}
              {selectedNetworkBits === LESSON_MODEL.networkBitsInFinalOctet ? (
                <View accessibilityLiveRegion="polite" style={styles.successPanel}>
                  <Text style={styles.successTitle}>{TARGET_PREFIX} network bits · {32 - TARGET_PREFIX} host bits</Text>
                  <Text style={styles.bitSplit}>{'N'.repeat(LESSON_MODEL.networkBitsInFinalOctet)}{'H'.repeat(LESSON_MODEL.hostBitsInFinalOctet)}</Text>
                  <Text style={styles.helper}>N means network. H means host. {LESSON_MODEL.networkBitsInFinalOctet} plus {LESSON_MODEL.hostBitsInFinalOctet} fills the fourth octet’s eight bits.</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel="Continue to subnet mask"
              accessibilityRole="button"
              accessibilityState={{ disabled: selectedNetworkBits !== LESSON_MODEL.networkBitsInFinalOctet }}
              disabled={selectedNetworkBits !== LESSON_MODEL.networkBitsInFinalOctet}
              onPress={() => advanceTo(4)}
              style={({ pressed }) => [
                styles.primaryButton,
                selectedNetworkBits !== LESSON_MODEL.networkBitsInFinalOctet && styles.buttonDisabled,
                pressed && selectedNetworkBits === LESSON_MODEL.networkBitsInFinalOctet && styles.pressed,
              ]}>
              <Text style={styles.primaryButtonText}>BUILD THE SUBNET MASK →</Text>
            </Pressable>
          </>
        ) : step === 4 ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              Build the Subnet Mask
            </Text>
            <Text style={styles.body}>
              Network bits become 1s in the subnet mask. Host bits become 0s.
            </Text>
            <View style={styles.lessonCard}>
              <Text style={styles.cardLabel}>BINARY SUBNET MASK</Text>
              <Text style={styles.maskBinary}>{LESSON_MODEL.maskBinary}</Text>
              <Text style={styles.question}>What decimal value is {LESSON_MODEL.maskBinary.split('.')[3]}?</Text>
              <View style={styles.choiceRow}>
                {[128, 192, 224].map((value) => (
                  <Pressable
                    key={value}
                    accessibilityLabel={`Choose mask octet ${value}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedMaskOctet === value }}
                    onPress={() => setSelectedMaskOctet(value)}
                    style={({ pressed }) => [
                      styles.choiceButton,
                      selectedMaskOctet === value && styles.choiceButtonSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.choiceText}>{value}</Text>
                  </Pressable>
                ))}
              </View>
              {selectedMaskOctet !== null && selectedMaskOctet !== LESSON_MODEL.maskOctet ? (
                <Text accessibilityLiveRegion="polite" style={styles.correction}>
                  Not quite. Add the active place values: {LESSON_MODEL.maskPlaces.join(' + ')}.
                </Text>
              ) : null}
              {selectedMaskOctet === LESSON_MODEL.maskOctet ? (
                <View accessibilityLiveRegion="polite" style={styles.successPanel}>
                  <Text style={styles.successTitle}>Subnet mask: {LESSON_FACTS.mask}</Text>
                  <Text style={styles.helper}>The first three octets are all network bits, so each becomes 255. The final mask octet is {LESSON_MODEL.maskPlaces.join(' + ')} = {LESSON_MODEL.maskOctet}.</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel="Continue to block size"
              accessibilityRole="button"
              accessibilityState={{ disabled: selectedMaskOctet !== LESSON_MODEL.maskOctet }}
              disabled={selectedMaskOctet !== LESSON_MODEL.maskOctet}
              onPress={() => advanceTo(5)}
              style={({ pressed }) => [
                styles.primaryButton,
                selectedMaskOctet !== LESSON_MODEL.maskOctet && styles.buttonDisabled,
                pressed && selectedMaskOctet === LESSON_MODEL.maskOctet && styles.pressed,
              ]}>
              <Text style={styles.primaryButtonText}>FIND THE ADDRESS BLOCK →</Text>
            </Pressable>
          </>
        ) : step === 5 ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              Find the Address Block
            </Text>
            <Text style={styles.body}>
              Subtract the final mask octet from 256 to find the size of each fourth-octet block.
            </Text>
            <View style={styles.lessonCard}>
              <Text style={styles.cardLabel}>BLOCK SIZE</Text>
              <Text style={styles.formula}>256 − {LESSON_MODEL.maskOctet} = {LESSON_MODEL.blockSize}</Text>
              <Text style={styles.helper}>Start at 0 and count by {LESSON_MODEL.blockSize}: {LESSON_MODEL.boundaries.join(', ')}.</Text>
              <Text style={styles.question}>Which fourth-octet block contains {LESSON_MODEL.targetOctet}?</Text>
              <View style={styles.blockGrid}>
                {ADDRESS_BLOCKS.map((block) => (
                  <Pressable
                    key={block.start}
                    accessibilityLabel={`Choose address block ${block.start} through ${block.end}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedBlockStart === block.start }}
                    onPress={() => setSelectedBlockStart(block.start)}
                    style={({ pressed }) => [
                      styles.blockButton,
                      selectedBlockStart === block.start && styles.choiceButtonSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.blockText}>{block.start}–{block.end}</Text>
                  </Pressable>
                ))}
              </View>
              {selectedBlockStart === LESSON_MODEL.blockStart ? (
                <Text accessibilityLiveRegion="polite" style={styles.correctFeedback}>
                  Correct. {LESSON_MODEL.targetOctet} falls between {LESSON_MODEL.blockStart} and {LESSON_MODEL.blockEnd}.
                </Text>
              ) : selectedBlock !== undefined ? (
                <Text accessibilityLiveRegion="polite" style={styles.correction}>
                  {LESSON_MODEL.targetOctet > selectedBlock.end
                    ? `Not quite. ${LESSON_MODEL.targetOctet} is greater than the end of that block.`
                    : `Not quite. ${LESSON_MODEL.targetOctet} is less than the start of that block.`}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel="Continue to full address range"
              accessibilityRole="button"
              accessibilityState={{ disabled: selectedBlockStart !== LESSON_MODEL.blockStart }}
              disabled={selectedBlockStart !== LESSON_MODEL.blockStart}
              onPress={() => advanceTo(6)}
              style={({ pressed }) => [
                styles.primaryButton,
                selectedBlockStart !== LESSON_MODEL.blockStart && styles.buttonDisabled,
                pressed && selectedBlockStart === LESSON_MODEL.blockStart && styles.pressed,
              ]}>
              <Text style={styles.primaryButtonText}>READ THE FULL RANGE →</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              Read the Subnet Range
            </Text>
            <Text style={styles.body}>
              The first address names the network. The last is the broadcast. Hosts use the addresses between them.
            </Text>
            <View style={styles.lessonCard}>
              <Text style={styles.cardLabel}>{TARGET_ADDRESS}/{TARGET_PREFIX}</Text>
              <Text style={styles.rangeLine}>Network address: {LESSON_FACTS.network}</Text>
              <Text style={styles.rangeLine}>First usable: {LESSON_FACTS.firstHost}</Text>
              <Text style={styles.rangeLine}>Last usable: {LESSON_FACTS.lastHost}</Text>
              <Text style={styles.rangeLine}>Broadcast: {LESSON_FACTS.broadcast}</Text>
              <View style={styles.successPanel}>
                <Text style={styles.successTitle}>{LESSON_FACTS.totalAddresses} total addresses · {LESSON_FACTS.usableHosts} usable hosts</Text>
                <Text style={styles.helper}>You built the address, counted the bits, formed the mask, found the block, and read the range.</Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Replay guided lesson"
              accessibilityRole="button"
              onPress={replayLesson}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>REPLAY THIS LESSON ↻</Text>
            </Pressable>
            <Text style={styles.localNote}>Optional local practice. Replaying does not change Journey progress or rankings.</Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#07111F', flex: 1 },
  content: {
    alignSelf: 'center',
    maxWidth: 760,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 8,
    width: '100%',
  },
  backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, paddingHorizontal: 10 },
  backText: { color: '#D7E4EF', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  stepLabel: { color: '#69F0CB', fontSize: 12, fontWeight: '900', letterSpacing: 1.1, marginTop: 24 },
  title: { color: '#F5F8FB', fontSize: 30, fontWeight: '900', lineHeight: 38, marginTop: 8 },
  body: { color: '#C8D4E0', fontSize: 16, lineHeight: 24, marginTop: 12 },
  lessonCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 22,
    padding: 18,
  },
  cardLabel: { color: '#7FA0BC', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  target: { color: '#F6C857', fontSize: 24, fontVariant: ['tabular-nums'], fontWeight: '900', marginTop: 8 },
  octetRow: { flexDirection: 'row', marginTop: 18, width: '100%' },
  octetGroup: { alignItems: 'center', flexBasis: 0, flexDirection: 'row', flexGrow: 1, minWidth: 0 },
  octetInput: {
    backgroundColor: '#091827',
    borderColor: '#31516F',
    borderRadius: 10,
    borderWidth: 1,
    color: '#FFFFFF',
    cursorColor: '#F6C857',
    flex: 1,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    minHeight: 52,
    minWidth: 0,
    paddingHorizontal: 4,
    textAlign: 'center',
    WebkitTextFillColor: '#FFFFFF',
  } as TextStyle,
  dot: { color: '#9BACBE', flexShrink: 0, fontSize: 20, fontWeight: '900', paddingHorizontal: 3 },
  helper: { color: '#9FB2C5', fontSize: 14, lineHeight: 21, marginTop: 14 },
  binaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 16, width: '100%' },
  bitButton: {
    alignItems: 'center',
    backgroundColor: '#091827',
    borderColor: '#31516F',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 56,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 64,
    minWidth: 56,
    paddingVertical: 6,
  },
  bitButtonActive: { backgroundColor: '#173A43', borderColor: '#47E5BC' },
  bitPlace: { color: '#8EA4B8', fontSize: 11, fontVariant: ['tabular-nums'], fontWeight: '800' },
  bitPlaceActive: { color: '#D9FFF5' },
  bitValue: { color: '#C8D4E0', fontSize: 20, fontWeight: '900', marginTop: 5 },
  bitValueActive: { color: '#69F0CB' },
  binaryReadout: { color: '#F5F8FB', fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '900', marginTop: 18 },
  binaryTotal: { color: '#F6C857', fontSize: 16, fontVariant: ['tabular-nums'], fontWeight: '800', marginTop: 6 },
  prefixSummary: { color: '#F5F8FB', fontSize: 17, fontWeight: '800', lineHeight: 24, marginTop: 12 },
  octetBitRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  fullNetworkOctet: {
    backgroundColor: '#173A43',
    borderColor: '#47E5BC',
    borderRadius: 8,
    borderWidth: 1,
    color: '#D9FFF5',
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingVertical: 10,
    textAlign: 'center',
  },
  partialOctet: {
    backgroundColor: '#102338',
    borderColor: '#F6C857',
    borderRadius: 8,
    borderWidth: 1,
    color: '#F6C857',
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    overflow: 'hidden',
    paddingVertical: 7,
    textAlign: 'center',
  },
  question: { color: '#D5E0EA', fontSize: 16, fontWeight: '700', lineHeight: 23, marginTop: 18 },
  choiceRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  choiceButton: {
    alignItems: 'center',
    backgroundColor: '#102338',
    borderColor: '#31516F',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  choiceButtonSelected: { backgroundColor: '#173A43', borderColor: '#47E5BC' },
  choiceText: { color: '#F5F8FB', fontSize: 18, fontWeight: '900' },
  correction: { color: '#FFD6DC', fontSize: 14, lineHeight: 21, marginTop: 14 },
  successPanel: { backgroundColor: '#102F34', borderRadius: 10, marginTop: 14, padding: 14 },
  successTitle: { color: '#69F0CB', fontSize: 16, fontWeight: '900' },
  bitSplit: { color: '#F6C857', fontSize: 22, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: 3, marginTop: 8 },
  maskBinary: { color: '#F6C857', fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '900', lineHeight: 22, marginTop: 12 },
  formula: { color: '#F6C857', fontSize: 28, fontVariant: ['tabular-nums'], fontWeight: '900', marginTop: 10 },
  blockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  blockButton: {
    alignItems: 'center',
    backgroundColor: '#102338',
    borderColor: '#31516F',
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  blockText: { color: '#F5F8FB', fontSize: 16, fontVariant: ['tabular-nums'], fontWeight: '900' },
  correctFeedback: { color: '#69F0CB', fontSize: 14, fontWeight: '800', lineHeight: 21, marginTop: 14 },
  rangeLine: { color: '#F5F8FB', fontSize: 16, fontVariant: ['tabular-nums'], fontWeight: '800', lineHeight: 24, marginTop: 10 },
  localNote: { color: '#8296A9', fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#F6C857',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: '#101820', fontSize: 14, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center' },
  buttonDisabled: { opacity: 0.38 },
});
