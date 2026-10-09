/// <reference lib="webworker" />
import type { GenerateRequest } from "@/types/worker"
import { generatePuzzle } from "./generator"

self.onmessage=(e:MessageEvent<GenerateRequest>)=>{
    try{
        const {boxSize,blanks}=e.data
        const result=generatePuzzle(boxSize,blanks)
        self.postMessage({ok:true,result})
    }catch(err){
        self.postMessage({ok:false,error:(err as Error).message})
    }
}

export {}