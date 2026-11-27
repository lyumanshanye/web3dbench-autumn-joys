// terrain-survey.js - samples an atoll terrain and places markers on its surface
// Copyright © 2026

const DEFAULTS = {
    radius: 5,
    count: 8,
    height: 2,
    markerRadius: 0.2
};

const sanitizeNumber = (value, fallback, min, max) => {
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, value));
};

const sanitize = data => {
    const radius = sanitizeNumber(data.radius, DEFAULTS.radius, 0, 10000);
    const height = sanitizeNumber(data.height, DEFAULTS.height, 0.1, 100);
    const markerRadius = sanitizeNumber(data.markerRadius, DEFAULTS.markerRadius, 0.01, 10);
    const count = Number.isFinite(data.count)
        ? Math.min(64, Math.max(1, Math.round(data.count)))
        : DEFAULTS.count;
    return {radius, count, height, markerRadius};
};

const findTerrainGeometry = el => {
    if (el.tagName === 'A-ATOLL-TERRAIN') {
        return el.getAttribute('geometry');
    }
    return el.closest('a-atoll-terrain') && el.closest('a-atoll-terrain').getAttribute('geometry');
};

AFRAME.registerComponent('terrain-survey', {
    schema: {
        radius: {type: 'number', default: DEFAULTS.radius},
        count: {type: 'number', default: DEFAULTS.count},
        height: {type: 'number', default: DEFAULTS.height},
        markerRadius: {type: 'number', default: DEFAULTS.markerRadius}
    },

    init: function () {
        this.geometry = findTerrainGeometry(this.el);
        if (this.geometry && typeof this.geometry.getSurfaceInfo === 'function') {
            this.ready = true;
            this.ensureResources();
            this.rebuild();
        } else {
            this.tryAttach = () => {
                this.geometry = findTerrainGeometry(this.el);
                if (!this.geometry || typeof this.geometry.getSurfaceInfo !== 'function') {
                    return;
                }
                this.ready = true;
                this.ensureResources();
                this.rebuild();
                this.el.parentNode.removeEventListener('componentinitialized', this.tryAttach);
            };
            this.el.parentNode.addEventListener('componentinitialized', this.tryAttach);
        }
    },

    ensureResources: function () {
        if (this.baseMaterial) {
            return;
        }
        // The terrain shader ignores lights, so the opaque survey material uses
        // vertex colors while remaining compatible with terrain vertex-color setups.
        this.baseMaterial = new THREE.MeshBasicMaterial({
            color: 0xf2c94c,
            vertexColors: false
        });
    },

    update: function (oldData) {
        // A-Frame initializes child components before the parent geometry.  Sampling
        // begins from the parent's componentinitialized event in init().
        if (!this.ready) {
            this.geometry = findTerrainGeometry(this.el);
            if (!this.geometry || typeof this.geometry.getSurfaceInfo !== 'function') {
                return;
            }
            this.ready = true;
            this.ensureResources();
        }
        if (oldData.radius === undefined && oldData.count === undefined
            && oldData.height === undefined && oldData.markerRadius === undefined) {
            return;
        }
        this.rebuild();
    },

    rebuild: function () {
        if (!this.ready || !this.geometry || typeof this.geometry.getSurfaceInfo !== 'function') {
            return;
        }
        const previous = this.group;
        if (previous) {
            if (previous.parent) {
                previous.parent.remove(previous);
            }
            this.disposeMarkers();
        }

        const data = sanitize(this.data);
        const group = new THREE.Group();
        group.name = 'survey-group';
        group.userData.terrain = this.el;
        const markerGeometry = new THREE.CylinderGeometry(
            data.markerRadius, data.markerRadius, data.height, 12);
        const markerMaterial = this.baseMaterial.clone();
        const up = new THREE.Vector3(0, 1, 0);

        for (let k = 0; k < data.count; ++k) {
            const angle = 2 * Math.PI * k / data.count;
            const x = data.radius * Math.cos(angle);
            const z = data.radius * Math.sin(angle);
            const surface = this.geometry.getSurfaceInfo(x, z);
            const normal = surface.normal.clone().normalize();
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.name = this.el.id + '-marker-' + k;
            marker.position.set(x, surface.elevation, z)
                .addScaledVector(normal, data.height / 2);
            marker.quaternion.setFromUnitVectors(up, normal);
            marker.userData.surface = surface;
            marker.userData.base = new THREE.Vector3(x, surface.elevation, z);
            group.add(marker);
        }

        this.group = group;
        this.el.object3D.add(group);
    },

    disposeMarkers: function () {
        if (!this.group) {
            return;
        }
        const geometries = new Set();
        const materials = new Set();
        this.group.traverse(object => {
            if (object.isMesh) {
                if (object.geometry) {
                    geometries.add(object.geometry);
                }
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => materials.add(material));
                } else if (object.material) {
                    materials.add(object.material);
                }
            }
        });
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
    },

    remove: function () {
        if (this.group && this.group.parent) {
            this.group.parent.remove(this.group);
        }
        this.disposeMarkers();
        if (this.baseMaterial) {
            this.baseMaterial.dispose();
        }
    }
});
