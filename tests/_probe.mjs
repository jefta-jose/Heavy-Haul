import { content, newSim, spawn, DT } from './helpers.js';
const carsAll=[...new Set([process.env.CARS?.split(',')].flat())];
const runs=content.season.trail.obstacleRuns;
const ids=(process.env.RUNS??'log-run-1,pipe-run-3,pipe-run-8,log-run-5').split(',');
for (const run of ids.map(i=>runs.findIndex(r=>r.id===i))){
 const spec=runs[run]; const s=spawn(newSim(),spec.x-14);
 const row=s.logs.filter(l=>l.run===run), end=row.at(-1).x+row.at(-1).r+1; let t=0,maxX=0;
 s.ctl.gas=1;
 while(t<45&&s.truck.getPosition().x<end){s.step(DT);t+=DT;maxX=Math.max(maxX,s.truck.getPosition().x);}
 console.log(content.car.id,spec.id,'r',row[0].r.toFixed(2),'top',(row[0].y+row[0].r-s.visH(row[0].x)).toFixed(2),'cleared',s.truck.getPosition().x>=end,'t',t.toFixed(1),'x',maxX.toFixed(1),'of',end.toFixed(1),'angle',s.truck.getAngle().toFixed(2));
}
const rr=s=>s; 
