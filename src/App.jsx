import { Loader, Stats } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { UI } from "./components/UI";
import { CameraWidget } from "./components/CameraWidget";
import { Main } from "./components/Main";
import { SpeechControls } from "./components/SpeechControls";
function App() {
  const [speechData, setSpeechData] = useState({ text: "", mode: "normal" });
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = (text, mode) => {
    setSpeechData({ text, mode });
    setIsSpeaking(true);
  };

  const handleSpeechEnd = () => {
    setIsSpeaking(false);
    setSpeechData({ text: "", mode: "normal" });
  };

  return (
    <>
      <UI />
      <CameraWidget />
      <SpeechControls onSpeak={handleSpeak} isSpeaking={isSpeaking} />
      <Loader />
      <Canvas shadows camera={{ position: [0.25, 0.25, 2], fov: 30 }}>
        <color attach="background" args={["#333"]} />
        <fog attach="fog" args={["#333", 10, 20]} />
        <Stats />
        <Suspense>
          <Main
            speechText={speechData.text}
            speechMode={speechData.mode}
            onSpeechEnd={handleSpeechEnd}
          />
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
