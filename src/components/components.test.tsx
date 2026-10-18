// A few components that hold behaviour of their own, rendered the way the app uses them.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { db } from '@/api/db';
import { person, signIn } from '@/test/fixtures';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { SearchField } from './SearchField';
import { Switch } from './Switch';
import { Stepper } from './TagField';

beforeEach(() => signIn());

describe('Stepper', () => {
  it('steps up and down', async () => {
    const onChange = jest.fn();
    await render(<Stepper value={2} min={1} max={5} onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('One more'));
    await fireEvent.press(screen.getByLabelText('One fewer'));
    expect(onChange.mock.calls).toEqual([[3], [1]]);
  });

  it('won\'t go past its min or max', async () => {
    const onChange = jest.fn();
    await render(<Stepper value={1} min={1} max={1} onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('One more'));
    await fireEvent.press(screen.getByLabelText('One fewer'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('One more')).toBeDisabled();
  });
});

describe('Avatar', () => {
  it('shows their first initial, lowercase, until there\'s a photo', async () => {
    await render(<Avatar person={person({ name: 'Dana' })} />);
    expect(screen.getByText('d')).toBeOnTheScreen();
  });

  it('falls back to the username, then a question mark', async () => {
    await render(<><Avatar person={person({ name: '', username: 'bo' })} /><Avatar person={person({ name: '', username: '' })} /></>);
    expect(screen.getByText('b')).toBeOnTheScreen();
    expect(screen.getByText('?')).toBeOnTheScreen();
  });

  it('shows the photo instead of the initial', async () => {
    await render(<Avatar person={person({ name: 'Dana', profile_photo: 'https://x/a.jpg' })} />);
    expect(screen.queryByText('d')).toBeNull();
  });
});

describe('SearchField', () => {
  it('passes typing through, and offers a clear button once there\'s text', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(<SearchField value="" onChange={onChange} placeholder="find people" />);
    expect(screen.queryByLabelText('Clear search')).toBeNull();
    await fireEvent.changeText(screen.getByPlaceholderText('find people'), 'da');
    expect(onChange).toHaveBeenLastCalledWith('da');
    await rerender(<SearchField value="da" onChange={onChange} placeholder="find people" />);
    await fireEvent.press(screen.getByLabelText('Clear search'));
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});

describe('Switch and Button', () => {
  it('a switch says whether it\'s on and calls back when tapped', async () => {
    const onPress = jest.fn();
    await render(<Switch on label="Open invite" text="on" onPress={onPress} />);
    const sw = screen.getByRole('switch', { name: 'Open invite' });
    expect(sw).toBeChecked();
    await fireEvent.press(sw);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a disabled button doesn\'t fire', async () => {
    const onPress = jest.fn();
    await render(<Button label="save" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByText('save'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

it('fixtures sign in a fresh person each test', () => {
  expect(db.profiles).toHaveLength(1);
});
