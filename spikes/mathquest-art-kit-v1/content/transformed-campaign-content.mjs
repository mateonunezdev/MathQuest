import {
    CURRENT_CAMPAIGN_CONTENT,
    DIFFICULTY_PROFILES,
    createCurrentCampaignCompatibilityAdapter
} from './current-campaign-content.mjs';
import { ABSTRACT_ACTIONS, LEVEL_CONTENT_SCHEMA_VERSION } from './level-content-contract.mjs';

const ROUTES = Object.freeze([
    Object.freeze([[0, 8, 12], [0, 7, -8], [-3, 5.8, -28], [-6, 4.3, -48], [-4, 3.2, -68], [0, 2.5, -88], [5, 2.8, -108], [8, 3.5, -128], [5, 4.5, -148], [0, 5.5, -168], [0, 6.5, -188]]),
    Object.freeze([[0, 0, 10], [2, 2, -8], [5, 4, -26], [3, 6, -44], [-2, 8, -62], [-5, 10, -80], [-2, 12, -98], [3, 14, -116], [6, 16, -134], [3, 18, -152], [0, 20, -170], [0, 22, -190]]),
    Object.freeze([[0, 0, 10], [-2, .3, -10], [-4, .8, -30], [-2, 1.5, -50], [3, 2.2, -70], [6, 3, -90], [3, 3.5, -110], [-3, 4, -130], [-6, 4.5, -150], [-2, 5, -170], [2, 5.5, -190]])
]);

const PLANS = Object.freeze([
    Object.freeze({
        id: 'waterfall-sanctuary-transformation-v2', name: 'SANTUARIO DE LAS CASCADAS',
        objective: 'DESCIENDE POR EL VALLE, REDIRIGE EL AGUA Y DESPIERTA AL COLOSO',
        routeLength: 202.9592457627741, math: 61, altar: 121, guardian: 177, portal: 198.2,
        first: { jump: 24, slide: 43, dash: 54 }, second: { jump: 116, slide: 139, dash: 155 },
        enabledObstacles: ['jump', 'slide', 'dash2'],
        mechanism: 'living-water-sluice-bridge-v2', guardianBehavior: 'waterfall-colossus-v2',
        // The isolated Waterfall V2 review suppresses this encounter in
        // scene.js, but the complete campaign needs three distinct maths
        // beats: hydraulic route, sanctuary altar and guardian seal.
        topology: 'overlook-descent-aqueduct-basin', altarEnabled: true,
        sections: [
            ['valley-overlook', 0, 24, ['MOVE_LEFT', 'MOVE_RIGHT']],
            ['ruin-descent', 24, 61, ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP', 'SLIDE']],
            ['sluice-equation', 61, 78, ['ANSWER_A', 'ANSWER_B', 'ANSWER_C']],
            ['raised-aqueduct', 78, 121, ['MOVE_LEFT', 'MOVE_RIGHT', 'DASH']],
            ['altar-and-colossus-basin', 121, 177, ['ANSWER_A', 'ANSWER_B', 'ANSWER_C', 'MOVE_LEFT', 'MOVE_RIGHT', 'ATTACK', 'DASH', 'POWER']],
            ['waterfall-portal', 177, 198.2, ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP', 'DASH']]
        ]
    }),
    Object.freeze({
        id: 'fraction-observatory-transformation-v2', name: 'OBSERVATORIO DE LAS FRACCIONES',
        objective: 'ASCIENDE LAS TERRAZAS, ALINEA EL ORRERY Y CRUZA EL ECLIPSE',
        routeLength: 204.3819967727792, math: 69, altar: 132, guardian: 180, portal: 199.6,
        first: { jump: 31, slide: 52, dash: 62 }, second: { jump: 108, slide: 147, dash: 160 },
        enabledObstacles: ['dash', 'jump2', 'slide2'],
        mechanism: 'fraction-orrery-celestial-bridge-v2', guardianBehavior: 'eclipse-sentinel-v2',
        topology: 'ascending-terraces-orbital-crossing', altarEnabled: true,
        sections: [
            ['lower-terrace', 0, 31, ['MOVE_LEFT', 'MOVE_RIGHT']],
            ['rotating-ascent', 31, 69, ['MOVE_LEFT', 'MOVE_RIGHT', 'DASH']],
            ['fraction-orrery', 69, 88, ['ANSWER_A', 'ANSWER_B', 'ANSWER_C']],
            ['celestial-bridge', 88, 132, ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP']],
            ['eclipse-alignment', 132, 150, ['ANSWER_A', 'ANSWER_B', 'ANSWER_C']],
            ['sentinel-spire', 150, 180, ['ATTACK', 'DASH', 'POWER']],
            ['sky-portal', 180, 199.6, ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP', 'DASH']]
        ]
    }),
    Object.freeze({
        id: 'algebra-forge-transformation-v2', name: 'FORJA DEL NÚCLEO ALGEBRAICO',
        objective: 'EQUILIBRA LA FUNDICIÓN, DOMINA LOS PISTONES Y DERRIBA AL TITÁN',
        routeLength: 203.45037446473796, math: 58, altar: 126, guardian: 178, portal: 198.7,
        first: { jump: 20, slide: 36, dash: 49 }, second: { jump: 94, slide: 111, dash: 151 },
        enabledObstacles: ['jump', 'slide', 'dash', 'jump2', 'slide2', 'dash2'],
        mechanism: 'algebra-counterweight-core-v2', guardianBehavior: 'magma-forge-titan-v2',
        topology: 'foundry-floor-piston-gauntlet-core', altarEnabled: true,
        sections: [
            ['forge-threshold', 0, 20, ['MOVE_LEFT', 'MOVE_RIGHT']],
            ['magma-bridges', 20, 58, ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP', 'SLIDE', 'DASH']],
            ['balance-equation', 58, 76, ['ANSWER_A', 'ANSWER_B', 'ANSWER_C']],
            ['counterweight-crossing', 76, 103, ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP']],
            ['piston-gauntlet', 103, 126, ['MOVE_LEFT', 'MOVE_RIGHT', 'SLIDE']],
            ['core-activation', 126, 144, ['ANSWER_A', 'ANSWER_B', 'ANSWER_C']],
            ['titan-foundry', 144, 178, ['ATTACK', 'DASH', 'POWER']],
            ['final-core-portal', 178, 198.7, ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP', 'DASH', 'POWER']]
        ]
    })
]);

const PALETTES = Object.freeze([
    Object.freeze({ background: 0x65a8ca, fog: 0x8bbec5, stone: 0x9aa89a, damaged: 0x536b61, ground: 0x31584c, backplate: 0xc9f4df }),
    Object.freeze({ background: 0x3f79bd, fog: 0x9dbddd, stone: 0xa7afba, damaged: 0x5b6680, ground: 0x293554, backplate: 0xe2efff }),
    Object.freeze({ background: 0x281015, fog: 0x57231b, stone: 0x8f7a76, damaged: 0x4d3d43, ground: 0x30222a, backplate: 0xffb178 })
]);

function frozenAnchor(id, type, distance) {
    return Object.freeze({ id, type, distance });
}

function buildLevel(source, index) {
    const plan = PLANS[index];
    const runtime = Object.freeze({
        version: 2,
        candidateId: 'mathquest-real-gameplay-v2',
        topologyId: plan.topology,
        mathGateStop: plan.math,
        mathGateResolve: plan.math + 10,
        explorationEnabled: false,
        altarEnabled: plan.altarEnabled,
        stalkerEnabled: false,
        enabledObstacles: Object.freeze(plan.enabledObstacles),
        // Bridge modules must sit on locally readable route segments. The old
        // Level 2 anchor at 91 crossed the sharp orbital bend (11.88° across a
        // module), so the causeway visibly cut across its own route.
        bridgeAnchors: Object.freeze(index === 0 ? [66, 70, 74, 78, 82] : index === 1 ? [76, 80, 84, 87, 88] : [65, 70, 75, 80, 85]),
        firstObstacles: Object.freeze(plan.first),
        secondObstacles: Object.freeze(plan.second),
        altarDistance: plan.altar,
        guardianDistance: plan.guardian,
        portalDistance: plan.portal,
        zone: index === 0 ? 'CUENCA DEL COLOSO' : index === 1 ? 'CÚPULA DEL ECLIPSE' : 'CÁMARA DEL NÚCLEO',
        objective: plan.objective,
        rune: index === 0 ? 'CAUCE VIVO' : index === 1 ? 'SECTOR CELESTE' : 'NÚCLEO ALGEBRAICO',
        mechanismId: plan.mechanism
    });
    return Object.freeze({
        ...source,
        schemaVersion: LEVEL_CONTENT_SCHEMA_VERSION,
        id: plan.id,
        name: plan.name,
        objective: plan.objective,
        palette: PALETTES[index],
        route: ROUTES[index],
        routeLength: plan.routeLength,
        anchors: Object.freeze([
            frozenAnchor('start', 'spawn', 0),
            frozenAnchor('route-math', 'route-math', plan.math),
            frozenAnchor('mechanism-crossing', 'physical-environment-change', plan.math + 17),
            frozenAnchor('altar', plan.altarEnabled ? 'altar-math' : 'architectural-landmark', plan.altar),
            frozenAnchor('guardian', 'guardian', plan.guardian),
            frozenAnchor('portal', 'portal', plan.portal)
        ]),
        sections: Object.freeze(plan.sections.map(([id, startDistance, endDistance, actions]) => Object.freeze({
            id, startDistance, endDistance, actions: Object.freeze(actions)
        }))),
        mechanisms: Object.freeze({
            mathRoute: Object.freeze({ behaviorId: plan.mechanism, answerActions: Object.freeze(['ANSWER_A', 'ANSWER_B', 'ANSWER_C']) }),
            altar: Object.freeze({ behaviorId: plan.altarEnabled ? `${plan.mechanism}-core` : `${plan.mechanism}-landmark`, answerActions: Object.freeze(['ANSWER_A', 'ANSWER_B', 'ANSWER_C']) }),
            environment: Object.freeze({ behaviorId: `${plan.mechanism}-world-response` })
        }),
        dynamicEvents: Object.freeze([
            Object.freeze({ id: 'math-changes-world', behaviorId: plan.mechanism, anchorId: 'route-math' }),
            Object.freeze({ id: 'physical-route-opens', behaviorId: `${plan.mechanism}-world-response`, anchorId: 'mechanism-crossing' }),
            Object.freeze({ id: 'guardian-release', behaviorId: plan.guardianBehavior, anchorId: 'guardian' }),
            Object.freeze({ id: 'portal-entry', behaviorId: 'cinematic-portal-leap-v2', anchorId: 'portal' })
        ]),
        guardianBehavior: Object.freeze({ ...source.guardianBehavior, behaviorId: plan.guardianBehavior }),
        checkpoints: Object.freeze([0, plan.math, plan.math + 17, plan.altar, plan.guardian, plan.portal]),
        runtime
    });
}

export const TRANSFORMED_CAMPAIGN_CONTENT = Object.freeze({
    schemaVersion: LEVEL_CONTENT_SCHEMA_VERSION,
    id: 'mathquest-real-gameplay-transformation-v2',
    levels: Object.freeze(CURRENT_CAMPAIGN_CONTENT.levels.map(buildLevel)),
    difficulties: DIFFICULTY_PROFILES,
    requiredActions: ABSTRACT_ACTIONS,
    controllerPolicy: CURRENT_CAMPAIGN_CONTENT.controllerPolicy
});

export const TRANSFORMED_CAMPAIGN_ADAPTER = createCurrentCampaignCompatibilityAdapter(TRANSFORMED_CAMPAIGN_CONTENT);
