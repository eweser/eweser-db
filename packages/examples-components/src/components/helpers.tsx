import type { CSSProperties } from 'react';
import { useState } from 'react';

export function useHover(
  styleOnHover: CSSProperties,
  styleOnNotHover: CSSProperties = {}
) {
  const [style, setStyle] = useState(styleOnNotHover);

  const onMouseEnter = () => setStyle(styleOnHover);
  const onMouseLeave = () => setStyle(styleOnNotHover);

  return { style, onMouseEnter, onMouseLeave };
}
