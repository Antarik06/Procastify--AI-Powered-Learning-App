import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Users, BookOpen, Presentation, Loader2, ArrowRight } from 'lucide-react';
import { UserRole } from '../types';

interface RoleSelectionProps {
    onRoleSelected: (role: UserRole) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onRoleSelected }) => {
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRoleSelect = async (role: UserRole) => {
        setSelectedRole(role);
        setLoading(true);
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));
        
        onRoleSelected(role);
    };

    const roles = [
        {
            role: 'student' as UserRole,
            title: "I'm a Student",
            description: "Access your personalized learning dashboard, manage notes, and track your progress",
            icon: GraduationCap,
            color: '#5865F2',
            features: [
                { icon: BookOpen, text: "Organize study materials" },
                { icon: Users, text: "Join teacher classrooms" },
                { icon: Presentation, text: "Access shared resources" }
            ]
        },
        {
            role: 'teacher' as UserRole,
            title: "I'm a Teacher",
            description: "Create classrooms, share resources, and track student progress",
            icon: Presentation,
            color: '#57F287',
            features: [
                { icon: Users, text: "Manage classrooms" },
                { icon: BookOpen, text: "Share learning resources" },
                { icon: GraduationCap, text: "Track student progress" }
            ]
        }
    ];

    return (
        <div className="min-h-screen w-full bg-app-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-[#5865F2]/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />

            <div className="relative z-10 w-full max-w-5xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-app-text mb-4">
                        Choose Your Role
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Select how you'll be using Procastify-AI
                    </p>
                </motion.div>

                {/* Role Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                    {roles.map((roleData, index) => {
                        const Icon = roleData.icon;
                        const isSelected = selectedRole === roleData.role;
                        
                        return (
                            <motion.button
                                key={roleData.role}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => handleRoleSelect(roleData.role)}
                                disabled={loading}
                                className={`
                                    relative p-8 rounded-2xl border-2 transition-all duration-300
                                    ${isSelected 
                                        ? 'border-[#5865F2] bg-[#5865F2]/10 scale-105' 
                                        : 'border-app-border bg-app-panel hover:border-app-border hover:scale-105'
                                    }
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    text-left group
                                `}
                                style={{
                                    boxShadow: isSelected ? `0 0 40px ${roleData.color}40` : 'none'
                                }}
                            >
                                {/* Icon */}
                                <div 
                                    className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-all"
                                    style={{
                                        backgroundColor: `${roleData.color}20`,
                                        color: roleData.color
                                    }}
                                >
                                    <Icon size={32} />
                                </div>

                                {/* Title & Description */}
                                <h2 className="text-2xl font-bold text-app-text mb-3">
                                    {roleData.title}
                                </h2>
                                <p className="text-gray-400 mb-6">
                                    {roleData.description}
                                </p>

                                {/* Features */}
                                <div className="space-y-3">
                                    {roleData.features.map((feature, idx) => {
                                        const FeatureIcon = feature.icon;
                                        return (
                                            <div key={idx} className="flex items-center gap-3 text-gray-300">
                                                <div 
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                    style={{
                                                        backgroundColor: `${roleData.color}15`,
                                                        color: roleData.color
                                                    }}
                                                >
                                                    <FeatureIcon size={16} />
                                                </div>
                                                <span className="text-sm">{feature.text}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Selection Indicator */}
                                {isSelected && loading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl"
                                    >
                                        <Loader2 className="animate-spin text-app-text" size={32} />
                                    </motion.div>
                                )}

                                {/* Hover Arrow */}
                                <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight size={24} className="text-app-text" />
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Footer Note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-gray-500 text-sm mt-8"
                >
                    You can always access features based on your selected role
                </motion.p>
            </div>
        </div>
    );
};

export default RoleSelection;
