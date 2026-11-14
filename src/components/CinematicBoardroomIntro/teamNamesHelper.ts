/**
 * teamNamesHelper.ts
 *
 * Extracts team member names from the "Team Resource Allocation" section of /qa-report,
 * with fallbacks to DOM fetching, localStorage cached data, and default demo names.
 * Supports multiple senior / meetingWith attendees at the head of the table.
 */

export interface TeamDataResult {
  seniorNames: string[];
  seniorName: string; // primary or joined string
  seniorRole?: string;
  members: string[];
}

export const DEMO_MEMBERS: string[] = [
  'Alex Morgan',
  'David Kim',
  'Elena Rostova',
  'Marcus Vance',
  'Priya Patel',
  'Carlos Mendez',
  'Sarah Lin',
  'Jordan Blake',
  'Amina Yusuf',
];

export const DEMO_SENIOR = 'Sarah Jenkins (QA Lead)';

/**
 * Escapes characters for safe insertion into HTML strings to prevent XSS.
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extracts initials (max 2 characters) from a person's name.
 */
export function getInitials(name: string): string {
  if (!name || typeof name !== 'string') return 'QA';
  const clean = name.replace(/\(.*?\)/g, '').trim(); // Remove parenthesized roles
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'QA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Parses names from a string (comma/semicolon/ampersand separated) or array
 */
export function parseMeetingWithNames(input?: string | string[]): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(s => String(s).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/[,;&]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  return [];
}

/**
 * Helper to parse a container element for team member names.
 */
function extractNamesFromContainer(container: Element): string[] {
  const extracted: string[] = [];

  // 1. First column of any table
  const tableCells = container.querySelectorAll('table tbody tr td:first-child, table tr td:first-child');
  tableCells.forEach(cell => {
    const text = cell.textContent?.trim();
    if (text && text.length > 1 && !text.toLowerCase().includes('name') && !text.toLowerCase().includes('total')) {
      extracted.push(text);
    }
  });

  // 2. Any <li> elements (e.g. employee chip lists)
  const listItems = container.querySelectorAll('li');
  listItems.forEach(li => {
    const dataName = li.getAttribute('data-name');
    if (dataName?.trim()) {
      extracted.push(dataName.trim());
      return;
    }

    const chipBtn = li.querySelector('button[aria-label]');
    if (chipBtn) {
      const aria = chipBtn.getAttribute('aria-label') || '';
      const namePart = aria.split('—')[0]?.split('·')[0]?.trim();
      if (namePart && namePart.length > 1) {
        extracted.push(namePart);
        return;
      }
    }

    const truncateSpan = li.querySelector('.truncate');
    if (truncateSpan?.textContent?.trim()) {
      extracted.push(truncateSpan.textContent.trim());
      return;
    }

    const liText = li.textContent?.trim();
    if (liText && liText.length > 1 && liText.length < 50) {
      const firstLine = liText.split('\n')[0].trim();
      if (firstLine) extracted.push(firstLine);
    }
  });

  // 3. Elements with data-name anywhere in container
  const dataNameEls = container.querySelectorAll('[data-name]');
  dataNameEls.forEach(el => {
    const name = el.getAttribute('data-name')?.trim();
    if (name) extracted.push(name);
  });

  // 4. Chip buttons if not wrapped in <li>
  const chipButtons = container.querySelectorAll('button[aria-label]');
  chipButtons.forEach(btn => {
    const aria = btn.getAttribute('aria-label') || '';
    const namePart = aria.split('—')[0]?.split('·')[0]?.trim();
    if (namePart && namePart.length > 1 && namePart.length < 40) {
      extracted.push(namePart);
    }
  });

  return extracted;
}

function findAndExtractFromDoc(doc: Document): string[] {
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'));
  const targetHeading = headings.find(h =>
    h.textContent?.toLowerCase().includes('team resource allocation')
  );

  if (!targetHeading) return [];

  let section: Element | null = targetHeading.parentElement;
  let depth = 0;
  while (section && depth < 4) {
    if (section.querySelector('table, ul, ol, [data-name]')) break;
    section = section.parentElement;
    depth++;
  }

  const container = section || targetHeading.parentElement;
  if (!container) return [];

  return extractNamesFromContainer(container);
}

/**
 * Attempt to read team members & meetingWith from localStorage
 */
function tryExtractFromStorage(): { members: string[]; seniorNames: string[]; seniorName?: string } {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { members: [], seniorNames: [] };
    }
    const raw = window.localStorage.getItem('current-qa-report-data');
    if (!raw) return { members: [], seniorNames: [] };

    const parsed = JSON.parse(raw);
    const members: string[] = [];

    if (Array.isArray(parsed.newFeatureTeam)) members.push(...parsed.newFeatureTeam);
    if (Array.isArray(parsed.supportTeam)) members.push(...parsed.supportTeam);
    if (Array.isArray(parsed.automationTeam)) members.push(...parsed.automationTeam);

    if (parsed.teamCapacity?.records && Array.isArray(parsed.teamCapacity.records)) {
      parsed.teamCapacity.records.forEach((r: any) => {
        if (r?.employeeName) members.push(r.employeeName);
      });
    }

    // Check Meeting With field first!
    const meetingWithParsed = parseMeetingWithNames(parsed.meetingWith);

    const seniorName = parsed.qaTeamLead || parsed.reportOwner || parsed.author || parsed.signOffBy;
    return { members, seniorNames: meetingWithParsed, seniorName };
  } catch {
    return { members: [], seniorNames: [] };
  }
}

/**
 * Main function to retrieve team names and senior attendees:
 * 1. Checks customSenior / meetingWith names
 * 2. Scans DOM or localStorage for Team Resource Allocation
 * 3. Removes duplicates and filters out senior leaders from general team pool
 */
export async function getTeamNames(
  customSenior?: string | string[],
  maxMembers: number = 24
): Promise<TeamDataResult> {
  let rawNames: string[] = [];
  let seniorNamesFromData: string[] = [];
  let fallbackSeniorName: string | undefined = undefined;

  // 1. Process customSenior parameter
  const parsedCustom = parseMeetingWithNames(customSenior);

  // 2. Search current DOM
  if (typeof document !== 'undefined') {
    rawNames = findAndExtractFromDoc(document);
  }

  // 3. If not found in current DOM, try fetching /qa-report
  if (rawNames.length === 0 && typeof window !== 'undefined' && typeof fetch === 'function') {
    try {
      const response = await fetch('/qa-report', { credentials: 'same-origin' });
      if (response.ok) {
        const html = await response.text();
        const parser = new DOMParser();
        const remoteDoc = parser.parseFromString(html, 'text/html');
        rawNames = findAndExtractFromDoc(remoteDoc);
      }
    } catch {
      // route not accessible via raw HTML fetch
    }
  }

  // 4. Fallback to cached app storage
  const fromStorage = tryExtractFromStorage();
  if (rawNames.length === 0 && fromStorage.members.length > 0) {
    rawNames = fromStorage.members;
  }
  if (fromStorage.seniorNames.length > 0) {
    seniorNamesFromData = fromStorage.seniorNames;
  }
  if (fromStorage.seniorName) {
    fallbackSeniorName = fromStorage.seniorName;
  }

  // Deduplicate and trim members
  const cleanedSet = new Set<string>();
  for (const raw of rawNames) {
    const trimmed = raw.trim();
    if (trimmed && trimmed.length > 1 && !cleanedSet.has(trimmed)) {
      cleanedSet.add(trimmed);
    }
  }

  let finalMembers = Array.from(cleanedSet);
  if (finalMembers.length === 0) {
    finalMembers = [...DEMO_MEMBERS];
  }

  // Resolve Senior / Meeting With leaders
  let resolvedSeniorNames: string[] = [];
  if (parsedCustom.length > 0) {
    resolvedSeniorNames = parsedCustom;
  } else if (seniorNamesFromData.length > 0) {
    resolvedSeniorNames = seniorNamesFromData;
  } else if (fallbackSeniorName) {
    resolvedSeniorNames = [fallbackSeniorName];
  } else {
    resolvedSeniorNames = [DEMO_SENIOR];
  }

  // Filter out any senior leaders from general team members to avoid duplicates
  const seniorLowerSet = new Set(resolvedSeniorNames.map(s => s.toLowerCase()));
  finalMembers = finalMembers.filter(m => !seniorLowerSet.has(m.toLowerCase()));

  // Cap team members to maxMembers
  if (finalMembers.length > maxMembers) {
    finalMembers = finalMembers.slice(0, maxMembers);
  }

  return {
    seniorNames: resolvedSeniorNames,
    seniorName: resolvedSeniorNames.join(', '),
    seniorRole: resolvedSeniorNames.length > 1 ? 'Executive Attendees' : 'Executive QA Lead',
    members: finalMembers,
  };
}
