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
              format: 'jpeg',
              quality: 0.85,
              multiplier: pdfResolution
            })

            if (i > 0) doc.addPage([width, height], orientation)
            doc.addImage(imgData, 'JPEG', 0, 0, width, height)
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

  const handleOptimizedExport = async () => {
    if (selectedPageIds.length === 0) {
      alert('Please select at least one page to export!')
      return
    }

    if (!window.showDirectoryPicker) {
      alert('Your browser does not support the File System Access API. Please use a modern desktop browser like Chrome or Edge over HTTPS.')
      return
    }

    setIsExporting(true)

    try {
      const selectedPages = pages
        .filter((p) => selectedPageIds.includes(p.page_id))
        .sort((a, b) => a.order - b.order)

      // 1. Ask for root directory
      const rootDirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      })

      // 2. Create subfolder with timestamp and board name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const folderName = `${timestamp}-${title.replace(/\s+/g, '_')}`
      const subDirHandle = await rootDirHandle.getDirectoryHandle(folderName, { create: true })

      // Determine page dimensions
      const orientation = pdfOrientation === 'portrait' ? 'p' : 'l'
      let width = 842, height = 595
      if (pdfOrientation === 'portrait') { width = 595; height = 842 }
      if (pdfSize === '16:9') {
        width = pdfOrientation === 'portrait' ? 576 : 1024
        height = pdfOrientation === 'portrait' ? 1024 : 576
      }

      // We use a temporary Fabric canvas to render background JSONs
      const tempCanvasEl = document.createElement('canvas')
      tempCanvasEl.style.display = 'none'
      document.body.appendChild(tempCanvasEl)
      
      const F = window.fabric
      const tempCanvas = new F.Canvas(tempCanvasEl)

      const imgDataList = []

      for (let i = 0; i < selectedPages.length; i++) {
        const page = selectedPages[i]
        
        const blob = await new Promise((resolve) => {
          // Scale canvas for higher resolution if needed
          const exportWidth = width * pdfResolution
          const exportHeight = height * pdfResolution
          
          tempCanvas.setWidth(exportWidth)
          tempCanvas.setHeight(exportHeight)
          tempCanvas.setZoom(pdfResolution)
          
          tempCanvas.loadFromJSON(page.canvas_state, () => {
            tempCanvas.getObjects().forEach((obj) => {
              if (obj.id === 'page-boundary') {
                tempCanvas.remove(obj)
              } else {
                obj.setCoords()
              }
            })
            tempCanvas.requestRenderAll()

            tempCanvasEl.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
          })
        })

        // Save JPEG to folder
        const fileName = `${i}.jpg`
        const fileHandle = await subDirHandle.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()

        // Keep image data for PDF generation
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })
        imgDataList.push(dataUrl)
      }

      // Dispose offscreen canvas resources
      tempCanvas.dispose()
      tempCanvasEl.remove()

      // 3. Ask again to create PDF
      const shouldCreatePdf = window.confirm(`Successfully saved ${selectedPages.length} images to "${folderName}".\n\nWould you like to generate a compiled PDF document from these images as well?`)
      
      if (shouldCreatePdf) {
        const doc = new jsPDF({
          orientation,
          unit: 'pt',
          format: [width, height]
        })

        for (let i = 0; i < imgDataList.length; i++) {
          if (i > 0) doc.addPage([width, height], orientation)
          doc.addImage(imgDataList[i], 'JPEG', 0, 0, width, height)
        }

        doc.save(`${title.replace(/\s+/g, '_')}_export.pdf`)
      }

      alert('Export process completed!')
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled picker
      } else {
        console.error(err)
        alert('Optimized export failed: ' + err.message)
      }
    } finally {
      setIsExporting(false)
    }
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

      // We use a temporary Fabric canvas to render background JSONs and export to SVG
      const tempCanvasEl = document.createElement('canvas')
      tempCanvasEl.style.display = 'none'
      document.body.appendChild(tempCanvasEl)
      
      const F = window.fabric
      const tempCanvas = new F.Canvas(tempCanvasEl)

      let sectionsContent = ''

      for (let i = 0; i < selectedPages.length; i++) {
        const page = selectedPages[i]
        
        const pageHtml = await new Promise((resolve) => {
          tempCanvas.loadFromJSON(page.canvas_state, () => {
            // 1. Strip page boundaries
            tempCanvas.getObjects().forEach((obj) => {
              if (obj.id === 'page-boundary') {
                tempCanvas.remove(obj)
              } else {
                obj.setCoords()
              }
            })

            // 2. Calculate drawing bounds
            const objects = tempCanvas.getObjects()
            if (objects.length === 0) {
              resolve(`<section class="page-section"><h2>${page.title}</h2><div class="canvas-box empty">Page is empty</div></section>`)
              return
            }

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            objects.forEach(obj => {
              const rect = obj.getBoundingRect(true)
              minX = Math.min(minX, rect.left)
              minY = Math.min(minY, rect.top)
              maxX = Math.max(maxX, rect.left + rect.width)
              maxY = Math.max(maxY, rect.top + rect.height)
            })

            const padding = 40
            const width = (maxX - minX) + (padding * 2)
            const height = (maxY - minY) + (padding * 2)

            // 3. Export to SVG using Fabric's built-in robust method
            // We use viewBox to "crop" and center the drawing
            const svgData = tempCanvas.toSVG({
              viewBox: {
                x: minX - padding,
                y: minY - padding,
                width: width,
                height: height
              },
              width: width,
              height: height
            })

            resolve(`
              <section class="page-section" style="width: ${Math.max(800, width + 48)}px;">
                <h2 class="page-header">${page.title}</h2>
                <div class="canvas-box">
                  ${svgData}
                </div>
              </section>
            `)
          })
        })
        
        sectionsContent += pageHtml
      }

      // Dispose offscreen canvas resources
      tempCanvas.dispose()
      tempCanvasEl.remove()

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
      box-sizing: border-box;
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
      background-color: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .canvas-box.empty {
      height: 200px;
      color: #9CA3AF;
      font-style: italic;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
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

                  <div className="export-actions-row" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button 
                      onClick={handleExportPDF} 
                      disabled={isExporting} 
                      className="btn btn-primary btn-full export-trigger-btn"
                      style={{ flex: 1 }}
                    >
                      {isExporting ? 'Compiling...' : 'Download PDF'}
                    </button>

                    <button 
                      onClick={handleOptimizedExport} 
                      disabled={isExporting} 
                      className="btn btn-secondary btn-full export-trigger-btn"
                      title="Saves each page as JPG to a local folder first, then compiles PDF"
                      style={{ flex: 1 }}
                    >
                      {isExporting ? 'Exporting...' : 'Save to Folder'}
                    </button>
                  </div>
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
