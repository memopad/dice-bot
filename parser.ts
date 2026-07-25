export type CommandType =
    | 'roll'
    | 'calc'
    | 'secret-roll'
    | 'secret-calc'
    | 'choice'
    | 'secret-choice'
    | 'omikuji'
    | 'menu'
    | 'menu-add'
    | 'menu-remove'
    | 'menu-list'
    | 'timer'
    | 'timer-list'
    | 'timer-cancel'
    | 'timer-clear';

export interface ParsedCommand {
    type: CommandType;
    body: string;
}

export function parseCommand(input: string): ParsedCommand | null {
    // 전각 문자(ＣＣ＜＝６０ 등)를 일반 문자로 통일합니다.
    const trimmed = input.normalize('NFKC').trim();

    if (/^\/t\s+/i.test(trimmed)) {
        return { type: 'timer', body: trimmed.replace(/^\/t\s+/i, '').trim() };
    }
    if (/^\/tlist$/i.test(trimmed)) {
        return { type: 'timer-list', body: '' };
    }
    if (/^\/tcancel\s+/i.test(trimmed)) {
        return { type: 'timer-cancel', body: trimmed.replace(/^\/tcancel\s+/i, '').trim() };
    }
    if (/^\/tclear$/i.test(trimmed)) {
        return { type: 'timer-clear', body: '' };
    }

    if (trimmed === '/오미쿠지') {
        return { type: 'omikuji', body: '' };
    }

    if (trimmed === '/메뉴') {
        return { type: 'menu', body: '' };
    }
    if (trimmed === '/메뉴목록') {
        return { type: 'menu-list', body: '' };
    }
    if (trimmed.startsWith('/메뉴추가 ')) {
        return { type: 'menu-add', body: trimmed.slice('/메뉴추가 '.length).trim() };
    }
    if (trimmed.startsWith('/메뉴삭제 ')) {
        return { type: 'menu-remove', body: trimmed.slice('/메뉴삭제 '.length).trim() };
    }

    if (/^\/sr\s+/i.test(trimmed)) {
        return { type: 'secret-roll', body: trimmed.replace(/^\/sr\s+/i, '').trim() };
    }
    if (/^\/sc\s+/i.test(trimmed)) {
        return { type: 'secret-calc', body: trimmed.replace(/^\/sc\s+/i, '').trim() };
    }
    if (/^\/r\s+/i.test(trimmed)) {
        return { type: 'roll', body: trimmed.replace(/^\/r\s+/i, '').trim() };
    }
    if (/^\/c\s+/i.test(trimmed)) {
        return { type: 'calc', body: trimmed.replace(/^\/c\s+/i, '').trim() };
    }

    return null;
}

export interface ParsedRoll {
    countExpr: string;
    sidesExpr: string;
    /** 주사위 총합 뒤에 적용할 연산. 예: +2, *5, /(2+1) */
    modifierExpr?: string;
    compareOp?: '=' | '<' | '<=' | '>' | '>=';
    compareTarget?: string;
    isExploding?: boolean;
    explodeThreshold?: string;
    /** 주사위 식 뒤에 붙인 설명. 예: /r 1d5 어쩌구저쩌구 */
    label?: string;
}

const SAFE_MATH = /^[\d+\-*/%^().\s]+$/;
const NUMBER_OR_GROUP = String.raw`(?:[+\-]?\d+(?:\.\d+)?|\([^()]+\))`;

function isSafeMath(expr: string): boolean {
    return expr.length > 0 && SAFE_MATH.test(expr);
}

/**
 * 설명문이 없는 순수 주사위 식 하나를 파싱합니다.
 * 지원 예:
 *  - 1d6
 *  - 3d6+2
 *  - 3d6*5
 *  - 3d6 * (2+3)
 *  - 1d100<=60
 *  - 3dx8+2 (기존 폭발 주사위)
 */
function parseStrictRollExpression(expr: string): ParsedRoll | null {
    let baseExpr = expr.trim();
    let compareOp: ParsedRoll['compareOp'];
    let compareTarget: string | undefined;

    // 비교 연산자는 주사위 계산이 끝난 최종값에 적용합니다.
    const compareMatch = baseExpr.match(/^(.*?)(<=|>=|=|<|>)\s*(.+)$/);
    if (compareMatch) {
        const left = compareMatch[1]!.trim();
        const op = compareMatch[2]! as ParsedRoll['compareOp'];
        const target = compareMatch[3]!.trim();

        if (!isSafeMath(target)) return null;

        baseExpr = left;
        compareOp = op;
        compareTarget = target;
    }

    const rollPattern = new RegExp(
        String.raw`^(.+?)\s*d\s*(x)?\s*(\([^()]+\)|\d+(?:\.\d+)?)\s*((?:[+\-*/%^]\s*${NUMBER_OR_GROUP}\s*)*)$`,
        'i',
    );

    const rollMatch = baseExpr.match(rollPattern);
    if (!rollMatch) return null;

    const countExpr = rollMatch[1]!.trim();
    const xFlag = rollMatch[2];
    const sidesExpr = rollMatch[3]!.trim();
    const modifierExpr = rollMatch[4]!.trim() || undefined;

    if (!isSafeMath(countExpr) || !isSafeMath(sidesExpr)) return null;
    if (modifierExpr && !isSafeMath(modifierExpr)) return null;

    const parsed: ParsedRoll = { countExpr, sidesExpr };

    if (xFlag?.toLowerCase() === 'x') {
        parsed.isExploding = true;
        parsed.explodeThreshold = sidesExpr;
    }

    if (modifierExpr) parsed.modifierExpr = modifierExpr;
    if (compareOp) parsed.compareOp = compareOp;
    if (compareTarget) parsed.compareTarget = compareTarget;

    return parsed;
}

/**
 * 입력 앞부분의 가장 긴 유효한 주사위 식을 찾고,
 * 뒤쪽 텍스트는 설명(label)으로 보존합니다.
 */
export function parseRollCommand(expr: string): ParsedRoll | null {
    const normalized = expr.normalize('NFKC').trim();
    if (!normalized) return null;

    // 전체가 식인 경우를 가장 먼저 시도합니다.
    const full = parseStrictRollExpression(normalized);
    if (full) return full;

    // 공백 경계마다 뒤에서부터 잘라 가장 긴 유효 식을 찾습니다.
    const boundaries: number[] = [];
    for (let i = 0; i < normalized.length; i++) {
        if (/\s/.test(normalized[i]!) && (i === 0 || !/\s/.test(normalized[i - 1]!))) {
            boundaries.push(i);
        }
    }

    for (let i = boundaries.length - 1; i >= 0; i--) {
        const cut = boundaries[i]!;
        const candidate = normalized.slice(0, cut).trim();
        const label = normalized.slice(cut).trim();
        if (!candidate || !label) continue;

        const parsed = parseStrictRollExpression(candidate);
        if (parsed) {
            parsed.label = label;
            return parsed;
        }
    }

    return null;
}
