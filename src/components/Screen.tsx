import { ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { refresh } from '@/api/sync';
import { colors, space, TAB_BAR_HEIGHT } from '@/theme';
import { TabBar, TabName } from './TabBar';

type Props = {
  children: ReactNode;
  header?: ReactNode;
  /** Pinned under the scroll area, e.g. a full-width button. */
  footer?: ReactNode;
  /** Draws the folder-tab bar; only for screens outside the (tabs) group, which has its own. */
  tabBar?: TabName;
  /** Leaves room for a tab bar drawn by the (tabs) layout. */
  insideTabs?: boolean;
  tone?: 'sage' | 'night' | 'cream';
  scroll?: boolean;
  /** Pull down to reload from the server. */
  refreshable?: boolean;
  overlay?: ReactNode;
};

const GRADIENTS = {
  sage: [colors.sageTop, colors.sageMid, colors.sageBottom],
  night: [colors.nightTop, colors.nightMid, colors.nightBottom],
  cream: [colors.cream, colors.cream, colors.cream],
} as const;

export function Screen({ children, header, footer, tabBar, insideTabs, tone = 'sage', scroll = true, refreshable, overlay }: Props) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    refresh().finally(() => setRefreshing(false));
  };
  const spinner = tone === 'night' ? colors.onDark : colors.ink;
  const hasTabs = !!tabBar || insideTabs;
  const bottomPad = hasTabs ? TAB_BAR_HEIGHT + insets.bottom + space.xl : footer ? space.lg : insets.bottom + space.xxl;
  return (
    <LinearGradient colors={GRADIENTS[tone]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingTop: insets.top + space.md }}>{header}</View>
        {scroll ? (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: bottomPad }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshable ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={spinner} colors={[spinner]} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, { paddingHorizontal: space.xl, paddingBottom: bottomPad }]}>{children}</View>
        )}
        {footer ? <View style={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.lg }}>{footer}</View> : null}
      </KeyboardAvoidingView>
      {overlay}
      {tabBar ? <TabBar active={tabBar} /> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
