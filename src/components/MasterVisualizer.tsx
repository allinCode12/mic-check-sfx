import React, { useRef, useEffect, useState } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { Radio, Activity, Volume2, ShieldAlert } from 'lucide-react';

export default function MasterVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    // Periodically check if audio engine is loaded and active
    const checkInterval = setInterval(() => {
      const analyser = audioEngine.getAnalyser();
      if (analyser) {
        setIsActive(true);
        clearInterval(checkInterval);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = audioEngine.getAnalyser();
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationFrameId: number;

    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight || 56;
      }
    };

    // Initialize dimensions and bind observer
    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);

      // Check time-domain data for live oscilloscope waveform
      analyser.getByteTimeDomainData(dataArray);

      // Clean background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle retro digital grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSpacing = 20;

      for (let x = 0; x < canvas.width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y < canvas.height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw reference center line
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Plot actual cyan cyber oscilliscope wave
      ctx.lineWidth = 2.5;
      
      // Dynamic gradient representing audio power (cyan to magenta)
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#06b6d4'); // Cyan
      gradient.addColorStop(0.5, '#d946ef'); // Magenta
      gradient.addColorStop(1, '#06b6d4'); // Cyan
      ctx.strokeStyle = gradient;

      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      // To check if there's active sound being played
      let activeSignalSum = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // range normalized to 0 - 2
        const y = (v * canvas.height) / 2;

        activeSignalSum += Math.abs(dataArray[i] - 128);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Add cool neon outer glow if sound is actually playing
      const signalPower = activeSignalSum / bufferLength;
      if (signalPower > 1.2) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06b6d4';
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
        
        // Render tiny retro green flashing "TRANSMITTING" node
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(canvas.width - 25, 12, 4, 0, 2 * Math.PI);
        ctx.fill();

        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#10b981';
        ctx.fillText('AUDIO SIGNAL PRESENT', canvas.width - 145, 15);
      } else {
        // Draw flat line with tiny random thermal crackle
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        for (let i = 0; i < canvas.width; i += 10) {
          const jitter = (Math.random() - 0.5) * 1.5;
          ctx.lineTo(i, canvas.height / 2 + jitter);
        }
        ctx.stroke();

        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText('SIGNAL IDLE / READY', canvas.width - 125, 15);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [isActive]);

  return (
    <div ref={containerRef} className="relative w-full h-[64px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      
      {/* Visual Overlay Labels */}
      <div className="absolute left-3 top-2.5 flex items-center gap-2 pointer-events-none select-none">
        <div className="flex items-center justify-center w-5 h-5 rounded bg-cyan-950/80 border border-cyan-500/20 text-cyan-400">
          <Activity size={12} className="animate-pulse" />
        </div>
        <div>
          <span className="text-[9px] font-mono font-bold tracking-widest text-[#ececee]/80 block leading-none uppercase">DYNAMIC SPECTRUM</span>
          <span className="text-[8px] font-mono text-slate-500 leading-none">REAL-TIME SIGNAL RATIO</span>
        </div>
      </div>
    </div>
  );
}
