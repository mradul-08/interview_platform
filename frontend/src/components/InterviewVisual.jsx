import { motion } from "framer-motion";
import Background3D from "./Background3D";

function InterviewVisual() {
    return (
        <div className="relative hidden lg:flex w-1/2 min-h-screen items-center justify-center overflow-hidden bg-slate-950">
            <Background3D />

            <div className="relative z-10 flex flex-col items-center px-12 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="grid grid-cols-2 gap-4 mb-10"
                >
                    <motion.div
                        animate={{ boxShadow: ["0 0 0 0 rgba(99,102,241,0.4)", "0 0 0 12px rgba(99,102,241,0)"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-40 h-28 rounded-xl bg-slate-800/60 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-2"
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                            HR
                        </div>
                        <span className="text-xs text-slate-300">Interviewer</span>
                    </motion.div>

                    <motion.div
                        animate={{ boxShadow: ["0 0 0 0 rgba(236,72,153,0.4)", "0 0 0 12px rgba(236,72,153,0)"] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        className="w-40 h-28 rounded-xl bg-slate-800/60 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-2"
                    >
                        <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white font-semibold">
                            S
                        </div>
                        <span className="text-xs text-slate-300">Candidate</span>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30"
                >
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-red-400 font-medium">Live Interview</span>
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-3xl font-bold text-white mb-3"
                >
                    Ace Your Next Interview
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-slate-400 max-w-sm"
                >
                    Practice real-time mock interviews, get instant feedback, and land your dream job with Interview Platform.
                </motion.p>
            </div>
        </div>
    );
}

export default InterviewVisual;