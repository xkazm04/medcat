/**
 * Smart EMDN categorization script for orthopedic implant products.
 *
 * Analyzes product names to assign the most specific EMDN category.
 * Based on detailed analysis of the Borndigital dataset.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Categorization rules - ordered from most specific to most general.
 * Each rule has patterns to match and an EMDN code to assign.
 */
interface CategoryRule {
  name: string
  emdn_code: string
  patterns: RegExp[]
  excludePatterns?: RegExp[]
}

const CATEGORY_RULES: CategoryRule[] = [
  // ============================================
  // INSTRUMENTS (check first - separate category)
  // ============================================
  {
    name: 'Instruments - Drill Bits',
    emdn_code: 'P091303', // ORTHOPAEDIC IMPLANT DRILL BITS, SINGLE-USE
    patterns: [
      /\bdrill\b/i,
      /\bdrilling\b/i,
      /drill\s*bit/i,
      /\bdrl\b.*bit/i, // DRL BIT abbreviation
      /rnglc.*drl/i, // RNGLC+ ACET DRL
    ],
    excludePatterns: [
      /drill\s*guide/i, // Drill guides are accessories
    ],
  },
  {
    name: 'Instruments - Reamers',
    emdn_code: 'P091301', // ORTHOPAEDIC IMPLANT REAMERS, SINGLE-USE
    patterns: [
      /\breamer\b/i,
      /\breaming\b/i,
      /\brmer\b/i, // RMER abbreviation
    ],
  },
  {
    name: 'Instruments - Blades',
    emdn_code: 'P091302', // ORTHOPAEDIC IMPLANT BLADES, SINGLE-USE
    patterns: [
      /\bblade\b.*saw/i,
      /saw\s*blade/i,
      /oscillating\s*blade/i,
      /\bosc\b.*\d+x\d+/i, // OSC 90X19X1.27 pattern (oscillating blades)
      /acc3ti\s*osc/i, // ACC3TI OSC blades
      /recip.*saw/i, // Reciprocating saw
      /saw.*attach/i, // Saw attachments
    ],
  },
  {
    name: 'Instruments - Osteotomes/Chisels',
    emdn_code: 'P091302', // ORTHOPAEDIC IMPLANT BLADES, SINGLE-USE
    patterns: [
      /osteotome/i,
      /\bchisel\b/i,
      /recip.*blade/i, // Reciprocating blades
      /sagittal.*blade/i,
      /\brcp\b.*dbl/i, // RCP DBL blades
      /\brec\b.*ds/i, // REC DS SYNTHES blades
      /reciprocat/i, // Reciprocating
    ],
  },
  {
    name: 'Instruments - Wire Drivers/Handpieces',
    emdn_code: 'P091399', // ORTHOPAEDIC IMPLANT INSTRUMENTS, SINGLE-USE - OTHER
    patterns: [
      /\bdrvr\b/i, // Driver abbreviation
      /wire\s*driver/i,
      /pin\s*driver/i,
      /handpiece/i,
      /trigger.*pin/i,
      /trigger.*wire/i,
    ],
  },
  {
    name: 'Instruments - Other',
    emdn_code: 'P091399', // ORTHOPAEDIC IMPLANT INSTRUMENTS, SINGLE-USE - OTHER
    patterns: [
      /\binstrument\b/i,
      /\btrial\b/i,
      /\bsizer\b/i,
      /\bguide\b/i,
      /inserter/i,
      /extractor/i,
      /impactor/i,
      /sharp\s*fluted/i, // Sharp fluted reamers/instruments
    ],
    excludePatterns: [
      /implant/i,
      /prosthe/i,
      /stem/i,
      /cup/i,
      /liner/i,
      /head\b/i,
      /insert\b/i,
      /component/i,
    ],
  },

  // ============================================
  // BONE CEMENT (check early - separate category)
  // ============================================
  {
    name: 'Bone Cement',
    emdn_code: 'P099001', // ORTHOPAEDIC PROSTHESES CEMENTS AND ACCESSORIES FOR MIXING
    patterns: [
      /bone\s*cement/i,
      /bone\s*cem\b/i, // BONE CEM abbreviation
      /bone\s*cmt\b/i, // BONE CMT abbreviation
      /\bcement\b.*\d+.*g\b/i, // "CEMENT R 2X40-3" pattern
      /\bcmt\b.*\d+x\d+/i, // CMT 2X40 pattern
      /\bcem\b.*\d+x\d+/i, // CEM 2X20 pattern
      /copal/i, // COPAL is cement brand (includes G+C, G+V)
      /palacos/i, // PALACOS is cement brand
      /simplex/i, // SIMPLEX cement
      /refobacin/i, // Refobacin cement
      /antibiotic.*cement/i,
      /hi-fatigue/i, // HI-FATIGUE bone cement
      /high.*fatigue/i,
    ],
    excludePatterns: [
      /cemented/i, // "cemented" is fixation method, not cement product
      /cem\./i, // "cem." abbreviation for cemented
      /cement.*cup/i, // cemented cups are not cement
      /cement.*stem/i,
      /cement.*plug/i, // cement plugs are accessories
    ],
  },

  // Cement mixing/delivery equipment
  {
    name: 'Cement Equipment',
    emdn_code: 'P099002', // ORTHOPAEDIC CEMENT PREPARATION AND APPLICATION DEVICES AND KITS
    patterns: [
      /optivac/i, // OPTIVAC vacuum mixers
      /palajet/i, // PalaJet cement delivery
      /palamix/i, // PalaMix cement mixer
      /palavage/i, // PalaVage lavage
      /cement.*mix/i,
      /mix.*cement/i,
      /vac.*bowl/i, // VAC BOWL
      /vacuum.*mix/i,
      /\bnozzle\b/i, // Cement nozzles
    ],
  },

  // ============================================
  // ELBOW PROSTHESES
  // ============================================
  {
    name: 'Elbow - Humeral Components',
    emdn_code: 'P090203', // ELBOW PROSTHESES HUMERAL COMPONENTS
    patterns: [
      /elbow.*humeral/i,
      /elbow.*humerus/i,
    ],
  },
  {
    name: 'Elbow - Ulnar Components',
    emdn_code: 'P090205', // ELBOW PROSTHESES ULNAR COMPONENTS
    patterns: [
      /elbow.*ulna/i,
      /elbow.*ulnar/i,
    ],
  },
  {
    name: 'Elbow - General',
    emdn_code: 'P0902', // ELBOW PROSTHESES
    patterns: [
      /\belbow\b/i,
      /discovery\s+elbow/i,
    ],
  },

  // ============================================
  // SHOULDER PROSTHESES (P0901)
  // ============================================
  {
    name: 'Shoulder - Stemless',
    emdn_code: 'P0901', // SHOULDER PROSTHESES
    patterns: [
      /stemless/i,
      /smr\s*stemless/i,
    ],
    excludePatterns: [
      /elbow/i,
    ],
  },
  {
    name: 'Shoulder - Humeral Components',
    emdn_code: 'P090104', // SHOULDER PROSTHESES HUMERAL COMPONENTS
    patterns: [
      /shoulder.*humeral/i,
      /humeral.*shoulder/i,
      /humeral\s*(head|stem|component)/i,
      /humer.*head/i,
      /cta.*humeral/i, // CTA humeral
    ],
    excludePatterns: [
      /elbow/i,
    ],
  },
  {
    name: 'Shoulder - Glenoid Components',
    emdn_code: 'P090103', // GLENOID COMPONENTS
    patterns: [
      /glenoid/i,
      /glenosphere/i,
      /metaglene/i,
    ],
  },
  {
    name: 'Shoulder - General',
    emdn_code: 'P0901', // SHOULDER PROSTHESES
    patterns: [
      /\bshoulder\b/i,
      /\bsmr\b/i, // SMR is Lima shoulder system
      /reverse.*shoulder/i,
      /anatomic.*shoulder/i,
      /\bhumeral\b/i, // Humeral components (general)
      /\bcta\b/i, // CTA shoulder
      /finned.*stem/i, // Finned stems are typically shoulder
    ],
    excludePatterns: [
      /elbow/i,
      /hip/i,
    ],
  },

  // ============================================
  // HIP PROSTHESES - Specific Components
  // ============================================

  // Acetabular Inserts/Liners
  {
    name: 'Hip - Polyethylene Inserts',
    emdn_code: 'P0908030401', // HIP PROSTHESES POLYETHYLENE ACETABULAR INSERTS
    patterns: [
      /hip.*liner/i,
      /hip.*insert/i,
      /acetabular.*liner/i,
      /acetabular.*insert/i,
      /pe\s*liner/i,
      /polyethylene.*liner/i,
      /insert.*\bpe\b/i,
      /\bliner\b.*hip/i,
      /\bliner\b.*acetabul/i,
      /dural.*insert/i, // DURAL inserts
      /allofit.*liner/i, // ALLOFIT liners
      /plasmacup.*liner/i, // PLASMACUP liners
      /durasul/i, // DURASUL is hip PE liner
      /e1.*liner/i, // E1 is hip liner
      /longevity/i, // Longevity is hip liner
      /xlpe.*liner/i, // Cross-linked PE liners
      /\bliner\b.*\d+.*mm/i, // "LINER 28MM" patterns
      /\bliner\b.*neutral/i, // LINER NEUTRAL
      /\bliner\b.*elevated/i, // LINER ELEVATED
      /\bliner\b.*elev\b/i, // LINER ELEV abbreviation
      /\bliner\b.*constrained/i, // Constrained liners
      /constrained.*liner/i,
      /\brim\b.*liner/i, // RIM liner
      /low.*profile.*liner/i,
      /\bzca\b/i, // ZCA (Zimmer Continuum Acetabular) liners
      /ringloc/i, // RINGLOC liners
      /rloc-x/i, // RLOC-X liners
      /arcomxl/i, // ARCOMXL liners
    ],
    excludePatterns: [
      /ceramic/i,
      /tibial/i,
      /knee/i,
      /\btib\b/i,
    ],
  },
  {
    name: 'Hip - Ceramic Inserts',
    emdn_code: 'P0908030402', // HIP PROSTHESES CERAMIC ACETABULAR INSERTS
    patterns: [
      /hip.*liner.*ceramic/i,
      /hip.*insert.*ceramic/i,
      /ceramic.*liner/i,
      /ceramic.*insert/i,
      /biolox.*liner/i,
    ],
    excludePatterns: [
      /knee/i,
    ],
  },

  // Dual Mobility
  {
    name: 'Hip - Dual Mobility Cups',
    emdn_code: 'P0908030501', // DOUBLE-MOBILITY ACETABULAR CUPS
    patterns: [
      /dual.*mobility/i,
      /double.*mobility/i,
      /mdm\s/i, // MDM = Mobile Dual Mobility
      /polar.*cup/i, // Polar cups are dual mobility
      /mobility.*cup/i,
    ],
  },

  // Hip Shells (specific product lines)
  {
    name: 'Hip - Acetabular Shells',
    emdn_code: 'P090803010201', // PRIMARY IMPLANT UNCEMENTED METAL ACETABULAR CUPS
    patterns: [
      /\bshell\b/i, // General shell products
      /allofit/i, // ALLOFIT acetabular shells
      /plasmacup/i, // PLASMACUP shells
      /trident/i, // Stryker Trident shells
      /pinnacle/i, // DePuy Pinnacle shells
      /g7\b/i, // Zimmer G7 shells
      /trilogy/i, // Zimmer Trilogy shells
      /continuum/i, // Zimmer Continuum shells
      /regenerex/i, // Biomet Regenerex
      /r3\s*shell/i, // Smith & Nephew R3
      /acetabular.*shell/i,
      /trabecular.*metal.*cup/i,
      /trabecular.*metal.*shell/i,
    ],
    excludePatterns: [
      /liner/i,
      /insert/i,
      /screw/i,
      /knee/i,
      /elbow/i,
    ],
  },

  // Acetabular Cups - Cemented
  {
    name: 'Hip - Cemented Acetabular Cups (PE)',
    emdn_code: 'P090803010102', // PRIMARY IMPLANT CEMENTED POLYETHYLENE ACETABULAR CUPS
    patterns: [
      /cup.*pe.*cem/i,
      /\bpe\b.*cup.*cem/i,
      /full.*profile.*cup.*pe.*cem/i,
      /acetabular.*cup.*cem.*pe/i,
      /ccb.*cup.*pe/i, // CCB brand cups
    ],
  },
  {
    name: 'Hip - Cemented Acetabular Cups',
    emdn_code: 'P0908030101', // PRIMARY IMPLANT CEMENTED ACETABULAR CUPS
    patterns: [
      /cup.*cemented/i,
      /cup.*cem\./i,
      /cemented.*cup/i,
      /acetabular.*cup.*cem/i,
    ],
    excludePatterns: [
      /uncemented/i,
      /\bpe\b/i, // PE cups handled above
    ],
  },

  // Acetabular Cups - Uncemented
  {
    name: 'Hip - Uncemented Metal Acetabular Cups',
    emdn_code: 'P090803010201', // PRIMARY IMPLANT UNCEMENTED METAL ACETABULAR CUPS
    patterns: [
      /delta.*cup/i, // DELTA cups are uncemented metal
      /multihole.*cup/i,
      /cluster.*cup/i,
      /tt\s*cup/i, // TT = Tritanium type cups
      /acetabular.*shell/i,
      /press.*fit.*cup/i,
    ],
    excludePatterns: [
      /cem\./i,
      /cemented/i,
    ],
  },

  // Revision Acetabular
  {
    name: 'Hip - Revision Acetabular',
    emdn_code: 'P09080303', // REVISION SURGERY ACETABULAR CUPS
    patterns: [
      /revision.*acetabul/i,
      /acetabul.*revision/i,
      /revision.*cup/i,
    ],
  },

  // Femoral Heads
  {
    name: 'Hip - Ceramic Femoral Heads',
    emdn_code: 'P090804050201', // CERAMIC FEMORAL HEADS, TOTAL HIP REPLACEMENT
    patterns: [
      /ceramic.*head/i,
      /ceramic.*fem.*head/i,
      /head.*ceramic/i,
      /biolox/i, // Biolox is ceramic head brand
      /biolx/i, // BIOLX abbreviation
      /\bcer\b.*\bhd\b/i, // CER HD abbreviation
      /delta.*cer.*hd/i, // DELTA CER FM HD
      /delta.*cer.*fm/i, // DELTA CER FM
    ],
  },
  {
    name: 'Hip - Metal Femoral Heads',
    emdn_code: 'P090804050202', // METAL FEMORAL HEADS, TOTAL HIP REPLACEMENT
    patterns: [
      /femoral.*head(?!.*ceramic)/i,
      /fem.*head(?!.*ceramic)/i,
      /\bhead\b.*\d+.*mm/i,
      /cocr.*head/i, // CoCr = Cobalt Chrome heads
      /\bzb\b.*cocr.*hd/i, // ZB COCR HD (Zimmer Biomet)
      /\bcocr\b.*\bhd\b/i, // COCR HD abbreviation
    ],
    excludePatterns: [
      /ceramic/i,
      /humeral/i,
      /\bcer\b/i, // CER abbreviation
    ],
  },

  // Femoral Stems - Cemented
  {
    name: 'Hip - Cemented Femoral Stems',
    emdn_code: 'P0908040101', // PRIMARY IMPLANT CEMENTED FEMORAL STEMS
    patterns: [
      /stem.*cemented/i,
      /stem.*cem\b/i,
      /cemented.*stem/i,
      /m.ller.*stem/i, // Müller stems are typically cemented
      /muller.*stem/i,
      /avenir.*stem/i, // AVENIR stems
    ],
    excludePatterns: [
      /uncemented/i,
      /elbow/i,
      /shoulder/i,
    ],
  },

  // Femoral Stems - Uncemented
  {
    name: 'Hip - Uncemented Femoral Stems',
    emdn_code: 'P0908040102', // PRIMARY IMPLANT UNCEMENTED FEMORAL STEMS
    patterns: [
      /uncemented.*stem/i,
      /cementless.*stem/i,
      /press.*fit.*stem/i,
      /tt.*stem/i, // TT = Tritanium
      /porous.*stem/i,
      /avenir.*cmpl/i, // AVENIR complete cementless
      /avenir.*ha/i, // AVENIR HA coated
      /avenir.*uncem/i,
      /optimys.*uncem/i, // optimys uncemented
    ],
    excludePatterns: [
      /elbow/i,
      /shoulder/i,
    ],
  },

  // Femoral Stems - Revision
  {
    name: 'Hip - Revision Femoral Stems',
    emdn_code: 'P09080403', // REVISION SURGERY FEMORAL STEMS
    patterns: [
      /revision.*stem/i,
      /stem.*revision/i,
      /revision.*femoral/i,
      /revitan/i, // REVITAN revision stems
      /mp\s*revision/i, // MP revision stems
    ],
    excludePatterns: [
      /elbow/i,
    ],
  },

  // Modular Necks / Adapters
  {
    name: 'Hip - Modular Necks/Adapters',
    emdn_code: 'P09080407', // MODULAR NECKS
    patterns: [
      /modular.*neck/i,
      /neck.*modular/i,
      /femoral.*neck/i,
      /micro\s*taper/i, // MICRO TAPERLC necks
      /micro\s*tloc/i, // MICRO TLOC abbreviation
      /taper.*neck/i,
      /\btprlc\b/i, // TAPERLC abbreviation
      /\btaprlc\b/i, // TAPRLC abbreviation
      /\btprloc\b/i, // TPRLOC abbreviation
      /\btaperloc\b/i, // TAPERLOC necks
      /\btloc\b/i, // TLOC abbreviation
      /\btaper\s*plug\b/i, // Taper plugs
      /\btl\b.*\d+.*mp/i, // TL 133 MP patterns (TaperLock)
      /\btl\b.*\d+.*sp/i, // TL 133 SP patterns
    ],
    excludePatterns: [
      /knee/i,
    ],
  },

  // Hip Accessories
  {
    name: 'Hip - Augments',
    emdn_code: 'P09088003', // HIP PROSTHESES AUGMENTS
    patterns: [
      /hip.*augment/i,
      /augment.*hip/i,
      /acetabul.*augment/i,
      /augment.*acetabul/i,
      /buttress/i, // Acetabular buttress augments
      /flying\s*buttress/i,
      /\bprc\b.*agmt/i, // PRC AGMT blocks
      /\bagmt\b.*block/i, // AGMT BLOCK
    ],
    excludePatterns: [
      /knee/i,
      /tibial/i,
      /femoral.*knee/i,
    ],
  },
  {
    name: 'Hip - Revision Cones/Wedges',
    emdn_code: 'P09088003', // HIP PROSTHESES AUGMENTS
    patterns: [
      /\bcone\b.*hip/i,
      /hip.*\bcone\b/i,
      /acetabul.*cone/i,
      /trabecular.*cone/i,
      /\bwedge\b.*hip/i,
      /hip.*\bwedge\b/i,
      /acetabul.*wedge/i,
    ],
    excludePatterns: [
      /knee/i,
    ],
  },
  {
    name: 'Hip - Fixing Screws',
    emdn_code: 'P09088007', // HIP PROSTHESES FIXING SCREWS
    patterns: [
      /hip.*screw/i,
      /acetabular.*screw/i,
      /cup.*screw/i,
      /shell.*screw/i,
      /cancellous.*screw.*\d+.*mm/i, // Cancellous screws for hip
    ],
    excludePatterns: [
      /knee/i,
      /tibial/i,
    ],
  },
  {
    name: 'Hip - Spacers',
    emdn_code: 'P090805', // HIP PROSTHESES SPACERS
    patterns: [
      /hip.*spacer/i,
      /spacer.*hip/i,
      /angled.*spacer/i, // DELTA Cup spacers
      /prostalac/i, // PROSTALAC is hip spacer system
    ],
  },
  {
    name: 'Hip - Centralizers',
    emdn_code: 'P090880', // HIP PROSTHESES - ACCESSORIES
    patterns: [
      /hip.*centrali[sz]er/i,
      /centrali[sz]er.*hip/i,
      /stem.*centrali[sz]er/i,
      /centrali[sz]er.*stem/i,
      /distal.*centrali[sz]er/i,
    ],
  },
  {
    name: 'Hip - Plugs',
    emdn_code: 'P090880', // HIP PROSTHESES - ACCESSORIES
    patterns: [
      /hip.*plug/i,
      /plug.*hip/i,
      /cement\s*restrictor/i,
      /femoral.*plug/i,
      /medullary.*plug/i,
      /cement\s*plug/i, // Cement plugs
      /\bplug\b.*dia/i, // PLUG with diameter
    ],
    excludePatterns: [
      /knee/i,
      /tibial/i,
    ],
  },
  {
    name: 'Hip - Adapters/Offsets',
    emdn_code: 'P090880', // HIP PROSTHESES - ACCESSORIES
    patterns: [
      /hip.*adapt/i,
      /adapt.*hip/i,
      /\boffset\b.*hip/i,
      /hip.*\boffset\b/i,
      /modular.*adapt/i,
      /taper.*adapt/i,
      /neck.*adapt/i,
    ],
    excludePatterns: [
      /knee/i,
      /tibial/i,
    ],
  },

  // ============================================
  // KNEE PROSTHESES - Specific Components
  // ============================================

  // Knee - Revision Components (check first)
  {
    name: 'Knee - Revision Components',
    emdn_code: 'P090905', // REVISION KNEE PROSTHESES
    patterns: [
      /knee.*revision/i,
      /revision.*knee/i,
      /revision.*tibial/i,
      /revision.*femur/i,
      /amf.*revision/i, // AMF Revision cones
    ],
  },

  // Knee - Tibial Stems
  {
    name: 'Knee - Tibial Stems',
    emdn_code: 'P0909800602', // KNEE PROSTHESES TIBIAL STEMS
    patterns: [
      /tibial.*stem/i,
      /\btib\b.*stem/i,
      /stem.*tibial/i,
    ],
  },

  // Knee - Femoral Stems
  {
    name: 'Knee - Femoral Stems',
    emdn_code: 'P0909800601', // KNEE PROSTHESES FEMORAL STEMS
    patterns: [
      /femoral.*stem.*knee/i,
      /knee.*femoral.*stem/i,
      /\bfem\b.*stem.*knee/i,
    ],
  },

  // Knee - Augments
  {
    name: 'Knee - Augments',
    emdn_code: 'P09098001', // KNEE PROSTHESES AUGMENTS
    patterns: [
      /knee.*augment/i,
      /tibial.*augment/i,
      /femoral.*augment.*knee/i,
      /\baug\b.*\d+.*mm/i, // "AUG 5MM" patterns
      /augment.*\btib\b/i,
      /augment.*\bfem\b/i,
      /block.*augment/i,
      /wedge.*augment/i,
    ],
  },

  // Knee - Adapters, Cones, Sleeves
  {
    name: 'Knee - Adapters/Cones/Sleeves',
    emdn_code: 'P09098002', // KNEE PROSTHESES ADAPTERS (INCLUDING CONES AND SLEEVES)
    patterns: [
      /knee.*adapt/i,
      /tibial.*adapt/i,
      /knee.*cone/i,
      /tibial.*cone/i,
      /femoral.*cone/i,
      /knee.*sleeve/i,
      /tibial.*sleeve/i,
      /femoral.*sleeve/i,
      /\bsleeve\b.*\btib\b/i,
      /\bsleeve\b.*\bfem\b/i,
      /taper.*lock.*adapt/i,
    ],
  },

  // Knee - Plugs and Obturators
  {
    name: 'Knee - Plugs/Obturators',
    emdn_code: 'P09098003', // KNEE PROSTHESES OBTURATORS AND PLUGS
    patterns: [
      /knee.*plug/i,
      /tibial.*plug/i,
      /femoral.*plug/i,
      /\bplug\b.*\btib\b/i,
      /\bplug\b.*\bfem\b/i,
      /obturator/i,
    ],
  },

  // Knee - Centralizers
  {
    name: 'Knee - Centralizers',
    emdn_code: 'P09098004', // KNEE PROSTHESES CENTRALISERS
    patterns: [
      /centrali[sz]er/i,
    ],
    excludePatterns: [
      /hip/i,
    ],
  },

  // Knee - Tibial Components (baseplates, trays)
  {
    name: 'Knee - Tibial Components',
    emdn_code: 'P090907', // KNEE PROSTHESES TIBIAL COMPONENTS
    patterns: [
      /tibial\s*(base)?plate/i,
      /tibial\s*tray/i,
      /tibial\s*component/i,
      /tibial\s*implant/i,
      /\btib\b.*plate/i,
      /\btib\b.*tray/i,
      /\btib\b.*base/i,
      /baseplate.*tib/i,
      /tray.*tib/i,
      /physica.*\btib\b/i, // PHYSICA tibial
      /multigen.*\btib\b/i, // MULTIGEN tibial
      /nexgen.*tib/i, // NexGen tibial
      /persona.*tib/i, // Persona tibial
    ],
    excludePatterns: [
      /liner/i,
      /insert/i,
      /stem/i,
      /sleeve/i,
      /augment/i,
    ],
  },

  // Knee - Femoral Components
  {
    name: 'Knee - Femoral Components',
    emdn_code: 'P090906', // KNEE PROSTHESES FEMORAL COMPONENTS
    patterns: [
      /femoral\s*component.*knee/i,
      /knee.*femoral\s*component/i,
      /\bfem\b.*component/i,
      /physica.*\bfem\b/i, // PHYSICA femoral
      /multigen.*\bfem\b/i, // MULTIGEN femoral
      /nexgen.*fem/i,
      /persona.*fem/i,
      /femoral.*condyl/i,
      /\bfem\b.*\d+.*[lr]/i, // "FEM 5 R" patterns
      /\bfem\b.*size/i,
      /\bfem\b.*sz/i,
    ],
    excludePatterns: [
      /hip/i,
      /head\b/i,
      /stem/i,
      /sleeve/i,
      /augment/i,
    ],
  },

  // Knee - Patellar Components
  {
    name: 'Knee - Patellar Components',
    emdn_code: 'P09090702', // PATELLAR COMPONENTS, TOTAL
    patterns: [
      /patella/i,
      /patellar/i,
      /all\s*poly.*pat/i, // ALL POLY PAT COMP
      /pat\s*comp/i, // PAT COMP
      /\bpat\b.*\d+.*dia/i, // PAT 32DIA patterns
    ],
  },

  // Knee - Inserts/Liners (PE inserts)
  {
    name: 'Knee - PE Inserts',
    emdn_code: 'P0909030202', // BICOMPARTMENTAL PRIMARY IMPLANT TIBIAL INSERTS
    patterns: [
      /tibial.*insert/i,
      /tibial.*liner/i,
      /\btib\b.*insert/i,
      /\btib\b.*liner/i,
      /knee.*liner/i,
      /knee.*insert/i,
      /insert.*\btib\b/i,
      /liner.*\btib\b/i,
      /\bpe\b.*\btib\b/i,
      /polyethylene.*tibial/i,
      /physica.*liner/i,
      /multigen.*liner/i,
      /multigen.*insert/i,
      /lps.*liner/i,
      /cck.*liner/i,
      /ps.*liner.*knee/i,
      /cr.*liner.*knee/i,
    ],
  },

  // Knee - Spacers
  {
    name: 'Knee - Spacers',
    emdn_code: 'P090908', // KNEE PROSTHESES SPACERS
    patterns: [
      /knee.*spacer/i,
      /tibial.*spacer/i,
    ],
  },

  // Knee - Accessories (other)
  {
    name: 'Knee - Accessories',
    emdn_code: 'P09098099', // KNEE PROSTHESES - ACCESSORIES - OTHER
    patterns: [
      /knee.*screw/i,
      /tibial.*screw/i,
      /knee.*offset/i,
    ],
  },

  // Knee - Oxford Unicompartmental
  {
    name: 'Knee - Oxford Unicompartmental',
    emdn_code: 'P090904', // UNICOMPARTMENTAL KNEE PROSTHESES
    patterns: [
      /\boxf\b/i, // OXF abbreviation
      /oxford/i,
      /unicompartmental/i,
      /unicondylar/i,
    ],
  },

  // Knee - LCCK (Legacy Constrained Condylar Knee)
  {
    name: 'Knee - Constrained Components',
    emdn_code: 'P090905', // REVISION KNEE PROSTHESES
    patterns: [
      /\blcck\b/i, // LCCK abbreviation
      /constrained.*condylar/i,
      /legacy.*constrained/i,
    ],
  },

  // Knee - Zimmer/Other Product Lines (general knee if not more specific)
  {
    name: 'Knee - Product Systems',
    emdn_code: 'P0909', // KNEE PROSTHESES
    patterns: [
      /physica/i, // Zimmer PHYSICA
      /multigen/i, // Zimmer MULTIGEN PLUS
      /nexgen/i, // Zimmer NexGen
      /persona/i, // Zimmer Persona
      /\bpsn\b/i, // PSN = Persona abbreviation
      /\basf\b/i, // ASF = Art Surface
      /\blps\b/i, // Legacy Posterior Stabilized
      /\bcck\b/i, // Constrained Condylar Knee
      /\bcr\b.*knee/i, // Cruciate Retaining
      /\bps\b.*knee/i, // Posterior Stabilized
      /art\s*surf/i, // Art Surface
      /\bbrg\b/i, // BRG = Bearing
      /\bpma\b/i, // PMA = posterior stabilized mobile
    ],
    excludePatterns: [
      /hip/i,
      /elbow/i,
      /shoulder/i,
    ],
  },

  // Knee - General (catch remaining knee products)
  {
    name: 'Knee - General',
    emdn_code: 'P0909', // KNEE PROSTHESES
    patterns: [
      /\bknee\b/i,
      /\btibial\b/i,
      /\btib\b(?!.*hip)/i, // TIB abbreviation, not hip
      /\bfem\b.*\d+/i, // FEM with size (likely knee)
    ],
    excludePatterns: [
      /elbow/i,
      /hip/i,
      /acetabul/i,
      /femoral.*head/i,
      /femoral.*stem/i,
    ],
  },

  // ============================================
  // OSTEOSYNTHESIS - Fixation devices
  // ============================================
  {
    name: 'Osteosynthesis - Cerclage',
    emdn_code: 'P09120302', // CERCLAGE DEVICES, WIRES AND BINDERS
    patterns: [
      /cerclage/i,
      /\bband\b.*ti\b/i, // Band titanium
    ],
  },
  {
    name: 'Osteosynthesis - Fixation Pins',
    emdn_code: 'P09120301', // KIRSCHNER BONE WIRES
    patterns: [
      /fix.*pin/i,
      /\bpin\b.*\d+.*mm/i,
      /bone\s*pin/i,
    ],
    excludePatterns: [
      /hip/i,
      /knee/i,
    ],
  },
  {
    name: 'Bone Screws - Cancellous',
    emdn_code: 'P09120602', // CANCELLOUS SCREWS
    patterns: [
      /cancellous.*screw/i,
      /bone\s*screw.*spongiosa/i,
      /cancell.*scr/i, // CANCELL SCR abbreviation
      /spongiosa.*screw/i,
    ],
  },
  {
    name: 'Bone Screws - Self-Tapping',
    emdn_code: 'P09120601', // CORTICAL SCREWS
    patterns: [
      /bone\s*screw/i,
      /self.*tapping.*screw/i,
      /cortical.*screw/i,
      /\bscrew\b.*\d+.*mm/i, // SCREW with size
      /\bscr\b.*\d+\.\d+/i, // SCR abbreviation with size
      /\bscr\b.*\d+mm/i, // SCR 48MM patterns
      /hdegd.*scr/i, // HDEGD SCR
      /spec.*screw/i, // SPEC. SCREW
      /sterile.*screw/i, // STERILE SCREW
    ],
    excludePatterns: [
      /hip/i,
      /acetabular/i,
      /cup/i,
      /knee/i,
      /tibial/i,
      /shoulder/i,
      /cancell/i,
      /locking/i,
    ],
  },

  // ============================================
  // HIP - General fallback (most products)
  // ============================================
  {
    name: 'Hip - Acetabular Components',
    emdn_code: 'P090803', // HIP PROSTHESES ACETABULAR COMPONENTS
    patterns: [
      /acetabul/i,
      /\bcup\b/i,
    ],
    excludePatterns: [
      /elbow/i,
      /knee/i,
      /shoulder/i,
      /tibial/i,
      /\btib\b/i,
    ],
  },
  {
    name: 'Hip - Femoral Components',
    emdn_code: 'P090804', // HIP PROSTHESES FEMORAL COMPONENTS
    patterns: [
      /femoral/i,
      /femur/i,
      /\bstem\b/i,
    ],
    excludePatterns: [
      /elbow/i,
      /knee/i,
      /shoulder/i,
      /humeral/i,
      /tibial/i,
      /\btib\b/i,
      /physica/i, // Zimmer knee
      /multigen/i, // Zimmer knee
    ],
  },
  {
    name: 'Hip - Femoral Heads (fallback)',
    emdn_code: 'P09080405', // FEMORAL HEADS
    patterns: [
      /\bhead\b.*\d+.*mm/i, // HEAD 28MM, etc.
      /\bhead\b.*\d+/i, // HEAD 28, etc.
    ],
    excludePatterns: [
      /elbow/i,
      /knee/i,
      /shoulder/i,
      /humeral/i,
      /screw/i,
    ],
  },
  {
    name: 'Hip - General',
    emdn_code: 'P0908', // HIP PROSTHESES
    patterns: [
      /\bhip\b/i,
      /cl\s*trauma.*hip/i,
    ],
  },

  // ============================================
  // HIP - Reinforcement Rings
  // ============================================
  {
    name: 'Hip - Reinforcement Rings',
    emdn_code: 'P090880', // HIP PROSTHESES - ACCESSORIES
    patterns: [
      /reinforc.*ring/i,
      /b-s.*ring/i, // B-S reinforcement ring (Burch-Schneider)
      /anti.*protrusio/i,
    ],
  },

  // ============================================
  // CATCH-ALL for orthopedic implants
  // ============================================
  {
    name: 'Orthopedic Implants - Other',
    emdn_code: 'P09', // ORTHOPAEDIC PROSTHESES
    patterns: [
      /implant/i,
      /prosthe/i,
    ],
  },
]

interface CategoryMapping {
  productId: string
  productName: string
  categoryCode: string
  categoryId: string
  ruleName: string
}

async function categorizeProducts() {
  console.log('🏷️  Starting intelligent product categorization...\n')

  // Load all uncategorized products (paginated to handle >1000 rows)
  const products: { id: string; name: string }[] = []
  const PAGE_SIZE = 1000
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .is('emdn_category_id', null)
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) {
      console.error('Error loading products:', error)
      return
    }

    if (data && data.length > 0) {
      products.push(...data)
      hasMore = data.length === PAGE_SIZE
      page++
    } else {
      hasMore = false
    }
  }

  if (products.length === 0) {
    console.log('✅ All products are already categorized!')
    return
  }

  console.log(`📦 Found ${products.length} uncategorized products\n`)

  // Load EMDN categories
  const { data: categories, error: catError } = await supabase
    .from('emdn_categories')
    .select('id, code, name')

  if (catError || !categories) {
    console.error('Error loading categories:', catError)
    return
  }

  const categoryByCode = new Map(categories.map(c => [c.code, c]))
  console.log(`📚 Loaded ${categories.length} EMDN categories\n`)

  // Categorize each product
  const mappings: CategoryMapping[] = []
  const unmatched: string[] = []
  const stats: Record<string, number> = {}

  for (const product of products) {
    let matched = false

    for (const rule of CATEGORY_RULES) {
      // Check exclude patterns first
      if (rule.excludePatterns) {
        const excluded = rule.excludePatterns.some(p => p.test(product.name))
        if (excluded) continue
      }

      // Check match patterns
      const matches = rule.patterns.some(p => p.test(product.name))
      if (matches) {
        const category = categoryByCode.get(rule.emdn_code)
        if (category) {
          mappings.push({
            productId: product.id,
            productName: product.name,
            categoryCode: rule.emdn_code,
            categoryId: category.id,
            ruleName: rule.name,
          })
          stats[rule.name] = (stats[rule.name] || 0) + 1
          matched = true
          break
        } else {
          console.warn(`⚠️  Category ${rule.emdn_code} not found for rule "${rule.name}"`)
        }
      }
    }

    if (!matched) {
      unmatched.push(product.name)
    }
  }

  // Print statistics
  console.log('📊 Categorization Results:')
  console.log('─'.repeat(60))

  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([rule, count]) => {
      console.log(`${count.toString().padStart(5)} | ${rule}`)
    })

  console.log('─'.repeat(60))
  console.log(`${mappings.length.toString().padStart(5)} | TOTAL CATEGORIZED`)
  console.log(`${unmatched.length.toString().padStart(5)} | Unmatched`)

  if (unmatched.length > 0) {
    console.log('\n⚠️  Unmatched products (first 10):')
    unmatched.slice(0, 10).forEach(name => {
      console.log(`  - ${name.substring(0, 70)}`)
    })
  }

  // Apply categorizations
  console.log('\n\n🔄 Applying categorizations to database...')

  let updated = 0
  let errors = 0

  // Group by category for efficient updates
  const byCategory = new Map<string, string[]>()
  for (const mapping of mappings) {
    if (!byCategory.has(mapping.categoryId)) {
      byCategory.set(mapping.categoryId, [])
    }
    byCategory.get(mapping.categoryId)!.push(mapping.productId)
  }

  for (const [categoryId, productIds] of byCategory) {
    // Update in batches of 100
    for (let i = 0; i < productIds.length; i += 100) {
      const batch = productIds.slice(i, i + 100)
      const { error } = await supabase
        .from('products')
        .update({ emdn_category_id: categoryId })
        .in('id', batch)

      if (error) {
        console.error(`Error updating batch:`, error)
        errors += batch.length
      } else {
        updated += batch.length
      }
    }
  }

  console.log(`\n✅ Categorization complete!`)
  console.log(`   Updated: ${updated} products`)
  console.log(`   Errors: ${errors}`)
  console.log(`   Unmatched: ${unmatched.length}`)

  // Show sample of each category
  console.log('\n\n📋 Sample products per category:')
  console.log('─'.repeat(80))

  const samplesByRule = new Map<string, string[]>()
  for (const mapping of mappings) {
    if (!samplesByRule.has(mapping.ruleName)) {
      samplesByRule.set(mapping.ruleName, [])
    }
    const samples = samplesByRule.get(mapping.ruleName)!
    if (samples.length < 2) {
      samples.push(mapping.productName)
    }
  }

  for (const [rule, samples] of samplesByRule) {
    console.log(`\n${rule}:`)
    samples.forEach(s => console.log(`  └─ ${s.substring(0, 65)}`))
  }
}

categorizeProducts().catch(console.error)
