import { router, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/api/db';
import { inviteMembers, listDraft, setViewers, setVisibility, updateDraft, viewerIds } from '@/api/lists';
import { PersonPicker } from '@/components/PersonPicker';

/** Follower picker: "who can see it" (mode=viewers) or "who's on it" (mode=members). id is "new" while the list is a draft. */
export default function ListPeople() {
  const db = useDb();
  const { id, mode } = useLocalSearchParams<{ id: string; mode: 'viewers' | 'members' }>();
  const draft = id === 'new';

  if (mode === 'members') {
    const already = draft ? [] : db.list_members.filter((m) => m.list_id === id).map((m) => m.user_id);
    return (
      <PersonPicker
        title="who’s on it"
        initial={draft ? listDraft.invites : []}
        locked={already}
        submitLabel={(n) => (n === 0 ? 'Done' : `Invite ${n} ${n === 1 ? 'person' : 'people'}`)}
        onSubmit={(ids) => {
          if (draft) updateDraft({ invites: ids });
          else inviteMembers(id, ids);
          router.back();
        }}
      />
    );
  }

  return (
    <PersonPicker
      title="who can see it"
      initial={draft ? listDraft.viewers : viewerIds(id)}
      submitLabel={(n) => `Done · ${n} ${n === 1 ? 'person' : 'people'}`}
      onSubmit={(ids) => {
        if (draft) updateDraft({ viewers: ids, visibility: 'specific' });
        else {
          setViewers(id, ids);
          setVisibility(id, 'specific');
        }
        router.back();
      }}
    />
  );
}
