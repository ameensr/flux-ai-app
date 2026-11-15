import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

export interface ThreeBoardroomCanvasProps {
  projectName?: string;
  seniorPersonName?: string | string[];
  meetingWith?: string | string[];
  teamMembers?: string[];
  supportEmailsCount?: number;
  newFeaturesCount?: number;
  weekStart?: string;
  weekEnd?: string;
  scrollProgress?: number; // 0.0 to 1.0 from parent scroll track
  isDark?: boolean;
  onSceneReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Checks if the current browser environment can create a valid WebGL context
 */
function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Procedural Texture Generator for Holographic Frosted Glass Screens
 */
function createScreenTexture(
  type: 'executive' | 'velocity' | 'support' | 'team',
  data: {
    projectName: string;
    newFeaturesCount: number;
    supportEmailsCount: number;
    teamCount: number;
    seniorName: string;
    weekRange: string;
  },
  isDark: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background Frosted Panel
  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 768);
  if (isDark) {
    bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
    bgGrad.addColorStop(1, 'rgba(10, 15, 30, 0.92)');
  } else {
    bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.90)');
    bgGrad.addColorStop(1, 'rgba(240, 246, 244, 0.95)');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 768);

  // Subtle border rim
  ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 1010, 754);

  // Subtle Inner Line
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 976, 720);

  const primaryText = isDark ? '#ffffff' : '#0f172a';
  const secondaryText = isDark ? '#94a3b8' : '#475569';
  const accentCyan = '#0284c7';
  const accentPurple = '#7c3aed';
  const accentEmerald = '#10b981';
  const accentCoral = '#f43f5e';

  const safeProjName = String(data?.projectName || 'Executive Briefing').toUpperCase();
  const safeWeek = String(data?.weekRange || 'SPRINT EXECUTIVE OVERVIEW');
  const safeFeatures = Number(data?.newFeaturesCount || 0);
  const safeSupport = Number(data?.supportEmailsCount || 0);
  const safeTeams = Number(data?.teamCount || 8);
  const safeSenior = String(data?.seniorName || 'Executive Lead');

  ctx.font = '700 38px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';

  if (type === 'executive') {
    // Header
    ctx.fillStyle = primaryText;
    ctx.fillText(safeProjName, 50, 90);

    ctx.font = '600 24px -apple-system, sans-serif';
    ctx.fillStyle = secondaryText;
    ctx.fillText(safeWeek, 50, 130);

    // Pill Badge
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fillRect(800, 52, 170, 48);
    ctx.fillStyle = accentCyan;
    ctx.font = '700 20px sans-serif';
    ctx.fillText('LIVE TELEMETRY', 814, 84);

    // Divider
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 160);
    ctx.lineTo(974, 160);
    ctx.stroke();

    // Data Rows
    drawMetricRow(ctx, 220, 'NEW FEATURES RECORDED', `${safeFeatures} Items`, accentCyan, isDark);
    drawMetricRow(ctx, 310, 'SUPPORT INQUIRIES', `${safeSupport} Inquiries`, accentPurple, isDark);
    drawMetricRow(ctx, 400, 'ALLOCATED QA ENGINEERS', `${safeTeams} Engineers`, accentEmerald, isDark);
    drawMetricRow(ctx, 490, 'MEETING FACILITATOR', safeSenior, accentCoral, isDark);

    // Progress bar at bottom
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)';
    ctx.fillRect(50, 620, 924, 28);
    const fillWidth = Math.min(924, Math.max(180, (safeFeatures / (safeFeatures + safeSupport + 1)) * 924));
    const pGrad = ctx.createLinearGradient(50, 620, 974, 620);
    pGrad.addColorStop(0, '#38bdf8');
    pGrad.addColorStop(1, '#a855f7');
    ctx.fillStyle = pGrad;
    ctx.fillRect(50, 620, fillWidth, 28);

    ctx.font = '600 22px sans-serif';
    ctx.fillStyle = secondaryText;
    ctx.fillText('RELEASE READINESS STABILITY INDEX: 98.4%', 50, 690);

  } else if (type === 'velocity') {
    // Sprint Velocity Charts
    ctx.fillStyle = primaryText;
    ctx.fillText('SPRINT VELOCITY & LOAD', 50, 90);
    ctx.font = '600 22px sans-serif';
    ctx.fillStyle = secondaryText;
    ctx.fillText('REAL-TIME QA RESOURCE EFFICIENCY', 50, 130);

    const bars = [
      { label: 'FEATURES', val: safeFeatures, color: '#38bdf8', max: 20 },
      { label: 'SUPPORT', val: safeSupport, color: '#a855f7', max: 20 },
      { label: 'TEAM LOAD', val: safeTeams, color: '#10b981', max: 15 },
      { label: 'VELOCITY', val: safeFeatures + safeSupport, color: '#f59e0b', max: 30 },
    ];

    const chartBottom = 600;
    const maxBarH = 340;
    const barW = 120;
    const spacing = 220;

    bars.forEach((b, i) => {
      const bx = 110 + i * spacing;
      const norm = Math.min(1, Math.max(0.15, b.val / b.max));
      const bh = norm * maxBarH;
      const by = chartBottom - bh;

      // Bar pillar
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, by, barW, bh);

      // Value text
      ctx.font = '800 32px sans-serif';
      ctx.fillStyle = primaryText;
      ctx.fillText(String(b.val), bx + 35, by - 16);

      // Label text
      ctx.font = '700 20px sans-serif';
      ctx.fillStyle = secondaryText;
      ctx.fillText(b.label, bx + 10, chartBottom + 45);
    });

  } else if (type === 'support') {
    // Support Inquiries Screen
    ctx.fillStyle = primaryText;
    ctx.fillText('SUPPORT INQUIRIES', 50, 90);
    ctx.font = '600 22px sans-serif';
    ctx.fillStyle = secondaryText;
    ctx.fillText('LOGGED THIS SPRINT', 50, 130);

    ctx.font = '900 130px -apple-system, sans-serif';
    ctx.fillStyle = accentPurple;
    ctx.fillText(String(safeSupport), 50, 320);

    ctx.font = '700 26px sans-serif';
    ctx.fillStyle = accentEmerald;
    ctx.fillText('● 100% RESOLVED / TRIAGED', 50, 420);

    // Mini sparkline
    ctx.strokeStyle = accentPurple;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(50, 560);
    ctx.lineTo(240, 520);
    ctx.lineTo(440, 580);
    ctx.lineTo(640, 460);
    ctx.lineTo(840, 500);
    ctx.lineTo(950, 430);
    ctx.stroke();

  } else if (type === 'team') {
    // Team Resources Screen
    ctx.fillStyle = primaryText;
    ctx.fillText('TEAM RESOURCE METRICS', 50, 90);
    ctx.font = '600 22px sans-serif';
    ctx.fillStyle = secondaryText;
    ctx.fillText('ACTIVE QA SPRINT ROSTER', 50, 130);

    ctx.font = '900 130px -apple-system, sans-serif';
    ctx.fillStyle = accentCyan;
    ctx.fillText(String(safeTeams), 50, 320);

    ctx.font = '700 26px sans-serif';
    ctx.fillStyle = accentEmerald;
    ctx.fillText('● FULL COVERAGE ASSURED', 50, 420);

    // Chip Badges
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(50, 520, 260, 56);
    ctx.fillStyle = accentCyan;
    ctx.font = '700 22px sans-serif';
    ctx.fillText('REGRESSION PASSED', 68, 556);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fillRect(340, 520, 260, 56);
    ctx.fillStyle = accentEmerald;
    ctx.fillText('E2E TEST 100% OK', 368, 556);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawMetricRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  label: string,
  value: string,
  accentColor: string,
  isDark: boolean
) {
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)';
  ctx.fillRect(50, y, 924, 64);

  // Accent indicator pill
  ctx.fillStyle = accentColor;
  ctx.fillRect(54, y + 14, 8, 36);

  ctx.font = '700 24px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? '#e2e8f0' : '#334155';
  ctx.fillText(label, 80, y + 42);

  ctx.font = '800 28px -apple-system, sans-serif';
  ctx.fillStyle = accentColor;
  ctx.textAlign = 'right';
  ctx.fillText(value, 940, y + 44);
  ctx.textAlign = 'left';
}

/**
 * Procedural Texture Generator for Laptops
 */
function createLaptopScreenTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 160);

    // Glowing Header Bar
    ctx.fillStyle = color;
    ctx.fillRect(12, 12, 232, 16);

    // Mini Code / Graph Lines
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(56, 189, 248, 0.6)';
      ctx.fillRect(16, 40 + i * 18, 60 + (i * 24) % 140, 8);
    }

    // Mini Chart
    ctx.fillStyle = color;
    ctx.fillRect(180, 70, 16, 50);
    ctx.fillRect(202, 50, 16, 70);
    ctx.fillRect(224, 85, 16, 35);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Procedural "AI" Centerpiece Emblem Texture
 */
function createAiEmblemTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Pure White Disc Background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();

    // Subtle Inner Ring
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.2)';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Stylized "A" in warm coral/red gradient
    const grad = ctx.createLinearGradient(120, 120, 260, 380);
    grad.addColorStop(0, '#f43f5e');
    grad.addColorStop(1, '#ea580c');

    ctx.font = '900 240px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillStyle = grad;
    ctx.fillText('A', 110, 340);

    // Stylized "I" in deep charcoal
    ctx.fillStyle = '#1e293b';
    ctx.fillText('I', 300, 340);

    // Glowing Dot on top of "I"
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(335, 155, 24, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates an Architectural Miniature Human Figurine
 */
function createHumanFigurine(options: {
  suitColor: number;
  shirtColor: number;
  hairColor: number;
  skinColor: number;
  isStanding?: boolean;
  gestureArm?: boolean;
}): THREE.Group {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: options.skinColor,
    roughness: 0.65,
    metalness: 0.05,
  });

  const suitMat = new THREE.MeshStandardMaterial({
    color: options.suitColor,
    roughness: 0.75,
    metalness: 0.05,
  });

  const shirtMat = new THREE.MeshStandardMaterial({
    color: options.shirtColor,
    roughness: 0.8,
    metalness: 0.0,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: options.hairColor,
    roughness: 0.9,
    metalness: 0.0,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.85,
  });

  if (options.isStanding) {
    // ── STANDING FIGURE (Height ~ 3.4 units) ──
    const headGeo = new THREE.SphereGeometry(0.32, 24, 24);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 3.1, 0);
    head.castShadow = true;
    group.add(head);

    const hairGeo = new THREE.SphereGeometry(0.34, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 3.14, -0.02);
    group.add(hair);

    const neckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.2, 16);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.set(0, 2.75, 0);
    group.add(neck);

    const torsoGeo = new THREE.CylinderGeometry(0.42, 0.38, 1.1, 16);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.set(0, 2.15, 0);
    torso.castShadow = true;
    group.add(torso);

    const tieGeo = new THREE.BoxGeometry(0.12, 0.45, 0.05);
    const tie = new THREE.Mesh(tieGeo, shirtMat);
    tie.position.set(0, 2.35, 0.38);
    group.add(tie);

    const leftLegGeo = new THREE.CylinderGeometry(0.15, 0.13, 1.45, 14);
    const leftLeg = new THREE.Mesh(leftLegGeo, suitMat);
    leftLeg.position.set(-0.2, 0.85, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLegGeo = new THREE.CylinderGeometry(0.15, 0.13, 1.45, 14);
    const rightLeg = new THREE.Mesh(rightLegGeo, suitMat);
    rightLeg.position.set(0.2, 0.85, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    const shoeGeo = new THREE.BoxGeometry(0.22, 0.14, 0.38);
    const leftShoe = new THREE.Mesh(shoeGeo, darkMat);
    leftShoe.position.set(-0.2, 0.07, 0.08);
    leftShoe.castShadow = true;
    group.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, darkMat);
    rightShoe.position.set(0.2, 0.07, 0.08);
    rightShoe.castShadow = true;
    group.add(rightShoe);

    if (options.gestureArm) {
      const arm1Geo = new THREE.CylinderGeometry(0.12, 0.1, 0.95, 12);
      const arm1 = new THREE.Mesh(arm1Geo, suitMat);
      arm1.position.set(-0.52, 2.2, 0.2);
      arm1.rotation.set(-0.4, 0, -0.6);
      arm1.castShadow = true;
      group.add(arm1);

      const handGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const hand = new THREE.Mesh(handGeo, skinMat);
      hand.position.set(-0.85, 2.45, 0.5);
      group.add(hand);

      const arm2Geo = new THREE.CylinderGeometry(0.12, 0.1, 0.9, 12);
      const arm2 = new THREE.Mesh(arm2Geo, suitMat);
      arm2.position.set(0.48, 1.95, 0);
      arm2.castShadow = true;
      group.add(arm2);
    } else {
      const arm1Geo = new THREE.CylinderGeometry(0.12, 0.1, 0.95, 12);
      const arm1 = new THREE.Mesh(arm1Geo, suitMat);
      arm1.position.set(-0.48, 2.0, 0);
      arm1.castShadow = true;
      group.add(arm1);

      const arm2Geo = new THREE.CylinderGeometry(0.12, 0.1, 0.95, 12);
      const arm2 = new THREE.Mesh(arm2Geo, suitMat);
      arm2.position.set(0.48, 2.0, 0);
      arm2.castShadow = true;
      group.add(arm2);
    }

  } else {
    // ── SEATED FIGURE ──
    const headGeo = new THREE.SphereGeometry(0.30, 24, 24);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 2.45, 0);
    head.castShadow = true;
    group.add(head);

    const hairGeo = new THREE.SphereGeometry(0.32, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 2.48, -0.02);
    group.add(hair);

    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.35, 0.95, 16);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.set(0, 1.68, 0);
    torso.rotation.x = 0.08;
    torso.castShadow = true;
    group.add(torso);

    const patchGeo = new THREE.BoxGeometry(0.14, 0.35, 0.05);
    const patch = new THREE.Mesh(patchGeo, shirtMat);
    patch.position.set(0, 1.85, 0.35);
    group.add(patch);

    const thighGeo = new THREE.CylinderGeometry(0.14, 0.13, 0.8, 14);
    const leftThigh = new THREE.Mesh(thighGeo, suitMat);
    leftThigh.position.set(-0.18, 1.15, 0.35);
    leftThigh.rotation.x = Math.PI / 2;
    leftThigh.castShadow = true;
    group.add(leftThigh);

    const rightThigh = new THREE.Mesh(thighGeo, suitMat);
    rightThigh.position.set(0.18, 1.15, 0.35);
    rightThigh.rotation.x = Math.PI / 2;
    rightThigh.castShadow = true;
    group.add(rightThigh);

    const shinGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.85, 14);
    const leftShin = new THREE.Mesh(shinGeo, suitMat);
    leftShin.position.set(-0.18, 0.65, 0.72);
    leftShin.castShadow = true;
    group.add(leftShin);

    const rightShin = new THREE.Mesh(shinGeo, suitMat);
    rightShin.position.set(0.18, 0.65, 0.72);
    rightShin.castShadow = true;
    group.add(rightShin);

    const shoeGeo = new THREE.BoxGeometry(0.18, 0.12, 0.32);
    const leftShoe = new THREE.Mesh(shoeGeo, darkMat);
    leftShoe.position.set(-0.18, 0.12, 0.82);
    leftShoe.castShadow = true;
    group.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, darkMat);
    rightShoe.position.set(0.18, 0.12, 0.82);
    rightShoe.castShadow = true;
    group.add(rightShoe);

    const armGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.75, 12);
    const leftArm = new THREE.Mesh(armGeo, suitMat);
    leftArm.position.set(-0.42, 1.55, 0.3);
    leftArm.rotation.set(0.7, 0, -0.2);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, suitMat);
    rightArm.position.set(0.42, 1.55, 0.3);
    rightArm.rotation.set(0.7, 0, 0.2);
    rightArm.castShadow = true;
    group.add(rightArm);

    const handGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.28, 1.35, 0.62);
    group.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0.28, 1.35, 0.62);
    group.add(rightHand);
  }

  return group;
}

/**
 * Creates a Cantilever Wireframe Executive Chair
 */
function createCantileverChair(): THREE.Group {
  const chair = new THREE.Group();

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.15,
  });

  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.05,
  });

  const seatGeo = new THREE.BoxGeometry(1.2, 0.12, 1.15);
  const seat = new THREE.Mesh(seatGeo, seatMat);
  seat.position.set(0, 1.15, 0);
  seat.castShadow = true;
  chair.add(seat);

  const backGeo = new THREE.BoxGeometry(1.15, 1.1, 0.12);
  const back = new THREE.Mesh(backGeo, seatMat);
  back.position.set(0, 1.78, -0.52);
  back.rotation.x = -0.12;
  back.castShadow = true;
  chair.add(back);

  const baseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.55, 0.05, 0.55),
    new THREE.Vector3(-0.55, 0.05, -0.55),
    new THREE.Vector3(0.55, 0.05, -0.55),
    new THREE.Vector3(0.55, 0.05, 0.55),
  ]);
  const baseTube = new THREE.TubeGeometry(baseCurve, 24, 0.045, 8, false);
  const baseMesh = new THREE.Mesh(baseTube, chromeMat);
  baseMesh.castShadow = true;
  chair.add(baseMesh);

  const postGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.1, 10);
  const postLeft = new THREE.Mesh(postGeo, chromeMat);
  postLeft.position.set(-0.55, 0.6, -0.55);
  chair.add(postLeft);

  const postRight = new THREE.Mesh(postGeo, chromeMat);
  postRight.position.set(0.55, 0.6, -0.55);
  chair.add(postRight);

  return chair;
}

/**
 * Creates an Open 3D Executive Laptop
 */
function create3DLaptop(accentColor: string): THREE.Group {
  const laptop = new THREE.Group();

  const aluminiumMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.75,
    roughness: 0.25,
  });

  const baseGeo = new THREE.BoxGeometry(1.2, 0.05, 0.85);
  const base = new THREE.Mesh(baseGeo, aluminiumMat);
  base.position.set(0, 0.025, 0);
  base.castShadow = true;
  laptop.add(base);

  const kbGeo = new THREE.BoxGeometry(1.0, 0.015, 0.45);
  const kbMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
  const kb = new THREE.Mesh(kbGeo, kbMat);
  kb.position.set(0, 0.055, -0.1);
  laptop.add(kb);

  const screenGroup = new THREE.Group();
  screenGroup.position.set(0, 0.05, -0.42);
  screenGroup.rotation.x = -1.25;

  const lidGeo = new THREE.BoxGeometry(1.2, 0.82, 0.04);
  const lid = new THREE.Mesh(lidGeo, aluminiumMat);
  lid.position.set(0, 0.41, 0);
  screenGroup.add(lid);

  const screenTex = createLaptopScreenTexture(accentColor);
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const displayGeo = new THREE.PlaneGeometry(1.1, 0.72);
  const display = new THREE.Mesh(displayGeo, screenMat);
  display.position.set(0, 0.41, 0.025);
  screenGroup.add(display);

  laptop.add(screenGroup);
  return laptop;
}

/**
 * Creates a Potted Miniature Bonsai/Plant
 */
function createMiniaturePlant(): THREE.Group {
  const plant = new THREE.Group();

  const potGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.55, 18);
  const potMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.1,
  });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.set(0, 0.28, 0);
  pot.castShadow = true;
  plant.add(pot);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.8,
    metalness: 0.0,
  });

  const f1 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), foliageMat);
  f1.position.set(0, 0.72, 0);
  f1.castShadow = true;
  plant.add(f1);

  const f2 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), foliageMat);
  f2.position.set(0.18, 0.88, 0.08);
  f2.castShadow = true;
  plant.add(f2);

  const f3 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), foliageMat);
  f3.position.set(-0.16, 0.82, -0.06);
  f3.castShadow = true;
  plant.add(f3);

  return plant;
}

/**
 * Main WebGL Three.js Boardroom Canvas Component
 */
export const ThreeBoardroomCanvas: React.FC<ThreeBoardroomCanvasProps> = ({
  projectName,
  seniorPersonName,
  meetingWith,
  teamMembers,
  supportEmailsCount = 0,
  newFeaturesCount = 0,
  weekStart,
  weekEnd,
  scrollProgress = 0,
  isDark = false,
  onSceneReady,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  const dioramaGroupRef = useRef<THREE.Group | null>(null);
  const aiEmblemRef = useRef<THREE.Mesh | null>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  // Safe string & array derivations
  const safeProjectName = useMemo(() => {
    if (typeof projectName === 'string' && projectName.trim()) {
      return projectName.trim();
    }
    return 'Executive Briefing';
  }, [projectName]);

  const resolvedSeniorName = useMemo(() => {
    if (Array.isArray(seniorPersonName) && seniorPersonName.length > 0) {
      return seniorPersonName.filter(Boolean).join(', ');
    }
    if (typeof seniorPersonName === 'string' && seniorPersonName.trim()) {
      return seniorPersonName.trim();
    }
    if (Array.isArray(meetingWith) && meetingWith.length > 0) {
      return meetingWith.filter(Boolean).join(', ');
    }
    if (typeof meetingWith === 'string' && meetingWith.trim()) {
      return meetingWith.trim();
    }
    return 'Sarah Jenkins';
  }, [seniorPersonName, meetingWith]);

  const actualTeamCount = useMemo(() => {
    if (Array.isArray(teamMembers) && teamMembers.length > 0) {
      return teamMembers.length;
    }
    return 8;
  }, [teamMembers]);

  const safeWeekRange = useMemo(() => {
    if (weekStart && weekEnd) {
      return `${weekStart} – ${weekEnd}`;
    }
    return 'Sprint Overview';
  }, [weekStart, weekEnd]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Verify WebGL capability
    if (!isWebGLSupported()) {
      console.warn('[ThreeBoardroomCanvas] WebGL context not supported.');
      onError?.(new Error('WebGL not supported'));
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.OrthographicCamera | null = null;

    try {
      const width = Math.max(container.clientWidth || window.innerWidth || 800, 320);
      const height = Math.max(container.clientHeight || window.innerHeight || 600, 240);

      // 1. Scene Setup
      scene = new THREE.Scene();
      sceneRef.current = scene;

      // 2. Isometric Orthographic Camera
      const aspect = width / height;
      const frustumSize = 36;
      camera = new THREE.OrthographicCamera(
        (-frustumSize * aspect) / 2,
        (frustumSize * aspect) / 2,
        frustumSize / 2,
        -frustumSize / 2,
        -100,
        500
      );
      camera.position.set(42, 34, 42);
      camera.lookAt(0, 1.2, 0);
      cameraRef.current = camera;

      // 3. WebGL Renderer with existing canvas
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = isDark ? 1.15 : 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      rendererRef.current = renderer;

      // 4. Lighting Rig
      const ambientLight = new THREE.AmbientLight(
        isDark ? 0x1e293b : 0xf1f8f5,
        isDark ? 1.2 : 1.6
      );
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 2.0 : 2.4);
      keyLight.position.set(38, 55, 26);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.left = -22;
      keyLight.shadow.camera.right = 22;
      keyLight.shadow.camera.top = 22;
      keyLight.shadow.camera.bottom = -22;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 120;
      keyLight.shadow.bias = -0.0004;
      scene.add(keyLight);

      const skyFill = new THREE.HemisphereLight(
        isDark ? 0x38bdf8 : 0xecfdf5,
        isDark ? 0x090e17 : 0xd1fae5,
        isDark ? 0.6 : 0.8
      );
      scene.add(skyFill);

      // 5. Studio Ground Plane
      const floorGeo = new THREE.PlaneGeometry(160, 160);
      const floorMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x060911 : 0xedf4f1,
        roughness: 0.95,
        metalness: 0.05,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1.2;
      floor.receiveShadow = true;
      scene.add(floor);

      // 6. Diorama Assembly Group
      const diorama = new THREE.Group();
      dioramaGroupRef.current = diorama;
      scene.add(diorama);

      // ── ELEVATED FLOATING PODIUM ISLAND ──
      const pw = 25;
      const pl = 24;
      const pr = 4.2;
      const podiumShape = new THREE.Shape();
      podiumShape.moveTo(-pw / 2 + pr, -pl / 2);
      podiumShape.lineTo(pw / 2 - pr, -pl / 2);
      podiumShape.quadraticCurveTo(pw / 2, -pl / 2, pw / 2, -pl / 2 + pr);
      podiumShape.lineTo(pw / 2, pl / 2 - pr);
      podiumShape.quadraticCurveTo(pw / 2, pl / 2, pw / 2 - pr, pl / 2);
      podiumShape.lineTo(-pw / 2 + pr, pl / 2);
      podiumShape.quadraticCurveTo(-pw / 2, pl / 2, -pw / 2, pl / 2 - pr);
      podiumShape.lineTo(-pw / 2, -pl / 2 + pr);
      podiumShape.quadraticCurveTo(-pw / 2, -pl / 2, -pw / 2 + pr, -pl / 2);

      const podiumGeo = new THREE.ExtrudeGeometry(podiumShape, {
        depth: 1.1,
        bevelEnabled: true,
        bevelSegments: 10,
        steps: 1,
        bevelSize: 0.45,
        bevelThickness: 0.35,
      });
      podiumGeo.center();

      const podiumMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x111c2e : 0xe5eeea,
        roughness: 0.85,
        metalness: 0.08,
      });
      const podium = new THREE.Mesh(podiumGeo, podiumMat);
      podium.rotation.x = Math.PI / 2;
      podium.position.y = -0.55;
      podium.castShadow = true;
      podium.receiveShadow = true;
      diorama.add(podium);

      // Dual Glowing Neon Perimeter Light Guides (Mint & Coral)
      const neonPointsMint = [
        new THREE.Vector3(-13.4, -0.2, 11.5),
        new THREE.Vector3(-13.4, -0.2, -11.5),
        new THREE.Vector3(0, -0.2, -13.4),
        new THREE.Vector3(11.5, -0.2, -13.4),
      ];
      const curveMint = new THREE.CatmullRomCurve3(neonPointsMint);
      const tubeGeoMint = new THREE.TubeGeometry(curveMint, 48, 0.12, 12, false);
      const tubeMatMint = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: new THREE.Color(0x34d399),
        emissiveIntensity: 2.2,
        roughness: 0.2,
      });
      const neonMeshMint = new THREE.Mesh(tubeGeoMint, tubeMatMint);
      diorama.add(neonMeshMint);

      const neonPointsCoral = [
        new THREE.Vector3(13.4, -0.2, -11.5),
        new THREE.Vector3(13.4, -0.2, 11.5),
        new THREE.Vector3(0, -0.2, 13.4),
        new THREE.Vector3(-11.5, -0.2, 13.4),
      ];
      const curveCoral = new THREE.CatmullRomCurve3(neonPointsCoral);
      const tubeGeoCoral = new THREE.TubeGeometry(curveCoral, 48, 0.12, 12, false);
      const tubeMatCoral = new THREE.MeshStandardMaterial({
        color: 0xfb7185,
        emissive: new THREE.Color(0xf43f5e),
        emissiveIntensity: 2.2,
        roughness: 0.2,
      });
      const neonMeshCoral = new THREE.Mesh(tubeGeoCoral, tubeMatCoral);
      diorama.add(neonMeshCoral);

      // ── CONFERENCE TABLE ASSEMBLY ──
      const tw = 14.2;
      const tl = 12.0;
      const tr = 2.4;
      const tableShape = new THREE.Shape();
      tableShape.moveTo(-tw / 2 + tr, -tl / 2);
      tableShape.lineTo(tw / 2 - tr, -tl / 2);
      tableShape.quadraticCurveTo(tw / 2, -tl / 2, tw / 2, -tl / 2 + tr);
      tableShape.lineTo(tw / 2, tl / 2 - tr);
      tableShape.quadraticCurveTo(tw / 2, tl / 2, tw / 2 - tr, tl / 2);
      tableShape.lineTo(-tw / 2 + tr, tl / 2);
      tableShape.quadraticCurveTo(-tw / 2, tl / 2, -tw / 2, tl / 2 - tr);
      tableShape.lineTo(-tw / 2, -tl / 2 + tr);
      tableShape.quadraticCurveTo(-tw / 2, -tl / 2, -tw / 2 + tr, -tl / 2);

      const tableGeo = new THREE.ExtrudeGeometry(tableShape, {
        depth: 0.45,
        bevelEnabled: true,
        bevelSegments: 8,
        steps: 1,
        bevelSize: 0.18,
        bevelThickness: 0.18,
      });
      tableGeo.center();

      const tableMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x182438 : 0xffffff,
        roughness: 0.22,
        metalness: 0.08,
      });
      const table = new THREE.Mesh(tableGeo, tableMat);
      table.rotation.x = Math.PI / 2;
      table.position.y = 1.6;
      table.castShadow = true;
      table.receiveShadow = true;
      diorama.add(table);

      // Central Table Pedestal Base
      const pedestalGeo = new THREE.BoxGeometry(7.5, 1.6, 5.5);
      const pedestalMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x0c1422 : 0xd8e4e0,
        roughness: 0.8,
      });
      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.y = 0.8;
      pedestal.castShadow = true;
      diorama.add(pedestal);

      // ── FLOATING 3D "AI" CENTERPIECE EMBLEM ──
      const emblemGeo = new THREE.CylinderGeometry(1.65, 1.65, 0.24, 48);
      const emblemMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.25,
        metalness: 0.15,
      });
      const emblem = new THREE.Mesh(emblemGeo, emblemMat);
      emblem.position.set(0, 3.4, 0);
      emblem.rotation.x = Math.PI * 0.12;
      emblem.castShadow = true;
      aiEmblemRef.current = emblem;
      diorama.add(emblem);

      // Front AI Face Plate Texture
      const aiTex = createAiEmblemTexture();
      const aiFaceGeo = new THREE.CircleGeometry(1.58, 36);
      const aiFaceMat = new THREE.MeshStandardMaterial({
        map: aiTex,
        roughness: 0.2,
        metalness: 0.05,
      });
      const aiFace = new THREE.Mesh(aiFaceGeo, aiFaceMat);
      aiFace.position.set(0, 0, 0.125);
      emblem.add(aiFace);

      // Soft red-coral point light under the emblem
      const emblemLight = new THREE.PointLight(0xf43f5e, 1.8, 6.5);
      emblemLight.position.set(0, 2.8, 0);
      diorama.add(emblemLight);

      // ── ATTENDEES & CHAIRS SETUP ──
      const accentColors = ['#0284c7', '#7c3aed', '#10b981', '#f43f5e', '#f59e0b', '#d946ef'];

      // Senior Executive Leader (North, Head of table)
      const seniorFig = createHumanFigurine({
        suitColor: 0x1e293b,
        shirtColor: 0xffffff,
        hairColor: 0x1e1b18,
        skinColor: 0xfbbf24,
        isStanding: false,
      });
      seniorFig.position.set(0, 0, -6.9);
      seniorFig.rotation.y = 0;
      diorama.add(seniorFig);

      const seniorChair = createCantileverChair();
      seniorChair.position.set(0, 0, -7.2);
      seniorChair.rotation.y = 0;
      diorama.add(seniorChair);

      const seniorLaptop = create3DLaptop('#0284c7');
      seniorLaptop.position.set(0, 1.82, -4.8);
      seniorLaptop.rotation.y = Math.PI;
      diorama.add(seniorLaptop);

      // West (Left) Side Attendees
      const leftCount = 4;
      for (let i = 0; i < leftCount; i++) {
        const zPos = -3.8 + i * 2.5;
        const suit = i % 2 === 0 ? 0x1e293b : 0xd97706;
        const fig = createHumanFigurine({
          suitColor: suit,
          shirtColor: 0xf8fafc,
          hairColor: i === 1 ? 0xb45309 : 0x0f172a,
          skinColor: 0xfcd34d,
          isStanding: false,
        });
        fig.position.set(-8.0, 0, zPos);
        fig.rotation.y = Math.PI / 2;
        diorama.add(fig);

        const chair = createCantileverChair();
        chair.position.set(-8.2, 0, zPos);
        chair.rotation.y = Math.PI / 2;
        diorama.add(chair);

        const laptop = create3DLaptop(accentColors[i % accentColors.length]);
        laptop.position.set(-5.8, 1.82, zPos);
        laptop.rotation.y = -Math.PI / 2;
        diorama.add(laptop);
      }

      // East (Right) Side Attendees
      const rightCount = 4;
      for (let i = 0; i < rightCount; i++) {
        const zPos = -3.8 + i * 2.5;
        const suit = i === 1 ? 0x1e3a8a : 0x334155;
        const fig = createHumanFigurine({
          suitColor: suit,
          shirtColor: 0xffffff,
          hairColor: i === 2 ? 0xd97706 : 0x171717,
          skinColor: 0xfcd34d,
          isStanding: false,
        });
        fig.position.set(8.0, 0, zPos);
        fig.rotation.y = -Math.PI / 2;
        diorama.add(fig);

        const chair = createCantileverChair();
        chair.position.set(8.2, 0, zPos);
        chair.rotation.y = -Math.PI / 2;
        diorama.add(chair);

        const laptop = create3DLaptop(accentColors[(i + 3) % accentColors.length]);
        laptop.position.set(5.8, 1.82, zPos);
        laptop.rotation.y = Math.PI / 2;
        diorama.add(laptop);
      }

      // Standing Presenters
      const pres1 = createHumanFigurine({
        suitColor: 0x0f172a,
        shirtColor: 0xffffff,
        hairColor: 0x171717,
        skinColor: 0xfcd34d,
        isStanding: true,
        gestureArm: true,
      });
      pres1.position.set(-9.8, 0, -8.2);
      pres1.rotation.y = 0.6;
      diorama.add(pres1);

      const pres2 = createHumanFigurine({
        suitColor: 0x1e293b,
        shirtColor: 0xffffff,
        hairColor: 0x451a03,
        skinColor: 0xfcd34d,
        isStanding: true,
        gestureArm: false,
      });
      pres2.position.set(9.8, 0, 7.8);
      pres2.rotation.y = -2.2;
      diorama.add(pres2);

      // ── HOLOGRAPHIC FROSTED GLASS SCREENS ──
      const screenData = {
        projectName: safeProjectName,
        newFeaturesCount: supportEmailsCount,
        supportEmailsCount: newFeaturesCount,
        teamCount: actualTeamCount,
        seniorName: resolvedSeniorName,
        weekRange: safeWeekRange,
      };

      const texExec = createScreenTexture('executive', screenData, isDark);
      const screenExecGeo = new THREE.PlaneGeometry(9.2, 6.8);
      const screenExecMat = new THREE.MeshStandardMaterial({
        map: texExec,
        transparent: true,
        opacity: 0.92,
        roughness: 0.18,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      const screenExec = new THREE.Mesh(screenExecGeo, screenExecMat);
      screenExec.position.set(13.2, 6.8, -5.5);
      screenExec.rotation.set(-0.08, -0.36, 0.04);
      screenExec.castShadow = true;
      diorama.add(screenExec);

      const texVelo = createScreenTexture('velocity', screenData, isDark);
      const screenVeloGeo = new THREE.PlaneGeometry(7.8, 5.8);
      const screenVeloMat = new THREE.MeshStandardMaterial({
        map: texVelo,
        transparent: true,
        opacity: 0.92,
        roughness: 0.18,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      const screenVelo = new THREE.Mesh(screenVeloGeo, screenVeloMat);
      screenVelo.position.set(-13.0, 6.2, -6.0);
      screenVelo.rotation.set(-0.08, 0.38, -0.04);
      screenVelo.castShadow = true;
      diorama.add(screenVelo);

      const texSupport = createScreenTexture('support', screenData, isDark);
      const screenSupGeo = new THREE.PlaneGeometry(6.2, 4.8);
      const screenSupMat = new THREE.MeshStandardMaterial({
        map: texSupport,
        transparent: true,
        opacity: 0.88,
        roughness: 0.2,
        side: THREE.DoubleSide,
      });
      const screenSup = new THREE.Mesh(screenSupGeo, screenSupMat);
      screenSup.position.set(-14.8, 4.8, 4.5);
      screenSup.rotation.set(0, 0.65, 0);
      diorama.add(screenSup);

      const texTeam = createScreenTexture('team', screenData, isDark);
      const screenTeamGeo = new THREE.PlaneGeometry(6.2, 4.8);
      const screenTeamMat = new THREE.MeshStandardMaterial({
        map: texTeam,
        transparent: true,
        opacity: 0.88,
        roughness: 0.2,
        side: THREE.DoubleSide,
      });
      const screenTeam = new THREE.Mesh(screenTeamGeo, screenTeamMat);
      screenTeam.position.set(14.8, 4.8, 5.0);
      screenTeam.rotation.set(0, -0.65, 0);
      diorama.add(screenTeam);

      // Miniature Floor & Corner Props
      const plant1 = createMiniaturePlant();
      plant1.position.set(-11.2, 0, -10.5);
      diorama.add(plant1);

      const plant2 = createMiniaturePlant();
      plant2.position.set(11.2, 0, 10.5);
      diorama.add(plant2);

      const docMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x1e293b : 0xffffff,
        roughness: 0.9,
      });
      const doc1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 3.4), docMat);
      doc1.position.set(-12.5, -1.18, 12.0);
      doc1.rotation.y = 0.25;
      doc1.receiveShadow = true;
      scene.add(doc1);

      const doc2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 3.0), docMat);
      doc2.position.set(-9.5, -1.18, 13.5);
      doc2.rotation.y = -0.15;
      doc2.receiveShadow = true;
      scene.add(doc2);

      const pieGroup = new THREE.Group();
      pieGroup.position.set(12.5, -1.16, 12.5);
      const pieMat1 = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 });
      const pieMat2 = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.5 });
      const pieMat3 = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 });

      const slice1 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.15, 24, 1, false, 0, Math.PI * 1.2), pieMat1);
      const slice2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.15, 24, 1, false, Math.PI * 1.2, Math.PI * 0.5), pieMat2);
      const slice3 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.15, 24, 1, false, Math.PI * 1.7, Math.PI * 0.3), pieMat3);
      pieGroup.add(slice1, slice2, slice3);
      pieGroup.receiveShadow = true;
      scene.add(pieGroup);

      const shieldShape = new THREE.Shape();
      shieldShape.moveTo(0, 1.8);
      shieldShape.lineTo(1.2, 1.4);
      shieldShape.lineTo(1.2, 0.3);
      shieldShape.quadraticCurveTo(0.8, -1.1, 0, -1.6);
      shieldShape.quadraticCurveTo(-0.8, -1.1, -1.2, 0.3);
      shieldShape.lineTo(-1.2, 1.4);
      shieldShape.closePath();

      const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
        depth: 0.12,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: 0.05,
        bevelThickness: 0.05,
      });
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.65,
        roughness: 0.2,
        metalness: 0.1,
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(0, 0.2, 13.8);
      shield.castShadow = true;
      scene.add(shield);

      // Mouse Parallax Interaction
      const handleMouseMove = (e: MouseEvent) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        mouseRef.current.targetX = nx * 3.5;
        mouseRef.current.targetY = ny * 2.5;
      };
      window.addEventListener('mousemove', handleMouseMove, { passive: true });

      // Resize Handler
      const handleResize = () => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        const nw = Math.max(containerRef.current.clientWidth || window.innerWidth || 800, 320);
        const nh = Math.max(containerRef.current.clientHeight || window.innerHeight || 600, 240);
        const nAspect = nw / nh;

        cameraRef.current.left = (-frustumSize * nAspect) / 2;
        cameraRef.current.right = (frustumSize * nAspect) / 2;
        cameraRef.current.top = frustumSize / 2;
        cameraRef.current.bottom = -frustumSize / 2;
        cameraRef.current.updateProjectionMatrix();

        rendererRef.current.setSize(nw, nh);
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      };
      window.addEventListener('resize', handleResize);

      // Animation Render Loop
      const clock = new THREE.Clock();

      const animate = () => {
        animationFrameIdRef.current = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

        if (aiEmblemRef.current) {
          aiEmblemRef.current.position.y = 3.4 + Math.sin(elapsedTime * 2.0) * 0.16;
          aiEmblemRef.current.rotation.y = Math.sin(elapsedTime * 0.8) * 0.12;
        }

        if (dioramaGroupRef.current) {
          dioramaGroupRef.current.rotation.y =
            mouseRef.current.x * 0.02 + Math.sin(elapsedTime * 0.25) * 0.04;
        }

        if (cameraRef.current && rendererRef.current && sceneRef.current) {
          cameraRef.current.position.x = 42 + mouseRef.current.x;
          cameraRef.current.position.y = 34 - mouseRef.current.y;
          cameraRef.current.lookAt(0, 1.2, 0);
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };

      animate();

      if (onSceneReady) {
        onSceneReady();
      }

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
        if (renderer) {
          renderer.dispose();
        }
      };
    } catch (err) {
      console.error('[ThreeBoardroomCanvas] Failed to initialize Three.js WebGL scene:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [
    isDark,
    safeProjectName,
    resolvedSeniorName,
    newFeaturesCount,
    supportEmailsCount,
    actualTeamCount,
    safeWeekRange,
    onSceneReady,
    onError,
  ]);

  // Handle external scroll progress
  useEffect(() => {
    if (!cameraRef.current) return;
    const p = Math.min(1, Math.max(0, Number(scrollProgress) || 0));
    const zoomScale = 1.0 + p * 1.5;
    cameraRef.current.zoom = zoomScale;
    cameraRef.current.updateProjectionMatrix();
  }, [scrollProgress]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          outline: 'none',
        }}
      />
    </div>
  );
};
