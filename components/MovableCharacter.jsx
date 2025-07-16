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
  staticBoundingBoxes = [],
  GRAVITY = 44,
  SPEED = 15,
  JUMP_VELOCITY = 20,
  AIR_CONTROL_FACTOR = 5,
  allowDoubleJump = true,
}) {
  const groupRef = useRef();
  const wrapperRef = useRef();
  const modelRef = useRef();
  const boxHelperRef = useRef();
  const positionLabelRef = useRef();
  const boxHelperMaterialRef = useRef(null);

  const collidedBoxRef = useRef(null);
  const collidedBoxHelperRef = useRef(null);

  const keys = useRef({});
  const position = useRef([0, 5, 0]);
  const velocity = useRef([0, 0, 0]);
  const canJump = useRef(true);
  const jumpsLeft = useRef(1);

  const { scene, animations } = useGLTF(src);
  const { actions } = useAnimations(animations, modelRef);

  const [isMoving, setIsMoving] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const { camera, scene: fiberScene } = useThree();

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
      boxHelperMaterialRef.current = helper.material;
      boxHelperRef.current = helper;
      fiberScene.add(helper);

      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 80;
      const ctx = canvas.getContext("2d");
      ctx.font = "20px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2, 0.7, 1);
      positionLabelRef.current = { sprite, ctx, canvas, texture };
      fiberScene.add(sprite);
    }

    return () => {
      if (debug) {
        if (boxHelperRef.current) fiberScene.remove(boxHelperRef.current);
        if (positionLabelRef.current?.sprite)
          fiberScene.remove(positionLabelRef.current.sprite);
        if (collidedBoxHelperRef.current)
          fiberScene.remove(collidedBoxHelperRef.current);
      }
    };
  }, [scene, fiberScene, targetHeight, debug]);

  useEffect(() => {
    const down = (e) => {
      const key = e.key.toLowerCase();
      if (key === " ") {
        if (jumpsLeft.current > 0) keys.current["space"] = true;
      } else {
        keys.current[key] = true;
      }
    };
    const up = (e) => {
      const key = e.key.toLowerCase();
      if (key === " ") {
        keys.current["space"] = false;
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

  useEffect(() => {
    const animName = animationNames[0] || "Take 001";
    if (!actions[animName]) return;
    if (isMoving) {
      actions[animName].reset().fadeIn(0.2).play();
    } else {
      actions[animName].fadeOut(0.2);
    }
  }, [isMoving, actions, animationNames]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    let [x, y, z] = position.current;
    let [vx, vy, vz] = velocity.current;

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

    const isOnGround = y <= 0.01;

    if (isOnGround) {
      canJump.current = true;
      jumpsLeft.current = allowDoubleJump ? 2 : 1;
      vx = moveDir.x * SPEED;
      vz = moveDir.z * SPEED;
    } else {
      vx += ((moveDir.x * SPEED) / 2) * AIR_CONTROL_FACTOR * delta;
      vz += ((moveDir.z * SPEED) / 2) * AIR_CONTROL_FACTOR * delta;
    }

    if (keys.current["space"]) {
      if (jumpsLeft.current > 0) {
        vy = JUMP_VELOCITY;
        jumpsLeft.current--;
        keys.current["space"] = false;
      }
    }

    vy -= GRAVITY * delta;

    const halfWidth = 0.5;
    let newX = x;
    let newY = y;
    let newZ = z;

    collidedBoxRef.current = null;

    // Y Axis collision
    {
      const playerBoxY = new THREE.Box3(
        new THREE.Vector3(
          newX - halfWidth,
          newY + vy * delta,
          newZ - halfWidth
        ),
        new THREE.Vector3(
          newX + halfWidth,
          newY + vy * delta + targetHeight,
          newZ + halfWidth
        )
      );

      for (const { box } of staticBoundingBoxes) {
        if (playerBoxY.intersectsBox(box)) {
          collidedBoxRef.current = box;

          const playerBottomY = newY + vy * delta;
          const boxTopY = box.max.y;

          if (
            vy <= 0 &&
            playerBottomY >= boxTopY - 0.1 &&
            playerBottomY <= boxTopY + 0.5
          ) {
            newY = boxTopY;
            vy = 0;
            canJump.current = true;
            jumpsLeft.current = allowDoubleJump ? 2 : 1;
            vx = moveDir.x * SPEED;
            vz = moveDir.z * SPEED;
          } else {
            vy = 0;
          }
          break;
        }
      }

      newY += vy * delta;
    }

    const horizontalCollisionY = newY + 0.5;

    // X Axis collision
    {
      const playerBoxX = new THREE.Box3(
        new THREE.Vector3(
          newX + vx * delta - halfWidth,
          horizontalCollisionY,
          newZ - halfWidth
        ),
        new THREE.Vector3(
          newX + vx * delta + halfWidth,
          horizontalCollisionY + targetHeight,
          newZ + halfWidth
        )
      );

      for (const { box } of staticBoundingBoxes) {
        if (playerBoxX.intersectsBox(box)) {
          collidedBoxRef.current = box;
          vx = 0;
          break;
        }
      }

      newX += vx * delta;
    }

    // Z Axis collision
    {
      const playerBoxZ = new THREE.Box3(
        new THREE.Vector3(
          newX - halfWidth,
          horizontalCollisionY,
          newZ + vz * delta - halfWidth
        ),
        new THREE.Vector3(
          newX + halfWidth,
          horizontalCollisionY + targetHeight,
          newZ + vz * delta + halfWidth
        )
      );

      for (const { box } of staticBoundingBoxes) {
        if (playerBoxZ.intersectsBox(box)) {
          collidedBoxRef.current = box;
          vz = 0;
          break;
        }
      }

      newZ += vz * delta;
    }

    function getHighestYByPosition(x, z, characterRadius = 0) {
      let highestY = null;
      const offsets = [
        [0, 0],
        [characterRadius, 0],
        [-characterRadius, 0],
        [0, characterRadius],
        [0, -characterRadius],
        [characterRadius, characterRadius],
        [characterRadius, -characterRadius],
        [-characterRadius, characterRadius],
        [-characterRadius, -characterRadius],
      ];

      for (const { box } of staticBoundingBoxes) {
        for (const [dx, dz] of offsets) {
          const point = new THREE.Vector3(x + dx, 0, z + dz);
          if (box.containsPoint(point)) {
            if (highestY === null || box.max.y > highestY) {
              highestY = box.max.y;
            }
            break;
          }
        }
      }

      return highestY;
    }

    const yAtCurrentPosition = getHighestYByPosition(newX, newZ, halfWidth);
    if (yAtCurrentPosition !== null && newY <= yAtCurrentPosition + 0.05) {
      newY = yAtCurrentPosition;
    }

    position.current = [newX, newY, newZ];
    velocity.current = [vx, vy, vz];
    onPositionChange([newX, newY, newZ]);

    groupRef.current.position.set(newX, newY, newZ);

    if (vx !== 0 || vz !== 0) {
      const angle = Math.atan2(vx, vz);
      groupRef.current.rotation.y = lerpAngle(
        groupRef.current.rotation.y,
        angle,
        0.2
      );
    }

    setIsMoving(moveDir.lengthSq() > 0);

    // Red debug box for the collided object
    if (debug) {
      if (collidedBoxRef.current) {
        if (!collidedBoxHelperRef.current) {
          const helper = new THREE.Box3Helper(
            collidedBoxRef.current,
            new THREE.Color(0xff0000)
          );
          fiberScene.add(helper);
          collidedBoxHelperRef.current = helper;
        } else {
          collidedBoxHelperRef.current.box.copy(collidedBoxRef.current);
          collidedBoxHelperRef.current.updateMatrixWorld(true);
          collidedBoxHelperRef.current.material.color.set(0xff0000);
        }
      } else if (collidedBoxHelperRef.current) {
        fiberScene.remove(collidedBoxHelperRef.current);
        collidedBoxHelperRef.current = null;
      }

      if (boxHelperRef.current) boxHelperRef.current.update();

      if (positionLabelRef.current) {
        const { sprite, ctx, canvas, texture } = positionLabelRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillText(
          `Pos: ${newX.toFixed(2)}, ${newY.toFixed(2)}, ${newZ.toFixed(2)}`,
          canvas.width / 2,
          canvas.height / 2 - 16
        );
        ctx.fillText(
          `Vel: ${vx.toFixed(2)}, ${vy.toFixed(2)}, ${vz.toFixed(2)}`,
          canvas.width / 2,
          canvas.height / 2 + 16
        );
        texture.needsUpdate = true;
        sprite.position.set(newX, newY + targetHeight + 0.5, newZ);
      }
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
