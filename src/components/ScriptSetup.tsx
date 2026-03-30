import { useState } from "react";
import { motion } from "framer-motion";

export interface ScriptConfig {
  mode: "none" | "uploaded" | "generated";
  text: string;
}

interface ScriptSetupProps {
  sessionType: string;
  onContinue: (config: ScriptConfig) => void;
  onBack: () => void;
}

export function ScriptSetup({ sessionType, onContinue, onBack }: ScriptSetupProps) {
  const [mode, setMode] = useState<"none" | "upload" | "generate">("none");
  const [uploadedText, setUploadedText] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, sessionType, durationMinutes: duration }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedText(data.script);
      } else {
        alert("Failed to generate script. Make sure the LLM backend is configured.");
      }
    } catch {
      alert("Failed to connect to server.");
    }
    setIsGenerating(false);
  };

  const handleContinue = () => {
    if (mode === "upload" && uploadedText.trim()) {
      onContinue({ mode: "uploaded", text: uploadedText.trim() });
    } else if (mode === "generate" && generatedText.trim()) {
      onContinue({ mode: "generated", text: generatedText.trim() });
    } else {
      onContinue({ mode: "none", text: "" });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0f0f23] text-white flex flex-col">
      <header className="border-b border-white/10 px-4 md:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="text-white/40 hover:text-white/70 text-sm">← Back</button>
          <h1 className="text-sm md:text-base font-semibold">Script Setup</h1>
          <div />
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto px-4 md:px-6 py-6 w-full">
        <p className="text-xs md:text-sm text-white/50 mb-6">Would you like to use a teleprompter during your session?</p>

        {/* Mode selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <ModeButton
            selected={mode === "none"}
            onClick={() => setMode("none")}
            icon="🎤"
            title="No Script"
            description="Speak freely without a teleprompter"
          />
          <ModeButton
            selected={mode === "upload"}
            onClick={() => setMode("upload")}
            icon="📄"
            title="My Script"
            description="Paste or type your own script"
          />
          <ModeButton
            selected={mode === "generate"}
            onClick={() => setMode("generate")}
            icon="✨"
            title="Generate Script"
            description="AI writes a script from your description"
          />
        </div>

        {/* Upload mode */}
        {mode === "upload" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <textarea
              value={uploadedText}
              onChange={(e) => setUploadedText(e.target.value)}
              placeholder="Paste or type your script here..."
              className="w-full h-48 md:h-64 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/30 outline-none focus:border-blue-400/50 resize-none"
            />
            <div className="text-[10px] text-white/30 mt-1">{uploadedText.split(/\s+/).filter(Boolean).length} words</div>
          </motion.div>
        )}

        {/* Generate mode */}
        {mode === "generate" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Describe your talk</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., A pitch for a mobile app that helps college students find affordable housing near their campus..."
                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400/50 resize-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
                >
                  <option value={1}>1 minute</option>
                  <option value={2}>2 minutes</option>
                  <option value={3}>3 minutes</option>
                  <option value={5}>5 minutes</option>
                </select>
              </div>
              <div className="flex-1" />
              <button
                onClick={handleGenerate}
                disabled={!description.trim() || isGenerating}
                className="px-5 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 rounded-lg text-sm font-medium"
              >
                {isGenerating ? "Generating..." : "Generate Script"}
              </button>
            </div>

            {generatedText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <label className="text-xs text-white/50 mb-1 block">Generated Script (you can edit)</label>
                <textarea
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  className="w-full h-48 md:h-64 bg-white/5 border border-purple-500/30 rounded-xl p-4 text-sm text-white outline-none resize-none"
                />
                <div className="text-[10px] text-white/30 mt-1">{generatedText.split(/\s+/).filter(Boolean).length} words · ~{Math.round(generatedText.split(/\s+/).filter(Boolean).length / 130)} min</div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Continue button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleContinue}
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium"
          >
            {mode === "none" ? "Start Without Script" : "Start With Teleprompter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeButton({ selected, onClick, icon, title, description }: {
  selected: boolean; onClick: () => void; icon: string; title: string; description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-all ${
        selected ? "border-blue-400 bg-blue-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium mb-0.5">{title}</div>
      <div className="text-[10px] text-white/40">{description}</div>
    </button>
  );
}
