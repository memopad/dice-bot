import fs from 'fs';
import path from 'path';

const DEFAULT_MENUS = ['김치찌개', '된장찌개', '알리오올리오'];

function dataFilePath(): string {
  return path.join(process.cwd(), 'menus.json');
}

function loadMenus(): string[] {
  const p = dataFilePath();

  try {
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, JSON.stringify(DEFAULT_MENUS, null, 2), 'utf-8');
      return [...DEFAULT_MENUS];
    }

    const raw = fs.readFileSync(p, 'utf-8').trim();
    if (!raw) return [...DEFAULT_MENUS];

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map(s => s.trim()).filter(Boolean);
    }
  } catch {
    // fallthrough
  }

  return [...DEFAULT_MENUS];
}

function saveMenus(menus: string[]) {
  const p = dataFilePath();
  fs.writeFileSync(p, JSON.stringify(menus, null, 2), 'utf-8');
}

export function pickMenu(): string {
  const menus = loadMenus();
  if (menus.length === 0) return '❌ 메뉴 목록이 비어 있어요. `/메뉴추가 메뉴이름` 으로 추가해줘!';
  const chosen = menus[Math.floor(Math.random() * menus.length)];
  return `오늘의 메뉴 추천: **${chosen}**`;
}

export function listMenus(): string {
  const menus = loadMenus();
  if (menus.length === 0) return '메뉴가 없어요. `/메뉴추가 메뉴이름` 으로 추가해줘!';
  return `현재 메뉴(${menus.length}개): ${menus.map(m => `\`${m}\``).join(', ')}`;
}

export function addMenu(item: string): string {
  const menu = item.trim();
  if (!menu) return '❌ 추가할 메뉴를 적어줘! 예) `/메뉴추가 김밥`';

  const menus = loadMenus();
  if (menus.includes(menu)) return `이미 있는 메뉴야: \`${menu}\``;

  menus.push(menu);
  saveMenus(menus);
  return `✅ 메뉴 추가됨: \`${menu}\` (총 ${menus.length}개)`;
}

export function removeMenu(item: string): string {
  const menu = item.trim();
  if (!menu) return '❌ 삭제할 메뉴를 적어줘! 예) `/메뉴삭제 김밥`';

  const menus = loadMenus();
  const next = menus.filter(m => m !== menu);

  if (next.length === menus.length) return `목록에 없어요: \`${menu}\``;

  saveMenus(next);
  return `🗑️ 메뉴 삭제됨: \`${menu}\` (총 ${next.length}개)`;
}
