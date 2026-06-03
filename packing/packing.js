(function initPackingApp() {
    const API_URL = (String(window.APPS_SCRIPT_API_URL || '').trim()
        || 'https://script.google.com/macros/s/AKfycbwdC1lwuGNT01xfLE_0jI31oXU13rBinYPKwlVfkZwqmIJGqSRuvPnq4-A9b6tHZThN/exec');
    const SYNC_QUEUE_KEY = 'tiempos-sync-queue-v1';
    const PACKING_CHIPS_COLLAPSED_KEY = 'packing-chips-collapsed-v1';
    const MIN_LOADER_MS = 350;

    const elFecha = document.getElementById('packing-fecha');
    const elMuestra = document.getElementById('packing-muestra');
    const elHoraInicio = document.getElementById('packing-hora-inicio');
    const elHoraRow = document.getElementById('packing-hora-row');
    const elResumen = document.getElementById('packing-resumen');
    const elChipsPanel = document.getElementById('packing-chips-panel');
    const elResumenToggle = document.getElementById('packing-resumen-toggle');
    const elPreview = document.getElementById('packing-preview');
    const elPreviewLoader = document.getElementById('packing-preview-loader');
    const elPreviewLoaderMsg = document.getElementById('packing-preview-loader-msg');
    const elSelectBlock = document.getElementById('packing-select-block');
    const elMetaShell = document.getElementById('packing-meta-shell');
    const elSelectLoader = document.getElementById('packing-select-loader');
    const elSelectLoaderMsg = document.getElementById('packing-select-loader-msg');
    const elStatus = document.getElementById('packing-status');
    const elHeaderCard = document.getElementById('header-status-card');
    const elHeaderConn = document.getElementById('header-conn-label');
    const elHeaderPend = document.getElementById('header-pendientes-count');

    const previewIds = {
        traz: 'pk-traz',
        variedad: 'pk-variedad',
        placa: 'pk-placa'
    };

    function horaLocalAhora() {
        const d = new Date();
        return String(d.getHours()).padStart(2, '0') + ':'
            + String(d.getMinutes()).padStart(2, '0');
    }

    /** Hora del input → campo RESPONSABLE (personal) al enviar packing. */
    function getHoraPersonal() {
        return String(elHoraInicio?.value || '').trim();
    }

    function initHoraInicio(refrescar) {
        if (!elHoraInicio) return;
        if (refrescar || !elHoraInicio.value) elHoraInicio.value = horaLocalAhora();
    }

    function ensayoSeleccionado() {
        const raw = elMuestra?.value || '';
        const parts = String(raw).split('|');
        return {
            num_muestra: parts[0] || '',
            ensayo_numero: parts.length >= 2 ? parts[1] : ''
        };
    }

    const TIEMPOS_MUESTRA_TOTAL = 5;
    const TIEMPOS_MUESTRA_IDS = [
        'pk-tiempo-recepcion',
        'pk-tiempo-ingreso-gas',
        'pk-tiempo-salida-gas',
        'pk-tiempo-ingreso-pre',
        'pk-tiempo-salida-pre'
    ];

    const elCardsWrap = document.getElementById('packing-cards-wrap');
    const elTiemposModal = document.getElementById('packing-tiempos-modal-overlay');
    const elTiemposModalTitle = document.getElementById('packing-tiempos-modal-title');
    const elTiemposCancel = document.getElementById('packing-tiempos-cancel');
    const elTiemposGuardar = document.getElementById('packing-tiempos-guardar');
    const elFabAgregar = document.getElementById('fab-packing-agregar');
    const elFabRestanteBadge = document.getElementById('fab-packing-restante-badge');
    let elMetricTiempoBtn = null;
    let elMetricTiempoCount = null;
    const elPesosModal = document.getElementById('packing-pesos-modal-overlay');
    const elPesosModalTitle = document.getElementById('packing-pesos-modal-title');
    const elPesosGuardar = document.getElementById('packing-pesos-guardar');
    const elBtnEnviarPacking = document.getElementById('btn-guardar-enviar-packing');
    const elEnvioBarPacking = document.getElementById('packing-envio-bar');
    let envioPackingEnCurso = false;

    const PACKING_PESO_CAMPOS = [
        { key: 'recepcion', inpId: 'pk-inp-peso-recep', cardId: null, rowIdx: 5 },
        { key: 'ingresoGas', inpId: 'pk-inp-peso-ing-gas', cardId: 'pk-peso-ing-gas', rowIdx: 6 },
        { key: 'salidaGas', inpId: 'pk-inp-peso-sal-gas', cardId: 'pk-peso-sal-gas', rowIdx: 7 },
        { key: 'ingresoPre', inpId: 'pk-inp-peso-ing-pre', cardId: 'pk-peso-ing-pre', rowIdx: 8 },
        { key: 'salidaPre', inpId: 'pk-inp-peso-sal-pre', cardId: 'pk-peso-sal-pre', rowIdx: 9 }
    ];

    const packingQuota = {
        filasTotalCampo: 0,
        filasPackingRegistradas: 0,
        maxClamshell: 0,
        tipoMuestra: 'T'
    };
    let packingCards = [];
    let packingCardSeq = 0;
    let packingActiveCardId = null;

    function pesosVaciosPacking() {
        return { recepcion: 0, ingresoGas: 0, salidaGas: 0, ingresoPre: 0, salidaPre: 0 };
    }

    function pesoNumero(val) {
        const n = Number(val);
        return Number.isFinite(n) ? n : 0;
    }

    async function swalFirePacking(options) {
        if (!(window.Swal && typeof window.Swal.fire === 'function')) return null;
        return window.Swal.fire(options || {});
    }

    function mostrarToastPacking(icono, titulo, texto) {
        if (window.Swal && typeof window.Swal.fire === 'function') {
            void swalFirePacking({
                toast: true,
                position: 'top-end',
                icon: icono || 'info',
                title: titulo || '',
                text: texto || '',
                showConfirmButton: false,
                timer: 3200,
                timerProgressBar: true
            });
            return;
        }
        if (texto || titulo) setStatus((titulo ? titulo + ': ' : '') + (texto || ''), icono === 'error' ? 'error' : '');
    }

    function setButtonLoadingPacking(btn, loading, textoCargando) {
        if (!btn) return;
        if (loading) {
            if (!btn.dataset.pkLabelOriginal) btn.dataset.pkLabelOriginal = btn.textContent || '';
            btn.disabled = true;
            btn.textContent = textoCargando || 'Enviando...';
            btn.classList.add('is-loading');
        } else {
            btn.disabled = false;
            btn.textContent = btn.dataset.pkLabelOriginal || 'Enviar registro';
            btn.classList.remove('is-loading');
            actualizarBtnEnviarPacking();
        }
    }

    function actualizarBtnEnviarPacking() {
        if (!elBtnEnviarPacking) return;
        const ok = muestraSeleccionada()
            && packingCards.length > 0
            && !elCardsWrap?.classList.contains('is-disabled')
            && !envioPackingEnCurso;
        elBtnEnviarPacking.disabled = !ok;
        if (elEnvioBarPacking) {
            elEnvioBarPacking.classList.toggle('is-disabled', !muestraSeleccionada());
        }
    }

    function textoPesoCard(g) {
        const n = pesoNumero(g);
        return (Math.round(n * 10) / 10) + 'g';
    }

    function aplicarCuotaDesdeDetalle(d) {
        const totalCampo = Number(d.FILAS_TOTAL_CAMPO ?? d.numFilas ?? 0);
        packingQuota.filasTotalCampo = Number.isFinite(totalCampo) && totalCampo >= 0 ? totalCampo : 0;
        const packingHechas = Number(d.FILAS_PACKING_REGISTRADAS ?? 0);
        packingQuota.filasPackingRegistradas = Number.isFinite(packingHechas) && packingHechas >= 0 ? packingHechas : 0;
        let max = Number(d.MAX_CLAMSHELL ?? 0);
        if (!max && d.N_CLAMSHELL != null && String(d.N_CLAMSHELL).trim() !== '') {
            const parsed = parseInt(String(d.N_CLAMSHELL).trim(), 10);
            if (!isNaN(parsed) && parsed > 0) max = parsed;
        }
        if (packingQuota.filasTotalCampo > 0 && (max <= 0 || max < packingQuota.filasTotalCampo)) {
            max = packingQuota.filasTotalCampo;
        }
        packingQuota.maxClamshell = max > 0 ? max : 0;
        packingQuota.tipoMuestra = String(d.TIPO_MUESTRA ?? d.tipo ?? 'T').trim() || 'T';
    }

    function cuotaMaximaEfectivaPacking() {
        if (packingQuota.maxClamshell > 0) return packingQuota.maxClamshell;
        if (packingQuota.filasTotalCampo > 0) return packingQuota.filasTotalCampo;
        return 8;
    }

    function restantesPorAgregarPacking() {
        const max = cuotaMaximaEfectivaPacking();
        return Math.max(0, max - packingQuota.filasPackingRegistradas - packingCards.length);
    }

    function slotsDisponiblesEnServidorPacking() {
        const max = cuotaMaximaEfectivaPacking();
        return Math.max(0, max - packingQuota.filasPackingRegistradas);
    }

    function crearCardPacking(num) {
        return {
            id: ++packingCardSeq,
            clamshellNum: num,
            pesos: pesosVaciosPacking()
        };
    }

    function crearElementoCardPreviewPacking(motivo) {
        const previewCard = { clamshellNum: 1, pesos: pesosVaciosPacking() };
        const art = crearElementoCardPacking(previewCard, 0);
        art.classList.add('packing-card-preview');
        art.classList.remove('packing-card-clickable');
        art.removeAttribute('tabindex');
        art.removeAttribute('data-card-id');
        if (motivo === 'completo') {
            art.dataset.previewMotivo = 'completo';
        }
        return art;
    }

    function ensureCardPorDefectoPacking() {
        if (!muestraSeleccionada() || packingCards.length > 0) return null;
        const disponibles = slotsDisponiblesEnServidorPacking();
        if (disponibles <= 0) {
            packingCards = [];
            packingActiveCardId = null;
            setStatus(
                'Packing completo en servidor ('
                + packingQuota.filasPackingRegistradas + '/' + cuotaMaximaEfectivaPacking() + ').',
                'warn'
            );
            renderizarCardsPacking();
            actualizarFabRestanteBadge();
            actualizarBtnEnviarPacking();
            return null;
        }
        const num = packingQuota.filasPackingRegistradas + 1;
        const card = crearCardPacking(num);
        packingCards = [card];
        packingActiveCardId = card.id;
        renderizarCardsPacking();
        setStatus('');
        if (elStatus) elStatus.hidden = true;
        return card;
    }

    function getCardPackingById(id) {
        return packingCards.find((c) => c.id === id) || null;
    }

    function actualizarFabRestanteBadge() {
        const rest = restantesPorAgregarPacking();
        const max = cuotaMaximaEfectivaPacking();
        const hayMuestra = muestraSeleccionada();
        const badgeVal = hayMuestra ? rest : 0;

        if (elFabRestanteBadge) {
            elFabRestanteBadge.textContent = String(badgeVal);
            elFabRestanteBadge.removeAttribute('aria-hidden');
        }
        if (elFabAgregar) {
            elFabAgregar.disabled = false;
            elFabAgregar.title = !hayMuestra
                ? 'Seleccionar muestra para continuar por favor'
                : (rest > 0
                    ? ('Agregar clamshell · faltan ' + rest + ' de ' + max)
                    : ('Límite packing · ' + packingQuota.filasPackingRegistradas + '/' + max));
        }
    }

    function onFabAgregarPackingClick() {
        if (!muestraSeleccionada()) {
            mostrarToastPacking('info', 'Seleccionar muestra', 'Seleccionar muestra para continuar por favor.');
            return;
        }
        if (restantesPorAgregarPacking() <= 0) {
            const max = cuotaMaximaEfectivaPacking();
            mostrarToastPacking(
                'info',
                'Límite alcanzado',
                'Ya no puedes agregar clamshells (' + packingQuota.filasPackingRegistradas + '/' + max + ').'
            );
            return;
        }
        agregarCardPackingYAbrirPesos();
    }

    function htmlMetricActionsPacking() {
        return '<div class="metric-actions">'
            + '<div class="metric-btn-wrap">'
            + '<button class="metric-btn" type="button" id="packing-metric-tiempo-btn" title="Tiempos de la muestra" aria-label="Tiempos de la muestra">'
            + '<i data-lucide="timer"></i></button>'
            + '<span class="metric-count" id="packing-metric-tiempo-count">0/5</span></div>'
            + '<div class="metric-btn-wrap">'
            + '<button class="metric-btn" type="button" disabled title="Próximamente" aria-label="Presión ambiente">'
            + '<i data-lucide="cloud"></i></button><span class="metric-count">0/4</span></div>'
            + '<div class="metric-btn-wrap">'
            + '<button class="metric-btn" type="button" disabled title="Próximamente" aria-label="Presión fruta">'
            + '<i data-lucide="apple"></i></button><span class="metric-count">0/4</span></div>'
            + '</div>';
    }

    function crearElementoCardPacking(card, index) {
        const p = card.pesos;
        const num = card.clamshellNum;
        const canDelete = packingCards.length > 1;
        const art = document.createElement('article');
        art.className = 'clamshell-card packing-clamshell-card packing-card-clickable';
        art.dataset.cardId = String(card.id);
        art.setAttribute('aria-label', 'Clamshell ' + num);
        art.tabIndex = 0;
        art.innerHTML = ''
            + '<div class="card-header">'
            + '<div class="id-badge">'
            + '<div class="number-box packing-clamshell-num">' + num + '</div>'
            + '<div class="packing-card-title-block">'
            + '<p class="packing-card-title">Clamshell</p>'
            + '<span class="packing-card-sub">' + packingQuota.tipoMuestra + '</span>'
            + '</div></div>'
            + '<div class="clamshell-header-actions">'
            + '<button type="button" class="jarra-tag packing-peso-recep-btn" data-card-id="' + card.id + '" title="Peso recepción packing">'
            + '<span class="packing-peso-recep-text"><span class="packing-peso-recep-label">PESO RECEP.</span>'
            + '<span class="packing-peso-recep-val">' + textoPesoCard(p.recepcion) + '</span></span></button>'
            + '<button type="button" class="clamshell-delete-btn packing-card-delete" data-card-id="' + card.id + '" '
            + (canDelete ? '' : 'disabled ')
            + 'title="' + (canDelete ? 'Quitar este clamshell' : 'Debe quedar al menos uno') + '" aria-label="Eliminar">'
            + '<i data-lucide="trash-2"></i></button></div></div>'
            + '<div class="weights-panel"><div class="weights-grid packing-weights-grid">'
            + '<div class="weight-box"><label>PESO I-GASIF.</label><span class="weight-value">' + textoPesoCard(p.ingresoGas) + '</span></div>'
            + '<div class="weight-box"><label>PESO S-GASIF.</label><span class="weight-value">' + textoPesoCard(p.salidaGas) + '</span></div>'
            + '<div class="observation-box"><button type="button" disabled title="Próximamente">'
            + '<span class="observation-text is-empty">Sin observación registrada</span></button></div>'
            + '</div>' + (index === 0 ? htmlMetricActionsPacking() : '') + '</div>'
            + '<div class="logistics-info packing-prefrio-row">'
            + '<div class="logistic-point"><i data-lucide="calendar-check-2"></i><div>'
            + '<p style="color: #94A3B8; font-size: 9px;">PESO INGRESO PREFRIO</p><b>' + textoPesoCard(p.ingresoPre) + '</b></div></div>'
            + '<div class="logistic-point"><i data-lucide="truck"></i><div>'
            + '<p style="color: #94A3B8; font-size: 9px;">PESO SALIDA PREFRIO</p><b>' + textoPesoCard(p.salidaPre) + '</b></div></div>'
            + '</div>';
        return art;
    }

    function renderizarCardsPacking() {
        if (!elCardsWrap) return;
        elCardsWrap.innerHTML = '';
        if (!packingCards.length) {
            const motivo = (muestraSeleccionada() && slotsDisponiblesEnServidorPacking() <= 0) ? 'completo' : '';
            elCardsWrap.appendChild(crearElementoCardPreviewPacking(motivo));
        } else {
            packingCards.forEach((card, index) => {
                elCardsWrap.appendChild(crearElementoCardPacking(card, index));
            });
        }
        elMetricTiempoBtn = document.getElementById('packing-metric-tiempo-btn');
        elMetricTiempoCount = document.getElementById('packing-metric-tiempo-count');
        if (elMetricTiempoBtn) {
            elMetricTiempoBtn.disabled = elCardsWrap.classList.contains('is-disabled');
        }
        actualizarContadoresTiempo();
        crearIconosPacking();
        actualizarFabRestanteBadge();
        actualizarBtnEnviarPacking();
    }

    function reiniciarCardsPacking() {
        packingCardSeq = 0;
        packingCards = [];
        packingActiveCardId = null;
        const disponibles = slotsDisponiblesEnServidorPacking();
        if (disponibles <= 0) {
            packingCards = [];
            packingActiveCardId = null;
            setStatus(
                'Packing completo en servidor ('
                + packingQuota.filasPackingRegistradas + '/' + cuotaMaximaEfectivaPacking() + ').',
                'warn'
            );
            renderizarCardsPacking();
            return;
        }
        setStatus('');
        if (elStatus) elStatus.hidden = true;
        const card = crearCardPacking(packingQuota.filasPackingRegistradas + 1);
        packingCards = [card];
        packingActiveCardId = card.id;
        renderizarCardsPacking();
    }

    function resetCardsPacking() {
        packingQuota.filasTotalCampo = 0;
        packingQuota.filasPackingRegistradas = 0;
        packingQuota.maxClamshell = 0;
        packingQuota.tipoMuestra = 'T';
        packingCards = [];
        packingActiveCardId = null;
        renderizarCardsPacking();
    }

    function agregarCardPacking() {
        if (!muestraSeleccionada() || restantesPorAgregarPacking() <= 0) return null;
        const num = packingQuota.filasPackingRegistradas + packingCards.length + 1;
        const card = crearCardPacking(num);
        packingCards.push(card);
        packingActiveCardId = card.id;
        renderizarCardsPacking();
        establecerMenuFlotantePacking(false);
        return card;
    }

    function agregarCardPackingYAbrirPesos() {
        let card = null;
        if (!packingCards.length) {
            card = ensureCardPorDefectoPacking();
        } else {
            card = agregarCardPacking();
        }
        if (!card) return;
        abrirModalPesosPacking(card.id);
    }

    async function eliminarCardPacking(cardId) {
        if (packingCards.length <= 1) return;
        const card = getCardPackingById(cardId);
        if (!card) return;
        const mensaje = 'Se eliminará Clamshell #' + card.clamshellNum + ' de esta muestra. ¿Deseas continuar?';
        let confirmado = false;
        if (window.Swal && typeof window.Swal.fire === 'function') {
            const resp = await swalFirePacking({
                icon: 'warning',
                title: 'Confirmar eliminación',
                text: mensaje,
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'No',
                reverseButtons: true
            });
            confirmado = !!(resp && resp.isConfirmed);
        } else {
            confirmado = window.confirm(mensaje);
        }
        if (!confirmado) return;
        packingCards = packingCards.filter((c) => c.id !== cardId);
        packingCards.forEach((c, i) => {
            c.clamshellNum = packingQuota.filasPackingRegistradas + i + 1;
        });
        if (!getCardPackingById(packingActiveCardId)) {
            packingActiveCardId = packingCards[0]?.id ?? null;
        }
        renderizarCardsPacking();
        setStatus('');
        if (elStatus) elStatus.hidden = true;
    }

    function abrirModalPesosPacking(cardId) {
        if (!muestraSeleccionada() || !elPesosModal) return;
        const card = getCardPackingById(cardId) || getCardPackingById(packingActiveCardId) || packingCards[0];
        if (!card) return;
        packingActiveCardId = card.id;
        if (elPesosModalTitle) elPesosModalTitle.textContent = 'Editar Clamshell #' + card.clamshellNum;
        PACKING_PESO_CAMPOS.forEach((c) => {
            const inp = document.getElementById(c.inpId);
            if (inp) inp.value = String(pesoNumero(card.pesos[c.key]));
        });
        elPesosModal.style.display = 'flex';
        elPesosModal.setAttribute('aria-hidden', 'false');
    }

    function cerrarModalPesosPacking() {
        if (!elPesosModal) return;
        elPesosModal.style.display = 'none';
        elPesosModal.setAttribute('aria-hidden', 'true');
    }

    function guardarModalPesosPacking() {
        if (!muestraSeleccionada()) {
            setStatus('Selecciona una muestra antes de guardar.', 'warn');
            return;
        }
        if (!packingCards.length) ensureCardPorDefectoPacking();
        const card = getCardPackingById(packingActiveCardId) || packingCards[0];
        if (!card) {
            setStatus('No hay clamshell para guardar. Selecciona una muestra.', 'warn');
            return;
        }
        packingActiveCardId = card.id;
        PACKING_PESO_CAMPOS.forEach((c) => {
            const inp = document.getElementById(c.inpId);
            card.pesos[c.key] = pesoNumero(inp?.value);
        });
        renderizarCardsPacking();
        cerrarModalPesosPacking();
        setStatus('');
        if (elStatus) elStatus.hidden = true;
        mostrarToastPacking('success', 'Guardado', 'Clamshell #' + card.clamshellNum + ' actualizado.');
    }

    function aplicarPesosPackingARow(row, pesos) {
        const p = pesos || pesosVaciosPacking();
        PACKING_PESO_CAMPOS.forEach((c) => {
            if (c.rowIdx == null || c.rowIdx < 0) return;
            const n = pesoNumero(p[c.key]);
            row[c.rowIdx] = n > 0 ? String(n) : '0';
        });
    }
    /** Solo consola: filas en servidor y despacho acopio (GET detalle), arriba → abajo. */
    function logMetaServidorPackingConsola(d) {
        if (!d) return;
        const total = Number(d.FILAS_REGISTRADAS ?? d.numFilas ?? 0);
        const totalOk = Number.isFinite(total) && total >= 0 ? total : 0;
        console.log('[Packing] Total de registro Clamshells en servidor:', totalOk);
        let maxLog = Number(d.MAX_CLAMSHELL ?? 0);
        if (!maxLog && d.N_CLAMSHELL != null && String(d.N_CLAMSHELL).trim() !== '') {
            const p = parseInt(String(d.N_CLAMSHELL).trim(), 10);
            if (!isNaN(p) && p > 0) maxLog = p;
        }
        const packingHechas = Number(d.FILAS_PACKING_REGISTRADAS ?? 0);
        if (maxLog > 0) {
            console.log('[Packing] Máximo clamshells:', maxLog, '| packing en servidor:', packingHechas,
                '| faltan por agregar:', Math.max(0, maxLog - packingHechas - 1));
        }

        const porFila = Array.isArray(d.despachoPorFila) ? d.despachoPorFila : [];
        const fallback = d.DESPACHO_ACOPIO ?? d.despacho_acopio_gramos;
        for (let i = 0; i < totalOk; i++) {
            const v = porFila[i] != null && porFila[i] !== '' ? porFila[i] : fallback;
            console.log('[Packing] DESPACHO_ACOPIO (campo):', v != null && v !== '' ? v : '—', '· #' + (i + 1));
        }
    }

    function getTiemposMuestra() {
        return TIEMPOS_MUESTRA_IDS.map((id) => String(document.getElementById(id)?.value || '').trim());
    }

    function conteoTiemposMuestra() {
        const vals = getTiemposMuestra();
        const done = vals.filter(Boolean).length;
        return { done, total: TIEMPOS_MUESTRA_TOTAL };
    }

    function textoConteoTiempo(c) {
        return String(c.done) + '/' + String(c.total);
    }

    function actualizarContadoresTiempo() {
        const c = conteoTiemposMuestra();
        const txt = textoConteoTiempo(c);
        const filled = c.done > 0;
        if (elMetricTiempoCount) {
            elMetricTiempoCount.textContent = txt;
            elMetricTiempoCount.classList.toggle('is-filled', filled);
        }
    }

    function muestraSeleccionada() {
        return !!String(elMuestra?.value || '').trim();
    }

    let tiemposModalBackup = [];

    function tituloModalTiempos() {
        const card = getCardPackingById(packingActiveCardId) || packingCards[0];
        const n = card ? card.clamshellNum : 1;
        return 'Tiempos de la muestra (hora) · Clamshell #' + n;
    }

    function restaurarTiemposDesdeBackup() {
        TIEMPOS_MUESTRA_IDS.forEach((id, i) => {
            const inp = document.getElementById(id);
            if (inp) inp.value = tiemposModalBackup[i] || '';
        });
        actualizarContadoresTiempo();
    }

    function abrirTiemposMuestra(ev) {
        if (!muestraSeleccionada()) return;
        if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
        }
        if (!elTiemposModal) return;
        tiemposModalBackup = getTiemposMuestra();
        if (elTiemposModalTitle) elTiemposModalTitle.textContent = tituloModalTiempos();
        elTiemposModal.style.display = 'flex';
        elTiemposModal.setAttribute('aria-hidden', 'false');
        if (window.CustomTimePicker && typeof window.CustomTimePicker.init === 'function') {
            window.CustomTimePicker.init(elTiemposModal);
        }
    }

    function cerrarTiemposMuestra(revertir) {
        if (!elTiemposModal) return;
        if (revertir) restaurarTiemposDesdeBackup();
        elTiemposModal.style.display = 'none';
        elTiemposModal.setAttribute('aria-hidden', 'true');
    }

    function guardarTiemposMuestra() {
        actualizarContadoresTiempo();
        tiemposModalBackup = getTiemposMuestra();
        cerrarTiemposMuestra(false);
        mostrarToastPacking('success', 'Tiempos guardados', 'Los tiempos quedaron listos para enviar.');
    }

    function setPackingCardHabilitada(on) {
        const habilitada = !!on;
        if (elHoraRow) {
            elHoraRow.classList.toggle('is-disabled', !habilitada);
            elHoraRow.setAttribute('aria-disabled', (!habilitada).toString());
        }
        if (elHoraInicio) elHoraInicio.disabled = !habilitada;
        if (elCardsWrap) {
            elCardsWrap.classList.toggle('is-disabled', !habilitada);
            elCardsWrap.setAttribute('aria-disabled', (!habilitada).toString());
        }
        const tituloTiempo = habilitada ? 'Tiempos de la muestra (hora)' : 'Selecciona una muestra';
        if (elMetricTiempoBtn) {
            elMetricTiempoBtn.disabled = !habilitada;
            elMetricTiempoBtn.title = tituloTiempo;
        }
        if (elControlBarPacking) elControlBarPacking.classList.toggle('is-disabled', !habilitada);
        const tituloCg = habilitada ? 'Temperatura global' : 'Selecciona una muestra';
        const tituloCgHum = habilitada ? 'Humedad global' : 'Selecciona una muestra';
        if (elBtnTempPacking) {
            elBtnTempPacking.disabled = !habilitada;
            elBtnTempPacking.title = tituloCg;
        }
        if (elBtnHumPacking) {
            elBtnHumPacking.disabled = !habilitada;
            elBtnHumPacking.title = tituloCgHum;
        }
        if (!habilitada) cerrarModalControlGlobalPacking();
        actualizarBtnEnviarPacking();
        TIEMPOS_MUESTRA_IDS.forEach((id) => {
            const inp = document.getElementById(id);
            if (inp) inp.disabled = !habilitada;
        });
        if (!habilitada) {
            cerrarTiemposMuestra(true);
            cerrarModalPesosPacking();
        } else {
            ensureCardPorDefectoPacking();
        }
        if (habilitada) crearIconosPacking();
        actualizarFabRestanteBadge();
    }

    const CONTROL_ETAPAS_PACKING = [
        { idx: 0, label: 'Recepción', shortLabel: 'Recep.', idPart: 'recepcion' },
        { idx: 1, label: 'Ingreso gasificado', shortLabel: 'Ing.gas', idPart: 'ingreso_gas' },
        { idx: 2, label: 'Salida gasificado', shortLabel: 'Sal.gas', idPart: 'salida_gas' },
        { idx: 3, label: 'Ingreso prefrío', shortLabel: 'Ing.pre', idPart: 'ingreso_pre' },
        { idx: 4, label: 'Salida prefrío', shortLabel: 'Sal.pre', idPart: 'salida_pre' }
    ];

    function idControlPacking(prefijo, idPart) {
        return prefijo + '-' + idPart + '_packing';
    }

    const packingControlState = {
        tipo: null,
        temperatura: { amb: ['', '', '', '', ''], pulpa: ['', '', '', '', ''] },
        humedad: ['', '', '', '', '']
    };

    const elControlBarPacking = document.getElementById('control_equitativo_bar_packing');
    const elBtnTempPacking = document.getElementById('btn_temp_packing');
    const elBtnHumPacking = document.getElementById('btn_hum_packing');
    const elControlModalPacking = document.getElementById('control_global_modal_overlay_packing');
    const elControlModalTitlePacking = document.getElementById('control_global_modal_title_packing');
    const elControlModalBodyPacking = document.getElementById('control_global_modal_body_packing');
    const elControlCancelPacking = document.getElementById('btn_cancel_control_global_packing');
    const elControlGuardarPacking = document.getElementById('btn_save_control_global_packing');

    function resetControlGlobalPacking() {
        packingControlState.tipo = null;
        packingControlState.temperatura.amb = ['', '', '', '', ''];
        packingControlState.temperatura.pulpa = ['', '', '', '', ''];
        packingControlState.humedad = ['', '', '', '', ''];
    }

    function sanitizarValorControlGlobalPacking(raw, opts) {
        const isDeleting = Boolean(opts && opts.isDeleting);
        let v = String(raw ?? '').replace(',', '.').replace(/[^\d.]/g, '');
        const firstDot = v.indexOf('.');
        if (firstDot >= 0) {
            v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
            const parts = v.split('.');
            v = parts[0].slice(0, 2) + '.' + (parts[1] || '').slice(0, 1);
        } else {
            v = v.slice(0, 3);
            if (!isDeleting && v.length >= 2) {
                const ent = v.slice(0, 2);
                const dec = v.slice(2, 3);
                v = dec ? ent + '.' + dec : ent + '.';
            }
        }
        return v;
    }

    function normalizarValorControlGlobalPacking(raw) {
        const live = sanitizarValorControlGlobalPacking(raw);
        if (!live) return '';
        if (live.includes('.')) return live;
        if (live.length >= 3) return live.slice(0, 2) + '.' + live.slice(2, 3);
        return live;
    }

    function formatearInputControlGlobalPacking(input, final, opts) {
        if (!input) return;
        const normalizado = final
            ? normalizarValorControlGlobalPacking(input.value)
            : sanitizarValorControlGlobalPacking(input.value, opts);
        if (input.value !== normalizado) input.value = normalizado;
    }

    function leerControlGlobalPackingDesdeModal() {
        CONTROL_ETAPAS_PACKING.forEach((etapa) => {
            const i = etapa.idx;
            if (packingControlState.tipo === 'temperatura') {
                packingControlState.temperatura.amb[i] = String(document.getElementById(idControlPacking('visual-temp-amb', etapa.idPart))?.value || '').trim();
                packingControlState.temperatura.pulpa[i] = String(document.getElementById(idControlPacking('visual-temp-pulpa', etapa.idPart))?.value || '').trim();
            } else if (packingControlState.tipo === 'humedad') {
                packingControlState.humedad[i] = String(document.getElementById(idControlPacking('visual-cg-humedad', etapa.idPart))?.value || '').trim();
            }
        });
    }

    function aplicarControlGlobalPackingARow(row) {
        const t = packingControlState.temperatura;
        const h = packingControlState.humedad;
        for (let i = 0; i < 5; i++) {
            row[10 + (i * 2)] = t.amb[i] || '';
            row[11 + (i * 2)] = t.pulpa[i] || '';
            row[20 + i] = h[i] || '';
        }
    }

    function celdaControlPacking(etapa, prefijo, valores, usarLabelCompleto) {
        const v = String(valores[etapa.idx] ?? '').replace(/"/g, '&quot;');
        const id = idControlPacking(prefijo, etapa.idPart);
        const txt = usarLabelCompleto ? etapa.label : (etapa.shortLabel || etapa.label);
        return '<div class="form-group"><label>' + txt + '</label>'
            + '<input type="text" inputmode="decimal" maxlength="4" class="packing-cg-inp" id="' + id + '" value="' + v + '" aria-label="' + etapa.label + '"></div>';
    }

    /** Misma cuadrícula que el modal Tiempos de la muestra: 2×2 + fila ancha. */
    function filaComoTiemposPacking(prefijo, valores) {
        const cuatro = CONTROL_ETAPAS_PACKING.filter((e) => e.idx < 4)
            .map((e) => celdaControlPacking(e, prefijo, valores, true)).join('');
        const quinto = CONTROL_ETAPAS_PACKING.find((e) => e.idx === 4);
        const v5 = String(valores[4] ?? '').replace(/"/g, '&quot;');
        const id5 = idControlPacking(prefijo, quinto.idPart);
        return '<div class="packing-tiempos-grid packing-cg-grid-tiempos">' + cuatro + '</div>'
            + '<div class="form-group packing-tiempo-row-full">'
            + '<label>' + quinto.label + '</label>'
            + '<input type="text" inputmode="decimal" maxlength="4" class="packing-cg-inp" id="' + id5 + '" value="' + v5 + '" aria-label="' + quinto.label + '">'
            + '</div>';
    }

    function filaCincoPacking(prefijo, valores) {
        const celdas = CONTROL_ETAPAS_PACKING.map((e) => celdaControlPacking(e, prefijo, valores, false)).join('');
        return '<div class="packing-cg-grid-5">' + celdas + '</div>';
    }

    function htmlGridControlPacking(tipo) {
        const t = packingControlState.temperatura;
        const h = packingControlState.humedad;
        if (tipo === 'temperatura') {
            return ''
                + '<p class="metric-mini-title">Temperatura ambiente (°C)</p>'
                + filaCincoPacking('visual-temp-amb', t.amb)
                + '<p class="metric-mini-title">Temperatura pulpa (°C)</p>'
                + filaCincoPacking('visual-temp-pulpa', t.pulpa);
        }
        return filaComoTiemposPacking('visual-cg-humedad', h);
    }

    function enlazarInputsControlGlobalPacking() {
        if (!elControlModalBodyPacking) return;
        elControlModalBodyPacking.querySelectorAll('input').forEach((input) => {
            formatearInputControlGlobalPacking(input, true);
            input.addEventListener('input', (ev) => {
                const inputType = String(ev?.inputType || '');
                formatearInputControlGlobalPacking(input, false, { isDeleting: inputType.includes('delete') });
                leerControlGlobalPackingDesdeModal();
            });
            input.addEventListener('change', () => {
                formatearInputControlGlobalPacking(input, true);
                leerControlGlobalPackingDesdeModal();
            });
        });
    }

    function abrirModalControlGlobalPacking(tipo) {
        if (!muestraSeleccionada() || !elControlModalPacking || !elControlModalBodyPacking) return;
        packingControlState.tipo = tipo;
        if (elControlModalTitlePacking) {
            elControlModalTitlePacking.textContent = tipo === 'temperatura'
                ? 'Control equitativo · Temperatura ambiente y pulpa (todos)'
                : 'Control equitativo · Humedad (todos)';
        }
        elControlModalBodyPacking.innerHTML = htmlGridControlPacking(tipo);
        enlazarInputsControlGlobalPacking();
        elControlModalPacking.style.display = 'flex';
        elControlModalPacking.setAttribute('aria-hidden', 'false');
    }

    function cerrarModalControlGlobalPacking() {
        if (!elControlModalPacking) return;
        elControlModalPacking.style.display = 'none';
        elControlModalPacking.setAttribute('aria-hidden', 'true');
        if (elControlModalBodyPacking) elControlModalBodyPacking.innerHTML = '';
        packingControlState.tipo = null;
    }

    function guardarModalControlGlobalPacking() {
        if (!elControlModalBodyPacking) return;
        const incompleto = [...elControlModalBodyPacking.querySelectorAll('input')]
            .some((inp) => String(inp.value || '').trim().endsWith('.'));
        if (incompleto) {
            setStatus('Completa el decimal. Ejemplo: 11.2 (no 11.).', 'warn');
            return;
        }
        leerControlGlobalPackingDesdeModal();
        cerrarModalControlGlobalPacking();
        setStatus('');
        if (elStatus) elStatus.hidden = true;
    }

    function buildPackingRowDesdeCard(card) {
        const tiempos = getTiemposMuestra();
        const row = new Array(36).fill('');
        for (let i = 0; i < tiempos.length && i < 5; i++) row[i] = tiempos[i];
        aplicarPesosPackingARow(row, card.pesos);
        aplicarControlGlobalPackingARow(row);
        return row;
    }

    function getMetaEnvioPacking() {
        const sel = ensayoSeleccionado();
        const hora = getHoraPersonal();
        return {
            mode: 'packing',
            guardar_packing: true,
            actualizar_c5: false,
            guardar_thermoking: false,
            fecha: elFecha?.value || '',
            ensayo_numero: sel.ensayo_numero,
            num_muestra: sel.num_muestra,
            fecha_inspeccion: elFecha?.value || '',
            responsable: hora,
            hora_recepcion: hora,
            hora_inicio_recepcion_c5: hora,
            packingRows: packingCards.map((c) => buildPackingRowDesdeCard(c))
        };
    }

    async function guardarRegistroYEnviarDesdePantallaPacking() {
        if (envioPackingEnCurso) return;
        if (!muestraSeleccionada()) {
            setStatus('Selecciona una muestra antes de enviar.', 'warn');
            return;
        }
        if (!packingCards.length) {
            setStatus('Agrega al menos un clamshell.', 'warn');
            return;
        }
        if (!navigator.onLine) {
            setStatus('Sin internet para enviar al servidor.', 'warn');
            return;
        }
        const sel = ensayoSeleccionado();
        const body = getMetaEnvioPacking();
        envioPackingEnCurso = true;
        setButtonLoadingPacking(elBtnEnviarPacking, true, 'Enviando...');
        try {
            await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            mostrarToastPacking('success', 'Enviado', 'Registro packing enviado a la planilla.');
            setStatus('');
            if (elStatus) elStatus.hidden = true;
            const fecha = elFecha?.value || '';
            if (fecha && sel.ensayo_numero) {
                await cargarDetalle(fecha, sel.ensayo_numero);
            }
        } catch (err) {
            setStatus(String(err.message || err), 'error');
            mostrarToastPacking('error', 'Error', String(err.message || err));
        } finally {
            envioPackingEnCurso = false;
            setButtonLoadingPacking(elBtnEnviarPacking, false);
        }
    }

    let cargandoMuestrasSeq = 0;
    let lastDetallePacking = null;

    const elFabMenu = document.getElementById('fab-menu-packing');
    const elFabOptionsBtn = document.getElementById('fab-options-btn-packing');

    function crearIconosPacking() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function establecerMenuFlotantePacking(open) {
        if (!elFabMenu || !elFabOptionsBtn) return;
        elFabMenu.classList.toggle('is-open', open);
        elFabOptionsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    const elFechaRingWidget = document.getElementById('packing-fecha-ring-widget');
    const elFechaRingCircle = document.getElementById('packing-fecha-ring-circle');
    const elFechaRingPopover = document.getElementById('packing-fecha-ring-popover');

    function mensajeFechaRingPacking(d) {
        const mesLargo = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(d);
        const dia = d.getDate();
        const diasMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        if (dia <= 7) {
            return mesLargo + ' recién comenzó — día ' + dia + ' de ' + diasMes;
        }
        return 'Estamos en ' + mesLargo + ' — día ' + dia + ' de ' + diasMes;
    }

    function actualizarArcoFechaRingPacking(d) {
        if (!elFechaRingCircle) return;
        const dia = d.getDate();
        const diasMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const progreso = Math.min(1, Math.max(0, dia / diasMes));
        const arcoDeg = Math.round(70 * progreso);
        const corte = 280 - arcoDeg;
        elFechaRingCircle.style.background = 'conic-gradient(from 210deg, rgba(22, 76, 124, 0.18) 0deg '
            + corte + 'deg, rgba(29, 78, 137, 0.92) ' + corte + 'deg 360deg)';
    }

    function actualizarFechaRingPacking() {
        const dayEl = document.getElementById('fecha-ring-day-packing');
        const monthEl = document.getElementById('fecha-ring-month-packing');
        if (!dayEl || !monthEl) return;
        const d = new Date();
        dayEl.textContent = String(d.getDate()).padStart(2, '0');
        const mes = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d).replace('.', '');
        monthEl.textContent = (mes + ' ' + d.getFullYear()).toUpperCase();
        const msg = mensajeFechaRingPacking(d);
        if (elFechaRingPopover && !elFechaRingWidget?.classList.contains('is-popover-open')) {
            elFechaRingPopover.textContent = msg;
        }
        if (elFechaRingWidget) elFechaRingWidget.title = msg;
        actualizarArcoFechaRingPacking(d);
    }

    function togglePopoverFechaRingPacking(forceOpen) {
        if (!elFechaRingWidget || !elFechaRingPopover) return;
        const abrir = forceOpen === true
            ? true
            : (forceOpen === false ? false : !elFechaRingWidget.classList.contains('is-popover-open'));
        const d = new Date();
        elFechaRingPopover.textContent = mensajeFechaRingPacking(d);
        elFechaRingWidget.classList.toggle('is-popover-open', abrir);
        elFechaRingPopover.hidden = !abrir;
    }

    async function sincronizarConPlanillaPacking() {
        establecerMenuFlotantePacking(false);
        if (!navigator.onLine) {
            setStatus('Sin internet para sincronizar con la planilla.', 'warn');
            return;
        }
        setSelectLoading(true, 'Sincronizando planilla…');
        try {
            await acotarFechaDesdePlanilla();
            const fecha = elFecha?.value || '';
            if (fecha) await cargarMuestrasPorFecha(fecha);
            const sel = ensayoSeleccionado();
            if (fecha && sel.ensayo_numero) await cargarDetalle(fecha, sel.ensayo_numero);
            setStatus('Planilla actualizada.', '');
            if (elStatus) elStatus.hidden = true;
        } catch (err) {
            setStatus(String(err.message || err), 'error');
        } finally {
            setSelectLoading(false);
        }
    }

    async function borrarTodoYCachePacking() {
        establecerMenuFlotantePacking(false);
        const confirmado = window.confirm('Se borrarán datos locales, cola pendiente y caché. ¿Continuar?');
        if (!confirmado) return;
        try {
            if (typeof caches !== 'undefined' && caches?.keys) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
            }
            if (navigator.serviceWorker?.getRegistrations) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister()));
            }
        } catch (_) { /* ignore */ }
        try { localStorage.removeItem(SYNC_QUEUE_KEY); } catch (_) { /* ignore */ }
        setTimeout(() => window.location.reload(), 350);
    }

    function fabIniciarRegistroPacking() {
        establecerMenuFlotantePacking(false);
        if (!muestraSeleccionada()) {
            setStatus('Selecciona una muestra antes de cargar datos de prueba.', 'warn');
            return;
        }
        const card = packingCards[0];
        if (card) {
            card.pesos.recepcion = 120;
            card.pesos.ingresoGas = 118;
            card.pesos.salidaGas = 115;
            card.pesos.ingresoPre = 112;
            card.pesos.salidaPre = 110;
            renderizarCardsPacking();
        }
        const demoTiempos = ['08:00', '09:00', '10:00', '11:00', '12:00'];
        TIEMPOS_MUESTRA_IDS.forEach((id, i) => {
            const inp = document.getElementById(id);
            if (inp) inp.value = demoTiempos[i] || '';
        });
        actualizarContadoresTiempo();
        setStatus('Datos de prueba cargados en el clamshell.', '');
        if (elStatus) elStatus.hidden = true;
        crearIconosPacking();
    }

    function hoyIsoLocal() {
        const d = new Date();
        return d.getFullYear() + '-'
            + String(d.getMonth() + 1).padStart(2, '0') + '-'
            + String(d.getDate()).padStart(2, '0');
    }

    function sleepMs(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    async function withMinLoader(fn) {
        const t0 = Date.now();
        const out = await fn();
        const wait = MIN_LOADER_MS - (Date.now() - t0);
        if (wait > 0) await sleepMs(wait);
        return out;
    }

    function actualizarHeaderConexion() {
        const on = navigator.onLine;
        if (elHeaderCard) {
            elHeaderCard.classList.toggle('is-online', on);
            elHeaderCard.classList.toggle('is-offline', !on);
        }
        if (elHeaderConn) elHeaderConn.textContent = on ? 'En línea' : 'Sin internet';
    }

    function actualizarHeaderPendientes() {
        if (!elHeaderPend) return;
        let n = 0;
        try {
            const raw = localStorage.getItem(SYNC_QUEUE_KEY);
            const q = raw ? JSON.parse(raw) : [];
            if (Array.isArray(q)) {
                n = q.filter((r) => String(r?.estado || '') === 'pendiente').length;
            }
        } catch (_) { /* ignore */ }
        elHeaderPend.textContent = String(n).padStart(2, '0');
        elHeaderPend.classList.toggle('header-status-pend-num--alert', n > 0);
    }

    /** Solo bloquea fecha mientras carga; el select de muestra lo controla cargarMuestrasPorFecha. */
    function setSelectLoading(on, mensaje) {
        if (elSelectBlock) elSelectBlock.classList.toggle('is-busy', on);
        if (elSelectLoader) elSelectLoader.hidden = !on;
        if (elSelectLoaderMsg && mensaje) elSelectLoaderMsg.textContent = mensaje;
        if (elFecha) elFecha.disabled = on;
    }

    function setResumenVisible(visible) {
        if (!elResumen) return;
        elResumen.classList.toggle('is-empty', !visible);
        if (elResumenToggle) elResumenToggle.hidden = !visible;
        syncPackingFoldBtnAnchor();
    }

    let foldBtnSyncRaf = 0;
    function syncPackingFoldBtnAnchor() {
        if (foldBtnSyncRaf) cancelAnimationFrame(foldBtnSyncRaf);
        foldBtnSyncRaf = requestAnimationFrame(() => {
            foldBtnSyncRaf = 0;
            const shell = elMetaShell;
            const select = elSelectBlock;
            if (!shell || !select || elResumenToggle?.hidden) return;

            shell.style.setProperty('--pk-select-end', select.offsetHeight + 'px');

            const vacio = elResumen?.classList.contains('is-empty');
            const compact = !vacio && elResumen?.classList.contains('is-collapsed');
            shell.classList.toggle('is-fold-btn-compact', compact);
            shell.classList.toggle('is-fold-btn-expanded', !vacio && !compact);
        });
    }

    function setChipsPanelCollapsed(collapsed, persist) {
        if (!elChipsPanel || !elResumenToggle) return;
        elChipsPanel.classList.toggle('is-collapsed', collapsed);
        if (elResumen) elResumen.classList.toggle('is-collapsed', collapsed);
        elResumenToggle.classList.toggle('is-active', collapsed);
        elResumenToggle.setAttribute('aria-expanded', (!collapsed).toString());
        const titulo = collapsed ? 'Mostrar datos del registro' : 'Ocultar datos del registro';
        elResumenToggle.title = titulo;
        elResumenToggle.setAttribute('aria-label', titulo);
        if (persist) {
            try {
                localStorage.setItem(PACKING_CHIPS_COLLAPSED_KEY, collapsed ? '1' : '0');
            } catch (_) { /* ignore */ }
        }
        crearIconosPacking();
        syncPackingFoldBtnAnchor();
    }

    function toggleChipsPanelCollapsed() {
        if (elResumen?.classList.contains('is-loading-resumen')) return;
        setChipsPanelCollapsed(!elChipsPanel?.classList.contains('is-collapsed'), true);
    }

    function setPreviewLoading(on, mensaje) {
        if (on) setChipsPanelCollapsed(false, false);
        if (elResumen) elResumen.classList.toggle('is-loading-resumen', !!on);
        if (elPreview) {
            elPreview.classList.toggle('is-loading-preview', on);
            if (!on) elPreview.classList.remove('is-loaded');
        }
        if (elPreviewLoader) elPreviewLoader.hidden = !on;
        if (elPreviewLoaderMsg && mensaje) elPreviewLoaderMsg.textContent = mensaje;
        if (elResumenToggle) {
            elResumenToggle.disabled = !!on;
            elResumenToggle.setAttribute('aria-disabled', on ? 'true' : 'false');
            elResumenToggle.classList.toggle('is-loading-blocked', !!on);
            if (on) {
                elResumenToggle.title = 'Espera mientras cargan los datos';
            } else {
                const collapsed = elChipsPanel?.classList.contains('is-collapsed');
                const titulo = collapsed ? 'Mostrar datos del registro' : 'Ocultar datos del registro';
                elResumenToggle.title = titulo;
            }
        }
        syncPackingFoldBtnAnchor();
    }

    function setStatus(msg, tipo) {
        if (!elStatus) return;
        elStatus.textContent = msg || '';
        elStatus.className = 'packing-status-msg' + (tipo ? ' packing-status-msg--' + tipo : '');
        elStatus.hidden = !msg;
        syncPackingFoldBtnAnchor();
    }

    function callbackJsonp(params) {
        return new Promise((resolve, reject) => {
            const cb = '__pk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            const noop = function () {};
            const qs = new URLSearchParams(params || {});
            qs.set('callback', cb);
            qs.set('_ts', String(Date.now()));
            const src = API_URL + (API_URL.includes('?') ? '&' : '?') + qs.toString();
            const script = document.createElement('script');
            let done = false;
            const timeoutId = setTimeout(() => {
                if (done) return;
                done = true;
                window[cb] = noop;
                if (script.parentNode) script.parentNode.removeChild(script);
                reject(new Error('La planilla tardó demasiado. Reintenta.'));
            }, 14000);
            window[cb] = (payload) => {
                if (done) return;
                done = true;
                clearTimeout(timeoutId);
                window[cb] = noop;
                if (script.parentNode) script.parentNode.removeChild(script);
                resolve(payload);
            };
            script.onerror = () => {
                if (done) return;
                done = true;
                clearTimeout(timeoutId);
                window[cb] = noop;
                if (script.parentNode) script.parentNode.removeChild(script);
                reject(new Error('Error de conexión con el servidor'));
            };
            script.src = src;
            document.body.appendChild(script);
        });
    }

    function normalizarFechaIso(f) {
        const s = String(f || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        return s;
    }

    function armarListaMuestrasDesdeRegistrados(registrados, fechaIso) {
        const fecha = normalizarFechaIso(fechaIso);
        const seen = {};
        const lista = [];
        (registrados || []).forEach((item) => {
            const f = normalizarFechaIso(item?.fecha);
            if (f !== fecha) return;
            const num = String(item?.num_muestra || '').trim();
            const en = String(item?.ensayo_numero || '').trim();
            if (!num || !en) return;
            const key = num + '|' + en;
            if (seen[key]) return;
            seen[key] = true;
            lista.push({
                num_muestra: num,
                ensayo_numero: en,
                etiqueta: num + ' - ' + en + ' muestra'
            });
        });
        lista.sort((a, b) => {
            const na = Number(a.ensayo_numero) || 0;
            const nb = Number(b.ensayo_numero) || 0;
            return na - nb || String(a.num_muestra).localeCompare(String(b.num_muestra));
        });
        return lista;
    }

    async function fetchMuestrasPorFecha(fechaIso) {
        const r = await callbackJsonp({
            listado_muestras_fecha: '1',
            fecha: fechaIso
        });
        if (r && r.ok === true && Array.isArray(r.muestras)) {
            return r.muestras;
        }
        const r2 = await callbackJsonp({ listado_registrados: '1' });
        if (r2 && r2.ok === true && Array.isArray(r2.registrados)) {
            return armarListaMuestrasDesdeRegistrados(r2.registrados, fechaIso);
        }
        const err = String(r?.error || r2?.error || 'No se pudo leer el listado');
        if (err === 'accion_no_soportada') {
            throw new Error('Redespliega code.gs en Apps Script (falta listado_muestras_fecha)');
        }
        throw new Error(err);
    }

    function textoSelectMuestra(num, en) {
        const n = String(num || '').trim();
        const e = String(en || '').trim();
        if (n && e) return n + ' - ' + e + ' muestra';
        return n || e;
    }

    function poblarSelectMuestra(lista) {
        if (!elMuestra) return;
        elMuestra.innerHTML = '';
        const opt0 = document.createElement('option');
        opt0.value = '';
        const n = lista.length;
        opt0.textContent = n ? ('Seleccionar muestra (' + n + ')') : 'Sin muestras';
        elMuestra.appendChild(opt0);
        lista.forEach((item) => {
            const opt = document.createElement('option');
            const num = String(item.num_muestra || '').trim();
            const en = String(item.ensayo_numero || '').trim();
            opt.value = num + '|' + en;
            opt.textContent = textoSelectMuestra(num, en);
            elMuestra.appendChild(opt);
        });
        elMuestra.disabled = n === 0;
        elMuestra.removeAttribute('disabled');
        if (n === 0) elMuestra.setAttribute('disabled', 'disabled');
    }

    function setChip(id, texto, vacio, extraClass) {
        const el = document.getElementById(id);
        if (!el) return;
        const val = String(texto ?? '').trim();
        el.textContent = val || '--';
        el.className = 'packing-chip-value' + (extraClass ? ' ' + extraClass : '');
        el.classList.toggle('packing-chip-value--empty', vacio || !val);
    }

    function limpiarPreviewChips() {
        if (elPreview) {
            elPreview.classList.remove('is-loaded', 'is-loading-preview');
        }
        setChip(previewIds.traz, '', true, 'packing-chip-value--traz');
        setChip(previewIds.variedad, '', true);
        setChip(previewIds.placa, '', true);
    }

    function limpiarPreview() {
        setResumenVisible(false);
        lastDetallePacking = null;
        setPackingCardHabilitada(false);
        resetControlGlobalPacking();
        resetCardsPacking();
        limpiarPreviewChips();
    }

    function pintarPreview(d) {
        if (!d) {
            limpiarPreview();
            return;
        }
        const etapa = String(d.TRAZ_ETAPA ?? '').trim();
        const campo = String(d.TRAZ_CAMPO ?? '').trim();
        const turno = String(d.TRAZ_LIBRE ?? '').trim();
        const traz = [etapa, campo, turno].filter(Boolean).join('-');

        setChip(previewIds.traz, traz, !traz, 'packing-chip-value--traz');
        setChip(previewIds.variedad, d.VARIEDAD, !String(d.VARIEDAD ?? '').trim());
        setChip(previewIds.placa, d.PLACA_VEHICULO, !String(d.PLACA_VEHICULO ?? '').trim());

        aplicarCuotaDesdeDetalle(d);
        logMetaServidorPackingConsola(d);

        if (elPreview) {
            elPreview.classList.remove('is-loading-preview');
            elPreview.classList.add('is-loaded');
        }

        reiniciarCardsPacking();
        setPackingCardHabilitada(muestraSeleccionada());
        syncPackingFoldBtnAnchor();
    }

    function resetMuestraSelect(mensaje, deshabilitar) {
        poblarSelectMuestra([]);
        if (elMuestra && mensaje) {
            elMuestra.options[0].textContent = mensaje;
        }
        if (elMuestra) elMuestra.disabled = deshabilitar !== false;
        limpiarPreview();
    }

    function initFechaInput() {
        if (!elFecha) return;
        const hoy = hoyIsoLocal();
        if (!elFecha.value) elFecha.value = hoy;
        elFecha.max = hoy;
    }

    async function acotarFechaDesdePlanilla() {
        if (!elFecha || !navigator.onLine) return;
        setSelectLoading(true, 'Conectando con planilla…');
        try {
            await withMinLoader(async () => {
                const r = await callbackJsonp({});
                if (!r || r.ok !== true || !Array.isArray(r.fechas) || !r.fechas.length) return;
                const fechas = r.fechas.filter(Boolean).sort();
                elFecha.min = fechas[0];
                elFecha.max = fechas[fechas.length - 1];
                if (!elFecha.value || elFecha.value < elFecha.min || elFecha.value > elFecha.max) {
                    elFecha.value = fechas[fechas.length - 1];
                }
            });
        } catch (_) { /* ignore */ }
        finally {
            setSelectLoading(false);
        }
    }

    async function cargarMuestrasPorFecha(fechaIso) {
        const fecha = normalizarFechaIso(fechaIso);
        if (!fecha) {
            resetMuestraSelect('Seleccionar fecha', true);
            return;
        }

        const seq = ++cargandoMuestrasSeq;
        if (elMuestra) {
            elMuestra.innerHTML = '';
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Cargando…';
            elMuestra.appendChild(opt);
            elMuestra.disabled = true;
        }
        limpiarPreview();

        if (!navigator.onLine) {
            setStatus('Sin internet. Conéctate para cargar muestras.', 'warn');
            resetMuestraSelect('Sin conexión', true);
            return;
        }

        setSelectLoading(true, 'Cargando muestras…');
        setStatus('');
        if (elStatus) elStatus.hidden = true;

        try {
            const lista = await withMinLoader(() => fetchMuestrasPorFecha(fecha));
            if (seq !== cargandoMuestrasSeq) return;
            poblarSelectMuestra(lista);
            if (!lista.length) {
                setStatus('No hay registros de campo para esa fecha.', 'warn');
            }
        } catch (err) {
            if (seq !== cargandoMuestrasSeq) return;
            const msg = String(err.message || err);
            setStatus(msg, 'error');
            if (elMuestra) {
                elMuestra.innerHTML = '';
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'Error — cambia la fecha';
                elMuestra.appendChild(opt);
                elMuestra.disabled = false;
            }
        } finally {
            if (seq === cargandoMuestrasSeq) setSelectLoading(false);
        }
    }

    async function cargarDetalle(fechaIso, ensayoNumero) {
        if (!fechaIso || !ensayoNumero) return;
        if (!navigator.onLine) {
            setStatus('Sin internet para cargar el detalle.', 'warn');
            return;
        }
        limpiarPreviewChips();
        setResumenVisible(true);
        setChipsPanelCollapsed(false, false);
        setPreviewLoading(true, 'Cargando datos…');
        setStatus('');
        if (elStatus) elStatus.hidden = true;
        try {
            const r = await withMinLoader(() => callbackJsonp({
                fecha: fechaIso,
                ensayo_numero: ensayoNumero
            }));
            if (!r || r.ok !== true || !r.data) {
                throw new Error(r?.error || 'Registro no encontrado');
            }
            lastDetallePacking = r.data;
            pintarPreview(r.data);
        } catch (err) {
            setStatus(String(err.message || err), 'error');
            limpiarPreview();
        } finally {
            setPreviewLoading(false);
        }
    }

    function onFechaCambiada() {
        const fecha = elFecha?.value || '';
        if (fecha) void cargarMuestrasPorFecha(fecha);
        else resetMuestraSelect('Seleccionar fecha', true);
    }

    elFecha?.addEventListener('change', onFechaCambiada);

    elFechaRingWidget?.addEventListener('click', (ev) => {
        ev.stopPropagation();
        togglePopoverFechaRingPacking();
    });
    elFechaRingWidget?.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        togglePopoverFechaRingPacking();
    });
    document.addEventListener('click', () => togglePopoverFechaRingPacking(false));

    elResumenToggle?.addEventListener('click', toggleChipsPanelCollapsed);

    elFabOptionsBtn?.addEventListener('click', () => {
        establecerMenuFlotantePacking(!elFabMenu?.classList.contains('is-open'));
    });
    document.getElementById('fab-packing-sync')?.addEventListener('click', () => void sincronizarConPlanillaPacking());
    document.getElementById('fab-packing-borrar')?.addEventListener('click', () => void borrarTodoYCachePacking());
    elFabAgregar?.addEventListener('click', onFabAgregarPackingClick);
    elBtnEnviarPacking?.addEventListener('click', () => void guardarRegistroYEnviarDesdePantallaPacking());
    document.getElementById('fab-packing-demo')?.addEventListener('click', fabIniciarRegistroPacking);
    document.addEventListener('click', (e) => {
        if (elFabMenu && !elFabMenu.contains(e.target)) establecerMenuFlotantePacking(false);
    });

    elCardsWrap?.addEventListener('click', (ev) => {
        if (elCardsWrap.classList.contains('is-disabled')) return;
        const delBtn = ev.target.closest('.packing-card-delete');
        if (delBtn && !delBtn.disabled) {
            ev.stopPropagation();
            const id = Number(delBtn.dataset.cardId);
            if (Number.isFinite(id)) void eliminarCardPacking(id);
            return;
        }
        const recepBtn = ev.target.closest('.packing-peso-recep-btn');
        if (recepBtn) {
            ev.stopPropagation();
            const id = Number(recepBtn.dataset.cardId);
            abrirModalPesosPacking(id);
            return;
        }
        if (ev.target.closest('.metric-actions, .metric-btn')) return;
        const cardEl = ev.target.closest('.packing-clamshell-card');
        if (!cardEl) return;
        const id = Number(cardEl.dataset.cardId);
        abrirModalPesosPacking(id);
    });

    elCardsWrap?.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        const cardEl = ev.target.closest('.packing-clamshell-card');
        if (!cardEl || elCardsWrap?.classList.contains('is-disabled')) return;
        ev.preventDefault();
        abrirModalPesosPacking(Number(cardEl.dataset.cardId));
    });

    elPesosGuardar?.addEventListener('click', guardarModalPesosPacking);
    elPesosModal?.addEventListener('click', (e) => {
        if (e.target === elPesosModal) cerrarModalPesosPacking();
    });

    elCardsWrap?.addEventListener('click', (ev) => {
        if (ev.target.closest('#packing-metric-tiempo-btn')) {
            abrirTiemposMuestra(ev);
        }
    });
    elTiemposCancel?.addEventListener('click', () => cerrarTiemposMuestra(true));
    elTiemposGuardar?.addEventListener('click', guardarTiemposMuestra);
    elTiemposModal?.addEventListener('click', (e) => {
        if (e.target === elTiemposModal) cerrarTiemposMuestra(true);
    });

    elBtnTempPacking?.addEventListener('click', () => abrirModalControlGlobalPacking('temperatura'));
    elBtnHumPacking?.addEventListener('click', () => abrirModalControlGlobalPacking('humedad'));
    elControlCancelPacking?.addEventListener('click', cerrarModalControlGlobalPacking);
    elControlGuardarPacking?.addEventListener('click', guardarModalControlGlobalPacking);
    elControlModalPacking?.addEventListener('click', (e) => {
        if (e.target === elControlModalPacking) cerrarModalControlGlobalPacking();
    });

    TIEMPOS_MUESTRA_IDS.forEach((id) => {
        const inp = document.getElementById(id);
        inp?.addEventListener('change', actualizarContadoresTiempo);
        inp?.addEventListener('input', actualizarContadoresTiempo);
    });

    elMuestra?.addEventListener('change', () => {
        const fecha = elFecha?.value || '';
        const raw = elMuestra?.value || '';
        if (!raw) {
            limpiarPreview();
            return;
        }
        const parts = String(raw).split('|');
        const ensayoNumero = parts.length >= 2 ? parts[1] : '';
        if (!ensayoNumero) {
            limpiarPreview();
            return;
        }
        void cargarDetalle(fecha, ensayoNumero);
    });

    window.PackingContext = {
        getHoraPersonal,
        getResponsable: getHoraPersonal,
        getTiemposMuestra,
        getControlGlobalPacking: () => ({
            temperatura: {
                amb: packingControlState.temperatura.amb.slice(),
                pulpa: packingControlState.temperatura.pulpa.slice()
            },
            humedad: packingControlState.humedad.slice()
        }),
        getMetaEnvio: getMetaEnvioPacking,
        getPesosPacking: () => packingCards.map((c) => ({ clamshellNum: c.clamshellNum, ...c.pesos })),
        getRestantesAgregar: restantesPorAgregarPacking
    };

    window.addEventListener('online', () => {
        actualizarHeaderConexion();
        void acotarFechaDesdePlanilla().then(onFechaCambiada);
    });
    window.addEventListener('offline', actualizarHeaderConexion);
    window.addEventListener('resize', syncPackingFoldBtnAnchor, { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
        const foldBtnResizeObs = new ResizeObserver(() => syncPackingFoldBtnAnchor());
        if (elSelectBlock) foldBtnResizeObs.observe(elSelectBlock);
        const clip = elMetaShell?.querySelector('.packing-meta-clip');
        if (clip) foldBtnResizeObs.observe(clip);
    }

    window.sincronizarConPlanillaPacking = sincronizarConPlanillaPacking;
    window.borrarTodoYCachePacking = borrarTodoYCachePacking;
    window.fabIniciarRegistroPacking = fabIniciarRegistroPacking;
    window.agregarCardPacking = agregarCardPacking;
    window.agregarCardPackingYAbrirPesos = agregarCardPackingYAbrirPesos;
    window.guardarRegistroYEnviarDesdePantallaPacking = guardarRegistroYEnviarDesdePantallaPacking;

    crearIconosPacking();
    actualizarBtnEnviarPacking();
    actualizarContadoresTiempo();
    actualizarFechaRingPacking();
    setInterval(actualizarFechaRingPacking, 60000);
    setPackingCardHabilitada(false);

    if (window.CustomTimePicker) {
        window.CustomTimePicker.init(document.getElementById('packing-main') || document);
    }

    initHoraInicio();
    actualizarHeaderConexion();
    actualizarHeaderPendientes();
    initFechaInput();
    setChipsPanelCollapsed(false, false);
    limpiarPreview();
    syncPackingFoldBtnAnchor();

    if (elFecha?.value) void cargarMuestrasPorFecha(elFecha.value);
    void acotarFechaDesdePlanilla().then(() => {
        if (elFecha?.value) void cargarMuestrasPorFecha(elFecha.value);
    });

    if (!navigator.onLine) {
        setStatus('Sin internet. Conéctate para cargar datos de la planilla.', 'warn');
    }
}());
