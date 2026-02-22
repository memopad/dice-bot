import { db } from './db';

const DEFAULT_MENUS = [
  '김치찌개', '된장찌개', '제육볶음', '햄버거', '떡볶이', '알리오올리오', '샌드위치', '초밥', '라멘', '육회비빔밥',
  '피자', '치킨', '곱창', '곱도리탕', '족발', '오뎅탕', '골뱅이무침', '삼겹살', '순대', '포케',
  '닭발', '마라탕', '볶음밥', '함박스테이크', '짜장면', '짬뽕', '두부', '탕수육', '돈까스', '그라탕',
  '뇨끼', '불고기', '카레', '김치찜', '덮밥', '오므라이스', '우동', '가츠동', '소바', '워터젤리',
  '물', '설렁탕', '삼계탕', '곰탕', '죽', '갈비탕', '보쌈', '시리얼', '토스트', '핫도그',
  '김밥', '도시락', '육개장', '쌀국수', '월남쌈', '라면', '파스타', '냉면', '칼국수', '잔치국수',
  '비빔면', '수제비', '생선', '만두', '빵', '간장게장', '잡채', '팬케이크', '스프', '야채찜',
  '있는반찬'
];

function ensureDefaults() {
  const count = db.prepare(`SELECT COUNT(*) as c FROM menus`).get() as { c: number };
  if (count.c > 0) return;

  const insert = db.prepare(`INSERT OR IGNORE INTO menus(name) VALUES (?)`);
  const tx = db.transaction((items: string[]) => {
    for (const item of items) insert.run(item);
  });

  tx(DEFAULT_MENUS);
}

export function pickMenu(): string {
  ensureDefaults();

  // ✅ 랜덤 1개를 DB에서 바로 뽑는 게 더 깔끔함
  const row = db.prepare(`SELECT name FROM menus ORDER BY RANDOM() LIMIT 1`).get() as { name?: string };

  if (!row?.name) return '❌ 메뉴 목록이 비어 있어요. `/메뉴추가 메뉴이름` 으로 추가해줘!';
  return `오늘의 메뉴 추천: **${row.name}**`;
}

export function listMenus(): string {
  ensureDefaults();

  const rows = db.prepare(`SELECT name FROM menus ORDER BY id ASC`).all() as { name: string }[];
  if (rows.length === 0) return '메뉴가 없어요. `/메뉴추가 메뉴이름` 으로 추가해줘!';

  // 너무 길면 디스코드 메시지 길이 제한 걸릴 수 있어서 살짝 안전장치
  const text = rows.map(r => `\`${r.name}\``).join(', ');
  if (text.length > 1800) {
    return `현재 메뉴(${rows.length}개): (너무 길어서 생략)`;
  }
  return `현재 메뉴(${rows.length}개): ${text}`;
}

export function addMenu(item: string): string {
  ensureDefaults();

  const menu = item.trim();
  if (!menu) return '❌ 추가할 메뉴를 적어줘! 예) `/메뉴추가 김밥`';

  const info = db.prepare(`INSERT OR IGNORE INTO menus(name) VALUES (?)`).run(menu);
  if (info.changes === 0) return `이미 있는 메뉴야: \`${menu}\``;

  const count = db.prepare(`SELECT COUNT(*) as c FROM menus`).get() as { c: number };
  return `✅ 메뉴 추가됨: \`${menu}\` (총 ${count.c}개)`;
}

export function removeMenu(item: string): string {
  ensureDefaults();

  const menu = item.trim();
  if (!menu) return '❌ 삭제할 메뉴를 적어줘! 예) `/메뉴삭제 김밥`';

  const info = db.prepare(`DELETE FROM menus WHERE name = ?`).run(menu);
  if (info.changes === 0) return `목록에 없어요: \`${menu}\``;

  const count = db.prepare(`SELECT COUNT(*) as c FROM menus`).get() as { c: number };
  return `🗑️ 메뉴 삭제됨: \`${menu}\` (총 ${count.c}개)`;
}