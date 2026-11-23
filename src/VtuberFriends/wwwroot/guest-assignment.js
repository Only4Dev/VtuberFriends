// Keep Discord snowflakes as strings; Number would lose precision.
export function prepareGuestAssignment(slot,input,slots){
 const userId=String(input).trim();
 if(!/^\d{17,20}$/.test(userId))throw Error('Pega un ID de usuario de Discord de 17 a 20 dígitos.');
 if(slots.some(other=>other.id!==slot.id&&other.userId===userId))throw Error('Este usuario ya tiene otra fuente asignada.');
 return {...slot,userId,enabled:true};
}
export function absentGuestName(userId){return 'Usuario · '+userId;}
