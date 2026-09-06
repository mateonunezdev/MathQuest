#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const levelPath = path.join(__dirname, '../js/levels/LevelData.js');
const levelCode = fs.readFileSync(levelPath, 'utf-8');

function extractTilemap(code) {
    const match = code.match(/const tilemap\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) throw new Error('No se encontró tilemap en LevelData.js');
    return eval(match[1]);
}

function extractDoor(code) {
    const match = code.match(/door:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)/);
    if (!match) throw new Error('No se encontró door en LevelData.js');
    return { x: parseInt(match[1]), y: parseInt(match[2]) };
}

function extractGoal(code) {
    const match = code.match(/goal:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)/);
    if (!match) throw new Error('No se encontró goal en LevelData.js');
    return { x: parseInt(match[1]), y: parseInt(match[2]) };
}

function extractPlayerStart(code, tileSize) {
    const match = code.match(/playerStart:\s*\{\s*x:\s*([^,\}]+),\s*y:\s*([^,\}]+)/);
    if (!match) throw new Error('No se encontró playerStart en LevelData.js');
    return { 
        x: Math.floor(eval(match[1].replace('tileSize', tileSize)) / tileSize), 
        y: Math.floor(eval(match[2].replace('tileSize', tileSize)) / tileSize) 
    };
}

function extractDimensions(code) {
    const wMatch = code.match(/const width\s*=\s*(\d+)/);
    const hMatch = code.match(/const height\s*=\s*(\d+)/);
    const tsMatch = code.match(/const tileSize\s*=\s*(\d+)/);
    if (!wMatch || !hMatch || !tsMatch) throw new Error('No se encontraron dimensiones');
    return { width: parseInt(wMatch[1]), height: parseInt(hMatch[1]), tileSize: parseInt(tsMatch[1]) };
}

const { width, height, tileSize } = extractDimensions(levelCode);
const tilemap = extractTilemap(levelCode);
const door = extractDoor(levelCode);
const goal = extractGoal(levelCode);
const start = extractPlayerStart(levelCode, tileSize);

console.log('=== LEVEL 1 VALIDATION ===');
console.log(`Map: ${width}x${height} tiles (${width * tileSize}x${height * tileSize}px)`);
console.log(`Tile size: ${tileSize}px`);
console.log(`Start tile: (${start.x}, ${start.y})`);
console.log(`Door tile: (${door.x}, ${door.y})`);
console.log(`Goal tile: (${goal.x}, ${goal.y})`);

function isWalkable(tilemap, x, y, doorBlocks) {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    if (tilemap[y][x] === 1) return false;
    if (doorBlocks && x === door.x && (y === door.y || y === door.y + 1)) return false;
    return true;
}

function bfs(tilemap, start, goal, doorBlocks) {
    const visited = new Set();
    const queue = [{ x: start.x, y: start.y, path: [] }];
    visited.add(`${start.x},${start.y}`);
    
    const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    
    while (queue.length > 0) {
        const { x, y, path } = queue.shift();
        
        if (x === goal.x && y === goal.y) {
            return { reachable: true, path: [...path, {x,y}] };
        }
        
        for (const d of dirs) {
            const nx = x + d.x;
            const ny = y + d.y;
            const key = `${nx},${ny}`;
            
            if (!visited.has(key) && isWalkable(tilemap, nx, ny, doorBlocks)) {
                visited.add(key);
                queue.push({ x: nx, y: ny, path: [...path, {x,y}] });
            }
        }
    }
    
    return { reachable: false, path: [] };
}

function validateStartGoal() {
    const errors = [];
    
    if (tilemap[start.y][start.x] === 1) {
        errors.push(`Start (${start.x},${start.y}) está DENTRO de un muro`);
    }
    if (tilemap[goal.y][goal.x] === 1) {
        errors.push(`Goal (${goal.x},${goal.y}) está DENTRO de un muro`);
    }
    if (door.x < 0 || door.x >= width || door.y < 0 || door.y >= height) {
        errors.push(`Door (${door.x},${door.y}) fuera de límites`);
    }
    
    return errors;
}

console.log('\n--- Validaciones básicas ---');
const basicErrors = validateStartGoal();
if (basicErrors.length === 0) {
    console.log('PASS: Start en tile válido');
    console.log('PASS: Goal en tile válido');
    console.log('PASS: Door en posición válida');
} else {
    basicErrors.forEach(e => console.log('FAIL:', e));
}

console.log('\n--- TEST 1: Puerta CERRADA (doorBlocks=true) ---');
const closedResult = bfs(tilemap, start, goal, true);
if (closedResult.reachable) {
    console.log('FAIL: Goal REACHABLE con puerta cerrada (bypass existe)');
    console.log(`  Ruta encontrada (${closedResult.path.length} pasos):`, closedResult.path.map(p=>`(${p.x},${p.y})`).join(' → '));
} else {
    console.log('PASS: Goal UNREACHABLE con puerta cerrada');
}

console.log('\n--- TEST 2: Puerta ABIERTA (doorBlocks=false) ---');
const openResult = bfs(tilemap, start, goal, false);
if (openResult.reachable) {
    console.log('PASS: Goal REACHABLE con puerta abierta');
    console.log(`  Ruta (${openResult.path.length} pasos):`, openResult.path.map(p=>`(${p.x},${p.y})`).join(' → '));
} else {
    console.log('FAIL: Goal UNREACHABLE con puerta abierta');
}

console.log('\n=== RESUMEN ===');
const allPass = basicErrors.length === 0 && !closedResult.reachable && openResult.reachable;
if (allPass) {
    console.log('✓ TODOS LOS TESTS PASAN');
    process.exit(0);
} else {
    console.log('✗ ALGUNOS TESTS FALLAN');
    process.exit(1);
}