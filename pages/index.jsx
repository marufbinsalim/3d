import { Canvas } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Sky } from "@react-three/drei";
import { MovableCharacter } from "../components/MovableCharacter";
import CameraController from "../components/CameraController";
import SceneHelpers from "../components/SceneHelpers";
import HelpMenu from "../components/HelpMenu";
import { BasicBox } from "../components/BasicBox";

export default function Scene() {
  const debug = false;
  const [cubePosition, setCubePosition] = useState([0, 0, 0]);
  const [sunPosition, setSunPosition] = useState([10, 10, 10]);
  const staticBoxesRef = useRef([]);

  function onCatStatueBBox(box) {
    console.log("cat", box);
    staticBoxesRef.current.push(box);
  }

  return (
    <>
      <Canvas style={{ height: "100vh", width: "100vw" }} shadows>
        <Sky
          distance={450000}
          sunPosition={sunPosition}
          inclination={0}
          azimuth={0.25}
        />

        <MovableCharacter
          src="/eve.glb"
          targetHeight={2}
          debug={debug}
          animationNames={["Take 001"]} // Optional
          onPositionChange={(pos) => setCubePosition(pos)}
          staticBoundingBoxes={staticBoxesRef.current}
        />

        <BasicBox
          position={[20, 0, 20]}
          targetHeight={2}
          debug={debug}
          onBoundingBoxReady={onCatStatueBBox}
        />
        <BasicBox
          position={[10, 0, 20]}
          targetHeight={3}
          debug={debug}
          onBoundingBoxReady={onCatStatueBBox}
        />

        <BasicBox
          position={[10, 0, 30]}
          targetHeight={2}
          debug={debug}
          onBoundingBoxReady={onCatStatueBBox}
        />

        <SceneHelpers
          cubePosition={cubePosition}
          setSunPosition={setSunPosition}
          debug={debug}
        />
        <CameraController target={cubePosition} />
      </Canvas>

      <HelpMenu />
    </>
  );
}
