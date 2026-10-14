function CalculatorLayout({ form, result, className = 'wound-success-container' }) {
  return (
    <div className={className}>
      <div className="form-side">{form}</div>
      {result && <div className="result-side">{result}</div>}
    </div>
  )
}

export default CalculatorLayout
