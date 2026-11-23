// Connection recovery and page reload resume an existing avatar; channel reentry animates.
export class SourcePresence {
 constructor(previous=null){this.previous=previous;this.connected=false;this.seenConnected=false;this.lastVisible=false;this.lastUser=null;}
 update(connected,wanted,userId,now=Date.now()){
  let instant=!connected,resume=false;
  if(connected&&!this.connected){
   if(!this.seenConnected){const p=this.previous;resume=!!(p&&now-p.time>=0&&now-p.time<15000&&p.userId===userId&&p.visible&&wanted);}
   else resume=!!(wanted&&this.lastVisible&&this.lastUser===userId);
   instant=resume;
  }
  this.connected=connected;
  if(connected){this.seenConnected=true;this.lastVisible=!!wanted;this.lastUser=userId;}
  return {instant,resume};
 }
}
