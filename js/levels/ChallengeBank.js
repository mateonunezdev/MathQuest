export const DIFFICULTIES = Object.freeze({
    explorador: Object.freeze({ id: 'explorador', label: 'EXPLORADOR', startingLives: 4, doorScore: 100, answerSeconds: 0, bossInterval: 8 }),
    aventurero: Object.freeze({ id: 'aventurero', label: 'AVENTURERO', startingLives: 3, doorScore: 125, answerSeconds: 24, bossInterval: 6 }),
    maestro: Object.freeze({ id: 'maestro', label: 'MAESTRO', startingLives: 3, doorScore: 150, answerSeconds: 16, bossInterval: 4.5 })
});

const CHALLENGES = Object.freeze([
    {
        id: 'l1-explorador-main', difficulty: 'explorador', level: 1, challengeRef: 'main',
        skill: 'Suma y resta', question: '18 - 7 + 4 = ?',
        options: { A: '15', B: '13', C: '17' }, correct: 'A'
    },
    {
        id: 'l2-explorador-main', difficulty: 'explorador', level: 2, challengeRef: 'main',
        skill: 'División básica', question: '24 ÷ 6 = ?',
        options: { A: '3', B: '4', C: '6' }, correct: 'B'
    },
    {
        id: 'l3-explorador-main', difficulty: 'explorador', level: 3, challengeRef: 'main',
        skill: 'Patrones', question: '2, 4, 6, ¿qué número sigue?',
        options: { A: '7', B: '10', C: '8' }, correct: 'C'
    },
    {
        id: 'l1-aventurero-main', difficulty: 'aventurero', level: 1, challengeRef: 'main',
        skill: 'Orden de operaciones', question: '7 × (3 + 2) = ?',
        options: { A: '28', B: '35', C: '42' }, correct: 'B'
    },
    {
        id: 'l2-aventurero-main', difficulty: 'aventurero', level: 2, challengeRef: 'main',
        skill: 'Porcentajes', question: '¿Cuánto es el 25% de 80?',
        options: { A: '20', B: '15', C: '25' }, correct: 'A'
    },
    {
        id: 'l3-aventurero-main', difficulty: 'aventurero', level: 3, challengeRef: 'main',
        skill: 'Ecuaciones simples', question: 'x + 7 = 19. ¿Cuánto vale x?',
        options: { A: '10', B: '26', C: '12' }, correct: 'C'
    },
    {
        id: 'l1-maestro-main', difficulty: 'maestro', level: 1, challengeRef: 'main',
        skill: 'Operaciones mixtas', question: '48 ÷ 6 + 3 × 7 = ?',
        options: { A: '27', B: '32', C: '29' }, correct: 'C'
    },
    {
        id: 'l2-maestro-main', difficulty: 'maestro', level: 2, challengeRef: 'main',
        skill: 'Razones', question: 'En una razón 3:5, si el primer valor es 18, ¿cuál es el segundo?',
        options: { A: '30', B: '24', C: '36' }, correct: 'A'
    },
    {
        id: 'l3-maestro-main', difficulty: 'maestro', level: 3, challengeRef: 'main',
        skill: 'Razonamiento con patrones', question: '2, 6, 12, 20, ¿qué número sigue?',
        options: { A: '28', B: '30', C: '32' }, correct: 'B'
    }
]);

// [level, ref, skill, question, A, B, C, correct]. Kept authored, not random, for fair demos.
const ENCOUNTER_SETS = {
    explorador: [
        [1, 'shield', 'Suma', '9 + 6 = ?', '15', '14', '16', 'A'],
        [2, 'pulse', 'División', '18 ÷ 3 = ?', '5', '6', '7', 'B'],
        [2, 'attack', 'Multiplicación', '5 × 4 = ?', '15', '18', '20', 'C'],
        [3, 'heal', 'Resta', '30 - 12 = ?', '18', '16', '20', 'A'],
        [3, 'boss-1', 'Patrones', '3, 6, 9, ¿qué sigue?', '10', '12', '15', 'B'],
        [3, 'boss-2', 'Prioridad', '4 + 5 × 2 = ?', '18', '14', '13', 'B'],
        [3, 'boss-3', 'Mitades', 'La mitad de 18 es...', '9', '8', '10', 'A']
    ],
    aventurero: [
        [1, 'shield', 'Prioridad', '12 + 8 ÷ 4 = ?', '5', '14', '20', 'B'],
        [2, 'pulse', 'Equivalencias', '3/4 de 20 = ?', '12', '15', '18', 'B'],
        [2, 'attack', 'Paréntesis', '6 × (4 - 1) = ?', '15', '18', '24', 'B'],
        [3, 'heal', 'Ecuaciones', 'x + 9 = 23. x = ?', '14', '12', '32', 'A'],
        [3, 'boss-1', 'Patrones', '2, 5, 8, ¿qué sigue?', '10', '12', '11', 'C'],
        [3, 'boss-2', 'Porcentajes', '40% de 50 = ?', '15', '20', '25', 'B'],
        [3, 'boss-3', 'Operaciones', '7 × 6 - 8 = ?', '34', '36', '40', 'A']
    ],
    maestro: [
        [1, 'shield', 'Prioridad', '36 ÷ 6 + 4 × 3 = ?', '16', '18', '24', 'B'],
        [2, 'pulse', 'Equivalencias', '2/5 de 45 = ?', '16', '18', '20', 'B'],
        [2, 'attack', 'Paréntesis', '3 × (7 + 2) - 5 = ?', '21', '22', '24', 'B'],
        [3, 'heal', 'Ecuaciones', 'x ÷ 3 + 5 = 11. x = ?', '12', '18', '22', 'B'],
        [3, 'boss-1', 'Patrones', '1, 4, 9, 16, ¿qué sigue?', '25', '24', '36', 'A'],
        [3, 'boss-2', 'Porcentajes', '25% de 96 = ?', '22', '24', '26', 'B'],
        [3, 'boss-3', 'Prioridad', '48 ÷ (2 × 3) + 7 = ?', '13', '15', '17', 'B']
    ]
};

const ENCOUNTER_CHALLENGES = Object.entries(ENCOUNTER_SETS).flatMap(([difficulty, rows]) =>
    rows.map(([level, challengeRef, skill, question, A, B, C, correct]) => ({
        id: `l${level}-${difficulty}-${challengeRef}`, difficulty, level, challengeRef,
        skill, question, options: { A, B, C }, correct
    })));

export class ChallengeBank {
    static resolve(level, difficulty, challengeRef = 'main') {
        return [...CHALLENGES, ...ENCOUNTER_CHALLENGES].find(challenge => (
            challenge.level === level &&
            challenge.difficulty === difficulty &&
            challenge.challengeRef === challengeRef
        )) || null;
    }

    static getAll() {
        return [...CHALLENGES, ...ENCOUNTER_CHALLENGES];
    }
}
