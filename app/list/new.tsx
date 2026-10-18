import { useEffect } from 'react';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { createList, listDraft, listsLeft, resetDraft, updateDraft } from '@/api/lists';
import { Button } from '@/components/Button';
import { FolderTab } from '@/components/FolderTab';
import { goBack, Header, TextAction } from '@/components/Header';
import { ListFields } from '@/components/ListFields';
import { FolderScreen } from '@/components/Screen';
import { Mono } from '@/components/Text';
import { LISTS_PER_PERSON } from '@/limits';
import { colors } from '@/theme';

/** Start a list, all on one page: name it, add owners, choose who sees it. */
export default function NewList() {
  useDb();
  useEffect(() => resetDraft, []);
  const draft = listDraft;
  const name = draft.title.trim();

  const create = () => {
    const id = createList(draft);
    router.replace(`/list/${id}`);
  };

  return (
    <FolderScreen
      header={<Header left={<TextAction label="cancel" onPress={goBack} />} title="new list" />}
      folderTabs={<FolderTab label={name || 'new list'} />}
    >
      <ListFields
        autoFocus
        title={draft.title}
        onTitle={(title) => updateDraft({ title })}
        owners={draft.invites}
        onOwners={(invites) => updateDraft({ invites })}
        choice={draft.visibility}
        viewers={draft.viewers}
        onVisibility={(choice, viewers) => updateDraft({ visibility: choice, viewers })}
      />
      {/* on as many lists as you can be: say so instead of letting save fail */}
      {listsLeft() ? null : (
        <Mono size={11} color={colors.inkSoft} style={{ marginTop: 18, marginHorizontal: 4, lineHeight: 17 }}>you&apos;re on {LISTS_PER_PERSON} lists, the most you can be on. leave or delete one to start another.</Mono>
      )}
      <Button label="save" disabled={!name || !listsLeft()} onPress={create} style={{ marginTop: listsLeft() ? 26 : 10 }} />
    </FolderScreen>
  );
}
