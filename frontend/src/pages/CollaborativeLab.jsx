import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import io from 'socket.io-client';
import * as THREE from 'three';
import * as d3 from 'd3';
import API from '../services/api';
import { Play, Pause, RotateCcw, Send, MessageSquare, Users, ShieldAlert, ArrowLeft, Terminal } from 'lucide-react';

const CollaborativeLab = () => {
  const { id: experimentId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Socket reference
  const socketRef = useRef(null);

  // References for Three.js & D3
  const mountRef = useRef(null);
  const d3Ref = useRef(null);
  const requestRef = useRef(null);

  // States
  const [experiment, setExperiment] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Physics States
  const [gravityG, setGravityG] = useState(1.0);
  const [massM, setMassM] = useState(500.0);
  const [velocityVy, setVelocityVy] = useState(22.0);
  const [isRunning, setIsRunning] = useState(false);

  // Chat & room states
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeUsers, setActiveUsers] = useState([]); // Mock/dynamic visual of researchers

  // Internal mutable physics state
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

  // Re-sync vy changes
  useEffect(() => {
    physicsRef.current.vy = parseFloat(velocityVy);
  }, [velocityVy]);

  // Handle resets locally
  const localReset = () => {
    physicsRef.current.x = 10;
    physicsRef.current.y = 0;
    physicsRef.current.z = 0;
    physicsRef.current.vx = 0;
    physicsRef.current.vy = parseFloat(velocityVy);
    physicsRef.current.vz = 0;
    physicsRef.current.time = 0;
    physicsRef.current.energyHistory = [];
  };

  // --- FETCH EXPERIMENT ---
  useEffect(() => {
    const fetchExperiment = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/experiments/${experimentId}`);
        if (res.data?.success) {
          const exp = res.data.data;
          setExperiment(exp);
          const ownerCheck = exp.submittedBy._id === user.id;
          setIsOwner(ownerCheck);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load collaborative laboratory session');
      } finally {
        setLoading(false);
      }
    };
    fetchExperiment();
  }, [experimentId, user.id]);

  // --- SOCKET.IO CONNECTION ---
  useEffect(() => {
    if (loading || error || !experiment) return;

    // Connect socket
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      upgrade: false,
    });
    socketRef.current = socket;

    // Join room
    socket.emit('join_room', {
      experimentId,
      user: { name: user.name, role: user.role },
      isOwner: isOwner,
    });

    // Listeners
    socket.on('room_notification', (data) => {
      setMessages((prev) => [...prev, { system: true, text: data.message }]);
    });

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, { system: false, ...data }]);
    });

    socket.on('simulation_state_updated', (state) => {
      if (isOwner) return; // Prevent loop for owner
      setGravityG(state.gravityG);
      setMassM(state.massM);
      setVelocityVy(state.velocityVy);
    });

    socket.on('simulation_action_triggered', (action) => {
      if (isOwner) return;
      if (action.type === 'PLAY') {
        setIsRunning(true);
      } else if (action.type === 'PAUSE') {
        setIsRunning(false);
      } else if (action.type === 'RESET') {
        setIsRunning(false);
        physicsRef.current.vy = action.vy;
        localReset();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [loading, error, experiment, isOwner, experimentId, user.name, user.role]);

  // --- SYNC EVENTS TO SOCKET ---
  const emitStateChange = (newG, newM, newV) => {
    if (!isOwner || !socketRef.current) return;
    socketRef.current.emit('sync_simulation_state', {
      experimentId,
      state: {
        gravityG: newG,
        massM: newM,
        velocityVy: newV,
      },
    });
  };

  const emitActionChange = (actionType) => {
    if (!isOwner || !socketRef.current) return;
    socketRef.current.emit('sync_simulation_action', {
      experimentId,
      action: {
        type: actionType,
        vy: parseFloat(velocityVy),
      },
    });
  };

  // --- EMIT HANDLERS ---
  const handlePlay = () => {
    setIsRunning(true);
    emitActionChange('PLAY');
  };

  const handlePause = () => {
    setIsRunning(false);
    emitActionChange('PAUSE');
  };

  const handleReset = () => {
    setIsRunning(false);
    localReset();
    emitActionChange('RESET');
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      experimentId,
      senderName: user.name,
      message: chatInput,
    });
    setChatInput('');
  };

  // --- THREE.JS SIMULATION GRAPHICS ---
  useEffect(() => {
    if (loading || error || !experiment) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    
    // Sci-fi Grid helper
    const gridHelper = new THREE.GridHelper(40, 40, 0x06B6D4, 0x111827);
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

    // heavy body
    const starGeom = new THREE.SphereGeometry(1.8, 32, 32);
    const starMat = new THREE.MeshBasicMaterial({ color: 0x06B6D4, wireframe: true });
    const star = new THREE.Mesh(starGeom, starMat);
    scene.add(star);

    // satellite body
    const satGeom = new THREE.SphereGeometry(0.5, 16, 16);
    const satMat = new THREE.MeshBasicMaterial({ color: 0x8B5CF6 });
    const sat = new THREE.Mesh(satGeom, satMat);
    scene.add(sat);

    // Trail setup
    const trailCount = 50;
    const trailGeom = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(trailCount * 3);
    trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0x06B6D4,
      size: 0.12,
      transparent: true,
      opacity: 0.5,
    });
    const trailPoints = new THREE.Points(trailGeom, trailMat);
    scene.add(trailPoints);

    const trailHistory = [];
    const dt = 0.015;

    const animate = () => {
      const p = physicsRef.current;

      if (isRunning) {
        const rx = -p.x;
        const ry = -p.y;
        const rz = -p.z;
        const r = Math.sqrt(rx * rx + ry * ry + rz * rz);

        if (r > 1.2) {
          const force = (gravityG * massM) / (r * r);
          const ax = force * (rx / r);
          const ay = force * (ry / r);
          const az = force * (rz / r);

          p.vx += ax * dt;
          p.vy += ay * dt;
          p.vz += az * dt;

          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.time += dt;

          // Energies
          const vSq = p.vx * p.vx + p.vy * p.vy + p.vz * p.vz;
          const ke = 0.5 * p.mass_m * vSq;
          const pe = - (gravityG * massM * p.mass_m) / r;
          const total = ke + pe;

          p.energyHistory.push({ time: p.time, kinetic: ke, potential: pe, total });
          if (p.energyHistory.length > 100) p.energyHistory.shift();
        }
      }

      sat.position.set(p.x, p.y, p.z);

      if (isRunning) {
        trailHistory.push(new THREE.Vector3(p.x, p.y, p.z));
        if (trailHistory.length > trailCount) trailHistory.shift();

        const pos = trailPoints.geometry.attributes.position.array;
        for (let i = 0; i < trailCount; i++) {
          const idx = i * 3;
          if (trailHistory[i]) {
            pos[idx] = trailHistory[i].x;
            pos[idx + 1] = trailHistory[i].y;
            pos[idx + 2] = trailHistory[i].z;
          }
        }
        trailPoints.geometry.attributes.position.needsUpdate = true;
      }

      star.rotation.y += 0.005;
      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    // Resize
    const resizeScene = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', resizeScene);

    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resizeScene);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [loading, error, experiment, isRunning, gravityG, massM]);

  // --- D3.JS ENERGY GRAPH ---
  useEffect(() => {
    if (loading || error || !experiment) return;

    const drawD3 = () => {
      if (!d3Ref.current) return;
      const width = d3Ref.current.clientWidth;
      const height = d3Ref.current.clientHeight;

      d3.select(d3Ref.current).selectAll('*').remove();

      const svg = d3.select(d3Ref.current)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'none');

      const data = physicsRef.current.energyHistory;
      if (data.length === 0) return;

      const margin = { top: 10, right: 10, bottom: 20, left: 40 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain(d3.extent(data, d => d.time)).range([0, w]);
      
      const yMin = d3.min(data, d => Math.min(d.kinetic, d.potential, d.total)) || 0;
      const yMax = d3.max(data, d => Math.max(d.kinetic, d.potential, d.total)) || 10;
      const yPad = Math.abs(yMax - yMin) * 0.1 || 1;
      const y = d3.scaleLinear().domain([yMin - yPad, yMax + yPad]).range([h, 0]);

      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).ticks(5).tickSize(-h).tickFormat(d3.format('.1f')))
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', '#1F2937').attr('stroke-dasharray', '2,2'))
        .call(g => g.selectAll('.tick text').attr('fill', '#6B7280').style('font-family', 'monospace').style('font-size', '8px'));

      g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickSize(-w))
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', '#1F2937').attr('stroke-dasharray', '2,2'))
        .call(g => g.selectAll('.tick text').attr('fill', '#6B7280').style('font-family', 'monospace').style('font-size', '8px'));

      const lineGen = (key) => d3.line().x(d => x(d.time)).y(d => y(d[key])).curve(d3.curveMonotoneX);

      g.append('path').datum(data).attr('class', 'energy-line kinetic-line').attr('d', lineGen('kinetic'));
      g.append('path').datum(data).attr('class', 'energy-line potential-line').attr('d', lineGen('potential'));
      g.append('path').datum(data).attr('class', 'energy-line total-line').attr('d', lineGen('total'));
    };

    const interval = setInterval(drawD3, 200);
    return () => clearInterval(interval);
  }, [loading, error, experiment]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="h-12 w-12 border-4 border-scifi-cyan border-t-transparent rounded-full animate-spin shadow-cyan-glow mb-4" />
        <p className="text-gray-400 font-mono text-sm uppercase tracking-widest animate-pulse">Accessing Collaborative Portal...</p>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <ShieldAlert className="h-16 w-16 text-scifi-red mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-white mb-2">Access Denied / Session Error</h2>
        <p className="text-gray-400 text-sm mb-6">{error || 'Session failed to boot.'}</p>
        <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold">
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col h-[calc(100vh-100px)]">
      
      {/* Header bar */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 text-gray-400 hover:text-white bg-gray-900 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white uppercase tracking-wider">{experiment.title}</h1>
            <p className="text-[10px] text-gray-500 font-mono">
              COLLABORATIVE ROOM ID: {experiment._id} | OWNER: {experiment.submittedBy.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 bg-scifi-violet/10 border border-scifi-violet/30 rounded-lg text-scifi-violet text-xs font-mono">
          <Users className="h-4 w-4" /> ACTIVE LAB SESSION
        </div>
      </div>

      {/* Main Grid: 3D Simulator (Left) and Chat Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow overflow-hidden min-h-0">
        
        {/* Simulator Grid Area */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* ThreeJS Container */}
          <div className="relative border border-white/10 rounded-xl overflow-hidden glass-panel h-[400px] w-full shrink-0" ref={mountRef}>
            
            {/* Owner Permission Banner */}
            <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-scifi-darkest/90 border border-white/5 text-[10px] font-mono z-10">
              {isOwner ? (
                <div className="text-scifi-cyan font-bold flex items-center gap-1.5 animate-pulse">
                  <Terminal className="h-3.5 w-3.5" /> COMMAND CONSOLE UNLOCKED (OWNER)
                </div>
              ) : (
                <div className="text-gray-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-yellow-500" /> SYNCED VIEW ONLY (GUEST MODE)
                </div>
              )}
            </div>

            {/* Micro physical states */}
            <div className="absolute top-4 left-4 p-3 rounded-lg bg-scifi-darkest/90 border border-white/5 font-mono text-[9px] z-10 space-y-1">
              <div>G: {gravityG.toFixed(2)}</div>
              <div>M: {massM} kg</div>
              <div>t: {physicsRef.current.time.toFixed(2)}s</div>
            </div>
          </div>

          {/* D3 Real-Time Chart & Sliders Group */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-[160px] shrink-0">
            {/* D3 Graph */}
            <div className="glass-panel border border-white/5 rounded-xl p-4 flex flex-col h-full">
              <div className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-widest mb-1">
                Real-Time Energy Analysis
              </div>
              <div className="flex-grow w-full h-full relative" ref={d3Ref} />
            </div>

            {/* Sliders Console */}
            <div className="glass-panel border border-white/5 rounded-xl p-4 flex flex-col justify-between h-full space-y-3">
              <div className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-widest mb-1">
                Gravity Control Console
              </div>

              {/* Slider G */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-gray-400">GRAVITY G</span>
                  <span className="text-scifi-cyan font-bold">{gravityG.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.05"
                  value={gravityG}
                  disabled={!isOwner}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setGravityG(v);
                    emitStateChange(v, massM, velocityVy);
                  }}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-scifi-cyan disabled:opacity-30"
                />
              </div>

              {/* Slider M */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-gray-400">STAR MASS</span>
                  <span className="text-scifi-cyan font-bold">{massM} kg</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={massM}
                  disabled={!isOwner}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setMassM(v);
                    emitStateChange(gravityG, v, velocityVy);
                  }}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-scifi-cyan disabled:opacity-30"
                />
              </div>

              {/* Action buttons inside sidebar controls */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
                <button
                  disabled={!isOwner}
                  onClick={handlePlay}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all ${
                    isRunning && isOwner
                      ? 'border-scifi-green text-scifi-green bg-scifi-green/5'
                      : 'border-white/10 text-gray-500 hover:text-white disabled:opacity-30'
                  }`}
                >
                  <Play className="h-3 w-3 fill-current" /> RUN
                </button>
                <button
                  disabled={!isOwner}
                  onClick={handlePause}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all ${
                    !isRunning && isOwner
                      ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5'
                      : 'border-white/10 text-gray-500 hover:text-white disabled:opacity-30'
                  }`}
                >
                  <Pause className="h-3 w-3" /> PAUSE
                </button>
                <button
                  disabled={!isOwner}
                  onClick={handleReset}
                  className="py-1.5 px-2 rounded-lg border border-white/10 text-[10px] font-mono text-gray-500 hover:text-white flex items-center justify-center gap-1 transition-all disabled:opacity-30"
                >
                  <RotateCcw className="h-3 w-3" /> RESET
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat sidebar panel */}
        <div className="glass-panel border border-white/5 rounded-xl p-4 flex flex-col h-full overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 shrink-0">
            <MessageSquare className="h-4 w-4 text-scifi-cyan animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">
              COLLAB CHAT LOG
            </span>
          </div>

          {/* Messages feed */}
          <div className="flex-grow overflow-y-auto py-4 space-y-3 pr-1 text-xs scroll-smooth">
            {messages.map((msg, idx) => {
              if (msg.system) {
                return (
                  <div key={idx} className="p-2 bg-white/[0.02] border border-white/5 rounded-lg text-gray-500 font-mono text-[10px] text-center">
                    {msg.text}
                  </div>
                );
              }
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-mono text-[9px] text-gray-500">
                    <span className="font-bold text-scifi-cyan">{msg.senderName}</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="p-2.5 bg-scifi-darkest/80 border border-white/5 text-gray-300 rounded-lg font-sans">
                    {msg.message}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendChat} className="border-t border-white/5 pt-3 flex gap-2 shrink-0">
            <input
              type="text"
              placeholder="Send message to room..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-grow px-3 py-2 bg-scifi-darkest/60 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-scifi-cyan"
            />
            <button
              type="submit"
              className="p-2 bg-scifi-cyan/20 border border-scifi-cyan/35 text-scifi-cyan rounded-lg hover:bg-scifi-cyan/35 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default CollaborativeLab;
