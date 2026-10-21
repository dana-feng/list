import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';
import { Button } from './Button';
import { Paper } from './Paper';
import { Hand, Mono } from './Text';
import { Surface } from './Surface';

export type ConfirmProps = {
  /** The question, short: "delete this list?" */
  title: string;
  /** What happens, when it's worth spelling out: "everything on it goes too." */
  body?: string;
  /** The button that does it: "delete list". */
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** What the other button says. */
  cancel?: string;
};

/**
 * "Are you sure?" as a card over a dimmed screen: the question, what happens, the action in dark
 * brown and a way out. Tapping outside the card is the same as cancel.
 * This one is a plain view, for showing over something that's already a popup (a menu, a sheet,
 * a folder held up close). On a plain screen use ConfirmDialog.
 */
export function ConfirmCard({ title, body, action, onConfirm, onCancel, cancel = 'cancel' }: ConfirmProps) {
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.dim }]} onPress={onCancel} accessibilityRole="button" accessibilityLabel={cancel} />
      <View style={styles.center} pointerEvents="box-none">
        <Paper fill={colors.cream} edge="ink" shape={4} style={styles.card}>
          <Hand size={22} style={{ lineHeight: 26 }}>{title}</Hand>
          {body ? <Mono size={12} color={colors.inkSoft} style={{ lineHeight: 18 }}>{body}</Mono> : null}
          <View style={{ gap: 8, marginTop: 8 }}>
            <Button label={action} onPress={onConfirm} />
            <Button label={cancel} tone="outline" onPress={onCancel} />
          </View>
        </Paper>
      </View>
    </View>
  );
}

/** ConfirmCard in a popup of its own, for plain screens. Shown while it's rendered. */
export function ConfirmDialog(props: ConfirmProps) {
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={props.onCancel}>
      <Surface tone="light">
      <ConfirmCard {...props} />
      </Surface>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  card: { padding: 20, gap: 8, shadowColor: '#3A1000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
});
