const META_SAVE_IDS = ['meta-variedad', 'meta-trazabilidad', 'meta-rotulo', 'meta-dias-preco', 'meta-num-cosecha', 'meta-responsable', 'meta-hora'];
        const META_STORAGE_KEY = 'tiempos-operativo-meta-v3';
        const metaForm = document.getElementById('form-operativo-meta');
        const metaAccordion = document.getElementById('meta-accordion');
        const metaAccordionTrigger = document.getElementById('meta-accordion-trigger');
        const metaAccordionPanel = document.getElementById('meta-accordion-panel');
        const fabMenu = document.getElementById('fab-menu');
        const fabOptionsBtn = document.getElementById('fab-options-btn');

        function actualizarIconos() {
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        }

        function mostrarAlertaRegla(titulo, texto) {
            if (window.Swal && typeof window.Swal.fire === 'function') {
                window.Swal.fire({
                    icon: 'warning',
                    title: titulo,
                    text: texto,
                    confirmButtonText: 'Entendido'
                });
                return;
            }
            alert(texto);
        }

        // Corrige texto mojibake heredado de codificaciones previas.
        function corregirTextoCodificado(texto) {
            if (typeof texto !== 'string') return texto;
            return texto
                .replaceAll('JÃºpiter', 'Júpiter')
                .replaceAll('RÃ³tulo', 'Rótulo')
                .replaceAll('DÃ­as', 'Días')
                .replaceAll('nÃºmero', 'número')
                .replaceAll('Opciones rÃ¡pidas', 'Opciones rápidas')
                .replaceAll('mediciÃ³n', 'medición')
                .replaceAll('ObservaciÃ³n', 'Observación')
                .replaceAll('observaciÃ³n', 'observación')
                .replaceAll('OBSERVACIÃ“N', 'OBSERVACIÓN')
                .replaceAll('condiciÃ³n', 'condición')
                .replaceAll('envÃ­o', 'envío')
                .replaceAll('VEHÃCULO', 'VEHÍCULO')
                .replaceAll('GUÃA', 'GUÍA')
                .replaceAll('REMISIÃ“N', 'REMISIÓN')
                .replaceAll('PresiÃ³n', 'Presión')
                .replaceAll('TÃ©rmino', 'Término')
                .replaceAll('pÃ©rdida', 'pérdida')
                .replaceAll('TÂ°', 'T°')
                .replaceAll('Â°C', '°C')
                .replaceAll(' Â· ', ' · ');
        }

        function actualizarVistaCompacta() {
            const v = document.getElementById('meta-variedad')?.value?.trim() ?? '';
            const t = document.getElementById('meta-trazabilidad')?.value?.trim() ?? '';
            const pv = document.getElementById('preview-variedad');
            const pt = document.getElementById('preview-traz');
            if (pv) {
                pv.textContent = v || 'Variedad';
                pv.classList.toggle('meta-preview-pill--empty', !v);
            }
            if (pt) {
                const show = t ? (t.length > 40 ? t.slice(0, 38) + '...' : t) : '';
                pt.textContent = show || 'Trazabilidad';
                pt.classList.toggle('meta-preview-pill--empty', !t);
            }
        }

        function establecerAcordeonMetaAbierto(open) {
            if (!metaAccordion || !metaAccordionTrigger || !metaAccordionPanel) return;
            metaAccordion.classList.toggle('is-open', open);
            metaAccordionTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            metaAccordionPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
        }

        metaAccordionTrigger?.addEventListener('click', () => {
            establecerAcordeonMetaAbierto(!metaAccordion?.classList.contains('is-open'));
        });

        function cargarMetaDesdeAlmacenamiento() {
            let raw = null;
            try {
                raw = localStorage.getItem(META_STORAGE_KEY);
            } catch (e) { /* ignore */ }
            if (!raw) return false;
            try {
                const o = JSON.parse(raw);
                META_SAVE_IDS.forEach((id) => {
                    if (o[id] !== undefined && o[id] !== null) {
                        const el = document.getElementById(id);
                        if (el) el.value = corregirTextoCodificado(String(o[id]));
                    }
                });
                return true;
            } catch (e) {
                return false;
            }
        }

        function guardarMetaEnAlmacenamiento() {
            const o = {};
            META_SAVE_IDS.forEach((id) => {
                const el = document.getElementById(id);
                if (el) o[id] = el.value;
            });
            try {
                localStorage.setItem(META_STORAGE_KEY, JSON.stringify(o));
            } catch (e) { /* ignore */ }
        }

        let metaSaveTimer = null;
        function programarGuardadoMeta() {
            clearTimeout(metaSaveTimer);
            metaSaveTimer = setTimeout(guardarMetaEnAlmacenamiento, 280);
        }

        function campoCompleto(id) {
            const el = document.getElementById(id);
            if (!el) return false;
            const v = el.value;
            if (v === undefined || v === null) return false;
            return String(v).trim() !== '';
        }

        function progresoMetaCompletado() {
            let n = 0;
            if (campoCompleto('meta-variedad')) n++;
            if (campoCompleto('meta-trazabilidad')) n++;
            if (campoCompleto('meta-rotulo')) n++;
            if (campoCompleto('meta-dias-preco') && campoCompleto('meta-num-cosecha')) n++;
            if (campoCompleto('meta-responsable')) n++;
            if (campoCompleto('meta-hora')) n++;
            return n;
        }

        function actualizarProgresoMeta() {
            const done = progresoMetaCompletado();
            const max = 6;
            const pct = (done / max) * 100;
            const fill = document.getElementById('meta-progress-fill');
            const txt = document.getElementById('meta-progress-text');
            if (fill) fill.style.width = pct + '%';
            if (txt) txt.textContent = done + ' / ' + max;
        }

        function sincronizarChipsDesdeAlmacenamiento() {
            document.querySelectorAll('[data-chip-group]').forEach((group) => {
                const tid = group.getAttribute('data-target');
                const val = document.getElementById(tid)?.value;
                group.querySelectorAll('.meta-chip').forEach((chip) => {
                    chip.classList.toggle('is-on', val !== '' && chip.getAttribute('data-value') === val);
                });
            });
            document.querySelectorAll('[data-chip-group-pair]').forEach((group) => {
                const dEl = document.getElementById(group.getAttribute('data-target-dias'));
                const cEl = document.getElementById(group.getAttribute('data-target-cose'));
                const dVal = dEl?.value;
                const cVal = cEl?.value;
                group.querySelectorAll('.meta-chip').forEach((chip) => {
                    const match = dVal === chip.getAttribute('data-dias') && cVal === chip.getAttribute('data-cose');
                    chip.classList.toggle('is-on', match);
                });
            });
        }

        function conectarGruposChips() {
            document.querySelectorAll('[data-chip-group]').forEach((group) => {
                const tid = group.getAttribute('data-target');
                const input = document.getElementById(tid);
                group.querySelectorAll('.meta-chip').forEach((chip) => {
                    chip.addEventListener('click', () => {
                        group.querySelectorAll('.meta-chip').forEach((c) => c.classList.remove('is-on'));
                        chip.classList.add('is-on');
                        if (input) input.value = chip.getAttribute('data-value') || '';
                        if (tid === 'meta-rotulo') {
                            aplicarCambioEnsayoActivo();
                        }
                        actualizarVistaCompacta();
                        programarGuardadoMeta();
                        actualizarProgresoMeta();
                    });
                });
            });
            document.querySelectorAll('[data-chip-group-pair]').forEach((group) => {
                const dId = group.getAttribute('data-target-dias');
                const cId = group.getAttribute('data-target-cose');
                const dIn = document.getElementById(dId);
                const cIn = document.getElementById(cId);
                group.querySelectorAll('.meta-chip').forEach((chip) => {
                    chip.addEventListener('click', () => {
                        group.querySelectorAll('.meta-chip').forEach((c) => c.classList.remove('is-on'));
                        chip.classList.add('is-on');
                        if (dIn) dIn.value = chip.getAttribute('data-dias') || '';
                        if (cIn) cIn.value = chip.getAttribute('data-cose') || '';
                        actualizarVistaCompacta();
                        programarGuardadoMeta();
                        actualizarProgresoMeta();
                    });
                });
            });
        }

        if (metaForm) {
            metaForm.addEventListener('submit', (e) => e.preventDefault());
            metaForm.addEventListener('input', () => {
                programarGuardadoMeta();
                actualizarProgresoMeta();
            });
            metaForm.addEventListener('change', () => {
                programarGuardadoMeta();
                actualizarProgresoMeta();
            });
        }

        const metaEnterOrder = ['meta-responsable', 'meta-hora'];
        metaEnterOrder.forEach((id, i) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const next = document.getElementById(metaEnterOrder[i + 1]);
                if (next) next.focus();
            });
        });

        document.getElementById('meta-btn-ahora')?.addEventListener('click', () => {
            const h = document.getElementById('meta-hora');
            if (h) {
                const now = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                h.value = pad(now.getHours()) + ':' + pad(now.getMinutes());
                h.focus();
                programarGuardadoMeta();
                actualizarProgresoMeta();
            }
        });

        conectarGruposChips();
        cargarMetaDesdeAlmacenamiento();
        sincronizarChipsDesdeAlmacenamiento();
        actualizarVistaCompacta();
        actualizarProgresoMeta();
        function metricaVacia() {
            return {
                tiempo: { inicioCosecha: '', inicioPerdida: '', terminoCosecha: '', llegadaAcopio: '', despachoAcopio: '' },
                temperatura: {
                    inicioAmbiente: '', inicioPulpa: '',
                    terminoAmbiente: '', terminoPulpa: '',
                    llegadaAmbiente: '', llegadaPulpa: '',
                    despachoAmbiente: '', despachoPulpa: '',
                    presionAmbienteInicio: '', presionAmbienteTermino: '', presionAmbienteLlegada: '', presionAmbienteDespacho: '',
                    presionFrutaInicio: '', presionFrutaTermino: '', presionFrutaLlegada: '', presionFrutaDespacho: ''
                },
                humedad: { inicio: '', termino: '', llegada: '', despacho: '' }
            };
        }

        const data = [
            {
                id: 1, jarra: 1, ensayo: 'Ensayo 1', p1: 145.0, p2: 144.8, acopio: 144.7, despacho: 144.6, observacion: '', placaVehiculo: '9967-OK', guiaRemision: '208353',
                metric: {
                    tiempo: { inicioCosecha: '07:15', inicioPerdida: '07:27', terminoCosecha: '07:53', llegadaAcopio: '08:20', despachoAcopio: '09:06' },
                    temperatura: {
                        inicioAmbiente: '22.0', inicioPulpa: '25.0',
                        terminoAmbiente: '23.6', terminoPulpa: '26.0',
                        llegadaAmbiente: '24.4', llegadaPulpa: '27.0',
                        despachoAmbiente: '25.0', despachoPulpa: '26.0',
                        presionAmbienteInicio: '', presionAmbienteTermino: '', presionAmbienteLlegada: '', presionAmbienteDespacho: '',
                        presionFrutaInicio: '', presionFrutaTermino: '', presionFrutaLlegada: '', presionFrutaDespacho: ''
                    },
                    humedad: { inicio: '67.9', termino: '66.6', llegada: '65.2', despacho: '64.0' }
                }
            },
            { id: 2, jarra: 1, ensayo: 'Ensayo 1', p1: 143.6, p2: 143.5, acopio: 143.4, despacho: 143.3, observacion: '', placaVehiculo: '', guiaRemision: '', metric: metricaVacia() },
            { id: 5, jarra: 3, ensayo: 'Ensayo 2', p1: 0, p2: 143.8, acopio: 143.7, despacho: 143.6, observacion: '', placaVehiculo: '', guiaRemision: '', metric: metricaVacia() },
            { id: 8, jarra: 3, ensayo: 'Ensayo 2', p1: 0, p2: 144.3, acopio: 144.1, despacho: 143.9, observacion: '', placaVehiculo: '', guiaRemision: '', metric: metricaVacia() }
        ];

        const metricModalState = { itemId: null, kind: null };
        const observationModalState = { itemId: null };
        const controlGlobalState = { tipo: null };
        const horasLlenadoModalState = { ensayo: '', idFila: null };
        let ensayoActivo = 'Ensayo 1';
        const llenadoJarrasState = {
            porEnsayo: {}
        };
        let siguienteIdFilaJarras = 1;
        (function inicializarIdsFilaJarras() {
            let maxId = 0;
            Object.values(llenadoJarrasState.porEnsayo).forEach((filas) => {
                filas.forEach((f) => {
                    const n = Number(f.id);
                    if (Number.isFinite(n)) maxId = Math.max(maxId, n);
                });
            });
            siguienteIdFilaJarras = maxId > 0 ? maxId + 1 : 1;
        }());
        const ensayoMeta = {};
        let editingCardId = null;

        function obtenerEnsayoActivo() {
            const rotulo = document.getElementById('meta-rotulo')?.value?.trim();
            return rotulo || ensayoActivo || 'Ensayo 1';
        }

        function aplicarCambioEnsayoActivo() {
            ensayoActivo = obtenerEnsayoActivo();
            editingCardId = null;
            metricModalState.itemId = null;
            metricModalState.kind = null;
            observationModalState.itemId = null;
            establecerMenuFlotanteAbierto(false);
            renderizarTarjetas();
            renderizarPanelLlenadoJarras();
        }

        function conteoLlenadoMetrica(item, kind) {
            const m = item?.metric?.[kind];
            if (!m) return { done: 0, total: 0 };
            const vals = Object.values(m);
            const done = vals.filter((v) => String(v ?? '').trim() !== '').length;
            return { done, total: vals.length };
        }

        function conteoLlenadoPresion(item, tipo) {
            const t = item?.metric?.temperatura || {};
            const campos = tipo === 'ambiente'
                ? ['presionAmbienteInicio', 'presionAmbienteTermino', 'presionAmbienteLlegada', 'presionAmbienteDespacho']
                : ['presionFrutaInicio', 'presionFrutaTermino', 'presionFrutaLlegada', 'presionFrutaDespacho'];
            const done = campos.filter((c) => String(t[c] ?? '').trim() !== '').length;
            return { done, total: 4 };
        }

        function promedioDesdeValores(values) {
            const nums = values.map((v) => Number(v)).filter((n) => !Number.isNaN(n) && Number.isFinite(n));
            if (nums.length === 0) return '--';
            const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
            return avg.toFixed(1) + '°C';
        }

        function obtenerMetaEnsayo(ensayo) {
            if (!ensayoMeta[ensayo]) {
                const first = data.find((item) => (item.ensayo || 'Ensayo 1') === ensayo);
                ensayoMeta[ensayo] = {
                    placaVehiculo: first?.placaVehiculo || '',
                    guiaRemision: first?.guiaRemision || ''
                };
            }
            return ensayoMeta[ensayo];
        }

        function establecerMenuFlotanteAbierto(open) {
            if (!fabMenu || !fabOptionsBtn) return;
            fabMenu.classList.toggle('is-open', open);
            fabOptionsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        fabOptionsBtn?.addEventListener('click', () => {
            establecerMenuFlotanteAbierto(!fabMenu?.classList.contains('is-open'));
        });

        function renderizarTarjetas() {
            const container = document.getElementById('cards-container');
            container.innerHTML = '';
            const ensayoTrabajo = obtenerEnsayoActivo();
            const dataEnsayo = data.filter((item) => String(item.ensayo || 'Ensayo 1') === ensayoTrabajo);
            dataEnsayo.forEach(item => {
                const tCount = conteoLlenadoMetrica(item, 'tiempo');
                const pAmbCount = conteoLlenadoPresion(item, 'ambiente');
                const pFrutaCount = conteoLlenadoPresion(item, 'fruta');
                const card = document.createElement('div');
                card.className = 'clamshell-card';
                card.onclick = () => abrirModal(`Editar Clamshell #${item.id}`, item);
                const obs = String(item.observacion || '').trim();
                card.innerHTML = `
                    <div class="card-header">
                        <div class="id-badge">
                            <div class="number-box">${item.id}</div>
                            <div>
                                <p style="font-size: 14px; font-weight: 800;">Clamshell</p>
                                <span style="font-size: 11px; color: #64748B;">${item.ensayo || 'Ensayo 1'} · Lote #2026-PRO</span>
                            </div>
                        </div>
                        <div class="jarra-tag">Jarra ${item.jarra}</div>
                    </div>

                    <div class="weights-panel">
                        <div class="weights-grid">
                            <div class="weight-box"><label>Peso Inicial 1</label><span class="weight-value">${item.p1 > 0 ? item.p1 + 'g' : '--'}</span></div>
                            <div class="weight-box"><label>Peso Inicial 2</label><span class="weight-value">${item.p2}g</span></div>
                            <div class="observation-box">
                                <button type="button" onclick="abrirModalObservacion(event, ${item.id})" title="Editar observación">
                                    <span class="observation-text ${obs ? '' : 'is-empty'}">${obs || 'Sin observación registrada'}</span>
                                </button>
                            </div>
                        </div>
                        <div class="metric-actions">
                            <div class="metric-btn-wrap">
                                <button class="metric-btn" type="button" title="Tiempos de la muestra (hora)" onclick="abrirModalMetrica(event, 'tiempo', ${item.id})">
                                    <i data-lucide="timer"></i>
                                </button>
                                <span class="metric-count ${tCount.done > 0 ? 'is-filled' : ''}">${tCount.done}/${tCount.total}</span>
                            </div>
                            <div class="metric-btn-wrap">
                                <button class="metric-btn" type="button" title="Presión de vapor ambiente (Kpa)" onclick="abrirModalMetrica(event, 'presionAmbiente', ${item.id})">
                                    <i data-lucide="cloud"></i>
                                </button>
                                <span class="metric-count ${pAmbCount.done > 0 ? 'is-filled' : ''}">${pAmbCount.done}/${pAmbCount.total}</span>
                            </div>
                            <div class="metric-btn-wrap">
                                <button class="metric-btn" type="button" title="Presión de vapor fruta (Kpa)" onclick="abrirModalMetrica(event, 'presionFruta', ${item.id})">
                                    <i data-lucide="apple"></i>
                                </button>
                                <span class="metric-count ${pFrutaCount.done > 0 ? 'is-filled' : ''}">${pFrutaCount.done}/${pFrutaCount.total}</span>
                            </div>
                        </div>
                    </div>

                    <div class="logistics-info">
                        <div class="logistic-point"><i data-lucide="calendar-check-2"></i><div><p style="color: #94A3B8; font-size: 9px;">LLEGADA ACOPIO-CAMPO</p><b>${item.acopio}g</b></div></div>
                        <div class="logistic-point"><i data-lucide="truck"></i><div><p style="color: #94A3B8; font-size: 9px;">DESPACHO ACOPIO-CAMPO</p><b>${item.despacho}g</b></div></div>
                    </div>
                `;
                container.appendChild(card);
            });
            actualizarIconos();
        }

        function abrirModalControlGlobal(tipo) {
            controlGlobalState.tipo = tipo;
            const body = document.getElementById('control-global-modal-body');
            const titulo = document.getElementById('control-global-modal-title');

            if (tipo === 'temperatura') {
                const muestra = data[0]?.metric?.temperatura || {};
                titulo.textContent = 'Control equitativo · Temperatura (todos)';
                body.innerHTML = `
                    <p class="metric-mini-title">Temperatura ambiente (°C)</p>
                    <div class="metric-grid-4">
                        <div class="form-group"><label>Inicio</label><input type="number" step="0.1" id="cg-temp-amb-inicio" value="${muestra.inicioAmbiente || ''}"></div>
                        <div class="form-group"><label>Término</label><input type="number" step="0.1" id="cg-temp-amb-termino" value="${muestra.terminoAmbiente || ''}"></div>
                        <div class="form-group"><label>Llegada</label><input type="number" step="0.1" id="cg-temp-amb-llegada" value="${muestra.llegadaAmbiente || ''}"></div>
                        <div class="form-group"><label>Despacho</label><input type="number" step="0.1" id="cg-temp-amb-despacho" value="${muestra.despachoAmbiente || ''}"></div>
                    </div>
                    <p class="metric-mini-title">Temperatura pulpa (°C)</p>
                    <div class="metric-grid-4">
                        <div class="form-group"><label>Inicio</label><input type="number" step="0.1" id="cg-temp-pulpa-inicio" value="${muestra.inicioPulpa || ''}"></div>
                        <div class="form-group"><label>Término</label><input type="number" step="0.1" id="cg-temp-pulpa-termino" value="${muestra.terminoPulpa || ''}"></div>
                        <div class="form-group"><label>Llegada</label><input type="number" step="0.1" id="cg-temp-pulpa-llegada" value="${muestra.llegadaPulpa || ''}"></div>
                        <div class="form-group"><label>Despacho</label><input type="number" step="0.1" id="cg-temp-pulpa-despacho" value="${muestra.despachoPulpa || ''}"></div>
                    </div>
                `;
            } else {
                const muestra = data[0]?.metric?.humedad || {};
                titulo.textContent = 'Control equitativo · Humedad (todos)';
                body.innerHTML = `
                    <div class="metric-grid-4">
                        <div class="form-group"><label>Inicio</label><input type="number" step="0.1" id="cg-humedad-inicio" value="${muestra.inicio || ''}"></div>
                        <div class="form-group"><label>Término</label><input type="number" step="0.1" id="cg-humedad-termino" value="${muestra.termino || ''}"></div>
                        <div class="form-group"><label>Llegada</label><input type="number" step="0.1" id="cg-humedad-llegada" value="${muestra.llegada || ''}"></div>
                        <div class="form-group"><label>Despacho</label><input type="number" step="0.1" id="cg-humedad-despacho" value="${muestra.despacho || ''}"></div>
                    </div>
                `;
            }

            document.getElementById('control-global-modal-overlay').style.display = 'flex';
        }

        function cerrarModalControlGlobal() {
            document.getElementById('control-global-modal-overlay').style.display = 'none';
        }

        function guardarModalControlGlobal() {
            if (controlGlobalState.tipo === 'temperatura') {
                const ambInicio = document.getElementById('cg-temp-amb-inicio')?.value ?? '';
                const ambTermino = document.getElementById('cg-temp-amb-termino')?.value ?? '';
                const ambLlegada = document.getElementById('cg-temp-amb-llegada')?.value ?? '';
                const ambDespacho = document.getElementById('cg-temp-amb-despacho')?.value ?? '';
                const pulpaInicio = document.getElementById('cg-temp-pulpa-inicio')?.value ?? '';
                const pulpaTermino = document.getElementById('cg-temp-pulpa-termino')?.value ?? '';
                const pulpaLlegada = document.getElementById('cg-temp-pulpa-llegada')?.value ?? '';
                const pulpaDespacho = document.getElementById('cg-temp-pulpa-despacho')?.value ?? '';
                data.forEach((item) => {
                    if (!item.metric) item.metric = metricaVacia();
                    if (!item.metric.temperatura) item.metric.temperatura = metricaVacia().temperatura;
                    item.metric.temperatura.inicioAmbiente = ambInicio;
                    item.metric.temperatura.terminoAmbiente = ambTermino;
                    item.metric.temperatura.llegadaAmbiente = ambLlegada;
                    item.metric.temperatura.despachoAmbiente = ambDespacho;
                    item.metric.temperatura.inicioPulpa = pulpaInicio;
                    item.metric.temperatura.terminoPulpa = pulpaTermino;
                    item.metric.temperatura.llegadaPulpa = pulpaLlegada;
                    item.metric.temperatura.despachoPulpa = pulpaDespacho;
                });
            } else if (controlGlobalState.tipo === 'humedad') {
                const hInicio = document.getElementById('cg-humedad-inicio')?.value ?? '';
                const hTermino = document.getElementById('cg-humedad-termino')?.value ?? '';
                const hLlegada = document.getElementById('cg-humedad-llegada')?.value ?? '';
                const hDesp = document.getElementById('cg-humedad-despacho')?.value ?? '';
                data.forEach((item) => {
                    if (!item.metric) item.metric = metricaVacia();
                    if (!item.metric.humedad) item.metric.humedad = metricaVacia().humedad;
                    item.metric.humedad.inicio = hInicio;
                    item.metric.humedad.termino = hTermino;
                    item.metric.humedad.llegada = hLlegada;
                    item.metric.humedad.despacho = hDesp;
                });
            }

            cerrarModalControlGlobal();
            renderizarTarjetas();
        }

        function obtenerFilasLlenadoJarras(ensayo) {
            const clave = String(ensayo || 'Ensayo 1');
            if (!llenadoJarrasState.porEnsayo[clave]) llenadoJarrasState.porEnsayo[clave] = [];
            return llenadoJarrasState.porEnsayo[clave];
        }

        function buscarIndiceFilaJarrasPorId(ensayo, idFila) {
            const filas = obtenerFilasLlenadoJarras(ensayo);
            const idx = filas.findIndex((f) => Number(f.id) === Number(idFila));
            return idx;
        }

        function etiquetaTipoLlenadoJarras(tipo) {
            if (tipo === 'C') return 'Cosecha';
            if (tipo === 'T') return 'Trasvasado';
            return '—';
        }

        function parseRangoJarraLlenado(valor) {
            const s = String(valor ?? '').trim();
            if (!s.includes('-')) return null;
            const partes = s.split('-').map((p) => p.trim()).filter(Boolean);
            if (partes.length !== 2) return null;
            const a = Number(partes[0]);
            const b = Number(partes[1]);
            if (!Number.isFinite(a) || !Number.isFinite(b) || b !== a + 1) return null;
            return { a, b, key: `${a}-${b}` };
        }

        function asegurarFilasInicialesEnsayo(ensayo) {
            const clave = String(ensayo || 'Ensayo 1');
            const filas = obtenerFilasLlenadoJarras(clave);
            if (!filas.length) {
                filas.push({
                    id: siguienteIdFilaJarras++,
                    ensayo: clave,
                    jarra: '1',
                    tipo: 'C',
                    inicio: '',
                    termino: '',
                    tiempo: ''
                });
            }
            return filas;
        }

        function listaJarrasPesosPorEnsayo(ensayo) {
            const clave = String(ensayo || 'Ensayo 1');
            const jars = data
                .filter((it) => String(it.ensayo || 'Ensayo 1') === clave)
                .map((it) => Number(it.jarra))
                .filter((n) => Number.isFinite(n) && n > 0);
            return [...new Set(jars)].sort((x, y) => x - y);
        }

        function maxNumeroJarraPesosPorEnsayo(ensayo) {
            const lista = listaJarrasPesosPorEnsayo(ensayo);
            return lista.length ? Math.max(...lista) : 0;
        }

        function siguienteNumeroJarraDisponible(ensayo) {
            const maxPesos = maxNumeroJarraPesosPorEnsayo(ensayo);
            const filas = obtenerFilasLlenadoJarras(ensayo);
            const nums = filas
                .flatMap((f) => {
                    const r = parseRangoJarraLlenado(f.jarra);
                    if (r) return [r.a, r.b];
                    const n = Number(String(f.jarra ?? '').trim());
                    return Number.isFinite(n) ? [n] : [];
                })
                .filter((n) => Number.isFinite(n) && n > 0);
            const maxFilas = nums.length ? Math.max(...nums) : 0;
            return Math.max(maxPesos, maxFilas, 0) + 1;
        }

        function filasLlenadoJarrasExcepto(ensayo, indiceExcluido) {
            return obtenerFilasLlenadoJarras(ensayo).filter((_, idx) => idx !== indiceExcluido);
        }

        function filaCosechaParaJarra(ensayo, nJarra, excluirIndice) {
            const otras = filasLlenadoJarrasExcepto(ensayo, excluirIndice);
            return otras.find((f) => f.tipo === 'C' && String(f.jarra) === String(nJarra)) || null;
        }

        function terminoCosechaParaJarra(ensayo, nJarra, excluirIndice) {
            const c = filaCosechaParaJarra(ensayo, nJarra, excluirIndice);
            const t = String(c?.termino || '').trim();
            return t || '';
        }

        function terminoTrasvasadoParaJarra(ensayo, nJarra, excluirIndice) {
            const t = filaTrasladoQueAplicaAJarra(ensayo, nJarra, excluirIndice);
            const fin = String(t?.termino || '').trim();
            return fin || '';
        }

        function inicioSugeridoCosecha(ensayo, valorJarra, excluirIndice) {
            const n = Number(String(valorJarra ?? '').trim());
            if (!Number.isFinite(n) || n <= 1) return '';
            const nPrev = n - 1;
            const finTrasPrev = terminoTrasvasadoParaJarra(ensayo, nPrev, excluirIndice);
            if (finTrasPrev) return finTrasPrev;
            const finCosPrev = terminoCosechaParaJarra(ensayo, nPrev, excluirIndice);
            if (finCosPrev) return finCosPrev;
            return '';
        }

        function inicioSugeridoTrasvasado(ensayo, valorJarra, excluirIndice) {
            const txt = String(valorJarra ?? '').trim();
            const rango = parseRangoJarraLlenado(txt);
            if (rango) {
                const tA = terminoCosechaParaJarra(ensayo, rango.a, excluirIndice);
                const tB = terminoCosechaParaJarra(ensayo, rango.b, excluirIndice);
                const mA = minutosDesdeHora(tA);
                const mB = minutosDesdeHora(tB);
                if (mA === null && mB === null) return '';
                if (mA === null) return tB;
                if (mB === null) return tA;
                return mA >= mB ? tA : tB;
            }
            const n = Number(txt);
            if (!Number.isFinite(n) || n <= 0) return '';
            return terminoCosechaParaJarra(ensayo, n, excluirIndice);
        }

        function sincronizarInicioTrasvasadoDesdeCosecha(ensayo, nJarraObjetivo = null) {
            const filas = obtenerFilasLlenadoJarras(ensayo);
            filas.forEach((f) => {
                if (f.tipo !== 'T') return;
                const txt = String(f.jarra ?? '').trim();
                const rango = parseRangoJarraLlenado(txt);
                if (nJarraObjetivo !== null) {
                    const objetivo = Number(nJarraObjetivo);
                    if (rango) {
                        if (rango.a !== objetivo && rango.b !== objetivo) return;
                    } else {
                        const n = Number(txt);
                        if (!Number.isFinite(n) || n !== objetivo) return;
                    }
                }
                const inicioSug = inicioSugeridoTrasvasado(ensayo, txt, -1);
                if (!inicioSug) return;
                f.inicio = inicioSug;
                f.tiempo = calcularTiempoEmpleado(f.inicio, f.termino);
            });
        }

        function sincronizarInicioCosechaDesdeAnterior(ensayo, nJarraObjetivo = null) {
            const filas = obtenerFilasLlenadoJarras(ensayo);
            filas.forEach((f, idx) => {
                if (f.tipo !== 'C') return;
                const n = Number(String(f.jarra ?? '').trim());
                if (!Number.isFinite(n) || n <= 1) return;
                if (nJarraObjetivo !== null && n !== Number(nJarraObjetivo)) return;
                const inicioSug = inicioSugeridoCosecha(ensayo, n, idx);
                if (!inicioSug) return;
                f.inicio = inicioSug;
                f.tiempo = calcularTiempoEmpleado(f.inicio, f.termino);
            });
        }

        function filaTrasladoQueAplicaAJarra(ensayo, nJarra, excluirIndice) {
            const otras = filasLlenadoJarrasExcepto(ensayo, excluirIndice);
            return otras.find((f) => {
                if (f.tipo !== 'T') return false;
                const r = parseRangoJarraLlenado(f.jarra);
                if (r) return nJarra === r.a || nJarra === r.b;
                return String(f.jarra) === String(nJarra);
            }) || null;
        }

        function jarraYaTieneCosechaCompleta(ensayo, nJarra, excluirIndice) {
            const c = filaCosechaParaJarra(ensayo, nJarra, excluirIndice);
            return !!(c && String(c.inicio || '').trim() && String(c.termino || '').trim());
        }

        function jarraYaTieneTrasladoCompleto(ensayo, nJarra, excluirIndice) {
            const t = filaTrasladoQueAplicaAJarra(ensayo, nJarra, excluirIndice);
            return !!(t && String(t.inicio || '').trim() && String(t.termino || '').trim());
        }

        function construirOpcionesJarraSegunTipo(ensayo, fila, indice) {
            const valorActualTxt = String(fila.jarra ?? '').trim() || '1';
            const valorActualNum = Number(valorActualTxt) || 1;
            const filas = obtenerFilasLlenadoJarras(ensayo);
            const otras = filas.filter((_, idx) => idx !== indice);
            const estado = new Map();

            otras.forEach((f) => {
                const txt = String(f.jarra ?? '').trim();
                const r = parseRangoJarraLlenado(txt);
                if (r) {
                    [r.a, r.b].forEach((n) => {
                        if (!estado.has(n)) estado.set(n, { c: false, t: false });
                        const e = estado.get(n);
                        if (f.tipo === 'C') e.c = true;
                        if (f.tipo === 'T') e.t = true;
                    });
                    return;
                }
                const n = Number(txt);
                if (!Number.isFinite(n) || n <= 0) return;
                if (!estado.has(n)) estado.set(n, { c: false, t: false });
                const e = estado.get(n);
                if (f.tipo === 'C') e.c = true;
                if (f.tipo === 'T') e.t = true;
            });

            const jarrasRegistradas = [...estado.keys()].sort((a, b) => a - b);
            const maxActual = jarrasRegistradas.length ? Math.max(...jarrasRegistradas, valorActualNum) : valorActualNum;
            const posibles = [];

            if (fila.tipo === 'C') {
                for (let n = 1; n <= maxActual; n++) {
                    const e = estado.get(n) || { c: false, t: false };
                    if (!e.c) posibles.push(n);
                }
                posibles.push(maxActual + 1);
            } else if (fila.tipo === 'T') {
                for (let n = 1; n <= maxActual; n++) {
                    const e = estado.get(n) || { c: false, t: false };
                    if (e.c && !e.t) posibles.push(n);
                }
                for (let n = 1; n < maxActual; n++) {
                    const a = estado.get(n) || { c: false, t: false };
                    const b = estado.get(n + 1) || { c: false, t: false };
                    if (a.c && b.c && !a.t && !b.t) posibles.push(`${n}-${n + 1}`);
                }
                // Permite saltar a la siguiente jarra para iniciar nueva cosecha
                // (al seleccionar, el tipo se reajusta a Cosecha por reglas permitidas).
                posibles.push(maxActual + 1);
            } else {
                for (let n = 1; n <= maxActual + 1; n++) posibles.push(n);
            }

            const posiblesTxt = posibles.map((x) => String(x));
            const incluirActual = fila.tipo !== 'T' || posiblesTxt.includes(valorActualTxt);
            if (incluirActual && !posiblesTxt.includes(valorActualTxt)) posibles.push(valorActualTxt);
            const unicos = [...new Set(posibles.map((x) => String(x)))].sort((a, b) => {
                const ra = parseRangoJarraLlenado(a);
                const rb = parseRangoJarraLlenado(b);
                const va = ra ? ra.a : Number(a);
                const vb = rb ? rb.a : Number(b);
                return va - vb;
            });
            return unicos.map((v) => {
                const sel = v === valorActualTxt ? ' selected' : '';
                const esRango = !!parseRangoJarraLlenado(v);
                const label = esRango ? `Trasvasado ${v}` : `Jarra ${v}`;
                return `<option value="${v}"${sel}>${label}</option>`;
            }).join('');
        }

        function tiposPermitidosSegunJarra(ensayo, fila, indice) {
            const j = String(fila.jarra ?? '').trim();
            const rango = parseRangoJarraLlenado(j);
            if (rango) return ['T'];
            const n = Number(j);
            if (!Number.isFinite(n) || n <= 0) return [];
            const tieneC = jarraYaTieneCosechaCompleta(ensayo, n, indice);
            const tieneT = jarraYaTieneTrasladoCompleto(ensayo, n, indice);
            if (!tieneC) return ['C'];
            if (tieneC && !tieneT) return ['T'];
            return [];
        }

        function construirOpcionesTipo(ensayo, fila, indice) {
            const per = tiposPermitidosSegunJarra(ensayo, fila, indice);
            const v = fila.tipo;
            if (v === 'C') return '<option value="C" selected>Cosecha</option>';
            if (v === 'T') return '<option value="T" selected>Trasvasado</option>';
            const opts = [];
            const add = (val, lab) => {
                const sel = v === val ? ' selected' : '';
                opts.push(`<option value="${val}"${sel}>${lab}</option>`);
            };
            add('', 'Elegir…');
            if (per.includes('C')) add('C', 'Cosecha');
            if (per.includes('T')) add('T', 'Trasvasado');
            if (v && !per.includes(v)) add(v, `${v} · revisar jarra`);
            return opts.join('');
        }

        function minutosDesdeHora(hora) {
            if (!hora) return null;
            const [h, m] = String(hora).split(':').map(Number);
            if ([h, m].some((x) => Number.isNaN(x))) return null;
            return (h * 60) + m;
        }

        function validarOrdenCosechaTrasladoFila(ensayo, fila, indice) {
            if (fila.tipo !== 'T') return '';
            const rango = parseRangoJarraLlenado(fila.jarra);
            const jarras = rango ? [rango.a, rango.b] : [Number(String(fila.jarra ?? '').trim())].filter((n) => Number.isFinite(n));
            const tin = minutosDesdeHora(fila.inicio);
            if (tin === null) return '';
            for (let k = 0; k < jarras.length; k++) {
                const n = jarras[k];
                const c = filaCosechaParaJarra(ensayo, n, indice);
                if (!c) return `Falta cosecha registrada para jarra ${n}.`;
                const tc = minutosDesdeHora(c.termino);
                if (tc === null) return `Completa término de cosecha (jarra ${n}) antes del trasvasado.`;
                if (tin < tc) return `Trasvasado: inicio debe ser ≥ término de cosecha (${c.termino}) en jarra ${n}.`;
            }
            return '';
        }

        function ordenVisualFilasJarras(filas) {
            const pesoTipo = (tipo) => (tipo === 'C' ? 0 : tipo === 'T' ? 1 : 9);
            const pesoJarra = (jarraVal) => {
                const r = parseRangoJarraLlenado(String(jarraVal ?? '').trim());
                if (r) return r.a;
                const n = Number(String(jarraVal ?? '').trim());
                return Number.isFinite(n) ? n : 9999;
            };
            return [...filas].sort((a, b) => {
                const ja = pesoJarra(a.jarra);
                const jb = pesoJarra(b.jarra);
                if (ja !== jb) return ja - jb;
                return pesoTipo(a.tipo) - pesoTipo(b.tipo);
            });
        }

        function maxJarraDesdeFilas(filas) {
            let max = 1;
            filas.forEach((f) => {
                const txt = String(f.jarra ?? '').trim();
                const r = parseRangoJarraLlenado(txt);
                if (r) {
                    max = Math.max(max, r.a, r.b);
                    return;
                }
                const n = Number(txt);
                if (Number.isFinite(n) && n > 0) max = Math.max(max, n);
            });
            return max;
        }

        function renderizarPanelLlenadoJarras() {
            const panel = document.getElementById('llenado-jarras-panel-body');
            if (!panel) return;
            const ensayos = [obtenerEnsayoActivo()];
            ensayos.forEach((ensayo) => obtenerFilasLlenadoJarras(ensayo));

            panel.innerHTML = ensayos.map((ensayo) => {
                const filas = asegurarFilasInicialesEnsayo(ensayo);
                filas.forEach((fila) => {
                    const t = calcularTiempoEmpleado(fila.inicio, fila.termino);
                    if (t) fila.tiempo = t;
                });
                const ordenadas = ordenVisualFilasJarras(filas);
                const filasHtml = ordenadas.map((fila) => {
                    const indiceReal = buscarIndiceFilaJarrasPorId(ensayo, fila.id);
                    const tiempo = calcularTiempoEmpleado(fila.inicio, fila.termino) || fila.tiempo || "0'";
                    const tiempoLegible = `${String(tiempo).replace("'", '').trim() || '0'} mnts`;
                    const jarraVisual = String(fila.jarra || '1').trim() || '1';
                    const err = indiceReal >= 0 ? validarOrdenCosechaTrasladoFila(ensayo, fila, indiceReal) : '';
                    const filaErrClass = err ? ' lj-fila--alerta' : '';
                    return `
                        <article class="lj-fila-card${filaErrClass}" onclick="abrirModalHorasLlenado('${ensayo}', ${fila.id})">
                            <div class="lj-fila-left">
                                <select class="lj-campo-jarra lj-campo-jarra-selector" onchange="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'jarra', this.value)" onclick="event.stopPropagation()">
                                    ${construirOpcionesJarraSegunTipo(ensayo, fila, indiceReal)}
                                </select>
                                <div class="lj-fila-jarra-num">${jarraVisual}</div>
                                <div class="lj-fila-tiempo-label">T. Empleado: ${tiempoLegible}</div>
                            </div>
                            <div class="lj-fila-right">
                                <div class="lj-fila-top">
                                    <div class="lj-fila-hint">Trasvasado u otra observación</div>
                                    <div class="lj-fila-actions">
                                        <button type="button" class="lj-mini-btn lj-mini-btn--danger lj-mini-btn--delete" title="Eliminar fila" aria-label="Eliminar fila" onclick="event.stopPropagation(); eliminarFilaLlenadoJarras('${ensayo}', ${fila.id})">
                                            <i data-lucide="trash-2"></i>
                                        </button>
                                    </div>
                                </div>
                                <select class="lj-campo-tipo" onchange="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'tipo', this.value)" onclick="event.stopPropagation()">
                                    ${construirOpcionesTipo(ensayo, fila, indiceReal)}
                                </select>
                                <div class="lj-fila-horas">
                                    <div class="lj-time-col">
                                        <label class="lj-time-label">Inicio</label>
                                        <div class="lj-time-field" onclick="event.stopPropagation()">
                                            <input class="lj-campo-inicio" type="time" value="${fila.inicio}" onchange="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'inicio', this.value)" oninput="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'inicio', this.value)">
                                        </div>
                                    </div>
                                    <div class="lj-time-col">
                                        <label class="lj-time-label">Final</label>
                                        <div class="lj-time-field" onclick="event.stopPropagation()">
                                            <input class="lj-campo-termino" type="time" value="${fila.termino}" onchange="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'termino', this.value)" oninput="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'termino', this.value)">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </article>
                    `;
                }).join('');
                return `
                    <section class="lj-ensayo-bloque">
                        <div class="lj-jarras-tabla-wrap">
                            <div class="lj-filas-stack" aria-label="Tiempo de llenado de jarras · ${ensayo}">
                                ${filasHtml}
                            </div>
                        </div>
                        <button type="button" class="llenado-jarras-add-btn" onclick="agregarFilaLlenadoJarras('${ensayo}')">Agregar uno nuevo</button>
                    </section>
                `;
            }).join('');
            actualizarIconos();
        }

        async function eliminarFilaLlenadoJarras(ensayo, idFila) {
            const filas = obtenerFilasLlenadoJarras(ensayo);
            const idx = filas.findIndex((f) => Number(f.id) === Number(idFila));
            if (idx < 0) return;
            const filaBase = filas[idx];
            const txt = String(filaBase.jarra ?? '').trim();
            const r = parseRangoJarraLlenado(txt);
            const jarrasAfectadas = new Set();
            if (r) {
                jarrasAfectadas.add(r.a);
                jarrasAfectadas.add(r.b);
            } else {
                const n = Number(txt);
                if (Number.isFinite(n) && n > 0) jarrasAfectadas.add(n);
            }

            const idsEliminar = new Set([Number(filaBase.id)]);

            // Regla: si eliminas una cosecha de una jarra, elimina también
            // trasvasados que dependan de esa jarra (incluye grupales 1-2, etc.).
            if (filaBase.tipo === 'C' && jarrasAfectadas.size) {
                filas.forEach((f) => {
                    if (f.tipo !== 'T') return;
                    const aplica = [...jarrasAfectadas].some((n) => trasladoVisualAplicaJarra(f.jarra, n));
                    if (aplica) idsEliminar.add(Number(f.id));
                });
            }

            const eliminaRelacionados = idsEliminar.size > 1;
            if (eliminaRelacionados) {
                let confirmado = false;
                if (window.Swal && typeof window.Swal.fire === 'function') {
                    const resp = await window.Swal.fire({
                        icon: 'warning',
                        title: 'Confirmar eliminación',
                        text: `Se va a eliminar Jarra ${txt} y su trasvasado relacionado. ¿Deseas continuar?`,
                        showCancelButton: true,
                        confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'No'
                    });
                    confirmado = !!resp.isConfirmed;
                } else {
                    confirmado = window.confirm(`Se va a eliminar Jarra ${txt} y su trasvasado relacionado. ¿Deseas continuar?`);
                }
                if (!confirmado) return;
            }

            for (let i = filas.length - 1; i >= 0; i--) {
                if (idsEliminar.has(Number(filas[i].id))) filas.splice(i, 1);
            }

            sincronizarInicioCosechaDesdeAnterior(ensayo);
            sincronizarInicioTrasvasadoDesdeCosecha(ensayo);
            renderizarPanelLlenadoJarras();
        }

        function calcularTiempoEmpleado(inicio, termino) {
            if (!inicio || !termino) return '';
            const [hIni, mIni] = String(inicio).split(':').map(Number);
            const [hFin, mFin] = String(termino).split(':').map(Number);
            if ([hIni, mIni, hFin, mFin].some((n) => Number.isNaN(n))) return '';
            let minutosInicio = (hIni * 60) + mIni;
            let minutosTermino = (hFin * 60) + mFin;
            if (minutosTermino < minutosInicio) minutosTermino += 24 * 60;
            const total = minutosTermino - minutosInicio;
            return `${total}'`;
        }

        function horarioFinalMenorQueInicio(inicio, termino) {
            const minIni = minutosDesdeHora(inicio);
            const minFin = minutosDesdeHora(termino);
            if (minIni === null || minFin === null) return false;
            return minFin < minIni;
        }

        function actualizarFilaLlenadoJarras(ensayo, idFila, campo, valor) {
            const filas = obtenerFilasLlenadoJarras(ensayo);
            const indice = buscarIndiceFilaJarrasPorId(ensayo, idFila);
            const fila = filas[indice];
            if (!fila) return;

            if (campo === 'jarra') {
                fila.jarra = String(valor ?? '').trim();
                const rangoValido = !!parseRangoJarraLlenado(fila.jarra);
                const nJarra = Number(fila.jarra);
                if (!rangoValido && (!Number.isFinite(nJarra) || nJarra < 1)) {
                    fila.jarra = '1';
                    mostrarAlertaRegla('Jarra inválida', 'El N° de jarra no puede ser menor que 1.');
                }
                if (fila.tipo === 'C' && parseRangoJarraLlenado(fila.jarra)) {
                    fila.jarra = '';
                }
                if (fila.tipo === 'T') {
                    const inicioSug = inicioSugeridoTrasvasado(ensayo, fila.jarra, indice);
                    if (inicioSug) fila.inicio = inicioSug;
                } else if (fila.tipo === 'C') {
                    const inicioSugC = inicioSugeridoCosecha(ensayo, fila.jarra, indice);
                    if (inicioSugC) fila.inicio = inicioSugC;
                }
            } else if (campo === 'tipo') {
                fila.tipo = String(valor ?? '').trim();
                if (fila.tipo === 'C' && parseRangoJarraLlenado(fila.jarra)) {
                    fila.jarra = '';
                }
                if (fila.tipo === 'T') {
                    const inicioSug = inicioSugeridoTrasvasado(ensayo, fila.jarra, indice);
                    if (inicioSug) fila.inicio = inicioSug;
                } else if (fila.tipo === 'C') {
                    const inicioSugC = inicioSugeridoCosecha(ensayo, fila.jarra, indice);
                    if (inicioSugC) fila.inicio = inicioSugC;
                }
            } else if (campo === 'inicio' || campo === 'termino') {
                fila[campo] = valor;
                if (String(fila.inicio || '').trim() && String(fila.termino || '').trim() && horarioFinalMenorQueInicio(fila.inicio, fila.termino)) {
                    mostrarAlertaRegla('Horario inválido', 'La hora final no puede ser menor que la hora de inicio.');
                    if (campo === 'termino') fila.termino = '';
                    if (campo === 'inicio') fila.inicio = '';
                }
                if (campo === 'termino' && fila.tipo === 'C') {
                    const nJarra = Number(String(fila.jarra ?? '').trim());
                    if (Number.isFinite(nJarra) && nJarra > 0) {
                        sincronizarInicioTrasvasadoDesdeCosecha(ensayo, nJarra);
                        sincronizarInicioTrasvasadoDesdeCosecha(ensayo, nJarra - 1);
                        sincronizarInicioTrasvasadoDesdeCosecha(ensayo, nJarra + 1);
                        sincronizarInicioCosechaDesdeAnterior(ensayo, nJarra + 1);
                    }
                }
                if (campo === 'termino' && fila.tipo === 'T') {
                    const txtJ = String(fila.jarra ?? '').trim();
                    const rJ = parseRangoJarraLlenado(txtJ);
                    if (rJ) sincronizarInicioCosechaDesdeAnterior(ensayo, rJ.b + 1);
                    else {
                        const nJ = Number(txtJ);
                        if (Number.isFinite(nJ) && nJ > 0) sincronizarInicioCosechaDesdeAnterior(ensayo, nJ + 1);
                    }
                }
            }

            const permitidos = tiposPermitidosSegunJarra(ensayo, fila, indice);
            if (fila.tipo && !permitidos.includes(fila.tipo)) {
                fila.tipo = permitidos[0] || '';
            }

            if (campo === 'inicio' || campo === 'termino') {
                fila.tiempo = calcularTiempoEmpleado(fila.inicio, fila.termino);
            } else if (fila.tipo === 'T' && campo !== 'termino') {
                fila.tiempo = calcularTiempoEmpleado(fila.inicio, fila.termino);
            }

            renderizarPanelLlenadoJarras();
        }

        function agregarFilaLlenadoJarras(ensayo) {
            const clave = String(ensayo || 'Ensayo 1');
            const filas = obtenerFilasLlenadoJarras(clave);
            const incompleta = filas.find((f) => !String(f.inicio || '').trim() || !String(f.termino || '').trim());
            if (incompleta) {
                mostrarAlertaRegla('Completa horas primero', 'Para agregar otro registro debes completar Inicio y Final de las filas actuales.');
                return;
            }
            const invalida = filas.find((f) => horarioFinalMenorQueInicio(f.inicio, f.termino));
            if (invalida) {
                mostrarAlertaRegla('Horario inválido', 'No se puede agregar: existe una fila con hora final menor que la hora de inicio.');
                return;
            }
            let jarraNueva = '1';
            let tipoNuevo = 'C';
            const estado = new Map();
            let maxRef = 1;
            filas.forEach((f) => {
                const txt = String(f.jarra ?? '').trim();
                const r = parseRangoJarraLlenado(txt);
                const marcar = (n) => {
                    if (!estado.has(n)) estado.set(n, { c: false, t: false });
                    const e = estado.get(n);
                    if (f.tipo === 'C') e.c = true;
                    if (f.tipo === 'T') e.t = true;
                    maxRef = Math.max(maxRef, n);
                };
                if (r) {
                    marcar(r.a);
                    marcar(r.b);
                    return;
                }
                const n = Number(txt);
                if (Number.isFinite(n) && n > 0) marcar(n);
            });

            let asignada = false;
            for (let n = maxRef; n >= 1; n--) {
                const e = estado.get(n) || { c: false, t: false };
                if (!e.c) {
                    jarraNueva = String(n);
                    tipoNuevo = 'C';
                    asignada = true;
                    break;
                }
                if (!e.t) {
                    jarraNueva = String(n);
                    tipoNuevo = 'T';
                    asignada = true;
                    break;
                }
            }
            if (!asignada) {
                jarraNueva = String(maxRef + 1);
                tipoNuevo = 'C';
            }

            const nuevaFila = {
                id: siguienteIdFilaJarras++,
                ensayo: clave,
                jarra: String(jarraNueva),
                tipo: tipoNuevo,
                inicio: '',
                termino: '',
                tiempo: ''
            };
            if (nuevaFila.tipo === 'T') {
                const inicioSug = inicioSugeridoTrasvasado(clave, nuevaFila.jarra, -1);
                if (inicioSug) nuevaFila.inicio = inicioSug;
            } else if (nuevaFila.tipo === 'C') {
                const inicioSugC = inicioSugeridoCosecha(clave, nuevaFila.jarra, -1);
                if (inicioSugC) nuevaFila.inicio = inicioSugC;
            }
            filas.push(nuevaFila);
            renderizarPanelLlenadoJarras();
        }

        function abrirModalHorasLlenado(ensayo, idFila) {
            const filas = obtenerFilasLlenadoJarras(ensayo);
            const fila = filas.find((f) => Number(f.id) === Number(idFila));
            if (!fila) return;
            horasLlenadoModalState.ensayo = ensayo;
            horasLlenadoModalState.idFila = idFila;
            document.getElementById('lhm-inicio').value = fila.inicio || '';
            document.getElementById('lhm-termino').value = fila.termino || '';
            document.getElementById('llenado-horas-modal-overlay').style.display = 'flex';
        }

        function cerrarModalHorasLlenado() {
            document.getElementById('llenado-horas-modal-overlay').style.display = 'none';
        }

        function guardarModalHorasLlenado() {
            const ensayo = horasLlenadoModalState.ensayo;
            const idFila = horasLlenadoModalState.idFila;
            const filas = obtenerFilasLlenadoJarras(ensayo);
            const fila = filas.find((f) => Number(f.id) === Number(idFila));
            if (!fila) {
                cerrarModalHorasLlenado();
                return;
            }
            const inicioVal = document.getElementById('lhm-inicio').value || '';
            const terminoVal = document.getElementById('lhm-termino').value || '';
            if (inicioVal && terminoVal && horarioFinalMenorQueInicio(inicioVal, terminoVal)) {
                mostrarAlertaRegla('Horario inválido', 'La hora final no puede ser menor que la hora de inicio.');
                return;
            }
            fila.inicio = inicioVal;
            fila.termino = terminoVal;
            fila.tiempo = calcularTiempoEmpleado(fila.inicio, fila.termino);
            cerrarModalHorasLlenado();
            renderizarPanelLlenadoJarras();
        }

        function ensayoTienePesosVisuales(ensayo) {
            const clave = String(ensayo || 'Ensayo 1');
            return data.some((it) => String(it.ensayo || 'Ensayo 1') === clave);
        }

        function ensayoTieneAlMenosUnaFilaTiempoCompleta(ensayo) {
            return obtenerFilasLlenadoJarras(ensayo).some((f) => String(f.inicio || '').trim() && String(f.termino || '').trim());
        }

        function validarErroresLlenadoJarrasPorEnsayo(ensayo) {
            const filas = obtenerFilasLlenadoJarras(ensayo);
            const errores = [];
            filas.forEach((fila, idx) => {
                const msg = validarOrdenCosechaTrasladoFila(ensayo, fila, idx);
                if (msg) errores.push(`${ensayo} · fila ${idx + 1}: ${msg}`);
            });
            if (ensayoTienePesosVisuales(ensayo) && !ensayoTieneAlMenosUnaFilaTiempoCompleta(ensayo)) {
                errores.push(`${ensayo}: hay pesos (visual) registrados, pero falta al menos una fila de tiempos de jarras con inicio y término.`);
            }
            return errores;
        }

        function trasladoVisualAplicaJarra(valorTrasladoJarra, nJarra) {
            const r = parseRangoJarraLlenado(String(valorTrasladoJarra ?? '').trim());
            if (r) return nJarra === r.a || nJarra === r.b;
            return String(valorTrasladoJarra ?? '').trim() === String(nJarra);
        }

        function unirPesosVisualConJarrasEnsayo(ensayo) {
            const clave = String(ensayo || 'Ensayo 1');
            const filasJ = obtenerFilasLlenadoJarras(clave);
            const visuales = data.filter((it) => String(it.ensayo || 'Ensayo 1') === clave);
            const combinados = visuales.map((it) => {
                const n = Number(it.jarra);
                const cosecha = filasJ.find((f) => f.tipo === 'C' && String(f.jarra) === String(n)) || null;
                const traslado = filasJ.find((f) => f.tipo === 'T' && trasladoVisualAplicaJarra(f.jarra, n)) || null;
                return {
                    ensayo: clave,
                    visual: { id: it.id, jarra: it.jarra },
                    cosecha,
                    traslado
                };
            });

            const jarsEnJarras = new Set();
            filasJ.forEach((f) => {
                const r = parseRangoJarraLlenado(String(f.jarra ?? '').trim());
                if (r) {
                    jarsEnJarras.add(r.a);
                    jarsEnJarras.add(r.b);
                } else {
                    const n = Number(String(f.jarra ?? '').trim());
                    if (Number.isFinite(n)) jarsEnJarras.add(n);
                }
            });
            const jarsEnPesos = new Set(visuales.map((it) => Number(it.jarra)).filter((n) => Number.isFinite(n)));
            const backup = [];
            jarsEnJarras.forEach((n) => {
                if (jarsEnPesos.has(n)) return;
                const cosecha = filasJ.find((f) => f.tipo === 'C' && String(f.jarra) === String(n)) || null;
                const traslado = filasJ.find((f) => f.tipo === 'T' && trasladoVisualAplicaJarra(f.jarra, n)) || null;
                if (cosecha || traslado) backup.push({ ensayo: clave, jarra: n, cosecha, traslado, nota: 'Sin fila de pesos (visual); fila combinada de respaldo.' });
            });

            return { combinados, backup };
        }

        function abrirModal(title, item = null) {
            establecerMenuFlotanteAbierto(false);
            document.getElementById('modal-title').innerText = title;
            editingCardId = item ? item.id : null;
            document.getElementById('m-p1').value = item ? item.p1 : '';
            document.getElementById('m-p2').value = item ? item.p2 : '';
            document.getElementById('m-acopio').value = item ? item.acopio : '';
            document.getElementById('m-despacho').value = item ? item.despacho : '';
            document.getElementById('modal-overlay').style.display = 'flex';
        }

        function guardarModalTarjeta() {
            if (editingCardId === null) {
                cerrarModal();
                return;
            }
            const item = data.find((entry) => entry.id === editingCardId);
            if (!item) {
                cerrarModal();
                return;
            }
            item.p1 = Number(document.getElementById('m-p1').value || 0);
            item.p2 = Number(document.getElementById('m-p2').value || 0);
            item.acopio = Number(document.getElementById('m-acopio').value || 0);
            item.despacho = Number(document.getElementById('m-despacho').value || 0);
            cerrarModal();
            renderizarTarjetas();
        }

        function abrirModalObservacion(event, itemId) {
            if (event && typeof event.stopPropagation === 'function') {
                event.stopPropagation();
            }
            const item = data.find((entry) => entry.id === itemId);
            if (!item) return;
            observationModalState.itemId = itemId;
            document.getElementById('observation-modal-title').textContent = 'Observación · Clamshell #' + itemId;
            document.getElementById('observation-input').value = item.observacion || '';
            document.getElementById('observation-modal-overlay').style.display = 'flex';
        }

        function cerrarModalObservacion() {
            document.getElementById('observation-modal-overlay').style.display = 'none';
        }

        function guardarModalObservacion() {
            const item = data.find((entry) => entry.id === observationModalState.itemId);
            if (!item) {
                cerrarModalObservacion();
                return;
            }
            item.observacion = document.getElementById('observation-input').value.trim();
            cerrarModalObservacion();
            renderizarTarjetas();
        }

        function abrirModalResumenGlobal() {
            establecerMenuFlotanteAbierto(false);
            document.getElementById('essential-modal-title').textContent = 'Resumen general para envío';
            const body = document.getElementById('essential-modal-body');
            const ensayos = [...new Set(data.map((item) => String(item.ensayo || '').trim()).filter(Boolean))];
            body.innerHTML = ensayos.map((ensayo) => {
                const meta = obtenerMetaEnsayo(ensayo);
                const rows = data.filter((item) => (item.ensayo || 'Ensayo 1') === ensayo).map((item) => {
                    const temp = item.metric?.temperatura || {};
                    const avgAmb = promedioDesdeValores([temp.inicioAmbiente, temp.terminoAmbiente, temp.llegadaAmbiente, temp.despachoAmbiente]);
                    const avgPulpa = promedioDesdeValores([temp.inicioPulpa, temp.terminoPulpa, temp.llegadaPulpa, temp.despachoPulpa]);
                    const horaDesp = item.metric?.tiempo?.despachoAcopio || '--';
                    return `
                        <div class="essential-block">
                            <h4>Clamshell #${item.id} · Jarra ${item.jarra}</h4>
                            <div class="essential-summary-grid">
                                <div class="essential-card"><b>Peso despacho acopio-campo</b><span>${item.despacho ?? '--'}g</span></div>
                                <div class="essential-card"><b>Hora despacho acopio-campo</b><span>${horaDesp}</span></div>
                            </div>
                            <div class="essential-summary-grid">
                                <div class="essential-card"><b>Temp. ambiente promedio</b><span>${avgAmb}</span></div>
                                <div class="essential-card"><b>Temp. pulpa promedio</b><span>${avgPulpa}</span></div>
                            </div>
                            <div class="essential-summary-grid">
                                <div class="essential-card"><b>Temp. despacho acopio-campo (ambiente)</b><span>${temp.despachoAmbiente ? temp.despachoAmbiente + '°C' : '--'}</span></div>
                                <div class="essential-card"><b>Temp. despacho acopio-campo (pulpa)</b><span>${temp.despachoPulpa ? temp.despachoPulpa + '°C' : '--'}</span></div>
                            </div>
                            <div class="essential-summary-grid">
                                <div class="essential-card essential-card--full"><b>Observación</b><span>${item.observacion || '--'}</span></div>
                            </div>
                        </div>
                    `;
                }).join('');
                return `
                    <details class="ensayo-accordion">
                        <summary>${ensayo} · ${data.filter((it) => (it.ensayo || 'Ensayo 1') === ensayo).length} clamshell(s)</summary>
                        <div class="ensayo-body">
                            <div class="essential-summary-grid">
                                <div class="form-group">
                                    <label>PLACA VEHÍCULO</label>
                                    <input type="text" data-ensayo-placa="${ensayo}" value="${meta.placaVehiculo || ''}" placeholder="Ej. 9967-OK">
                                </div>
                                <div class="form-group">
                                    <label>GUÍA REMISIÓN ACOPIO</label>
                                    <input type="text" data-ensayo-guia="${ensayo}" value="${meta.guiaRemision || ''}" placeholder="Ej. 208353">
                                </div>
                            </div>
                            ${rows}
                        </div>
                    </details>
                `;
            }).join('');
            document.getElementById('essential-modal-overlay').style.display = 'flex';
        }

        function cerrarModalResumen() {
            document.getElementById('essential-modal-overlay').style.display = 'none';
        }

        function guardarModalResumenGlobal() {
            const ensayos = [...new Set(data.map((item) => String(item.ensayo || '').trim()).filter(Boolean))];
            const erroresJarras = ensayos.flatMap((ensayo) => validarErroresLlenadoJarrasPorEnsayo(ensayo));
            if (erroresJarras.length) {
                mostrarAlertaRegla('Faltan validaciones', erroresJarras.join('\n'));
                return;
            }
            const joinPorEnsayo = {};
            ensayos.forEach((ensayo) => {
                joinPorEnsayo[ensayo] = unirPesosVisualConJarrasEnsayo(ensayo);
            });
            try {
                window.__joinVisualJarras = joinPorEnsayo;
            } catch (e) { /* ignore */ }

            ensayos.forEach((ensayo) => {
                const placaInput = document.querySelector('[data-ensayo-placa="' + ensayo + '"]');
                const guiaInput = document.querySelector('[data-ensayo-guia="' + ensayo + '"]');
                const placa = (placaInput?.value || '').trim().toUpperCase();
                const guia = (guiaInput?.value || '').trim();
                ensayoMeta[ensayo] = { placaVehiculo: placa, guiaRemision: guia };
                data.forEach((item) => {
                    if ((item.ensayo || 'Ensayo 1') === ensayo) {
                        item.placaVehiculo = placa;
                        item.guiaRemision = guia;
                    }
                });
            });
            cerrarModalResumen();
            renderizarTarjetas();
        }

        

        function abrirModalMetrica(event, kind, itemId) {
            event.stopPropagation();
            const item = data.find((entry) => entry.id === itemId) || null;
            if (!item) return;
            metricModalState.itemId = itemId;
            metricModalState.kind = kind;
            const body = document.getElementById('metric-modal-body');
            const title = document.getElementById('metric-modal-title');
            const metric = item.metric || metricaVacia();

            if (kind === 'tiempo') {
                title.textContent = 'Tiempos de la muestra (hora) · Clamshell #' + itemId;
                body.innerHTML = `
                    <div class="metric-grid-2">
                        <div class="form-group"><label>Inicio de cosecha</label><input type="time" data-metric="inicioCosecha" value="${metric.tiempo.inicioCosecha || ''}"></div>
                        <div class="form-group"><label>Inicio pérdida de peso</label><input type="time" data-metric="inicioPerdida" value="${metric.tiempo.inicioPerdida || ''}"></div>
                        <div class="form-group"><label>Término de cosecha</label><input type="time" data-metric="terminoCosecha" value="${metric.tiempo.terminoCosecha || ''}"></div>
                        <div class="form-group"><label>Llegada acopio-campo</label><input type="time" data-metric="llegadaAcopio" value="${metric.tiempo.llegadaAcopio || ''}"></div>
                    </div>
                    <div class="form-group"><label>Despacho acopio-campo</label><input type="time" data-metric="despachoAcopio" value="${metric.tiempo.despachoAcopio || ''}"></div>
                `;
            } else if (kind === 'temperatura') {
                title.textContent = 'Temperatura muestra (°C) · Clamshell #' + itemId;
                body.innerHTML = `
                    <p class="metric-mini-title">Inicio de cosecha</p>
                    <div class="metric-grid-2">
                        <div class="form-group"><label>T° ambiente</label><input type="number" step="0.1" data-metric="inicioAmbiente" value="${metric.temperatura.inicioAmbiente || ''}"></div>
                        <div class="form-group"><label>T° pulpa</label><input type="number" step="0.1" data-metric="inicioPulpa" value="${metric.temperatura.inicioPulpa || ''}"></div>
                    </div>
                    <p class="metric-mini-title">Término de cosecha</p>
                    <div class="metric-grid-2">
                        <div class="form-group"><label>T° ambiente</label><input type="number" step="0.1" data-metric="terminoAmbiente" value="${metric.temperatura.terminoAmbiente || ''}"></div>
                        <div class="form-group"><label>T° pulpa</label><input type="number" step="0.1" data-metric="terminoPulpa" value="${metric.temperatura.terminoPulpa || ''}"></div>
                    </div>
                    <p class="metric-mini-title">Llegada acopio-campo</p>
                    <div class="metric-grid-2">
                        <div class="form-group"><label>T° ambiente</label><input type="number" step="0.1" data-metric="llegadaAmbiente" value="${metric.temperatura.llegadaAmbiente || ''}"></div>
                        <div class="form-group"><label>T° pulpa</label><input type="number" step="0.1" data-metric="llegadaPulpa" value="${metric.temperatura.llegadaPulpa || ''}"></div>
                    </div>
                    <p class="metric-mini-title">Despacho acopio-campo</p>
                    <div class="metric-grid-2">
                        <div class="form-group"><label>T° ambiente</label><input type="number" step="0.1" data-metric="despachoAmbiente" value="${metric.temperatura.despachoAmbiente || ''}"></div>
                        <div class="form-group"><label>T° pulpa</label><input type="number" step="0.1" data-metric="despachoPulpa" value="${metric.temperatura.despachoPulpa || ''}"></div>
                    </div>
                    <details class="pressure-accordion" open>
                        <summary>Presión de vapor ambiente (Kpa)</summary>
                        <div class="pressure-accordion-body">
                            <div class="metric-grid-4">
                                <div class="form-group"><label>Inicio</label><input type="number" step="0.1" data-metric="presionAmbienteInicio" value="${metric.temperatura.presionAmbienteInicio || ''}"></div>
                                <div class="form-group"><label>Término</label><input type="number" step="0.1" data-metric="presionAmbienteTermino" value="${metric.temperatura.presionAmbienteTermino || ''}"></div>
                                <div class="form-group"><label>Llegada</label><input type="number" step="0.1" data-metric="presionAmbienteLlegada" value="${metric.temperatura.presionAmbienteLlegada || ''}"></div>
                                <div class="form-group"><label>Despacho</label><input type="number" step="0.1" data-metric="presionAmbienteDespacho" value="${metric.temperatura.presionAmbienteDespacho || ''}"></div>
                            </div>
                        </div>
                    </details>
                    <details class="pressure-accordion">
                        <summary>Presión de vapor fruta (Kpa)</summary>
                        <div class="pressure-accordion-body">
                            <div class="metric-grid-4">
                                <div class="form-group"><label>Inicio</label><input type="number" step="0.1" data-metric="presionFrutaInicio" value="${metric.temperatura.presionFrutaInicio || ''}"></div>
                                <div class="form-group"><label>Término</label><input type="number" step="0.1" data-metric="presionFrutaTermino" value="${metric.temperatura.presionFrutaTermino || ''}"></div>
                                <div class="form-group"><label>Llegada</label><input type="number" step="0.1" data-metric="presionFrutaLlegada" value="${metric.temperatura.presionFrutaLlegada || ''}"></div>
                                <div class="form-group"><label>Despacho</label><input type="number" step="0.1" data-metric="presionFrutaDespacho" value="${metric.temperatura.presionFrutaDespacho || ''}"></div>
                            </div>
                        </div>
                    </details>
                `;
            } else if (kind === 'humedad') {
                title.textContent = 'Humedad relativa (%) · Clamshell #' + itemId;
                body.innerHTML = `
                    <div class="metric-grid-2">
                        <div class="form-group"><label>Inicio de cosecha</label><input type="number" step="0.1" data-metric="inicio" value="${metric.humedad.inicio || ''}"></div>
                        <div class="form-group"><label>Término de cosecha</label><input type="number" step="0.1" data-metric="termino" value="${metric.humedad.termino || ''}"></div>
                        <div class="form-group"><label>Llegada a acopio</label><input type="number" step="0.1" data-metric="llegada" value="${metric.humedad.llegada || ''}"></div>
                        <div class="form-group"><label>Despacho acopio</label><input type="number" step="0.1" data-metric="despacho" value="${metric.humedad.despacho || ''}"></div>
                    </div>
                `;
            } else if (kind === 'presionAmbiente') {
                title.textContent = 'Presión de vapor ambiente (Kpa) · Clamshell #' + itemId;
                body.innerHTML = `
                    <div class="metric-grid-4">
                        <div class="form-group"><label>Inicio</label><input type="number" step="0.1" data-metric="presionAmbienteInicio" value="${metric.temperatura.presionAmbienteInicio || ''}"></div>
                        <div class="form-group"><label>Término</label><input type="number" step="0.1" data-metric="presionAmbienteTermino" value="${metric.temperatura.presionAmbienteTermino || ''}"></div>
                        <div class="form-group"><label>Llegada</label><input type="number" step="0.1" data-metric="presionAmbienteLlegada" value="${metric.temperatura.presionAmbienteLlegada || ''}"></div>
                        <div class="form-group"><label>Despacho</label><input type="number" step="0.1" data-metric="presionAmbienteDespacho" value="${metric.temperatura.presionAmbienteDespacho || ''}"></div>
                    </div>
                `;
            } else if (kind === 'presionFruta') {
                title.textContent = 'Presión de vapor fruta (Kpa) · Clamshell #' + itemId;
                body.innerHTML = `
                    <div class="metric-grid-4">
                        <div class="form-group"><label>Inicio</label><input type="number" step="0.1" data-metric="presionFrutaInicio" value="${metric.temperatura.presionFrutaInicio || ''}"></div>
                        <div class="form-group"><label>Término</label><input type="number" step="0.1" data-metric="presionFrutaTermino" value="${metric.temperatura.presionFrutaTermino || ''}"></div>
                        <div class="form-group"><label>Llegada</label><input type="number" step="0.1" data-metric="presionFrutaLlegada" value="${metric.temperatura.presionFrutaLlegada || ''}"></div>
                        <div class="form-group"><label>Despacho</label><input type="number" step="0.1" data-metric="presionFrutaDespacho" value="${metric.temperatura.presionFrutaDespacho || ''}"></div>
                    </div>
                `;
            }

            document.getElementById('metric-modal-overlay').style.display = 'flex';
        }

        function cerrarModalMetrica() {
            document.getElementById('metric-modal-overlay').style.display = 'none';
        }

        function guardarModalMetrica() {
            const item = data.find((entry) => entry.id === metricModalState.itemId);
            if (!item || !metricModalState.kind) return;
            const metricInputs = document.querySelectorAll('#metric-modal-body [data-metric]');
            metricInputs.forEach((input) => {
                item.metric[metricModalState.kind][input.getAttribute('data-metric')] = input.value;
            });
            cerrarModalMetrica();
            renderizarTarjetas();
        }

        function cerrarModal() {
            document.getElementById('modal-overlay').style.display = 'none';
        }

        window.onclick = (e) => {
            if (e.target == document.getElementById('modal-overlay')) cerrarModal();
            if (e.target == document.getElementById('metric-modal-overlay')) cerrarModalMetrica();
            if (e.target == document.getElementById('observation-modal-overlay')) cerrarModalObservacion();
            if (e.target == document.getElementById('essential-modal-overlay')) cerrarModalResumen();
            if (e.target == document.getElementById('control-global-modal-overlay')) cerrarModalControlGlobal();
            if (e.target == document.getElementById('llenado-horas-modal-overlay')) cerrarModalHorasLlenado();
            if (fabMenu && !fabMenu.contains(e.target)) establecerMenuFlotanteAbierto(false);
        }

        ensayoActivo = obtenerEnsayoActivo();
        actualizarIconos();
        renderizarTarjetas();
        renderizarPanelLlenadoJarras();


