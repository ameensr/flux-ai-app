import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { THEMES } from '@/lib/themes';
import type { Room } from './seatModel';
import { drawReportHeroScreen, type ReportHeroScreenData } from './reportHeroScreen';
import { createIntroCameraPath, hallTourPose, INTRO_DURATION_MS, seatFovAfterWheel, seatLookAfterDrag, seatTourLook, smoothCameraStep, smoothDampVector3 } from './cameraControls';
import styles from './CinematicBoardroomIntro.module.css';

function surfaceTexture(kind: 'stone' | 'carpet') {
  const canvas = document.createElement('canvas');
  const size = kind === 'stone' ? 512 : 256;
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const image = context.createImageData(size, size);
  let seed = kind === 'stone' ? 14917 : 4819;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const noise = random() - .5;
    if (kind === 'stone') {
      const warp = x * .046 + Math.sin(y * .021) * .82 + Math.sin(y * .061 + x * .012) * .27 + Math.sin(y * .012) * .41;
      const vein = Math.pow(Math.max(0, Math.sin(warp)), 20) * 25
        + Math.pow(Math.max(0, Math.sin(warp * 2.18 + 1.4)), 28) * 10;
      const cloud = Math.sin(x * .017 + y * .012) * 4 + Math.sin(x * .041 - y * .025) * 2 + noise * 4;
      image.data[i] = 172 + cloud - vein * .86;
      image.data[i + 1] = 170 + cloud - vein;
      image.data[i + 2] = 173 + cloud - vein * 1.05;
    } else {
      const fleck = noise * 18 + Math.sin(x * .7 + y * .42) * 2;
      image.data[i] = 17 + fleck * .65;
      image.data[i + 1] = 23 + fleck * .72;
      image.data[i + 2] = 41 + fleck;
    }
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

interface Props {
  room: Room;
  selectedId?: string;
  hoveredId?: string;
  recommendedIds: string[];
  firstPerson: boolean;
  resetKey: number;
  isDark: boolean;
  screenData: ReportHeroScreenData;
  onSelect: (id: string) => void;
  onOpenReport: () => void;
  onHover: (id?: string, point?: { x: number; y: number }) => void;
  onFailure: () => void;
}

export default function BoardroomScene({ room, selectedId, hoveredId, recommendedIds, firstPerson, resetKey, isDark, screenData, onSelect, onOpenReport, onHover, onFailure }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSelect, onOpenReport, onHover, onFailure });
  callbacks.current = { onSelect, onOpenReport, onHover, onFailure };
  const state = useRef({ selectedId, hoveredId, recommendedIds, firstPerson, resetKey });
  state.current = { selectedId, hoveredId, recommendedIds, firstPerson, resetKey };
  const introPlayed = useRef(false);
  const lastCamera = useRef<{ position: THREE.Vector3; look: THREE.Vector3; fov: number } | null>(null);
  const updateView = useRef<(() => void) | null>(null);
  const updateColors = useRef<(() => void) | null>(null);
  const updateScreen = useRef<((data: ReportHeroScreenData) => void) | null>(null);
  const currentScreenData = useRef(screenData);
  currentScreenData.current = screenData;

  useEffect(() => { updateView.current?.(); }, [selectedId, firstPerson, resetKey]);
  useEffect(() => { updateColors.current?.(); }, [selectedId, hoveredId, recommendedIds, firstPerson]);
  useEffect(() => { updateScreen.current?.(screenData); }, [screenData]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 1.4, alpha: false, powerPreference: 'high-performance' }); }
    catch { callbacks.current.onFailure(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.25 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    container.appendChild(renderer.domElement);
    const labelLayer = document.createElement('div');
    labelLayer.className = styles.memberLabels;
    labelLayer.setAttribute('aria-label', 'Meeting participants');
    const labelElements = new Map<string, HTMLDivElement>();
    room.seats.forEach(seat => {
      if (!seat.member) return;
      const badge = document.createElement('div');
      badge.className = styles.memberLabel;
      if (seat.side === 'foot') badge.dataset.host = 'true';
      badge.title = seat.member.role ? `${seat.member.name} · ${seat.member.role}` : seat.member.name;
      badge.setAttribute('role', 'button');
      badge.setAttribute('aria-label', `View from ${seat.member.name}'s seat`);
      badge.tabIndex = 0;
      badge.onclick = () => callbacks.current.onSelect(seat.id);
      badge.onpointerenter = event => callbacks.current.onHover(seat.id, { x: event.clientX, y: event.clientY });
      badge.onpointerleave = () => callbacks.current.onHover();
      badge.onkeydown = event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          callbacks.current.onSelect(seat.id);
        }
      };
      const name = document.createElement('span');
      name.className = styles.memberLabelName;
      name.textContent = seat.member.name;
      if (seat.member.role) {
        const role = document.createElement('small');
        role.textContent = seat.member.role;
        name.appendChild(role);
      }
      badge.appendChild(name);
      labelLayer.appendChild(badge);
      labelElements.set(seat.id, badge);
    });
    container.appendChild(labelLayer);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(THEMES.dark['--bg']);
    const camera = new THREE.PerspectiveCamera(firstPerson ? 66 : 52, 1, .06, 80);
    const restoredCamera = lastCamera.current;
    lastCamera.current = null;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const roomWidth = Math.max(9, room.width + 6.8), roomLength = room.length + 4.4;
    const initialRadius = Math.max(7.2, room.length * 1.2);
    const initialElevation = Math.asin(3.5 / initialRadius);
    const orbit = { azimuth: 0, elevation: initialElevation, radius: initialRadius, target: new THREE.Vector3(0, .7, 0) };
    const overviewPosition = () => new THREE.Vector3(orbit.radius * Math.sin(orbit.azimuth) * Math.cos(orbit.elevation), orbit.radius * Math.sin(orbit.elevation), orbit.radius * Math.cos(orbit.azimuth) * Math.cos(orbit.elevation));
    const initialSeat = room.seats.find(s => s.id === selectedId) ?? room.viewSeat;
    const initialLook = firstPerson && initialSeat
      ? new THREE.Vector3(...(initialSeat.side === 'head' ? [0, 1.2, 0] as [number, number, number] : room.focal))
      : orbit.target.clone();
    const seatPosition = new THREE.Vector3(initialSeat.x, 1.22, initialSeat.z);
    const introPath = createIntroCameraPath(overviewPosition().add(orbit.target), seatPosition, new THREE.Vector3(...room.focal), roomWidth);
    const playIntro = firstPerson && !reducedMotion && !introPlayed.current && !restoredCamera;
    if (playIntro) introPlayed.current = true;
    if (playIntro) { camera.fov = 52; camera.updateProjectionMatrix(); }
    if (restoredCamera) { camera.fov = restoredCamera.fov; camera.updateProjectionMatrix(); }
    const introStart = playIntro ? introPath(0) : null;
    camera.position.copy(restoredCamera?.position ?? introStart?.position ?? (firstPerson ? seatPosition : overviewPosition().add(orbit.target)));
    const look = restoredCamera?.look.clone() ?? introStart?.look ?? initialLook.clone();
    camera.lookAt(look);
    const targetPosition = new THREE.Vector3();
    const targetLook = new THREE.Vector3();
    const shellSurfaces: THREE.Object3D[] = [];
    const updateShellVisibility = () => {
      const inside = Math.abs(camera.position.x) < roomWidth / 2 - .15
        && Math.abs(camera.position.z) < roomLength / 2 - .15
        && camera.position.y < 3.32;
      shellSurfaces.forEach(surface => { surface.visible = state.current.firstPerson && inside; });
    };
    const projected = new THREE.Vector3();
    const publishLabels = () => {
      const width = container.clientWidth, height = container.clientHeight;
      if (!width || !height) return;
      room.seats.forEach(seat => {
        const badge = labelElements.get(seat.id);
        if (!badge) return;
        if (state.current.firstPerson && state.current.selectedId === seat.id) { badge.style.visibility = 'hidden'; return; }
        projected.set(seat.x, seat.side === 'foot' ? 1.62 : 1.83, seat.z).project(camera);
        if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > .96 || Math.abs(projected.y) > .88) { badge.style.visibility = 'hidden'; return; }
        badge.style.visibility = 'visible';
        badge.style.transform = `translate3d(${((projected.x + 1) * width / 2).toFixed(1)}px, ${((1 - projected.y) * height / 2).toFixed(1)}px, 0) translate(-50%, -100%)`;
      });
    };
    let raf = 0;
    let transitionStartedAt = 0;
    const transitionFromPosition = new THREE.Vector3();
    const transitionFromLook = new THREE.Vector3();
    let transitionFromFov = camera.fov;
    let transitionToFov = camera.fov;
    let transitionDuration = 1150;
    let transitionPath: ReturnType<typeof createIntroCameraPath> | null = null;
    let tourRaf = 0;
    let tourLastFrame = 0;
    let tourElapsed = 0;
    let resumeTourTimer = 0;
    let tourAllowed = true;
    let tourDirection = 1;
    const tourAnchor = { azimuth: orbit.azimuth, elevation: orbit.elevation, radius: orbit.radius };
    const seatTourAnchor = look.clone();
    let tourFirstPerson = state.current.firstPerson;
    const stopTour = (manual = false) => {
      if (manual && tourRaf && Math.cos(tourElapsed * .16) < 0) tourDirection *= -1;
      if (tourRaf) cancelAnimationFrame(tourRaf);
      if (resumeTourTimer) window.clearTimeout(resumeTourTimer);
      resumeTourTimer = 0;
      tourRaf = 0;
      tourLastFrame = 0;
      if (manual) tourAllowed = false;
    };
    const tour = (now: number) => {
      tourRaf = 0;
      if (!tourAllowed || state.current.firstPerson !== tourFirstPerson) return;
      const dt = tourLastFrame ? Math.min(.05, (now - tourLastFrame) / 1000) : 0;
      tourLastFrame = now;
      tourElapsed += dt;
      if (tourFirstPerson) {
        targetLook.copy(seatTourLook(camera.position, seatTourAnchor, tourElapsed, tourDirection));
        look.copy(targetLook);
        camera.lookAt(look);
      } else {
        // Sweep across the meeting side of the table so the presentation remains in view.
        const pose = hallTourPose(tourElapsed, tourAnchor, tourDirection);
        orbit.azimuth = pose.azimuth;
        orbit.elevation = pose.elevation;
        orbit.radius = pose.radius;
        targetPosition.copy(overviewPosition().add(orbit.target));
        targetLook.copy(orbit.target);
        camera.position.copy(targetPosition);
        look.copy(targetLook);
        camera.lookAt(look);
      }
      renderer.render(scene, camera);
      publishLabels();
      tourRaf = requestAnimationFrame(tour);
    };
    const startTour = () => {
      if (!tourAllowed || tourRaf) return false;
      tourFirstPerson = state.current.firstPerson;
      tourAnchor.azimuth = orbit.azimuth;
      tourAnchor.elevation = orbit.elevation;
      tourAnchor.radius = orbit.radius;
      seatTourAnchor.copy(look);
      tourElapsed = 0;
      tourLastFrame = 0;
      tourRaf = requestAnimationFrame(tour);
      return true;
    };
    const render = () => { raf = 0; renderer.render(scene, camera); publishLabels(); };
    const invalidate = () => { if (!raf) raf = requestAnimationFrame(render); };
    let panRaf = 0;
    let panLastFrame = 0;
    const panPositionVelocity = new THREE.Vector3();
    const panLookVelocity = new THREE.Vector3();
    const stopPan = () => {
      if (panRaf) cancelAnimationFrame(panRaf);
      panRaf = 0;
      panLastFrame = 0;
      panPositionVelocity.set(0, 0, 0);
      panLookVelocity.set(0, 0, 0);
    };
    const panFrame = (now: number) => {
      panRaf = 0;
      const dt = panLastFrame ? Math.min(.05, (now - panLastFrame) / 1000) : .016;
      panLastFrame = now;
      smoothDampVector3(camera.position, targetPosition, panPositionVelocity, dt);
      smoothDampVector3(look, targetLook, panLookVelocity, dt);
      camera.lookAt(look);
      renderer.render(scene, camera);
      publishLabels();
      if (camera.position.distanceToSquared(targetPosition) > .000004 || look.distanceToSquared(targetLook) > .000004
        || panPositionVelocity.lengthSq() > .0004 || panLookVelocity.lengthSq() > .0004) {
        panRaf = requestAnimationFrame(panFrame);
      } else {
        camera.position.copy(targetPosition);
        look.copy(targetLook);
        camera.lookAt(look);
        panLastFrame = 0;
        panPositionVelocity.set(0, 0, 0);
        panLookVelocity.set(0, 0, 0);
        invalidate();
      }
    };
    const startPan = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!panRaf) panRaf = requestAnimationFrame(panFrame);
    };
    const animate = (now: number) => {
      raf = 0;
      if (!transitionStartedAt) transitionStartedAt = now;
      const progress = Math.min(1, (now - transitionStartedAt) / transitionDuration);
      const ease = smoothCameraStep(progress);
      if (transitionPath) {
        const pose = transitionPath(progress);
        camera.position.copy(pose.position);
        look.copy(pose.look);
      } else {
        camera.position.copy(transitionFromPosition).lerp(targetPosition, ease);
        look.copy(transitionFromLook).lerp(targetLook, ease);
      }
      camera.fov = THREE.MathUtils.lerp(transitionFromFov, transitionToFov, ease);
      camera.updateProjectionMatrix();
      updateShellVisibility();
      camera.lookAt(look);
      renderer.render(scene, camera);
      publishLabels();
      if (progress < 1) raf = requestAnimationFrame(animate);
      else { camera.position.copy(targetPosition); look.copy(targetLook); camera.fov = transitionToFov; camera.updateProjectionMatrix(); camera.lookAt(look); if (!startTour()) invalidate(); }
    };
    const startTransition = (approachSeatFromHall = false) => {
      if (raf) cancelAnimationFrame(raf);
      transitionFromPosition.copy(camera.position);
      transitionFromLook.copy(look);
      transitionFromFov = camera.fov;
      transitionToFov = state.current.firstPerson ? 66 : 52;
      transitionDuration = approachSeatFromHall ? INTRO_DURATION_MS : 1150;
      transitionPath = approachSeatFromHall
        ? createIntroCameraPath(transitionFromPosition, targetPosition, targetLook, roomWidth, transitionFromLook)
        : null;
      transitionStartedAt = 0;
      raf = requestAnimationFrame(animate);
    };
    let introRaf = 0;
    let introStartedAt = 0;
    let introActive = playIntro;
    let introHiddenSeat: string | undefined;
    const stopIntro = () => {
      if (introRaf) cancelAnimationFrame(introRaf);
      introRaf = 0;
      introActive = false;
      if (introHiddenSeat) { showPerson(introHiddenSeat, true); introHiddenSeat = undefined; }
    };
    const introFrame = (now: number) => {
      introRaf = 0;
      if (!introActive) return;
      if (!introStartedAt) introStartedAt = now;
      const progress = Math.min(1, (now - introStartedAt) / INTRO_DURATION_MS);
      const pose = introPath(progress);
      camera.position.copy(pose.position);
      look.copy(pose.look);
      camera.fov = 52 + 14 * smoothCameraStep(progress);
      camera.updateProjectionMatrix();
      if (progress > .58) shellSurfaces.forEach(surface => { surface.visible = true; });
      if (progress > .72 && !introHiddenSeat) {
        const seatId = state.current.selectedId;
        if (seatId) { introHiddenSeat = seatId; showPerson(seatId, false); }
      }
      camera.lookAt(look);
      renderer.render(scene, camera);
      publishLabels();
      if (progress < 1) introRaf = requestAnimationFrame(introFrame);
      else {
        introActive = false;
        targetPosition.copy(camera.position);
        targetLook.copy(look);
        updateColors.current?.();
        introHiddenSeat = undefined;
        if (!startTour()) invalidate();
      }
    };
    const resumeTourSoon = () => {
      if (resumeTourTimer) window.clearTimeout(resumeTourTimer);
      resumeTourTimer = window.setTimeout(() => {
        resumeTourTimer = 0;
        if (raf) { resumeTourSoon(); return; }
        tourAllowed = true;
        startTour();
      }, 900);
    };
    let previousResetKey = state.current.resetKey;
    let previousFirstPerson = state.current.firstPerson;
    const setView = () => {
      const current = state.current;
      const interruptedIntro = introActive;
      stopPan();
      stopIntro();
      if (interruptedIntro) updateColors.current?.();
      stopTour();
      tourAllowed = true;
      const approachSeatFromHall = current.firstPerson && !previousFirstPerson;
      if (!current.firstPerson && previousFirstPerson) {
        orbit.azimuth = 0; orbit.elevation = initialElevation; orbit.radius = initialRadius; orbit.target.set(0, .7, 0);
      }
      previousFirstPerson = current.firstPerson;
      updateShellVisibility();
      if (current.resetKey !== previousResetKey) {
        previousResetKey = current.resetKey;
        orbit.azimuth = 0; orbit.elevation = initialElevation; orbit.radius = initialRadius; orbit.target.set(0, .7, 0);
      }
      const seat = room.seats.find(s => s.id === current.selectedId) ?? room.viewSeat;
      if (current.firstPerson && seat) {
        targetPosition.set(seat.x, 1.22, seat.z);
        targetLook.set(...(seat.side === 'head' ? [0, 1.2, 0] as [number, number, number] : room.focal));
      } else {
        targetPosition.copy(overviewPosition().add(orbit.target)); targetLook.copy(orbit.target);
      }
      if (reducedMotion) {
        camera.position.copy(targetPosition); look.copy(targetLook); camera.fov = current.firstPerson ? 66 : 52; camera.updateProjectionMatrix(); updateShellVisibility(); camera.lookAt(look);
        if (!startTour()) invalidate();
      } else if (camera.position.distanceTo(targetPosition) < .001 && look.distanceTo(targetLook) < .001 && Math.abs(camera.fov - (current.firstPerson ? 66 : 52)) < .001) {
        if (!startTour()) invalidate();
      } else startTransition(approachSeatFromHall);
    };
    updateView.current = setView;

    const mat = (color: string, roughness = .8, metalness = .05) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const stoneTexture = surfaceTexture('stone');
    const carpetTexture = surfaceTexture('carpet');
    const wallMat = mat(THEMES.dark['--surface'], .95);
    const stone = new THREE.MeshPhysicalMaterial({ color: stoneTexture ? '#ffffff' : '#aaa9ad', map: stoneTexture ?? undefined, roughness: .32, metalness: .02, clearcoat: .28, clearcoatRoughness: .18 });
    const edge = mat('#283044', .44, .34);
    const dark = mat('#0c1325', .74);
    const screen = new THREE.MeshBasicMaterial({ color: '#101a31' });
    const screenEdge = mat('#060b17', .27, .48);
    if (carpetTexture) carpetTexture.repeat.set(roomWidth / 2.2, roomLength / 2.2);
    const floorMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: carpetTexture ?? undefined, roughness: 1 });
    const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z); scene.add(mesh); return mesh;
    };
    const roundBox = (w: number, h: number, d: number, radius: number, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, radius), material);
      mesh.position.set(x, y, z); scene.add(mesh); return mesh;
    };
    box(roomWidth, .12, roomLength, floorMat, 0, -.08, 0);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(room.width + .8, room.length + .7), new THREE.MeshBasicMaterial({ color: '#030610', transparent: true, opacity: .31, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.009; scene.add(shadow);
    box(roomWidth, 3.5, .12, wallMat, 0, 1.7, -roomLength / 2);
    shellSurfaces.push(box(.12, 3.5, roomLength, wallMat, -roomWidth / 2, 1.7, 0));
    shellSurfaces.push(box(.12, 3.5, roomLength, wallMat, roomWidth / 2, 1.7, 0));
    shellSurfaces.push(box(roomWidth, .12, roomLength, mat('#0a1020'), 0, 3.5, 0));
    shellSurfaces.push(box(roomWidth, 3.5, .12, wallMat, 0, 1.7, roomLength / 2));
    roundBox(room.width + .14, .13, room.length + .14, .09, edge, 0, .71, 0);
    const brass = mat('#baa263', .34, .68);
    roundBox(room.width + .08, .012, room.length + .08, .01, brass, 0, .767, 0);
    roundBox(room.width, .085, room.length, .07, stone, 0, .79, 0);
    roundBox(.48, .64, room.length * .68, .08, dark, 0, .35, 0);
    box(.025, .008, room.length - .28, brass, -room.width / 2 + .13, .837, 0);
    box(.025, .008, room.length - .28, brass, room.width / 2 - .13, .837, 0);
    box(room.width - .3, .008, .025, brass, 0, .837, -room.length / 2 + .13);
    box(room.width - .3, .008, .025, brass, 0, .837, room.length / 2 - .13);
    roundBox(.55, .012, room.length - .58, .008, mat('#1e2639', .89), 0, .838, 0);
    const brushedMetal = mat('#7888a8', .31, .82);
    const insetDark = mat('#0b1429', .45, .35);
    for (const z of [-room.length * .31, room.length * .31]) {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .012, 24), brushedMetal);
      rim.position.set(0, .85, z); scene.add(rim);
      const center = new THREE.Mesh(new THREE.CylinderGeometry(.125, .125, .014, 24), insetDark);
      center.position.set(0, .859, z); scene.add(center);
    }
    for (const x of [-room.width / 2 + .12, room.width / 2 - .12])
      box(.018, .018, room.length - .4, mat('#726940', .32, .35), x, .65, 0);
    const tvFrame = box(6.55, 2.48, .08, screenEdge, 0, 1.84, -roomLength / 2 + .18);
    const tvScreen = box(6.34, 2.28, .09, screen, 0, 1.84, -roomLength / 2 + .25);
    // Presentation board content remains legible from every seat.
    const boardCanvas = document.createElement('canvas');
    drawReportHeroScreen(boardCanvas, currentScreenData.current, isDark);
    const boardTexture = new THREE.CanvasTexture(boardCanvas);
    updateScreen.current = data => {
      drawReportHeroScreen(boardCanvas, data, isDark);
      boardTexture.needsUpdate = true;
      invalidate();
    };
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 2.24), new THREE.MeshBasicMaterial({ map: boardTexture }));
    board.position.set(0, 1.84, -roomLength / 2 + .305); scene.add(board);
    // Fluted acoustic panels, brass reveals and warm fixtures keep the room detailed at seat height.
    const panel = mat(THEMES.dark['--surface-secondary'], .91);
    const slat = mat('#202c4d', .78);
    const trim = mat('#766f65', .48, .42);
    const sconce = new THREE.MeshBasicMaterial({ color: '#b4b8f4' });
    for (const z of [-roomLength / 2, roomLength / 2]) {
      shellSurfaces.push(box(roomWidth, .12, .045, trim, 0, .18, z + (z < 0 ? .09 : -.09)));
      shellSurfaces.push(box(roomWidth, .025, .045, trim, 0, 2.97, z + (z < 0 ? .09 : -.09)));
    }
    for (const sign of [-1, 1]) {
      const sideX = sign * (roomWidth / 2 - .12);
      shellSurfaces.push(box(.045, .12, roomLength, trim, sideX, .18, 0));
      shellSurfaces.push(box(.045, .025, roomLength, trim, sideX, 2.97, 0));
      for (let i = 0; i < 8; i++) {
        const x = sign * (3.55 + i * .13);
        if (Math.abs(x) < roomWidth / 2 - .15) shellSurfaces.push(box(.055, 2.72, .07, slat, x, 1.66, -roomLength / 2 + .13));
      }
    }
    for (const x of [-roomWidth / 2 + .14, roomWidth / 2 - .14]) {
      for (let i = -2; i <= 2; i++) {
        const z = i * roomLength / 6;
        shellSurfaces.push(box(.09, 2.9, roomLength / 7, panel, x, 1.7, z));
        shellSurfaces.push(box(.11, .018, roomLength / 7, trim, x + (x < 0 ? .06 : -.06), 3.15, z));
        shellSurfaces.push(roundBox(.13, .39, .09, .03, trim, x + (x < 0 ? .065 : -.065), 1.9, z));
        shellSurfaces.push(box(.135, .29, .055, sconce, x + (x < 0 ? .14 : -.14), 1.9, z));
      }
    }
    const ceilingLight = new THREE.MeshBasicMaterial({ color: '#c7d4f4' });
    const ceilingDark = mat('#0b1123', .7);
    for (const z of [-room.length / 3, room.length / 3]) {
      shellSurfaces.push(roundBox(roomWidth * .64, .045, .19, .02, ceilingDark, 0, 3.37, z));
      shellSurfaces.push(box(roomWidth * .61, .012, .045, ceilingLight, 0, 3.34, z));
    }
    for (const x of [-roomWidth * .36, roomWidth * .36]) {
      for (const z of [-roomLength * .28, 0, roomLength * .28]) {
        shellSurfaces.push(roundBox(.23, .02, .23, .035, ceilingDark, x, 3.38, z));
        shellSurfaces.push(roundBox(.11, .024, .11, .016, ceilingLight, x, 3.36, z));
      }
    }
    scene.add(new THREE.HemisphereLight('#cbd8f6', '#17203a', 1.15));
    const key = new THREE.DirectionalLight('#dce7ff', 2.1); key.position.set(-3, 6, 3); scene.add(key);
    const fill = new THREE.DirectionalLight('#8d91f7', .66); fill.position.set(3, 4, -4); scene.add(fill);
    for (const z of [-room.length / 3, room.length / 3]) {
      const pool = new THREE.PointLight('#a5afff', 4, 5.5, 2);
      pool.position.set(0, 2.9, z);
      scene.add(pool);
    }

    const chairGeometry = new RoundedBoxGeometry(.68, .14, .64, 3, .06);
    const backGeometry = new RoundedBoxGeometry(.7, .8, .13, 3, .06);
    const armGeometry = new RoundedBoxGeometry(.12, .14, .53, 2, .045);
    const seatMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .82 });
    const backMaterial = mat('#ffffff', .83);
    const armMaterial = mat('#202a43', .83);
    const backInsetMaterial = mat('#ffffff', .91);
    const bases = new THREE.InstancedMesh(chairGeometry, seatMaterial, room.seats.length);
    const backs = new THREE.InstancedMesh(backGeometry, backMaterial, room.seats.length);
    const backInsets = new THREE.InstancedMesh(new RoundedBoxGeometry(.58, .66, .015, 2, .014), backInsetMaterial, room.seats.length);
    const arms = new THREE.InstancedMesh(armGeometry, armMaterial, room.seats.length * 2);
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.055, .1, .48, 8), mat('#63708b', .38, .7), room.seats.length);
    const chairShadows = new THREE.InstancedMesh(new THREE.CircleGeometry(.48, 12), new THREE.MeshBasicMaterial({ color: '#040715', transparent: true, opacity: .34, depthWrite: false }), room.seats.length);
    const matrix = new THREE.Matrix4();
    const participantSeats = room.seats.filter(seat => seat.member);
    const coatMaterial = mat('#ffffff', .95);
    const skinMaterial = mat('#ffffff', .9);
    const hairMaterial = mat('#ffffff', .95);
    const torsos = new THREE.InstancedMesh(new RoundedBoxGeometry(.5, .46, .31, 2, .13), coatMaterial, participantSeats.length);
    const sleeves = new THREE.InstancedMesh(new RoundedBoxGeometry(.13, .35, .25, 2, .06), coatMaterial, participantSeats.length * 2);
    const necks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.075, .085, .13, 8), skinMaterial, participantSeats.length);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.17, 14, 10), skinMaterial, participantSeats.length);
    const hairCaps = new THREE.InstancedMesh(new THREE.SphereGeometry(.177, 14, 10), hairMaterial, participantSeats.length);
    const personMeshes = [torsos, sleeves, necks, heads, hairCaps];
    const personMatrices = personMeshes.map(() => [] as THREE.Matrix4[]);
    const participantIndex = new Map<string, number>();
    const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    const skinColors = ['#c98b66', '#986443', '#e0b08b', '#6f472f'];
    const shirtColors = ['#263b5d', '#4b5278', '#28505a', '#57527a', '#3b4569', '#8994a8'];
    room.seats.forEach((seat, i) => {
      const angle = Math.atan2(seat.facing[0], seat.facing[1]);
      const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      matrix.compose(new THREE.Vector3(seat.x, .56, seat.z), quaternion, new THREE.Vector3(1, 1, 1)); bases.setMatrixAt(i, matrix);
      matrix.compose(new THREE.Vector3(seat.x, .27, seat.z), quaternion, new THREE.Vector3(1, 1, 1)); stems.setMatrixAt(i, matrix);
      matrix.compose(new THREE.Vector3(seat.x, -.006, seat.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), new THREE.Vector3(1, 1, 1)); chairShadows.setMatrixAt(i, matrix);
      const backPos = new THREE.Vector3(seat.x - seat.facing[0] * .29, 1.0, seat.z - seat.facing[1] * .29);
      matrix.compose(backPos, quaternion, new THREE.Vector3(1, 1, 1)); backs.setMatrixAt(i, matrix);
      matrix.compose(new THREE.Vector3(backPos.x + seat.facing[0] * .073, 1.0, backPos.z + seat.facing[1] * .073), quaternion, new THREE.Vector3(1, 1, 1)); backInsets.setMatrixAt(i, matrix);
      for (let side = 0; side < 2; side++) {
        const sign = side ? 1 : -1;
        const x = seat.x + sign * seat.facing[1] * .34;
        const z = seat.z - sign * seat.facing[0] * .34;
        matrix.compose(new THREE.Vector3(x, .76, z), quaternion, new THREE.Vector3(1, 1, 1));
        arms.setMatrixAt(i * 2 + side, matrix);
      }
      if (seat.member) {
        const personIndex = participantIndex.size;
        participantIndex.set(seat.id, personIndex);
        const coatColor = new THREE.Color(seat.side === 'foot' ? '#676892' : shirtColors[i % shirtColors.length]);
        const skinColor = new THREE.Color(skinColors[i % skinColors.length]);
        const hairColor = new THREE.Color(['#211b18', '#3a2921', '#151719'][i % 3]);
        const setPart = (meshIndex: number, instanceIndex: number, position: THREE.Vector3, scale = new THREE.Vector3(1, 1, 1)) => {
          const partMatrix = new THREE.Matrix4().compose(position, quaternion, scale);
          personMeshes[meshIndex].setMatrixAt(instanceIndex, partMatrix);
          personMatrices[meshIndex][instanceIndex] = partMatrix;
        };
        setPart(0, personIndex, new THREE.Vector3(seat.x, 1.01, seat.z));
        torsos.setColorAt(personIndex, coatColor);
        setPart(2, personIndex, new THREE.Vector3(seat.x, 1.29, seat.z));
        necks.setColorAt(personIndex, skinColor);
        setPart(3, personIndex, new THREE.Vector3(seat.x, 1.46, seat.z));
        heads.setColorAt(personIndex, skinColor);
        setPart(4, personIndex, new THREE.Vector3(seat.x, 1.56, seat.z), new THREE.Vector3(1, .52, 1));
        hairCaps.setColorAt(personIndex, hairColor);
        for (let side = 0; side < 2; side++) {
          const sign = side ? 1 : -1;
          const offset = new THREE.Vector3(sign * .31, 1, 0).applyQuaternion(quaternion);
          setPart(1, personIndex * 2 + side, new THREE.Vector3(seat.x + offset.x, 1, seat.z + offset.z));
          sleeves.setColorAt(personIndex * 2 + side, coatColor);
        }
      }
    });
    bases.instanceMatrix.needsUpdate = true; backs.instanceMatrix.needsUpdate = true; backInsets.instanceMatrix.needsUpdate = true; arms.instanceMatrix.needsUpdate = true; chairShadows.instanceMatrix.needsUpdate = true; stems.instanceMatrix.needsUpdate = true;
    personMeshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; });
    scene.add(bases, backs, backInsets, arms, stems, chairShadows, ...personMeshes);
    let hiddenPersonId: string | undefined;
    const showPerson = (id: string, visible: boolean) => {
      const index = participantIndex.get(id);
      if (index === undefined) return;
      personMeshes.forEach((mesh, meshIndex) => {
        const first = meshIndex === 1 ? index * 2 : index;
        const count = meshIndex === 1 ? 2 : 1;
        for (let offset = 0; offset < count; offset++) mesh.setMatrixAt(first + offset, visible ? personMatrices[meshIndex][first + offset] : hiddenMatrix);
        mesh.instanceMatrix.needsUpdate = true;
      });
    };
    const colors = () => {
      const nextHidden = state.current.firstPerson && !introActive ? state.current.selectedId : undefined;
      if (hiddenPersonId !== nextHidden) {
        if (hiddenPersonId) showPerson(hiddenPersonId, true);
        if (nextHidden) showPerson(nextHidden, false);
        hiddenPersonId = nextHidden;
      }
      room.seats.forEach((seat, i) => {
        const s = state.current;
        const hovered = seat.id === s.hoveredId;
        const badge = labelElements.get(seat.id);
        if (badge) badge.dataset.hovered = String(hovered);
        const color = hovered ? '#8b9fc6' : seat.id === s.selectedId ? '#a9915d' : s.recommendedIds.includes(seat.id) ? '#6bbaa9' : seat.reserved ? '#675d87' : '#35415f';
        bases.setColorAt(i, new THREE.Color(color));
        backs.setColorAt(i, new THREE.Color(hovered ? '#516a91' : '#202a43'));
        backInsets.setColorAt(i, new THREE.Color(hovered ? '#748ab4' : '#303d60'));
        const personIndex = participantIndex.get(seat.id);
        if (personIndex !== undefined) {
          const coat = new THREE.Color(seat.side === 'foot' ? '#676892' : shirtColors[i % shirtColors.length]);
          if (hovered) coat.lerp(new THREE.Color('#a6b8dc'), .42);
          torsos.setColorAt(personIndex, coat);
          sleeves.setColorAt(personIndex * 2, coat);
          sleeves.setColorAt(personIndex * 2 + 1, coat);
        }
      });
      if (bases.instanceColor) bases.instanceColor.needsUpdate = true;
      if (backs.instanceColor) backs.instanceColor.needsUpdate = true;
      if (backInsets.instanceColor) backInsets.instanceColor.needsUpdate = true;
      if (torsos.instanceColor) torsos.instanceColor.needsUpdate = true;
      if (sleeves.instanceColor) sleeves.instanceColor.needsUpdate = true;
      invalidate();
    };
    updateColors.current = colors; colors();
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
    const tvTargets: THREE.Object3D[] = [board, tvScreen, tvFrame];
    let lastHoverId: string | undefined;
    const pick = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([bases, backs, backInsets, ...personMeshes, ...tvTargets])[0];
      if (!hit) return undefined;
      if (tvTargets.includes(hit.object)) return { kind: 'report' as const };
      const personMeshIndex = personMeshes.findIndex(mesh => mesh === hit.object);
      const seat = hit.instanceId === undefined ? undefined : personMeshIndex >= 0
        ? participantSeats[personMeshIndex === 1 ? Math.floor(hit.instanceId / 2) : hit.instanceId]
        : room.seats[hit.instanceId];
      return seat ? { kind: 'seat' as const, seat } : undefined;
    };
    let tvPress: { x: number; y: number } | null = null;
    let drag: { x: number; y: number; startX: number; startY: number; button: number; moved: boolean } | null = null;
    const down = (event: PointerEvent) => {
      if (introActive) {
        const target = pick(event);
        if (target?.kind === 'report') {
          tvPress = { x: event.clientX, y: event.clientY };
          renderer.domElement.setPointerCapture(event.pointerId);
          return;
        }
        if (target?.kind === 'seat') callbacks.current.onSelect(target.seat.id);
        setView();
        return;
      }
      stopTour(true);
      stopPan();
      lastHoverId = undefined;
      callbacks.current.onHover();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      targetPosition.copy(camera.position);
      targetLook.copy(look);
      drag = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, button: event.button, moved: false };
      renderer.domElement.style.cursor = 'grabbing';
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (tvPress) return;
      if (drag) {
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) drag.moved = true;
        drag.x = event.clientX; drag.y = event.clientY;
        if (!state.current.firstPerson) {
          if (drag.button === 2 || event.shiftKey) {
            const scale = orbit.radius * .00065;
            orbit.target.x -= dx * scale;
            orbit.target.y = THREE.MathUtils.clamp(orbit.target.y + dy * scale, -.2, 2.8);
          } else {
            orbit.azimuth -= dx * .0025;
            orbit.elevation = THREE.MathUtils.clamp(orbit.elevation + dy * .0025, .18, 1.45);
            if (Math.abs(dx) > .1) tourDirection = dx < 0 ? 1 : -1;
          }
          targetPosition.copy(overviewPosition().add(orbit.target)); targetLook.copy(orbit.target);
          startPan();
        } else {
          targetLook.copy(seatLookAfterDrag(camera.position, targetLook, dx, dy));
          if (Math.abs(dx) > .1) tourDirection = dx < 0 ? 1 : -1;
          startPan();
        }
      } else {
        const target = pick(event);
        const seat = target?.kind === 'seat' ? target.seat : undefined;
        renderer.domElement.style.cursor = target ? 'pointer' : 'grab';
        if (seat?.id !== lastHoverId) {
          lastHoverId = seat?.id;
          callbacks.current.onHover(seat?.id, seat ? { x: event.clientX, y: event.clientY } : undefined);
        }
      }
    };
    const up = (event: PointerEvent) => {
      if (tvPress) {
        const clicked = Math.hypot(event.clientX - tvPress.x, event.clientY - tvPress.y) < 6;
        tvPress = null;
        if (clicked) callbacks.current.onOpenReport();
        return;
      }
      if (drag && !drag.moved) {
        const target = pick(event);
        if (target?.kind === 'report') callbacks.current.onOpenReport();
        else if (target?.kind === 'seat') { lastHoverId = undefined; callbacks.current.onSelect(target.seat.id); }
      }
      if (drag) resumeTourSoon();
      drag = null;
      renderer.domElement.style.cursor = 'grab';
    };
    const cancel = () => { tvPress = null; if (drag) resumeTourSoon(); drag = null; renderer.domElement.style.cursor = 'grab'; };
    const leave = () => { lastHoverId = undefined; callbacks.current.onHover(); if (!drag) renderer.domElement.style.cursor = 'grab'; };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (introActive) {
        setView();
        camera.fov = seatFovAfterWheel(camera.fov, event.deltaY);
        camera.updateProjectionMatrix();
        return;
      }
      stopTour(true);
      stopPan();
      if (state.current.firstPerson) {
        camera.fov = seatFovAfterWheel(camera.fov, event.deltaY);
        camera.updateProjectionMatrix();
      } else {
        orbit.radius = THREE.MathUtils.clamp(orbit.radius * (1 + Math.sign(event.deltaY) * .085), 4, 28);
        targetPosition.copy(overviewPosition().add(orbit.target));
        camera.position.copy(targetPosition);
        camera.lookAt(orbit.target);
      }
      resumeTourSoon();
      invalidate();
    };
    const context = (e: Event) => e.preventDefault();
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointercancel', cancel);
    renderer.domElement.addEventListener('pointerleave', leave);
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', context);
    const resize = () => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); invalidate(); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    if (playIntro) {
      shellSurfaces.forEach(surface => { surface.visible = false; });
      introRaf = requestAnimationFrame(introFrame);
    } else {
      setView();
    }
    return () => {
      lastCamera.current = { position: camera.position.clone(), look: look.clone(), fov: camera.fov };
      updateView.current = null; updateColors.current = null; updateScreen.current = null; observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
      stopPan();
      stopIntro();
      stopTour();
      renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('pointercancel', cancel); renderer.domElement.removeEventListener('pointerleave', leave); renderer.domElement.removeEventListener('wheel', wheel); renderer.domElement.removeEventListener('contextmenu', context);
      scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); if (object instanceof THREE.InstancedMesh) object.dispose(); } else if (object instanceof THREE.Sprite) object.material.dispose(); });
      boardTexture.dispose(); stoneTexture?.dispose(); carpetTexture?.dispose(); renderer.dispose(); labelLayer.remove(); renderer.domElement.remove();
    };
  }, [room, isDark]);
  return <div ref={host} style={{ width: '100%', height: '100%', touchAction: 'none' }} aria-label="Interactive 3D boardroom" />;
}
