function rollD10(): number {
    return Math.floor(Math.random() * 10) + 1;
}

export interface CriticalRollResult {
    total: number;
    rounds: number[][];
    finalValues: number[];
    roundsCount: number;
}

export function rollCriticalDice(
    count: number,
    threshold: number,
    bonus: number = 0
): CriticalRollResult {
    const rounds: number[][] = [];
    let currentDice = Array.from({ length: count }, rollD10);

    let p = 0; // 폭발이 이어진 횟수

    while (true) {
        rounds.push(currentDice);

        const nextDice = currentDice.filter((value) => value >= threshold);
        if (nextDice.length === 0) break;

        p++;
        currentDice = nextDice.map(() => rollD10());
    }

    const lastRound = rounds[rounds.length - 1]!;
    const maxLastValue = Math.max(...lastRound);
    const total = p * 10 + maxLastValue + bonus;

    return {
        total,
        rounds,
        finalValues: rounds.flat(),
        roundsCount: p,
    };
}

export function formatCriticalResult(result: CriticalRollResult): string {
    const roundStrings = result.rounds.map((round) => round.join(', '));
    return `**${result.total}** (${roundStrings.join(' > ')})`;
}
