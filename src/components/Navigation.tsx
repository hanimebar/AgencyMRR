"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 glass-strong border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent"
            >
              AgencyMRR
            </motion.div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost">Leaderboard</Button>
            </Link>
            <Link href="/submit">
              <Button variant="outline">List Your Startup</Button>
            </Link>
            <Link href="/advertise">
              <Button variant="ghost">Advertise</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
