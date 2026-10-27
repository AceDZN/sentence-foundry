import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { type Cell, type Tile, key, DIRECTIONS } from "./grid";
import type { Product } from "./semantics";
import type { Foundry } from "./simulation";
const C = {
  steel: 0x63727a,
  dark: 0x223b46,
  cobalt: 0x205e8d,
  brass: 0xd7a449,
  wood: 0x996a3e,
  wash: 0x296b9a,
  paint: 0xc87938,
  label: 0x638777,
  pack: 0x957253,
  dry: 0xc98c39,
  unpack: 0x378d89,
};
const mat = (color: number, metalness = 0.25, roughness = 0.6) =>
  new T.MeshStandardMaterial({ color, metalness, roughness });
const gridMaterials = [mat(0x737a72, 0.5, 0.65), mat(0x7d8278, 0.5, 0.65)];
const materials = {
  steel: mat(C.steel, 0.72, 0.3),
  dark: mat(C.dark, 0.5, 0.4),
  brass: mat(C.brass, 0.65, 0.4),
  wood: mat(C.wood, 0, 0.9),
  cobalt: mat(C.cobalt, 0.5, 0.4),
  black: mat(0x1c272b, 0.3, 0.65),
  paper: mat(0xfff2cc, 0, 0.8),
};
const sharedPrimitiveMaterials = new Set<T.Material>([
  ...gridMaterials,
  ...Object.values(materials),
]);
function box(
  g: T.Group,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  m: T.Material,
) {
  const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
function cylinder(
  g: T.Group,
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  m: T.Material,
  axis: "y" | "z" | "x" = "y",
) {
  const o = new T.Mesh(new T.CylinderGeometry(r, r, h, 12), m);
  if (axis === "z") o.rotation.x = Math.PI / 2;
  if (axis === "x") o.rotation.z = Math.PI / 2;
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
function textSprite(
  text: string,
  color = "#fff2d2",
  background = "#244552",
  scale = 1,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(0, 0, 512, 128, 16);
  ctx.fill();
  ctx.strokeStyle = "#c5ae73";
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 46px Arial";
  ctx.fillText(text, 256, 67);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  const o = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: true }));
  o.scale.set(scale, 0.25 * scale, 1);
  return o;
}
export class Workshop {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(39, 1, 0.1, 100);
  renderer: T.WebGLRenderer;
  controls: OrbitControls;
  tiles = new T.Group();
  products = new T.Group();
  ports = new T.Group();
  environment = new T.Group();
  fx = new T.Group();
  ray = new T.Raycaster();
  pointer = new T.Vector2();
  plane = new T.Plane(new T.Vector3(0, 1, 0), -0.08);
  ghost = new T.Group();
  focus = new T.Group();
  tileSignature = "";
  boardSignature = "";
  productSignature = "";
  models: Record<string, T.Group> = {};
  assetStatus: Record<string, string> = { washer: "loading", arm: "loading" };
  decorStatus: Record<string, string> = {
    pump: "loading",
    spotlight: "loading",
  };
  industry = new T.Group();
  mechanisms: T.Object3D[] = [];
  actuators: { pivot: T.Group; tile: Tile; restYaw: number }[] = [];
  processMechanisms: {
    tile: Tile;
    fan?: T.Group;
    heat?: T.MeshStandardMaterial;
    air?: T.Mesh[];
    jaws?: T.Group[];
    cutter?: T.Group;
  }[] = [];
  assetInfo: Record<
    string,
    { meshes: number; triangles: number; animations: number; size: number[] }
  > = {};
  sharedModelGeometries = new Set<T.BufferGeometry>();
  sharedModelMaterials = new Set<T.Material>();
  sharedModelTextures = new Set<T.Texture>();
  particles: { mesh: T.Mesh; life: number; velocity: T.Vector3 }[] = [];
  lastHistory = new Map<number, number>();
  productMeshes = new Map<string, { signature: string; group: T.Group }>();
  width = 1;
  height = 1;
  boardWidth = 9;
  boardDepth = 7;
  reduced = false;
  time = 0;
  lastPointer = { x: 0, y: 0 };
  dragStart = { x: 0, y: 0 };
  frameSamples: number[] = [];
  get resourceInfo() {
    return {
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      programs: this.renderer.info.programs?.length ?? 0,
      productGroups: this.productMeshes.size,
      particles: this.particles.length,
    };
  }
  constructor(
    public container: HTMLElement,
    public onCell: (cell: Cell) => void,
  ) {
    this.scene.background = new T.Color(0x817461);
    this.scene.fog = new T.Fog(0x817461, 26, 55);
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    const room = new RoomEnvironment();
    const pmrem = new T.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 0.38;
    room.dispose();
    pmrem.dispose();
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "שולחן בנייה: חצים למיקוד, Enter לבנייה, R לסיבוב",
    );
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 11;
    this.controls.maxDistance = 24;
    this.controls.minPolarAngle = 0.42;
    this.controls.maxPolarAngle = 1.13;
    this.controls.mouseButtons = {
      LEFT: null as unknown as T.MOUSE,
      MIDDLE: T.MOUSE.DOLLY,
      RIGHT: T.MOUSE.ROTATE,
    };
    this.controls.touches = { ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_ROTATE };
    this.camera.position.set(11, 13.7, 14.5);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.scene.add(new T.HemisphereLight(0xc8e9ef, 0x493624, 1.6));
    const sun = new T.DirectionalLight(0xffe4ad, 3.4);
    sun.position.set(-5, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    Object.assign(sun.shadow.camera, {
      left: -12,
      right: 12,
      top: 12,
      bottom: -12,
      near: 1,
      far: 35,
    });
    sun.shadow.normalBias = 0.03;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun);
    const rim = new T.DirectionalLight(0xc3e8ff, 2);
    rim.position.set(5, 7, -8);
    this.scene.add(rim);
    this.scene.add(
      this.environment,
      this.tiles,
      this.products,
      this.ports,
      this.fx,
      this.ghost,
      this.focus,
    );
    this.scene.add(this.industry);
    this.buildRoom();
    const ring = new T.Mesh(
      new T.BoxGeometry(1.13, 0.025, 1.13),
      new T.MeshBasicMaterial({
        color: 0xffce72,
        transparent: true,
        opacity: 0.28,
      }),
    );
    ring.position.y = 0.09;
    this.ghost.add(ring);
    const edges = new T.LineSegments(
      new T.EdgesGeometry(new T.BoxGeometry(1.12, 0.07, 1.12)),
      new T.LineBasicMaterial({ color: 0xffce72 }),
    );
    edges.position.y = 0.14;
    this.focus.add(edges);
    this.focus.visible = false;
    this.ghost.visible = false;
    container.addEventListener("contextmenu", (e) => e.preventDefault());
    container.addEventListener("pointerdown", (e) => {
      this.renderer.domElement.focus({ preventScroll: true });
      this.dragStart = { x: e.clientX, y: e.clientY };
    });
    container.addEventListener("pointerup", (e) => {
      if (e.button !== 0) return;
      if (
        Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y) >
        10
      )
        return;
      const cell = this.cellAt(e.clientX, e.clientY);
      if (cell) this.onCell(cell);
    });
    container.addEventListener("pointermove", (e) => {
      this.lastPointer = { x: e.clientX, y: e.clientY };
      const cell = this.cellAt(e.clientX, e.clientY);
      this.ghost.visible = !!cell;
      if (cell) this.ghost.position.copy(this.position(cell));
    });
    container.addEventListener(
      "pointerleave",
      () => (this.ghost.visible = false),
    );
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }
  position(c: Cell) {
    return new T.Vector3(
      (c.x - (this.boardWidth - 1) / 2) * 1.2,
      0,
      (c.z - (this.boardDepth - 1) / 2) * 1.2,
    );
  }
  cellAt(x: number, y: number): Cell | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((x - rect.left) / rect.width) * 2 - 1,
      (-(y - rect.top) / rect.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    const hit = new T.Vector3();
    if (!this.ray.ray.intersectPlane(this.plane, hit)) return null;
    const cell = {
      x: Math.round(hit.x / 1.2 + (this.boardWidth - 1) / 2),
      z: Math.round(hit.z / 1.2 + (this.boardDepth - 1) / 2),
    };
    return cell.x >= 0 &&
      cell.x < this.boardWidth &&
      cell.z >= 0 &&
      cell.z < this.boardDepth
      ? cell
      : null;
  }
  screen(c: Cell) {
    const p = this.position(c);
    p.y = 0.1;
    p.project(this.camera);
    return {
      x: Math.round((p.x * 0.5 + 0.5) * this.width),
      y: Math.round((-p.y * 0.5 + 0.5) * this.height),
    };
  }
  resize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    if (this.width < 700) {
      this.controls.maxDistance = 48;
      this.controls.minDistance = 25;
      this.camera.fov = 47;
      this.camera.position.set(13.5, 27, 22.5);
      this.controls.target.set(0, 0, 0);
      this.camera.setViewOffset(
        this.width,
        this.height,
        0,
        Math.round(this.height * 0.07),
        this.width,
        this.height,
      );
    } else {
      this.controls.maxDistance = 24;
      this.controls.minDistance = 11;
      this.camera.fov = 39;
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }
  resetCamera() {
    this.camera.position.set(
      ...((this.width < 700 ? [13.5, 27, 22.5] : [11, 13.7, 14.5]) as [
        number,
        number,
        number,
      ]),
    );
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }
  buildRoom() {
    const woodCanvas = document.createElement("canvas");
    woodCanvas.width = 512;
    woodCanvas.height = 512;
    const ctx = woodCanvas.getContext("2d")!;
    ctx.fillStyle = "#875e3d";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 100; i++) {
      ctx.strokeStyle = `rgba(55,27,10,${0.025 + (i % 4) * 0.015})`;
      ctx.lineWidth = 1 + (i % 4);
      ctx.beginPath();
      ctx.moveTo(0, i * 5);
      ctx.bezierCurveTo(
        150,
        i * 5 + Math.sin(i) * 6,
        330,
        i * 5 - 3,
        512,
        i * 5,
      );
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = "#6d4e32";
      ctx.fillRect(0, i * 94, 512, 3);
    }
    const texture = new T.CanvasTexture(woodCanvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(3, 2);
    const wood = new T.MeshStandardMaterial({ map: texture, roughness: 0.85 });
    box(this.environment, 14.4, 0.5, 11.5, 0, -0.42, 0, wood);
    box(this.environment, 14.55, 0.13, 11.65, 0, -0.69, 0, materials.dark);
    for (const x of [-6.9, 6.9])
      for (const z of [-5.4, 5.4]) {
        cylinder(this.environment, 0.11, 0.1, x, -0.11, z, materials.brass);
        box(this.environment, 0.7, 0.19, 0.7, x, -0.21, z, materials.brass);
      }
    box(this.environment, 60, 0.2, 60, 0, -2.7, 0, mat(0x75664f, 0, 1));
    for (const x of [-6.2, 6.2])
      for (const z of [-4.8, 4.8])
        box(this.environment, 0.4, 2, 0.4, x, -1.65, z, materials.dark);
    // Industrial room surrounds the original workbench, leaving the build grid
    // and both feed/dispatch routes completely open.
    const wall = mat(0x636e6b, 0.32, 0.85);
    const trim = mat(0x35494c, 0.6, 0.6);
    const windowGlass = new T.MeshStandardMaterial({
      color: 0xa6c3c6,
      emissive: 0x718f94,
      emissiveIntensity: 0.3,
      roughness: 0.55,
    });
    box(this.environment, 26, 9, 0.3, 0, 1.8, -10.1, wall);
    box(this.environment, 26, 1.6, 0.12, 0, -1.85, -9.86, trim);
    for (let x = -12; x <= 12; x += 1.5)
      box(this.environment, 0.055, 8.7, 0.12, x, 1.8, -9.88, materials.steel);
    for (const x of [-8.5, -3, 3, 8.5]) {
      box(this.environment, 3.7, 2.25, 0.1, x, 3.25, -9.83, trim);
      box(this.environment, 3.4, 1.96, 0.08, x, 3.25, -9.75, windowGlass);
      box(this.environment, 0.075, 2, 0.06, x, 3.25, -9.66, materials.steel);
      box(this.environment, 3.5, 0.075, 0.06, x, 3.25, -9.65, materials.steel);
    }
    cylinder(this.environment, 0.15, 23, 0, 5, -9.5, materials.steel, "x");
    for (const x of [-10.6, 10.6]) {
      cylinder(this.environment, 0.15, 6.7, x, 1.5, -9.46, materials.steel);
      for (const y of [-0.8, 1.3, 3.5]) {
        cylinder(this.environment, 0.24, 0.12, x, y, -9.46, materials.brass);
        cylinder(
          this.environment,
          0.055,
          0.5,
          x,
          y,
          -9.12,
          materials.dark,
          "z",
        );
        const valve = new T.Mesh(
          new T.TorusGeometry(0.24, 0.038, 6, 16),
          materials.brass,
        );
        valve.position.set(x, y, -8.87);
        this.environment.add(valve);
      }
    }
    box(this.environment, 25, 0.36, 0.42, 0, 5.9, -8.3, trim);
    for (const x of [-6.3, 6.3]) {
      cylinder(this.environment, 0.035, 1.4, x, 5.15, -7.6, materials.dark);
      const shade = new T.Mesh(
        new T.ConeGeometry(0.48, 0.35, 18, 1, true),
        materials.dark,
      );
      shade.position.set(x, 4.35, -7.6);
      this.environment.add(shade);
      const bulb = new T.Mesh(
        new T.SphereGeometry(0.14, 10, 8),
        new T.MeshBasicMaterial({ color: 0xffdc8e }),
      );
      bulb.position.set(x, 4.2, -7.6);
      this.environment.add(bulb);
    }
    // Back rail, tactile tool board, spare rollers and two warm work lamps.
    box(this.environment, 14, 0.18, 0.22, 0, 0.1, -5.5, materials.dark);
    box(this.environment, 9, 3.6, 0.18, 0, 1.2, -6.5, mat(0x8b6e4a, 0, 0.9));
    for (let i = 0; i < 19; i++)
      for (let j = 0; j < 6; j++)
        cylinder(
          this.environment,
          0.025,
          0.06,
          -4.2 + i * 0.47,
          0.05 + j * 0.46,
          -6.37,
          materials.dark,
          "z",
        );
    for (let i = 0; i < 8; i++) {
      const x = -3.4 + i * 0.95;
      box(
        this.environment,
        0.12,
        0.75,
        0.12,
        x,
        0.8 + (i % 2) * 0.4,
        -6.17,
        materials.steel,
      );
      cylinder(
        this.environment,
        0.12,
        0.08,
        x,
        1.2 + (i % 2) * 0.4,
        -6.17,
        materials.brass,
        "z",
      );
    }
    for (const x of [-6.4, 6.4]) {
      cylinder(this.environment, 0.3, 0.1, x, -0.07, -4.7, materials.dark);
      cylinder(this.environment, 0.055, 2.3, x, 1, -4.7, materials.brass);
      const shade = new T.Mesh(
        new T.ConeGeometry(0.55, 0.5, 20, 1, true),
        materials.dark,
      );
      shade.position.set(x, 2.2, -4.7);
      shade.rotation.x = Math.PI;
      shade.castShadow = true;
      this.environment.add(shade);
      const light = new T.PointLight(0xffc365, 11, 9, 2);
      light.position.set(x, 1.9, -4.7);
      this.environment.add(light);
    }
    for (let i = 0; i < 4; i++)
      cylinder(
        this.environment,
        0.12,
        0.75,
        -5.6 + i * 0.31,
        -0.02,
        5.1,
        materials.steel,
        "z",
      );
    const plaqueLabel = textSprite("SENTENCE FOUNDRY", "#ffe8b7", "#254552", 3);
    // A mounted sign stays parallel to the pegboard; a billboard would cut into it.
    const plaque = new T.Mesh(
      new T.PlaneGeometry(3, 0.75),
      new T.MeshBasicMaterial({
        map: (plaqueLabel.material as T.SpriteMaterial).map,
        side: T.DoubleSide,
      }),
    );
    plaqueLabel.material.dispose();
    plaque.position.set(0, 2.5, -6.25);
    this.environment.add(plaque);
    this.batch(this.environment);
  }
  batch(root: T.Group) {
    root.updateWorldMatrix(true, true);
    const groups = new Map<
      string,
      {
        material: T.Material;
        geometries: T.BufferGeometry[];
        objects: T.Mesh[];
      }
    >();
    const inv = root.matrixWorld.clone().invert();
    root.traverse((o) => {
      if (
        !(o instanceof T.Mesh) ||
        Array.isArray(o.material) ||
        o.userData.kind
      )
        return;
      const geo = o.geometry.clone();
      for (const name of Object.keys(geo.attributes))
        if (!["position", "normal", "uv"].includes(name))
          geo.deleteAttribute(name);
      if (!geo.getAttribute("normal")) geo.computeVertexNormals();
      const id =
        o.material.uuid +
        Object.keys(geo.attributes).sort().join(",") +
        !!geo.index;
      let entry = groups.get(id);
      if (!entry) {
        entry = { material: o.material, geometries: [], objects: [] };
        groups.set(id, entry);
      }
      geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      entry.geometries.push(geo);
      entry.objects.push(o);
    });
    for (const entry of groups.values()) {
      if (entry.geometries.length < 2) {
        entry.geometries.forEach((g) => g.dispose());
        continue;
      }
      const merged = mergeGeometries(entry.geometries);
      if (merged) {
        const originals = new Set(entry.objects.map((o) => o.geometry));
        for (const geometry of originals)
          if (!this.sharedModelGeometries.has(geometry)) geometry.dispose();
        entry.objects.forEach((o) => o.removeFromParent());
        const mesh = new T.Mesh(merged, entry.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
      }
      entry.geometries.forEach((g) => g.dispose());
    }
  }
  rememberModelResources(model: T.Object3D) {
    model.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      this.sharedModelGeometries.add(o.geometry);
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        this.sharedModelMaterials.add(material);
        for (const value of Object.values(material))
          if (value instanceof T.Texture) this.sharedModelTextures.add(value);
      }
    });
  }
  releaseResources(root: T.Object3D) {
    const geometries = new Set<T.BufferGeometry>();
    const ownedMaterials = new Set<T.Material>();
    const textures = new Set<T.Texture>();
    root.traverse((o) => {
      if (!(o instanceof T.Mesh) && !(o instanceof T.Sprite)) return;
      // Sprite's unit quad is shared by Three itself. GLB clones also borrow
      // their original geometry; neither buffer belongs to a transient group.
      if (o instanceof T.Mesh && !this.sharedModelGeometries.has(o.geometry))
        geometries.add(o.geometry);
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        if (sharedPrimitiveMaterials.has(material) || this.sharedModelMaterials.has(material))
          continue;
        ownedMaterials.add(material);
        for (const value of Object.values(material))
          if (value instanceof T.Texture && !this.sharedModelTextures.has(value))
            textures.add(value);
      }
    });
    textures.forEach((texture) => texture.dispose());
    ownedMaterials.forEach((material) => material.dispose());
    geometries.forEach((geometry) => geometry.dispose());
  }
  async loadModels() {
    const loader = new GLTFLoader();
    await Promise.allSettled(
      [
        ["washer", "washer.glb"],
        ["arm", "service-arm.glb"],
      ].map(async ([id, file]) => {
        try {
          const gltf = await loader.loadAsync(
            `${import.meta.env.BASE_URL}models/${file}`,
          );
          const model = gltf.scene;
          this.rememberModelResources(model);
          model.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          const bounds = new T.Box3().setFromObject(model),
            size = bounds.getSize(new T.Vector3()),
            center = bounds.getCenter(new T.Vector3());
          const wrapper = new T.Group();
          model.position.sub(center);
          model.position.y += size.y / 2;
          wrapper.add(model);
          wrapper.scale.setScalar(1 / Math.max(size.x, size.z, size.y * 0.72));
          let meshes = 0,
            triangles = 0;
          model.traverse((o) => {
            if (o instanceof T.Mesh) {
              meshes++;
              triangles +=
                (o.geometry.index?.count ??
                  o.geometry.getAttribute("position").count) / 3;
            }
          });
          this.assetInfo[id] = {
            meshes,
            triangles,
            animations: gltf.animations.length,
            size: size.toArray(),
          };
          this.models[id] = wrapper;
          this.assetStatus[id] = "ready";
        } catch (e) {
          this.assetStatus[id] = "missing";
          console.warn(`Local Tripo ${id} asset unavailable`, e);
        }
      }),
    );
    this.tileSignature = "";
    await this.loadIndustry(loader);
  }
  async loadIndustry(loader: GLTFLoader) {
    await Promise.allSettled(
      ["pump", "spotlight"].map(async (id) => {
        try {
          const gltf = await loader.loadAsync(
            `${import.meta.env.BASE_URL}models/decor/${id}.glb`,
          );
          const model = gltf.scene;
          this.rememberModelResources(model);
          const bounds = new T.Box3().setFromObject(model);
          const center = bounds.getCenter(new T.Vector3());
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= bounds.min.y;
          model.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          const mount = new T.Group();
          mount.add(model);
          if (id === "pump") {
            mount.scale.setScalar(2.15);
            mount.position.set(-2.8, -0.12, -4.8);
            mount.rotation.y = 0.25;
            this.industry.add(mount);
          } else {
            mount.scale.setScalar(1.35);
            mount.position.set(6.05, -0.12, -4.3);
            mount.rotation.y = -0.8;
            this.industry.add(mount);
            const second = mount.clone(true);
            second.position.set(-6.1, -0.12, 4.5);
            second.rotation.y = 1.8;
            this.industry.add(second);
          }
          this.decorStatus[id] = "ready";
        } catch (e) {
          this.decorStatus[id] = "missing";
          console.warn(`Industrial prop ${id} unavailable`, e);
        }
      }),
    );
    this.batch(this.industry);
  }
  belt(group: T.Group, corner = false, flip = false) {
    if (corner) {
      const inlet = flip ? -0.5 : 0.5;
      box(group, 1.1, 0.13, 1.1, 0, 0.18, 0, materials.steel);
      box(group, 1.02, 0.07, 1.02, 0, 0.28, 0, materials.black);
      for (let i = 0; i < 3; i++) {
        cylinder(
          group,
          0.058,
          0.62,
          0.1 + i * 0.17,
          0.32,
          0,
          materials.dark,
          "z",
        );
        cylinder(
          group,
          0.058,
          0.62,
          0,
          0.32,
          inlet * (0.2 + i * 0.34),
          materials.dark,
          "x",
        );
      }
      for (const x of [-0.44, 0.44])
        for (const z of [-0.44, 0.44]) {
          box(group, 0.14, 0.19, 0.14, x, 0.26, z, materials.brass);
          cylinder(group, 0.035, 0.04, x, 0.37, z, materials.steel);
        }
      box(group, 0.58, 0.05, 0.055, 0.25, 0.39, -inlet * 0.85, materials.steel);
      box(group, 0.055, 0.05, 0.58, -0.39, 0.39, inlet * 0.5, materials.steel);
    } else {
      box(group, 1.1, 0.13, 0.87, 0, 0.18, 0, materials.steel);
      box(group, 1.05, 0.07, 0.74, 0, 0.28, 0, materials.black);
      for (let i = 0; i < 6; i++)
        cylinder(
          group,
          0.058,
          0.75,
          -0.44 + i * 0.175,
          0.31,
          0,
          materials.dark,
          "z",
        );
      for (const z of [-0.43, 0.43]) {
        box(group, 1.12, 0.12, 0.055, 0, 0.35, z, materials.steel);
        for (const x of [-0.43, 0.43]) {
          box(group, 0.16, 0.18, 0.16, x, 0.24, z, materials.brass);
          cylinder(group, 0.04, 0.035, x, 0.35, z, materials.steel);
        }
      }
    }
    for (const x of [-0.4, 0.4])
      for (const z of [-0.3, 0.3])
        box(group, 0.08, 0.25, 0.08, x, 0.03, z, materials.dark);
    const arrow = new T.Shape();
    arrow.moveTo(0.21, 0);
    arrow.lineTo(-0.08, 0.13);
    arrow.lineTo(-0.08, 0.05);
    arrow.lineTo(-0.27, 0.05);
    arrow.lineTo(-0.27, -0.05);
    arrow.lineTo(-0.08, -0.05);
    arrow.lineTo(-0.08, -0.13);
    arrow.closePath();
    const mesh = new T.Mesh(
      new T.ShapeGeometry(arrow),
      new T.MeshBasicMaterial({ color: 0xf1dfb1, side: T.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0.1, 0.38, 0);
    group.add(mesh);
    if (corner) {
      const path = new T.LineCurve3(
        new T.Vector3(0, 0.39, flip ? -0.52 : 0.52),
        new T.Vector3(0, 0.39, 0),
      );
      group.add(
        new T.Mesh(
          new T.TubeGeometry(path, 1, 0.025, 6, false),
          materials.brass,
        ),
      );
      box(group, 0.6, 0.02, 0.08, 0.25, 0.39, 0, materials.brass);
    }
  }
  machine(group: T.Group, tile: Tile) {
    const kind = tile.kind;
    if (kind === "belt" || kind === "corner") return;
    const color = mat(C[kind], 0.5, 0.4);
    const model = this.models[kind === "wash" ? "washer" : "arm"];
    if ((kind === "wash" || kind === "paint") && model) {
      const clone = model.clone(true);
      clone.scale.multiplyScalar(kind === "wash" ? 0.98 : 0.85);
      // Mount bulky generated bodies above the legal conveyor volume. Their
      // decorative gauges/base must never intersect a travelling workpiece.
      clone.position.set(0, kind === "wash" ? 1.12 : 1.04, -0.55);
      for (const x of [-0.35, 0.35]) {
        box(group, 0.09, 1.12, 0.09, x, 0.62, -0.55, materials.steel);
        box(group, 0.19, 0.1, 0.23, x, 0.13, -0.55, materials.brass);
      }
      box(group, 0.86, 0.1, 0.63, 0, 1.1, -0.55, materials.dark);
      const nozzle = cylinder(group, 0.055, 0.3, 0, 1.23, 0, materials.brass);
      nozzle.userData.kind = "nozzle";
      box(group, 0.1, 0.1, 0.55, 0, 1.27, -0.23, color);
      if (kind === "paint") {
        clone.rotation.y = Math.PI / 2;
        // Preserve this rigid assembly for mechanical base swivel, not skinning.
        clone.traverse((o) => {
          if (o instanceof T.Mesh) o.userData.kind = "painter-body";
        });
        this.actuators.push({ pivot: clone, tile, restYaw: clone.rotation.y });
      }
      group.add(clone);
    } else if (kind === "wash") {
      for (const z of [-0.45, 0.45])
        box(group, 0.2, 0.95, 0.14, 0, 0.75, z, color);
      box(group, 0.4, 0.15, 1.04, 0, 1.28, 0, color);
    } else if (kind === "paint") {
      box(group, 0.34, 0.4, 0.35, 0, 0.54, -0.48, color);
      cylinder(group, 0.09, 0.65, 0, 0.97, -0.48, materials.brass);
      box(group, 0.12, 0.12, 0.64, 0, 1.25, -0.19, color);
    } else if (kind === "dry") {
      // The open hood clears the detached service arm as well as crates. All
      // added parts are authored rigid machinery; the two Tripo cores remain.
      for (const x of [-0.43, 0.43])
        for (const z of [-0.47, 0.47]) {
          box(group, 0.1, 1.23, 0.1, x, 0.91, z, materials.steel);
          box(group, 0.17, 0.1, 0.17, x, 0.34, z, color);
        }
      // Rear hood plus a narrow front rail leave the travelling item visible.
      box(group, 1.06, 0.2, 0.42, 0, 1.62, -0.3, color);
      box(group, 1.06, 0.08, 0.08, 0, 1.62, 0.47, color);
      for (const x of [-0.46, 0.46])
        box(group, 0.065, 0.08, 0.83, x, 1.62, 0.04, materials.steel);
      box(group, 0.78, 0.64, 0.16, 0, 1.2, -0.54, color);
      cylinder(group, 0.27, 0.065, 0, 1.25, -0.43, materials.dark, "z");
      const fan = new T.Group();
      fan.position.set(0, 1.25, -0.375);
      for (let i = 0; i < 4; i++) {
        const blade = box(
          fan,
          0.105,
          0.23,
          0.028,
          Math.sin((i * Math.PI) / 2) * 0.11,
          Math.cos((i * Math.PI) / 2) * 0.11,
          0,
          materials.steel,
        );
        blade.rotation.z = (-i * Math.PI) / 2 + 0.25;
        blade.userData.kind = "dryer-fan";
      }
      const hub = cylinder(fan, 0.055, 0.06, 0, 0, 0, materials.brass, "z");
      hub.userData.kind = "dryer-fan";
      group.add(fan);
      for (const x of [-0.18, 0, 0.18])
        box(group, 0.025, 0.49, 0.035, x, 1.25, -0.32, materials.dark);
      const heat = new T.MeshStandardMaterial({
        color: 0xf4b34c,
        emissive: 0xeb8c22,
        emissiveIntensity: 0.13,
        metalness: 0.5,
        roughness: 0.35,
      });
      for (let i = 0; i < 6; i++)
        cylinder(group, 0.025, 0.74, -0.36 + i * 0.144, 1.49, 0, heat, "z");
      const air: T.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const ribbon = new T.Mesh(
          new T.PlaneGeometry(0.028, 0.24),
          new T.MeshBasicMaterial({
            color: 0xffdc8d,
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
            side: T.DoubleSide,
          }),
        );
        ribbon.position.set(-0.19 + i * 0.19, 1.25, 0.18);
        ribbon.userData.kind = "dryer-air";
        ribbon.visible = false;
        group.add(ribbon);
        air.push(ribbon);
      }
      this.processMechanisms.push({ tile, fan, heat, air });
    } else if (kind === "unpack") {
      for (const z of [-0.48, 0.48]) {
        box(group, 0.2, 1.22, 0.13, -0.35, 0.92, z, color);
        box(group, 0.16, 0.11, 0.22, -0.35, 0.35, z, materials.brass);
      }
      box(group, 1.02, 0.16, 0.22, 0, 1.62, -0.41, color);
      box(group, 1.02, 0.06, 0.06, 0, 1.62, 0.42, materials.steel);
      for (const x of [-0.43, 0.43])
        box(group, 0.06, 0.08, 0.85, x, 1.62, 0.01, materials.steel);
      box(group, 0.81, 0.07, 0.12, 0, 1.5, 0, materials.steel);
      const jaws: T.Group[] = [];
      for (const side of [-1, 1]) {
        const jaw = new T.Group();
        jaw.position.set(0, 1.02, side * 0.47);
        cylinder(jaw, 0.07, 0.72, 0, 0, 0, materials.brass, "x");
        box(jaw, 0.61, 0.28, 0.06, 0, -0.1, 0, color);
        box(jaw, 0.63, 0.045, 0.09, 0, -0.25, 0, materials.steel);
        jaw.traverse((o) => {
          if (o instanceof T.Mesh) o.userData.kind = "unpacker-jaw";
        });
        group.add(jaw);
        jaws.push(jaw);
      }
      const cutter = new T.Group();
      cutter.position.set(0, 1.42, 0);
      box(cutter, 0.19, 0.12, 0.18, 0, 0, 0, materials.brass);
      const knife = new T.Mesh(
        new T.ConeGeometry(0.055, 0.13, 3),
        materials.steel,
      );
      knife.rotation.z = Math.PI;
      knife.position.y = -0.09;
      cutter.add(knife);
      cutter.traverse((o) => {
        if (o instanceof T.Mesh) o.userData.kind = "unpacker-cutter";
      });
      group.add(cutter);
      this.processMechanisms.push({ tile, jaws, cutter });
    } else {
      for (const z of [-0.42, 0.42])
        box(group, 0.2, 0.94, 0.14, 0, 0.72, z, color);
      box(group, 0.7, 0.16, 1.04, 0, 1.2, 0, color);
      const piston = cylinder(group, 0.09, 0.24, 0, 1.13, 0, materials.steel);
      piston.userData.kind = kind;
      this.mechanisms.push(piston);
      box(group, 0.5, 0.08, 0.6, 0, 1.07, 0, color);
      if (kind === "label")
        cylinder(group, 0.22, 0.55, -0.25, 1.32, -0.2, materials.paper, "z");
      else box(group, 0.55, 0.3, 0.65, -0.2, 1.38, -0.18, materials.wood);
    }
    const sign = textSprite(
      kind.toUpperCase(),
      "#fff1c8",
      `#${C[kind].toString(16)}`,
      0.9,
    );
    sign.position.set(
      0,
      kind === "wash"
        ? 2.64
        : kind === "paint" || kind === "dry" || kind === "unpack"
          ? 2.0
          : 1.57,
      -0.18,
    );
    group.add(sign);
  }
  makeProduct(product: Product) {
    const g = new T.Group();
    const color = product.painted
      ? 0x1c78b5
      : product.washed
        ? 0xc5975c
        : 0x866442;
    const cured = product.painted && product.paintCured;
    const wood = mat(
      color,
      cured ? 0.2 : 0.08,
      cured ? 0.27 : product.dried ? 0.66 : 0.8,
    );
    if (product.receiver === "service-arm" && !product.packed) {
      cylinder(g, 0.22, 0.13, 0, 0.1, 0, materials.steel);
      const model = this.models.arm;
      if (model) {
        const arm = model.clone(true);
        arm.scale.multiplyScalar(0.49);
        arm.position.y = 0.16;
        // This detached workpiece has a visible primer/paint state. The fixed
        // painter keeps the original PBR materials, so actor and receiver differ.
        arm.traverse((o) => {
          if (o instanceof T.Mesh) {
            const coat = (original: T.Material) => {
              const m = original.clone();
              if (m instanceof T.MeshStandardMaterial) {
                m.map = null;
                m.color.set(product.painted ? 0x258bd1 : 0xa9ada6);
                m.metalness = product.painted ? 0.3 : 0.65;
                m.roughness = product.painted
                  ? cured
                    ? 0.23
                    : 0.4
                  : product.dried
                    ? 0.52
                    : 0.65;
              }
              return m;
            };
            o.material = Array.isArray(o.material)
              ? o.material.map(coat)
              : coat(o.material);
          }
        });
        g.add(arm);
      } else {
        box(g, 0.17, 0.32, 0.2, 0, 0.3, 0, wood);
        box(g, 0.38, 0.13, 0.15, 0.12, 0.48, 0, wood);
      }
    } else if (product.receiver === "panel" && !product.packed) {
      box(g, 0.58, 0.09, 0.48, 0, 0.12, 0, wood);
      box(g, 0.45, 0.02, 0.35, 0, 0.18, 0, materials.steel);
    } else {
      box(
        g,
        0.56,
        0.48,
        0.52,
        0,
        0.25,
        0,
        product.packed ? mat(0xb89762, 0, 0.9) : wood,
      );
      for (const z of [-0.27, 0.27]) {
        for (const y of [0.08, 0.43]) box(g, 0.62, 0.06, 0.03, 0, y, z, wood);
        const brace = box(g, 0.64, 0.055, 0.035, 0, 0.25, z, wood);
        brace.rotation.z = 0.58;
      }
      for (const x of [-0.29, 0.29])
        for (const y of [0.08, 0.43]) box(g, 0.035, 0.06, 0.55, x, y, 0, wood);
    }
    if (
      product.labelled &&
      (!product.packed || product.labelSurface === "package")
    ) {
      const paper = box(g, 0.23, 0.2, 0.012, 0, 0.27, 0.281, materials.paper);
      const label = textSprite("SF", "#263e48", "#fff4d7", 0.22);
      label.position.set(0, 0.29, 0.3);
      g.add(label);
      if (product.labelSurface === "item" && product.packed)
        paper.visible = false;
    }
    if (product.packed) {
      box(g, 0.075, 0.51, 0.55, 0, 0.26, 0, materials.paper);
    } else if (product.dried) {
      // A small finish mark is visible after processing, never on source items.
      // Paint curing also changes the actual surface finish on crates and arms.
      const y = product.receiver === "crate" ? 0.506 : 0.2;
      for (let i = 0; i < 3; i++)
        box(g, 0.018, 0.009, 0.065, 0.16 + i * 0.028, y, 0.13, materials.brass);
    }
    return g;
  }
  sync(sim: Foundry, focusCell: Cell | null, dt: number) {
    this.time += dt;
    this.boardWidth = sim.board.width;
    this.boardDepth = sim.board.depth;
    const bs = JSON.stringify(sim.board) + JSON.stringify(this.assetStatus);
    if (bs !== this.boardSignature) {
      this.boardSignature = bs;
      this.releaseResources(this.ports);
      this.ports.clear();
      for (let x = 0; x < sim.board.width; x++)
        for (let z = 0; z < sim.board.depth; z++) {
          const g = new T.Group();
          g.position.copy(this.position({ x, z }));
          box(g, 1.17, 0.06, 1.17, 0, -0.08, 0, gridMaterials[(x + z) % 2]);
          for (const a of [-0.5, 0.5])
            for (const b of [-0.5, 0.5])
              cylinder(g, 0.025, 0.02, a, -0.04, b, materials.brass);
          this.ports.add(g);
        }
      for (const o of sim.board.obstacles) {
        const g = new T.Group();
        g.position.copy(this.position(o));
        box(g, 0.8, 0.2, 0.8, 0, 0.08, 0, materials.dark);
        cylinder(g, 0.25, 0.48, 0, 0.34, 0, materials.brass);
        this.ports.add(g);
      }
      for (const source of sim.board.sources) {
        const g = new T.Group();
        g.position.copy(this.position(source));
        box(g, 0.95, 0.2, 1.05, 0, 0.03, 0, materials.wood);
        const example = this.makeProduct({
          receiver: source.receiver,
          washed: false,
          dried: false,
          painted: false,
          paintBonded: false,
          paintCured: false,
          labelled: false,
          labelSurface: null,
          packed: false,
          history: [],
        });
        example.position.set(-0.2, 0.12, 0);
        g.add(example);
        const label = textSprite(
          source.receiver === "crate"
            ? "CRATES"
            : source.receiver === "service-arm"
              ? "SERVICE ARM"
              : "PANELS",
          "#fff0ce",
          "#395867",
          1.6,
        );
        label.position.set(
          -0.25,
          source.receiver === "service-arm" ? 1.12 : 0.8,
          0,
        );
        g.add(label);
        this.ports.add(g);
      }
      const g = new T.Group();
      g.position.copy(this.position(sim.board.exit));
      box(g, 1.1, 0.15, 1.1, 0, 0.12, 0, materials.dark);
      const sign = textSprite("DISPATCH", "#fff0c5", "#4c715a", 1.6);
      sign.position.set(0.2, 0.95, 0);
      g.add(sign);
      this.ports.add(g);
      this.batch(this.ports);
    }
    const ts =
      `${this.boardWidth},${this.boardDepth}` +
      JSON.stringify(sim.tiles) +
      JSON.stringify(this.assetStatus);
    if (ts !== this.tileSignature) {
      this.tileSignature = ts;
      this.releaseResources(this.tiles);
      this.tiles.clear();
      this.mechanisms = [];
      this.actuators = [];
      this.processMechanisms = [];
      for (const tile of sim.tiles) {
        const g = new T.Group();
        g.position.copy(this.position(tile));
        g.rotation.y = (-(tile.rotation % 4) * Math.PI) / 2;
        this.belt(g, tile.kind === "corner", tile.rotation >= 4);
        this.machine(g, tile);
        this.tiles.add(g);
      }
      this.batch(this.tiles);
      this.renderer.renderLists.dispose();
    }
    const visible = new Set<string>();
    const obtain = (id: string, product: Product) => {
      visible.add(id);
      const signature = JSON.stringify({
        ...product,
        history: undefined,
        assets: this.assetStatus,
      });
      let cached = this.productMeshes.get(id);
      if (!cached || cached.signature !== signature) {
        if (cached) {
          this.releaseResources(cached.group);
          this.products.remove(cached.group);
        }
        cached = { signature, group: this.makeProduct(product) };
        this.productMeshes.set(id, cached);
        this.products.add(cached.group);
      }
      return cached.group;
    };
    for (const p of sim.pieces) {
      const g = obtain(`p${p.id}`, p.product),
        from = this.position(p.from),
        to = this.position(p.cell);
      g.position.copy(from.lerp(to, p.progress));
      g.position.y =
        0.4 + (this.reduced ? 0 : Math.sin(this.time * 15 + p.id) * 0.006);
      const previous = this.lastHistory.get(p.id) ?? 0;
      if (p.product.history.length > previous) {
        const e = p.product.history.at(-1)!;
        if (!this.reduced) {
          this.splash(
            g.position,
            e.action === "wash"
              ? 0x99d6e6
              : e.action === "paint"
                ? 0x2783bf
                : e.action === "dry"
                  ? 0xe3ad53
                  : e.action === "unpack"
                    ? 0x61b6ad
                    : 0xffe6ac,
            e.removedLabel ? 12 : 7,
          );
          if (e.removedLabel) {
            const paper = new T.Mesh(
              new T.BoxGeometry(0.26, 0.012, 0.19),
              materials.paper,
            );
            paper.position.copy(g.position);
            paper.position.y += 0.35;
            paper.rotation.z = 0.3;
            this.fx.add(paper);
            this.particles.push({
              mesh: paper,
              life: 1.3,
              velocity: new T.Vector3(0.1, 1, 0.8),
            });
          }
        }
        this.lastHistory.set(p.id, p.product.history.length);
      }
    }
    sim.deliveries.slice(-3).forEach((d, i) => {
      const g = obtain(`d${i}`, d.product);
      g.position.copy(this.position(sim.board.exit));
      g.position.add(
        new T.Vector3(0.5 + (i % 2) * 0.55, 0.3, 0.7 + Math.floor(i / 2) * 0.6),
      );
      g.rotation.z = d.accepted ? 0 : 0.16;
    });
    for (const [id, cached] of this.productMeshes)
      if (!visible.has(id)) {
        this.releaseResources(cached.group);
        this.products.remove(cached.group);
        this.productMeshes.delete(id);
      }
    const activePieceIds = new Set(sim.pieces.map((piece) => piece.id));
    for (const id of this.lastHistory.keys())
      if (!activePieceIds.has(id)) this.lastHistory.delete(id);
    const machineryActive =
      sim.mode === "running" ||
      (sim.mode === "paused" && sim.previousMode === "running");
    for (const mech of this.mechanisms)
      mech.scale.y =
        !this.reduced && machineryActive
          ? 1 + Math.sin(this.time * 5) * 0.15
          : 1;
    for (const actuator of this.actuators) {
      const working =
        machineryActive &&
        sim.pieces.some(
          (p) =>
            key(p.cell) === key(actuator.tile) &&
            p.progress >= 1 &&
            p.dwell > 0,
        );
      actuator.pivot.rotation.y =
        actuator.restYaw +
        (!this.reduced && working ? Math.sin(this.time * 12) * 0.13 : 0);
    }
    for (const mechanism of this.processMechanisms) {
      const working =
        machineryActive &&
        sim.pieces.some(
          (p) =>
            key(p.cell) === key(mechanism.tile) && p.progress >= 1 && p.dwell > 0,
        );
      const phase = this.time * 12;
      if (mechanism.fan && working && !this.reduced)
        mechanism.fan.rotation.z += dt * 17;
      if (mechanism.heat)
        mechanism.heat.emissiveIntensity = working
          ? 0.6 + (this.reduced ? 0 : Math.sin(phase) * 0.12)
          : 0.13;
      mechanism.air?.forEach((air, i) => {
        air.visible = working;
        air.position.y =
          1.25 +
          (!this.reduced && working ? Math.sin(phase + i) * 0.045 : 0);
      });
      mechanism.jaws?.forEach((jaw, i) => {
        const side = i === 0 ? -1 : 1;
        jaw.rotation.x =
          side *
          (working
            ? 0.14 + (this.reduced ? 0 : Math.sin(phase) * 0.13)
            : 0.36);
      });
      if (mechanism.cutter)
        mechanism.cutter.position.x =
          working && !this.reduced ? Math.sin(phase) * 0.24 : 0;
    }
    this.focus.visible = !!focusCell;
    if (focusCell) this.focus.position.copy(this.position(focusCell));
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.velocity.y -= dt * 3;
      particle.mesh.scale.setScalar(Math.max(0.01, particle.life));
    }
    this.particles = this.particles.filter((p) => {
      if (p.life <= 0) {
        this.releaseResources(p.mesh);
        this.fx.remove(p.mesh);
        return false;
      }
      return true;
    });
  }
  splash(position: T.Vector3, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const mesh = new T.Mesh(
        new T.SphereGeometry(0.055, 5, 4),
        mat(color, 0.1, 0.35),
      );
      mesh.position.copy(position);
      mesh.position.y += 0.4;
      this.fx.add(mesh);
      this.particles.push({
        mesh,
        life: 0.6 + (i % 4) * 0.08,
        velocity: new T.Vector3(
          Math.sin(i * 2.4) * 0.9,
          1 + (i % 3) * 0.3,
          Math.cos(i * 2.4) * 0.9,
        ),
      });
    }
  }
  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
