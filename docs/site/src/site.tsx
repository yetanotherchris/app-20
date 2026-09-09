import { useMemo, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { ChatDemo } from '@app-20/chat-demo'
import { navigation, recipes, referenceEntries, requiredClaims, version } from './content'

const code = (text: string) => (
  <pre className="code">
    <code>{text}</code>
  </pre>
)

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="doc-section">
      <p className="eyebrow">{id.replace('-', ' ')}</p>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export function DocumentationSite(): ReactElement {
  const [query, setQuery] = useState('')
  const [versionOpen, setVersionOpen] = useState(false)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredReference = useMemo(
    () =>
      referenceEntries.filter((entry) => entry.join(' ').toLowerCase().includes(normalizedQuery)),
    [normalizedQuery],
  )

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top">
          app-20 chat
        </a>
        <div className="header-actions">
          <label className="search-label" htmlFor="docs-search">
            Search
          </label>
          <input
            id="docs-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the reference"
          />
          <button
            className="version-button"
            type="button"
            onClick={() => setVersionOpen((open) => !open)}
            aria-expanded={versionOpen}
          >
            v{version}
          </button>
          {versionOpen && (
            <div className="version-menu">
              <a href="#release-notes">v{version} current</a>
            </div>
          )}
        </div>
      </header>
      <div className="site-layout" id="top">
        <aside className="sidebar" aria-label="Documentation navigation">
          <p className="sidebar-title">Documentation</p>
          <nav>
            {navigation.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
          <p className="version-note">
            Component version
            <br />
            <strong>{version}</strong>
          </p>
        </aside>
        <main className="content">
          <section className="hero">
            <p className="eyebrow">@app-20/chat · v{version}</p>
            <h1>Build a controlled chat without guessing.</h1>
            <p className="lead">
              The shared React and React Native chat component for messages, Markdown, streaming
              operations, history, themes, and host-owned transport.
            </p>
            <div className="hero-links">
              <a className="button" href="#quick-start">
                Start in five minutes
              </a>
              <a href="#reference">Browse reference</a>
            </div>
          </section>

          <Section id="quick-start" title="Quick start">
            <p>
              Install React, React Native, React Native Web, and the released package. Import from
              the package root. The host owns messages, draft text, status, transport, navigation,
              and clipboard access.
            </p>
            {code(
              "import { Chat } from '@app-20/chat'\n\n<Chat\n  messages={messages}\n  draft={draft}\n  status={status}\n  hasEarlierMessages={false}\n  isLoadingEarlier={false}\n  onChangeDraft={setDraft}\n  onSubmit={submit}\n  onStop={stop}\n  onLoadEarlier={loadEarlier}\n/>",
            )}
            <p className="callout">
              <strong>Version note.</strong> This repository documents the package release as{' '}
              <code>0.3.0</code>. The current workspace consumer metadata still requests{' '}
              <code>0.1.0</code>; reconcile that metadata before publishing an installation command
              from a registry.
            </p>
          </Section>

          <Section id="examples" title="Live examples">
            <p>
              This is the released component demo, not a screenshot. Use its deterministic controls
              to load long conversations and Markdown, start a stream, append chunks, stop with
              partial content retained, fail and retry, regenerate, load earlier messages, return to
              latest, switch themes, and replace renderers and controls.
            </p>
            <div className="live-example" data-testid="docs.live-example">
              <ChatDemo />
            </div>
            <p className="caption">
              The example has no network backend. Its transport is deterministic so each state can
              be inspected and tested locally.
            </p>
          </Section>

          <Section id="concepts" title="Concepts: controlled state and operations">
            <p>
              <strong>Chat is controlled.</strong> The host owns the message list, draft, chat
              status, active operation, earlier-message loading, and callbacks. Callback completion
              does not change state automatically. Update the values passed back to Chat.
            </p>
            <p>
              <strong>Two integration modes.</strong> Manage these values yourself, or use{' '}
              <code>useChatSession</code> as an operation-aware controller. The hook accepts a host
              transport, scopes chunks to an operation id, ignores stale updates, and exposes values
              and callbacks to Chat.
            </p>
            {code(
              'const session = useChatSession({\n  request: async (operation, controls) => {\n    for await (const chunk of stream(operation.prompt)) {\n      if (controls.stopRequested()) return\n      controls.appendChunk(chunk)\n    }\n    controls.complete()\n  },\n})',
            )}
            <p>
              Follow-at-bottom applies only while the reader is near the latest message. Moving
              upward preserves the reading position, increments unread content, and exposes
              return-to-latest. Loading earlier messages preserves the visible anchor. Stop retains
              partial content and is a deliberate stopped state, not a conversation-level error. A
              failed message is marked <code>error</code>, retains partial content, and returns the
              chat to <code>idle</code>; it is not a conversation-level error surface.
            </p>
          </Section>

          <Section id="recipes" title="Recipes">
            <div className="recipe-grid">
              {recipes.map(([id, title, description]) => (
                <article className="recipe" key={id} id={id}>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <a href="#reference">See the related reference entries</a>
                </article>
              ))}
            </div>
            <h3>Custom renderer with safe fallback</h3>
            {code(
              "const contentRenderer = ({ part, fallback }) =>\n  part.type === 'text' && part.format === 'markdown'\n    ? <MyMarkdown text={part.text} />\n    : fallback()",
            )}
            <h3>Earlier messages without a jump</h3>
            {code(
              'const loadEarlier = async () => {\n  const before = measureVisibleAnchor()\n  setMessages(previous => [...await fetchEarlier(), ...previous])\n  requestAnimationFrame(() => restoreAnchor(before))\n}',
            )}
          </Section>

          <Section id="reference" title="Reference">
            <p>
              Search this table by identifier, behavior, category, or host contract. Every entry
              targets v{version}. Consumer imports come from <code>@app-20/chat</code>, not internal
              paths.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Identifier</th>
                    <th>What it does</th>
                    <th>Required</th>
                    <th>Default</th>
                    <th>Host contract</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReference.map((entry) => (
                    <tr key={`${entry[0]}-${entry[1]}`}>
                      <td>
                        <code>{entry[1]}</code>
                        <span className="category">{entry[0]}</span>
                      </td>
                      <td>{entry[2]}</td>
                      <td>{entry[3]}</td>
                      <td>{entry[4]}</td>
                      <td>{entry[5]}</td>
                      <td>
                        <code>{entry[6]}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredReference.length === 0 && (
              <p className="callout">No reference entries match “{query}”.</p>
            )}
          </Section>

          <Section id="accessibility" title="Accessibility and limitations">
            <p>
              The default web controls and states target WCAG 2.2 AA. Verify keyboard order, visible
              control focus, text alternatives, status presentation without color alone, 200%
              browser zoom, enlarged text, high contrast, and reduced motion.
            </p>
            <ul>
              <li>
                Screen-reader announcements are out of scope for beta. Hosts need an announcement
                strategy when their product requires live-region narration.
              </li>
              <li>
                The composer text input has a temporary focus indicator exception from spec 007.
                Send and Stop retain visible focus indicators. This is a deliberate limitation, not
                a conformance claim.
              </li>
              <li>
                Host-supplied renderers, controls, labels, icons, and actions are the host's
                responsibility for accessible names, focus, contrast, and touch targets.
              </li>
              <li>
                Raw HTML is not rendered, remote images are not loaded by default, and the component
                does not execute code. Link navigation and clipboard access are host responsibility.
              </li>
            </ul>
            <p className="callout">
              <strong>Supported content.</strong> The current model supports text content in plain
              or Markdown format. Images, attachments, tool calls, and arbitrary executable content
              are not supported.
            </p>
          </Section>

          <Section id="platforms" title="Platform notes">
            <div className="platform-grid">
              <article>
                <h3>Desktop and web</h3>
                <p>
                  Enter submits when the host enables the default keyboard behavior; Shift+Enter
                  creates a newline. Verify tab order, browser zoom at 200%, visible focus, text
                  selection, horizontal scrolling for code and tables, and reduced motion in the
                  target browser.
                </p>
              </article>
              <article>
                <h3>Touch and mobile</h3>
                <p>
                  Software and hardware keyboards, IME composition, keyboard dismissal, safe areas,
                  dynamic type, touch targets, selection, and scroll indicators are host and
                  platform concerns. Verify the composer remains usable when the keyboard changes
                  the viewport.
                </p>
              </article>
            </div>
          </Section>

          <Section id="release-notes" title="Versions, changelog, and migration">
            <p>
              <strong>v{version}.</strong> Documents the controlled Chat surface, operation-aware
              streaming, safe Markdown defaults, reference presentation, themes, accessibility
              scope, and customization APIs present in the package.
            </p>
            <p>
              <strong>Migration note.</strong> The package declares v{version}; workspace consumers
              currently request v0.1.0. Align consumer metadata before releasing documentation
              installation commands. Behavior-affecting changes must update the package changelog,
              this version marker, examples, and reference verification together.
            </p>
            <p>
              Before each release run <code>npm run docs:verify</code>, build the package and site,
              exercise every live example, and run the repository test gates.
            </p>
          </Section>
        </main>
      </div>
      <footer className="site-footer">
        app-20 chat documentation · v{version} · generated from the released component surface
      </footer>
    </div>
  )
}

export const documentedClaimCount = requiredClaims.length
