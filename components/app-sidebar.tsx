"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  Gauge,
  Mic,
  Video,
  Archive,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

const sidebarVariants = {
  open: {
    width: "15rem",
  },
  closed: {
    width: "3.5rem",
  },
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      x: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: {
      x: { stiffness: 100 },
    },
  },
};

const transitionProps: any = {
  type: "tween",
  ease: "circOut",
  duration: 0.1,
};

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const pathname = usePathname();

  return (
    <motion.div
      className={cn(
        "fixed left-0 top-0 z-40 h-screen shrink-0 border-r bg-[#0a0a0a] shadow-2xl transition-all",
      )}
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <div className="flex h-full flex-col">
        {/* Organization Header */}
        <div className="flex h-16 w-full shrink-0 border-b items-center px-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                  <img src="/Loanie logo.png" alt="" />
                </div>
                {!isCollapsed && (
                  <motion.div
                    variants={variants}
                    initial="closed"
                    animate="open"
                    className="flex flex-1 items-center justify-between overflow-hidden"
                  >
                    <span className="text-lg font-semibold truncate text-foreground ml-2">Loanie</span>
                  </motion.div>
                )}
        </div>

        {/* Navigation Links */}
        <ScrollArea className="flex-1 p-2">
          <div className="flex grow flex-col gap-1">
            <SidebarLink 
              href="/" 
              icon={<Gauge className="h-4 w-4" />} 
              label="Overview" 
              isActive={pathname === "/"}
              isCollapsed={isCollapsed}
            />
            <Separator className="my-2 opacity-20" />
            <SidebarLink 
              href="/record-meeting" 
              icon={<Mic className="h-4 w-4" />} 
              label="Record Meeting" 
              isActive={pathname === "/record-meeting"}
              isCollapsed={isCollapsed}
            />
            <SidebarLink 
              href="/generate-video" 
              icon={<Video className="h-4 w-4" />} 
              label="Generate Video" 
              isActive={pathname === "/generate-video"}
              isCollapsed={isCollapsed}
            />
            <SidebarLink 
              href="/artifacts" 
              icon={<Archive className="h-4 w-4" />} 
              label="Artifacts" 
              isActive={pathname === "/artifacts"}
              isCollapsed={isCollapsed}
            />
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
}

function SidebarLink({ 
  href, 
  icon, 
  label, 
  isActive, 
  isCollapsed 
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean;
  isCollapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-10 items-center rounded-md px-3 py-2 transition-all duration-200 group relative",
        isActive 
          ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" 
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      )}
    >
      <div className="flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
        {icon}
      </div>
      {!isCollapsed && (
        <motion.span
          variants={variants}
          initial="closed"
          animate="open"
          className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden"
        >
          {label}
        </motion.span>
      )}
      {isCollapsed && (
        <div className="absolute left-full ml-4 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-md border z-50">
          {label}
        </div>
      )}
    </Link>
  );
}
