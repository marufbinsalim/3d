import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { MovableCharacter } from "../components/MovableCharacter";
import { PCFSoftShadowMap } from "three";

function SceneHelpers({ cubePosition }) {
  const colorMap = useLoader(THREE.TextureLoader, "/tiles-2/color.png");

  // Repeat the texture to cover a large ground area
  useEffect(() => {
    if (colorMap) {
      colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
      colorMap.repeat.set(50, 50); // adjust repeats to your liking
    }
  }, [colorMap]);

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight castShadow position={[5, 10, 5]} />

      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]} // rotate to lie flat
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial map={colorMap} />
      </mesh>

      {/* Example boxes */}
      <mesh position={[10, 0.5, 0]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
      <mesh position={[-10, 0.5, 0]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="green" />
      </mesh>
    </>
  );
}

function CameraController({ target }) {
  const controls = useRef();
  const { camera } = useThree();

  const offset = useRef(new THREE.Vector3(5, 5, 10));

  useFrame(() => {
    if (!controls.current) return;

    // Fixed offset follow
    const desiredPosition = new THREE.Vector3(
      target[0] + offset.current.x,
      target[1] + offset.current.y,
      target[2] + offset.current.z
    );
    camera.position.lerp(desiredPosition, 0.1);

    // Camera looks at the target slightly above
    controls.current.target.lerp(
      new THREE.Vector3(target[0], target[1] + 1, target[2]),
      0.1
    );
    controls.current.update();
  });

  return <OrbitControls ref={controls} />;
}

export default function Scene() {
  const [cubePosition, setCubePosition] = useState([0, 0, 0]);

  useEffect(() => {
    window.focus();
  }, []);

  return (
    <Canvas
      style={{ height: "100vh", width: "100vw" }}
      shadows
      shadowMap={{ type: PCFSoftShadowMap }}
      camera={{ position: [5, 5, 10], fov: 60 }}
    >
      <ambientLight intensity={0.5} />
      <pointLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-radius={4}
        shadow-bias={-0.0005}
      />

      {/* MovableCharacter should have castShadow on its meshes */}
      <MovableCharacter setCubePosition={setCubePosition} />

      <SceneHelpers cubePosition={cubePosition} />
      <CameraController target={cubePosition} />
    </Canvas>
  );
}
