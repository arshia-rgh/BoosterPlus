import { useState } from "react";
import SubmissionEditor from "../../../frontend/app/submissions/form";
import { emptyConfiguration, emptyField } from "../../../frontend/app/catalog/model";
import { ChatFormCard } from "../../../frontend/app/support/forms/card";
import { CreateChatForm } from "../../../frontend/app/support/forms/create";
import { ActionFields, requireText } from "../../../frontend/app/ui/action-fields";
import { Text, Action, ErrorNotice } from "../../../frontend/app/catalog/controls";
import { post } from "../../../frontend/app/identity/api";
import { z } from "../../../frontend/app/validation";
const date = "2026-10-15T00:00:00Z";
const config = emptyConfiguration("Mobile Legends");
config.intake = { name:"Account details",description:"",fields:[{...emptyField("region"),label:"Region",stage:"order",required:true,options:[{key:"Europe",label:"Europe",units:0},{key:"Asia",label:"Asia",units:0}]}],rules:[] };
export const submission = {submission:{id:"sample",version:1,title:"My account",game:"Mobile Legends",state:"draft",created_at:date,updated_at:date},offer:{id:"sample-release",game_id:"sample-game",slug:"mobile-legends",version:1,configuration:config,paused:false,created_at:date}, answers:{region:"Europe"}, ownership_notes:"",ownership_declared:true,note:"Draft",conversation_id:"sample-chat"};
const form = {id:"sample-form",version:1,title:"Your account details",description:"",mode:"request",purpose:"information",recipient:"Customer",audience:"Customer and PLAYORA staff",state:"open", fields:[{key:"region",label:"Account region",kind:"text",secure:false,required:true},{key:"access",label:"Access details",kind:"multiline",secure:true,required:true}],answers:{},has_secure:true,can_respond:true,can_reveal:false,can_cancel:false,expires_at:"2099-01-01T00:00:00Z",answered_at:null};
export async function formResponse(path: string, method:string) {
  if(method!=="GET") {
    await new Promise(r=>setTimeout(r,450));
    let issues = [{path:"region",message:"Choose the region registered to this account."}];
    if(path.endsWith("/reply")) issues = [{path:"answers.region",message:"Use the region shown in your game profile."},{path:"answers.access",message:"Include the requested access details."}];
    else if(path.endsWith("/forms")) issues = [{path:"expires_at",message:"Choose a shorter availability window."}];
    else if(path.endsWith("/review")) issues = [{path:"note",message:"Explain what the customer needs to change."}];
    return new Response(JSON.stringify({code:"validation_failed",issues}),{status:422,headers:{"Content-Type":"application/json"}});
  }
  let data:unknown = {};
  if(path.endsWith("/images")) data={images:[]};
  else if(path.endsWith("/options")) data={open:true,booster:false,purposes:[{key:"information",label:"Information",modes:["request","share"],max_hours:720}]};
  else if(path.endsWith("sample-form")) data=form;
  return new Response(JSON.stringify(data),{headers:{"Content-Type":"application/json"}});
}
function ActionExample() {
  const [note,setNote]=useState(""); const [error,setError]=useState<unknown>(null); const [busy,setBusy]=useState(false);
  async function save(){setBusy(true);setError(null);try{requireText("note",note);await post("/preview/review",{note},z.unknown());}catch(e){setError(e);}finally{setBusy(false);}}
  return <ActionFields error={error} busy={busy}><h2>Review account</h2><ErrorNotice error={error}/><fieldset disabled={busy}><Text name="note" label="Review note" value={note} change={setNote} multiline/><Action onClick={()=>void save()}>Request changes</Action></fieldset></ActionFields>;
}
export default function Forms({screen}:{screen:string}) {
 return <main id="main" className="page identity-page"><h1>{screen==="form-seller"?"Sell an account":screen==="form-chat"?"Order conversation":screen==="form-admin-chat"?"Customer conversation":"Review account"}</h1><p className="quiet">Isolated review fixture · no real data or messages</p>{screen==="form-seller"?<SubmissionEditor value={submission} reload={()=>{}}/>:screen==="form-chat"?<ChatFormCard base="/conversations/sample-chat" id="sample-form" revision={1} changed={()=>{}}/>:screen==="form-admin-chat"?<CreateChatForm base="/admin/conversations/sample-chat" changed={()=>{}}/>:<ActionExample/>}</main>;
}
