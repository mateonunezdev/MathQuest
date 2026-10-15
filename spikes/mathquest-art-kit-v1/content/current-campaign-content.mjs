import { ABSTRACT_ACTIONS, LEVEL_CONTENT_SCHEMA_VERSION } from './level-content-contract.mjs';

const LEGACY_LEVELS = [
    {
        number: 1, chapter: 'CAPÍTULO I', name: 'TEMPLO DE LAS CASCADAS', objective: 'DESPIERTA AL COLOSO Y ALCANZA EL PORTAL', theme: 'waterfall', guardian: 'COLOSO DE LA SUMA',
        background: 0x06141b, fog: 0x102c35, stone: 0xa5aeaa, damaged: 0x697a79, ground: 0x263a3e, backplate: 0xffffff,
        altarDistance: 89,
        route: [[0, 0, 7], [0, 0, -8], [-1.4, .15, -22], [1.4, 1, -37], [4.8, 2.05, -51], [10.5, 2.5, -65], [5.2, 3.45, -82], [-2.6, 4.25, -101], [-8.4, 4.7, -118], [-13.5, 5.1, -132]],
        questions: [
            { prompt: '12 ÷ 3 = ?', choices: ['3', '4', '6'], correctLane: 0, answer: '4' },
            { prompt: '18 ÷ 3 = ?', choices: ['5', '6', '8'], correctLane: 0, answer: '6' },
            { prompt: '7 × 4 − 6 = ?', choices: ['20', '22', '24'], correctLane: 0, answer: '22' },
            { prompt: '24 ÷ 4 = ?', choices: ['5', '6', '7'], correctLane: 0, answer: '6' },
            { prompt: '5 × 8 + 4 = ?', choices: ['44', '42', '46'], correctLane: -1, answer: '44' },
            { prompt: '81 ÷ 9 = ?', choices: ['7', '9', '8'], correctLane: 0, answer: '9' },
            { prompt: '6 × 7 − 8 = ?', choices: ['34', '32', '36'], correctLane: -1, answer: '34' },
            { prompt: '56 ÷ 8 = ?', choices: ['6', '7', '8'], correctLane: 0, answer: '7' },
            { prompt: '9 × 6 + 3 = ?', choices: ['57', '54', '51'], correctLane: -1, answer: '57' }
        ],
        guardianQuestions: [
            { prompt: '4 + 4 = ?', choices: ['6', '8', '10'], correctIndex: 1, answer: '8' },
            { prompt: '6 × 3 = ?', choices: ['18', '16', '21'], correctIndex: 0, answer: '18' },
            { prompt: '36 ÷ 4 + 5 = ?', choices: ['12', '14', '16'], correctIndex: 1, answer: '14' },
            { prompt: '7 × 5 = ?', choices: ['35', '30', '40'], correctIndex: 0, answer: '35' },
            { prompt: '45 ÷ 5 = ?', choices: ['7', '9', '8'], correctIndex: 1, answer: '9' },
            { prompt: '8 × 6 − 4 = ?', choices: ['44', '42', '40'], correctIndex: 0, answer: '44' },
            { prompt: '72 ÷ 8 = ?', choices: ['7', '9', '8'], correctIndex: 1, answer: '9' },
            { prompt: '11 × 4 = ?', choices: ['44', '48', '40'], correctIndex: 0, answer: '44' },
            { prompt: '63 ÷ 7 + 2 = ?', choices: ['11', '9', '10'], correctIndex: 0, answer: '11' }
        ],
        altarQuestions: [
            { prompt: '15 − 7 = ?', choices: ['8', '6', '9'], correctIndex: 0, answer: '8' },
            { prompt: '9 × 4 = ?', choices: ['32', '42', '36'], correctIndex: 2, answer: '36' },
            { prompt: '48 ÷ 6 + 7 = ?', choices: ['13', '15', '16'], correctIndex: 1, answer: '15' },
            { prompt: '6 × 8 = ?', choices: ['48', '42', '46'], correctIndex: 0, answer: '48' },
            { prompt: '56 ÷ 7 = ?', choices: ['6', '8', '7'], correctIndex: 1, answer: '8' },
            { prompt: '64 ÷ 8 + 4 = ?', choices: ['12', '10', '14'], correctIndex: 0, answer: '12' },
            { prompt: '7 × 7 = ?', choices: ['49', '42', '56'], correctIndex: 0, answer: '49' },
            { prompt: '81 ÷ 9 = ?', choices: ['7', '9', '8'], correctIndex: 1, answer: '9' },
            { prompt: '5 × 12 = ?', choices: ['60', '55', '65'], correctIndex: 0, answer: '60' }
        ]
    },
    {
        number: 2, chapter: 'CAPÍTULO II', name: 'OBSERVATORIO DE FRACCIONES', objective: 'CRUZA LAS CUMBRES Y VENCE AL CENTINELA', theme: 'mountain', guardian: 'CENTINELA CELESTE',
        background: 0x080e20, fog: 0x172944, stone: 0x8994a8, damaged: 0x505c72, ground: 0x202a40, backplate: 0xb9d7ff,
        altarDistance: 87,
        route: [[0, 0, 7], [2.4, .1, -7], [4.5, .55, -20], [3.0, 1.15, -34], [1, 2.15, -49], [1.5, 3.1, -65], [-6.2, 4.45, -82], [-11, 5.55, -102], [-7, 6.15, -118], [0, 6.7, -134]],
        questions: [
            { prompt: '1/2 + 1/4 = ?', choices: ['1/2', '1', '3/4'], correctLane: 1, answer: '3/4' },
            { prompt: '3/5 DE 20 = ?', choices: ['10', '15', '12'], correctLane: 1, answer: '12' },
            { prompt: '2/3 ÷ 1/3 = ?', choices: ['3', '1', '2'], correctLane: 1, answer: '2' },
            { prompt: '1/4 + 1/8 = ?', choices: ['1/8', '3/8', '1/2'], correctLane: 0, answer: '3/8' },
            { prompt: '2/5 DE 30 = ?', choices: ['10', '12', '14'], correctLane: 0, answer: '12' },
            { prompt: '3/4 ÷ 1/2 = ?', choices: ['3/2', '1/2', '3/8'], correctLane: -1, answer: '3/2' },
            { prompt: '5/8 DE 24 = ?', choices: ['12', '15', '18'], correctLane: 0, answer: '15' },
            { prompt: '1/3 + 1/6 = ?', choices: ['1/3', '1/2', '2/3'], correctLane: 0, answer: '1/2' },
            { prompt: '4/5 DE 25 = ?', choices: ['15', '20', '18'], correctLane: 0, answer: '20' }
        ],
        guardianQuestions: [
            { prompt: '1/2 DE 14 = ?', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' },
            { prompt: '3/4 DE 24 = ?', choices: ['16', '18', '20'], correctIndex: 1, answer: '18' },
            { prompt: '5/6 − 1/3 = ?', choices: ['1/2', '2/3', '1/3'], correctIndex: 0, answer: '1/2' },
            { prompt: '2/3 DE 21 = ?', choices: ['12', '14', '16'], correctIndex: 1, answer: '14' },
            { prompt: '3/5 DE 25 = ?', choices: ['15', '10', '18'], correctIndex: 0, answer: '15' },
            { prompt: '7/8 − 1/4 = ?', choices: ['5/8', '3/8', '1/2'], correctIndex: 0, answer: '5/8' },
            { prompt: '5/6 DE 18 = ?', choices: ['12', '15', '10'], correctIndex: 1, answer: '15' },
            { prompt: '4/5 DE 20 = ?', choices: ['16', '14', '18'], correctIndex: 0, answer: '16' },
            { prompt: '3/4 DE 16 = ?', choices: ['10', '12', '8'], correctIndex: 1, answer: '12' }
        ],
        altarQuestions: [
            { prompt: '2/3 DE 18 = ?', choices: ['9', '15', '12'], correctIndex: 2, answer: '12' },
            { prompt: '5/8 DE 32 = ?', choices: ['20', '18', '24'], correctIndex: 0, answer: '20' },
            { prompt: '3/4 + 1/8 = ?', choices: ['5/8', '1', '7/8'], correctIndex: 2, answer: '7/8' },
            { prompt: '1/2 DE 24 = ?', choices: ['10', '12', '8'], correctIndex: 1, answer: '12' },
            { prompt: '3/5 DE 20 = ?', choices: ['12', '10', '14'], correctIndex: 0, answer: '12' },
            { prompt: '5/8 + 1/8 = ?', choices: ['3/4', '1/2', '5/8'], correctIndex: 0, answer: '3/4' },
            { prompt: '2/3 DE 15 = ?', choices: ['8', '10', '12'], correctIndex: 1, answer: '10' },
            { prompt: '4/7 DE 28 = ?', choices: ['16', '14', '12'], correctIndex: 0, answer: '16' },
            { prompt: '1/3 + 2/3 = ?', choices: ['1', '2/3', '1/3'], correctIndex: 0, answer: '1' }
        ]
    },
    {
        number: 3, chapter: 'CAPÍTULO III', name: 'FORJA DEL VOLCÁN ALGEBRAICO', objective: 'DOMINA LA FORJA Y CIERRA LA EXPEDICIÓN', theme: 'volcano', guardian: 'TITÁN DE LA FORJA',
        background: 0x110b14, fog: 0x30202f, stone: 0x8e858d, damaged: 0x584c58, ground: 0x30262f, backplate: 0xffd4c2,
        altarDistance: 87,
        route: [[0, 0, 7], [-2.5, .15, -7], [-4.5, .7, -20], [-2, 1.45, -35], [0, 2.55, -49], [.5, 3.55, -65], [7.2, 4.2, -82], [12, 5.25, -103], [8, 5.8, -119], [1.5, 6.15, -135]],
        questions: [
            { prompt: 'x + 7 = 15', choices: ['8', '7', '9'], correctLane: -1, answer: '8' },
            { prompt: '3x = 18', choices: ['6', '9', '5'], correctLane: -1, answer: '6' },
            { prompt: '2x + 4 = 14', choices: ['5', '6', '4'], correctLane: -1, answer: '5' },
            { prompt: 'x − 4 = 8', choices: ['10', '12', '8'], correctLane: 0, answer: '12' },
            { prompt: '4x = 32', choices: ['8', '6', '7'], correctLane: -1, answer: '8' },
            { prompt: 'x/2 = 6', choices: ['12', '8', '10'], correctLane: -1, answer: '12' },
            { prompt: '5x − 5 = 20', choices: ['5', '4', '6'], correctLane: -1, answer: '5' },
            { prompt: 'x + 9 = 20', choices: ['11', '9', '10'], correctLane: -1, answer: '11' },
            { prompt: '3x = 21', choices: ['7', '6', '8'], correctLane: -1, answer: '7' }
        ],
        guardianQuestions: [
            { prompt: 'x − 5 = 7', choices: ['10', '12', '14'], correctIndex: 1, answer: '12' },
            { prompt: '4x = 28', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' },
            { prompt: '3x + 5 = 26', choices: ['7', '8', '9'], correctIndex: 0, answer: '7' },
            { prompt: '2x = 16', choices: ['8', '6', '7'], correctIndex: 0, answer: '8' },
            { prompt: 'x + 8 = 20', choices: ['12', '10', '14'], correctIndex: 0, answer: '12' },
            { prompt: '5x = 35', choices: ['7', '6', '8'], correctIndex: 0, answer: '7' },
            { prompt: 'x/3 = 4', choices: ['12', '10', '8'], correctIndex: 0, answer: '12' },
            { prompt: '6x = 42', choices: ['7', '6', '8'], correctIndex: 0, answer: '7' },
            { prompt: '2x + 6 = 22', choices: ['8', '7', '6'], correctIndex: 0, answer: '8' }
        ],
        altarQuestions: [
            { prompt: '2x = 14', choices: ['8', '6', '7'], correctIndex: 2, answer: '7' },
            { prompt: '5x − 5 = 20', choices: ['4', '5', '6'], correctIndex: 1, answer: '5' },
            { prompt: '4x + 3 = 27', choices: ['6', '5', '7'], correctIndex: 0, answer: '6' },
            { prompt: 'x − 3 = 10', choices: ['13', '11', '15'], correctIndex: 0, answer: '13' },
            { prompt: '3x = 24', choices: ['8', '7', '9'], correctIndex: 0, answer: '8' },
            { prompt: 'x/4 = 5', choices: ['20', '16', '24'], correctIndex: 0, answer: '20' },
            { prompt: '6x − 6 = 30', choices: ['6', '5', '7'], correctIndex: 0, answer: '6' },
            { prompt: '2x + 8 = 24', choices: ['8', '7', '9'], correctIndex: 0, answer: '8' },
            { prompt: 'x − 2 = 12', choices: ['14', '12', '10'], correctIndex: 0, answer: '14' }
        ]
    }
];

const LEGACY_REPLAY_SETS = [
    {
        questions: [
            { prompt: '16 ÷ 4 = ?', choices: ['4', '2', '8'], correctLane: -1, answer: '4' },
            { prompt: '8 × 3 − 5 = ?', choices: ['21', '19', '24'], correctLane: 0, answer: '19' },
            { prompt: '54 ÷ 6 + 8 = ?', choices: ['15', '19', '17'], correctLane: 1, answer: '17' },
            { prompt: '20 ÷ 5 = ?', choices: ['4', '5', '3'], correctLane: -1, answer: '4' },
            { prompt: '9 × 4 + 2 = ?', choices: ['38', '36', '34'], correctLane: -1, answer: '38' },
            { prompt: '72 ÷ 8 = ?', choices: ['8', '9', '7'], correctLane: 0, answer: '9' },
            { prompt: '6 × 9 − 4 = ?', choices: ['50', '48', '52'], correctLane: -1, answer: '50' },
            { prompt: '48 ÷ 6 = ?', choices: ['7', '8', '6'], correctLane: 0, answer: '8' },
            { prompt: '7 × 8 + 5 = ?', choices: ['61', '59', '63'], correctLane: -1, answer: '61' }
        ],
        altarQuestions: [
            { prompt: '14 − 6 = ?', choices: ['7', '8', '9'], correctIndex: 1, answer: '8' },
            { prompt: '7 × 6 = ?', choices: ['36', '42', '48'], correctIndex: 1, answer: '42' },
            { prompt: '63 ÷ 7 + 9 = ?', choices: ['16', '18', '20'], correctIndex: 1, answer: '18' },
            { prompt: '8 × 7 = ?', choices: ['56', '48', '64'], correctIndex: 0, answer: '56' },
            { prompt: '49 ÷ 7 = ?', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' },
            { prompt: '36 ÷ 4 + 6 = ?', choices: ['15', '13', '17'], correctIndex: 0, answer: '15' },
            { prompt: '6 × 9 = ?', choices: ['54', '48', '60'], correctIndex: 0, answer: '54' },
            { prompt: '56 ÷ 8 = ?', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' },
            { prompt: '8 × 8 = ?', choices: ['64', '56', '72'], correctIndex: 0, answer: '64' }
        ],
        guardianQuestions: [
            { prompt: '5 + 7 = ?', choices: ['10', '12', '14'], correctIndex: 1, answer: '12' },
            { prompt: '9 × 4 = ?', choices: ['32', '36', '40'], correctIndex: 1, answer: '36' },
            { prompt: '48 ÷ 6 + 11 = ?', choices: ['17', '19', '21'], correctIndex: 1, answer: '19' },
            { prompt: '8 × 6 = ?', choices: ['48', '42', '54'], correctIndex: 0, answer: '48' },
            { prompt: '54 ÷ 6 = ?', choices: ['8', '9', '7'], correctIndex: 1, answer: '9' },
            { prompt: '7 × 8 − 3 = ?', choices: ['53', '51', '49'], correctIndex: 0, answer: '53' },
            { prompt: '63 ÷ 7 = ?', choices: ['7', '9', '8'], correctIndex: 1, answer: '9' },
            { prompt: '12 × 4 = ?', choices: ['48', '44', '52'], correctIndex: 0, answer: '48' },
            { prompt: '81 ÷ 9 + 5 = ?', choices: ['14', '12', '16'], correctIndex: 0, answer: '14' }
        ]
    },
    {
        questions: [
            { prompt: '1/3 + 1/6 = ?', choices: ['1/3', '2/3', '1/2'], correctLane: 1, answer: '1/2' },
            { prompt: '3/4 DE 20 = ?', choices: ['15', '12', '18'], correctLane: -1, answer: '15' },
            { prompt: '5/6 − 1/3 = ?', choices: ['1/2', '2/3', '5/6'], correctLane: -1, answer: '1/2' },
            { prompt: '1/5 + 2/5 = ?', choices: ['2/5', '3/5', '4/5'], correctLane: 0, answer: '3/5' },
            { prompt: '2/3 DE 18 = ?', choices: ['9', '12', '6'], correctLane: 0, answer: '12' },
            { prompt: '4/5 ÷ 2/5 = ?', choices: ['2', '1/2', '3/2'], correctLane: -1, answer: '2' },
            { prompt: '3/8 DE 24 = ?', choices: ['6', '9', '7'], correctLane: 0, answer: '9' },
            { prompt: '1/2 + 1/4 = ?', choices: ['1/2', '3/4', '1'], correctLane: 0, answer: '3/4' },
            { prompt: '7/10 DE 30 = ?', choices: ['18', '21', '24'], correctLane: 0, answer: '21' }
        ],
        altarQuestions: [
            { prompt: '1/4 DE 24 = ?', choices: ['4', '6', '8'], correctIndex: 1, answer: '6' },
            { prompt: '7/8 DE 32 = ?', choices: ['24', '28', '30'], correctIndex: 1, answer: '28' },
            { prompt: '2/3 + 1/6 = ?', choices: ['3/4', '5/6', '1'], correctIndex: 1, answer: '5/6' },
            { prompt: '1/3 DE 27 = ?', choices: ['7', '9', '6'], correctIndex: 1, answer: '9' },
            { prompt: '3/5 DE 25 = ?', choices: ['12', '15', '18'], correctIndex: 1, answer: '15' },
            { prompt: '4/8 + 2/8 = ?', choices: ['3/4', '5/8', '1/2'], correctIndex: 0, answer: '3/4' },
            { prompt: '2/5 DE 20 = ?', choices: ['6', '8', '10'], correctIndex: 1, answer: '8' },
            { prompt: '5/8 + 1/8 = ?', choices: ['3/4', '5/8', '1/2'], correctIndex: 0, answer: '3/4' },
            { prompt: '3/4 DE 16 = ?', choices: ['10', '12', '8'], correctIndex: 1, answer: '12' }
        ],
        guardianQuestions: [
            { prompt: '1/3 DE 18 = ?', choices: ['5', '6', '7'], correctIndex: 1, answer: '6' },
            { prompt: '5/6 DE 30 = ?', choices: ['20', '24', '25'], correctIndex: 2, answer: '25' },
            { prompt: '7/8 − 3/8 = ?', choices: ['3/8', '1/2', '5/8'], correctIndex: 1, answer: '1/2' },
            { prompt: '2/5 DE 25 = ?', choices: ['8', '10', '12'], correctIndex: 1, answer: '10' },
            { prompt: '4/6 DE 24 = ?', choices: ['14', '16', '12'], correctIndex: 1, answer: '16' },
            { prompt: '3/4 + 1/4 = ?', choices: ['1', '1/2', '3/4'], correctIndex: 0, answer: '1' },
            { prompt: '5/8 DE 24 = ?', choices: ['12', '15', '10'], correctIndex: 1, answer: '15' },
            { prompt: '2/3 DE 21 = ?', choices: ['12', '14', '10'], correctIndex: 1, answer: '14' },
            { prompt: '1/2 + 1/2 = ?', choices: ['1', '1/2', '2'], correctIndex: 0, answer: '1' }
        ]
    },
    {
        questions: [
            { prompt: 'x + 9 = 17', choices: ['7', '9', '8'], correctLane: 1, answer: '8' },
            { prompt: '4x = 36', choices: ['9', '8', '10'], correctLane: -1, answer: '9' },
            { prompt: '3x − 2 = 19', choices: ['6', '7', '8'], correctLane: 0, answer: '7' },
            { prompt: 'x − 6 = 10', choices: ['16', '14', '18'], correctLane: -1, answer: '16' },
            { prompt: '5x = 40', choices: ['8', '6', '7'], correctLane: -1, answer: '8' },
            { prompt: 'x/3 = 5', choices: ['15', '10', '12'], correctLane: -1, answer: '15' },
            { prompt: '6x − 4 = 20', choices: ['4', '5', '3'], correctLane: -1, answer: '4' },
            { prompt: '2x + 7 = 23', choices: ['8', '7', '6'], correctLane: -1, answer: '8' },
            { prompt: '7x = 42', choices: ['6', '7', '8'], correctLane: -1, answer: '6' }
        ],
        altarQuestions: [
            { prompt: '3x = 21', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' },
            { prompt: '6x − 6 = 30', choices: ['5', '6', '7'], correctIndex: 1, answer: '6' },
            { prompt: '5x + 2 = 37', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' },
            { prompt: '2x = 18', choices: ['7', '9', '8'], correctIndex: 1, answer: '9' },
            { prompt: '4x = 44', choices: ['11', '9', '10'], correctIndex: 0, answer: '11' },
            { prompt: 'x/5 = 3', choices: ['15', '12', '18'], correctLane: -1, answer: '15' },
            { prompt: '7x − 7 = 35', choices: ['6', '5', '4'], correctIndex: 0, answer: '6' },
            { prompt: '3x + 4 = 25', choices: ['7', '6', '8'], correctIndex: 0, answer: '7' },
            { prompt: 'x/2 = 6', choices: ['12', '10', '8'], correctIndex: 0, answer: '12' }
        ],
        guardianQuestions: [
            { prompt: 'x − 8 = 6', choices: ['12', '14', '16'], correctIndex: 1, answer: '14' },
            { prompt: '5x = 45', choices: ['8', '9', '10'], correctIndex: 1, answer: '9' },
            { prompt: '4x + 7 = 35', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' },
            { prompt: '2x = 20', choices: ['10', '8', '9'], correctIndex: 0, answer: '10' },
            { prompt: '3x = 45', choices: ['15', '12', '18'], correctIndex: 0, answer: '15' },
            { prompt: 'x/4 = 5', choices: ['20', '16', '24'], correctIndex: 0, answer: '20' },
            { prompt: '8x − 8 = 40', choices: ['6', '5', '4'], correctIndex: 0, answer: '6' },
            { prompt: '6x = 48', choices: ['8', '7', '9'], correctIndex: 0, answer: '8' },
            { prompt: 'x − 4 = 15', choices: ['19', '17', '21'], correctIndex: 0, answer: '19' }
        ]
    }
];

export const DIFFICULTY_PROFILES = Object.freeze([
    Object.freeze({ id: 'explorador', name: 'EXPLORADORES', speed: 3.5, steer: 8.0, acceleration: 30, obstacleThreshold: .4, mazeTolerance: 1.14, stalkerTelegraph: 1.12, stalkerRecovery: 1.42, guardianTelegraph: 1.3, guardianRecovery: 1.58, hesitationSeconds: 9, guidance: 'REFORZADA', multiplier: 1 }),
    Object.freeze({ id: 'aventurero', name: 'INTERMEDIO', speed: 4.2, steer: 9.0, acceleration: 35, obstacleThreshold: .55, mazeTolerance: 1, stalkerTelegraph: .85, stalkerRecovery: 1.12, guardianTelegraph: 1, guardianRecovery: 1.25, hesitationSeconds: 7, guidance: 'ESTÁNDAR', multiplier: 1.25 }),
    Object.freeze({ id: 'maestro', name: 'MAESTRO', speed: 5.0, steer: 10.0, acceleration: 40, obstacleThreshold: .68, mazeTolerance: .9, stalkerTelegraph: .7, stalkerRecovery: .94, guardianTelegraph: .82, guardianRecovery: 1, hesitationSeconds: 5.5, guidance: 'ESENCIAL', multiplier: 1.6 })
]);

const STALKER_NAMES = Object.freeze(['ACECHADOR DE MAREA', 'ESCARABAJO ASTRAL', 'SABUESO DE ESCORIA']);
const LEVEL_IDS = Object.freeze(['waterfall-temple', 'fraction-observatory', 'algebra-forge']);
const CURRENT_ROUTE_LENGTHS = Object.freeze([145.3233430326844, 146.12670908431724, 146.60492461549717]);

function createContractLevel(level, index) {
    const altar = level.altarDistance;
    const routeLength = CURRENT_ROUTE_LENGTHS[index];
    const guardian = routeLength - 17.6;
    const routeEnd = routeLength - 4.1;
    return Object.freeze({
        schemaVersion: LEVEL_CONTENT_SCHEMA_VERSION,
        id: LEVEL_IDS[index],
        number: level.number,
        chapter: level.chapter,
        name: level.name,
        objective: level.objective,
        theme: level.theme,
        guardian: level.guardian,
        route: level.route,
        routeLength,
        palette: Object.freeze({ background: level.background, fog: level.fog, stone: level.stone, damaged: level.damaged, ground: level.ground, backplate: level.backplate }),
        anchors: Object.freeze([
            Object.freeze({ id: 'start', type: 'spawn', distance: 0 }),
            Object.freeze({ id: 'route-math', type: 'route-math', distance: 47.35 }),
            Object.freeze({ id: 'exploration-start', type: 'manual-exploration', distance: 55.15 }),
            Object.freeze({ id: 'exploration-end', type: 'manual-exploration-exit', distance: 79.7 }),
            Object.freeze({ id: 'altar', type: 'altar-math', distance: altar }),
            Object.freeze({ id: 'guardian', type: 'guardian', distance: guardian }),
            Object.freeze({ id: 'portal', type: 'portal', distance: routeEnd })
        ]),
        sections: Object.freeze([
            Object.freeze({ id: 'approach', startDistance: 0, endDistance: 47.35, actions: ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP', 'SLIDE', 'DASH'] }),
            Object.freeze({ id: 'math-route', startDistance: 47.35, endDistance: 55.15, actions: ['MOVE_LEFT', 'MOVE_RIGHT', 'ANSWER_A', 'ANSWER_B', 'ANSWER_C'] }),
            Object.freeze({ id: 'manual-exploration', startDistance: 55.15, endDistance: 79.7, actions: ['MOVE_LEFT', 'MOVE_RIGHT', 'CONFIRM'] }),
            Object.freeze({ id: 'altar-and-combat-run', startDistance: 79.7, endDistance: guardian, actions: ['ANSWER_A', 'ANSWER_B', 'ANSWER_C', 'ATTACK', 'DASH', 'POWER'] }),
            Object.freeze({ id: 'portal-run', startDistance: guardian, endDistance: routeEnd, actions: ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP', 'ATTACK', 'DASH', 'POWER'] })
        ]),
        questions: level.questions,
        altarQuestions: level.altarQuestions,
        guardianQuestions: level.guardianQuestions,
        mechanisms: Object.freeze({
            mathRoute: Object.freeze({ behaviorId: 'current-three-lane-gate-v1', answerActions: ['ANSWER_A', 'ANSWER_B', 'ANSWER_C'] }),
            altar: Object.freeze({ behaviorId: 'current-rune-altar-v1', answerActions: ['ANSWER_A', 'ANSWER_B', 'ANSWER_C'] }),
            environment: Object.freeze({ behaviorId: `current-${level.theme}-environment-v1` })
        }),
        dynamicEvents: Object.freeze([
            Object.freeze({ id: 'route-gate-hold', behaviorId: 'current-route-gate-hold-v1', anchorId: 'route-math' }),
            Object.freeze({ id: 'exploration-circuit', behaviorId: `current-${level.theme}-circuit-v1`, anchorId: 'exploration-start' }),
            Object.freeze({ id: 'guardian-release', behaviorId: `current-guardian-${level.number}-v1`, anchorId: 'guardian' }),
            Object.freeze({ id: 'portal-entry', behaviorId: 'current-portal-entry-v1', anchorId: 'portal' })
        ]),
        guardianBehavior: Object.freeze({ behaviorId: `current-guardian-${level.number}-v1`, stalkerId: `current-stalker-${level.number}-v1`, stalkerName: STALKER_NAMES[index] }),
        camera: Object.freeze({ rigId: 'current-third-person-rig-v1', minimumClearance: 0.65, occlusionPolicy: 'raycast-arm-and-fade' }),
        collision: Object.freeze({
            profileId: 'current-runner-collision-v1', routeWidth: 8.4, requiresVisualMatch: true,
            geometry: Object.freeze({ kind: 'route-envelope', halfWidth: 4.2, verticalMode: 'sampled-route-height', obstacleAuthority: 'runtime-registered' })
        }),
        difficulties: DIFFICULTY_PROFILES.map(profile => profile.id),
        checkpoints: Object.freeze([0, 47.35, 55.15, 79.7, altar, routeLength - 22.7, guardian, routeEnd]),
        presentation: Object.freeze({ projectorMinimumHeight: 720, mathLabelMinimumPixels: 44, highContrastMath: true })
    });
}

export const CURRENT_CAMPAIGN_CONTENT = Object.freeze({
    schemaVersion: LEVEL_CONTENT_SCHEMA_VERSION,
    id: 'mathquest-official-3d-current-campaign',
    levels: Object.freeze(LEGACY_LEVELS.map(createContractLevel)),
    difficulties: DIFFICULTY_PROFILES,
    requiredActions: ABSTRACT_ACTIONS,
    controllerPolicy: Object.freeze({ mouseRequired: false, keyboard: true, arduinoKeyboardEmulation: true, answerKeys: ['A', 'B', 'C'] })
});

export function createCurrentCampaignCompatibilityAdapter(content = CURRENT_CAMPAIGN_CONTENT) {
    const levels = content.levels.map(level => Object.freeze({
        number: level.number,
        chapter: level.chapter,
        name: level.name,
        objective: level.objective,
        theme: level.theme,
        guardian: level.guardian,
        background: level.palette.background,
        fog: level.palette.fog,
        stone: level.palette.stone,
        damaged: level.palette.damaged,
        ground: level.palette.ground,
        backplate: level.palette.backplate,
        altarDistance: level.anchors.find(anchor => anchor.id === 'altar').distance,
        route: level.route,
        questions: level.questions,
        guardianQuestions: level.guardianQuestions,
        altarQuestions: level.altarQuestions,
        ...(level.runtime ? { runtime: level.runtime } : {})
    }));
    return Object.freeze({
        levels: Object.freeze(levels),
        replaySets: Object.freeze(LEGACY_REPLAY_SETS),
        difficultyProfiles: DIFFICULTY_PROFILES,
        actions: ABSTRACT_ACTIONS,
        stalkerNames: STALKER_NAMES,
        contract: content,
        contentId: content.id
    });
}

export const CURRENT_CAMPAIGN_ADAPTER = createCurrentCampaignCompatibilityAdapter();
export const LEVELS = CURRENT_CAMPAIGN_ADAPTER.levels;
export const MATH_REPLAY_SETS = CURRENT_CAMPAIGN_ADAPTER.replaySets;
