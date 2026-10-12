export function parseSkills(value: unknown): string[] {
  if (Array.isArray(value))
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parseSkills(parsed);
  } catch {
    /* Profile skills may also be comma-separated text. */
  }
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalize(skill: string): string {
  const value = skill.trim().toLowerCase().replace(/\s+/g, ' ');
  const aliases: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    'react.js': 'react',
    reactjs: 'react',
    'node.js': 'nodejs',
    'node js': 'nodejs',
    'vue.js': 'vue',
    vuejs: 'vue',
    'angular 2+': 'angular',
    'c sharp': 'c#',
    csharp: 'c#',
    postgres: 'postgresql',
    'amazon web services': 'aws',
  };
  return aliases[value] ?? value;
}

export function matchJobSkills(
  required: string[],
  userSkills: string[],
): { score: number; matched: string[] } {
  const user = new Set(parseSkills(userSkills).map(normalize));
  const unique = [
    ...new Map(parseSkills(required).map((skill) => [normalize(skill), skill])).entries(),
  ];
  const matched = unique.filter(([key]) => user.has(key)).map(([, label]) => label);
  return { score: unique.length ? Math.floor((matched.length / unique.length) * 100) : 0, matched };
}
