import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type ModelState = "loading" | "ready" | "error";

interface ModelCoachProps {
  /** URL of a .glb exercise animation (Exercise.animation3dUrl). */
  url: string;
  isPlaying: boolean;
  /** Reports load success/failure so the parent can fall back. */
  onStateChange: (state: ModelState) => void;
}

/**
 * Plays an authored GLB exercise animation (rigged model, baked clip named
 * "exercise" — any first clip works as fallback). Used automatically when an
 * exercise carries animation3dUrl; otherwise the procedural coach renders.
 */
export function ModelCoach({ url, isPlaying, onStateChange }: ModelCoachProps) {
  const { scene } = useThree();
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const rootRef = useRef<THREE.Group | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    onStateChange("loading");
    setReady(false);

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (disposed) return;
        const root = gltf.scene;

        // Normalize: feet on the ground, ~1.75 m tall, centered on the origin.
        const bounds = new THREE.Box3().setFromObject(root);
        const size = bounds.getSize(new THREE.Vector3());
        const scale = size.y > 0 ? 1.75 / size.y : 1;
        root.scale.setScalar(scale);
        const scaled = new THREE.Box3().setFromObject(root);
        const center = scaled.getCenter(new THREE.Vector3());
        root.position.x -= center.x;
        root.position.z -= center.z;
        root.position.y -= scaled.min.y;
        root.traverse((child) => {
          if (child instanceof THREE.Mesh) child.castShadow = true;
        });

        scene.add(root);
        rootRef.current = root;

        const clip =
          gltf.animations.find((a) => a.name === "exercise") ?? gltf.animations[0];
        if (clip) {
          const mixer = new THREE.AnimationMixer(root);
          mixer.clipAction(clip).play();
          mixerRef.current = mixer;
        }
        setReady(true);
        onStateChange("ready");
      },
      undefined,
      () => {
        if (!disposed) onStateChange("error");
      },
    );

    return () => {
      disposed = true;
      const root = rootRef.current;
      if (root) {
        scene.remove(root);
        root.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const material = child.material;
            for (const m of Array.isArray(material) ? material : [material]) m.dispose();
          }
        });
        rootRef.current = null;
      }
      mixerRef.current = null;
    };
  }, [url, scene, onStateChange]);

  useFrame((_, delta) => {
    if (ready && isPlaying) mixerRef.current?.update(delta);
  });

  return null;
}
