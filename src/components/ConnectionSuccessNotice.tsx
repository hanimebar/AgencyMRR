"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function ConnectionSuccessNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg flex items-center gap-3"
    >
      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
      <p className="text-sm text-green-500 font-medium">
        Stripe connected. Metrics will update automatically.
      </p>
    </motion.div>
  );
}
