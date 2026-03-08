/**
 * Parses a two-part reasoning string separated by ---GAFFER---
 * Part 1 (before separator): Stats/Facts - objective data
 * Part 2 (after separator): The Gaffer's Take - personality-driven roundup
 * 
 * Falls back to treating entire string as gaffer commentary if no separator found.
 */
/** Remove redundant label prefixes like "STATS & FACTS:" or "THE GAFFER:" from the start of text */
function stripPrefix(text: string): string {
  return text
    .replace(/^(STATS\s*&?\s*FACTS\s*:?\s*)/i, '')
    .replace(/^(THE\s+GAFFER\s*:?\s*)/i, '')
    .trim();
}

/**
 * Convert raw legacy ACCA stat dumps into clean, readable bullet-point summaries.
 * Input example:
 *   "Crewe Over 8.5 Corners @ 1.44. HOME - Crewe (L10): avg 3.5 corners won/gm, avg 6 conceded/gm, 
 *    total avg 9.5 corners/gm, O9.5 67%, form WWDWDLWDWL. AWAY - Fleetwood Town (L10): ..."
 * Output: clean bullet-pointed summary
 */
function formatLegacyStats(raw: string): { stats: string; gaffer: string } {
  // Extract team names from HOME/AWAY blocks
  const homeMatch = raw.match(/HOME\s*[-–—]\s*([^(]+?)\s*\(L\d+\)\s*:\s*(.+?)(?=\.\s*AWAY|\.$)/is);
  const awayMatch = raw.match(/AWAY\s*[-–—]\s*([^(]+?)\s*\(L\d+\)\s*:\s*(.+?)(?=\.\s*COMBINED|\.$)/is);
  const combinedMatch = raw.match(/COMBINED:\s*(.+?)(?:\.|$)/i);
  
  // Extract the market info from the header (e.g., "Crewe Over 8.5 Corners @ 1.44")
  const headerMatch = raw.match(/^(.+?)\s+(Over|Under)\s+([\d.]+)\s+(\w+)\s*@\s*([\d.]+)/i);
  
  if (!homeMatch && !awayMatch) {
    // Can't parse — just clean it up a bit
    return {
      stats: raw.replace(/HOME\s*[-–—]/gi, '\n🏠 HOME —').replace(/AWAY\s*[-–—]/gi, '\n✈️ AWAY —').replace(/COMBINED:/gi, '\n📊 COMBINED:').trim(),
      gaffer: generateGafferLine(raw),
    };
  }

  const lines: string[] = [];

  if (homeMatch) {
    const teamName = homeMatch[1].trim();
    const statsRaw = homeMatch[2].trim();
    lines.push(`🏠 ${teamName}: ${formatStatLine(statsRaw)}`);
  }
  
  if (awayMatch) {
    const teamName = awayMatch[1].trim();
    const statsRaw = awayMatch[2].trim();
    lines.push(`✈️ ${teamName}: ${formatStatLine(statsRaw)}`);
  }
  
  if (combinedMatch) {
    lines.push(`📊 Combined: ${combinedMatch[1].trim()}`);
  }

  return {
    stats: lines.join('\n'),
    gaffer: generateGafferLine(raw),
  };
}

/** Clean up a raw stat line into something readable */
function formatStatLine(raw: string): string {
  // Remove form strings like "form WWDWDLWDWL" — noisy
  let cleaned = raw.replace(/,?\s*form\s+[WDLNP]+/gi, '');
  
  // Replace shorthand
  cleaned = cleaned
    .replace(/avg\s/gi, 'avg ')
    .replace(/\/gm/gi, ' per game')
    .replace(/O(\d)/gi, 'Over $1')
    .replace(/conceded\/gm/gi, 'conceded per game')
    .replace(/won\/gm/gi, 'won per game')
    .replace(/scored\/gm/gi, 'scored per game')
    .replace(/total avg/gi, 'total avg')
    .replace(/hit rate high,?\s*/gi, '')
    .trim();
    
  // Remove trailing period
  if (cleaned.endsWith('.')) cleaned = cleaned.slice(0, -1);
  
  return cleaned;
}

/** Generate a proper Gaffer-style verdict from legacy stats */
function generateGafferLine(raw: string): string {
  const combinedMatch = raw.match(/COMBINED:\s*avg\s*([\d.]+)\s*(\w+)/i);
  const marketMatch = raw.match(/(Over|Under)\s+([\d.]+)\s+(\w+)/i);
  const oddsMatch = raw.match(/@\s*([\d.]+)/);
  
  if (combinedMatch && marketMatch) {
    const combinedAvg = parseFloat(combinedMatch[1]);
    const threshold = parseFloat(marketMatch[2]);
    const marketType = marketMatch[3].toLowerCase();
    const odds = oddsMatch ? parseFloat(oddsMatch[1]) : null;
    
    const margin = combinedAvg - threshold;
    const isComfortable = margin > 1;
    
    if (marketType.includes('corner')) {
      if (isComfortable) {
        return `Both sides rack up set pieces — a combined ${combinedAvg} corners per game smashes the ${threshold} mark. This is one of the strongest corner plays on tonight's card.`;
      }
      return `The corner data stacks up nicely here — ${combinedAvg} per game combined clears the ${threshold} threshold. Expect flags waving all night.`;
    }
    
    if (marketType.includes('goal')) {
      if (isComfortable) {
        return `The goals data is screaming — ${combinedAvg} per game combined blows past the ${threshold} mark. Neither defence can keep it tight. Nailed on.`;
      }
      return `With ${combinedAvg} goals per game between them, this fixture clears ${threshold} comfortably. The stats don't lie — get on it.`;
    }
    
    if (marketType.includes('card')) {
      return `Cards are flying in this matchup — ${combinedAvg} per game combined. The ${threshold} mark is well within reach. Tasty.`;
    }
    
    return `Combined average of ${combinedAvg} per game across both teams — the ${threshold} mark is covered. Solid pick.`;
  }
  
  // Generic fallback
  if (raw.includes('corner')) return "The corner stats stack up perfectly — both sides generate plenty of set-piece pressure. This is a banker.";
  if (raw.includes('goal') || raw.includes('Goal')) return "When these two meet, goals follow. The attacking stats are rock solid on both sides. Get it on.";
  if (raw.includes('card') || raw.includes('Card')) return "A card-heavy affair is on the cards — the disciplinary records don't lie. Expect the ref's pocket to be busy.";
  
  return "The form tables are screaming for this one — the data backs it up across the board. Proper value.";
}

export function parseReasoning(reasoning: string | null | undefined): {
  statsFacts: string | null;
  gafferTake: string;
} {
  if (!reasoning) return { statsFacts: null, gafferTake: '' };

  const separator = '---GAFFER---';
  const idx = reasoning.indexOf(separator);

  if (idx !== -1) {
    const statsFacts = stripPrefix(reasoning.slice(0, idx).trim());
    const gafferTake = stripPrefix(reasoning.slice(idx + separator.length).trim());
    return {
      statsFacts: statsFacts || null,
      gafferTake: gafferTake || stripPrefix(reasoning.trim()),
    };
  }

  // ACCA legacy format: "TeamName Market @ Odds. HOME - ... AWAY - ... COMBINED: ..."
  const hasHomeAway = /HOME\s*[-–—]/i.test(reasoning) && /AWAY\s*[-–—]/i.test(reasoning);
  if (hasHomeAway) {
    const { stats, gaffer } = formatLegacyStats(reasoning);
    return {
      statsFacts: stats,
      gafferTake: gaffer,
    };
  }

  // Plain legacy format: entire string is the gaffer take
  return { statsFacts: null, gafferTake: reasoning.trim() };
}
