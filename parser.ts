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
    | 'menu-list';

export interface ParsedCommand {
    type: CommandType;
    body: string;
}

export function parseCommand(input: string): ParsedCommand | null {
    const trimmed = input.trim();

    // ✅ 오미쿠지: /오미쿠지
    if (trimmed === '/오미쿠지') {
        return { type: 'omikuji', body: '' };
    }

    // ✅ 메뉴 추천/관리
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

    // 기존 커맨드 (메시지 기반)
    if (trimmed.startsWith('/sr ')) {
        return { type: 'secret-roll', body: trimmed.slice(4).trim() };
    }
    if (trimmed.startsWith('/sc ')) {
        return { type: 'secret-calc', body: trimmed.slice(4).trim() };
    }
    if (trimmed.startsWith('/r ')) {
        return { type: 'roll', body: trimmed.slice(3).trim() };
    }
    if (trimmed.startsWith('/c ')) {
        return { type: 'calc', body: trimmed.slice(3).trim() };
    }

    return null;
}


export interface ParsedRoll {
    countExpr: string;
    sidesExpr: string;
    modifierExpr?: string;
    compareOp?: '=' | '<' | '<=' | '>' | '>=';
    compareTarget?: string;
    isExploding?: boolean;
    explodeThreshold?: string;
}

export function parseRollCommand(expr: string): ParsedRoll | null {
    const compareMatch = expr.match(/(.+?)(=|<=|>=|<|>)(.+)/);
    let conditionOp: string | undefined;
    let conditionExpr: string | undefined;
    let baseExpr = expr;

    if (compareMatch) {
        [, baseExpr, conditionOp, conditionExpr] = compareMatch.map(s => s.trim());
    }

    const rollMatch = baseExpr.match(/^(.+?)d(x?)(.+?)([+\-].+)?$/);
    if (!rollMatch) return null;

    const [, countExpr, xFlag, sidesExpr, modifierExpr] = rollMatch;

    return {
        countExpr: countExpr.trim(),
        sidesExpr: sidesExpr.trim(),
        modifierExpr: modifierExpr?.trim(),
        isExploding: xFlag === 'x',
        explodeThreshold: xFlag === 'x' ? sidesExpr.trim() : undefined,
        compareOp: conditionOp as any,
        compareTarget: conditionExpr?.trim(),
    };
}
