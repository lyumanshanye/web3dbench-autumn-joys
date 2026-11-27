import {Box3, Box3Helper, Group} from 'three';

const EPSILON = 0.001;

const OUTER_COLOUR = 0x0000ff;
const PASS_COLOUR = 0x00ff00;
const FAIL_COLOUR = 0xff0000;

/**
 * Normalize an id for mesh lookup (tolerates report-style `"100"` strings).
 */
function cleanId(id) {
  return String(id).replace(/^"(.*)"$/, '$1');
}

/**
 * Numeric OSM id comparison.
 */
function compareIds(a, b) {
  return Number(cleanId(a)) - Number(cleanId(b));
}

/**
 * Deterministic spatial-constraint audit of the rendered building walls.
 *
 * All measurements are taken from the live wall meshes (named `b<id>`)
 * in world coordinates after `scene.updateMatrixWorld(true)`. Roof meshes,
 * visibility, helper objects and raw lat/lon are never consulted.
 */
class SpatialAudit {
  /**
   * @param {THREE.Scene} scene The scene containing the building meshes.
   * @param {string} outerId The OSM id of the outer element.
   * @param {Array} parts The building parts (objects with an `id`).
   * @param {Function} printError Reporter for human-readable issues.
   */
  constructor(scene, outerId, parts, printError) {
    this.scene = scene;
    this.outerId = cleanId(outerId);
    this.partIds = Array.from(parts || [])
      .map(part => cleanId(part.id))
      .filter(id => id !== this.outerId);
    this.printError = printError || (() => {});
    this.report = null;
    this.outer = null;
    this.group = new Group();
    this.group.name = 'spatialAudit';
    this.scene.add(this.group);
  }

  /**
   * Find the (possibly invisible) wall mesh named `b<id>`.
   *
   * @param {string} id OSM id.
   * @return {THREE.Mesh|null}
   */
  findWall(id) {
    id = cleanId(id);
    if (typeof this.scene.getObjectByName === 'function') {
      const mesh = this.scene.getObjectByName('b' + id);
      if (mesh && mesh.isMesh) {
        return mesh;
      }
    }
    const found = [];
    this.scene.traverse(obj => {
      if (obj.isMesh && obj.name === 'b' + id) {
        found.push(obj);
      }
    });
    return found.length > 0 ? found[0] : null;
  }

  /**
   * Compute the world-space bounds for a wall, or null when invalid.
   *
   * @param {string} id OSM id.
   * @param {string[]} issues Issue accumulator.
   * @return {THREE.Box3|null}
   */
  measureWall(id, issues) {
    id = cleanId(id);
    const wall = this.findWall(id);
    if (!wall) {
      issues.push(`Missing wall mesh for id ${id} (expected object "b${id}").`);
      return null;
    }
    const bounds = new Box3().setFromObject(wall);
    if (bounds.isEmpty()) {
      issues.push(`Wall mesh for id ${id} produced an empty bounding box.`);
      return null;
    }
    return bounds;
  }

  /**
   * Remove and dispose all helpers from the previous audit.
   */
  clearHelpers() {
    while (this.group.children.length > 0) {
      const child = this.group.children[this.group.children.length - 1];
      this.group.remove(child);
      if (child.geometry && typeof child.geometry.dispose === 'function') {
        child.geometry.dispose();
      }
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (material && typeof material.dispose === 'function') {
            material.dispose();
          }
        }
      }
      if (typeof child.dispose === 'function') {
        child.dispose();
      }
    }
  }

  /**
   * Add a Box3Helper for the given box using the exact instance supplied.
   */
  addHelper(box, colour) {
    const helper = new Box3Helper(box, colour);
    this.group.add(helper);
    return helper;
  }

  /**
   * Recompute the audit from the live meshes.
   *
   * @return {Object} the new report
   */
  refresh() {
    this.scene.updateMatrixWorld(true);
    this.report = null;
    this.outer = null;
    this.clearHelpers();

    const issues = [];

    const outerBounds = this.measureWall(this.outerId, issues);
    this.outer = {id: this.outerId, bounds: outerBounds};

    const parts = [];
    const helpers = [];
    const ids = Array.from(new Set(this.partIds)).sort(compareIds);

    for (const id of ids) {
      const bounds = this.measureWall(id, issues);
      if (!bounds) {
        continue;
      }
      const min = [bounds.min.x, bounds.min.y, bounds.min.z];
      const max = [bounds.max.x, bounds.max.y, bounds.max.z];
      const footprint = [min[0], min[2], max[0], max[2]];
      const baseY = bounds.min.y;
      const topY = bounds.max.y;

      let contained = false;
      let heightViolation = false;
      if (outerBounds) {
        const outerMin = [outerBounds.min.x, outerBounds.min.y, outerBounds.min.z];
        const outerMax = [outerBounds.max.x, outerBounds.max.y, outerBounds.max.z];
        contained = footprint[0] >= outerMin[0] - EPSILON &&
          footprint[1] >= outerMin[2] - EPSILON &&
          footprint[2] <= outerMax[0] + EPSILON &&
          footprint[3] <= outerMax[2] + EPSILON;
        heightViolation = topY > outerMax[1] + EPSILON;
      }

      const entry = {id, bounds: {min, max}, footprint, baseY, topY, contained, heightViolation};
      parts.push(entry);
      helpers.push({entry, bounds});
    }

    if (outerBounds) {
      this.addHelper(outerBounds, OUTER_COLOUR);
    }
    for (const {entry, bounds} of helpers) {
      const colour = entry.contained && !entry.heightViolation ? PASS_COLOUR : FAIL_COLOUR;
      this.addHelper(bounds, colour);
    }

    this.report = {
      outerId: this.outerId,
      parts,
      issues,
    };
    return this.report;
  }

  /**
   * Latest computed report.
   */
  getReport() {
    return this.report;
  }
}

export {SpatialAudit};
