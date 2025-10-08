import {
  CameraControls,
  Environment,
  Gltf,
  OrbitControls,
} from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useRef } from "react";
import { VRMAvatar } from "./VRMAvatar";

export const Main = ({ speechText, speechMode, onSpeechEnd }) => {
  const controls = useRef();

  // select models

  return (
    <>
      <CameraControls
        ref={controls}
        maxPolarAngle={Math.PI / 2}
        minDistance={-2}
        maxDistance={10}
      />
      {/* <OrbitControls /> */}
      <Environment preset="sunset" />
      <directionalLight intensity={2} position={[10, 10, 5]} />
      <directionalLight intensity={1} position={[-10, 10, 5]} />
      <group position-y={-1.25}>
        <VRMAvatar
          speechText={speechText}
          speechMode={speechMode}
          onSpeechEnd={onSpeechEnd}
        />
        <Gltf
          src="models/new-bg.glb"
          position-z={-0.5}
          position-x={-0.5}
          scale={0.65}
        />
      </group>
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.6} />
      </EffectComposer>
    </>
  );
};
