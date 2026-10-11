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
          onTab={(tab) => navigation.navigate(tab === 'home' ? 'index' : 'me')}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
