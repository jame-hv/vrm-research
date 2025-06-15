import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Face, Hand, Pose } from "kalidokit";
import { useControls } from "leva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Euler, LoopRepeat, Object3D, Quaternion, Vector3 } from "three";
import { lerp } from "three/src/math/MathUtils.js";
import { useVideoRecognition } from "../hooks/useVideoRecognition";
import { remapMixamoAnimationToVrm } from "../utils/remapMixamoAnimationToVrm";

const tmpQuat = new Quaternion();
const tmpEuler = new Euler();

export const VRMAvatar = ({ ...props }) => {
  const { scene, userData } = useGLTF(
    `models/262410318834873893.vrm`,
    undefined,
    undefined,
    (loader) => {
      loader.register((parser) => {
        return new VRMLoaderPlugin(parser);
      });
    }
  );

  const asset = useFBX("models/animations/Breathing Idle.fbx");

  const currentVrm = userData.vrm;

  const animationClip = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, asset);
    clip.name = "Idle";
    return clip;
  }, [asset, currentVrm]);

  const { actions } = useAnimations([animationClip], currentVrm.scene);

  // State to track when VRM is fully loaded and ready
  const [isVrmReady, setIsVrmReady] = useState(false);

  useEffect(() => {
    const vrm = userData.vrm;

    console.log("VRM loaded:", vrm);
    // Performance optimizations
    VRMUtils.removeUnnecessaryVertices(scene);
    VRMUtils.combineSkeletons(scene);
    VRMUtils.combineMorphs(vrm);

    // Disable frustum culling for avatar
    vrm.scene.traverse((obj) => {
      obj.frustumCulled = false;
    });

    // Set initial expression values for smoother transitions
    const initialExpressions = [
      "aa",
      "ih",
      "ee",
      "oh",
      "ou",
      "blinkLeft",
      "blinkRight",
    ];
    initialExpressions.forEach((expression) => {
      vrm.expressionManager.setValue(expression, 0);
    });

    // Mark VRM as ready after a short delay for smooth initialization
    setTimeout(() => {
      setIsVrmReady(true);
    }, 100);
  }, [scene, userData.vrm]);

  const setResultsCallback = useVideoRecognition(
    (state) => state.setResultsCallback
  );
  const videoElement = useVideoRecognition((state) => state.videoElement);
  const riggedFace = useRef();
  const riggedPose = useRef();
  const riggedLeftHand = useRef();
  const riggedRightHand = useRef();

  const resultsCallback = useCallback(
    (results) => {
      if (!videoElement || !currentVrm) {
        return;
      }

      // Process face landmarks with error checking
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        try {
          riggedFace.current = Face.solve(results.faceLandmarks, {
            runtime: "mediapipe",
            video: videoElement,
            imageSize: { width: 640, height: 480 },
            smoothBlink: true,
            blinkSettings: [0.2, 0.8],
          });
        } catch (error) {
          console.warn("Face tracking error:", error);
        }
      }

      // Process pose landmarks with error checking
      if (
        results.za &&
        results.poseLandmarks &&
        results.poseLandmarks.length > 0
      ) {
        try {
          riggedPose.current = Pose.solve(results.za, results.poseLandmarks, {
            runtime: "mediapipe",
            video: videoElement,
          });
        } catch (error) {
          console.warn("Pose tracking error:", error);
        }
      }

      // Process hand landmarks with error checking (mirror effect)
      if (results.leftHandLandmarks && results.leftHandLandmarks.length > 0) {
        try {
          riggedRightHand.current = Hand.solve(
            results.leftHandLandmarks,
            "Right"
          );
        } catch (error) {
          console.warn("Left hand tracking error:", error);
        }
      }
      if (results.rightHandLandmarks && results.rightHandLandmarks.length > 0) {
        try {
          riggedLeftHand.current = Hand.solve(
            results.rightHandLandmarks,
            "Left"
          );
        } catch (error) {
          console.warn("Right hand tracking error:", error);
        }
      }
    },
    [videoElement, currentVrm]
  );

  useEffect(() => {
    setResultsCallback(resultsCallback);
  }, [resultsCallback]);

  const { animation } = useControls("VRM", {
    animation: {
      options: ["None", "Idle"],
      value: "Idle",
    },
  });

  useEffect(() => {
    // Don't start animations until VRM is fully ready
    if (!isVrmReady) {
      return;
    }

    if (animation === "None" || videoElement) {
      // Smoothly fade out any running animation when switching to camera mode
      Object.values(actions).forEach((action) => {
        if (action?.isRunning()) {
          action.fadeOut(0.3);
        }
      });
      return;
    }

    // Smooth animation switching with a small delay for loading
    const currentAction = actions[animation];
    if (currentAction) {
      // Add a small delay to ensure everything is ready
      setTimeout(() => {
        // Fade out all other animations first
        Object.values(actions).forEach((action) => {
          if (action !== currentAction && action?.isRunning()) {
            action.fadeOut(0.3);
          }
        });

        // Set up the new animation with smooth transitions
        currentAction
          .reset()
          .setLoop(LoopRepeat, Infinity) // Loop infinitely
          .setDuration(currentAction.getClip().duration)
          .fadeIn(0.8) // Longer fade in for smoother startup
          .play();
      }, 200); // Small delay for smooth initialization
    }

    return () => {
      // Smooth cleanup
      if (currentAction?.isRunning()) {
        currentAction.fadeOut(0.3);
      }
    };
  }, [actions, animation, videoElement, isVrmReady]);

  // Smoothing constants for better performance and natural movement
  const FACE_LERP_FACTOR = 8;
  const EYE_LERP_FACTOR = 4;
  const BODY_LERP_FACTOR = 4;
  const HAND_LERP_FACTOR = 10;

  const lerpExpression = (name, value, lerpFactor, delta) => {
    const currentValue = userData.vrm.expressionManager.getValue(name);
    const newValue = lerp(currentValue, value, lerpFactor * delta);
    userData.vrm.expressionManager.setValue(name, newValue);
  };

  const rotateBone = (
    boneName,
    value,
    slerpFactor,
    delta,
    flip = {
      x: 1,
      y: 1,
      z: 1,
    }
  ) => {
    const bone = userData.vrm.humanoid.getNormalizedBoneNode(boneName);
    if (!bone) {
      return;
    }

    tmpEuler.set(value.x * flip.x, value.y * flip.y, value.z * flip.z);
    tmpQuat.setFromEuler(tmpEuler);
    bone.quaternion.slerp(tmpQuat, slerpFactor * delta);
  };

  useFrame((_, delta) => {
    if (!userData.vrm) {
      return;
    }

    // Smooth camera-based tracking when video is available
    if (videoElement) {
      // Face expressions and mouth movements
      if (riggedFace.current) {
        const expressions = [
          { name: "aa", value: riggedFace.current.mouth.shape.A },
          { name: "ih", value: riggedFace.current.mouth.shape.I },
          { name: "ee", value: riggedFace.current.mouth.shape.E },
          { name: "oh", value: riggedFace.current.mouth.shape.O },
          { name: "ou", value: riggedFace.current.mouth.shape.U },
          { name: "blinkLeft", value: 1 - riggedFace.current.eye.l },
          { name: "blinkRight", value: 1 - riggedFace.current.eye.r },
        ];

        expressions.forEach((item) => {
          lerpExpression(item.name, item.value, FACE_LERP_FACTOR, delta);
        });

        // Smooth head movement
        rotateBone("neck", riggedFace.current.head, BODY_LERP_FACTOR, delta, {
          x: 0.5,
          y: 0.5,
          z: 0.5,
        });
      }

      // Smooth eye tracking
      if (lookAtTarget.current && riggedFace.current?.pupil) {
        userData.vrm.lookAt.target = lookAtTarget.current;
        lookAtDestination.current.set(
          -1.5 * riggedFace.current.pupil.x,
          1.5 * riggedFace.current.pupil.y,
          0
        );
        lookAtTarget.current.position.lerp(
          lookAtDestination.current,
          EYE_LERP_FACTOR * delta
        );
      }

      // Smooth body pose tracking
      if (riggedPose.current) {
        // Torso movements
        rotateBone("chest", riggedPose.current.Spine, BODY_LERP_FACTOR, delta, {
          x: 0.25,
          y: 0.25,
          z: 0.25,
        });
        rotateBone("spine", riggedPose.current.Spine, BODY_LERP_FACTOR, delta, {
          x: 0.25,
          y: 0.25,
          z: 0.25,
        });
        rotateBone(
          "hips",
          riggedPose.current.Hips.rotation,
          BODY_LERP_FACTOR,
          delta,
          {
            x: 0.5,
            y: 0.5,
            z: 0.5,
          }
        );

        // Arm movements
        rotateBone(
          "leftUpperArm",
          riggedPose.current.LeftUpperArm,
          BODY_LERP_FACTOR,
          delta
        );
        rotateBone(
          "leftLowerArm",
          riggedPose.current.LeftLowerArm,
          BODY_LERP_FACTOR,
          delta
        );
        rotateBone(
          "rightUpperArm",
          riggedPose.current.RightUpperArm,
          BODY_LERP_FACTOR,
          delta
        );
        rotateBone(
          "rightLowerArm",
          riggedPose.current.RightLowerArm,
          BODY_LERP_FACTOR,
          delta
        );

        // Smooth hand tracking
        if (riggedLeftHand.current) {
          rotateBone(
            "leftHand",
            {
              z: riggedPose.current.LeftHand.z,
              y: riggedLeftHand.current.LeftWrist.y,
              x: riggedLeftHand.current.LeftWrist.x,
            },
            HAND_LERP_FACTOR,
            delta
          );

          // Left hand fingers with optimized lerp
          const leftFingers = [
            ["leftRingProximal", riggedLeftHand.current.LeftRingProximal],
            [
              "leftRingIntermediate",
              riggedLeftHand.current.LeftRingIntermediate,
            ],
            ["leftRingDistal", riggedLeftHand.current.LeftRingDistal],
            ["leftIndexProximal", riggedLeftHand.current.LeftIndexProximal],
            [
              "leftIndexIntermediate",
              riggedLeftHand.current.LeftIndexIntermediate,
            ],
            ["leftIndexDistal", riggedLeftHand.current.LeftIndexDistal],
            ["leftMiddleProximal", riggedLeftHand.current.LeftMiddleProximal],
            [
              "leftMiddleIntermediate",
              riggedLeftHand.current.LeftMiddleIntermediate,
            ],
            ["leftMiddleDistal", riggedLeftHand.current.LeftMiddleDistal],
            ["leftThumbProximal", riggedLeftHand.current.LeftThumbProximal],
            [
              "leftThumbMetacarpal",
              riggedLeftHand.current.LeftThumbIntermediate,
            ],
            ["leftThumbDistal", riggedLeftHand.current.LeftThumbDistal],
            ["leftLittleProximal", riggedLeftHand.current.LeftLittleProximal],
            [
              "leftLittleIntermediate",
              riggedLeftHand.current.LeftLittleIntermediate,
            ],
            ["leftLittleDistal", riggedLeftHand.current.LeftLittleDistal],
          ];

          leftFingers.forEach(([boneName, rotation]) => {
            rotateBone(boneName, rotation, HAND_LERP_FACTOR, delta);
          });
        }

        if (riggedRightHand.current) {
          rotateBone(
            "rightHand",
            {
              z: riggedPose.current.RightHand.z,
              y: riggedRightHand.current.RightWrist.y,
              x: riggedRightHand.current.RightWrist.x,
            },
            HAND_LERP_FACTOR,
            delta
          );

          // Right hand fingers with optimized lerp
          const rightFingers = [
            ["rightRingProximal", riggedRightHand.current.RightRingProximal],
            [
              "rightRingIntermediate",
              riggedRightHand.current.RightRingIntermediate,
            ],
            ["rightRingDistal", riggedRightHand.current.RightRingDistal],
            ["rightIndexProximal", riggedRightHand.current.RightIndexProximal],
            [
              "rightIndexIntermediate",
              riggedRightHand.current.RightIndexIntermediate,
            ],
            ["rightIndexDistal", riggedRightHand.current.RightIndexDistal],
            [
              "rightMiddleProximal",
              riggedRightHand.current.RightMiddleProximal,
            ],
            [
              "rightMiddleIntermediate",
              riggedRightHand.current.RightMiddleIntermediate,
            ],
            ["rightMiddleDistal", riggedRightHand.current.RightMiddleDistal],
            ["rightThumbProximal", riggedRightHand.current.RightThumbProximal],
            [
              "rightThumbMetacarpal",
              riggedRightHand.current.RightThumbIntermediate,
            ],
            ["rightThumbDistal", riggedRightHand.current.RightThumbDistal],
            [
              "rightLittleProximal",
              riggedRightHand.current.RightLittleProximal,
            ],
            [
              "rightLittleIntermediate",
              riggedRightHand.current.RightLittleIntermediate,
            ],
            ["rightLittleDistal", riggedRightHand.current.RightLittleDistal],
          ];

          rightFingers.forEach(([boneName, rotation]) => {
            rotateBone(boneName, rotation, HAND_LERP_FACTOR, delta);
          });
        }
      }
    }

    // Update VRM with delta time for smooth animation
    userData.vrm.update(delta);
  });

  const lookAtDestination = useRef(new Vector3(0, 0, 0));
  const camera = useThree((state) => state.camera);
  const lookAtTarget = useRef();
  useEffect(() => {
    lookAtTarget.current = new Object3D();
    camera.add(lookAtTarget.current);
  }, [camera]);

  return (
    <group {...props}>
      <primitive object={scene} rotation-y={Math.PI} />
    </group>
  );
};
