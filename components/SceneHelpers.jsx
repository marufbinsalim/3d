import { useFrame, useLoader } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import DirectionalLightHelper from "./DirectionalLightHelper";

function SceneHelpers({ cubePosition, debug, setSunPosition }) {
  const colorMap = useLoader(THREE.TextureLoader, "/rock/color.png");
  const normalMap = useLoader(THREE.TextureLoader, "/rock/normal.png");

  const dirLightRef = useRef();
  const [tiles, setTiles] = useState(new Set());

  const tileSize = 10;
  const radius = 5; // tiles radius around player to generate
  const despawnRadius = radius + 2; // radius outside which tiles are removed

  const tileKey = (x, z) => `${x},${z}`;

  useEffect(() => {
    if (colorMap) {
      colorMap.wrapS = THREE.RepeatWrapping;
      colorMap.wrapT = THREE.RepeatWrapping;
      colorMap.repeat.set(1, 1);
      colorMap.needsUpdate = true;
    }
  }, [colorMap]);

  useFrame(() => {
    if (!dirLightRef.current) return;

    const light = dirLightRef.current;

    // Light follows player
    light.position.lerp(
      new THREE.Vector3(
        cubePosition[0],
        cubePosition[1] + 5,
        cubePosition[2] + 5
      ),
      0.1
    );

    // Sync sun position with light position for Sky
    setSunPosition([light.position.x, light.position.y, light.position.z]);

    if (light.target) {
      light.target.position.lerp(new THREE.Vector3(...cubePosition), 0.1);
      light.target.updateMatrixWorld();
    }

    // Shadow camera update
    const shadowCam = light.shadow.camera;
    const frustumSize = 20;
    shadowCam.left = -frustumSize;
    shadowCam.right = frustumSize;
    shadowCam.top = frustumSize;
    shadowCam.bottom = -frustumSize;
    shadowCam.near = 1;
    shadowCam.far = 50;
    shadowCam.updateProjectionMatrix();

    // Generate tiles within radius
    const newTiles = new Set(tiles);
    const baseX = Math.floor(cubePosition[0] / tileSize);
    const baseZ = Math.floor(cubePosition[2] / tileSize);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const x = (baseX + dx) * tileSize;
        const z = (baseZ + dz) * tileSize;
        newTiles.add(tileKey(x, z));
      }
    }

    // Remove tiles outside despawn radius
    for (const key of newTiles) {
      const [x, z] = key.split(",").map(Number);
      const dx = x - cubePosition[0];
      const dz = z - cubePosition[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > despawnRadius * tileSize) {
        newTiles.delete(key);
      }
    }

    // Update tiles state if changed
    if (newTiles.size !== tiles.size) {
      setTiles(newTiles);
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight
        ref={dirLightRef}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      {debug && (
        <DirectionalLightHelper
          lightRef={dirLightRef}
          length={5}
          color="yellow"
        />
      )}

      {[...tiles].map((key) => {
        const [x, z] = key.split(",").map(Number);
        return (
          <mesh
            key={key}
            position={[x, 0, z]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[tileSize, tileSize]} />
            <meshStandardMaterial map={colorMap} normalMap={normalMap} />
          </mesh>
        );
      })}
    </>
  );
}

export default SceneHelpers;
