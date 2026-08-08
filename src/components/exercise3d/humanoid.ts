import type { AnimationType } from "../../models/exercise";

/**
 * Procedural pose math for the 3D exercise coach.
 * Coordinate system: +Y up, +Z toward the camera (front), +X to the figure's left.
 * All lengths in meters; the figure is ~1.75 m tall standing.
 */

export type JointName =
  | "pelvis"
  | "chest"
  | "neck"
  | "head"
  | "shoulderL"
  | "shoulderR"
  | "elbowL"
  | "elbowR"
  | "handL"
  | "handR"
  | "hipL"
  | "hipR"
  | "kneeL"
  | "kneeR"
  | "footL"
  | "footR";

export type Vec3 = [number, number, number];

export type Pose = Record<JointName, Vec3>;

/** Equipment the scene should show for a movement, positioned from the pose. */
export type EquipmentKind = "barbell" | "dumbbells" | "pulldownBar" | "none";

export interface SceneProps {
  equipment: EquipmentKind;
  /** Show a flat bench under the figure (bench press). */
  bench: boolean;
  /** Show a floor mat (crunch/plank). */
  mat: boolean;
}

export const SEGMENTS: [JointName, JointName, number][] = [
  ["pelvis", "chest", 0.085],
  ["chest", "neck", 0.055],
  ["neck", "head", 0.04],
  ["chest", "shoulderL", 0.045],
  ["chest", "shoulderR", 0.045],
  ["shoulderL", "elbowL", 0.042],
  ["shoulderR", "elbowR", 0.042],
  ["elbowL", "handL", 0.036],
  ["elbowR", "handR", 0.036],
  ["pelvis", "hipL", 0.055],
  ["pelvis", "hipR", 0.055],
  ["hipL", "kneeL", 0.06],
  ["hipR", "kneeR", 0.06],
  ["kneeL", "footL", 0.05],
  ["kneeR", "footR", 0.05],
];

// Proportions (≈7.5 head heights).
const UPPER_ARM = 0.28;
const FOREARM = 0.27;
const THIGH = 0.42;
const SHIN = 0.42;
const SHOULDER_X = 0.21;
const HIP_X = 0.1;

const v = (x: number, y: number, z: number): Vec3 => [x, y, z];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function len(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}
function norm(a: Vec3): Vec3 {
  const l = len(a) || 1;
  return scale(a, 1 / l);
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Two-bone IK: place the middle joint between `root` and `end` for bones of
 * length l1/l2, bending toward `bendDir` (does not need to be orthogonal).
 */
function solveMiddle(root: Vec3, end: Vec3, l1: number, l2: number, bendDir: Vec3): Vec3 {
  const span = sub(end, root);
  let d = len(span);
  const maxReach = l1 + l2 - 0.0001;
  if (d > maxReach) d = maxReach;
  const dir = norm(span);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  // Orthogonalize bendDir against dir.
  const proj = scale(dir, dot(bendDir, dir));
  let perp = sub(bendDir, proj);
  if (len(perp) < 1e-4) perp = cross(dir, [0, 0, 1]);
  perp = norm(perp);
  return add(add(root, scale(dir, x)), scale(perp, h));
}

interface TrunkOptions {
  pelvis: Vec3;
  /** Forward lean of the spine in radians (0 = upright, + leans toward +Z). */
  lean?: number;
  /** Extra torso curl for crunches (rotates chest further). */
  curl?: number;
}

/** Build pelvis→chest→neck→head plus shoulder/hip anchor points. */
function trunk({ pelvis, lean = 0, curl = 0 }: TrunkOptions) {
  const spine = 0.4;
  const neckLen = 0.09;
  const headLen = 0.14;
  const a = lean;
  const b = lean + curl;
  const chest: Vec3 = add(pelvis, [0, spine * Math.cos(a), spine * Math.sin(a)]);
  const neck: Vec3 = add(chest, [0, neckLen * Math.cos(b), neckLen * Math.sin(b)]);
  const head: Vec3 = add(neck, [0, headLen * Math.cos(b), headLen * Math.sin(b)]);
  const shoulderL: Vec3 = add(chest, [SHOULDER_X, -0.02, 0]);
  const shoulderR: Vec3 = add(chest, [-SHOULDER_X, -0.02, 0]);
  const hipL: Vec3 = add(pelvis, [HIP_X, -0.03, 0]);
  const hipR: Vec3 = add(pelvis, [-HIP_X, -0.03, 0]);
  return { chest, neck, head, shoulderL, shoulderR, hipL, hipR };
}

interface LimbTargets {
  handL: Vec3;
  handR: Vec3;
  footL: Vec3;
  footR: Vec3;
  /** Elbow bend hint (default: outward + slightly back). */
  elbowDirL?: Vec3;
  elbowDirR?: Vec3;
  /** Knee bend hint (default: forward). */
  kneeDir?: Vec3;
}

function buildPose(t: TrunkOptions, targets: LimbTargets): Pose {
  const { chest, neck, head, shoulderL, shoulderR, hipL, hipR } = trunk(t);
  const elbowDirL = targets.elbowDirL ?? [1, -0.3, -0.2];
  const elbowDirR = targets.elbowDirR ?? [-1, -0.3, -0.2];
  const kneeDir = targets.kneeDir ?? [0, 0, 1];
  return {
    pelvis: t.pelvis,
    chest,
    neck,
    head,
    shoulderL,
    shoulderR,
    elbowL: solveMiddle(shoulderL, targets.handL, UPPER_ARM, FOREARM, elbowDirL),
    elbowR: solveMiddle(shoulderR, targets.handR, UPPER_ARM, FOREARM, elbowDirR),
    handL: targets.handL,
    handR: targets.handR,
    hipL,
    hipR,
    kneeL: solveMiddle(hipL, targets.footL, THIGH, SHIN, kneeDir),
    kneeR: solveMiddle(hipR, targets.footR, THIGH, SHIN, kneeDir),
    footL: targets.footL,
    footR: targets.footR,
  };
}

const STAND_PELVIS_Y = 0.93;
const FOOT_Y = 0.06;

/** Scene setup (equipment/props) per movement type. */
export function getSceneProps(type: AnimationType): SceneProps {
  switch (type) {
    case "push":
      return { equipment: "barbell", bench: true, mat: false };
    case "squat":
    case "hinge":
    case "press":
      return { equipment: "barbell", bench: false, mat: false };
    case "curl":
    case "raise":
      return { equipment: "dumbbells", bench: false, mat: false };
    case "pull":
      return { equipment: "pulldownBar", bench: false, mat: false };
    case "crunch":
    case "plank":
      return { equipment: "none", bench: false, mat: true };
    case "lunges":
      return { equipment: "dumbbells", bench: false, mat: false };
  }
}

/**
 * The heart of the coach: joint positions for a movement at phase p ∈ [0,1]
 * (0 = start position, 1 = peak effort). The caller animates p with a sine.
 */
export function getPose(type: AnimationType, p: number): Pose {
  switch (type) {
    case "squat": {
      // Barbell back squat: hips travel down/back, knees track forward.
      const depth = p * 0.36;
      const pelvis = v(0, STAND_PELVIS_Y - depth, -0.06 * p);
      const lean = 0.16 * p;
      const { shoulderL, shoulderR } = trunk({ pelvis, lean });
      // Hands hold the bar just outside the shoulders.
      return buildPose(
        { pelvis, lean },
        {
          handL: add(shoulderL, [0.12, 0.05, -0.03]),
          handR: add(shoulderR, [-0.12, 0.05, -0.03]),
          footL: v(0.14, FOOT_Y, 0.02),
          footR: v(-0.14, FOOT_Y, 0.02),
          elbowDirL: [0.6, -1, -0.4],
          elbowDirR: [-0.6, -1, -0.4],
        },
      );
    }

    case "hinge": {
      // Deadlift: p=0 bottom (bar near floor), p=1 lockout.
      const lean = lerp(1.15, 0.02, p);
      const pelvisY = lerp(0.72, STAND_PELVIS_Y, p);
      const pelvis = v(0, pelvisY, lerp(-0.16, 0, p));
      const barY = lerp(0.24, 0.86, p);
      const barZ = lerp(0.16, 0.06, p);
      return buildPose(
        { pelvis, lean },
        {
          handL: v(0.24, barY, barZ),
          handR: v(-0.24, barY, barZ),
          footL: v(0.13, FOOT_Y, 0),
          footR: v(-0.13, FOOT_Y, 0),
          elbowDirL: [0.4, 0, -1],
          elbowDirR: [-0.4, 0, -1],
          kneeDir: [0, 0, 1],
        },
      );
    }

    case "push": {
      // Bench press, lying on the bench along Z (head toward -Z).
      const benchTop = 0.48;
      const pelvis = v(0, benchTop + 0.05, 0.18);
      const chestY = benchTop + 0.12;
      const pressHeight = lerp(0.12, 0.42, p);
      const pose = buildPose(
        { pelvis, lean: -Math.PI / 2 + 0.06 }, // spine lies along -Z
        {
          handL: v(0.26, chestY + pressHeight, -0.18),
          handR: v(-0.26, chestY + pressHeight, -0.18),
          footL: v(0.2, FOOT_Y, 0.62),
          footR: v(-0.2, FOOT_Y, 0.62),
          elbowDirL: [1, 0, 0.15],
          elbowDirR: [-1, 0, 0.15],
          kneeDir: [0, 1, 0.2],
        },
      );
      return pose;
    }

    case "press": {
      // Overhead press: bar from shoulders to lockout.
      const pelvis = v(0, STAND_PELVIS_Y, 0);
      const { shoulderL, shoulderR } = trunk({ pelvis });
      const barLift = lerp(0.04, 0.56, p);
      return buildPose(
        { pelvis },
        {
          handL: add(shoulderL, [0.08, barLift, 0.05]),
          handR: add(shoulderR, [-0.08, barLift, 0.05]),
          footL: v(0.13, FOOT_Y, 0),
          footR: v(-0.13, FOOT_Y, 0),
          elbowDirL: [1, -0.4, 0.1],
          elbowDirR: [-1, -0.4, 0.1],
        },
      );
    }

    case "curl": {
      // Biceps curl: elbows pinned at the sides, forearms rotate up.
      const pelvis = v(0, STAND_PELVIS_Y, 0);
      const { shoulderL, shoulderR } = trunk({ pelvis });
      const elbowL = add(shoulderL, [0.02, -UPPER_ARM, 0.02]);
      const elbowR = add(shoulderR, [-0.02, -UPPER_ARM, 0.02]);
      const angle = lerp(0.12, 2.3, p); // radians from hanging straight down
      const handOffset: Vec3 = [0, -FOREARM * Math.cos(angle), FOREARM * Math.sin(angle)];
      const pose = buildPose(
        { pelvis },
        {
          handL: add(elbowL, handOffset),
          handR: add(elbowR, handOffset),
          footL: v(0.13, FOOT_Y, 0),
          footR: v(-0.13, FOOT_Y, 0),
        },
      );
      // Pin the elbows exactly (IK would drift them slightly).
      pose.elbowL = elbowL;
      pose.elbowR = elbowR;
      return pose;
    }

    case "pull": {
      // Lat pulldown: bar pulled from overhead to the upper chest.
      const pelvis = v(0, STAND_PELVIS_Y - 0.28, 0.02); // slightly seated
      const barY = lerp(2.02, 1.32, p);
      const barZ = lerp(0.1, 0.16, p);
      return buildPose(
        { pelvis, lean: -0.1 },
        {
          handL: v(0.3, barY, barZ),
          handR: v(-0.3, barY, barZ),
          footL: v(0.14, FOOT_Y, 0.1),
          footR: v(-0.14, FOOT_Y, 0.1),
          elbowDirL: [1, -0.5, 0],
          elbowDirR: [-1, -0.5, 0],
          kneeDir: [0, 0.2, 1],
        },
      );
    }

    case "crunch": {
      // Crunch on the mat: knees bent, torso curls up.
      const pelvis = v(0, 0.14, 0.05);
      const lean = lerp(-1.5, -0.95, p); // spine from flat to curled up
      const curl = 0.35 * p;
      const { shoulderL, shoulderR } = trunk({ pelvis, lean, curl });
      return buildPose(
        { pelvis, lean, curl },
        {
          handL: add(shoulderL, [0.02, 0.1, 0.12]),
          handR: add(shoulderR, [-0.02, 0.1, 0.12]),
          footL: v(0.14, FOOT_Y, 0.5),
          footR: v(-0.14, FOOT_Y, 0.5),
          elbowDirL: [1, 0.4, 0],
          elbowDirR: [-1, 0.4, 0],
          kneeDir: [0, 1, 0],
        },
      );
    }

    case "plank": {
      // Forearm plank: static hold with a subtle breathing bob.
      const bob = 0.012 * p;
      const pelvis = v(0, 0.5 + bob, 0.1);
      return buildPose(
        { pelvis, lean: -1.42 },
        {
          handL: v(0.16, 0.1, -0.62),
          handR: v(-0.16, 0.1, -0.62),
          footL: v(0.13, 0.1, 0.78),
          footR: v(-0.13, 0.1, 0.78),
          elbowDirL: [0.2, -1, 0],
          elbowDirR: [-0.2, -1, 0],
          kneeDir: [0, 1, 0],
        },
      );
    }

    case "raise": {
      // Lateral raise: straight arms travel from the thighs to horizontal.
      const pelvis = v(0, STAND_PELVIS_Y, 0);
      const { shoulderL, shoulderR } = trunk({ pelvis });
      const angle = lerp(0.12, Math.PI / 2 - 0.05, p); // from vertical-down
      const reach = UPPER_ARM + FOREARM - 0.02;
      const dy = -reach * Math.cos(angle);
      const dx = reach * Math.sin(angle);
      return buildPose(
        { pelvis },
        {
          handL: add(shoulderL, [dx, dy, 0.02]),
          handR: add(shoulderR, [-dx, dy, 0.02]),
          footL: v(0.13, FOOT_Y, 0),
          footR: v(-0.13, FOOT_Y, 0),
          elbowDirL: [0.4, 1, 0],
          elbowDirR: [-0.4, 1, 0],
        },
      );
    }

    case "lunges": {
      // Forward lunge: right leg steps forward, hips sink.
      const sink = 0.3 * p;
      const step = 0.22 + 0.1 * p;
      const pelvis = v(0, STAND_PELVIS_Y - sink, 0.04);
      const { shoulderL, shoulderR } = trunk({ pelvis, lean: 0.05 * p });
      return buildPose(
        { pelvis, lean: 0.05 * p },
        {
          handL: add(shoulderL, [0.04, -UPPER_ARM - FOREARM + 0.03, 0.01]),
          handR: add(shoulderR, [-0.04, -UPPER_ARM - FOREARM + 0.03, 0.01]),
          footL: v(0.12, FOOT_Y, -step), // back leg
          footR: v(-0.12, FOOT_Y, step + 0.12), // front leg
          kneeDir: [0, 0.15, 1],
        },
      );
    }
  }
}

/** Where the hands are — the scene attaches bars/dumbbells there. */
export function getHandPositions(pose: Pose): { left: Vec3; right: Vec3 } {
  return { left: pose.handL, right: pose.handR };
}
