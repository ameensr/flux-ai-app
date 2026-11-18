import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Room } from './seatModel';
import { drawReportHeroScreen, type ReportHeroScreenData } from './reportHeroScreen';
import { hallTourPose, seatFovAfterWheel, seatLookAfterDrag } from './cameraControls';
import styles from './CinematicBoardroomIntro.module.css';

function surfaceTexture(kind: 'wood' | 'carpet') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const image = context.createImageData(256, 256);
  let seed = kind === 'wood' ? 14917 : 4819;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (y * 256 + x) * 4;
    const noise = random() - .5;
    if (kind === 'wood') {
      const grain = Math.sin(x * .22 + Math.sin(y * .045) * 3) * 9 + Math.sin(x * .61 + y * .012) * 3;
      const value = grain + noise * 11;
      image.data[i] = 99 + value;
      image.data[i + 1] = 67 + value * .8;
      image.data[i + 2] = 45 + value * .62;
    } else {
      const fleck = noise * 18 + Math.sin(x * .7 + y * .42) * 2;
      image.data[i] = 39 + fleck;
      image.data[i + 1] = 36 + fleck;
      image.data[i + 2] = 35 + fleck;
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
  onHover: (id?: string, point?: { x: number; y: number }) => void;
  onFailure: () => void;
}

export default function BoardroomScene({ room, selectedId, hoveredId, recommendedIds, firstPerson, resetKey, isDark, screenData, onSelect, onHover, onFailure }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSelect, onHover, onFailure });
  callbacks.current = { onSelect, onHover, onFailure };
  const state = useRef({ selectedId, hoveredId, recommendedIds, firstPerson, resetKey });
  state.current = { selectedId, hoveredId, recommendedIds, firstPerson, resetKey };
  const updateView = useRef<(() => void) | null>(null);
  const updateColors = useRef<(() => void) | null>(null);

  useEffect(() => { updateView.current?.(); }, [selectedId, firstPerson, resetKey]);
  useEffect(() => { updateColors.current?.(); }, [selectedId, hoveredId, recommendedIds, firstPerson]);

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
    scene.background = new THREE.Color('#15110f');
    const camera = new THREE.PerspectiveCamera(firstPerson ? 66 : 52, 1, .06, 80);
    const initialRadius = Math.max(9, room.length * 1.5);
    const orbit = { azimuth: 0, elevation: .72, radius: initialRadius, target: new THREE.Vector3(0, .7, 0) };
    const overviewPosition = () => new THREE.Vector3(orbit.radius * Math.sin(orbit.azimuth) * Math.cos(orbit.elevation), orbit.radius * Math.sin(orbit.elevation), orbit.radius * Math.cos(orbit.azimuth) * Math.cos(orbit.elevation));
    const initialSeat = room.seats.find(s => s.id === selectedId) ?? room.viewSeat;
    const initialLook = firstPerson && initialSeat
      ? new THREE.Vector3(...(initialSeat.side === 'head' ? [0, 1.2, 0] as [number, number, number] : room.focal))
      : orbit.target.clone();
    camera.position.copy(firstPerson && initialSeat ? new THREE.Vector3(initialSeat.x, 1.22, initialSeat.z) : overviewPosition().add(orbit.target));
    camera.lookAt(initialLook);
    const look = initialLook.clone();
    const targetPosition = new THREE.Vector3();
    const targetLook = new THREE.Vector3();
    const shellSurfaces: THREE.Object3D[] = [];
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
    let previousFrame = 0;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let tourRaf = 0;
    let tourLastFrame = 0;
    let tourElapsed = 0;
    let tourLastRender = 0;
    let tourAllowed = !state.current.firstPerson;
    const stopTour = (manual = false) => {
      if (tourRaf) cancelAnimationFrame(tourRaf);
      tourRaf = 0;
      tourLastFrame = 0;
      if (manual) tourAllowed = false;
    };
    const tour = (now: number) => {
      tourRaf = 0;
      if (!tourAllowed || state.current.firstPerson) return;
      const dt = tourLastFrame ? Math.min(.05, (now - tourLastFrame) / 1000) : 0;
      tourLastFrame = now;
      tourElapsed += dt;
      // Sweep across the meeting side of the table so the presentation remains in view.
      const pose = hallTourPose(tourElapsed, initialRadius);
      orbit.azimuth = pose.azimuth;
      orbit.elevation = pose.elevation;
      orbit.radius = pose.radius;
      targetPosition.copy(overviewPosition().add(orbit.target));
      targetLook.copy(orbit.target);
      camera.position.copy(targetPosition);
      look.copy(targetLook);
      camera.lookAt(look);
      if (now - tourLastRender >= 1000 / 30) {
        renderer.render(scene, camera);
        publishLabels();
        tourLastRender = now;
      }
      tourRaf = requestAnimationFrame(tour);
    };
    const startTour = () => {
      if (!tourAllowed || state.current.firstPerson || tourRaf) return false;
      tourLastFrame = 0;
      tourLastRender = 0;
      tourRaf = requestAnimationFrame(tour);
      return true;
    };
    const render = () => { raf = 0; renderer.render(scene, camera); publishLabels(); };
    const invalidate = () => { if (!raf) raf = requestAnimationFrame(render); };
    const animate = (now: number) => {
      raf = 0;
      const dt = previousFrame ? Math.min(.05, (now - previousFrame) / 1000) : 1 / 60;
      previousFrame = now;
      const alpha = 1 - Math.exp(-9 * dt);
      camera.position.lerp(targetPosition, alpha);
      look.lerp(targetLook, alpha);
      camera.lookAt(look);
      renderer.render(scene, camera);
      publishLabels();
      if (camera.position.distanceTo(targetPosition) > .012 || look.distanceTo(targetLook) > .012) raf = requestAnimationFrame(animate);
      else { camera.position.copy(targetPosition); look.copy(targetLook); camera.lookAt(look); if (!startTour()) invalidate(); }
    };
    const startTransition = () => { if (raf) cancelAnimationFrame(raf); previousFrame = 0; raf = requestAnimationFrame(animate); };
    let previousResetKey = state.current.resetKey;
    let previousFirstPerson = state.current.firstPerson;
    const setView = () => {
      const current = state.current;
      stopTour();
      tourAllowed = !current.firstPerson;
      if (!current.firstPerson && previousFirstPerson) {
        orbit.azimuth = 0; orbit.elevation = .72; orbit.radius = initialRadius; orbit.target.set(0, .7, 0);
        tourElapsed = 0;
      }
      previousFirstPerson = current.firstPerson;
      shellSurfaces.forEach(surface => { surface.visible = current.firstPerson; });
      camera.fov = current.firstPerson ? 66 : 52;
      camera.updateProjectionMatrix();
      if (current.resetKey !== previousResetKey) {
        previousResetKey = current.resetKey;
        orbit.azimuth = 0; orbit.elevation = .72; orbit.radius = initialRadius; orbit.target.set(0, .7, 0);
      }
      const seat = room.seats.find(s => s.id === current.selectedId) ?? room.viewSeat;
      if (current.firstPerson && seat) {
        targetPosition.set(seat.x, 1.22, seat.z);
        targetLook.set(...(seat.side === 'head' ? [0, 1.2, 0] as [number, number, number] : room.focal));
      } else {
        targetPosition.copy(overviewPosition().add(orbit.target)); targetLook.copy(orbit.target);
      }
      if (reducedMotion) {
        camera.position.copy(targetPosition); look.copy(targetLook); camera.lookAt(look);
        if (!startTour()) invalidate();
      } else startTransition();
    };
    updateView.current = setView;

    const mat = (color: string, roughness = .8, metalness = .05) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const woodTexture = surfaceTexture('wood');
    const carpetTexture = surfaceTexture('carpet');
    const wallMat = mat('#27201d', .95);
    const wood = new THREE.MeshStandardMaterial({ color: '#ffffff', map: woodTexture ?? undefined, roughness: .48, metalness: .05 });
    const edge = mat('#8b714d', .38, .55);
    const dark = mat('#181b1e', .74);
    const screen = new THREE.MeshBasicMaterial({ color: '#112b35' });
    const screenEdge = mat('#090d0f', .27, .48);
    const roomWidth = Math.max(9, room.width + 6.8), roomLength = room.length + 4.4;
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
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(room.width + .8, room.length + .7), new THREE.MeshBasicMaterial({ color: '#08090a', transparent: true, opacity: .31, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.009; scene.add(shadow);
    box(roomWidth, 3.5, .12, wallMat, 0, 1.7, -roomLength / 2);
    shellSurfaces.push(box(.12, 3.5, roomLength, wallMat, -roomWidth / 2, 1.7, 0));
    shellSurfaces.push(box(.12, 3.5, roomLength, wallMat, roomWidth / 2, 1.7, 0));
    shellSurfaces.push(box(roomWidth, .12, roomLength, mat('#171413'), 0, 3.5, 0));
    shellSurfaces.push(box(roomWidth, 3.5, .12, wallMat, 0, 1.7, roomLength / 2));
    roundBox(room.width + .14, .13, room.length + .14, .09, edge, 0, .71, 0);
    roundBox(room.width, .085, room.length, .07, wood, 0, .79, 0);
    roundBox(.48, .64, room.length * .68, .08, dark, 0, .35, 0);
    const brass = mat('#c5a574', .34, .68);
    box(.025, .008, room.length - .28, brass, -room.width / 2 + .13, .811, 0);
    box(.025, .008, room.length - .28, brass, room.width / 2 - .13, .811, 0);
    box(room.width - .3, .008, .025, brass, 0, .811, -room.length / 2 + .13);
    box(room.width - .3, .008, .025, brass, 0, .811, room.length / 2 - .13);
    roundBox(.55, .012, room.length - .58, .008, mat('#292321', .9), 0, .838, 0);
    const brushedMetal = mat('#7a7770', .31, .82);
    const insetDark = mat('#121618', .45, .35);
    for (const z of [-room.length * .31, room.length * .31]) {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .012, 24), brushedMetal);
      rim.position.set(0, .85, z); scene.add(rim);
      const center = new THREE.Mesh(new THREE.CylinderGeometry(.125, .125, .014, 24), insetDark);
      center.position.set(0, .859, z); scene.add(center);
    }
    for (const x of [-room.width / 2 + .12, room.width / 2 - .12])
      box(.018, .018, room.length - .4, mat('#664927', .32, .35), x, .65, 0);
    box(6.55, 2.48, .08, screenEdge, 0, 1.84, -roomLength / 2 + .18);
    box(6.34, 2.28, .09, screen, 0, 1.84, -roomLength / 2 + .25);
    // Presentation board content remains legible from every seat.
    const boardCanvas = document.createElement('canvas');
    drawReportHeroScreen(boardCanvas, screenData, isDark);
    const boardTexture = new THREE.CanvasTexture(boardCanvas);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 2.24), new THREE.MeshBasicMaterial({ map: boardTexture }));
    board.position.set(0, 1.84, -roomLength / 2 + .305); scene.add(board);
    // Fluted acoustic panels, brass reveals and warm fixtures keep the room detailed at seat height.
    const panel = mat('#352723', .91);
    const slat = mat('#49352b', .78);
    const trim = mat('#705a3e', .48, .42);
    const sconce = new THREE.MeshBasicMaterial({ color: '#eac38a' });
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
    const ceilingLight = new THREE.MeshBasicMaterial({ color: '#ead2a8' });
    const ceilingDark = mat('#111315', .7);
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
    scene.add(new THREE.HemisphereLight('#e7d6c0', '#363036', 1.15));
    const key = new THREE.DirectionalLight('#ffdfb3', 2.1); key.position.set(-3, 6, 3); scene.add(key);
    const fill = new THREE.DirectionalLight('#95aebd', .66); fill.position.set(3, 4, -4); scene.add(fill);
    for (const z of [-room.length / 3, room.length / 3]) {
      const pool = new THREE.PointLight('#f7c98d', 5, 5.5, 2);
      pool.position.set(0, 2.9, z);
      scene.add(pool);
    }

    const chairGeometry = new RoundedBoxGeometry(.68, .14, .64, 3, .06);
    const backGeometry = new RoundedBoxGeometry(.7, .8, .13, 3, .06);
    const armGeometry = new RoundedBoxGeometry(.12, .14, .53, 2, .045);
    const seatMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .82 });
    const backMaterial = mat('#302a29', .83);
    const backInsetMaterial = mat('#4c3a35', .91);
    const bases = new THREE.InstancedMesh(chairGeometry, seatMaterial, room.seats.length);
    const backs = new THREE.InstancedMesh(backGeometry, backMaterial, room.seats.length);
    const backInsets = new THREE.InstancedMesh(new RoundedBoxGeometry(.58, .66, .015, 2, .014), backInsetMaterial, room.seats.length);
    const arms = new THREE.InstancedMesh(armGeometry, backMaterial, room.seats.length * 2);
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.055, .1, .48, 8), mat('#52575a', .38, .7), room.seats.length);
    const chairShadows = new THREE.InstancedMesh(new THREE.CircleGeometry(.48, 12), new THREE.MeshBasicMaterial({ color: '#090a0c', transparent: true, opacity: .34, depthWrite: false }), room.seats.length);
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
    const shirtColors = ['#253a4d', '#594137', '#284b42', '#786849', '#443b54', '#a7a29a'];
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
        const coatColor = new THREE.Color(seat.side === 'foot' ? '#8c7158' : shirtColors[i % shirtColors.length]);
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
      const nextHidden = state.current.firstPerson ? state.current.selectedId : undefined;
      if (hiddenPersonId !== nextHidden) {
        if (hiddenPersonId) showPerson(hiddenPersonId, true);
        if (nextHidden) showPerson(nextHidden, false);
        hiddenPersonId = nextHidden;
      }
      room.seats.forEach((seat, i) => {
        const s = state.current;
        const color = seat.id === s.selectedId ? '#b39a73' : s.recommendedIds.includes(seat.id) ? '#79cdae' : seat.id === s.hoveredId ? '#9caeac' : seat.reserved ? '#725d69' : '#4c3a35';
        bases.setColorAt(i, new THREE.Color(color));
      });
      if (bases.instanceColor) bases.instanceColor.needsUpdate = true;
      invalidate();
    };
    updateColors.current = colors; colors();
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
    let lastHoverId: string | undefined;
    const pick = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([bases, backs])[0];
      return hit?.instanceId === undefined ? undefined : room.seats[hit.instanceId];
    };
    let drag: { x: number; y: number; button: number; moved: boolean } | null = null;
    const down = (event: PointerEvent) => {
      if (!state.current.firstPerson) stopTour(true);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      targetPosition.copy(camera.position);
      targetLook.copy(look);
      drag = { x: event.clientX, y: event.clientY, button: event.button, moved: false };
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (drag) {
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (Math.hypot(dx, dy) > 2) drag.moved = true;
        drag.x = event.clientX; drag.y = event.clientY;
        if (!state.current.firstPerson) {
          if (drag.button === 2 || event.shiftKey) {
            const scale = orbit.radius * .0012;
            orbit.target.x -= dx * scale;
            orbit.target.y = THREE.MathUtils.clamp(orbit.target.y + dy * scale, -.2, 2.8);
          } else { orbit.azimuth -= dx * .006; orbit.elevation = THREE.MathUtils.clamp(orbit.elevation + dy * .005, .18, 1.45); }
          targetPosition.copy(overviewPosition().add(orbit.target)); targetLook.copy(orbit.target);
          camera.position.copy(targetPosition); look.copy(targetLook); camera.lookAt(look); invalidate();
        } else {
          targetLook.copy(seatLookAfterDrag(camera.position, look, dx, dy));
          look.copy(targetLook);
          camera.lookAt(look);
          invalidate();
        }
      } else {
        if (state.current.firstPerson) {
          if (lastHoverId) { lastHoverId = undefined; callbacks.current.onHover(); }
          renderer.domElement.style.cursor = 'grab';
          return;
        }
        const seat = pick(event);
        renderer.domElement.style.cursor = seat ? 'pointer' : 'grab';
        if (seat?.id !== lastHoverId) {
          lastHoverId = seat?.id;
          callbacks.current.onHover(seat?.id, seat ? { x: event.clientX, y: event.clientY } : undefined);
        }
      }
    };
    const up = (event: PointerEvent) => { if (drag && !drag.moved) { const seat = pick(event); if (seat) { lastHoverId = undefined; callbacks.current.onSelect(seat.id); } } drag = null; };
    const leave = () => { lastHoverId = undefined; callbacks.current.onHover(); };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!state.current.firstPerson) stopTour(true);
      if (state.current.firstPerson) {
        camera.fov = seatFovAfterWheel(camera.fov, event.deltaY);
        camera.updateProjectionMatrix();
      } else {
        orbit.radius = THREE.MathUtils.clamp(orbit.radius * (1 + Math.sign(event.deltaY) * .085), 4, 28);
        targetPosition.copy(overviewPosition().add(orbit.target));
        camera.position.copy(targetPosition);
        camera.lookAt(orbit.target);
      }
      invalidate();
    };
    const context = (e: Event) => e.preventDefault();
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointerleave', leave);
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', context);
    const resize = () => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); invalidate(); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize(); setView();
    return () => {
      updateView.current = null; updateColors.current = null; observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
      stopTour();
      renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('pointerleave', leave); renderer.domElement.removeEventListener('wheel', wheel); renderer.domElement.removeEventListener('contextmenu', context);
      scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); if (object instanceof THREE.InstancedMesh) object.dispose(); } else if (object instanceof THREE.Sprite) object.material.dispose(); });
      boardTexture.dispose(); woodTexture?.dispose(); carpetTexture?.dispose(); renderer.dispose(); labelLayer.remove(); renderer.domElement.remove();
    };
  }, [room, isDark, screenData]);
  return <div ref={host} style={{ width: '100%', height: '100%', touchAction: 'none' }} aria-label="Interactive 3D boardroom" />;
}
