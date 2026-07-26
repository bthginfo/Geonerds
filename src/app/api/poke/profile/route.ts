import {NextResponse} from "next/server";
import {getSession} from "@/lib/auth";
import {getDb,isDbConfigured} from "@/lib/db";
import {leagueTier} from "@/poke/competition";
import {ensureCurrentPokeSeason,requirePokeMutation} from "@/poke/server";
import {STANDARD_TYPES} from "@/poke/type-chart";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 if(!isDbConfigured)return NextResponse.json({configured:false,profile:null});
 const session=await getSession();if(!session)return NextResponse.json({configured:true,profile:null});
 return NextResponse.json({configured:true,profile:await currentProfile(session.uid,session.name)});
}

export async function PATCH(req:Request){
 if(!isDbConfigured)return NextResponse.json({error:"not_configured"},{status:503});
 const gate=await requirePokeMutation(req,"profile",12,60);
 if("error" in gate)return NextResponse.json({error:gate.error,retryAfter:gate.retryAfter},{status:gate.status});
 let body:Record<string,unknown>;try{body=await req.json()}catch{return NextResponse.json({error:"bad_request"},{status:400})}
 const avatarSpeciesId=Number(body.avatarSpeciesId);
 const favoriteType=String(body.favoriteType??"").toLowerCase();
 const bio=String(body.bio??"").trim();
 const visibility=String(body.visibility??"");
 const featured=Array.isArray(body.featuredBadgeIds)?[...new Set(body.featuredBadgeIds.map(String))].slice(0,3):[];
 if(!Number.isInteger(avatarSpeciesId)||avatarSpeciesId<1||avatarSpeciesId>1025||!STANDARD_TYPES.includes(favoriteType as never)||bio.length>180||!["public","private"].includes(visibility))return NextResponse.json({error:"invalid_profile"},{status:400});
 const sql=await getDb();
 const earned=featured.length?await sql<{badge_id:string}[]>`SELECT badge_id FROM pn_badge_awards WHERE user_id=${gate.session.uid} AND badge_id IN ${sql(featured)}`:[];
 const safeFeatured=featured.filter((id)=>earned.some((row)=>row.badge_id===id));
 await sql`
  INSERT INTO pn_profiles (user_id,avatar_species_id,favorite_type,bio,featured_badge_ids,visibility)
  VALUES (${gate.session.uid},${avatarSpeciesId},${favoriteType},${bio},${safeFeatured},${visibility})
  ON CONFLICT (user_id) DO UPDATE SET avatar_species_id=EXCLUDED.avatar_species_id,favorite_type=EXCLUDED.favorite_type,bio=EXCLUDED.bio,featured_badge_ids=EXCLUDED.featured_badge_ids,visibility=EXCLUDED.visibility,updated_at=now()
 `;
 return NextResponse.json({ok:true,profile:await currentProfile(gate.session.uid,gate.session.name)});
}

async function currentProfile(userId:string,name:string){
 const sql=await getDb(),season=await ensureCurrentPokeSeason();
 await sql`INSERT INTO pn_profiles (user_id) VALUES (${userId}) ON CONFLICT DO NOTHING`;
 const rows=await sql`SELECT * FROM pn_profiles WHERE user_id=${userId}`;
 const ratings=await sql`SELECT * FROM pn_ratings WHERE user_id=${userId} AND season_id=${season.id}`;
 const awards=await sql`SELECT badge_id,season_id,earned_at FROM pn_badge_awards WHERE user_id=${userId} ORDER BY earned_at DESC`;
 const activity=await sql`SELECT game_id,normalized_rating AS rating,verified,created_at FROM pn_scores WHERE user_id=${userId} ORDER BY created_at DESC LIMIT 8`;
 const rating=ratings[0]??{rating:1000,wins:0,losses:0,draws:0,placements:0,current_streak:0,best_streak:0,matches:0};
 return {name,...camelProfile(rows[0]),season,rating:{...rating,tier:leagueTier(rating.rating)},awards,activity};
}
function camelProfile(row:any){return{avatarSpeciesId:row.avatar_species_id,favoriteType:row.favorite_type,bio:row.bio,featuredBadgeIds:row.featured_badge_ids,visibility:row.visibility}}
