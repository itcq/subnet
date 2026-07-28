import { StyleSheet, Text, View } from 'react-native';

export type AddressBlock = {
  start: number;
  end: number;
};

export type BlockRangeBoardProps = {
  blocks: readonly AddressBlock[];
  selectedStart: number;
  focusValue: number;
  blockSize: number;
};

export function BlockRangeBoard({
  blocks,
  selectedStart,
  focusValue,
  blockSize,
}: BlockRangeBoardProps) {
  const selectedBlock = blocks.find((block) => block.start === selectedStart);
  const summary = selectedBlock
    ? `Block range summary: value ${focusValue} is in selected block ${selectedBlock.start} through ${selectedBlock.end}`
    : `Block range summary: value ${focusValue}; no selected block`;

  return (
    <View style={styles.board}>
      <Text accessibilityLabel={summary} style={styles.summary}>
        {summary}
      </Text>
      <Text style={styles.blockSize}>Block size: {blockSize} addresses</Text>
      <Text style={styles.boundaries}>
        Boundaries: {blocks.map((block) => block.start).join(', ')}
      </Text>

      <View accessibilityLabel="Segmented address number line" style={styles.numberLine}>
        {blocks.map((block) => {
          const isSelected = block.start === selectedStart;
          return (
            <View
              key={`${block.start}-${block.end}`}
              style={[styles.segment, isSelected && styles.selectedSegment]}>
              <Text style={[styles.range, isSelected && styles.selectedText]}>
                {block.start}–{block.end}{isSelected ? ' — Selected block' : ''}
              </Text>
              {isSelected ? (
                <Text style={styles.focus}>{focusValue} — Given value</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  summary: {
    color: '#34495e',
    fontSize: 14,
    lineHeight: 20,
  },
  blockSize: {
    color: '#17202a',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    marginTop: 8,
  },
  boundaries: {
    color: '#475569',
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  numberLine: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  segment: {
    backgroundColor: '#f8fafc',
    borderColor: '#64748b',
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 108,
    padding: 9,
  },
  selectedSegment: {
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
    borderWidth: 2,
  },
  range: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  selectedText: {
    color: '#5b21b6',
    fontWeight: '900',
  },
  focus: {
    color: '#5b21b6',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 5,
  },
});
