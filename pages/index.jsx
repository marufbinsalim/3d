import { Canvas } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Sky } from "@react-three/drei";
import { MovableCharacter } from "../components/MovableCharacter";
import CameraController from "../components/CameraController";
import SceneHelpers from "../components/SceneHelpers";
import HelpMenu from "../components/HelpMenu";
import { StaticModel } from "../components/StaticModel";

export default function Scene() {
  const debug = false;

  const [cubePosition, setCubePosition] = useState([0, 0, 0]);
  const [sunPosition, setSunPosition] = useState([10, 10, 10]);

  const [tileBoundingBoxes, setTileBoundingBoxes] = useState([]);
  const staticBoxesRef = useRef([]);

  function onStaticBoundingBox(box) {
    console.log("Static Model Bounding Box:", box);
    staticBoxesRef.current.push(box);
  }

  return (
    <>
      <Canvas style={{ height: "100vh", width: "100vw" }} shadows>
        {/* Sky follows sun position */}
        <Sky
          distance={450000}
          sunPosition={sunPosition}
          inclination={0}
          azimuth={0.25}
        />

        {/* Movable character with bounding boxes */}
        <MovableCharacter
          src="/calibur.glb"
          targetHeight={2}
          debug={debug}
          animationNames={["Walk"]}
          onPositionChange={(pos) => setCubePosition(pos)}
          staticBoundingBoxes={[
            ...staticBoxesRef.current,
            ...tileBoundingBoxes,
          ]}
        />

        {/* Static 3D model with bounding box */}
        <StaticModel
          src="/cat_statue.glb"
          position={[10, 0, 20]}
          targetHeight={2}
          debug={debug}
          onBoundingBoxReady={onStaticBoundingBox}
        />
        <StaticModel
          src="/eve.glb"
          position={[-10, 0, 20]}
          targetHeight={5}
          debug={debug}
          onBoundingBoxReady={onStaticBoundingBox}
        />

        {/* Tile system with lighting and dynamic bounding boxes */}
        <SceneHelpers
          cubePosition={cubePosition}
          setSunPosition={setSunPosition}
          debug={debug}
          onBoundingBoxesReady={setTileBoundingBoxes}
        />

        {/* Camera follows character */}
        <CameraController target={cubePosition} />
      </Canvas>

      {/* UI Help */}
      <HelpMenu />
    </>
  );
}
