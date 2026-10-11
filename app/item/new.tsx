import { useLocalSearchParams } from 'expo-router';
import { ItemScreen } from '@/screens/ItemScreen';

export default function NewItem() {
  const { list } = useLocalSearchParams<{ list?: string }>();
  return <ItemScreen listId={list} />;
}
