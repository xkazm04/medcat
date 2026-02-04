# MedCatalog

An orthopedic medical device product catalog application built with Next.js 16 and Supabase. Designed for managing, categorizing, and researching medical implants with EMDN (European Medical Device Nomenclature) classification support.

## Features

### Product Catalog
- **Searchable Product Database**: Full-text search across product names, descriptions, and SKUs
- **Advanced Filtering**: Filter by EMDN category, vendor, material, and price range
- **Hierarchical Category Tree**: Browse products through EMDN classification hierarchy
- **Sortable Data Table**: Sort by name, SKU, price, or date with pagination
- **Product Details**: View complete product information including regulatory data

### EMDN Classification
- **295 EMDN Categories**: Complete P09 branch (Orthopedic Prostheses)
- **Intelligent Auto-Categorization**: Pattern-based rules achieving 99.5% categorization accuracy
- **Category Hierarchy**: Navigate from top-level (P09) to specific subcategories
- **Product Counts**: See how many products exist in each category

### AI-Powered Extraction
- **Document Processing**: Extract product information from text/markdown files using Google Gemini AI
- **Structured Output**: Automatically extracts name, SKU, description, materials, regulatory info
- **Similarity Detection**: Warns about duplicate or similar existing products
- **Test Extraction**: Built-in test with sample product data (Stryker Trident II)

### Bulk Import
- **CSV Import Wizard**: Multi-step wizard for importing products from CSV files
- **Column Mapping**: Flexible mapping of CSV columns to product fields
- **Validation**: Pre-import validation with error reporting
- **Vendor Auto-Creation**: Automatically creates vendor records during import

### Price Research
- **Research Prompt Generator**: Creates comprehensive prompts for researching EU pricing
- **Alternative Product Search**: Find alternatives based on EMDN category and material
- **Price Comparison Panel**: Side-by-side comparison interface

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **UI**: Tailwind CSS 4, Radix UI primitives, Lucide icons
- **State**: React Hook Form + Zod validation
- **AI**: Google Gemini API for document extraction
- **Animations**: Motion (Framer Motion)

## Database Schema

```
vendors
├── id (UUID)
├── name
├── code (unique)
├── website
└── timestamps

emdn_categories
├── id (UUID)
├── code (unique, e.g., "P090803")
├── name
├── parent_id (self-referential)
├── depth
└── path

materials
├── id (UUID)
├── name
└── code

products
├── id (UUID)
├── name, sku, description
├── price
├── vendor_id → vendors
├── emdn_category_id → emdn_categories
├── material_id → materials
├── udi_di (UDI Device Identifier)
├── ce_marked (boolean)
├── mdr_class (I, IIa, IIb, III)
├── manufacturer_name, manufacturer_sku
└── timestamps
```

## Getting Started

### Prerequisites
- Node.js 20+
- Supabase account
- Google AI API key (for extraction feature)

### Environment Variables

Create a `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_AI_API_KEY=your_google_ai_key
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations (in Supabase dashboard or CLI)
# Apply migrations from supabase/migrations/

# Import EMDN categories
npm run import:emdn

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Data Management
npm run import:emdn      # Import EMDN categories from CSV
npm run import:borndigital # Import Borndigital product data
npm run seed             # Seed sample data
npm run enrich:emdn      # Enrich CSV with EMDN codes (AI)
npm run enrich:emdn:local # Enrich CSV with EMDN codes (local)
```

## Scripts

### Categorization Scripts

Located in `scripts/`:

| Script | Description |
|--------|-------------|
| `categorize-products.ts` | Intelligent bulk categorization with 50+ pattern rules |
| `analyze-products.ts` | Analyze product patterns and EMDN category usage |
| `analyze-unmatched.ts` | Find common patterns in uncategorized products |
| `import-emdn.ts` | Import EMDN categories from official CSV |
| `import-borndigital.ts` | Import products from Borndigital CSV format |

### Running Scripts

```bash
npx tsx scripts/categorize-products.ts
npx tsx scripts/analyze-unmatched.ts
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main catalog page
│   ├── import/page.tsx   # Bulk import wizard
│   └── layout.tsx
├── components/
│   ├── catalog-client.tsx      # Main catalog client component
│   ├── extraction/             # AI extraction components
│   ├── filters/                # Filter sidebar components
│   ├── import/                 # CSV import wizard
│   ├── product/                # Product detail & forms
│   ├── table/                  # Data table components
│   └── ui/                     # Base UI components
├── lib/
│   ├── actions/          # Server actions
│   ├── constants/        # Test data, constants
│   ├── gemini/           # Google AI client
│   ├── schemas/          # Zod schemas
│   ├── supabase/         # Supabase clients
│   ├── utils/            # Utilities
│   ├── queries.ts        # Database queries
│   └── types.ts          # TypeScript types
scripts/
├── categorize-products.ts
├── analyze-products.ts
├── import-emdn.ts
└── ...
supabase/
└── migrations/           # SQL migrations
```

## EMDN Categories

The application uses EMDN codes from the P09 branch:

| Code | Category |
|------|----------|
| P0901 | Shoulder Prostheses |
| P0902 | Elbow Prostheses |
| P0906 | Foot Prostheses |
| P0908 | Hip Prostheses |
| P0909 | Knee Prostheses |
| P0912 | Osteosynthesis Devices |
| P0913 | Orthopedic Instruments |
| P0990 | Cements & Accessories |

Full hierarchy includes 295 categories with up to 8 levels of depth.

## Current Data

- **2,581 products** imported from Borndigital dataset
- **99.5% categorization rate** (2,568 products categorized)
- **Main categories**: Hip (58%), Knee (25%), Shoulder (6%), Elbow (1%)

## API & Database Functions

### Supabase RPC Functions

- `get_category_descendants(parent_category_id)` - Returns all descendant category IDs for hierarchical filtering

### Circuit Breaker

Built-in circuit breaker pattern prevents infinite loops during SSR hydration issues.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting: `npm run lint`
5. Submit a pull request

## License

Private - All rights reserved.
