
export const getTarget=(length:number,isRepeat:boolean):string=>{
    let result=''
    const digits=[...'0123456789']

    for(let i=0;i<length;i++){
        let idx=Math.floor(Math.random()*digits.length)
        result+=idx
        if(!isRepeat){
            digits.splice(idx,1)
        }
    }

    return result
}