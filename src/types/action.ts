export interface ActionDef{
    key:string
    icon?:string
    message:string
    disabled?:boolean
    onClick:()=>void
}