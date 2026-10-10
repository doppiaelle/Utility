import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PAGES,CARD_MM,cardSheetPlan,bestTilePlan} from '../src/print.ts';

test('an A4 page holds nine true-size cards, centred, never overlapping and inside the margins',()=>{
 const plan=cardSheetPlan(PAGES.A4);assert.deepEqual([plan.cols,plan.rows,plan.perPage],[3,3,9]);
 assert.ok(plan.x0>=5&&plan.y0>=5,'room for cut marks');assert.equal(plan.cells.length,9);
 for(const c of plan.cells){assert.ok(c.x>=0&&c.y>=0&&c.x+CARD_MM.w<=PAGES.A4.w&&c.y+CARD_MM.h<=PAGES.A4.h);}
 for(const [i,a] of plan.cells.entries())for(const b of plan.cells.slice(i+1))assert.ok(a.x+CARD_MM.w<=b.x+1e-9||b.x+CARD_MM.w<=a.x+1e-9||a.y+CARD_MM.h<=b.y+1e-9||b.y+CARD_MM.h<=a.y+1e-9);
 assert.equal(cardSheetPlan(PAGES.A3).perPage,16);assert.equal(cardSheetPlan({w:50,h:50}).perPage,0);
});
test('a 610x350 mm mat needs six overlapping A4 pages, laid out landscape, covering every point',()=>{
 const total={w:610,h:350},plan=bestTilePlan(total,PAGES.A4,{overlap:10});
 assert.deepEqual([plan.landscape,plan.cols,plan.rows,plan.count],[true,3,2,6]);
 for(const t of plan.tiles){assert.ok(t.w<=plan.usable.w+1e-9&&t.h<=plan.usable.h+1e-9);assert.ok(t.x+t.w<=total.w+1e-9&&t.y+t.h<=total.h+1e-9);}
 const last=plan.tiles.at(-1);assert.ok(Math.abs(last.x+last.w-total.w)<1e-9&&Math.abs(last.y+last.h-total.h)<1e-9,'the last tile reaches the far corner');
 for(let c=0;c<plan.cols-1;c++){const a=plan.tiles[c],b=plan.tiles[c+1];assert.ok(a.x+a.w-b.x>=10-1e-9,'neighbours overlap by the glue strip');}
});
test('tile plans handle small sheets, no overlap, and pick the orientation with fewer pages',()=>{
 assert.equal(bestTilePlan({w:200,h:100},PAGES.A4).count,1);
 assert.equal(bestTilePlan({w:100,h:250},PAGES.A4).landscape,false);
 {const a3=bestTilePlan({w:610,h:350},PAGES.A3,{overlap:0});assert.deepEqual([a3.count,a3.landscape,a3.cols,a3.rows],[3,false,3,1]);}
 assert.equal(bestTilePlan({w:610,h:350},PAGES.A4,{overlap:999}).overlap,40);
});
