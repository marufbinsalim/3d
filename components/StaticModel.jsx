import React, { useRef, useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

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

  // Compute scale and Y offset based on model bounding box
  useEffect(() => {
    if (!groupRef.current) return;

    const bbox = new THREE.Box3().setFromObject(groupRef.current);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const scaleFactor = targetHeight / size.y;
    setScale(scaleFactor);

    const bottomOffset = bbox.min.y;
    setYOffset(-bottomOffset * scaleFactor);
  }, [targetHeight, scene]);

  // Add BoxHelper after scale and position set
  useEffect(() => {
    if (!groupRef.current) return;

    const mesh = groupRef.current;

    requestAnimationFrame(() => {
      mesh.updateMatrixWorld(true);

      const worldBox = new THREE.Box3().setFromObject(mesh);
      if (onBoundingBoxReady) onBoundingBoxReady(worldBox);

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
    >
      <primitive object={scene} />
    </group>
  );
}
