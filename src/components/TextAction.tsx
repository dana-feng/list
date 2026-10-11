import { Pressable } from 'react-native';
import { colors } from '@/theme';
import { Sans, SansBold } from './Text';

/** Plain-text header action: Edit, Save, Create, Add, Cancel. */
export function TextAction({ label, onPress, disabled, quiet }: { label: string; onPress: () => void; disabled?: boolean; quiet?: boolean }) {
  const Label = quiet ? Sans : SansBold;
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={12} accessibilityRole="button">
      <Label size={17} color={quiet ? colors.inkSoft : colors.ink} style={{ opacity: disabled ? 0.35 : 1 }}>
        {label}
      </Label>
    </Pressable>
  );
}
