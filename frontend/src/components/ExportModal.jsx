import React, { useState } from 'react'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'

export default function ExportModal({
  isOpen,
  onClose,
  pages = [],
  title = 'Whiteboard'
}) {
  const [activeTab, setActiveTab] = useState('pdf') // pdf, html
  const [selectedPageIds, setSelectedPageIds] = useState(
    pages.map((p) => p.page_id)
  )

  // PDF settings
  const [pdfOrientation, setPdfOrientation] = useState('landscape') // portrait, landscape
  const [pdfSize, setPdfSize] = useState('16:9') // a4, 16:9
  const [pdfResolution, setPdfResolution] = useState(2) // 1 = 72, 2 = 150, 4 = 300 DPI

  // HTML settings
  const [htmlFormat, setHtmlFormat] = useState('single') // single, zip
  const [htmlStyles, setHtmlStyles] = useState('inline') // inline, block
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  const handleTogglePage = (pageId) => {
    setSelectedPageIds((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    )
  }

  const handleToggleAll = () => {
    if (selectedPageIds.length === pages.length) {
      setSelectedPageIds([])
    } else {
      setSelectedPageIds(pages.map((p) => p.page_id))
    }
  }

  // PDF Export Process
  const handleExportPDF = async () => {
    if (selectedPageIds.length === 0) {
      alert('Please select at least one page to export!')
      return
    }

    setIsExporting(true)

    try {
      const selectedPages = pages
        .filter((p) => selectedPageIds.includes(p.page_id))
        .sort((a, b) => a.order - b.order)

      // Initialize jsPDF
      const orientation = pdfOrientation === 'portrait' ? 'p' : 'l'
      
      // Determine page dimensions in points (72 points = 1 inch)
      let width = 842 // landscape A4 defaults
      let height = 595
      
      if (pdfOrientation === 'portrait') {
        width = 595
        height = 842
      }

      if (pdfSize === '16:9') {
        // 16:9 slides (standard presentation landscape layout: 1024x576 pt)
        width = pdfOrientation === 'portrait' ? 576 : 1024
        height = pdfOrientation === 'portrait' ? 1024 : 576
      }

      const doc = new jsPDF({
        orientation,
        unit: 'pt',
        format: [width, height]
      })

      // We use a temporary Fabric canvas to render background JSONs
      const tempCanvasEl = document.createElement('canvas')
      tempCanvasEl.style.display = 'none'
      document.body.appendChild(tempCanvasEl)
      
      // Ensure global fabric instance exists
      const F = window.fabric
      const tempCanvas = new F.Canvas(tempCanvasEl)

      for (let i = 0; i < selectedPages.length; i++) {
        const page = selectedPages[i]
        
        await new Promise((resolve) => {
          // Force layout sizing on temp canvas matching target page
          tempCanvas.setWidth(width)
          tempCanvas.setHeight(height)
          
          tempCanvas.loadFromJSON(page.canvas_state, () => {
            // Strip any leftover page-boundary visuals from loading
            tempCanvas.getObjects().forEach((obj) => {
              if (obj.id === 'page-boundary') {
                tempCanvas.remove(obj)
              } else {
                obj.setCoords()
              }
            })
            tempCanvas.requestRenderAll()

            // Get high resolution snapshot
            const imgData = tempCanvas.toDataURL({
              format: 'png',
              quality: 1.0,
              multiplier: pdfResolution
            })

            if (i > 0) doc.addPage([width, height], orientation)
            doc.addImage(imgData, 'PNG', 0, 0, width, height)
            resolve()
          })
        })
      }

      // Dispose offscreen canvas resources
      tempCanvas.dispose()
      tempCanvasEl.remove()

      doc.save(`${title.replace(/\s+/g, '_')}_export.pdf`)
    } catch (err) {
      console.error(err)
      alert('PDF generation failed: ' + err.message)
    } finally {
      setIsExporting(false)
    }
  }

  // HTML / CSS Custom Serializer
  const serializePageToHTML = (page, styleMode) => {
    const objects = page.canvas_state?.objects || []
    let elementsHtml = ''
    let stylesHtml = ''
    
    // Grid sizes mapping
    const w = 1024
    const h = 576

    objects.forEach((obj, index) => {
      if (obj.id === 'page-boundary') return

      const left = Math.round(obj.left || 0)
      const top = Math.round(obj.top || 0)
      const width = Math.round((obj.width || 0) * (obj.scaleX || 1))
      const height = Math.round((obj.height || 0) * (obj.scaleY || 1))
      const fill = obj.fill || 'transparent'
      const stroke = obj.stroke || '#000000'
      const strokeWidth = obj.strokeWidth || 0
      const opacity = obj.opacity !== undefined ? obj.opacity : 1
      const rx = obj.rx || 0
      
      const className = `shape-${page.page_id}-${index}`
      const baseStyles = `position: absolute; left: ${left}px; top: ${top}px; opacity: ${opacity};`

      let styleStr = ''
      let elementStr = ''

      if (obj.type === 'rect') {
        const shapeStyles = `width: ${width}px; height: ${height}px; background-color: ${fill}; border: ${strokeWidth}px solid ${stroke}; border-radius: ${rx}px;`
        if (styleMode === 'inline') {
          elementStr = `  <div style="${baseStyles} ${shapeStyles}"></div>\n`
        } else {
          stylesHtml += `.${className} { ${baseStyles} ${shapeStyles} }\n`
          elementStr = `  <div class="${className}"></div>\n`
        }
      } else if (obj.type === 'circle') {
        const radius = Math.round((obj.radius || 50) * (obj.scaleX || 1))
        const shapeStyles = `width: ${radius * 2}px; height: ${radius * 2}px; background-color: ${fill}; border: ${strokeWidth}px solid ${stroke}; border-radius: 50%;`
        if (styleMode === 'inline') {
          elementStr = `  <div style="${baseStyles} ${shapeStyles}"></div>\n`
        } else {
          stylesHtml += `.${className} { ${baseStyles} ${shapeStyles} }\n`
          elementStr = `  <div class="${className}"></div>\n`
        }
      } else if (obj.type === 'polygon' || obj.type === 'path') {
        const shapeStyles = `width: ${width}px; height: ${height}px; overflow: visible;`
        const pathSvg = obj.path ? obj.path.map(p => p.join(' ')).join(' ') : ''
        
        let svgContent = ''
        if (obj.type === 'polygon' && obj.points) {
          const pointsStr = obj.points.map(p => `${p.x},${p.y}`).join(' ')
          svgContent = `<polygon points="${pointsStr}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
        } else {
          svgContent = `<path d="${pathSvg}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
        }

        if (styleMode === 'inline') {
          elementStr = `  <svg style="${baseStyles} ${shapeStyles}" viewBox="0 0 ${obj.width} ${obj.height}">\n    ${svgContent}\n  </svg>\n`
        } else {
          stylesHtml += `.${className} { ${baseStyles} ${shapeStyles} }\n`
          elementStr = `  <svg class="${className}" viewBox="0 0 ${obj.width} ${obj.height}">\n    ${svgContent}\n  </svg>\n`
        }
      } else if (obj.type === 'i-text' || obj.type === 'text') {
        const fontSize = Math.round(obj.fontSize || 16)
        const fontFamily = obj.fontFamily || 'Inter, sans-serif'
        const fontStyle = obj.fontStyle || 'normal'
        const fontWeight = obj.fontWeight || 'normal'
        const textColor = obj.fill || '#111827'
        
        const textStyles = `font-family: ${fontFamily}; font-size: ${fontSize}px; font-style: ${fontStyle}; font-weight: ${fontWeight}; color: ${textColor}; margin: 0; line-height: 1.2;`
        if (styleMode === 'inline') {
          elementStr = `  <p style="${baseStyles} ${textStyles}">${obj.text}</p>\n`
        } else {
          stylesHtml += `.${className} { ${baseStyles} ${textStyles} }\n`
          elementStr = `  <p class="${className}">${obj.text}</p>\n`
        }
      }

      elementsHtml += elementStr
    })

    return { elementsHtml, stylesHtml }
  }

  // HTML / CSS Export Process
  const handleExportHTML = async () => {
    if (selectedPageIds.length === 0) {
      alert('Please select at least one page to export!')
      return
    }

    setIsExporting(true)

    try {
      const selectedPages = pages
        .filter((p) => selectedPageIds.includes(p.page_id))
        .sort((a, b) => a.order - b.order)

      if (htmlFormat === 'single') {
        // Single File: all pages as sections
        let sectionsContent = ''
        let stylesheetContent = ''

        selectedPages.forEach((page) => {
          const { elementsHtml, stylesHtml } = serializePageToHTML(page, htmlStyles)
          
          sectionsContent += `<section id="${page.page_id}" class="page-section">\n`
          sectionsContent += `  <h2 class="page-header">${page.title}</h2>\n`
          sectionsContent += `  <div class="canvas-box">\n`
          sectionsContent += elementsHtml
          sectionsContent += `  </div>\n`
          sectionsContent += `</section>\n\n`

          if (htmlStyles === 'block') {
            stylesheetContent += stylesHtml
          }
        })

        const singlePageHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} Export</title>
  <style>
    body {
      background-color: #F3F4F6;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 30px;
    }
    .page-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      border: 1px solid #E5E7EB;
      width: 1024px;
    }
    .page-header {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin-top: 0;
      margin-bottom: 16px;
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 8px;
    }
    .canvas-box {
      position: relative;
      width: 1024px;
      height: 576px;
      background-color: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow: hidden;
    }
    ${stylesheetContent}
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${sectionsContent}
</body>
</html>`

        const blob = new Blob([singlePageHtml], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.replace(/\s+/g, '_')}_export.html`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Separate Files: ZIP archive
        const zip = new JSZip()

        selectedPages.forEach((page) => {
          const { elementsHtml, stylesHtml } = serializePageToHTML(page, htmlStyles)
          
          const pageHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${page.title}</title>
  <style>
    body {
      background-color: #F3F4F6;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
    }
    .canvas-box {
      position: relative;
      width: 1024px;
      height: 576px;
      background-color: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    ${htmlStyles === 'block' ? stylesHtml : ''}
  </style>
</head>
<body>
  <div class="canvas-box">
    ${elementsHtml}
  </div>
</body>
</html>`

          zip.file(`${page.title.replace(/\s+/g, '_')}.html`, pageHtml)
        })

        const content = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(content)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.replace(/\s+/g, '_')}_pages_export.zip`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error(err)
      alert('HTML Export failed: ' + err.message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Export Diagram</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-split">
          {/* Left Side: Page Selection */}
          <div className="modal-left-pane">
            <div className="pane-section-header">
              <span className="section-title">Select Pages</span>
              <button className="btn btn-secondary btn-small" onClick={handleToggleAll} style={{ padding: '2px 8px', fontSize: '11px' }}>
                {selectedPageIds.length === pages.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="page-selection-list">
              {pages.map((p) => {
                const isSelected = selectedPageIds.includes(p.page_id)
                return (
                  <div 
                    key={p.page_id} 
                    className={`page-selection-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleTogglePage(p.page_id)}
                  >
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => {}} // handled by card click
                      className="checkbox-input"
                    />
                    <div className="page-card-details">
                      <span className="page-card-title">{p.title}</span>
                      <span className="page-card-sub">{p.canvas_state?.objects?.length || 0} elements</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Side: Options and Trigger */}
          <div className="modal-right-pane">
            {/* Tabs */}
            <div className="modal-tabs">
              <button 
                className={`modal-tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
                onClick={() => setActiveTab('pdf')}
              >
                PDF Document
              </button>
              <button 
                className={`modal-tab-btn ${activeTab === 'html' ? 'active' : ''}`}
                onClick={() => setActiveTab('html')}
              >
                HTML / CSS Code
              </button>
            </div>

            <div className="modal-tab-content">
              {activeTab === 'pdf' ? (
                /* PDF Options */
                <div className="options-form">
                  <div className="form-group">
                    <label className="form-label">Page Preset</label>
                    <select value={pdfSize} onChange={(e) => setPdfSize(e.target.value)} className="form-select">
                      <option value="16:9">Presentation Slide (16:9)</option>
                      <option value="a4">Standard Page (A4)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Orientation</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input 
                          type="radio" 
                          checked={pdfOrientation === 'landscape'} 
                          onChange={() => setPdfOrientation('landscape')} 
                        />
                        Landscape
                      </label>
                      <label className="radio-label">
                        <input 
                          type="radio" 
                          checked={pdfOrientation === 'portrait'} 
                          onChange={() => setPdfOrientation('portrait')} 
                        />
                        Portrait
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Resolution Quality</label>
                    <select 
                      value={pdfResolution} 
                      onChange={(e) => setPdfResolution(parseInt(e.target.value, 10))} 
                      className="form-select"
                    >
                      <option value={1}>Standard Web Resolution (72 DPI)</option>
                      <option value={2}>Print / High Definition (150 DPI)</option>
                      <option value={4}>Ultra Presentation Vector Quality (300 DPI)</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleExportPDF} 
                    disabled={isExporting} 
                    className="btn btn-primary btn-full export-trigger-btn"
                  >
                    {isExporting ? 'Compiling PDF...' : 'Download PDF Document'}
                  </button>
                </div>
              ) : (
                /* HTML Options */
                <div className="options-form">
                  <div className="form-group">
                    <label className="form-label">Export Format</label>
                    <select value={htmlFormat} onChange={(e) => setHtmlFormat(e.target.value)} className="form-select">
                      <option value="single">Single Web Page (Sequential Sections)</option>
                      <option value="zip">Separate HTML Sheets (ZIP Bundle)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">CSS Stylesheet Mode</label>
                    <select value={htmlStyles} onChange={(e) => setHtmlStyles(e.target.value)} className="form-select">
                      <option value="inline">Inline CSS Attributes</option>
                      <option value="block">Unified Head Stylesheet Block</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleExportHTML} 
                    disabled={isExporting} 
                    className="btn btn-primary btn-full export-trigger-btn"
                  >
                    {isExporting ? 'Serializing Canvas...' : 'Generate HTML/CSS Files'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
