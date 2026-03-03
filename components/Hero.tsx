import React, { useRef, useLayoutEffect, useEffect } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';

interface HeroProps {
  isDarkMode: boolean;
}

const Hero: React.FC<HeroProps> = ({ isDarkMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Store refs for cleanup and animation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const segmentsRef = useRef<THREE.Group[]>([]);
  const scrollPosRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const clickableMeshesRef = useRef<THREE.Mesh[]>([]);
  const mouseRef = useRef(new THREE.Vector2());
  const textureLoaderRef = useRef(new THREE.TextureLoader());
  const texturePoolRef = useRef<THREE.Texture[]>([]);
  const baseMaterialRef = useRef(
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
   })
  );



  useEffect(() => {
    const loader = textureLoaderRef.current;
    imageUrls.forEach((url) => {
      loader.load(url, (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        texturePoolRef.current.push(tex);
      });
    });
  }, []);


  // --- CONFIGURATION ---
  // Tuned to match the reference design's density and scale
  const TUNNEL_WIDTH = 24;
  const TUNNEL_HEIGHT = 16;
  const SEGMENT_DEPTH = 6; // Short depth for "square-ish" floor tiles
  const NUM_SEGMENTS = 14; 
  const FOG_DENSITY = 0.02;

  // Grid Divisions
  const FLOOR_COLS = 6; // Number of columns on floor/ceiling
  const WALL_ROWS = 4;  // Number of rows on walls

  // Derived dimensions
  const COL_WIDTH = TUNNEL_WIDTH / FLOOR_COLS;
  const ROW_HEIGHT = TUNNEL_HEIGHT / WALL_ROWS;

  // Unsplash images - Mix of portraits, landscapes, and abstracts
const imageUrls = [
  "/images/img1.jpg",
  "/images/img2.jpg",
  "/images/img3.jpg",
    "/images/img4.jpg",
  "/images/img5.jpg",
  "/images/img6.jpg",
  "/images/img7.jpg",
  "/images/img8.jpg",
  "/images/img9.jpg",
  "/images/img10.jpg",
  "/images/img12.jpg",
  "/images/img13.jpg",
  "/images/img14.jpg",
  "/images/img15.jpg",
  "/images/img16.jpg",
  "/images/img17.jpg",
  "/images/img18.jpg",
  "/images/img19.jpg",
  "/images/img11.jpg",
  "/images/img20.jpg",
  "/images/img21.jpg",
  "/images/img31.jpg",
  "/images/img22.jpg",
  "/images/img23.jpg",
  "/images/img24.jpg",
  "/images/img25.jpg",
  "/images/img26.jpg",
  "/images/img27.jpg",
  "/images/img28.jpg",
  "/images/img30.jpg",
  "/images/img29.jpg",
  "/images/img32.jpg",
  "/images/img33.jpg",
  "/images/img34.jpg",
  "/images/img35.jpg",
  "/images/img36.jpg",
  "/images/img37.jpg",
  "/images/img38.jpg",
  "/images/img39.jpg",
  "/images/img40.jpg",
  "/images/img41.jpg",
  "/images/img42.jpg",

];

  // Helper: Create a segment with grid lines and filled cells
  const createSegment = (zPos: number) => {
    const group = new THREE.Group();
    group.position.z = zPos;

    const w = TUNNEL_WIDTH / 2;
    const h = TUNNEL_HEIGHT / 2;
    const d = SEGMENT_DEPTH;

    // --- 1. Grid Lines ---
    // Start with default light mode colors; these will be updated by useEffect immediately on mount
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xb0b0b0, transparent: true, opacity: 0.5 });
    const lineGeo = new THREE.BufferGeometry();
    const vertices: number[] = [];

    // A. Longitudinal Lines (Z-axis)
    // Floor & Ceiling (varying X)
    for (let i = 0; i <= FLOOR_COLS; i++) {
      const x = -w + (i * COL_WIDTH);
      // Floor line
      vertices.push(x, -h, 0, x, -h, -d);
      // Ceiling line
      vertices.push(x, h, 0, x, h, -d);
    }
    // Walls (varying Y) - excluding top/bottom corners already drawn
    for (let i = 1; i < WALL_ROWS; i++) {
      const y = -h + (i * ROW_HEIGHT);
      // Left Wall line
      vertices.push(-w, y, 0, -w, y, -d);
      // Right Wall line
      vertices.push(w, y, 0, w, y, -d);
    }

    // B. Latitudinal Lines (Ring at z=0)
    // Floor (Bottom edge)
    vertices.push(-w, -h, 0, w, -h, 0);
    // Ceiling (Top edge)
    vertices.push(-w, h, 0, w, h, 0);
    // Left Wall (Left edge)
    vertices.push(-w, -h, 0, -w, h, 0);
    // Right Wall (Right edge)
    vertices.push(w, -h, 0, w, h, 0);

    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMaterial);
    group.add(lines);

    // Initial population of images
    populateImages(group, w, h, d);

    return group;
  };




  // Helper: Populate images in a segment
  const populateImages = (group: THREE.Group, w: number, h: number, d: number) => {
    const textureLoader = new THREE.TextureLoader();
    const cellMargin = 0.4;

    const addImg = (pos: THREE.Vector3, rot: THREE.Euler, wd: number, ht: number) => {
        const url = imageUrls[Math.floor(Math.random() * imageUrls.length)];
        const geom = new THREE.PlaneGeometry(wd - cellMargin, ht - cellMargin);
        const mat = baseMaterialRef.current.clone();
        const textures = texturePoolRef.current;
        const tex = textures[Math.floor(Math.random() * textures.length)];
        if (!textures.length) return;
        mat.map = tex;
        mat.needsUpdate = true;
        gsap.fromTo(mat, { opacity: 0 }, { opacity: 0.85, duration: 1 });

        const m = new THREE.Mesh(geom, mat);
         m.name = "slab_image";
         group.add(m);
         clickableMeshesRef.current.push(m); // <- HERE
        };
    // Logic: Iterate slots, but skip if the previous slot was filled.
    // Threshold adjusted to 0.80 (20%) to compensate for skipped slots and maintain density.

    // Floor
    let lastFloorIdx = -999;
    for (let i = 0; i < FLOOR_COLS; i++) {
        // Must be at least 2 slots away from last image to avoid adjacency (i > last + 1)
        if (i > lastFloorIdx + 1) {
            if (Math.random() > 0.80) {
                addImg(new THREE.Vector3(-w + i*COL_WIDTH + COL_WIDTH/2, -h, -d/2), new THREE.Euler(-Math.PI/2,0,0), COL_WIDTH, d);
                lastFloorIdx = i;
            }
        }
    }
    
    // Ceiling
    let lastCeilIdx = -999;
    for (let i = 0; i < FLOOR_COLS; i++) {
        if (i > lastCeilIdx + 1) {
            if (Math.random() > 0.88) { // Keep ceiling sparser
                addImg(new THREE.Vector3(-w + i*COL_WIDTH + COL_WIDTH/2, h, -d/2), new THREE.Euler(Math.PI/2,0,0), COL_WIDTH, d);
                lastCeilIdx = i;
            }
        }
    }
    
    // Left Wall
    let lastLeftIdx = -999;
    for (let i = 0; i < WALL_ROWS; i++) {
        if (i > lastLeftIdx + 1) {
            if (Math.random() > 0.80) {
                addImg(new THREE.Vector3(-w, -h + i*ROW_HEIGHT + ROW_HEIGHT/2, -d/2), new THREE.Euler(0,Math.PI/2,0), d, ROW_HEIGHT);
                lastLeftIdx = i;
            }
        }
    }
    
    // Right Wall
    let lastRightIdx = -999;
    for (let i = 0; i < WALL_ROWS; i++) {
        if (i > lastRightIdx + 1) {
            if (Math.random() > 0.80) {
                addImg(new THREE.Vector3(w, -h + i*ROW_HEIGHT + ROW_HEIGHT/2, -d/2), new THREE.Euler(0,-Math.PI/2,0), d, ROW_HEIGHT);
                lastRightIdx = i;
            }
        }
    }
  }

  // --- INITIAL SETUP ---
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // THREE JS SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0); 
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Generate segments
    const segments: THREE.Group[] = [];
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const z = -i * SEGMENT_DEPTH;
      const segment = createSegment(z);
      scene.add(segment);
      segments.push(segment);
    }
    segmentsRef.current = segments;

    // Animation Loop
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!cameraRef.current || !sceneRef.current || !rendererRef.current) return;

      const targetZ = -scrollPosRef.current * 0.05; 
      const currentZ = cameraRef.current.position.z;
      cameraRef.current.position.z += (targetZ - currentZ) * 0.1;

      // Bidirectional Infinite Logic
      const tunnelLength = NUM_SEGMENTS * SEGMENT_DEPTH;
      
      const camZ = cameraRef.current.position.z;
      
      segmentsRef.current.forEach((segment) => {
        // 1. Moving Forward
        if (segment.position.z > camZ + SEGMENT_DEPTH) {
            let minZ = 0;
            segmentsRef.current.forEach(s => minZ = Math.min(minZ, s.position.z));
            segment.position.z = minZ - SEGMENT_DEPTH;
            
            // Re-populate
            const toRemove: THREE.Object3D[] = [];
            segment.traverse((c) => { if (c.name === 'slab_image') toRemove.push(c); });
            toRemove.forEach(c => {
                segment.remove(c);
                if (c instanceof THREE.Mesh) {
                    c.geometry.dispose(); 
                    if (c.material.map) c.material.map.dispose();
                    c.material.dispose();
                }
            });
            const w = TUNNEL_WIDTH / 2; const h = TUNNEL_HEIGHT / 2; const d = SEGMENT_DEPTH;
            populateImages(segment, w, h, d);
        }

        // 2. Moving Backward
        if (segment.position.z < camZ - tunnelLength - SEGMENT_DEPTH) {
            let maxZ = -999999;
            segmentsRef.current.forEach(s => maxZ = Math.max(maxZ, s.position.z));
            segment.position.z = maxZ + SEGMENT_DEPTH;

            // Re-populate
            const toRemove: THREE.Object3D[] = [];
            segment.traverse((c) => { if (c.name === 'slab_image') toRemove.push(c); });
            toRemove.forEach(c => {
                segment.remove(c);
                if (c instanceof THREE.Mesh) {
                    c.geometry.dispose(); 
                    if (c.material.map) c.material.map.dispose();
                    c.material.dispose();
                }
            });
            const w = TUNNEL_WIDTH / 2; const h = TUNNEL_HEIGHT / 2; const d = SEGMENT_DEPTH;
            populateImages(segment, w, h, d);
        }
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    const onScroll = () => { scrollPosRef.current = window.scrollY; };
    window.addEventListener('scroll', onScroll);
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    //Raycaster 
    const handleClick = (event: MouseEvent) => {
  if (!cameraRef.current || !sceneRef.current) return;

  const rect = canvasRef.current!.getBoundingClientRect();

  mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

  const intersects = raycasterRef.current.intersectObjects(clickableMeshesRef.current);

  if (intersects.length > 0) {
    const object = intersects[0].object;

    if (object.name === "slab_image") {
      console.log("Clicked image:", object);

      gsap.to(object.scale, {
        x: 1.2,
        y: 1.2,
        duration: 0.3,
        yoyo: true,
        repeat: 1
      });
    }
  }
};

canvasRef.current.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', handleResize);
      canvasRef.current?.removeEventListener("click", handleClick);// is this where it is supposed to be 
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, []); // Run once on mount

  // --- THEME UPDATE EFFECT ---
  useEffect(() => {
    if (!sceneRef.current) return;

    // Define theme colors
    const bgHex = isDarkMode ? 0x050505 : 0xffffff;
    const fogHex = isDarkMode ? 0x050505 : 0xffffff; 
    
    // Light mode: Light Grey lines (0xb0b0b0), higher opacity
    // Dark mode: Medium Grey lines (0x555555) for visibility, slightly adjusted opacity
    const lineHex = isDarkMode ? 0x555555 : 0xb0b0b0;
    const lineOp = isDarkMode ? 0.35 : 0.5;

    // Apply to scene
    sceneRef.current.background = new THREE.Color(bgHex);
    if (sceneRef.current.fog) {
        (sceneRef.current.fog as THREE.FogExp2).color.setHex(fogHex);
    }

    // Apply to existing grid lines
    segmentsRef.current.forEach(segment => {
        segment.children.forEach(child => {
            if (child instanceof THREE.LineSegments) {
                const mat = child.material as THREE.LineBasicMaterial;
                mat.color.setHex(lineHex);
                mat.opacity = lineOp;
                mat.needsUpdate = true;
            }
        });
    });
  }, [isDarkMode]);

  // Text Entrance Animation
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(contentRef.current, 
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: "power3.out", delay: 0.5 }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-[10000vh] transition-colors duration-700 ${isDarkMode ? 'bg-[#050505]' : 'bg-white'}`}>
      <div className="fixed inset-0 w-full h-full overflow-hidden z-0">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div ref={contentRef} className="text-center flex flex-col items-center max-w-3xl px-6 pointer-events-auto mix-blend-multiply-normal"> 
          
          <h1 className={`text-[5rem] md:text-[7rem] lg:text-[8rem] leading-[0.85] font-bold tracking-tighter mb-8 transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-dark'}`}>
            Clone yourself.
          </h1>
          
          <p className={`text-lg md:text-xl font-normal max-w-lg leading-relaxed mb-10 transition-colors duration-500 ${isDarkMode ? 'text-gray-400' : 'text-muted'}`}>
            See the digital version of me to know my expertise and availability, <span className="text-accent font-medium">infinitely</span>
          </p>

          <div className="flex items-center gap-6">
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
