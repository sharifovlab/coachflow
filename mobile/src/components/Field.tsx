// Labelled text input with focus ring.
import { useState, type ComponentProps } from 'react';
import { TextInput, View } from 'react-native';
import { color as C, font, radius } from '@/theme/tokens';
import { Txt } from './ui';

export function Field(props: ComponentProps<typeof TextInput> & { label: string }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt v="micro" c={C.ink3}>{props.label}</Txt>
      <TextInput
        placeholderTextColor={C.ink3}
        {...props}
        onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
        style={[{ minHeight: 54, borderRadius: radius.control, backgroundColor: C.surface2, color: C.ink, paddingHorizontal: 16,
          fontFamily: font.body, fontSize: 16, borderWidth: 1.5, borderColor: focus ? C.ember : 'transparent' }, props.style]}
      />
    </View>
  );
}

