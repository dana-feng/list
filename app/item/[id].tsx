import { useLocalSearchParams } from 'expo-router';
import { ItemScreen } from '@/screens/ItemScreen';

export default function Item() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemScreen key={id} id={id} />;
}
