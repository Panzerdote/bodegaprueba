const App = {
    inventario: [],
    movimientos: [],
    secciones: [],
    unidades: [],
    filteredInventario: [],
    currentSection: 'dashboard',

    async init() {
        try {
            UI.setConnectionStatus('warning', 'CARGANDO DATOS...');
            
            await this.cargarDatosIniciales();
            
            this.setupEventListeners();
            this.setupSidebarMenu();
            this.loadDashboard();
            
            UI.setConnectionStatus('success', 'CONECTADO');
            
            document.querySelectorAll('.sidebar-menu a[data-section]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = link.getAttribute('data-section');
                    if (section) {
                        this.navigateTo(section);
                    }
                });
            });
            
        } catch (error) {
            console.error('Error en init:', error);
            UI.setConnectionStatus('error', 'ERROR DE CONEXIÓN');
            UI.showToast('Error al cargar datos: ' + error.message, 'error');
        }
    },

    async cargarDatosIniciales() {
        try {
            const [inventario, movimientos, secciones, unidades] = await Promise.all([
                DB.getInventario(),
                DB.getMovimientos(100),
                DB.getSecciones(),
                DB.getUnidadesMedida()
            ]);
            
            this.inventario = inventario || [];
            this.movimientos = movimientos || [];
            this.secciones = secciones || [];
            this.unidades = unidades || [];
            
            this.filteredInventario = [...this.inventario];
            
            document.getElementById('total-badge').textContent = this.inventario.length;
            
            this.cargarFiltroUsuarios();
            
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            throw error;
        }
    },

    cargarFiltroUsuarios() {
        const select = document.getElementById('filtro-usuario-movimiento');
        if (!select) return;
        
        const usuarios = new Set();
        this.movimientos.forEach(m => {
            if (m.usuario) usuarios.add(m.usuario);
        });
        
        const currentValue = select.value;
        select.innerHTML = '<option value="TODOS">TODOS LOS USUARIOS</option>';
        usuarios.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario;
            option.textContent = usuario;
            select.appendChild(option);
        });
        select.value = currentValue;
    },

    setupEventListeners() {
        document.getElementById('btn-ingreso')?.addEventListener('click', () => this.mostrarFormularioIngreso());
        document.getElementById('btn-salida')?.addEventListener('click', () => this.mostrarFormularioSalida());
        document.getElementById('btn-buscar-anaquel')?.addEventListener('click', () => this.buscarAnaquel());
        document.getElementById('btn-gestionar')?.addEventListener('click', () => this.gestionarConfiguracion());
        document.getElementById('btn-exportar')?.addEventListener('click', () => this.exportarInventarioExcel());
        document.getElementById('btn-admin-usuarios')?.addEventListener('click', () => this.gestionarUsuarios());
        document.getElementById('btn-generar-cb')?.addEventListener('click', () => this.generarCodigosBarras());
        
        document.getElementById('header-btn-ingreso')?.addEventListener('click', () => this.mostrarFormularioIngreso());
        document.getElementById('header-btn-salida')?.addEventListener('click', () => this.mostrarFormularioSalida());
        
        document.getElementById('busqueda-movimientos')?.addEventListener('input', () => this.renderMovimientos());
        
        const modal = document.getElementById('modal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) UI.closeModal();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') UI.closeModal();
        });
    },

    setupSidebarMenu() {
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', function(e) {
                if (this.getAttribute('data-section')) {
                    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });
    },

    navigateTo(section) {
        this.currentSection = section;
        UI.setActiveSection(section);
        
        if (section === 'dashboard') {
            this.loadDashboard();
        } else if (section === 'inventario') {
            this.renderInventario();
        } else if (section === 'movimientos') {
            this.renderMovimientos();
        }
    },

    async loadDashboard() {
        try {
            if (this.inventario.length === 0) {
                this.inventario = await DB.getInventario();
                this.filteredInventario = [...this.inventario];
            }
            
            const totalInsumos = this.inventario.length;
            const stockTotal = this.inventario.reduce((sum, item) => sum + (item.stock || 0), 0);
            const seccionesActivas = this.secciones.length;
            
            const config = await DB.getConfig();
            const porcentajeCritico = config?.porcentaje_critico || 20;
            
            const stockCritico = this.inventario.filter(item => {
                const stock = item.stock || 0;
                return stock > 0 && stock <= porcentajeCritico;
            });
            
            const hoy = new Date();
            const diasVencimiento = config?.dias_vencimiento || 30;
            const fechaLimite = new Date(hoy);
            fechaLimite.setDate(fechaLimite.getDate() + diasVencimiento);
            
            const vencimientos = this.inventario.filter(item => {
                if (!item.vencimiento) return false;
                const fechaVenc = new Date(item.vencimiento);
                return fechaVenc <= fechaLimite && fechaVenc >= hoy;
            });
            
            document.getElementById('total-insumos').textContent = totalInsumos;
            document.getElementById('stock-total').textContent = stockTotal;
            document.getElementById('secciones-activas').textContent = seccionesActivas;
            document.getElementById('stock-critico').textContent = stockCritico.length;
            document.getElementById('vencimientos-proximos').textContent = vencimientos.length;
            
            this.renderAlertasStock(stockCritico);
            
        } catch (error) {
            console.error('Error cargando dashboard:', error);
            UI.showToast('Error al cargar dashboard', 'error');
        }
    },

    renderAlertasStock(items) {
        const container = document.getElementById('alertas-stock');
        if (!container) return;
        
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Todos los insumos tienen stock suficiente.</p></div>';
            return;
        }
        
        let html = '<div class="table-responsive"><div class="table-container"><table><thead><tr>';
        html += '<th>INSUMO</th><th>SECCIÓN</th><th>ANAQUEL</th><th>STOCK</th><th>UNIDAD</th><th>LOTE</th><th>VENCIMIENTO</th></tr></thead><tbody>';
        
        items.forEach(item => {
            const vencimiento = item.vencimiento ? new Date(item.vencimiento).toLocaleDateString('es-CL') : 'N/A';
            html += `<tr class="stock-critical">
                <td><strong>${item.nombre || 'N/A'}</strong></td>
                <td>${item.seccion || 'N/A'}</td>
                <td>${item.anaquel || 'N/A'}</td>
                <td><strong>${item.stock || 0}</strong></td>
                <td>${item.unidad || 'N/A'}</td>
                <td>${item.lote || 'N/A'}</td>
                <td>${vencimiento}</td>
            </tr>`;
        });
        
        html += '</tbody></table></div></div>';
        container.innerHTML = html;
    },

    renderInventario() {
        const container = document.getElementById('tabla-inventario');
        if (!container) return;
        
        const filtroCritico = document.getElementById('filtro-stock-critico')?.checked || false;
        const filtroPorVencer = document.getElementById('filtro-por-vencer')?.checked || false;
        const filtroVencidos = document.getElementById('filtro-vencidos')?.checked || false;
        
        let items = [...this.inventario];
        
        if (filtroCritico) {
            const config = { porcentaje_critico: 20 };
            items = items.filter(item => {
                const stock = item.stock || 0;
                return stock > 0 && stock <= (config.porcentaje_critico || 20);
            });
        }
        
        if (filtroPorVencer || filtroVencidos) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            
            items = items.filter(item => {
                if (!item.vencimiento) return false;
                const fechaVenc = new Date(item.vencimiento);
                fechaVenc.setHours(0, 0, 0, 0);
                
                if (filtroVencidos && filtroPorVencer) {
                    return fechaVenc <= hoy;
                } else if (filtroVencidos) {
                    return fechaVenc <= hoy;
                } else if (filtroPorVencer) {
                    const dias = (fechaVenc - hoy) / (1000 * 60 * 60 * 24);
                    return dias > 0 && dias <= 30;
                }
                return true;
            });
        }
        
        this.filteredInventario = items;
        document.getElementById('contador-inventario').textContent = items.length;
        
        if (items.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No hay insumos que coincidan con los filtros.</p></div>`;
            return;
        }
        
        let html = '<table><thead><tr>';
        html += '<th>INSUMO</th><th>SECCIÓN</th><th>ANAQUEL</th><th>STOCK</th><th>UNIDAD</th><th>LOTE</th><th>VENCIMIENTO</th><th>CÓDIGO</th><th>ACCIONES</th>';
        html += '</tr></thead><tbody>';
        
        items.forEach(item => {
            const isCritical = item.stock > 0 && item.stock <= 20;
            const isWarning = item.vencimiento && new Date(item.vencimiento) <= new Date(Date.now() + 30*24*60*60*1000);
            const isExpired = item.vencimiento && new Date(item.vencimiento) <= new Date();
            
            let rowClass = '';
            if (isCritical) rowClass = 'stock-critical';
            else if (isExpired) rowClass = 'stock-warning';
            else if (isWarning) rowClass = 'stock-warning';
            
            const vencimiento = item.vencimiento ? new Date(item.vencimiento).toLocaleDateString('es-CL') : 'N/A';
            
            html += `<tr class="${rowClass}">
                <td><strong>${item.nombre || 'N/A'}</strong></td>
                <td>${item.seccion || 'N/A'}</td>
                <td>${item.anaquel || 'N/A'}</td>
                <td><strong>${item.stock || 0}</strong></td>
                <td>${item.unidad || 'N/A'}</td>
                <td>${item.lote || 'N/A'}</td>
                <td>${vencimiento}</td>
                <td>${item.codigo_barras || 'N/A'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn btn-sm btn-primary" onclick="App.editarInsumo('${item.id}')">EDITAR</button>
                    <button class="btn btn-sm btn-danger" onclick="App.eliminarInsumo('${item.id}')">ELIMINAR</button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    renderMovimientos() {
        const container = document.getElementById('tabla-movimientos');
        if (!container) return;
        
        let items = [...this.movimientos];
        
        const tipoFiltro = document.getElementById('filtro-tipo-movimiento')?.value || 'TODOS';
        const usuarioFiltro = document.getElementById('filtro-usuario-movimiento')?.value || 'TODOS';
        const busqueda = document.getElementById('busqueda-movimientos')?.value?.toLowerCase() || '';
        
        if (tipoFiltro !== 'TODOS') {
            items = items.filter(item => item.tipo === tipoFiltro);
        }
        
        if (usuarioFiltro !== 'TODOS') {
            items = items.filter(item => item.usuario === usuarioFiltro);
        }
        
        if (busqueda) {
            items = items.filter(item => {
                const insumo = (item.insumo || '').toLowerCase();
                const anaquel = (item.anaquel || '').toLowerCase();
                const comentarios = (item.comentarios || '').toLowerCase();
                return insumo.includes(busqueda) || anaquel.includes(busqueda) || comentarios.includes(busqueda);
            });
        }
        
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No hay movimientos registrados.</p></div>';
            return;
        }
        
        let html = '<table><thead><tr>';
        html += '<th>FECHA</th><th>TIPO</th><th>INSUMO</th><th>CANTIDAD</th><th>STOCK ANTERIOR</th><th>STOCK NUEVO</th><th>ANAQUEL</th><th>USUARIO</th><th>COMENTARIOS</th>';
        html += '</tr></thead><tbody>';
        
        items.slice(0, 100).forEach(item => {
            const fecha = item.fecha ? new Date(item.fecha).toLocaleString('es-CL') : 'N/A';
            const tipo = item.tipo || 'N/A';
            const tipoClass = tipo === 'INGRESO' ? 'badge-success' : 
                            tipo === 'SALIDA' ? 'badge-danger' : 
                            tipo.includes('ELIMINACION') ? 'badge-danger' : 'badge-info';
            
            html += `<tr>
                <td style="font-size:11px;">${fecha}</td>
                <td><span class="badge ${tipoClass}">${tipo}</span></td>
                <td>${item.insumo || 'N/A'}</td>
                <td><strong>${item.cantidad || 0}</strong></td>
                <td>${item.stock_anterior !== undefined ? item.stock_anterior : 'N/A'}</td>
                <td>${item.stock_nuevo !== undefined ? item.stock_nuevo : 'N/A'}</td>
                <td>${item.anaquel || 'N/A'}</td>
                <td>${item.usuario || 'N/A'}</td>
                <td style="font-size:11px;">${item.comentarios || ''}</td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    async mostrarFormularioIngreso() {
        try {
            const secciones = await DB.getSecciones();
            const unidades = await DB.getUnidadesMedida();
            
            let html = `<h2>NUEVO INGRESO - ${window.currentBodega}</h2>
                <form id="form-ingreso">
                    <div class="form-group">
                        <label>NOMBRE DEL INSUMO *</label>
                        <input type="text" id="ingreso-nombre" required style="text-transform:uppercase;" placeholder="EJ: PARACETAMOL 500MG">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>SECCIÓN *</label>
                            <select id="ingreso-seccion" required>
                                ${secciones.map(s => `<option value="${s.seccion}">${s.seccion}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>ANAQUEL *</label>
                            <select id="ingreso-anaquel" required>
                                ${secciones.map(s => `<option value="${s.anaquel}">${s.anaquel}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>CANTIDAD *</label>
                            <input type="number" id="ingreso-cantidad" required min="1" value="1">
                        </div>
                        <div class="form-group">
                            <label>UNIDAD DE MEDIDA</label>
                            <select id="ingreso-unidad">
                                <option value="">SELECCIONAR</option>
                                ${unidades.map(u => `<option value="${u.nombre}">${u.nombre}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>LOTE</label>
                            <input type="text" id="ingreso-lote" style="text-transform:uppercase;" placeholder="LOTE">
                        </div>
                        <div class="form-group">
                            <label>FECHA DE VENCIMIENTO</label>
                            <input type="date" id="ingreso-vencimiento">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>CÓDIGO DE BARRAS</label>
                        <input type="text" id="ingreso-codigo" placeholder="CÓDIGO DE BARRAS">
                    </div>
                    <div class="form-group">
                        <label>COMENTARIOS</label>
                        <textarea id="ingreso-comentarios" style="text-transform:uppercase;" placeholder="COMENTARIOS ADICIONALES"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CANCELAR</button>
                        <button type="submit" class="btn btn-success">REGISTRAR INGRESO</button>
                    </div>
                </form>`;
            
            UI.openModal(html);
            
            document.getElementById('form-ingreso').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.procesarIngreso();
            });
            
            const seccionSelect = document.getElementById('ingreso-seccion');
            const anaquelSelect = document.getElementById('ingreso-anaquel');
            
            seccionSelect.addEventListener('change', () => {
                const seccion = seccionSelect.value;
                const options = secciones.filter(s => s.seccion === seccion);
                anaquelSelect.innerHTML = options.map(s => `<option value="${s.anaquel}">${s.anaquel}</option>`).join('');
            });
            
        } catch (error) {
            console.error('Error mostrando formulario de ingreso:', error);
            UI.showToast('Error al cargar formulario', 'error');
        }
    },

    async procesarIngreso() {
        const nombre = document.getElementById('ingreso-nombre').value.trim();
        const seccion = document.getElementById('ingreso-seccion').value;
        const anaquel = document.getElementById('ingreso-anaquel').value;
        const cantidad = parseInt(document.getElementById('ingreso-cantidad').value);
        const unidad = document.getElementById('ingreso-unidad').value;
        const lote = document.getElementById('ingreso-lote').value.trim();
        const vencimiento = document.getElementById('ingreso-vencimiento').value;
        const codigoBarras = document.getElementById('ingreso-codigo').value.trim();
        const comentarios = document.getElementById('ingreso-comentarios').value.trim();
        
        if (!nombre || !seccion || !anaquel || !cantidad || cantidad < 1) {
            UI.showToast('Complete todos los campos obligatorios', 'error');
            return;
        }
        
        try {
            const result = await DB.procesarIngreso(
                nombre, seccion, anaquel, cantidad, unidad, lote, vencimiento, codigoBarras, comentarios
            );
            
            UI.closeModal();
            UI.showToast(`Ingreso registrado: ${nombre} (${cantidad} ${unidad || 'unidades'})`, 'success');
            
            await this.recargarDatos();
            
        } catch (error) {
            console.error('Error procesando ingreso:', error);
            UI.showToast('Error al registrar ingreso: ' + error.message, 'error');
        }
    },

    async mostrarFormularioSalida() {
        try {
            let html = `<h2>NUEVA SALIDA - ${window.currentBodega}</h2>
                <form id="form-salida">
                    <div class="form-group">
                        <label>SELECCIONE INSUMO *</label>
                        <select id="salida-insumo" required style="width:100%; padding:8px;">
                            <option value="">SELECCIONAR INSUMO</option>
                            ${this.inventario.sort((a,b) => a.nombre?.localeCompare(b.nombre)).map(item => 
                                `<option value="${item.id}">${item.nombre} - STOCK: ${item.stock} ${item.unidad || ''} (${item.anaquel})</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>CANTIDAD A RETIRAR *</label>
                        <input type="number" id="salida-cantidad" required min="1" value="1">
                    </div>
                    <div class="form-group">
                        <label>COMENTARIOS</label>
                        <textarea id="salida-comentarios" style="text-transform:uppercase;" placeholder="MOTIVO DE LA SALIDA"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CANCELAR</button>
                        <button type="submit" class="btn btn-danger">REGISTRAR SALIDA</button>
                    </div>
                </form>`;
            
            UI.openModal(html);
            
            document.getElementById('form-salida').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.procesarSalida();
            });
            
        } catch (error) {
            console.error('Error mostrando formulario de salida:', error);
            UI.showToast('Error al cargar formulario', 'error');
        }
    },

    async procesarSalida() {
        const itemId = document.getElementById('salida-insumo').value;
        const cantidad = parseInt(document.getElementById('salida-cantidad').value);
        const comentarios = document.getElementById('salida-comentarios').value.trim();
        
        if (!itemId || !cantidad || cantidad < 1) {
            UI.showToast('Seleccione un insumo y una cantidad válida', 'error');
            return;
        }
        
        try {
            const item = this.inventario.find(i => i.id === itemId);
            if (!item) {
                UI.showToast('Insumo no encontrado', 'error');
                return;
            }
            
            if (cantidad > item.stock) {
                UI.showToast(`Stock insuficiente. Disponible: ${item.stock} ${item.unidad || 'unidades'}`, 'error');
                return;
            }
            
            const result = await DB.procesarSalida(itemId, cantidad, comentarios);
            
            UI.closeModal();
            UI.showToast(`Salida registrada: ${item.nombre} (${cantidad} ${item.unidad || 'unidades'})`, 'success');
            
            await this.recargarDatos();
            
        } catch (error) {
            console.error('Error procesando salida:', error);
            UI.showToast('Error al registrar salida: ' + error.message, 'error');
        }
    },

    async buscarAnaquel() {
        try {
            let html = `<h2>BUSCAR POR ANAQUEL</h2>
                <div class="form-group">
                    <label>INGRESE NÚMERO DE ANAQUEL</label>
                    <input type="text" id="buscar-anaquel-input" placeholder="EJ: A-01" style="text-transform:uppercase;">
                </div>
                <div id="resultado-busqueda-anaquel"></div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CERRAR</button>
                    <button type="button" class="btn btn-primary" id="btn-buscar-anaquel-action">BUSCAR</button>
                </div>`;
            
            UI.openModal(html);
            
            document.getElementById('btn-buscar-anaquel-action').addEventListener('click', async () => {
                const anaquel = document.getElementById('buscar-anaquel-input').value.trim().toUpperCase();
                if (!anaquel) {
                    UI.showToast('Ingrese un número de anaquel', 'warning');
                    return;
                }
                
                const resultados = this.inventario.filter(item => 
                    item.anaquel && item.anaquel.toUpperCase().includes(anaquel)
                );
                
                const container = document.getElementById('resultado-busqueda-anaquel');
                if (resultados.length === 0) {
                    container.innerHTML = '<div class="empty-state"><p>No se encontraron insumos en este anaquel.</p></div>';
                    return;
                }
                
                let html = '<div class="table-responsive"><div class="table-container"><table><thead><tr>';
                html += '<th>INSUMO</th><th>SECCIÓN</th><th>ANAQUEL</th><th>STOCK</th><th>UNIDAD</th><th>LOTE</th><th>VENCIMIENTO</th></tr></thead><tbody>';
                
                resultados.forEach(item => {
                    const vencimiento = item.vencimiento ? new Date(item.vencimiento).toLocaleDateString('es-CL') : 'N/A';
                    html += `<tr>
                        <td><strong>${item.nombre || 'N/A'}</strong></td>
                        <td>${item.seccion || 'N/A'}</td>
                        <td>${item.anaquel || 'N/A'}</td>
                        <td><strong>${item.stock || 0}</strong></td>
                        <td>${item.unidad || 'N/A'}</td>
                        <td>${item.lote || 'N/A'}</td>
                        <td>${vencimiento}</td>
                    </tr>`;
                });
                
                html += '</tbody></table></div></div>';
                html += `<p style="margin-top:10px; text-align:center; font-size:13px; color:#666;">Total: ${resultados.length} insumos encontrados</p>`;
                container.innerHTML = html;
            });
            
        } catch (error) {
            console.error('Error en búsqueda por anaquel:', error);
            UI.showToast('Error al buscar', 'error');
        }
    },

    async gestionarConfiguracion() {
        try {
            const secciones = await DB.getSecciones();
            const unidades = await DB.getUnidadesMedida();
            
            let html = `<h2>GESTIÓN DE SECCIONES Y UNIDADES</h2>
                <div style="margin-bottom:20px;">
                    <h3 style="color:var(--primary); font-size:14px; margin-bottom:10px;">SECCIONES Y ANAQUELES</h3>
                    <div class="form-group">
                        <label>NUEVA SECCIÓN</label>
                        <input type="text" id="nueva-seccion" placeholder="EJ: MEDICAMENTOS" style="text-transform:uppercase;">
                    </div>
                    <div class="form-group">
                        <label>NUEVO ANAQUEL</label>
                        <input type="text" id="nuevo-anaquel" placeholder="EJ: A-01" style="text-transform:uppercase;">
                    </div>
                    <button class="btn btn-primary" id="btn-agregar-seccion">AGREGAR SECCIÓN</button>
                    <div style="margin-top:15px; max-height:200px; overflow-y:auto;">
                        <table>
                            <thead><tr><th>SECCIÓN</th><th>ANAQUEL</th><th>ACCIONES</th></tr></thead>
                            <tbody>
                                ${secciones.map(s => `
                                    <tr>
                                        <td>${s.seccion}</td>
                                        <td>${s.anaquel}</td>
                                        <td><button class="btn btn-sm btn-danger" onclick="App.eliminarSeccion('${s.id}')">ELIMINAR</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div style="border-top:1px solid #eee; padding-top:20px;">
                    <h3 style="color:var(--primary); font-size:14px; margin-bottom:10px;">UNIDADES DE MEDIDA</h3>
                    <div class="form-group">
                        <label>NUEVA UNIDAD</label>
                        <input type="text" id="nueva-unidad" placeholder="EJ: MG, ML, GR, UNIDAD" style="text-transform:uppercase;">
                    </div>
                    <button class="btn btn-primary" id="btn-agregar-unidad">AGREGAR UNIDAD</button>
                    <div style="margin-top:15px; max-height:150px; overflow-y:auto;">
                        <table>
                            <thead><tr><th>UNIDAD</th><th>ACCIONES</th></tr></thead>
                            <tbody>
                                ${unidades.map(u => `
                                    <tr>
                                        <td>${u.nombre}</td>
                                        <td><button class="btn btn-sm btn-danger" onclick="App.eliminarUnidad('${u.id}')">ELIMINAR</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CERRAR</button>
                </div>`;
            
            UI.openModal(html);
            
            document.getElementById('btn-agregar-seccion').addEventListener('click', async () => {
                const seccion = document.getElementById('nueva-seccion').value.trim().toUpperCase();
                const anaquel = document.getElementById('nuevo-anaquel').value.trim().toUpperCase();
                
                if (!seccion || !anaquel) {
                    UI.showToast('Complete ambos campos', 'warning');
                    return;
                }
                
                try {
                    await DB.addSeccion(seccion, null, anaquel);
                    UI.showToast('Sección agregada correctamente', 'success');
                    UI.closeModal();
                    await this.recargarDatos();
                    this.gestionarConfiguracion();
                } catch (error) {
                    UI.showToast('Error: ' + error.message, 'error');
                }
            });
            
            document.getElementById('btn-agregar-unidad').addEventListener('click', async () => {
                const nombre = document.getElementById('nueva-unidad').value.trim().toUpperCase();
                
                if (!nombre) {
                    UI.showToast('Ingrese una unidad', 'warning');
                    return;
                }
                
                try {
                    await DB.addUnidadMedida(nombre);
                    UI.showToast('Unidad agregada correctamente', 'success');
                    UI.closeModal();
                    await this.recargarDatos();
                    this.gestionarConfiguracion();
                } catch (error) {
                    UI.showToast('Error: ' + error.message, 'error');
                }
            });
            
        } catch (error) {
            console.error('Error en gestión de configuración:', error);
            UI.showToast('Error al cargar configuración', 'error');
        }
    },

    async eliminarSeccion(id) {
        if (!confirm('¿Eliminar esta sección?')) return;
        try {
            await DB.deleteSeccion(id);
            UI.showToast('Sección eliminada', 'success');
            UI.closeModal();
            await this.recargarDatos();
            this.gestionarConfiguracion();
        } catch (error) {
            UI.showToast('Error al eliminar: ' + error.message, 'error');
        }
    },

    async eliminarUnidad(id) {
        if (!confirm('¿Eliminar esta unidad?')) return;
        try {
            await DB.deleteUnidadMedida(id);
            UI.showToast('Unidad eliminada', 'success');
            UI.closeModal();
            await this.recargarDatos();
            this.gestionarConfiguracion();
        } catch (error) {
            UI.showToast('Error al eliminar: ' + error.message, 'error');
        }
    },

    async editarInsumo(id) {
        try {
            const item = this.inventario.find(i => i.id === id);
            if (!item) {
                UI.showToast('Insumo no encontrado', 'error');
                return;
            }
            
            const secciones = await DB.getSecciones();
            const unidades = await DB.getUnidadesMedida();
            
            let html = `<h2>EDITAR INSUMO</h2>
                <form id="form-editar">
                    <div class="form-group">
                        <label>NOMBRE DEL INSUMO *</label>
                        <input type="text" id="editar-nombre" value="${item.nombre || ''}" required style="text-transform:uppercase;">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>SECCIÓN *</label>
                            <select id="editar-seccion" required>
                                ${secciones.map(s => `<option value="${s.seccion}" ${s.seccion === item.seccion ? 'selected' : ''}>${s.seccion}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>ANAQUEL *</label>
                            <select id="editar-anaquel" required>
                                ${secciones.map(s => `<option value="${s.anaquel}" ${s.anaquel === item.anaquel ? 'selected' : ''}>${s.anaquel}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>STOCK</label>
                            <input type="number" id="editar-stock" value="${item.stock || 0}" min="0">
                        </div>
                        <div class="form-group">
                            <label>UNIDAD DE MEDIDA</label>
                            <select id="editar-unidad">
                                <option value="">SELECCIONAR</option>
                                ${unidades.map(u => `<option value="${u.nombre}" ${u.nombre === item.unidad ? 'selected' : ''}>${u.nombre}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>LOTE</label>
                            <input type="text" id="editar-lote" value="${item.lote || ''}" style="text-transform:uppercase;">
                        </div>
                        <div class="form-group">
                            <label>FECHA DE VENCIMIENTO</label>
                            <input type="date" id="editar-vencimiento" value="${item.vencimiento || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>CÓDIGO DE BARRAS</label>
                        <input type="text" id="editar-codigo" value="${item.codigo_barras || ''}">
                    </div>
                    <div class="form-group">
                        <label>COMENTARIOS</label>
                        <textarea id="editar-comentarios" style="text-transform:uppercase;">${item.comentarios || ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CANCELAR</button>
                        <button type="submit" class="btn btn-primary">ACTUALIZAR</button>
                    </div>
                </form>`;
            
            UI.openModal(html);
            
            document.getElementById('form-editar').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.procesarEdicion(id);
            });
            
        } catch (error) {
            console.error('Error mostrando edición:', error);
            UI.showToast('Error al cargar datos', 'error');
        }
    },

    async procesarEdicion(id) {
        const nombre = document.getElementById('editar-nombre').value.trim();
        const seccion = document.getElementById('editar-seccion').value;
        const anaquel = document.getElementById('editar-anaquel').value;
        const stock = parseInt(document.getElementById('editar-stock').value) || 0;
        const unidad = document.getElementById('editar-unidad').value;
        const lote = document.getElementById('editar-lote').value.trim();
        const vencimiento = document.getElementById('editar-vencimiento').value;
        const codigoBarras = document.getElementById('editar-codigo').value.trim();
        const comentarios = document.getElementById('editar-comentarios').value.trim();
        
        if (!nombre || !seccion || !anaquel) {
            UI.showToast('Complete los campos obligatorios', 'error');
            return;
        }
        
        try {
            const oldItem = this.inventario.find(i => i.id === id);
            
            const updates = {
                nombre, seccion, anaquel, stock, unidad, lote, vencimiento, codigo_barras: codigoBarras, comentarios
            };
            
            await DB.updateInventarioItem(id, updates);
            
            if (oldItem && oldItem.stock !== stock) {
                await DB.addMovimiento({
                    tipo: 'EDICION',
                    insumo: nombre,
                    cantidad: stock - oldItem.stock,
                    stock_anterior: oldItem.stock,
                    stock_nuevo: stock,
                    anaquel,
                    comentarios: `EDICIÓN DE STOCK: ${oldItem.stock} -> ${stock}`
                });
            }
            
            UI.closeModal();
            UI.showToast('Insumo actualizado correctamente', 'success');
            await this.recargarDatos();
            
        } catch (error) {
            console.error('Error actualizando insumo:', error);
            UI.showToast('Error al actualizar: ' + error.message, 'error');
        }
    },

    async eliminarInsumo(id) {
        if (!confirm('¿Eliminar este insumo del inventario?')) return;
        try {
            const item = this.inventario.find(i => i.id === id);
            if (!item) {
                UI.showToast('Insumo no encontrado', 'error');
                return;
            }
            
            await DB.deleteInventarioItem(id);
            
            await DB.addMovimiento({
                tipo: 'ELIMINACION',
                insumo: item.nombre,
                cantidad: item.stock || 0,
                stock_anterior: item.stock || 0,
                stock_nuevo: 0,
                anaquel: item.anaquel,
                comentarios: 'ELIMINACIÓN DE INSUMO'
            });
            
            UI.showToast('Insumo eliminado', 'success');
            await this.recargarDatos();
            
        } catch (error) {
            console.error('Error eliminando insumo:', error);
            UI.showToast('Error al eliminar: ' + error.message, 'error');
        }
    },

    async recargarDatos() {
        try {
            await this.cargarDatosIniciales();
            
            if (this.currentSection === 'dashboard') {
                this.loadDashboard();
            } else if (this.currentSection === 'inventario') {
                this.renderInventario();
            } else if (this.currentSection === 'movimientos') {
                this.renderMovimientos();
            }
        } catch (error) {
            console.error('Error recargando datos:', error);
            UI.showToast('Error al recargar datos', 'error');
        }
    },

    async exportarInventarioExcel() {
        try {
            const items = this.filteredInventario.length > 0 ? this.filteredInventario : this.inventario;
            
            if (items.length === 0) {
                UI.showToast('No hay datos para exportar', 'warning');
                return;
            }
            
            let csv = 'INSUMO,SECCIÓN,ANAQUEL,STOCK,UNIDAD,LOTE,VENCIMIENTO,CÓDIGO BARRAS,COMENTARIOS\n';
            
            items.forEach(item => {
                const vencimiento = item.vencimiento ? new Date(item.vencimiento).toLocaleDateString('es-CL') : '';
                const row = [
                    `"${item.nombre || ''}"`,
                    `"${item.seccion || ''}"`,
                    `"${item.anaquel || ''}"`,
                    item.stock || 0,
                    `"${item.unidad || ''}"`,
                    `"${item.lote || ''}"`,
                    `"${vencimiento}"`,
                    `"${item.codigo_barras || ''}"`,
                    `"${item.comentarios || ''}"`
                ].join(',');
                csv += row + '\n';
            });
            
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `inventario_${window.currentBodega}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            
            UI.showToast('Exportación completada', 'success');
            
        } catch (error) {
            console.error('Error exportando inventario:', error);
            UI.showToast('Error al exportar', 'error');
        }
    },

    async generarCodigosBarras() {
        try {
            const items = this.inventario.filter(item => item.codigo_barras && item.codigo_barras.trim() !== '');
            
            if (items.length === 0) {
                UI.showToast('No hay insumos con código de barras registrado', 'warning');
                return;
            }
            
            let html = `<h2>GENERAR CÓDIGOS DE BARRAS</h2>
                <div style="margin-bottom:20px;">
                    <div class="form-group">
                        <label>SELECCIONE INSUMO</label>
                        <select id="cb-seleccion-insumo" style="width:100%; padding:8px;">
                            <option value="TODOS">TODOS LOS INSUMOS (${items.length})</option>
                            ${items.sort((a,b) => a.nombre?.localeCompare(b.nombre)).map(item => 
                                `<option value="${item.id}">${item.nombre} - ${item.codigo_barras}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn btn-primary" id="btn-generar-cb-seleccion" style="flex:1;">GENERAR CÓDIGO SELECCIONADO</button>
                        <button class="btn btn-success" id="btn-generar-cb-todos" style="flex:1;">GENERAR TODOS</button>
                    </div>
                </div>
                <div id="contenedor-codigos-barras" style="margin-top:20px; max-height:500px; overflow-y:auto; padding:10px; border:1px solid #eee; border-radius:5px;"></div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CERRAR</button>
                    <button type="button" class="btn btn-info" id="btn-imprimir-cb" onclick="imprimirCodigosBarras()">IMPRIMIR</button>
                </div>`;
            
            UI.openModal(html);
            
            document.getElementById('btn-generar-cb-seleccion').addEventListener('click', () => {
                const select = document.getElementById('cb-seleccion-insumo');
                const value = select.value;
                if (value === 'TODOS') {
                    this.generarTodosCodigosBarras(items);
                } else {
                    const item = items.find(i => i.id === value);
                    if (item) {
                        this.generarCodigoBarrasIndividual(item);
                    }
                }
            });
            
            document.getElementById('btn-generar-cb-todos').addEventListener('click', () => {
                this.generarTodosCodigosBarras(items);
            });
            
        } catch (error) {
            console.error('Error generando códigos de barras:', error);
            UI.showToast('Error al generar códigos', 'error');
        }
    },

    generarCodigoBarrasIndividual(item) {
        const container = document.getElementById('contenedor-codigos-barras');
        if (!container) return;
        
        const svg = this.generarSVGCodigoBarras(item.codigo_barras, item.nombre);
        container.innerHTML = `
            <div style="text-align:center; margin-bottom:20px; border-bottom:1px dashed #ddd; padding-bottom:20px;">
                ${svg}
                <p style="margin-top:5px; font-size:12px; color:#666;">${item.nombre} - ${item.codigo_barras}</p>
            </div>
        `;
        
        UI.showToast(`Código generado para: ${item.nombre}`, 'success');
    },

    generarTodosCodigosBarras(items) {
        const container = document.getElementById('contenedor-codigos-barras');
        if (!container) return;
        
        let html = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:20px;">';
        
        items.forEach(item => {
            const svg = this.generarSVGCodigoBarras(item.codigo_barras, item.nombre);
            html += `
                <div style="text-align:center; border:1px solid #eee; padding:15px; border-radius:5px; background:white;">
                    ${svg}
                    <p style="margin-top:5px; font-size:11px; color:#666;">${item.nombre}</p>
                    <p style="font-size:10px; color:#999;">${item.codigo_barras}</p>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        UI.showToast(`Generados ${items.length} códigos de barras`, 'success');
    },

    generarSVGCodigoBarras(codigo, nombre) {
        if (!codigo) return '';
        
        const width = 200;
        const height = 80;
        const barWidth = 2;
        const barHeight = 50;
        const marginLeft = 20;
        const marginTop = 10;
        
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width:100%; height:auto;">`;
        svg += `<rect width="${width}" height="${height}" fill="white"/>`;
        
        let x = marginLeft;
        const codeStr = codigo.toString();
        
        for (let i = 0; i < codeStr.length; i++) {
            const char = codeStr[i];
            const code = char.charCodeAt(0);
            const pattern = this.generarPatternBarras(code);
            
            for (let j = 0; j < pattern.length; j++) {
                if (pattern[j] === '1') {
                    svg += `<rect x="${x}" y="${marginTop}" width="${barWidth}" height="${barHeight}" fill="black"/>`;
                }
                x += barWidth;
            }
            x += barWidth;
        }
        
        if (nombre) {
            const nombreTruncado = nombre.length > 20 ? nombre.substring(0, 20) + '...' : nombre;
            svg += `<text x="${width/2}" y="${height - 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#333">${nombreTruncado}</text>`;
        }
        
        svg += `<text x="${width/2}" y="${marginTop + barHeight + 15}" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#666">${codigo}</text>`;
        svg += '</svg>';
        
        return svg;
    },

    generarPatternBarras(code) {
        const patterns = {
            '0': '00110',
            '1': '10001',
            '2': '01001',
            '3': '11000',
            '4': '00101',
            '5': '10100',
            '6': '01100',
            '7': '00011',
            '8': '10010',
            '9': '01010'
        };
        return patterns[String.fromCharCode(code)] || '00110';
    },

    async gestionarUsuarios() {
        try {
            const { data: usuarios, error } = await supabaseClient.from('usuarios').select('*').order('usuario');
            if (error) throw error;
            
            let html = `<h2>GESTIÓN DE USUARIOS</h2>
                <div style="max-height:400px; overflow-y:auto;">
                    <table>
                        <thead><tr><th>USUARIO</th><th>NOMBRE</th><th>ROL</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
                        <tbody>
                            ${usuarios.map(u => `
                                <tr>
                                    <td>${u.usuario}</td>
                                    <td>${u.nombre || ''}</td>
                                    <td>${u.rol || ''}</td>
                                    <td>${u.activo ? '<span class="badge badge-success">ACTIVO</span>' : '<span class="badge badge-danger">PENDIENTE</span>'}</td>
                                    <td>
                                        ${!u.activo ? `<button class="btn btn-sm btn-success" onclick="App.activarUsuario('${u.id}')">ACTIVAR</button>` : ''}
                                        ${u.rol !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="App.eliminarUsuario('${u.id}')">ELIMINAR</button>` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">CERRAR</button>
                </div>`;
            
            UI.openModal(html);
            
        } catch (error) {
            console.error('Error gestionando usuarios:', error);
            UI.showToast('Error al cargar usuarios', 'error');
        }
    },

    async activarUsuario(id) {
        try {
            const { error } = await supabaseClient.from('usuarios').update({ activo: true, rol: 'usuario' }).eq('id', id);
            if (error) throw error;
            UI.showToast('Usuario activado correctamente', 'success');
            UI.closeModal();
            this.gestionarUsuarios();
        } catch (error) {
            UI.showToast('Error al activar usuario', 'error');
        }
    },

    async eliminarUsuario(id) {
        if (!confirm('¿Eliminar este usuario?')) return;
        try {
            const { error } = await supabaseClient.from('usuarios').delete().eq('id', id);
            if (error) throw error;
            UI.showToast('Usuario eliminado', 'success');
            UI.closeModal();
            this.gestionarUsuarios();
        } catch (error) {
            UI.showToast('Error al eliminar usuario', 'error');
        }
    },

    async exportarMovimientosExcel() {
        try {
            const items = this.movimientos.slice(0, 1000);
            
            if (items.length === 0) {
                UI.showToast('No hay movimientos para exportar', 'warning');
                return;
            }
            
            let csv = 'FECHA,TIPO,INSUMO,CANTIDAD,STOCK ANTERIOR,STOCK NUEVO,ANAQUEL,USUARIO,COMENTARIOS\n';
            
            items.forEach(item => {
                const fecha = item.fecha ? new Date(item.fecha).toLocaleString('es-CL') : '';
                const row = [
                    `"${fecha}"`,
                    `"${item.tipo || ''}"`,
                    `"${item.insumo || ''}"`,
                    item.cantidad || 0,
                    item.stock_anterior !== undefined ? item.stock_anterior : '',
                    item.stock_nuevo !== undefined ? item.stock_nuevo : '',
                    `"${item.anaquel || ''}"`,
                    `"${item.usuario || ''}"`,
                    `"${item.comentarios || ''}"`
                ].join(',');
                csv += row + '\n';
            });
            
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `movimientos_${window.currentBodega}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            
            UI.showToast('Exportación completada', 'success');
            
        } catch (error) {
            console.error('Error exportando movimientos:', error);
            UI.showToast('Error al exportar', 'error');
        }
    }
};

function imprimirCodigosBarras() {
    const container = document.getElementById('contenedor-codigos-barras');
    if (!container || container.innerHTML.trim() === '') {
        UI.showToast('No hay códigos para imprimir', 'warning');
        return;
    }
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        UI.showToast('Por favor, permita las ventanas emergentes para imprimir', 'warning');
        return;
    }
    
    const styles = document.querySelector('style')?.innerHTML || '';
    const title = `CÓDIGOS DE BARRAS - ${window.currentBodega}`;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                ${styles}
                body { padding: 20px; font-family: Arial, sans-serif; }
                .cb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
                .cb-item { text-align: center; border: 1px solid #eee; padding: 10px; page-break-inside: avoid; }
                .cb-item svg { max-width: 100%; height: auto; }
                .cb-item p { margin: 5px 0; font-size: 10px; color: #666; }
                @media print {
                    .cb-item { border: none; page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <h1 style="text-align:center; color:#1a3a6b; margin-bottom:20px;">${title}</h1>
            <div class="cb-grid">
                ${container.innerHTML}
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    window.close();
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.App = App;
window.imprimirCodigosBarras = imprimirCodigosBarras;
