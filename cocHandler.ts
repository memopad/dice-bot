export type CocJudgement =
    | '대성공'
    | '대단한 성공'
    | '어려운 성공'
    | '성공'
    | '실패'
    | '대실패';

export interface ParsedCocRoll {
    /** 양수: 최솟값 채택, 음수: 최댓값 채택, 0: 주사위 1개 */
    bonus: number;
    target: number;
}

export interface CocResult {
    rolls: number[];
    selectedRoll: number;
    target: number;
    bonus: number;
    judgement: CocJudgement;
}

const MAX_EXTRA_DICE = 20;

function rollD100(): number {
    return Math.floor(Math.random() * 100) + 1;
}

/**
 * /r 뒤에 들어오는 CoC 식을 해석합니다.
 *
 * 지원 예:
 * - cc<=60      : 1개 굴림
 * - cc1<=60     : 2개 굴려 최솟값 채택
 * - cc2<=60     : 3개 굴려 최솟값 채택
 * - cc-1<=60    : 2개 굴려 최댓값 채택
 * - cc-2<=60    : 3개 굴려 최댓값 채택
 * - cc+1<=60    : cc1과 동일
 */
export function parseCocRollCommand(body: string): ParsedCocRoll | null {
    const normalized = body.normalize('NFKC').trim();

    const match = normalized.match(
        /^cc\s*([+-]?\s*\d+)?\s*(?:<=|≤)\s*(\d{1,3})\s*[.!?。！？…]*$/i,
    );

    if (!match) return null;

    const rawBonus = match[1]?.replace(/\s+/g, '') ?? '0';
    const bonus = Number(rawBonus);
    const target = Number(match[2]);

    if (!Number.isInteger(bonus) || Math.abs(bonus) > MAX_EXTRA_DICE) {
        throw new Error(`❌ cc 추가 주사위는 -${MAX_EXTRA_DICE}~${MAX_EXTRA_DICE}까지만 사용할 수 있습니다.`);
    }

    if (!Number.isInteger(target) || target < 1 || target > 100) {
        throw new Error('❌ 기준값은 1~100 사이의 정수여야 합니다.');
    }

    return { bonus, target };
}

export function judgeCocRoll(roll: number, target: number): CocJudgement {
    const hard = Math.floor(target / 2);
    const extreme = Math.floor(target / 5);

    if (roll === 1) return '대성공';

    const isFumble =
        (target < 50 && roll >= 96) ||
        (target >= 50 && roll === 100);

    if (isFumble) return '대실패';
    if (roll <= extreme) return '대단한 성공';
    if (roll <= hard) return '어려운 성공';
    if (roll <= target) return '성공';
    return '실패';
}

export function handleCocRollCommand(parsed: ParsedCocRoll): string {
    const diceCount = 1 + Math.abs(parsed.bonus);
    const rolls = Array.from({ length: diceCount }, rollD100);

    const selectedRoll = parsed.bonus < 0
        ? Math.max(...rolls)
        : Math.min(...rolls);

    const result: CocResult = {
        rolls,
        selectedRoll,
        target: parsed.target,
        bonus: parsed.bonus,
        judgement: judgeCocRoll(selectedRoll, parsed.target),
    };

    if (diceCount === 1) {
        return [
            `🎲 \`1D100 = ${result.selectedRoll}\` / 기준값 \`${result.target}\``,
            `**${result.judgement}**`,
        ].join('\n');
    }

    const mode = result.bonus > 0
        ? `낮은 값 채택 (cc${result.bonus})`
        : `높은 값 채택 (cc${result.bonus})`;

    return [
        `🎲 \`${diceCount}D100 = [${result.rolls.join(', ')}]\` / 기준값 \`${result.target}\``,
        `${mode} → 채택 \`${result.selectedRoll}\``,
        `**${result.judgement}**`,
    ].join('\n');
}
