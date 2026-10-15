import { View } from 'react-native';
import { useDb } from '@/api/db';
import { unblock } from '@/api/safety';
import { Pill } from '@/components/Button';
import { FolderTab } from '@/components/FolderTab';
import { Header } from '@/components/Header';
import { PersonRow } from '@/components/PersonRow';
import { FolderScreen } from '@/components/Screen';
import { Mono } from '@/components/Text';
import { colors } from '@/theme';

/** Everyone you've blocked, from settings, each with an unblock. */
export default function Blocked() {
  const db = useDb();
  return (
    <FolderScreen refreshable header={<Header />} folderTabs={<FolderTab label="blocked profiles" />}>
      <View style={{ gap: 8 }}>
        {db.blocked.map((p, i) => (
          <PersonRow key={p.id} person={p} index={i} fill={colors.cream} right={<Pill label="unblock" height={36} onPress={() => unblock(p.id)} accessibilityLabel={`Unblock ${p.name}`} />} />
        ))}
      </View>
      {!db.blocked.length ? <Mono size={12} center color={colors.inkSoft} style={{ marginTop: 24 }}>you haven’t blocked anyone</Mono> : null}
    </FolderScreen>
  );
}
