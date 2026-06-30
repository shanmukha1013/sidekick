"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Download, Receipt } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Navbar } from "@/components/Navbar";

export default function WalletPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
  };

  return (
    <div className="min-h-screen bg-transparent font-sans text-foreground">
      <Navbar />

      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto p-6 mt-8"
      >
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-4 py-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2 shadow-sm">
            <Download className="w-4 h-4" /> Export Statement
          </motion.button>
        </motion.div>

        {/* Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} className="col-span-1 md:col-span-2 bg-primary text-primary-foreground p-8 rounded-xl shadow-lg relative overflow-hidden transition-all">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 100, ease: "linear" }} className="absolute -top-12 -right-12 p-8 opacity-10">
              <Logo className="w-48 h-48" />
            </motion.div>
            <p className="text-sm font-medium text-primary-foreground/80 mb-2 relative z-10">Available Balance</p>
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-5xl font-bold mb-8 relative z-10"
            >
              $0.00
            </motion.h2>
            <div className="flex gap-4 relative z-10">
              <motion.button whileTap={{ scale: 0.95 }} className="px-6 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-md flex items-center gap-2 opacity-50 cursor-not-allowed">
                <ArrowUpRight className="w-4 h-4" /> Withdraw
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-6 py-2.5 bg-primary-foreground/10 font-semibold rounded-md hover:bg-primary-foreground/20 transition-colors flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4" /> Deposit
              </motion.button>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="col-span-1 bg-card border border-border p-8 rounded-xl shadow-sm flex flex-col justify-center transition-all">
            <p className="text-sm font-medium text-muted-foreground mb-2">Pending Clearance</p>
            <h2 className="text-3xl font-bold mb-4 text-foreground">$0.00</h2>
            <p className="text-xs text-muted-foreground">No active escrow milestones currently pending.</p>
          </motion.div>
        </div>

        {/* Transactions */}
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border flex items-center justify-between bg-card">
            <h3 className="font-bold text-lg">Recent Transactions</h3>
          </div>
          
          <motion.div whileHover={{ scale: 1.01 }} className="p-16 flex flex-col items-center justify-center text-center group cursor-pointer transition-all">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
              <Receipt className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </motion.div>
            <h3 className="font-bold text-lg mb-2">No transactions yet</h3>
            <p className="text-muted-foreground max-w-sm">When you get paid or deposit funds, your transaction history will appear here.</p>
          </motion.div>
        </motion.div>
      </motion.main>
    </div>
  );
}
