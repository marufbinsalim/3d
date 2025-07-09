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

export function MovableCharacter({
  src,
  animationNames = [],
  targetHeight = 2,
  debug = false,
  onPositionChange = () => {},
  staticBoundingBoxes = [], // <---- Add here
}) {
  const groupRef = useRef();
  const wrapperRef = useRef();
  const modelRef = useRef();
  const boxHelperRef = useRef();
  const positionLabelRef = useRef();
  const boxHelperMaterialRef = useRef(null);

  const keys = useRef({});
  const position = useRef([0, 0, 0]);
  const velocity = useRef([0, 0, 0]);
  const canJump = useRef(true);

  const { scene, animations } = useGLTF(src);
  const { actions } = useAnimations(animations, modelRef);

  const [isMoving, setIsMoving] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const { camera, scene: fiberScene } = useThree();

  // Configure model
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
    const scale = targetHeight / size.y;
    setScaleFactor(scale);

    if (wrapperRef.current) {
      wrapperRef.current.position.y = -min.y * scale;
    }

    if (debug) {
      const helper = new THREE.BoxHelper(scene, 0xffffff);
      helper.material = new THREE.LineBasicMaterial({ color: 0xffffff });
      boxHelperMaterialRef.current = helper.material; // <- store material reference
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
        if (positionLabelRef.current?.sprite)
          fiberScene.remove(positionLabelRef.current.sprite);
      }
    };
  }, [scene, fiberScene, targetHeight, debug]);

  // Keyboard handling
  useEffect(() => {
    const down = (e) => {
      const key = e.key.toLowerCase();
      if (key === " ") {
        if (canJump.current && position.current[1] === 0) {
          keys.current["space"] = true;
          canJump.current = false;
        }
      } else {
        keys.current[key] = true;
      }
    };
    const up = (e) => {
      const key = e.key.toLowerCase();
      if (key === " ") {
        keys.current["space"] = false;
        canJump.current = true;
      } else {
        keys.current[key] = false;
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Animation state
  useEffect(() => {
    const animName = animationNames[0] || "Take 001";
    if (!actions[animName]) return;
    if (isMoving) {
      actions[animName].reset().fadeIn(0.2).play();
    } else {
      actions[animName].fadeOut(0.2);
    }
  }, [isMoving, actions, animationNames]);

  const GRAVITY = 40;
  const speed = 20;
  const jumpVelocity = 20;

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    let [x, y, z] = position.current;
    let [vx, vy, vz] = velocity.current;
    const isOnGround = y <= 0.01;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDir = new THREE.Vector3();
    if (keys.current["w"] || keys.current["arrowup"]) moveDir.add(forward);
    if (keys.current["s"] || keys.current["arrowdown"]) moveDir.sub(forward);
    if (keys.current["d"] || keys.current["arrowright"]) moveDir.add(right);
    if (keys.current["a"] || keys.current["arrowleft"]) moveDir.sub(right);
    moveDir.normalize();

    if (isOnGround) {
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

    // --- COLLISION CHECK START ---
    const nextX = x + vx * delta;
    const nextY = y + vy * delta;
    const nextZ = z + vz * delta;

    const halfWidth = 0.5;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(nextX - halfWidth, nextY, nextZ - halfWidth),
      new THREE.Vector3(
        nextX + halfWidth,
        nextY + targetHeight,
        nextZ + halfWidth
      )
    );

    let collision = false;
    for (const box of staticBoundingBoxes) {
      if (playerBox.intersectsBox(box)) {
        console.log("cat", box);
        console.log("playerBox", playerBox);

        collision = true;
        break;
      }
    }

    if (collision) {
      x = position.current[0];
      z = position.current[2];

      if (debug && boxHelperMaterialRef.current) {
        boxHelperMaterialRef.current.color.set(0xff0000); // 🔴 red on collision
      }
    } else {
      if (debug && boxHelperMaterialRef.current) {
        boxHelperMaterialRef.current.color.set(0xffffff); // ⚪ white if no collision
      }
      x = nextX;
      z = nextZ;
    }

    y = nextY;
    // --- COLLISION CHECK END ---

    if (y < 0) {
      y = 0;
      vy = 0;
    }

    position.current = [x, y, z];
    velocity.current = [vx, vy, vz];
    onPositionChange([x, y, z]);

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
