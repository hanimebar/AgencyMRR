"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCompact } from "@/lib/utils";
import { useEffect, useState } from "react";

interface HeroSectionProps {
  totalMrr: number;
  startupCount: number;
}

export function HeroSection({ totalMrr, startupCount }: HeroSectionProps) {
  const [animatedMrr, setAnimatedMrr] = useState(0);
  const [animatedCount, setAnimatedCount] = useState(0);

  useEffect(() => {
    // Animate counters
    const duration = 2000;
    const steps = 60;
    const mrrStep = totalMrr / steps;
    const countStep = startupCount / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setAnimatedMrr(Math.min(mrrStep * currentStep, totalMrr));
      setAnimatedCount(Math.min(countStep * currentStep, startupCount));

      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedMrr(totalMrr);
        setAnimatedCount(startupCount);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [totalMrr, startupCount]);

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 gradient-hero opacity-20"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            AgencyMRR
          </h1>
          <p className="text-2xl md:text-3xl text-muted-foreground mb-4">
            Verified recurring revenue,
          </p>
          <p className="text-2xl md:text-3xl text-muted-foreground mb-12">
            direct from your payment provider.
          </p>
        </motion.div>

        {/* Animated metrics pills */}
        <motion.div
          className="flex flex-wrap justify-center gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div
            className="glass-strong px-6 py-3 rounded-full"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-sm text-muted-foreground">Total MRR Tracked</div>
            <div className="text-2xl font-bold">{formatCompact(animatedMrr)}</div>
          </motion.div>
          <motion.div
            className="glass-strong px-6 py-3 rounded-full"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-sm text-muted-foreground">Verified Startups</div>
            <div className="text-2xl font-bold">{Math.round(animatedCount)}</div>
          </motion.div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          className="flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Link href="/submit">
            <Button size="lg" className="text-lg px-8 py-6">
              List Your Startup
            </Button>
          </Link>
          <Link href="#leaderboard">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Browse Leaderboard
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
