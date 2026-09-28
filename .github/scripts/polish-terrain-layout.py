from pathlib import Path
p=Path('src/TerrainEditor.tsx')
s=p.read_text()
old="const lowW=140*state.slotScale,lowH=200*state.slotScale,ly=482+(200-lowH)/2;const deckX=132,graveX=298,centerStart=570,centerGap=(170*state.slotGap),extraX=1350;const center=Array.from({length:3},(_,i)=>slotSvg(centerStart+i*centerGap,ly,lowW,lowH,state)).join('');"
new="const lowW=140*state.slotScale,lowH=200*state.slotScale,ly=482+(200-lowH)/2;const deckX=lowerX+20,graveX=deckX+lowW+26*state.slotGap,centerGap=30*state.slotGap,centerTotal=lowW*3+centerGap*2,centerStart=lowerX+(lowerW-centerTotal)/2,extraX=lowerX+lowerW-20-lowW;const center=Array.from({length:3},(_,i)=>slotSvg(centerStart+i*(lowW+centerGap),ly,lowW,lowH,state)).join('');"
if old not in s: raise SystemExit('lower layout target missing')
s=s.replace(old,new,1)
old2='<rect width="${W}" height="${H}" fill="#ececec"/>'
new2='<rect width="${W}" height="${H}" fill="${state.outerColor}"/>'
if old2 not in s: raise SystemExit('canvas target missing')
s=s.replace(old2,new2,1)
p.write_text(s)
