import React, { useState } from 'react';
import { UserPreferences } from '../types';
import { ArrowRight, User, Clock, Battery, Target, BellOff } from 'lucide-react';

interface OnboardingProps {
  onComplete: (prefs: UserPreferences) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState<UserPreferences>({
    id: '',
    isGuest: false,
    name: '',
    freeTimeHours: 2,
    energyPeak: 'morning',
    goal: '',
    distractionLevel: 'medium'
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = () => {
    onComplete(prefs);
  };

  const containerClass = "max-w-md w-full bg-app-panel p-8 rounded-2xl shadow-xl border border-app-border";
  const labelClass = "block text-sm font-medium text-app-textMuted mb-2";
  const inputClass = "w-full bg-discord-bg border border-black/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-discord-accent transition-colors";

  return (
    <div className="min-h-screen bg-discord-bg flex items-center justify-center p-4">
      {step === 1 && (
        <div className={containerClass}>
          <div className="mb-6">
            <span className="text-discord-accent text-sm font-bold tracking-wider">STEP 1/4</span>
            <h2 className="text-2xl font-bold text-white mt-1">What should we call you?</h2>
          </div>
          <div className="mb-6">
            <label className={labelClass}>Name</label>
            <div className="relative">
                <User className="absolute left-3 top-3.5 text-app-textMuted" size={18} />
                <input 
                    type="text" 
                    value={prefs.name}
                    onChange={(e) => setPrefs({...prefs, name: e.target.value})}
                    className={`${inputClass} pl-10`}
                    placeholder="Enter your name"
                />
            </div>
          </div>
          <button onClick={nextStep} disabled={!prefs.name} className="w-full bg-discord-accent hover:bg-discord-accentHover text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50">
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className={containerClass}>
          <div className="mb-6">
            <span className="text-discord-accent text-sm font-bold tracking-wider">STEP 2/4</span>
            <h2 className="text-2xl font-bold text-white mt-1">Time & Energy</h2>
          </div>
          
          <div className="mb-6">
            <label className={labelClass}>Daily Free Time (Hours)</label>
            <div className="relative">
                <Clock className="absolute left-3 top-3.5 text-app-textMuted" size={18} />
                <input 
                    type="number" 
                    value={prefs.freeTimeHours}
                    onChange={(e) => setPrefs({...prefs, freeTimeHours: Number(e.target.value)})}
                    className={`${inputClass} pl-10`}
                    min={1} max={24}
                />
            </div>
          </div>

          <div className="mb-6">
            <label className={labelClass}>When is your energy peak?</label>
            <div className="grid grid-cols-3 gap-2">
                {['morning', 'afternoon', 'night'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setPrefs({...prefs, energyPeak: t as any})}
                        className={`py-3 px-2 rounded-lg text-sm font-medium border transition-all capitalize
                            ${prefs.energyPeak === t 
                                ? 'bg-discord-accent/20 border-discord-accent text-discord-accent' 
                                : 'bg-discord-bg border-transparent text-app-textMuted hover:bg-discord-hover'
                            }`}
                    >
                        {t}
                    </button>
                ))}
            </div>
          </div>
          
          <div className="flex gap-3">
             <button onClick={prevStep} className="w-1/3 bg-discord-bg hover:bg-discord-hover text-white py-3 rounded-lg font-medium transition-colors">Back</button>
             <button onClick={nextStep} className="w-2/3 bg-discord-accent hover:bg-discord-accentHover text-white py-3 rounded-lg font-medium transition-colors">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={containerClass}>
            <div className="mb-6">
                <span className="text-discord-accent text-sm font-bold tracking-wider">STEP 3/4</span>
                <h2 className="text-2xl font-bold text-white mt-1">Your Main Goal</h2>
            </div>
            <div className="mb-6">
                <label className={labelClass}>What are you working towards?</label>
                <div className="relative">
                    <Target className="absolute left-3 top-3.5 text-app-textMuted" size={18} />
                    <input 
                        type="text" 
                        value={prefs.goal}
                        onChange={(e) => setPrefs({...prefs, goal: e.target.value})}
                        className={`${inputClass} pl-10`}
                        placeholder="e.g. Exam Prep, Learning React, Revision"
                    />
                </div>
            </div>
             <div className="flex gap-3">
                <button onClick={prevStep} className="w-1/3 bg-discord-bg hover:bg-discord-hover text-white py-3 rounded-lg font-medium transition-colors">Back</button>
                <button onClick={nextStep} disabled={!prefs.goal} className="w-2/3 bg-discord-accent hover:bg-discord-accentHover text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50">Next</button>
            </div>
        </div>
      )}

      {step === 4 && (
         <div className={containerClass}>
            <div className="mb-6">
                <span className="text-discord-accent text-sm font-bold tracking-wider">FINAL STEP</span>
                <h2 className="text-2xl font-bold text-white mt-1">Distraction Level</h2>
            </div>
            <div className="mb-8">
                <label className={labelClass}>How easily do you get distracted?</label>
                <div className="space-y-3">
                    {['low', 'medium', 'high'].map((level) => (
                        <button
                            key={level}
                            onClick={() => setPrefs({...prefs, distractionLevel: level as any})}
                            className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all
                                ${prefs.distractionLevel === level
                                    ? 'bg-discord-accent/20 border-discord-accent text-white' 
                                    : 'bg-discord-bg border-transparent text-app-textMuted hover:bg-discord-hover'
                                }`}
                        >
                            <span className="capitalize font-medium">{level}</span>
                            {level === 'low' && <Battery size={20} className="text-discord-green" />}
                            {level === 'medium' && <Battery size={20} className="text-yellow-500" />}
                            {level === 'high' && <Battery size={20} className="text-discord-red" />}
                        </button>
                    ))}
                </div>
            </div>
             <div className="flex gap-3">
                <button onClick={prevStep} className="w-1/3 bg-discord-bg hover:bg-discord-hover text-white py-3 rounded-lg font-medium transition-colors">Back</button>
                <button onClick={handleSubmit} className="w-2/3 bg-discord-accent hover:bg-discord-accentHover text-white py-3 rounded-lg font-medium transition-colors">Complete Setup</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;