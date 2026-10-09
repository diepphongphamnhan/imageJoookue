import React, { useState, useEffect, useRef } from "react";
import {
  FolderOpen,
  Image as ImageIcon,
  Play,
  Download,
  Copy,
  Check,
  FileCode,
  Terminal,
  Settings,
  Layers,
  Sparkles,
  Info,
  Archive,
  RefreshCw,
  Eye,
  Sliders,
  Grid,
  Monitor,
  Cpu,
  HelpCircle,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Tag,
  Music,
  Volume2,
  Radio,
  BookOpen
} from "lucide-react";
import JSZip from "jszip";
import {
  PROJECT_FILES,
  MAIN_GO_CONTENT,
  CONVERTER_GO_CONTENT,
  SPRITESHEET_GO_CONTENT,
  METADATA_INJECTOR_GO_CONTENT,
  BUILD_INSTRUCTIONS_CONTENT,
  GO_MOD_CONTENT,
  BUILD_WINDOWS_PS1_CONTENT,
  BUILD_LINUX_SH_CONTENT
} from "./data/sourceCode.ts";
import { generateSampleCharacterFrames, SampleFrame } from "./utils/sampleFrames.ts";

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState<"simulator" | "sourcecode" | "instructions" | "builder">("simulator");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // ZIP Download helper
  const [isZipping, setIsZipping] = useState(false);
  const downloadAllSourceZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("fyne-imagemagick-tools");
      if (folder) {
        folder.file("go.mod", GO_MOD_CONTENT);
        folder.file("main.go", MAIN_GO_CONTENT);
        folder.file("converter.go", CONVERTER_GO_CONTENT);
        folder.file("spritesheet.go", SPRITESHEET_GO_CONTENT);
        folder.file("metadata_injector.go", METADATA_INJECTOR_GO_CONTENT);
        folder.file("build_instructions.txt", BUILD_INSTRUCTIONS_CONTENT);
        folder.file("build_windows.ps1", BUILD_WINDOWS_PS1_CONTENT);
        folder.file("build_linux.sh", BUILD_LINUX_SH_CONTENT);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fyne-imagemagick-tools-source.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold text-lg">
            Go
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">
                Fyne v2 &amp; ImageMagick Studio
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">
                CGo MagickWand
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                100% Tiếng Việt UI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Bộ công cụ Desktop Golang xử lý ảnh hàng loạt, ghép Sprite Sheet &amp; Hướng dẫn đóng gói Standalone
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={downloadAllSourceZip}
            disabled={isZipping}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5" />
            {isZipping ? "Đang nén..." : "Tải Trọn Bộ Code (.ZIP)"}
          </button>
        </div>
      </header>

      {/* Main Tab Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 lg:px-8 flex overflow-x-auto gap-2">
        <button
          onClick={() => setActiveMainTab("simulator")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === "simulator"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Trình Giả Lập Desktop GUI (Fyne v2)</span>
        </button>

        <button
          onClick={() => setActiveMainTab("sourcecode")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === "sourcecode"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Toàn Bộ Mã Nguồn Golang (main.go, converter.go, ...)</span>
        </button>

        <button
          onClick={() => setActiveMainTab("instructions")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === "instructions"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>File `build_instructions.txt` (Chi Tiết)</span>
        </button>

        <button
          onClick={() => setActiveMainTab("builder")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === "builder"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Trình Tạo Lệnh CGO &amp; Bảng DLL Windows</span>
        </button>
      </div>

      {/* Main View Area */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
        {activeMainTab === "simulator" && <SimulatorView />}
        {activeMainTab === "sourcecode" && <SourceCodeView onCopy={handleCopy} copiedId={copiedId} />}
        {activeMainTab === "instructions" && <InstructionsView onCopy={handleCopy} copiedId={copiedId} />}
        {activeMainTab === "builder" && <BuildGeneratorView onCopy={handleCopy} copiedId={copiedId} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-500 px-6 py-4 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>Senior Golang Desktop Developer</span>
          <span>•</span>
          <span>Fyne v2 (v2.5.4)</span>
          <span>•</span>
          <span>gopkg.in/gographics/imagick.v3</span>
        </div>
        <div>
          Kiến trúc Standalone độc lập: Không phụ thuộc vào cài đặt ImageMagick ở máy người dùng cuối.
        </div>
      </footer>
    </div>
  );
}

// =============================================================================
// COMPONENT 1: SIMULATOR VIEW (Trình giả lập ứng dụng Desktop Fyne)
// =============================================================================
function SimulatorView() {
  const [fyneTab, setFyneTab] = useState<"batch" | "sprite" | "metadata" | "audiosync">("batch");
  const [sampleFrames, setSampleFrames] = useState<SampleFrame[]>([]);
  
  // Batch Converter State
  const [batchFiles, setBatchFiles] = useState<SampleFrame[]>([]);
  const [targetFormat, setTargetFormat] = useState<string>("PNG");
  const [quality, setQuality] = useState<number>(90);
  const [outputDir, setOutputDir] = useState<string>("C:\\Users\\GameDev\\Pictures\\Converted");
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [convertProgress, setConvertProgress] = useState<number>(0);
  const [statusLog, setStatusLog] = useState<string>("Sẵn sàng.");
  const [convertedOutputs, setConvertedOutputs] = useState<{ name: string; url: string; size: string; format: string }[]>([]);

  // Sprite Sheet Generator State
  const [spriteFrames, setSpriteFrames] = useState<SampleFrame[]>([]);
  const [columns, setColumns] = useState<number>(4);
  const [rows, setRows] = useState<number>(2);
  const [useMontageAlgo, setUseMontageAlgo] = useState<boolean>(false);
  const [spriteSavePath, setSpriteSavePath] = useState<string>("C:\\Users\\GameDev\\Sprites\\hero_spritesheet.png");
  const [isGeneratingSprite, setIsGeneratingSprite] = useState<boolean>(false);
  const [generatedSpriteUrl, setGeneratedSpriteUrl] = useState<string | null>(null);
  const [spriteMetadata, setSpriteMetadata] = useState<{ width: number; height: number; cellW: number; cellH: number } | null>(null);
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);

  // Metadata Injection State
  const [metaFiles, setMetaFiles] = useState<SampleFrame[]>([]);
  const [metaRows, setMetaRows] = useState<{ id: string; key: string; value: string }[]>([
    { id: "1", key: "Author", value: "PhanKim" },
    { id: "2", key: "Copyright", value: "© 2026 Studio" },
    { id: "3", key: "Description", value: "Artwork Frame 01" },
    { id: "4", key: "Keywords", value: "comic, webtoon, action" },
  ]);
  const [keepOldExif, setKeepOldExif] = useState<boolean>(true);
  const [metaOutputDir, setMetaOutputDir] = useState<string>("C:\\Users\\GameDev\\Pictures\\Metadata_Out");
  const [isInjectingMeta, setIsInjectingMeta] = useState<boolean>(false);
  const [metaProgress, setMetaProgress] = useState<number>(0);
  const [injectedMetaOutputs, setInjectedMetaOutputs] = useState<{ name: string; properties: Record<string, string> }[]>([]);

  // Audio Sync Mapper State
  const [audioFiles, setAudioFiles] = useState<SampleFrame[]>([]);
  const [audioSrc, setAudioSrc] = useState<string>("sfx_sword_slash.mp3");
  const [audioTrigger, setAudioTrigger] = useState<string>("on_scroll_view");
  const [audioDelay, setAudioDelay] = useState<number>(300);
  const [audioVolume, setAudioVolume] = useState<number>(80);
  const [audioLoop, setAudioLoop] = useState<boolean>(false);
  const [audioOutputDir, setAudioOutputDir] = useState<string>("C:\\Users\\GameDev\\Comics\\Audio_Synced_Out");
  const [isInjectingAudio, setIsInjectingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [injectedAudioOutputs, setInjectedAudioOutputs] = useState<{ name: string; json: string }[]>([]);
  const [activeReaderFrameIndex, setActiveReaderFrameIndex] = useState<number>(0);
  const [audioPlayedNotice, setAudioPlayedNotice] = useState<string | null>(null);

  // Live Animation Player State
  const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(false);
  const [animFps, setAnimFps] = useState<number>(8);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const animCanvasRef = useRef<HTMLCanvasElement>(null);
  const animTimerRef = useRef<number | null>(null);

  // Audio Synthesizer Preview Helper
  const playSynthesizedSound = (soundType: string, volume: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime((volume / 100) * 0.35, ctx.currentTime);
      gainNode.connect(ctx.destination);

      if (soundType.includes("sword") || soundType.includes("slash")) {
        // Sword Slash Sound (Filtered noise sweep)
        const bufferSize = ctx.sampleRate * 0.25;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(3200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.22);
        noise.connect(filter);
        filter.connect(gainNode);
        noise.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
      } else if (soundType.includes("bgm")) {
        // Melodic ambient pad chord
        [220, 277.18, 329.63, 440].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          const chordGain = ctx.createGain();
          chordGain.gain.setValueAtTime(0.06, ctx.currentTime);
          chordGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
          osc.connect(chordGain);
          chordGain.connect(gainNode);
          osc.start(ctx.currentTime + idx * 0.05);
          osc.stop(ctx.currentTime + 1.2);
        });
      } else {
        // Magical chime effect
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        osc.connect(gainNode);
        osc.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  };

  // Initialize sample frames on load
  useEffect(() => {
    const frames = generateSampleCharacterFrames();
    setSampleFrames(frames);
    setBatchFiles(frames.slice(0, 4));
    setSpriteFrames(frames);
    setMetaFiles(frames.slice(0, 3));
    setAudioFiles(frames.slice(0, 4));
  }, []);

  // Animation player effect
  useEffect(() => {
    if (!isPlayingAnimation || spriteFrames.length === 0) {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
      return;
    }
    const interval = 1000 / animFps;
    animTimerRef.current = window.setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % spriteFrames.length);
    }, interval);

    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    };
  }, [isPlayingAnimation, animFps, spriteFrames.length]);

  // Handle Batch Conversion simulation
  const handleStartConversion = () => {
    if (batchFiles.length === 0) return;
    setIsConverting(true);
    setConvertProgress(0);
    setConvertedOutputs([]);
    setStatusLog("Đang khởi tạo ImageMagick C-Environment...");

    let index = 0;
    const total = batchFiles.length;
    const interval = setInterval(() => {
      index++;
      const currentFile = batchFiles[index - 1];
      const prog = (index / total) * 100;
      setConvertProgress(prog);
      setStatusLog(`Đang xử lý MagickWand (${index}/${total}): ${currentFile.name} -> .${targetFormat.toLowerCase()}`);

      if (index >= total) {
        clearInterval(interval);
        setIsConverting(false);
        setStatusLog(`Hoàn tất! Đã chuyển đổi thành công ${total}/${total} file ảnh.`);
        // Generate simulated outputs
        const outputs = batchFiles.map((f) => {
          const baseName = f.name.replace(/\.[^/.]+$/, "");
          const ext = targetFormat.toLowerCase();
          return {
            name: `${baseName}.${ext}`,
            url: f.dataUrl,
            size: `${(Math.random() * 4 + 2).toFixed(1)} KB`,
            format: targetFormat
          };
        });
        setConvertedOutputs(outputs);
      }
    }, 400);
  };

  // Handle Sprite Sheet generation
  const handleGenerateSpriteSheet = () => {
    if (spriteFrames.length === 0) return;
    setIsGeneratingSprite(true);
    setStatusLog("Đang tính toán ma trận lưới ô và khởi tạo MagickNewImage (Canvas trong suốt)...");

    setTimeout(() => {
      const cellW = 64;
      const cellH = 64;
      const cols = Math.max(1, columns);
      const calculatedRows = rows > 0 ? rows : Math.ceil(spriteFrames.length / cols);

      const totalW = cols * cellW;
      const totalH = calculatedRows * cellH;

      const canvas = document.createElement("canvas");
      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Transparent background
        ctx.clearRect(0, 0, totalW, totalH);

        // Draw each frame into cell
        let loadedCount = 0;
        spriteFrames.forEach((frame, idx) => {
          if (idx >= cols * calculatedRows) return;
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const posX = col * cellW;
          const posY = row * cellH;

          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, posX, posY, cellW, cellH);
            loadedCount++;
            if (loadedCount === Math.min(spriteFrames.length, cols * calculatedRows)) {
              const dataUrl = canvas.toDataURL("image/png");
              setGeneratedSpriteUrl(dataUrl);
              setSpriteMetadata({ width: totalW, height: totalH, cellW, cellH });
              setIsGeneratingSprite(false);
              setStatusLog(`Hoàn tất! Đã tạo Sprite Sheet ${totalW}x${totalH}px với ${spriteFrames.length} frames.`);
            }
          };
          img.src = frame.dataUrl;
        });
      }
    }, 500);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "batch" | "sprite") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newFrame: SampleFrame = {
          id: `upload-${Date.now()}-${Math.random()}`,
          name: file.name,
          dataUrl,
          width: 64,
          height: 64
        };
        if (target === "batch") {
          setBatchFiles((prev) => [...prev, newFrame]);
        } else {
          setSpriteFrames((prev) => [...prev, newFrame]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-800/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-base">
              Trình Giả Lập Desktop GUI Trực Quan (Fyne v2 Preview)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Bạn có thể tương tác trực tiếp với giao diện 100% tiếng Việt, chọn ảnh, chuyển đổi định dạng và ghép Sprite Sheet ngay tại đây.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setBatchFiles(sampleFrames);
              setSpriteFrames(sampleFrames);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-cyan-300 font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Nạp Lại 8 Frame Mẫu
          </button>
        </div>
      </div>

      {/* Realistic Fyne Desktop Window Frame */}
      <div className="rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Fyne Window Title Bar */}
        <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-400 transition-colors" />
            <span className="ml-2 text-xs font-semibold text-slate-200">
              Trình Xử Lý Ảnh Hàng Loạt &amp; Tạo Sprite Sheet - Fyne v2
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">860 x 640 px • Fyne Theme</span>
        </div>

        {/* Fyne Tab Header */}
        <div className="bg-slate-850 border-b border-slate-750 px-4 flex gap-1 overflow-x-auto">
          <button
            onClick={() => setFyneTab("batch")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              fyneTab === "batch"
                ? "border-blue-500 text-blue-400 bg-slate-800/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Chuyển Đổi Hàng Loạt</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-300">
              {batchFiles.length}
            </span>
          </button>

          <button
            onClick={() => setFyneTab("sprite")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              fyneTab === "sprite"
                ? "border-blue-500 text-blue-400 bg-slate-800/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Tạo Sprite Sheet</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-300">
              {spriteFrames.length} frames
            </span>
          </button>

          <button
            onClick={() => setFyneTab("metadata")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              fyneTab === "metadata"
                ? "border-blue-500 text-blue-400 bg-slate-800/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <span>Gắn Siêu Dữ Liệu (EXIF)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800">
              {metaFiles.length}
            </span>
          </button>

          <button
            onClick={() => setFyneTab("audiosync")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              fyneTab === "audiosync"
                ? "border-blue-500 text-blue-400 bg-slate-800/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Music className="w-3.5 h-3.5 text-teal-400" />
            <span>Liên Kết Âm Thanh (Webtoon)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-teal-950 text-teal-300 border border-teal-800">
              {audioFiles.length}
            </span>
          </button>
        </div>

        {/* Fyne Window Body */}
        <div className="p-4 sm:p-6 bg-slate-900/95 min-h-[500px]">
          {/* TAB 1: BATCH CONVERTER */}
          {fyneTab === "batch" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Configuration Panel */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-base">
                    Bộ Chuyển Đổi Định Dạng Ảnh Hàng Loạt (Batch Converter)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Chuyển đổi đồng thời nhiều ảnh sang định dạng mong muốn với hiệu năng cao bằng C-Bindings ImageMagick.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-200">
                      Chọn file ảnh nguồn:
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Chọn Nhiều File...</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "batch")}
                        />
                      </label>
                      <label className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow">
                        <Archive className="w-3.5 h-3.5" />
                        <span>Nạp Cả Thư Mục...</span>
                        <input
                          type="file"
                          multiple
                          {...({ webkitdirectory: "" } as any)}
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "batch")}
                        />
                      </label>
                      <button
                        onClick={() => setBatchFiles([])}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-red-900/50 hover:text-red-300 text-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa hết</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    Đã nạp: <span className="font-semibold text-cyan-400">{batchFiles.length} file</span>
                  </div>
                </div>

                {/* Target Format & Quality Form */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        Định dạng xuất ra (MagickSetImageFormat):
                      </label>
                      <select
                        value={targetFormat}
                        onChange={(e) => setTargetFormat(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="PNG">PNG (Hỗ trợ Alpha / Trong suốt)</option>
                        <option value="JPG">JPG / JPEG (Tự làm phẳng Alpha)</option>
                        <option value="WEBP">WEBP (Nén dung lượng cực nhẹ)</option>
                        <option value="AVIF">AVIF (Thế hệ mới tối ưu)</option>
                        <option value="BMP">BMP (Bitmap tiêu chuẩn)</option>
                        <option value="TIFF">TIFF (Chất lượng không nén)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-slate-200">
                          Chất lượng nén:
                        </label>
                        <span className="text-xs font-mono font-bold text-cyan-400">{quality}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                      Thư mục lưu kết quả:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={outputDir}
                        onChange={(e) => setOutputDir(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => {
                          const p = prompt("Nhập đường dẫn thư mục lưu:", outputDir);
                          if (p) setOutputDir(p);
                        }}
                        className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Duyệt...</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Convert Button & Progress */}
                <div className="space-y-3 pt-1">
                  <button
                    onClick={handleStartConversion}
                    disabled={isConverting || batchFiles.length === 0}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isConverting ? "Đang Chuyển Đổi Bằng CGo..." : "Bắt Đầu Chuyển Đổi Hàng Loạt"}</span>
                  </button>

                  {/* Fyne Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                        style={{ width: `${convertProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{statusLog}</span>
                      <span>{Math.round(convertProgress)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right File List & Output Preview */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      Danh Sách File ({batchFiles.length}):
                    </h4>
                    <span className="text-[11px] text-slate-400">Nhấp để xem trước</span>
                  </div>

                  {batchFiles.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                      <ImageIcon className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
                      <p className="text-xs">Chưa có ảnh nào được nạp</p>
                      <button
                        onClick={() => setBatchFiles(sampleFrames)}
                        className="mt-3 text-xs text-cyan-400 hover:underline cursor-pointer"
                      >
                        Nạp các frame mẫu ngay
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
                      {batchFiles.map((file, idx) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-750 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                              <img src={file.dataUrl} alt={file.name} className="w-7 h-7 object-contain" />
                            </div>
                            <span className="font-mono text-slate-300 truncate text-[11px]">
                              {idx + 1}. {file.name}
                            </span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                            64x64
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Converted Results Box */}
                  {convertedOutputs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Kết quả chuyển đổi ({convertedOutputs.length}):
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {convertedOutputs.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-1.5 rounded bg-emerald-950/20 border border-emerald-900/30 text-[11px]"
                          >
                            <span className="text-emerald-300 font-mono truncate">{item.name}</span>
                            <span className="text-slate-400 text-[10px]">{item.size}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPRITE SHEET GENERATOR */}
          {fyneTab === "sprite" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Config */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-base">
                    Trình Ghép Sprite Sheet Hoạt Họa (MagickWand Montage)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Ghép chuỗi ảnh frame chuyển động thành một Sprite Sheet dạng lưới với nền trong suốt (Alpha = 0).
                  </p>
                </div>

                {/* Frames selector */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200">
                      Chuỗi các Frame ({spriteFrames.length} ảnh):
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Chọn Nhiều Frame...</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "sprite")}
                        />
                      </label>
                      <label className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Nạp Cả Thư Mục...</span>
                        <input
                          type="file"
                          multiple
                          {...({ webkitdirectory: "" } as any)}
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "sprite")}
                        />
                      </label>
                      <button
                        onClick={() => setSpriteFrames([])}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-red-900/50 hover:text-red-300 text-slate-300 text-xs font-medium cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* Frame Thumbnails list */}
                  <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
                    {spriteFrames.map((f, i) => (
                      <div
                        key={f.id}
                        className="relative group shrink-0 w-14 h-14 rounded-lg bg-slate-950 border border-slate-700 p-1 flex flex-col items-center justify-center"
                      >
                        <img src={f.dataUrl} alt={f.name} className="w-10 h-10 object-contain" />
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-cyan-400 bg-slate-900/90 px-1 rounded">
                          #{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid Form */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200">
                    Cấu Hình Kích Thước Lưới (Grid Dimensions):
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Số Cột (Columns):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="32"
                        value={columns}
                        onChange={(e) => setColumns(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Số Dòng (Rows):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="32"
                        value={rows}
                        onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="algoToggle"
                      checked={useMontageAlgo}
                      onChange={(e) => setUseMontageAlgo(e.target.checked)}
                      className="rounded accent-cyan-500 cursor-pointer"
                    />
                    <label htmlFor="algoToggle" className="text-xs text-slate-300 cursor-pointer">
                      Sử dụng MagickMontageImage API (Mặc định: Ghép Lưới Pixel-Perfect Canvas)
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Đường dẫn lưu file Sprite Sheet (.png):
                    </label>
                    <input
                      type="text"
                      value={spriteSavePath}
                      onChange={(e) => setSpriteSavePath(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateSpriteSheet}
                  disabled={isGeneratingSprite || spriteFrames.length === 0}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Grid className="w-4 h-4" />
                  <span>{isGeneratingSprite ? "Đang xử lý MagickWand Montage..." : "Tạo Sprite Sheet Trong Suốt"}</span>
                </button>
              </div>

              {/* Right Sprite Sheet Result & Live Animation Preview */}
              <div className="lg:col-span-6 space-y-4">
                {/* Result Preview Box */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-teal-400" />
                      Xem Trước Sprite Sheet (Transparent Background):
                    </h4>
                    {generatedSpriteUrl && (
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showGridOverlay}
                            onChange={(e) => setShowGridOverlay(e.target.checked)}
                            className="rounded accent-cyan-500"
                          />
                          <span>Hiện lưới ô</span>
                        </label>
                        <a
                          href={generatedSpriteUrl}
                          download="spritesheet.png"
                          className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Tải PNG</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Checkerboard container for transparency */}
                  <div className="relative min-h-[220px] rounded-lg border border-slate-700 overflow-hidden flex items-center justify-center p-4 bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:16px_16px] bg-[#0f172a]">
                    {generatedSpriteUrl ? (
                      <div className="relative inline-block border border-cyan-500/50 shadow-2xl">
                        <img
                          src={generatedSpriteUrl}
                          alt="Sprite Sheet"
                          className="max-h-[260px] object-contain image-rendering-pixelated"
                        />
                        {showGridOverlay && spriteMetadata && (
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              backgroundImage: `linear-gradient(to right, rgba(6,182,212,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.4) 1px, transparent 1px)`,
                              backgroundSize: `${(100 / columns).toFixed(4)}% ${(100 / (rows || Math.ceil(spriteFrames.length / columns))).toFixed(4)}%`,
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 p-6">
                        <Grid className="w-10 h-10 mx-auto mb-2 text-slate-600 stroke-1" />
                        <p className="text-xs">Chưa tạo Sprite Sheet</p>
                        <button
                          onClick={handleGenerateSpriteSheet}
                          className="mt-2 text-xs text-teal-400 hover:underline cursor-pointer"
                        >
                          Bấm "Tạo Sprite Sheet" để xem kết quả
                        </button>
                      </div>
                    )}
                  </div>

                  {spriteMetadata && (
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                      <span>Kích thước: {spriteMetadata.width} x {spriteMetadata.height} px</span>
                      <span>Ô lưới: {columns} cột x {rows} dòng ({spriteMetadata.cellW}x{spriteMetadata.cellH} px/cell)</span>
                    </div>
                  )}
                </div>

                {/* Live Animation Player (Bonus Feature for Game Devs) */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-cyan-400" />
                      Trình Phát Hoạt Họa Trực Tiếp (Sprite Animator):
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-cyan-400 font-mono font-semibold">{animFps} FPS</span>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={animFps}
                        onChange={(e) => setAnimFps(Number(e.target.value))}
                        className="w-20 accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg border border-slate-700 flex items-center justify-center p-1 bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:12px_12px] bg-[#0f172a] shrink-0">
                      {spriteFrames[currentFrameIndex] ? (
                        <img
                          src={spriteFrames[currentFrameIndex].dataUrl}
                          alt="Anim Frame"
                          className="w-16 h-16 object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-500">Trống</span>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsPlayingAnimation(!isPlayingAnimation)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isPlayingAnimation
                              ? "bg-amber-600 hover:bg-amber-500 text-white"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white"
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isPlayingAnimation ? "Tạm Dừng" : "Phát Hoạt Họa"}</span>
                        </button>
                        <span className="text-xs text-slate-400 font-mono">
                          Frame: {currentFrameIndex + 1} / {spriteFrames.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Kiểm tra độ mượt mà khi chạy từng frame theo chu kỳ thời gian thực trước khi đưa vào game engine (Unity, Godot, Unreal, Raylib).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM METADATA / EXIF INJECTION */}
          {fyneTab === "metadata" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Config Panel */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-400" />
                    Gắn Siêu Dữ Liệu Tùy Chỉnh (Custom Metadata / EXIF Injection)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Nhúng các trường thông tin bản quyền, tác giả, ghi chú vào bên trong cấu trúc header ảnh mà KHÔNG làm thay đổi chất lượng điểm ảnh.
                  </p>
                </div>

                {/* File picker */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-200">
                      Chọn file ảnh nguồn:
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Chọn Nhiều File...</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "batch")}
                        />
                      </label>
                      <button
                        onClick={() => setMetaFiles([])}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-red-900/50 hover:text-red-300 text-slate-300 text-xs font-medium cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    Đã nạp: <span className="font-semibold text-indigo-400">{metaFiles.length} file</span>
                  </div>
                </div>

                {/* Key-Value Table */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200">
                      Bảng Nhập Key - Value Siêu Dữ Liệu:
                    </h4>
                    <button
                      onClick={() =>
                        setMetaRows((prev) => [
                          ...prev,
                          { id: `${Date.now()}`, key: "", value: "" },
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm Dòng</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {metaRows.map((row, idx) => (
                      <div key={row.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Key (vd: Author, Copyright)"
                          value={row.key}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMetaRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, key: val } : r))
                            );
                          }}
                          className="w-5/12 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Value (vd: PhanKim, © 2026)"
                          value={row.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMetaRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, value: val } : r))
                            );
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (metaRows.length > 1) {
                              setMetaRows((prev) => prev.filter((_, i) => i !== idx));
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Overwrite mode */}
                  <div className="pt-2 border-t border-slate-700/60 space-y-1.5 text-xs">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Tùy chọn xử lý EXIF gốc:
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="radio"
                          name="exifMode"
                          checked={keepOldExif}
                          onChange={() => setKeepOldExif(true)}
                          className="accent-indigo-500 cursor-pointer"
                        />
                        <span>Giữ lại EXIF cũ (Chỉ chèn thêm trường mới)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="radio"
                          name="exifMode"
                          checked={!keepOldExif}
                          onChange={() => setKeepOldExif(false)}
                          className="accent-indigo-500 cursor-pointer"
                        />
                        <span>Ghi đè hoàn toàn (Xóa sạch profile cũ)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Destination folder */}
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1.5">
                  <label className="font-semibold text-slate-300">Thư mục lưu:</label>
                  <input
                    type="text"
                    value={metaOutputDir}
                    onChange={(e) => setMetaOutputDir(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-300 text-xs"
                  />
                </div>

                {/* Execute button */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (metaFiles.length === 0) return;
                      setIsInjectingMeta(true);
                      setMetaProgress(0);
                      const validMap: Record<string, string> = {};
                      metaRows.forEach((r) => {
                        if (r.key.trim()) validMap[r.key.trim()] = r.value;
                      });

                      let cur = 0;
                      const interval = setInterval(() => {
                        cur++;
                        const prog = (cur / metaFiles.length) * 100;
                        setMetaProgress(prog);
                        if (cur >= metaFiles.length) {
                          clearInterval(interval);
                          setIsInjectingMeta(false);
                          const outputs = metaFiles.map((f) => ({
                            name: f.name,
                            properties: { ...validMap, "magick:mode": keepOldExif ? "merged" : "stripped" },
                          }));
                          setInjectedMetaOutputs(outputs);
                        }
                      }, 300);
                    }}
                    disabled={isInjectingMeta || metaFiles.length === 0}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                  >
                    <Tag className="w-4 h-4" />
                    <span>{isInjectingMeta ? "Đang gọi MagickSetImageProperty..." : "Gắn Metadata Hàng Loạt"}</span>
                  </button>

                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${metaProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Panel: Embedded Metadata Inspector */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    Trình Soi Siêu Dữ Liệu (Embedded Metadata Inspector):
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Mô phỏng dữ liệu EXIF/Property nhúng vĩnh viễn trong file ảnh:
                  </p>

                  <div className="space-y-2">
                    {metaFiles.map((f, i) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-lg bg-slate-900/90 border border-slate-750 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-cyan-300 font-semibold">{f.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                            Header OK
                          </span>
                        </div>
                        <div className="space-y-1 pt-1 border-t border-slate-800 text-[11px] font-mono">
                          {metaRows.map((r, idx) => (
                            <div key={idx} className="flex justify-between text-slate-400">
                              <span className="text-slate-500">{r.key || `Field_${idx}`}:</span>
                              <span className="text-slate-200 truncate max-w-[180px]">{r.value || "(trống)"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIO SYNC MAPPER (WEBTOON / COMIC) */}
          {fyneTab === "audiosync" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Config Panel */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Music className="w-4 h-4 text-teal-400" />
                    Trình Liên Kết Âm Thanh (Audio Sync Mapper - Webtoon/Comic)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Gắn kịch bản âm thanh (SFX/BGM) trực tiếp vào metadata từng ảnh truyện tranh. Biến ảnh thành file tự chứa kịch bản để Chrome Extension hoặc App tự phát nhạc khi độc giả cuộn đến.
                  </p>
                </div>

                {/* Audio Script Form */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      File âm thanh (`Audio Source`):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={audioSrc}
                        onChange={(e) => setAudioSrc(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-teal-300 font-mono focus:border-teal-500 focus:outline-none"
                      />
                      <button
                        onClick={() => playSynthesizedSound(audioSrc, audioVolume)}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                        title="Nghe thử hiệu ứng âm thanh"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Nghe Thử</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] text-slate-400">Chọn nhanh mẫu:</span>
                      {["sfx_sword_slash.mp3", "bgm_chapter1.ogg", "sfx_magic_spell.wav"].map((name) => (
                        <button
                          key={name}
                          onClick={() => setAudioSrc(name)}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono cursor-pointer"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      Sự kiện kích hoạt (`Trigger Event`):
                    </label>
                    <select
                      value={audioTrigger}
                      onChange={(e) => setAudioTrigger(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white cursor-pointer focus:border-teal-500 focus:outline-none"
                    >
                      <option value="on_scroll_view">on_scroll_view (Phát nhạc ngay khi ảnh cuộn vào tầm mắt)</option>
                      <option value="on_center_screen">on_center_screen (Phát nhạc khi ảnh nằm chính giữa màn hình)</option>
                      <option value="on_click">on_click (Phát nhạc khi người đọc bấm/chạm vào bức ảnh)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Thời điểm trễ (`Delay`):
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={audioDelay}
                          onChange={(e) => setAudioDelay(Number(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-teal-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-400">ms</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-200">Âm lượng (`Volume`):</label>
                        <span className="text-xs font-mono font-bold text-teal-400">{audioVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(Number(e.target.value))}
                        className="w-full accent-teal-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={audioLoop}
                        onChange={(e) => setAudioLoop(e.target.checked)}
                        className="rounded accent-teal-500 cursor-pointer"
                      />
                      <span>Phát lặp vô hạn (`Loop = true` - Dành cho nhạc nền BGM)</span>
                    </label>
                  </div>
                </div>

                {/* JSON Preview Box */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-teal-400" />
                      Khung Xem Trước Kịch Bản (JSON Preview Realtime):
                    </h4>
                    <span className="text-[10px] text-teal-300 font-mono">comic_audio_config</span>
                  </div>

                  <pre className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800 select-text">
{JSON.stringify(
  {
    audio_sync: {
      src: audioSrc,
      trigger: audioTrigger,
      volume: parseFloat((audioVolume / 100).toFixed(2)),
      delay: audioDelay,
      loop: audioLoop,
    },
  },
  null,
  2
)}
                  </pre>
                </div>

                {/* Embed Action */}
                <button
                  onClick={() => {
                    if (audioFiles.length === 0) return;
                    setIsInjectingAudio(true);
                    setAudioProgress(0);

                    let cur = 0;
                    const interval = setInterval(() => {
                      cur++;
                      setAudioProgress((cur / audioFiles.length) * 100);
                      if (cur >= audioFiles.length) {
                        clearInterval(interval);
                        setIsInjectingAudio(false);
                        const outputs = audioFiles.map((f) => ({
                          name: f.name,
                          json: JSON.stringify({
                            audio_sync: {
                              src: audioSrc,
                              trigger: audioTrigger,
                              volume: audioVolume / 100,
                              delay: audioDelay,
                              loop: audioLoop,
                            },
                          }),
                        }));
                        setInjectedAudioOutputs(outputs);
                      }
                    }, 300);
                  }}
                  disabled={isInjectingAudio || audioFiles.length === 0}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Music className="w-4 h-4" />
                  <span>{isInjectingAudio ? "Đang nhúng chuỗi JSON vào metadata..." : "Nhúng Kịch Bản Âm Thanh Hàng Loạt"}</span>
                </button>
              </div>

              {/* Right Panel: Webtoon Comic Reader Live Simulation */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                      Trình Giả Lập Đọc Webtoon (Comic Reader Live):
                    </h4>
                    <span className="text-[10px] text-teal-400">Extension Simulator</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Mô phỏng trải nghiệm người đọc: Bấm vào tranh hoặc cuộn để kích hoạt âm thanh tự động nhúng trong file ảnh!
                  </p>

                  {/* Comic Reader Frame */}
                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 max-h-[360px] overflow-y-auto space-y-3 shadow-inner">
                    {audioFiles.map((frame, idx) => (
                      <div
                        key={frame.id}
                        onClick={() => {
                          setActiveReaderFrameIndex(idx);
                          playSynthesizedSound(audioSrc, audioVolume);
                          setAudioPlayedNotice(`Đã kích hoạt '${audioSrc}' tại Frame ${idx + 1}!`);
                          setTimeout(() => setAudioPlayedNotice(null), 2500);
                        }}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          activeReaderFrameIndex === idx
                            ? "border-teal-500 bg-teal-950/20"
                            : "border-slate-800 hover:border-slate-700 bg-slate-900/60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 text-[11px]">
                          <span className="font-semibold text-slate-300">Khung Hình #{idx + 1}</span>
                          <span className="text-teal-400 font-mono text-[10px] flex items-center gap-1">
                            <Radio className="w-2.5 h-2.5 animate-pulse" />
                            {audioTrigger}
                          </span>
                        </div>
                        <div className="w-full h-24 rounded bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                          <img src={frame.dataUrl} alt={frame.name} className="h-20 object-contain" />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono truncate">
                          SFX: <span className="text-teal-300">{audioSrc}</span> ({audioDelay}ms)
                        </div>
                      </div>
                    ))}
                  </div>

                  {audioPlayedNotice && (
                    <div className="p-2 rounded-lg bg-teal-950/60 border border-teal-800 text-teal-300 text-xs flex items-center gap-2">
                      <Volume2 className="w-4 h-4 animate-bounce" />
                      <span>{audioPlayedNotice}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENT 2: SOURCE CODE EXPLORER VIEW (Toàn bộ mã nguồn Golang)
// =============================================================================
function SourceCodeView({ onCopy, copiedId }: { onCopy: (text: string, id: string) => void; copiedId: string | null }) {
  const [selectedFileId, setSelectedFileId] = useState<string>("main-go");

  const currentFile = PROJECT_FILES.find((f) => f.id === selectedFileId) || PROJECT_FILES[0];

  const downloadFile = (file: typeof currentFile) => {
    const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-cyan-400" />
            Cấu Trúc Mã Nguồn Golang Chuẩn Mực
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Toàn bộ logic CGo sử dụng thư viện <code className="text-cyan-300 font-mono">gopkg.in/gographics/imagick.v3/imagick</code> với comment tiếng Việt chi tiết.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onCopy(currentFile.content, currentFile.id)}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            {copiedId === currentFile.id ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Đã Sao Chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao Chép File Này</span>
              </>
            )}
          </button>

          <button
            onClick={() => downloadFile(currentFile)}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải File ({currentFile.name})</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left File Tree */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
            Danh Sách Tập Tin Dự Án
          </h3>

          {PROJECT_FILES.map((file) => {
            const isSelected = file.id === selectedFileId;
            return (
              <button
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                  isSelected
                    ? "bg-cyan-950/40 border border-cyan-500/40 text-cyan-300"
                    : "hover:bg-slate-800/60 border border-transparent text-slate-300"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg mt-0.5 ${
                    isSelected ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">{file.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      {file.language}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                    {file.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Code Display */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Code Header */}
          <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400">{currentFile.name}</span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">{currentFile.description}</span>
            </div>
            <button
              onClick={() => onCopy(currentFile.content, currentFile.id)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>

          {/* Code Text Body with Line Numbers */}
          <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[620px] overflow-y-auto leading-relaxed select-text">
            <pre className="grid grid-cols-[auto_1fr] gap-4">
              <div className="text-slate-600 select-none text-right pr-2 border-r border-slate-800">
                {currentFile.content.split("\n").map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <code className="text-slate-200">
                {currentFile.content}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENT 3: INSTRUCTIONS VIEW (build_instructions.txt)
// =============================================================================
function InstructionsView({ onCopy, copiedId }: { onCopy: (text: string, id: string) => void; copiedId: string | null }) {
  const downloadInstructions = () => {
    const blob = new Blob([BUILD_INSTRUCTIONS_CONTENT], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "build_instructions.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Nội Dung Tập Tin `build_instructions.txt`
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cẩm nang đóng gói Standalone dành cho Developer: Linux Static Linking, Windows MSYS2 MinGW &amp; Danh sách DLL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onCopy(BUILD_INSTRUCTIONS_CONTENT, "instructions-raw")}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            {copiedId === "instructions-raw" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Đã Sao Chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao Chép Toàn Bộ</span>
              </>
            )}
          </button>

          <button
            onClick={downloadInstructions}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải `build_instructions.txt`</span>
          </button>
        </div>
      </div>

      {/* Styled Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
            <Cpu className="w-4 h-4" />
            <span>1. Linux Static Linking</span>
          </div>
          <p className="text-xs text-slate-400">
            Biên dịch <code className="text-cyan-300">libMagickWand.a</code> tĩnh hoàn toàn vào ELF binary của Go. Không cần cài ImageMagick trên máy khách.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
            <Terminal className="w-4 h-4" />
            <span>2. Windows MSYS2 MinGW-w64</span>
          </div>
          <p className="text-xs text-slate-400">
            Sử dụng toolchain x86_64 GCC, biên dịch cờ <code className="text-cyan-300">-H=windowsgui -s -w</code> để ẩn cửa sổ console đen và giảm dung lượng.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <Archive className="w-4 h-4" />
            <span>3. Portable DLL Folder</span>
          </div>
          <p className="text-xs text-slate-400">
            Đặt các file DLL phụ thuộc (ImageMagick, OpenMP, Codecs) trong cùng thư mục với file <code className="text-emerald-300">.exe</code> để chạy độc lập 100%.
          </p>
        </div>
      </div>

      {/* Full Plain Text Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="bg-slate-850 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">build_instructions.txt (Raw View)</span>
          <span>UTF-8 • Markdown / Plaintext</span>
        </div>
        <div className="p-5 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[580px] overflow-y-auto leading-relaxed select-text whitespace-pre-wrap">
          {BUILD_INSTRUCTIONS_CONTENT}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENT 4: BUILD GENERATOR VIEW (Bộ tạo lệnh CGo & Checklist DLL)
// =============================================================================
function BuildGeneratorView({ onCopy, copiedId }: { onCopy: (text: string, id: string) => void; copiedId: string | null }) {
  const [targetOs, setTargetOs] = useState<"windows" | "ubuntu" | "arch">("windows");
  const [imVersion, setImVersion] = useState<"im7" | "im6">("im7");
  const [linkMode, setLinkMode] = useState<"portable" | "static">("portable");

  // Generate Shell Commands
  const generateCommands = () => {
    if (targetOs === "windows") {
      return `# =========================================================
# LỆNH BIÊN DỊCH TRÊN WINDOWS (MSYS2 MINGW64 TERMINAL)
# =========================================================

# 1. Mở MSYS2 MINGW64 (C:\\msys64\\mingw64.exe)
# 2. Cài đặt các gói phụ thuộc:
pacman -S --needed \\
  mingw-w64-x86_64-toolchain \\
  mingw-w64-x86_64-imagemagick \\
  mingw-w64-x86_64-pkg-config \\
  mingw-w64-x86_64-go

# 3. Cấu hình biến môi trường CGO:
export CGO_ENABLED=1
export CC=x86_64-w64-mingw32-gcc
export PKG_CONFIG_PATH="/mingw64/lib/pkgconfig"
export CGO_CFLAGS="$(pkg-config --cflags MagickWand)"
export CGO_LDFLAGS="$(pkg-config --libs MagickWand)"

# 4. Biên dịch ứng dụng GUI (ẩn màn hình đen console):
mkdir -p dist
go build -v -ldflags "-H=windowsgui -s -w" -o dist/FyneImageTools.exe .

# 5. Tự động sao chép toàn bộ DLL phụ thuộc vào thư mục dist/:
cp -u /mingw64/bin/libMagick*.dll dist/
cp -u /mingw64/bin/libgomp*.dll dist/
cp -u /mingw64/bin/libwebp*.dll dist/
cp -u /mingw64/bin/libpng*.dll dist/
cp -u /mingw64/bin/libjpeg*.dll dist/
cp -u /mingw64/bin/zlib1.dll dist/
cp -u /mingw64/bin/libwinpthread-1.dll dist/
cp -u /mingw64/bin/libgcc_s_seh-1.dll dist/
cp -u /mingw64/bin/libstdc++-6.dll dist/

echo "Thành công! Thư mục dist/ đã sẵn sàng phân phối độc lập."`;
    }

    if (targetOs === "ubuntu") {
      if (linkMode === "static") {
        return `# =========================================================
# LỆNH BIÊN DỊCH TĨNH (STATIC LINKING) TRÊN UBUNTU / DEBIAN
# =========================================================

# 1. Cài đặt gói công cụ build:
sudo apt-get update
sudo apt-get install -y gcc pkg-config libgl1-mesa-dev xorg-dev libmagickwand-dev

# 2. Xuất biến CGO với thư viện tĩnh .a:
export CGO_ENABLED=1
export PKG_CONFIG_PATH="/usr/lib/pkgconfig:/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH"
export CGO_CFLAGS="$(pkg-config --cflags MagickWand)"

# Liên kết trực tiếp các file .a và phụ thuộc codec:
export CGO_LDFLAGS="-lMagickWand-7.Q16HDRI -lMagickCore-7.Q16HDRI -lpng -ljpeg -lwebp -lz -lm -lgomp -lpthread -ldl"

# 3. Biên dịch binary:
mkdir -p dist
go build -tags osusergo,netgo -ldflags "-s -w" -o dist/FyneImageTools-linux-x64 .

echo "Đã tạo file thực thi: dist/FyneImageTools-linux-x64"`;
      }
      return `# =========================================================
# LỆNH BIÊN DỊCH DYNAMIC TRÊN UBUNTU / DEBIAN
# =========================================================

sudo apt-get update
sudo apt-get install -y gcc pkg-config libgl1-mesa-dev xorg-dev libmagickwand-dev

export CGO_ENABLED=1
export PKG_CONFIG_PATH="/usr/lib/pkgconfig"
export CGO_CFLAGS="$(pkg-config --cflags MagickWand)"
export CGO_LDFLAGS="$(pkg-config --libs MagickWand)"

mkdir -p dist
go build -ldflags "-s -w" -o dist/FyneImageTools-linux-x64 .`;
    }

    // Arch Linux
    return `# =========================================================
# LỆNH BIÊN DỊCH TRÊN ARCH LINUX / MANJARO
# =========================================================

sudo pacman -Syu --needed base-devel imagemagick pkgconf libgl xorg-server-devel

export CGO_ENABLED=1
export PKG_CONFIG_PATH="/usr/lib/pkgconfig"
export CGO_CFLAGS="$(pkg-config --cflags MagickWand)"
export CGO_LDFLAGS="$(pkg-config --libs MagickWand)"

mkdir -p dist
go build -ldflags "-s -w" -o dist/FyneImageTools-arch-x64 .`;
  };

  const currentCommands = generateCommands();

  // Windows DLL Table
  const dllList = [
    { name: "libMagickWand-7.Q16HDRI-*.dll", group: "ImageMagick", req: "Bắt buộc", purpose: "Cung cấp toàn bộ hàm C API MagickWand cho CGo" },
    { name: "libMagickCore-7.Q16HDRI-*.dll", group: "ImageMagick", req: "Bắt buộc", purpose: "Engine lõi thuật toán xử lý ảnh, biến đổi, scale, montage" },
    { name: "libwinpthread-1.dll", group: "MinGW Runtime", req: "Bắt buộc", purpose: "Điều phối đa luồng POSIX Threads trên Windows" },
    { name: "libgcc_s_seh-1.dll", group: "MinGW Runtime", req: "Bắt buộc", purpose: "Xử lý ngoại lệ SEH (Structured Exception Handling)" },
    { name: "libstdc++-6.dll", group: "MinGW Runtime", req: "Bắt buộc", purpose: "Thư viện chuẩn C++ Runtime của MinGW-w64" },
    { name: "libgomp-1.dll", group: "OpenMP", req: "Bắt buộc", purpose: "Xử lý đa luồng song song CPU cho ImageMagick (cực nhanh)" },
    { name: "libpng16-16.dll", group: "Image Codec", req: "Bắt buộc", purpose: "Giải mã và mã hóa định dạng ảnh PNG & Sprite Sheet trong suốt" },
    { name: "libjpeg-8.dll (hoặc turbojpeg)", group: "Image Codec", req: "Bắt buộc", purpose: "Giải mã và nén ảnh định dạng JPEG / JPG" },
    { name: "libwebp-7.dll & libwebpmux-3.dll", group: "Image Codec", req: "Bắt buộc", purpose: "Hỗ trợ định dạng nén thế hệ mới WEBP" },
    { name: "libsharpyuv-0.dll", group: "Image Codec", req: "Bắt buộc", purpose: "Thuật toán xử lý màu sắc RGB sang YUV cho WebP" },
    { name: "libtiff-6.dll", group: "Image Codec", req: "Tùy chọn", purpose: "Đọc và ghi file ảnh TIFF dung lượng cao" },
    { name: "zlib1.dll", group: "Compression", req: "Bắt buộc", purpose: "Giải thuật nén dữ liệu Deflate cho PNG và file header" },
    { name: "liblzma-5.dll & libbz2-1.dll", group: "Compression", req: "Tùy chọn", purpose: "Thuật toán nén nén XZ và Bzip2" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          Trình Tạo Lệnh CGO &amp; Danh Sách DLL Đóng Gói Độc Lập
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Tùy chỉnh hệ điều hành và chế độ liên kết để nhận ngay đoạn mã terminal chính xác để chạy trên máy bạn.
        </p>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Hệ Điều Hành Mục Tiêu:
            </label>
            <select
              value={targetOs}
              onChange={(e) => setTargetOs(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white cursor-pointer"
            >
              <option value="windows">Windows 10/11 (MSYS2 MinGW-w64)</option>
              <option value="ubuntu">Ubuntu / Debian (Linux x86_64)</option>
              <option value="arch">Arch Linux / Manjaro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Phiên Bản ImageMagick:
            </label>
            <select
              value={imVersion}
              onChange={(e) => setImVersion(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white cursor-pointer"
            >
              <option value="im7">ImageMagick 7 (Khuyên Dùng / HDRI)</option>
              <option value="im6">ImageMagick 6 (Legacy)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Kiểu Đóng Gói (Architecture):
            </label>
            <select
              value={linkMode}
              onChange={(e) => setLinkMode(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white cursor-pointer"
            >
              <option value="portable">Portable (Dynamic + Copy DLLs/Lib)</option>
              <option value="static">Static Linking (.a Libraries)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Terminal Command Output Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-850 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-xs font-bold text-slate-200">
              Lệnh Terminal Cho {targetOs.toUpperCase()}
            </span>
          </div>

          <button
            onClick={() => onCopy(currentCommands, "generated-cmds")}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            {copiedId === "generated-cmds" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Đã Sao Chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao Chép Lệnh</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-slate-950 font-mono text-xs text-emerald-400 overflow-x-auto max-h-[380px] overflow-y-auto leading-relaxed select-text whitespace-pre-wrap">
          {currentCommands}
        </div>
      </div>

      {/* Windows DLL Checklist Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-cyan-400" />
              Bảng Danh Sách DLL Bắt Buộc Khi Đóng Gói Trên Windows
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Copy các file này từ <code className="text-cyan-300 font-mono">C:\msys64\mingw64\bin\</code> vào cùng thư mục với file <code className="text-cyan-300 font-mono">FyneImageTools.exe</code>.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-850 text-slate-300 border-b border-slate-800 font-semibold">
                <th className="p-3">Tên File DLL</th>
                <th className="p-3">Phân Nhóm</th>
                <th className="p-3">Mức Độ</th>
                <th className="p-3">Mục Đích &amp; Chức Năng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {dllList.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-bold text-cyan-300">{item.name}</td>
                  <td className="p-3 text-slate-400">{item.group}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium ${
                        item.req === "Bắt buộc"
                          ? "bg-red-500/10 text-red-400 border border-red-500/30"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {item.req}
                    </span>
                  </td>
                  <td className="p-3 font-sans text-slate-300">{item.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
