// Big number stepper for weight/reps: −/+ buttons, tap the number to type an exact value.
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { kg } from '@/features/format';
import { haptic } from '@/lib/haptics';
import { color as C, font, radius } from '@/theme/tokens';
import { IconButton, Txt } from './ui';

export function Stepper({ value, onChange, step, min = 0, max = 999, label, unit, decimals = 1, placeholder = '—' }: {
  value: number | null; onChange: (v: number | null) => void; step: number; min?: number; max?: number;
  label: string; unit?: string; decimals?: number; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const val = useRef(value);
  val.current = value;

  const bump = (dir: 1 | -1) => {
    const v = val.current ?? 0;
    const n = Math.round(Math.min(max, Math.max(min, v + dir * step)) * 100) / 100;
    if (n !== val.current) { haptic.selection(); onChange(n); val.current = n; }
  };

  const commit = () => {
    setEditing(false);
    const n = parseFloat(text.replace(',', '.'));
    if (text.trim() === '') onChange(null);
    else if (!isNaN(n)) onChange(Math.min(max, Math.max(min, Math.round(n * 100) / 100)));
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface2, borderRadius: radius.tile, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 6 }}>
      <Txt v="micro" c={C.ink3}>{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' }}>
        <IconButton name="minus" label={`${label} −`} onPress={() => bump(-1)} bg={C.surface3} size={42} />
        {editing ? (
          <TextInput
            autoFocus value={text} onChangeText={setText} onBlur={commit} onSubmitEditing={commit}
            keyboardType="decimal-pad" selectTextOnFocus
            style={{ fontFamily: font.displayMedium, fontSize: 30, color: C.ink, minWidth: 56, textAlign: 'center', padding: 0 }}
          />
        ) : (
          <Txt v="numberLg" onPress={() => { setText(value == null ? '' : String(value).replace('.', ',')); setEditing(true); }}
            style={{ fontSize: 32, lineHeight: 38, minWidth: 56, textAlign: 'center' }} adjustsFontSizeToFit numberOfLines={1} accessibilityLabel={label}>
            {value == null ? placeholder : decimals ? kg(value, decimals) : String(value)}
          </Txt>
        )}
        <IconButton name="plus" label={`${label} +`} onPress={() => bump(1)} bg={C.surface3} size={42} />
      </View>
      {unit ? <Txt v="small" c={C.ink3}>{unit}</Txt> : null}
    </View>
  );
}
