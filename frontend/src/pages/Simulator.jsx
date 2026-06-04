import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3';
import { useSelector } from 'react-redux';
import API from '../services/api';
import { Play, Pause, RotateCcw, Save, ShieldCheck, AlertTriangle } from 'lucide-react';

const Simulator = () => {
  const { user } = useSelector((state) => state.auth);

  // References
  const mountRef = useRef(null);
  const d3Ref = useRef(null);
  const requestRef = useRef(null);

  // Simulation Parameters (State)
  const [gravityG, setGravityG] = useState(1.0); // Can be negative for anti-gravity!
  const [massM, setMassM] = useState(500.0);
  const [velocityVy, setVelocityVy] = useState(22.0);
  
  // Control States
  const [isRunning, setIsRunning] = useState(true);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Internals (Mutable ref variables for animation loop performance)
  const physicsRef = useRef({
    x: 10,
    y: 0,
    z: 0,
    vx: 0,
    vy: 22.0,
    vz: 0,
    mass_m: 1.0,
    time: 0,
    energyHistory: [],
  });

  // Re-sync parameter changes to physics loop instantly
  useEffect(() => {
    physicsRef.current.vy = parseFloat(velocityVy);
  }, [velocityVy]);

  // Handle resets
  const handleReset = () => {
    physicsRef.current.x = 10;
    physicsRef.current.y = 0;
    physicsRef.current.z = 0;
    physicsRef.current.vx = 0;
    physicsRef.current.vy = parseFloat(velocityVy);
    physicsRef.current.vz = 0;
    physicsRef.current.time = 0;
    physicsRef.current.energyHistory = [];
    setMessage('');
  };

  // Save Snapshot to DB
  const handleSaveSnapshot = async () => {
    try {
      setIsSaving(true);
      setMessage('');
      const snapshotPayload = {
        gravityConstant: gravityG,
        objects: [
          {
            mass: massM,
            position: [0, 0, 0],
            velocity: [0, 0, 0],
          },
          {
            mass: physicsRef.current.mass_m,
            position: [physicsRef.current.x, physicsRef.current.y, physicsRef.current.z],
            velocity: [physicsRef.current.vx, physicsRef.current.vy, physicsRef.current.vz],
          },
        ],
        duration: physicsRef.current.time,
        energyLog: physicsRef.current.energyHistory.slice(-50), // Save recent energy logs
      };

      const response = await API.post('/simulations', snapshotPayload);
      if (response.data?.success) {
        setMessage('Simulation state logged to database.');
      }
    } catch (error) {
      setMessage('Failed to save simulation snapshot.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // --- THREE.JS SCENE SETUP ---
  useEffect(() => {
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    // Grid Helper
    const gridHelper = new THREE.GridHelper(40, 40, 0x06B6D4, 0x1f2937);
    gridHelper.rotation.x = Math.PI / 2;
    scene.add(gridHelper);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 25;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Central Attractor (Star)
    const attractorGeom = new THREE.SphereGeometry(1.8, 32, 32);
    const attractorMat = new THREE.MeshBasicMaterial({
      color: 0x06B6D4,
      wireframe: true,
    });
    const attractor = new THREE.Mesh(attractorGeom, attractorMat);
    scene.add(attractor);

    // Orbiting Satellite (Probe)
    const probeGeom = new THREE.SphereGeometry(0.5, 16, 16);
    const probeMat = new THREE.MeshBasicMaterial({ color: 0x8B5CF6 });
    const probe = new THREE.Mesh(probeGeom, probeMat);
    scene.add(probe);

    // Trail particles
    const trailCount = 50;
    const trailGeom = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(trailCount * 3);
    trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0x06B6D4,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
    });
    const trailPoints = new THREE.Points(trailGeom, trailMat);
    scene.add(trailPoints);

    const trailHistory = [];

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Physics parameters mapped to variables inside closure to prevent state-lag
    let dt = 0.015;

    // --- ANIMATION LOOP ---
    const tick = () => {
      const p = physicsRef.current;

      if (isRunning) {
        // Gravitational force calculations
        // Attractor is at [0,0,0], satellite is at [p.x, p.y, p.z]
        const rx = 0 - p.x;
        const ry = 0 - p.y;
        const rz = 0 - p.z;
        const r = Math.sqrt(rx * rx + ry * ry + rz * rz);

        if (r > 1.2) {
          // Accelerations
          // F = G * M * m / r^2
          // a = F / m = G * M / r^2
          // Vector direction: [rx/r, ry/r, rz/r]
          // Force is attractive if G > 0, repulsive (anti-gravity) if G < 0
          const forceMag = (gravityG * massM) / (r * r);
          const ax = forceMag * (rx / r);
          const ay = forceMag * (ry / r);
          const az = forceMag * (rz / r);

          p.vx += ax * dt;
          p.vy += ay * dt;
          p.vz += az * dt;

          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.time += dt;

          // Energies:
          // KE = 0.5 * m * v^2
          const speedSq = p.vx * p.vx + p.vy * p.vy + p.vz * p.vz;
          const ke = 0.5 * p.mass_m * speedSq;
          // PE = - G * M * m / r
          const pe = - (gravityG * massM * p.mass_m) / r;
          const totalEnergy = ke + pe;

          p.energyHistory.push({
            time: p.time,
            kinetic: ke,
            potential: pe,
            total: totalEnergy,
          });

          // Limit history to 100 entries
          if (p.energyHistory.length > 100) {
            p.energyHistory.shift();
          }
        }
      }

      // Update Mesh positions
      probe.position.set(p.x, p.y, p.z);
      
      // Update trail
      if (isRunning) {
        trailHistory.push(new THREE.Vector3(p.x, p.y, p.z));
        if (trailHistory.length > trailCount) {
          trailHistory.shift();
        }
        const positions = trailPoints.geometry.attributes.position.array;
        for (let i = 0; i < trailCount; i++) {
          const index = i * 3;
          if (trailHistory[i]) {
            positions[index] = trailHistory[i].x;
            positions[index + 1] = trailHistory[i].y;
            positions[index + 2] = trailHistory[i].z;
          }
        }
        trailPoints.geometry.attributes.position.needsUpdate = true;
      }

      // Spin attractor animation
      attractor.rotation.y += 0.005;
      attractor.rotation.x += 0.002;

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [isRunning, gravityG, massM]);

  // --- D3.JS ENERGY GRAPH PLOTTING ---
  useEffect(() => {
    const drawChart = () => {
      if (!d3Ref.current) return;
      
      const width = d3Ref.current.clientWidth;
      const height = d3Ref.current.clientHeight;
      
      // Clear SVG
      d3.select(d3Ref.current).selectAll('*').remove();

      const svg = d3.select(d3Ref.current)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'none');

      const data = physicsRef.current.energyHistory;
      if (data.length === 0) return;

      const margin = { top: 15, right: 15, bottom: 25, left: 45 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // X Scale
      const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.time))
        .range([0, chartWidth]);

      // Y Scale
      const yMin = d3.min(data, d => Math.min(d.kinetic, d.potential, d.total)) || 0;
      const yMax = d3.max(data, d => Math.max(d.kinetic, d.potential, d.total)) || 10;
      // Pad domain slightly
      const yPad = Math.abs(yMax - yMin) * 0.1 || 1;
      const y = d3.scaleLinear()
        .domain([yMin - yPad, yMax + yPad])
        .range([chartHeight, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickSize(-chartHeight).tickFormat(d3.format('.1f')))
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', '#1F2937').attr('stroke-dasharray', '2,2'))
        .call(g => g.selectAll('.tick text').attr('fill', '#9CA3AF').style('font-family', 'monospace').style('font-size', '10px'));

      g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth))
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', '#1F2937').attr('stroke-dasharray', '2,2'))
        .call(g => g.selectAll('.tick text').attr('fill', '#9CA3AF').style('font-family', 'monospace').style('font-size', '10px'));

      // Lines
      const lineGen = (key) => d3.line()
        .x(d => x(d.time))
        .y(d => y(d[key]))
        .curve(d3.curveMonotoneX);

      // Kinetic Energy (Purple)
      g.append('path')
        .datum(data)
        .attr('class', 'energy-line kinetic-line')
        .attr('d', lineGen('kinetic'));

      // Potential Energy (Orange)
      g.append('path')
        .datum(data)
        .attr('class', 'energy-line potential-line')
        .attr('d', lineGen('potential'));

      // Total Energy (Cyan)
      g.append('path')
        .datum(data)
        .attr('class', 'energy-line total-line')
        .attr('d', lineGen('total'));
    };

    // Draw chart periodically
    const chartTimer = setInterval(drawChart, 200);
    return () => clearInterval(chartTimer);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white tracking-widest uppercase">
          Space-Time Metric Simulator
        </h1>
        <p className="text-xs text-scifi-cyan font-mono uppercase tracking-widest mt-1">
          // Mode: 3D orbital anti-gravity projection
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Simulator view */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="relative border border-white/10 rounded-2xl overflow-hidden glass-panel h-[500px] w-full" ref={mountRef}>
            {/* Legend Overlay */}
            <div className="absolute top-4 left-4 p-4 rounded-xl bg-scifi-darkest/85 border border-white/5 font-mono text-[10px] space-y-2 z-10">
              <div className="font-bold text-scifi-cyan mb-1">// PHYSICAL STATE</div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-scifi-violet rounded-full" />
                <span>KE (Kinetic): {(0.5 * physicsRef.current.mass_m * (physicsRef.current.vx ** 2 + physicsRef.current.vy ** 2)).toFixed(2)} J</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-amber-500 rounded-full" />
                <span>PE (Potential): {(- (gravityG * massM * physicsRef.current.mass_m) / Math.max(1, Math.sqrt(physicsRef.current.x**2 + physicsRef.current.y**2))).toFixed(2)} J</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-scifi-cyan rounded-full" />
                <span>TE (Total): {((0.5 * physicsRef.current.mass_m * (physicsRef.current.vx ** 2 + physicsRef.current.vy ** 2)) + (- (gravityG * massM * physicsRef.current.mass_m) / Math.max(1, Math.sqrt(physicsRef.current.x**2 + physicsRef.current.y**2)))).toFixed(2)} J</span>
              </div>
              <div className="text-gray-500 mt-2">
                Time (t): {physicsRef.current.time.toFixed(2)} s
              </div>
            </div>

            {/* Negative Gravity Indicator */}
            {gravityG < 0 && (
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-scifi-red/10 border border-scifi-red/30 rounded-lg text-scifi-red text-[10px] font-mono font-bold animate-pulse z-10">
                <AlertTriangle className="h-3.5 w-3.5" /> METRIC SHIELDING ACTIVE (ANTI-GRAVITY)
              </div>
            )}
            
            {gravityG > 0 && (
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-scifi-green/10 border border-scifi-green/30 rounded-lg text-scifi-green text-[10px] font-mono font-bold z-10">
                <ShieldCheck className="h-3.5 w-3.5" /> ATTRACTIVE GRAV FIELD NORMAL
              </div>
            )}
          </div>

          {/* D3 Real-Time Energy Graph */}
          <div className="glass-panel border border-white/5 rounded-2xl p-6 h-[200px] flex flex-col justify-between">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">
              Live Energy Tensor Analysis (D3.js)
            </div>
            <div className="flex-grow w-full h-full relative" ref={d3Ref} />
          </div>
        </div>

        {/* Controls sidebar */}
        <div className="flex flex-col gap-6">
          
          {/* Engine Parameters */}
          <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-white tracking-widest font-mono uppercase border-b border-white/5 pb-3">
              // Gravity Engine Controls
            </h3>

            {/* Slider 1: Gravity Constant G */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">GRAVITY CONSTANT (G)</span>
                <span className={`font-bold ${gravityG < 0 ? 'text-scifi-red' : 'text-scifi-cyan'}`}>
                  {gravityG.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-2.0"
                max="2.0"
                step="0.05"
                value={gravityG}
                onChange={(e) => setGravityG(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-scifi-cyan"
              />
              <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                <span>-2.0 (Anti-Gravity repulsion)</span>
                <span>2.0 (High Attraction)</span>
              </div>
            </div>

            {/* Slider 2: Star Mass M */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">ATTRACTOR MASS (M)</span>
                <span className="text-scifi-cyan font-bold">{massM} kg</span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={massM}
                onChange={(e) => setMassM(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-scifi-cyan"
              />
            </div>

            {/* Slider 3: Probe initial speed vy */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">PROBE INITIAL VELOCITY (Vy)</span>
                <span className="text-scifi-cyan font-bold">{velocityVy} m/s</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={velocityVy}
                disabled={!isRunning}
                onChange={(e) => setVelocityVy(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-scifi-cyan disabled:opacity-30"
              />
              <p className="text-[9px] text-gray-500 font-mono">Adjustable only when reset or paused.</p>
            </div>
          </div>

          {/* Simulation Commands */}
          <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-widest font-mono uppercase border-b border-white/5 pb-3">
              // Control Terminal
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setIsRunning(true)}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold font-mono text-xs transition-all ${
                  isRunning
                    ? 'border-scifi-green text-scifi-green bg-scifi-green/5 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                    : 'border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Play className="h-3.5 w-3.5" /> RUN
              </button>

              <button
                onClick={() => setIsRunning(false)}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold font-mono text-xs transition-all ${
                  !isRunning
                    ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5 shadow-[0_0_8px_rgba(234,179,8,0.1)]'
                    : 'border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Pause className="h-3.5 w-3.5" /> PAUSE
              </button>

              <button
                onClick={handleReset}
                className="py-2 px-3 rounded-xl border border-white/10 text-gray-400 hover:text-white flex items-center justify-center gap-1.5 font-bold font-mono text-xs transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" /> RESET
              </button>
            </div>

            {user.role === 'researcher' && (
              <button
                onClick={handleSaveSnapshot}
                disabled={isSaving}
                className="w-full py-3 px-4 bg-gradient-to-r from-scifi-violet to-scifi-cyan text-white font-bold rounded-xl shadow-cyan-glow hover:shadow-cyan-glow-intense flex items-center justify-center gap-2 transition-all text-xs font-mono uppercase tracking-widest disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Logging to DB...' : 'Record Snapshot'}
              </button>
            )}

            {message && (
              <div className="mt-3 p-3 bg-scifi-cyan/5 border border-scifi-cyan/20 text-scifi-cyan rounded-xl text-center text-xs font-mono">
                {message}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default Simulator;
