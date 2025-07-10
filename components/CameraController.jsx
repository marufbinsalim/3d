import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import * as THREE from "three";

function CameraController({ target }) {
  const { camera, gl } = useThree();
  const yawRef = useRef(Math.PI);
  const pitchRef = useRef(1);
  const distanceRef = useRef(5); // initial distance

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

export default CameraController;
