// Test presence is an ephemeral view, never a mutation of participants, levels or saved avatar settings.
export function sourceDisplay(slot,state,fresh,knownName){
 const test=fresh&&state.testMode===true;
 const connected=fresh&&(test||state.receiver.status==='connected'||state.receiver.mode==='demo');
 const actual=state.participants.find(p=>p.userId===slot.userId);
 const simulate=test&&!!slot.userId&&!!slot.enabled;
 const person=simulate?{userId:slot.userId,name:actual?.name||knownName||'Invitado · '+slot.userId.slice(-4),present:true}:actual;
 const level=test?{rms:0,peak:0,speaking:false}:state.users.find(p=>p.userId===slot.userId);
 return {test,connected,person,level,wanted:!!slot.userId&&!!slot.enabled&&!!person?.present&&connected};
}
