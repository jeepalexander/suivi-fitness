// Tests de la partie calcul de la saisie rapide (js/quick_logic.js), avec node --test (1.8.92, co-auteur : Claude).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const Q = require('../js/quick_logic.js');
// Catalogue réel, pour vérifier que les listes visent des exercices qui existent
const ctx = {}; vm.runInNewContext(readFileSync(new URL('../js/catalogue.js', import.meta.url), 'utf8') + ';this.C = CATALOGUE;', ctx);
const CAT = Object.fromEntries(ctx.C.map(e => [e.name, e]));

const memoire = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; };

test('les listes ne nomment que des exercices du catalogue', () => {
  for (const n of [...Q.BARBELL_EXERCISES, ...Q.SHORT_BAR_EXERCISES, ...Q.DUMBBELL_EXERCISES, 'Presse à cuisses', 'Hack squat', 'Mollets assis'])
    assert.ok(CAT[n], n);
});

test('classement par matériel', () => {
  const mode = n => Q.quickMode(n, CAT[n]);
  assert.equal(mode('Développé couché'), 'barbell');
  assert.equal(mode('Shrugs barre'), 'barbell');
  assert.equal(mode('Hip thrust'), 'barbell');
  assert.equal(mode('Curl barre EZ'), 'shortbar');
  assert.equal(mode('Extension triceps couché'), 'shortbar');
  assert.equal(mode('Presse à cuisses'), 'platemachine');
  assert.equal(mode('Mollets assis'), 'platemachine');
  assert.equal(mode('Hip thrust haltères'), 'dumbbell');
  assert.equal(mode('Fentes'), 'dumbbell');
  assert.equal(mode('Montées sur banc'), 'dumbbell');
  assert.equal(mode('Tirage menton'), 'machine');
  assert.equal(mode('Tirage vertical'), 'machine');
  assert.equal(mode('Tractions'), 'bw');
  assert.equal(mode('Pompes'), 'reps');
  assert.equal(mode('Planche'), 'time');
  assert.equal(mode('Corde à sauter'), 'time');
  assert.equal(mode('Rameur'), 'cardio');
  assert.equal(mode('Stair climber'), 'cardio');
  // noms personnalisés
  assert.equal(Q.quickMode('Rowing haltère penché', { mode: 'weight' }), 'dumbbell');
  assert.equal(Q.quickMode('Curl haltère poulie', { mode: 'weight' }), 'machine');
  assert.equal(Q.quickMode('Squat barre devant', { mode: 'weight' }), 'barbell');
  assert.equal(Q.quickMode('Curl barre ez pupitre', { mode: 'weight' }), 'machine');
});

test('× 2 ou × 1', () => {
  assert.equal(Q.weightMultiplierFor('Développé haltères'), 2);
  assert.equal(Q.weightMultiplierFor('Fentes'), 2);
  assert.equal(Q.weightMultiplierFor('Rowing unilatéral'), 1);
  assert.equal(Q.weightMultiplierFor('Squat goblet'), 1);
  assert.equal(Q.weightMultiplierFor('Élévation haltère 1 bras'), 1);
  assert.equal(Q.weightMultiplierFor('Curl haltères'), 2);
  assert.equal(Q.weightMultiplierFor('Développé couché'), 1);
  assert.equal(Q.plateMachineSides('Hack squat'), 2);
  assert.equal(Q.plateMachineSides('Mollets assis'), 1);
  assert.equal(Q.toSetWeightValue(12, 2), 24);
  assert.equal(Q.fromSetWeightValue(24, 2), 12);
  assert.equal(Q.fromSetWeightValue('14', 1), 14);
});

test('nombres, bornes et libellés', () => {
  assert.equal(Q.parseQuickNum('2,5'), 2.5);
  assert.equal(Q.parseQuickNum('−5'), -5);
  assert.equal(Q.parseQuickNum('+1'), 1);
  assert.equal(Q.parseQuickNum(''), null);
  assert.equal(Q.parseQuickNum('abc'), null);
  assert.equal(Q.step(498, 10, 'weight'), 500);
  assert.equal(Q.step(1, -5, 'weight'), 0);
  assert.equal(Q.step(-148, -5, 'bw'), -150);
  assert.equal(Q.step(0, -1, 'reps'), 0);
  assert.equal(Q.step(10, -30, 'time'), 0);
  assert.equal(Q.step('2,5', 2.5, 'weight'), 5);
  assert.equal(Q.formatDuration(95), '1:35');
  assert.equal(Q.bwLabel(0), 'PDC');
  assert.equal(Q.bwLabel(5), 'PDC + 5 kg');
  assert.equal(Q.bwLabel(-2.5), 'PDC − 2,5 kg');
});

test('barre olympique : total et décomposition', () => {
  let p = [];
  p = Q.addPlate(p, 25); p = Q.addPlate(p, 10); p = Q.addPlate(p, 2.5);
  assert.equal(Q.totalFromBarPlates(20, p), 95);
  assert.deepEqual(Q.removeLastPlate(p), [25, 10]);
  assert.deepEqual(Q.sortedPlates([2.5, 25, 10]), [25, 10, 2.5]);
  assert.deepEqual(Q.computeBarbellLoad(95, 20).plates, [25, 10, 2.5]);
  assert.equal(Q.computeBarbellLoad(20, 20).plates.length, 0);
  assert.equal(Q.computeBarbellLoad(15, 20).belowBar, true);
  assert.equal(Q.computeBarbellLoad(21, 20).rest, 0.5);
  for (let i = 0; i < 10; i++) p = Q.addPlate(p, 1);
  assert.equal(p.length, Q.MAX_PLATES);
});

test('barre courte et machine chargée de disques', () => {
  assert.deepEqual(Q.rackFor('shortbar'), [1, 2.5, 5, 10, 15]);
  assert.equal(Q.shortBar('ez').kg, 8);
  assert.equal(Q.totalFromBarPlates(Q.shortBar('ez').kg, [10, 2.5]), 33);
  assert.deepEqual(Q.computeBarbellLoad(33, 8, Q.SHORT_RACK).plates, [10, 2.5]);
  assert.equal(Q.totalFromBarPlates(0, [25, 25, 10], 2), 120);
  assert.equal(Q.totalFromBarPlates(40, [20], 1), 60);
});

test('haltères : râtelier, paliers, couleurs', () => {
  assert.equal(Q.computeDumbbellRackStart(12), 10);
  assert.deepEqual(Q.buildDumbbellRack(10), [10, 12, 14, 16]);
  assert.equal(Q.computeDumbbellRackStart('', 20), 18);
  assert.equal(Q.computeDumbbellRackStart(0), 2);
  assert.equal(Q.computeDumbbellRackStart(60), 54);
  assert.equal(Q.shiftDumbbellRackStart(10, 1), 18);
  assert.equal(Q.shiftDumbbellRackStart(4, -1), 2);
  assert.equal(Q.shiftDumbbellRackStart(50, 1), 54);
  assert.deepEqual([6, 8, 14, 16, 24, 26, 60].map(Q.dumbbellTierFor), [44, 56, 56, 70, 70, 84, 84]);
  assert.equal(Q.dumbbellColorFor(2).hue, 142);
  assert.equal(Q.dumbbellColorFor(60).hue, 0);
  assert.equal(Q.dumbbellColorFor(13).hue, Q.dumbbellColorFor(12).hue);
  assert.match(Q.dumbbellColorFor(30).text, /^#(111114|FFFFFF)$/);
  assert.equal(Q.dumbbellColorFor(12).background, '#2CA527');   // couleur de la maquette
  assert.equal(Q.dumbbellColorFor(12).text, '#FFFFFF');
});

test('cardio : profils de distance', () => {
  assert.deepEqual(Q.cardioDistanceProfile('Rameur', CAT['Rameur']).steps, [1, 0.5, 0.25]);
  assert.deepEqual(Q.cardioDistanceProfile('Vélo elliptique', CAT['Vélo elliptique']).steps, [1, 0.5, 0.25]);
  assert.deepEqual(Q.cardioDistanceProfile('Tapis de course', CAT['Tapis de course']).steps, [10, 5, 1]);
  assert.equal(Q.cardioDistanceProfile('Stair climber', CAT['Stair climber']).kind, 'floors');
});

test('mémoire par exercice : barre et machine à vide', () => {
  const m = memoire();
  assert.equal(Q.barWeightFor(m, 'Squat'), 20);
  assert.equal(Q.rememberBarWeight(m, 'Squat', 15), true);
  assert.equal(Q.rememberBarWeight(m, 'Squat', 17), false);      // jamais saisi à la main
  assert.equal(Q.barWeightFor(m, 'Squat'), 15);
  assert.equal(Q.barWeightFor(m, 'Curl barre EZ'), 'ez');
  Q.rememberBarWeight(m, 'Curl barre EZ', 'droite');
  assert.equal(Q.baseWeightFor(m, 'Curl barre EZ', 'shortbar'), 7);
  assert.equal(Q.machineEmptyFor(m, 'Presse à cuisses'), null);
  Q.rememberMachineEmpty(m, 'Presse à cuisses', '42,5');
  assert.equal(Q.baseWeightFor(m, 'Presse à cuisses', 'platemachine'), 42.5);
  Q.rememberMachineEmpty(m, 'Presse à cuisses', '');
  assert.equal(Q.machineEmptyFor(m, 'Presse à cuisses'), null);
  m.setItem(Q.BAR_KEY, 'pas du json');
  assert.equal(Q.barWeightFor(m, 'Squat'), 20);
});
