import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AnimationType } from "../../models/exercise";
import { ModelCoach, type ModelState } from "./ModelCoach";
import {
  getPose,
  getSceneProps,
  SEGMENTS,
  type JointName,
  type Vec3,
} from "./humanoid";

/**
 * Real-3D exercise coach: a stylized humanoid performing the movement,
 * lit for the Nocturne theme, with orbitable auto-rotating camera.
 * Loaded lazily — three never enters the initial bundle.
 */

const BODY_COLOR = "#e8e8ec";
const JOINT_COLOR = "#d4d4d8";
const ACCENT = "#ef4444";
const METAL = "#3a3d45";
const SURFACE = "#222329";

const JOINT_RADII: Partial<Record<JointName, number>> = {
  head: 0.115,
  chest: 0.1,
  pelvis: 0.095,
  neck: 0.05,
  shoulderL: 0.055,
  shoulderR: 0.055,
  elbowL: 0.045,
  elbowR: 0.045,
  handL: 0.042,
  handR: 0.042,
  hipL: 0.06,
  hipR: 0.06,
  kneeL: 0.055,
  kneeR: 0.055,
  footL: 0.05,
  footR: 0.05,
};

const JOINT_NAMES = Object.keys(JOINT_RADII) as JointName[];

const UP = new THREE.Vector3(0, 1, 0);
const tmpDir = new THREE.Vector3();
const tmpFrom = new THREE.Vector3();
const tmpTo = new THREE.Vector3();

function setSegment(mesh: THREE.Mesh, from: Vec3, to: Vec3): void {
  tmpFrom.set(from[0], from[1], from[2]);
  tmpTo.set(to[0], to[1], to[2]);
  tmpDir.subVectors(tmpTo, tmpFrom);
  const length = Math.max(tmpDir.length(), 0.001);
  mesh.position.copy(tmpFrom).addScaledVector(tmpDir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, tmpDir.normalize());
  mesh.scale.set(1, length, 1);
}

interface FigureProps {
  type: AnimationType;
  isPlaying: boolean;
  reducedMotion: boolean;
}

function Figure({ type, isPlaying, reducedMotion }: FigureProps) {
  const jointRefs = useRef<Partial<Record<JointName, THREE.Mesh>>>({});
  const segmentRefs = useRef<(THREE.Mesh | null)[]>([]);
  const barbellRef = useRef<THREE.Group>(null);
  const dumbbellL = useRef<THREE.Group>(null);
  const dumbbellR = useRef<THREE.Group>(null);
  const pulldown = useRef<THREE.Group>(null);
  const phaseRef = useRef(0.35);

  const scene = useMemo(() => getSceneProps(type), [type]);

  const bodyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.55 }),
    [],
  );
  const jointMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: JOINT_COLOR, roughness: 0.5 }),
    [],
  );

  useFrame((state) => {
    // Sine-eased phase, exactly like the 2D reference figure.
    if (isPlaying && !reducedMotion) {
      phaseRef.current = (Math.sin(state.clock.elapsedTime * 1.7) + 1) / 2;
    }
    const pose = getPose(type, phaseRef.current);

    for (const name of JOINT_NAMES) {
      const mesh = jointRefs.current[name];
      if (mesh) mesh.position.set(...pose[name]);
    }
    SEGMENTS.forEach(([from, to], i) => {
      const mesh = segmentRefs.current[i];
      if (mesh) setSegment(mesh, pose[from], pose[to]);
    });

    // Equipment follows the hands.
    const { handL, handR } = pose;
    if (barbellRef.current) {
      const midY = (handL[1] + handR[1]) / 2;
      const midZ = (handL[2] + handR[2]) / 2;
      barbellRef.current.position.set(0, midY, midZ);
    }
    if (dumbbellL.current) dumbbellL.current.position.set(...handL);
    if (dumbbellR.current) dumbbellR.current.position.set(...handR);
    if (pulldown.current) {
      const midY = (handL[1] + handR[1]) / 2;
      const midZ = (handL[2] + handR[2]) / 2;
      pulldown.current.position.set(0, midY, midZ);
    }
  });

  return (
    <group>
      {/* Joints */}
      {JOINT_NAMES.map((name) => (
        <mesh
          key={name}
          ref={(m) => {
            jointRefs.current[name] = m ?? undefined;
          }}
          material={name === "head" ? bodyMaterial : jointMaterial}
          castShadow
        >
          <sphereGeometry args={[JOINT_RADII[name] ?? 0.05, 20, 16]} />
        </mesh>
      ))}

      {/* Limb segments (unit cylinders, scaled per frame) */}
      {SEGMENTS.map(([from, to, radius], i) => (
        <mesh
          key={`${from}-${to}`}
          ref={(m) => {
            segmentRefs.current[i] = m;
          }}
          material={bodyMaterial}
          castShadow
        >
          <cylinderGeometry args={[radius, radius * 0.92, 1, 14]} />
        </mesh>
      ))}

      {/* Barbell: bar along X with red plates */}
      {scene.equipment === "barbell" ? (
        <group ref={barbellRef}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 1.5, 12]} />
            <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.35} />
          </mesh>
          {[-0.62, -0.56, 0.56, 0.62].map((x, i) => (
            <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry
                args={[i === 0 || i === 3 ? 0.13 : 0.16, i === 0 || i === 3 ? 0.13 : 0.16, 0.035, 24]}
              />
              <meshStandardMaterial color={ACCENT} roughness={0.4} metalness={0.2} />
            </mesh>
          ))}
        </group>
      ) : null}

      {/* Dumbbells at each hand */}
      {scene.equipment === "dumbbells"
        ? [dumbbellL, dumbbellR].map((ref, i) => (
            <group key={i} ref={ref}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.016, 0.016, 0.24, 10]} />
                <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.35} />
              </mesh>
              {[-0.1, 0.1].map((x) => (
                <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.055, 0.055, 0.05, 18]} />
                  <meshStandardMaterial color={ACCENT} roughness={0.4} metalness={0.2} />
                </mesh>
              ))}
            </group>
          ))
        : null}

      {/* Pulldown bar + cable column */}
      {scene.equipment === "pulldownBar" ? (
        <>
          <group ref={pulldown}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.016, 0.016, 0.9, 10]} />
              <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.35} />
            </mesh>
          </group>
          <mesh position={[0, 1.6, 0.55]} castShadow>
            <boxGeometry args={[0.08, 2.4, 0.08]} />
            <meshStandardMaterial color={SURFACE} roughness={0.7} />
          </mesh>
          <mesh position={[0, 2.75, 0.3]} rotation={[Math.PI / 2 - 0.45, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
            <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
          </mesh>
        </>
      ) : null}

      {/* Bench / mat props */}
      {scene.bench ? (
        <group>
          <mesh position={[0, 0.4, 0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.36, 0.08, 1.15]} />
            <meshStandardMaterial color="#3a3d45" roughness={0.7} />
          </mesh>
          {[-0.35, 0.5].map((z) => (
            <mesh key={z} position={[0, 0.18, z]} castShadow>
              <boxGeometry args={[0.3, 0.36, 0.07]} />
              <meshStandardMaterial color={SURFACE} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ) : null}
      {scene.mat ? (
        <mesh position={[0, 0.012, 0.15]} receiveShadow>
          <boxGeometry args={[0.75, 0.025, 1.7]} />
          <meshStandardMaterial color="#26272d" roughness={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}

function CameraRig({ autoRotate, targetY }: { autoRotate: boolean; targetY: number }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.set(0, targetY, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.1;
    controls.minDistance = 1.6;
    controls.maxDistance = 5;
    controls.maxPolarAngle = 1.5;
    const id = setInterval(() => controls.update(), 16);
    return () => {
      clearInterval(id);
      controls.dispose();
    };
  }, [camera, gl, autoRotate, targetY]);
  return null;
}

/** Initial viewing angle per exercise (§38) — orbit controls stay free. */
export type CameraPreset = "front" | "side" | "threeQuarter";

const CAMERA_POSITIONS: Record<CameraPreset, [number, number, number]> = {
  front: [0, 1.5, 3.4],
  side: [3.2, 1.5, 0.3],
  threeQuarter: [2.2, 1.5, 2.6],
};

export interface ExerciseCoach3DProps {
  type: AnimationType;
  /** Authored GLB animation (Exercise.animation3dUrl) — procedural fallback on error. */
  modelUrl?: string;
  cameraPreset?: CameraPreset;
  className?: string;
}

export function ExerciseCoach3D({ type, modelUrl, cameraPreset, className }: ExerciseCoach3DProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [modelState, setModelState] = useState<ModelState>("loading");
  const useModel = !!modelUrl && modelState !== "error";
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", borderRadius: "inherit" }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: CAMERA_POSITIONS[cameraPreset ?? "threeQuarter"], fov: 42 }}
        style={{ borderRadius: "inherit", touchAction: "none" }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[2.5, 3.5, 2]}
          intensity={1.4}
          color="#fff4ec"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-3, 2, -2.5]} intensity={0.5} color="#ff6a4d" />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <circleGeometry args={[2.4, 48]} />
          <meshStandardMaterial color="#141518" roughness={0.95} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <ringGeometry args={[2.3, 2.4, 48]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.25} />
        </mesh>

        {useModel && modelUrl ? (
          <ModelCoach url={modelUrl} isPlaying={isPlaying && !reducedMotion} onStateChange={setModelState} />
        ) : (
          <Figure type={type} isPlaying={isPlaying} reducedMotion={reducedMotion} />
        )}
        <CameraRig
          autoRotate={isPlaying && !reducedMotion}
          targetY={getSceneProps(type).cameraTargetY}
        />
      </Canvas>

      <button
        type="button"
        aria-label={isPlaying ? "Animation pausieren" : "Animation abspielen"}
        onClick={() => setIsPlaying((p) => !p)}
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "rgba(34, 35, 41, 0.8)",
          border: "1px solid var(--border, rgba(255,255,255,0.12))",
          color: "var(--text, #f4f4f5)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
    </div>
  );
}

export default ExerciseCoach3D;
