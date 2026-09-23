export const DIFFICULTIES = Object.freeze({
    explorador: Object.freeze({ id: 'explorador', label: 'EXPLORADOR' }),
    aventurero: Object.freeze({ id: 'aventurero', label: 'AVENTURERO' }),
    maestro: Object.freeze({ id: 'maestro', label: 'MAESTRO' })
});

const CHALLENGES = Object.freeze([
    {
        id: 'l1-explorador-main', difficulty: 'explorador', level: 1, challengeRef: 'main',
        skill: 'Suma y resta', question: '18 - 7 + 4 = ?',
        options: { A: '13', B: '15', C: '17' }, correct: 'B'
    },
    {
        id: 'l2-explorador-main', difficulty: 'explorador', level: 2, challengeRef: 'main',
        skill: 'División básica', question: '24 ÷ 6 = ?',
        options: { A: '3', B: '4', C: '6' }, correct: 'B'
    },
    {
        id: 'l3-explorador-main', difficulty: 'explorador', level: 3, challengeRef: 'main',
        skill: 'Patrones', question: '2, 4, 6, ¿qué número sigue?',
        options: { A: '7', B: '8', C: '10' }, correct: 'B'
    },
    {
        id: 'l1-aventurero-main', difficulty: 'aventurero', level: 1, challengeRef: 'main',
        skill: 'Orden de operaciones', question: '7 × (3 + 2) = ?',
        options: { A: '28', B: '35', C: '42' }, correct: 'B'
    },
    {
        id: 'l2-aventurero-main', difficulty: 'aventurero', level: 2, challengeRef: 'main',
        skill: 'Porcentajes', question: '¿Cuánto es el 25% de 80?',
        options: { A: '15', B: '20', C: '25' }, correct: 'B'
    },
    {
        id: 'l3-aventurero-main', difficulty: 'aventurero', level: 3, challengeRef: 'main',
        skill: 'Ecuaciones simples', question: 'x + 7 = 19. ¿Cuánto vale x?',
        options: { A: '10', B: '12', C: '26' }, correct: 'B'
    },
    {
        id: 'l1-maestro-main', difficulty: 'maestro', level: 1, challengeRef: 'main',
        skill: 'Operaciones mixtas', question: '48 ÷ 6 + 3 × 7 = ?',
        options: { A: '27', B: '29', C: '32' }, correct: 'B'
    },
    {
        id: 'l2-maestro-main', difficulty: 'maestro', level: 2, challengeRef: 'main',
        skill: 'Razones', question: 'En una razón 3:5, si el primer valor es 18, ¿cuál es el segundo?',
        options: { A: '24', B: '30', C: '36' }, correct: 'B'
    },
    {
        id: 'l3-maestro-main', difficulty: 'maestro', level: 3, challengeRef: 'main',
        skill: 'Razonamiento con patrones', question: '2, 6, 12, 20, ¿qué número sigue?',
        options: { A: '28', B: '30', C: '32' }, correct: 'B'
    }
]);

export class ChallengeBank {
    static resolve(level, difficulty, challengeRef = 'main') {
        return CHALLENGES.find(challenge => (
            challenge.level === level &&
            challenge.difficulty === difficulty &&
            challenge.challengeRef === challengeRef
        )) || null;
    }

    static getAll() {
        return [...CHALLENGES];
    }
}
