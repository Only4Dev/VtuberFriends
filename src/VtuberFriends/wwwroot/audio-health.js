export function audioHealthText(receiver){
 const h=receiver.audioHealth,r=receiver.recovery;let text=h?`Lectores activos: ${h.active}/${h.tracked} · Lectores con fallo: ${h.faulted} · Último PCM: ${h.lastPcmAgeMs==null?'todavía no recibido':(h.lastPcmAgeMs/1000).toFixed(0)+' s'}. El silencio por sí solo no indica un fallo.`:'Esperando conexión de voz.';
 const descriptions={blocked:'DAVE detenido por rechazo MLS; recuperación automática bloqueada',waiting:'Recuperación pendiente con espera entre intentos',reconnecting:'Reconectando voz automáticamente',recovered:'Conexión de voz recuperada; habla para comprobar audio',paused:'Recuperación automática pausada; usa Reconectar audio'};
 if(descriptions[r?.state])text+=' '+descriptions[r.state]+` (${r.attempts}/3).`;
 return text;
}
