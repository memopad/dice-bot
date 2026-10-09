import { db } from './db';

interface Recommendation {
  title: string;
  category: string;
  tags: string;
}

const MAX_TITLE = 150;
const MAX_CATEGORY = 40;
const MAX_TAGS = 300;

function parseRecommendation(body: string): Recommendation | null {
  const input = body.normalize('NFKC').trim();
  const firstHash = input.search(/(^|\s)#[^\s#]+/);
  if (firstHash < 0) return null;
  const title = input.slice(0, firstHash).trim();
  const tokens = input.slice(firstHash).trim().split(/\s+/);
  if (!title || tokens.some(t => !/^#[^\s#,]+$/.test(t))) return null;
  const [category, ...tags] = tokens.map(t => t.slice(1));
  if (!category) return null;
  return { title, category, tags: [...new Set(tags)].join(',') };
}

function tooLong(r: Recommendation): boolean {
  return r.title.length > MAX_TITLE || r.category.length > MAX_CATEGORY || r.tags.length > MAX_TAGS;
}

function describe(r: Recommendation): string {
  return `**${r.title}** · #${r.category}${r.tags ? ' ' + r.tags.split(',').map(t => '#' + t).join(' ') : ''}`;
}

export function addRecommendation(body: string): string {
  const entry = parseRecommendation(body);
  if (!entry) return '❌ 사용법: `/추천 작품명 #분류 #태그1 #태그2`\n예: `/추천 장송의 프리렌 #애니 #판타지 #힐링`';
  if (tooLong(entry)) return '❌ 작품명(150자), 분류(40자), 태그(총 300자) 길이를 확인해줘.';
  const result = db.prepare('INSERT OR IGNORE INTO recommendations(title, category, tags) VALUES (?, ?, ?)')
    .run(entry.title, entry.category, entry.tags);
  if (!result.changes) return `이미 등록된 작품이야: **${entry.title}** (#${entry.category})`;
  return `✅ 추천 등록: ${describe(entry)}`;
}

// 제목이 같더라도 분류가 다르면 별도 작품이므로, 삭제 시에는 분류를 지정할 수 있습니다.
export function removeRecommendation(body: string): string {
  const input = body.normalize('NFKC').trim();
  const match = input.match(/^(.+?)(?:\s+#([^\s#,]+))?$/);
  if (!match || !match[1]?.trim()) return '❌ 사용법: `/추천삭제 작품명` 또는 `/추천삭제 작품명 #분류`';
  const title = match[1].trim();
  const category = match[2];
  if (title.includes('#') || title.length > MAX_TITLE) return '❌ 작품명을 확인해줘.';
  const matches = db.prepare('SELECT title, category, tags FROM recommendations WHERE title = ?' +
    (category ? ' AND category = ?' : '')).all(...(category ? [title, category] : [title])) as Recommendation[];
  if (!matches.length) return '❌ 해당 추천 작품을 찾지 못했어.';
  if (matches.length > 1) return `❌ 같은 제목이 여러 분류에 있어. 분류를 지정해줘: ${matches.map(r => '#' + r.category).join(', ')}`;
  const entry = matches[0]!;
  db.prepare('DELETE FROM recommendations WHERE title = ? AND category = ?').run(entry.title, entry.category);
  return `🗑️ 추천 삭제: ${describe(entry)}`;
}

// 새로운 태그 전체를 지정하면 기존 태그를 교체합니다. 첫 #은 기존 분류를 지정합니다.
// /추천수정 작품명 #기존분류 #새태그1 #새태그2
export function editRecommendation(body: string): string {
  const entry = parseRecommendation(body);
  if (!entry) return '❌ 사용법: `/추천수정 작품명 #기존분류 #새태그1 #새태그2`\n태그를 모두 지우려면 `/추천수정 작품명 #기존분류`';
  if (tooLong(entry)) return '❌ 작품명(150자), 분류(40자), 태그(총 300자) 길이를 확인해줘.';
  const result = db.prepare('UPDATE recommendations SET tags = ? WHERE title = ? AND category = ?')
    .run(entry.tags, entry.title, entry.category);
  if (!result.changes) return `❌ 해당 추천 작품을 찾지 못했어: **${entry.title}** (#${entry.category})`;
  return `✏️ 추천 태그 수정: ${describe(entry)}`;
}

// 쉼표로 OR 그룹을 나누고 각 그룹 안의 공백은 AND로 해석합니다.
// 예: #A #B, #C => (A AND B) OR C
function parseSearchGroups(body: string): string[][] | null {
  const input = body.normalize('NFKC').trim();
  if (!input) return [];
  const groups = input.split(',').map(group => group.trim());
  if (groups.some(group => !group)) return null;
  const result: string[][] = [];
  for (const group of groups) {
    const tokens = group.split(/\s+/);
    if (tokens.some(t => !/^#[^\s#,]+$/.test(t))) return null;
    result.push([...new Set(tokens.map(t => t.slice(1)))]);
  }
  return result;
}

export function listRecommendations(body: string): string {
  const groups = parseSearchGroups(body);
  if (!groups) return '❌ 검색 조건은 `#태그` 형태로 적어줘. 공백은 AND, 쉼표는 OR이야. 예: `/추천목록 #애니 #힐링, #게임`';
  const conditions = groups.map(group => '(' + group.map(() =>
    `(category = ? OR instr(',' || tags || ',', ',' || ? || ',') > 0)`).join(' AND ') + ')');
  const params = groups.flatMap(group => group.flatMap(t => [t, t]));
  const sql = 'SELECT title, category, tags FROM recommendations' +
    (conditions.length ? ' WHERE ' + conditions.join(' OR ') : '') + ' ORDER BY id DESC';
  const rows = db.prepare(sql).all(...params) as Recommendation[];
  if (!rows.length) return groups.length ? '🔎 조건에 맞는 추천 작품이 없어.' : '등록된 추천 작품이 없어. `/추천 작품명 #분류 #태그`로 추가해줘!';
  const input = body.normalize('NFKC').trim();
  const heading = `📚 추천 목록 (${rows.length}개)${input ? ' · ' + input : ''}`;
  const lines: string[] = [];
  let total = heading.length + 1;
  for (const r of rows) {
    const line = `• ${describe(r)}`;
    if (total + line.length + 1 > 1900) break;
    lines.push(line);
    total += line.length + 1;
  }
  const more = rows.length - lines.length;
  return `${heading}\n${lines.join('\n')}${more ? `\n…외 ${more}개 (태그로 검색 범위를 좁혀줘)` : ''}`;
}
