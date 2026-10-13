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
            { prompt: '7 × 4 − 6 = ?', choices: ['20', '22', '24'], correctLane: 0, answer: '22' }
        ],
        guardianQuestions: [
            { prompt: '4 + 4 = ?', choices: ['6', '8', '10'], correctIndex: 1, answer: '8' },
            { prompt: '6 × 3 = ?', choices: ['18', '16', '21'], correctIndex: 0, answer: '18' },
            { prompt: '36 ÷ 4 + 5 = ?', choices: ['12', '14', '16'], correctIndex: 1, answer: '14' }
        ],
        altarQuestions: [
            { prompt: '15 − 7 = ?', choices: ['8', '6', '9'], correctIndex: 0, answer: '8' },
            { prompt: '9 × 4 = ?', choices: ['32', '42', '36'], correctIndex: 2, answer: '36' },
            { prompt: '48 ÷ 6 + 7 = ?', choices: ['13', '15', '16'], correctIndex: 1, answer: '15' }
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
            { prompt: '2/3 ÷ 1/3 = ?', choices: ['3', '1', '2'], correctLane: 1, answer: '2' }
        ],
        guardianQuestions: [
            { prompt: '1/2 DE 14 = ?', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' },
            { prompt: '3/4 DE 24 = ?', choices: ['16', '18', '20'], correctIndex: 1, answer: '18' },
            { prompt: '5/6 − 1/3 = ?', choices: ['1/2', '2/3', '1/3'], correctIndex: 0, answer: '1/2' }
        ],
        altarQuestions: [
            { prompt: '2/3 DE 18 = ?', choices: ['9', '15', '12'], correctIndex: 2, answer: '12' },
            { prompt: '5/8 DE 32 = ?', choices: ['20', '18', '24'], correctIndex: 0, answer: '20' },
            { prompt: '3/4 + 1/8 = ?', choices: ['5/8', '1', '7/8'], correctIndex: 2, answer: '7/8' }
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
            { prompt: '2x + 4 = 14', choices: ['5', '6', '4'], correctLane: -1, answer: '5' }
        ],
        guardianQuestions: [
            { prompt: 'x − 5 = 7', choices: ['10', '12', '14'], correctIndex: 1, answer: '12' },
            { prompt: '4x = 28', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' },
            { prompt: '3x + 5 = 26', choices: ['7', '8', '9'], correctIndex: 0, answer: '7' }
        ],
        altarQuestions: [
            { prompt: '2x = 14', choices: ['8', '6', '7'], correctIndex: 2, answer: '7' },
            { prompt: '5x − 5 = 20', choices: ['4', '5', '6'], correctIndex: 1, answer: '5' },
            { prompt: '4x + 3 = 27', choices: ['6', '5', '7'], correctIndex: 0, answer: '6' }
        ]
    }
];

const LEGACY_REPLAY_SETS = [
    {
        questions: [
            { prompt: '16 ÷ 4 = ?', choices: ['4', '2', '8'], correctLane: -1, answer: '4' },
            { prompt: '8 × 3 − 5 = ?', choices: ['21', '19', '24'], correctLane: 0, answer: '19' },
            { prompt: '54 ÷ 6 + 8 = ?', choices: ['15', '19', '17'], correctLane: 1, answer: '17' }
        ],
        altarQuestions: [
            { prompt: '14 − 6 = ?', choices: ['7', '8', '9'], correctIndex: 1, answer: '8' },
            { prompt: '7 × 6 = ?', choices: ['36', '42', '48'], correctIndex: 1, answer: '42' },
            { prompt: '63 ÷ 7 + 9 = ?', choices: ['16', '18', '20'], correctIndex: 1, answer: '18' }
        ],
        guardianQuestions: [
            { prompt: '5 + 7 = ?', choices: ['10', '12', '14'], correctIndex: 1, answer: '12' },
            { prompt: '9 × 4 = ?', choices: ['32', '36', '40'], correctIndex: 1, answer: '36' },
            { prompt: '48 ÷ 6 + 11 = ?', choices: ['17', '19', '21'], correctIndex: 1, answer: '19' }
        ]
    },
    {
        questions: [
            { prompt: '1/3 + 1/6 = ?', choices: ['1/3', '2/3', '1/2'], correctLane: 1, answer: '1/2' },
            { prompt: '3/4 DE 20 = ?', choices: ['15', '12', '18'], correctLane: -1, answer: '15' },
            { prompt: '5/6 − 1/3 = ?', choices: ['1/2', '2/3', '5/6'], correctLane: -1, answer: '1/2' }
        ],
        altarQuestions: [
            { prompt: '1/4 DE 24 = ?', choices: ['4', '6', '8'], correctIndex: 1, answer: '6' },
            { prompt: '7/8 DE 32 = ?', choices: ['24', '28', '30'], correctIndex: 1, answer: '28' },
            { prompt: '2/3 + 1/6 = ?', choices: ['3/4', '5/6', '1'], correctIndex: 1, answer: '5/6' }
        ],
        guardianQuestions: [
            { prompt: '1/3 DE 18 = ?', choices: ['5', '6', '7'], correctIndex: 1, answer: '6' },
            { prompt: '5/6 DE 30 = ?', choices: ['20', '24', '25'], correctIndex: 2, answer: '25' },
            { prompt: '7/8 − 3/8 = ?', choices: ['3/8', '1/2', '5/8'], correctIndex: 1, answer: '1/2' }
        ]
    },
    {
        questions: [
            { prompt: 'x + 9 = 17', choices: ['7', '9', '8'], correctLane: 1, answer: '8' },
            { prompt: '4x = 36', choices: ['9', '8', '10'], correctLane: -1, answer: '9' },
            { prompt: '3x − 2 = 19', choices: ['6', '7', '8'], correctLane: 0, answer: '7' }
        ],
        altarQuestions: [
            { prompt: '3x = 21', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' },
            { prompt: '6x − 6 = 30', choices: ['5', '6', '7'], correctIndex: 1, answer: '6' },
            { prompt: '5x + 2 = 37', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' }
        ],
        guardianQuestions: [
            { prompt: 'x − 8 = 6', choices: ['12', '14', '16'], correctIndex: 1, answer: '14' },
            { prompt: '5x = 45', choices: ['8', '9', '10'], correctIndex: 1, answer: '9' },
            { prompt: '4x + 7 = 35', choices: ['6', '7', '8'], correctIndex: 1, answer: '7' }
        ]
    }
];

export const DIFFICULTY_PROFILES = Object.freeze([
    Object.freeze({ id: 'explorador', name: 'EXPLORADOR', speed: 3.5, steer: 8.0, acceleration: 30, obstacleThreshold: .4, mazeTolerance: 1.14, stalkerTelegraph: 1.12, stalkerRecovery: 1.42, guardianTelegraph: 1.3, guardianRecovery: 1.58, hesitationSeconds: 9, guidance: 'REFORZADA', multiplier: 1 }),
    Object.freeze({ id: 'aventurero', name: 'AVENTURERO', speed: 4.2, steer: 9.0, acceleration: 35, obstacleThreshold: .55, mazeTolerance: 1, stalkerTelegraph: .85, stalkerRecovery: 1.12, guardianTelegraph: 1, guardianRecovery: 1.25, hesitationSeconds: 7, guidance: 'ESTÁNDAR', multiplier: 1.25 }),
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
