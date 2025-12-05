import React, { useEffect, useState } from 'react';

interface ExileOverlayProps {
    exiledName: string | null;
    onAnimationComplete: () => void;
}

export const ExileOverlay: React.FC<ExileOverlayProps> = ({ exiledName, onAnimationComplete }) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (exiledName) {
            setStep(1); // Start red flash
            const t1 = setTimeout(() => setStep(2), 200); // Start text
            const t2 = setTimeout(() => setStep(3), 3000); // End
            const t3 = setTimeout(() => {
                setStep(0);
                onAnimationComplete();
            }, 3500);

            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
                clearTimeout(t3);
            };
        }
    }, [exiledName, onAnimationComplete]);

    if (!exiledName || step === 0) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
            {/* Red Flash Background */}
            <div className={`absolute inset-0 bg-red-600 mix-blend-multiply transition-opacity duration-1000 ${step === 1 ? 'opacity-80 animate-exile-flash' : 'opacity-20'}`}></div>
            
            {/* Shake Effect Container */}
            <div className={`relative ${step === 2 ? 'animate-shake-hard' : ''}`}>
                <div className="bg-black/90 border-4 border-red-600 p-12 transform rotate-2 shadow-[0_0_100px_rgba(220,38,38,0.8)] text-center">
                    <h1 className="text-6xl md:text-9xl font-header text-red-500 uppercase tracking-tighter drop-shadow-lg">
                        ИЗГНАН
                    </h1>
                    <div className="text-3xl md:text-5xl font-mono text-white mt-4 bg-red-600 px-4 py-2 inline-block">
                        {exiledName}
                    </div>
                </div>
            </div>

            {/* Scanlines / Noise */}
            <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] opacity-10 mix-blend-overlay bg-cover"></div>
        </div>
    );
};