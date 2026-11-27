Extend the existing browser Rubik's Cube demo with whole-cube visual inspection rotations. These rotations move the rendered cube, not its logical stickers.

1. Preserve all existing face-turn, scramble, solve, fold/unfold, position, speed-slider, orbit, mouse, and touch behavior. Add sidebar buttons with IDs `inspect-x`, `inspect-y`, `inspect-z`, and `inspect-reset`, labeled `Inspect X`, `Inspect Y`, `Inspect Z`, and `Reset inspection`. Add public methods `cube.inspect(axis)` and `cube.resetInspection()`; the buttons call these methods with `x`, `y`, or `z`.

2. Create one `THREE.Group` named `inspectionPivot`, positioned at `(0,0,0)` with identity initial quaternion, and add it to the cube scene. Every normal facet mesh and every temporary split facet mesh must be a descendant of this group whenever displayed. At identity, retain the baseline facet geometry and local coordinates. Do not parent the camera, renderer, or OrbitControls to the group.

3. For a valid idle request, `inspect(axis)` rotates the entire pivot by exactly +90 degrees about the fixed world X, Y, or Z axis through `(0,0,0)`, using the right-hand rule. Compose successive rotations by premultiplying: `targetQuaternion = axisQuaternion * currentQuaternion`. Animate for exactly 250 ms using normalized linear progress and quaternion slerp from the starting quaternion to the target; the speed slider must not affect this duration. Snap to the exact target on completion.

4. Inspection must not call `cubeState.rotate`, alter the Singmaster position string, change `isFolded`, or enqueue face-turn commands. Return `true` when an inspection request starts. Return `false` without changing anything for an invalid axis, while an inspection is running, or while `cube.isActive()` is true. During inspection animation, face turns, folding, scrambling, solving, position setting, and face dragging must remain blocked; they must work again afterward.

5. `resetInspection()` returns `false` while an inspection is running or the cube is active. Otherwise it immediately restores the pivot to identity, without changing logical cube state, and returns `true`. Repeated X/Y/Z requests must compose rather than replace one another.

6. Existing face-turn and fold animations, including split meshes, must remain inside the pivot and therefore inherit the current inspection transform. Update world matrices before rendering or raycasting so orbit viewing and drag picking continue to use correct world-space positions after inspection.

7. Expose `cube.getInspectionQuaternion()` returning a new plain object `{x,y,z,w}`, and `cube.isInspecting()` returning whether inspection animation is active. Use only existing local dependencies and add no network service, asset, persistence, or build-step requirement.
