export function PokeLogo({className=""}:{className?:string}) {
 return <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
  <path d="M8 11h11l5-6 5 6h11v26H29l-5 6-5-6H8z" fill="none" stroke="currentColor" strokeWidth="2"/>
  <circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
  <circle cx="24" cy="24" r="2.7" fill="currentColor"/>
  <path d="M3 24h9M36 24h9M24 2v9M24 37v9" stroke="currentColor" strokeWidth="2"/>
 </svg>;
}

