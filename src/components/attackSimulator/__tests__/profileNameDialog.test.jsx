import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LangProvider } from '../../attackSim/lang'
import ProfileNameDialog from '../ProfileNameDialog'

describe('ProfileNameDialog', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['en', 'Profile name', 'Cancel'],
    ['zh', '面板名称', '取消'],
  ])('renders a labeled name form and explicit actions in %s', (lang, label, cancel) => {
    vi.stubGlobal('localStorage', { getItem: () => lang })
    const submit = vi.fn()
    const close = vi.fn()
    const html = renderToStaticMarkup(
      <LangProvider>
        <ProfileNameDialog
          title="Save a profile"
          initialName="Existing Profile"
          existingNames={['Existing Profile']}
          submitLabel="Save"
          onSubmit={submit}
          onClose={close}
        />
      </LangProvider>
    )

    const formId = html.match(/<form id="([^"]+)"/)?.[1]
    const inputId = html.match(/<input\b[^>]*\sid="([^"]+)"/)?.[1]
    expect(formId).toBeTruthy()
    expect(inputId).toBeTruthy()
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-label="Save a profile"')
    expect(html).toContain(`<label for="${inputId}">${label}</label>`)
    expect(html).toContain('value="Existing Profile"')
    expect(html).toContain(`type="submit" form="${formId}"`)
    expect(html).toContain(`>${cancel}</button>`)
    expect(html).not.toContain('role="alert"')
    expect(submit).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })
})
