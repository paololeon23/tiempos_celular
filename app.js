const META_SAVE_IDS = [
    'visual-meta-muestra',
    'visual-num-muestra',
    'visual-responsable',
    'visual-guia-precosecha',
    'visual-hora',
    'visual-meta-fundo',
    'visual-traz-etapa',
    'visual-traz-campo',
    'visual-traz-turno',
    'visual-meta-variedad',
    'visual-guia-acopio',
    'visual-placa-vehiculo',
    'visual-trazabilidad',
    'visual-rotulo'
];

        /** Compatibilidad: datos guardados con ids viejos en localStorage. */
        const LEGACY_META_KEYS = {
            'visual-meta-muestra': ['meta-muestra'],
            'visual-meta-fundo': ['meta-fundo'],
            'visual-meta-variedad': ['meta-variedad'],
            'visual-traz-etapa': ['meta-traz-etapa'],
            'visual-traz-campo': ['meta-traz-campo']
        };

        function migrarClavesMetaObjeto(o) {
            if (!o || typeof o !== 'object') return;
            Object.keys(LEGACY_META_KEYS).forEach((nuevo) => {
                const cur = o[nuevo];
                if (cur !== undefined && cur !== null && String(cur).trim() !== '') return;
                const legacyList = LEGACY_META_KEYS[nuevo];
                for (let i = 0; i < legacyList.length; i++) {
                    const old = legacyList[i];
                    const v = o[old];
                    if (v !== undefined && v !== null && String(v).trim() !== '') {
                        o[nuevo] = v;
                        return;
                    }
                }
            });
        }
        const META_STORAGE_KEY = 'tiempos-operativo-meta-v4';
        /** Una sola vez por navegador: rellena meta de ejemplo para probar envío (solo campos vacíos). */
        const DEMO_META_CAMPO_SEED_KEY = 'tiempos-demo-meta-campo-seed-v1';
        const SYNC_QUEUE_KEY = 'tiempos-sync-queue-v1';
        const SYNC_HISTORY_KEY = 'tiempos-sync-history-v1';
        const DRAFT_STORAGE_KEY = 'tiempos-draft-full-v1';
        const CLEAN_START_DONE_KEY = 'tiempos-clean-start-done-v2';
        const SYNC_MAX_HISTORY = 80;
        const NUM_MUESTRA_MAX_LEN = 4;
        const REGISTRADOS_HOY_CACHE_KEY = 'tiempos-registrados-hoy-cache-v1';
        const NUM_MUESTRA_USADOS_KEY = 'tiempos-num-muestra-usados-v1';
        const REQUIRED_SEND_IDS = [
            // Info
            'visual-meta-muestra',
            'visual-num-muestra',
            'visual-responsable',
            'visual-guia-precosecha',
            'visual-hora',
            'visual-meta-fundo',
            'visual-traz-etapa',
            'visual-traz-campo',
            'visual-traz-turno',
            'visual-meta-variedad',
            'visual-fecha-ring-widget',
            // Peso bruto
            'visual-m-jarra',
            'visual-p1',
            'visual-p2',
            'visual-acopio',
            'visual-despacho',
            // Tiempos
            'visual-tiempo-1-iniciocosecha-1',
            'visual-tiempo-1-inicioperdida-2',
            'visual-tiempo-1-terminocosecha-3',
            'visual-tiempo-1-terminocosecha-4',
            'visual-tiempo-1-despachoacopio-5',
            // Temperatura muestra
            'visual-temp-amb-inicio',
            'visual-temp-pulpa-inicio',
            'visual-temp-amb-termino',
            'visual-temp-pulpa-termino',
            'visual-temp-amb-llegada',
            'visual-temp-pulpa-llegada',
            'visual-temp-amb-despacho',
            'visual-temp-pulpa-despacho',
            // Humedad relativa
            'visual-cg-humedad-inicio',
            'visual-cg-humedad-termino',
            'visual-cg-humedad-llegada',
            'visual-cg-humedad-despacho',
            // Presion ambiente
            'visual-presionambiente-1-presionambienteinicio-1',
            'visual-presionambiente-1-presionambientetermino-2',
            'visual-presionambiente-1-presionambientellegada-3',
            'visual-presionambiente-1-presionambientedespacho-4',
            // Presion fruta
            'visual-presionfruta-1-presionfrutainicio-1',
            'visual-presionfruta-1-presionfrutatermino-2',
            'visual-presionfruta-1-presionfrutallegada-3',
            'visual-presionfruta-1-presionfrutadespacho-4',
            // Observacion y logistica
            'visual-observation',
            'visual-guia-acopio',
            'visual-placa-vehiculo'
        ];
        /** Web App de Apps Script: pega aquí tu URL completa (ej. https://script.google.com/macros/s/.../exec). */
        const APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbwdC1lwuGNT01xfLE_0jI31oXU13rBinYPKwlVfkZwqmIJGqSRuvPnq4-A9b6tHZThN/exec';
        const API_URL = (String(APPS_SCRIPT_API_URL || '').trim()
            || String((typeof window !== 'undefined' && (window.API_URL || window.__API_URL)) || '').trim());
        const metaForm = document.getElementById('form-operativo-meta');
        const metaAccordion = document.getElementById('meta-accordion');
        const metaAccordionTrigger = document.getElementById('meta-accordion-trigger');
        const metaAccordionPanel = document.getElementById('meta-accordion-panel');
        const fabMenu = document.getElementById('fab-menu');
        const fabOptionsBtn = document.getElementById('fab-options-btn');
        const HEADER_TIPO_REGISTRO_KEY = 'tiempos-header-tipo-registro-v2';

        (function limpiarDatosLocalesUnaVez() {
            try {
                const ya = localStorage.getItem(CLEAN_START_DONE_KEY);
                if (ya === '1') return;
                localStorage.removeItem(META_STORAGE_KEY);
                localStorage.removeItem(DEMO_META_CAMPO_SEED_KEY);
                localStorage.removeItem(SYNC_QUEUE_KEY);
                localStorage.removeItem(SYNC_HISTORY_KEY);
                localStorage.removeItem(DRAFT_STORAGE_KEY);
                localStorage.setItem(CLEAN_START_DONE_KEY, '1');
            } catch (_) { /* ignore */ }
        }());

        (function initHeaderTipoRegistro() {
            const sel = document.getElementById('header-tipo-registro');
            if (!sel) return;
            const valid = [...sel.options].map((o) => o.value);
            try {
                const v = localStorage.getItem(HEADER_TIPO_REGISTRO_KEY);
                if (v && valid.includes(v)) sel.value = v;
                else if (v && !valid.includes(v)) sel.value = 'visual';
            } catch (e) { /* ignore */ }
            sel.addEventListener('change', () => {
                try {
                    localStorage.setItem(HEADER_TIPO_REGISTRO_KEY, sel.value);
                } catch (e) { /* ignore */ }
            });
        }());

        function actualizarIconos() {
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        }

        async function defocusToBodySafe_() {
            const body = document.body;
            if (!body) return;
            const hadBodyTabindex = body.hasAttribute('tabindex');
            if (!hadBodyTabindex) body.setAttribute('tabindex', '-1');
            try {
                const active = document.activeElement;
                if (active && active !== body && typeof active.blur === 'function') active.blur();
            } catch (_) { /* ignore */ }
            // Reintenta un par de ticks por navegadores móviles que tardan en soltar foco.
            for (let i = 0; i < 3; i++) {
                try {
                    if (typeof body.focus === 'function') body.focus({ preventScroll: true });
                    const nowActive = document.activeElement;
                    if (nowActive === body) break;
                    if (nowActive && nowActive !== body && typeof nowActive.blur === 'function') nowActive.blur();
                } catch (_) { /* ignore */ }
                await new Promise((resolve) => setTimeout(resolve, 0));
            }
            if (!hadBodyTabindex) body.removeAttribute('tabindex');
        }

        async function swalFireSafe(options) {
            if (!(window.Swal && typeof window.Swal.fire === 'function')) return null;
            const incoming = options || {};
            const isToast = !!incoming.toast;
            const opts = Object.assign({}, incoming);
            if (!isToast) {
                await defocusToBodySafe_();
                opts.returnFocus = false;
            } else {
                // SweetAlert2 advierte si returnFocus se envía en toasts.
                delete opts.returnFocus;
            }
            return await window.Swal.fire(opts);
        }

        function mostrarAlertaRegla(titulo, texto) {
            if (window.Swal && typeof window.Swal.fire === 'function') {
                swalFireSafe({
                    icon: 'warning',
                    title: titulo,
                    text: texto,
                    confirmButtonText: 'Entendido'
                });
                return;
            }
            alert(texto);
        }

        function mostrarToast(icono, titulo, texto) {
            if (window.Swal && typeof window.Swal.fire === 'function') {
                swalFireSafe({
                    toast: true,
                    position: 'top-end',
                    icon: icono || 'info',
                    title: titulo || '',
                    text: texto || '',
                    showConfirmButton: false,
                    timer: 2600,
                    timerProgressBar: true
                });
                return;
            }
            if (texto) alert(texto);
        }

        let ultimoNumMuestraDuplicadoAlertado = '';
        async function alertarNumMuestraDuplicado(numMuestra) {
            const nm = String(numMuestra || '').trim();
            if (!nm) return 'keep';
            if (ultimoNumMuestraDuplicadoAlertado === nm) return 'keep';
            ultimoNumMuestraDuplicadoAlertado = nm;
            if (window.Swal && typeof window.Swal.fire === 'function') {
                const resp = await swalFireSafe({
                    icon: 'warning',
                    title: 'N° muestra ya existe',
                    text: `El N° muestra "${nm}" ya está registrado. Debes cambiarlo para guardar.`,
                    showDenyButton: true,
                    confirmButtonText: 'Cambiar número',
                    denyButtonText: 'No enviar',
                    allowOutsideClick: false
                });
                if (resp.isDenied) return 'cancel';
            } else {
                alert(`El N° muestra "${nm}" ya está registrado. Debes cambiarlo para guardar.`);
            }
            establecerAcordeonMetaAbierto(true);
            return 'keep';
        }

        let offlineAlertShown = false;
        function mostrarAlertaModoOffline() {
            if (offlineAlertShown) return;
            offlineAlertShown = true;
            const titulo = 'Atencion: modo offline';
            const texto = 'El sistema va a funcionar offline. Atencion y tener precaucion. Queda atento a todo.';
            if (window.Swal && typeof window.Swal.fire === 'function') {
                swalFireSafe({
                    icon: 'warning',
                    title: titulo,
                    text: texto,
                    confirmButtonText: 'Entendido',
                    allowOutsideClick: false
                });
                return;
            }
            alert(texto);
        }

        function slugIdSeguro(valor) {
            return String(valor || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'na';
        }

        function mostrarMuestra(ensayo) {
            const texto = String(ensayo || '').trim();
            if (!texto) return 'Muestra --';
            return texto.replace(/^ensayo\s*/i, 'Muestra ');
        }

        function normalizarNumMuestraInput(v) {
            return String(v ?? '').trim().slice(0, NUM_MUESTRA_MAX_LEN);
        }

        function normalizarNumMuestraClave(v) {
            return String(v ?? '').trim().split('·')[0].trim().toUpperCase();
        }

        function mostrarToastSimpleInferior(texto, ms = 3200) {
            const id = 'simple-bottom-toast';
            let el = document.getElementById(id);
            if (!el) {
                el = document.createElement('div');
                el.id = id;
                el.style.position = 'fixed';
                el.style.left = '50%';
                el.style.bottom = '18px';
                el.style.transform = 'translateX(-50%)';
                el.style.background = 'rgba(15, 23, 42, 0.96)';
                el.style.color = '#fff';
                el.style.padding = '10px 14px';
                el.style.borderRadius = '12px';
                el.style.fontSize = '13px';
                el.style.fontWeight = '600';
                el.style.boxShadow = '0 10px 24px rgba(2, 6, 23, 0.35)';
                el.style.zIndex = '99999';
                el.style.maxWidth = '92vw';
                el.style.textAlign = 'center';
                el.style.opacity = '0';
                el.style.transition = 'opacity 140ms ease';
                document.body.appendChild(el);
            }
            el.textContent = texto || 'Revisa los campos.';
            el.style.opacity = '1';
            clearTimeout(el.__hideTimer);
            el.__hideTimer = setTimeout(() => { el.style.opacity = '0'; }, Math.max(1200, ms));
        }

        function valorCampoRequerido(id) {
            if (id === 'visual-fecha-ring-widget') {
                const day = String(document.getElementById('fecha-ring-day')?.textContent || '').trim();
                const month = String(document.getElementById('fecha-ring-month')?.textContent || '').trim();
                return `${day}${month}`.trim();
            }
            const el = document.getElementById(id);
            if (!el) return '';
            if (el.type === 'checkbox' || el.type === 'radio') return el.checked ? '1' : '';
            return String(el.value ?? '').trim();
        }

        function campoVacio(v) {
            return String(v ?? '').trim() === '';
        }

        function valorCampoMetaEnsayo_(ensayo, id) {
            const clave = String(ensayo || 'Ensayo 1');
            const meta = metaPorEnsayo[clave] || {};
            if (id === 'visual-fecha-ring-widget') return hoyIsoLocal();
            if (id === 'visual-meta-muestra') return clave;
            if (id === 'visual-guia-acopio') {
                return String(ensayoMeta?.[clave]?.guiaRemision || '').trim();
            }
            if (id === 'visual-placa-vehiculo') {
                return String(ensayoMeta?.[clave]?.placaVehiculo || '').trim();
            }
            return String(meta[id] ?? '').trim();
        }

        function recolectarFaltantesEnvio(ensayoObjetivo) {
            const faltantes = [];
            const metaIds = [
                'visual-meta-muestra',
                'visual-num-muestra',
                'visual-responsable',
                'visual-guia-precosecha',
                'visual-hora',
                'visual-meta-fundo',
                'visual-traz-etapa',
                'visual-traz-campo',
                'visual-traz-turno',
                'visual-meta-variedad',
                'visual-fecha-ring-widget',
                'visual-guia-acopio',
                'visual-placa-vehiculo'
            ];
            const ensayo = String(ensayoObjetivo || obtenerEnsayoActivo() || 'Ensayo 1');
            metaIds.forEach((id) => {
                if (campoVacio(valorCampoMetaEnsayo_(ensayo, id))) faltantes.push(etiquetaCampoRequerido(id));
            });
            const items = data
                .filter((it) => String(it?.ensayo || 'Ensayo 1') === String(ensayo))
                .slice()
                .sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
            if (!items.length) {
                faltantes.push('Agregar al menos un clamshell');
                return faltantes;
            }

            const keysTiempo = ['inicioCosecha', 'inicioPerdida', 'terminoCosecha', 'llegadaAcopio', 'despachoAcopio'];
            const keysTemp = ['inicioAmbiente', 'inicioPulpa', 'terminoAmbiente', 'terminoPulpa', 'llegadaAmbiente', 'llegadaPulpa', 'despachoAmbiente', 'despachoPulpa'];
            const keysHum = ['inicio', 'termino', 'llegada', 'despacho'];
            const keysPresAmb = ['presionAmbienteInicio', 'presionAmbienteTermino', 'presionAmbienteLlegada', 'presionAmbienteDespacho'];
            const keysPresFru = ['presionFrutaInicio', 'presionFrutaTermino', 'presionFrutaLlegada', 'presionFrutaDespacho'];
            const primer = items[0] || null;

            items.forEach((item, idx) => {
                const n = idx + 1;
                if (campoVacio(item?.jarra)) faltantes.push(`Clamshell ${n}: N° jarra`);
                if (campoVacio(item?.p1)) faltantes.push(`Clamshell ${n}: Peso inicial 1`);
                if (campoVacio(item?.p2)) faltantes.push(`Clamshell ${n}: Peso inicial 2`);
                if (campoVacio(item?.acopio)) faltantes.push(`Clamshell ${n}: Llegada acopio-campo`);
                if (campoVacio(item?.despacho)) faltantes.push(`Clamshell ${n}: Despacho acopio-campo`);

                const t = item?.metric?.tiempo || {};
                // Regla operativa: tiempos se capturan en el clamshell líder (primero) y se replican.
                if (idx === 0 && keysTiempo.some((k) => campoVacio(t[k]))) {
                    faltantes.push('Tiempos de la muestra (Clamshell líder)');
                }

                const temp = item?.metric?.temperatura || {};
                if (keysTemp.some((k) => campoVacio(temp[k]))) faltantes.push(`Clamshell ${n}: Temperatura (ambiente/pulpa)`);

                // Aunque se calculen, deben existir para considerarse válidos.
                if (keysPresAmb.some((k) => campoVacio(temp[k]))) faltantes.push(`Clamshell ${n}: Presión vapor ambiente`);
                if (keysPresFru.some((k) => campoVacio(temp[k]))) faltantes.push(`Clamshell ${n}: Presión vapor fruta`);
            });

            // Humedad es global para todos: validar una sola vez en el clamshell líder.
            const humGlobal = primer?.metric?.humedad || {};
            if (keysHum.some((k) => campoVacio(humGlobal[k]))) {
                faltantes.push('Humedad global');
            }
            return faltantes;
        }

        function obtenerEnsayosCompletosParaEnvio() {
            const ensayos = [...new Set(data.map((it) => String(it?.ensayo || 'Ensayo 1')).filter(Boolean))];
            return ensayos.filter((ensayo) => recolectarFaltantesEnvio(ensayo).length === 0);
        }

        function etiquetaCampoRequerido(id) {
            if (id === 'visual-fecha-ring-widget') return 'Fecha';
            const lbl = document.querySelector(`label[for="${id}"]`);
            if (lbl) {
                const txt = String(lbl.textContent || '').replace(/\s+/g, ' ').trim();
                if (txt) return txt;
            }
            return id;
        }

        async function validarCamposRequeridosAntesDeEnviar(ensayoObjetivo) {
            const faltantes = recolectarFaltantesEnvio(ensayoObjetivo);
            if (!faltantes.length) return true;
            const top = faltantes.slice(0, 12);
            const extra = Math.max(0, faltantes.length - top.length);
            const listHtml = top.map((txt) => `
                <li class="swal-campos-item">
                    <span class="swal-campos-dot"></span>
                    <span class="swal-campos-item-text">${txt}</span>
                </li>
            `).join('');
            const extraHtml = extra > 0
                ? `<div style="margin-top:8px;font-size:12px;color:#64748b;">... y ${extra} campo(s) más</div>`
                : '';
            if (window.Swal && typeof window.Swal.fire === 'function') {
                await swalFireSafe({
                    icon: 'warning',
                    title: `Campos incompletos (${faltantes.length})`,
                    html: `
                        <div class="swal-campos-wrap">
                            <div class="swal-campos-head">
                                Completa estos campos antes de enviar
                            </div>
                            <ul class="swal-campos-list">
                                ${listHtml}
                            </ul>
                            <div class="swal-campos-foot">
                                ${extraHtml || '<span>Todo campo debe tener dato para continuar.</span>'}
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#1f4f82',
                    width: 480,
                    customClass: {
                        popup: 'swal-campos-popup',
                        title: 'swal-campos-title',
                        confirmButton: 'swal-campos-confirm-btn'
                    },
                    allowOutsideClick: false
                });
            } else {
                const texto = `Campos incompletos (${faltantes.length})\n- ${top.join('\n- ')}${extra > 0 ? `\n... y ${extra} más` : ''}`;
                alert(texto);
            }
            return false;
        }

        function descripcionMuestraConNumero(ensayo) {
            const claveEnsayo = String(ensayo || 'Ensayo 1');
            const meta = metaPorEnsayo[claveEnsayo] || {};
            const numero = String(meta['visual-num-muestra'] || '').trim() || '--';
            return `${mostrarMuestra(claveEnsayo)} · N°: ${numero}`;
        }

        function asegurarIdsInputsDinamicos(root, prefijo) {
            if (!root) return;
            const base = slugIdSeguro(prefijo);
            root.querySelectorAll('input:not([id])').forEach((input, idx) => {
                const key = input.getAttribute('data-metric')
                    || input.getAttribute('data-ensayo-placa')
                    || input.getAttribute('data-ensayo-guia')
                    || input.name
                    || input.className
                    || input.type
                    || 'campo';
                input.id = `${base}-${slugIdSeguro(key)}-${idx + 1}`;
            });
        }

        function actualizarVistaCompacta() {
            const nMuestra = document.getElementById('visual-num-muestra')?.value?.trim() ?? '';
            const muestra = document.getElementById('visual-meta-muestra')?.value?.trim() ?? '';
            const t = document.getElementById('visual-trazabilidad')?.value?.trim() ?? '';
            const pNum = document.getElementById('preview-num');
            const pMuestra = document.getElementById('preview-muestra');
            const pTraz = document.getElementById('preview-traz');
            const muestraTexto = muestra ? String(muestra).replace(/^Ensayo\s*/i, 'Muestra ') : '';
            if (pNum) {
                pNum.textContent = `N° ${nMuestra || '--'}`;
                pNum.classList.toggle('meta-preview-pill--empty', !nMuestra);
            }
            if (pMuestra) {
                pMuestra.textContent = muestraTexto || '--';
                pMuestra.classList.toggle('meta-preview-pill--empty', !muestraTexto);
            }
            if (pTraz) {
                pTraz.textContent = t || '--';
                pTraz.classList.toggle('meta-preview-pill--empty', !t);
            }
        }

        function sincronizarTrazabilidadCompuesta() {
            const etapaEl = document.getElementById('visual-traz-etapa');
            const campoEl = document.getElementById('visual-traz-campo');
            const turnoEl = document.getElementById('visual-traz-turno');
            if (!etapaEl || !campoEl || !turnoEl) return;
            const etapa = etapaEl.value?.trim() ?? '';
            const campo = campoEl.value?.trim() ?? '';
            const turno = turnoEl.value?.trim() ?? '';
            const traz = [etapa, campo, turno].filter(Boolean).join('-');
            const hidden = document.getElementById('visual-trazabilidad');
            if (hidden) hidden.value = traz;
        }

        function actualizarBloqueoTrazabilidadPorFundo() {
            const fundoEl = document.getElementById('visual-meta-fundo');
            const etapaEl = document.getElementById('visual-traz-etapa');
            const campoEl = document.getElementById('visual-traz-campo');
            const turnoEl = document.getElementById('visual-traz-turno');
            const variedadEl = document.getElementById('visual-meta-variedad');
            if (!fundoEl || !etapaEl || !campoEl || !turnoEl) return;
            const habilitado = String(fundoEl.value || '').trim() !== '';
            [etapaEl, campoEl, turnoEl].forEach((el) => {
                el.disabled = !habilitado;
            });
            // Variedad siempre debe quedar habilitada (independiente de Fundo/Traza).
            if (variedadEl) variedadEl.disabled = false;
            if (!habilitado) {
                etapaEl.value = '';
                campoEl.value = '';
                turnoEl.value = '';
                sincronizarTrazabilidadCompuesta();
            }
        }

        function establecerAcordeonMetaAbierto(open) {
            if (!metaAccordion || !metaAccordionTrigger || !metaAccordionPanel) return;
            // Evita warning ARIA: no cerrar un contenedor aria-hidden con foco dentro.
            if (!open) {
                const active = document.activeElement;
                if (active && metaAccordionPanel.contains(active) && typeof active.blur === 'function') {
                    active.blur();
                }
            }
            metaAccordion.classList.toggle('is-open', open);
            metaAccordionTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            metaAccordionPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
        }

        metaAccordionTrigger?.addEventListener('click', () => {
            establecerAcordeonMetaAbierto(!metaAccordion?.classList.contains('is-open'));
        });

        let metaPorEnsayo = {};
        let metaActivoEnsayo = 'Ensayo 1';

        function ensayoDesdeFormulario() {
            const muestra = document.getElementById('visual-meta-muestra')?.value?.trim();
            const rotulo = document.getElementById('visual-rotulo')?.value?.trim();
            return muestra || rotulo || metaActivoEnsayo || 'Ensayo 1';
        }

        function leerMetaFormulario() {
            const o = {};
            META_SAVE_IDS.forEach((id) => {
                const el = document.getElementById(id);
                if (el) o[id] = el.value;
            });
            return o;
        }

        function escribirMetaFormulario(o, ensayo) {
            const muestraObjetivo = ensayo || o?.['visual-meta-muestra'] || o?.['meta-muestra'] || ensayoDesdeFormulario() || 'Ensayo 1';
            META_SAVE_IDS.forEach((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (id === 'visual-meta-muestra') {
                    el.value = muestraObjetivo;
                    return;
                }
                if (id === 'visual-rotulo') {
                    el.value = muestraObjetivo;
                    return;
                }
                const v = o?.[id];
                el.value = v !== undefined && v !== null ? String(v) : '';
            });
        }

        function snapshotMetaEnsayoActual() {
            const ensayo = metaActivoEnsayo || ensayoDesdeFormulario() || 'Ensayo 1';
            const actual = leerMetaFormulario();
            actual['visual-meta-muestra'] = ensayo;
            actual['visual-rotulo'] = ensayo;
            metaPorEnsayo[ensayo] = actual;
        }

        function cargarMetaDeEnsayo(ensayo) {
            const objetivo = ensayo || 'Ensayo 1';
            const dataEnsayo = metaPorEnsayo[objetivo] || {};
            escribirMetaFormulario(dataEnsayo, objetivo);
            metaActivoEnsayo = objetivo;
            actualizarBloqueoTrazabilidadPorFundo();
            sincronizarTrazabilidadCompuesta();
            sincronizarChipsDesdeAlmacenamiento();
            actualizarVistaCompacta();
            actualizarProgresoMeta();
        }

        function cargarMetaDesdeAlmacenamiento() {
            let raw = null;
            try {
                raw = localStorage.getItem(META_STORAGE_KEY);
            } catch (e) { /* ignore */ }
            if (!raw) return false;
            try {
                const o = JSON.parse(raw);
                if (o && typeof o === 'object' && o.porEnsayo && typeof o.porEnsayo === 'object') {
                    metaPorEnsayo = o.porEnsayo;
                    Object.keys(metaPorEnsayo).forEach((k) => migrarClavesMetaObjeto(metaPorEnsayo[k]));
                    const activo = o.activo || ensayoDesdeFormulario() || 'Ensayo 1';
                    cargarMetaDeEnsayo(activo);
                    return true;
                }
                // Compatibilidad con formato antiguo (un solo formulario global).
                const legado = {};
                Object.keys(o).forEach((k) => {
                    if (k === 'porEnsayo' || k === 'activo') return;
                    if (o[k] !== undefined && o[k] !== null) legado[k] = o[k];
                });
                migrarClavesMetaObjeto(legado);
                const ensayoLegado = String(legado['visual-meta-muestra'] || legado['meta-muestra'] || legado['visual-rotulo'] || 'Ensayo 1');
                metaPorEnsayo = { [ensayoLegado]: legado };
                cargarMetaDeEnsayo(ensayoLegado);
                return true;
            } catch (e) {
                return false;
            }
        }

        function guardarMetaEnAlmacenamiento() {
            snapshotMetaEnsayoActual();
            const o = {
                activo: metaActivoEnsayo || ensayoDesdeFormulario() || 'Ensayo 1',
                porEnsayo: metaPorEnsayo
            };
            try {
                localStorage.setItem(META_STORAGE_KEY, JSON.stringify(o));
            } catch (e) { /* ignore */ }
            programarGuardadoDraftCompleto();
        }

        let metaSaveTimer = null;
        function programarGuardadoMeta() {
            clearTimeout(metaSaveTimer);
            metaSaveTimer = setTimeout(guardarMetaEnAlmacenamiento, 280);
        }

        function sembrarMetaDemostracionCampoUnaVez() {
            try {
                if (localStorage.getItem(DEMO_META_CAMPO_SEED_KEY)) return;
            } catch (_) {
                return;
            }
            const ensayo = 'Ensayo 1';
            if (!metaPorEnsayo[ensayo]) metaPorEnsayo[ensayo] = {};
            const m = metaPorEnsayo[ensayo];
            const fill = (k, v) => {
                const cur = m[k];
                if (cur !== undefined && cur !== null && String(cur).trim() !== '') return;
                m[k] = v;
            };
            fill('visual-meta-muestra', ensayo);
            fill('visual-rotulo', ensayo);
            fill('visual-num-muestra', '0001');
            fill('visual-responsable', 'Operador demo');
            fill('visual-guia-precosecha', '5 / 12');
            const pad = (n) => String(n).padStart(2, '0');
            const now = new Date();
            fill('visual-hora', `${pad(now.getHours())}:${pad(now.getMinutes())}`);
            fill('visual-meta-fundo', 'LN');
            fill('visual-meta-variedad', 'Júpiter');
            fill('visual-traz-etapa', 'E5');
            fill('visual-traz-campo', 'C1');
            fill('visual-traz-turno', 'T1');
            cargarMetaDeEnsayo(ensayo);
            const g = document.getElementById('visual-guia-acopio');
            const p = document.getElementById('visual-placa-vehiculo');
            if (g && !String(g.value || '').trim()) g.value = '208353';
            if (p && !String(p.value || '').trim()) p.value = '9967-OK';
            persistirLogisticaAcopioDesdeInputs();
            try {
                localStorage.setItem(DEMO_META_CAMPO_SEED_KEY, '1');
            } catch (_) { /* ignore */ }
            programarGuardadoMeta();
            actualizarVistaCompacta();
            actualizarProgresoMeta();
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
            if (campoCompleto('visual-num-muestra')) n++;
            if (campoCompleto('visual-meta-muestra')) n++;
            if (campoCompleto('visual-meta-variedad')) n++;
            if (campoCompleto('visual-trazabilidad')) n++;
            if (campoCompleto('visual-meta-fundo')) n++;
            if (campoCompleto('visual-guia-precosecha')) n++;
            if (campoCompleto('visual-responsable')) n++;
            if (campoCompleto('visual-hora')) n++;
            return n;
        }

        function actualizarProgresoMeta() {
            const done = progresoMetaCompletado();
            const max = 8;
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
                        if (tid === 'visual-rotulo') {
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
            metaForm.addEventListener('input', (e) => {
                actualizarBloqueoTrazabilidadPorFundo();
                sincronizarTrazabilidadCompuesta();
                const muestra = document.getElementById('visual-meta-muestra')?.value?.trim();
                const rotulo = document.getElementById('visual-rotulo');
                if (rotulo && muestra) rotulo.value = muestra;
                // Importante: no cambiar metaActivoEnsayo en vivo cuando se está tocando
                // el selector de muestra. El cambio oficial se maneja en "change"
                // para poder guardar snapshot del ensayo anterior sin arrastrar datos.
                if (e?.target?.id !== 'visual-meta-muestra') {
                    metaActivoEnsayo = ensayoDesdeFormulario();
                }
                programarGuardadoMeta();
                actualizarProgresoMeta();
                actualizarVistaCompacta();
            });
            metaForm.addEventListener('change', () => {
                actualizarBloqueoTrazabilidadPorFundo();
                sincronizarTrazabilidadCompuesta();
                const muestraEl = document.getElementById('visual-meta-muestra');
                const muestra = muestraEl?.value?.trim();
                const rotulo = document.getElementById('visual-rotulo');
                if (rotulo && muestra) {
                    const anterior = metaActivoEnsayo || 'Ensayo 1';
                    if (muestraEl && muestra !== anterior) {
                        snapshotMetaEnsayoActual();
                        if (!metaPorEnsayo[muestra]) {
                            metaPorEnsayo[muestra] = {
                                'visual-meta-muestra': muestra,
                                'visual-rotulo': muestra
                            };
                        }
                        cargarMetaDeEnsayo(muestra);
                    }
                    rotulo.value = muestra;
                    aplicarCambioEnsayoActivo();
                }
                metaActivoEnsayo = ensayoDesdeFormulario();
                programarGuardadoMeta();
                actualizarProgresoMeta();
                actualizarVistaCompacta();
            });
        }

        const metaEnterOrder = [
            'visual-meta-muestra',
            'visual-num-muestra',
            'visual-responsable',
            'visual-guia-precosecha',
            'visual-hora',
            'visual-meta-fundo',
            'visual-traz-etapa',
            'visual-traz-campo',
            'visual-traz-turno',
            'visual-meta-variedad'
        ];
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
            const h = document.getElementById('visual-hora');
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
        const cargoMeta = cargarMetaDesdeAlmacenamiento();
        if (!cargoMeta) {
            metaActivoEnsayo = ensayoDesdeFormulario();
            snapshotMetaEnsayoActual();
        }
        sincronizarTrazabilidadCompuesta();
        actualizarBloqueoTrazabilidadPorFundo();
        const muestraInicial = document.getElementById('visual-meta-muestra')?.value?.trim();
        const rotuloInicial = document.getElementById('visual-rotulo');
        if (rotuloInicial && muestraInicial) rotuloInicial.value = muestraInicial;
        metaActivoEnsayo = muestraInicial || metaActivoEnsayo;
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

        const data = [];

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
        let envioRegistroEnCurso = false;
        let omitirConfirmacionSalida = false;

        function setButtonLoading(btn, loading, loadingText) {
            if (!btn) return;
            if (loading) {
                if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent || '';
                btn.disabled = true;
                btn.classList.add('is-loading');
                btn.textContent = loadingText || 'Procesando...';
                return;
            }
            btn.disabled = false;
            btn.classList.remove('is-loading');
            if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
        }

        function marcarBotonGuardado(btnId) {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            const original = btn.textContent || 'Guardar';
            btn.textContent = 'Guardado';
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = original;
                btn.disabled = false;
            }, 900);
        }

        function obtenerEnsayoActivo() {
            const rotulo = document.getElementById('visual-rotulo')?.value?.trim();
            return rotulo || ensayoActivo || 'Ensayo 1';
        }

        function numeroClamshellPorEnsayo(itemOrId) {
            const item = typeof itemOrId === 'object'
                ? itemOrId
                : data.find((entry) => entry.id === Number(itemOrId));
            if (!item) return Number(itemOrId) || 1;
            const ensayo = String(item.ensayo || 'Ensayo 1');
            const lista = data
                .filter((it) => String(it.ensayo || 'Ensayo 1') === ensayo)
                .slice()
                .sort((a, b) => Number(a.id) - Number(b.id));
            const idx = lista.findIndex((it) => Number(it.id) === Number(item.id));
            return idx >= 0 ? idx + 1 : 1;
        }

        function aplicarCambioEnsayoActivo() {
            ensayoActivo = obtenerEnsayoActivo();
            editingCardId = null;
            metricModalState.itemId = null;
            metricModalState.kind = null;
            observationModalState.itemId = null;
            establecerMenuFlotanteAbierto(false);
            asegurarClamshellInicialVacio(ensayoActivo);
            renderizarTarjetas();
            renderizarPanelLlenadoJarras();
            sincronizarLogisticaAcopioDesdeEnsayo();
            actualizarBloqueoControlesPorPeso1();
        }

        let bloqueoMuestraRefrescando = false;
        let bloqueoMuestraUltimoFetchMs = 0;
        let bloqueoMuestraCacheNums = null;

        function leerCacheRegistradosHoy() {
            try {
                const raw = localStorage.getItem(REGISTRADOS_HOY_CACHE_KEY);
                if (!raw) return null;
                const o = JSON.parse(raw);
                if (!o || o.fecha !== hoyIsoLocal() || !Array.isArray(o.ensayos)) return null;
                return new Set(o.ensayos.map((x) => String(x)));
            } catch (_) {
                return null;
            }
        }

        function guardarCacheRegistradosHoy(setNums) {
            try {
                const ens = [...(setNums || new Set())].map((x) => String(x));
                localStorage.setItem(REGISTRADOS_HOY_CACHE_KEY, JSON.stringify({
                    fecha: hoyIsoLocal(),
                    ensayos: ens
                }));
            } catch (_) { /* ignore */ }
        }

        async function obtenerEnsayosRegistradosHoyServidor(force = false) {
            if (!API_URL || !navigator.onLine) return null;
            const now = Date.now();
            if (!force && bloqueoMuestraCacheNums && (now - bloqueoMuestraUltimoFetchMs) < 5000) {
                return new Set([...bloqueoMuestraCacheNums]);
            }
            try {
                const r = await callbackJsonp(API_URL, { fecha: hoyIsoLocal() });
                if (!r || r.ok !== true || !Array.isArray(r.ensayos)) return null;
                const out = new Set(r.ensayos.map((e) => String(e).trim()).filter(Boolean));
                bloqueoMuestraCacheNums = out;
                bloqueoMuestraUltimoFetchMs = now;
                guardarCacheRegistradosHoy(out);
                return new Set([...out]);
            } catch (_) {
                return null;
            }
        }

        function obtenerEnsayosBloqueadosLocales() {
            const set = new Set();
            try {
                const q = cargarColaSync();
                q.forEach((reg) => {
                    const estado = String(reg?.estado || '');
                    if (estado !== 'pendiente' && estado !== 'bloqueado') return;
                    const en = String(reg?.ensayo_numero || '').trim();
                    if (en) set.add(en);
                });
            } catch (_) { /* ignore */ }
            return set;
        }

        function aplicarBloqueoSelectMuestra(ensayosBloqueadosNums) {
            const sel = document.getElementById('visual-meta-muestra');
            if (!sel) return;
            const bloqueados = ensayosBloqueadosNums || new Set();
            [...sel.options].forEach((op) => {
                const val = String(op.value || '').trim();
                if (!val) return;
                if (!op.dataset.baseLabel) op.dataset.baseLabel = op.textContent || val;
                const num = numeroDesdeEnsayoTexto(val);
                const isBlocked = !!(num && bloqueados.has(String(num)));
                op.disabled = isBlocked;
                op.textContent = isBlocked ? `${op.dataset.baseLabel} (registrado)` : op.dataset.baseLabel;
            });

            const actual = String(sel.value || '').trim();
            const numActual = numeroDesdeEnsayoTexto(actual);
            if (numActual && bloqueados.has(String(numActual))) {
                const libre = [...sel.options].find((o) => String(o.value || '').trim() && !o.disabled);
                if (libre) {
                    sel.value = libre.value;
                    const rotulo = document.getElementById('visual-rotulo');
                    if (rotulo) rotulo.value = libre.value;
                    aplicarCambioEnsayoActivo();
                    metaActivoEnsayo = ensayoDesdeFormulario();
                    programarGuardadoMeta();
                    actualizarProgresoMeta();
                    actualizarVistaCompacta();
                    mostrarToast('info', 'Muestra no disponible', 'Ese ensayo ya está registrado y fue bloqueado.');
                }
            }
        }

        async function refrescarBloqueoMuestrasEnTiempoReal(forceServer = false) {
            if (bloqueoMuestraRefrescando) return;
            bloqueoMuestraRefrescando = true;
            try {
                const bloqueados = obtenerEnsayosBloqueadosLocales();
                const cache = leerCacheRegistradosHoy();
                if (cache) cache.forEach((n) => bloqueados.add(String(n)));
                const server = await obtenerEnsayosRegistradosHoyServidor(forceServer);
                if (server) server.forEach((n) => bloqueados.add(String(n)));
                aplicarBloqueoSelectMuestra(bloqueados);
            } finally {
                bloqueoMuestraRefrescando = false;
            }
        }

        function conteoLlenadoMetrica(item, kind) {
            const m = item?.metric?.[kind];
            if (!m) return { done: 0, total: 0 };
            const vals = Object.values(m);
            const done = vals.filter((v) => String(v ?? '').trim() !== '').length;
            return { done, total: vals.length };
        }

        function obtenerLiderTiempoPorJarra(itemBase) {
            if (!itemBase) return null;
            const ensayo = String(itemBase.ensayo || 'Ensayo 1');
            const jarra = Number(itemBase.jarra);
            if (!Number.isFinite(jarra)) return itemBase;
            const delEnsayoJarra = data
                .filter((it) => String(it.ensayo || 'Ensayo 1') === ensayo && Number(it.jarra) === jarra)
                .slice()
                .sort((a, b) => Number(a.id) - Number(b.id));
            return delEnsayoJarra[0] || itemBase;
        }

        function idLiderTiempoPorJarraEnEnsayo(ensayo) {
            const clave = String(ensayo || 'Ensayo 1');
            const mapa = {};
            data
                .filter((it) => String(it.ensayo || 'Ensayo 1') === clave)
                .slice()
                .sort((a, b) => Number(a.id) - Number(b.id))
                .forEach((it) => {
                    const j = Number(it.jarra);
                    if (!Number.isFinite(j)) return;
                    if (mapa[j] === undefined) mapa[j] = Number(it.id);
                });
            return mapa;
        }

        function sincronizarTiempoPorJarra(ensayo) {
            const clave = String(ensayo || 'Ensayo 1');
            const filasJ = obtenerFilasLlenadoJarras(clave);
            const visuales = data
                .filter((it) => String(it.ensayo || 'Ensayo 1') === clave)
                .slice()
                .sort((a, b) => Number(a.id) - Number(b.id));

            const inicioCosechaPorJarra = new Map();
            filasJ.forEach((f) => {
                if (String(f.tipo || '').trim() !== 'C') return;
                const n = Number(String(f.jarra ?? '').trim());
                const ini = String(f.inicio || '').trim();
                if (!Number.isFinite(n) || n < 1 || !ini) return;
                if (!inicioCosechaPorJarra.has(n)) inicioCosechaPorJarra.set(n, ini);
            });

            const trasvasados = filasJ.filter((f) => String(f.tipo || '').trim() === 'T');
            let terminoUltimoTrasvasadoEnsayo = '';
            let terminoUltimoTrasvasadoMin = -1;
            trasvasados.forEach((f) => {
                const fin = String(f.termino || '').trim();
                if (!fin) return;
                const m = minutosDesdeHora(fin);
                if (m === null) return;
                if (m >= terminoUltimoTrasvasadoMin) {
                    terminoUltimoTrasvasadoMin = m;
                    terminoUltimoTrasvasadoEnsayo = fin;
                }
            });

            const terminoTrasvasadoPorJarra = new Map();
            visuales.forEach((it) => {
                const nJarra = Number(it.jarra);
                if (!Number.isFinite(nJarra) || nJarra < 1) return;
                let mejor = '';
                let mejorMin = -1;
                trasvasados.forEach((f) => {
                    const fin = String(f.termino || '').trim();
                    if (!fin) return;
                    if (!trasladoVisualAplicaJarra(f.jarra, nJarra)) return;
                    const m = minutosDesdeHora(fin);
                    if (m === null) return;
                    if (m >= mejorMin) {
                        mejorMin = m;
                        mejor = fin;
                    }
                });
                if (mejor) terminoTrasvasadoPorJarra.set(nJarra, mejor);
            });

            const llegadaGlobal =
                visuales.map((it) => String(it?.metric?.tiempo?.llegadaAcopio || '').trim()).filter(Boolean).slice(-1)[0] || '';
            const despachoGlobal =
                visuales.map((it) => String(it?.metric?.tiempo?.despachoAcopio || '').trim()).filter(Boolean).slice(-1)[0] || '';

            visuales.forEach((it) => {
                const nJarra = Number(it.jarra);
                it.metric = it.metric || metricaVacia();
                it.metric.tiempo = it.metric.tiempo || {};
                it.metric.tiempo.inicioCosecha = inicioCosechaPorJarra.get(nJarra) || '';
                it.metric.tiempo.inicioPerdida = terminoTrasvasadoPorJarra.get(nJarra) || '';
                // Término de cosecha (métrica): término del ÚLTIMO trasvasado del ensayo (lj-campo-termino más tardío entre todas las filas T), igual en todos los clamshells.
                it.metric.tiempo.terminoCosecha = terminoUltimoTrasvasadoEnsayo || '';
                it.metric.tiempo.llegadaAcopio = llegadaGlobal;
                it.metric.tiempo.despachoAcopio = despachoGlobal;
            });
        }

        function validarSecuenciaTiempoMetrica(t) {
            const inicioCosecha = String(t?.inicioCosecha || '').trim();
            const inicioPerdida = String(t?.inicioPerdida || '').trim();
            const terminoCosecha = String(t?.terminoCosecha || '').trim();
            const llegadaAcopio = String(t?.llegadaAcopio || '').trim();
            const despachoAcopio = String(t?.despachoAcopio || '').trim();
            const errores = [];
            if (inicioCosecha && inicioPerdida && horarioFinalMenorQueInicio(inicioCosecha, inicioPerdida)) {
                errores.push('Inicio pérdida de peso debe ser mayor o igual a Inicio de cosecha.');
            }
            if (inicioPerdida && terminoCosecha && horarioFinalMenorQueInicio(inicioPerdida, terminoCosecha)) {
                errores.push('Término de cosecha debe ser mayor o igual a Inicio pérdida de peso.');
            }
            if (terminoCosecha && llegadaAcopio && horarioFinalMenorQueInicio(terminoCosecha, llegadaAcopio)) {
                errores.push('Llegada acopio-campo debe ser mayor o igual a Término de cosecha.');
            }
            if (llegadaAcopio && despachoAcopio && horarioFinalMenorQueInicio(llegadaAcopio, despachoAcopio)) {
                errores.push('Despacho acopio-campo debe ser mayor o igual a Llegada acopio-campo.');
            }
            return errores;
        }

        function obtenerTiempoDesdeModalMetrica() {
            const read = (k) => document.querySelector(`#metric-modal-body [data-metric="${k}"]`)?.value || '';
            return {
                inicioCosecha: read('inicioCosecha'),
                inicioPerdida: read('inicioPerdida'),
                terminoCosecha: read('terminoCosecha'),
                llegadaAcopio: read('llegadaAcopio'),
                despachoAcopio: read('despachoAcopio')
            };
        }

        function validarTiempoModalEnVivo() {
            const alertEl = document.getElementById('visual-tiempo-alert');
            const tiempo = obtenerTiempoDesdeModalMetrica();
            const errores = validarSecuenciaTiempoMetrica(tiempo);
            if (alertEl) {
                if (errores.length) {
                    alertEl.textContent = errores[0];
                    alertEl.style.display = 'block';
                } else {
                    alertEl.textContent = '';
                    alertEl.style.display = 'none';
                }
            }
            return errores;
        }

        function conteoLlenadoPresion(item, tipo) {
            const t = item?.metric?.temperatura || {};
            const campos = tipo === 'ambiente'
                ? ['presionAmbienteInicio', 'presionAmbienteTermino', 'presionAmbienteLlegada', 'presionAmbienteDespacho']
                : ['presionFrutaInicio', 'presionFrutaTermino', 'presionFrutaLlegada', 'presionFrutaDespacho'];
            const done = campos.filter((c) => String(t[c] ?? '').trim() !== '').length;
            return { done, total: 4 };
        }

        function contarTarjetasConMedicionesPendientes() {
            const ensayo = obtenerEnsayoActivo();
            let n = 0;
            data.forEach((item) => {
                if (String(item.ensayo || 'Ensayo 1') !== ensayo) return;
                const t = conteoLlenadoMetrica(item, 'tiempo');
                const h = conteoLlenadoMetrica(item, 'humedad');
                const temp = conteoLlenadoMetrica(item, 'temperatura');
                const pA = conteoLlenadoPresion(item, 'ambiente');
                const pF = conteoLlenadoPresion(item, 'fruta');
                const incompleto = (t.total > 0 && t.done < t.total)
                    || (h.total > 0 && h.done < h.total)
                    || (temp.total > 0 && temp.done < temp.total)
                    || pA.done < pA.total
                    || pF.done < pF.total;
                if (incompleto) n++;
            });
            return n;
        }

        function actualizarHeaderPendientesUI() {
            const el = document.getElementById('header-pendientes-count');
            if (!el) return;
            const n = Math.min(99, pendingsSyncCount());
            el.textContent = String(n).padStart(2, '0');
            el.classList.toggle('header-status-pend-num--alert', n > 0);
        }

        function actualizarHeaderConexionUI() {
            const card = document.getElementById('header-status-card');
            const label = document.getElementById('header-conn-label');
            const wifi = document.getElementById('header-status-wifi');
            if (!card || !label) return;
            const online = typeof navigator !== 'undefined' && navigator.onLine;
            card.classList.toggle('is-online', online);
            card.classList.toggle('is-offline', !online);
            label.textContent = online ? 'En línea' : 'Sin conexión';
            if (wifi) {
                wifi.setAttribute('data-lucide', online ? 'wifi' : 'wifi-off');
                actualizarIconos();
            }
        }

        function actualizarBarraHeaderEstado() {
            actualizarHeaderPendientesUI();
            actualizarHeaderConexionUI();
        }

        function actualizarFechaRing() {
            const dayEl = document.getElementById('fecha-ring-day');
            const monthEl = document.getElementById('fecha-ring-month');
            if (!dayEl || !monthEl) return;
            const now = new Date();
            dayEl.textContent = String(now.getDate()).padStart(2, '0');
            const mes = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(now).replace('.', '');
            const anio = now.getFullYear();
            monthEl.textContent = `${mes} ${anio}`.toUpperCase();
        }

        let fechaRingTimer = null;
        function iniciarAutoActualizacionFechaRing() {
            actualizarFechaRing();
            clearInterval(fechaRingTimer);
            // Revalida cada minuto por si cambia el día mientras la app sigue abierta.
            fechaRingTimer = setInterval(actualizarFechaRing, 60000);
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) actualizarFechaRing();
            });
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

        function sincronizarLogisticaAcopioDesdeEnsayo() {
            const ensayo = obtenerEnsayoActivo();
            const meta = obtenerMetaEnsayo(ensayo);
            const g = document.getElementById('visual-guia-acopio');
            const p = document.getElementById('visual-placa-vehiculo');
            if (g) g.value = meta.guiaRemision || '';
            if (p) p.value = meta.placaVehiculo || '';
        }

        function persistirLogisticaAcopioDesdeInputs() {
            const ensayo = obtenerEnsayoActivo();
            const gEl = document.getElementById('visual-guia-acopio');
            const pEl = document.getElementById('visual-placa-vehiculo');
            if (!gEl || !pEl) return;
            const g = String(gEl.value ?? '').trim();
            const pl = String(pEl.value ?? '').trim().toUpperCase();
            ensayoMeta[ensayo] = { placaVehiculo: pl, guiaRemision: g };
            data.forEach((item) => {
                if ((item.ensayo || 'Ensayo 1') === ensayo) {
                    item.placaVehiculo = pl;
                    item.guiaRemision = g;
                }
            });
            programarGuardadoDraftCompleto();
        }

        (function initLogisticaAcopioRapida() {
            const g = document.getElementById('visual-guia-acopio');
            const p = document.getElementById('visual-placa-vehiculo');
            if (!g || !p) return;
            g.addEventListener('input', () => persistirLogisticaAcopioDesdeInputs());
            p.addEventListener('input', () => {
                p.value = p.value.toUpperCase();
                persistirLogisticaAcopioDesdeInputs();
            });
        }());

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
            sincronizarTiempoPorJarra(ensayoTrabajo);
            const dataEnsayo = data.filter((item) => String(item.ensayo || 'Ensayo 1') === ensayoTrabajo);
            const lideresTiempo = idLiderTiempoPorJarraEnEnsayo(ensayoTrabajo);
            dataEnsayo.forEach(item => {
                const nroClamshell = numeroClamshellPorEnsayo(item);
                const jarraNum = Number(item.jarra);
                const idLider = Number.isFinite(jarraNum) ? lideresTiempo[jarraNum] : Number(item.id);
                const itemLider = data.find((entry) => Number(entry.id) === Number(idLider)) || item;
                const esLiderTiempo = Number(item.id) === Number(idLider);
                const tCount = conteoLlenadoMetrica(itemLider, 'tiempo');
                const pAmbCount = conteoLlenadoPresion(item, 'ambiente');
                const pFrutaCount = conteoLlenadoPresion(item, 'fruta');
                const card = document.createElement('div');
                card.className = 'clamshell-card';
                card.onclick = () => abrirModal(`Editar Clamshell #${nroClamshell}`, item);
                const obs = String(item.observacion || '').trim();
                card.innerHTML = `
                    <div class="card-header">
                        <div class="id-badge">
                            <div class="number-box">${nroClamshell}</div>
                            <div>
                                <p style="font-size: 14px; font-weight: 800;">Clamshell</p>
                                <span style="font-size: 11px; color: #64748B;">${descripcionMuestraConNumero(item.ensayo || 'Ensayo 1')}</span>
                            </div>
                        </div>
                        <div class="clamshell-header-actions">
                            <div class="jarra-tag">Jarra ${item.jarra}</div>
                            <button type="button" class="clamshell-delete-btn" title="Eliminar clamshell" aria-label="Eliminar clamshell" onclick="eliminarClamshell(event, ${item.id})">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
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
                                <button class="metric-btn ${esLiderTiempo ? '' : 'is-mirrored-time'}" type="button" title="${esLiderTiempo ? 'Tiempos de la muestra (hora)' : 'Tiempo compartido por jarra (abre el clamshell líder)'}" onclick="abrirModalMetrica(event, 'tiempo', ${item.id})">
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
            actualizarBloqueoControlesPorPeso1();
        }

        function asegurarClamshellInicialVacio(ensayo) {
            const clave = String(ensayo || 'Ensayo 1');
            const existe = data.some((it) => String(it?.ensayo || 'Ensayo 1') === clave);
            if (existe) return;
            const nuevoId = (data.length ? Math.max(...data.map((d) => Number(d.id) || 0)) : 0) + 1;
            data.push({
                id: nuevoId,
                jarra: 1,
                ensayo: clave,
                p1: 0,
                p2: 0,
                acopio: 0,
                despacho: 0,
                observacion: '',
                placaVehiculo: '',
                guiaRemision: '',
                metric: metricaVacia()
            });
        }

        function actualizarBloqueoControlesPorPeso1() {
            const habilitado = true;
            const controlBar = document.querySelector('.control-equitativo-bar');
            if (controlBar) {
                controlBar.classList.toggle('is-locked', !habilitado);
                controlBar.querySelectorAll('.control-equitativo-btn').forEach((btn) => {
                    btn.disabled = !habilitado;
                    btn.setAttribute('aria-disabled', (!habilitado).toString());
                    btn.title = habilitado ? (btn.getAttribute('title') || '') : 'Primero registra Peso 1 en un clamshell';
                });
            }
            const logisticaBlock = document.querySelector('.logistica-acopio-block');
            const logisticaHead = document.querySelector('.logistica-acopio-head');
            if (logisticaBlock) logisticaBlock.classList.toggle('is-locked', !habilitado);
            if (logisticaHead) logisticaHead.setAttribute('data-locked', habilitado ? '0' : '1');
        }

        async function eliminarClamshell(event, itemId) {
            if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
            const item = data.find((entry) => Number(entry.id) === Number(itemId));
            if (!item) return;
            const nroClamshell = numeroClamshellPorEnsayo(item);
            const mensaje = `Se eliminará Clamshell #${nroClamshell} (Jarra ${item.jarra}) del ${item.ensayo || 'Ensayo 1'}. ¿Deseas continuar?`;
            let confirmado = false;
            if (window.Swal && typeof window.Swal.fire === 'function') {
                const resp = await swalFireSafe({
                    icon: 'warning',
                    title: 'Confirmar eliminación',
                    text: mensaje,
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'No'
                });
                confirmado = !!resp.isConfirmed;
            } else {
                confirmado = window.confirm(mensaje);
            }
            if (!confirmado) return;
            const idx = data.findIndex((entry) => Number(entry.id) === Number(itemId));
            if (idx < 0) return;
            data.splice(idx, 1);
            if (editingCardId === Number(itemId)) editingCardId = null;
            renderizarTarjetas();
            programarGuardadoDraftCompleto();
        }

        function normalizarValorControlGlobal(raw) {
            let v = String(raw ?? '').replace(',', '.').replace(/[^\d.]/g, '');
            const firstDot = v.indexOf('.');
            if (firstDot >= 0) {
                v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
            }
            if (v.includes('.')) {
                const [entero, decimal = ''] = v.split('.');
                v = `${entero.slice(0, 2)}.${decimal.slice(0, 1)}`;
            } else if (v.length >= 2) {
                v = `${v.slice(0, 2)}.${v.slice(2, 3)}`;
            }
            return v.slice(0, 4);
        }

        function formatearInputControlGlobal(input) {
            if (!input) return;
            const normalizado = normalizarValorControlGlobal(input.value);
            if (input.value !== normalizado) input.value = normalizado;
        }

        function abrirModalControlGlobal(tipo) {
            controlGlobalState.tipo = tipo;
            const body = document.getElementById('control-global-modal-body');
            const titulo = document.getElementById('control-global-modal-title');

            if (tipo === 'temperatura') {
                const muestra = data[0]?.metric?.temperatura || {};
                titulo.textContent = 'Control equitativo · Temperatura ambiente y pulpa (todos)';
                body.innerHTML = `
                    <p class="metric-mini-title">Temperatura ambiente (°C)</p>
                    <div class="metric-grid-4">
                        <div class="form-group"><label>Inicio</label><input type="text" inputmode="decimal" maxlength="4" id="visual-temp-amb-inicio" value="${muestra.inicioAmbiente || ''}"></div>
                        <div class="form-group"><label>Término</label><input type="text" inputmode="decimal" maxlength="4" id="visual-temp-amb-termino" value="${muestra.terminoAmbiente || ''}"></div>
                        <div class="form-group"><label>Llegada</label><input type="text" inputmode="decimal" maxlength="4" id="visual-temp-amb-llegada" value="${muestra.llegadaAmbiente || ''}"></div>
                        <div class="form-group"><label>Despacho</label><input type="text" inputmode="decimal" maxlength="4" id="visual-temp-amb-despacho" value="${muestra.despachoAmbiente || ''}"></div>
                    </div>
                    <p class="metric-mini-title">Temperatura pulpa (°C)</p>
                    <div class="metric-grid-4">
                        <div class="form-group"><label>Inicio</label><input type="text" inputmode="decimal" maxlength="4" id="visual-temp-pulpa-inicio" value="${muestra.inicioPulpa || ''}"></div>
                        <div class="form-group"><label>Término</label><input type="text" inputmode="decimal" maxlength="4" id="visual-temp-pulpa-termino" value="${muestra.terminoPulpa || ''}"></div>
                        <div class="form-group"><label>Llegada</label><input type="text" inputmode="decimal" maxlength="4" id="visual-temp-pulpa-llegada" value="${muestra.llegadaPulpa || ''}"></div>
                        <div class="form-group"><label>Despacho</label><input type="text" inputmode="decimal" maxlength="4" id="visual-temp-pulpa-despacho" value="${muestra.despachoPulpa || ''}"></div>
                    </div>
                `;
            } else {
                const muestra = data[0]?.metric?.humedad || {};
                titulo.textContent = 'Control equitativo · Humedad (todos)';
                body.innerHTML = `
                    <div class="metric-grid-4">
                        <div class="form-group"><label>Inicio</label><input type="text" inputmode="decimal" maxlength="4" id="visual-cg-humedad-inicio" value="${muestra.inicio || ''}"></div>
                        <div class="form-group"><label>Término</label><input type="text" inputmode="decimal" maxlength="4" id="visual-cg-humedad-termino" value="${muestra.termino || ''}"></div>
                        <div class="form-group"><label>Llegada</label><input type="text" inputmode="decimal" maxlength="4" id="visual-cg-humedad-llegada" value="${muestra.llegada || ''}"></div>
                        <div class="form-group"><label>Despacho</label><input type="text" inputmode="decimal" maxlength="4" id="visual-cg-humedad-despacho" value="${muestra.despacho || ''}"></div>
                    </div>
                `;
            }

            body.querySelectorAll('input').forEach((input) => {
                formatearInputControlGlobal(input);
                input.addEventListener('input', () => {
                    formatearInputControlGlobal(input);
                    aplicarControlGlobalDesdeFormulario(false);
                });
                input.addEventListener('change', () => {
                    formatearInputControlGlobal(input);
                    aplicarControlGlobalDesdeFormulario(false);
                });
            });
            document.getElementById('control-global-modal-overlay').style.display = 'flex';
        }

        function cerrarModalControlGlobal() {
            document.getElementById('control-global-modal-overlay').style.display = 'none';
            const cgBody = document.getElementById('control-global-modal-body');
            if (cgBody) cgBody.innerHTML = '';
        }

        function numeroSeguro(valor) {
            const n = Number(valor);
            return Number.isFinite(n) ? n : null;
        }

        function calcularPresionVaporAmbienteAshrae(tempC, humedadRelativa) {
            const t = numeroSeguro(tempC);
            const hr = numeroSeguro(humedadRelativa);
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
            const t = numeroSeguro(tempPulpaC);
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

        const CAMPOS_PRESION_VAPOR = [
            'presionAmbienteInicio', 'presionAmbienteTermino', 'presionAmbienteLlegada', 'presionAmbienteDespacho',
            'presionFrutaInicio', 'presionFrutaTermino', 'presionFrutaLlegada', 'presionFrutaDespacho'
        ];

        function clamshellsEnsayoOrdenados(ensayo) {
            const clave = String(ensayo || 'Ensayo 1');
            return data
                .filter((it) => String(it.ensayo || 'Ensayo 1') === clave)
                .slice()
                .sort((a, b) => Number(a.id) - Number(b.id));
        }

        function copiarPresionesVaporDesde(primer, destino) {
            if (!primer || !destino) return;
            if (!destino.metric) destino.metric = metricaVacia();
            if (!destino.metric.temperatura) destino.metric.temperatura = metricaVacia().temperatura;
            const taP = primer.metric?.temperatura || {};
            const taD = destino.metric.temperatura;
            CAMPOS_PRESION_VAPOR.forEach((k) => {
                taD[k] = taP[k] ?? '';
            });
        }

        /** Presión ambiente y pulpa: se calculan solo con el Clamshell #1 del ensayo y se reflejan en todos los demás. */
        function recalcularPresionesParaTodos() {
            const ensayos = [...new Set(data.map((it) => String(it.ensayo || 'Ensayo 1')))];
            ensayos.forEach((ensayo) => {
                const lista = clamshellsEnsayoOrdenados(ensayo);
                if (!lista.length) return;
                const primer = lista[0];
                if (!primer.metric) primer.metric = metricaVacia();
                if (!primer.metric.temperatura) primer.metric.temperatura = metricaVacia().temperatura;
                if (!primer.metric.humedad) primer.metric.humedad = metricaVacia().humedad;

                const ta = primer.metric.temperatura;
                const h = primer.metric.humedad;
                ta.presionAmbienteInicio = calcularPresionVaporAmbienteAshrae(ta.inicioAmbiente, h.inicio);
                ta.presionAmbienteTermino = calcularPresionVaporAmbienteAshrae(ta.terminoAmbiente, h.termino);
                ta.presionAmbienteLlegada = calcularPresionVaporAmbienteAshrae(ta.llegadaAmbiente, h.llegada);
                ta.presionAmbienteDespacho = calcularPresionVaporAmbienteAshrae(ta.despachoAmbiente, h.despacho);
                ta.presionFrutaInicio = calcularPresionVaporPulpaAshrae(ta.inicioPulpa);
                ta.presionFrutaTermino = calcularPresionVaporPulpaAshrae(ta.terminoPulpa);
                ta.presionFrutaLlegada = calcularPresionVaporPulpaAshrae(ta.llegadaPulpa);
                ta.presionFrutaDespacho = calcularPresionVaporPulpaAshrae(ta.despachoPulpa);

                for (let i = 1; i < lista.length; i++) {
                    copiarPresionesVaporDesde(primer, lista[i]);
                }
            });
        }

        function aplicarControlGlobalDesdeFormulario(cerrarAlFinal = false) {
            if (controlGlobalState.tipo === 'temperatura') {
                const ambInicio = document.getElementById('visual-temp-amb-inicio')?.value ?? '';
                const ambTermino = document.getElementById('visual-temp-amb-termino')?.value ?? '';
                const ambLlegada = document.getElementById('visual-temp-amb-llegada')?.value ?? '';
                const ambDespacho = document.getElementById('visual-temp-amb-despacho')?.value ?? '';
                const pulpaInicio = document.getElementById('visual-temp-pulpa-inicio')?.value ?? '';
                const pulpaTermino = document.getElementById('visual-temp-pulpa-termino')?.value ?? '';
                const pulpaLlegada = document.getElementById('visual-temp-pulpa-llegada')?.value ?? '';
                const pulpaDespacho = document.getElementById('visual-temp-pulpa-despacho')?.value ?? '';
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
                const hInicio = document.getElementById('visual-cg-humedad-inicio')?.value ?? '';
                const hTermino = document.getElementById('visual-cg-humedad-termino')?.value ?? '';
                const hLlegada = document.getElementById('visual-cg-humedad-llegada')?.value ?? '';
                const hDesp = document.getElementById('visual-cg-humedad-despacho')?.value ?? '';
                data.forEach((item) => {
                    if (!item.metric) item.metric = metricaVacia();
                    if (!item.metric.humedad) item.metric.humedad = metricaVacia().humedad;
                    item.metric.humedad.inicio = hInicio;
                    item.metric.humedad.termino = hTermino;
                    item.metric.humedad.llegada = hLlegada;
                    item.metric.humedad.despacho = hDesp;
                });
            }

            recalcularPresionesParaTodos();
            renderizarTarjetas();
            if (cerrarAlFinal) cerrarModalControlGlobal();
        }

        function guardarModalControlGlobal() {
            if (!data.length) {
                mostrarAlertaRegla('Sin clamshell', 'Agrega al menos un clamshell para aplicar control global.');
                return;
            }
            aplicarControlGlobalDesdeFormulario(true);
            programarGuardadoDraftCompleto();
            marcarBotonGuardado('btn-save-control-global');
            mostrarToast('success', 'Guardado', 'Control global aplicado y capturado.');
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
                const filasHtml = ordenadas.map((fila, pos) => {
                    const indiceReal = buscarIndiceFilaJarrasPorId(ensayo, fila.id);
                    const tiempo = calcularTiempoEmpleado(fila.inicio, fila.termino) || fila.tiempo || "0'";
                    const tiempoLegible = `${String(tiempo).replace("'", '').trim() || '0'} mnts`;
                    const jarraVisual = String(fila.jarra || '1').trim() || '1';
                    const err = indiceReal >= 0 ? validarOrdenCosechaTrasladoFila(ensayo, fila, indiceReal) : '';
                    const filaErrClass = err ? ' lj-fila--alerta' : '';
                    return `
                        <article class="lj-fila-card${filaErrClass}" onclick="abrirModalHorasLlenado('${ensayo}', ${fila.id})">
                            <div class="lj-fila-left">
                                <select id="visual-m-jarra-${slugIdSeguro(ensayo)}-${fila.id}" data-link-master="visual-m-jarra" class="lj-campo-jarra lj-campo-jarra-selector" onchange="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'jarra', this.value)" onclick="event.stopPropagation()">
                                    ${construirOpcionesJarraSegunTipo(ensayo, fila, indiceReal)}
                                </select>
                                <div class="lj-fila-jarra-num">${jarraVisual}</div>
                                <div class="lj-fila-tiempo-label">T. Empleado: ${tiempoLegible}</div>
                            </div>
                            <div class="lj-fila-right">
                                <div class="lj-fila-top">
                                    <div class="lj-fila-hint">Trasvasado u otra observación</div>
                                    <div class="lj-fila-actions">
                                        ${pos === 0 ? '' : `
                                        <button type="button" class="lj-mini-btn lj-mini-btn--danger lj-mini-btn--delete" title="Eliminar fila" aria-label="Eliminar fila" onclick="event.stopPropagation(); eliminarFilaLlenadoJarras('${ensayo}', ${fila.id})">
                                            <i data-lucide="trash-2"></i>
                                        </button>`}
                                    </div>
                                </div>
                                <select class="lj-campo-tipo" onchange="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'tipo', this.value)" onclick="event.stopPropagation()">
                                    ${construirOpcionesTipo(ensayo, fila, indiceReal)}
                                </select>
                                <div class="lj-fila-horas">
                                    <div class="lj-time-col">
                                        <label class="lj-time-label">Inicio</label>
                                        <div class="lj-time-field" onclick="event.stopPropagation()">
                                            <input class="lj-campo-inicio" id="lj-inicio-${slugIdSeguro(ensayo)}-${fila.id}" type="time" value="${fila.inicio}" onchange="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'inicio', this.value)" oninput="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'inicio', this.value)">
                                        </div>
                                    </div>
                                    <div class="lj-time-col">
                                        <label class="lj-time-label">Final</label>
                                        <div class="lj-time-field" onclick="event.stopPropagation()">
                                            <input class="lj-campo-termino" id="lj-termino-${slugIdSeguro(ensayo)}-${fila.id}" type="time" value="${fila.termino}" onchange="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'termino', this.value)" oninput="actualizarFilaLlenadoJarras('${ensayo}', ${fila.id}, 'termino', this.value)">
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
            const mensaje = eliminaRelacionados
                ? `Se va a eliminar Jarra ${txt} y su trasvasado relacionado. ¿Deseas continuar?`
                : '¿Estás seguro de eliminar este registro?';
            let confirmado = false;
            if (window.Swal && typeof window.Swal.fire === 'function') {
                const resp = await swalFireSafe({
                    icon: 'warning',
                    title: 'Confirmar eliminación',
                    text: mensaje,
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'No'
                });
                confirmado = !!resp.isConfirmed;
            } else {
                confirmado = window.confirm(mensaje);
            }
            if (!confirmado) return;

            for (let i = filas.length - 1; i >= 0; i--) {
                if (idsEliminar.has(Number(filas[i].id))) filas.splice(i, 1);
            }

            sincronizarInicioCosechaDesdeAnterior(ensayo);
            sincronizarInicioTrasvasadoDesdeCosecha(ensayo);
            renderizarPanelLlenadoJarras();
            sincronizarTiempoPorJarra(ensayo);
            renderizarTarjetas();
            programarGuardadoDraftCompleto();
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
            programarGuardadoDraftCompleto();
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
            sincronizarTiempoPorJarra(clave);
            renderizarTarjetas();
            programarGuardadoDraftCompleto();
        }

        function abrirModalHorasLlenado(ensayo, idFila) {
            const filas = obtenerFilasLlenadoJarras(ensayo);
            const fila = filas.find((f) => Number(f.id) === Number(idFila));
            if (!fila) return;
            horasLlenadoModalState.ensayo = ensayo;
            horasLlenadoModalState.idFila = idFila;
            document.getElementById('visual-lhm-inicio').value = fila.inicio || '';
            document.getElementById('visual-lhm-termino').value = fila.termino || '';
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
            const inicioVal = document.getElementById('visual-lhm-inicio').value || '';
            const terminoVal = document.getElementById('visual-lhm-termino').value || '';
            if (inicioVal && terminoVal && horarioFinalMenorQueInicio(inicioVal, terminoVal)) {
                mostrarAlertaRegla('Horario inválido', 'La hora final no puede ser menor que la hora de inicio.');
                return;
            }
            fila.inicio = inicioVal;
            fila.termino = terminoVal;
            fila.tiempo = calcularTiempoEmpleado(fila.inicio, fila.termino);
            cerrarModalHorasLlenado();
            renderizarPanelLlenadoJarras();
            sincronizarTiempoPorJarra(ensayo);
            renderizarTarjetas();
            programarGuardadoDraftCompleto();
            marcarBotonGuardado('btn-save-horas');
            mostrarToast('success', 'Guardado', 'Horas de llenado guardadas.');
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

        function hoyIsoLocal() {
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }

        function numeroDesdeEnsayoTexto(ensayoTxt) {
            const txt = String(ensayoTxt || '').trim();
            const m = txt.match(/\d+/);
            return m ? m[0] : '';
        }

        function strOrEmpty(v) {
            if (v === null || v === undefined) return '';
            return String(v).trim();
        }

        function construirFilaBaseRegistro(item, idx, totalItemsEnLote) {
            const ensayoNombre = strOrEmpty(item?.ensayo || obtenerEnsayoActivo() || 'Ensayo 1');
            const ensayoNumero = numeroDesdeEnsayoTexto(ensayoNombre);
            const meta = metaPorEnsayo[ensayoNombre] || {};
            const m = item?.metric || metricaVacia();
            const t = m.tiempo || {};
            const temp = m.temperatura || {};
            const hum = m.humedad || {};
            const baseNum = strOrEmpty(meta['visual-num-muestra']);
            // Guardar NUM_MUESTRA exactamente como lo escribe el usuario (sin sufijos automáticos).
            const numMuestraUnica = baseNum ? String(baseNum).trim() : '';

            return [
                // Hoja 1: mismo orden que el formulario; NUM_MUESTRA única por fila.
                hoyIsoLocal(), // FECHA
                strOrEmpty(ensayoNombre), // ENSAYO_NOMBRE (Muestra)
                numMuestraUnica, // NUM_MUESTRA
                strOrEmpty(meta['visual-responsable']), // RESPONSABLE
                strOrEmpty(meta['visual-guia-precosecha']), // DIAS_PRECOSECHA
                strOrEmpty(meta['visual-hora']), // HORA_INICIO_GENERAL
                strOrEmpty(meta['visual-meta-fundo'] || meta['meta-fundo']), // FUNDO
                strOrEmpty(meta['visual-traz-etapa'] || meta['meta-traz-etapa']), // TRAZ_ETAPA
                strOrEmpty(meta['visual-traz-campo'] || meta['meta-traz-campo']), // TRAZ_CAMPO
                strOrEmpty(meta['visual-traz-turno']), // TRAZ_LIBRE
                strOrEmpty(meta['visual-meta-variedad'] || meta['meta-variedad']), // VARIEDAD
                strOrEmpty(item?.guiaRemision || document.getElementById('visual-guia-acopio')?.value), // GUIA_REMISION
                strOrEmpty(item?.placaVehiculo || document.getElementById('visual-placa-vehiculo')?.value).toUpperCase(), // PLACA_VEHICULO
                ensayoNumero, // ENSAYO_NUMERO
                String(idx + 1), // N_CLAMSHELL
                strOrEmpty(item?.jarra), // N_JARRA
                strOrEmpty(item?.p1), // PESO_1
                strOrEmpty(item?.p2), // PESO_2
                strOrEmpty(item?.acopio), // LLEGADA_ACOPIO
                strOrEmpty(item?.despacho), // DESPACHO_ACOPIO
                // 21..28 (temperatura)
                strOrEmpty(temp.inicioAmbiente), // TEMP_MUE_INICIO_AMB
                strOrEmpty(temp.inicioPulpa), // TEMP_MUE_INICIO_PUL
                strOrEmpty(temp.terminoAmbiente), // TEMP_MUE_TERMINO_AMB
                strOrEmpty(temp.terminoPulpa), // TEMP_MUE_TERMINO_PUL
                strOrEmpty(temp.llegadaAmbiente), // TEMP_MUE_LLEGADA_AMB
                strOrEmpty(temp.llegadaPulpa), // TEMP_MUE_LLEGADA_PUL
                strOrEmpty(temp.despachoAmbiente), // TEMP_MUE_DESPACHO_AMB
                strOrEmpty(temp.despachoPulpa), // TEMP_MUE_DESPACHO_PUL
                // 29..33 (tiempos)
                strOrEmpty(t.inicioCosecha), // TIEMPO_INICIO_COSECHA
                strOrEmpty(t.inicioPerdida), // TIEMPO_PERDIDA_PESO
                strOrEmpty(t.terminoCosecha), // TIEMPO_TERMINO_COSECHA
                strOrEmpty(t.llegadaAcopio), // TIEMPO_LLEGADA_ACOPIO
                strOrEmpty(t.despachoAcopio), // TIEMPO_DESPACHO_ACOPIO
                // 34..37 (humedad)
                strOrEmpty(hum.inicio), // HUMEDAD_INICIO
                strOrEmpty(hum.termino), // HUMEDAD_TERMINO
                strOrEmpty(hum.llegada), // HUMEDAD_LLEGADA
                strOrEmpty(hum.despacho), // HUMEDAD_DESPACHO
                // 38..41 (presion ambiente)
                strOrEmpty(temp.presionAmbienteInicio), // PRESION_AMB_INICIO
                strOrEmpty(temp.presionAmbienteTermino), // PRESION_AMB_TERMINO
                strOrEmpty(temp.presionAmbienteLlegada), // PRESION_AMB_LLEGADA
                strOrEmpty(temp.presionAmbienteDespacho), // PRESION_AMB_DESPACHO
                // 42..45 (presion fruta)
                strOrEmpty(temp.presionFrutaInicio), // PRESION_FRUTA_INICIO
                strOrEmpty(temp.presionFrutaTermino), // PRESION_FRUTA_TERMINO
                strOrEmpty(temp.presionFrutaLlegada), // PRESION_FRUTA_LLEGADA
                strOrEmpty(temp.presionFrutaDespacho), // PRESION_FRUTA_DESPACHO
                strOrEmpty(item?.observacion) // OBSERVACION
            ];
        }

        /**
         * Hoja 2: INICIO_C/TERMINO_C/MIN_C = fila Cosecha de esa jarra; INICIO_T/TERMINO_T/MIN_T = fila Trasvasado (mismo concepto).
         * Se envían en el hueco 20-25 de una fila de 52 (el servidor hace toRowRegistro y copia a Hoja 2).
         */
        function minutosDiferenciaHorasHoja2(horaIni, horaFin) {
            if (!horaIni || !horaFin) return '';
            const [hIni, mIni] = String(horaIni).split(':').map(Number);
            const [hFin, mFin] = String(horaFin).split(':').map(Number);
            if ([hIni, mIni, hFin, mFin].some((x) => Number.isNaN(x))) return '';
            let minutosInicio = hIni * 60 + mIni;
            let minutosTermino = hFin * 60 + mFin;
            if (minutosTermino < minutosInicio) minutosTermino += 24 * 60;
            return String(minutosTermino - minutosInicio);
        }

        function seisCeldasHoja2DesdeLlenadoJarras(ensayo, nJarra) {
            const n = Number(nJarra);
            if (!Number.isFinite(n) || n < 1) return ['', '', '', '', '', ''];
            const clave = String(ensayo || 'Ensayo 1');
            const c = filaCosechaParaJarra(clave, n, -1);
            const t = filaTrasladoQueAplicaAJarra(clave, n, -1);
            const inicioC = c ? String(c.inicio || '').trim() : '';
            const terminoC = c ? String(c.termino || '').trim() : '';
            const inicioT = t ? String(t.inicio || '').trim() : '';
            const terminoT = t ? String(t.termino || '').trim() : '';
            return [
                inicioC,
                terminoC,
                minutosDiferenciaHorasHoja2(inicioC, terminoC),
                inicioT,
                terminoT,
                minutosDiferenciaHorasHoja2(inicioT, terminoT)
            ];
        }

        /** 52 celdas: 20 + hueco Hoja2 (6) + 26 = misma convención que code.gs toRowRegistro. */
        function construirFilaPost52ConHoja2(item, idx, totalEnLote) {
            const f46 = construirFilaBaseRegistro(item, idx, totalEnLote);
            const h6 = seisCeldasHoja2DesdeLlenadoJarras(String(item.ensayo || 'Ensayo 1'), item?.jarra);
            return f46.slice(0, 20).concat(h6, f46.slice(20, 46));
        }

        // Avance etapa 1: filas para POST (52 cols con tiempos Hoja 2 desde panel jarras, no desde métricas de fila).
        function construirRowsRegistroBasePorEnsayo(ensayoObjetivo) {
            const ensayo = String(ensayoObjetivo || obtenerEnsayoActivo() || 'Ensayo 1');
            const items = data
                .filter((it) => String(it.ensayo || 'Ensayo 1') === String(ensayo))
                .slice()
                .sort((a, b) => Number(a.id) - Number(b.id));
            const n = items.length;
            return items.map((item, idx) => construirFilaPost52ConHoja2(item, idx, n));
        }
        function construirRowsRegistroBase() {
            return construirRowsRegistroBasePorEnsayo(obtenerEnsayoActivo());
        }
        window.construirRowsRegistroBase = construirRowsRegistroBase;

        const INPUT_IDS_CRITICOS = [
            'visual-meta-muestra',
            'visual-num-muestra',
            'visual-responsable',
            'visual-guia-precosecha',
            'visual-hora',
            'visual-meta-fundo',
            'visual-traz-etapa',
            'visual-traz-campo',
            'visual-traz-turno',
            'visual-meta-variedad',
            'visual-guia-acopio',
            'visual-placa-vehiculo',
            'visual-m-jarra',
            'visual-p1',
            'visual-p2',
            'visual-acopio',
            'visual-despacho',
            'visual-tiempo-1-iniciocosecha-1',
            'visual-tiempo-1-inicioperdida-2',
            'visual-tiempo-1-terminocosecha-3',
            'visual-tiempo-1-terminocosecha-4',
            'visual-tiempo-1-despachoacopio-5',
            'visual-temp-amb-inicio',
            'visual-temp-pulpa-inicio',
            'visual-temp-amb-termino',
            'visual-temp-pulpa-termino',
            'visual-temp-amb-llegada',
            'visual-temp-pulpa-llegada',
            'visual-temp-amb-despacho',
            'visual-temp-pulpa-despacho',
            'visual-cg-humedad-inicio',
            'visual-cg-humedad-termino',
            'visual-cg-humedad-llegada',
            'visual-cg-humedad-despacho',
            'visual-presionambiente-1-presionambienteinicio-1',
            'visual-presionambiente-1-presionambientetermino-2',
            'visual-presionambiente-1-presionambientellegada-3',
            'visual-presionambiente-1-presionambientedespacho-4',
            'visual-presionfruta-1-presionfrutainicio-1',
            'visual-presionfruta-1-presionfrutatermino-2',
            'visual-presionfruta-1-presionfrutallegada-3',
            'visual-presionfruta-1-presionfrutadespacho-4',
            'visual-observation',
            'visual-guia-acopio',
            'visual-placa-vehiculo'
        ];

        const LEGACY_INPUT_IDS = {
            'visual-meta-muestra': ['meta-muestra'],
            'visual-meta-fundo': ['meta-fundo'],
            'visual-meta-variedad': ['meta-variedad'],
            'visual-traz-etapa': ['meta-traz-etapa'],
            'visual-traz-campo': ['meta-traz-campo'],
            'visual-m-jarra': ['m-jarra'],
            'visual-tiempo-1-iniciocosecha-1': ['metric-tiempo-1-iniciocosecha-1'],
            'visual-tiempo-1-inicioperdida-2': ['metric-tiempo-1-inicioperdida-2'],
            'visual-tiempo-1-terminocosecha-3': ['metric-tiempo-1-terminocosecha-3'],
            'visual-tiempo-1-terminocosecha-4': ['metric-tiempo-1-terminocosecha-4'],
            'visual-tiempo-1-despachoacopio-5': ['metric-tiempo-1-despachoacopio-5'],
            'visual-temp-amb-inicio': ['cg-temp-amb-inicio'],
            'visual-temp-pulpa-inicio': ['cg-temp-pulpa-inicio'],
            'visual-temp-amb-termino': ['cg-temp-amb-termino'],
            'visual-temp-pulpa-termino': ['cg-temp-pulpa-termino'],
            'visual-temp-amb-llegada': ['cg-temp-amb-llegada'],
            'visual-temp-pulpa-llegada': ['cg-temp-pulpa-llegada'],
            'visual-temp-amb-despacho': ['cg-temp-amb-despacho'],
            'visual-temp-pulpa-despacho': ['cg-temp-pulpa-despacho'],
            'visual-cg-humedad-inicio': ['cg-humedad-inicio'],
            'visual-cg-humedad-termino': ['cg-humedad-termino'],
            'visual-cg-humedad-llegada': ['cg-humedad-llegada'],
            'visual-cg-humedad-despacho': ['cg-humedad-despacho'],
            'visual-presionambiente-1-presionambienteinicio-1': ['metric-presionambiente-1-presionambienteinicio-1'],
            'visual-presionambiente-1-presionambientetermino-2': ['metric-presionambiente-1-presionambientetermino-2'],
            'visual-presionambiente-1-presionambientellegada-3': ['metric-presionambiente-1-presionambientellegada-3'],
            'visual-presionambiente-1-presionambientedespacho-4': ['metric-presionambiente-1-presionambientedespacho-4'],
            'visual-presionfruta-1-presionfrutainicio-1': ['metric-presionfruta-1-presionfrutainicio-1'],
            'visual-presionfruta-1-presionfrutatermino-2': ['metric-presionfruta-1-presionfrutatermino-2'],
            'visual-presionfruta-1-presionfrutallegada-3': ['metric-presionfruta-1-presionfrutallegada-3'],
            'visual-presionfruta-1-presionfrutadespacho-4': ['metric-presionfruta-1-presionfrutadespacho-4'],
            'visual-fecha-ring-widget': ['fecha-ring-widget']
        };

        function migrarClavesInputsCriticos(obj) {
            if (!obj || typeof obj !== 'object') return;
            Object.keys(LEGACY_INPUT_IDS).forEach((nuevo) => {
                const cur = obj[nuevo];
                if (cur !== undefined && cur !== null && String(cur).trim() !== '') return;
                const legacyList = LEGACY_INPUT_IDS[nuevo];
                for (let i = 0; i < legacyList.length; i++) {
                    const old = legacyList[i];
                    const v = obj[old];
                    if (v !== undefined && v !== null && String(v).trim() !== '') {
                        obj[nuevo] = v;
                        return;
                    }
                }
            });
        }

        function leerInputsCriticosActuales() {
            const out = {};
            INPUT_IDS_CRITICOS.forEach((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                out[id] = (id === 'visual-num-muestra')
                    ? normalizarNumMuestraInput(el.value)
                    : el.value;
            });
            const day = document.getElementById('fecha-ring-day')?.textContent || '';
            const month = document.getElementById('fecha-ring-month')?.textContent || '';
            out['visual-fecha-ring-widget'] = `${day}|${month}`;
            return out;
        }

        function aplicarInputsCriticosGuardados(inputs) {
            if (!inputs || typeof inputs !== 'object') return;
            migrarClavesInputsCriticos(inputs);
            INPUT_IDS_CRITICOS.forEach((id) => {
                if (inputs[id] === undefined) return;
                const el = document.getElementById(id);
                if (!el) return;
                const val = (id === 'visual-num-muestra')
                    ? normalizarNumMuestraInput(inputs[id])
                    : String(inputs[id] ?? '');
                el.value = val;
            });
        }

        function capturarDraftCompleto() {
            return {
                version: 1,
                ts: Date.now(),
                data: data,
                ensayoMeta: ensayoMeta,
                llenadoJarrasState: llenadoJarrasState,
                siguienteIdFilaJarras: siguienteIdFilaJarras,
                ensayoActivo: ensayoActivo,
                metaPorEnsayo: metaPorEnsayo,
                inputsCriticos: leerInputsCriticosActuales()
            };
        }

        function guardarDraftCompleto() {
            try {
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(capturarDraftCompleto()));
            } catch (_) { /* ignore */ }
        }

        function hayTextoNoVacioEnObjeto(obj) {
            if (!obj || typeof obj !== 'object') return false;
            return Object.keys(obj).some((k) => {
                const v = obj[k];
                if (v && typeof v === 'object') return hayTextoNoVacioEnObjeto(v);
                return String(v ?? '').trim() !== '';
            });
        }

        function hayDatosEnTrabajo() {
            const hayPendientes = cargarColaSync().some((q) => String(q?.estado || '') === 'pendiente');
            if (hayPendientes) return true;
            if (Array.isArray(data) && data.length > 0) return true;
            if (hayTextoNoVacioEnObjeto(metaPorEnsayo)) return true;
            const criticos = leerInputsCriticosActuales();
            if (hayTextoNoVacioEnObjeto(criticos)) return true;
            return false;
        }

        function restaurarDraftCompleto() {
            try {
                const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
                if (!raw) return false;
                const d = JSON.parse(raw);
                if (!d || typeof d !== 'object') return false;

                if (Array.isArray(d.data)) {
                    data.splice(0, data.length, ...d.data);
                }
                if (d.ensayoMeta && typeof d.ensayoMeta === 'object') {
                    Object.keys(ensayoMeta).forEach((k) => delete ensayoMeta[k]);
                    Object.assign(ensayoMeta, d.ensayoMeta);
                }
                if (d.llenadoJarrasState && typeof d.llenadoJarrasState === 'object') {
                    if (!llenadoJarrasState.porEnsayo) llenadoJarrasState.porEnsayo = {};
                    llenadoJarrasState.porEnsayo = d.llenadoJarrasState.porEnsayo || {};
                }
                if (Number.isFinite(Number(d.siguienteIdFilaJarras))) {
                    siguienteIdFilaJarras = Number(d.siguienteIdFilaJarras);
                }
                if (d.metaPorEnsayo && typeof d.metaPorEnsayo === 'object') {
                    metaPorEnsayo = d.metaPorEnsayo;
                }
                if (d.ensayoActivo) {
                    ensayoActivo = String(d.ensayoActivo);
                }
                aplicarInputsCriticosGuardados(d.inputsCriticos);
                return true;
            } catch (_) { /* ignore */ }
            return false;
        }

        let draftSaveTimer = null;
        function programarGuardadoDraftCompleto() {
            clearTimeout(draftSaveTimer);
            draftSaveTimer = setTimeout(guardarDraftCompleto, 220);
        }

        function uidLocal() {
            return 'uid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
        }

        function cargarColaSync() {
            try {
                const raw = localStorage.getItem(SYNC_QUEUE_KEY);
                if (!raw) return [];
                const arr = JSON.parse(raw);
                return Array.isArray(arr) ? arr : [];
            } catch (_) {
                return [];
            }
        }

        function guardarColaSync(queue) {
            try {
                localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(Array.isArray(queue) ? queue : []));
            } catch (_) { /* ignore */ }
        }

        function limpiarColaSyncSoloPendientes(queue) {
            const arr = Array.isArray(queue) ? queue : [];
            return arr.filter((q) => String(q?.estado || '') === 'pendiente');
        }

        function cargarHistorialSync() {
            try {
                const raw = localStorage.getItem(SYNC_HISTORY_KEY);
                if (!raw) return [];
                const arr = JSON.parse(raw);
                return Array.isArray(arr) ? arr : [];
            } catch (_) {
                return [];
            }
        }

        function guardarHistorialSync(historial) {
            try {
                const out = (Array.isArray(historial) ? historial : []).slice(-SYNC_MAX_HISTORY);
                localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(out));
            } catch (_) { /* ignore */ }
        }

        function limpiarPersistenciaLocalPostSync() {
            try { localStorage.removeItem(SYNC_QUEUE_KEY); } catch (_) { /* ignore */ }
            try { localStorage.removeItem(SYNC_HISTORY_KEY); } catch (_) { /* ignore */ }
            try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch (_) { /* ignore */ }
            try { localStorage.removeItem(META_STORAGE_KEY); } catch (_) { /* ignore */ }
            try { localStorage.removeItem(DEMO_META_CAMPO_SEED_KEY); } catch (_) { /* ignore */ }
        }

        async function borrarTodoYCacheRapido() {
            let confirmado = false;
            if (window.Swal && typeof window.Swal.fire === 'function') {
                const resp = await swalFireSafe({
                    icon: 'warning',
                    title: 'Eliminar todo local',
                    text: 'Se borrarán datos en pantalla, cola pendiente e historial local. ¿Continuar?',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, borrar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#D92D20',
                    allowOutsideClick: false
                });
                confirmado = !!resp.isConfirmed;
            } else {
                confirmado = window.confirm('Se borrarán datos en pantalla, cola pendiente e historial local. ¿Continuar?');
            }
            if (!confirmado) return;

            try {
                if (typeof caches !== 'undefined' && caches && typeof caches.keys === 'function') {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                }
            } catch (_) { /* ignore */ }

            try { localStorage.removeItem(NUM_MUESTRA_USADOS_KEY); } catch (_) { /* ignore */ }
            try { localStorage.removeItem(REGISTRADOS_HOY_CACHE_KEY); } catch (_) { /* ignore */ }
            limpiarPersistenciaLocalPostSync();
            resetearPantallaEnCeroPostSync();
            establecerMenuFlotanteAbierto(false);
            mostrarToast('success', 'Limpieza completa', 'Datos locales y caché eliminados.');
        }
        window.borrarTodoYCacheRapido = borrarTodoYCacheRapido;

        // Limpieza inmediata del estado visual/local tras pulsar Enviar.
        // NO toca la cola pendiente para no perder sincronización.
        function limpiarPersistenciaLocalTrasEnvio() {
            try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch (_) { /* ignore */ }
            try { localStorage.removeItem(META_STORAGE_KEY); } catch (_) { /* ignore */ }
            try { localStorage.removeItem(DEMO_META_CAMPO_SEED_KEY); } catch (_) { /* ignore */ }
        }

        function resetearPantallaEnCeroPostSync() {
            data.splice(0, data.length);
            Object.keys(ensayoMeta).forEach((k) => delete ensayoMeta[k]);
            metaPorEnsayo = {};
            metaActivoEnsayo = '';
            ensayoActivo = '';
            llenadoJarrasState.porEnsayo = {};
            siguienteIdFilaJarras = 1;
            editingCardId = null;
            metricModalState.itemId = null;
            metricModalState.kind = null;
            observationModalState.itemId = null;

            META_SAVE_IDS.forEach((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.value = '';
            });
            const muestra = document.getElementById('visual-meta-muestra');
            if (muestra) muestra.value = '';
            const rotulo = document.getElementById('visual-rotulo');
            if (rotulo) rotulo.value = '';
            const guia = document.getElementById('visual-guia-acopio');
            if (guia) guia.value = '';
            const placa = document.getElementById('visual-placa-vehiculo');
            if (placa) placa.value = '';

            // Barrido adicional para dejar "literal vacío" cualquier input visual dinámico.
            document.querySelectorAll('input[id^="visual-"], textarea[id^="visual-"], select[id^="visual-"]').forEach((el) => {
                if (!el) return;
                if (el.type === 'checkbox' || el.type === 'radio') {
                    el.checked = false;
                } else {
                    el.value = '';
                }
            });
            document.querySelectorAll('input[id^="resumen-"], textarea[id^="resumen-"], select[id^="resumen-"]').forEach((el) => {
                if (!el) return;
                if (el.type === 'checkbox' || el.type === 'radio') {
                    el.checked = false;
                } else {
                    el.value = '';
                }
            });
            asegurarClamshellInicialVacio('Ensayo 1');
            metaActivoEnsayo = 'Ensayo 1';
            ensayoActivo = 'Ensayo 1';
            const muestraSel = document.getElementById('visual-meta-muestra');
            const rotuloEl = document.getElementById('visual-rotulo');
            if (muestraSel) muestraSel.value = 'Ensayo 1';
            if (rotuloEl) rotuloEl.value = 'Ensayo 1';

            sincronizarTrazabilidadCompuesta();
            sincronizarChipsDesdeAlmacenamiento();
            actualizarVistaCompacta();
            actualizarProgresoMeta();
            renderizarPanelLlenadoJarras();
            renderizarTarjetas();
            actualizarBarraHeaderEstado();
            actualizarBloqueoControlesPorPeso1();
        }

        function pushEstadoSync(reg) {
            const historial = cargarHistorialSync();
            historial.push({
                uid: reg.uid,
                fecha: reg.fecha,
                ensayo_numero: reg.ensayo_numero,
                estado: reg.estado,
                ts: Date.now(),
                intentos: reg.intentos || 0,
                error: reg.error || ''
            });
            guardarHistorialSync(historial);
        }

        function callbackJsonp(urlBase, params) {
            return new Promise((resolve, reject) => {
                const cb = '__cb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                const noopCb = function () { };
                const qs = new URLSearchParams(params || {});
                qs.set('callback', cb);
                // Evita respuestas cacheadas para validaciones de existencia en tiempo real.
                qs.set('_ts', String(Date.now()));
                const src = urlBase + (urlBase.includes('?') ? '&' : '?') + qs.toString();
                let done = false;
                const timeoutId = setTimeout(() => {
                    if (done) return;
                    done = true;
                    window[cb] = noopCb;
                    if (script && script.parentNode) script.parentNode.removeChild(script);
                    reject(new Error('Timeout JSONP'));
                }, 8000);

                const script = document.createElement('script');
                window[cb] = (payload) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timeoutId);
                    window[cb] = noopCb;
                    if (script && script.parentNode) script.parentNode.removeChild(script);
                    resolve(payload);
                };
                script.onerror = () => {
                    if (done) return;
                    done = true;
                    clearTimeout(timeoutId);
                    window[cb] = noopCb;
                    if (script && script.parentNode) script.parentNode.removeChild(script);
                    reject(new Error('Error JSONP'));
                };
                script.src = src;
                document.body.appendChild(script);
            });
        }

        async function existeRegistroServidor(fecha, ensayoNumero) {
            if (!API_URL) return null;
            try {
                const r = await callbackJsonp(API_URL, {
                    fecha: String(fecha || ''),
                    ensayo_numero: String(ensayoNumero || ''),
                    existe_registro: '1'
                });
                if (!r || r.ok !== true) return null;
                return !!r.existe;
            } catch (_) {
                return null;
            }
        }

        async function existeUidServidor(uid) {
            if (!API_URL) return null;
            const id = String(uid || '').trim();
            if (!id) return null;
            try {
                const r = await callbackJsonp(API_URL, {
                    existe_uid: '1',
                    uid: id
                });
                if (!r || r.ok !== true) return null;
                return !!r.existe;
            } catch (_) {
                return null;
            }
        }

        async function existeNumMuestraServidor(numMuestra) {
            if (!API_URL) return null;
            const nm = String(numMuestra || '').trim().split('·')[0].trim().toUpperCase();
            if (!nm) return { existe: false, num_muestra: '', fecha: '', ensayo_numero: '' };
            try {
                const r = await callbackJsonp(API_URL, {
                    existe_num_muestra_global: '1',
                    num_muestra: nm
                });
                if (!r || r.ok !== true) return null;
                return {
                    existe: !!r.existe,
                    num_muestra: String(r.num_muestra || nm),
                    fecha: String(r.fecha || ''),
                    ensayo_numero: String(r.ensayo_numero || '')
                };
            } catch (_) {
                return null;
            }
        }

        async function avisarNumMuestraDuplicadoConDetalle(detalle, origen) {
            const nm = String(detalle?.num_muestra || '').trim();
            const fecha = String(detalle?.fecha || '').trim();
            const ensayo = String(detalle?.ensayo_numero || '').trim();
            const donde = fecha
                ? `Ya existe en fecha ${fecha}${ensayo ? ` · Ensayo ${ensayo}` : ''}.`
                : 'Ya existe un registro con ese código.';
            if (window.Swal && typeof window.Swal.fire === 'function') {
                await swalFireSafe({
                    icon: 'warning',
                    title: 'Código ya registrado',
                    html: `
                        <div style="text-align:left;line-height:1.4;">
                            <div><b>N° muestra:</b> ${nm || '(sin código)'}</div>
                            <div style="margin-top:6px;">${donde}</div>
                            <div style="margin-top:10px;color:#64748b;font-size:12px;">
                                ${origen || 'No se puede registrar duplicado. Cambia el N° muestra para continuar.'}
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'Cambiar N° muestra',
                    confirmButtonColor: '#1f4f82',
                    allowOutsideClick: false
                });
            } else {
                alert(`Código ya registrado (${nm || '--'}). ${donde}`);
            }
            if (origen) console.warn('[NUM_MUESTRA]', origen);
            establecerAcordeonMetaAbierto(true);
        }

        function cargarNumMuestraUsadosLocal() {
            try {
                const raw = localStorage.getItem(NUM_MUESTRA_USADOS_KEY);
                if (!raw) return {};
                const o = JSON.parse(raw);
                return (o && typeof o === 'object') ? o : {};
            } catch (_) {
                return {};
            }
        }

        function guardarNumMuestraUsadosLocal(map) {
            try {
                localStorage.setItem(NUM_MUESTRA_USADOS_KEY, JSON.stringify(map && typeof map === 'object' ? map : {}));
            } catch (_) { /* ignore */ }
        }

        function registrarNumMuestraUsadoLocal(numMuestra, detalle) {
            const nm = normalizarNumMuestraClave(numMuestra);
            if (!nm) return;
            const map = cargarNumMuestraUsadosLocal();
            map[nm] = {
                num_muestra: nm,
                fecha: String(detalle?.fecha || hoyIsoLocal()),
                ensayo_numero: String(detalle?.ensayo_numero || ''),
                estado: String(detalle?.estado || 'registrado')
            };
            guardarNumMuestraUsadosLocal(map);
        }

        function buscarNumMuestraUsadoLocal(numMuestra) {
            const nm = normalizarNumMuestraClave(numMuestra);
            if (!nm) return null;
            const map = cargarNumMuestraUsadosLocal();
            return map[nm] || null;
        }

        function sleepMs(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }

        function logSync(msg, data) {
            try {
                const ts = new Date().toISOString();
                if (data === undefined) console.log(`[SYNC ${ts}] ${msg}`);
                else console.log(`[SYNC ${ts}] ${msg}`, data);
            } catch (_) { /* ignore */ }
        }

        async function confirmarRegistroServidorConReintentos(reg) {
            // Confirmación inmediata (sin bucle largo) para evitar "intentos" cuando el código ya existe.
            // 1) UID confirmado => se guardó este envío.
            if (reg.uid) {
                const uidExiste = await existeUidServidor(reg.uid);
                if (uidExiste === true) return { estado: 'confirmado' };
            }
            // 2) Si el código ya existe en servidor => duplicado, se debe cambiar N° muestra.
            if (reg.num_muestra) {
                const numInfo = await existeNumMuestraServidor(reg.num_muestra);
                if (numInfo && numInfo.existe === true) return { estado: 'duplicado_codigo', detalle: numInfo };
            }
            return { estado: 'pendiente' };
        }

        async function confirmarNumMuestraUnicoAntesDeGuardar(ensayoObjetivo) {
            const ensayo = String(ensayoObjetivo || obtenerEnsayoActivo() || 'Ensayo 1');
            const numMuestra = String((metaPorEnsayo?.[ensayo]?.['visual-num-muestra']) || '').trim();
            if (!numMuestra) {
                mostrarToast('warning', 'Falta N° muestra', 'Ingresa N° muestra antes de enviar.');
                return false;
            }
            // Sin internet: permitir guardar en pendiente y validar luego al sincronizar.
            if (!navigator.onLine) return true;
            const existeInfo = await existeNumMuestraServidor(numMuestra);
            if (existeInfo === null) {
                // Si falla la consulta previa, no bloquear el envío.
                // La validación definitiva se hace en doPost (servidor).
                return true;
            }
            if (existeInfo.existe !== true) return true;
            await avisarNumMuestraDuplicadoConDetalle(existeInfo, 'No se puede registrar duplicado. Cambia el N° muestra para continuar.');
            return false;
        }

        async function confirmarEnsayoNoRegistradoAntesDeGuardar() {
            const ensayo = obtenerEnsayoActivo();
            const ensayoNumero = numeroDesdeEnsayoTexto(ensayo);
            const fecha = hoyIsoLocal();
            if (!ensayoNumero) return true;
            if (!navigator.onLine) return true;
            const existe = await existeRegistroServidor(fecha, ensayoNumero);
            if (existe !== true) return true;
            if (window.Swal && typeof window.Swal.fire === 'function') {
                await swalFireSafe({
                    icon: 'warning',
                    title: 'Ensayo ya registrado',
                    text: `El ${ensayo} ya tiene registro en fecha ${fecha}. Cambia "Muestra" para continuar.`,
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#1f4f82'
                });
            } else {
                alert(`El ${ensayo} ya tiene registro en fecha ${fecha}. Cambia "Muestra" para continuar.`);
            }
            establecerAcordeonMetaAbierto(true);
            const sel = document.getElementById('visual-meta-muestra');
            if (sel) sel.focus();
            return false;
        }

        function pendingsSyncCount() {
            return cargarColaSync().filter((x) => String(x?.estado || 'pendiente') === 'pendiente').length;
        }

        function resumenEstadosSync() {
            const queue = cargarColaSync();
            const out = { pendiente: 0, subido: 0, bloqueado: 0, duplicado: 0, cancelado: 0, otros: 0 };
            queue.forEach((q) => {
                const s = String(q?.estado || '').toLowerCase();
                if (s === 'pendiente') out.pendiente++;
                else if (s === 'subido') out.subido++;
                else if (s === 'bloqueado') out.bloqueado++;
                else if (s === 'duplicado') out.duplicado++;
                else if (s === 'cancelado') out.cancelado++;
                else out.otros++;
            });
            return out;
        }

        function construirPayloadRegistroActual(ensayoObjetivo) {
            const ensayo = String(ensayoObjetivo || obtenerEnsayoActivo() || 'Ensayo 1');
            const ensayoNumero = numeroDesdeEnsayoTexto(ensayo);
            const rows = construirRowsRegistroBasePorEnsayo(ensayo);
            const fecha = rows[0]?.[0] || hoyIsoLocal();
            const numMuestra = String((metaPorEnsayo?.[ensayo]?.['visual-num-muestra']) || '').trim();
            return {
                uid: uidLocal(),
                ensayo,
                ensayo_numero: ensayoNumero,
                fecha,
                num_muestra: numMuestra,
                rows
            };
        }

        function fingerprintPayload(payload) {
            return JSON.stringify({
                fecha: payload?.fecha || '',
                ensayo_numero: payload?.ensayo_numero || '',
                rows: payload?.rows || []
            });
        }

        async function encolarRegistroPendiente(ensayoObjetivo) {
            if (!API_URL) {
                mostrarAlertaRegla('Falta API', 'En app.js asigna APPS_SCRIPT_API_URL con la URL de tu Web App de Apps Script (o define window.API_URL).');
                return null;
            }
            const payload = construirPayloadRegistroActual(ensayoObjetivo);
            if (!Array.isArray(payload.rows) || payload.rows.length === 0) {
                mostrarAlertaRegla('Sin filas para enviar', 'Agrega al menos un clamshell para generar datos.');
                return null;
            }
            // Validación principal se hace en el POST del servidor.
            const fp = fingerprintPayload(payload);
            const queue = cargarColaSync();
            const yaExistePendiente = queue.some((q) => q && q.fingerprint === fp && String(q.estado || '') === 'pendiente');
            if (yaExistePendiente) return { duplicadoLocal: true };
            const nmKey = normalizarNumMuestraClave(payload.num_muestra || '');
            if (nmKey) {
                const localUsado = buscarNumMuestraUsadoLocal(nmKey);
                if (localUsado) {
                    await avisarNumMuestraDuplicadoConDetalle(localUsado, 'Este código ya fue usado. Cambia el N° muestra para continuar.');
                    return { bloqueadoLocal: true };
                }
                const colaMismoCodigo = queue.find((q) => {
                    const estado = String(q?.estado || '');
                    if (estado !== 'pendiente' && estado !== 'bloqueado') return false;
                    return normalizarNumMuestraClave(q?.num_muestra || '') === nmKey;
                });
                if (colaMismoCodigo) {
                    await avisarNumMuestraDuplicadoConDetalle({
                        num_muestra: nmKey,
                        fecha: colaMismoCodigo?.fecha || '',
                        ensayo_numero: colaMismoCodigo?.ensayo_numero || ''
                    }, 'Ese código ya está en cola o bloqueado localmente.');
                    return { bloqueadoLocal: true };
                }
            }
            const reg = {
                uid: payload.uid,
                fecha: payload.fecha,
                ensayo_numero: payload.ensayo_numero,
                num_muestra: payload.num_muestra || '',
                ensayo: payload.ensayo,
                rows: payload.rows,
                fingerprint: fp,
                estado: 'pendiente',
                intentos: 0,
                creado_en: Date.now(),
                actualizado_en: Date.now(),
                error: ''
            };
            queue.push(reg);
            guardarColaSync(queue);
            pushEstadoSync(reg);
            refrescarBloqueoMuestrasEnTiempoReal(false);
            logSync('Encolado registro pendiente', {
                uid: reg.uid,
                num_muestra: reg.num_muestra,
                ensayo_numero: reg.ensayo_numero,
                filas: Array.isArray(reg.rows) ? reg.rows.length : 0
            });
            return reg;
        }

        let syncEnCurso = false;
        async function sincronizarPendientes() {
            if (syncEnCurso) return;
            if (!navigator.onLine) {
                actualizarBarraHeaderEstado();
                return resumenEstadosSync();
            }
            if (!API_URL) return;
            const queue = cargarColaSync();
            if (!queue.length) {
                actualizarBarraHeaderEstado();
                return resumenEstadosSync();
            }
            syncEnCurso = true;
            let huboCambios = false;
            try {
                for (let i = 0; i < queue.length; i++) {
                    const reg = queue[i];
                    if (!reg || String(reg.estado || '') !== 'pendiente') continue;

                    // Si el código ya existe globalmente, no reintentar; bloquear y pedir cambio.
                    if (reg.num_muestra) {
                        const numInfoPre = await existeNumMuestraServidor(reg.num_muestra);
                        if (numInfoPre && numInfoPre.existe === true) {
                            reg.estado = 'bloqueado';
                            reg.error = `NUM_MUESTRA ${reg.num_muestra} ya existe. Debes cambiar el N° muestra para continuar.`;
                            reg.actualizado_en = Date.now();
                            huboCambios = true;
                            pushEstadoSync(reg);
                            registrarNumMuestraUsadoLocal(reg.num_muestra, {
                                fecha: String(numInfoPre?.fecha || reg.fecha || ''),
                                ensayo_numero: String(numInfoPre?.ensayo_numero || reg.ensayo_numero || ''),
                                estado: 'bloqueado'
                            });
                            await avisarNumMuestraDuplicadoConDetalle(
                                {
                                    num_muestra: String(numInfoPre?.num_muestra || reg.num_muestra || ''),
                                    fecha: String(numInfoPre?.fecha || reg.fecha || ''),
                                    ensayo_numero: String(numInfoPre?.ensayo_numero || reg.ensayo_numero || '')
                                },
                                'Ese N° muestra ya existe. Cámbialo; este registro no se reintentará automáticamente.'
                            );
                            queue.splice(i, 1);
                            i--;
                            guardarColaSync(queue);
                            actualizarBarraHeaderEstado();
                            continue;
                        }
                    }

                    reg.intentos = Number(reg.intentos || 0) + 1;
                    reg.actualizado_en = Date.now();
                    let postResp = null;
                    try {
                        const body = { uid: reg.uid, rows: reg.rows };
                        logSync('Enviando POST a servidor (no-cors)', {
                            uid: reg.uid,
                            intento: reg.intentos,
                            num_muestra: reg.num_muestra,
                            ensayo_numero: reg.ensayo_numero,
                            filas: Array.isArray(reg.rows) ? reg.rows.length : 0
                        });
                        // Apps Script Web App no expone CORS en muchos despliegues.
                        // Se envía en modo no-cors y luego se confirma por UID/NUM_MUESTRA vía JSONP.
                        await fetch(API_URL, {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                            body: JSON.stringify(body)
                        });
                        const confirmacion = await confirmarRegistroServidorConReintentos(reg);
                        if (confirmacion?.estado === 'confirmado') {
                            postResp = { ok: true, confirmacion_uid: true };
                        } else if (confirmacion?.estado === 'duplicado_codigo') {
                            postResp = {
                                ok: false,
                                code: 'DUPLICATE_NUM_MUESTRA',
                                error: 'NUM_MUESTRA ya existe',
                                num_muestra: String(confirmacion?.detalle?.num_muestra || reg.num_muestra || ''),
                                fecha: String(confirmacion?.detalle?.fecha || reg.fecha || ''),
                                ensayo_numero: String(confirmacion?.detalle?.ensayo_numero || reg.ensayo_numero || '')
                            };
                        } else {
                            postResp = {
                                ok: false,
                                error: 'POST enviado (no-cors) pero sin confirmación del servidor todavía.'
                            };
                        }
                        logSync('Resultado post-confirmación (no-cors)', { uid: reg.uid, intento: reg.intentos, postResp });
                    } catch (e) {
                        reg.error = String(e?.message || e || 'Error POST');
                        reg.actualizado_en = Date.now();
                        huboCambios = true;
                        logSync('Error en POST (no-cors)', { uid: reg.uid, error: reg.error });
                        reg.estado = 'pendiente';
                        pushEstadoSync(reg);
                        continue;
                    }

                    const okServidor = !!(postResp && postResp.ok === true);
                    const errorServidor = String(postResp?.error || '').toLowerCase();
                    const esDuplicadoServidor = !!(postResp && (postResp.duplicate === true || postResp.code === 'DUPLICATE_NUM_MUESTRA'))
                        || errorServidor.includes('num_muestra')
                        || errorServidor.includes('no se puede registrar dos veces')
                        || errorServidor.includes('clave duplicada');

                    if (okServidor) {
                        reg.estado = 'subido';
                        reg.error = '';
                        reg.actualizado_en = Date.now();
                        huboCambios = true;
                        pushEstadoSync(reg);
                        logSync('Servidor confirmó registro', {
                            uid: reg.uid,
                            num_muestra: reg.num_muestra,
                            ensayo_numero: reg.ensayo_numero
                        });
                        registrarNumMuestraUsadoLocal(reg.num_muestra, {
                            fecha: reg.fecha,
                            ensayo_numero: reg.ensayo_numero,
                            estado: 'registrado'
                        });
                        mostrarToast('success', 'Servidor confirmó', `Registro ${reg.num_muestra || reg.uid} guardado correctamente.`);
                        queue.splice(i, 1);
                        i--;
                        guardarColaSync(queue);
                        actualizarBarraHeaderEstado();
                        continue;
                    }
                    if (esDuplicadoServidor) {
                        reg.estado = 'bloqueado';
                        reg.error = postResp?.error
                            ? String(postResp.error)
                            : `Ya existe registro con código ${reg.num_muestra}.`;
                        reg.actualizado_en = Date.now();
                        huboCambios = true;
                        pushEstadoSync(reg);
                        logSync('Bloqueado post-confirmación por NUM_MUESTRA duplicado', {
                            uid: reg.uid,
                            num_muestra: reg.num_muestra
                        });
                        registrarNumMuestraUsadoLocal(reg.num_muestra, {
                            fecha: String(postResp?.fecha || reg.fecha || ''),
                            ensayo_numero: String(postResp?.ensayo_numero || reg.ensayo_numero || ''),
                            estado: 'bloqueado'
                        });
                        await avisarNumMuestraDuplicadoConDetalle(
                            {
                                num_muestra: String(postResp?.num_muestra || reg.num_muestra || ''),
                                fecha: String(postResp?.fecha || reg.fecha || ''),
                                ensayo_numero: String(postResp?.ensayo_numero || reg.ensayo_numero || '')
                            },
                            'Ya existe ese N° muestra. Cambia el código para continuar.'
                        );
                        queue.splice(i, 1);
                        i--;
                        guardarColaSync(queue);
                        actualizarBarraHeaderEstado();
                        continue;
                    }

                    // Sin confirmación clara: antes de dejar pendiente, verificar de nuevo duplicado por código.
                    let bloqueoPorCodigo = false;
                    if (reg.num_muestra) {
                        const numInfoPost = await existeNumMuestraServidor(reg.num_muestra);
                        if (numInfoPost && numInfoPost.existe === true) {
                            reg.estado = 'bloqueado';
                            reg.error = `NUM_MUESTRA ${reg.num_muestra} ya existe. Debes cambiar el N° muestra para continuar.`;
                            reg.actualizado_en = Date.now();
                            huboCambios = true;
                            pushEstadoSync(reg);
                            registrarNumMuestraUsadoLocal(reg.num_muestra, {
                                fecha: String(numInfoPost?.fecha || reg.fecha || ''),
                                ensayo_numero: String(numInfoPost?.ensayo_numero || reg.ensayo_numero || ''),
                                estado: 'bloqueado'
                            });
                            await avisarNumMuestraDuplicadoConDetalle(
                                {
                                    num_muestra: String(numInfoPost?.num_muestra || reg.num_muestra || ''),
                                    fecha: String(numInfoPost?.fecha || reg.fecha || ''),
                                    ensayo_numero: String(numInfoPost?.ensayo_numero || reg.ensayo_numero || '')
                                },
                                'Ese N° muestra ya existe. Cámbialo; este registro no se reintentará automáticamente.'
                            );
                            queue.splice(i, 1);
                            i--;
                            guardarColaSync(queue);
                            actualizarBarraHeaderEstado();
                            bloqueoPorCodigo = true;
                        }
                    }
                    if (bloqueoPorCodigo) continue;

                    reg.estado = 'pendiente';
                    reg.error = postResp?.error
                        ? String(postResp.error)
                        : 'POST sin confirmación clara. Reintento automático.';
                    reg.actualizado_en = Date.now();
                    huboCambios = true;
                    pushEstadoSync(reg);
                    logSync('Pendiente: sin confirmación aún', {
                        uid: reg.uid,
                        num_muestra: reg.num_muestra,
                        ensayo_numero: reg.ensayo_numero
                    });
                }
            } finally {
                if (huboCambios) {
                    guardarColaSync(limpiarColaSyncSoloPendientes(queue));
                }
                syncEnCurso = false;
                actualizarBarraHeaderEstado();
                refrescarBloqueoMuestrasEnTiempoReal(false);
            }
            return resumenEstadosSync();
        }
        window.sincronizarPendientes = sincronizarPendientes;

        function construirOpcionesJarraModal(ensayo, jarraActual = null) {
            const clave = String(ensayo || 'Ensayo 1');
            const setJarras = new Set();

            // Regla principal: habilitar jarras que ya tienen trasvasado registrado/completo.
            const filas = obtenerFilasLlenadoJarras(clave);
            filas.forEach((f) => {
                if (String(f.tipo || '').trim() !== 'T') return;
                const ini = String(f.inicio || '').trim();
                const fin = String(f.termino || '').trim();
                if (!ini || !fin) return;
                const txt = String(f.jarra ?? '').trim();
                const r = parseRangoJarraLlenado(txt);
                if (r) {
                    setJarras.add(r.a);
                    setJarras.add(r.b);
                    return;
                }
                const n = Number(txt);
                if (Number.isFinite(n) && n >= 1) setJarras.add(n);
            });

            // Fallback: si todavía no hay trasvasados completos, usar jarras ya registradas en clamshell.
            if (!setJarras.size) {
                data
                    .filter((it) => String(it.ensayo || 'Ensayo 1') === clave)
                    .map((it) => Number(it.jarra))
                    .filter((n) => Number.isFinite(n) && n >= 1)
                    .forEach((n) => setJarras.add(n));
            }

            const actualNum = Number(jarraActual);
            if (Number.isFinite(actualNum) && actualNum >= 1) setJarras.add(actualNum);
            if (!setJarras.size) setJarras.add(1);
            return [...setJarras].sort((a, b) => a - b);
        }

        function poblarSelectJarraModal(ensayo, jarraActual = null) {
            const select = document.getElementById('visual-m-jarra');
            if (!select) return;
            const opciones = construirOpcionesJarraModal(ensayo, jarraActual);
            select.innerHTML = opciones.map((n) => `<option value="${n}">n° ${n}</option>`).join('');
            const preferida = Number(jarraActual);
            const valor = Number.isFinite(preferida) && preferida >= 1 ? preferida : opciones[0];
            select.value = String(valor);
        }

        function abrirModal(title, item = null) {
            establecerMenuFlotanteAbierto(false);
            const esNuevo = !item;
            const titleRow = document.getElementById('modal-title-row');
            if (titleRow) titleRow.classList.toggle('modal-title-row--edit', !esNuevo);
            if (esNuevo) {
                document.getElementById('modal-title').innerText = 'Nuevo Registro:';
            } else {
                const n = numeroClamshellPorEnsayo(item);
                document.getElementById('modal-title').innerText = `Editar Clamshell #${n}:`;
            }
            editingCardId = item ? item.id : null;
            poblarSelectJarraModal(obtenerEnsayoActivo(), item ? item.jarra : null);
            document.getElementById('visual-p1').value = item ? item.p1 : '';
            document.getElementById('visual-p2').value = item ? item.p2 : '';
            document.getElementById('visual-acopio').value = item ? item.acopio : '';
            document.getElementById('visual-despacho').value = item ? item.despacho : '';
            document.getElementById('modal-overlay').style.display = 'flex';
        }

        function guardarModalTarjeta() {
            const p1Val = Number(document.getElementById('visual-p1').value || 0);
            const p2Val = Number(document.getElementById('visual-p2').value || 0);
            const acopioVal = Number(document.getElementById('visual-acopio').value || 0);
            const despachoVal = Number(document.getElementById('visual-despacho').value || 0);
            const jarraSel = Number(document.getElementById('visual-m-jarra')?.value || 0);
            if (!Number.isFinite(jarraSel) || jarraSel < 1) {
                mostrarAlertaRegla('Falta jarra', 'Selecciona un N° de jarra válido para continuar.');
                return;
            }
            if (!(Number.isFinite(p1Val) && p1Val > 0)) {
                mostrarAlertaRegla('Falta Peso 1', 'Debes registrar al menos Peso 1 para guardar.');
                return;
            }

            if (editingCardId === null) {
                const nuevoId = (data.length ? Math.max(...data.map((d) => Number(d.id) || 0)) : 0) + 1;
                data.push({
                    id: nuevoId,
                    jarra: jarraSel,
                    ensayo: obtenerEnsayoActivo(),
                    p1: p1Val,
                    p2: Number.isFinite(p2Val) ? p2Val : 0,
                    acopio: Number.isFinite(acopioVal) ? acopioVal : 0,
                    despacho: Number.isFinite(despachoVal) ? despachoVal : 0,
                    observacion: '',
                    placaVehiculo: '',
                    guiaRemision: '',
                    metric: metricaVacia()
                });
                cerrarModal();
                renderizarTarjetas();
                programarGuardadoDraftCompleto();
                marcarBotonGuardado('btn-save-tarjeta');
                mostrarToast('success', 'Guardado', 'Registro del clamshell guardado.');
                return;
            }
            const item = data.find((entry) => entry.id === editingCardId);
            if (!item) {
                cerrarModal();
                return;
            }
            item.jarra = jarraSel;
            item.p1 = p1Val;
            item.p2 = Number.isFinite(p2Val) ? p2Val : 0;
            item.acopio = Number.isFinite(acopioVal) ? acopioVal : 0;
            item.despacho = Number.isFinite(despachoVal) ? despachoVal : 0;
            cerrarModal();
            renderizarTarjetas();
            programarGuardadoDraftCompleto();
            marcarBotonGuardado('btn-save-tarjeta');
            mostrarToast('success', 'Guardado', 'Registro del clamshell actualizado.');
        }

        function abrirModalObservacion(event, itemId) {
            if (event && typeof event.stopPropagation === 'function') {
                event.stopPropagation();
            }
            const item = data.find((entry) => entry.id === itemId);
            if (!item) return;
            observationModalState.itemId = itemId;
            document.getElementById('observation-modal-title').textContent = 'Observación · Clamshell #' + numeroClamshellPorEnsayo(item);
            document.getElementById('visual-observation').value = item.observacion || '';
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
            item.observacion = document.getElementById('visual-observation').value.trim();
            cerrarModalObservacion();
            renderizarTarjetas();
            programarGuardadoDraftCompleto();
            marcarBotonGuardado('btn-save-observacion');
            mostrarToast('success', 'Guardado', 'Observación guardada.');
        }

        function abrirModalResumenGlobal() {
            establecerMenuFlotanteAbierto(false);
            document.getElementById('essential-modal-title').textContent = 'Resumen general para envío';
            const body = document.getElementById('essential-modal-body');
            const ensayos = [...new Set(data.map((item) => String(item.ensayo || '').trim()).filter(Boolean))];
            body.innerHTML = ensayos.map((ensayo) => {
                const meta = obtenerMetaEnsayo(ensayo);
                const rows = data.filter((item) => (item.ensayo || 'Ensayo 1') === ensayo).map((item) => {
                    const nroClamshell = numeroClamshellPorEnsayo(item);
                    const temp = item.metric?.temperatura || {};
                    const horaDesp = item.metric?.tiempo?.despachoAcopio || '--';
                    return `
                        <div class="essential-block">
                            <h4>Clamshell #${nroClamshell} · Jarra ${item.jarra}</h4>
                            <div class="essential-summary-grid">
                                <div class="essential-card"><b>Peso despacho acopio-campo</b><span>${item.despacho ?? '--'}g</span></div>
                                <div class="essential-card"><b>Hora despacho acopio-campo</b><span>${horaDesp}</span></div>
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
                                    <input type="text" id="resumen-placa-${slugIdSeguro(ensayo)}" data-ensayo-placa="${ensayo}" value="${meta.placaVehiculo || ''}" placeholder="Ej. 9967-OK">
                                </div>
                                <div class="form-group">
                                    <label>GUÍA REMISIÓN ACOPIO</label>
                                    <input type="text" id="resumen-guia-${slugIdSeguro(ensayo)}" data-ensayo-guia="${ensayo}" value="${meta.guiaRemision || ''}" placeholder="Ej. 208353">
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

        function cambiarEnsayoActivoEnFormulario_(ensayo) {
            const objetivo = String(ensayo || '').trim();
            if (!objetivo) return;
            const actual = String(obtenerEnsayoActivo() || '').trim();
            if (actual === objetivo) return;
            snapshotMetaEnsayoActual();
            if (!metaPorEnsayo[objetivo]) {
                metaPorEnsayo[objetivo] = { 'visual-meta-muestra': objetivo, 'visual-rotulo': objetivo };
            }
            cargarMetaDeEnsayo(objetivo);
            const muestraEl = document.getElementById('visual-meta-muestra');
            const rotulo = document.getElementById('visual-rotulo');
            if (muestraEl) muestraEl.value = objetivo;
            if (rotulo) rotulo.value = objetivo;
            aplicarCambioEnsayoActivo();
            programarGuardadoMeta();
        }

        async function seleccionarEnsayoCompletoParaEnviar_(preferido) {
            const completos = obtenerEnsayosCompletosParaEnvio();
            if (!completos.length) return null;
            if (completos.length === 1) return completos[0];
            const opts = {};
            completos.forEach((ensayo) => {
                const nm = String(metaPorEnsayo?.[ensayo]?.['visual-num-muestra'] || '').trim() || '--';
                opts[ensayo] = `${mostrarMuestra(ensayo)} · N° ${nm}`;
            });
            const pref = completos.includes(preferido) ? preferido : completos[0];
            if (window.Swal && typeof window.Swal.fire === 'function') {
                const r = await swalFireSafe({
                    icon: 'question',
                    title: 'Selecciona muestra a enviar',
                    input: 'select',
                    inputOptions: opts,
                    inputValue: pref,
                    confirmButtonText: 'Enviar muestra',
                    showCancelButton: true,
                    cancelButtonText: 'Cancelar',
                    allowOutsideClick: false
                });
                if (!r.isConfirmed) return null;
                return String(r.value || '').trim() || pref;
            }
            return pref;
        }

        /** Cola de sync + toasts (compartido por modal resumen y botón fijo Campo). */
        async function finalizarEncoladoYSync(ensayoObjetivo) {
            const ensayoBase = String(ensayoObjetivo || obtenerEnsayoActivo() || 'Ensayo 1');
            const ensayoAEnviar = await seleccionarEnsayoCompletoParaEnviar_(ensayoBase);
            if (!ensayoAEnviar) {
                if (obtenerEnsayosCompletosParaEnvio().length === 0) {
                    const camposCompletos = await validarCamposRequeridosAntesDeEnviar(ensayoBase);
                    if (!camposCompletos) return;
                } else {
                    return;
                }
            }
            const ensayoFinal = ensayoAEnviar || ensayoBase;
            const camposCompletos = await validarCamposRequeridosAntesDeEnviar(ensayoFinal);
            if (!camposCompletos) return;
            const puedeGuardar = await confirmarNumMuestraUnicoAntesDeGuardar(ensayoFinal);
            if (!puedeGuardar) return;
            cambiarEnsayoActivoEnFormulario_(ensayoFinal);
            programarGuardadoDraftCompleto();
            const encolado = await encolarRegistroPendiente(ensayoFinal);
            actualizarBarraHeaderEstado();
            if (encolado && !encolado.duplicadoLocal) {
                limpiarPersistenciaLocalTrasEnvio();
                // UX: al entrar a cola, limpiamos de inmediato el formulario para que "pendiente"
                // solo viva en la barra/contador y no quede la info visible en pantalla.
                resetearPantallaEnCeroPostSync();
                if (navigator.onLine) {
                    mostrarToast('info', 'Registro en cola', 'Enviando y confirmando con servidor...');
                    sincronizarPendientes().then(async (rsSync) => {
                        let rs = rsSync || resumenEstadosSync();
                        if (rs.bloqueado > 0 || rs.duplicado > 0 || rs.cancelado > 0) {
                            mostrarToast('warning', 'Revision requerida', 'Hay registros bloqueados por N° muestra. Cambia el código o no envíes.');
                            return;
                        }
                        if (rs.pendiente === 0) {
                            limpiarPersistenciaLocalPostSync();
                            mostrarToast('success', 'Sincronizado', 'Registro confirmado. Cache local limpiado.');
                        } else {
                            mostrarToast('warning', 'Pendiente', 'Se reintentará automáticamente.');
                        }
                    });
                } else {
                    mostrarToast('warning', 'Sin internet', 'Guardado local como pendiente. Se sincronizará al volver conexión.');
                }
            } else if (encolado && encolado.duplicadoLocal) {
                mostrarToast('info', 'Ya en cola', 'Este mismo registro ya estaba pendiente de sincronización.');
            } else if (encolado && encolado.bloqueadoLocal) {
                actualizarBarraHeaderEstado();
            }
        }

        /** Desde la pantalla principal: persiste meta + guía/placa, borrador y envío a cola/servidor. */
        async function guardarRegistroYEnviarDesdePantalla() {
            if (envioRegistroEnCurso) return;
            envioRegistroEnCurso = true;
            const btn = document.getElementById('btn-guardar-enviar-campo');
            setButtonLoading(btn, true, 'Enviando...');
            try {
            snapshotMetaEnsayoActual();
            persistirLogisticaAcopioDesdeInputs();
            guardarDraftCompleto();
            renderizarTarjetas();
            await finalizarEncoladoYSync();
            } finally {
                setButtonLoading(btn, false);
                envioRegistroEnCurso = false;
            }
        }

        window.guardarRegistroYEnviarDesdePantalla = guardarRegistroYEnviarDesdePantalla;

        async function guardarModalResumenGlobal() {
            if (envioRegistroEnCurso) return;
            envioRegistroEnCurso = true;
            const btn = document.getElementById('btn-save-resumen-global');
            setButtonLoading(btn, true, 'Guardando...');
            try {
            const ensayos = [...new Set(data.map((item) => String(item.ensayo || '').trim()).filter(Boolean))];
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
            sincronizarLogisticaAcopioDesdeEnsayo();
            await finalizarEncoladoYSync();
            } finally {
                setButtonLoading(btn, false);
                envioRegistroEnCurso = false;
            }
        }

        

        function abrirModalMetrica(event, kind, itemId) {
            event.stopPropagation();
            let item = data.find((entry) => entry.id === itemId) || null;
            if (!item) return;
            let esLiderTiempo = true;
            if (kind === 'tiempo') {
                const lider = obtenerLiderTiempoPorJarra(item) || item;
                esLiderTiempo = Number(lider.id) === Number(item.id);
                sincronizarTiempoPorJarra(String(item.ensayo || 'Ensayo 1'));
                item = data.find((entry) => Number(entry.id) === Number(item.id)) || item;
            }
            const nroClamshell = numeroClamshellPorEnsayo(item);
            metricModalState.itemId = itemId;
            metricModalState.kind = kind;
            metricModalState.itemId = item.id;
            metricModalState.tiempoEditable = (kind !== 'tiempo') ? true : esLiderTiempo;
            const body = document.getElementById('metric-modal-body');
            const title = document.getElementById('metric-modal-title');
            const metric = item.metric || metricaVacia();

            if (kind === 'tiempo') {
                title.textContent = 'Tiempos de la muestra (hora) · Clamshell #' + nroClamshell;
                body.innerHTML = `
                    <div class="metric-grid-2">
                        <div class="form-group"><label>Inicio de cosecha</label><input type="time" id="visual-tiempo-1-iniciocosecha-1" data-metric="inicioCosecha" value="${metric.tiempo.inicioCosecha || ''}" disabled title="Dato automático por jarra"></div>
                        <div class="form-group"><label>Inicio pérdida de peso</label><input type="time" id="visual-tiempo-1-inicioperdida-2" data-metric="inicioPerdida" value="${metric.tiempo.inicioPerdida || ''}" disabled title="Dato automático por trasvasado"></div>
                        <div class="form-group"><label>Término de cosecha</label><input type="time" id="visual-tiempo-1-terminocosecha-3" data-metric="terminoCosecha" value="${metric.tiempo.terminoCosecha || ''}" disabled title="FINAL del último trasvasado del ensayo (hora más tardía en panel, todas las filas T)"></div>
                        <div class="form-group"><label>Llegada acopio-campo</label><input type="time" id="visual-tiempo-1-terminocosecha-4" data-metric="llegadaAcopio" value="${metric.tiempo.llegadaAcopio || ''}"></div>
                    </div>
                    <div class="form-group"><label>Despacho acopio-campo</label><input type="time" id="visual-tiempo-1-despachoacopio-5" data-metric="despachoAcopio" value="${metric.tiempo.despachoAcopio || ''}"></div>
                    <div id="visual-tiempo-alert" class="metric-inline-alert" style="display:none;"></div>
                `;
                body.querySelectorAll('input[data-metric]').forEach((inp) => {
                    inp.addEventListener('input', validarTiempoModalEnVivo);
                    inp.addEventListener('change', validarTiempoModalEnVivo);
                });
                if (!esLiderTiempo) {
                    body.querySelectorAll('input[data-metric]').forEach((inp) => {
                        inp.disabled = true;
                        inp.title = 'Solo el primer clamshell de la jarra puede editar tiempos';
                    });
                    const alertEl = document.getElementById('visual-tiempo-alert');
                    if (alertEl) {
                        alertEl.style.display = 'block';
                        alertEl.textContent = 'Clamshell #' + nroClamshell + ': bloqueado por seguridad. Solo el primer clamshell de esta jarra puede editar tiempos.';
                    }
                }
                asegurarIdsInputsDinamicos(body, `metric-${kind}-${item.id}`);
                validarTiempoModalEnVivo();
            } else if (kind === 'temperatura') {
                title.textContent = 'Temperatura muestra (°C) · Clamshell #' + nroClamshell;
                body.innerHTML = `
                    <p class="metric-mini-title">Inicio de cosecha</p>
                    <div class="metric-grid-2">
                        <div class="form-group"><label>T° ambiente</label><input type="number" step="0.1" id="visual-temp-amb-inicio" data-metric="inicioAmbiente" value="${metric.temperatura.inicioAmbiente || ''}"></div>
                        <div class="form-group"><label>T° pulpa</label><input type="number" step="0.1" id="visual-temp-pulpa-inicio" data-metric="inicioPulpa" value="${metric.temperatura.inicioPulpa || ''}"></div>
                    </div>
                    <p class="metric-mini-title">Término de cosecha</p>
                    <div class="metric-grid-2">
                        <div class="form-group"><label>T° ambiente</label><input type="number" step="0.1" id="visual-temp-amb-termino" data-metric="terminoAmbiente" value="${metric.temperatura.terminoAmbiente || ''}"></div>
                        <div class="form-group"><label>T° pulpa</label><input type="number" step="0.1" id="visual-temp-pulpa-termino" data-metric="terminoPulpa" value="${metric.temperatura.terminoPulpa || ''}"></div>
                    </div>
                    <p class="metric-mini-title">Llegada acopio-campo</p>
                    <div class="metric-grid-2">
                        <div class="form-group"><label>T° ambiente</label><input type="number" step="0.1" id="visual-temp-amb-llegada" data-metric="llegadaAmbiente" value="${metric.temperatura.llegadaAmbiente || ''}"></div>
                        <div class="form-group"><label>T° pulpa</label><input type="number" step="0.1" id="visual-temp-pulpa-llegada" data-metric="llegadaPulpa" value="${metric.temperatura.llegadaPulpa || ''}"></div>
                    </div>
                    <p class="metric-mini-title">Despacho acopio-campo</p>
                    <div class="metric-grid-2">
                        <div class="form-group"><label>T° ambiente</label><input type="number" step="0.1" id="visual-temp-amb-despacho" data-metric="despachoAmbiente" value="${metric.temperatura.despachoAmbiente || ''}"></div>
                        <div class="form-group"><label>T° pulpa</label><input type="number" step="0.1" id="visual-temp-pulpa-despacho" data-metric="despachoPulpa" value="${metric.temperatura.despachoPulpa || ''}"></div>
                    </div>
                    <details class="pressure-accordion" open>
                        <summary>Presión de vapor ambiente (Kpa)</summary>
                        <div class="pressure-accordion-body">
                            <div class="metric-grid-4">
                                <div class="form-group"><label>Inicio</label><input type="number" step="0.1" id="visual-presionambiente-1-presionambienteinicio-1" data-metric="presionAmbienteInicio" value="${metric.temperatura.presionAmbienteInicio || ''}" disabled title="Dato calculado automáticamente"></div>
                                <div class="form-group"><label>Término</label><input type="number" step="0.1" id="visual-presionambiente-1-presionambientetermino-2" data-metric="presionAmbienteTermino" value="${metric.temperatura.presionAmbienteTermino || ''}" disabled title="Dato calculado automáticamente"></div>
                                <div class="form-group"><label>Llegada</label><input type="number" step="0.1" id="visual-presionambiente-1-presionambientellegada-3" data-metric="presionAmbienteLlegada" value="${metric.temperatura.presionAmbienteLlegada || ''}" disabled title="Dato calculado automáticamente"></div>
                                <div class="form-group"><label>Despacho</label><input type="number" step="0.1" id="visual-presionambiente-1-presionambientedespacho-4" data-metric="presionAmbienteDespacho" value="${metric.temperatura.presionAmbienteDespacho || ''}" disabled title="Dato calculado automáticamente"></div>
                            </div>
                        </div>
                    </details>
                    <details class="pressure-accordion">
                        <summary>Presión de vapor fruta (Kpa)</summary>
                        <div class="pressure-accordion-body">
                            <div class="metric-grid-4">
                                <div class="form-group"><label>Inicio</label><input type="number" step="0.1" id="visual-presionfruta-1-presionfrutainicio-1" data-metric="presionFrutaInicio" value="${metric.temperatura.presionFrutaInicio || ''}" disabled title="Dato calculado automáticamente"></div>
                                <div class="form-group"><label>Término</label><input type="number" step="0.1" id="visual-presionfruta-1-presionfrutatermino-2" data-metric="presionFrutaTermino" value="${metric.temperatura.presionFrutaTermino || ''}" disabled title="Dato calculado automáticamente"></div>
                                <div class="form-group"><label>Llegada</label><input type="number" step="0.1" id="visual-presionfruta-1-presionfrutallegada-3" data-metric="presionFrutaLlegada" value="${metric.temperatura.presionFrutaLlegada || ''}" disabled title="Dato calculado automáticamente"></div>
                                <div class="form-group"><label>Despacho</label><input type="number" step="0.1" id="visual-presionfruta-1-presionfrutadespacho-4" data-metric="presionFrutaDespacho" value="${metric.temperatura.presionFrutaDespacho || ''}" disabled title="Dato calculado automáticamente"></div>
                            </div>
                        </div>
                    </details>
                `;
            } else if (kind === 'humedad') {
                title.textContent = 'Humedad relativa (%) · Clamshell #' + nroClamshell;
                body.innerHTML = `
                    <div class="metric-grid-2">
                        <div class="form-group"><label>Inicio de cosecha</label><input type="number" step="0.1" id="visual-cg-humedad-inicio" data-metric="inicio" value="${metric.humedad.inicio || ''}"></div>
                        <div class="form-group"><label>Término de cosecha</label><input type="number" step="0.1" id="visual-cg-humedad-termino" data-metric="termino" value="${metric.humedad.termino || ''}"></div>
                        <div class="form-group"><label>Llegada a acopio</label><input type="number" step="0.1" id="visual-cg-humedad-llegada" data-metric="llegada" value="${metric.humedad.llegada || ''}"></div>
                        <div class="form-group"><label>Despacho acopio</label><input type="number" step="0.1" id="visual-cg-humedad-despacho" data-metric="despacho" value="${metric.humedad.despacho || ''}"></div>
                    </div>
                `;
            } else if (kind === 'presionAmbiente') {
                title.textContent = 'Presión de vapor ambiente (Kpa) · Clamshell #' + nroClamshell;
                body.innerHTML = `
                    <div class="metric-grid-4">
                        <div class="form-group"><label>Inicio</label><input type="number" step="0.1" id="visual-presionambiente-1-presionambienteinicio-1" data-metric="presionAmbienteInicio" value="${metric.temperatura.presionAmbienteInicio || ''}" disabled title="Dato calculado automáticamente"></div>
                        <div class="form-group"><label>Término</label><input type="number" step="0.1" id="visual-presionambiente-1-presionambientetermino-2" data-metric="presionAmbienteTermino" value="${metric.temperatura.presionAmbienteTermino || ''}" disabled title="Dato calculado automáticamente"></div>
                        <div class="form-group"><label>Llegada</label><input type="number" step="0.1" id="visual-presionambiente-1-presionambientellegada-3" data-metric="presionAmbienteLlegada" value="${metric.temperatura.presionAmbienteLlegada || ''}" disabled title="Dato calculado automáticamente"></div>
                        <div class="form-group"><label>Despacho</label><input type="number" step="0.1" id="visual-presionambiente-1-presionambientedespacho-4" data-metric="presionAmbienteDespacho" value="${metric.temperatura.presionAmbienteDespacho || ''}" disabled title="Dato calculado automáticamente"></div>
                    </div>
                `;
            } else if (kind === 'presionFruta') {
                title.textContent = 'Presión de vapor fruta (Kpa) · Clamshell #' + nroClamshell;
                body.innerHTML = `
                    <div class="metric-grid-4">
                        <div class="form-group"><label>Inicio</label><input type="number" step="0.1" id="visual-presionfruta-1-presionfrutainicio-1" data-metric="presionFrutaInicio" value="${metric.temperatura.presionFrutaInicio || ''}" disabled title="Dato calculado automáticamente"></div>
                        <div class="form-group"><label>Término</label><input type="number" step="0.1" id="visual-presionfruta-1-presionfrutatermino-2" data-metric="presionFrutaTermino" value="${metric.temperatura.presionFrutaTermino || ''}" disabled title="Dato calculado automáticamente"></div>
                        <div class="form-group"><label>Llegada</label><input type="number" step="0.1" id="visual-presionfruta-1-presionfrutallegada-3" data-metric="presionFrutaLlegada" value="${metric.temperatura.presionFrutaLlegada || ''}" disabled title="Dato calculado automáticamente"></div>
                        <div class="form-group"><label>Despacho</label><input type="number" step="0.1" id="visual-presionfruta-1-presionfrutadespacho-4" data-metric="presionFrutaDespacho" value="${metric.temperatura.presionFrutaDespacho || ''}" disabled title="Dato calculado automáticamente"></div>
                    </div>
                `;
            }
            asegurarIdsInputsDinamicos(body, `metric-${kind}-${item.id}`);

            document.getElementById('metric-modal-overlay').style.display = 'flex';
        }

        function cerrarModalMetrica() {
            document.getElementById('metric-modal-overlay').style.display = 'none';
            const metricBody = document.getElementById('metric-modal-body');
            if (metricBody) metricBody.innerHTML = '';
        }

        function guardarModalMetrica() {
            const item = data.find((entry) => entry.id === metricModalState.itemId);
            if (!item || !metricModalState.kind) return;
            if (metricModalState.kind === 'tiempo' && metricModalState.tiempoEditable === false) {
                mostrarAlertaRegla('Edicion bloqueada', 'Solo el primer clamshell de la jarra puede editar tiempos.');
                return;
            }
            if (metricModalState.kind === 'tiempo') {
                const errores = validarTiempoModalEnVivo();
                if (errores.length) {
                    mostrarAlertaRegla('Horario inválido', errores[0]);
                    return;
                }
            }
            const metricInputs = document.querySelectorAll('#metric-modal-body [data-metric]');
            metricInputs.forEach((input) => {
                if (input.disabled) return;
                item.metric[metricModalState.kind][input.getAttribute('data-metric')] = input.value;
            });
            if (metricModalState.kind === 'tiempo') {
                const llegada = String(item.metric?.tiempo?.llegadaAcopio || '').trim();
                const despacho = String(item.metric?.tiempo?.despachoAcopio || '').trim();
                if (llegada || despacho) {
                    const clave = String(item.ensayo || 'Ensayo 1');
                    data.forEach((it) => {
                        if (String(it.ensayo || 'Ensayo 1') !== clave) return;
                        it.metric = it.metric || metricaVacia();
                        it.metric.tiempo = it.metric.tiempo || {};
                        if (llegada) it.metric.tiempo.llegadaAcopio = llegada;
                        if (despacho) it.metric.tiempo.despachoAcopio = despacho;
                    });
                }
                sincronizarTiempoPorJarra(item.ensayo || 'Ensayo 1');
            }
            if (metricModalState.kind === 'temperatura' || metricModalState.kind === 'humedad') {
                recalcularPresionesParaTodos();
            }
            cerrarModalMetrica();
            renderizarTarjetas();
            programarGuardadoDraftCompleto();
            marcarBotonGuardado('btn-save-metrica');
            mostrarToast('success', 'Guardado', 'Métrica guardada correctamente.');
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

        window.addEventListener('online', () => {
            offlineAlertShown = false;
            actualizarHeaderConexionUI();
            refrescarBloqueoMuestrasEnTiempoReal(true);
            sincronizarPendientes();
        });
        window.addEventListener('offline', () => {
            actualizarHeaderConexionUI();
            refrescarBloqueoMuestrasEnTiempoReal(false);
            mostrarAlertaModoOffline();
        });

        const draftRestaurado = restaurarDraftCompleto();
        ensayoActivo = obtenerEnsayoActivo();
        recalcularPresionesParaTodos();
        actualizarIconos();
        iniciarAutoActualizacionFechaRing();
        asegurarClamshellInicialVacio(obtenerEnsayoActivo());
        renderizarTarjetas();
        renderizarPanelLlenadoJarras();
        sincronizarLogisticaAcopioDesdeEnsayo();
        // En producción no sembrar datos demo automáticamente.
        const numMuestraInput = document.getElementById('visual-num-muestra');
        if (numMuestraInput) {
            numMuestraInput.setAttribute('maxlength', String(NUM_MUESTRA_MAX_LEN));
            numMuestraInput.addEventListener('input', () => {
                const limpio = normalizarNumMuestraInput(numMuestraInput.value);
                if (numMuestraInput.value !== limpio) numMuestraInput.value = limpio;
            });
        }
        INPUT_IDS_CRITICOS.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', programarGuardadoDraftCompleto);
            el.addEventListener('change', programarGuardadoDraftCompleto);
        });
        window.addEventListener('beforeunload', (e) => {
            if (omitirConfirmacionSalida) return;
            guardarDraftCompleto();
            if (!hayDatosEnTrabajo()) return;
            const msg = '¿Estas seguro? Puedes perder informacion no enviada.';
            e.preventDefault();
            e.returnValue = msg;
            return msg;
        });
        document.querySelectorAll('#main-bottom-nav a[href]').forEach((a) => {
            a.addEventListener('click', () => {
                omitirConfirmacionSalida = true;
                setTimeout(() => { omitirConfirmacionSalida = false; }, 1200);
            });
        });
        actualizarBarraHeaderEstado();
        refrescarBloqueoMuestrasEnTiempoReal(true);
        if (!navigator.onLine) mostrarAlertaModoOffline();
        sincronizarPendientes();
        if (draftRestaurado) {
            setTimeout(() => {
                mostrarToast('info', 'Recuperado de borrador', 'Se restauraron tus datos locales correctamente.');
            }, 350);
        }
        setInterval(() => {
            if (navigator.onLine) sincronizarPendientes();
        }, 5000);
        // Contador de pendientes siempre "vivo" para reflejar cambios rápidos.
        setInterval(() => {
            actualizarHeaderPendientesUI();
        }, 1000);
        window.addEventListener('focus', () => actualizarBarraHeaderEstado());
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) actualizarBarraHeaderEstado();
        });
        window.addEventListener('storage', (e) => {
            if (!e) return;
            if (e.key === SYNC_QUEUE_KEY || e.key === SYNC_HISTORY_KEY) actualizarBarraHeaderEstado();
        });
        setInterval(() => {
            programarGuardadoDraftCompleto();
        }, 5000);


