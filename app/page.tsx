"use client"; // Le dice a Next.js que esto corre en el navegador del celular

import { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from '../lib/supabaseClient'; // Nuestra conexión a la base de datos
import jsPDF from "jspdf";// La herramienta para crear el documento PDF
import autoTable from "jspdf-autotable";          // La herramienta para dibujar la tabla en el PDF

export default function AcopioApp() {
  // 1. MEMORIA: Aquí guardaremos el código cuando la cámara lo lea
  const [codigoEscaneado, setCodigoEscaneado] = useState("");
  // Estas memorias guardarán lo que el usuario escriba en el formulario
  const [nombre, setNombre] = useState(""); 
  const [categoria, setCategoria] = useState("Insumos Médicos"); // Ya viene con esta opción por defecto
  const [cantidad, setCantidad] = useState("");

  // 2. EFECTO: Esto arranca la cámara automáticamente
  useEffect(() => {
    // Configuramos el escáner (cuadrito de 250x250px)
    const scanner = new Html5QrcodeScanner(
      "lector-camara", 
      { fps: 10, qrbox: { width: 250, height: 250 } }, 
      false
    );

    // ¿Qué pasa si el escáner lee algo con éxito?
    const alEscanear = (textoDecodificado: string) => {
      setCodigoEscaneado(textoDecodificado); // Guardamos el código en la memoria
      scanner.clear(); // Apagamos la cámara para pasar al formulario
    };

    // ¿Qué pasa si hay error? (ej. está buscando y no encuentra nada aún)
    const alFallar = (_error: any) => {
      // Lo ignoramos en silencio mientras busca
    };

    // Encendemos el escáner
    scanner.render(alEscanear, alFallar);

    // Regla de limpieza: Si el usuario sale de la página, apagamos la cámara
    return () => {
      scanner.clear();
    };
  }, []); // Los corchetes vacíos significan "ejecutar solo una vez al abrir"

  // 3. FUNCIÓN PARA GUARDAR EN LA BASE DE DATOS
  const guardarInsumo = async () => {
    // A. Verificar que no falten datos importantes
    if (!nombre || !cantidad) {
      alert("Por favor, escribe el nombre y la cantidad");
      return; // El 'return' vacío hace que la función se detenga aquí
    }

    // B. Armar el "paquete" con los datos
    const nuevoInsumo = {
      codigo_barras: codigoEscaneado, // Lo que leyó la cámara
      nombre: nombre,                 // Lo que el usuario escribió
      categoria: categoria,           // La categoría que eligió
      cantidad: parseInt(cantidad)    // Convertimos el texto de la cantidad a un número matemático
    };

    // C. Enviar el paquete a Supabase
    const { error } = await supabase
      .from('entradas_acopio')
      .insert([nuevoInsumo]);

    // D y E. Confirmar y limpiar
    if (error) {
      alert("Hubo un error al guardar: " + error.message);
    } else {
      alert("¡Insumo guardado correctamente!");
      
      // Vaciamos las memorias para el siguiente escaneo
      setCodigoEscaneado("");
      setNombre("");
      setCantidad("");
      // Nota: No vaciamos la 'categoria' por si el usuario sigue escaneando cosas del mismo tipo
    }
  };

  // 4. FUNCIÓN PARA GENERAR EL PDF
  const descargarPDF = async () => {
    // A. Traemos todos los registros de la base de datos
    const { data, error } = await supabase
      .from('entradas_acopio')
      .select('*')
      .order('fecha_recepcion', { ascending: false });

    if (error || !data) {
      alert("Error al obtener los datos para el PDF");
      return;
    }

    // B. Creamos el documento PDF
    const doc = new jsPDF();
    
    // Título y fecha
    doc.text("Reporte de Insumos - Centro de Acopio", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 22);

    // C. Preparamos las columnas y los datos para la tabla
    const columnas = ["Código", "Nombre", "Categoría", "Cantidad"];
    const filas = data.map(item => [
      item.codigo_barras,
      item.nombre,
      item.categoria,
      item.cantidad
    ]);

    // D. Dibujamos la tabla
    autoTable(doc, {
      startY: 30, // Empieza debajo del título
      head: [columnas],
      body: filas,
    });

    // E. Guardar el archivo
    doc.save("inventario-acopio.pdf");
  };

  // 3. INTERFAZ: Lo que ve el usuario en la pantalla
  return (
    <div className="p-4 max-w-md mx-auto flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-center">Acopio Digital</h1>
      
      {!codigoEscaneado ? (
        // Si no hay código, mostramos el escáner
        <div id="lector-camara" className="w-full bg-white rounded-lg overflow-hidden shadow"></div>
      ) : (
        // Si YA tenemos un código, mostramos el formulario
        <div className="bg-gray-100 p-4 rounded-lg flex flex-col gap-3 shadow">
          <p className="text-sm bg-green-200 p-2 rounded text-center">
            Código: <strong>{codigoEscaneado}</strong>
          </p>

          <label className="text-sm font-bold">Nombre del Insumo</label>
          <input 
            type="text" 
            className="p-2 border rounded" 
            placeholder="Ej. Guantes de Nitrilo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)} 
          />

          <label className="text-sm font-bold">Categoría</label>
          <select 
            className="p-2 border rounded bg-white"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option>Insumos Médicos</option>
            <option>Equipos de Protección (EPP)</option>
            <option>Higiene Personal</option>
            <option>Alimentos y Nutrición</option>
            <option>Materiales Generales</option>
          </select>

          <label className="text-sm font-bold">Cantidad Recibida</label>
          <input 
            type="number" 
            className="p-2 border rounded" 
            placeholder="Ej. 50"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)} 
          />

          <button 
            className="mt-4 bg-blue-600 text-white p-3 rounded font-bold"
            onClick={guardarInsumo}
          >
            Confirmar y Guardar
          </button>
          
          <button 
            className="bg-gray-300 text-gray-700 p-2 rounded"
            onClick={() => setCodigoEscaneado("")}
          >
            Cancelar escaneo
          </button>
        </div>
      )}

      {/* Botón de PDF siempre visible abajo */}
      <hr className="my-4" />
      <button 
        className="bg-red-600 text-white p-3 rounded font-bold w-full"
        onClick={descargarPDF}
      >
        Descargar Reporte PDF
      </button>
    </div>
  );
}