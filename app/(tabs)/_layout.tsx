import { Redirect, Tabs } from 'expo-router';
import { useDb } from '@/api/db';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  const db = useDb();
  if (db.status === 'signedOut') return <Redirect href="/welcome" />;
  if (db.status === 'needsProfile') return <Redirect href="/profile" />;
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <TabBar
          active={state.routes[state.index].name === 'me' ? 'lists' : 'home'}
          onTab={(tab) => {
            const route = state.routes.find((r) => r.name === (tab === 'home' ? 'index' : 'me'))!;
            // lets a screen react to its own tab being tapped (Home goes back to activity)
            navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            navigation.navigate(route.name);
          }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
