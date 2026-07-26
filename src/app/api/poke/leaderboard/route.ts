import {NextResponse} from "next/server";
import {getSession} from "@/lib/auth";
import {getDb,isDbConfigured} from "@/lib/db";
import {leagueTier,POKE_ROUND_COUNTS} from "@/poke/competition";
import {isPokeGameId} from "@/poke/registry";
import {ensureCurrentPokeSeason} from "@/poke/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:Request){
 if(!isDbConfigured)return NextResponse.json({configured:false,rows:[],currentUser:null});
 const url=new URL(req.url);
 const board=url.searchParams.get("board")??"league";
 const game=url.searchParams.get("game");
 const difficulty=url.searchParams.get("difficulty");
 const rounds=Number(url.searchParams.get("rounds"));
 if(!["league","overall","game"].includes(board))return NextResponse.json({error:"invalid_board"},{status:400});
 if(board==="game"&&(!game||!isPokeGameId(game)))return NextResponse.json({error:"invalid_game"},{status:400});
 if(difficulty&&!["easy","medium","hard"].includes(difficulty))return NextResponse.json({error:"invalid_difficulty"},{status:400});
 if(url.searchParams.has("rounds")&&!POKE_ROUND_COUNTS.includes(rounds as 5|10|20))return NextResponse.json({error:"invalid_rounds"},{status:400});
 const season=await ensureCurrentPokeSeason();
 const session=await getSession();
 const sql=await getDb();
 let rows:any[];
 if(board==="league"){
  rows=await sql`
   SELECT u.name,r.user_id,r.rating,r.wins,r.losses,r.draws,r.placements,r.current_streak,r.best_streak,r.matches,
    ROW_NUMBER() OVER (ORDER BY r.rating DESC,r.wins DESC,r.matches ASC)::int AS rank
   FROM pn_ratings r JOIN gn_users u ON u.id=r.user_id
   WHERE r.season_id=${season.id}
   ORDER BY rank LIMIT 100
  `;
 }else if(board==="overall"){
  rows=await sql`
   WITH best AS (
    SELECT DISTINCT ON (s.user_id,s.game_id) s.user_id,s.game_id,s.normalized_rating,s.correct,s.total,s.duration_ms
    FROM pn_scores s
    WHERE s.season_id=${season.id} AND s.ranked=true
      ${difficulty?sql`AND s.difficulty=${difficulty}`:sql``}
      ${rounds?sql`AND s.selected_rounds=${rounds}`:sql``}
    ORDER BY s.user_id,s.game_id,s.normalized_rating DESC,s.correct DESC,(s.correct::float/NULLIF(s.total,0)) DESC,s.duration_ms ASC
   ), totals AS (
    SELECT user_id,SUM(normalized_rating)::int AS rating,COUNT(*)::int AS games,SUM(correct)::int AS correct,SUM(total)::int AS total,BOOL_OR(false)::boolean AS verified
    FROM best GROUP BY user_id
   )
   SELECT u.name,t.*,ROW_NUMBER() OVER (ORDER BY t.rating DESC,t.correct DESC,(t.correct::float/NULLIF(t.total,0)) DESC)::int AS rank
   FROM totals t JOIN gn_users u ON u.id=t.user_id ORDER BY rank LIMIT 100
  `;
 }else{
  rows=await sql`
   SELECT * FROM (
    SELECT DISTINCT ON (s.user_id) u.name,s.user_id,s.game_id,s.normalized_rating AS rating,s.correct,s.total,s.duration_ms,s.verified,
     s.difficulty,s.selected_rounds,s.created_at
    FROM pn_scores s JOIN gn_users u ON u.id=s.user_id
    WHERE s.season_id=${season.id} AND s.game_id=${game!} AND s.ranked=true
      ${difficulty?sql`AND s.difficulty=${difficulty}`:sql``}
      ${rounds?sql`AND s.selected_rounds=${rounds}`:sql``}
    ORDER BY s.user_id,s.normalized_rating DESC,s.correct DESC,(s.correct::float/NULLIF(s.total,0)) DESC,s.duration_ms ASC
   ) best
   ORDER BY rating DESC,correct DESC,(correct::float/NULLIF(total,0)) DESC,duration_ms ASC LIMIT 100
  `;
  rows=rows.map((row:any,index:number)=>({...row,rank:index+1}));
 }
 const mapped=rows.map((row:any)=>({...row,tier:leagueTier(Number(row.rating??1000)),movement:0}));
 return NextResponse.json({configured:true,season,board,rows:mapped,currentUser:session?mapped.find((row)=>row.user_id===session.uid)??null:null});
}
