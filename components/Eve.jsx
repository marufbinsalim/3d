import { useGLTF, useAnimations } from "@react-three/drei";
import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function lerpAngle(a, b, t) {
  const max = Math.PI * 2;
  const da = (b - a) % max;
  const shortest_angle = ((2 * da) % max) - da;
  return a + shortest_angle * t;
}

export function Eve({ setCubePosition, targetHeight = 2, debug = true }) {
  const modelRef = useRef();
  const wrapperRef = useRef();
  const groupRef = useRef();
  const keys = useRef({});
  const position = useRef([0, 0, 0]);
  const velocity = useRef([0, 0, 0]);

  const { scene, animations } = useGLTF("/eve.glb");
  const { actions } = useAnimations(animations, modelRef);
  const [isMoving, setIsMoving] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const { scene: fiberScene, camera } = useThree();
  const boxHelperRef = useRef();
  const positionLabelRef = useRef();
  const canJump = useRef(true);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const min = box.min.clone();

    box.getSize(size);
    const originalHeight = size.y;
    const scale = targetHeight / originalHeight;
    setScaleFactor(scale);

    if (wrapperRef.current) {
      wrapperRef.current.position.y = -min.y * scale;
    }

    if (debug) {
      const helper = new THREE.BoxHelper(scene, 0xff0000);
      boxHelperRef.current = helper;
      fiberScene.add(helper);

      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.font = "24px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2, 0.5, 1);
      positionLabelRef.current = { sprite, ctx, canvas, texture };
      fiberScene.add(sprite);
    }

    return () => {
      if (debug) {
        if (boxHelperRef.current) fiberScene.remove(boxHelperRef.current);
        if (positionLabelRef.current)
          fiberScene.remove(positionLabelRef.current.sprite);
      }
    };
  }, [scene, fiberScene, targetHeight, debug]);

  useEffect(() => {
    if (actions["Take 001"]) {
      actions["Take 001"].setLoop(THREE.LoopRepeat);
    }
  }, [actions]);

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

  useEffect(() => {
    if (actions["Take 001"]) {
      if (isMoving) {
        actions["Take 001"].reset().fadeIn(0.2).play();
      } else {
        actions["Take 001"].fadeOut(0.2);
      }
    }
  }, [isMoving, actions]);

  const GRAVITY = 40;
  const speed = 20;
  const jumpVelocity = 20;

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    let [x, y, z] = position.current;
    let [vx, vy, vz] = velocity.current;

    const isOnGround = y <= 0.01;
    let moveDir = new THREE.Vector3();

    if (isOnGround) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      if (keys.current["w"] || keys.current["arrowup"]) moveDir.add(forward);
      if (keys.current["s"] || keys.current["arrowdown"]) moveDir.sub(forward);
      if (keys.current["d"] || keys.current["arrowright"]) moveDir.add(right);
      if (keys.current["a"] || keys.current["arrowleft"]) moveDir.sub(right);

      moveDir.normalize();

      vx = moveDir.x * speed;
      vz = moveDir.z * speed;
    }

    const movingNow = moveDir.length() > 0;
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

    if (debug && boxHelperRef.current) {
      boxHelperRef.current.update();
    }

    if (debug && positionLabelRef.current) {
      const { sprite, ctx, canvas, texture } = positionLabelRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillText(
        `Pos: ${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`,
        canvas.width / 2,
        canvas.height / 2
      );
      texture.needsUpdate = true;
      sprite.position.set(x, y + targetHeight + 0.5, z);
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={wrapperRef} scale={scaleFactor}>
        <primitive ref={modelRef} object={scene} />
      </group>
    </group>
  );
}
