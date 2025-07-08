import { useGLTF, useAnimations } from "@react-three/drei";
import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";

function lerpAngle(a, b, t) {
  const max = Math.PI * 2;
  const da = (b - a) % max;
  const shortest_angle = ((2 * da) % max) - da;
  return a + shortest_angle * t;
}

export function MovableCharacter({ setCubePosition }) {
  const modelRef = useRef();
  const groupRef = useRef();
  const keys = useRef({});
  const position = useRef([0, 0, 0]);
  const velocity = useRef([0, 0, 0]);

  const { scene, animations } = useGLTF("/eve.glb");
  const { actions } = useAnimations(animations, modelRef);
  const [isMoving, setIsMoving] = useState(false);

  // Enable shadows on meshes
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  const GRAVITY = 40;
  const speed = 20;
  const jumpVelocity = 20;
  const canJump = useRef(true);
  const modelHeight = 4;

  useEffect(() => {
    const down = (e) => {
      if (e.key === " ") {
        if (canJump.current && position.current[1] === 0) {
          keys.current["space"] = true;
          canJump.current = false;
        }
      } else {
        keys.current[e.key.toLowerCase()] = true;
      }
    };
    const up = (e) => {
      if (e.key === " ") {
        keys.current["space"] = false;
        canJump.current = true;
      } else {
        keys.current[e.key.toLowerCase()] = false;
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Control animation state
  useEffect(() => {
    if (actions["Take 001"]) {
      if (isMoving) {
        actions["Take 001"].reset().fadeIn(0.2).play();
      } else {
        actions["Take 001"].fadeOut(0.2);
      }
    }
  }, [isMoving, actions]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    let [x, y, z] = position.current;
    let [vx, vy, vz] = velocity.current;

    const isOnGround = y <= 0.01;
    let inputVx = 0,
      inputVz = 0;

    if (isOnGround) {
      if (keys.current["w"] || keys.current["arrowup"]) inputVz -= speed;
      if (keys.current["s"] || keys.current["arrowdown"]) inputVz += speed;
      if (keys.current["a"] || keys.current["arrowleft"]) inputVx -= speed;
      if (keys.current["d"] || keys.current["arrowright"]) inputVx += speed;

      vx = inputVx;
      vz = inputVz;
    }

    const movingNow = inputVx !== 0 || inputVz !== 0;
    if (movingNow !== isMoving) {
      setIsMoving(movingNow);
    }

    if (keys.current["space"] && isOnGround) {
      vy = jumpVelocity;
    }

    vy -= GRAVITY * delta;

    x += vx * delta;
    y += vy * delta;
    z += vz * delta;

    if (y < 0) {
      y = 0;
      vy = 0;
    }

    position.current = [x, y, z];
    velocity.current = [vx, vy, vz];

    setCubePosition([x, y, z]);

    groupRef.current.position.set(x, y, z);

    if (vx !== 0 || vz !== 0) {
      const angle = Math.atan2(vx, vz);
      groupRef.current.rotation.y = lerpAngle(
        groupRef.current.rotation.y,
        angle,
        0.2
      );
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        ref={modelRef}
        object={scene}
        position={[0, modelHeight / 2, 0]}
        scale={1.5}
      />
    </group>
  );
}
