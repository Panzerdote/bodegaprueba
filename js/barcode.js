// js/barcode.js

const BarcodeGenerator = {
    // Opciones por defecto para JsBarcode optimizadas para etiquetas 5x3 cm
    defaultOptions: {
        format: "CODE128",
        width: 1.2,
        height: 50,
        displayValue: true,
        fontSize: 10,
        font: "monospace",
        textMargin: 4,
        background: "#ffffff",
        lineColor: "#000000",
        margin: 5
    },

    // Generar un solo código de barras
    generateSingleBarcode(codigo, options = {}) {
        try {
            const mergedOptions = { ...this.defaultOptions, ...options };
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("class", "barcode-svg");
            
            JsBarcode(svg, codigo, mergedOptions);
            return svg;
        } catch (error) {
            console.error("Error generando código de barras:", error);
            return null;
        }
    },

    // Generar etiquetas en formato 5cm x 3cm
    generateLabelPage(insumos, options = {}) {
        const container = document.createElement('div');
        container.className = 'barcode-page';
        container.style.cssText = `
            padding: 5mm;
            background: white;
            font-family: Arial, sans-serif;
            width: 100%;
        `;

        // Configuración de etiqueta 5cm x 3cm
        const labelWidth = '50mm';  // 5 cm
        const labelHeight = '30mm'; // 3 cm
        const margin = '2mm';

        // Grid de etiquetas
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, ${labelWidth});
            gap: ${margin};
            justify-content: center;
            padding: 0;
        `;

        insumos.forEach((insumo, index) => {
            if (!insumo.codigo_barras || insumo.codigo_barras.trim() === '') return;

            const label = document.createElement('div');
            label.style.cssText = `
                width: ${labelWidth};
                height: ${labelHeight};
                padding: 2mm 1mm;
                border: 0.5px solid #ddd;
                border-radius: 2px;
                background: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                page-break-inside: avoid;
                overflow: hidden;
            `;

            // Contenedor del código
            const barcodeContainer = document.createElement('div');
            barcodeContainer.style.cssText = `
                width: 100%;
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 0;
            `;

            // Generar código de barras
            const svg = this.generateSingleBarcode(insumo.codigo_barras, {
                ...options,
                height: 28,
                width: 0.9,
                fontSize: 8,
                textMargin: 2,
                margin: 2
            });
            
            if (svg) {
                svg.style.cssText = `
                    width: 100%;
                    height: auto;
                    max-height: 22mm;
                    object-fit: contain;
                `;
                barcodeContainer.appendChild(svg);
            }

            label.appendChild(barcodeContainer);

            // Información del insumo (nombre y código)
            const info = document.createElement('div');
            info.style.cssText = `
                width: 100%;
                text-align: center;
                font-size: 6px;
                color: #333;
                line-height: 1.2;
                padding: 0 1mm;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-height: 10mm;
            `;
            
            let infoText = insumo.nombre || '';
            if (insumo.stock !== undefined && options.mostrarStock !== false) {
                infoText += ` | Stock: ${insumo.stock}`;
            }
            if (insumo.unidad) {
                infoText += ` ${insumo.unidad}`;
            }
            
            info.textContent = infoText;
            label.appendChild(info);

            grid.appendChild(label);
        });

        container.appendChild(grid);

        // Información de página
        const footer = document.createElement('div');
        footer.style.cssText = `
            margin-top: 5mm;
            text-align: center;
            font-size: 7px;
            color: #999;
            page-break-before: avoid;
        `;
        const total = insumos.filter(i => i.codigo_barras && i.codigo_barras.trim() !== '').length;
        footer.textContent = `CEHAQ - ${total} etiquetas generadas | ${new Date().toLocaleDateString('es-CL')}`;
        container.appendChild(footer);

        return container;
    },

    // Abrir ventana de impresión optimizada para etiquetas 5x3
    printBarcodes(insumos, options = {}) {
        const container = this.generateLabelPage(insumos, options);
        
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            UI.showToast('Por favor, permite las ventanas emergentes para imprimir', 'warning');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Etiquetas CEHAQ - 5x3 cm</title>
                <style>
                    @media print {
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            margin: 0; 
                            padding: 0; 
                            background: white;
                        }
                        .no-print { display: none !important; }
                        .barcode-page {
                            padding: 3mm !important;
                            width: 100% !important;
                        }
                        .barcode-svg {
                            max-width: 100% !important;
                            height: auto !important;
                        }
                        /* Asegurar que cada etiqueta se imprima correctamente */
                        .barcode-page > div {
                            display: grid !important;
                            grid-template-columns: repeat(auto-fill, 50mm) !important;
                            gap: 2mm !important;
                        }
                        .barcode-page > div > div {
                            width: 50mm !important;
                            height: 30mm !important;
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                            border: 0.5px solid #ccc !important;
                        }
                    }
                    @page {
                        size: A4;
                        margin: 5mm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        background: #f0f0f0;
                        margin: 0;
                        padding: 10px;
                    }
                    .print-controls {
                        text-align: center;
                        margin-bottom: 15px;
                        padding: 15px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .print-controls button {
                        padding: 10px 25px;
                        margin: 0 8px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                        transition: all 0.2s;
                    }
                    .btn-print {
                        background: #1a3a6b;
                        color: white;
                    }
                    .btn-print:hover { background: #0f2447; transform: translateY(-1px); }
                    .btn-close {
                        background: #6c757d;
                        color: white;
                    }
                    .btn-close:hover { background: #5a6268; }
                    .print-info {
                        margin-top: 10px;
                        font-size: 12px;
                        color: #666;
                    }
                    .print-info strong {
                        color: #1a3a6b;
                    }
                    @media screen {
                        .barcode-page {
                            max-width: 210mm;
                            margin: 0 auto;
                            background: white;
                            padding: 5mm;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            border-radius: 4px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-controls no-print">
                    <button class="btn-print" onclick="window.print()">🖨️ IMPRIMIR ETIQUETAS</button>
                    <button class="btn-close" onclick="window.close()">✕ CERRAR</button>
                    <div class="print-info">
                        💡 <strong>Configuración recomendada:</strong> Tamaño A4, Escala 100%, Sin márgenes adicionales<br>
                        📏 Etiquetas: 5cm x 3cm | Total: <span id="total-etiquetas">0</span> etiquetas
                    </div>
                </div>
                <div id="barcode-container"></div>
                <script>
                    const container = document.getElementById('barcode-container');
                    const content = ${JSON.stringify(container.outerHTML)};
                    container.innerHTML = content;
                    
                    // Contar etiquetas
                    const labels = container.querySelectorAll('.barcode-page > div > div');
                    document.getElementById('total-etiquetas').textContent = labels.length;
                    
                    // Auto-print si hay pocas etiquetas
                    if (labels.length > 0 && labels.length <= 20) {
                        setTimeout(() => window.print(), 500);
                    }
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    // Filtrar insumos según criterios
    filterInsumos(insumos, filtro) {
        let filtered = [...insumos];

        if (filtro === 'con-codigo') {
            filtered = filtered.filter(i => i.codigo_barras && i.codigo_barras.trim() !== '');
        } else if (filtro === 'sin-codigo') {
            filtered = filtered.filter(i => !i.codigo_barras || i.codigo_barras.trim() === '');
        } else if (filtro === 'stock-critico') {
            filtered = filtered.filter(i => i.stock <= CONFIG.porcentajeCritico);
        } else if (filtro === 'por-vencer') {
            const hoy = new Date();
            const diasVencimiento = CONFIG.diasVencimiento || 30;
            filtered = filtered.filter(i => {
                if (!i.vencimiento) return false;
                const venc = new Date(i.vencimiento);
                const diff = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
                return diff >= 0 && diff <= diasVencimiento;
            });
        } else if (filtro === 'todos') {
            filtered = filtered.filter(i => i.codigo_barras && i.codigo_barras.trim() !== '');
        }

        return filtered;
    }
};
