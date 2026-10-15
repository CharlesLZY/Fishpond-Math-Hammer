import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Tabs from '../Tabs'

const views = [
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
]

const routes = [
  { value: 'simulator', label: 'Simulator', to: '/attack-simulator', end: true },
  { value: 'library', label: 'Library', to: '/attack-simulator/profiles' },
  { value: 'comparison', label: 'Comparison', to: '/attack-simulator/compare' },
]

describe('shared Tabs', () => {
  it('renders state-based views as named buttons without requiring a router', () => {
    const onChange = vi.fn()
    const html = renderToStaticMarkup(
      <Tabs value="second" onChange={onChange} tabs={views} ariaLabel="Views" />
    )

    expect(html).toContain('<nav class="tabs" aria-label="Views">')
    expect(html).toContain('<button type="button" class="tab-button" aria-pressed="false">First</button>')
    expect(html).toContain('<button type="button" class="tab-button active" aria-pressed="true">Second</button>')
    expect(html).not.toContain('<a ')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('delegates state changes to the owning page', () => {
    const onChange = vi.fn()
    const element = Tabs({ value: 'first', onChange, tabs: views, ariaLabel: 'Views' })
    const secondButton = element.props.children[1]

    secondButton.props.onClick()

    expect(onChange).toHaveBeenCalledExactlyOnceWith('second')
    expect(secondButton.props['aria-pressed']).toBe(false)
  })

  it.each([
    ['/attack-simulator', 'Simulator'],
    ['/attack-simulator/profiles', 'Library'],
    ['/attack-simulator/compare', 'Comparison'],
    ['/attack-simulator/compare?sample=1', 'Comparison'],
  ])('preserves real navigation and highlights only the active route at %s', (path, activeLabel) => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={[path]}>
        <Tabs tabs={routes} ariaLabel="40K sections" />
      </MemoryRouter>
    )

    expect(html).toContain('<nav class="tabs" aria-label="40K sections">')
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html.match(/class="tab-button active"/g)).toHaveLength(1)
    expect(html).toMatch(new RegExp(`<a[^>]*class="tab-button active"[^>]*>${activeLabel}</a>`))
    for (const route of routes) {
      expect(html).toContain(`href="${route.to}"`)
    }
    expect(html).not.toContain('<button')
  })

  it('uses the same item classes for links and buttons', () => {
    const stateTabs = renderToStaticMarkup(
      <Tabs value="first" onChange={vi.fn()} tabs={views} ariaLabel="Views" />
    )
    const routeTabs = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/attack-simulator']}>
        <Tabs tabs={routes} ariaLabel="Routes" />
      </MemoryRouter>
    )

    for (const html of [stateTabs, routeTabs]) {
      expect(html).toContain('class="tabs"')
      expect(html).toContain('class="tab-button active"')
      expect(html).toContain('class="tab-button"')
    }
  })
})
