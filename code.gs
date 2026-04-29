/**
 * Google Apps Script - MTTP Arándano
 * Recibe datos del formulario y los escribe en la hoja activa.
 * Hoja 1: 46 cols — orden = formulario (Muestra, N° muestra, responsable, …) sin OBSERVACION_FORMATO; packing desde col 47.
 *
 * ANTI-DUPLICADOS: UID + clave de fila normalizada.
 *
 * --- PACKING (cols 47–86) ---
 */
var PACKING_START_COL = 47;
var PACKING_COLS = 40;
var THERMOKING_START_COL = PACKING_START_COL + PACKING_COLS; // 87
var THERMOKING_COLS = 39;
var C5_START_COL = THERMOKING_START_COL + THERMOKING_COLS; // 126

/** 46 columnas Hoja 1 (registro): un solo orden; debe coincidir con app.js construirFilaBaseRegistro. */
var NUM_COLS_REGISTRO = 46;

function getRegistroHeadersHoja1_() {
  return [
    "FECHA", "ENSAYO_NOMBRE", "NUM_MUESTRA", "RESPONSABLE", "DIAS_PRECOSECHA", "HORA_INICIO_GENERAL", "FUNDO",
    "TRAZ_ETAPA", "TRAZ_CAMPO", "TRAZ_LIBRE", "VARIEDAD", "GUIA_REMISION", "PLACA_VEHICULO", "ENSAYO_NUMERO", "N_CLAMSHELL", "N_JARRA",
    "PESO_1", "PESO_2", "LLEGADA_ACOPIO", "DESPACHO_ACOPIO",
    "TEMP_MUE_INICIO_AMB", "TEMP_MUE_INICIO_PUL", "TEMP_MUE_TERMINO_AMB", "TEMP_MUE_TERMINO_PUL",
    "TEMP_MUE_LLEGADA_AMB", "TEMP_MUE_LLEGADA_PUL", "TEMP_MUE_DESPACHO_AMB", "TEMP_MUE_DESPACHO_PUL",
    "TIEMPO_INICIO_COSECHA", "TIEMPO_PERDIDA_PESO", "TIEMPO_TERMINO_COSECHA", "TIEMPO_LLEGADA_ACOPIO", "TIEMPO_DESPACHO_ACOPIO",
    "HUMEDAD_INICIO", "HUMEDAD_TERMINO", "HUMEDAD_LLEGADA", "HUMEDAD_DESPACHO",
    "PRESION_AMB_INICIO", "PRESION_AMB_TERMINO", "PRESION_AMB_LLEGADA", "PRESION_AMB_DESPACHO",
    "PRESION_FRUTA_INICIO", "PRESION_FRUTA_TERMINO", "PRESION_FRUTA_LLEGADA", "PRESION_FRUTA_DESPACHO",
    "OBSERVACION"
  ];
}

/**
 * Escribe o corrige la fila 1 de títulos. Si el libro aún tenía encabezados viejos (B=RESPONSABLE, L=OBSERVACION_FORMATO, etc.),
 * reemplaza la fila 1 para alinear con los datos que envía el front.
 */
function asegurarEncabezadoHoja1Registro_(sheet) {
  var h = getRegistroHeadersHoja1_();
  if (h.length !== NUM_COLS_REGISTRO) {
    throw new Error("getRegistroHeadersHoja1_: longitud distinta a NUM_COLS_REGISTRO");
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, h.length).setValues([h]);
    return;
  }
  var a1 = String(sheet.getRange(1, 1).getValue() || "")
    .trim()
    .toUpperCase();
  if (a1 !== "FECHA") {
    return;
  }
  var b1 = String(sheet.getRange(1, 2).getValue() || "").trim();
  var l1 = String(sheet.getRange(1, 12).getValue() || "").trim();
  // Esquema nuevo: col B = ENSAYO_NOMBRE, col L = GUIA_REMISION (12ª columna).
  if (b1 === "ENSAYO_NOMBRE" && l1 === "GUIA_REMISION") {
    return;
  }
  var viejoB = b1 === "RESPONSABLE" || b1 === "GUIA_REMISION";
  var viejoL = l1 === "OBSERVACION_FORMATO";
  if (viejoB || viejoL || b1 === "") {
    sheet.getRange(1, 1, 1, h.length).setValues([h]);
  }
}

/** Thermo King: solo estas 2 columnas meta al inicio (no hay N_VIAJE en bloque TK; el viaje sigue en packing col N_VIAJE). Luego hora/placa y resto. */
function getThermokingFlatHeaders() {
  return [
    'FECHA_INSPECCION_THERMOKING',
    'RESPONSABLE_THERMOKING',
    'HORA_SALIDA_THERMOKING',
    'PLACA_THERMOKING',
    'THERMOKING_TIEMPO_INGRESO_CAMARA',
    'THERMOKING_TIEMPO_SALIDA_CAMARA',
    'THERMOKING_TIEMPO_INICIO_TRASLADO',
    'THERMOKING_TIEMPO_DESPACHO',
    'THERMOKING_PESO_INGRESO_CAMARA',
    'THERMOKING_PESO_SALIDA_TRASLADO',
    'THERMOKING_PESO_INICIO_TRASLADO',
    'THERMOKING_PESO_DESPACHO',
    'THERMOKING_TEMP_IC_CM',
    'THERMOKING_TEMP_IC_PULPA',
    'THERMOKING_TEMP_ST_CM',
    'THERMOKING_TEMP_ST_PULPA',
    'THERMOKING_TEMP_TRASLADO_AMB',
    'THERMOKING_TEMP_TRASLADO_VEHICULO',
    'THERMOKING_TEMP_TRASLADO_PULPA',
    'THERMOKING_TEMP_DESPACHO_AMB',
    'THERMOKING_TEMP_DESPACHO_VEHICULO',
    'THERMOKING_TEMP_DESPACHO_PULPA',
    'THERMOKING_HUM_INGRESO_CAMARA',
    'THERMOKING_HUM_SALIDA_TRASLADO',
    'THERMOKING_HUM_AMB_EXT_INICIO',
    'THERMOKING_HUM_INT_VEH_INICIO',
    'THERMOKING_HUM_AMB_EXT_DESPACHO',
    'THERMOKING_HUM_INT_VEH_DESPACHO',
    'THERMOKING_PRESION_INGRESO_CAMARA',
    'THERMOKING_PRESION_SALIDA_TRASLADO',
    'THERMOKING_PRESION_AMB_EXT_INICIO',
    'THERMOKING_PRESION_INT_VEH_INICIO',
    'THERMOKING_PRESION_AMB_EXT_DESPACHO',
    'THERMOKING_PRESION_INT_VEH_DESPACHO',
    'THERMOKING_VAPOR_INGRESO_CAMARA',
    'THERMOKING_VAPOR_SALIDA_CAMARA',
    'THERMOKING_VAPOR_INICIO_TRASLADO',
    'THERMOKING_VAPOR_SALIDA_TRASLADO',
    'THERMOKING_OBSERVACION'
  ];
}

/** Recepción C5: 2 meta + mismos 36 campos de datos que una fila packing (sin JSON). */
function getC5FlatHeaders() {
  return [
    'HORA_INICIO_RECEPCION_C5',
    'RESPONSABLE_C5',
    'C5_RECEPCION',
    'C5_INGRESO_GASIFICADO',
    'C5_SALIDA_GASIFICADO',
    'C5_INGRESO_PREFRIO',
    'C5_SALIDA_PREFRIO',
    'C5_PESO_RECEPCION',
    'C5_PESO_INGRESO_GASIFICADO',
    'C5_PESO_SALIDA_GASIFICADO',
    'C5_PESO_INGRESO_PREFRIO',
    'C5_PESO_SALIDA_PREFRIO',
    'C5_T_AMB_RECEP',
    'C5_T_PULP_RECEP',
    'C5_T_AMB_ING',
    'C5_T_PULP_ING',
    'C5_T_AMB_SAL',
    'C5_T_PULP_SAL',
    'C5_T_AMB_PRE_IN',
    'C5_T_PULP_PRE_IN',
    'C5_T_AMB_PRE_OUT',
    'C5_T_PULP_PRE_OUT',
    'C5_HUMEDAD_RECEPCION',
    'C5_HUMEDAD_INGRESO_GASIFICADO',
    'C5_HUMEDAD_SALIDA_GASIFICADO',
    'C5_HUMEDAD_INGRESO_PREFRIO',
    'C5_HUMEDAD_SALIDA_PREFRIO',
    'C5_PRESION_AMB_RECEPCION',
    'C5_PRESION_AMB_INGRESO_GASIFICADO',
    'C5_PRESION_AMB_SALIDA_GASIFICADO',
    'C5_PRESION_AMB_INGRESO_PREFRIO',
    'C5_PRESION_AMB_SALIDA_PREFRIO',
    'C5_PRESION_FRUTA_RECEPCION',
    'C5_PRESION_FRUTA_INGRESO_GASIFICADO',
    'C5_PRESION_FRUTA_SALIDA_GASIFICADO',
    'C5_PRESION_FRUTA_INGRESO_PREFRIO',
    'C5_PRESION_FRUTA_SALIDA_PREFRIO',
    'C5_OBSERVACION'
  ];
}

function strCell_(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

/** Normaliza NUM_MUESTRA para comparaciones globales (trim + mayúsculas). */
function normalizarNumMuestraClave(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim().split('·')[0].trim().toUpperCase();
}

/** Extrae NUM_MUESTRA desde una fila POST (expandida o normal). */
function extraerNumMuestraDesdeRowPost_(row) {
  if (!Array.isArray(row) || row.length < 3) return '';
  return normalizarNumMuestraClave(row[2]);
}

/**
 * Busca si existe NUM_MUESTRA en la hoja (col C) y devuelve detalle.
 * Retorna null si no existe.
 */
function buscarDuplicadoNumMuestraEnHoja_(sheet, numMuestraNorm) {
  var nm = normalizarNumMuestraClave(numMuestraNorm);
  if (!nm) return null;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var vals = sheet.getRange(2, 1, lastRow - 1, 14).getValues(); // FECHA, ... , NUM_MUESTRA(col3), ... , ENSAYO_NUMERO(col14)
  for (var i = 0; i < vals.length; i++) {
    var rowNm = normalizarNumMuestraClave(vals[i][2]);
    if (!rowNm || rowNm !== nm) continue;
    return {
      num_muestra: nm,
      fecha: formatFechaPacking(vals[i][0]) || '',
      ensayo_numero: (vals[i][13] != null && vals[i][13] !== '') ? String(vals[i][13]).trim() : ''
    };
  }
  return null;
}

/** True si alguna celda del array (una fila de getValues) tiene texto no vacío. */
function rowHasAnyNonEmpty_(arr) {
  if (!arr || !arr.length) return false;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] != null && String(arr[i]).trim() !== '') return true;
  }
  return false;
}

/** True si en esa fila de hoja hay al menos un valor en el rango [startCol .. startCol+numCols-1]. */
function rangeRowHasAnyValue_(sheet, row, startCol, numCols) {
  if (numCols <= 0 || row < 2) return false;
  try {
    var vals = sheet.getRange(row, startCol, 1, numCols).getValues()[0];
    return rowHasAnyNonEmpty_(vals);
  } catch (e) {
    return false;
  }
}

function pickField_(arr, i, key) {
  if (!Array.isArray(arr) || i < 0 || i >= arr.length) return '';
  var o = arr[i];
  if (!o || typeof o !== 'object') return '';
  return strCell_(o[key]);
}

/** Fila Thermo King índice i (alineada a la fila de hoja i del mismo ensayo). */
function buildThermokingFlatRow(data, i) {
  var fiTk = (data.fecha_inspeccion_thermoking != null && String(data.fecha_inspeccion_thermoking).trim() !== '') ? String(data.fecha_inspeccion_thermoking).trim() : '';
  if (!fiTk && data.fecha_inspeccion != null) fiTk = String(data.fecha_inspeccion).trim();
  var respTk = (data.responsable_thermoking != null && String(data.responsable_thermoking).trim() !== '') ? String(data.responsable_thermoking).trim() : '';
  if (!respTk && data.responsable != null) respTk = String(data.responsable).trim();
  var hora = (data.hora_salida_thermoking != null) ? String(data.hora_salida_thermoking).trim() : '';
  var placa = (data.placa_thermoking != null) ? String(data.placa_thermoking).trim() : '';
  var t = data.thermoking_tiempos || [];
  var p = data.thermoking_peso || [];
  var tem = data.thermoking_temp || [];
  var h = data.thermoking_humedad_tk || data.thermoking_humedad || [];
  var pr = data.thermoking_presion_tk || data.thermoking_presion || [];
  var v = data.thermoking_vapor || [];
  var obs = data.thermoking_obs || [];
  return [
    fiTk,
    respTk,
    hora,
    placa,
    pickField_(t, i, 'ic'),
    pickField_(t, i, 'st'),
    pickField_(t, i, 'it'),
    pickField_(t, i, 'dp'),
    pickField_(p, i, 'ic'),
    pickField_(p, i, 'st'),
    pickField_(p, i, 'it'),
    pickField_(p, i, 'dp'),
    pickField_(tem, i, 'ic_cm'),
    pickField_(tem, i, 'ic_pu'),
    pickField_(tem, i, 'st_cm'),
    pickField_(tem, i, 'st_pu'),
    pickField_(tem, i, 'it_amb'),
    pickField_(tem, i, 'it_veh'),
    pickField_(tem, i, 'it_pu'),
    pickField_(tem, i, 'd_amb'),
    pickField_(tem, i, 'd_veh'),
    pickField_(tem, i, 'd_pu'),
    pickField_(h, i, 'ic'),
    pickField_(h, i, 'st'),
    pickField_(h, i, 'aei'),
    pickField_(h, i, 'ivi'),
    pickField_(h, i, 'aed'),
    pickField_(h, i, 'ivd'),
    pickField_(pr, i, 'ic'),
    pickField_(pr, i, 'st'),
    pickField_(pr, i, 'aei'),
    pickField_(pr, i, 'ivi'),
    pickField_(pr, i, 'aed'),
    pickField_(pr, i, 'ivd'),
    pickField_(v, i, 'ic'),
    pickField_(v, i, 'scm'),
    pickField_(v, i, 'it'),
    pickField_(v, i, 'st'),
    pickField_(obs, i, 'observacion')
  ];
}

/** Fila Recepción C5 índice i (packing1_c5 … packing8_c5). */
function buildC5FlatRow(data, i) {
  var hora = (data.hora_inicio_recepcion_c5 != null) ? String(data.hora_inicio_recepcion_c5).trim() : '';
  var responsableC5 = '';
  if (data.responsable_c5 != null && String(data.responsable_c5).trim() !== '') {
    responsableC5 = String(data.responsable_c5).trim();
  } else if (data.placa_c5 != null) {
    responsableC5 = String(data.placa_c5).trim();
  }
  var p1 = data.packing1_c5 || data.c5_tiempos || [];
  var p2 = data.packing2_c5 || data.c5_peso || [];
  var p3 = data.packing3_c5 || data.c5_temp || [];
  var p4 = data.packing4_c5 || data.c5_humedad || [];
  var p5 = data.packing5_c5 || data.c5_presion || [];
  var p6 = data.packing6_c5 || data.c5_presion_fruta || [];
  var p8 = data.packing8_c5 || data.c5_obs || [];
  return [
    hora,
    responsableC5,
    pickField_(p1, i, 'recepcion'),
    pickField_(p1, i, 'ingreso_gasificado'),
    pickField_(p1, i, 'salida_gasificado'),
    pickField_(p1, i, 'ingreso_prefrio'),
    pickField_(p1, i, 'salida_prefrio'),
    pickField_(p2, i, 'peso_recepcion'),
    pickField_(p2, i, 'peso_ingreso_gasificado'),
    pickField_(p2, i, 'peso_salida_gasificado'),
    pickField_(p2, i, 'peso_ingreso_prefrio'),
    pickField_(p2, i, 'peso_salida_prefrio'),
    pickField_(p3, i, 't_amb_recep'),
    pickField_(p3, i, 't_pulp_recep'),
    pickField_(p3, i, 't_amb_ing'),
    pickField_(p3, i, 't_pulp_ing'),
    pickField_(p3, i, 't_amb_sal'),
    pickField_(p3, i, 't_pulp_sal'),
    pickField_(p3, i, 't_amb_pre_in'),
    pickField_(p3, i, 't_pulp_pre_in'),
    pickField_(p3, i, 't_amb_pre_out'),
    pickField_(p3, i, 't_pulp_pre_out'),
    pickField_(p4, i, 'recepcion'),
    pickField_(p4, i, 'ingreso_gasificado'),
    pickField_(p4, i, 'salida_gasificado'),
    pickField_(p4, i, 'ingreso_prefrio'),
    pickField_(p4, i, 'salida_prefrio'),
    pickField_(p5, i, 'recepcion'),
    pickField_(p5, i, 'ingreso_gasificado'),
    pickField_(p5, i, 'salida_gasificado'),
    pickField_(p5, i, 'ingreso_prefrio'),
    pickField_(p5, i, 'salida_prefrio'),
    pickField_(p6, i, 'recepcion'),
    pickField_(p6, i, 'ingreso_gasificado'),
    pickField_(p6, i, 'salida_gasificado'),
    pickField_(p6, i, 'ingreso_prefrio'),
    pickField_(p6, i, 'salida_prefrio'),
    pickField_(p8, i, 'observacion')
  ];
}

function doPost(e) {
  function out(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
  if (!e || !e.postData || !e.postData.contents) {
    return out({ ok: false, error: "Sin datos POST" });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return out({ ok: false, error: "Servidor ocupado, reintenta" });
  }

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = JSON.parse(e.postData.contents);

    if (data.mode === 'packing') {
      var packingResult = doPostPacking(sheet, data);
      return out(packingResult);
    }
    if (data.mode === 'recepcion-c5' || data.mode === 'recepcion_c5') {
      var c5Result = doPostRecepcionC5(sheet, data);
      return out(c5Result);
    }

    const rows = data.rows || [];
    const uid = data.uid || null;

    if (rows.length === 0) {
      return out({ ok: false, error: "Sin filas" });
    }

    // Validación rápida y directa: NUM_MUESTRA es único globalmente en la columna C.
    // Si existe, se rechaza inmediatamente y NO se intenta registrar.
    var vistosPost = {};
    for (var ri = 0; ri < rows.length; ri++) {
      var nmPost = extraerNumMuestraDesdeRowPost_(rows[ri]);
      if (!nmPost) continue;
      if (vistosPost[nmPost]) {
        return out({
          ok: false,
          code: "DUPLICATE_NUM_MUESTRA",
          error: "NUM_MUESTRA repetido en el envío. Debes cambiar el N° muestra."
        });
      }
      vistosPost[nmPost] = true;
      var dupNm = buscarDuplicadoNumMuestraEnHoja_(sheet, nmPost);
      if (dupNm) {
        return out({
          ok: false,
          code: "DUPLICATE_NUM_MUESTRA",
          error: "NUM_MUESTRA ya existe en la columna NUM_MUESTRA. Debes cambiar el N° muestra.",
          num_muestra: dupNm.num_muestra,
          fecha: dupNm.fecha,
          ensayo_numero: dupNm.ensayo_numero
        });
      }
    }

    if (uid) {
      var props = PropertiesService.getScriptProperties();
      var keyUid = "mtpp_uid_" + uid;
      if (props.getProperty(keyUid) === "1") {
        return out({
          ok: true,
          received: rows.length,
          inserted: 0,
          duplicate: true,
          message: "Registro ya procesado anteriormente (evitado duplicado)"
        });
      }
    }

    asegurarEncabezadoHoja1Registro_(sheet);

    const NUM_COLS = NUM_COLS_REGISTRO;
    /** Fila expandida 52: pos. 0–19 + 20–25 (Hoja2) + 26–51 → 46 col Hoja1. */

    function normalizarParaClave(v) {
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return Utilities.formatDate(v, "America/Santiago", "yyyy-MM-dd");
      var s = String(v).trim();
      return s;
    }
    /** Misma lógica que "antes": anti-duplicado por los 46 valores de la fila (normalizados), sin clave abreviada. */
    function buildKey(row) {
      return row.slice(0, NUM_COLS).map(normalizarParaClave).join("||");
    }

    var lastRow = sheet.getLastRow();
    var existingKeys = {};
    if (lastRow >= 2) {
      var existingValues = sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
      existingValues.forEach(function(r) {
        var key = buildKey(r);
        if (key) existingKeys[key] = true;
      });
    }

    function celdaAString(cell) {
      if (cell === null || cell === undefined) return "";
      return String(cell);
    }

    /** 52 celdas: 20 inicio Hoja1 + 6 (Hoja2) + 26 cierre → 46 col Hoja1 (mismo corte que toRow46 "antes"). */
    function toRowRegistro(row) {
      var minLen = 52;
      while (row.length < minLen) row.push("");
      var a = row.slice(0, 20).concat(row.slice(26, 52));
      return a.slice(0, NUM_COLS).map(celdaAString);
    }

    function rowHoja2(fila, rowOriginal) {
      var c = celdaAString;
      var out = [c(fila[0]), c(fila[13]), c(fila[15]), '', '', '', '', '', ''];
      /** Hueco 20-25: Cosecha + Trasvasado desde el panel de jarras (POST 52 celdas). */
      if (rowOriginal && rowOriginal.length >= 26) {
        out[3] = c(rowOriginal[20]);
        out[4] = c(rowOriginal[21]);
        out[5] = c(rowOriginal[22]);
        out[6] = c(rowOriginal[23]);
        out[7] = c(rowOriginal[24]);
        out[8] = c(rowOriginal[25]);
      }
      return out;
    }

    function esCero(v) {
      if (v === null || v === undefined) return true;
      var s = String(v).trim();
      if (s === '') return true;
      var n = parseFloat(s.replace(',', '.'));
      return isNaN(n) || n === 0;
    }

    var minExpanded = 52;
    var nuevasFilas = [];
    var filasHoja2 = [];
    rows.forEach(function(row) {
      var fila = row.length >= minExpanded ? toRowRegistro(row) : (function() { while (row.length < NUM_COLS) row.push(""); return row.slice(0, NUM_COLS).map(celdaAString); })();
      var key = buildKey(fila);
      if (existingKeys[key]) return;
      existingKeys[key] = true;
      filasHoja2.push(rowHoja2(fila, row.length >= minExpanded ? row : null));
      if (!esCero(fila[14]) && !esCero(fila[16]) && !esCero(fila[17])) nuevasFilas.push(fila);
    });

    lastRow = sheet.getLastRow();
    existingKeys = {};
    if (lastRow >= 2) {
      existingValues = sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
      existingValues.forEach(function(r) {
        var key = buildKey(r);
        if (key) existingKeys[key] = true;
      });
      var filtradas = [];
      nuevasFilas.forEach(function(fila) {
        var key = buildKey(fila);
        if (existingKeys[key]) return;
        filtradas.push(fila);
        existingKeys[key] = true;
      });
      nuevasFilas = filtradas;
    }

    if (nuevasFilas.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      var numRows = nuevasFilas.length;
      // NUM_MUESTRA (col 3) debe mantenerse como texto para conservar ceros a la izquierda (ej: 0001).
      sheet.getRange(startRow, 3, numRows, 1).setNumberFormat('@');
      sheet.getRange(startRow, 1, numRows, NUM_COLS).setValues(nuevasFilas);
    }
    if (filasHoja2.length > 0) {
      var sheet2 = SpreadsheetApp.getActiveSpreadsheet().getSheets()[1];
      if (sheet2) {
        if (sheet2.getLastRow() === 0) {
          sheet2.appendRow(["FECHA", "ENSAYO_NUMERO", "N_JARRA", "INICIO_C", "TERMINO_C", "MIN_C", "INICIO_T", "TERMINO_T", "MIN_T"]);
        }
        var startRow2 = sheet2.getLastRow() + 1;
        sheet2.getRange(startRow2, 1, filasHoja2.length, 9).setValues(filasHoja2);
      }
    }

    if (nuevasFilas.length === 0 && rows.length > 0) {
      return out({
        ok: false,
        error: "No se insertó ninguna fila: todas coinciden con registros ya existentes (clave duplicada).",
        duplicate: true
      });
    }

    if (uid) {
      PropertiesService.getScriptProperties().setProperty("mtpp_uid_" + uid, "1");
      limpiarUidsAntiguos();
    }

    return out({
      ok: true,
      received: rows.length,
      inserted: nuevasFilas.length,
      message: "Registro exitoso"
    });

  } catch (error) {
    return out({ ok: false, error: error.toString() });
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {}
  }
}

function safeJson(val) {
  try {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    return JSON.stringify(val);
  } catch (_) {
    return '';
  }
}

function limpiarUidsAntiguos() {
  try {
    var props = PropertiesService.getScriptProperties();
    var all = props.getProperties();
    var keys = [];
    for (var k in all) {
      if (k.indexOf("mtpp_uid_") === 0) keys.push(k);
    }
    if (keys.length <= 500) return;
    keys.sort();
    var eliminar = keys.length - 500;
    for (var i = 0; i < eliminar; i++) {
      props.deleteProperty(keys[i]);
    }
  } catch (e) {}
}

function formatFechaPacking(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) return Utilities.formatDate(val, "GMT", "yyyy-MM-dd");
  var s = String(val).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var d = null;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    var parts = s.split('/');
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var year = parseInt(parts[2], 10);
    if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) d = new Date(year, month, day);
  } else if (s.indexOf('GMT') >= 0 || /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/.test(s)) d = new Date(s);
  if (d && !isNaN(d.getTime())) return Utilities.formatDate(d, "GMT", "yyyy-MM-dd");
  return s;
}

function getPackingHeaderNamesPerRow() {
  return [
    'RECEPCION', 'INGRESO_GASIFICADO', 'SALIDA_GASIFICADO', 'INGRESO_PREFRIO', 'SALIDA_PREFRIO',
    'PESO_RECEPCION', 'PESO_INGRESO_GASIFICADO', 'PESO_SALIDA_GASIFICADO', 'PESO_INGRESO_PREFRIO', 'PESO_SALIDA_PREFRIO',
    'T_AMB_RECEP', 'T_PULP_RECEP', 'T_AMB_ING', 'T_PULP_ING', 'T_AMB_SAL', 'T_PULP_SAL', 'T_AMB_PRE_IN', 'T_PULP_PRE_IN', 'T_AMB_PRE_OUT', 'T_PULP_PRE_OUT',
    'HUMEDAD_RECEPCION', 'HUMEDAD_INGRESO_GASIFICADO', 'HUMEDAD_SALIDA_GASIFICADO', 'HUMEDAD_INGRESO_PREFRIO', 'HUMEDAD_SALIDA_PREFRIO',
    'PRESION_AMB_RECEPCION', 'PRESION_AMB_INGRESO_GASIFICADO', 'PRESION_AMB_SALIDA_GASIFICADO', 'PRESION_AMB_INGRESO_PREFRIO', 'PRESION_AMB_SALIDA_PREFRIO',
    'PRESION_FRUTA_RECEPCION', 'PRESION_FRUTA_INGRESO_GASIFICADO', 'PRESION_FRUTA_SALIDA_GASIFICADO', 'PRESION_FRUTA_INGRESO_PREFRIO', 'PRESION_FRUTA_SALIDA_PREFRIO',
    'OBSERVACION'
  ];
}

function getPackingHeaderNames(numFilas) {
  var out = ['HORA_RECEPCION', 'N_VIAJE'];
  var base = getPackingHeaderNamesPerRow();
  for (var f = 1; f <= numFilas; f++) {
    var suffix = '_' + f;
    for (var i = 0; i < base.length; i++) out.push(base[i] + suffix);
  }
  return out;
}

function doPostPacking(sheet, data) {
  try {
    var guardarPacking = (data.guardar_packing === false || data.guardar_packing === 'false') ? false : true;
    var actualizarC5 = (data.actualizar_c5 === false || data.actualizar_c5 === 'false') ? false : true;

    var fecha = (data.fecha != null && data.fecha !== '') ? String(data.fecha).trim() : '';
    var ensayoNumero = (data.ensayo_numero != null && data.ensayo_numero !== '') ? String(data.ensayo_numero).trim() : '';
    var fechaInspeccion = (data.fecha_inspeccion != null && data.fecha_inspeccion !== '') ? String(data.fecha_inspeccion).trim() : '';
    var responsable = (data.responsable != null && data.responsable !== '') ? String(data.responsable).trim() : '';
    var horaRecepcion = (data.hora_recepcion != null && data.hora_recepcion !== '') ? String(data.hora_recepcion).trim() : '';
    var nViaje = (data.n_viaje != null && data.n_viaje !== '') ? String(data.n_viaje).trim() : '';
    var packingRows = data.packingRows || [];

    if (!fecha || !ensayoNumero) {
      return { ok: false, error: 'Faltan fecha o ensayo_numero' };
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { ok: false, error: 'No hay datos en la hoja' };
    }

    var dataRows = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
    var rowIndices = [];
    for (var k = 0; k < dataRows.length; k++) {
      var r = dataRows[k];
      var rowFechaStr = formatFechaPacking(r[0]);
      var rowEn = (r[13] != null && r[13] !== '') ? String(r[13]).trim() : '';
      if (rowFechaStr === fecha && rowEn === ensayoNumero) {
        rowIndices.push(2 + k);
      }
    }
    if (rowIndices.length === 0) {
      return { ok: false, error: 'No se encontró ninguna fila para esa fecha y ensayo' };
    }

    var primeraFila = rowIndices[0];
    var packingYaExiste = rangeRowHasAnyValue_(sheet, primeraFila, PACKING_START_COL, PACKING_COLS);
    var guardarThermoking;
    if (data.guardar_thermoking === false || data.guardar_thermoking === 'false') guardarThermoking = false;
    else if (data.guardar_thermoking === true || data.guardar_thermoking === 'true') guardarThermoking = true;
    else guardarThermoking = packingYaExiste ? false : true;

    if (packingYaExiste) {
      if (actualizarC5) {
        var c5HeadersMerge = getC5FlatHeaders();
        sheet.getRange(1, C5_START_COL, 1, c5HeadersMerge.length).setValues([c5HeadersMerge]);
        for (var cm = 0; cm < rowIndices.length; cm++) {
          var c5Merge = buildC5FlatRow(data, cm);
          sheet.getRange(rowIndices[cm], C5_START_COL, 1, c5Merge.length).setValues([c5Merge]);
        }
      }
      if (guardarThermoking) {
        var tkHeadersMerge = getThermokingFlatHeaders();
        sheet.getRange(1, THERMOKING_START_COL, 1, tkHeadersMerge.length).setValues([tkHeadersMerge]);
        for (var tix = 0; tix < rowIndices.length; tix++) {
          var termoMerge = buildThermokingFlatRow(data, tix);
          sheet.getRange(rowIndices[tix], THERMOKING_START_COL, 1, termoMerge.length).setValues([termoMerge]);
        }
      }
      if (!actualizarC5 && !guardarThermoking) {
        return { ok: false, error: 'Nada que actualizar (packing ya en hoja; sin C5 ni Thermo King)' };
      }
      return {
        ok: true,
        message: 'Actualización en ' + rowIndices.length + ' fila(s) (packing existente; C5/Thermo según flags)',
        filasEscritas: rowIndices.length,
        mergeSoloC5: actualizarC5
      };
    }

    var startCol = PACKING_START_COL;
    var COLS_POR_FILA = 4 + 36;
    var baseHeaders = ['FECHA_INSPECCION', 'RESPONSABLE', 'HORA_RECEPCION', 'N_VIAJE'].concat(getPackingHeaderNamesPerRow());

    if (guardarPacking) {
      for (var i = 0; i < packingRows.length && i < rowIndices.length; i++) {
        var row = packingRows[i];
        var filaHoja = rowIndices[i];
        var valores = [fechaInspeccion, responsable, horaRecepcion, nViaje];
        if (Array.isArray(row)) {
          for (var j = 0; j < 36; j++) {
            valores.push((j < row.length && row[j] != null && row[j] !== '') ? row[j] : '');
          }
        } else {
          for (var j = 0; j < 36; j++) valores.push('');
        }
        sheet.getRange(filaHoja, startCol, 1, COLS_POR_FILA).setValues([valores]);
      }
      sheet.getRange(1, startCol, 1, baseHeaders.length).setValues([baseHeaders]);
    }

    if (guardarThermoking) {
      var tkHeaders = getThermokingFlatHeaders();
      sheet.getRange(1, THERMOKING_START_COL, 1, tkHeaders.length).setValues([tkHeaders]);
      for (var ti = 0; ti < rowIndices.length; ti++) {
        var termoVals = buildThermokingFlatRow(data, ti);
        sheet.getRange(rowIndices[ti], THERMOKING_START_COL, 1, termoVals.length).setValues([termoVals]);
      }
    }

    if (actualizarC5) {
      var c5Headers = getC5FlatHeaders();
      sheet.getRange(1, C5_START_COL, 1, c5Headers.length).setValues([c5Headers]);
      for (var ci = 0; ci < rowIndices.length; ci++) {
        var c5ValsPacking = buildC5FlatRow(data, ci);
        sheet.getRange(rowIndices[ci], C5_START_COL, 1, c5ValsPacking.length).setValues([c5ValsPacking]);
      }
    }

    if (!guardarPacking && !guardarThermoking && !actualizarC5) {
      return { ok: false, error: 'Nada que escribir (guardar_packing, guardar_thermoking y actualizar_c5 en false)' };
    }

    return {
      ok: true,
      message: 'Guardado en ' + rowIndices.length + ' fila(s) (Packing/Thermo/C5 según flags)',
      filasEscritas: rowIndices.length,
      packingMuestras: packingRows.length
    };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function doPostRecepcionC5(sheet, data) {
  try {
    var fecha = (data.fecha != null && data.fecha !== '') ? String(data.fecha).trim() : '';
    var ensayoNumero = (data.ensayo_numero != null && data.ensayo_numero !== '') ? String(data.ensayo_numero).trim() : '';
    if (!fecha || !ensayoNumero) return { ok: false, error: 'Faltan fecha o ensayo_numero' };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { ok: false, error: 'No hay datos en la hoja' };

    var dataRows = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
    var rowIndices = [];
    for (var k = 0; k < dataRows.length; k++) {
      var r = dataRows[k];
      var rowFechaStr = formatFechaPacking(r[0]);
      var rowEn = (r[13] != null && r[13] !== '') ? String(r[13]).trim() : '';
      if (rowFechaStr === fecha && rowEn === ensayoNumero) rowIndices.push(2 + k);
    }
    if (rowIndices.length === 0) return { ok: false, error: 'No se encontró ninguna fila para esa fecha y ensayo' };

    var c5Headers = getC5FlatHeaders();
    sheet.getRange(1, C5_START_COL, 1, c5Headers.length).setValues([c5Headers]);

    for (var ci = 0; ci < rowIndices.length; ci++) {
      var c5Vals = buildC5FlatRow(data, ci);
      sheet.getRange(rowIndices[ci], C5_START_COL, 1, c5Vals.length).setValues([c5Vals]);
    }
    return { ok: true, message: 'Recepción C5 guardada', fila: rowIndices[0], filasEscritas: rowIndices.length };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function doGet(e) {
  var result = { ok: false, data: null, error: null, fechas: null, ensayos: null };
  try {
    var params = e && e.parameter ? e.parameter : {};
    var fechaParam = (params.fecha || '').toString().trim();
    var ensayoNumero = (params.ensayo_numero || '').toString().trim();
    var callback = (params.callback || '').toString().trim();
    if (!/^[a-zA-Z0-9_]+$/.test(callback)) callback = '';

    function returnOutput(obj) {
      if (callback) return outputJsonp(obj, callback);
      return outputJson(obj);
    }

    // Confirmación ultra-rápida por UID (usa ScriptProperties, sin escanear hoja).
    var existeUid = (params.existe_uid || '').toString().trim() === '1';
    var uidParam = (params.uid || '').toString().trim();
    var existeNumMuestraGlobal = (params.existe_num_muestra_global || '').toString().trim() === '1';
    var numMuestraParam = (params.num_muestra || '').toString().trim();
    if (existeUid) {
      if (!uidParam) {
        result.error = 'Falta parámetro: uid';
        return returnOutput(result);
      }
      var props = PropertiesService.getScriptProperties();
      var keyUid = "mtpp_uid_" + uidParam;
      result.ok = true;
      result.existe = (props.getProperty(keyUid) === "1");
      result.uid = uidParam;
      return returnOutput(result);
    }

    // Validación rápida para NUM_MUESTRA global (columna C).
    // Se atiende antes de otras lecturas para responder más rápido.
    if (existeNumMuestraGlobal) {
      if (!numMuestraParam) {
        result.error = 'Falta parámetro: num_muestra';
        return returnOutput(result);
      }
      var sheetNm = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      var lastRowNm = sheetNm.getLastRow();
      var numMuestraBaseParam = normalizarNumMuestraClave(numMuestraParam);
      if (lastRowNm < 2) {
        result.ok = true;
        result.existe = false;
        result.num_muestra = numMuestraBaseParam;
        return returnOutput(result);
      }
      var dataNm = sheetNm.getRange(2, 1, lastRowNm - 1, 14).getValues();
      for (var ni = 0; ni < dataNm.length; ni++) {
        var nmBase = normalizarNumMuestraClave(dataNm[ni][2]);
        if (nmBase && nmBase === numMuestraBaseParam) {
          var fNm = formatFechaPacking(dataNm[ni][0]);
          var enNm = dataNm[ni][13];
          var enNmStr = (enNm !== null && enNm !== undefined && enNm !== '') ? (Number(enNm) === Math.floor(Number(enNm)) ? String(Number(enNm)) : String(enNm).trim()) : '';
          result.ok = true;
          result.existe = true;
          result.num_muestra = numMuestraBaseParam;
          result.fecha = fNm || '';
          result.ensayo_numero = enNmStr;
          return returnOutput(result);
        }
      }
      result.ok = true;
      result.existe = false;
      result.num_muestra = numMuestraBaseParam;
      return returnOutput(result);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      result.error = 'No hay datos en la hoja';
      return returnOutput(result);
    }

    var data = sheet.getRange(2, 1, lastRow, 20).getValues();

    function formatFecha(val) {
      if (val === null || val === undefined || val === '') return '';
      if (val instanceof Date) return Utilities.formatDate(val, "GMT", "yyyy-MM-dd");
      var s = String(val).trim();
      if (!s) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      var d = null;
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        var parts = s.split('/');
        var day = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10) - 1;
        var year = parseInt(parts[2], 10);
        if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          d = new Date(year, month, day);
        }
      } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
        var parts2 = s.split('-');
        day = parseInt(parts2[0], 10);
        month = parseInt(parts2[1], 10) - 1;
        year = parseInt(parts2[2], 10);
        if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          d = new Date(year, month, day);
        }
      } else if (s.indexOf('GMT') >= 0 || /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/.test(s)) {
        d = new Date(s);
      }
      if (d && !isNaN(d.getTime())) return Utilities.formatDate(d, "GMT", "yyyy-MM-dd");
      return s;
    }
    var fecha = (fechaParam && formatFecha(fechaParam)) ? formatFecha(fechaParam) : fechaParam;

    var listadoReg = (params.listado_registrados || '').toString().trim() === '1';
    if (listadoReg) {
      var registrados = [];
      for (var i = 0; i < data.length; i++) {
        var r = data[i];
        var f = formatFecha(r[0]);
        var en = r[13];
        var enStr = (en !== null && en !== undefined && en !== '') ? (Number(en) === Math.floor(Number(en)) ? String(Number(en)) : String(en).trim()) : '';
        var nom = (r[1] != null && r[1] !== undefined && String(r[1]).trim() !== '') ? String(r[1]).trim() : ('Ensayo ' + enStr);
        var numMuestra = (r[2] != null && r[2] !== undefined) ? String(r[2]).trim() : '';
        var nClamshell = (r[14] != null && r[14] !== undefined) ? String(r[14]).trim() : '';
        if (!f || enStr === '') continue;
        registrados.push({
          fecha: f,
          ensayo_numero: enStr,
          ensayo_nombre: nom,
          num_muestra: numMuestra,
          n_clamshell: nClamshell
        });
      }
      result.ok = true;
      result.registrados = registrados;
      return returnOutput(result);
    }

    if (!fecha && !ensayoNumero) {
      var fechasSet = {};
      for (var i = 0; i < data.length; i++) {
        var f = formatFecha(data[i][0]);
        if (f) fechasSet[f] = true;
      }
      var fechasList = Object.keys(fechasSet).sort().reverse();
      result.ok = true;
      result.fechas = fechasList;
      return returnOutput(result);
    }

    if (fecha && !ensayoNumero) {
      var c5NumColsLista = getC5FlatHeaders().length;
      var packingBlock = (lastRow >= 2) ? sheet.getRange(2, PACKING_START_COL, lastRow, PACKING_COLS).getValues() : [];
      var tkBlock = (lastRow >= 2) ? sheet.getRange(2, THERMOKING_START_COL, lastRow, THERMOKING_COLS).getValues() : [];
      var c5Block = (lastRow >= 2) ? sheet.getRange(2, C5_START_COL, lastRow, c5NumColsLista).getValues() : [];
      var ensayosInfo = {};
      for (var j = 0; j < data.length; j++) {
        var rowFechaStr = formatFecha(data[j][0]);
        if (rowFechaStr === fecha) {
          var en = String(data[j][13] || '').trim();
          if (en) {
            if (!ensayosInfo[en]) ensayosInfo[en] = { tieneVisual: false, tienePacking: false, tieneRecepcionC5: false, tieneThermoKing: false };
            ensayosInfo[en].tieneVisual = true;
            if (packingBlock[j] && rowHasAnyNonEmpty_(packingBlock[j])) ensayosInfo[en].tienePacking = true;
            if (c5Block[j] && rowHasAnyNonEmpty_(c5Block[j])) ensayosInfo[en].tieneRecepcionC5 = true;
            if (tkBlock[j] && rowHasAnyNonEmpty_(tkBlock[j])) ensayosInfo[en].tieneThermoKing = true;
          }
        }
      }
      var ensayosList = Object.keys(ensayosInfo).sort();
      result.ok = true;
      result.ensayos = ensayosList;
      result.ensayosConVisual = {};
      result.ensayosConPacking = {};
      result.ensayosConC5 = {};
      result.ensayosConThermoKing = {};
      ensayosList.forEach(function (e) { result.ensayosConVisual[e] = ensayosInfo[e].tieneVisual; });
      ensayosList.forEach(function (e) { result.ensayosConPacking[e] = ensayosInfo[e].tienePacking; });
      ensayosList.forEach(function (e) { result.ensayosConC5[e] = ensayosInfo[e].tieneRecepcionC5; });
      ensayosList.forEach(function (e) { result.ensayosConThermoKing[e] = ensayosInfo[e].tieneThermoKing; });
      return returnOutput(result);
    }

    var existeRegistro = (params.existe_registro || '').toString().trim() === '1';
    if (existeRegistro && fecha && ensayoNumero) {
      var enNorm = ensayoNumero;
      var numEn = Number(ensayoNumero);
      if (!isNaN(numEn) && numEn === Math.floor(numEn)) enNorm = String(numEn);
      for (var i = 0; i < data.length; i++) {
        var r = data[i];
        var rowFechaStr = formatFecha(r[0]);
        var rowEn = r[13];
        var rowEnStr = (rowEn !== null && rowEn !== undefined) ? (Number(rowEn) === Math.floor(Number(rowEn)) ? String(Number(rowEn)) : String(rowEn).trim()) : '';
        if (rowFechaStr === fecha && rowEnStr === enNorm) {
          result.ok = true;
          result.existe = true;
          result.ensayo_numero = enNorm;
          return returnOutput(result);
        }
      }
      result.ok = true;
      result.existe = false;
      return returnOutput(result);
    }

    if (!fecha || !ensayoNumero) {
      result.error = 'Faltan parámetros: fecha y ensayo_numero';
      return returnOutput(result);
    }

    var enNorm = (ensayoNumero !== null && ensayoNumero !== undefined && String(ensayoNumero).trim() !== '') ? (function () {
      var n = Number(ensayoNumero);
      return (!isNaN(n) && n === Math.floor(n)) ? String(n) : String(ensayoNumero).trim();
    })() : '';

    var row = null;
    var filaEnSheet = null;
    var numFilas = 0;
    var despachoPorFila = [];
    var tienePacking = false;
    var tieneRecepcionC5 = false;
    var tieneThermoKing = false;
    var c5NumColsDetalle = getC5FlatHeaders().length;
    for (var k = 0; k < data.length; k++) {
      var r = data[k];
      var rowFechaStr = formatFecha(r[0]);
      var rowEn = r[13];
      var rowEnStr = (rowEn !== null && rowEn !== undefined && rowEn !== '') ? (function () {
        var n = Number(rowEn);
        return (!isNaN(n) && n === Math.floor(n)) ? String(n) : String(rowEn).trim();
      })() : '';
      if (rowFechaStr === fecha && rowEnStr === enNorm) {
        if (row == null) {
          row = r;
          filaEnSheet = 2 + k;
        }
        numFilas++;
        var desp = r[19];
        var numDesp = (desp !== null && desp !== undefined && String(desp).trim() !== '') ? parseFloat(String(desp).replace(',', '.')) : NaN;
        despachoPorFila.push(!isNaN(numDesp) ? numDesp : null);
        var filaSheetK = 2 + k;
        if (rangeRowHasAnyValue_(sheet, filaSheetK, PACKING_START_COL, PACKING_COLS)) tienePacking = true;
        if (rangeRowHasAnyValue_(sheet, filaSheetK, C5_START_COL, c5NumColsDetalle)) tieneRecepcionC5 = true;
        if (rangeRowHasAnyValue_(sheet, filaSheetK, THERMOKING_START_COL, THERMOKING_COLS)) tieneThermoKing = true;
      }
    }

    if (!row) {
      result.error = 'No hay registro para esa fecha y ensayo';
      return returnOutput(result);
    }

    result.ok = true;
    result.data = {
      fila: filaEnSheet,
      numFilas: numFilas,
      tienePacking: tienePacking,
      tieneRecepcionC5: tieneRecepcionC5,
      tieneThermoKing: tieneThermoKing,
      despachoPorFila: despachoPorFila,
      ENSAYO_NOMBRE: row[1],
      NUM_MUESTRA: row[2],
      RESPONSABLE: row[3],
      ENSAYO_NUMERO: row[13],
      TRAZ_ETAPA: row[7],
      TRAZ_CAMPO: row[8],
      TRAZ_LIBRE: row[9],
      VARIEDAD: row[10],
      PLACA_VEHICULO: row[12],
      FUNDO: row[6],
      GUIA_REMISION: row[11]
    };
    return returnOutput(result);
  } catch (err) {
    result.error = err.toString();
    return returnOutput(result);
  }
}

function outputJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function outputJsonp(obj, callbackName) {
  var body = callbackName + '(' + JSON.stringify(obj) + ')';
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
