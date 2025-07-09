import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { PCFSoftShadowMap } from "three";
import { Eve } from "../components/Eve";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";

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
function SceneHelpers({ cubePosition, debug }) {
  const colorMap = useLoader(THREE.TextureLoader, "/tiles-2/color.png");
  const dirLightRef = useRef();
  const [tiles, setTiles] = useState(new Set());

  const tileSize = 5;
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
            <meshStandardMaterial map={colorMap} />
          </mesh>
        );
      })}
    </>
  );
}

function CameraController({ target }) {
  const { camera, gl } = useThree();
  const yawRef = useRef(Math.PI);
  const pitchRef = useRef(1);
  const distanceRef = useRef(10); // initial distance

  useEffect(() => {
    const canvas = gl.domElement;

    const onGlobalClick = (e) => {
      const bounds = canvas.getBoundingClientRect();
      if (
        e.clientX >= bounds.left &&
        e.clientX <= bounds.right &&
        e.clientY >= bounds.top &&
        e.clientY <= bounds.bottom
      ) {
        if (document.pointerLockElement === canvas) {
          document.exitPointerLock();
        } else {
          canvas.requestPointerLock();
        }
      }
    };

    const onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return;
      yawRef.current -= e.movementX * 0.002;
      pitchRef.current -= e.movementY * 0.002;
      const maxPitch = Math.PI / 2 - 0.1;
      const minPitch = 0.1;
      pitchRef.current = Math.max(
        minPitch,
        Math.min(maxPitch, pitchRef.current)
      );
    };

    const onWheel = (e) => {
      e.preventDefault();
      // Zoom speed
      const zoomSpeed = 0.5;
      // Clamp distance between 2 and 50 (for example)
      distanceRef.current = Math.min(
        50,
        Math.max(2, distanceRef.current + e.deltaY * 0.01 * zoomSpeed)
      );
    };

    document.addEventListener("click", onGlobalClick);
    document.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      document.removeEventListener("click", onGlobalClick);
      document.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame(() => {
    const yaw = yawRef.current;
    const pitch = pitchRef.current;
    const distance = distanceRef.current;

    const x = target[0] + distance * Math.sin(pitch) * Math.sin(yaw);
    const y = target[1] + distance * Math.cos(pitch);
    const z = target[2] + distance * Math.sin(pitch) * Math.cos(yaw);

    camera.position.lerp(new THREE.Vector3(x, y, z), 0.1);
    camera.lookAt(new THREE.Vector3(...target));
  });

  return null;
}

export default function Scene() {
  const [cubePosition, setCubePosition] = useState([0, 0, 0]);
  const [showMechanics, setShowMechanics] = useState(false);
  const debug = true;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === "h") {
        setShowMechanics((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Canvas
        style={{ height: "100vh", width: "100vw" }}
        shadows
        shadowMap={{ type: PCFSoftShadowMap }}
      >
        <Eve setCubePosition={setCubePosition} targetHeight={4} debug={debug} />
        <SceneHelpers cubePosition={cubePosition} debug={debug} />
        <CameraController target={cubePosition} />
      </Canvas>

      {/* Help Panel */}
      <AnimatePresence>
        {showMechanics && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              padding: "14px 18px",
              background: "rgba(0,0,0,0.8)",
              color: "white",
              borderRadius: 10,
              fontSize: 14,
              maxWidth: 320,
              zIndex: 20,
              boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HelpCircle size={18} />
              <strong>Game Controls</strong>
            </div>
            <ul style={{ paddingLeft: 20, marginTop: 10, lineHeight: 1.5 }}>
              <li>Click on scene to toggle camera</li>
              <li>Move mouse to rotate view</li>
              <li>
                Press <kbd>H</kbd> to hide this panel
              </li>
              <li>
                <kbd>W</kbd>, <kbd>A</kbd>, <kbd>S</kbd>, <kbd>D</kbd> to move
              </li>
              <li>
                <kbd>Space</kbd> to jump
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint to Press H */}
      <AnimatePresence>
        {!showMechanics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.6)",
              padding: "8px 12px",
              color: "#fff",
              borderRadius: 8,
              fontSize: 13,
              zIndex: 10,
            }}
          >
            Press <kbd>H</kbd> for help
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
