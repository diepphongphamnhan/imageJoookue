// Utility to generate sample pixel-art character animation frames
// with transparent backgrounds for instant testing

export interface SampleFrame {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export function generateSampleCharacterFrames(): SampleFrame[] {
  const frames: SampleFrame[] = [];
  const size = 64; // 64x64 pixel art sprite frame

  const poses = [
    { name: "frame_01_idle.png", label: "01 - Đứng Yên (Idle)", color: "#3B82F6", pose: 0 },
    { name: "frame_02_walk1.png", label: "02 - Bước Đi 1 (Walk 1)", color: "#2563EB", pose: 1 },
    { name: "frame_03_walk2.png", label: "03 - Bước Đi 2 (Walk 2)", color: "#1D4ED8", pose: 2 },
    { name: "frame_04_walk3.png", label: "04 - Bước Đi 3 (Walk 3)", color: "#1E40AF", pose: 3 },
    { name: "frame_05_attack1.png", label: "05 - Chuẩn Bị Chém (Windup)", color: "#EF4444", pose: 4 },
    { name: "frame_06_attack2.png", label: "06 - Tung Nhát Kiếm (Slash)", color: "#DC2626", pose: 5 },
    { name: "frame_07_jump.png", label: "07 - Nhảy Lên (Jump)", color: "#10B981", pose: 6 },
    { name: "frame_08_victory.png", label: "08 - Chiến Thắng (Victory)", color: "#F59E0B", pose: 7 },
  ];

  for (let i = 0; i < poses.length; i++) {
    const item = poses[i];
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    // Background is 100% transparent (no fillRect on background)

    ctx.save();
    // Draw cute pixel warrior with transparent background
    const p = item.pose;

    // Shadow on ground (semi-transparent)
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(32, 58, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body position offsets based on pose
    let bodyY = 32;
    let legOffset = 0;
    let armAngle = 0;
    let swordAngle = 0;

    if (p === 1) { bodyY = 31; legOffset = 4; }
    if (p === 2) { bodyY = 30; legOffset = 0; }
    if (p === 3) { bodyY = 31; legOffset = -4; }
    if (p === 4) { bodyY = 32; armAngle = -45; swordAngle = -60; }
    if (p === 5) { bodyY = 33; armAngle = 60; swordAngle = 45; }
    if (p === 6) { bodyY = 22; legOffset = 2; }
    if (p === 7) { bodyY = 28; armAngle = -90; swordAngle = -90; }

    // Legs
    ctx.fillStyle = "#1E293B";
    // Left leg
    ctx.fillRect(26 - legOffset / 2, bodyY + 14, 5, 12);
    // Right leg
    ctx.fillRect(33 + legOffset / 2, bodyY + 14, 5, 12);

    // Armor Body (Chestplate)
    ctx.fillStyle = item.color;
    ctx.fillRect(24, bodyY, 16, 16);
    // Golden belt / buckle
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(24, bodyY + 12, 16, 3);
    ctx.fillStyle = "#FEF08A";
    ctx.fillRect(30, bodyY + 11, 4, 5);

    // Head / Knight Helmet
    ctx.fillStyle = "#94A3B8";
    ctx.fillRect(24, bodyY - 14, 16, 14);
    // Helmet Visor slit
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(26, bodyY - 8, 12, 3);
    // Visor eyes glow
    ctx.fillStyle = "#38BDF8";
    ctx.fillRect(28, bodyY - 7, 2, 2);
    ctx.fillRect(34, bodyY - 7, 2, 2);

    // Helmet plume/crest
    ctx.fillStyle = item.color;
    ctx.fillRect(30, bodyY - 18, 4, 5);
    ctx.fillRect(28, bodyY - 20, 8, 3);

    // Shield (on left)
    ctx.fillStyle = "#64748B";
    ctx.fillRect(17, bodyY + 2, 6, 12);
    ctx.fillStyle = "#CBD5E1";
    ctx.fillRect(19, bodyY + 4, 2, 8);

    // Sword (on right with pose angle)
    ctx.save();
    ctx.translate(42, bodyY + 6);
    ctx.rotate((armAngle * Math.PI) / 180);
    // Hand
    ctx.fillStyle = "#94A3B8";
    ctx.fillRect(-2, -2, 5, 5);
    // Sword hilt
    ctx.fillStyle = "#D97706";
    ctx.fillRect(2, -1, 4, 3);
    ctx.fillStyle = "#78350F";
    ctx.fillRect(1, 2, 6, 2);
    // Sword blade
    ctx.fillStyle = "#E2E8F0";
    ctx.fillRect(6, -2, 14, 4);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(6, -1, 14, 2);
    // Blade tip
    ctx.beginPath();
    ctx.moveTo(20, -2);
    ctx.lineTo(24, 0);
    ctx.lineTo(20, 2);
    ctx.fillStyle = "#E2E8F0";
    ctx.fill();
    ctx.restore();

    // Slash particle effect for attack 2
    if (p === 5) {
      ctx.strokeStyle = "#FDE047";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(38, 30, 20, -0.2 * Math.PI, 0.4 * Math.PI);
      ctx.stroke();

      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(38, 30, 19, -0.15 * Math.PI, 0.35 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();

    frames.push({
      id: `sample-${i + 1}`,
      name: item.name,
      dataUrl: canvas.toDataURL("image/png"),
      width: size,
      height: size,
    });
  }

  return frames;
}
