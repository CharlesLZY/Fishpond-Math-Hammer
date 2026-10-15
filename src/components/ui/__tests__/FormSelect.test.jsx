import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import FormSelect from '../FormSelect'
import SavedSetControls from '../SavedSetControls'
import { selectStyles } from '../selectStyles'

const options = Array.from({ length: 80 }, (_, index) => ({
  value: `profile-${index + 1}`,
  label: `Profile ${index + 1}`,
}))

describe('shared dropdown menus', () => {
  it('bounds a long menu at 240px without dropping any selectable entries', () => {
    const html = renderToStaticMarkup(
      <FormSelect options={options} menuIsOpen instanceId="bounded-menu" />
    )

    expect(html).toContain('max-height:240px')
    expect(html).toContain('overflow-y:auto')
    expect(html).toContain('overscroll-behavior-y:contain')
    expect(html).toContain('touch-action:pan-y')
    expect(html.match(/role="option"/g)).toHaveLength(80)
    expect(html).toContain('>Profile 80</div>')
  })

  it('uses automatic placement while allowing caller-specific menu configuration', () => {
    const defaults = FormSelect({ options })
    expect(defaults.props.menuPlacement).toBe('auto')
    expect(defaults.props.maxMenuHeight).toBe(240)
    expect(defaults.props.isSearchable).toBe(false)

    const custom = FormSelect({
      options,
      maxMenuHeight: 160,
      menuPlacement: 'top',
      isSearchable: true,
    })
    expect(custom.props.menuPlacement).toBe('top')
    expect(custom.props.maxMenuHeight).toBe(160)
    expect(custom.props.isSearchable).toBe(true)
  })

  it('preserves the calculated menu limit and scroll behavior in shared styles', () => {
    expect(selectStyles.menuList({ maxHeight: 180, overflowY: 'auto' })).toMatchObject({
      maxHeight: 180,
      overflowY: 'auto',
      overscrollBehaviorY: 'contain',
      touchAction: 'pan-y',
    })
  })
})

describe('saved Profile selectors', () => {
  const props = {
    value: 'Squad 80',
    options: Array.from({ length: 80 }, (_, index) => `Squad ${index + 1}`),
    placeholder: 'Select a Profile',
    emptyLabel: '还没有保存的面板。',
    onChange: vi.fn(),
    onSave: vi.fn(),
    onUpdate: vi.fn(),
    updateDisabled: false,
    selectAriaLabel: 'Load saved attacker profile',
    groupAriaLabel: 'Saved attacker profiles',
  }

  it('uses FormSelect rather than a native select and displays the selected name', () => {
    const html = renderToStaticMarkup(<SavedSetControls {...props} />)

    expect(html).not.toContain('<select')
    expect(html).toContain('profile-select__control')
    expect(html).toContain('role="combobox"')
    expect(html).toContain('aria-label="Load saved attacker profile"')
    expect(html).toContain('>Squad 80</div>')
    expect(html).toContain('profile-select__clear-indicator')
  })

  it('preserves string-name selection and clearing callbacks', () => {
    const onChange = vi.fn()
    const select = SavedSetControls({ ...props, onChange }).props.children[0]

    select.props.onChange({ value: 'Squad 79', label: 'Squad 79' })
    select.props.onChange(null)

    expect(onChange.mock.calls).toEqual([['Squad 79'], ['']])
    expect(select.props.options).toHaveLength(80)
    expect(select.props.value).toEqual({ value: 'Squad 80', label: 'Squad 80' })
  })

  it('shows the supplied localized message for an empty Profile library', () => {
    const select = SavedSetControls({ ...props, value: '', options: [] }).props.children[0]
    const html = renderToStaticMarkup(<FormSelect {...select.props} menuIsOpen />)

    expect(select.props.value).toBeNull()
    expect(html).toContain(props.emptyLabel)
    expect(html).toContain(props.placeholder)
  })
})
