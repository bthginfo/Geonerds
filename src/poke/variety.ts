export function seedHash(input:string){let value=2166136261;for(const char of input){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}return value>>>0}
export function seededRandom(seed:string){let value=seedHash(seed);return()=>{value+=0x6d2b79f5;let out=value;out=Math.imul(out^out>>>15,out|1);out^=out+Math.imul(out^out>>>7,out|61);return((out^out>>>14)>>>0)/4294967296}}
export function seededShuffle<T>(items:readonly T[],seed:string){const result=[...items],random=seededRandom(seed);for(let index=result.length-1;index>0;index--){const swap=Math.floor(random()*(index+1));[result[index],result[swap]]=[result[swap],result[index]]}return result}
export function shuffleBag<T>(pool:readonly T[],count:number,seed:string,key:(item:T)=>string):T[]{
 if(count<=0||!pool.length)return[];const result:T[]=[];let cycle=0;
 while(result.length<count){const bag=seededShuffle(pool,`${seed}:${cycle++}`);for(const item of bag){if(result.length>=count)break;if(result.length&&key(result.at(-1)!)===key(item)&&pool.length>1)continue;result.push(item)}}
 return result;
}
export function balancedGenerationBag<T extends {generation:number}>(pool:readonly T[],cap:number,count:number,seed:string,key:(item:T)=>string):T[]{
 const groups=Array.from({length:cap},(_,index)=>seededShuffle(pool.filter((item)=>item.generation===index+1),`${seed}:gen:${index+1}`));const cursors=groups.map(()=>0);const generationOrder=seededShuffle(Array.from({length:cap},(_,index)=>index),`${seed}:gen-order`);const result:T[]=[];
 for(let round=0;round<count;round++){let groupIndex=generationOrder[round%generationOrder.length];for(let attempts=0;attempts<groups.length&&!groups[groupIndex]?.length;attempts++)groupIndex=(groupIndex+1)%groups.length;const group=groups[groupIndex];if(!group?.length)break;let item=group[cursors[groupIndex]++%group.length];if(result.length&&key(item)===key(result.at(-1)!)&&group.length>1)item=group[cursors[groupIndex]++%group.length];result.push(item)}
 return result;
}
