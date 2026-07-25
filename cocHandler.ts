export type CocJudgement =
    | '대성공'
    | '대단한 성공'
    | '어려운 성공'
    | '성공'
    | '실패'
    | '대실패';

export interface CocResult {
    roll: number;
    target: number;
    hard: number;
    extreme: number;
    judgement: CocJudgement;
}

function rollD100(): number {
    return Math.floor(Math.random() * 100) + 1;
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

export function handleCocCommand(body: string): string {
    const target = Number(body.trim());

    if (!Number.isInteger(target) || target < 1 || target > 100) {
        return '❌ 기준값은 1~100 사이의 정수여야 합니다.';
    }

    const roll = rollD100();
    const result: CocResult = {
        roll,
        target,
        hard: Math.floor(target / 2),
        extreme: Math.floor(target / 5),
        judgement: judgeCocRoll(roll, target),
    };

    return [
        `🎲 \`1D100 = ${result.roll}\` / 기준값 \`${result.target}\``,
        `**${result.judgement}**`,
    ].join('\n');
}
