export function WineLogo({className="h-9 w-9"}:{className?:string}) {
 return <svg viewBox="0 0 40 40" className={className} role="img" aria-label="Wine-Nerds grape mark">
  <path d="M22 8c3-5 7-5 11-4-2 5-5 7-11 6" fill="#78936a"/>
  <path d="M20 10c2-4 3-6 3-8" fill="none" stroke="#c98355" strokeWidth="2" strokeLinecap="round"/>
  <g fill="currentColor" stroke="#f0d8bd" strokeWidth=".8">
   <circle cx="17" cy="12" r="5"/><circle cx="25" cy="14" r="5"/><circle cx="12" cy="20" r="5"/>
   <circle cx="21" cy="21" r="5.4"/><circle cx="29" cy="22" r="5"/><circle cx="17" cy="29" r="5"/>
   <circle cx="25" cy="30" r="5"/><circle cx="21" cy="36" r="3.5"/>
  </g>
 </svg>;
}

