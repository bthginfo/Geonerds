import {NextResponse} from "next/server";
import {getSession} from "@/lib/auth";
import {getDb,isDbConfigured} from "@/lib/db";
import {leagueTier} from "@/poke/competition";
import {ensureCurrentPokeSeason} from "@/poke/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(_req:Request,{params}:{params:Promise<{name:string}>}){
 if(!isDbConfigured)return NextResponse.json({configured:false,found:false});
 const {name:raw}=await params,name=decodeURIComponent(raw).slice(0,40);
 const sql=await getDb(),users=await sql<{id:string;name:string}[]>`SELECT id,name FROM gn_users WHERE name_lower=${name.toLowerCase()} LIMIT 1`;
 const user=users[0];if(!user)return NextResponse.json({configured:true,found:false});
 const viewer=await getSession();
 const profileRows=await sql`SELECT * FROM pn_profiles WHERE user_id=${user.id}`;
 const profile=profileRows[0]??{avatar_species_id:25,favorite_type:"normal",bio:"",featured_badge_ids:[],visibility:"public"};
 if(profile.visibility==="private"&&viewer?.uid!==user.id)return NextResponse.json({configured:true,found:true,private:true,profile:{name:user.name,visibility:"private"}});
 const season=await ensureCurrentPokeSeason();
 const ratings=await sql`SELECT * FROM pn_ratings WHERE user_id=${user.id} AND season_id=${season.id}`;
 const bestGames=await sql`
  SELECT DISTINCT ON (game_id) game_id,normalized_rating AS rating,correct,total,duration_ms,verified
  FROM pn_scores WHERE user_id=${user.id} AND season_id=${season.id}
  ORDER BY game_id,normalized_rating DESC,correct DESC,duration_ms ASC
 `;
 const badges=await sql`SELECT badge_id,earned_at FROM pn_badge_awards WHERE user_id=${user.id} AND badge_id=ANY(${profile.featured_badge_ids}) ORDER BY earned_at DESC`;
 const recent=await sql`
  SELECT c.id,c.game_id,c.winner_id,c.resolved_at,CASE WHEN c.challenger_id=${user.id} THEN o.name ELSE ch.name END AS rival_name
  FROM pn_challenges c JOIN gn_users ch ON ch.id=c.challenger_id JOIN gn_users o ON o.id=c.opponent_id
  WHERE c.status='resolved' AND (c.challenger_id=${user.id} OR c.opponent_id=${user.id})
  ORDER BY c.resolved_at DESC LIMIT 6
 `;
 const rating=ratings[0]??{rating:1000,wins:0,losses:0,draws:0,placements:0,current_streak:0,best_streak:0,matches:0};
 return NextResponse.json({configured:true,found:true,profile:{name:user.name,userId:user.id,avatarSpeciesId:profile.avatar_species_id,favoriteType:profile.favorite_type,bio:profile.bio,visibility:profile.visibility,season,rating:{...rating,tier:leagueTier(rating.rating)},bestGames,featuredBadges:badges,recentChallenges:recent,isSelf:viewer?.uid===user.id}});
}
