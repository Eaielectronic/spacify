import React from 'react';

export const MusicBars: React.FC = () => {
    return (
        <div className="flex items-end gap-[2px] h-3 w-4">
            <div className="w-1 bg-green-500 rounded-full animate-[music-bar-1_0.8s_ease-in-out_infinite]"></div>
            <div className="w-1 bg-green-500 rounded-full animate-[music-bar-2_0.5s_ease-in-out_infinite]"></div>
            <div className="w-1 bg-green-500 rounded-full animate-[music-bar-3_1.0s_ease-in-out_infinite]"></div>
            <style>{`
        @keyframes music-bar-1 {
          0%, 100% { height: 40%; }
          50% { height: 100%; }
        }
        @keyframes music-bar-2 {
          0%, 100% { height: 70%; }
          50% { height: 30%; }
        }
        @keyframes music-bar-3 {
          0%, 100% { height: 50%; }
          50% { height: 90%; }
        }
      `}</style>
        </div>
    );
};
