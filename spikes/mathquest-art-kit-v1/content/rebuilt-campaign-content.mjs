import {
    CURRENT_CAMPAIGN_CONTENT,
    DIFFICULTY_PROFILES,
    createCurrentCampaignCompatibilityAdapter
} from './current-campaign-content.mjs';
import { ABSTRACT_ACTIONS, LEVEL_CONTENT_SCHEMA_VERSION } from './level-content-contract.mjs';

const ROUTES = Object.freeze([
    Object.freeze([[0, 0, 8], [0, 0, -10], [.5, .25, -28], [1.5, .75, -46], [3, 1.25, -64], [4, 1.6, -82], [2.5, 2, -100], [.5, 2.5, -118], [-1.5, 3, -136], [-3, 3.4, -154], [-2, 3.75, -172], [0, 4.05, -190]]),
    Object.freeze([[0, 0, 8], [1, .5, -10], [3, 1.3, -28], [4, 2.4, -46], [3, 3.6, -64], [1, 4.9, -82], [-1, 6.1, -100], [-2, 7.2, -118], [0, 8.2, -136], [2, 9.1, -154], [3, 9.8, -172], [1, 10.4, -190]]),
    Object.freeze([[0, 0, 8], [-1, -.25, -11], [-3, -.55, -30], [-4, -.35, -49], [-3, .25, -68], [-1, 1, -87], [1, 1.7, -106], [3, 2.3, -125], [4, 3, -144], [2, 3.6, -163], [0, 4.2, -182], [-1, 4.8, -201]])
]);

const BLUEPRINTS = Object.freeze([
    Object.freeze({
        id: 'waterfall-sanctuary-rebuild-v1', name: 'SANTUARIO DE LAS CASCADAS',
        objective: 'ABRE LOS CAUCES, DESPIERTA AL COLOSO Y SALTA AL PORTAL',
        routeLength: 198.67222523934896, altar: 119, math: 45, exploration: [62, 92], guardian: 174, stalker: 151,
        maze: [69, 78, 87], lanes: [-1, 1, 0], bridges: [33, 38, 43, 48, 53],
        first: { jump: 16, slide: 29, dash: 40 }, second: { jump: 130, slide: 138, dash: 145 },
        zone: 'SANTUARIO DE CAUCES', objectiveShort: 'ACTIVA LAS 3 COMPUERTAS DE AGUA', rune: 'SELLO DE AGUA',
        mechanism: 'water-sluice-bridge-v1', guardianBehavior: 'cascade-colossus-v1'
    }),
    Object.freeze({
        id: 'fraction-observatory-rebuild-v1', name: 'OBSERVATORIO DE FRACCIONES',
        objective: 'ALINEA EL ORRERY, CRUZA EL ECLIPSE Y VENCE AL CENTINELA',
        routeLength: 199.12099213881547, altar: 123, math: 49, exploration: [66, 99], guardian: 171, stalker: 151,
        maze: [74, 84, 94], lanes: [1, -1, 1], bridges: [36, 42, 48, 54, 60],
        first: { jump: 17, slide: 31, dash: 42 }, second: { jump: 130, slide: 139, dash: 146 },
        zone: 'ORRERY FRACCIONARIO', objectiveShort: 'ALINEA LAS 3 ÓRBITAS', rune: 'FRACCIÓN CELESTE',
        mechanism: 'fraction-orrery-causeway-v1', guardianBehavior: 'eclipse-sentinel-v1'
    }),
    Object.freeze({
        id: 'algebra-forge-rebuild-v1', name: 'FORJA DEL EQUILIBRIO',
        objective: 'EQUILIBRA LA ECUACIÓN, DOMINA LOS PISTONES Y FUNDE AL TITÁN',
        routeLength: 209.87083813417686, altar: 132, math: 52, exploration: [69, 104], guardian: 185, stalker: 162,
        maze: [77, 89, 99], lanes: [0, 1, -1], bridges: [38, 44, 50, 56, 62],
        first: { jump: 18, slide: 33, dash: 45 }, second: { jump: 140, slide: 150, dash: 157 },
        zone: 'CÁMARA DE EQUILIBRIO', objectiveShort: 'EQUILIBRA LOS 3 PESOS', rune: 'PESO ALGEBRAICO',
        mechanism: 'algebra-balance-foundry-v1', guardianBehavior: 'forge-titan-v1'
    })
]);

function anchor(id, type, distance) {
    return Object.freeze({ id, type, distance });
}

function section(id, startDistance, endDistance, actions) {
    return Object.freeze({ id, startDistance, endDistance, actions: Object.freeze(actions) });
}

function buildLevel(source, index) {
    const plan = BLUEPRINTS[index];
    const portal = plan.routeLength - 4.1;
    const [explorationStart, explorationEnd] = plan.exploration;
    const runtime = Object.freeze({
        version: 1,
        mathGateStop: plan.math,
        mathGateResolve: plan.math + 8.2,
        explorationStart,
        explorationEnd,
        mazeDistances: Object.freeze(plan.maze),
        mazeLanes: Object.freeze(plan.lanes),
        bridgeAnchors: Object.freeze(plan.bridges),
        firstObstacles: Object.freeze(plan.first),
        secondObstacles: Object.freeze(plan.second),
        altarDistance: plan.altar,
        stalkerDistance: plan.stalker,
        guardianDistance: plan.guardian,
        portalDistance: portal,
        zone: plan.zone,
        objective: plan.objectiveShort,
        rune: plan.rune,
        mechanismId: plan.mechanism
    });
    return Object.freeze({
        ...source,
        schemaVersion: LEVEL_CONTENT_SCHEMA_VERSION,
        id: plan.id,
        name: plan.name,
        objective: plan.objective,
        route: ROUTES[index],
        routeLength: plan.routeLength,
        anchors: Object.freeze([
            anchor('start', 'spawn', 0),
            anchor('route-math', 'route-math', plan.math),
            anchor('exploration-start', 'manual-exploration', explorationStart),
            anchor('exploration-end', 'manual-exploration-exit', explorationEnd),
            anchor('altar', 'altar-math', plan.altar),
            anchor('stalker', 'stalker-combat', plan.stalker),
            anchor('guardian', 'guardian', plan.guardian),
            anchor('portal', 'portal', portal)
        ]),
        sections: Object.freeze([
            section('movement-introduction', 0, plan.math, ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP', 'SLIDE', 'DASH']),
            section('architectural-math', plan.math, explorationStart, ['MOVE_LEFT', 'MOVE_RIGHT', 'ANSWER_A', 'ANSWER_B', 'ANSWER_C']),
            section('signature-mechanism', explorationStart, explorationEnd, ['MOVE_LEFT', 'MOVE_RIGHT', 'CONFIRM']),
            section('escalation-run', explorationEnd, plan.altar, ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP', 'SLIDE', 'DASH']),
            section('altar-and-stalker', plan.altar, plan.stalker, ['ANSWER_A', 'ANSWER_B', 'ANSWER_C', 'ATTACK', 'DASH', 'POWER']),
            section('guardian-arena', plan.stalker, plan.guardian, ['ATTACK', 'DASH', 'POWER']),
            section('portal-finale', plan.guardian, portal, ['MOVE_LEFT', 'MOVE_RIGHT', 'JUMP', 'ATTACK', 'DASH', 'POWER'])
        ]),
        mechanisms: Object.freeze({
            mathRoute: Object.freeze({ behaviorId: plan.mechanism, answerActions: Object.freeze(['ANSWER_A', 'ANSWER_B', 'ANSWER_C']) }),
            altar: Object.freeze({ behaviorId: `${plan.mechanism}-altar`, answerActions: Object.freeze(['ANSWER_A', 'ANSWER_B', 'ANSWER_C']) }),
            environment: Object.freeze({ behaviorId: `${plan.mechanism}-environment` })
        }),
        dynamicEvents: Object.freeze([
            Object.freeze({ id: 'math-architecture-reacts', behaviorId: plan.mechanism, anchorId: 'route-math' }),
            Object.freeze({ id: 'signature-world-event', behaviorId: `${plan.mechanism}-event`, anchorId: 'exploration-start' }),
            Object.freeze({ id: 'guardian-release', behaviorId: plan.guardianBehavior, anchorId: 'guardian' }),
            Object.freeze({ id: 'portal-entry', behaviorId: 'cinematic-portal-leap-v1', anchorId: 'portal' })
        ]),
        guardianBehavior: Object.freeze({ ...source.guardianBehavior, behaviorId: plan.guardianBehavior }),
        checkpoints: Object.freeze([0, plan.math, explorationStart, explorationEnd, plan.altar, plan.stalker, plan.guardian, portal]),
        runtime
    });
}

export const REBUILT_CAMPAIGN_CONTENT = Object.freeze({
    schemaVersion: LEVEL_CONTENT_SCHEMA_VERSION,
    id: 'mathquest-global-3d-rebuild-v1',
    levels: Object.freeze(CURRENT_CAMPAIGN_CONTENT.levels.map(buildLevel)),
    difficulties: DIFFICULTY_PROFILES,
    requiredActions: ABSTRACT_ACTIONS,
    controllerPolicy: CURRENT_CAMPAIGN_CONTENT.controllerPolicy
});

export const REBUILT_CAMPAIGN_ADAPTER = createCurrentCampaignCompatibilityAdapter(REBUILT_CAMPAIGN_CONTENT);
