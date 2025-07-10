import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

export function BasicBox({
  position = [0, 0, 0],
  targetHeight = 2,
  debug = true,
  onBoundingBoxReady,
}) {
  const meshRef = useRef(null);
  const helperRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [yOffset, setYOffset] = useState(0);

  // Store random color in state so it persists across renders
  const [color, setColor] = useState("orange");

  // Generate random color on mount
  useEffect(() => {
    const randomColor = new THREE.Color(
      Math.random(),
      Math.random(),
      Math.random()
    );
    setColor(randomColor.getStyle());
  }, []);

  // Compute scale and Y offset based on bounding box
  useEffect(() => {
    if (!meshRef.current) return;

    // Create temporary geometry and compute bounding box
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;

    const size = new THREE.Vector3();
    bbox.getSize(size); // size.y = raw height of the geometry
    const scaleFactor = targetHeight / size.y;

    const bottomOffset = bbox.min.y;

    setScale(scaleFactor);
    setYOffset(-bottomOffset * scaleFactor);
  }, [targetHeight]);

  // Add BoxHelper after mesh scaled and positioned
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;

    requestAnimationFrame(() => {
      mesh.updateMatrixWorld(true);

      const worldBox = new THREE.Box3().setFromObject(mesh);
      if (onBoundingBoxReady)
        onBoundingBoxReady({
          key: `BasicBox ${Math.random()}`,
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
      if (helperRef.current) {
        helperRef.current.parent?.remove(helperRef.current);
        helperRef.current = null;
      }
    };
  }, [scale, yOffset, debug]);

  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1] + yOffset, position[2]]}
      scale={[scale, scale, scale]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
