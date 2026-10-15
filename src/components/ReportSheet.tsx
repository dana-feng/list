import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { Profile } from '@/api/db';
import { report, REPORT_REASONS, ReportReason, ReportTarget } from '@/api/safety';
import { colors } from '@/theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Mono, MonoMedium } from './Text';

/**
 * Report something: pick why, and it's sent, then a thank-you. `what` names the thing: "this
 * comment", "dana.f". `person` is whoever's responsible, when that's known. Blocking is separate,
 * from their profile.
 */
export function ReportSheet({ what, target, person, onClose }: { what: string; target: ReportTarget; person?: Profile; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const send = (reason: ReportReason) => {
    report(target, reason);
    setSent(true);
  };

  if (sent) {
    const account = !target.list_id && !target.item_id && !target.comment_id;
    const said = account && person
      ? `we’ll look into ${person.name}’s account. they won’t know who reported them.`
      : `we’ll look at it and take it down if it breaks our rules. ${person ? `${person.name} won’t` : 'nobody will'} know who reported it.`;
    return (
      <Sheet title="thanks for telling us" onClose={onClose} footer={<Button label="done" onPress={onClose} />}>
        <Mono size={12.5} style={{ lineHeight: 19 }}>{said}</Mono>
      </Sheet>
    );
  }

  return (
    <Sheet title={`report ${what}`} onClose={onClose}>
      {REPORT_REASONS.map((r) => (
        <Pressable key={r.key} onPress={() => send(r.key)} style={styles.row} accessibilityRole="button" accessibilityLabel={`Report for ${r.label}`}>
          <MonoMedium size={13}>{r.label}</MonoMedium>
          <Icon name="right" size={14} strokeWidth={2.2} />
        </Pressable>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 2, borderBottomWidth: 1.2, borderStyle: 'dashed', borderColor: colors.rule },
});
