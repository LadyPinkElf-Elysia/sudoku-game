/// <reference lib="webworker" />
import { solveAndDig } from "./solver"

self.onmessage=(e:MessageEvent)=>{
    try{
        const {boxSize,blanks}=e.data
        const result=solveAndDig(boxSize,blanks)
        self.postMessage({ok:true,result})
    }catch(err){
        self.postMessage({ok:false,error:(err as Error).message})
    }
}

export {}