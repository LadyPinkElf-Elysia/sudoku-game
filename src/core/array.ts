import type { Rng } from "@/types/rng";

export const shuffle=<T>(arr:T[],rng:Rng):void=>{
    for(let i=arr.length-1;i>0;i--){
        const j=Math.floor(rng()*(i+1));
        [arr[i],arr[j]]=[arr[j],arr[i]]
    }
}

export const makeGrid=<T>(s:number,fn:()=>T):T[][]=>
    Array.from(
        {length:s},
        ()=>Array.from({length:s},fn)
    )

export const mapGrid=<T,U>(grid:T[][],fn:(v:T)=>U):U[][]=>
    grid.map(row=>row.map(fn))

export const chunk=<T>(arr:T[],size:number):T[][]=>
    Array.from(
        {length:Math.ceil(arr.length/size)},
        (_,i)=>arr.slice(i*size,(i+1)*size)
    )