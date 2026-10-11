import { useEffect } from 'react';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { createList, listDraft, resetDraft, updateDraft } from '@/api/lists';
import { Button } from '@/components/Button';
import { FolderTab } from '@/components/FolderTab';
import { goBack, Header, TextAction } from '@/components/Header';
import { ListFields } from '@/components/ListFields';
import { FolderScreen } from '@/components/Screen';
import { choiceOf } from '@/components/VisibilityPicker';

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
      tabs={null}
      header={<Header left={<TextAction label="cancel" onPress={goBack} />} title="new list" />}
      folderTabs={<FolderTab label={name || 'new list'} />}
    >
      <ListFields
        autoFocus
        title={draft.title}
        onTitle={(title) => updateDraft({ title })}
        owners={draft.invites}
        onOwners={(invites) => updateDraft({ invites })}
        choice={choiceOf(draft.visibility, draft.viewers.length)}
        viewers={draft.viewers}
        onVisibility={(choice, viewers) => updateDraft({ visibility: choice === 'me' ? 'specific' : choice, viewers })}
      />
      <Button label="start the list" disabled={!name} onPress={create} style={{ marginTop: 26 }} />
    </FolderScreen>
  );
}
