/**
 * @jest-environment jsdom
 */
import {readFileSync} from 'fs';
import {BufferGeometry, BoxGeometry, Mesh, MeshLambertMaterial, Scene} from 'three';
import {expect, test, beforeEach} from '@jest/globals';

global.window.printError = () => {};
if (!global.location || global.location.search !== '?fromFile=./test/data/spatial-audit.osm&audit') {
  global.history.replaceState(null, '', '/?fromFile=./test/data/spatial-audit.osm&audit');
}

import {Building} from '../src/building.js';
import {SpatialAudit} from '../src/spatialaudit.js';

const fixture = readFileSync(new URL('./data/spatial-audit.osm', import.meta.url), 'utf8');

let scene;
let audit;
let building;

beforeEach(() => {
  building = new Building('100', fixture);
  scene = new Scene();
  for (const mesh of building.render()) {
    scene.add(mesh);
  }
  audit = new SpatialAudit(scene, building.id, building.parts, () => {});
});

test('initial report classifies contained and violating parts', () => {
  const report = audit.refresh();
  expect(report.outerId).toBe('100');
  expect(report.parts.map(part => part.id)).toEqual(['201', '202']);
  expect(report.issues).toEqual([]);

  const [part201, part202] = report.parts;
  expect(part201.contained).toBe(true);
  expect(part201.heightViolation).toBe(false);
  expect(part202.contained).toBe(false);
  expect(part202.heightViolation).toBe(true);
  expect(part201.topY).toBeCloseTo(6);
  expect(part202.topY).toBeCloseTo(15);
  expect(part201.footprint).toEqual([part201.bounds.min[0], part201.bounds.min[2], part201.bounds.max[0], part201.bounds.max[2]]);
  expect(audit.getReport()).toBe(report);
});

test('helpers use report bounds and correct colours', () => {
  const report = audit.refresh();
  const group = scene.getObjectByName('spatialAudit');
  expect(group.children).toHaveLength(3);
  expect(group.children.map(helper => helper.material.color.getHex())).toEqual([0x0000ff, 0x00ff00, 0xff0000]);
  expect(group.children[0].box).toBe(audit.outer.bounds);
  expect(group.children[1].box.min.x).toBe(report.parts[0].bounds.min[0]);
  expect(group.children[2].box.max.y).toBe(report.parts[1].bounds.max[1]);

  audit.refresh();
  expect(scene.getObjectByName('spatialAudit').children).toHaveLength(3);
});

test('refresh reads live mesh transforms and geometry', () => {
  audit.refresh();
  scene.getObjectByName('b202').position.x += 100;
  let report = audit.refresh();
  expect(report.parts[1].bounds.min[0]).toBeCloseTo(100);
  expect(report.parts[1].contained).toBe(false);

  const wall = scene.getObjectByName('b201');
  const geometry = new BoxGeometry(10, 10, 50);
  geometry.translate(0, 0, 50);
  wall.geometry = geometry;
  report = audit.refresh();
  expect(report.parts[0].topY).toBeGreaterThan(60);
  expect(report.parts[0].heightViolation).toBe(true);
});

test('missing or empty walls are reported as issues', () => {
  scene.remove(scene.getObjectByName('b202'));
  let report = audit.refresh();
  expect(report.parts.map(part => part.id)).toEqual(['201']);
  expect(report.issues.some(issue => issue.includes('202'))).toBe(true);
  expect(scene.getObjectByName('spatialAudit').children).toHaveLength(2);

  scene.remove(scene.getObjectByName('b100'));
  const empty = new Mesh(new BufferGeometry(), new MeshLambertMaterial());
  empty.name = 'b100';
  scene.add(empty);
  report = audit.refresh();
  expect(report.issues.some(issue => issue.includes('100'))).toBe(true);
  expect(report.parts[0].contained).toBe(false);
  expect(report.parts[0].heightViolation).toBe(false);
});
