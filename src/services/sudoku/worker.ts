/// <reference lib="webworker" />
import { generatePuzzle } from "@/core/sudoku/generate"
import type { GenerateRequest } from "@/types/worker"

self.onmessage=(e:MessageEvent<GenerateRequest>)=>{
    try{
        const {boxSize,blanks}=e.data
        const result=generatePuzzle(boxSize,blanks,Math.random)
        self.postMessage({ok:true,result})
    }catch(err){
        self.postMessage({ok:false,error:(err as Error).message})
    }
}

export {}