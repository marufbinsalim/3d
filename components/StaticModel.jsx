import React, { useRef, useEffect, useState } from "react";
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

      // Ignore empty geometry bounding boxes
      const geomBBox = child.geometry.boundingBox;
      if (
        geomBBox.min.equals(geomBBox.max) // zero-volume box
      ) {
        return;
      }

      const childBox = geomBBox.clone().applyMatrix4(child.matrixWorld);
      bbox.union(childBox);
      hasValidMesh = true;
    }
  });

  if (!hasValidMesh) {
    // fallback: return a default small box to avoid huge bounds
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

  const [scale, setScale] = useState(1);
  const [yOffset, setYOffset] = useState(0);

  // Compute scale and offset, but wait one frame to ensure fully loaded
  useEffect(() => {
    if (!groupRef.current) return;

    let frameId;

    const updateBBox = () => {
      if (!groupRef.current) return;

      const bbox = computeBoundingBox(groupRef.current);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      if (size.y === 0) return; // Avoid div/0

      const scaleFactor = targetHeight / size.y;
      setScale(scaleFactor);

      const bottomOffset = bbox.min.y;
      setYOffset(-bottomOffset * scaleFactor);
    };

    // Delay bounding box calculation by one frame (or more if needed)
    frameId = requestAnimationFrame(() => {
      updateBBox();
    });

    return () => cancelAnimationFrame(frameId);
  }, [targetHeight, scene]);

  // Add BoxHelper and report bounding box
  useEffect(() => {
    if (!groupRef.current) return;

    const mesh = groupRef.current;

    let frameId = requestAnimationFrame(() => {
      mesh.updateMatrixWorld(true);

      const worldBox = computeBoundingBox(mesh);
      if (onBoundingBoxReady)
        onBoundingBoxReady({
          key: `StaticModel ${Math.random()}`,
          box: worldBox,
        });

      if (debug) {
        if (helperRef.current) {
          helperRef.current.parent?.remove(helperRef.current);
        }
        const helper = new THREE.BoxHelper(mesh, 0xff00ff);
        helper.update();
        helperRef.current = helper;
        mesh.parent?.add(helper);
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
      if (helperRef.current) {
        helperRef.current.parent?.remove(helperRef.current);
        helperRef.current = null;
      }
    };
  }, [scale, yOffset, debug]);

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1] + yOffset, position[2]]}
      scale={[scale, scale, scale]}
      dispose={null}
      castShadow
    >
      <primitive object={scene} />
    </group>
  );
}
