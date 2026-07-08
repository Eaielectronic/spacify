import React from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={clsx("bg-[#282828] rounded-2xl shadow-2xl border border-white/10 p-8 relative animate-in fade-in zoom-in duration-200", className || "w-96")}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                >
                    <X size={20} />
                </button>
                <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
                {children}
            </div>
        </div>
    );
};
