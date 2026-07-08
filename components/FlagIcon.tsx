import React from 'react';
import Svg, { Rect, Path, Text as SvgText } from 'react-native-svg';

export type FlagCode = 'en' | 'ar' | 'de';

/**
 * Vector flags that render identically on Android, iOS and web.
 * (Flag emojis fall back to plain letter pairs on Windows browsers,
 * which is why the web build showed "GB / SA / DE" instead of flags.)
 */
export function FlagIcon({ code, width = 24, height = 17 }: { code: FlagCode; width?: number; height?: number }) {
  if (code === 'de') {
    return (
      <Svg width={width} height={height} viewBox="0 0 18 13" style={{ borderRadius: 2 }}>
        <Rect width={18} height={4.33} fill="#000" />
        <Rect y={4.33} width={18} height={4.33} fill="#DD0000" />
        <Rect y={8.66} width={18} height={4.34} fill="#FFCE00" />
      </Svg>
    );
  }
  if (code === 'ar') {
    return (
      <Svg width={width} height={height} viewBox="0 0 18 13" style={{ borderRadius: 2 }}>
        <Rect width={18} height={13} fill="#165d31" />
        <SvgText x={9} y={9} fontSize={7} fill="#fff" textAnchor="middle" fontFamily="sans-serif">
          ع
        </SvgText>
      </Svg>
    );
  }
  // en — Union Jack
  return (
    <Svg width={width} height={height} viewBox="0 0 60 40" style={{ borderRadius: 2 }}>
      <Rect width={60} height={40} fill="#012169" />
      <Path d="M0,0 60,40 M60,0 0,40" stroke="#fff" strokeWidth={8} />
      <Path d="M0,0 60,40 M60,0 0,40" stroke="#C8102E" strokeWidth={4} />
      <Path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth={13} />
      <Path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth={8} />
    </Svg>
  );
}
