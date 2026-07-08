import { FunnySnake } from './FunnySnake';

export const SplashScreen = () => {
    return (
        <div className="fixed inset-0 bg-[#0f0f0f] z-[60] flex flex-col items-center justify-center animate-fade-out">
            <FunnySnake className="w-32 h-32 mb-8" />
            <h1 className="text-4xl font-black text-white tracking-widest mb-2">SPACIFY</h1>
            <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 animate-progress origin-left"></div>
            </div>
            <p className="text-gray-500 mt-4 text-xs font-mono animate-pulse">BOOTING SYSTEM...</p>

            <style>{`
                @keyframes progress {
                    0% { transform: scaleX(0); }
                    100% { transform: scaleX(1); }
                }
                .animate-progress {
                    animation: progress 0.8s ease-in-out forwards;
                }
            `}</style>
        </div>
    );
};
