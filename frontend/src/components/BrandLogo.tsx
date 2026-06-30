import { SVGProps } from "react";
import { Logo } from "@/components/Logo";

interface BrandLogoProps {
  layout?: "horizontal" | "stacked";
  className?: string;
  iconSize?: number;
}

export function BrandLogo({ layout = "horizontal", className = "", iconSize = 40 }: BrandLogoProps) {
  if (layout === "stacked") {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <Logo width={iconSize} height={iconSize} className="mb-3" />
        <div className="flex flex-col items-center">
          <span className="text-3xl font-semibold tracking-tight leading-none mb-1">
            <span className="text-[#0F172A]">Side</span>
            <span className="text-[#FACC15]">Kick</span>
          </span>
          <span className="text-[#64748B] text-sm font-medium">Beyond 9–5.</span>
        </div>
      </div>
    );
  }

  // Horizontal layout (Primary Logo)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo width={iconSize} height={iconSize} className="flex-shrink-0" />
      <div className="flex flex-col">
        <span className="text-2xl font-bold tracking-tight leading-none">
          <span className="text-foreground">Side</span>
          <span className="text-primary">Kick</span>
        </span>
      </div>
    </div>
  );
}
