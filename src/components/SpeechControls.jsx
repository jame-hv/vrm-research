import { useState } from "react";

const predefinedSentences = {
  happy: [
    "Hello! I'm so excited to meet you!",
    "What a wonderful day this is!",
    "I love talking with you!",
    "This is amazing! Let's have fun together!",
    "You make me so happy!",
  ],
  normal: [
    "Hello, how are you today?",
    "It's nice to meet you.",
    "How can I help you?",
    "What would you like to talk about?",
    "I'm here if you need anything.",
  ],
  sadly: [
    "I'm feeling a bit down today...",
    "Sometimes things can be difficult.",
    "I hope things get better soon.",
    "Thank you for being here with me.",
    "Even when sad, I appreciate your company.",
  ],
};

export const SpeechControls = ({ onSpeak, isSpeaking }) => {
  const [selectedMode, setSelectedMode] = useState("normal");
  const [customText, setCustomText] = useState("");

  const handlePredefinedSpeak = (mode) => {
    const sentences = predefinedSentences[mode];
    const randomSentence =
      sentences[Math.floor(Math.random() * sentences.length)];
    onSpeak(randomSentence, mode);
  };

  const handleCustomSpeak = () => {
    if (customText.trim()) {
      onSpeak(customText.trim(), selectedMode);
      setCustomText("");
    }
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
  };

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white z-20 pointer-events-auto">
      <h3 className="text-lg font-semibold mb-3">Speech Controls</h3>

      {/* Mode Selection */}
      <div className="mb-4">
        <label className="block text-sm mb-2">Emotion Mode:</label>
        <select
          value={selectedMode}
          onChange={(e) => setSelectedMode(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
          disabled={isSpeaking}
        >
          <option value="happy">😊 Happy</option>
          <option value="normal">😐 Normal</option>
          <option value="sadly">😢 Sad</option>
        </select>
      </div>

      {/* Predefined Sentences */}
      <div className="mb-4">
        <label className="block text-sm mb-2">Quick Phrases:</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handlePredefinedSpeak("happy")}
            disabled={isSpeaking}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm transition-colors"
          >
            😊 Happy
          </button>
          <button
            onClick={() => handlePredefinedSpeak("normal")}
            disabled={isSpeaking}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm transition-colors"
          >
            😐 Normal
          </button>
          <button
            onClick={() => handlePredefinedSpeak("sadly")}
            disabled={isSpeaking}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-sm transition-colors"
          >
            😢 Sad
          </button>
        </div>
      </div>

      {/* Custom Text Input */}
      <div className="mb-4">
        <label className="block text-sm mb-2">Custom Text:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Type something..."
            className="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600"
            disabled={isSpeaking}
            onKeyPress={(e) => e.key === "Enter" && handleCustomSpeak()}
          />
          <button
            onClick={handleCustomSpeak}
            disabled={isSpeaking || !customText.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded transition-colors"
          >
            Speak
          </button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {isSpeaking && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Speaking...</span>
            </>
          )}
        </div>
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
};
