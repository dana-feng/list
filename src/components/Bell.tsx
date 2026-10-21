import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { colors } from '@/theme';
import { useScheme } from './Surface';
import { Icon } from './Icon';

/** The bell on Home's header. A green dot (never a number) while there's something you haven't seen. */
export function Bell() {
  const db = useDb();
  const dot = db.unseenNotifications;
  const { ground } = useScheme();
  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      style={styles.icon}
      accessibilityRole="button"
      accessibilityLabel={dot ? 'Notifications, something new' : 'Notifications'}
    >
      <Icon name="bell" size={21} color={colors.paper} strokeWidth={1.8} />
      {dot ? <View style={[styles.dot, { borderColor: ground }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 10, right: 10, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.olive, borderWidth: 2 },
});
