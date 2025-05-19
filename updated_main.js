const reservedWords = ['write', 'capture', 'if', 'then', 'end-if', 'and', 'or', 'not', 'end', 'while', 'end-while'];
const operadoresRelacionales = ['<', '>', '<=', '>=', '=', '<>'];
const operadoresLogicos = ['and', 'or', 'not'];

CodeMirror.defineMode("customMode", function() {
  return {
    token: function(stream) {
      if (stream.eatWhile(/\w+/)) {
        const cur = stream.current();
        if (reservedWords.includes(cur)) {
          return "keyword";
        }
      }
      stream.next();
      return null;
    }
  };
});

const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
  lineNumbers: true,
  mode: "customMode",
  theme: "default",
  extraKeys: { "Ctrl-Space": "autocomplete" }
});

function nuevoArchivo() {
  editor.setValue("");
  document.getElementById('output').textContent = '';
}

function abrirArchivo() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      editor.setValue(e.target.result);
    };
    reader.readAsText(file);
  };
  input.click();
}

function eliminarArchivo() {
  if (confirm("¿Seguro que quieres eliminar el contenido actual?")) {
    editor.setValue('');
    document.getElementById('output').textContent = 'Archivo eliminado';
  }
}


function descargarArchivo() {
  const contenido = editor.getValue();
  // Crear un campo de entrada para que el usuario ingrese el nombre del archivo
  const nombreArchivo = prompt("Ingresa el nombre del archivo (sin extensión):", "codigo");

  // Verificar si el usuario canceló la operación
  if (nombreArchivo === null) {
    // El usuario hizo clic en "Cancelar", no seguir con la descarga
    return;
  }

  // Si el usuario no ingresa un nombre, se asigna un nombre por defecto
  const archivoNombre = nombreArchivo.trim() !== "" ? nombreArchivo + ".txt" : "codigo.txt";
  
  const blob = new Blob([contenido], { type: 'text/plain' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = archivoNombre;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function verTokens() {
  const code = editor.getValue();
  const tokens = code.match(/\w+|\S/g) || [];
  const counts = {};
  tokens.forEach(t => counts[t] = (counts[t] || 0) + 1);
  let output = 'TOKENS:\n';
  for (const [token, count] of Object.entries(counts)) {
    output += `${token} : ${count}\n`;
  }
  output += `\nTOTAL DE TOKENS: ${tokens.length}`;
  document.getElementById('output').textContent = output;
}

// Función para verificar si los paréntesis están balanceados
function verificarParentesis(str) {
  const stack = [];
  // Ignorar el contenido entre comillas
  let enComillas = false;
  
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"' && (i === 0 || str[i-1] !== '\\')) {
      enComillas = !enComillas;
      continue;
    }
    
    if (!enComillas) {
      if (str[i] === '(') {
        stack.push('(');
      } else if (str[i] === ')') {
        if (stack.length === 0) return false;
        stack.pop();
      }
    }
  }
  
  // Si quedaron comillas sin cerrar
  if (enComillas) return false;
  
  return stack.length === 0;
}

// Función para verificar operadores adyacentes inválidos
function verificarOperadores(str) {
  // Ignorar contenido entre comillas
  let sinComillas = "";
  let enComillas = false;
  
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"' && (i === 0 || str[i-1] !== '\\')) {
      enComillas = !enComillas;
      continue;
    }
    
    if (!enComillas) {
      sinComillas += str[i];
    }
  }
  
  // Verificar operadores adyacentes (excluyendo >=, <=, <>, ==, !=)
  if (/[+\-*\/][+\-*\/]/.test(sinComillas.replace(/>=|<=|<>|==|!=/g, 'XX'))) {
    return false;
  }
  
  // Verificar operadores al inicio o final de expresión (excepto + o - unarios)
  if (/[*\/]/.test(sinComillas[0])) return false;
  if (/[+\-*\/]/.test(sinComillas[sinComillas.length - 1])) return false;

  return true;
}

// Verificar que en la condición del if o while exista al menos un operador relacional
function verificarCondicion(condicion) {
  // Expresión regular para buscar operadores relacionales con sus correctos espacios o entre identificadores/valores
  const regexOperadores = /(>=|<=|<>|==|=|<|>)/;
  
  // Verificar si existe al menos un operador relacional
  if (!regexOperadores.test(condicion)) {
    return false;
  }
  
  // Verificar que los operadores estén entre valores válidos
  const partes = condicion.split(/and|or|not/).map(part => part.trim());
  let operadorValido = false;
  
  for (const parte of partes) {
    if (/(>=|<=|<>|==|=|<|>)/.test(parte)) {
      operadorValido = true;
      break;
    }
  }
  
  if (!operadorValido) {
    return false;
  }
  
  // Verificar sintaxis incorrecta como "x 10" (falta operador)
  const patronInvalido = /[a-zA-Z_][a-zA-Z0-9_]*\s+[0-9]+|[0-9]+\s+[a-zA-Z_][a-zA-Z0-9_]*/;
  if (patronInvalido.test(condicion)) {
    return false;
  }
  
  return true;
}

// Función para verificar si una expresión tiene sentido
function verificarExpresion(expr) {
  // Si es una expresión vacía, no es válida
  if (!expr.trim()) return false;
  
  // Verificar que los paréntesis estén balanceados
  if (!verificarParentesis(expr)) return false;
  
  // Permitir cadenas entre comillas
  let sinComillas = "";
  let enComillas = false;
  
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '"' && (i === 0 || expr[i-1] !== '\\')) {
      enComillas = !enComillas;
      continue;
    }
    
    if (!enComillas) {
      sinComillas += expr[i];
    }
  }
  
  // Si quedaron comillas sin cerrar
  if (enComillas) return false;
  
  // Si es una expresión con coma (como en write)
  if (expr.includes(',')) {
    // Verificar cada parte separada por coma
    const partes = expr.split(',');
    for (const parte of partes) {
      // Si la parte está vacía (como en "expresion,,expresion")
      if (parte.trim() === '') return false;
    }
    return true;
  }
  
  // Verificar operadores adyacentes
  if (!verificarOperadores(expr)) return false;
  
  // Verificar caracteres especiales inválidos - permitir letras, números, operadores básicos, espacios y comas
  // Permitimos operadores relacionales y paréntesis
  const caracteresValidos = /[a-zA-Z0-9+\-*\/()=<>!&|%,\s]/;
  for (let i = 0; i < sinComillas.length; i++) {
    if (!caracteresValidos.test(sinComillas[i])) {
      return false;
    }
  }
  
  return true;
}

function compilar() {
  const code = editor.getValue();
  const lines = code.split('\n');
  const errors = [];

  let ifCount = 0;
  let whileCount = 0;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const lineNum = i + 1;

    if (trimmed === '') return;

    // Verificar si hay múltiples instrucciones en una línea
    if ((trimmed.toLowerCase().includes('end-if') || trimmed.toLowerCase().includes('end-while')) && 
        (trimmed.toLowerCase().includes('write') || 
          trimmed.toLowerCase().includes('capture') || 
          /[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(trimmed))) {
      errors.push(`Línea ${lineNum}: No debe haber múltiples instrucciones en una línea`);
    }

    // Validar palabras reservadas
    reservedWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(trimmed) && !trimmed.includes(word)) {
        errors.push(`Línea ${lineNum}: Palabra reservada mal escrita (debe ser '${word}')`);
      }
    });

    if (trimmed.toLowerCase().startsWith('write')) {
      if (!/^write\((.*)\)\s*::$/i.test(trimmed)) {
        errors.push(`Línea ${lineNum}: 'write' mal estructurado o sin '::' al final`);
      } else {
        // Extraer la expresión dentro de write()
        const expresion = trimmed.match(/write\((.*)\)/i)[1];
        if (!verificarExpresion(expresion)) {
          errors.push(`Línea ${lineNum}: Expresión inválida dentro de 'write'`);
        }
      }
    } else if (trimmed.toLowerCase().startsWith('capture')) {
      if (!/^capture\(([a-zA-Z_][a-zA-Z0-9_]*)\)\s*::$/i.test(trimmed)) {
        errors.push(`Línea ${lineNum}: 'capture' mal estructurado o sin '::' al final`);
      }
    } else if (trimmed.toLowerCase().startsWith('if')) {
      const ifRegex = /^if\s*\((.*)\)\s*then$/i;
      const match = trimmed.match(ifRegex);
      
      if (!match) {
        errors.push(`Línea ${lineNum}: 'if' debe tener la forma 'if (condición) then'`);
      } else {
        // Extraer la condición del if
        const condicion = match[1];
        
        // Verificar la condición
        if (!verificarExpresion(condicion)) {
          errors.push(`Línea ${lineNum}: Condición inválida en 'if'`);
        } else if (!verificarCondicion(condicion)) {
          errors.push(`Línea ${lineNum}: Falta un operador relacional válido en la condición`);
        }
      }
      
      if (trimmed.endsWith('::')) {
        errors.push(`Línea ${lineNum}: 'if ... then' no debe terminar en '::'`);
      }
      
      ifCount++;
    } else if (trimmed.toLowerCase() === 'end-if::') {
      errors.push(`Línea ${lineNum}: 'end-if' no debe terminar en '::'`);
      ifCount--;
    } else if (trimmed.toLowerCase() === 'end-if') {
      ifCount--;
    } else if (trimmed.toLowerCase().startsWith('while')) {
      const whileRegex = /^while\s*\((.*)\)$/i;
      const match = trimmed.match(whileRegex);
      
      if (!match) {
        errors.push(`Línea ${lineNum}: 'while' debe tener la forma 'while (condición)'`);
      } else {
        // Extraer la condición del while
        const condicion = match[1];
        
        // Verificar la condición
        if (!verificarExpresion(condicion)) {
          errors.push(`Línea ${lineNum}: Condición inválida en 'while'`);
        } else if (!verificarCondicion(condicion)) {
          errors.push(`Línea ${lineNum}: Falta un operador relacional válido en la condición`);
        }
      }
      
      if (trimmed.endsWith('::')) {
        errors.push(`Línea ${lineNum}: 'while' no debe terminar en '::'`);
      }
      
      whileCount++;
    } else if (trimmed.toLowerCase() === 'end-while::') {
      errors.push(`Línea ${lineNum}: 'end-while' no debe terminar en '::'`);
      whileCount--;
    } else if (trimmed.toLowerCase() === 'end-while') {
      whileCount--;
    } else if (!trimmed.endsWith('::')) {
      errors.push(`Línea ${lineNum}: La instrucción debe finalizar con '::'`);
    } else {
      // Para otras expresiones, eliminar los :: finales y verificar
      const expresion = trimmed.replace(/::$/, '');
      
      // Validar asignaciones
      if (expresion.includes('=') && !expresion.includes('>=') && 
          !expresion.includes('<=') && !expresion.includes('==') && 
          !expresion.includes('!=') && !expresion.includes('<>')) {
        
        const partes = expresion.split('=');
        
        // Verificar que la parte izquierda de la asignación sea un identificador válido
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(partes[0].trim())) {
          errors.push(`Línea ${lineNum}: Identificador inválido a la izquierda de la asignación`);
          return;
        }
        
        // Verificar que la parte derecha sea una expresión válida
        if (!verificarExpresion(partes[1])) {
          errors.push(`Línea ${lineNum}: Expresión inválida a la derecha de la asignación`);
          return;
        }
      } 
      // Si no es una asignación
      else if (!verificarExpresion(expresion)) {
        errors.push(`Línea ${lineNum}: Expresión inválida o sin sentido`);
      }
    }
  });

  if (ifCount !== 0) {
    errors.push('Error: condicional if sin cierre adecuado con end-if');
  }
  
  if (whileCount !== 0) {
    errors.push('Error: bucle while sin cierre adecuado con end-while');
  }

  if (errors.length > 0) {
    document.getElementById('output').textContent = 'Errores de compilación:\n' + errors.join('\n');
    return false;
  } else {
    document.getElementById('output').textContent = 'Compilación exitosa.';
    return true;
  }
}

// Variables para la ejecución paso a paso
let programaActual = [];
let variablesGlobales = {};
let lineaActual = 0;
let puntosDeControl = [];
let enEjecucion = false;
let historialEjecucion = [];
let consolaOutput = '';  // Nuevo: Para almacenar solo los resultados de la consola

// Función para ejecutar el programa paso a paso
function ejecutar() {
  // Primero compilamos para verificar errores
  if (!compilar()) {
    return;
  }
  
  // Inicializar la ejecución
  const code = editor.getValue();
  programaActual = code.split('\n').map(line => line.trim()).filter(line => line !== '');
  variablesGlobales = {};
  lineaActual = 0;
  puntosDeControl = [];
  enEjecucion = true;
  historialEjecucion = [];
  consolaOutput = '';  // Reiniciar la consola de salida
  
  // Creamos una consola limpia
  document.getElementById('output').textContent = '';
  
  // Ejecutamos el primer paso
  ejecutarSiguientePaso();
}

function ejecutarSiguientePaso() {
  if (!enEjecucion || lineaActual >= programaActual.length) {
    finalizarEjecucion();
    return;
  }
  
  const linea = programaActual[lineaActual];
  let resultado = '';
  
  try {
    resultado = interpretarLinea(linea, lineaActual);
    
    // Guardar este paso en el historial
    if (resultado) {
      historialEjecucion.push({
        linea: linea,
        resultado: resultado
      });
    }
    
    // Mostramos solo la consola de salida simplificada
    actualizarConsolaSalida();
    
    // Avanzamos a la siguiente línea
    lineaActual++;
    
    // Si hay puntos de control especiales (saltos de if o while), los procesamos
    if (puntosDeControl.length > 0) {
      const ultimoPunto = puntosDeControl.pop();
      if (ultimoPunto.tipo === 'salto') {
        lineaActual = ultimoPunto.lineaDestino;
      }
    }
    
    // Programamos la ejecución del siguiente paso (para dar tiempo de visualizar)
    setTimeout(ejecutarSiguientePaso, 200);  // Reducido a 200ms para que sea más rápido
  } catch (error) {
    document.getElementById('output').textContent = `Error en ejecución: ${error.message}`;
    enEjecucion = false;
  }
}

// Nueva función para mostrar solo la salida de consola
function actualizarConsolaSalida() {
  document.getElementById('output').textContent = consolaOutput;
}

function finalizarEjecucion() {
  enEjecucion = false;
}

function interpretarLinea(linea, numeroLinea) {
  // Si es una línea vacía o comentario, ignoramos
  if (!linea || linea.startsWith('//')) {
    return '';
  }
  
  // Procesar asignaciones
  if (linea.includes('=') && !linea.includes('>=') && !linea.includes('<=') && 
      !linea.includes('<>') && linea.endsWith('::')) {
    const expresion = linea.replace(/::$/, '');
    const [variable, valor] = expresion.split('=').map(part => part.trim());
    
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
      throw new Error(`Identificador inválido: ${variable}`);
    }
    
    // Evaluar la expresión de la derecha
    const valorCalculado = evaluarExpresion(valor);
    variablesGlobales[variable] = valorCalculado;
    return `Asignación: ${variable} = ${valorCalculado}`;
  }
  
  // Procesar write
  if (linea.toLowerCase().startsWith('write') && linea.endsWith('::')) {
    const match = linea.match(/write\((.*)\)\s*::/i);
    if (match) {
      const expresion = match[1];
      const resultado = evaluarExpresion(expresion);
      // Agregar resultado a la consola
      consolaOutput += resultado + '\n';
      return `Salida: ${resultado}`;
    }
  }
  
  // Procesar capture
  if (linea.toLowerCase().startsWith('capture') && linea.endsWith('::')) {
    const match = linea.match(/capture\(([a-zA-Z_][a-zA-Z0-9_]*)\)\s*::/i);
    if (match) {
      const variable = match[1];
      const valorPrompt = prompt(`${variable}:`);
      const valor = valorPrompt !== null ? valorPrompt : '';
      variablesGlobales[variable] = isNaN(parseFloat(valor)) ? valor : parseFloat(valor);
      // Agregar entrada a la consola
      consolaOutput += `${variable}: ${valor}\n`;
      return `Entrada: ${variable} = ${variablesGlobales[variable]}`;
    }
  }
  
  // Procesar if
  if (linea.toLowerCase().startsWith('if')) {
    const match = linea.match(/if\s*\((.*)\)\s*then$/i);
    if (match) {
      const condicion = match[1];
      const resultado = evaluarCondicion(condicion);
      
      // Buscar el end-if correspondiente
      let nivelAnidado = 1;
      let lineaEndIf = numeroLinea;
      
      while (nivelAnidado > 0 && lineaEndIf < programaActual.length - 1) {
        lineaEndIf++;
        const lineaActual = programaActual[lineaEndIf];
        
        if (lineaActual.toLowerCase().startsWith('if')) {
          nivelAnidado++;
        } else if (lineaActual.toLowerCase() === 'end-if') {
          nivelAnidado--;
        }
      }
      
      if (!resultado) {
        // Si la condición es falsa, saltamos al end-if
        puntosDeControl.push({ tipo: 'salto', lineaDestino: lineaEndIf + 1 });
        return `Condición falsa, saltando al end-if`;
      }
      
      return `Condición verdadera, ejecutando bloque if`;
    }
  }
  
  // Procesar end-if
  if (linea.toLowerCase() === 'end-if') {
    return `Fin de bloque if`;
  }
  
  // Procesar while
  if (linea.toLowerCase().startsWith('while')) {
    const match = linea.match(/while\s*\((.*)\)$/i);
    if (match) {
      const condicion = match[1];
      const resultado = evaluarCondicion(condicion);
      
      // Buscar el end-while correspondiente
      let nivelAnidado = 1;
      let lineaEndWhile = numeroLinea;
      
      while (nivelAnidado > 0 && lineaEndWhile < programaActual.length - 1) {
        lineaEndWhile++;
        const lineaActual = programaActual[lineaEndWhile];
        
        if (lineaActual.toLowerCase().startsWith('while')) {
          nivelAnidado++;
        } else if (lineaActual.toLowerCase() === 'end-while') {
          nivelAnidado--;
        }
      }
      
      if (!resultado) {
        // Si la condición es falsa, saltamos al end-while
        puntosDeControl.push({ tipo: 'salto', lineaDestino: lineaEndWhile + 1 });
        return `Condición while falsa, saltando al end-while`;
      }
      
      // Guardamos la línea del while para volver después
      puntosDeControl.push({ tipo: 'while', lineaInicio: numeroLinea });
      return `Condición while verdadera, ejecutando bloque`;
    }
  }
  
  // Procesar end-while
  if (linea.toLowerCase() === 'end-while') {
    // Buscar el while correspondiente
    let nivelAnidado = 1;
    let lineaWhile = numeroLinea;
    
    while (nivelAnidado > 0 && lineaWhile > 0) {
      lineaWhile--;
      const lineaActual = programaActual[lineaWhile];
      
      if (lineaActual.toLowerCase() === 'end-while') {
        nivelAnidado++;
      } else if (lineaActual.toLowerCase().startsWith('while')) {
        nivelAnidado--;
      }
    }
    
    // Volvemos a evaluar la condición del while
    const match = programaActual[lineaWhile].match(/while\s*\((.*)\)$/i);
    if (match) {
      const condicion = match[1];
      const resultado = evaluarCondicion(condicion);
      
      if (resultado) {
        // Si la condición es verdadera, volvemos al inicio del while
        puntosDeControl.push({ tipo: 'salto', lineaDestino: lineaWhile + 1 });
        return `Fin de bloque while, volviendo al inicio`;
      }
    }
    
    return `Fin de bloque while, continuando ejecución`;
  }
  
  // Si llegamos aquí, es una línea que no reconocemos o no necesita procesamiento especial
  return '';
}

function evaluarExpresion(expresion) {
  // Reemplazar variables con sus valores
  let expresionEvaluable = expresion;
  
  // Manejar cadenas con comillas
  const cadenas = [];
  expresionEvaluable = expresionEvaluable.replace(/"([^"]*)"/g, (match, p1) => {
    cadenas.push(p1);
    return `__CADENA${cadenas.length - 1}__`;
  });
  
  // Reemplazar variables con sus valores
  for (const [variable, valor] of Object.entries(variablesGlobales)) {
    const regex = new RegExp(`\\b${variable}\\b`, 'g');
    expresionEvaluable = expresionEvaluable.replace(regex, typeof valor === 'string' ? `"${valor}"` : valor);
  }
  
  // Volver a colocar las cadenas originales
  for (let i = 0; i < cadenas.length; i++) {
    expresionEvaluable = expresionEvaluable.replace(`__CADENA${i}__`, `"${cadenas[i]}"`);
  }
  
  // Si hay comas, dividir en partes y evaluar cada una
  if (expresionEvaluable.includes(',')) {
    const partes = expresionEvaluable.split(',').map(part => part.trim());
    return partes.map(parte => evaluarExpresionSimple(parte)).join(', ');
  }
  
  return evaluarExpresionSimple(expresionEvaluable);
}

function evaluarExpresionSimple(expresion) {
  // Si es una cadena con comillas, devolvemos la cadena sin comillas
  if (expresion.startsWith('"') && expresion.endsWith('"')) {
    return expresion.slice(1, -1);
  }
  
  // Intentar evaluar como expresión matemática
  try {
    // Reemplazar <> por != para JavaScript
    expresion = expresion.replace(/<>/g, '!=');
    
    // Evaluar la expresión
    return eval(expresion);
  } catch (error) {
    // Si hay error, devolvemos la expresión original
    return expresion;
  }
}

function evaluarCondicion(condicion) {
  // Reemplazar operadores lógicos a formato JavaScript
  let condicionJS = condicion
    .replace(/\band\b/gi, '&&')
    .replace(/\bor\b/gi, '||')
    .replace(/\bnot\b/gi, '!')
    .replace(/<>/g, '!=');
  
  // Reemplazar el operador de igualdad "=" por "=="
  condicionJS = condicionJS.replace(/([a-zA-Z0-9_\s\)])\s*=\s*([a-zA-Z0-9_\s\(])/g, '$1==$2');
  
  // Reemplazar variables con sus valores
  for (const [variable, valor] of Object.entries(variablesGlobales)) {
    const regex = new RegExp(`\\b${variable}\\b`, 'g');
    condicionJS = condicionJS.replace(regex, typeof valor === 'string' ? `"${valor}"` : valor);
  }
  
  // Evaluar la condición
  try {
    return eval(condicionJS);
  } catch (error) {
    throw new Error(`Error al evaluar condición: ${error.message}`);
  }
}



  // Función para ver/descargar la documentación
  function verDocumentacion() {
    // Crear un modal para mostrar opciones
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.maxWidth = '500px';
    modalContent.style.width = '80%';
    
    modalContent.innerHTML = `
      <h2 style="text-align: center;">Documentación</h2>
      <p>Seleccione el tipo de documentación que desea ver:</p>
      <div style="display: flex; justify-content: space-around; margin-top: 20px;">
        <button id="manualProgramador" style="padding: 10px;">Manual del Programador</button>
        <button id="manualUsuario" style="padding: 10px;">Manual del Usuario</button>
      </div>
      <div style="text-align: right; margin-top: 20px;">
        <button id="cerrarModal" style="padding: 5px 10px;">Cerrar</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Evento para cerrar el modal
    document.getElementById('cerrarModal').addEventListener('click', function() {
      document.body.removeChild(modal);
    });
    
    // Eventos para cada tipo de documentación
    document.getElementById('manualProgramador').addEventListener('click', function() {
      window.open('manuales/manual_programador.pdf', '_blank');
    });
    
    document.getElementById('manualUsuario').addEventListener('click', function() {
      window.open('manuales/manual_usuario.pdf', '_blank');
    });
  }