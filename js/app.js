// js/app.js
const App = {
    inventario: [],
    secciones: [],
    movimientos: [],
    config: {},
    bodega: '',
    user: null,

    async init() {
        this.user = window.currentUser;
        this.bodega = window.currentBodega || 'BODEGA';
        
        UI.setConnectionStatus('warning', 'CONECTANDO...');
        
        try {
            await this.cargarDatosIniciales();
            this.setupEventListeners();
            this.mostrarVista('dashboard');
            await this.actualizarDashboard();
            UI.setConnectionStatus('success', 'CONECTADO');
            this.movimientos = await DB.getMovimientos(10);
            this.renderMovimientosRecientes();
        } catch (error) {
            console.error('Error en init:', error);
            UI.setConnectionStatus('error', 'ERROR DE CONEXIÓN');
            UI.showToast('Error al conectar con la base de datos', 'error');
        }
    },

    async cargarDatosIniciales() {
        try {
            this.inventario = await DB.getInventario(this.bodega);
            this.secciones = await DB.getSecciones(this.bodega);
            this.config = await DB.getConfig(this.bodega);
            this.movimientos = await DB.getMovimientos(50, this.bodega);
            document.getElementById('total-badge').textContent = this.inventario.length;
        } catch (error) {
            console.error('Error cargando datos:', error);
            throw error;
        }
    },

    setupEventListeners() {
        document.querySelectorAll('[data-section]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const section = el.getAttribute('data-section');
                this.mostrarVista(section);
            });
        });

        document.getElementById('btn-ingreso')?.addEventListener('click', () => {
            this.mostrarModalIngreso();
        });
        document.getElementById('header-btn-ingreso')?.addEventListener('click', () => {
            this.mostrarModalIngreso();
        });

        document.getElementById('btn-salida')?.addEventListener('click', () => {
            this.mostrarModalSalida();
        });
        document.getElementById('header-btn-salida')?.addEventListener('click', () => {
            this.mostrarModalSalida();
        });

        document.getElementById('btn-buscar-anaquel')?.addEventListener('click', () => {
            this.mostrarModalBuscarAnaquel();
        });
        document.getElementById('header-btn-buscar')?.addEventListener('click', () => {
            this.mostrarModalBuscarAnaquel();
        });

        document.getElementById('btn-gestionar')?.addEventListener('click', () => {
            this.mostrarModalGestion();
        });

        document.getElementById('btn-exportar')?.addEventListener('click', () => {
            this.exportarInventarioExcel();
        });

        document.getElementById('btn-admin-usuarios')?.addEventListener('click', () => {
            this.mostrarModalUsuarios();
        });

        // NUEVO: Listener para generar códigos de barras
        document.getElementById('btn-generar-codigos')?.addEventListener('click', () => {
            this.mostrarDialogoGenerarCodigos();
        });

        document.getElementById('filtro-stock-critico')?.addEventListener('change', () => {
            this.renderInventario();
        });
        document.getElementById('filtro-por-vencer')?.addEventListener('change', () => {
            this.renderInventario();
        });
        document.getElementById('filtro-vencidos')?.addEventListener('change', () => {
            this.renderInventario();
        });

        document.getElementById('busqueda-movimientos')?.addEventListener('input', () => {
            this.renderMovimientos();
        });

        document.querySelector('.btn-accent[onclick="cambiarBodega()"]')?.addEventListener('click', () => {
            window.location.href = 'seleccionar.html';
        });

        document.getElementById('modal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal')) {
                UI.closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') UI.closeModal();
        });
    },

    mostrarVista(vista) {
        document.querySelectorAll('[id^="section-"]').forEach(el => {
            el.style.display = 'none';
        });

        const section = document.getElementById(`section-${vista}`);
        if (section) {
            section.style.display = 'block';
        }

        document.querySelectorAll('.sidebar-menu a').forEach(el => {
            el.classList.remove('active');
        });
        const menuItem = document.querySelector(`[data-section="${vista}"]`);
        if (menuItem) {
            menuItem.classList.add('active');
        }

        const titles = {
            dashboard: 'DASHBOARD',
            inventario: 'INVENTARIO COMPLETO',
            movimientos: 'HISTORIAL DE MOVIMIENTOS'
        };
        document.getElementById('page-title').textContent = titles[vista] || '';

        const headerActions = document.getElementById('header-actions');
        if (vista === 'dashboard') {
            headerActions.innerHTML = `
                <button class="btn btn-success" id="header-btn-ingreso">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    INGRESO
                </button>
                <button class="btn btn-danger" id="header-btn-salida">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    SALIDA
                </button>
            `;
            document.getElementById('header-btn-ingreso')?.addEventListener('click', () => this.mostrarModalIngreso());
            document.getElementById('header-btn-salida')?.addEventListener('click', () => this.mostrarModalSalida());
        } else if (vista === 'inventario') {
            headerActions.innerHTML = `
                <button class="btn btn-success" id="header-btn-ingreso">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    INGRESO
                </button>
                <button class="btn btn-info" id="header-btn-buscar">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    ANAQUEL
                </button>
            `;
            document.getElementById('header-btn-ingreso')?.addEventListener('click', () => this.mostrarModalIngreso());
            document.getElementById('header-btn-buscar')?.addEventListener('click', () => this.mostrarModalBuscarAnaquel());
            this.renderInventario();
        } else if (vista === 'movimientos') {
            headerActions.innerHTML = `
                <button class="btn btn-primary" onclick="App.exportarMovimientosExcel()">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    EXPORTAR EXCEL
                </button>
            `;
            this.renderMovimientos();
        }
    },

    async actualizarDashboard() {
        try {
            const inventario = await DB.getInventario(this.bodega);
            this.inventario = inventario;
            
            document.getElementById('total-insumos').textContent = inventario.length;
            
            const stockTotal = inventario.reduce((sum, item) => sum + (item.stock || 0), 0);
            document.getElementById('stock-total').textContent = stockTotal;
            
            const secciones = await DB.getSecciones(this.bodega);
            this.secciones = secciones;
            document.getElementById('secciones-activas').textContent = secciones.length;
            
            const critico = inventario.filter(item => item.stock <= CONFIG.porcentajeCritico);
            document.getElementById('stock-critico').textContent = critico.length;
            
            const hoy = new Date();
            const diasVencimiento = CONFIG.diasVencimiento || 30;
            const porVencer = inventario.filter(item => {
                if (!item.vencimiento) return false;
                const venc = new Date(item.vencimiento);
                const diff = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
                return diff >= 0 && diff <= diasVencimiento;
            });
            document.getElementById('vencimientos-proximos').textContent = porVencer.length;
            
            this.renderAlertasStock(critico);
            
            document.getElementById('total-badge').textContent = inventario.length;
        } catch (error) {
            console.error('Error actualizando dashboard:', error);
        }
    },

    renderAlertasStock(insumos) {
        const container = document.getElementById('alertas-stock');
        if (!container) return;
        
        if (!insumos || insumos.length === 0) {
            container.innerHTML = `<div class="empty-state"><p style="color: #27ae60;">✅ No hay insumos con stock crítico</p></div>`;
            return;
        }
        
        let html = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:10px;">';
        insumos.slice(0, 10).forEach(item => {
            const porcentaje = Math.round((item.stock / (CONFIG.porcentajeCritico || 20)) * 100);
            html += `
                <div style="background:#fde8e8; padding:12px 15px; border-radius:6px; border-left:4px solid #c0392b;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="font-size:13px; color:#333;">${item.nombre}</strong>
                        <span style="font-size:12px; color:#c0392b; font-weight:bold;">${item.stock} ${item.unidad || ''}</span>
                    </div>
                    <div style="font-size:11px; color:#666; margin-top:4px;">
                        ${item.seccion} - ${item.anaquel}
                        ${item.vencimiento ? ` | Vence: ${new Date(item.vencimiento).toLocaleDateString('es-CL')}` : ''}
                    </div>
                    <div style="width:100%; height:4px; background:#f0f0f0; border-radius:2px; margin-top:6px; overflow:hidden;">
                        <div style="width:${Math.min(porcentaje, 100)}%; height:100%; background:#c0392b; border-radius:2px;"></div>
                    </div>
                </div>
            `;
        });
        if (insumos.length > 10) {
            html += `<div style="text-align:center; padding:10px; color:#666; font-size:12px; grid-column:1/-1;">
                Y ${insumos.length - 10} más...
            </div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    },

    renderMovimientosRecientes() {
        const container = document.querySelector('#section-dashboard .section:last-child');
        if (!container) return;
        
        if (!this.movimientos || this.movimientos.length === 0) {
            container.innerHTML = `<h2>MOVIMIENTOS RECIENTES</h2><div class="empty-state"><p>No hay movimientos registrados</p></div>`;
            return;
        }
        
        let html = `<h2>MOVIMIENTOS RECIENTES</h2><div class="table-responsive"><div class="table-container"><table>
            <thead><tr>
                <th>FECHA</th><th>TIPO</th><th>INSUMO</th><th>CANTIDAD</th><th>USUARIO</th>
            </tr></thead><tbody>`;
        
        this.movimientos.slice(0, 15).forEach(mov => {
            const fecha = new Date(mov.fecha).toLocaleString('es-CL');
            const tipoClass = mov.tipo === 'INGRESO' ? 'badge-success' : 
                             mov.tipo === 'SALIDA' ? 'badge-danger' : 'badge-warning';
            html += `<tr>
                <td>${fecha}</td>
                <td><span class="badge ${tipoClass}">${mov.tipo}</span></td>
                <td>${mov.insumo || '-'}</td>
                <td>${mov.cantidad || 0}</td>
                <td>${mov.usuario || '-'}</td>
            </tr>`;
        });
        html += `</tbody></table></div></div>`;
        html += `<div style="margin-top:10px; text-align:right;">
            <button class="btn btn-primary btn-sm" onclick="App.mostrarVista('movimientos')">VER TODOS →</button>
        </div>`;
        container.innerHTML = html;
    },

    renderInventario() {
        const container = document.getElementById('tabla-inventario');
        if (!container) return;
        
        const stockCritico = document.getElementById('filtro-stock-critico')?.checked || false;
        const porVencer = document.getElementById('filtro-por-vencer')?.checked || false;
        const vencidos = document.getElementById('filtro-vencidos')?.checked || false;
        
        let items = [...this.inventario];
        
        if (stockCritico) {
            items = items.filter(item => item.stock <= CONFIG.porcentajeCritico);
        }
        if (porVencer) {
            const hoy = new Date();
            const diasVencimiento = CONFIG.diasVencimiento || 30;
            items = items.filter(item => {
                if (!item.vencimiento) return false;
                const venc = new Date(item.vencimiento);
                const diff = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
                return diff >= 0 && diff <= diasVencimiento;
            });
        }
        if (vencidos) {
            const hoy = new Date();
            items = items.filter(item => {
                if (!item.vencimiento) return false;
                const venc = new Date(item.vencimiento);
                return venc < hoy;
            });
        }
        
        document.getElementById('contador-inventario').textContent = items.length;
        
        if (items.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <div style="font-size:40px; margin-bottom:10px;">📦</div>
                <p>No hay insumos que coincidan con los filtros seleccionados</p>
            </div>`;
            return;
        }
        
        let html = `<table>
            <thead><tr>
                <th>NOMBRE</th>
                <th>SECCIÓN</th>
                <th>ANAQUEL</th>
                <th>STOCK</th>
                <th>UNIDAD</th>
                <th>LOTE</th>
                <th>VENCIMIENTO</th>
                <th>CÓDIGO</th>
                <th>ACCIONES</th>
            </tr></thead><tbody>`;
        
        items.forEach(item => {
            const isCritical = item.stock <= CONFIG.porcentajeCritico;
            const hoy = new Date();
            const vence = item.vencimiento ? new Date(item.vencimiento) : null;
            const isExpired = vence && vence < hoy;
            const isNearExpiry = vence && !isExpired && 
                Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24)) <= CONFIG.diasVencimiento;
            
            let rowClass = '';
            if (isCritical) rowClass = 'stock-critical';
            else if (isExpired) rowClass = 'stock-warning';
            else if (isNearExpiry) rowClass = 'stock-warning';
            
            html += `<tr class="${rowClass}">
                <td><strong>${item.nombre || '-'}</strong></td>
                <td>${item.seccion || '-'}</td>
                <td>${item.anaquel || '-'}</td>
                <td><strong>${item.stock || 0}</strong></td>
                <td>${item.unidad || '-'}</td>
                <td>${item.lote || '-'}</td>
                <td>${item.vencimiento ? new Date(item.vencimiento).toLocaleDateString('es-CL') : '-'}</td>
                <td>${item.codigo_barras ? `<span style="font-family:monospace; font-size:11px;">${item.codigo_barras}</span>` : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="App.mostrarEditarInsumo('${item.id}')" title="Editar">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="App.eliminarInsumo('${item.id}')" title="Eliminar">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    async renderMovimientos() {
        const container = document.getElementById('tabla-movimientos');
        if (!container) return;
        
        try {
            const tipo = document.getElementById('filtro-tipo-movimiento')?.value || 'TODOS';
            const usuario = document.getElementById('filtro-usuario-movimiento')?.value || 'TODOS';
            const busqueda = document.getElementById('busqueda-movimientos')?.value?.toLowerCase() || '';
            
            let movimientos = await DB.getTodosMovimientos(this.bodega);
            this.movimientos = movimientos;
            
            const usuariosSelect = document.getElementById('filtro-usuario-movimiento');
            if (usuariosSelect && usuariosSelect.options.length <= 1) {
                const usuarios = [...new Set(movimientos.map(m => m.usuario).filter(Boolean))];
                usuarios.forEach(u => {
                    const option = document.createElement('option');
                    option.value = u;
                    option.textContent = u;
                    usuariosSelect.appendChild(option);
                });
            }
            
            if (tipo !== 'TODOS') {
                movimientos = movimientos.filter(m => m.tipo === tipo);
            }
            if (usuario !== 'TODOS') {
                movimientos = movimientos.filter(m => m.usuario === usuario);
            }
            if (busqueda) {
                movimientos = movimientos.filter(m => 
                    (m.insumo && m.insumo.toLowerCase().includes(busqueda)) ||
                    (m.anaquel && m.anaquel.toLowerCase().includes(busqueda)) ||
                    (m.comentarios && m.comentarios.toLowerCase().includes(busqueda))
                );
            }
            
            if (movimientos.length === 0) {
                container.innerHTML = `<div class="empty-state">
                    <div style="font-size:40px; margin-bottom:10px;">📋</div>
                    <p>No hay movimientos que coincidan con los filtros</p>
                </div>`;
                return;
            }
            
            let html = `<table>
                <thead><tr>
                    <th>FECHA</th>
                    <th>TIPO</th>
                    <th>INSUMO</th>
                    <th>CANTIDAD</th>
                    <th>STOCK ANTERIOR</th>
                    <th>STOCK NUEVO</th>
                    <th>ANAQUEL</th>
                    <th>USUARIO</th>
                    <th>COMENTARIOS</th>
                </tr></thead><tbody>`;
            
            movimientos.forEach(mov => {
                const fecha = new Date(mov.fecha).toLocaleString('es-CL');
                const tipoClass = mov.tipo === 'INGRESO' ? 'badge-success' : 
                                 mov.tipo === 'SALIDA' ? 'badge-danger' : 'badge-warning';
                html += `<tr>
                    <td style="white-space:nowrap; font-size:11px;">${fecha}</td>
                    <td><span class="badge ${tipoClass}">${mov.tipo}</span></td>
                    <td>${mov.insumo || '-'}</td>
                    <td>${mov.cantidad || 0}</td>
                    <td>${mov.stock_anterior !== null ? mov.stock_anterior : '-'}</td>
                    <td>${mov.stock_nuevo !== null ? mov.stock_nuevo : '-'}</td>
                    <td>${mov.anaquel || '-'}</td>
                    <td>${mov.usuario || '-'}</td>
                    <td style="font-size:11px; color:#666;">${mov.comentarios || '-'}</td>
                </tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        } catch (error) {
            console.error('Error renderizando movimientos:', error);
            container.innerHTML = `<div class="empty-state"><p>Error al cargar movimientos</p></div>`;
        }
    },

    mostrarModalIngreso() {
        const secciones = this.secciones;
        const unidades = this.unidades || [];
        
        let seccionesOptions = secciones.map(s => 
            `<option value="${s.seccion}">${s.seccion} - ${s.anaquel}</option>`
        ).join('');
        
        let unidadesOptions = unidades.map(u => 
            `<option value="${u.nombre}">${u.nombre}</option>`
        ).join('');
        
        const content = `
            <h2>📦 NUEVO INGRESO</h2>
            <form id="form-ingreso" onsubmit="App.procesarIngreso(event)">
                <div class="form-group">
                    <label>NOMBRE DEL INSUMO *</label>
                    <input type="text" id="ingreso-nombre" placeholder="EJ: PARACETAMOL 500MG" required style="text-transform:uppercase;">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>SECCIÓN *</label>
                        <select id="ingreso-seccion" required>
                            <option value="">SELECCIONE...</option>
                            ${seccionesOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>ANAQUEL *</label>
                        <input type="text" id="ingreso-anaquel" placeholder="EJ: A1" required style="text-transform:uppercase;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>CANTIDAD *</label>
                        <input type="number" id="ingreso-cantidad" placeholder="0" required min="1">
                    </div>
                    <div class="form-group">
                        <label>UNIDAD</label>
                        <select id="ingreso-unidad">
                            <option value="">SELECCIONE...</option>
                            ${unidadesOptions}
                            <option value="OTRO">OTRO (ESPECIFICAR)</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>LOTE</label>
                        <input type="text" id="ingreso-lote" placeholder="NÚMERO DE LOTE" style="text-transform:uppercase;">
                    </div>
                    <div class="form-group">
                        <label>VENCIMIENTO</label>
                        <input type="date" id="ingreso-vencimiento">
                    </div>
                </div>
                <div class="form-group">
                    <label>CÓDIGO DE BARRAS</label>
                    <input type="text" id="ingreso-codigo" placeholder="CÓDIGO DE BARRAS (OPCIONAL)">
                    <div style="margin-top:5px;">
                        <button type="button" class="btn btn-sm btn-info" onclick="App.escaneoCodigoBarras('ingreso-codigo')">
                            📷 ESCANEAR
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label>COMENTARIOS</label>
                    <textarea id="ingreso-comentarios" placeholder="COMENTARIOS OBSERVACIONES"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CANCELAR</button>
                    <button type="submit" class="btn btn-success">✅ REGISTRAR INGRESO</button>
                </div>
            </form>
        `;
        UI.openModal(content);
    },

    mostrarModalSalida() {
        const content = `
            <h2>📤 NUEVA SALIDA</h2>
            <form id="form-salida" onsubmit="App.procesarSalida(event)">
                <div class="form-group">
                    <label>BUSCAR INSUMO *</label>
                    <input type="text" id="salida-busqueda" placeholder="ESCRIBA EL NOMBRE DEL INSUMO..." 
                           oninput="App.buscarInsumosParaSalida(this.value)">
                    <div id="salida-resultados" style="margin-top:5px; max-height:200px; overflow-y:auto; border:1px solid #e0e0e0; border-radius:5px; display:none;"></div>
                </div>
                <div id="salida-info" style="display:none; background:#f0f4ff; padding:10px; border-radius:5px; margin-bottom:10px;">
                    <p><strong>INSUMO:</strong> <span id="salida-nombre"></span></p>
                    <p><strong>STOCK DISPONIBLE:</strong> <span id="salida-stock"></span></p>
                    <p><strong>ANAQUEL:</strong> <span id="salida-anaquel"></span></p>
                </div>
                <div class="form-group">
                    <label>CANTIDAD A RETIRAR *</label>
                    <input type="number" id="salida-cantidad" placeholder="0" required min="1">
                </div>
                <div class="form-group">
                    <label>COMENTARIOS</label>
                    <textarea id="salida-comentarios" placeholder="MOTIVO DE LA SALIDA"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CANCELAR</button>
                    <button type="submit" class="btn btn-danger">⛔ REGISTRAR SALIDA</button>
                </div>
            </form>
        `;
        UI.openModal(content);
    },

    async buscarInsumosParaSalida(busqueda) {
        const container = document.getElementById('salida-resultados');
        if (!busqueda || busqueda.length < 2) {
            container.style.display = 'none';
            return;
        }
        
        try {
            const resultados = await DB.buscarInsumosNombre(busqueda);
            if (resultados.length === 0) {
                container.innerHTML = '<div style="padding:10px; color:#666;">No se encontraron insumos</div>';
                container.style.display = 'block';
                return;
            }
            
            let html = '';
            resultados.forEach(item => {
                html += `<div style="padding:8px 12px; cursor:pointer; border-bottom:1px solid #f0f0f0;"
                         onclick="App.seleccionarInsumoSalida('${item.nombre}')">
                    <strong>${item.nombre}</strong>
                    <span style="color:#666; font-size:12px;">${item.unidad || ''}</span>
                </div>`;
            });
            container.innerHTML = html;
            container.style.display = 'block';
        } catch (error) {
            console.error('Error buscando insumos:', error);
        }
    },

    async seleccionarInsumoSalida(nombre) {
        const inventario = this.inventario.filter(i => i.nombre === nombre);
        if (inventario.length === 0) {
            UI.showToast('Insumo no encontrado', 'error');
            return;
        }
        
        const item = inventario[0];
        document.getElementById('salida-nombre').textContent = item.nombre;
        document.getElementById('salida-stock').textContent = `${item.stock} ${item.unidad || ''}`;
        document.getElementById('salida-anaquel').textContent = `${item.seccion} - ${item.anaquel}`;
        document.getElementById('salida-info').style.display = 'block';
        document.getElementById('salida-resultados').style.display = 'none';
        document.getElementById('salida-cantidad').focus();
        
        document.getElementById('form-salida').dataset.itemId = item.id;
    },

    async procesarIngreso(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('ingreso-nombre').value.trim();
        const seccion = document.getElementById('ingreso-seccion').value;
        const anaquel = document.getElementById('ingreso-anaquel').value.trim().toUpperCase();
        const cantidad = parseInt(document.getElementById('ingreso-cantidad').value);
        const unidad = document.getElementById('ingreso-unidad').value;
        const lote = document.getElementById('ingreso-lote').value.trim();
        const vencimiento = document.getElementById('ingreso-vencimiento').value;
        const codigo = document.getElementById('ingreso-codigo').value.trim();
        const comentarios = document.getElementById('ingreso-comentarios').value.trim();
        
        if (!nombre || !seccion || !anaquel || !cantidad) {
            UI.showToast('Complete todos los campos obligatorios', 'error');
            return;
        }
        
        try {
            const result = await DB.procesarIngreso(
                nombre, seccion, anaquel, cantidad, unidad, lote, vencimiento, codigo, comentarios
            );
            
            UI.showToast(`✅ Ingreso registrado: ${nombre} (${cantidad} ${unidad})`, 'success');
            UI.closeModal();
            
            await this.cargarDatosIniciales();
            await this.actualizarDashboard();
            this.renderInventario();
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },

    async procesarSalida(e) {
        e.preventDefault();
        
        const itemId = document.getElementById('form-salida').dataset.itemId;
        const cantidad = parseInt(document.getElementById('salida-cantidad').value);
        const comentarios = document.getElementById('salida-comentarios').value.trim();
        
        if (!itemId || !cantidad) {
            UI.showToast('Seleccione un insumo y cantidad válida', 'error');
            return;
        }
        
        try {
            const result = await DB.procesarSalida(itemId, cantidad, comentarios);
            
            if (result.eliminado) {
                UI.showToast(`⛔ Salida registrada: ${result.nombre} - Stock agotado, eliminado`, 'warning');
            } else {
                UI.showToast(`⛔ Salida registrada: ${result.nombre} (${cantidad} unidades)`, 'success');
            }
            
            UI.closeModal();
            
            await this.cargarDatosIniciales();
            await this.actualizarDashboard();
            this.renderInventario();
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },

    mostrarModalBuscarAnaquel() {
        const content = `
            <h2>🔍 BUSCAR POR ANAQUEL</h2>
            <div class="form-group">
                <label>ANAQUEL</label>
                <input type="text" id="buscar-anaquel-input" placeholder="EJ: A1, B3, C2" style="text-transform:uppercase;">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CANCELAR</button>
                <button type="button" class="btn btn-primary" onclick="App.buscarAnaquel()">🔍 BUSCAR</button>
            </div>
            <div id="resultado-anaquel" style="margin-top:15px;"></div>
        `;
        UI.openModal(content);
        setTimeout(() => document.getElementById('buscar-anaquel-input')?.focus(), 100);
    },

    async buscarAnaquel() {
        const input = document.getElementById('buscar-anaquel-input');
        const container = document.getElementById('resultado-anaquel');
        const anaquel = input?.value?.trim().toUpperCase() || '';
        
        if (!anaquel) {
            UI.showToast('Ingrese un anaquel', 'warning');
            return;
        }
        
        const resultados = this.inventario.filter(item => 
            item.anaquel && item.anaquel.toUpperCase().includes(anaquel)
        );
        
        if (resultados.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No se encontraron insumos en el anaquel ${anaquel}</p></div>`;
            return;
        }
        
        let html = `<h3 style="margin-bottom:10px;">📦 ${resultados.length} insumos encontrados</h3>
            <div class="table-responsive"><div class="table-container"><table>
            <thead><tr><th>NOMBRE</th><th>SECCIÓN</th><th>STOCK</th><th>UNIDAD</th></tr></thead><tbody>`;
        
        resultados.forEach(item => {
            html += `<tr>
                <td>${item.nombre}</td>
                <td>${item.seccion || '-'}</td>
                <td><strong>${item.stock || 0}</strong></td>
                <td>${item.unidad || '-'}</td>
            </tr>`;
        });
        html += '</tbody></table></div></div>';
        container.innerHTML = html;
    },

    mostrarModalGestion() {
        const secciones = this.secciones;
        const unidades = this.unidades || [];
        
        let seccionesHtml = secciones.map(s => 
            `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid #f0f0f0;">
                <span><strong>${s.seccion}</strong> - ${s.anaquel}${s.descripcion ? ` (${s.descripcion})` : ''}</span>
                <button class="btn btn-sm btn-danger" onclick="App.eliminarSeccion('${s.id}')">Eliminar</button>
            </div>`
        ).join('');
        
        let unidadesHtml = unidades.map(u => 
            `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid #f0f0f0;">
                <span><strong>${u.nombre}</strong></span>
                <button class="btn btn-sm btn-danger" onclick="App.eliminarUnidad('${u.id}')">Eliminar</button>
            </div>`
        ).join('');
        
        const content = `
            <h2>⚙️ GESTIÓN DE SECCIONES Y UNIDADES</h2>
            
            <div style="margin-bottom:20px;">
                <h3 style="color:#1a3a6b; font-size:14px;">📂 SECCIONES / ANAQUELES</h3>
                <div style="background:#f8f9fa; padding:10px; border-radius:5px; margin-top:5px; max-height:200px; overflow-y:auto;">
                    ${seccionesHtml || '<div style="color:#999;">No hay secciones registradas</div>'}
                </div>
                <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
                    <input type="text" id="nueva-seccion" placeholder="SECCIÓN" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:5px; min-width:100px;">
                    <input type="text" id="nuevo-anaquel" placeholder="ANAQUEL" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:5px; min-width:100px;">
                    <input type="text" id="nueva-descripcion" placeholder="DESCRIPCIÓN" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:5px; min-width:120px;">
                    <button class="btn btn-success" onclick="App.agregarSeccion()">➕ AGREGAR</button>
                </div>
            </div>
            
            <div>
                <h3 style="color:#1a3a6b; font-size:14px;">📏 UNIDADES DE MEDIDA</h3>
                <div style="background:#f8f9fa; padding:10px; border-radius:5px; margin-top:5px; max-height:150px; overflow-y:auto;">
                    ${unidadesHtml || '<div style="color:#999;">No hay unidades registradas</div>'}
                </div>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <input type="text" id="nueva-unidad" placeholder="NUEVA UNIDAD (EJ: KG, ML, UNIDAD)" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:5px; text-transform:uppercase;">
                    <button class="btn btn-success" onclick="App.agregarUnidad()">➕ AGREGAR</button>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CERRAR</button>
            </div>
        `;
        UI.openModal(content);
    },

    async agregarSeccion() {
        const seccion = document.getElementById('nueva-seccion').value.trim().toUpperCase();
        const anaquel = document.getElementById('nuevo-anaquel').value.trim().toUpperCase();
        const descripcion = document.getElementById('nueva-descripcion').value.trim().toUpperCase();
        
        if (!seccion || !anaquel) {
            UI.showToast('Complete sección y anaquel', 'warning');
            return;
        }
        
        try {
            await DB.addSeccion(seccion, descripcion, anaquel);
            UI.showToast('✅ Sección agregada', 'success');
            
            this.secciones = await DB.getSecciones(this.bodega);
            this.mostrarModalGestion();
            await this.actualizarDashboard();
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },

    async eliminarSeccion(id) {
        if (!confirm('¿Eliminar esta sección?')) return;
        
        try {
            await DB.deleteSeccion(id);
            UI.showToast('✅ Sección eliminada', 'success');
            
            this.secciones = await DB.getSecciones(this.bodega);
            this.mostrarModalGestion();
            await this.actualizarDashboard();
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },

    async agregarUnidad() {
        const nombre = document.getElementById('nueva-unidad').value.trim().toUpperCase();
        
        if (!nombre) {
            UI.showToast('Ingrese una unidad', 'warning');
            return;
        }
        
        try {
            await DB.addUnidadMedida(nombre);
            UI.showToast('✅ Unidad agregada', 'success');
            
            this.unidades = await DB.getUnidadesMedida(this.bodega);
            this.mostrarModalGestion();
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },

    async eliminarUnidad(id) {
        if (!confirm('¿Eliminar esta unidad?')) return;
        
        try {
            await DB.deleteUnidadMedida(id);
            UI.showToast('✅ Unidad eliminada', 'success');
            
            this.unidades = await DB.getUnidadesMedida(this.bodega);
            this.mostrarModalGestion();
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },

    async exportarInventarioExcel() {
        try {
            const data = this.inventario.map(item => ({
                'NOMBRE': item.nombre || '',
                'SECCIÓN': item.seccion || '',
                'ANAQUEL': item.anaquel || '',
                'STOCK': item.stock || 0,
                'UNIDAD': item.unidad || '',
                'LOTE': item.lote || '',
                'VENCIMIENTO': item.vencimiento ? new Date(item.vencimiento).toLocaleDateString('es-CL') : '',
                'CÓDIGO BARRAS': item.codigo_barras || '',
                'COMENTARIOS': item.comentarios || ''
            }));
            
            if (data.length === 0) {
                UI.showToast('No hay datos para exportar', 'warning');
                return;
            }
            
            const headers = Object.keys(data[0]);
            let csv = headers.join(',') + '\n';
            data.forEach(row => {
                csv += headers.map(h => {
                    let val = String(row[h] || '');
                    if (val.includes(',') || val.includes('"')) {
                        val = `"${val.replace(/"/g, '""')}"`;
                    }
                    return val;
                }).join(',') + '\n';
            });
            
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `inventario_${this.bodega}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            
            UI.showToast('✅ Exportación completada', 'success');
        } catch (error) {
            console.error('Error exportando:', error);
            UI.showToast('❌ Error al exportar', 'error');
        }
    },

    async exportarMovimientosExcel() {
        try {
            const movimientos = await DB.getTodosMovimientos(this.bodega);
            
            const data = movimientos.map(m => ({
                'FECHA': new Date(m.fecha).toLocaleString('es-CL'),
                'TIPO': m.tipo || '',
                'INSUMO': m.insumo || '',
                'CANTIDAD': m.cantidad || 0,
                'STOCK ANTERIOR': m.stock_anterior !== null ? m.stock_anterior : '',
                'STOCK NUEVO': m.stock_nuevo !== null ? m.stock_nuevo : '',
                'ANAQUEL': m.anaquel || '',
                'USUARIO': m.usuario || '',
                'COMENTARIOS': m.comentarios || ''
            }));
            
            if (data.length === 0) {
                UI.showToast('No hay movimientos para exportar', 'warning');
                return;
            }
            
            const headers = Object.keys(data[0]);
            let csv = headers.join(',') + '\n';
            data.forEach(row => {
                csv += headers.map(h => {
                    let val = String(row[h] || '');
                    if (val.includes(',') || val.includes('"')) {
                        val = `"${val.replace(/"/g, '""')}"`;
                    }
                    return val;
                }).join(',') + '\n';
            });
            
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `movimientos_${this.bodega}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            
            UI.showToast('✅ Exportación completada', 'success');
        } catch (error) {
            console.error('Error exportando:', error);
            UI.showToast('❌ Error al exportar', 'error');
        }
    },

    // ==================== NUEVA FUNCIONALIDAD: CÓDIGOS DE BARRAS ====================
    mostrarDialogoGenerarCodigos() {
        const content = `
            <h2>🏷️ GENERAR ETIQUETAS (5cm x 3cm)</h2>
            <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #1a3a6b;">
                <p style="margin: 0 0 5px 0; font-size: 13px; color: #333; font-weight: 600;">
                    📋 Seleccione los insumos para generar etiquetas
                </p>
                <p style="margin: 0; font-size: 12px; color: #666;">
                    Las etiquetas se generarán en formato <strong>5cm x 3cm</strong>, ideales para impresión en papel adhesivo.
                    Se utiliza el campo <strong>"Código de Barras"</strong> de cada insumo.
                </p>
            </div>

            <div class="form-group">
                <label>🎯 FILTRO DE INSUMOS</label>
                <select id="filtro-barcode" style="width:100%; padding:10px; border:2px solid #e0e0e0; border-radius:5px; font-size:13px;">
                    <option value="todos">TODOS LOS INSUMOS CON CÓDIGO</option>
                    <option value="con-codigo">SOLO CON CÓDIGO DE BARRAS</option>
                    <option value="sin-codigo">SIN CÓDIGO DE BARRAS</option>
                    <option value="stock-critico">STOCK CRÍTICO</option>
                    <option value="por-vencer">POR VENCER</option>
                </select>
            </div>

            <div class="form-group">
                <label>📏 FORMATO DEL CÓDIGO</label>
                <select id="formato-barcode" style="width:100%; padding:10px; border:2px solid #e0e0e0; border-radius:5px; font-size:13px;">
                    <option value="CODE128">CODE128 (Recomendado)</option>
                    <option value="EAN13">EAN-13 (13 dígitos)</option>
                    <option value="UPC">UPC (12 dígitos)</option>
                    <option value="CODE39">CODE39</option>
                    <option value="ITF">ITF-14</option>
                </select>
            </div>

            <div class="form-group" style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
                <label style="margin: 0; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
                    <input type="checkbox" id="mostrar-stock" checked> Mostrar stock
                </label>
                <label style="margin: 0; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
                    <input type="checkbox" id="mostrar-nombre" checked> Mostrar nombre
                </label>
            </div>

            <div style="margin-top: 5px; font-size: 11px; color: #888; padding: 8px; background: #f0f4ff; border-radius: 4px;">
                ℹ️ Las etiquetas se generarán en tamaño <strong>50mm x 30mm</strong> (5cm x 3cm)
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="App.generarCodigosBarras()" style="flex:1; padding: 12px;">
                    🏷️ GENERAR ETIQUETAS
                </button>
                <button class="btn btn-secondary" onclick="UI.closeModal()" style="padding: 12px 25px;">
                    CANCELAR
                </button>
            </div>
        `;
        UI.openModal(content);
    },

    async generarCodigosBarras() {
        const filtro = document.getElementById('filtro-barcode')?.value || 'todos';
        const formato = document.getElementById('formato-barcode')?.value || 'CODE128';
        const mostrarStock = document.getElementById('mostrar-stock')?.checked !== false;
        const mostrarNombre = document.getElementById('mostrar-nombre')?.checked !== false;

        try {
            UI.showToast('🔄 Generando etiquetas...', 'info');
            
            const inventario = await DB.getInventario(this.bodega);
            
            let insumosFiltrados = BarcodeGenerator.filterInsumos(inventario, filtro);

            if (insumosFiltrados.length === 0) {
                UI.showToast('❌ No hay insumos que cumplan con los criterios seleccionados', 'warning');
                UI.closeModal();
                return;
            }

            const options = {
                format: formato,
                displayValue: true,
                mostrarStock: mostrarStock,
                mostrarNombre: mostrarNombre,
                fontSize: formato === 'EAN13' || formato === 'UPC' ? 9 : 10
            };

            const conCodigo = insumosFiltrados.filter(i => i.codigo_barras && i.codigo_barras.trim() !== '');
            
            if (conCodigo.length === 0) {
                UI.showToast('❌ Ningún insumo seleccionado tiene código de barras', 'warning');
                UI.closeModal();
                return;
            }

            const mensaje = `Se generarán ${conCodigo.length} etiqueta(s) en formato 5cm x 3cm. ¿Desea continuar?`;
            if (!confirm(mensaje)) {
                UI.closeModal();
                return;
            }

            BarcodeGenerator.printBarcodes(conCodigo, options);

            UI.closeModal();
            UI.showToast(`✅ ${conCodigo.length} etiquetas generadas correctamente`, 'success');

        } catch (error) {
            console.error('Error generando etiquetas:', error);
            UI.showToast('❌ Error al generar etiquetas: ' + (error.message || 'Error desconocido'), 'error');
        }
    },

    // ==================== FIN NUEVA FUNCIONALIDAD ====================

    escaneoCodigoBarras(inputId) {
        const content = `
            <h2>📷 ESCANEAR CÓDIGO DE BARRAS</h2>
            <div id="scanner-viewport" style="width:100%; height:250px; border:2px solid #1a3a6b; border-radius:8px; overflow:hidden; position:relative; background:#f0f0f0;"></div>
            <div style="margin-top:10px; text-align:center;">
                <button class="btn btn-secondary" onclick="UI.closeModal()">CANCELAR</button>
            </div>
        `;
        UI.openModal(content);
        
        setTimeout(() => {
            const html5QrCode = new Html5Qrcode("scanner-viewport");
            const config = { fps: 10, qrbox: { width: 250, height: 100 } };
            
            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    html5QrCode.stop();
                    UI.closeModal();
                    
                    const input = document.getElementById(inputId);
                    if (input) {
                        input.value = decodedText;
                        UI.showToast('✅ Código escaneado: ' + decodedText, 'success');
                    }
                },
                (errorMessage) => {}
            ).catch(err => {
                UI.showToast('❌ Error al acceder a la cámara', 'error');
                UI.closeModal();
            });
        }, 500);
    },

    async mostrarEditarInsumo(id) {
        const item = this.inventario.find(i => i.id === id);
        if (!item) {
            UI.showToast('Insumo no encontrado', 'error');
            return;
        }
        
        const secciones = this.secciones;
        const unidades = this.unidades || [];
        
        let seccionesOptions = secciones.map(s => 
            `<option value="${s.seccion}" ${s.seccion === item.seccion ? 'selected' : ''}>${s.seccion} - ${s.anaquel}</option>`
        ).join('');
        
        let unidadesOptions = unidades.map(u => 
            `<option value="${u.nombre}" ${u.nombre === item.unidad ? 'selected' : ''}>${u.nombre}</option>`
        ).join('');
        
        const content = `
            <h2>✏️ EDITAR INSUMO</h2>
            <form id="form-editar" onsubmit="App.guardarEdicionInsumo(event, '${id}')">
                <div class="form-group">
                    <label>NOMBRE *</label>
                    <input type="text" id="edit-nombre" value="${item.nombre || ''}" required style="text-transform:uppercase;">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>SECCIÓN *</label>
                        <select id="edit-seccion" required>
                            <option value="">SELECCIONE...</option>
                            ${seccionesOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>ANAQUEL *</label>
                        <input type="text" id="edit-anaquel" value="${item.anaquel || ''}" required style="text-transform:uppercase;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>STOCK *</label>
                        <input type="number" id="edit-stock" value="${item.stock || 0}" required min="0">
                    </div>
                    <div class="form-group">
                        <label>UNIDAD</label>
                        <select id="edit-unidad">
                            <option value="">SELECCIONE...</option>
                            ${unidadesOptions}
                            <option value="OTRO">OTRO (ESPECIFICAR)</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>LOTE</label>
                        <input type="text" id="edit-lote" value="${item.lote || ''}" style="text-transform:uppercase;">
                    </div>
                    <div class="form-group">
                        <label>VENCIMIENTO</label>
                        <input type="date" id="edit-vencimiento" value="${item.vencimiento || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>CÓDIGO DE BARRAS</label>
                    <input type="text" id="edit-codigo" value="${item.codigo_barras || ''}">
                </div>
                <div class="form-group">
                    <label>COMENTARIOS</label>
                    <textarea id="edit-comentarios">${item.comentarios || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CANCELAR</button>
                    <button type="submit" class="btn btn-primary">💾 GUARDAR CAMBIOS</button>
                </div>
            </form>
        `;
        UI.openModal(content);
    },

    async guardarEdicionInsumo(e, id) {
        e.preventDefault();
        
        const updates = {
            nombre: document.getElementById('edit-nombre').value.trim(),
            seccion: document.getElementById('edit-seccion').value,
            anaquel: document.getElementById('edit-anaquel').value.trim().toUpperCase(),
            stock: parseInt(document.getElementById('edit-stock').value) || 0,
            unidad: document.getElementById('edit-unidad').value || null,
            lote: document.getElementById('edit-lote').value.trim() || null,
            vencimiento: document.getElementById('edit-vencimiento').value || null,
            codigo_barras: document.getElementById('edit-codigo').value.trim() || null,
            comentarios: document.getElementById('edit-comentarios').value.trim() || null
        };
        
        if (!updates.nombre || !updates.seccion || !updates.anaquel) {
            UI.showToast('Complete los campos obligatorios', 'error');
            return;
        }
        
        try {
            const item = await DB.getInventarioItem(id);
            const stockAnterior = item.stock;
            
            await DB.updateInventarioItem(id, updates);
            
            await DB.addMovimiento({
                tipo: 'EDICION',
                insumo: updates.nombre,
                cantidad: updates.stock - stockAnterior,
                stock_anterior: stockAnterior,
                stock_nuevo: updates.stock,
                anaquel: updates.anaquel,
                comentarios: `EDITADO: ${updates.comentarios || 'Sin comentarios'}`
            });
            
            UI.showToast('✅ Insumo actualizado correctamente', 'success');
            UI.closeModal();
            
            await this.cargarDatosIniciales();
            await this.actualizarDashboard();
            this.renderInventario();
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },

    async eliminarInsumo(id) {
        if (!confirm('¿Eliminar este insumo permanentemente?')) return;
        
        try {
            const item = await DB.getInventarioItem(id);
            await DB.deleteInventarioItem(id);
            
            await DB.addMovimiento({
                tipo: 'ELIMINACION',
                insumo: item.nombre,
                cantidad: item.stock,
                stock_anterior: item.stock,
                stock_nuevo: 0,
                anaquel: item.anaquel,
                comentarios: 'INSUMO ELIMINADO DEL SISTEMA'
            });
            
            UI.showToast('✅ Insumo eliminado', 'success');
            
            await this.cargarDatosIniciales();
            await this.actualizarDashboard();
            this.renderInventario();
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },

    async recargarDatos() {
        try {
            await this.cargarDatosIniciales();
            await this.actualizarDashboard();
            const vista = document.querySelector('[id^="section-"]:not([style*="display:none"])');
            if (vista) {
                const id = vista.id.replace('section-', '');
                if (id === 'inventario') this.renderInventario();
                else if (id === 'movimientos') this.renderMovimientos();
            }
            UI.showToast('🔄 Datos actualizados', 'success');
        } catch (error) {
            UI.showToast('❌ Error al recargar datos', 'error');
        }
    },

    mostrarModalUsuarios() {
        const content = `
            <h2>👥 GESTIÓN DE USUARIOS</h2>
            <div id="lista-usuarios" style="margin-bottom:15px; max-height:300px; overflow-y:auto;">
                <div class="spinner" style="margin:20px auto;"></div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CERRAR</button>
            </div>
        `;
        UI.openModal(content);
        this.cargarUsuarios();
    },

    async cargarUsuarios() {
        const container = document.getElementById('lista-usuarios');
        if (!container) return;
        
        try {
            const { data: usuarios, error } = await supabaseClient
                .from('usuarios')
                .select('*')
                .order('nombre');
            
            if (error) throw error;
            
            let html = '<table><thead><tr><th>NOMBRE</th><th>USUARIO</th><th>ROL</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>';
            
            usuarios.forEach(user => {
                html += `<tr>
                    <td>${user.nombre || '-'}</td>
                    <td>${user.usuario}</td>
                    <td><span class="badge ${user.rol === 'admin' ? 'badge-success' : 'badge-warning'}">${user.rol || 'pendiente'}</span></td>
                    <td><span class="badge ${user.activo ? 'badge-success' : 'badge-danger'}">${user.activo ? 'ACTIVO' : 'PENDIENTE'}</span></td>
                    <td>
                        ${!user.activo ? `<button class="btn btn-sm btn-success" onclick="App.activarUsuario('${user.id}')">ACTIVAR</button>` : ''}
                        ${user.rol !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="App.eliminarUsuario('${user.id}')">ELIMINAR</button>` : ''}
                    </td>
                </tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            container.innerHTML = `<div class="empty-state"><p>Error al cargar usuarios</p></div>`;
        }
    },

    async activarUsuario(id) {
        if (!confirm('¿Activar este usuario?')) return;
        
        try {
            const { error } = await supabaseClient
                .from('usuarios')
                .update({ activo: true, rol: 'usuario' })
                .eq('id', id);
            
            if (error) throw error;
            
            UI.showToast('✅ Usuario activado', 'success');
            this.cargarUsuarios();
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },

    async eliminarUsuario(id) {
        if (!confirm('¿Eliminar este usuario permanentemente?')) return;
        
        try {
            const { error } = await supabaseClient
                .from('usuarios')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            UI.showToast('✅ Usuario eliminado', 'success');
            this.cargarUsuarios();
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    }
};

// Función para cambiar de bodega desde el header
function cambiarBodega() {
    window.location.href = 'seleccionar.html';
}

// Función para cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('cehaq_user');
    localStorage.removeItem('cehaq_bodega');
    window.location.href = 'login.html';
}
