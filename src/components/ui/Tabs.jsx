import { NavLink } from 'react-router-dom'

function Tabs({ value, onChange, tabs, ariaLabel }) {
  return (
    <nav className="tabs" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        tab.to ? (
          <NavLink
            key={tab.value}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `tab-button${isActive ? ' active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ) : (
          <button
            key={tab.value}
            type="button"
            className={`tab-button${value === tab.value ? ' active' : ''}`}
            aria-pressed={value === tab.value}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </button>
        )
      ))}
    </nav>
  )
}

export default Tabs
