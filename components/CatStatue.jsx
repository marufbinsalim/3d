import React, { useRef, useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export function CatStatue({
  position = [0, 0, 0],
  targetHeight = 2,
  debug = true,
  onBoundingBoxReady,
}) {
  const meshRef = useRef();
  const helperRef = useRef();
  const { scene } = useGLTF("/cat_statue.glb");
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Compute the scale factor based on targetHeight
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scaleFactor = targetHeight / size.y;
    setScale(scaleFactor);
  }, [scene, targetHeight]);

  useEffect(() => {
    if (!meshRef.current) return;

    // Create Box3 and compute bounding box *before* scaling
    const box = new THREE.Box3().setFromObject(meshRef.current);

    // Manually apply scale to bounding box size for accurate dimension
    const size = new THREE.Vector3();
    box.getSize(size);
    size.multiply(meshRef.current.scale);

    const scaledBox = box.clone();
    scaledBox.min.multiply(meshRef.current.scale);
    scaledBox.max.multiply(meshRef.current.scale);

    if (onBoundingBoxReady) onBoundingBoxReady(scaledBox);

    console.log("Unscaled box:", box);
    console.log("Scaled box size:", size);
    console.log("Scaled box:", scaledBox);

    // Optional: add box helper for debugging
    if (debug && meshRef.current) {
      if (helperRef.current) {
        helperRef.current.parent?.remove(helperRef.current);
      }
      const helper = new THREE.BoxHelper(meshRef.current, 0xff00ff);
      helperRef.current = helper;
      meshRef.current.parent?.add(helper);
    }

    return () => {
      if (helperRef.current) {
        helperRef.current.parent?.remove(helperRef.current);
        helperRef.current = null;
      }
    };
  }, [scale, debug]);

  return (
    <primitive
      ref={meshRef}
      object={scene}
      position={position}
      scale={[scale, scale, scale]}
      castShadow
      receiveShadow
    />
  );
}
