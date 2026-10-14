function Page({ title, actions, children }) {
  return (
    <div className="page">
      {(title || actions) && (
        <header className="page-header">
          {title && <h1>{title}</h1>}
          {actions && <div className="page-header-actions">{actions}</div>}
        </header>
      )}
      {children}
    </div>
  )
}

export default Page
