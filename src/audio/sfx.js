/* ===== AUDIO: síntesis de efectos con Web Audio API ===== */
let actx=null;
function beep(freq, dur, type, gain){
  try{
    if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)();
    const o=actx.createOscillator(), g=actx.createGain();
    o.type=type||'sine'; o.frequency.value=freq;
    g.gain.value = gain||0.06;
    o.connect(g); g.connect(actx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+dur);
    o.stop(actx.currentTime+dur+0.02);
  }catch(e){}
}
export const sfx = {
  place:()=>beep(220,0.08,'square',0.05),
  fall:()=>beep(110,0.5,'sawtooth',0.07),
  correct:()=>{beep(660,0.09,'triangle',0.07); setTimeout(()=>beep(880,0.12,'triangle',0.07),90);},
  wrong:()=>beep(140,0.28,'sawtooth',0.08),
  win:()=>{beep(523,0.12,'triangle',0.08); setTimeout(()=>beep(659,0.12,'triangle',0.08),110); setTimeout(()=>beep(784,0.2,'triangle',0.08),220);},
  lose:()=>{beep(200,0.2,'sawtooth',0.08); setTimeout(()=>beep(150,0.3,'sawtooth',0.08),150);},
  door:()=>{beep(392,0.15,'triangle',0.06); setTimeout(()=>beep(494,0.18,'triangle',0.06),120);},
};
