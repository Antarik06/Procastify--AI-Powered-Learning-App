import React from 'react';
import { Sparkles } from 'lucide-react';

/** Reminds guests their data is device-local and offers the upgrade path. */
export const GuestBanner: React.FC<{ onSignUp: () => void }> = ({ onSignUp }) => (
  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-discord-accent/20 bg-discord-accent/10 px-4 py-1.5 text-xs text-indigo-100 backdrop-blur-md">
    <span className="flex items-center gap-2">
      <Sparkles size={13} className="text-discord-accent" />
      Guest mode — your work is saved to this device only.
    </span>
    <button
      onClick={onSignUp}
      className="rounded-lg px-2 py-0.5 font-medium underline-offset-2 transition-colors hover:bg-white/10 hover:text-white hover:underline"
    >
      Sign up to sync
    </button>
  </div>
);
