// React-Select custom styles configuration shared across the app.
// Centralizes the dark theme + amber-accent look used by every form select.
//
const CONTROL_HEIGHT = 'var(--form-control-height, 34px)'
const MAX_MENU_ROWS = 8
const COMPACT_OPTION_PADDING = 4

const menuListStyles = (baseStyles, state, compact = false) => {
  const optionPadding = compact ? COMPACT_OPTION_PADDING : state.theme.spacing.baseUnit * 2
  const menuPadding = (baseStyles.paddingTop ?? 0) + (baseStyles.paddingBottom ?? 0)
  // One row uses the option's line height and padding, or its larger touch-target minimum.
  const rowHeight = `max(var(--select-option-height, 0px), calc(1lh + ${optionPadding * 2}px))`
  return {
    ...baseStyles,
    maxHeight: `min(${Math.max(0, baseStyles.maxHeight - menuPadding)}px, calc(${MAX_MENU_ROWS} * ${rowHeight}))`,
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: compact ? 'var(--select-font-size, 13px)' : 'var(--select-font-size, inherit)',
    backgroundColor: '#2a2a2a',
    overscrollBehaviorY: 'contain',
    touchAction: 'pan-y'
  }
}

export const selectStyles = {
  control: (baseStyles, state) => ({
    ...baseStyles,
    backgroundColor: '#2a2a2a',
    borderColor: state.isFocused ? '#fbbf24' : '#4a4a4a',
    boxShadow: state.isFocused ? 'none' : 'none',
    minHeight: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    padding: '0 2px',
    cursor: 'pointer',
    '&:hover': {
      borderColor: '#fbbf24'
    }
  }),
  valueContainer: (baseStyles) => ({
    ...baseStyles,
    padding: '0 6px'
  }),
  singleValue: (baseStyles) => ({
    ...baseStyles,
    color: '#d0d0d0',
    fontSize: 'var(--select-font-size, inherit)'
  }),
  menu: (baseStyles, state) => ({
    ...baseStyles,
    paddingTop: state.theme.spacing.baseUnit,
    paddingBottom: state.theme.spacing.baseUnit,
    backgroundColor: '#2a2a2a',
    zIndex: 20
  }),
  menuList: (baseStyles, state) => menuListStyles(baseStyles, state),
  option: (baseStyles, state) => ({
    ...baseStyles,
    backgroundColor: state.isFocused ? '#3a3a3a' : '#2a2a2a',
    color: state.isSelected ? '#fbbf24' : '#d0d0d0',
    minHeight: 'var(--select-option-height, auto)',
    fontSize: 'var(--select-font-size, inherit)',
    overflowWrap: 'anywhere',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#3a3a3a'
    }
  }),
  indicatorSeparator: (baseStyles) => ({
    ...baseStyles,
    backgroundColor: '#4a4a4a'
  }),
  dropdownIndicator: (baseStyles) => ({
    ...baseStyles,
    padding: '2px 4px',
    color: '#d0d0d0',
    '& svg': {
      width: '16px',
      height: '16px'
    }
  }),
  // Only used when a consumer passes menuPortalTarget; ensures the floating
  // menu renders above modal dialogs (z-index 1000 in attackSimulatorProfiles.css).
  menuPortal: (baseStyles) => ({
    ...baseStyles,
    zIndex: 2000
  })
}

// Compact variant used for small inline buff selects (ANTI, FNP).
export const buffSelectStyles = {
  ...selectStyles,
  menuList: (baseStyles, state) => menuListStyles(baseStyles, state, true),
  container: (baseStyles) => ({
    ...baseStyles,
    width: '70px'
  }),
  control: (baseStyles, state) => ({
    ...selectStyles.control(baseStyles, state),
    minHeight: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    padding: '0 2px'
  }),
  valueContainer: (baseStyles) => ({
    ...selectStyles.valueContainer(baseStyles),
    padding: '0 4px'
  }),
  singleValue: (baseStyles) => ({
    ...selectStyles.singleValue(baseStyles),
    fontSize: 'var(--select-font-size, 13px)',
    overflow: 'visible',
    textOverflow: 'clip',
    maxWidth: '100%'
  }),
  option: (baseStyles, state) => ({
    ...selectStyles.option(baseStyles, state),
    fontSize: 'var(--select-font-size, 13px)',
    padding: `${COMPACT_OPTION_PADDING}px 8px`
  }),
  dropdownIndicator: (baseStyles) => ({
    ...selectStyles.dropdownIndicator(baseStyles),
    padding: '2px',
    '& svg': {
      width: '14px',
      height: '14px'
    }
  })
}
