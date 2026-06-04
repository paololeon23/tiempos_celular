(function initPackingApp() {
    const API_URL = (String(window.APPS_SCRIPT_API_URL || '').trim()
        || 'https://script.google.com/macros/s/AKfycbwdC1lwuGNT01xfLE_0jI31oXU13rBinYPKwlVfkZwqmIJGqSRuvPnq4-A9b6tHZThN/exec');
    const SYNC_QUEUE_KEY = 'tiempos-sync-queue-v1';
    const PACKING_DRAFT_STORAGE_KEY = 'tiempos-packing-draft-v1';
    const PACKING_CHIPS_COLLAPSED_KEY = 'packing-chips-collapsed-v1';
    const MIN_LOADER_MS = 350;

    const elFecha = document.getElementById('packing-fecha');
    const elMuestra = document.getElementById('packing-muestra');
    const elHoraInicio = document.getElementById('packing-hora-inicio');
    const elResponsable = document.getElementById('packing-responsable');
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

    function getHoraPersonal() {
        return String(elHoraInicio?.value || '').trim();
    }

    function getResponsablePacking() {
        return String(elResponsable?.value || '').trim();
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
    const elPresionModal = document.getElementById('packing-presion-modal-overlay');
    const elPresionModalTitle = document.getElementById('packing-presion-modal-title');
    const elPresionModalBody = document.getElementById('packing-presion-modal-body');
    const elPresionCancel = document.getElementById('packing-presion-cancel');
    const elObsModal = document.getElementById('packing-observation-modal-overlay');
    const elObsModalTitle = document.getElementById('packing-observation-modal-title');
    const elObsInput = document.getElementById('packing-visual-observation');
    const elObsCancel = document.getElementById('packing-observation-cancel');
    const elObsGuardar = document.getElementById('packing-observation-guardar');
    const elFabAgregar = document.getElementById('fab-packing-agregar');
    const elFabRestanteBadge = document.getElementById('fab-packing-restante-badge');
    let elMetricTiempoBtn = null;
    let elMetricTiempoCount = null;
    let elMetricPresionAmbCount = null;
    let elMetricPresionFrutaCount = null;
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
        tipoMuestra: 'T',
        variedadMuestra: ''
    };
    let packingCards = [];
    let packingCardSeq = 0;
    let packingActiveCardId = null;
    let packingObservationCardId = null;
    let packingMuestraAnterior = '';
    let packingFechaAnterior = '';
    let packingRestaurandoBorrador = false;
    let packingDraftSaveTimer = null;

    function pesosVaciosPacking() {
        return { recepcion: 0, ingresoGas: 0, salidaGas: 0, ingresoPre: 0, salidaPre: 0 };
    }

    function pesoNumero(val) {
        const n = Number(val);
        return Number.isFinite(n) ? n : 0;
    }

    /** Máx. salto hacia adelante al cruzar medianoche (misma cadena de tiempos). */
    const MAX_SALTO_HORA_MEDIANOCHE_MIN = 16 * 60;

    function minutosDesdeHoraPacking(hora) {
        if (!hora) return null;
        const [h, m] = String(hora).split(':').map(Number);
        if ([h, m].some((x) => Number.isNaN(x))) return null;
        return (h * 60) + m;
    }

    /**
     * true si la hora posterior es inválida respecto a la anterior.
     * Acepta cruce de medianoche (ej. 23:23 → 00:23).
     */
    function horaMenorQue(anterior, posterior) {
        const minAnt = minutosDesdeHoraPacking(anterior);
        const minPost = minutosDesdeHoraPacking(posterior);
        if (minAnt === null || minPost === null) return false;
        if (minPost >= minAnt) return false;
        const saltoAdelante = (24 * 60 - minAnt) + minPost;
        return saltoAdelante > MAX_SALTO_HORA_MEDIANOCHE_MIN;
    }

    function pesoSuperaLimite(valor, limite) {
        const v = pesoNumero(valor);
        const l = pesoNumero(limite);
        if (l <= 0) return false;
        return v > l + 0.001;
    }

    function getLimitePesoRecepcionPacking(clamshellNum) {
        const d = lastDetallePacking;
        if (!d) return null;
        const porFila = Array.isArray(d.despachoPorFila) ? d.despachoPorFila : [];
        const idx = Math.max(0, Number(clamshellNum) - 1);
        let v = porFila[idx];
        if (v == null || v === '') {
            v = d.DESPACHO_ACOPIO ?? d.despacho_acopio_gramos;
        }
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : null;
    }

    function leerPesosModalPacking() {
        const read = (id) => document.getElementById(id)?.value;
        return {
            recepcion: read('pk-inp-peso-recep'),
            ingresoGas: read('pk-inp-peso-ing-gas'),
            salidaGas: read('pk-inp-peso-sal-gas'),
            ingresoPre: read('pk-inp-peso-ing-pre'),
            salidaPre: read('pk-inp-peso-sal-pre')
        };
    }

    function validarSecuenciaPesosPacking(p, limiteRecepcion) {
        const recep = pesoNumero(p.recepcion);
        const ingGas = pesoNumero(p.ingresoGas);
        const salGas = pesoNumero(p.salidaGas);
        const ingPre = pesoNumero(p.ingresoPre);
        const salPre = pesoNumero(p.salidaPre);
        const errores = [];
        if (limiteRecepcion != null && pesoSuperaLimite(recep, limiteRecepcion)) {
            errores.push('Peso recepción no puede superar el despacho acopio-campo (' + limiteRecepcion + 'g).');
        }
        if (ingGas > recep + 0.001) {
            errores.push('Peso I-GASIF.: debe ser igual o menor que peso recepción.');
        }
        if (salGas > recep + 0.001) {
            errores.push('Peso S-GASIF.: debe ser igual o menor que peso recepción.');
        }
        if (ingPre > salGas + 0.001) {
            errores.push('Peso ingreso prefrío: debe ser igual o menor que peso S-GASIF.');
        }
        if (salPre > ingPre + 0.001) {
            errores.push('Peso salida prefrío: debe ser igual o menor que peso ingreso prefrío.');
        }
        return errores;
    }

    function validarPesosModalEnVivo() {
        const alertEl = document.getElementById('packing-pesos-alert');
        const card = getCardPackingById(packingActiveCardId) || packingCards[0];
        const limite = card ? getLimitePesoRecepcionPacking(card.clamshellNum) : null;
        const errores = validarSecuenciaPesosPacking(leerPesosModalPacking(), limite);
        if (alertEl) {
            if (errores.length) {
                alertEl.textContent = errores[0];
                alertEl.style.display = 'block';
            } else {
                alertEl.textContent = '';
                alertEl.style.display = 'none';
            }
        }
        if (elPesosGuardar) elPesosGuardar.disabled = errores.length > 0;
        return errores;
    }

    function obtenerTiemposDesdeModalPacking() {
        const read = (id) => String(document.getElementById(id)?.value || '').trim();
        return {
            horaInicio: getHoraPersonal(),
            recepcion: read('pk-tiempo-recepcion'),
            ingresoGas: read('pk-tiempo-ingreso-gas'),
            salidaGas: read('pk-tiempo-salida-gas'),
            ingresoPre: read('pk-tiempo-ingreso-pre'),
            salidaPre: read('pk-tiempo-salida-pre')
        };
    }

    function validarSecuenciaTiemposPacking(t) {
        const horaInicio = String(t.horaInicio || '').trim();
        const recepcion = String(t.recepcion || '').trim();
        const ingresoGas = String(t.ingresoGas || '').trim();
        const salidaGas = String(t.salidaGas || '').trim();
        const ingresoPre = String(t.ingresoPre || '').trim();
        const salidaPre = String(t.salidaPre || '').trim();
        const errores = [];
        if (horaInicio && recepcion && horaMenorQue(horaInicio, recepcion)) {
            errores.push('Hora recepción: debe ser igual o posterior a hora inicio recepción.');
        }
        if (recepcion && ingresoGas && horaMenorQue(recepcion, ingresoGas)) {
            errores.push('Hora ingreso gasif.: debe ser igual o posterior a hora recepción.');
        }
        if (ingresoGas && salidaGas && horaMenorQue(ingresoGas, salidaGas)) {
            errores.push('Hora salida gasif.: debe ser igual o posterior a hora ingreso gasif.');
        }
        if (salidaGas && ingresoPre && horaMenorQue(salidaGas, ingresoPre)) {
            errores.push('Hora ingreso prefrío: debe ser igual o posterior a hora salida gasif.');
        }
        if (ingresoPre && salidaPre && horaMenorQue(ingresoPre, salidaPre)) {
            errores.push('Hora salida prefrío: debe ser igual o posterior a hora ingreso prefrío.');
        }
        return errores;
    }

    function validarTiemposModalEnVivo() {
        const alertEl = document.getElementById('packing-tiempos-alert');
        if (tiemposModalSoloLectura) {
            if (alertEl) {
                alertEl.textContent = '';
                alertEl.style.display = 'none';
            }
            return [];
        }
        const errores = validarSecuenciaTiemposPacking(obtenerTiemposDesdeModalPacking());
        if (alertEl) {
            if (errores.length) {
                alertEl.textContent = errores[0];
                alertEl.style.display = 'block';
            } else {
                alertEl.textContent = '';
                alertEl.style.display = 'none';
            }
        }
        if (elTiemposGuardar && !tiemposModalSoloLectura) {
            elTiemposGuardar.disabled = errores.length > 0;
        }
        return errores;
    }

    function limpiarAlertaPesosModal() {
        const alertEl = document.getElementById('packing-pesos-alert');
        if (alertEl) {
            alertEl.textContent = '';
            alertEl.style.display = 'none';
        }
        if (elPesosGuardar) elPesosGuardar.disabled = false;
    }

    function limpiarAlertaTiemposModal() {
        const alertEl = document.getElementById('packing-tiempos-alert');
        if (alertEl) {
            alertEl.textContent = '';
            alertEl.style.display = 'none';
        }
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
        const baseOk = muestraSeleccionada()
            && packingCards.length > 0
            && !elCardsWrap?.classList.contains('is-disabled')
            && !envioPackingEnCurso;
        elBtnEnviarPacking.disabled = !baseOk;
        if (elEnvioBarPacking) {
            elEnvioBarPacking.classList.toggle('is-disabled', !muestraSeleccionada());
        }
        actualizarAvisoCompletitudPacking(baseOk);
    }

    function actualizarAvisoCompletitudPacking(baseOk) {
        if (!elStatus || !baseOk || envioPackingEnCurso) return;
        const v = validarCompletitudPackingParaEnvio();
        if (v.ok) {
            if (elStatus.dataset.pkCompletitudHint === '1') {
                elStatus.hidden = true;
                elStatus.textContent = '';
                delete elStatus.dataset.pkCompletitudHint;
            }
            return;
        }
        const msg = v.errores[0] || 'Completa todos los datos de packing antes de enviar.';
        elStatus.textContent = msg;
        elStatus.className = 'packing-status-msg packing-status-msg--warn';
        elStatus.hidden = false;
        elStatus.dataset.pkCompletitudHint = '1';
        syncPackingFoldBtnAnchor();
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
        packingQuota.variedadMuestra = String(d.VARIEDAD ?? '').trim();
    }

    function escHtmlPacking(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function textoVariedadCardPacking() {
        const v = String(packingQuota.variedadMuestra || '').trim();
        return v ? ('Variedad: ' + escHtmlPacking(v)) : 'Variedad: —';
    }

    function cuotaMaximaEfectivaPacking() {
        if (packingQuota.maxClamshell > 0) return packingQuota.maxClamshell;
        if (packingQuota.filasTotalCampo > 0) return packingQuota.filasTotalCampo;
        return 8;
    }

    function conteoClamshellsRegistroPacking() {
        const max = cuotaMaximaEfectivaPacking();
        const enServidor = packingQuota.filasPackingRegistradas;
        const enPantalla = packingCards.length;
        const total = enServidor + enPantalla;
        const faltan = Math.max(0, max - total);
        return { max, enServidor, enPantalla, total, faltan };
    }

    function validarCuotaClamshellsRegistroPacking() {
        const c = conteoClamshellsRegistroPacking();
        if (c.max <= 0) return { ok: true };
        if (c.total >= c.max) return { ok: true };
        return {
            ok: false,
            error: 'Debes completar los ' + c.max + ' clamshells del registro. Faltan '
                + c.faltan + ' (' + c.total + '/' + c.max + ').'
        };
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
            pesos: pesosVaciosPacking(),
            observacion: ''
        };
    }

    function crearElementoCardPreviewPacking(motivo) {
        const previewCard = { clamshellNum: 1, pesos: pesosVaciosPacking(), observacion: '' };
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

    function htmlMetricActionsPacking(isPrimary) {
        const tiempoTitle = isPrimary ? 'Tiempos de la muestra' : 'Ver tiempos de la muestra';
        const readonlyAttr = isPrimary ? '' : ' data-tiempos-readonly="1"';
        const countId = isPrimary ? ' id="packing-metric-tiempo-count"' : '';
        const countCls = isPrimary ? '' : ' packing-metric-tiempo-count-mirror';
        const presionAmbCountId = isPrimary ? ' id="packing-metric-presion-amb-count"' : '';
        const presionAmbCountCls = isPrimary ? '' : ' packing-metric-presion-amb-count-mirror';
        const presionFrutaCountId = isPrimary ? ' id="packing-metric-presion-fruta-count"' : '';
        const presionFrutaCountCls = isPrimary ? '' : ' packing-metric-presion-fruta-count-mirror';
        return '<div class="metric-actions">'
            + '<div class="metric-btn-wrap">'
            + '<button class="metric-btn packing-metric-tiempo-open-btn" type="button"' + readonlyAttr
            + ' title="' + tiempoTitle + '" aria-label="' + tiempoTitle + '">'
            + '<i data-lucide="timer"></i></button>'
            + '<span class="metric-count' + countCls + '"' + countId + '>0/5</span></div>'
            + '<div class="metric-btn-wrap">'
            + '<button class="metric-btn packing-metric-presion-amb-btn" type="button"'
            + ' title="Presión vapor ambiente (Kpa)" aria-label="Presión ambiente">'
            + '<i data-lucide="cloud"></i></button>'
            + '<span class="metric-count' + presionAmbCountCls + '"' + presionAmbCountId + '>0/5</span></div>'
            + '<div class="metric-btn-wrap">'
            + '<button class="metric-btn packing-metric-presion-fruta-btn" type="button"'
            + ' title="Presión vapor fruta (Kpa)" aria-label="Presión fruta">'
            + '<i data-lucide="apple"></i></button>'
            + '<span class="metric-count' + presionFrutaCountCls + '"' + presionFrutaCountId + '>0/5</span></div>'
            + '</div>';
    }

    function crearElementoCardPacking(card, index) {
        const p = card.pesos;
        const num = card.clamshellNum;
        const obs = String(card.observacion || '').trim();
        const obsHtml = obs ? escHtmlPacking(obs) : '';
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
            + '<span class="packing-card-sub">' + textoVariedadCardPacking() + '</span>'
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
            + '<div class="observation-box"><button type="button" class="packing-observation-btn" data-card-id="' + card.id + '" title="Editar observación">'
            + '<span class="observation-text' + (obs ? '' : ' is-empty') + '">'
            + (obsHtml || 'Sin observación registrada') + '</span></button></div>'
            + '</div>' + htmlMetricActionsPacking(index === 0) + '</div>'
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
        elMetricTiempoBtn = document.querySelector('#packing-cards-wrap .packing-metric-tiempo-open-btn:not([data-tiempos-readonly])');
        elMetricTiempoCount = document.getElementById('packing-metric-tiempo-count');
        elMetricPresionAmbCount = document.getElementById('packing-metric-presion-amb-count');
        elMetricPresionFrutaCount = document.getElementById('packing-metric-presion-fruta-count');
        const cardsDisabled = elCardsWrap.classList.contains('is-disabled');
        document.querySelectorAll('.packing-metric-tiempo-open-btn').forEach((btn) => {
            btn.disabled = cardsDisabled;
        });
        document.querySelectorAll('.packing-metric-presion-amb-btn, .packing-metric-presion-fruta-btn').forEach((btn) => {
            btn.disabled = cardsDisabled;
        });
        document.querySelectorAll('.packing-observation-btn').forEach((btn) => {
            btn.disabled = cardsDisabled;
        });
        actualizarContadoresTiempo();
        actualizarContadoresPresionPacking();
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
        packingQuota.variedadMuestra = '';
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
        programarGuardadoBorradorPacking();
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
        programarGuardadoBorradorPacking();
    }

    function quitarFocoModalPacking(overlayEl) {
        if (!overlayEl) return;
        const active = document.activeElement;
        if (active && overlayEl.contains(active) && typeof active.blur === 'function') {
            active.blur();
        }
    }

    function ocultarModalPacking(overlayEl) {
        if (!overlayEl) return;
        quitarFocoModalPacking(overlayEl);
        overlayEl.style.display = 'none';
        overlayEl.setAttribute('aria-hidden', 'true');
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
        validarPesosModalEnVivo();
    }

    function cerrarModalPesosPacking() {
        if (!elPesosModal) return;
        ocultarModalPacking(elPesosModal);
        limpiarAlertaPesosModal();
    }

    function guardarModalPesosPacking() {
        if (!muestraSeleccionada()) {
            setStatus('Selecciona una muestra antes de guardar.', 'warn');
            return;
        }
        const errores = validarPesosModalEnVivo();
        if (errores.length) {
            mostrarToastPacking('warning', 'Peso inválido', errores[0]);
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
        programarGuardadoBorradorPacking();
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
        document.querySelectorAll('.packing-metric-tiempo-count-mirror').forEach((el) => {
            el.textContent = txt;
            el.classList.toggle('is-filled', filled);
        });
        actualizarBtnEnviarPacking();
    }

    function muestraSeleccionada() {
        return !!String(elMuestra?.value || '').trim();
    }

    let tiemposModalBackup = [];
    let tiemposModalSoloLectura = false;

    function tituloModalTiempos(clamshellNum, soloLectura) {
        const n = clamshellNum || (getCardPackingById(packingActiveCardId) || packingCards[0])?.clamshellNum || 1;
        let t = 'Tiempos de la muestra (hora) · Clamshell #' + n;
        if (soloLectura) t += ' · solo lectura';
        return t;
    }

    function limpiarTiemposModalVistaLectura() {
        TIEMPOS_MUESTRA_IDS.forEach((id, i) => {
            const inp = document.getElementById(id);
            if (!inp) return;
            if (inp.dataset.tiemposWasEmpty === '1') {
                inp.value = tiemposModalBackup[i] || '';
            }
            inp.classList.remove('packing-tiempo-inp--view', 'is-empty-time-display');
            delete inp.dataset.tiemposNoPicker;
            delete inp.dataset.tiemposWasEmpty;
            inp.readOnly = false;
            inp.disabled = false;
            if (!inp.placeholder) inp.placeholder = 'HH:MM';
        });
    }

    function aplicarTiemposModalVistaLectura() {
        TIEMPOS_MUESTRA_IDS.forEach((id, i) => {
            const inp = document.getElementById(id);
            if (!inp) return;
            const raw = String(tiemposModalBackup[i] ?? inp.value ?? '').trim();
            inp.classList.add('packing-tiempo-inp--view');
            inp.dataset.tiemposNoPicker = '1';
            inp.readOnly = true;
            inp.disabled = true;
            if (!raw) {
                inp.dataset.tiemposWasEmpty = '1';
                inp.value = '--:--';
                inp.placeholder = '';
                inp.classList.add('is-empty-time-display');
            } else {
                inp.value = raw;
                inp.placeholder = '';
                inp.classList.remove('is-empty-time-display');
            }
        });
    }

    function setTiemposModalSoloLectura(soloLectura) {
        tiemposModalSoloLectura = !!soloLectura;
        if (elTiemposModal) elTiemposModal.classList.toggle('is-readonly-view', soloLectura);
        if (!soloLectura) limpiarTiemposModalVistaLectura();
        if (elTiemposGuardar) {
            elTiemposGuardar.hidden = soloLectura;
            elTiemposGuardar.disabled = soloLectura;
        }
        if (soloLectura) limpiarAlertaTiemposModal();
    }

    function restaurarTiemposDesdeBackup() {
        TIEMPOS_MUESTRA_IDS.forEach((id, i) => {
            const inp = document.getElementById(id);
            if (inp) inp.value = tiemposModalBackup[i] || '';
        });
        actualizarContadoresTiempo();
    }

    function abrirTiemposMuestra(ev, opts) {
        if (!muestraSeleccionada()) return;
        if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
        }
        if (!elTiemposModal) return;
        const soloLectura = !!(opts && opts.soloLectura);
        const clamshellNum = opts && opts.clamshellNum ? opts.clamshellNum : null;
        tiemposModalBackup = getTiemposMuestra();
        setTiemposModalSoloLectura(soloLectura);
        if (soloLectura) {
            aplicarTiemposModalVistaLectura();
        } else {
            TIEMPOS_MUESTRA_IDS.forEach((id) => {
                const inp = document.getElementById(id);
                if (inp) inp.disabled = false;
            });
            if (window.CustomTimePicker && typeof window.CustomTimePicker.init === 'function') {
                window.CustomTimePicker.init(elTiemposModal);
            }
        }
        if (elTiemposModalTitle) {
            elTiemposModalTitle.textContent = tituloModalTiempos(clamshellNum, soloLectura);
        }
        elTiemposModal.style.display = 'flex';
        elTiemposModal.setAttribute('aria-hidden', 'false');
        if (!soloLectura) validarTiemposModalEnVivo();
    }

    function cerrarTiemposMuestra(revertir) {
        if (!elTiemposModal) return;
        if (revertir && !tiemposModalSoloLectura) restaurarTiemposDesdeBackup();
        limpiarTiemposModalVistaLectura();
        setTiemposModalSoloLectura(false);
        limpiarAlertaTiemposModal();
        ocultarModalPacking(elTiemposModal);
    }

    function guardarTiemposMuestra() {
        if (tiemposModalSoloLectura) return;
        const errores = validarTiemposModalEnVivo();
        if (errores.length) {
            mostrarToastPacking('warning', 'Horario inválido', errores[0]);
            return;
        }
        actualizarContadoresTiempo();
        tiemposModalBackup = getTiemposMuestra();
        cerrarTiemposMuestra(false);
        mostrarToastPacking('success', 'Tiempos guardados', 'Los tiempos quedaron listos para enviar.');
        programarGuardadoBorradorPacking();
    }

    function setPackingCardHabilitada(on) {
        const habilitada = !!on;
        if (elHoraRow) {
            elHoraRow.classList.toggle('is-disabled', !habilitada);
            elHoraRow.setAttribute('aria-disabled', (!habilitada).toString());
        }
        if (elHoraInicio) elHoraInicio.disabled = !habilitada;
        if (elResponsable) elResponsable.disabled = !habilitada;
        if (elCardsWrap) {
            elCardsWrap.classList.toggle('is-disabled', !habilitada);
            elCardsWrap.setAttribute('aria-disabled', (!habilitada).toString());
        }
        const tituloTiempo = habilitada ? 'Tiempos de la muestra (hora)' : 'Selecciona una muestra';
        document.querySelectorAll('.packing-metric-tiempo-open-btn').forEach((btn) => {
            btn.disabled = !habilitada;
            if (habilitada) {
                btn.title = btn.hasAttribute('data-tiempos-readonly')
                    ? 'Ver tiempos de la muestra'
                    : 'Tiempos de la muestra';
            } else {
                btn.title = tituloTiempo;
            }
        });
        document.querySelectorAll('.packing-metric-presion-amb-btn, .packing-metric-presion-fruta-btn').forEach((btn) => {
            btn.disabled = !habilitada;
            if (habilitada) {
                btn.title = btn.classList.contains('packing-metric-presion-amb-btn')
                    ? 'Presión vapor ambiente (Kpa)'
                    : 'Presión vapor fruta (Kpa)';
            } else {
                btn.title = 'Selecciona una muestra';
            }
        });
        document.querySelectorAll('.packing-observation-btn').forEach((btn) => {
            btn.disabled = !habilitada;
            btn.title = habilitada ? 'Editar observación' : 'Selecciona una muestra';
        });
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
            cerrarModalPresionPacking();
            cerrarModalObservacionPacking();
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
        humedad: ['', '', '', '', ''],
        presionAmb: ['', '', '', '', ''],
        presionFruta: ['', '', '', '', '']
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
        packingControlState.presionAmb = ['', '', '', '', ''];
        packingControlState.presionFruta = ['', '', '', '', ''];
    }

    function leerStoreBorradorPacking() {
        try {
            const raw = localStorage.getItem(PACKING_DRAFT_STORAGE_KEY);
            if (!raw) return { version: 1, porClave: {}, activa: '' };
            const o = JSON.parse(raw);
            if (!o || typeof o !== 'object') return { version: 1, porClave: {}, activa: '' };
            if (!o.porClave || typeof o.porClave !== 'object') o.porClave = {};
            return o;
        } catch (_) {
            return { version: 1, porClave: {}, activa: '' };
        }
    }

    function escribirStoreBorradorPacking(store) {
        try {
            const porClave = store?.porClave && typeof store.porClave === 'object' ? store.porClave : {};
            const keys = Object.keys(porClave);
            if (!keys.length && !store?.activa) {
                localStorage.removeItem(PACKING_DRAFT_STORAGE_KEY);
                return;
            }
            localStorage.setItem(PACKING_DRAFT_STORAGE_KEY, JSON.stringify({
                version: 1,
                ts: Date.now(),
                activa: String(store?.activa || ''),
                porClave
            }));
        } catch (_) { /* ignore */ }
    }

    function claveBorradorMuestraPacking(fecha, rawMuestra) {
        const f = normalizarFechaIso(fecha);
        const m = String(rawMuestra || '').trim();
        if (!f || !m) return '';
        return f + '::' + m;
    }

    function clonarControlStatePacking(src) {
        const s = src || packingControlState;
        return {
            tipo: s.tipo || null,
            temperatura: {
                amb: Array.isArray(s.temperatura?.amb) ? s.temperatura.amb.slice() : ['', '', '', '', ''],
                pulpa: Array.isArray(s.temperatura?.pulpa) ? s.temperatura.pulpa.slice() : ['', '', '', '', '']
            },
            humedad: Array.isArray(s.humedad) ? s.humedad.slice() : ['', '', '', '', ''],
            presionAmb: Array.isArray(s.presionAmb) ? s.presionAmb.slice() : ['', '', '', '', ''],
            presionFruta: Array.isArray(s.presionFruta) ? s.presionFruta.slice() : ['', '', '', '', '']
        };
    }

    function capturarPreviewMetaPacking() {
        const trazEl = document.getElementById(previewIds.traz);
        const varEl = document.getElementById(previewIds.variedad);
        const placaEl = document.getElementById(previewIds.placa);
        return {
            traz: String(trazEl?.textContent || '').trim(),
            variedad: String(varEl?.textContent || '').trim(),
            placa: String(placaEl?.textContent || '').trim(),
            responsable: getResponsablePacking()
        };
    }

    function capturarEstadoMuestraPacking() {
        return {
            packingCards: packingCards.map((c) => ({
                id: c.id,
                clamshellNum: c.clamshellNum,
                pesos: { ...c.pesos },
                observacion: String(c.observacion || '')
            })),
            packingCardSeq,
            packingActiveCardId,
            control: clonarControlStatePacking(packingControlState),
            tiempos: getTiemposMuestra(),
            horaInicio: getHoraPersonal(),
            responsable: getResponsablePacking(),
            packingQuotaSnapshot: { ...packingQuota },
            previewMeta: capturarPreviewMetaPacking()
        };
    }

    function hayTextoEnArregloPacking(arr) {
        return Array.isArray(arr) && arr.some((v) => String(v ?? '').trim() !== '');
    }

    function hayDatosTrabajoMuestraPacking(estado) {
        if (!estado || typeof estado !== 'object') return false;
        const cards = Array.isArray(estado.packingCards) ? estado.packingCards : [];
        if (cards.length > 1) return true;
        if (cards.some((c) => {
            const p = c?.pesos || {};
            return Object.keys(p).some((k) => pesoNumero(p[k]) > 0)
                || String(c?.observacion || '').trim() !== '';
        })) return true;
        if (hayTextoEnArregloPacking(estado.tiempos)) return true;
        const cg = estado.control;
        if (cg) {
            if (hayTextoEnArregloPacking(cg.temperatura?.amb)) return true;
            if (hayTextoEnArregloPacking(cg.temperatura?.pulpa)) return true;
            if (hayTextoEnArregloPacking(cg.humedad)) return true;
        }
        if (String(estado.horaInicio || '').trim()) return true;
        if (String(estado.responsable || '').trim()) return true;
        return false;
    }

    function aplicarPreviewMetaDesdeBorrador(meta) {
        if (!meta) return;
        const traz = String(meta.traz || '').trim();
        const variedad = String(meta.variedad || '').trim();
        const placa = String(meta.placa || '').trim();
        if (traz || variedad || placa) {
            setResumenVisible(true);
            if (elPreview) {
                elPreview.classList.remove('is-loading-preview');
                elPreview.classList.add('is-loaded');
            }
        }
        if (traz) setChip(previewIds.traz, traz, false, 'packing-chip-value--traz');
        if (variedad) setChip(previewIds.variedad, variedad, false);
        if (placa) setChip(previewIds.placa, placa, false);
        if (elResponsable && String(meta.responsable || '').trim()) {
            elResponsable.value = String(meta.responsable).trim();
        }
    }

    function normalizarCardsRestauradasPacking(cards) {
        if (!Array.isArray(cards) || !cards.length) return null;
        const disponibles = slotsDisponiblesEnServidorPacking();
        if (disponibles <= 0) return null;
        const maxCards = Math.min(cards.length, disponibles);
        let seq = packingCardSeq;
        return cards.slice(0, maxCards).map((c, i) => {
            const id = Number.isFinite(Number(c.id)) ? Number(c.id) : ++seq;
            if (id > seq) seq = id;
            return {
                id,
                clamshellNum: packingQuota.filasPackingRegistradas + i + 1,
                pesos: { ...(c.pesos || pesosVaciosPacking()) },
                observacion: String(c.observacion || '')
            };
        });
    }

    function aplicarEstadoMuestraPacking(estado, opts) {
        if (!estado || !hayDatosTrabajoMuestraPacking(estado)) {
            reiniciarCardsPacking();
            return;
        }
        if (!opts?.skipPreview) {
            aplicarPreviewMetaDesdeBorrador(estado.previewMeta);
        }
        const cg = clonarControlStatePacking(estado.control);
        packingControlState.tipo = cg.tipo;
        packingControlState.temperatura = cg.temperatura;
        packingControlState.humedad = cg.humedad;
        packingControlState.presionAmb = cg.presionAmb;
        packingControlState.presionFruta = cg.presionFruta;
        recalcularPresionesPacking();
        if (Array.isArray(estado.tiempos)) {
            TIEMPOS_MUESTRA_IDS.forEach((id, i) => {
                const inp = document.getElementById(id);
                if (inp) inp.value = String(estado.tiempos[i] || '');
            });
        }
        if (elHoraInicio && String(estado.horaInicio || '').trim()) {
            elHoraInicio.value = String(estado.horaInicio).trim();
        }
        if (elResponsable && String(estado.responsable || '').trim()) {
            elResponsable.value = String(estado.responsable).trim();
        }
        packingCardSeq = Number(estado.packingCardSeq) || 0;
        const cards = normalizarCardsRestauradasPacking(estado.packingCards);
        if (cards && cards.length) {
            packingCards = cards;
            packingCardSeq = Math.max(packingCardSeq, ...cards.map((c) => c.id));
            packingActiveCardId = estado.packingActiveCardId;
            if (!getCardPackingById(packingActiveCardId)) {
                packingActiveCardId = packingCards[0]?.id ?? null;
            }
            renderizarCardsPacking();
        } else {
            reiniciarCardsPacking();
        }
        actualizarContadoresTiempo();
        actualizarContadoresPresionPacking();
    }

    function borrarBorradorMuestraPacking(key) {
        if (!key) return;
        const store = leerStoreBorradorPacking();
        delete store.porClave[key];
        if (store.activa === key) store.activa = '';
        escribirStoreBorradorPacking(store);
    }

    function snapshotMuestraPackingSiHayTrabajo(fecha, rawMuestra, estadoUi) {
        const key = claveBorradorMuestraPacking(fecha, rawMuestra);
        if (!key || !rawMuestra) return;
        const estado = estadoUi || capturarEstadoMuestraPacking();
        const store = leerStoreBorradorPacking();
        if (hayDatosTrabajoMuestraPacking(estado)) {
            store.porClave[key] = estado;
        } else {
            delete store.porClave[key];
        }
        escribirStoreBorradorPacking(store);
    }

    function guardarBorradorMuestraActiva() {
        if (packingRestaurandoBorrador || !muestraSeleccionada()) return;
        const key = claveBorradorMuestraPacking(elFecha?.value, elMuestra?.value);
        if (!key) return;
        const estado = capturarEstadoMuestraPacking();
        const store = leerStoreBorradorPacking();
        if (hayDatosTrabajoMuestraPacking(estado)) {
            store.porClave[key] = estado;
        } else {
            delete store.porClave[key];
        }
        store.activa = key;
        escribirStoreBorradorPacking(store);
    }

    function programarGuardadoBorradorPacking() {
        clearTimeout(packingDraftSaveTimer);
        packingDraftSaveTimer = setTimeout(guardarBorradorMuestraActiva, 220);
    }

    function limpiarBorradorTrasEnvioExitosoPacking(fecha, rawMuestra) {
        const key = claveBorradorMuestraPacking(fecha, rawMuestra);
        borrarBorradorMuestraPacking(key);
        resetControlGlobalPacking();
        TIEMPOS_MUESTRA_IDS.forEach((id) => {
            const inp = document.getElementById(id);
            if (inp) inp.value = '';
        });
        actualizarContadoresTiempo();
        actualizarContadoresPresionPacking();
    }

    function restaurarMuestraActivaDesdeBorrador() {
        const store = leerStoreBorradorPacking();
        const activa = String(store?.activa || '').trim();
        const fecha = normalizarFechaIso(elFecha?.value);
        if (!activa || !fecha || !elMuestra) return false;
        if (!activa.startsWith(fecha + '::')) return false;
        const rawMuestra = activa.slice(fecha.length + 2);
        if (!rawMuestra) return false;
        const opt = [...elMuestra.options].find((o) => o.value === rawMuestra);
        if (!opt) return false;
        packingRestaurandoBorrador = true;
        elMuestra.value = rawMuestra;
        packingMuestraAnterior = rawMuestra;
        packingRestaurandoBorrador = false;
        const ensayoNumero = rawMuestra.split('|')[1] || '';
        if (ensayoNumero) void cargarDetalle(fecha, ensayoNumero);
        return true;
    }

    function numeroSeguroPacking(valor) {
        const s = String(valor ?? '').trim();
        if (s === '' || s.endsWith('.')) return null;
        const n = Number(s.replace(',', '.'));
        return Number.isFinite(n) ? n : null;
    }

    function controlGlobalPackingTieneDato(raw) {
        const s = String(raw ?? '').trim();
        return s !== '' && !s.endsWith('.');
    }

    function calcularPresionVaporAmbienteAshrae(tempC, humedadRelativa) {
        const t = numeroSeguroPacking(tempC);
        const hr = numeroSeguroPacking(humedadRelativa);
        if (t === null || hr === null || hr < 0 || hr > 100) return '';

        const T = t + 273.15;
        const c8 = -5.8002206e+03;
        const c9 = 1.3914993e+00;
        const c10 = -4.8640239e-02;
        const c11 = 4.1764768e-05;
        const c12 = -1.4452093e-08;
        const c13 = 6.5459673e+00;

        const lnPs = (c8 / T) + c9 + (c10 * T) + (c11 * (T ** 2)) + (c12 * (T ** 3)) + (c13 * Math.log(T));
        const pSatKpa = Math.exp(lnPs) / 1000;
        const pV = pSatKpa * (hr / 100);
        if (!Number.isFinite(pV)) return '';
        return pV.toFixed(3);
    }

    function calcularPresionVaporPulpaAshrae(tempPulpaC) {
        const t = numeroSeguroPacking(tempPulpaC);
        if (t === null) return '';

        const T = t + 273.15;
        const c8 = -5.8002206e+03;
        const c9 = 1.3914993e+00;
        const c10 = -4.8640239e-02;
        const c11 = 4.1764768e-05;
        const c12 = -1.4452093e-08;
        const c13 = 6.5459673e+00;

        const lnPs = (c8 / T) + c9 + (c10 * T) + (c11 * (T ** 2)) + (c12 * (T ** 3)) + (c13 * Math.log(T));
        const pPulpa = Math.exp(lnPs) / 1000;
        if (!Number.isFinite(pPulpa)) return '';
        return pPulpa.toFixed(3);
    }

    function recalcularPresionesPacking() {
        const t = packingControlState.temperatura;
        const h = packingControlState.humedad;
        const pa = packingControlState.presionAmb;
        const pf = packingControlState.presionFruta;
        for (let i = 0; i < 5; i++) {
            const puedeAmb = controlGlobalPackingTieneDato(t.amb[i]) && controlGlobalPackingTieneDato(h[i]);
            const puedePulpa = controlGlobalPackingTieneDato(t.pulpa[i]);
            pa[i] = puedeAmb ? calcularPresionVaporAmbienteAshrae(t.amb[i], h[i]) : '';
            pf[i] = puedePulpa ? calcularPresionVaporPulpaAshrae(t.pulpa[i]) : '';
        }
    }

    function conteoPresionPacking(valores) {
        const done = valores.filter((v) => String(v || '').trim() !== '').length;
        return { done, total: 5 };
    }

    function actualizarContadoresPresionPacking() {
        recalcularPresionesPacking();
        const cAmb = conteoPresionPacking(packingControlState.presionAmb);
        const cFruta = conteoPresionPacking(packingControlState.presionFruta);
        const txtAmb = String(cAmb.done) + '/' + String(cAmb.total);
        const txtFruta = String(cFruta.done) + '/' + String(cFruta.total);
        if (elMetricPresionAmbCount) {
            elMetricPresionAmbCount.textContent = txtAmb;
            elMetricPresionAmbCount.classList.toggle('is-filled', cAmb.done > 0);
        }
        if (elMetricPresionFrutaCount) {
            elMetricPresionFrutaCount.textContent = txtFruta;
            elMetricPresionFrutaCount.classList.toggle('is-filled', cFruta.done > 0);
        }
        document.querySelectorAll('.packing-metric-presion-amb-count-mirror').forEach((el) => {
            el.textContent = txtAmb;
            el.classList.toggle('is-filled', cAmb.done > 0);
        });
        document.querySelectorAll('.packing-metric-presion-fruta-count-mirror').forEach((el) => {
            el.textContent = txtFruta;
            el.classList.toggle('is-filled', cFruta.done > 0);
        });
        actualizarBtnEnviarPacking();
    }

    function etiquetaCardErrorPacking(clamshellNum) {
        const n = Number(clamshellNum);
        return Number.isFinite(n) && n > 0 ? ('#' + n + ' · ') : '';
    }

    function cardReferenciaTiemposPacking() {
        const card = getCardPackingById(packingActiveCardId) || packingCards[0];
        return card?.clamshellNum || 1;
    }

    function msgErrorPesosPacking(clamshellNum, texto) {
        return etiquetaCardErrorPacking(clamshellNum) + '⚖ ' + texto;
    }

    function msgErrorTiemposPacking(texto) {
        return etiquetaCardErrorPacking(cardReferenciaTiemposPacking()) + '⏱ ' + texto;
    }

    function msgErrorGlobalPacking(etiqueta, texto) {
        return String(etiqueta || 'Global') + ' · ' + texto;
    }

    function validarCompletitudPackingParaEnvio() {
        recalcularPresionesPacking();
        const errores = [];

        const cuota = validarCuotaClamshellsRegistroPacking();
        if (!cuota.ok) {
            errores.push(cuota.error);
        }

        if (!String(getHoraPersonal() || '').trim()) {
            errores.push(msgErrorGlobalPacking('Cabecera', 'Completa Hora inicio recepción.'));
        }
        if (!String(getResponsablePacking() || '').trim()) {
            errores.push(msgErrorGlobalPacking('Cabecera', 'Completa Responsable.'));
        }

        const ct = conteoTiemposMuestra();
        if (ct.done < ct.total) {
            errores.push(
                msgErrorTiemposPacking(
                    'Completa las ' + ct.total + ' etapas (' + ct.done + '/' + ct.total + ').'
                )
            );
        }
        validarSecuenciaTiemposPacking(obtenerTiemposDesdeModalPacking()).forEach((e) => {
            errores.push(msgErrorTiemposPacking(e));
        });

        const t = packingControlState.temperatura;
        const h = packingControlState.humedad;
        let faltanControl = false;
        for (let i = 0; i < 5; i++) {
            if (!controlGlobalPackingTieneDato(t.amb[i])
                || !controlGlobalPackingTieneDato(t.pulpa[i])
                || !controlGlobalPackingTieneDato(h[i])) {
                faltanControl = true;
                break;
            }
        }
        if (faltanControl) {
            errores.push(
                msgErrorGlobalPacking(
                    'Control',
                    'Abre Temperatura y Humedad global y completa las 5 etapas.'
                )
            );
        }

        const cAmb = conteoPresionPacking(packingControlState.presionAmb);
        const cFruta = conteoPresionPacking(packingControlState.presionFruta);
        if (!faltanControl && cAmb.done < cAmb.total) {
            errores.push(
                msgErrorGlobalPacking(
                    '☁️',
                    'Revisa temperatura ambiente y humedad (' + cAmb.done + '/5).'
                )
            );
        }
        if (!faltanControl && cFruta.done < cFruta.total) {
            errores.push(
                msgErrorGlobalPacking(
                    '🍎',
                    'Revisa temperatura pulpa (' + cFruta.done + '/5).'
                )
            );
        }

        const pesoLabels = {
            recepcion: 'Peso recepción',
            ingresoGas: 'Peso I-GASIF.',
            salidaGas: 'Peso S-GASIF.',
            ingresoPre: 'Peso ingreso prefrío',
            salidaPre: 'Peso salida prefrío'
        };

        packingCards.forEach((card) => {
            const p = card.pesos || pesosVaciosPacking();
            const faltantes = Object.keys(pesoLabels).filter((k) => pesoNumero(p[k]) <= 0);
            if (faltantes.length) {
                errores.push(
                    msgErrorPesosPacking(
                        card.clamshellNum,
                        'Completa ' + faltantes.map((k) => pesoLabels[k]).join(', ') + '.'
                    )
                );
                return;
            }
            const limite = getLimitePesoRecepcionPacking(card.clamshellNum);
            const pesoErr = validarSecuenciaPesosPacking(p, limite);
            if (pesoErr.length) {
                errores.push(msgErrorPesosPacking(card.clamshellNum, pesoErr[0]));
            }
        });

        return { ok: errores.length === 0, errores };
    }

    function packingListoParaEnviar() {
        return validarCompletitudPackingParaEnvio().ok;
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
        recalcularPresionesPacking();
        const t = packingControlState.temperatura;
        const h = packingControlState.humedad;
        const pAmb = packingControlState.presionAmb;
        const pFruta = packingControlState.presionFruta;
        for (let i = 0; i < 5; i++) {
            row[10 + (i * 2)] = t.amb[i] || '';
            row[11 + (i * 2)] = t.pulpa[i] || '';
            row[20 + i] = h[i] || '';
            row[25 + i] = pAmb[i] || '';
            row[30 + i] = pFruta[i] || '';
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
        ocultarModalPacking(elControlModalPacking);
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
        recalcularPresionesPacking();
        actualizarContadoresPresionPacking();
        cerrarModalControlGlobalPacking();
        setStatus('');
        if (elStatus) elStatus.hidden = true;
        programarGuardadoBorradorPacking();
    }

    function celdaPresionModalPacking(etapa, valores, usarLabelCompleto) {
        const raw = String(valores[etapa.idx] ?? '').trim();
        const v = raw.replace(/"/g, '&quot;');
        const id = 'pk-presion-' + etapa.idPart;
        const txt = usarLabelCompleto ? etapa.label : (etapa.shortLabel || etapa.label);
        const valAttr = raw ? (' value="' + v + '"') : ' value="" placeholder="—"';
        return '<div class="form-group"><label>' + txt + '</label>'
            + '<input type="text" class="packing-presion-inp" id="' + id + '"' + valAttr + ' disabled'
            + ' title="Dato calculado automáticamente" aria-label="' + etapa.label + '"></div>';
    }

    function htmlGridPresionModalPacking(valores) {
        const cuatro = CONTROL_ETAPAS_PACKING.filter((e) => e.idx < 4)
            .map((e) => celdaPresionModalPacking(e, valores, true)).join('');
        const quinto = CONTROL_ETAPAS_PACKING.find((e) => e.idx === 4);
        const raw5 = String(valores[4] ?? '').trim();
        const v5 = raw5.replace(/"/g, '&quot;');
        const id5 = 'pk-presion-' + quinto.idPart;
        const val5Attr = raw5 ? (' value="' + v5 + '"') : ' value="" placeholder="—"';
        return '<div class="packing-tiempos-grid packing-cg-grid-tiempos">' + cuatro + '</div>'
            + '<div class="form-group packing-tiempo-row-full">'
            + '<label>' + quinto.label + '</label>'
            + '<input type="text" class="packing-presion-inp" id="' + id5 + '"' + val5Attr + ' disabled'
            + ' title="Dato calculado automáticamente" aria-label="' + quinto.label + '">'
            + '</div>';
    }

    function abrirModalPresionPacking(ev, tipo, clamshellNum) {
        if (!muestraSeleccionada() || !elPresionModal || !elPresionModalBody) return;
        if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
        }
        recalcularPresionesPacking();
        const esAmb = tipo === 'ambiente';
        const valores = esAmb ? packingControlState.presionAmb : packingControlState.presionFruta;
        const n = clamshellNum || (getCardPackingById(packingActiveCardId) || packingCards[0])?.clamshellNum || 1;
        if (elPresionModalTitle) {
            elPresionModalTitle.textContent = (esAmb
                ? 'Presión vapor ambiente (Kpa)'
                : 'Presión vapor fruta (Kpa)') + ' · Clamshell #' + n;
        }
        elPresionModalBody.innerHTML = htmlGridPresionModalPacking(valores);
        elPresionModal.style.display = 'flex';
        elPresionModal.setAttribute('aria-hidden', 'false');
    }

    function cerrarModalPresionPacking() {
        if (!elPresionModal) return;
        ocultarModalPacking(elPresionModal);
        if (elPresionModalBody) elPresionModalBody.innerHTML = '';
    }

    function abrirModalObservacionPacking(ev, cardId) {
        if (!muestraSeleccionada() || !elObsModal) return;
        if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
        }
        const card = getCardPackingById(cardId);
        if (!card) return;
        packingObservationCardId = card.id;
        packingActiveCardId = card.id;
        if (elObsModalTitle) {
            elObsModalTitle.textContent = 'Observación · Clamshell #' + card.clamshellNum;
        }
        if (elObsInput) elObsInput.value = card.observacion || '';
        elObsModal.style.display = 'flex';
        elObsModal.setAttribute('aria-hidden', 'false');
    }

    function cerrarModalObservacionPacking() {
        if (!elObsModal) return;
        ocultarModalPacking(elObsModal);
        packingObservationCardId = null;
    }

    function guardarModalObservacionPacking() {
        const card = getCardPackingById(packingObservationCardId);
        if (!card) {
            cerrarModalObservacionPacking();
            return;
        }
        card.observacion = String(elObsInput?.value || '').trim();
        cerrarModalObservacionPacking();
        renderizarCardsPacking();
        mostrarToastPacking('success', 'Guardado', 'Observación guardada.');
        programarGuardadoBorradorPacking();
    }

    function getFechaInspeccionPacking() {
        return hoyIsoLocal();
    }

    function buildPackingRowDesdeCard(card) {
        const tiempos = getTiemposMuestra();
        const row = new Array(36).fill('');
        for (let i = 0; i < tiempos.length && i < 5; i++) row[i] = tiempos[i];
        aplicarPesosPackingARow(row, card.pesos);
        aplicarControlGlobalPackingARow(row);
        row[35] = String(card.observacion || '').trim();
        return row;
    }

    function getMetaEnvioPacking() {
        const sel = ensayoSeleccionado();
        const hora = getHoraPersonal();
        const responsable = getResponsablePacking();
        // fecha (selector): ubica filas campo (col A + ensayo). fecha_inspeccion: col 47 (anillo = hoy).
        return {
            mode: 'packing',
            guardar_packing: true,
            actualizar_c5: false,
            guardar_thermoking: false,
            fecha: elFecha?.value || '',
            ensayo_numero: sel.ensayo_numero,
            num_muestra: sel.num_muestra,
            fecha_inspeccion: getFechaInspeccionPacking(),
            responsable: responsable,
            hora_recepcion: hora,
            hora_inicio_recepcion_c5: hora,
            packing_start_index: packingQuota.filasPackingRegistradas,
            packingRows: packingCards.map((c) => buildPackingRowDesdeCard(c))
        };
    }

    function resumenPackingParaLog_(meta, cards) {
        const start = Number(meta.packing_start_index) || 0;
        return cards.map((card, i) => {
            const r = Array.isArray(meta.packingRows?.[i]) ? meta.packingRows[i] : [];
            return {
                i,
                fila_planilla: start + i + 1,
                n_clamshell: card.clamshellNum,
                fecha: meta.fecha,
                ensayo: meta.ensayo_numero,
                num_muestra: meta.num_muestra,
                fecha_inspeccion: meta.fecha_inspeccion,
                responsable: meta.responsable,
                hora_recepcion: meta.hora_recepcion,
                pesos: {
                    recepcion: card.pesos.recepcion,
                    ingreso_gas: card.pesos.ingresoGas,
                    salida_gas: card.pesos.salidaGas,
                    ingreso_pre: card.pesos.ingresoPre,
                    salida_pre: card.pesos.salidaPre
                },
                tiempos: r.slice(0, 5),
                observacion: String(card.observacion || '').trim()
            };
        });
    }

    function logEnvioPackingConsola(body, cards) {
        const n = Array.isArray(body.packingRows) ? body.packingRows.length : 0;
        console.log(
            '[SYNC] Packing → nube: ' + n + ' fila(s). ensayo: ' + (body.ensayo_numero || '—')
            + ' · muestra: ' + (body.num_muestra || '—')
        );
        console.log('[SYNC] Meta global (cols 47–50):', {
            fecha_ubicacion: body.fecha,
            fecha_inspeccion: body.fecha_inspeccion,
            responsable: body.responsable,
            hora_recepcion: body.hora_recepcion,
            packing_start_index: body.packing_start_index
        });
        console.log('[SYNC] Resumen por fila:', resumenPackingParaLog_(body, cards));
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
        const cuotaReg = validarCuotaClamshellsRegistroPacking();
        if (!cuotaReg.ok) {
            setStatus(cuotaReg.error, 'warn');
            if (elStatus) elStatus.dataset.pkCompletitudHint = '1';
            mostrarToastPacking('warning', 'Clamshells incompletos', cuotaReg.error);
            return;
        }
        if (!navigator.onLine) {
            setStatus('Sin internet para enviar al servidor.', 'warn');
            return;
        }
        const totalCampo = packingQuota.filasTotalCampo || totalFilasCampoPacking();
        const inicio = packingQuota.filasPackingRegistradas;
        if (totalCampo > 0 && inicio + packingCards.length > totalCampo) {
            mostrarToastPacking(
                'warning',
                'Demasiados clamshells',
                'Solo hay ' + totalCampo + ' fila(s) en campo; ya hay ' + inicio + ' con packing.'
            );
            return;
        }
        const validacion = validarCompletitudPackingParaEnvio();
        if (!validacion.ok) {
            const msg = validacion.errores[0] || 'Completa todos los datos de packing antes de enviar.';
            setStatus(msg, 'warn');
            if (elStatus) {
                elStatus.dataset.pkCompletitudHint = '1';
            }
            mostrarToastPacking('warning', 'Datos incompletos', msg);
            return;
        }
        if (elStatus?.dataset.pkCompletitudHint) {
            delete elStatus.dataset.pkCompletitudHint;
        }
        const sel = ensayoSeleccionado();
        const body = getMetaEnvioPacking();
        logEnvioPackingConsola(body, packingCards);
        guardarBorradorMuestraActiva();
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
            const rawMuestra = (sel.num_muestra && sel.ensayo_numero)
                ? (sel.num_muestra + '|' + sel.ensayo_numero)
                : (elMuestra?.value || '');
            limpiarBorradorTrasEnvioExitosoPacking(fecha, rawMuestra);
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
        try { localStorage.removeItem(PACKING_DRAFT_STORAGE_KEY); } catch (_) { /* ignore */ }
        setTimeout(() => window.location.reload(), 350);
    }

    function sumarMinutosHoraPacking(hora, minutosAgregar) {
        const m = minutosDesdeHoraPacking(hora);
        if (m === null) return '';
        const total = ((m + minutosAgregar) % (24 * 60) + (24 * 60)) % (24 * 60);
        return String(Math.floor(total / 60)).padStart(2, '0') + ':'
            + String(total % 60).padStart(2, '0');
    }

    function totalFilasCampoPacking() {
        const d = lastDetallePacking;
        const total = Number(
            d?.FILAS_REGISTRADAS ?? d?.numFilas ?? d?.FILAS_TOTAL_CAMPO ?? packingQuota.filasTotalCampo ?? 0
        );
        return Number.isFinite(total) && total > 0 ? total : 0;
    }

    function pesosDemoParaClamshellPacking(clamshellNum) {
        const limite = getLimitePesoRecepcionPacking(clamshellNum);
        let recep;
        if (limite != null && limite > 0) {
            recep = limite;
        } else {
            recep = Math.max(80, 125 - (clamshellNum - 1) * 4);
        }
        recep = Math.round(recep * 10) / 10;
        const r1 = (n) => Math.round(Math.max(0.1, n) * 10) / 10;

        let salPre = r1(Math.max(1, recep * 0.70));
        let ingPre = r1(Math.max(salPre, recep * 0.78));
        let salGas = r1(Math.max(ingPre, recep * 0.85));
        let ingGas = r1(Math.min(recep, Math.max(salGas, recep * 0.92)));

        ingGas = Math.min(recep, ingGas);
        salGas = Math.min(recep, Math.max(ingPre, salGas));
        ingPre = Math.max(salPre, Math.min(salGas, ingPre));
        salPre = Math.min(ingPre, Math.max(1, salPre));

        const pesos = {
            recepcion: recep,
            ingresoGas: ingGas,
            salidaGas: salGas,
            ingresoPre: ingPre,
            salidaPre: salPre
        };
        const err = validarSecuenciaPesosPacking(pesos, limite);
        if (!err.length) return pesos;

        salPre = r1(Math.max(1, recep * 0.75));
        ingPre = r1(salPre + Math.max(0.5, recep * 0.03));
        salGas = r1(ingPre + Math.max(0.5, recep * 0.03));
        ingGas = r1(Math.min(recep, salGas + Math.max(0.5, recep * 0.02)));
        return {
            recepcion: recep,
            ingresoGas: Math.min(recep, ingGas),
            salidaGas: Math.min(recep, Math.max(ingPre, salGas)),
            ingresoPre: Math.max(salPre, Math.min(salGas, ingPre)),
            salidaPre: Math.min(ingPre, Math.max(1, salPre))
        };
    }

    function llenarTiemposDemoPacking() {
        initHoraInicio(true);
        const baseHora = getHoraPersonal() || '08:00';
        const offsetsMin = [0, 60, 120, 180, 240];
        TIEMPOS_MUESTRA_IDS.forEach((id, i) => {
            const inp = document.getElementById(id);
            if (inp) inp.value = sumarMinutosHoraPacking(baseHora, offsetsMin[i] || 0);
        });
    }

    function llenarControlEquitativoDemoPacking() {
        packingControlState.temperatura.amb = ['12.5', '11.8', '11.2', '10.5', '10.0'];
        packingControlState.temperatura.pulpa = ['11.0', '10.5', '10.0', '9.5', '9.0'];
        packingControlState.humedad = ['85.0', '84.0', '83.0', '82.0', '81.0'];
        recalcularPresionesPacking();
    }

    function fabIniciarRegistroPacking() {
        establecerMenuFlotantePacking(false);
        if (!muestraSeleccionada()) {
            mostrarToastPacking('info', 'Seleccionar muestra', 'Selecciona una muestra antes de cargar datos de prueba.');
            return;
        }
        if (!lastDetallePacking) {
            mostrarToastPacking('info', 'Espera el detalle', 'Carga el detalle de la muestra (planilla) antes de simular.');
            return;
        }
        const totalServidor = totalFilasCampoPacking();
        if (totalServidor <= 0) {
            mostrarToastPacking('warn', 'Sin filas', 'No hay filas de campo en el servidor para simular.');
            return;
        }
        const objetivoLocal = Math.min(
            totalServidor - packingQuota.filasPackingRegistradas,
            slotsDisponiblesEnServidorPacking()
        );
        if (objetivoLocal <= 0) {
            mostrarToastPacking(
                'info',
                'Packing completo',
                'Todos los clamshells (' + totalServidor + ') ya están registrados en servidor.'
            );
            return;
        }

        packingCards = [];
        packingActiveCardId = null;
        for (let i = 0; i < objetivoLocal; i++) {
            const num = packingQuota.filasPackingRegistradas + i + 1;
            const card = crearCardPacking(num);
            card.pesos = pesosDemoParaClamshellPacking(num);
            card.observacion = 'SIM-' + num;
            packingCards.push(card);
        }
        packingActiveCardId = packingCards[0]?.id ?? null;

        if (elResponsable && !String(elResponsable.value || '').trim()) {
            elResponsable.value = 'Demo packing';
        }

        llenarTiemposDemoPacking();
        llenarControlEquitativoDemoPacking();

        renderizarCardsPacking();
        actualizarContadoresTiempo();
        actualizarContadoresPresionPacking();
        actualizarFabRestanteBadge();
        programarGuardadoBorradorPacking();

        const validacionDemo = validarCompletitudPackingParaEnvio();
        if (!validacionDemo.ok) {
            setStatus(
                'Demo generado con advertencia: ' + (validacionDemo.errores[0] || 'revisa los datos.'),
                'warn'
            );
            if (elStatus) elStatus.hidden = false;
            mostrarToastPacking(
                'warning',
                'Demo con revisión',
                validacionDemo.errores[0] || 'Revisa pesos o tiempos del demo.'
            );
        } else {
            setStatus('');
            if (elStatus) elStatus.hidden = true;
            mostrarToastPacking(
                'success',
                'Datos de prueba',
                'Simulados ' + objetivoLocal + ' clamshell(s) listos para enviar (cumplen reglas).'
            );
        }

        actualizarBtnEnviarPacking();
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
        if (muestraSeleccionada() && !packingRestaurandoBorrador) {
            snapshotMuestraPackingSiHayTrabajo(elFecha?.value, elMuestra?.value);
        }
        setResumenVisible(false);
        lastDetallePacking = null;
        setPackingCardHabilitada(false);
        resetControlGlobalPacking();
        resetCardsPacking();
        limpiarPreviewChips();
        if (elResponsable) elResponsable.value = '';
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

        if (elResponsable) {
            const resp = String(d.RESPONSABLE ?? '').trim();
            if (resp) elResponsable.value = resp;
        }

        aplicarCuotaDesdeDetalle(d);
        logMetaServidorPackingConsola(d);

        if (elPreview) {
            elPreview.classList.remove('is-loading-preview');
            elPreview.classList.add('is-loaded');
        }

        const key = claveBorradorMuestraPacking(elFecha?.value, elMuestra?.value);
        const borrador = key ? leerStoreBorradorPacking().porClave[key] : null;
        if (borrador && hayDatosTrabajoMuestraPacking(borrador)) {
            aplicarEstadoMuestraPacking(borrador, { skipPreview: true });
        } else {
            reiniciarCardsPacking();
        }
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
            restaurarMuestraActivaDesdeBorrador();
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
        const rawMuestra = String(elMuestra?.value || '').trim();
        const key = claveBorradorMuestraPacking(fechaIso, rawMuestra);
        if (!navigator.onLine) {
            const borrador = key ? leerStoreBorradorPacking().porClave[key] : null;
            if (borrador && hayDatosTrabajoMuestraPacking(borrador)) {
                setResumenVisible(true);
                setChipsPanelCollapsed(false, false);
                setPreviewLoading(false);
                aplicarEstadoMuestraPacking(borrador);
                setPackingCardHabilitada(true);
                setStatus('Sin internet: datos recuperados del borrador local.', 'warn');
                return;
            }
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
        const fechaPrev = packingFechaAnterior || elFecha?.value || '';
        const muestraPrev = packingMuestraAnterior || elMuestra?.value || '';
        if (muestraPrev && fechaPrev) {
            snapshotMuestraPackingSiHayTrabajo(fechaPrev, muestraPrev);
        }
        packingMuestraAnterior = '';
        packingFechaAnterior = elFecha?.value || '';
        const fecha = elFecha?.value || '';
        if (fecha) void cargarMuestrasPorFecha(fecha);
        else resetMuestraSelect('Seleccionar fecha', true);
    }

    elFecha?.addEventListener('focus', () => {
        packingFechaAnterior = elFecha?.value || '';
    });
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
        const obsBtn = ev.target.closest('.packing-observation-btn');
        if (obsBtn && !obsBtn.disabled) {
            ev.stopPropagation();
            abrirModalObservacionPacking(ev, Number(obsBtn.dataset.cardId));
            return;
        }
        if (ev.target.closest('.metric-actions, .metric-btn, .observation-box')) return;
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
        const tiempoBtn = ev.target.closest('.packing-metric-tiempo-open-btn');
        if (tiempoBtn) {
            const cardEl = tiempoBtn.closest('.packing-clamshell-card');
            const cardId = cardEl ? Number(cardEl.dataset.cardId) : NaN;
            const card = Number.isFinite(cardId) ? getCardPackingById(cardId) : packingCards[0];
            abrirTiemposMuestra(ev, {
                soloLectura: tiempoBtn.hasAttribute('data-tiempos-readonly'),
                clamshellNum: card?.clamshellNum
            });
            return;
        }
        const presionAmbBtn = ev.target.closest('.packing-metric-presion-amb-btn');
        if (presionAmbBtn) {
            const cardEl = presionAmbBtn.closest('.packing-clamshell-card');
            const cardId = cardEl ? Number(cardEl.dataset.cardId) : NaN;
            const card = Number.isFinite(cardId) ? getCardPackingById(cardId) : packingCards[0];
            abrirModalPresionPacking(ev, 'ambiente', card?.clamshellNum);
            return;
        }
        const presionFrutaBtn = ev.target.closest('.packing-metric-presion-fruta-btn');
        if (presionFrutaBtn) {
            const cardEl = presionFrutaBtn.closest('.packing-clamshell-card');
            const cardId = cardEl ? Number(cardEl.dataset.cardId) : NaN;
            const card = Number.isFinite(cardId) ? getCardPackingById(cardId) : packingCards[0];
            abrirModalPresionPacking(ev, 'fruta', card?.clamshellNum);
        }
    });
    elTiemposCancel?.addEventListener('click', () => cerrarTiemposMuestra(true));
    elTiemposGuardar?.addEventListener('click', guardarTiemposMuestra);
    elTiemposModal?.addEventListener('click', (e) => {
        if (e.target === elTiemposModal) cerrarTiemposMuestra(true);
    });

    elPresionCancel?.addEventListener('click', cerrarModalPresionPacking);
    elPresionModal?.addEventListener('click', (e) => {
        if (e.target === elPresionModal) cerrarModalPresionPacking();
    });

    elObsCancel?.addEventListener('click', cerrarModalObservacionPacking);
    elObsGuardar?.addEventListener('click', guardarModalObservacionPacking);
    elObsModal?.addEventListener('click', (e) => {
        if (e.target === elObsModal) cerrarModalObservacionPacking();
    });

    elBtnTempPacking?.addEventListener('click', () => abrirModalControlGlobalPacking('temperatura'));
    elBtnHumPacking?.addEventListener('click', () => abrirModalControlGlobalPacking('humedad'));
    elControlCancelPacking?.addEventListener('click', cerrarModalControlGlobalPacking);
    elControlGuardarPacking?.addEventListener('click', guardarModalControlGlobalPacking);
    elControlModalPacking?.addEventListener('click', (e) => {
        if (e.target === elControlModalPacking) cerrarModalControlGlobalPacking();
    });

    PACKING_PESO_CAMPOS.forEach((c) => {
        const inp = document.getElementById(c.inpId);
        inp?.addEventListener('input', validarPesosModalEnVivo);
        inp?.addEventListener('change', validarPesosModalEnVivo);
    });

    TIEMPOS_MUESTRA_IDS.forEach((id) => {
        const inp = document.getElementById(id);
        const onTiempoInput = () => {
            actualizarContadoresTiempo();
            validarTiemposModalEnVivo();
        };
        inp?.addEventListener('change', onTiempoInput);
        inp?.addEventListener('input', onTiempoInput);
    });

    elHoraInicio?.addEventListener('change', () => {
        if (elTiemposModal?.style.display === 'flex' && !tiemposModalSoloLectura) {
            validarTiemposModalEnVivo();
        }
        programarGuardadoBorradorPacking();
    });
    elHoraInicio?.addEventListener('input', programarGuardadoBorradorPacking);
    elResponsable?.addEventListener('change', programarGuardadoBorradorPacking);
    elResponsable?.addEventListener('input', programarGuardadoBorradorPacking);

    elMuestra?.addEventListener('focus', () => {
        packingMuestraAnterior = elMuestra?.value || '';
    });

    elMuestra?.addEventListener('change', () => {
        const fecha = elFecha?.value || '';
        const raw = elMuestra?.value || '';
        const prev = packingMuestraAnterior;
        if (!packingRestaurandoBorrador && prev && prev !== raw) {
            snapshotMuestraPackingSiHayTrabajo(fecha, prev);
        }
        packingMuestraAnterior = raw;
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
        const store = leerStoreBorradorPacking();
        store.activa = claveBorradorMuestraPacking(fecha, raw);
        escribirStoreBorradorPacking(store);
        void cargarDetalle(fecha, ensayoNumero);
    });

    window.addEventListener('beforeunload', () => {
        guardarBorradorMuestraActiva();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') guardarBorradorMuestraActiva();
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
            humedad: packingControlState.humedad.slice(),
            presionAmb: packingControlState.presionAmb.slice(),
            presionFruta: packingControlState.presionFruta.slice()
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
    actualizarContadoresPresionPacking();
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
