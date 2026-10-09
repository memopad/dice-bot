import { db } from './db';

interface Recommendation {
  title: string;
  category: string;
  tags: string;
}

// # 접두어를 붙인 토큰을 분류/태그로 사용하고, 그 전까지의 문구를 작품명으로 간주합니다.
// /추천 작품명 #애니 #힐링 #일상
function parseRecommendation(body: string): Recommendation | null {
  const input = body.normalize('NFKC').trim();
  const firstHash = input.search(/(^|\s)#[^\s#]+/);
  if (firstHash < 0) return null;
  const title = input.slice(0, firstHash).trim();
  const tokens = input.slice(firstHash).trim().split(/\s+/);
  if (!title || tokens.length < 1 || tokens.some(t => !/^#[^\s#]+$/.test(t))) return null;
  const [category, ...tags] = tokens.map(t => t.slice(1));
  return { title, category: category!, tags: [...new Set(tags)].join(',') };
}

export function addRecommendation(body: string): string {
  const entry = parseRecommendation(body);
  if (!entry) return '❌ 사용법: `/추천 작품명 #분류 #태그1 #태그2`\n예: `/추천 장송의 프리렌 #애니 #판타지 #힐링`';
  if (entry.title.length > 150 || entry.category.length > 40 || entry.tags.length > 300) {
    return '❌ 작품명(150자), 분류(40자), 태그(총 300자) 길이를 확인해줘.';
  }
  const result = db.prepare('INSERT OR IGNORE INTO recommendations(title, category, tags) VALUES (?, ?, ?)')
    .run(entry.title, entry.category, entry.tags);
  if (!result.changes) return `이미 등록된 작품이야: **${entry.title}** (#${entry.category})`;
  return `✅ 추천 등록: **${entry.title}** · #${entry.category}${entry.tags ? ' ' + entry.tags.split(',').map(t => '#' + t).join(' ') : ''}`;
}

// 검색은 모든 #조건을 만족하는 항목만 표시합니다. 첫 번째 태그도 '분류'로 고정하지 않습니다.
export function listRecommendations(body: string): string {
  const input = body.normalize('NFKC').trim();
  const filters = input ? input.split(/\s+/) : [];
  if (filters.some(t => !/^#[^\s#]+$/.test(t))) {
    return '❌ 검색 조건은 #분류 또는 #태그 형태로 적어줘. 예: `/추천목록 #애니 #힐링`';
  }
  const terms = [...new Set(filters.map(t => t.slice(1)))];
  const conditions = terms.map(() => `(category = ? OR instr(',' || tags || ',', ',' || ? || ',') > 0)`);
  const params = terms.flatMap(t => [t, t]);
  const sql = 'SELECT title, category, tags FROM recommendations' +
    (conditions.length ? ' WHERE ' + conditions.join(' AND ') : '') + ' ORDER BY id DESC';
  const rows = db.prepare(sql).all(...params) as Recommendation[];
  if (!rows.length) return terms.length ? '🔎 조건에 맞는 추천 작품이 없어.' : '등록된 추천 작품이 없어. `/추천 작품명 #분류 #태그`로 추가해줘!';

  const heading = `📚 추천 목록 (${rows.length}개)${terms.length ? ' · ' + terms.map(t => '#' + t).join(' ') : ''}`;
  const lines: string[] = [];
  let total = heading.length + 1;
  for (const r of rows) {
    const line = `• **${r.title}** · #${r.category}${r.tags ? ' ' + r.tags.split(',').map(t => '#' + t).join(' ') : ''}`;
    if (total + line.length + 1 > 1900) break;
    lines.push(line);
    total += line.length + 1;
  }
  const more = rows.length - lines.length;
  return `${heading}\n${lines.join('\n')}${more ? `\n…외 ${more}개 (태그로 검색 범위를 좁혀줘)` : ''}`;
}
