import {t} from './i18n.js?v=__UI_VERSION__';
export function audioHealthText(receiver){
 const h=receiver.audioHealth,r=receiver.recovery;let text=h?`${t('Lectores activos')}: ${h.active}/${h.tracked} · ${t('Lectores con fallo')}: ${h.faulted} · ${t('Último PCM')}: ${h.lastPcmAgeMs==null?t('todavía no recibido'):(h.lastPcmAgeMs/1000).toFixed(0)+' s'}. ${t('El silencio por sí solo no indica un fallo.')}`:t('Esperando conexión de voz.');
 const descriptions={blocked:'DAVE detenido por rechazo MLS; recuperación automática bloqueada',waiting:'Recuperación pendiente con espera entre intentos',reconnecting:'Reconectando voz automáticamente',recovered:'Conexión de voz recuperada; habla para comprobar audio',paused:'Recuperación automática pausada; usa Reconectar audio'};
 if(descriptions[r?.state])text+=' '+t(descriptions[r.state])+` (${r.attempts}/3).`;
 return text;
}
