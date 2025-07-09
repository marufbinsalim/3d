import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import * as THREE from "three";

function DirectionalLightHelper({ lightRef, length = 5, color = "yellow" }) {
  const lineRef = useRef();
  const { scene } = useThree();

  useEffect(() => {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    lineRef.current = line;

    return () => {
      scene.remove(line);
      geometry.dispose();
      material.dispose();
    };
  }, [scene, color]);

  useFrame(() => {
    if (!lightRef.current || !lineRef.current) return;

    const light = lightRef.current;
    const line = lineRef.current;

    const start = light.position.clone();
    const end = light.target
      ? light.target.position.clone()
      : start.clone().add(new THREE.Vector3(0, 0, 1).multiplyScalar(length));

    const dir = end.clone().sub(start).normalize();
    const target = start.clone().add(dir.multiplyScalar(length));

    const positions = new Float32Array([
      start.x,
      start.y,
      start.z,
      target.x,
      target.y,
      target.z,
    ]);

    line.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    line.geometry.computeBoundingSphere();
    line.geometry.attributes.position.needsUpdate = true;
  });

  return null;
}

export default DirectionalLightHelper;
