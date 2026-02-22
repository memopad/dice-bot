export const OMICHI_FORTUNES = ['대길', '길', '중길', '소길', '말길', '흉', '대흉'] as const;

export type OmikujiFortune = (typeof OMICHI_FORTUNES)[number];

export function handleOmikujiCommand(): string {
  const chosen = OMICHI_FORTUNES[Math.floor(Math.random() * OMICHI_FORTUNES.length)];
  return `오늘의 운세는 **${chosen}** 입니다!`;
}
