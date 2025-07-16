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
  debug = true,
  onBoundingBoxReady,
}) {
  const groupRef = useRef(null);
  const helperRef = useRef(null);
  const { scene } = useGLTF(src);

  useEffect(() => {
    if (!groupRef.current) return;

    const group = groupRef.current;
    group.clear(); // Ensure empty before inserting new model

    // Clone the scene to safely modify it
    const sceneClone = scene.clone(true);
    group.add(sceneClone);

    // Update world matrices before computing bounding box
    group.updateWorldMatrix(true, true);
    const bbox = computeBoundingBox(group);

    const size = new THREE.Vector3();
    bbox.getSize(size);

    if (size.y === 0) return;

    const scaleFactor = targetHeight / size.y;
    sceneClone.scale.setScalar(scaleFactor);

    // Reposition so that base sits on Y=0
    const offsetY = -bbox.min.y * scaleFactor;
    sceneClone.position.y = offsetY;

    // Compute new bounding box
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
  }, [scene, targetHeight, debug]);

  return <group ref={groupRef} position={position} dispose={null} castShadow />;
}
