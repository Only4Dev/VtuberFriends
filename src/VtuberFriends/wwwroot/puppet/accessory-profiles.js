import {puppetPacks} from './packs.js?v=__UI_VERSION__';
export const accessoryDefaults={accessoryGlasses:'none',accessoryHat:'none',accessoryNecklace:'none',accessoryObject:'none',accessoryObjectLeft:'none',objectAnimation:'float',objectAmplitude:.4,objectSpeed:1,objectLeftAnimation:'float',objectLeftAmplitude:.4,objectLeftSpeed:1,"accessoryAura":"none","accessoryFloor":"none","accessoryLightning":"none","accessoryEffect":"none","ambientEffects":[],"ambientColor":"#86d8ef","ambientIntensity":0.65,"ambientSize":1.0,"ambientSpeed":0.7,"ambientQuality":"medium","puppetParts":{},"puppetMouthTravel":70.0,"puppetPadding":280.0,"puppetIdle":0.55,"puppetWings":0.5,"puppetMouthGain":1.0,"puppetHeadRange":15.0,"puppetExpression":"auto","puppetManual":false,"puppetHeadX":0.0,"puppetHeadY":0.0,"puppetHeadZ":0.0,"puppetEyeX":0.0,"puppetEyeY":0.0,"puppetEyeGlow":false,"puppetEyeGlowIntensity":0.35,"puppetPatternGlow":false,"puppetPatternGlowIntensity":0.25,"puppetCyberGlow":true,"puppetCyberGlowIntensity":0.35,"puppetJadeShiny":false};
export function captureAccessoryProfile(slot){return structuredClone(Object.fromEntries(Object.entries(accessoryDefaults).map(([key,value])=>[key,slot[key]??value])));}
export function storeAccessoryProfile(slot){slot.accessoryProfiles??={};slot.accessoryProfiles[slot.avatar]=captureAccessoryProfile(slot);}
export function switchAccessoryAvatar(slot,avatar){storeAccessoryProfile(slot);slot.avatar=avatar;Object.assign(slot,structuredClone(accessoryDefaults),structuredClone(slot.accessoryProfiles[avatar]||{}));}
export function applyAccessoryDraft(slot,draft,avatar){
 const prefix=puppetPacks[avatar].id+':',merged={...(slot.accessoryEdits||{})};
 for(const key of Object.keys(merged))if(key.startsWith(prefix))delete merged[key];
 for(const [key,value]of Object.entries(draft.accessoryEdits||{}))if(key.startsWith(prefix))merged[key]=structuredClone(value);
 slot.accessoryEdits=merged;slot.accessoryProfiles??={};
 const profile=slot.avatar===avatar?captureAccessoryProfile(slot):{...accessoryDefaults,...slot.accessoryProfiles[avatar]};
 for(const key of ['accessoryGlasses','accessoryHat','accessoryNecklace','accessoryObject','accessoryObjectLeft','accessoryAura','accessoryFloor','accessoryLightning','accessoryEffect','objectAnimation','objectAmplitude','objectSpeed','objectLeftAnimation','objectLeftAmplitude','objectLeftSpeed'])if(draft[key]!==undefined)profile[key]=draft[key];
 slot.accessoryProfiles[avatar]=profile;
 if(slot.avatar===avatar)Object.assign(slot,slot.accessoryProfiles[avatar]);
}
