import { NavLink, Outlet } from 'react-router-dom'
import { Page } from '../ui'
import { LangProvider, useT } from '../attackSim/lang'
import '../../styles/attackSimulator.css'
import '../../styles/attackSimulatorProfiles.css'
import '../../styles/attackSimulatorPages.css'

function AttackSimulatorLayoutContent() {
  const { t, lang, setLang } = useT()

  return (
    <Page
      className="attack-simulator-page"
      title={
        <span className="attack-sim-title">
          {t('pageTitle')}
          <span
            className="attack-sim-edition-badge"
            title={t('editionTooltip')}
            aria-label={t('editionTooltip')}
          >
            11E
          </span>
        </span>
      }
      actions={
        <div className="toolbar-group lang-toggle-group" role="group" aria-label="Language">
          <button
            type="button"
            className={`lang-toggle-btn ${lang === 'en' ? 'active' : ''}`}
            aria-pressed={lang === 'en'}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={`lang-toggle-btn ${lang === 'zh' ? 'active' : ''}`}
            aria-pressed={lang === 'zh'}
            onClick={() => setLang('zh')}
          >
            中文
          </button>
        </div>
      }
    >
      <nav className="attack-sim-subnav" aria-label={t('attackSimulatorSections')}>
        <NavLink to="/attack-simulator" end>
          {t('navSimulator')}
        </NavLink>
        <NavLink to="/attack-simulator/profiles">
          {t('navProfileLibrary')}
        </NavLink>
        <NavLink to="/attack-simulator/compare">
          {t('navComparison')}
        </NavLink>
      </nav>
      <Outlet />
    </Page>
  )
}

export default function AttackSimulatorLayout() {
  return (
    <LangProvider>
      <AttackSimulatorLayoutContent />
    </LangProvider>
  )
}
