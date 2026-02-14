import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { 
  BrainCircuit, 
  ArrowRight, 
  FileText, 
  Layers, 
  Target, 
  Zap, 
  Layout, 
  Sparkles, 
  Calendar, 
  Smartphone, 
  Timer, 
  CheckCircle, 
  Github, 
  Twitter, 
  Play, 
  Clock, 
  PenTool, 
  MoveRight, 
  ChevronDown 
} from 'lucide-react';

interface LandingProps {
  onLogin: () => void;
  onGuestAccess: () => void;
}

const heroContent = [
  {
    title: "Taming the Chaos",
    sub: "Turn noise into knowledge.",
    desc: "Stop drowning in scattered content. We organize the mess so you can actually learn.",
    color: "from-red-400 to-orange-400"
  },
  {
    title: "AI That Understands",
    sub: "It reads, you master.",
    desc: "Our engine processes your materials instantly, extracting the concepts that matter.",
    color: "from-purple-400 to-blue-400"
  },
  {
    title: "Active Mastery",
    sub: "Don't just read. Practice.",
    desc: "Turn passive notes into active quizzes and adaptive study routines.",
    color: "from-green-400 to-emerald-400"
  }
];

const Landing: React.FC<LandingProps> = ({ onLogin, onGuestAccess }) => {
  const [currentHeroStep, setCurrentHeroStep] = useState(0);
  const hasMounted = useRef(false);

  // --- PARALLAX LOGIC ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth out the mouse movement with spring physics
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  useEffect(() => {
    hasMounted.current = true;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position to a range of -0.5 to 0.5
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      mouseX.set((clientX / innerWidth) - 0.5);
      mouseY.set((clientY / innerHeight) - 0.5);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroStep((prev) => (prev + 1) % heroContent.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const fadeUp = hasMounted.current ? false : { opacity: 0, y: 20 };
  const heroTextIn = hasMounted.current ? false : { opacity: 0, y: 30, filter: 'blur(10px)' };
  const fadeIn = hasMounted.current ? false : { opacity: 0 };

  return (
    <div className="min-h-screen bg-[#0f1114] text-gray-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      

      {/* --- NAVBAR --- */}
<nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-black/0 border-b border-white/10">
  <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">

    {/* Logo */}
    <div className="flex items-center gap-3 group cursor-pointer">
      <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 
                      rounded-xl flex items-center justify-center
                      shadow-lg shadow-purple-500/30
                      group-hover:scale-110 group-hover:rotate-6
                      transition-all duration-500">
        <BrainCircuit className="text-white animate-pulse" size={24} />
      </div>

      <span className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 
                       bg-clip-text text-transparent tracking-tight">
        Procastify
      </span>
    </div>

    {/* Buttons */}
    <div className="flex gap-5 items-center">

      <button
        onClick={onLogin}
        className="relative text-gray-300 hover:text-white font-medium text-sm
                   transition-all duration-300
                   after:absolute after:-bottom-1 after:left-0 after:h-[2px]
                   after:w-0 after:bg-gradient-to-r after:from-indigo-400 after:to-pink-400
                   hover:after:w-full after:transition-all after:duration-300">
        Sign In
      </button>

      <button
        onClick={onGuestAccess}
        className="relative px-6 py-2 rounded-full font-semibold text-sm
                   bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
                   hover:scale-105 hover:shadow-lg hover:shadow-purple-500/40
                   transition-all duration-300 text-white">
        Try Guest Mode
      </button>

    </div>
  </div>
</nav>

      {/* --- HERO SECTION --- */}
<main className="relative z-10 w-full">
  <section className="relative overflow-hidden pt-20 pb-20 px-6 flex flex-col items-center justify-center text-center min-h-[90vh]">

    {/* ================= INTENSE VISUAL ENGINE ================= */}

{/* Animated Gradient Mesh Background */}
<motion.div
  animate={{
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
  }}
  transition={{
    duration: 20,
    repeat: Infinity,
    ease: "linear"
  }}
  className="absolute inset-0 opacity-40"
  style={{
    background: `
      radial-gradient(circle at 20% 30%, rgba(99,102,241,0.5), transparent 40%),
      radial-gradient(circle at 80% 70%, rgba(168,85,247,0.5), transparent 40%),
      radial-gradient(circle at 50% 50%, rgba(236,72,153,0.4), transparent 50%)
    `,
    backgroundSize: "200% 200%"
  }}
/>

{/* Strong AI Core Glow */}
<motion.div
  animate={{ scale: [1, 1.2, 1] }}
  transition={{ duration: 4, repeat: Infinity }}
  className="absolute left-1/2 top-1/2 w-[1000px] h-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/30 blur-[200px]"
/>

{/* Rotating Gradient Ring */}
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
  className="absolute left-1/2 top-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-transparent"
  style={{
    background: "conic-gradient(from 0deg, #6366f1, #a855f7, #ec4899, #6366f1)",
    WebkitMask: "radial-gradient(circle 280px at center, transparent 99%, black 100%)",
    mask: "radial-gradient(circle 280px at center, transparent 99%, black 100%)"
  }}
/>

{/* Animated Grid */}
<motion.div
  animate={{ y: [0, -40] }}
  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
  className="absolute inset-0 opacity-10"
  style={{
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
    backgroundSize: "60px 60px"
  }}
/>

{/* Larger Floating Particles */}
{[...Array(25)].map((_, i) => (
  <motion.div
    key={i}
    className="absolute w-2 h-2 rounded-full"
    style={{
      background:
        i % 3 === 0
          ? "#6366f1"
          : i % 3 === 1
          ? "#a855f7"
          : "#ec4899",
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`
    }}
    animate={{
      y: [0, -80, 0],
      opacity: [0.3, 1, 0.3],
      scale: [1, 1.8, 1]
    }}
    transition={{
      duration: 6 + Math.random() * 4,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
))}

{/* Enhanced Structured Output Card */}
<motion.div
  initial={{ y: 100, opacity: 0, scale: 0.8 }}
  animate={{ y: 0, opacity: 1, scale: 1 }}
  transition={{ duration: 1.2, delay: 1 }}
  className="absolute bottom-24 right-1/4 w-80 h-44 bg-black/40 backdrop-blur-2xl border border-green-400/50 rounded-3xl p-6 shadow-[0_0_80px_rgba(34,197,94,0.4)]"
>
  <motion.div
    animate={{ x: [-200, 200] }}
    transition={{ duration: 2, repeat: Infinity }}
    className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30"
  />

  <div className="relative z-10">
    <div className="w-1/2 h-3 bg-green-400 rounded mb-4"></div>
    <div className="w-full h-2 bg-white/20 rounded mb-2"></div>
    <div className="w-5/6 h-2 bg-white/20 rounded mb-2"></div>
    <div className="w-4/6 h-2 bg-white/20 rounded"></div>
  </div>
</motion.div>


    {/* ================= HERO TEXT ================= */}

    <div className="relative h-[380px] w-full max-w-6xl flex items-center justify-center mb-0 z-10">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentHeroStep}
          initial={{ opacity: 0, y: 30, filter: 'blur(15px)', scale: 0.95 }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
          exit={{ opacity: 0, y: -30, filter: 'blur(15px)', scale: 1.05 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 flex flex-col items-center justify-center"
        >
          <h1 className="text-6xl md:text-[5.5rem] font-black mb-8 tracking-tighter leading-[0.95] text-white">
            {heroContent[currentHeroStep].title} <br />
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${heroContent[currentHeroStep].color} drop-shadow-2xl`}>
              {heroContent[currentHeroStep].sub}
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
            {heroContent[currentHeroStep].desc}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>

    {/* ================= CTA ================= */}

    <motion.div 
      initial={fadeUp}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.8 }}
      className="flex flex-col items-center gap-10 relative z-20 mt-16"
    >
      <button
        onClick={onGuestAccess}
        className="group relative bg-white text-black hover:bg-gray-100 px-10 py-5 rounded-2xl font-bold text-xl shadow-[0_0_60px_rgba(255,255,255,0.15)] flex items-center justify-center gap-3 transition-all hover:scale-[1.05] active:scale-95"
      >
        Start Learning 
        <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform duration-300" />
      </button>

      <div className="inline-flex items-center gap-3 bg-white/[0.03] backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
        <Sparkles size={16} className="text-yellow-500" />
        <span className="hidden md:inline text-sm font-semibold tracking-wide text-gray-300 uppercase">
          Smart summaries • Meaningful notes • Intelligent tests
        </span>
        <span className="md:hidden text-sm font-bold uppercase tracking-wider">
          AI Powered Learning
        </span>
      </div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-gray-600 mt-12 opacity-50"
      >
        <ChevronDown size={40} strokeWidth={1} />
      </motion.div>
    </motion.div>

  </section>

        {/* Visualizing the Engine Section */}
        <section className="py-32 border-t border-white/5 bg-[#050505] relative z-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-24">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Visualizing the Engine</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                See how we take the weight off your shoulders. From raw chaos to clear mastery in four steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative">
               {/* Connecting Line (Desktop) */}
               <div className="hidden lg:block absolute top-[60px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>

              {/* Step 1 */}
              <motion.div 
                initial={fadeUp}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="relative flex flex-col items-center text-center group"
              >
                  <div className="relative w-32 h-32 mb-6">
                    <div className="absolute top-0 left-0 animate-float">
                        <div className="p-3 bg-gray-800 rounded-lg border border-red-500/30 transform -rotate-12">
                            <FileText className="text-red-400" size={20} />
                            <div className="h-1 w-8 bg-gray-700 mt-2 rounded"></div>
                        </div>
                    </div>
                    <div className="absolute bottom-4 right-0 animate-float-delayed">
                         <div className="p-3 bg-gray-800 rounded-lg border border-orange-500/30 transform rotate-12">
                            <Layout className="text-orange-400" size={20} />
                            <div className="h-1 w-6 bg-gray-700 mt-2 rounded"></div>
                        </div>
                    </div>
                    <div className="absolute top-8 right-8 z-10">
                        <div className="p-2 bg-gray-800 rounded border border-red-500/20 transform rotate-6">
                             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                  </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-app-text mb-2">1. Input Chaos</h3>
                  <p className="text-gray-400 text-sm">Dump the overload. Lecture notes, raw text, and messy thoughts go here.</p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div 
                initial={fadeUp}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative flex flex-col items-center text-center group"
              >
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 z-10 relative">
                      <BrainCircuit className="text-white animate-pulse" size={40} />
                    </div>
                   
                    <div className="absolute inset-0 border border-indigo-500/30 rounded-full scale-150 animate-spin opacity-50"></div>
                    <div className="absolute inset-0 border border-purple-500/30 rounded-full scale-125 animate-ping opacity-20"></div>
                   
                    <div className="absolute top-1/2 -left-12 lg:hidden">
                      <MoveRight className="text-gray-600" />
                    </div>
                  </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-app-text mb-2">2. Intelligent Core</h3>
                  <p className="text-gray-400 text-sm">Our AI engine connects the dots, structuring concepts and filtering noise.</p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div 
                initial={fadeUp}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="relative flex flex-col items-center text-center group"
              >
                  <div className="relative w-32 h-32 flex flex-col items-center justify-center gap-2 mb-6">
                    
                    <div className="w-24 h-8 bg-gray-800 border border-green-500/30 rounded-lg flex items-center px-3 shadow-lg transform translate-y-4 scale-95 opacity-60">
                      <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                    </div>
                    <div className="w-24 h-8 bg-gray-800 border border-green-500/50 rounded-lg flex items-center px-3 shadow-lg transform translate-y-2 scale-98 opacity-80">
                      <div className="w-2 h-2 rounded-full bg-green-500/70"></div>
                      <div className="w-12 h-1 bg-gray-600 ml-2 rounded"></div>
                    </div>
                    <div className="w-24 h-10 bg-gray-800 border border-green-500 rounded-lg flex items-center px-3 shadow-lg z-10">
                      <Layers size={16} className="text-green-400 mr-2" />
                      <div className="w-10 h-1 bg-gray-500 rounded"></div>
                    </div>
                  </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-app-text mb-2">3. Crystal Clarity</h3>
                  <p className="text-gray-400 text-sm">Get clean summaries, structured visual notes, and clear takeaways.</p>
                </div>
              </motion.div>

              {/* Step 4 */}
              <motion.div 
                initial={fadeUp}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="relative flex flex-col items-center text-center group"
              >
                  <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                    
                    <div className="absolute inset-0 border-2 border-dashed border-yellow-500/30 rounded-full animate-spin-slow"></div>
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center border border-yellow-500/50">
                      <Target className="text-yellow-400" size={32} />
                    </div>
                    <div className="absolute -right-2 top-0 bg-gray-800 p-1.5 rounded-full border border-yellow-500/50">
                      <Play size={12} className="text-yellow-400 fill-yellow-400" />
                    </div>
                  </div>
                <h3 className="text-lg font-bold text-white mb-2">4. Active Mastery</h3>
                <p className="text-gray-500 text-sm leading-relaxed px-4">
                  Close the loop. Test yourself with auto-generated quizzes and routines.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features Section */}
        <section className="py-32 bg-[#0b0c0e] border-t border-white/5 relative z-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Complete Learning Ecosystem</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">Everything you need to transform how you learn, all in one place.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(0,auto)]">
            
            {/* Left Column */}
            <div className="md:col-span-4 flex flex-col gap-6">
              {/* Routine Card */}
              <motion.div 
                initial={fadeUp}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-[#16181d] border border-white/5 rounded-3xl p-6 hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-[border-color,box-shadow] duration-300 group overflow-hidden relative"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Calendar size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Routine Generation</h3>
                </div>
                <p className="text-gray-400 text-sm mb-6">Automated schedules built around your goals.</p>
                
                <div className="bg-[#0a0b0c] rounded-xl p-4 border border-white/5 space-y-3 font-mono text-xs text-gray-400">
                    <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border-l-2 border-blue-500 group-hover:translate-x-2 transition-transform duration-300">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full border border-blue-500"></div>
                         <div className="w-20 h-2 bg-white/10 rounded group-hover:w-24 transition-all duration-300"></div>
                      </div>
                      <span className="opacity-50">09:00 AM</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border-l-2 border-purple-500 group-hover:translate-x-2 transition-transform duration-300 delay-75">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full border border-purple-500"></div>
                         <div className="w-24 h-2 bg-white/10 rounded group-hover:w-28 transition-all duration-300"></div>
                      </div>
                      <span className="opacity-50">10:30 AM</span>
                    </div>
                     <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border-l-2 border-green-500 group-hover:translate-x-2 transition-transform duration-300 delay-100">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full border border-green-500"></div>
                         <div className="w-16 h-2 bg-white/10 rounded group-hover:w-20 transition-all duration-300"></div>
                      </div>
                      <span className="opacity-50">01:00 PM</span>
                    </div>
                </div>
              </motion.div>

              {/* Deep Focus Card */}
              <motion.div 
                initial={fadeUp}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-[#16181d] border border-white/5 rounded-3xl p-6 hover:border-pink-500/30 hover:shadow-[0_0_30px_rgba(236,72,153,0.15)] transition-[border-color,box-shadow] duration-300 group relative overflow-hidden flex-1"
              >
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent to-pink-500/5 group-hover:to-pink-500/10 transition-[background] duration-300"></div>
                 
                 <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                    <Timer size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Deep Focus</h3>
                </div>
                <p className="text-gray-400 text-sm mb-8 relative z-10">Distraction-free environment with glowing aura.</p>

                <div className="bg-black/40 rounded-xl p-8 border border-white/5 flex flex-col items-center justify-center relative z-10">
                   <div className="absolute inset-0 bg-pink-500/10 blur-2xl rounded-full transform scale-50 animate-pulse group-hover:scale-75 group-hover:bg-pink-500/20 transition-all duration-500"></div>
                   <span className="text-4xl font-mono font-bold text-white tracking-widest relative z-10 group-hover:scale-110 transition-transform duration-300">
                     24 : 59
                   </span>
                   <span className="text-xs text-pink-500 font-medium mt-2 tracking-widest uppercase relative z-10 group-hover:text-pink-400 transition-colors">Flow State</span>
                </div>
              </motion.div>
            </div>

            {/* Middle Column (Tall) */}
            <motion.div
               initial={fadeUp}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.2 }}
               className="md:col-span-4 bg-[#16181d] border border-white/5 rounded-3xl p-6 hover:border-orange-500/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-[border-color,box-shadow] duration-300 group flex flex-col relative overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-4 z-10">
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                    <Layers size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Learning Feed</h3>
                </div>
                <p className="text-gray-400 text-sm mb-8 z-10">Bite-sized reels generated from your notes.</p>

                <div className="flex-1 relative flex items-end justify-center">
                    <div className="w-[80%] h-[400px] bg-[#0a0b0c] border-t-8 border-l-8 border-r-8 border-[#20222b] rounded-t-3xl relative overflow-hidden">
                       <div className="absolute top-4 left-4 text-[10px] text-gray-500">Reels</div>
                       <div className="absolute top-4 right-4">
                         <Zap size={12} className="text-gray-500"/>
                       </div>
                       
                       {/* Mock Phone Content */}
                       <div className="mt-8 mx-4 h-full relative overflow-hidden">
                          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 transform translate-y-20 group-hover:translate-y-0 transition-transform duration-700 ease-out">
                             {/* Next Reel Peek */}
                             <div className="h-48 rounded-xl bg-gray-800/50 p-4 opacity-50 scale-95"></div>
                             
                             {/* Current Reel */}
                             <div className="h-64 bg-gradient-to-br from-indigo-600 via-purple-600 to-orange-500 opacity-90 rounded-xl p-4 flex flex-col justify-end pb-8 shadow-lg">
                                <div className="w-8 h-8 rounded-full bg-white/10 mb-2 backdrop-blur-sm"></div>
                                <div className="w-3/4 h-3 bg-white/20 rounded mb-2 backdrop-blur-sm"></div>
                                <div className="w-1/2 h-3 bg-white/20 rounded backdrop-blur-sm"></div>
                             </div>
                          </div>
                       </div>
                    </div>
                     {/* Gradient Overlay at bottom to blend */}
                     <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#16181d] to-transparent z-20"></div>
                </div>
            </motion.div>

            {/* Right Column */}
            <div className="md:col-span-4 flex flex-col gap-6">
              {/* Note Taking Card */}
              <motion.div 
                initial={fadeUp}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-[#16181d] border border-white/5 rounded-3xl p-6 hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-[border-color,box-shadow] duration-300 group overflow-hidden"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <PenTool size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Smart Note-Taking</h3>
                </div>
                <p className="text-gray-400 text-sm mb-6">Text editor + Infinite canvas. Best of both worlds.</p>
                
                <div className="bg-[#0a0b0c] rounded-xl h-32 border border-white/5 relative overflow-hidden p-4 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <div className="w-full h-2 bg-white/10 rounded group-hover:bg-emerald-500/20 transition-colors duration-300"></div>
                       <div className="w-3/4 h-2 bg-white/10 rounded group-hover:w-full transition-all duration-300 delay-75"></div>
                       <div className="w-full h-2 bg-white/10 rounded group-hover:bg-emerald-500/20 transition-colors duration-300 delay-100"></div>
                       <div className="w-5/6 h-2 bg-white/10 rounded group-hover:w-full transition-all duration-300 delay-150"></div>
                    </div>
                    <div className="border-l border-white/5 pl-4 relative">
                       <div className="w-8 h-8 border border-emerald-500/50 rounded flex items-center justify-center absolute top-0 left-4 group-hover:rotate-12 transition-transform duration-300">
                          <div className="w-4 h-4 bg-emerald-500/20 rounded-sm"></div>
                       </div>
                       <div className="absolute top-4 left-12 w-8 h-[1px] bg-emerald-500/30 group-hover:w-16 transition-all duration-300"></div>
                       <div className="w-8 h-8 border border-emerald-500/50 rounded-full flex items-center justify-center absolute top-4 left-20 group-hover:scale-110 transition-transform duration-300"></div>
                    </div>
                </div>
              </motion.div>

              {/* Quizzes Card */}
              <motion.div 
                initial={fadeUp}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-[#16181d] border border-white/5 rounded-3xl p-6 hover:border-yellow-500/30 hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] transition-[border-color,box-shadow] duration-300 group overflow-hidden flex-1"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                    <CheckCircle size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Intelligent Quizzes</h3>
                </div>
                <p className="text-gray-400 text-sm mb-8">Test your knowledge gaps instantly.</p>

                <div className="bg-[#0a0b0c] rounded-xl p-4 border border-white/5 space-y-4">
                   <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-gray-600 rounded-full group-hover:w-full group-hover:bg-yellow-500 transition-all duration-500"></div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border border-gray-600 group-hover:bg-yellow-500 group-hover:border-yellow-500 transition-colors duration-300 delay-100 flex items-center justify-center">
                          <CheckCircle size={10} className="text-black opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="h-2 w-1/2 bg-white/20 rounded-full group-hover:bg-yellow-500/50 transition-colors duration-300"></div>
                   </div>
                    <div className="flex items-center gap-3 p-2 bg-green-500/10 rounded-lg border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                         <CheckCircle size={10} className="text-black"/>
                      </div>
                      <div className="h-2 w-3/4 bg-white rounded-full"></div>
                   </div>
                </div>
              </motion.div>
            </div>
           </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-20 bg-[#070809] border-t border-white/5 pt-20 pb-10 text-gray-400">
  <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">

    {/* Brand */}
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <BrainCircuit className="text-white" size={20} />
        </div>
        <span className="text-xl font-bold text-white">Procastify</span>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">
        Turning chaos into clarity through intelligent learning systems.
      </p>
      <p className="mt-4 italic text-gray-600 text-xs">
        “Mastery isn’t about time spent. It’s about focus applied.”
      </p>
    </div>

    {/* Product */}
    <div>
      <h4 className="text-white font-semibold mb-4">Product</h4>
      <ul className="space-y-2 text-sm">
        <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Learning Feed</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Deep Focus</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Quizzes</a></li>
      </ul>
    </div>

    {/* Resources */}
    <div>
      <h4 className="text-white font-semibold mb-4">Resources</h4>
      <ul className="space-y-2 text-sm">
        <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
        <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
      </ul>
    </div>

    {/* Legal */}
    <div>
      <h4 className="text-white font-semibold mb-4">Legal</h4>
      <ul className="space-y-2 text-sm">
        <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
      </ul>

      {/* Socials */}
      <div className="flex gap-4 mt-6">
        <a href="#" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <Twitter size={18} />
        </a>
        <a href="#" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <Github size={18} />
        </a>
      </div>
    </div>
  </div>

  <div className="border-t border-white/5 mt-16 pt-6 text-center text-xs text-gray-600">
    © 2024 Procastify. All rights reserved.
  </div>
</footer>

    </div>
  );
};

export default Landing;