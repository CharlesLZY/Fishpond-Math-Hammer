import { useSyncExternalStore } from 'react'
import Select from 'react-select'
import { selectStyles, buffSelectStyles } from './selectStyles'

const subscribeToViewport = (onChange) => {
  window.addEventListener('resize', onChange)
  window.visualViewport?.addEventListener('resize', onChange)
  return () => {
    window.removeEventListener('resize', onChange)
    window.visualViewport?.removeEventListener('resize', onChange)
  }
}

const getViewportHeight = () => window.visualViewport?.height ?? window.innerHeight
const getServerViewportHeight = () => 0

function FormSelect({
  variant = 'default',
  styles,
  isSearchable = false,
  maxMenuHeight,
  menuPlacement = 'auto',
  ...rest
}) {
  const viewportHeight = useSyncExternalStore(
    subscribeToViewport,
    getViewportHeight,
    getServerViewportHeight
  )
  const baseStyles = variant === 'buff' ? buffSelectStyles : selectStyles

  return (
    <Select
      styles={styles ?? baseStyles}
      isSearchable={isSearchable}
      maxMenuHeight={maxMenuHeight ?? viewportHeight}
      menuPlacement={menuPlacement}
      {...rest}
    />
  )
}

export default FormSelect
