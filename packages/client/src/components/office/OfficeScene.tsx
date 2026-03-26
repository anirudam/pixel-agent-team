import { useEffect, useRef, useCallback, useState } from "react";
import { useAgents } from "../../hooks/useAgentState";
import type { Agent, AgentActivity } from "../../types/events";

const CANVAS_WIDTH = 960;
const WALL_HEIGHT = 96;

// Layout config
const DESK_COLS = 4;
const DESK_X_START = 160;
const DESK_X_SPACING = 200;
const MAIN_ROW_Y_START = 170;
const SUB_ROW_Y_START_OFFSET = 170; // offset from zone divider
const ROW_HEIGHT = 120;
const DESK_PADDING_BOTTOM = 40;

/**
 * Calculate dynamic grid positions based on agent count.
 * Returns positions array and total rows needed.
 */
function calcGridPositions(
  count: number,
  startY: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % DESK_COLS;
    const row = Math.floor(i / DESK_COLS);
    positions.push({
      x: DESK_X_START + col * DESK_X_SPACING,
      y: startY + row * ROW_HEIGHT,
    });
  }
  return positions;
}

function calcRowCount(count: number): number {
  return Math.max(1, Math.ceil(count / DESK_COLS));
}

/**
 * Calculate canvas height and zone divider Y dynamically.
 */
function calcLayout(mainCount: number, subCount: number) {
  const mainRows = calcRowCount(mainCount);
  const mainZoneHeight = mainRows * ROW_HEIGHT;
  const zoneDividerY = WALL_HEIGHT + mainZoneHeight + 20;

  const subRows = calcRowCount(subCount);
  const subZoneHeight = subRows * ROW_HEIGHT;

  const canvasHeight = zoneDividerY + subZoneHeight + DESK_PADDING_BOTTOM;

  return {
    zoneDividerY,
    canvasHeight: Math.max(canvasHeight, 500), // minimum height
    mainPositions: calcGridPositions(Math.max(mainCount, DESK_COLS), MAIN_ROW_Y_START),
    subPositions: calcGridPositions(
      Math.max(subCount, DESK_COLS),
      zoneDividerY + SUB_ROW_Y_START_OFFSET - ROW_HEIGHT
    ),
  };
}


const HAIR_COLORS = [
  "#4A2800",
  "#C0392B",
  "#2C3E50",
  "#8E44AD",
  "#D4AC0D",
  "#1ABC9C",
  "#E67E22",
  "#7F8C8D",
];

const ACTIVITY_COLORS: Record<AgentActivity, string> = {
  idle: "#6B7280",
  typing: "#3B82F6",
  tool_call: "#F59E0B",
  messaging: "#10B981",
};

// ---- Floor (dark wood parquet like Pixel Agents) ----
function drawFloor(ctx: CanvasRenderingContext2D) {
  const PLANK_W = 64; // wide horizontal planks
  const PLANK_H = 16; // thin plank rows
  const floorTop = WALL_HEIGHT;
  const floorH = ctx.canvas.height - WALL_HEIGHT;

  // Dark gray floor base
  ctx.fillStyle = "#4A4A4A";
  ctx.fillRect(0, floorTop, CANVAS_WIDTH, floorH);

  // Brick-pattern tiles (offset every other row by half)
  const rowCount = Math.ceil(floorH / PLANK_H);
  const colCount = Math.ceil(CANVAS_WIDTH / PLANK_W) + 1;
  for (let r = 0; r < rowCount; r++) {
    const y = floorTop + r * PLANK_H;
    const offset = r % 2 === 0 ? 0 : PLANK_W / 2;

    for (let c = -1; c < colCount; c++) {
      const x = c * PLANK_W + offset;
      // Tile gap lines
      ctx.fillStyle = "#3E3E3E";
      ctx.fillRect(x, y, 1, PLANK_H); // vertical gap
      ctx.fillRect(x, y + PLANK_H - 1, PLANK_W, 1); // horizontal gap
    }
  }
}

// ---- Wall ----
function drawWall(ctx: CanvasRenderingContext2D) {
  // Main wall
  ctx.fillStyle = "#4A4A5A";
  ctx.fillRect(0, 0, CANVAS_WIDTH, WALL_HEIGHT);

  // Wall panel pattern
  for (let x = 0; x < CANVAS_WIDTH; x += 64) {
    ctx.fillStyle = "#52526266";
    ctx.fillRect(x + 1, 6, 62, WALL_HEIGHT - 16);
    ctx.fillStyle = "#42424F";
    ctx.fillRect(x, 6, 1, WALL_HEIGHT - 16);
  }

  // Dark top edge
  ctx.fillStyle = "#3A3A4A";
  ctx.fillRect(0, 0, CANVAS_WIDTH, 6);

  // Baseboard trim
  ctx.fillStyle = "#5C3A1E";
  ctx.fillRect(0, WALL_HEIGHT - 8, CANVAS_WIDTH, 8);
  ctx.fillStyle = "#6B4226";
  ctx.fillRect(0, WALL_HEIGHT - 8, CANVAS_WIDTH, 2);
  ctx.fillStyle = "#4A2E16";
  ctx.fillRect(0, WALL_HEIGHT - 1, CANVAS_WIDTH, 1);
}

// ---- Window ----
function drawWindow(ctx: CanvasRenderingContext2D, x: number, frame: number) {
  // Outer frame shadow
  ctx.fillStyle = "#3A2A14";
  ctx.fillRect(x - 50, 10, 100, 62);
  // Frame
  ctx.fillStyle = "#5C3A1E";
  ctx.fillRect(x - 48, 12, 96, 58);
  // Sky
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(x - 44, 16, 88, 50);
  // Sky gradient bottom
  ctx.fillStyle = "#A8E0F0";
  ctx.fillRect(x - 44, 46, 88, 20);

  // Sun
  ctx.fillStyle = "#FFF3B0";
  ctx.fillRect(x + 24, 20, 10, 10);
  ctx.fillStyle = "#FFEB6044";
  ctx.fillRect(x + 22, 18, 14, 14);

  // Clouds (slow drift)
  const cloudOff = (frame * 0.15) % 100;
  ctx.fillStyle = "#FFFFFFCC";
  const cx1 = x - 30 + cloudOff * 0.3;
  ctx.fillRect(cx1, 24, 18, 6);
  ctx.fillRect(cx1 + 2, 20, 12, 4);
  const cx2 = x + 8 - cloudOff * 0.2;
  ctx.fillRect(cx2, 32, 22, 6);
  ctx.fillRect(cx2 + 4, 28, 14, 4);

  // Cross bars
  ctx.fillStyle = "#5C3A1E";
  ctx.fillRect(x - 1, 16, 2, 50);
  ctx.fillRect(x - 44, 40, 88, 2);

  // Window sill
  ctx.fillStyle = "#6B4226";
  ctx.fillRect(x - 52, 66, 104, 6);
  ctx.fillStyle = "#7A4E2E";
  ctx.fillRect(x - 52, 66, 104, 2);
}

// ---- Bookshelf ----
function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Shadow
  ctx.fillStyle = "#3A2A1444";
  ctx.fillRect(x + 2, y + 2, 62, 52);
  // Frame
  ctx.fillStyle = "#5C3A1E";
  ctx.fillRect(x, y, 60, 52);
  // Interior
  ctx.fillStyle = "#3E2510";
  ctx.fillRect(x + 3, y + 3, 54, 46);
  // Shelves
  ctx.fillStyle = "#5C3A1E";
  ctx.fillRect(x + 3, y + 18, 54, 3);
  ctx.fillRect(x + 3, y + 34, 54, 3);

  // Books - top shelf (tall)
  const booksTop = ["#E74C3C", "#3498DB", "#2ECC71", "#F1C40F", "#9B59B6", "#E67E22", "#1ABC9C"];
  for (let i = 0; i < 7; i++) {
    const bw = 5 + (i % 3);
    ctx.fillStyle = booksTop[i];
    ctx.fillRect(x + 4 + i * 7, y + 5, bw, 12);
    // Book spine highlight
    ctx.fillStyle = "#FFFFFF22";
    ctx.fillRect(x + 4 + i * 7, y + 5, 1, 12);
  }
  // Books - middle shelf
  const booksMid = ["#E84393", "#6C5CE7", "#00B894", "#FDCB6E", "#74B9FF"];
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = booksMid[i];
    ctx.fillRect(x + 5 + i * 10, y + 22, 8, 10);
    ctx.fillStyle = "#FFFFFF22";
    ctx.fillRect(x + 5 + i * 10, y + 22, 1, 10);
  }
  // Books - bottom shelf (some leaning)
  const booksBot = ["#D35400", "#2980B9", "#27AE60", "#8E44AD"];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = booksBot[i];
    ctx.fillRect(x + 7 + i * 12, y + 38, 10, 8);
  }
  // Small globe on bottom shelf
  ctx.fillStyle = "#5DADE2";
  ctx.fillRect(x + 46, y + 40, 6, 6);
  ctx.fillStyle = "#2ECC71";
  ctx.fillRect(x + 47, y + 42, 3, 2);
}

// ---- Wall Clock ----
function drawWallClock(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  // Clock shadow
  ctx.fillStyle = "#3A2A1444";
  ctx.beginPath();
  ctx.arc(x + 2, y + 2, 15, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillStyle = "#5C3A1E";
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  // Rim
  ctx.fillStyle = "#6B4226";
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  // Face
  ctx.fillStyle = "#F5F0E1";
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  // Hour marks
  ctx.fillStyle = "#4A3018";
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI * 2) / 12 - Math.PI / 2;
    const r = i % 3 === 0 ? 7 : 8;
    const s = i % 3 === 0 ? 3 : 2;
    ctx.fillRect(x + Math.cos(angle) * r - s / 2, y + Math.sin(angle) * r - s / 2, s, s);
  }
  // Hour hand
  const hourAngle = (frame * 0.0008) % (Math.PI * 2) - Math.PI / 2;
  ctx.strokeStyle = "#4A3018";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(hourAngle) * 5, y + Math.sin(hourAngle) * 5);
  ctx.stroke();
  // Minute hand
  const minAngle = (frame * 0.008) % (Math.PI * 2) - Math.PI / 2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(minAngle) * 8, y + Math.sin(minAngle) * 8);
  ctx.stroke();
  // Center dot
  ctx.fillStyle = "#C0392B";
  ctx.fillRect(x - 1, y - 1, 2, 2);
}

// ---- Potted Plant ----
function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, seed: number) {
  const sway = Math.sin(frame * 0.02 + seed) * 1;

  // Pot
  ctx.fillStyle = "#A0522D";
  ctx.fillRect(x - 10, y, 20, 4);
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(x - 8, y + 4, 16, 14);
  ctx.fillStyle = "#7A3B10";
  ctx.fillRect(x - 6, y + 16, 12, 2);
  // Soil
  ctx.fillStyle = "#3E2723";
  ctx.fillRect(x - 7, y + 4, 14, 3);

  // Stem
  ctx.fillStyle = "#2D5A27";
  ctx.fillRect(x - 1 + sway, y - 14, 3, 18);

  // Leaves (pixel-art style)
  ctx.fillStyle = "#4CAF50";
  ctx.fillRect(x - 10 + sway, y - 18, 8, 8);
  ctx.fillRect(x + 3 + sway, y - 22, 8, 8);
  ctx.fillRect(x - 7 + sway, y - 26, 6, 8);
  ctx.fillRect(x + 2 + sway, y - 28, 6, 8);
  // Leaf highlights
  ctx.fillStyle = "#66BB6A";
  ctx.fillRect(x - 8 + sway, y - 16, 3, 3);
  ctx.fillRect(x + 5 + sway, y - 20, 3, 3);
  ctx.fillRect(x - 5 + sway, y - 24, 2, 3);
  // Dark detail
  ctx.fillStyle = "#388E3C";
  ctx.fillRect(x - 4 + sway, y - 14, 2, 2);
  ctx.fillRect(x + 6 + sway, y - 26, 2, 2);
}

// ---- Tall Plant (large pot) ----
function drawTallPlant(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const sway = Math.sin(frame * 0.015) * 1.5;

  // Large pot
  ctx.fillStyle = "#A0522D";
  ctx.fillRect(x - 14, y, 28, 5);
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(x - 12, y + 5, 24, 20);
  ctx.fillStyle = "#7A3B10";
  ctx.fillRect(x - 10, y + 23, 20, 3);
  ctx.fillStyle = "#3E2723";
  ctx.fillRect(x - 11, y + 5, 22, 4);

  // Trunk
  ctx.fillStyle = "#5D4037";
  ctx.fillRect(x - 2, y - 30, 5, 34);
  ctx.fillStyle = "#4E342E";
  ctx.fillRect(x - 1, y - 30, 1, 34);

  // Large leaf cluster
  ctx.fillStyle = "#2E7D32";
  ctx.fillRect(x - 16 + sway, y - 42, 14, 16);
  ctx.fillRect(x + 3 + sway, y - 46, 14, 16);
  ctx.fillRect(x - 10 + sway, y - 52, 12, 14);
  ctx.fillRect(x + 0 + sway, y - 56, 10, 14);
  ctx.fillStyle = "#43A047";
  ctx.fillRect(x - 14 + sway, y - 40, 10, 10);
  ctx.fillRect(x + 5 + sway, y - 44, 10, 10);
  ctx.fillStyle = "#66BB6A";
  ctx.fillRect(x - 12 + sway, y - 38, 4, 4);
  ctx.fillRect(x + 8 + sway, y - 42, 4, 4);
}

// ---- Boss Desk (larger, darker, premium) ----
function drawBossDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  activity: AgentActivity,
  frame: number
) {
  // === Executive Chair ===
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(x - 20, y + 36, 40, 26);
  // Leather cushion (dark red)
  ctx.fillStyle = "#6B2020";
  ctx.fillRect(x - 18, y + 38, 36, 20);
  ctx.fillStyle = "#7A2828";
  ctx.fillRect(x - 16, y + 39, 32, 8);
  // Headrest
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(x - 14, y + 30, 28, 8);
  ctx.fillStyle = "#6B2020";
  ctx.fillRect(x - 12, y + 31, 24, 5);
  // Armrests
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(x - 22, y + 42, 4, 16);
  ctx.fillRect(x + 18, y + 42, 4, 16);
  // Chair base
  ctx.fillStyle = "#111111";
  ctx.fillRect(x - 16, y + 58, 3, 6);
  ctx.fillRect(x + 13, y + 58, 3, 6);
  ctx.fillRect(x - 2, y + 58, 4, 6);
  // Wheels
  ctx.fillStyle = "#0A0A0A";
  ctx.fillRect(x - 18, y + 62, 5, 3);
  ctx.fillRect(x + 13, y + 62, 5, 3);

  // === Large Desk ===
  ctx.fillStyle = "#00000022";
  ctx.fillRect(x - 52, y + 38, 104, 4);
  // Desk top (wider, darker mahogany)
  ctx.fillStyle = "#4A2A18";
  ctx.fillRect(x - 54, y + 18, 108, 20);
  // Desk top highlight
  ctx.fillStyle = "#5A3420";
  ctx.fillRect(x - 52, y + 19, 104, 5);
  // Gold edge trim
  ctx.fillStyle = "#8B7330";
  ctx.fillRect(x - 54, y + 36, 108, 2);
  // Desk legs (thicker)
  ctx.fillStyle = "#3A1A10";
  ctx.fillRect(x - 52, y + 38, 5, 22);
  ctx.fillRect(x + 47, y + 38, 5, 22);
  // Drawers (both sides)
  ctx.fillStyle = "#3A1A10";
  ctx.fillRect(x - 48, y + 38, 20, 16);
  ctx.fillStyle = "#8B7330";
  ctx.fillRect(x - 42, y + 44, 8, 2);
  ctx.fillRect(x - 42, y + 50, 8, 2);
  ctx.fillStyle = "#3A1A10";
  ctx.fillRect(x + 28, y + 38, 20, 16);
  ctx.fillStyle = "#8B7330";
  ctx.fillRect(x + 34, y + 44, 8, 2);
  ctx.fillRect(x + 34, y + 50, 8, 2);

  // === Large Monitor ===
  ctx.fillStyle = "#2D2D2D";
  ctx.fillRect(x - 3, y + 12, 6, 7);
  ctx.fillRect(x - 12, y + 17, 24, 3);
  // Monitor body (wider)
  ctx.fillStyle = "#2D2D2D";
  ctx.fillRect(x - 24, y - 12, 48, 32);
  // Screen
  ctx.fillStyle = "#1A1A2E";
  ctx.fillRect(x - 22, y - 10, 44, 26);

  // Screen content (same as drawDesk but bigger)
  if (activity === "typing") {
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(x - 22, y - 10, 44, 26);
    ctx.fillStyle = "#334155";
    ctx.fillRect(x - 22, y - 10, 8, 26);
    const colors = ["#60A5FA", "#34D399", "#FBBF24", "#A78BFA", "#F472B6", "#60A5FA", "#818CF8"];
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = colors[i] + "AA";
      const w = 8 + ((frame * 0.8 + i * 5) % 22);
      ctx.fillRect(x - 13, y - 7 + i * 3, w, 2);
    }
    if (Math.floor(frame / 20) % 2 === 0) {
      ctx.fillStyle = "#FFFFFF";
      const cl = Math.floor(frame / 40) % 7;
      const cx2 = 8 + ((frame * 0.8 + cl * 5) % 22);
      ctx.fillRect(x - 13 + cx2, y - 7 + cl * 3, 1, 2);
    }
  } else if (activity === "tool_call") {
    const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
    ctx.fillStyle = "#1A1A2E";
    ctx.fillRect(x - 22, y - 10, 44, 26);
    ctx.fillStyle = `rgba(245, 158, 11, ${pulse * 0.15})`;
    ctx.fillRect(x - 22, y - 10, 44, 26);
    ctx.fillStyle = "#F59E0BAA";
    ctx.fillRect(x - 18, y - 5, 5, 2);
    ctx.fillRect(x - 11, y - 5, 24, 2);
    ctx.fillStyle = "#FFFFFF66";
    ctx.fillRect(x - 18, y, 28, 2);
    ctx.fillRect(x - 18, y + 4, 20, 2);
    ctx.fillRect(x - 18, y + 8, 24, 2);
    const spinChars = ["|", "/", "-", "\\"];
    ctx.fillStyle = "#F59E0B";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText(spinChars[Math.floor(frame / 8) % 4], x - 18, y + 14);
  } else if (activity === "messaging") {
    ctx.fillStyle = "#1A2E1A";
    ctx.fillRect(x - 22, y - 10, 44, 26);
    ctx.fillStyle = "#10B98166";
    ctx.fillRect(x - 16, y - 4, 18, 6);
    ctx.fillRect(x - 4, y + 4, 22, 6);
  } else {
    const dot1x = x - 6 + Math.sin(frame * 0.02) * 10;
    const dot1y = y + 2 + Math.cos(frame * 0.03) * 6;
    ctx.fillStyle = "#6B728044";
    ctx.fillRect(dot1x, dot1y, 3, 3);
    ctx.fillRect(dot1x + 8, dot1y - 4, 2, 2);
  }

  // Desk items
  ctx.fillStyle = "#3A3A3A";
  ctx.fillRect(x - 12, y + 24, 24, 6);
  ctx.fillStyle = "#4A4A4A";
  ctx.fillRect(x - 11, y + 25, 22, 4);
  // Mouse
  ctx.fillStyle = "#3A3A3A";
  ctx.fillRect(x + 20, y + 24, 7, 9);
  ctx.fillStyle = "#4A4A4A";
  ctx.fillRect(x + 21, y + 25, 5, 4);
  // Coffee mug
  ctx.fillStyle = "#F5F5DC";
  ctx.fillRect(x - 44, y + 22, 10, 12);
  ctx.fillStyle = "#6F4E37";
  ctx.fillRect(x - 43, y + 23, 8, 5);
  // Nameplate
  ctx.fillStyle = "#8B7330";
  ctx.fillRect(x - 8, y + 22, 16, 6);
  ctx.fillStyle = "#FFFFFF44";
  ctx.font = "4px monospace";
  ctx.textAlign = "center";
  ctx.fillRect(x - 6, y + 24, 12, 2);
}

// ---- Standard Desk (subagent) ----
function drawDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  activity: AgentActivity,
  frame: number
) {
  // === Chair (behind desk, drawn first) ===
  // Chair back
  ctx.fillStyle = "#2A2A2A";
  ctx.fillRect(x - 16, y + 38, 32, 22);
  ctx.fillStyle = "#3A7D44";
  ctx.fillRect(x - 14, y + 40, 28, 16);
  // Cushion highlight
  ctx.fillStyle = "#4A9D54";
  ctx.fillRect(x - 12, y + 41, 24, 6);
  // Chair armrests
  ctx.fillStyle = "#2A2A2A";
  ctx.fillRect(x - 18, y + 44, 4, 14);
  ctx.fillRect(x + 14, y + 44, 4, 14);
  // Chair legs
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(x - 14, y + 56, 3, 6);
  ctx.fillRect(x + 11, y + 56, 3, 6);
  ctx.fillRect(x - 2, y + 56, 4, 6);
  // Wheels
  ctx.fillStyle = "#111111";
  ctx.fillRect(x - 16, y + 60, 5, 3);
  ctx.fillRect(x + 11, y + 60, 5, 3);

  // === Desk surface ===
  // Desk shadow
  ctx.fillStyle = "#00000022";
  ctx.fillRect(x - 38, y + 38, 76, 4);
  // Desk top
  ctx.fillStyle = "#6B4226";
  ctx.fillRect(x - 40, y + 20, 80, 18);
  // Desk top highlight
  ctx.fillStyle = "#7A4E2E";
  ctx.fillRect(x - 38, y + 21, 76, 4);
  // Desk edge
  ctx.fillStyle = "#5C3A1E";
  ctx.fillRect(x - 40, y + 36, 80, 2);
  // Desk legs
  ctx.fillStyle = "#5C3A1E";
  ctx.fillRect(x - 38, y + 38, 4, 22);
  ctx.fillRect(x + 34, y + 38, 4, 22);
  // Desk drawer
  ctx.fillStyle = "#5A3820";
  ctx.fillRect(x + 16, y + 38, 18, 14);
  ctx.fillStyle = "#7A4E2E";
  ctx.fillRect(x + 22, y + 43, 6, 2);

  // === Monitor ===
  // Stand
  ctx.fillStyle = "#2D2D2D";
  ctx.fillRect(x - 3, y + 14, 6, 7);
  // Stand base
  ctx.fillStyle = "#2D2D2D";
  ctx.fillRect(x - 10, y + 19, 20, 3);

  // Monitor body
  ctx.fillStyle = "#1A1A2E";
  ctx.fillRect(x - 18, y - 8, 36, 24);
  // Bezel
  ctx.fillStyle = "#2D2D2D";
  ctx.fillRect(x - 20, y - 10, 40, 28);
  // Screen
  ctx.fillStyle = "#1A1A2E";
  ctx.fillRect(x - 16, y - 6, 32, 20);

  // Screen content
  if (activity === "typing") {
    // Code editor look
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(x - 16, y - 6, 32, 20);
    // Line numbers gutter
    ctx.fillStyle = "#334155";
    ctx.fillRect(x - 16, y - 6, 6, 20);
    // Code lines with animation
    const colors = ["#60A5FA", "#34D399", "#FBBF24", "#A78BFA", "#F472B6", "#60A5FA"];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = colors[i] + "AA";
      const w = 6 + ((frame * 0.8 + i * 5) % 14);
      ctx.fillRect(x - 9, y - 4 + i * 3, w, 2);
    }
    // Cursor blink
    if (Math.floor(frame / 20) % 2 === 0) {
      ctx.fillStyle = "#FFFFFF";
      const cursorLine = Math.floor(frame / 40) % 6;
      const cursorX = 6 + ((frame * 0.8 + cursorLine * 5) % 14);
      ctx.fillRect(x - 9 + cursorX, y - 4 + cursorLine * 3, 1, 2);
    }
  } else if (activity === "tool_call") {
    // Terminal / tool execution look
    const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
    ctx.fillStyle = "#1A1A2E";
    ctx.fillRect(x - 16, y - 6, 32, 20);
    // Terminal green text
    ctx.fillStyle = `rgba(245, 158, 11, ${pulse * 0.15})`;
    ctx.fillRect(x - 16, y - 6, 32, 20);
    // Command lines
    ctx.fillStyle = "#F59E0BAA";
    ctx.fillRect(x - 14, y - 3, 4, 2); // prompt $
    ctx.fillRect(x - 8, y - 3, 16, 2);
    ctx.fillStyle = "#FFFFFF66";
    ctx.fillRect(x - 14, y + 1, 20, 2);
    ctx.fillRect(x - 14, y + 5, 14, 2);
    // Spinner animation
    const spinChars = ["|", "/", "-", "\\"];
    ctx.fillStyle = "#F59E0B";
    ctx.font = "8px monospace";
    ctx.textAlign = "left";
    ctx.fillText(spinChars[Math.floor(frame / 8) % 4], x - 14, y + 12);
  } else if (activity === "messaging") {
    ctx.fillStyle = "#1A2E1A";
    ctx.fillRect(x - 16, y - 6, 32, 20);
    // Chat bubbles
    ctx.fillStyle = "#10B98166";
    ctx.fillRect(x - 12, y - 2, 14, 5);
    ctx.fillRect(x - 2, y + 5, 16, 5);
    // Dots animation
    const dotPhase = Math.floor(frame / 12) % 4;
    ctx.fillStyle = "#10B981";
    for (let d = 0; d < 3; d++) {
      if (d <= dotPhase) {
        ctx.fillRect(x - 10 + d * 4, y - 1, 2, 2);
      }
    }
  } else {
    // Idle screensaver - bouncing pixel
    const bx = x - 8 + Math.sin(frame * 0.02) * 8;
    const by = y + Math.cos(frame * 0.03) * 6;
    ctx.fillStyle = "#6B728033";
    ctx.fillRect(x - 16, y - 6, 32, 20);
    ctx.fillStyle = "#6B728066";
    ctx.fillRect(bx, by, 4, 4);
    ctx.fillRect(bx + 6, by - 4, 3, 3);
  }

  // Monitor glow effect on desk
  if (activity !== "idle") {
    ctx.fillStyle = ACTIVITY_COLORS[activity] + "15";
    ctx.fillRect(x - 30, y + 14, 60, 8);
  }

  // === Keyboard (on desk) ===
  ctx.fillStyle = "#2A2A2A";
  ctx.fillRect(x - 12, y + 24, 24, 8);
  ctx.fillStyle = "#3A3A3A";
  ctx.fillRect(x - 11, y + 25, 22, 6);
  // Key rows
  ctx.fillStyle = "#4A4A4A";
  for (let kr = 0; kr < 2; kr++) {
    for (let kc = 0; kc < 7; kc++) {
      ctx.fillRect(x - 10 + kc * 3, y + 25 + kr * 3, 2, 2);
    }
  }

  // === Mouse ===
  ctx.fillStyle = "#2A2A2A";
  ctx.fillRect(x + 18, y + 26, 7, 9);
  ctx.fillStyle = "#3A3A3A";
  ctx.fillRect(x + 19, y + 27, 5, 4);
  // Mouse wheel
  ctx.fillStyle = "#555555";
  ctx.fillRect(x + 21, y + 27, 1, 3);

  // === Coffee mug ===
  ctx.fillStyle = "#F5F5DC";
  ctx.fillRect(x - 34, y + 24, 9, 10);
  ctx.fillStyle = "#E8DCC8";
  ctx.fillRect(x - 34, y + 24, 9, 2);
  // Coffee inside
  ctx.fillStyle = "#6F4E37";
  ctx.fillRect(x - 33, y + 26, 7, 4);
  // Handle
  ctx.fillStyle = "#F5F5DC";
  ctx.fillRect(x - 25, y + 26, 3, 6);
  ctx.fillStyle = "#00000000";
  ctx.fillRect(x - 24, y + 28, 1, 2);
  // Steam (when idle or typing)
  if (activity === "idle" || activity === "typing") {
    const steamPhase = frame * 0.05;
    ctx.fillStyle = "#FFFFFF33";
    ctx.fillRect(x - 32 + Math.sin(steamPhase) * 1, y + 20, 2, 3);
    ctx.fillRect(x - 29 + Math.sin(steamPhase + 1) * 1, y + 18, 2, 3);
  }
}

// ---- Character / Agent ----
function drawAgent(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  x: number,
  y: number,
  index: number,
  frame: number
) {
  const activity = agent.activity || "idle";
  const hairColor = HAIR_COLORS[index % HAIR_COLORS.length];
  const shirtColor = ACTIVITY_COLORS[activity];

  // Animation offsets
  const breathe = Math.sin(frame * 0.04 + index * 2) * 1;
  const wiggle = activity === "typing" ? Math.sin(frame * 0.3 + index) * 1.5 : 0;
  const bob =
    activity === "messaging"
      ? Math.sin(frame * 0.1 + index) * 2
      : activity === "tool_call"
        ? Math.sin(frame * 0.06 + index) * 1
        : 0;
  const yOff = activity === "idle" ? breathe : bob;

  const cx = x + wiggle;
  const cy = y + yOff;

  // === Activity indicator dot ===
  if (activity !== "idle") {
    const pulse = Math.sin(frame * 0.1 + index) * 0.5 + 0.5;
    const dotR = 3 + pulse * 2;
    ctx.fillStyle = ACTIVITY_COLORS[activity] + "44";
    ctx.beginPath();
    ctx.arc(cx, cy - 34, dotR + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ACTIVITY_COLORS[activity];
    ctx.beginPath();
    ctx.arc(cx, cy - 34, dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  // === Speech bubble (messaging) ===
  if (activity === "messaging") {
    const bubbleX = cx + 10;
    const bubbleY = cy - 40;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(bubbleX, bubbleY, 24, 14);
    // Bubble tail
    ctx.fillRect(bubbleX + 2, bubbleY + 14, 4, 4);
    ctx.fillRect(bubbleX, bubbleY + 16, 2, 2);
    // Dots inside bubble
    ctx.fillStyle = "#10B981";
    const dp = Math.floor(frame / 15) % 4;
    for (let d = 0; d < 3; d++) {
      ctx.fillStyle = d <= dp ? "#10B981" : "#10B98144";
      ctx.fillRect(bubbleX + 5 + d * 5, bubbleY + 5, 3, 3);
    }
  }

  // === Tool icon (tool_call) ===
  if (activity === "tool_call") {
    const iconX = cx + 10;
    const iconY = cy - 38;
    // Gear/wrench icon
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(iconX, iconY, 3, 10);
    ctx.fillRect(iconX - 2, iconY, 7, 3);
    ctx.fillRect(iconX + 4, iconY + 2, 4, 3);
    ctx.fillStyle = "#F59E0B88";
    // Sparkle
    const sparkle = Math.sin(frame * 0.15) > 0;
    if (sparkle) {
      ctx.fillRect(iconX + 8, iconY - 2, 2, 2);
      ctx.fillRect(iconX - 4, iconY + 4, 2, 2);
    }
  }

  // === Back of head (facing monitor, back to camera) ===
  // Hair covers the whole back of head
  ctx.fillStyle = hairColor;
  ctx.fillRect(cx - 8, cy - 24, 16, 7);
  ctx.fillRect(cx - 9, cy - 22, 18, 5);
  // Hair back (covers where face would be)
  ctx.fillRect(cx - 8, cy - 17, 16, 10);
  // Hair highlight
  ctx.fillStyle = hairColor + "66";
  ctx.fillRect(cx - 6, cy - 24, 4, 2);
  // Hair texture lines
  ctx.fillStyle = hairColor + "44";
  ctx.fillRect(cx - 5, cy - 18, 1, 8);
  ctx.fillRect(cx + 1, cy - 19, 1, 7);
  ctx.fillRect(cx + 5, cy - 17, 1, 6);

  // Ears (visible from behind)
  ctx.fillStyle = "#FFD5A0";
  ctx.fillRect(cx - 10, cy - 16, 3, 5);
  ctx.fillRect(cx + 7, cy - 16, 3, 5);
  // Ear inner
  ctx.fillStyle = "#F0C090";
  ctx.fillRect(cx - 9, cy - 15, 1, 3);
  ctx.fillRect(cx + 8, cy - 15, 1, 3);

  // === Neck (back) ===
  ctx.fillStyle = "#FFD5A0";
  ctx.fillRect(cx - 2, cy - 7, 4, 5);

  // === Body / Shirt ===
  ctx.fillStyle = shirtColor;
  ctx.fillRect(cx - 9, cy - 1, 18, 16);
  // Collar
  ctx.fillStyle = shirtColor;
  ctx.fillRect(cx - 3, cy - 2, 6, 3);
  // Shirt shading
  ctx.fillStyle = "#00000018";
  ctx.fillRect(cx - 9, cy + 8, 18, 7);
  // Shirt highlight
  ctx.fillStyle = "#FFFFFF18";
  ctx.fillRect(cx - 7, cy, 4, 6);

  // === Arms (reaching forward toward desk/keyboard) ===
  ctx.fillStyle = shirtColor;
  if (activity === "typing") {
    const armBob = Math.sin(frame * 0.5 + index) * 1;
    // Arms reaching forward (upward on screen = toward monitor)
    ctx.fillRect(cx - 14, cy - 2, 6, 10);
    ctx.fillRect(cx + 8, cy - 2, 6, 10);
    // Forearms angled forward
    ctx.fillRect(cx - 12, cy - 8, 5, 8);
    ctx.fillRect(cx + 7, cy - 8, 5, 8);
    // Hands on keyboard area
    ctx.fillStyle = "#FFD5A0";
    ctx.fillRect(cx - 11, cy - 10 + armBob, 4, 4);
    ctx.fillRect(cx + 7, cy - 12 - armBob, 4, 4);
  } else if (activity === "tool_call") {
    // Arms forward, one slightly raised
    ctx.fillRect(cx - 14, cy - 2, 6, 10);
    ctx.fillRect(cx + 8, cy - 2, 6, 10);
    ctx.fillRect(cx - 12, cy - 8, 5, 8);
    ctx.fillRect(cx + 7, cy - 10, 5, 10);
    ctx.fillStyle = "#FFD5A0";
    ctx.fillRect(cx - 11, cy - 10, 4, 4);
    ctx.fillRect(cx + 7, cy - 12, 4, 4);
  } else {
    // Arms resting on sides but slightly forward
    ctx.fillRect(cx - 14, cy - 1, 6, 12);
    ctx.fillRect(cx + 8, cy - 1, 6, 12);
    // Hands resting on desk edge
    ctx.fillStyle = "#FFD5A0";
    ctx.fillRect(cx - 12, cy - 4, 4, 4);
    ctx.fillRect(cx + 8, cy - 4, 4, 4);
  }

  // === Name label (pill shape) ===
  const nameText = agent.name.length > 12 ? agent.name.slice(0, 11) + "." : agent.name;
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  const nameW = ctx.measureText(nameText).width + 10;
  // Pill background
  ctx.fillStyle = "#000000AA";
  const pillX = x - nameW / 2;
  const pillY = y + 22;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, nameW, 14, 4);
  ctx.fill();
  // Name text
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(nameText, x, y + 33);

  // === Status badge ===
  const statusText = activity === "tool_call" ? "TOOL" : activity.toUpperCase();
  ctx.font = "bold 7px monospace";
  const statusW = ctx.measureText(statusText).width + 8;
  ctx.fillStyle = ACTIVITY_COLORS[activity];
  ctx.beginPath();
  ctx.roundRect(x - statusW / 2, y + 37, statusW, 11, 3);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(statusText, x, y + 45);
}

// ---- Meeting Area ----
function drawMeetingArea(ctx: CanvasRenderingContext2D) {
  const baseY = 480;
  const centerX = CANVAS_WIDTH / 2;

  // Rug with pattern
  ctx.fillStyle = "#6B1A3A";
  ctx.fillRect(centerX - 130, baseY - 6, 260, 90);
  ctx.fillStyle = "#8B2252";
  ctx.fillRect(centerX - 126, baseY - 2, 252, 82);
  // Rug border pattern
  ctx.fillStyle = "#A0325E";
  ctx.fillRect(centerX - 120, baseY + 4, 240, 2);
  ctx.fillRect(centerX - 120, baseY + 72, 240, 2);
  // Rug diamond pattern
  ctx.fillStyle = "#C0446E44";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(centerX - 80 + i * 40, baseY + 30, 12, 12);
  }

  // Coffee table
  ctx.fillStyle = "#5C3A1E";
  ctx.fillRect(centerX - 28, baseY + 18, 56, 32);
  ctx.fillStyle = "#6B4226";
  ctx.fillRect(centerX - 26, baseY + 20, 52, 28);
  ctx.fillStyle = "#7A4E2E";
  ctx.fillRect(centerX - 24, baseY + 21, 48, 4);
  // Items on coffee table
  // Magazine/book
  ctx.fillStyle = "#3498DB";
  ctx.fillRect(centerX - 16, baseY + 28, 10, 8);
  ctx.fillStyle = "#2980B9";
  ctx.fillRect(centerX - 16, baseY + 28, 10, 2);
  // Coffee cup
  ctx.fillStyle = "#F5F5F5";
  ctx.fillRect(centerX + 8, baseY + 28, 8, 8);
  ctx.fillStyle = "#6F4E37";
  ctx.fillRect(centerX + 9, baseY + 29, 6, 4);

  // Left sofa
  ctx.fillStyle = "#2E6B38";
  ctx.fillRect(centerX - 120, baseY + 10, 64, 48);
  ctx.fillStyle = "#3A7D44";
  ctx.fillRect(centerX - 118, baseY + 12, 60, 44);
  // Armrests
  ctx.fillStyle = "#2E6B38";
  ctx.fillRect(centerX - 120, baseY + 12, 8, 44);
  // Cushions
  ctx.fillStyle = "#4A9D54";
  ctx.fillRect(centerX - 110, baseY + 16, 26, 36);
  ctx.fillRect(centerX - 82, baseY + 16, 22, 36);
  // Cushion divider
  ctx.fillStyle = "#3A7D44";
  ctx.fillRect(centerX - 84, baseY + 16, 2, 36);
  // Pillow
  ctx.fillStyle = "#E8D5B7";
  ctx.fillRect(centerX - 106, baseY + 20, 10, 10);

  // Right sofa
  ctx.fillStyle = "#2E6B38";
  ctx.fillRect(centerX + 56, baseY + 10, 64, 48);
  ctx.fillStyle = "#3A7D44";
  ctx.fillRect(centerX + 58, baseY + 12, 60, 44);
  ctx.fillStyle = "#2E6B38";
  ctx.fillRect(centerX + 112, baseY + 12, 8, 44);
  ctx.fillStyle = "#4A9D54";
  ctx.fillRect(centerX + 60, baseY + 16, 22, 36);
  ctx.fillRect(centerX + 84, baseY + 16, 26, 36);
  ctx.fillStyle = "#3A7D44";
  ctx.fillRect(centerX + 82, baseY + 16, 2, 36);
  // Pillow
  ctx.fillStyle = "#D5C4A1";
  ctx.fillRect(centerX + 100, baseY + 22, 10, 10);
}

// ---- Trash Bin ----
function drawTrashBin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#555555";
  ctx.fillRect(x - 6, y, 12, 16);
  ctx.fillStyle = "#666666";
  ctx.fillRect(x - 7, y - 2, 14, 4);
  // Lid
  ctx.fillStyle = "#777777";
  ctx.fillRect(x - 8, y - 4, 16, 3);
  // Rim lines
  ctx.fillStyle = "#444444";
  ctx.fillRect(x - 4, y + 3, 1, 10);
  ctx.fillRect(x, y + 3, 1, 10);
  ctx.fillRect(x + 4, y + 3, 1, 10);
}

// ---- Water Cooler ----
function drawWaterCooler(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Stand
  ctx.fillStyle = "#CCCCCC";
  ctx.fillRect(x - 8, y + 10, 16, 20);
  ctx.fillStyle = "#AAAAAA";
  ctx.fillRect(x - 10, y + 28, 20, 3);
  // Water jug
  ctx.fillStyle = "#A8D8EA";
  ctx.fillRect(x - 6, y - 10, 12, 22);
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(x - 4, y - 8, 8, 18);
  // Cap
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x - 4, y - 12, 8, 4);
  // Water level
  ctx.fillStyle = "#5DADE2";
  ctx.fillRect(x - 3, y - 2, 6, 12);
  // Tap
  ctx.fillStyle = "#C0392B";
  ctx.fillRect(x + 5, y + 14, 4, 3);
  // Cup holder
  ctx.fillStyle = "#DDDDDD";
  ctx.fillRect(x - 12, y + 18, 6, 8);
}

// ---- Wall Painting ----
function drawPainting(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number) {
  // Frame
  ctx.fillStyle = "#5C3A1E";
  ctx.fillRect(x - 1, y - 1, 34, 26);
  // Canvas
  const bgColors = ["#2C3E50", "#1A3C34", "#3E1A2E"];
  ctx.fillStyle = bgColors[variant % 3];
  ctx.fillRect(x + 1, y + 1, 30, 22);

  if (variant === 0) {
    // Mountain landscape
    ctx.fillStyle = "#5B7553";
    ctx.fillRect(x + 3, y + 12, 26, 10);
    ctx.fillStyle = "#7A9A6E";
    // Mountain peaks
    ctx.fillRect(x + 8, y + 6, 6, 8);
    ctx.fillRect(x + 16, y + 4, 8, 10);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x + 18, y + 4, 4, 3);
    // Sun
    ctx.fillStyle = "#F1C40F";
    ctx.fillRect(x + 4, y + 4, 4, 4);
  } else if (variant === 1) {
    // Abstract art
    ctx.fillStyle = "#E74C3C";
    ctx.fillRect(x + 4, y + 4, 8, 8);
    ctx.fillStyle = "#3498DB";
    ctx.fillRect(x + 14, y + 8, 10, 10);
    ctx.fillStyle = "#F1C40F";
    ctx.fillRect(x + 8, y + 14, 8, 6);
  } else {
    // Pixel smiley
    ctx.fillStyle = "#F1C40F";
    ctx.fillRect(x + 8, y + 4, 16, 16);
    ctx.fillStyle = "#2C3E50";
    ctx.fillRect(x + 12, y + 8, 3, 3);
    ctx.fillRect(x + 18, y + 8, 3, 3);
    ctx.fillRect(x + 13, y + 14, 6, 2);
  }
}

// ---- All Wall Decorations ----
function drawWallDecorations(ctx: CanvasRenderingContext2D, frame: number) {
  // Bookshelves
  drawBookshelf(ctx, 16, 16);
  drawBookshelf(ctx, CANVAS_WIDTH - 76, 16);

  // Windows
  drawWindow(ctx, CANVAS_WIDTH / 2 - 100, frame);
  drawWindow(ctx, CANVAS_WIDTH / 2 + 100, frame);

  // Wall clock
  drawWallClock(ctx, 260, 40, frame);

  // Paintings (on wall between windows and bookshelves)
  drawPainting(ctx, 160, 20, 0); // between left bookshelf and clock
  drawPainting(ctx, 730, 20, 1); // between right window and right bookshelf
  drawPainting(ctx, CANVAS_WIDTH / 2, 16, 2); // between the two windows

  // Small wall lamp
  ctx.fillStyle = "#DAA520";
  ctx.fillRect(CANVAS_WIDTH / 2 - 2, 32, 4, 8);
  ctx.fillStyle = "#FFF8DC";
  ctx.fillRect(CANVAS_WIDTH / 2 - 6, 26, 12, 8);
  ctx.fillStyle = "#FFEB6044";
  ctx.fillRect(CANVAS_WIDTH / 2 - 10, 22, 20, 16);
}

// ---- Floor Decorations ----
function drawFloorDecorations(ctx: CanvasRenderingContext2D, frame: number) {
  // Plants
  drawPlant(ctx, 40, WALL_HEIGHT + 30, frame, 0);
  drawPlant(ctx, CANVAS_WIDTH - 40, WALL_HEIGHT + 30, frame, 3);
  drawTallPlant(ctx, 780, WALL_HEIGHT + 80, frame);
  drawPlant(ctx, 860, WALL_HEIGHT + 200, frame, 7);

  // Trash bin
  drawTrashBin(ctx, 900, WALL_HEIGHT + 50);

  // Water cooler
  drawWaterCooler(ctx, 40, WALL_HEIGHT + 120);
}

// ---- Main Component ----
function drawAgentConnections(
  ctx: CanvasRenderingContext2D,
  agents: Agent[],
  frame: number,
  layout: ReturnType<typeof calcLayout>
) {
  const mainAgents = agents.filter((a) => !a.parentId);
  const subAgents = agents.filter((a) => !!a.parentId);

  // Build position map
  const posMap = new Map<string, { x: number; y: number }>();
  mainAgents.forEach((agent, index) => {
    const pos = layout.mainPositions[index];
    if (!pos) return;
    posMap.set(agent.id, pos);
    posMap.set(agent.name, pos);
  });
  subAgents.forEach((agent, index) => {
    const pos = layout.subPositions[index];
    if (!pos) return;
    posMap.set(agent.id, pos);
    posMap.set(agent.name, pos);
  });

  subAgents.forEach((agent) => {
    if (!agent.parentId) return;

    const childPos = posMap.get(agent.id) || posMap.get(agent.name);
    if (!childPos) return;

    // Find parent position
    const parentPos = posMap.get(agent.parentId);
    if (!parentPos) return;

    // Animated dash offset
    const dashOffset = (frame * 0.5) % 16;

    // Draw dashed line from parent to child
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -dashOffset;
    ctx.strokeStyle = "#F59E0B88";
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Curved line (bezier) from parent desk to child desk
    const px = parentPos.x;
    const py = parentPos.y + 30;
    const cx = childPos.x;
    const cy = childPos.y + 30;
    const midY = (py + cy) / 2;

    ctx.moveTo(px, py);
    ctx.bezierCurveTo(px, midY, cx, midY, cx, cy);
    ctx.stroke();

    // Arrow at child end
    ctx.setLineDash([]);
    ctx.fillStyle = "#F59E0BAA";
    ctx.beginPath();
    const arrowSize = 5;
    const angle = Math.atan2(cy - midY, cx - cx) || Math.PI / 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx - arrowSize * Math.cos(angle - 0.5),
      cy - arrowSize * Math.sin(angle - 0.5)
    );
    ctx.lineTo(
      cx - arrowSize * Math.cos(angle + 0.5),
      cy - arrowSize * Math.sin(angle + 0.5)
    );
    ctx.closePath();
    ctx.fill();

    // "spawned by" label at midpoint
    const labelX = (px + cx) / 2;
    const labelY = midY - 6;
    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#F59E0B88";
    ctx.fillText("spawned", labelX, labelY);

    ctx.restore();
  });
}

export function OfficeScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const agents = useAgents();
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number; agentName?: string } | null>(null);

  // Mouse hover handler for agent tooltips
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const mainAgents = agents.filter((a: Agent) => !a.parentId);
      const subAgents = agents.filter((a: Agent) => !!a.parentId);
      const layout = calcLayout(mainAgents.length, subAgents.length);

      // Check main agents
      for (let i = 0; i < mainAgents.length; i++) {
        const pos = layout.mainPositions[i];
        if (!pos) continue;
        if (Math.abs(mx - pos.x) < 40 && Math.abs(my - (pos.y + 34)) < 40) {
          const desc = mainAgents[i].description || mainAgents[i].name;
          setTooltip({ text: desc, x: e.clientX - rect.left, y: e.clientY - rect.top - 10, agentName: mainAgents[i].name });
          return;
        }
      }
      // Check sub agents
      for (let i = 0; i < subAgents.length; i++) {
        const pos = layout.subPositions[i];
        if (!pos) continue;
        if (Math.abs(mx - pos.x) < 40 && Math.abs(my - (pos.y + 34)) < 40) {
          const desc = subAgents[i].description || subAgents[i].name;
          setTooltip({ text: desc, x: e.clientX - rect.left, y: e.clientY - rect.top - 10, agentName: subAgents[i].name });
          return;
        }
      }
      setTooltip(null);
    },
    [agents]
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, frame: number) => {
      // Split agents into main (no parentId) and sub (has parentId)
      const mainAgents = agents.filter((a: Agent) => !a.parentId);
      const subAgents = agents.filter((a: Agent) => !!a.parentId);

      // Calculate dynamic layout
      const layout = calcLayout(mainAgents.length, subAgents.length);

      // Resize canvas if needed
      if (canvas.height !== layout.canvasHeight) {
        canvas.height = layout.canvasHeight;
      }

      ctx.clearRect(0, 0, CANVAS_WIDTH, layout.canvasHeight);
      ctx.imageSmoothingEnabled = false;

      // Background layers
      drawWall(ctx);
      drawFloor(ctx);
      drawWallDecorations(ctx, frame);
      drawFloorDecorations(ctx, frame);

      // Collect all drawable items for Y-sorting
      type Drawable = { y: number; draw: () => void };
      const drawables: Drawable[] = [];

      // --- Zone divider line ---
      drawables.push({
        y: layout.zoneDividerY,
        draw: () => {
          ctx.save();
          ctx.setLineDash([8, 6]);
          ctx.strokeStyle = "#FFFFFF18";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(40, layout.zoneDividerY);
          ctx.lineTo(CANVAS_WIDTH - 40, layout.zoneDividerY);
          ctx.stroke();
          ctx.restore();

          ctx.font = "bold 8px monospace";
          ctx.textAlign = "left";
          ctx.fillStyle = "#FFFFFF22";
          ctx.fillText("MAIN AGENTS", 50, WALL_HEIGHT + 14);
          ctx.fillText("SUBAGENTS", 50, layout.zoneDividerY + 14);
        },
      });

      // --- Main agents (top zone - boss desks) ---
      mainAgents.forEach((agent: Agent, index: number) => {
        const pos = layout.mainPositions[index];
        if (!pos) return;
        const activity = agent.activity || "idle";
        drawables.push({
          y: pos.y,
          draw: () => {
            drawBossDesk(ctx, pos.x, pos.y, activity, frame);
            drawAgent(ctx, agent, pos.x, pos.y + 34, index, frame);
          },
        });
      });

      // Empty main desks (fill remaining slots in current rows)
      const mainSlots = calcRowCount(mainAgents.length) * DESK_COLS;
      for (let i = mainAgents.length; i < mainSlots; i++) {
        const pos = layout.mainPositions[i];
        if (!pos) continue;
        drawables.push({
          y: pos.y,
          draw: () => {
            drawBossDesk(ctx, pos.x, pos.y, "idle", frame);
            ctx.fillStyle = "#4A4A4A44";
            ctx.font = "8px monospace";
            ctx.textAlign = "center";
            ctx.fillText("empty", pos.x, pos.y + 72);
          },
        });
      }

      // --- Subagents (bottom zone) ---
      subAgents.forEach((agent: Agent, index: number) => {
        const pos = layout.subPositions[index];
        if (!pos) return;
        const activity = agent.activity || "idle";
        drawables.push({
          y: pos.y,
          draw: () => {
            drawDesk(ctx, pos.x, pos.y, activity, frame);
            drawAgent(ctx, agent, pos.x, pos.y + 34, index + mainAgents.length, frame);
          },
        });
      });

      // Empty sub desks
      const subSlots = calcRowCount(subAgents.length) * DESK_COLS;
      for (let i = subAgents.length; i < subSlots; i++) {
        const pos = layout.subPositions[i];
        if (!pos) continue;
        drawables.push({
          y: pos.y,
          draw: () => {
            drawDesk(ctx, pos.x, pos.y, "idle", frame);
            ctx.fillStyle = "#4A4A4A44";
            ctx.font = "8px monospace";
            ctx.textAlign = "center";
            ctx.fillText("empty", pos.x, pos.y + 72);
          },
        });
      }

      // Sort by Y for depth
      drawables.sort((a, b) => a.y - b.y);
      drawables.forEach((d) => d.draw());

      // Draw parent-child connection lines between agents
      drawAgentConnections(ctx, agents, frame, layout);

      // "No agents" overlay
      if (agents.length === 0) {
        ctx.fillStyle = "#00000077";
        ctx.beginPath();
        ctx.roundRect(CANVAS_WIDTH / 2 - 190, layout.canvasHeight / 2 - 44, 380, 88, 8);
        ctx.fill();

        ctx.fillStyle = "#9CA3AF";
        ctx.font = "14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          "Waiting for Claude Code agents...",
          CANVAS_WIDTH / 2,
          layout.canvasHeight / 2 - 8
        );
        ctx.fillStyle = "#6B7280";
        ctx.font = "11px monospace";
        ctx.fillText(
          'Run "claude" in a terminal to see agents here',
          CANVAS_WIDTH / 2,
          layout.canvasHeight / 2 + 16
        );
      }
    },
    [agents]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      frameRef.current++;
      draw(ctx, canvas, frameRef.current);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={500}
        className="rounded-lg border border-amber-900/30 shadow-2xl shadow-amber-900/10"
        style={{ imageRendering: "pixelated" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-gray-900/95 text-white text-xs font-mono px-3 py-1.5 rounded-md border border-amber-700/40 shadow-lg whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          {tooltip.agentName || tooltip.text}
        </div>
      )}
    </div>
  );
}
