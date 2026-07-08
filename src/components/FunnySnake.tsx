

export const FunnySnake = ({ className }: { className?: string }) => {
    return (
        <div className={`relative w-24 h-24 flex items-center justify-center ${className}`}>
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full animate-bounce-gentle"
            >
                {/* Snake Body - Coiled and springy */}
                <path
                    d="M30 80 Q 10 80, 10 60 Q 10 40, 30 40 Q 50 40, 50 60 Q 50 80, 70 80 Q 90 80, 90 60 L 90 30"
                    stroke="#22c55e"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-dash"
                    style={{
                        strokeDasharray: 300,
                        strokeDashoffset: 300,
                        animation: 'dash 2s ease-in-out infinite alternate'
                    }}
                />

                {/* Head */}
                <g className="animate-sway origin-center" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
                    <circle cx="90" cy="30" r="12" fill="#22c55e" />
                    {/* Eyes */}
                    <g style={{ animation: 'blink 3s infinite', transformOrigin: '90px 27px' }}>
                        <circle cx="86" cy="27" r="3" fill="white" />
                        <circle cx="94" cy="27" r="3" fill="white" />
                        <circle cx="86" cy="27" r="1" fill="black" />
                        <circle cx="94" cy="27" r="1" fill="black" />
                    </g>

                    {/* Tongue */}
                    <path
                        d="M90 20 L 87 10 M90 20 L 93 10"
                        stroke="#ff4d4d"
                        strokeWidth="2"
                        className="animate-tongue"
                    />
                </g>
            </svg>
            <style>{`
                @keyframes dash {
                    from { stroke-dashoffset: 300; }
                    to { stroke-dashoffset: 0; }
                }
                @keyframes sway {
                    0%, 100% { transform: rotate(-10deg); }
                    50% { transform: rotate(10deg); }
                }
                @keyframes tongue {
                    0%, 100% { transform: scaleY(1); }
                    50% { transform: scaleY(1.5); }
                }
                @keyframes blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
            `}</style>
        </div>
    );
};
