import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const chatSrc = readFileSync(resolve(root, 'packages/chat/src/index.ts'), 'utf8')
const contentSrc = readFileSync(resolve(root, 'docs/site/src/content.ts'), 'utf8')
const siteSrc = readFileSync(resolve(root, 'docs/site/src/site.tsx'), 'utf8')
const versionJson = JSON.parse(readFileSync(resolve(root, 'docs/site/public/version.json'), 'utf8'))

let pass = 0
let fail = 0

function check(condition, label) {
  if (condition) {
    pass++
    return
  }
  fail++
  console.error(`FAIL: ${label}`)
}

const exportLines = chatSrc.split('\n').filter((l) => l.startsWith('export '))
const namedExports = []
for (const line of exportLines) {
  const m = line.match(/\bexport\s+(?:type\s+)?(?:async\s+)?(?:function|const|class)\s+(\w+)/)
  if (m) namedExports.push(m[1])
  const typeMatch = line.match(/\bexport\s+type\s*\{([^}]+)\}/)
  if (typeMatch)
    for (const t of typeMatch[1].split(',')) {
      const trimmed = t
        .trim()
        .split(/\s+as\s+/)
        .pop()
        .trim()
      if (trimmed) namedExports.push(trimmed)
    }
}

const runtimeExports = namedExports.filter(
  (e) =>
    !e.endsWith('Props') &&
    !e.endsWith('Options') &&
    !e.endsWith('State') &&
    ![
      'CopyState',
      'ScrollMetrics',
      'AtBottomState',
      'UnreadCountState',
      'FocusRingState',
      'StatusPresentation',
      'ThemeContextValue',
      'ResolvedThemeBase',
      'IconProps',
      'MessageRole',
      'VisibleRange',
    ].includes(e),
)

const contentIdentifiers = []
for (const m of contentSrc.matchAll(/\[\s*'[^']*'\s*,\s*'([^']+)'/g)) contentIdentifiers.push(m[1])

const requiredSections = [
  'quick-start',
  'examples',
  'concepts',
  'recipes',
  'reference',
  'accessibility',
  'platforms',
  'release-notes',
]

for (const section of requiredSections)
  check(siteSrc.includes(`id="${section}"`), `Section #${section} missing from site`)

for (const claim of [
  'WCAG 2.2 AA',
  'composer focus indicator exception',
  'raw HTML is not rendered',
  'does not execute code',
  'host responsibility',
  '0.3.0',
]) {
  check(siteSrc.includes(claim) || contentSrc.includes(claim), `Required claim "${claim}" missing`)
}

for (const id of runtimeExports) {
  check(
    contentIdentifiers.includes(id) || siteSrc.includes(id),
    `Export "${id}" missing from reference or site`,
  )
}

check(versionJson.current === '0.3.0', 'version.json current is not 0.3.0')
check(versionJson.versions.includes('0.3.0'), 'version.json missing 0.3.0')
check(siteSrc.includes('v0.3.0') || contentSrc.includes('0.3.0'), 'Site does not reference 0.3.0')
check(
  siteSrc.includes('ChatDemo') || siteSrc.includes('chat-demo'),
  'Live example not using real ChatDemo',
)

const requiredChatProps = [
  'messages',
  'draft',
  'status',
  'hasEarlierMessages',
  'isLoadingEarlier',
  'onChangeDraft',
  'onSubmit',
  'onStop',
  'onLoadEarlier',
]
for (const prop of requiredChatProps) {
  check(
    siteSrc.includes(prop) || contentSrc.includes(prop),
    `Required Chat prop "${prop}" missing from documentation`,
  )
}

check(siteSrc.includes('useChatSession'), 'Concepts or reference missing useChatSession')
check(siteSrc.includes('stopped'), 'Stopped state not documented')
check(siteSrc.includes('high contrast'), 'High contrast not documented')
check(siteSrc.includes('200%'), '200% zoom not documented')
check(
  siteSrc.includes('Touch') || siteSrc.includes('mobile'),
  'Touch/mobile platform notes missing',
)

const hasLiveExampleSection =
  siteSrc.includes('data-testid="docs.live-example"') || siteSrc.includes('ChatDemo')
check(hasLiveExampleSection, 'Live example section missing')

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
