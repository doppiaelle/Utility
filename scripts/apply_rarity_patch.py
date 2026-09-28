from pathlib import Path

path = Path('src/main.tsx')
s = path.read_text()

def replace_once(old: str, new: str, label: str):
    global s
    if old not in s:
        raise SystemExit(f'missing marker: {label}')
    s = s.replace(old, new, 1)

replace_once(
    "type TypographyStyle=Record<TextRole,TextStyle>;\ntype Card={\n  id:string;type:CardType;name:string;scope:string;scopeColor:string;cost?:string;rarity?:string;",
    "type TypographyStyle=Record<TextRole,TextStyle>;\ntype RarityKey='common'|'rare'|'super'|'ultra'|'secret'|'ultimate'|'ghost'|'gold'|'starlight';\ntype Card={\n  id:string;type:CardType;name:string;scope:string;scopeColor:string;cost?:string;rarity?:RarityKey;",
    'rarity type'
)

replace_once(
    "const TYPES:Record<CardType,string>={fighter:'Combattente',location:'Luogo',action:'Azione',extraFighter:'ExtraCombattente',objective:'Obiettivo',token:'Token'};\n",
    "const TYPES:Record<CardType,string>={fighter:'Combattente',location:'Luogo',action:'Azione',extraFighter:'ExtraCombattente',objective:'Obiettivo',token:'Token'};\nconst RARITIES:Record<RarityKey,string>={\n  common:'Comune',\n  rare:'Rare',\n  super:'Super Rare',\n  ultra:'Ultra Rare',\n  secret:'Secret Rare',\n  ultimate:'Ultimate Rare',\n  ghost:'Ghost Rare',\n  gold:'Gold Rare',\n  starlight:'Starlight Rare'\n};\n",
    'rarity options'
)

replace_once("cost:'',rarity:'',", "cost:'',rarity:'common',", 'default rarity')

replace_once(
    "  return out;\n};\nfunction normalizeTypography(input:any):TypographyStyle{return{",
    "  return out;\n};\nconst isRarity=(value:any):value is RarityKey=>typeof value==='string'&&value in RARITIES;\nfunction normalizeTypography(input:any):TypographyStyle{return{",
    'rarity normalizer helper'
)

rarity_helpers = r'''const sparkle=(x:number,y:number,scale=1,opacity=.8,color='#ffffff')=>`<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}"><path d="M0-10 2.5-2.5 10 0 2.5 2.5 0 10-2.5 2.5-10 0-2.5-2.5Z" fill="${color}"/><circle cx="0" cy="0" r="1.3" fill="#ffffff"/></g>`;
function rarityDefs(){return`
  <linearGradient id="rareSilver" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0"/><stop offset="35%" stop-color="#f7fbff" stop-opacity=".45"/><stop offset="70%" stop-color="#dbe8f6" stop-opacity=".2"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <linearGradient id="holoAurora" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#62d7ff" stop-opacity="0"/><stop offset="18%" stop-color="#62d7ff" stop-opacity=".22"/><stop offset="38%" stop-color="#8d7cff" stop-opacity=".24"/><stop offset="56%" stop-color="#ff85c7" stop-opacity=".24"/><stop offset="74%" stop-color="#ffe176" stop-opacity=".22"/><stop offset="90%" stop-color="#78ffc9" stop-opacity=".18"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <linearGradient id="goldFoil" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff5bf" stop-opacity=".06"/><stop offset="30%" stop-color="#f6cf62" stop-opacity=".28"/><stop offset="55%" stop-color="#fff6d0" stop-opacity=".18"/><stop offset="100%" stop-color="#c99212" stop-opacity=".08"/></linearGradient>
  <linearGradient id="bronzeFoil" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f8d39b" stop-opacity=".06"/><stop offset="30%" stop-color="#c98a42" stop-opacity=".22"/><stop offset="100%" stop-color="#6c4118" stop-opacity=".08"/></linearGradient>
  <linearGradient id="ghostMist" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f4fbff" stop-opacity=".30"/><stop offset="45%" stop-color="#ddf3ff" stop-opacity=".16"/><stop offset="100%" stop-color="#fefeff" stop-opacity=".26"/></linearGradient>
  <linearGradient id="softSheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ffffff" stop-opacity="0"/><stop offset="35%" stop-color="#ffffff" stop-opacity=".24"/><stop offset="58%" stop-color="#c1f6ff" stop-opacity=".18"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <linearGradient id="prismaticStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9de9ff"/><stop offset="28%" stop-color="#ffffff"/><stop offset="52%" stop-color="#ffc6ed"/><stop offset="76%" stop-color="#fff09b"/><stop offset="100%" stop-color="#8fe2ff"/></linearGradient>
  <pattern id="secretFoilPattern" patternUnits="userSpaceOnUse" width="28" height="28" patternTransform="rotate(-28)"><rect width="28" height="28" fill="#ffffff" fill-opacity=".012"/><path d="M4 -4V32 M14 -4V32 M24 -4V32" stroke="#8ad6ff" stroke-opacity=".34" stroke-width="1.8"/><path d="M9 -4V32 M19 -4V32" stroke="#ff8cc6" stroke-opacity=".30" stroke-width="1.1"/><path d="M0 -4V32" stroke="#fff6a8" stroke-opacity=".20" stroke-width=".8"/></pattern>
  <pattern id="ultimatePattern" patternUnits="userSpaceOnUse" width="96" height="96"><rect width="96" height="96" fill="#ffffff" fill-opacity="0"/><circle cx="48" cy="48" r="21" fill="none" stroke="#f2d1a4" stroke-opacity=".20" stroke-width="2"/><path d="M0 30 C 24 8, 72 8, 96 30 M0 66 C 24 44, 72 44, 96 66" fill="none" stroke="#f2d1a4" stroke-opacity=".18" stroke-width="2"/><path d="M18 0 C 6 18, 6 78, 18 96 M78 0 C 90 18, 90 78, 78 96" fill="none" stroke="#f2d1a4" stroke-opacity=".16" stroke-width="1.5"/></pattern>
  <pattern id="starlightPattern" patternUnits="userSpaceOnUse" width="72" height="72"><rect width="72" height="72" fill="#ffffff" fill-opacity="0"/><circle cx="12" cy="14" r="1.8" fill="#ffffff" fill-opacity=".55"/><circle cx="54" cy="20" r="1.5" fill="#9de9ff" fill-opacity=".5"/><circle cx="26" cy="54" r="1.2" fill="#ffeeb4" fill-opacity=".42"/><path d="M36 8 38 14 44 16 38 18 36 24 34 18 28 16 34 14Z" fill="#ffffff" fill-opacity=".52"/><path d="M58 42 59.5 46 64 47.5 59.5 49 58 53 56.5 49 52 47.5 56.5 46Z" fill="#ffd7ef" fill-opacity=".45"/><path d="M14 40 15.5 44 20 45.5 15.5 47 14 51 12.5 47 8 45.5 12.5 44Z" fill="#c6f7ff" fill-opacity=".45"/></pattern>
  <pattern id="goldDustPattern" patternUnits="userSpaceOnUse" width="52" height="52"><rect width="52" height="52" fill="#ffffff" fill-opacity="0"/><circle cx="9" cy="10" r="1.4" fill="#fff3ae" fill-opacity=".55"/><circle cx="38" cy="16" r="1.2" fill="#fff3ae" fill-opacity=".45"/><circle cx="19" cy="38" r="1.1" fill="#f6cf62" fill-opacity=".50"/><path d="M42 34 43.2 37.6 47 38.8 43.2 40 42 43.6 40.8 40 37 38.8 40.8 37.6Z" fill="#fff8d2" fill-opacity=".42"/></pattern>
  <filter id="art-rare" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.08"/><feComponentTransfer><feFuncR type="linear" slope="1.02"/><feFuncG type="linear" slope="1.02"/><feFuncB type="linear" slope="1.04"/></feComponentTransfer></filter>
  <filter id="art-super" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.18"/><feComponentTransfer><feFuncR type="linear" slope="1.04"/><feFuncG type="linear" slope="1.04"/><feFuncB type="linear" slope="1.08"/></feComponentTransfer></filter>
  <filter id="art-ultra" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.24"/><feComponentTransfer><feFuncR type="linear" slope="1.08"/><feFuncG type="linear" slope="1.06"/><feFuncB type="linear" slope="1.04"/></feComponentTransfer></filter>
  <filter id="art-secret" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.30"/><feComponentTransfer><feFuncR type="linear" slope="1.08"/><feFuncG type="linear" slope="1.06"/><feFuncB type="linear" slope="1.10"/></feComponentTransfer></filter>
  <filter id="art-ultimate" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.14"/><feComponentTransfer><feFuncR type="linear" slope="1.10"/><feFuncG type="linear" slope="1.02"/><feFuncB type="linear" slope=".95"/></feComponentTransfer></filter>
  <filter id="art-ghost" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values=".24"/><feComponentTransfer><feFuncR type="linear" slope="1.16" intercept=".05"/><feFuncG type="linear" slope="1.18" intercept=".06"/><feFuncB type="linear" slope="1.22" intercept=".08"/></feComponentTransfer></filter>
  <filter id="art-gold" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.12"/><feComponentTransfer><feFuncR type="linear" slope="1.18"/><feFuncG type="linear" slope="1.10"/><feFuncB type="linear" slope=".92"/></feComponentTransfer></filter>
  <filter id="art-starlight" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.34"/><feComponentTransfer><feFuncR type="linear" slope="1.10"/><feFuncG type="linear" slope="1.08"/><feFuncB type="linear" slope="1.12"/></feComponentTransfer></filter>`;}
function renderRarityArtOverlay(rarity:RarityKey){switch(rarity){case'rare':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#rareSilver)" opacity=".08"/><rect x="20" y="20" width="590" height="840" fill="url(#softSheen)" opacity=".06"/></g>`;case'super':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#holoAurora)" opacity=".15"/><rect x="20" y="20" width="590" height="840" fill="url(#softSheen)" opacity=".11"/></g>`;case'ultra':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#goldFoil)" opacity=".12"/><rect x="20" y="20" width="590" height="840" fill="url(#holoAurora)" opacity=".14"/></g>`;case'secret':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#holoAurora)" opacity=".12"/><rect x="20" y="20" width="590" height="840" fill="url(#secretFoilPattern)" opacity=".28"/></g>`;case'ultimate':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#bronzeFoil)" opacity=".18"/><rect x="20" y="20" width="590" height="840" fill="url(#ultimatePattern)" opacity=".24"/></g>`;case'ghost':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#ghostMist)" opacity=".30"/><rect x="20" y="20" width="590" height="840" fill="url(#softSheen)" opacity=".12"/></g>`;case'gold':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#goldFoil)" opacity=".20"/><rect x="20" y="20" width="590" height="840" fill="url(#goldDustPattern)" opacity=".24"/></g>`;case'starlight':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#holoAurora)" opacity=".18"/><rect x="20" y="20" width="590" height="840" fill="url(#starlightPattern)" opacity=".34"/></g>`;default:return'';}}
function renderRaritySurface(rarity:RarityKey){switch(rarity){case'rare':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="27" y="27" width="576" height="826" rx="24" fill="none" stroke="#dde7f3" stroke-opacity=".46" stroke-width="1.8"/>${sparkle(92,112,.75,.70)}${sparkle(534,146,.58,.55)}${sparkle(474,642,.68,.50,'#dfeeff')}</g>`;case'super':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="26" y="26" width="578" height="828" rx="24" fill="none" stroke="url(#prismaticStroke)" stroke-opacity=".28" stroke-width="1.8"/>${sparkle(98,110,.82,.78)}${sparkle(530,144,.72,.64,'#dff6ff')}${sparkle(120,704,.64,.48,'#ffd8ef')}</g>`;case'ultra':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="25" y="25" width="580" height="830" rx="25" fill="none" stroke="#f6d577" stroke-opacity=".64" stroke-width="2.1"/><rect x="31" y="31" width="568" height="818" rx="21" fill="none" stroke="#fff5c2" stroke-opacity=".28" stroke-width="1"/>${sparkle(92,110,.90,.86,'#fff4ba')}${sparkle(534,146,.76,.70,'#fff8d5')}${sparkle(483,638,.74,.58,'#ffe3ac')}</g>`;case'secret':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="26" y="26" width="578" height="828" rx="24" fill="url(#secretFoilPattern)" opacity=".16"/><rect x="26" y="26" width="578" height="828" rx="24" fill="none" stroke="url(#prismaticStroke)" stroke-opacity=".32" stroke-width="1.7"/>${sparkle(92,112,.82,.82)}${sparkle(534,144,.74,.68,'#dff7ff')}${sparkle(302,740,.68,.50,'#ffd5ea')}</g>`;case'ultimate':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="24" y="24" width="582" height="832" rx="26" fill="url(#ultimatePattern)" opacity=".18"/><rect x="26" y="26" width="578" height="828" rx="24" fill="none" stroke="#d0a067" stroke-opacity=".48" stroke-width="1.9"/>${sparkle(112,128,.64,.44,'#f3d2a8')}</g>`;case'ghost':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="20" y="20" width="590" height="840" fill="#eefaff" fill-opacity=".07"/><rect x="26" y="26" width="578" height="828" rx="24" fill="none" stroke="#f8fdff" stroke-opacity=".52" stroke-width="1.8"/>${sparkle(94,114,.84,.74)}${sparkle(530,144,.70,.62,'#edfaff')}${sparkle(470,770,.64,.44,'#f3ffff')}</g>`;case'gold':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="24" y="24" width="582" height="832" rx="25" fill="url(#goldDustPattern)" opacity=".26"/><rect x="25" y="25" width="580" height="830" rx="25" fill="none" stroke="#e9bd47" stroke-opacity=".66" stroke-width="2.2"/><rect x="31" y="31" width="568" height="818" rx="21" fill="none" stroke="#fff2ba" stroke-opacity=".30" stroke-width="1"/>${sparkle(90,112,.90,.84,'#fff1a8')}${sparkle(536,146,.76,.72,'#fff7d3')}</g>`;case'starlight':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="20" y="20" width="590" height="840" fill="url(#starlightPattern)" opacity=".38"/><rect x="26" y="26" width="578" height="828" rx="24" fill="none" stroke="url(#prismaticStroke)" stroke-opacity=".42" stroke-width="1.8"/>${sparkle(94,110,.98,.88)}${sparkle(536,144,.80,.74,'#dff6ff')}${sparkle(132,698,.72,.58,'#ffdff2')}${sparkle(486,636,.70,.54,'#fff3b6')}</g>`;default:return'';}}
'''

replace_once(
    "function normalizeDetail(x:Detail):Detail{return{...x,opacity:clamp01(x.opacity,1)}}",
    rarity_helpers + "\nfunction normalizeDetail(x:Detail):Detail{return{...x,opacity:clamp01(x.opacity,1)}}",
    'rarity renderer helpers'
)

replace_once("  ...DEFAULT,...legacy,\n", "  ...DEFAULT,...legacy,rarity:isRarity(legacy.rarity)?legacy.rarity:'common',\n", 'normalize rarity')

replace_once(
    "  const theme=card.scopeColor||'#1d5c6b',layers={...DEFAULT_LAYERS,...card.layers},frame={...DEFAULT_FRAME,...card.frame},typography=normalizeTypography(card.typography);",
    "  const theme=card.scopeColor||'#1d5c6b',layers={...DEFAULT_LAYERS,...card.layers},frame={...DEFAULT_FRAME,...card.frame},typography=normalizeTypography(card.typography),rarity=isRarity(card.rarity)?card.rarity:'common';",
    'svg rarity value'
)

replace_once(
    "  const art=card.art?`<image href=\"${card.art}\" x=\"${ix}\" y=\"${iy}\" width=\"${iw}\" height=\"${ih}\" preserveAspectRatio=\"xMidYMid slice\" clip-path=\"url(#cardClip)\" opacity=\"${clamp01(layers.artwork,1)}\"/>`:`<rect x=\"20\" y=\"20\" width=\"590\" height=\"840\" rx=\"28\" fill=\"#18232b\" opacity=\".9\"/>`;",
    "  const artFilter=rarity!=='common'?` filter=\"url(#art-${rarity})\"`:'';\n  const art=card.art?`<image href=\"${card.art}\" x=\"${ix}\" y=\"${iy}\" width=\"${iw}\" height=\"${ih}\" preserveAspectRatio=\"xMidYMid slice\" clip-path=\"url(#cardClip)\" opacity=\"${clamp01(layers.artwork,1)}\"${artFilter}/>`:`<rect x=\"20\" y=\"20\" width=\"590\" height=\"840\" rx=\"28\" fill=\"#18232b\" opacity=\".9\"/>`;",
    'art rarity filter'
)

replace_once(
    "    <filter id=\"paperNoise\" x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"120%\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".045\" numOctaves=\"2\" seed=\"5\" result=\"n\"/><feColorMatrix in=\"n\" type=\"saturate\" values=\"0\" result=\"m\"/><feComponentTransfer in=\"m\" result=\"f\"><feFuncA type=\"table\" tableValues=\"0 .08\"/></feComponentTransfer><feBlend in=\"SourceGraphic\" in2=\"f\" mode=\"multiply\"/></filter>\n  </defs>",
    "    <filter id=\"paperNoise\" x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"120%\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".045\" numOctaves=\"2\" seed=\"5\" result=\"n\"/><feColorMatrix in=\"n\" type=\"saturate\" values=\"0\" result=\"m\"/><feComponentTransfer in=\"m\" result=\"f\"><feFuncA type=\"table\" tableValues=\"0 .08\"/></feComponentTransfer><feBlend in=\"SourceGraphic\" in2=\"f\" mode=\"multiply\"/></filter>\n    ${rarityDefs()}\n  </defs>",
    'rarity defs'
)

replace_once("  <rect width=\"630\" height=\"880\" fill=\"#fff\"/>${art}\n  ${frameSvg", "  <rect width=\"630\" height=\"880\" fill=\"#fff\"/>${art}\n  ${renderRarityArtOverlay(rarity)}\n  ${frameSvg", 'rarity art overlay')
replace_once("  ${statNodes}${idNode}\n  </svg>`;", "  ${statNodes}${idNode}\n  ${renderRaritySurface(rarity)}\n  </svg>`;", 'rarity surface')

replace_once(
    "<details className=\"settingsGroup\" open><summary><span><b>Carta</b><small>Tipo, nome, ambito e identificazione</small></span>",
    "<details className=\"settingsGroup\" open><summary><span><b>Carta</b><small>Tipo, nome, ambito, rarità e identificazione</small></span>",
    'card section subtitle'
)

replace_once(
    "          {card.type!=='token'&&card.type!=='objective'&&<label>Costo / materiali<input value={card.cost||''} onChange={e=>update({cost:e.target.value})}/></label>}\n",
    "          {card.type!=='token'&&card.type!=='objective'&&<label>Costo / materiali<input value={card.cost||''} onChange={e=>update({cost:e.target.value})}/></label>}\n          <label>Rarità<select value={card.rarity||'common'} onChange={e=>update({rarity:e.target.value as RarityKey})}>{Object.entries(RARITIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>\n          <small>La rarità applica color grading, foil e dettagli olografici all’intera carta, inclusa l’illustrazione.</small>\n",
    'rarity selector'
)

path.write_text(s)
print('rarity patch applied')
