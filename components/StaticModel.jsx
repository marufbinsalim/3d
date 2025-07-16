import React, { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

function computeBoundingBox(object) {
  const bbox = new THREE.Box3();
  let hasValidMesh = false;

  object.updateWorldMatrix(true, true);

  object.traverse((child) => {
    if (
      child.isMesh &&
      child.visible &&
      child.geometry &&
      child.geometry.attributes.position &&
      child.scale.x !== 0 &&
      child.scale.y !== 0 &&
      child.scale.z !== 0
    ) {
      if (!child.geometry.boundingBox) {
        child.geometry.computeBoundingBox();
      }

      const geomBBox = child.geometry.boundingBox;
      if (geomBBox.min.equals(geomBBox.max)) return;

      const childBox = geomBBox.clone().applyMatrix4(child.matrixWorld);
      bbox.union(childBox);
      hasValidMesh = true;
    }
  });

  if (!hasValidMesh) {
    return new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 1)
    );
  }

  return bbox;
}
export function StaticModel({
  src,
  position = [0, 0, 0],
  targetHeight = 2,
  targetWidth = 2,
  debug = true,
  onBoundingBoxReady,
}) {
  const groupRef = useRef(null);
  const helperRef = useRef(null);
  const { scene } = useGLTF(src);

  useEffect(() => {
    if (!groupRef.current) return;

    const group = groupRef.current;
    group.clear(); // clean insert

    const sceneClone = scene.clone(true);
    group.add(sceneClone);

    group.updateWorldMatrix(true, true);
    const bbox = computeBoundingBox(group);

    const size = new THREE.Vector3();
    bbox.getSize(size);

    if (size.y === 0 || size.x === 0) return;

    // Compute scaling factors for height and width
    const scaleY = targetHeight / size.y;
    const scaleX = targetWidth / size.x;

    // Choose the smaller scale to maintain aspect ratio
    const scaleFactor = Math.min(scaleY, scaleX);
    sceneClone.scale.setScalar(scaleFactor);

    // Recalculate offset so bottom aligns to Y=0
    const offsetY = -bbox.min.y * scaleFactor;
    const offsetX = -(bbox.min.x + size.x / 2) * scaleFactor; // center on X if needed
    sceneClone.position.set(offsetX, offsetY, 0);

    requestAnimationFrame(() => {
      group.updateMatrixWorld(true);
      const newBBox = computeBoundingBox(group);

      if (onBoundingBoxReady) {
        onBoundingBoxReady({
          key: `StaticModel ${Math.random()}`,
          box: newBBox,
        });
      }

      if (debug) {
        if (helperRef.current) {
          helperRef.current.parent?.remove(helperRef.current);
        }
        const helper = new THREE.BoxHelper(group, 0xff00ff);
        helper.update();
        helperRef.current = helper;
        group.parent?.add(helper);
      }
    });

    return () => {
      if (helperRef.current) {
        helperRef.current.parent?.remove(helperRef.current);
        helperRef.current = null;
      }
    };
  }, [scene, targetHeight, targetWidth, debug]);

  return <group ref={groupRef} position={position} dispose={null} castShadow />;
}
