/**
 * Precision EMDN recategorization — targets deepest possible codes.
 *
 * Fixes misclassifications and deepens shallow codes based on product name analysis.
 * Rules are ordered from most specific to most general within each body area.
 * A product only gets re-assigned if the new code is DEEPER or fixes a misclassification.
 *
 * Usage:
 *   npx tsx scripts/precision-recategorize.ts              # dry-run
 *   npx tsx scripts/precision-recategorize.ts --apply       # update DB
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { writeFileSync } from "fs";

config();

const applyMode = process.argv.includes("--apply");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------------------------------------
// Classification rules — ordered most-specific first within each group
// ---------------------------------------------------------------------------

interface Rule {
  name: string;
  code: string;
  patterns: RegExp[];
  exclude?: RegExp[];
}

const RULES: Rule[] = [
  // ==========================================================================
  // INSTRUMENTS & EQUIPMENT (check first — separate category tree)
  // ==========================================================================
  {
    name: "Instrument - Drill bits",
    code: "P091303",
    patterns: [/\bdrill\b/i, /drill\s*bit/i, /\bdrl\b.*bit/i, /rnglc.*drl/i],
    exclude: [/drill\s*guide/i],
  },
  {
    name: "Instrument - Reamers",
    code: "P091301",
    patterns: [/\breamer\b/i, /\breaming\b/i],
  },
  {
    name: "Instrument - Blades / Saws",
    code: "P091302",
    patterns: [
      /saw\s*blade/i, /oscillat.*blade/i, /\bosc\b.*\d+x\d+/i,
      /acc3ti\s*osc/i, /recip.*saw/i, /recip.*blade/i, /sagittal.*blade/i,
      /\brecip\b/i, /\brcp\b.*dbl/i, /\brec\b.*ds/i,
      /zim\s+(ds|ss)\s+recip/i, // ZIM DS RECIP / ZIM SS RECIP
      /univ\s+recip\s+keel/i,   // UNIV RECIP KEEL (reciprocating keel blade)
    ],
    exclude: [/implant/i, /prosthe/i, /stem/i, /cup/i, /liner/i, /insert/i],
  },
  {
    name: "Instrument - Other (batteries, robotic, navigators)",
    code: "P091399",
    patterns: [
      /\bbattery\b/i, /\bcharger\b/i, /\bpower\s*cord\b/i,
      /\bnavitrack/i, /\brosa\s+robotic/i, /\bdrape\s*box/i,
      /aseptic.*transfer/i, /\bfunnel\b.*battery/i,
      /\bhood\b.*vivi/i, /vivi\s+hood/i,
    ],
  },
  {
    name: "Instrument - Wire drivers / handpieces",
    code: "P091399",
    patterns: [/\bdrvr\b/i, /wire\s*driver/i, /handpiece/i, /trigger.*pin/i],
  },

  // ==========================================================================
  // BONE CEMENT
  // ==========================================================================
  {
    name: "Bone cement",
    code: "P099001",
    patterns: [
      /bone\s*cem(ent|t)?\b/i, /\bcmt\b.*\d+x\d+/i, /\bcem\b.*\d+x\d+/i,
      /copal/i, /palacos/i, /simplex/i, /refobacin/i, /hi-fatigue/i,
    ],
    exclude: [/cemented/i, /cem\./i, /cement.*cup/i, /cement.*stem/i],
  },
  {
    name: "Cement equipment",
    code: "P099002",
    patterns: [
      /optivac/i, /palajet/i, /palamix/i, /palavage/i,
      /cement.*mix/i, /vac.*bowl/i, /\bnozzle\b/i, /pulsavac/i, /puls\s*plus/i,
    ],
  },

  // ==========================================================================
  // OSTEOSYNTHESIS
  // ==========================================================================
  {
    name: "Cerclage",
    code: "P09120302",
    patterns: [/cerclage/i],
  },
  {
    name: "Bone wires / K-wires",
    code: "P09120301",
    patterns: [/fix.*pin/i, /\bpin\b.*\d+.*mm/i, /bone\s*pin/i],
    exclude: [/hip/i, /knee/i],
  },
  {
    name: "Cancellous screws",
    code: "P09120602",
    patterns: [/cancellous.*screw/i, /cancell.*scr/i, /spongiosa.*screw/i],
  },
  {
    name: "Hip - Trilogy/acetabular fixing screws",
    code: "P09088007",
    patterns: [
      /trilogy\s+bone\s+scr/i,   // TRILOGY BONE SCR = hip cup fixing screws
    ],
  },
  {
    name: "Cortical / bone screws",
    code: "P09120601",
    patterns: [
      /bone\s*screw/i, /cortical.*screw/i, /self.*tapping.*screw/i,
      /\bscr\b.*\d+\.\d+/i, /\bscr\b.*\d+mm/i, /hdegd.*scr/i,
    ],
    exclude: [/hip/i, /acetabular/i, /cup/i, /knee/i, /tibial/i, /shoulder/i, /cancell/i, /trilogy/i],
  },

  // ==========================================================================
  // ELBOW
  // ==========================================================================
  {
    name: "Elbow - humeral",
    code: "P090203",
    patterns: [/elbow.*humer/i],
  },
  {
    name: "Elbow - ulnar",
    code: "P090205",
    patterns: [/elbow.*ulna/i],
  },
  {
    name: "Elbow - radial",
    code: "P090204",
    patterns: [/elbow.*radi/i],
  },
  {
    name: "Elbow - general",
    code: "P0902",
    patterns: [/\belbow\b/i],
  },

  // ==========================================================================
  // SHOULDER — deepest codes
  // ==========================================================================
  // Glenoid components
  {
    name: "Shoulder - Metaglene / glenoid baseplates",
    code: "P09010301",
    patterns: [/metaglene/i, /glenoid.*baseplate/i, /baseplate.*glenoid/i],
  },
  {
    name: "Shoulder - Glenospheres",
    code: "P09010303",
    patterns: [/glenosphere/i],
  },
  {
    name: "Shoulder - Monoblock glenoids",
    code: "P09010304",
    patterns: [/monoblock.*glenoid/i, /glenoid.*monoblock/i],
  },
  {
    name: "Shoulder - Anatomical glenoid inserts",
    code: "P09010302",
    patterns: [/glenoid.*insert/i, /insert.*glenoid/i, /anatomical.*glenoid/i],
  },
  {
    name: "Shoulder - Glenoid (general)",
    code: "P090103",
    patterns: [/glenoid/i],
  },

  // Shoulder reverse liners (misclassified as hip PE inserts)
  {
    name: "Shoulder - Reverse prostheses inserts/liners",
    code: "P090104010201",
    patterns: [
      /smr.*reverse\s+liner/i,
      /smr.*reverse\s+hp.*liner/i,
      /smr.*reverse\s+hp\s+lateraliz/i,
    ],
  },
  // Shoulder cemented revision stems (misclassified as hip stems)
  {
    name: "Shoulder - Revision stems",
    code: "P0901040204",
    patterns: [
      /smr\s+system.*cemented\s+revision\s+stem/i,
      /smr\s+system.*cementless\s*revision\s+stem/i,
    ],
  },
  // Shoulder cemented standard stems
  {
    name: "Shoulder - Cemented stems",
    code: "P0901040201",
    patterns: [
      /smr\s+system.*cemented\s+stem/i,
    ],
    exclude: [/revision/i],
  },
  // Shoulder humeral — anatomical heads
  {
    name: "Shoulder - Anatomical humeral heads",
    code: "P090104010101",
    patterns: [
      /smr\s+system.*humeral\s+head/i,
      /cta\s+humeral\s+head/i,
      /shoulder.*humeral\s+head/i,
      /humeral\s+head\s+dia/i,
    ],
    exclude: [/reverse/i, /elbow/i],
  },
  // Shoulder humeral — reverse inserts/cups
  {
    name: "Shoulder - Reverse humeral cups",
    code: "P090104010202",
    patterns: [
      /reverse.*humeral\s+body/i,
      /ha\s+coated\s+reverse.*humeral/i,
      /finned\s+reverse.*humeral/i,
      /cta.*adaptor.*reverse/i,
    ],
  },
  // Shoulder humeral — CTA adaptor (non-reverse) → shoulder accessories
  {
    name: "Shoulder - CTA heads adaptor",
    code: "P09018002",
    patterns: [/cta.*heads\s+adaptor/i, /cta.*36.*adaptor/i],
    exclude: [/reverse/i],
  },
  // Shoulder humeral body (finned body = stem)
  {
    name: "Shoulder - Finned humeral body (stem)",
    code: "P0901040201",
    patterns: [
      /finned\s+humeral\s+body/i,
      /humeral\s+body.*locking/i,
    ],
    exclude: [/reverse/i],
  },
  // Shoulder modular stems
  {
    name: "Shoulder - Modular stems",
    code: "P0901040202",
    patterns: [
      /smr\s+shoulder.*cementless\s+finned\s+stem/i,
      /shoulder.*finned\s+stem/i,
      /shoulder.*cementless.*stem/i,
    ],
  },
  // Shoulder large resection stems
  {
    name: "Shoulder - Large resection stems",
    code: "P0901040205",
    patterns: [/smr.*large\s+resection\s+stem/i, /shoulder.*large.*resection/i],
  },
  // Shoulder - Stemless components
  {
    name: "Shoulder - Stemless core",
    code: "P090199",
    patterns: [/smr\s+stemless.*stemless\s+core/i, /stemless.*core/i],
  },
  {
    name: "Shoulder - Stemless adaptor/screw",
    code: "P09018099",
    patterns: [
      /smr\s+stemless.*adaptor/i, /stemless.*adaptor/i,
      /smr\s+stemless.*screw/i, /stemless.*adaptor\s+screw/i,
    ],
  },
  // Shoulder fixing screws
  {
    name: "Shoulder - Fixing screws",
    code: "P09018001",
    patterns: [/shoulder.*screw/i, /glenoid.*screw/i],
  },
  // Shoulder general
  {
    name: "Shoulder - General",
    code: "P0901",
    patterns: [
      /\bshoulder\b/i, /\bsmr\b/i, /reverse.*shoulder/i,
      /\bhumeral\b/i, /\bcta\b/i,
    ],
    exclude: [/elbow/i, /hip/i, /knee/i],
  },

  // ==========================================================================
  // HIP — deepest codes
  // ==========================================================================

  // --- Hip Acetabular Inserts ---
  {
    name: "Hip - Ceramic acetabular inserts",
    code: "P0908030402",
    patterns: [
      /ceramic.*liner/i, /ceramic.*insert.*acetab/i,
      /biolox.*liner/i, /biolox.*insert/i,
    ],
    exclude: [/knee/i],
  },
  {
    name: "Hip - Metal acetabular inserts",
    code: "P0908030403",
    patterns: [/metal.*liner.*acetab/i, /metal.*insert.*acetab/i],
    exclude: [/knee/i],
  },
  {
    name: "Hip - Retentive PE inserts (anti-dislocation)",
    code: "P090803040103",
    patterns: [
      /constrained.*liner/i, /liner.*constrained/i,
      /retentive.*liner/i, /anti.*disloc.*liner/i,
    ],
    exclude: [/knee/i],
  },
  {
    name: "Hip - Eccentric PE inserts",
    code: "P090803040102",
    patterns: [/eccentric.*liner/i, /liner.*eccentric/i, /elevated.*liner/i, /liner.*elevated/i, /liner.*elev\b/i],
    exclude: [/knee/i],
  },
  {
    name: "Hip - Standard PE inserts",
    code: "P090803040101",
    patterns: [
      /\bliner\b.*neutral/i, /neutral.*liner/i,
      /standard.*liner/i,
    ],
    exclude: [/knee/i, /tibial/i],
  },
  {
    name: "Hip - PE acetabular inserts (general)",
    code: "P0908030401",
    patterns: [
      /hip.*liner/i, /hip.*insert/i, /acetabular.*(liner|insert)/i,
      /(liner|insert).*acetabul/i, /pe\s*liner/i, /polyethylene.*liner/i,
      /durasul/i, /longevity/i, /e1.*liner/i, /xlpe.*liner/i,
      /\bliner\b.*\d+.*mm/i, /low.*profile.*liner/i,
      /\bzca\b/i, /ringloc/i, /rloc-x/i, /arcomxl/i,
      /allofit.*liner/i, /plasmacup.*liner/i,
      /dural.*insert/i,
    ],
    exclude: [/ceramic/i, /tibial/i, /knee/i, /\btib\b/i],
  },

  // --- Hip Dual Mobility ---
  {
    name: "Hip - Uncemented dual-mobility cups",
    code: "P090803050102",
    patterns: [/dual.*mobility.*uncement/i, /uncement.*dual.*mobility/i],
  },
  {
    name: "Hip - Cemented dual-mobility cups",
    code: "P090803050101",
    patterns: [/dual.*mobility.*cement/i, /cement.*dual.*mobility/i],
    exclude: [/uncement/i],
  },
  {
    name: "Hip - Dual-mobility cups (general)",
    code: "P0908030501",
    patterns: [
      /dual.*mobility/i, /double.*mobility/i, /\bmdm\b/i,
      /polar.*cup/i, /mobility.*cup/i,
    ],
  },
  {
    name: "Hip - Dual-mobility inserts",
    code: "P0908030502",
    patterns: [/dual.*mobility.*insert/i, /double.*mobility.*insert/i],
  },

  // --- Hip Acetabular Cups ---
  {
    name: "Hip - Cemented PE acetabular cups",
    code: "P090803010102",
    patterns: [
      /durasul.*low\s*profile\s*cup/i,  // DURASUL LOW PROFILE CUP = cemented PE one-piece
      /low\s*profile\s*cup.*\d+/i,       // LOW PROFILE CUP 28/44 etc.
      /cup.*pe.*cem/i, /\bpe\b.*cup.*cem/i,
      /acetabular.*cup.*cem.*pe/i, /ccb.*cup.*pe/i,
    ],
    exclude: [/uncement/i, /shell/i],
  },
  {
    name: "Hip - Cemented acetabular cups (general)",
    code: "P0908030101",
    patterns: [/cup.*cemented/i, /cemented.*cup/i, /acetabular.*cup.*cem/i],
    exclude: [/uncement/i, /\bpe\b/i, /shell/i],
  },
  {
    name: "Hip - Uncemented metal acetabular cups/shells",
    code: "P090803010201",
    patterns: [
      /\bshell\b/i, /allofit/i, /plasmacup/i, /trident/i, /pinnacle/i,
      /\bg7\b/i, /trilogy/i, /continuum/i, /regenerex/i, /r3\s*shell/i,
      /acetabular.*shell/i, /press.*fit.*cup/i, /delta.*cup/i,
      /multihole.*cup/i, /cluster.*cup/i, /\btt\s*cup/i,
      /trabecular.*metal.*(cup|shell)/i,
    ],
    exclude: [/liner/i, /insert/i, /screw/i, /knee/i, /elbow/i, /shoulder/i],
  },
  // Revision acetabular
  {
    name: "Hip - Revision acetabular cups",
    code: "P09080303",
    patterns: [/revision.*acetabul/i, /acetabul.*revision/i, /revision.*cup/i],
  },
  // Pre-assembled
  {
    name: "Hip - Pre-assembled acetabular (cup + insert)",
    code: "P09080306",
    patterns: [/pre.*assembled.*acetab/i, /acetab.*pre.*assembled/i],
  },

  // --- Hip Femoral Heads ---
  {
    name: "Hip - Ceramic heads, total hip",
    code: "P090804050201",
    patterns: [
      /ceramic.*head/i, /ceramic.*fem.*head/i, /head.*ceramic/i,
      /biolox/i, /biolx/i, /\bcer\b.*\bhd\b/i,
      /delta.*cer.*hd/i, /delta.*cer.*fm/i,
      /hip\s+head\s+ceramys/i, /ceramys/i,
    ],
    exclude: [/partial/i, /hemi/i],
  },
  {
    name: "Hip - Metal heads, total hip",
    code: "P090804050202",
    patterns: [
      /femoral.*head(?!.*ceramic)/i, /fem.*head(?!.*ceramic)/i,
      /cocr.*head/i, /\bcocr\b.*\bhd\b/i, /\bzb\b.*cocr.*hd/i,
      /\bhead\b.*cocr/i,
      /hip\s+head.*\d+/i,
    ],
    exclude: [/ceramic/i, /\bcer\b/i, /ceramys/i, /humeral/i, /biolox/i],
  },
  {
    name: "Hip - Bi-articular cups (bipolar heads)",
    code: "P0908040503",
    patterns: [/bi.?articular/i, /bipolar.*head/i, /bipolar.*cup/i],
  },
  {
    name: "Hip - Revision femoral heads",
    code: "P0908040504",
    patterns: [/revision.*femoral\s+head/i, /revision.*head/i],
    exclude: [/cup/i, /stem/i, /knee/i],
  },
  {
    name: "Hip - Femoral heads (fallback)",
    code: "P09080405",
    patterns: [/\bhead\b.*\d+.*mm/i, /\bhead\b.*\d+x\d+/i],
    exclude: [/elbow/i, /knee/i, /shoulder/i, /humeral/i, /screw/i],
  },

  // --- Hip Femoral Stems ---
  // Cemented (specific)
  {
    name: "Hip - Cemented stems, fixed neck, straight",
    code: "P090804010101",
    patterns: [
      /cemented.*stem.*straight/i, /straight.*cemented.*stem/i,
    ],
    exclude: [/uncement/i, /modular.*neck/i, /shoulder/i, /elbow/i],
  },
  {
    name: "Hip - Cemented stems, fixed neck, anatomical",
    code: "P090804010102",
    patterns: [
      /cemented.*stem.*anatomic/i, /anatomic.*cemented.*stem/i,
    ],
    exclude: [/uncement/i, /modular.*neck/i, /shoulder/i, /elbow/i],
  },
  // Cemented (general patterns)
  {
    name: "Hip - Cemented femoral stems (general)",
    code: "P0908040101",
    patterns: [
      /stem.*cemented/i, /stem.*cem\b/i, /cemented.*stem/i,
      /m[üu]ller.*stem/i, /muller.*stem/i,
      /logica.*stem.*mirror/i,       // LOGICA MIRROR = cemented (comes with centralizer)
      /logica.*stem.*centralizer/i,
      /stem\s+ms-30.*polished/i,     // MS-30 POLISHED = cemented hip stems
      /cl\s+trauma.*hip.*stem/i,     // CL TRAUMA = steel (AISI 316L) = cemented
    ],
    exclude: [/uncement/i, /cementless/i, /elbow/i, /shoulder/i, /knee/i, /tibial/i],
  },
  // Uncemented (specific)
  {
    name: "Hip - Uncemented stems, fixed neck, straight",
    code: "P090804010201",
    patterns: [
      /uncemented.*stem.*straight/i, /cementless.*stem.*straight/i,
    ],
    exclude: [/modular.*neck/i, /shoulder/i, /elbow/i],
  },
  {
    name: "Hip - Uncemented stems, preservation (short)",
    code: "P090804010205",
    patterns: [
      /friendly\s+short\s+hip.*stem/i,     // FRIENDLY Short = preservation stems
      /minima.*hip.*stem.*cementless/i,     // MINIMA S = short preservation
    ],
  },
  // Uncemented (general patterns)
  {
    name: "Hip - Uncemented femoral stems (general)",
    code: "P0908040102",
    patterns: [
      /uncemented.*stem/i, /cementless.*stem/i, /press.*fit.*stem/i,
      /porous.*stem/i, /avenir.*cmpl/i, /avenir.*ha/i,
      /cls\s+(spotorno\s+)?stem/i,         // CLS Spotorno = classic uncemented
      /friendly\s+hip.*stem/i,             // FRIENDLY Hip = uncemented (FeCrNiMnMoNbN)
      /h-max\s+(c|s)\s+hip.*stem/i,        // H-MAX C/S = uncemented
      /minima.*hip.*stem/i,                // MINIMA = uncemented
    ],
    exclude: [/elbow/i, /shoulder/i, /knee/i, /tibial/i, /logica/i, /cl\s+trauma/i, /ms-30/i],
  },
  // Revision stems
  {
    name: "Hip - Revision femoral stems",
    code: "P09080403",
    patterns: [
      /revision.*stem/i, /stem.*revision/i, /revision.*femoral/i,
      /revitan/i, /mp\s*revision/i,
      /modulus-?r\s+hip.*stem/i,           // MODULUS-R = revision
    ],
    exclude: [/elbow/i, /knee/i],
  },
  // Modular stems (MODULUS)
  {
    name: "Hip - Modular revision stems (MODULUS)",
    code: "P09080403",
    patterns: [
      /modulus\s+hip.*modular\s+stem/i,
    ],
    exclude: [/knee/i],
  },
  // Resurfacing femoral
  {
    name: "Hip - Resurfacing femoral",
    code: "P09080402",
    patterns: [/resurfac.*femoral/i, /femoral.*resurfac/i, /hip.*resurfac/i],
  },
  // Large resection femoral stems
  {
    name: "Hip - Large resection femoral stems",
    code: "P09080404",
    patterns: [/large\s*resection.*stem.*hip/i, /hip.*large.*resection.*stem/i],
    exclude: [/shoulder/i],
  },
  // Modular necks
  {
    name: "Hip - Modular necks",
    code: "P09080407",
    patterns: [
      /modular.*neck/i, /neck.*modular/i, /femoral.*neck/i,
      /micro\s*taper/i, /micro\s*tloc/i, /taper.*neck/i,
      /\btprlc\b/i, /\btaprlc\b/i, /\btprloc\b/i, /\btaperloc\b/i, /\btloc\b/i,
      /\btaper\s*plug\b/i,
    ],
    exclude: [/knee/i],
  },
  // One-piece femoral (stem+head)
  {
    name: "Hip - One-piece femoral (stem+head)",
    code: "P09080406",
    patterns: [/one.*piece.*femoral/i, /stem.*head.*mono/i],
  },
  // Generic stem patterns (hip context) — fallback to primary stem level
  {
    name: "Hip - Primary femoral stems (generic)",
    code: "P09080401",
    patterns: [
      /stem\s+implant\s+\d+mm/i,    // STEM IMPLANT 10MMDX145MM
      /offset\s+stem\s+\d+mm/i,     // OFFSET STEM 11MMDX145MM
      /\bstem\b.*\d+mm.*\d+mm/i,    // Generic stem with 2 dimensions
    ],
    exclude: [/knee/i, /tibial/i, /shoulder/i, /elbow/i, /spine/i],
  },

  // --- Hip Accessories ---
  {
    name: "Hip - Acetabular rings",
    code: "P09088001",
    patterns: [
      /reinforc.*ring/i, /b-s\s+reinforc/i, /anti.*protrusio/i,
      /acetabular.*ring/i,
    ],
  },
  {
    name: "Hip - Augments",
    code: "P09088003",
    patterns: [
      /hip.*augment/i, /augment.*hip/i, /acetabul.*augment/i,
      /augment.*acetabul/i, /buttress/i, /flying\s*buttress/i,
      /\bprc\b.*agmt/i, /\bagmt\b.*block/i,
      /acetabul.*cone/i, /trabecular.*cone/i,
      /acetabul.*wedge/i,
    ],
    exclude: [/knee/i, /tibial/i],
  },
  {
    name: "Hip - Fixing screws",
    code: "P09088007",
    patterns: [
      /hip.*screw/i, /acetabular.*screw/i, /cup.*screw/i, /shell.*screw/i,
    ],
    exclude: [/knee/i, /tibial/i],
  },
  {
    name: "Hip - Centralizers",
    code: "P09088005",
    patterns: [
      /hip.*centrali[sz]er/i, /centrali[sz]er.*hip/i,
      /stem.*centrali[sz]er/i, /distal\s+centrali[sz]er/i,
      /centering\s+plug/i, /prox.*centrali[sz]er/i,
      /friendly.*centrali[sz]er/i, /friendly.*plug.*centrali[sz]er/i,
      /friendly.*centering/i,
    ],
    exclude: [/knee/i],
  },
  {
    name: "Hip - Intramedullary caps",
    code: "P09088006",
    patterns: [
      /intramedullary.*cap/i, /femoral.*cap/i, /distal.*hood/i,
    ],
  },
  {
    name: "Hip - Plugs (cement restrictors)",
    code: "P090880",
    patterns: [
      /cement\s*plug/i, /cement\s*restrictor/i, /femoral.*plug/i,
      /medullary.*plug/i, /\bplug\b.*dia/i,
      /friendly.*plug.*hood/i,     // FRIENDLY Plug and Hood = hip accessory
    ],
    exclude: [/knee/i, /tibial/i],
  },
  {
    name: "Hip - Spacers",
    code: "P090805",
    patterns: [/hip.*spacer/i, /spacer.*hip/i, /prostalac/i],
  },
  {
    name: "Hip - Accessories (general)",
    code: "P090880",
    patterns: [
      /hip.*adapt/i, /adapt.*hip/i, /modular.*adapt/i,
      /taper.*adapt/i, /neck.*adapt/i,
    ],
    exclude: [/knee/i, /tibial/i],
  },

  // ==========================================================================
  // KNEE — deepest codes
  // ==========================================================================

  // --- Knee: Unicompartmental (Oxford, Physica ZUK) ---
  // Physica ZUK All-Poly monoblock tibial (currently misclassified as tibial stems)
  {
    name: "Knee - Unicompartmental monoblock tibial (PE)",
    code: "P090904020401",
    patterns: [
      /physica\s+zuk.*all-poly\s+tibial/i,
      /unicompartmental.*all-poly\s+tibial/i,
    ],
  },
  // Physica ZUK Tibial Component Precoat = cemented tibial plate
  {
    name: "Knee - Unicompartmental cemented tibial plates (Physica ZUK)",
    code: "P090904020103",
    patterns: [
      /physica\s+zuk.*tibial\s+component\s+precoat/i,
    ],
  },
  {
    name: "Knee - Unicompartmental mobile bearing inserts",
    code: "P090904020201",
    patterns: [
      /oxf\s+anat\s+brg/i,       // OXF ANAT BRG = Oxford anatomical mobile bearing
      /oxford.*bearing/i,
      /unicompartmental.*mobile.*insert/i,
    ],
  },
  {
    name: "Knee - Unicompartmental cemented femoral",
    code: "P0909040101",
    patterns: [
      /oxford.*cemented\s+fem/i,
      /oxf.*twin.*peg.*fem/i,             // OXF twin-peg femoral
      /unicompartmental.*cemented.*fem/i,
    ],
  },
  {
    name: "Knee - Unicompartmental cementless femoral",
    code: "P0909040102",
    patterns: [
      /oxford.*cementless\s+fem/i,
      /unicompartmental.*cementless.*fem/i,
    ],
  },
  {
    name: "Knee - Unicompartmental femoral (general)",
    code: "P09090401",
    patterns: [
      /oxf.*fem/i,
      /physica\s+zuk.*fem/i,
      /unicompartmental.*fem/i,
    ],
    exclude: [/tibial/i, /insert/i, /bearing/i],
  },
  {
    name: "Knee - Unicompartmental cementless tibial plates",
    code: "P090904020104",
    patterns: [
      /oxf\s+uni\s+cmntls\s+tib/i,     // OXF UNI CMNTLS TIB = cementless
      /oxford.*cementless.*tib.*tray/i,
    ],
  },
  {
    name: "Knee - Unicompartmental cemented tibial plates",
    code: "P090904020103",
    patterns: [
      /oxf\s+uni\s+tib\s+tray/i,       // OXF UNI TIB TRAY = cemented (PMA)
      /oxford.*cemented.*tib.*tray/i,
    ],
  },
  {
    name: "Knee - Unicompartmental tibial plates (general)",
    code: "P0909040201",
    patterns: [
      /physica\s+zuk.*tibial\s+plate/i,
      /unicompartmental.*tibial\s+plate/i,
    ],
  },
  {
    name: "Knee - Unicompartmental fixed tibial inserts",
    code: "P090904020202",
    patterns: [
      /physica\s+zuk.*articular.*surface/i,  // Physica ZUK articular surface = insert
      /physica\s+zuk.*insert/i,
      /unicompartmental.*fixed.*insert/i,
    ],
  },
  {
    name: "Knee - Unicompartmental (general)",
    code: "P090904",
    patterns: [
      /\boxf\b/i, /oxford/i, /unicompartmental/i, /unicondylar/i,
      /physica\s+zuk/i,
    ],
  },

  // --- Knee: Revision ---
  {
    name: "Knee - Revision femoral components (LCCK)",
    code: "P09090501",
    patterns: [
      /lcck\s+fem\s+implant/i,
      /lcck.*femoral/i,
      /revision.*knee.*femoral/i,
    ],
  },
  {
    name: "Knee - Revision mobile bearing tibial inserts",
    code: "P090905020201",
    patterns: [
      /revision.*mobile.*tibial.*insert/i,
    ],
  },
  {
    name: "Knee - Revision fixed bearing tibial inserts",
    code: "P090905020202",
    patterns: [
      /lcck\s+art\s+surf/i,       // LCCK ART SURF = revision fixed inserts
      /ng\s+lcck\s+art\s+s[uf]/i, // NG LCCK ART SF
      /revision.*fixed.*tibial.*insert/i,
    ],
  },
  {
    name: "Knee - Revision fixed bearing tibial plates",
    code: "P090905020102",
    patterns: [
      /ng\s+rot.*hinge.*tib\s+plt/i,   // NG ROT.HINGE KNEE TIB PLT = revision tibial
      /rotating.*hinge.*tibial/i,
    ],
  },
  {
    name: "Knee - Revision (general)",
    code: "P090905",
    patterns: [
      /knee.*revision/i, /revision.*knee/i,
      /\blcck\b/i, /constrained.*condylar/i,
      /legacy.*constrained/i,
    ],
  },

  // --- Knee: Cones/Adapters/Augments/Stems (Accessories) ---
  {
    name: "Knee - Adapters/Cones/Sleeves",
    code: "P09098002",
    patterns: [
      /knee.*cone/i, /tibial.*cone/i, /femoral.*cone.*knee/i,
      /knee.*sleeve/i, /tibial.*sleeve/i, /femoral.*sleeve/i,
      /\bsleeve\b.*\btib\b/i, /\bsleeve\b.*\bfem\b/i,
      /amf\s+revision.*cone/i,   // AMF Revision TT Cones
    ],
  },
  {
    name: "Knee - Augments",
    code: "P09098001",
    patterns: [
      /knee.*augment/i, /tibial.*augment/i, /femoral.*augment/i,
      /\baug\b.*\d+.*mm/i, /augment.*\btib\b/i, /augment.*\bfem\b/i,
      /block.*augment/i, /wedge.*augment/i,
      /prc\s+tib\s+block/i,           // PRC TIB BLOCK = tibial augment block
      /full\s+block\s+tib\s+aug/i,    // FULL BLOCK TIB AUG
      /rhk.*tib\s+aug/i,              // RHK TIB AUG
      /\d+\s*mm\s+full\s+block\s+tib/i, // 10 MM FULL BLOCK TIB
    ],
  },
  {
    name: "Knee - Tibial stems",
    code: "P0909800602",
    patterns: [
      /tibial.*stem/i, /\btib\b.*stem/i, /stem.*tibial/i,
      /psn\s+tib\s+stm/i,            // PSN TIB STM = Persona tibial stem
    ],
  },
  {
    name: "Knee - Femoral stems",
    code: "P0909800601",
    patterns: [
      /femoral.*stem.*knee/i, /knee.*femoral.*stem/i,
      /ng\s+flu\s+stem\s+ext/i,      // NG FLU STEM EXT = NexGen fluted stem extension
    ],
  },
  {
    name: "Knee - Taper stems (Persona)",
    code: "P0909800602",
    patterns: [
      /psn\s+tpr\s+st/i,             // PSN TPR ST = Persona taper stem (tibial)
    ],
  },
  {
    name: "Knee - Plugs/Obturators",
    code: "P09098003",
    patterns: [
      /knee.*plug/i, /tibial.*plug/i, /\bplug\b.*\btib\b/i, /obturator/i,
    ],
  },
  {
    name: "Knee - Screws",
    code: "P09098099",
    patterns: [
      /knee.*screw/i, /tibial.*screw/i, /knee.*offset/i,
      /psn.*female\s+scr/i,          // PSN FEMALE SCR = Persona screw
      /psn.*\d+mm.*scr/i,
    ],
  },

  // --- Knee: Patellar ---
  {
    name: "Knee - Patellar monoblock",
    code: "P0909070201",
    patterns: [
      /all\s*poly\s*pat\s*comp/i,
      /patellar.*mono/i,
      /patellar.*prothesis/i,          // Multigen/Physica patellar = all-PE monoblock
      /patellar.*prosthesis/i,
    ],
  },
  {
    name: "Knee - Patellar modular",
    code: "P0909070202",
    patterns: [
      /patellar.*modular/i, /modular.*patellar/i,
      /patellar.*metal.*back/i,
    ],
  },
  {
    name: "Knee - Femoral trochlea resurfacing",
    code: "P09090701",
    patterns: [
      /trochlea/i, /pfj\s+fem/i,     // PFJ FEM = patello-femoral joint femoral
      /patello.*femoral.*fem/i,
    ],
  },
  {
    name: "Knee - Patellar (general)",
    code: "P09090702",
    patterns: [
      /patella/i, /patellar/i, /pat\s*comp/i,
    ],
  },

  // --- Knee: Bicompartmental Primary —  Femoral ---
  {
    name: "Knee - Bicompartmental cemented femoral",
    code: "P0909030101",
    patterns: [
      /multigen.*knee.*cemented\s+femoral/i,
      /physica\s+(kr|ps).*femoral.*cemented/i,
      /cr.*precoat.*fem.*comp/i,           // CR PRECOAT FEM COMP = cemented femoral
      /psn\s+fem\s+(cr|ps)\s+cmt/i,        // PSN FEM CR CMT / PSN FEM PS CMT
    ],
  },
  {
    name: "Knee - Bicompartmental femoral (general)",
    code: "P09090301",
    patterns: [
      /physica\s+(kr|ps).*femoral/i,
      /multigen.*knee.*femoral/i,
      /multigen.*knee.*cck.*femoral/i,
      /art\s+surface.*fem\s+sz/i,          // ART SURFACE 12MM FEM SZ C
      /fem\s+size\s+[a-h]\s+(left|right)/i, // FEM SIZE C LEFT
      /lps.*fem.*comp/i,                    // LPS FEM COMP
      /lps-flex.*option.*femoral/i,         // LPS-FLEX OPTION FEMORAL
      /lps-flex.*tivanium.*femoral/i,       // LPS-FLEX TIVANIUM FEMORAL
      /lps.*option.*femoral/i,              // LPS OPTION FEMORAL
      /ng\s+(cr|ps|knee).*fem/i,            // NexGen CR/PS femoral
      /ng\s+cr-flex.*fem/i,                 // NG CR-FLEX PRECOAT FEM
      /ng\s+knee.*opt.*fem/i,              // NG KNEE CR OPT FEM
    ],
    exclude: [/hip/i, /stem/i, /head\b/i, /shoulder/i, /tibial/i, /insert/i, /augment/i, /sleeve/i],
  },

  // --- Knee: Bicompartmental Primary —  Tibial ---
  {
    name: "Knee - Bicompartmental cemented fixed bearing tibial plates",
    code: "P090903020104",
    patterns: [
      /multigen.*knee.*h\s+cemented\s+tibial\s+plate/i,
      /physica\s+(kr|ps)?\s*knee.*tibial\s+plate\s+cemented/i,
      /physica\s+knee.*tibial\s+plate\s+cemented/i,
      /ng\s+ps\s+mic.*tib\s+plt/i,        // NG PS MIC PRE ST TIB PLT
      /st\s+prc\s+tib\s+plt/i,            // ST PRC TIB PLT
    ],
  },
  {
    name: "Knee - Bicompartmental tibial plates (general)",
    code: "P0909030201",
    patterns: [
      /tibial\s*(base)?plate/i, /tibial\s*tray/i, /tibial\s*component/i,
      /\btib\b.*plate/i, /\btib\b.*tray/i, /\btib\b.*base/i,
    ],
    exclude: [/liner/i, /insert/i, /stem/i, /sleeve/i, /augment/i, /unicompartmental/i, /oxford/i, /\boxf\b/i],
  },
  {
    name: "Knee - Bicompartmental fixed bearing tibial inserts",
    code: "P090903020202",
    patterns: [
      /cr\s+art\s+surf/i,                 // CR ART SURF = cruciate retaining art surface
      /lps\s+flex\s+art\s+surf/i,         // LPS FLEX ART SURF
      /lps-flex\s+fxd\s+mld/i,            // LPS-FLEX FXD MLD = fixed mold
      /lps\s+flex\s+fxd\s+mld/i,
      /psn\s+asf\s+(ps|cr)/i,             // PSN ASF PS/CR = Persona articular surface
      /psn\s+mc\s+ve\s+asf/i,             // PSN MC VE ASF = Persona MC VE articular surface
      /multigen.*knee.*insert/i,
      /physica\s+(kr|ps).*insert/i,
      /physica\s+(kr|ps).*tibial\s+insert/i,
    ],
  },
  {
    name: "Knee - Bicompartmental mobile bearing tibial inserts",
    code: "P090903020201",
    patterns: [
      /mobile.*bearing.*tibial.*insert/i,
      /rotating.*platform.*insert/i,
    ],
  },

  // --- Knee: General tibial/femoral patterns ---
  {
    name: "Knee - Tibial inserts (general)",
    code: "P0909030202",
    patterns: [
      /tibial.*insert/i, /tibial.*liner/i, /\btib\b.*insert/i, /\btib\b.*liner/i,
      /knee.*liner/i, /knee.*insert/i, /insert.*\btib\b/i,
    ],
    exclude: [/hip/i, /acetabul/i],
  },

  // --- Knee: Spacers ---
  {
    name: "Knee - Spacers",
    code: "P090908",
    patterns: [/knee.*spacer/i, /tibial.*spacer/i],
  },

  // --- Knee: General knee catch-all ---
  {
    name: "Knee - General",
    code: "P0909",
    patterns: [
      /\bknee\b/i, /physica\b/i, /multigen\b/i, /nexgen/i, /persona/i,
      /\bpsn\b/i, /\blps\b/i, /\bcck\b/i,
    ],
    exclude: [/hip/i, /elbow/i, /shoulder/i, /acetabul/i],
  },

  // ==========================================================================
  // SPINE
  // ==========================================================================
  {
    name: "Spine - Cages",
    code: "P09070101",
    patterns: [/spinal\s+cage/i, /interbody.*cage/i, /\bcage\b.*spine/i],
  },
  {
    name: "Spine - Disc replacement",
    code: "P09070201",
    patterns: [/disc\s+prosthe/i, /intervertebral.*disc/i, /disc\s+replace/i],
  },
  {
    name: "Spine - Cervical fixation",
    code: "P09070301",
    patterns: [/cervical.*fixation/i, /cervical.*plate/i, /cervical.*screw/i],
  },
  {
    name: "Spine - Thoracolumbar fixation",
    code: "P09070302",
    patterns: [/pedicle.*screw/i, /thoraco.*lumbar/i, /spinal.*rod/i],
  },
  {
    name: "Spine - General",
    code: "P0907",
    patterns: [/\bspine\b/i, /\bspinal\b/i, /vertebra/i],
  },

  // ==========================================================================
  // ANKLE
  // ==========================================================================
  {
    name: "Ankle - General",
    code: "P0905",
    patterns: [/\bankle\b/i],
  },

  // ==========================================================================
  // FOOT
  // ==========================================================================
  {
    name: "Foot - Interphalangeal",
    code: "P090603",
    patterns: [/foot.*interphalang/i, /toe.*joint/i, /toe.*prosthe/i],
  },
  {
    name: "Foot - Metatarsophalangeal",
    code: "P090604",
    patterns: [/metatarso/i, /mtp.*joint/i, /bunion/i, /hallux/i],
  },
  {
    name: "Foot - General",
    code: "P0906",
    patterns: [/\bfoot\b/i, /\btoe\b/i],
  },

  // ==========================================================================
  // FALLBACKS
  // ==========================================================================
  {
    name: "Hip - Acetabular (fallback)",
    code: "P090803",
    patterns: [/acetabul/i, /\bcup\b/i],
    exclude: [/elbow/i, /knee/i, /shoulder/i, /tibial/i, /\btib\b/i],
  },
  {
    name: "Hip - Femoral (fallback)",
    code: "P090804",
    patterns: [/femoral/i, /femur/i, /\bstem\b/i],
    exclude: [/elbow/i, /knee/i, /shoulder/i, /humeral/i, /tibial/i, /\btib\b/i, /physica/i, /multigen/i],
  },
  {
    name: "Hip - General (fallback)",
    code: "P0908",
    patterns: [/\bhip\b/i],
  },
  {
    name: "Ortho - General (fallback)",
    code: "P09",
    patterns: [/implant/i, /prosthe/i],
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`=== Precision EMDN Recategorization ===`);
  console.log(`Mode: ${applyMode ? "APPLY (updating DB)" : "DRY RUN"}\n`);

  // Load EMDN categories
  const { data: categories, error: catErr } = await supabase
    .from("emdn_categories")
    .select("id, code, name");
  if (catErr || !categories) {
    console.error("Failed to load categories:", catErr);
    return;
  }
  const catByCode = new Map(categories.map((c) => [c.code, c]));

  // Validate all rule codes exist in DB
  for (const rule of RULES) {
    if (!catByCode.has(rule.code)) {
      console.error(`Rule "${rule.name}" targets code ${rule.code} which doesn't exist in DB!`);
      return;
    }
  }

  // Load all products (paginated)
  let allProducts: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, manufacturer_name, sku, emdn_category_id, emdn_categories!products_emdn_category_id_fkey ( code, name )")
      .order("name")
      .range(from, from + PAGE - 1);
    if (error) { console.error("products error:", error); return; }
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data);
    from += PAGE;
    if (data.length < PAGE) break;
  }

  console.log(`Loaded ${allProducts.length} products, ${categories.length} categories\n`);

  // Classify each product
  interface Change {
    productId: string;
    productName: string;
    oldCode: string | null;
    oldName: string | null;
    newCode: string;
    newName: string;
    ruleName: string;
    changeType: "deepen" | "fix" | "new";
  }

  const changes: Change[] = [];
  const unchanged: number[] = [0]; // [already at deepest or no match]
  let noMatch = 0;
  const ruleStats: Record<string, number> = {};

  for (const product of allProducts) {
    const currentCode: string | null = (product.emdn_categories as any)?.code || null;
    const currentName: string | null = (product.emdn_categories as any)?.name || null;

    // Find best matching rule
    let matched = false;
    for (const rule of RULES) {
      if (rule.exclude?.some((p) => p.test(product.name))) continue;
      if (!rule.patterns.some((p) => p.test(product.name))) continue;

      matched = true;
      const newCode = rule.code;

      // Determine if we should update:
      // 1. No current code → always assign (new)
      // 2. New code is strictly deeper (longer) AND starts with current code → deepen
      // 3. New code is in a different branch → fix misclassification
      // 4. Same code → skip
      if (newCode === currentCode) {
        unchanged[0]++;
        break;
      }

      let changeType: "deepen" | "fix" | "new";
      if (!currentCode) {
        changeType = "new";
      } else if (newCode.startsWith(currentCode) && newCode.length > currentCode.length) {
        changeType = "deepen";
      } else if (currentCode.startsWith(newCode)) {
        // Current is already deeper — skip
        unchanged[0]++;
        break;
      } else {
        changeType = "fix";
      }

      const newCat = catByCode.get(newCode)!;
      changes.push({
        productId: product.id,
        productName: product.name,
        oldCode: currentCode,
        oldName: currentName,
        newCode,
        newName: newCat.name,
        ruleName: rule.name,
        changeType,
      });
      ruleStats[rule.name] = (ruleStats[rule.name] || 0) + 1;
      break;
    }

    if (!matched) {
      noMatch++;
    }
  }

  // Print summary
  const deepened = changes.filter((c) => c.changeType === "deepen").length;
  const fixed = changes.filter((c) => c.changeType === "fix").length;
  const newAssign = changes.filter((c) => c.changeType === "new").length;

  console.log("=== Summary ===");
  console.log(`Total products: ${allProducts.length}`);
  console.log(`Changes proposed: ${changes.length}`);
  console.log(`  Deepened: ${deepened}`);
  console.log(`  Fixed (misclassification): ${fixed}`);
  console.log(`  New (was uncategorized): ${newAssign}`);
  console.log(`Already optimal: ${unchanged[0]}`);
  console.log(`No rule match: ${noMatch}\n`);

  // Show changes by rule
  console.log("=== Changes by rule ===");
  const sortedRules = Object.entries(ruleStats).sort((a, b) => b[1] - a[1]);
  for (const [rule, count] of sortedRules) {
    console.log(`  ${count.toString().padStart(5)} | ${rule}`);
  }

  // Show misclassifications
  if (fixed > 0) {
    console.log("\n=== Misclassification fixes ===");
    const fixes = changes.filter((c) => c.changeType === "fix");
    const byOldCode = new Map<string, Change[]>();
    for (const f of fixes) {
      const key = f.oldCode || "NONE";
      if (!byOldCode.has(key)) byOldCode.set(key, []);
      byOldCode.get(key)!.push(f);
    }
    for (const [oldCode, items] of byOldCode) {
      console.log(`\n  ${oldCode} (${items[0].oldName}) → various:`);
      // Group by new code
      const byNew = new Map<string, number>();
      for (const item of items) {
        byNew.set(item.newCode, (byNew.get(item.newCode) || 0) + 1);
      }
      for (const [newCode, count] of byNew) {
        const newName = catByCode.get(newCode)?.name || "";
        console.log(`    → ${newCode} (${newName}): ${count} products`);
      }
    }
  }

  // Show sample changes
  console.log("\n=== Sample changes (first 30) ===");
  for (const c of changes.slice(0, 30)) {
    const arrow = c.changeType === "fix" ? "FIX →" : c.changeType === "deepen" ? "  → " : "NEW →";
    console.log(
      `  ${arrow} ${c.productName.substring(0, 50).padEnd(50)} | ${(c.oldCode || "NONE").padEnd(15)} → ${c.newCode.padEnd(15)} | ${c.ruleName}`
    );
  }
  if (changes.length > 30) {
    console.log(`  ... and ${changes.length - 30} more`);
  }

  // Export CSV
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const csvPath = `precision-recategorization-${timestamp}.csv`;
  const csvHeader = "product_id,product_name,old_code,old_name,new_code,new_name,change_type,rule";
  const csvRows = changes.map((c) =>
    [
      c.productId,
      `"${c.productName.replace(/"/g, '""')}"`,
      c.oldCode || "",
      `"${(c.oldName || "").replace(/"/g, '""')}"`,
      c.newCode,
      `"${c.newName.replace(/"/g, '""')}"`,
      c.changeType,
      `"${c.ruleName}"`,
    ].join(",")
  );
  writeFileSync(csvPath, [csvHeader, ...csvRows].join("\n"), "utf-8");
  console.log(`\nCSV exported: ${csvPath}`);

  // Apply if requested
  if (applyMode && changes.length > 0) {
    console.log("\n=== Applying changes to database ===");

    // Group by new category for batch updates
    const byCategoryId = new Map<string, string[]>();
    for (const c of changes) {
      const cat = catByCode.get(c.newCode)!;
      if (!byCategoryId.has(cat.id)) byCategoryId.set(cat.id, []);
      byCategoryId.get(cat.id)!.push(c.productId);
    }

    let updated = 0;
    let errors = 0;
    for (const [categoryId, productIds] of byCategoryId) {
      for (let i = 0; i < productIds.length; i += 100) {
        const batch = productIds.slice(i, i + 100);
        const { error } = await supabase
          .from("products")
          .update({ emdn_category_id: categoryId })
          .in("id", batch);
        if (error) {
          console.error(`Batch update error:`, error);
          errors += batch.length;
        } else {
          updated += batch.length;
        }
      }
    }

    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);

    // Refresh materialized view so category tree shows correct counts
    console.log("\nRefreshing category counts materialized view...");
    const { error: refreshErr } = await supabase.rpc("refresh_category_counts");
    if (refreshErr) {
      console.error("Failed to refresh mat view:", refreshErr.message);
      console.log("Run manually: SELECT refresh_category_counts()");
    } else {
      console.log("Materialized view refreshed successfully.");
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
