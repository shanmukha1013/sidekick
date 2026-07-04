import { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="100" height="100" rx="24" fill="#FACC15"/>
      <path d="M 23.7 59.6 A 28 28 0 1 1 40.4 76.3" stroke="#0F172A" strokeWidth={7.5} strokeLinecap="round" />
      <line x1="22" y1="78" x2="65" y2="35" stroke="#0F172A" strokeWidth={7.5} strokeLinecap="round" />
      <polyline points="50,35 65,35 65,50" stroke="#0F172A" strokeWidth={7.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
