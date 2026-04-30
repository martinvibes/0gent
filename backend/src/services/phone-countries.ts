/**
 * Curated list of the 50 countries Twilio (and our backend) is most likely
 * to actually return inventory for, with their ISO 3166-1 alpha-2 codes
 * and human-readable names.
 *
 * This is *advisory* — Twilio's coverage shifts over time and not every
 * country will have local-number inventory at every moment. But these are
 * the safe picks for a demo / agent flow.
 */

export interface CountryEntry {
  code: string;   // ISO 3166-1 alpha-2 (what Twilio expects)
  name: string;   // Human-readable
  region: string; // Loose grouping for grouped renders
  popular?: boolean; // Top picks — bias these in fuzzy match / suggestions
}

export const SUPPORTED_COUNTRIES: CountryEntry[] = [
  // North America
  { code: 'US', name: 'United States',  region: 'North America', popular: true  },
  { code: 'CA', name: 'Canada',          region: 'North America', popular: true  },
  { code: 'MX', name: 'Mexico',          region: 'North America' },

  // British Isles
  { code: 'GB', name: 'United Kingdom',  region: 'Europe',        popular: true  },
  { code: 'IE', name: 'Ireland',          region: 'Europe',        popular: true  },

  // Western Europe
  { code: 'DE', name: 'Germany',          region: 'Europe',        popular: true  },
  { code: 'FR', name: 'France',           region: 'Europe',        popular: true  },
  { code: 'IT', name: 'Italy',            region: 'Europe' },
  { code: 'ES', name: 'Spain',            region: 'Europe' },
  { code: 'NL', name: 'Netherlands',      region: 'Europe' },
  { code: 'BE', name: 'Belgium',          region: 'Europe' },
  { code: 'AT', name: 'Austria',          region: 'Europe' },
  { code: 'CH', name: 'Switzerland',      region: 'Europe' },
  { code: 'PT', name: 'Portugal',         region: 'Europe' },
  { code: 'LU', name: 'Luxembourg',       region: 'Europe' },

  // Nordics
  { code: 'SE', name: 'Sweden',           region: 'Europe' },
  { code: 'NO', name: 'Norway',           region: 'Europe' },
  { code: 'DK', name: 'Denmark',          region: 'Europe' },
  { code: 'FI', name: 'Finland',          region: 'Europe' },
  { code: 'IS', name: 'Iceland',          region: 'Europe' },

  // Central / Eastern Europe
  { code: 'PL', name: 'Poland',           region: 'Europe' },
  { code: 'CZ', name: 'Czech Republic',   region: 'Europe' },
  { code: 'HU', name: 'Hungary',          region: 'Europe' },
  { code: 'RO', name: 'Romania',          region: 'Europe' },
  { code: 'GR', name: 'Greece',           region: 'Europe' },
  { code: 'BG', name: 'Bulgaria',         region: 'Europe' },
  { code: 'HR', name: 'Croatia',          region: 'Europe' },
  { code: 'SK', name: 'Slovakia',         region: 'Europe' },
  { code: 'SI', name: 'Slovenia',         region: 'Europe' },
  { code: 'EE', name: 'Estonia',          region: 'Europe' },
  { code: 'MT', name: 'Malta',            region: 'Europe' },
  { code: 'CY', name: 'Cyprus',           region: 'Europe' },

  // Asia-Pacific
  { code: 'AU', name: 'Australia',        region: 'Asia-Pacific',  popular: true  },
  { code: 'NZ', name: 'New Zealand',      region: 'Asia-Pacific' },
  { code: 'JP', name: 'Japan',            region: 'Asia-Pacific',  popular: true  },
  { code: 'KR', name: 'South Korea',      region: 'Asia-Pacific' },
  { code: 'TW', name: 'Taiwan',           region: 'Asia-Pacific' },
  { code: 'SG', name: 'Singapore',        region: 'Asia-Pacific',  popular: true  },
  { code: 'HK', name: 'Hong Kong',        region: 'Asia-Pacific' },
  { code: 'MY', name: 'Malaysia',         region: 'Asia-Pacific' },
  { code: 'PH', name: 'Philippines',      region: 'Asia-Pacific' },
  { code: 'TH', name: 'Thailand',         region: 'Asia-Pacific' },
  { code: 'ID', name: 'Indonesia',        region: 'Asia-Pacific' },
  { code: 'IN', name: 'India',            region: 'Asia-Pacific' },

  // Middle East / Africa
  { code: 'IL', name: 'Israel',           region: 'Middle East' },
  { code: 'AE', name: 'United Arab Emirates', region: 'Middle East' },
  { code: 'ZA', name: 'South Africa',     region: 'Africa' },

  // Latin America
  { code: 'BR', name: 'Brazil',           region: 'Latin America', popular: true  },
  { code: 'AR', name: 'Argentina',        region: 'Latin America' },
  { code: 'CL', name: 'Chile',            region: 'Latin America' },
  { code: 'CO', name: 'Colombia',         region: 'Latin America' },
];

/**
 * Resolve a user-typed country string to an ISO 3166-1 alpha-2 code we should
 * try against Twilio. Our 50-country list is curated, but Twilio supports
 * 170+ countries — so any 2-letter input is passed through verbatim, even if
 * it isn't in our list (e.g. KE, NG, ZA). Only unmistakable typos return null.
 *
 * Handles:
 *   - "US"                → { code: "US", name: "United States",  knownInList: true  }
 *   - "us"                → "US"
 *   - "UK"                → "GB"  (common ISO mistake)
 *   - "USA"               → "US"
 *   - "United Kingdom"    → "GB"  (matches our curated name)
 *   - "KE"                → { code: "KE", name: "KE", knownInList: false } — pass through
 *   - "england"           → null (3+ letter name not in our list → typo)
 *   - "NGN"               → null (3+ letter and not a known full name → typo, suggest "NG")
 */
export interface ResolvedCountry {
  code: string;
  name: string;
  knownInList: boolean;
  popular?: boolean;
}

export function resolveCountry(input: string): ResolvedCountry | null {
  if (!input) return null;
  const q = input.trim().toLowerCase();
  const upper = q.toUpperCase();

  // Common alias — "UK" is what people type but Twilio wants "GB"
  if (upper === 'UK') {
    const c = SUPPORTED_COUNTRIES.find(c => c.code === 'GB')!;
    return { code: c.code, name: c.name, knownInList: true, popular: c.popular };
  }
  if (upper === 'USA') {
    const c = SUPPORTED_COUNTRIES.find(c => c.code === 'US')!;
    return { code: c.code, name: c.name, knownInList: true, popular: c.popular };
  }

  // Direct ISO-2 match against our curated list
  const byCode = SUPPORTED_COUNTRIES.find(c => c.code === upper);
  if (byCode) return { code: byCode.code, name: byCode.name, knownInList: true, popular: byCode.popular };

  // Exact name match (case-insensitive) — covers full names like "Germany"
  const byName = SUPPORTED_COUNTRIES.find(c => c.name.toLowerCase() === q);
  if (byName) return { code: byName.code, name: byName.name, knownInList: true, popular: byName.popular };

  // Pass-through: any 2-letter input not in our list is still a valid ISO-2
  // candidate. Twilio will tell us if it doesn't have inventory.
  if (/^[A-Z]{2}$/.test(upper)) {
    return { code: upper, name: upper, knownInList: false };
  }

  // 3+ letters but not a known full name → assume typo, return null
  // so the route can offer a friendly suggestion.
  return null;
}

/**
 * Suggest the closest matching country code for a user typo.
 * Used for friendly error messages: "Did you mean 'GB' (United Kingdom)?"
 */
export function suggestCountry(input: string): CountryEntry | null {
  if (!input) return null;
  const q = input.trim().toLowerCase();

  // Substring match on name
  const partial = SUPPORTED_COUNTRIES.find(c => c.name.toLowerCase().includes(q));
  if (partial) return partial;

  // Substring match on code
  const partialCode = SUPPORTED_COUNTRIES.find(c => c.code.toLowerCase().includes(q));
  if (partialCode) return partialCode;

  return null;
}
