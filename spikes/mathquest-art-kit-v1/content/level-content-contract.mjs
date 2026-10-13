export const LEVEL_CONTENT_SCHEMA_VERSION = 1;

export const ABSTRACT_ACTIONS = Object.freeze([
    'MOVE_LEFT', 'MOVE_RIGHT', 'JUMP', 'SLIDE', 'ATTACK', 'DASH', 'POWER',
    'CONFIRM', 'PAUSE', 'ANSWER_A', 'ANSWER_B', 'ANSWER_C',
    'NAV_PREVIOUS', 'NAV_NEXT', 'TOGGLE_AUDIO'
]);

export const DIFFICULTY_IDS = Object.freeze(['explorador', 'aventurero', 'maestro']);
export const ENCOUNTER_TYPES = Object.freeze(['route-math', 'altar-math', 'stalker-combat', 'guardian-math-combat', 'portal']);

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function inspectSerializable(value, path, errors, seen = new Set()) {
    if (typeof value === 'function') errors.push(`${path} must not contain runtime functions`);
    if (!isObject(value) && !Array.isArray(value)) return;
    if (seen.has(value)) return;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) inspectSerializable(child, `${path}.${key}`, errors, seen);
}

function validateQuestion(question, path, mappingKey, errors) {
    if (!isObject(question)) return errors.push(`${path} must be an object`);
    if (!question.prompt?.trim()) errors.push(`${path}.prompt is required`);
    if (!Array.isArray(question.choices) || question.choices.length !== 3) errors.push(`${path}.choices must contain exactly three options`);
    if (!question.answer?.trim()) errors.push(`${path}.answer is required`);
    const mapping = question[mappingKey];
    if (!Number.isInteger(mapping)) errors.push(`${path}.${mappingKey} must be an integer`);
    if (mappingKey === 'correctLane' && ![-1, 0, 1].includes(mapping)) errors.push(`${path}.correctLane must be -1, 0, or 1`);
    if (mappingKey === 'correctIndex' && (mapping < 0 || mapping > 2)) errors.push(`${path}.correctIndex must be 0, 1, or 2`);
}

export function validateLevelContent(level) {
    const errors = [];
    if (!isObject(level)) return { valid: false, errors: ['level must be an object'] };
    inspectSerializable(level, 'level', errors);
    if (level.schemaVersion !== LEVEL_CONTENT_SCHEMA_VERSION) errors.push(`schemaVersion must equal ${LEVEL_CONTENT_SCHEMA_VERSION}`);
    if (!level.id?.trim()) errors.push('id is required');
    if (!Number.isInteger(level.number) || level.number < 1) errors.push('number must be a positive integer');
    for (const key of ['chapter', 'name', 'objective', 'theme', 'guardian']) {
        if (!level[key]?.trim()) errors.push(`${key} is required`);
    }
    if (!Array.isArray(level.route) || level.route.length < 2) errors.push('route must contain at least two XYZ points');
    else level.route.forEach((point, index) => {
        if (!Array.isArray(point) || point.length !== 3 || !point.every(finiteNumber)) errors.push(`route[${index}] must be a finite XYZ tuple`);
    });
    if (!finiteNumber(level.routeLength) || level.routeLength <= 0) errors.push('routeLength must be a positive measured value');
    if (!isObject(level.palette)) errors.push('palette is required');
    else for (const key of ['background', 'fog', 'stone', 'damaged', 'ground', 'backplate']) {
        if (!Number.isInteger(level.palette[key])) errors.push(`palette.${key} must be an integer color`);
    }
    if (!Array.isArray(level.anchors) || level.anchors.length < 1) errors.push('anchors must not be empty');
    else {
        const ids = new Set();
        let previousDistance = -Infinity;
        level.anchors.forEach((anchor, index) => {
            const path = `anchors[${index}]`;
            if (!anchor.id?.trim() || ids.has(anchor.id)) errors.push(`${path}.id must be present and unique`);
            ids.add(anchor.id);
            if (!finiteNumber(anchor.distance) || anchor.distance < previousDistance) errors.push(`${path}.distance must be finite and ordered`);
            previousDistance = anchor.distance;
            if (!anchor.type?.trim()) errors.push(`${path}.type is required`);
        });
    }
    if (!Array.isArray(level.sections) || level.sections.length < 1) errors.push('sections must not be empty');
    else {
        let previousEnd = -Infinity;
        level.sections.forEach((section, index) => {
            const path = `sections[${index}]`;
            if (!section.id?.trim()) errors.push(`${path}.id is required`);
            if (!finiteNumber(section.startDistance) || !finiteNumber(section.endDistance) || section.endDistance <= section.startDistance) errors.push(`${path} requires an increasing distance range`);
            if (section.startDistance < previousEnd) errors.push(`${path} overlaps or is out of order`);
            previousEnd = section.endDistance;
            if (!Array.isArray(section.actions) || section.actions.some(action => !ABSTRACT_ACTIONS.includes(action))) errors.push(`${path}.actions contains an unsupported abstract action`);
        });
    }
    for (const [key, mapping] of [['questions', 'correctLane'], ['altarQuestions', 'correctIndex'], ['guardianQuestions', 'correctIndex']]) {
        if (!Array.isArray(level[key]) || level[key].length !== 3) errors.push(`${key} must contain one question per difficulty`);
        else level[key].forEach((question, index) => validateQuestion(question, `${key}[${index}]`, mapping, errors));
    }
    if (!isObject(level.mechanisms) || !level.mechanisms.mathRoute?.behaviorId || !level.mechanisms.altar?.behaviorId) errors.push('mechanisms must declare math route and altar behavior IDs');
    if (!Array.isArray(level.dynamicEvents) || level.dynamicEvents.length < 1 || level.dynamicEvents.some(event => !event.id?.trim() || !event.behaviorId?.trim() || !event.anchorId?.trim())) errors.push('dynamicEvents must declare stable event, behavior, and anchor IDs');
    if (!isObject(level.guardianBehavior) || !level.guardianBehavior.behaviorId?.trim()) errors.push('guardianBehavior.behaviorId is required');
    if (!isObject(level.camera) || !finiteNumber(level.camera.minimumClearance) || level.camera.minimumClearance <= 0) errors.push('camera.minimumClearance must be positive');
    if (!isObject(level.collision) || !level.collision.profileId?.trim()) errors.push('collision.profileId is required');
    else if (!isObject(level.collision.geometry) || level.collision.geometry.kind !== 'route-envelope' || !finiteNumber(level.collision.geometry.halfWidth)) errors.push('collision.geometry must declare a route envelope');
    if (!isObject(level.presentation) || level.presentation.projectorMinimumHeight < 720 || level.presentation.mathLabelMinimumPixels < 44) errors.push('presentation must preserve projector-readable labels');
    if (!Array.isArray(level.checkpoints) || level.checkpoints.length < 2 || level.checkpoints.some(value => !finiteNumber(value))) errors.push('checkpoints must contain finite distances');
    return { valid: errors.length === 0, errors };
}

export function validateCampaignContent(campaign) {
    const errors = [];
    if (!isObject(campaign)) return { valid: false, errors: ['campaign must be an object'] };
    if (campaign.schemaVersion !== LEVEL_CONTENT_SCHEMA_VERSION) errors.push(`campaign.schemaVersion must equal ${LEVEL_CONTENT_SCHEMA_VERSION}`);
    if (!Array.isArray(campaign.levels) || campaign.levels.length !== 3) errors.push('campaign must contain exactly three current levels');
    else {
        const ids = new Set();
        campaign.levels.forEach((level, index) => {
            const result = validateLevelContent(level);
            result.errors.forEach(error => errors.push(`levels[${index}].${error}`));
            if (ids.has(level.id)) errors.push(`levels[${index}].id must be unique`);
            ids.add(level.id);
        });
    }
    if (!Array.isArray(campaign.difficulties) || campaign.difficulties.map(item => item.id).join('|') !== DIFFICULTY_IDS.join('|')) errors.push('difficulties must be explorador, aventurero, maestro in order');
    for (const profile of campaign.difficulties || []) {
        for (const field of ['speed', 'steer', 'acceleration', 'obstacleThreshold', 'mazeTolerance', 'stalkerTelegraph', 'stalkerRecovery', 'guardianTelegraph', 'guardianRecovery', 'hesitationSeconds', 'multiplier']) {
            if (!finiteNumber(profile[field])) errors.push(`difficulty ${profile.id}.${field} must be finite`);
        }
    }
    if (!Array.isArray(campaign.requiredActions) || campaign.requiredActions.some(action => !ABSTRACT_ACTIONS.includes(action))) errors.push('requiredActions contains an unsupported action');
    return { valid: errors.length === 0, errors };
}
